export type NodeType = 'decision' | 'leaf' | 'chance';
export type LayoutMode = 'compact' | 'hierarchical' | 'force';
export type Direction = 'TB' | 'LR';

export interface GraphNode {
  id: string;
  label: string;
  type: NodeType;
  parentId?: string;
  children: string[];
  x: number;
  y: number;
  tx: number;
  ty: number;
  width: number;
  height: number;
  collapsed: boolean;
  layer?: number;
  order?: number;
  data?: Record<string, unknown>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  points: [number, number][];
}

export interface LayoutConfig {
  mode: LayoutMode;
  direction: Direction;
  layerSpacing: number;
  nodeSpacing: number;
  animationDuration: number;
  autoSpacing: boolean;
}

export interface GraphData {
  nodes: Map<string, GraphNode>;
  edges: GraphEdge[];
  rootId: string;
}
