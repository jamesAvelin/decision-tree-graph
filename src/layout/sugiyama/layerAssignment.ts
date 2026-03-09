import type { GraphNode, GraphEdge } from '../../core/types';

/**
 * Longest-path layer assignment for DAGs.
 * Assigns each node to a layer such that edges always go from lower to higher layers.
 * O(V + E) — single DFS pass.
 */
export function assignLayers(
  nodes: Map<string, GraphNode>,
  edges: GraphEdge[],
  rootId: string,
): Map<string, number> {
  const layers = new Map<string, number>();
  const childrenMap = new Map<string, string[]>();

  for (const node of nodes.values()) {
    childrenMap.set(node.id, node.children.filter((cid) => nodes.has(cid)));
  }

  // BFS from root — layer = depth
  const queue: { id: string; depth: number }[] = [{ id: rootId, depth: 0 }];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const { id, depth } = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);

    layers.set(id, depth);
    const children = childrenMap.get(id) || [];
    for (const childId of children) {
      if (!visited.has(childId)) {
        queue.push({ id: childId, depth: depth + 1 });
      }
    }
  }

  return layers;
}
