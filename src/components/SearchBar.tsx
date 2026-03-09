import { useCallback, useMemo } from 'react';
import { useGraphStore } from '../store/graphStore';

export function SearchBar() {
  const searchQuery = useGraphStore((s) => s.searchQuery);
  const setSearchQuery = useGraphStore((s) => s.setSearchQuery);
  const setHighlightedNodeId = useGraphStore((s) => s.setHighlightedNodeId);
  const nodes = useGraphStore((s) => s.nodes);

  const matchingNodes = useMemo(() => {
    if (!searchQuery) return [];
    const q = searchQuery.toLowerCase();
    const results: { id: string; label: string }[] = [];
    for (const node of nodes.values()) {
      if (node.label.toLowerCase().includes(q)) {
        results.push({ id: node.id, label: node.label });
      }
    }
    return results;
  }, [searchQuery, nodes]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setHighlightedNodeId(null);
  }, [setSearchQuery, setHighlightedNodeId]);

  const handleSelect = useCallback((nodeId: string) => {
    setHighlightedNodeId(nodeId);
  }, [setHighlightedNodeId]);

  return (
    <div style={containerStyle}>
      <div style={inputWrapperStyle}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
          <circle cx="7" cy="7" r="5" stroke="#94a3b8" strokeWidth="1.5"/>
          <path d="M11 11l3.5 3.5" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <input
          type="text"
          value={searchQuery}
          onChange={handleChange}
          placeholder="Search nodes..."
          style={inputStyle}
        />
        {searchQuery && (
          <button
            style={clearStyle}
            onClick={() => { setSearchQuery(''); setHighlightedNodeId(null); }}
          >
            x
          </button>
        )}
      </div>

      {searchQuery && matchingNodes.length > 0 && (
        <div style={dropdownStyle}>
          {matchingNodes.slice(0, 8).map((node) => (
            <div
              key={node.id}
              style={resultStyle}
              onClick={() => handleSelect(node.id)}
            >
              {node.label}
            </div>
          ))}
          {matchingNodes.length > 8 && (
            <div style={{ ...resultStyle, color: '#94a3b8', cursor: 'default' }}>
              +{matchingNodes.length - 8} more
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  position: 'absolute',
  top: 16,
  left: 16,
  zIndex: 100,
  fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
};

const inputWrapperStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  padding: '8px 12px',
  width: 240,
  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
};

const inputStyle: React.CSSProperties = {
  flex: 1,
  background: 'transparent',
  border: 'none',
  outline: 'none',
  color: '#0f172a',
  fontSize: 13,
  fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
};

const clearStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#94a3b8',
  cursor: 'pointer',
  fontSize: 14,
  padding: 0,
  lineHeight: 1,
};

const dropdownStyle: React.CSSProperties = {
  marginTop: 4,
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  overflow: 'hidden',
  maxHeight: 240,
  overflowY: 'auto',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
};

const resultStyle: React.CSSProperties = {
  padding: '8px 12px',
  color: '#0f172a',
  fontSize: 12,
  cursor: 'pointer',
  borderBottom: '1px solid #f1f5f9',
};
