import type { GraphNode, GraphEdge, Direction } from '../../core/types';

const MARGIN = 12;   // clearance around nodes when checking intersections
const BYPASS = 24;   // clearance outside obstacle bounding box for bypass lane

/**
 * Check if a thin rectangle overlaps a node's bounding box (expanded by margin).
 */
function rectOverlapsNode(
  rx1: number, ry1: number, rx2: number, ry2: number,
  node: GraphNode, margin: number,
): boolean {
  const nx1 = node.x - node.width / 2 - margin;
  const ny1 = node.y - node.height / 2 - margin;
  const nx2 = node.x + node.width / 2 + margin;
  const ny2 = node.y + node.height / 2 + margin;
  return rx1 < nx2 && rx2 > nx1 && ry1 < ny2 && ry2 > ny1;
}

/**
 * Check if any segment of a polyline path intersects any visible node.
 */
function pathHitsNodes(
  points: [number, number][],
  nodes: Map<string, GraphNode>,
  excludeIds: Set<string>,
): boolean {
  for (let i = 0; i < points.length - 1; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[i + 1];
    const left = Math.min(x1, x2) - 2;
    const top = Math.min(y1, y2) - 2;
    const right = Math.max(x1, x2) + 2;
    const bottom = Math.max(y1, y2) + 2;

    for (const [id, node] of nodes) {
      if (excludeIds.has(id)) continue;
      if (rectOverlapsNode(left, top, right, bottom, node, MARGIN)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Route a single edge in TB direction with obstacle avoidance.
 *
 * Strategy 1: Try simple midpoint routing (down, across, down).
 * Strategy 2: If that hits a node, bypass by routing around all
 *             obstacle nodes — exit left or right, travel vertically
 *             outside the obstacle bounding box, then turn back in.
 */
function routeEdgeTB(
  startX: number, startY: number,
  endX: number, endY: number,
  nodes: Map<string, GraphNode>,
  excludeIds: Set<string>,
): [number, number][] {
  // Strategy 1: simple orthogonal path
  if (Math.abs(startX - endX) < 1) {
    const straight: [number, number][] = [[startX, startY], [endX, endY]];
    if (!pathHitsNodes(straight, nodes, excludeIds)) return straight;
  } else {
    const midY = (startY + endY) / 2;
    const simple: [number, number][] = [
      [startX, startY],
      [startX, midY],
      [endX, midY],
      [endX, endY],
    ];
    if (!pathHitsNodes(simple, nodes, excludeIds)) return simple;
  }

  // Strategy 2: bypass routing
  // Collect all nodes in the Y band between source and target
  const obstacles: GraphNode[] = [];
  for (const [id, node] of nodes) {
    if (excludeIds.has(id)) continue;
    const top = node.y - node.height / 2;
    const bottom = node.y + node.height / 2;
    if (bottom + MARGIN > startY && top - MARGIN < endY) {
      obstacles.push(node);
    }
  }

  if (obstacles.length === 0) {
    // Shouldn't reach here, but fallback
    return [[startX, startY], [endX, endY]];
  }

  // Bounding box of obstacle nodes
  let obsLeft = Infinity;
  let obsRight = -Infinity;
  for (const node of obstacles) {
    obsLeft = Math.min(obsLeft, node.x - node.width / 2);
    obsRight = Math.max(obsRight, node.x + node.width / 2);
  }

  // Choose the side with the shorter total detour
  const leftX = obsLeft - BYPASS;
  const rightX = obsRight + BYPASS;
  const leftDist = Math.abs(startX - leftX) + Math.abs(endX - leftX);
  const rightDist = Math.abs(startX - rightX) + Math.abs(endX - rightX);
  let bypassX = leftDist <= rightDist ? leftX : rightX;

  const turnGap = Math.min(15, (endY - startY) / 4);
  const turnY1 = startY + turnGap;
  const turnY2 = endY - turnGap;

  let path: [number, number][] = [
    [startX, startY],
    [startX, turnY1],
    [bypassX, turnY1],
    [bypassX, turnY2],
    [endX, turnY2],
    [endX, endY],
  ];

  // Verify the bypass path is clear; if not, try the other side
  if (pathHitsNodes(path, nodes, excludeIds)) {
    bypassX = bypassX === leftX ? rightX : leftX;
    path = [
      [startX, startY],
      [startX, turnY1],
      [bypassX, turnY1],
      [bypassX, turnY2],
      [endX, turnY2],
      [endX, endY],
    ];
  }

  return path;
}

/**
 * Route a single edge in LR direction with obstacle avoidance.
 */
function routeEdgeLR(
  startX: number, startY: number,
  endX: number, endY: number,
  nodes: Map<string, GraphNode>,
  excludeIds: Set<string>,
): [number, number][] {
  // Strategy 1: simple orthogonal path
  if (Math.abs(startY - endY) < 1) {
    const straight: [number, number][] = [[startX, startY], [endX, endY]];
    if (!pathHitsNodes(straight, nodes, excludeIds)) return straight;
  } else {
    const midX = (startX + endX) / 2;
    const simple: [number, number][] = [
      [startX, startY],
      [midX, startY],
      [midX, endY],
      [endX, endY],
    ];
    if (!pathHitsNodes(simple, nodes, excludeIds)) return simple;
  }

  // Strategy 2: bypass routing
  const obstacles: GraphNode[] = [];
  for (const [id, node] of nodes) {
    if (excludeIds.has(id)) continue;
    const left = node.x - node.width / 2;
    const right = node.x + node.width / 2;
    if (right + MARGIN > startX && left - MARGIN < endX) {
      obstacles.push(node);
    }
  }

  if (obstacles.length === 0) {
    return [[startX, startY], [endX, endY]];
  }

  let obsTop = Infinity;
  let obsBottom = -Infinity;
  for (const node of obstacles) {
    obsTop = Math.min(obsTop, node.y - node.height / 2);
    obsBottom = Math.max(obsBottom, node.y + node.height / 2);
  }

  const topY = obsTop - BYPASS;
  const bottomY = obsBottom + BYPASS;
  const topDist = Math.abs(startY - topY) + Math.abs(endY - topY);
  const bottomDist = Math.abs(startY - bottomY) + Math.abs(endY - bottomY);
  let bypassY = topDist <= bottomDist ? topY : bottomY;

  const turnGap = Math.min(15, (endX - startX) / 4);
  const turnX1 = startX + turnGap;
  const turnX2 = endX - turnGap;

  let path: [number, number][] = [
    [startX, startY],
    [turnX1, startY],
    [turnX1, bypassY],
    [turnX2, bypassY],
    [turnX2, endY],
    [endX, endY],
  ];

  if (pathHitsNodes(path, nodes, excludeIds)) {
    bypassY = bypassY === topY ? bottomY : topY;
    path = [
      [startX, startY],
      [turnX1, startY],
      [turnX1, bypassY],
      [turnX2, bypassY],
      [turnX2, endY],
      [endX, endY],
    ];
  }

  return path;
}

/**
 * Routes edges with orthogonal step routing, port assignment,
 * and obstacle-aware bypass when edges would pass through nodes.
 */
export function routeEdges(
  edges: GraphEdge[],
  nodes: Map<string, GraphNode>,
  direction: Direction,
): Map<string, [number, number][]> {
  const edgePoints = new Map<string, [number, number][]>();

  // Group edges by source and by target to assign ports
  const outgoing = new Map<string, GraphEdge[]>();
  const incoming = new Map<string, GraphEdge[]>();

  for (const edge of edges) {
    if (!nodes.has(edge.source) || !nodes.has(edge.target)) continue;
    if (!outgoing.has(edge.source)) outgoing.set(edge.source, []);
    outgoing.get(edge.source)!.push(edge);
    if (!incoming.has(edge.target)) incoming.set(edge.target, []);
    incoming.get(edge.target)!.push(edge);
  }

  // Sort outgoing edges by target cross-axis position so ports don't cross
  for (const [, edgeList] of outgoing) {
    edgeList.sort((a, b) => {
      const ta = nodes.get(a.target)!;
      const tb = nodes.get(b.target)!;
      return direction === 'TB' ? ta.x - tb.x : ta.y - tb.y;
    });
  }

  // Sort incoming edges by source cross-axis position
  for (const [, edgeList] of incoming) {
    edgeList.sort((a, b) => {
      const sa = nodes.get(a.source)!;
      const sb = nodes.get(b.source)!;
      return direction === 'TB' ? sa.x - sb.x : sa.y - sb.y;
    });
  }

  // Compute port position offset from center.
  // Ports are spread across 70% of the node width/height.
  function portOffset(
    nodeSize: number,
    portIndex: number,
    portCount: number,
  ): number {
    if (portCount <= 1) return 0;
    const usable = nodeSize * 0.7;
    const step = usable / (portCount - 1);
    return -usable / 2 + portIndex * step;
  }

  for (const edge of edges) {
    const source = nodes.get(edge.source);
    const target = nodes.get(edge.target);
    if (!source || !target) continue;

    const srcEdges = outgoing.get(edge.source)!;
    const tgtEdges = incoming.get(edge.target)!;
    const srcIdx = srcEdges.indexOf(edge);
    const tgtIdx = tgtEdges.indexOf(edge);
    const excludeIds = new Set([edge.source, edge.target]);

    if (direction === 'TB') {
      const srcPortOff = portOffset(source.width, srcIdx, srcEdges.length);
      const tgtPortOff = portOffset(target.width, tgtIdx, tgtEdges.length);
      const startX = source.x + srcPortOff;
      const startY = source.y + source.height / 2;
      const endX = target.x + tgtPortOff;
      const endY = target.y - target.height / 2;
      edgePoints.set(edge.id, routeEdgeTB(startX, startY, endX, endY, nodes, excludeIds));
    } else {
      const srcPortOff = portOffset(source.height, srcIdx, srcEdges.length);
      const tgtPortOff = portOffset(target.height, tgtIdx, tgtEdges.length);
      const startX = source.x + source.width / 2;
      const startY = source.y + srcPortOff;
      const endX = target.x - target.width / 2;
      const endY = target.y + tgtPortOff;
      edgePoints.set(edge.id, routeEdgeLR(startX, startY, endX, endY, nodes, excludeIds));
    }
  }

  return edgePoints;
}
