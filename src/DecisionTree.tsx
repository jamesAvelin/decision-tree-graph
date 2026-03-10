import { useEffect, useState, forwardRef, useImperativeHandle, useCallback } from 'react';
import { useGraphStore } from './store/graphStore';
import { fetchGraphFromUrl, parseGraphJson } from './data/loadGraph';
import { GraphRenderer } from './rendering/GraphRenderer';
import { SearchBar } from './components/SearchBar';
import { Toolbar } from './components/Toolbar';

export interface NodeColorConfig {
  bg: string;
  border: string;
}

export interface DecisionTreeProps {
  /** URL to fetch the decision tree JSON from */
  src?: string;
  /** Direct data object (flat or nested JSON) — alternative to src */
  data?: unknown;
  /** Optional CSS class name on the container */
  className?: string;
  /** Optional inline styles on the container */
  style?: React.CSSProperties;
  /** Callback fired when a node is clicked */
  onNodeClick?: (nodeId: string, nodeData?: Record<string, unknown>) => void;
  /** Custom node colors keyed by node.type or node.data.colorKey */
  nodeColorMap?: Record<string, NodeColorConfig>;
}

export interface DecisionTreeRef {
  /** Expand ancestors of the node, highlight it, and zoom to it */
  navigateToNode: (id: string) => void;
  /** Reset zoom/pan and clear highlight */
  resetView: () => void;
  /** Set highlighted node without navigation */
  highlightNode: (id: string | null) => void;
}

export const DecisionTree = forwardRef<DecisionTreeRef, DecisionTreeProps>(
  function DecisionTree({ src, data, className, style, onNodeClick, nodeColorMap }, ref) {
    const setGraphData = useGraphStore((s) => s.setGraphData);
    const setHighlightedNodeId = useGraphStore((s) => s.setHighlightedNodeId);
    const toggleCollapse = useGraphStore((s) => s.toggleCollapse);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load data from either `data` prop or `src` URL
    useEffect(() => {
      if (data !== undefined) {
        try {
          const { nodes: parsedNodes, edges, rootId } = parseGraphJson(data);
          setGraphData(parsedNodes, edges, rootId);
          setLoading(false);
          setError(null);
        } catch (err) {
          console.error('DecisionTree: failed to parse data', err);
          setError('Failed to parse decision tree data.');
          setLoading(false);
        }
        return;
      }

      if (!src) {
        setError('DecisionTree requires either a "src" URL or "data" prop.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      fetchGraphFromUrl(src)
        .then(({ nodes, edges, rootId }) => {
          setGraphData(nodes, edges, rootId);
          setLoading(false);
        })
        .catch((err) => {
          console.error('DecisionTree: failed to load from', src, err);
          setError('Failed to load decision tree.');
          setLoading(false);
        });
    }, [src, data, setGraphData]);

    // Expand all ancestors of a node so it becomes visible
    const expandAncestors = useCallback((nodeId: string) => {
      const currentNodes = useGraphStore.getState().nodes;
      const target = currentNodes.get(nodeId);
      if (!target) return;

      // Walk up the parent chain and expand any collapsed ancestors
      const ancestors: string[] = [];
      let current = target;
      while (current.parentId) {
        const parent = currentNodes.get(current.parentId);
        if (!parent) break;
        if (parent.collapsed) ancestors.push(parent.id);
        current = parent;
      }

      // Expand from root towards target so each level becomes visible
      for (const ancestorId of ancestors.reverse()) {
        toggleCollapse(ancestorId);
      }
    }, [toggleCollapse]);

    useImperativeHandle(ref, () => ({
      navigateToNode(id: string) {
        expandAncestors(id);
        setHighlightedNodeId(id);
        // Trigger fit-view via the global exposed by GraphRenderer
        setTimeout(() => {
          const fitView = (window as any).__graphFitView;
          if (typeof fitView === 'function') fitView();
        }, 100);
      },
      resetView() {
        setHighlightedNodeId(null);
        const fitView = (window as any).__graphFitView;
        if (typeof fitView === 'function') fitView();
      },
      highlightNode(id: string | null) {
        setHighlightedNodeId(id);
      },
    }), [expandAncestors, setHighlightedNodeId]);

    const containerStyle: React.CSSProperties = {
      position: 'relative',
      width: '100%',
      height: '100%',
      background: '#ffffff',
      ...style,
    };

    if (loading) {
      return (
        <div className={className} style={{ ...containerStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif', color: '#64748b' }}>
          Loading decision tree...
        </div>
      );
    }

    if (error) {
      return (
        <div className={className} style={{ ...containerStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif', color: '#991b1b' }}>
          {error}
        </div>
      );
    }

    return (
      <div className={className} style={containerStyle}>
        <GraphRenderer onNodeClick={onNodeClick} nodeColorMap={nodeColorMap} />
        <SearchBar />
        <Toolbar />
      </div>
    );
  }
);
