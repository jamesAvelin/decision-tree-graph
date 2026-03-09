import { useEffect, useState, useCallback } from 'react';
import { useGraphStore } from './store/graphStore';
import { fetchGraphFromUrl } from './data/loadGraph';
import { GraphRenderer } from './rendering/GraphRenderer';
import { Toolbar } from './components/Toolbar';
import { SearchBar } from './components/SearchBar';
import { TreeSelector, type TreeOption } from './components/TreeSelector';

const TREES: TreeOption[] = [
  { label: 'TBI Assessment', src: '/trees/tbi-assessment.json' },
  { label: 'Chest Pain Triage', src: '/trees/chest-pain-triage.json' },
  { label: 'Sepsis Management', src: '/trees/sepsis-management.json' },
  { label: 'Acute Stroke Pathway', src: '/trees/stroke-pathway.json' },
  { label: 'Loan Approval (flat format)', src: '/trees/loan-approval.json' },
];

export default function App() {
  const setGraphData = useGraphStore((s) => s.setGraphData);
  const [selectedSrc, setSelectedSrc] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('src') || TREES[0].src;
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTree = useCallback((src: string) => {
    setLoading(true);
    setError(null);
    fetchGraphFromUrl(src)
      .then(({ nodes, edges, rootId }) => {
        setGraphData(nodes, edges, rootId);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load tree:', err);
        setError(`Failed to load: ${src}`);
        setLoading(false);
      });
  }, [setGraphData]);

  useEffect(() => {
    loadTree(selectedSrc);
  }, [selectedSrc, loadTree]);

  const handleTreeChange = useCallback((src: string) => {
    setSelectedSrc(src);
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', background: '#ffffff' }}>
      {!loading && <GraphRenderer />}
      {loading && (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif', color: '#64748b' }}>
          Loading decision tree...
        </div>
      )}
      <SearchBar />
      <Toolbar />
      <TreeSelector
        trees={TREES}
        selected={selectedSrc}
        onChange={handleTreeChange}
        loading={loading}
      />
      {error && (
        <div style={{
          position: 'absolute',
          bottom: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 8,
          padding: '8px 16px',
          color: '#991b1b',
          fontSize: 12,
          fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
          zIndex: 100,
        }}>
          {error}
        </div>
      )}
    </div>
  );
}
