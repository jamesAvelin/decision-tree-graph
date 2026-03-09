import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCollide,
  forceCenter,
  type Simulation,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from 'd3-force';
import type { GraphNode, GraphEdge, Direction } from '../../core/types';
import { forceHierarchy } from './hierarchyForce';

export interface ForceNode extends SimulationNodeDatum {
  id: string;
  depth: number;
}

interface ForceLink extends SimulationLinkDatum<ForceNode> {
  id: string;
}

export interface ForceResult {
  positions: Map<string, { x: number; y: number }>;
}

export class ForceLayoutEngine {
  private simulation: Simulation<ForceNode, ForceLink> | null = null;
  private onTick: ((result: ForceResult) => void) | null = null;
  private onEnd: ((result: ForceResult) => void) | null = null;

  start(
    nodes: Map<string, GraphNode>,
    edges: GraphEdge[],
    direction: Direction,
    layerSpacing: number,
    nodeSpacing: number,
    onTick: (result: ForceResult) => void,
    onEnd: (result: ForceResult) => void,
  ) {
    this.stop();
    this.onTick = onTick;
    this.onEnd = onEnd;

    // Create force nodes from graph nodes
    const forceNodes: ForceNode[] = [];
    for (const node of nodes.values()) {
      forceNodes.push({
        id: node.id,
        x: node.x || Math.random() * 500,
        y: node.y || Math.random() * 500,
        depth: node.layer ?? 0,
      });
    }

    // Create force links from edges
    const nodeIds = new Set(nodes.keys());
    const forceLinks: ForceLink[] = edges
      .filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))
      .map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
      }));

    const avgNodeSize = 50;

    this.simulation = forceSimulation<ForceNode>(forceNodes)
      .force('link', forceLink<ForceNode, ForceLink>(forceLinks)
        .id((d) => d.id)
        .distance(layerSpacing * 0.8)
        .strength(0.5))
      .force('charge', forceManyBody<ForceNode>()
        .strength(-300)
        .distanceMax(500))
      .force('collide', forceCollide<ForceNode>()
        .radius(avgNodeSize)
        .strength(0.7))
      .force('center', forceCenter(400, 300).strength(0.05))
      .force('hierarchy', forceHierarchy(nodes, direction, layerSpacing, 0.6) as any)
      .alphaDecay(0.02)
      .velocityDecay(0.3)
      .on('tick', () => {
        if (this.onTick) {
          this.onTick(this.getResult());
        }
      })
      .on('end', () => {
        if (this.onEnd) {
          this.onEnd(this.getResult());
        }
      });
  }

  private getResult(): ForceResult {
    const positions = new Map<string, { x: number; y: number }>();
    if (this.simulation) {
      for (const node of this.simulation.nodes()) {
        positions.set(node.id, { x: node.x ?? 0, y: node.y ?? 0 });
      }
    }
    return { positions };
  }

  stop() {
    if (this.simulation) {
      this.simulation.stop();
      this.simulation = null;
    }
  }

  reheat() {
    if (this.simulation) {
      this.simulation.alpha(0.3).restart();
    }
  }

  dragStart(nodeId: string) {
    if (!this.simulation) return;
    this.simulation.alphaTarget(0.3).restart();
    const node = this.simulation.nodes().find((n) => n.id === nodeId);
    if (node) {
      node.fx = node.x;
      node.fy = node.y;
    }
  }

  dragMove(nodeId: string, x: number, y: number) {
    if (!this.simulation) return;
    const node = this.simulation.nodes().find((n) => n.id === nodeId);
    if (node) {
      node.fx = x;
      node.fy = y;
    }
  }

  dragEnd(nodeId: string) {
    if (!this.simulation) return;
    this.simulation.alphaTarget(0);
    const node = this.simulation.nodes().find((n) => n.id === nodeId);
    if (node) {
      node.fx = null;
      node.fy = null;
    }
  }
}
