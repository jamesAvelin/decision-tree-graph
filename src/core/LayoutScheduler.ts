import type { GraphNode, GraphEdge, LayoutConfig } from './types';
import { computeSugiyamaLayout } from '../layout/sugiyama/SugiyamaLayout';
import { computeCompactLayout } from '../layout/compact/CompactTreeLayout';
import { ForceLayoutEngine } from '../layout/force/ForceLayout';
import { routeEdges } from '../layout/sugiyama/edgeRouting';
import { lerp } from '../utils/geometry';

export interface LayoutCallbacks {
  onPositionsUpdated: (positions: Map<string, { x: number; y: number }>) => void;
  onEdgePointsUpdated: (edgePoints: Map<string, [number, number][]>) => void;
  onAnimationStart: () => void;
  onAnimationEnd: () => void;
}

export class LayoutScheduler {
  private forceEngine = new ForceLayoutEngine();
  private animationFrame: number | null = null;
  private animationStartTime = 0;
  private animStartPositions = new Map<string, { x: number; y: number }>();
  private animTargetPositions = new Map<string, { x: number; y: number }>();
  private callbacks: LayoutCallbacks;
  private currentConfig: LayoutConfig | null = null;
  private lastNodes: Map<string, GraphNode> = new Map();
  private lastEdges: GraphEdge[] = [];

  constructor(callbacks: LayoutCallbacks) {
    this.callbacks = callbacks;
  }

  computeLayout(
    nodes: Map<string, GraphNode>,
    edges: GraphEdge[],
    rootId: string,
    config: LayoutConfig,
    containerWidth?: number,
  ) {
    this.currentConfig = config;
    this.lastNodes = nodes;
    this.lastEdges = edges;

    // Save current positions as animation start
    this.animStartPositions = new Map();
    for (const [id, node] of nodes) {
      this.animStartPositions.set(id, { x: node.x, y: node.y });
    }

    if (config.mode === 'compact') {
      this.forceEngine.stop();
      const result = computeCompactLayout(
        nodes, edges, rootId, config.direction, containerWidth,
      );
      this.animTargetPositions = result.positions;
      this.animateTransition(config.animationDuration, edges, nodes, result.edgePoints);
    } else if (config.mode === 'hierarchical') {
      this.forceEngine.stop();
      const result = computeSugiyamaLayout(
        nodes, edges, rootId,
        config.direction, config.layerSpacing, config.nodeSpacing,
        config.autoSpacing,
      );
      this.animTargetPositions = result.positions;
      this.animateTransition(config.animationDuration, edges, nodes, result.edgePoints);
    } else {
      this.forceEngine.start(
        nodes, edges,
        config.direction, config.layerSpacing, config.nodeSpacing,
        (result) => {
          this.callbacks.onPositionsUpdated(result.positions);
          const positionedNodes = new Map<string, GraphNode>();
          for (const [id, node] of nodes) {
            const pos = result.positions.get(id);
            if (pos) positionedNodes.set(id, { ...node, x: pos.x, y: pos.y });
          }
          const visibleEdges = edges.filter(
            (e) => result.positions.has(e.source) && result.positions.has(e.target),
          );
          const edgePoints = routeEdges(visibleEdges, positionedNodes, config.direction);
          this.callbacks.onEdgePointsUpdated(edgePoints);
        },
        (result) => {
          this.callbacks.onPositionsUpdated(result.positions);
          this.callbacks.onAnimationEnd();
        },
      );
    }
  }

  private animateTransition(
    duration: number,
    edges: GraphEdge[],
    nodes: Map<string, GraphNode>,
    finalEdgePoints: Map<string, [number, number][]>,
  ) {
    this.cancelAnimation();
    this.callbacks.onAnimationStart();
    this.animationStartTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - this.animationStartTime;
      const t = Math.min(1, elapsed / duration);
      const eased = t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2;

      const positions = new Map<string, { x: number; y: number }>();
      for (const [id] of this.animTargetPositions) {
        const start = this.animStartPositions.get(id) || { x: 0, y: 0 };
        const target = this.animTargetPositions.get(id)!;
        positions.set(id, {
          x: lerp(start.x, target.x, eased),
          y: lerp(start.y, target.y, eased),
        });
      }

      this.callbacks.onPositionsUpdated(positions);

      const positionedNodes = new Map<string, GraphNode>();
      for (const [id, node] of nodes) {
        const pos = positions.get(id);
        if (pos) positionedNodes.set(id, { ...node, x: pos.x, y: pos.y });
      }
      const visibleEdges = edges.filter(
        (e) => positions.has(e.source) && positions.has(e.target),
      );
      const edgePoints = routeEdges(visibleEdges, positionedNodes, this.currentConfig!.direction);
      this.callbacks.onEdgePointsUpdated(edgePoints);

      if (t < 1) {
        this.animationFrame = requestAnimationFrame(animate);
      } else {
        this.callbacks.onAnimationEnd();
      }
    };

    this.animationFrame = requestAnimationFrame(animate);
  }

  cancelAnimation() {
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  dragStart(nodeId: string) {
    if (this.currentConfig?.mode === 'force') {
      this.forceEngine.dragStart(nodeId);
    }
  }

  dragMove(nodeId: string, x: number, y: number) {
    if (this.currentConfig?.mode === 'force') {
      this.forceEngine.dragMove(nodeId, x, y);
    }
  }

  dragEnd(nodeId: string) {
    if (this.currentConfig?.mode === 'force') {
      this.forceEngine.dragEnd(nodeId);
    }
  }

  destroy() {
    this.cancelAnimation();
    this.forceEngine.stop();
  }
}
