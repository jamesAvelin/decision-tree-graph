import type { GraphNode, GraphEdge, Direction } from '../../core/types';
import { assignLayers } from './layerAssignment';
import { minimizeCrossings } from './crossingMin';
import { positionNodes } from './nodePositioning';
import { routeEdges } from './edgeRouting';

export interface SugiyamaResult {
  positions: Map<string, { x: number; y: number }>;
  edgePoints: Map<string, [number, number][]>;
  layers: Map<number, string[]>;
  computedLayerSpacing: number;
  computedNodeSpacing: number;
}

/**
 * Compute optimal spacing so no nodes overlap and edges have clean room.
 */
function computeAutoSpacing(
  layers: Map<number, string[]>,
  nodes: Map<string, GraphNode>,
  direction: Direction,
): { layerSpacing: number; nodeSpacing: number } {
  let maxNodeCross = 0;
  let maxNodeMain = 0;
  let maxFanOut = 1;

  for (const node of nodes.values()) {
    if (direction === 'TB') {
      maxNodeCross = Math.max(maxNodeCross, node.width);
      maxNodeMain = Math.max(maxNodeMain, node.height);
    } else {
      maxNodeCross = Math.max(maxNodeCross, node.height);
      maxNodeMain = Math.max(maxNodeMain, node.width);
    }
    const visibleChildren = node.children.filter((cid) => nodes.has(cid));
    maxFanOut = Math.max(maxFanOut, visibleChildren.length);
  }

  // Node spacing: comfortable gap that scales with node size
  const baseGap = 24;
  const nodeSpacing = Math.max(baseGap, maxNodeCross * 0.25 + baseGap);

  // Layer spacing: node height + curve room that scales with fan-out
  const edgeCurveRoom = Math.min(40 + maxFanOut * 8, 100);
  const layerSpacing = maxNodeMain + edgeCurveRoom;

  return { layerSpacing, nodeSpacing };
}

/**
 * Full Sugiyama layout pipeline:
 * 1. Layer assignment (BFS from root)
 * 2. Crossing minimization (barycenter heuristic, 6 sweeps)
 * 3. Auto-spacing computation (optional)
 * 4. Node positioning (centered, parent-over-children, overlap-free)
 * 5. Edge routing (cubic bezier with sibling separation)
 */
export function computeSugiyamaLayout(
  nodes: Map<string, GraphNode>,
  edges: GraphEdge[],
  rootId: string,
  direction: Direction,
  layerSpacing: number,
  nodeSpacing: number,
  autoSpacing: boolean = true,
): SugiyamaResult {
  // 1. Assign layers
  const layerMap = assignLayers(nodes, edges, rootId);

  for (const [nodeId, layer] of layerMap) {
    const node = nodes.get(nodeId);
    if (node) node.layer = layer;
  }

  // 2. Minimize crossings
  const layers = minimizeCrossings(layerMap, nodes);

  // 3. Compute spacing
  let finalLayerSpacing = layerSpacing;
  let finalNodeSpacing = nodeSpacing;

  if (autoSpacing) {
    const auto = computeAutoSpacing(layers, nodes, direction);
    finalLayerSpacing = auto.layerSpacing;
    finalNodeSpacing = auto.nodeSpacing;
  }

  // 4. Position nodes
  const positions = positionNodes(layers, nodes, direction, finalLayerSpacing, finalNodeSpacing);

  // 5. Route edges
  const positionedNodes = new Map<string, GraphNode>();
  for (const [id, node] of nodes) {
    const pos = positions.get(id);
    if (pos) {
      positionedNodes.set(id, { ...node, x: pos.x, y: pos.y });
    }
  }

  const visibleEdges = edges.filter(
    (e) => positions.has(e.source) && positions.has(e.target),
  );
  const edgePoints = routeEdges(visibleEdges, positionedNodes, direction);

  return {
    positions,
    edgePoints,
    layers,
    computedLayerSpacing: finalLayerSpacing,
    computedNodeSpacing: finalNodeSpacing,
  };
}
