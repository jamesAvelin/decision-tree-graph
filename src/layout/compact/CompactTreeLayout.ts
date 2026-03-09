import type { GraphNode, GraphEdge, Direction } from '../../core/types';
import { routeEdges } from '../sugiyama/edgeRouting';

export interface CompactResult {
  positions: Map<string, { x: number; y: number }>;
  edgePoints: Map<string, [number, number][]>;
}

const NODE_GAP = 30;     // horizontal gap between sibling subtrees
const VERTICAL_GAP = 60; // vertical gap between parent bottom and child top

/**
 * Phase 1: Bottom-up DFS to compute the width each subtree needs.
 * When maxWidth is provided, children that don't fit side-by-side
 * will be stacked vertically, reducing the subtree width.
 */
function computeSubtreeWidths(
  nodeId: string,
  nodes: Map<string, GraphNode>,
  widths: Map<string, number>,
  maxWidth: number,
): number {
  const node = nodes.get(nodeId);
  if (!node) return 0;

  const visibleChildren = node.children.filter((cid) => nodes.has(cid));

  if (visibleChildren.length === 0) {
    const w = Math.min(node.width, maxWidth);
    widths.set(nodeId, w);
    return w;
  }

  // Compute each child's subtree width (recursively constrained)
  const childWidths: number[] = [];
  for (const childId of visibleChildren) {
    childWidths.push(computeSubtreeWidths(childId, nodes, widths, maxWidth));
  }

  // Total width if placed side by side
  const totalHorizontal = childWidths.reduce((sum, w) => sum + w, 0)
    + (visibleChildren.length - 1) * NODE_GAP;

  let subtreeWidth: number;
  if (totalHorizontal <= maxWidth) {
    // Children fit side by side
    subtreeWidth = Math.max(node.width, totalHorizontal);
  } else {
    // Children must stack — width is the widest single child
    subtreeWidth = Math.max(node.width, ...childWidths);
  }

  subtreeWidth = Math.min(subtreeWidth, maxWidth);
  widths.set(nodeId, subtreeWidth);
  return subtreeWidth;
}

/**
 * Phase 2: Top-down DFS to assign x,y positions.
 * If children fit within maxWidth, they go side by side.
 * Otherwise they stack vertically.
 *
 * Returns the bottom Y coordinate of this subtree (for stacking).
 */
function assignPositions(
  nodeId: string,
  cx: number,
  cy: number,
  nodes: Map<string, GraphNode>,
  subtreeWidths: Map<string, number>,
  positions: Map<string, { x: number; y: number }>,
  maxWidth: number,
): number {
  const node = nodes.get(nodeId);
  if (!node) return cy;

  positions.set(nodeId, { x: cx, y: cy });

  const visibleChildren = node.children.filter((cid) => nodes.has(cid));
  if (visibleChildren.length === 0) return cy + node.height / 2;

  // Check if children fit side by side
  const childSubtreeWidths = visibleChildren.map(
    (id) => subtreeWidths.get(id) || 0,
  );
  const totalHorizontal = childSubtreeWidths.reduce((sum, w) => sum + w, 0)
    + (visibleChildren.length - 1) * NODE_GAP;

  if (totalHorizontal <= maxWidth) {
    // === Horizontal layout ===
    let offsetX = cx - totalHorizontal / 2;
    let maxBottomY = cy;

    for (let i = 0; i < visibleChildren.length; i++) {
      const childId = visibleChildren[i];
      const childNode = nodes.get(childId);
      if (!childNode) continue;

      const childCx = offsetX + childSubtreeWidths[i] / 2;
      const childCy = cy + node.height / 2 + VERTICAL_GAP + childNode.height / 2;

      const bottomY = assignPositions(
        childId, childCx, childCy,
        nodes, subtreeWidths, positions, maxWidth,
      );
      maxBottomY = Math.max(maxBottomY, bottomY);
      offsetX += childSubtreeWidths[i] + NODE_GAP;
    }

    return maxBottomY;
  } else {
    // === Vertical stacking ===
    // Offset children slightly so edges don't all overlap
    const offsetStep = Math.min(20, (maxWidth - (node.width || 0)) / 2);
    let currentY = cy + node.height / 2 + VERTICAL_GAP;

    for (let i = 0; i < visibleChildren.length; i++) {
      const childId = visibleChildren[i];
      const childNode = nodes.get(childId);
      if (!childNode) continue;

      // Slight horizontal offset for visual separation of branches
      const xOffset = visibleChildren.length > 1
        ? (i - (visibleChildren.length - 1) / 2) * offsetStep
        : 0;

      const childCy = currentY + childNode.height / 2;
      const bottomY = assignPositions(
        childId, cx + xOffset, childCy,
        nodes, subtreeWidths, positions, maxWidth,
      );
      currentY = bottomY + VERTICAL_GAP;
    }

    return currentY - VERTICAL_GAP;
  }
}

/**
 * For LR direction, compute as TB then rotate: swap x <-> y.
 */
function rotateToLR(positions: Map<string, { x: number; y: number }>): void {
  for (const [id, pos] of positions) {
    positions.set(id, { x: pos.y, y: pos.x });
  }
}

/**
 * Compute a compact recursive tree layout.
 *
 * When maxWidth is provided, the layout constrains itself to that width
 * by stacking children vertically when they don't fit side-by-side.
 * This produces a narrow, tall tree ideal for scrollable/mobile views.
 */
export function computeCompactLayout(
  nodes: Map<string, GraphNode>,
  edges: GraphEdge[],
  rootId: string,
  direction: Direction,
  maxWidth?: number,
): CompactResult {
  const effectiveMaxWidth = maxWidth && maxWidth > 0 ? maxWidth : Infinity;

  // Phase 1: compute subtree widths
  const subtreeWidths = new Map<string, number>();
  computeSubtreeWidths(rootId, nodes, subtreeWidths, effectiveMaxWidth);

  // Phase 2: assign positions (always compute as TB first)
  const positions = new Map<string, { x: number; y: number }>();
  const root = nodes.get(rootId);
  if (root) {
    assignPositions(rootId, 0, 0, nodes, subtreeWidths, positions, effectiveMaxWidth);
  }

  if (direction === 'LR') {
    rotateToLR(positions);
  }

  // Phase 3: route edges
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

  return { positions, edgePoints };
}
