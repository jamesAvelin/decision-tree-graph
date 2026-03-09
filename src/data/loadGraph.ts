import type { GraphNode, GraphEdge, NodeType } from '../core/types';

// --- Shared node sizing ---

const MIN_WIDTH = 240;
const MAX_WIDTH = 340;
const CHAR_WIDTH = 8.5;
const PADDING = 48;

export function computeNodeDimensions(label: string): { width: number; height: number } {
  const calculatedWidth = Math.ceil(label.length * CHAR_WIDTH + PADDING);
  const width = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, calculatedWidth));
  const lineCount = Math.ceil((label.length * 8) / (width - 32));
  const height = Math.max(56, 32 + lineCount * 22);
  return { width, height };
}

// --- Nested tree format ---

interface NestedTreeNode {
  id: string;
  label: string;
  type?: string;
  children?: NestedTreeNode[];
  edgeLabel?: string;
  data?: Record<string, unknown>;
}

function isNestedTree(json: unknown): json is NestedTreeNode {
  return (
    typeof json === 'object' &&
    json !== null &&
    'id' in json &&
    'label' in json
  );
}

function flattenNestedTree(
  def: NestedTreeNode,
  parentId: string | undefined,
  nodes: Map<string, GraphNode>,
  edges: GraphEdge[],
  edgeLabel?: string,
  depth = 0,
) {
  const { width, height } = computeNodeDimensions(def.label);
  const children = def.children || [];
  const hasChildren = children.length > 0;
  const nodeType: NodeType = (def.type === 'leaf' || def.type === 'chance') ? def.type : 'decision';

  nodes.set(def.id, {
    id: def.id,
    label: def.label,
    type: nodeType,
    parentId,
    children: children.map((c) => c.id),
    x: 0, y: 0, tx: 0, ty: 0,
    width,
    height,
    collapsed: hasChildren && depth >= 1,
    data: def.data,
  });

  if (parentId) {
    edges.push({
      id: `${parentId}->${def.id}`,
      source: parentId,
      target: def.id,
      label: edgeLabel,
      points: [],
    });
  }

  for (const child of children) {
    flattenNestedTree(child, def.id, nodes, edges, child.edgeLabel, depth + 1);
  }
}

function parseNestedTree(json: NestedTreeNode): { nodes: Map<string, GraphNode>; edges: GraphEdge[]; rootId: string } {
  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  flattenNestedTree(json, undefined, nodes, edges);
  return { nodes, edges, rootId: json.id };
}

// --- Flat node/edge format ---

interface FlatGraphJson {
  nodes: Array<{
    id: string;
    label: string;
    type?: string;
    data?: Record<string, unknown>;
  }>;
  edges: Array<{
    source: string;
    target: string;
    label?: string;
  }>;
  rootId?: string;
}

function isFlatGraph(json: unknown): json is FlatGraphJson {
  return (
    typeof json === 'object' &&
    json !== null &&
    'nodes' in json &&
    Array.isArray((json as FlatGraphJson).nodes) &&
    'edges' in json &&
    Array.isArray((json as FlatGraphJson).edges)
  );
}

function parseFlatGraph(json: FlatGraphJson): { nodes: Map<string, GraphNode>; edges: GraphEdge[]; rootId: string } {
  // Build child lists from edges
  const childrenMap = new Map<string, string[]>();
  const parentMap = new Map<string, string>();
  const targetIds = new Set<string>();

  for (const edge of json.edges) {
    if (!childrenMap.has(edge.source)) childrenMap.set(edge.source, []);
    childrenMap.get(edge.source)!.push(edge.target);
    parentMap.set(edge.target, edge.source);
    targetIds.add(edge.target);
  }

  // Infer root: node with no incoming edges, or explicit rootId
  const rootId = json.rootId || json.nodes.find((n) => !targetIds.has(n.id))?.id || json.nodes[0]?.id || 'root';

  // Compute depth for each node (for default collapse)
  const depthMap = new Map<string, number>();
  function computeDepth(nodeId: string, depth: number) {
    depthMap.set(nodeId, depth);
    const children = childrenMap.get(nodeId) || [];
    for (const cid of children) computeDepth(cid, depth + 1);
  }
  computeDepth(rootId, 0);

  const nodes = new Map<string, GraphNode>();
  for (const n of json.nodes) {
    const { width, height } = computeNodeDimensions(n.label);
    const children = childrenMap.get(n.id) || [];
    const hasChildren = children.length > 0;
    const depth = depthMap.get(n.id) ?? 0;
    const nodeType: NodeType = (n.type === 'leaf' || n.type === 'chance') ? n.type : 'decision';

    nodes.set(n.id, {
      id: n.id,
      label: n.label,
      type: nodeType,
      parentId: parentMap.get(n.id),
      children,
      x: 0, y: 0, tx: 0, ty: 0,
      width,
      height,
      collapsed: hasChildren && depth >= 1,
      data: n.data,
    });
  }

  const edges: GraphEdge[] = json.edges.map((e) => ({
    id: `${e.source}->${e.target}`,
    source: e.source,
    target: e.target,
    label: e.label,
    points: [],
  }));

  return { nodes, edges, rootId };
}

// --- Public API ---

export function parseGraphJson(json: unknown): { nodes: Map<string, GraphNode>; edges: GraphEdge[]; rootId: string } {
  if (isNestedTree(json)) return parseNestedTree(json);
  if (isFlatGraph(json)) return parseFlatGraph(json);
  throw new Error('Unrecognized JSON format. Expected nested tree or { nodes, edges }.');
}

export async function fetchGraphFromUrl(url: string): Promise<{ nodes: Map<string, GraphNode>; edges: GraphEdge[]; rootId: string }> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);
  const json = await response.json();
  return parseGraphJson(json);
}
