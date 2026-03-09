import { create } from 'zustand';
import type { GraphNode, GraphEdge, LayoutConfig, LayoutMode, Direction } from '../core/types';

interface GraphState {
  nodes: Map<string, GraphNode>;
  edges: GraphEdge[];
  rootId: string;
  layoutConfig: LayoutConfig;
  searchQuery: string;
  highlightedNodeId: string | null;
  hoveredNodeId: string | null;
  hoveredEdgeId: string | null;
  isAnimating: boolean;

  setGraphData: (nodes: Map<string, GraphNode>, edges: GraphEdge[], rootId: string) => void;
  updateNodePositions: (positions: Map<string, { x: number; y: number }>) => void;
  updateNodeTargets: (targets: Map<string, { tx: number; ty: number }>) => void;
  updateEdgePoints: (edgePoints: Map<string, [number, number][]>) => void;
  toggleCollapse: (nodeId: string) => void;
  setLayoutMode: (mode: LayoutMode) => void;
  setDirection: (direction: Direction) => void;
  setLayerSpacing: (spacing: number) => void;
  setNodeSpacing: (spacing: number) => void;
  setAutoSpacing: (auto: boolean) => void;
  setSearchQuery: (query: string) => void;
  setHighlightedNodeId: (id: string | null) => void;
  setHoveredNodeId: (id: string | null) => void;
  setHoveredEdgeId: (id: string | null) => void;
  setIsAnimating: (animating: boolean) => void;
  getVisibleNodes: () => GraphNode[];
  getVisibleEdges: () => GraphEdge[];
}

function getVisibleNodeIds(nodes: Map<string, GraphNode>, rootId: string): Set<string> {
  const visible = new Set<string>();
  const queue = [rootId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    const node = nodes.get(id);
    if (!node) continue;
    visible.add(id);
    if (!node.collapsed) {
      for (const childId of node.children) {
        queue.push(childId);
      }
    }
  }
  return visible;
}

export const useGraphStore = create<GraphState>((set, get) => ({
  nodes: new Map(),
  edges: [],
  rootId: '',
  layoutConfig: {
    mode: 'compact',
    direction: 'TB',
    layerSpacing: 120,
    nodeSpacing: 60,
    animationDuration: 500,
    autoSpacing: true,
  },
  searchQuery: '',
  highlightedNodeId: null,
  hoveredNodeId: null,
  hoveredEdgeId: null,
  isAnimating: false,

  setGraphData: (nodes, edges, rootId) => set({ nodes: new Map(nodes), edges: [...edges], rootId }),

  updateNodePositions: (positions) => set((state) => {
    const nodes = new Map(state.nodes);
    for (const [id, pos] of positions) {
      const node = nodes.get(id);
      if (node) {
        nodes.set(id, { ...node, x: pos.x, y: pos.y });
      }
    }
    return { nodes };
  }),

  updateNodeTargets: (targets) => set((state) => {
    const nodes = new Map(state.nodes);
    for (const [id, t] of targets) {
      const node = nodes.get(id);
      if (node) {
        nodes.set(id, { ...node, tx: t.tx, ty: t.ty });
      }
    }
    return { nodes };
  }),

  updateEdgePoints: (edgePoints) => set((state) => {
    const edges = state.edges.map((edge) => {
      const points = edgePoints.get(edge.id);
      return points ? { ...edge, points } : edge;
    });
    return { edges };
  }),

  toggleCollapse: (nodeId) => set((state) => {
    const nodes = new Map(state.nodes);
    const node = nodes.get(nodeId);
    if (node && node.children.length > 0) {
      const expanding = node.collapsed;
      nodes.set(nodeId, { ...node, collapsed: !node.collapsed });
      // When expanding, keep children collapsed so only the next level is revealed
      if (expanding) {
        for (const childId of node.children) {
          const child = nodes.get(childId);
          if (child && child.children.length > 0) {
            nodes.set(childId, { ...child, collapsed: true });
          }
        }
      }
    }
    return { nodes };
  }),

  setLayoutMode: (mode) => set((state) => ({
    layoutConfig: { ...state.layoutConfig, mode },
  })),

  setDirection: (direction) => set((state) => ({
    layoutConfig: { ...state.layoutConfig, direction },
  })),

  setLayerSpacing: (spacing) => set((state) => ({
    layoutConfig: { ...state.layoutConfig, layerSpacing: spacing },
  })),

  setNodeSpacing: (spacing) => set((state) => ({
    layoutConfig: { ...state.layoutConfig, nodeSpacing: spacing },
  })),

  setAutoSpacing: (auto) => set((state) => ({
    layoutConfig: { ...state.layoutConfig, autoSpacing: auto },
  })),

  setSearchQuery: (query) => set({ searchQuery: query }),
  setHighlightedNodeId: (id) => set({ highlightedNodeId: id }),
  setHoveredNodeId: (id) => set({ hoveredNodeId: id }),
  setHoveredEdgeId: (id) => set({ hoveredEdgeId: id }),
  setIsAnimating: (animating) => set({ isAnimating: animating }),

  getVisibleNodes: () => {
    const { nodes, rootId } = get();
    const visibleIds = getVisibleNodeIds(nodes, rootId);
    const result: GraphNode[] = [];
    for (const id of visibleIds) {
      const node = nodes.get(id);
      if (node) result.push(node);
    }
    return result;
  },

  getVisibleEdges: () => {
    const { nodes, edges, rootId } = get();
    const visibleIds = getVisibleNodeIds(nodes, rootId);
    return edges.filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target));
  },
}));
