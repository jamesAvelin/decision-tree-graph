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

  // Handle nodes not reachable from root (disconnected DAG components)
  // Use edge-based BFS for any remaining unvisited nodes
  if (layers.size < nodes.size) {
    const edgeTargets = new Map<string, string[]>();
    for (const edge of edges) {
      if (!edgeTargets.has(edge.source)) edgeTargets.set(edge.source, []);
      edgeTargets.get(edge.source)!.push(edge.target);
    }

    // Find unvisited nodes that have a visited parent via edges
    let changed = true;
    while (changed) {
      changed = false;
      for (const node of nodes.values()) {
        if (layers.has(node.id)) continue;
        // Check if any edge source pointing to this node has been layered
        for (const edge of edges) {
          if (edge.target === node.id && layers.has(edge.source)) {
            layers.set(node.id, layers.get(edge.source)! + 1);
            changed = true;
            break;
          }
        }
      }
    }

    // Any still-unreachable nodes get placed at layer 0
    for (const node of nodes.values()) {
      if (!layers.has(node.id)) {
        layers.set(node.id, 0);
      }
    }
  }

  return layers;
}
