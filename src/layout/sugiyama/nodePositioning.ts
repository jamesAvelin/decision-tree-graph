import type { GraphNode, Direction } from '../../core/types';

/**
 * Assigns x/y coordinates to nodes after crossing minimization.
 * Centers each layer and spaces nodes evenly.
 * For TB direction: layers go top-to-bottom (y-axis), order within layer is x-axis.
 * For LR direction: layers go left-to-right (x-axis), order within layer is y-axis.
 */
export function positionNodes(
  layers: Map<number, string[]>,
  nodes: Map<string, GraphNode>,
  direction: Direction,
  layerSpacing: number,
  nodeSpacing: number,
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();

  // First pass: compute positions based on order within layers
  const maxLayer = Math.max(...layers.keys(), 0);

  // Find the widest layer for centering
  let maxLayerWidth = 0;
  for (const [, layerNodes] of layers) {
    let width = 0;
    for (const nodeId of layerNodes) {
      const node = nodes.get(nodeId);
      if (node) {
        width += (direction === 'TB' ? node.width : node.height) + nodeSpacing;
      }
    }
    maxLayerWidth = Math.max(maxLayerWidth, width - nodeSpacing);
  }

  for (let l = 0; l <= maxLayer; l++) {
    const layerNodes = layers.get(l);
    if (!layerNodes) continue;

    // Compute total width of this layer
    let totalSize = 0;
    for (const nodeId of layerNodes) {
      const node = nodes.get(nodeId);
      if (node) {
        totalSize += (direction === 'TB' ? node.width : node.height) + nodeSpacing;
      }
    }
    totalSize -= nodeSpacing; // remove trailing spacing

    // Center this layer relative to the widest layer
    let offset = (maxLayerWidth - totalSize) / 2;

    for (const nodeId of layerNodes) {
      const node = nodes.get(nodeId);
      if (!node) continue;

      const nodeMainSize = direction === 'TB' ? node.width : node.height;

      if (direction === 'TB') {
        positions.set(nodeId, {
          x: offset + nodeMainSize / 2,
          y: l * layerSpacing,
        });
      } else {
        positions.set(nodeId, {
          x: l * layerSpacing,
          y: offset + nodeMainSize / 2,
        });
      }

      offset += nodeMainSize + nodeSpacing;
    }
  }

  // Second pass: center parents over their children
  for (let pass = 0; pass < 3; pass++) {
    for (let l = maxLayer - 1; l >= 0; l--) {
      const layerNodes = layers.get(l);
      if (!layerNodes) continue;

      for (const nodeId of layerNodes) {
        const node = nodes.get(nodeId);
        if (!node || node.children.length === 0) continue;

        const childPositions = node.children
          .filter((cid) => positions.has(cid))
          .map((cid) => positions.get(cid)!);

        if (childPositions.length === 0) continue;

        const axis = direction === 'TB' ? 'x' : 'y';
        const avgChildPos = childPositions.reduce((sum, p) => sum + p[axis], 0) / childPositions.length;
        const currentPos = positions.get(nodeId)!;
        positions.set(nodeId, { ...currentPos, [axis]: avgChildPos });
      }
    }

    // Resolve overlaps within each layer
    for (let l = 0; l <= maxLayer; l++) {
      const layerNodes = layers.get(l);
      if (!layerNodes) continue;

      const axis = direction === 'TB' ? 'x' : 'y';
      // Sort by current position
      const sorted = [...layerNodes].sort((a, b) => {
        const pa = positions.get(a);
        const pb = positions.get(b);
        return (pa?.[axis] ?? 0) - (pb?.[axis] ?? 0);
      });

      for (let i = 1; i < sorted.length; i++) {
        const prev = sorted[i - 1];
        const curr = sorted[i];
        const prevNode = nodes.get(prev);
        const currNode = nodes.get(curr);
        if (!prevNode || !currNode) continue;

        const prevPos = positions.get(prev)!;
        const currPos = positions.get(curr)!;
        const prevSize = direction === 'TB' ? prevNode.width : prevNode.height;
        const currSize = direction === 'TB' ? currNode.width : currNode.height;
        const minDist = (prevSize + currSize) / 2 + nodeSpacing;

        if (currPos[axis] - prevPos[axis] < minDist) {
          positions.set(curr, { ...currPos, [axis]: prevPos[axis] + minDist });
        }
      }
    }
  }

  return positions;
}
