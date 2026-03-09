import type { GraphNode } from '../../core/types';

/**
 * Barycenter crossing minimization.
 * Reorders nodes within each layer to minimize edge crossings.
 * Runs configurable sweeps (default 6) alternating top-down and bottom-up.
 */
export function minimizeCrossings(
  layerMap: Map<string, number>,
  nodes: Map<string, GraphNode>,
  sweeps: number = 6,
): Map<number, string[]> {
  // Group nodes by layer
  const layers = new Map<number, string[]>();
  for (const [nodeId, layer] of layerMap) {
    if (!layers.has(layer)) layers.set(layer, []);
    layers.get(layer)!.push(nodeId);
  }

  const maxLayer = Math.max(...layers.keys());

  // Build adjacency: parent -> children, child -> parents
  const childrenOf = new Map<string, string[]>();
  const parentsOf = new Map<string, string[]>();
  for (const node of nodes.values()) {
    const visibleChildren = node.children.filter((cid) => layerMap.has(cid));
    childrenOf.set(node.id, visibleChildren);
    for (const cid of visibleChildren) {
      if (!parentsOf.has(cid)) parentsOf.set(cid, []);
      parentsOf.get(cid)!.push(node.id);
    }
  }

  // Helper: get position index of a node in its layer
  function positionInLayer(nodeId: string): number {
    const layer = layerMap.get(nodeId)!;
    const layerNodes = layers.get(layer)!;
    return layerNodes.indexOf(nodeId);
  }

  // Barycenter: average position of connected nodes in adjacent layer
  function barycenter(nodeId: string, useParents: boolean): number {
    const connected = useParents
      ? (parentsOf.get(nodeId) || [])
      : (childrenOf.get(nodeId) || []);

    if (connected.length === 0) return positionInLayer(nodeId);

    let sum = 0;
    for (const cid of connected) {
      sum += positionInLayer(cid);
    }
    return sum / connected.length;
  }

  for (let sweep = 0; sweep < sweeps; sweep++) {
    const topDown = sweep % 2 === 0;

    if (topDown) {
      // Sweep layers top to bottom
      for (let l = 1; l <= maxLayer; l++) {
        const layerNodes = layers.get(l);
        if (!layerNodes) continue;
        layerNodes.sort((a, b) => barycenter(a, true) - barycenter(b, true));
      }
    } else {
      // Sweep layers bottom to top
      for (let l = maxLayer - 1; l >= 0; l--) {
        const layerNodes = layers.get(l);
        if (!layerNodes) continue;
        layerNodes.sort((a, b) => barycenter(a, false) - barycenter(b, false));
      }
    }
  }

  return layers;
}
