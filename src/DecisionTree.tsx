import { useEffect, useState } from 'react';
import { useGraphStore } from './store/graphStore';
import { fetchGraphFromUrl } from './data/loadGraph';
import { GraphRenderer } from './rendering/GraphRenderer';
import { SearchBar } from './components/SearchBar';
import { Toolbar } from './components/Toolbar';

export interface DecisionTreeProps {
  /** URL to fetch the decision tree JSON from */
  src: string;
  /** Optional CSS class name on the container */
  className?: string;
  /** Optional inline styles on the container */
  style?: React.CSSProperties;
}

export function DecisionTree({ src, className, style }: DecisionTreeProps) {
  const setGraphData = useGraphStore((s) => s.setGraphData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    fetchGraphFromUrl(src)
      .then(({ nodes, edges, rootId }) => {
        setGraphData(nodes, edges, rootId);
        setLoading(false);
      })
      .catch((err) => {
        console.error('DecisionTree: failed to load from', src, err);
        setError(`Failed to load decision tree.`);
        setLoading(false);
      });
  }, [src, setGraphData]);

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
      <GraphRenderer />
      <SearchBar />
      <Toolbar />
    </div>
  );
}
