import type { GraphNode } from '../../core/types';

interface ForceNode {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  depth: number;
}

/**
 * Custom d3-force compatible force that constrains parent-child ordering.
 * - In TB mode: parents are pushed above children (lower y)
 * - In LR mode: parents are pushed left of children (lower x)
 * - Maintains minimum layer separation
 */
export function forceHierarchy(
  graphNodes: Map<string, GraphNode>,
  direction: 'TB' | 'LR' = 'TB',
  layerSpacing: number = 120,
  strength: number = 0.8,
) {
  let nodes: ForceNode[] = [];

  // Compute depth for each node via BFS
  function computeDepths(): Map<string, number> {
    const depths = new Map<string, number>();
    const visited = new Set<string>();

    // Find roots (nodes with no parent or whose parent isn't in the set)
    const roots: string[] = [];
    for (const node of graphNodes.values()) {
      if (!node.parentId || !graphNodes.has(node.parentId)) {
        roots.push(node.id);
      }
    }

    const queue: { id: string; depth: number }[] = roots.map((id) => ({ id, depth: 0 }));
    while (queue.length > 0) {
      const { id, depth } = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);
      depths.set(id, depth);

      const node = graphNodes.get(id);
      if (node) {
        for (const childId of node.children) {
          if (graphNodes.has(childId) && !visited.has(childId)) {
            queue.push({ id: childId, depth: depth + 1 });
          }
        }
      }
    }

    return depths;
  }

  const depths = computeDepths();

  function force(alpha: number) {
    const nodeMap = new Map<string, ForceNode>();
    for (const node of nodes) {
      nodeMap.set(node.id, node);
    }

    for (const node of nodes) {
      const gNode = graphNodes.get(node.id);
      if (!gNode) continue;

      const nodeDepth = depths.get(node.id) ?? 0;

      // Push node towards its expected layer position
      const targetLayerPos = nodeDepth * layerSpacing;

      if (direction === 'TB') {
        const dy = targetLayerPos - node.y;
        node.vy += dy * strength * alpha;
      } else {
        const dx = targetLayerPos - node.x;
        node.vx += dx * strength * alpha;
      }

      // Enforce parent-child ordering: child must be below/right of parent
      if (gNode.parentId) {
        const parent = nodeMap.get(gNode.parentId);
        if (parent) {
          if (direction === 'TB') {
            if (node.y <= parent.y + layerSpacing * 0.5) {
              node.vy += strength * alpha * 10;
              parent.vy -= strength * alpha * 5;
            }
          } else {
            if (node.x <= parent.x + layerSpacing * 0.5) {
              node.vx += strength * alpha * 10;
              parent.vx -= strength * alpha * 5;
            }
          }
        }
      }
    }
  }

  force.initialize = function (n: ForceNode[]) {
    nodes = n;
    // Set initial depth property
    for (const node of nodes) {
      node.depth = depths.get(node.id) ?? 0;
    }
  };

  return force;
}
