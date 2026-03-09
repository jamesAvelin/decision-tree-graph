export interface TreeOption {
  label: string;
  src: string;
}

interface TreeSelectorProps {
  trees: TreeOption[];
  selected: string;
  onChange: (src: string) => void;
  loading: boolean;
}

export function TreeSelector({ trees, selected, onChange, loading }: TreeSelectorProps) {
  return (
    <div style={containerStyle}>
      <select
        value={selected}
        onChange={(e) => onChange(e.target.value)}
        disabled={loading}
        style={selectStyle}
      >
        {trees.map((tree) => (
          <option key={tree.src} value={tree.src}>
            {tree.label}
          </option>
        ))}
      </select>
      {loading && <span style={spinnerStyle}>Loading...</span>}
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  position: 'absolute',
  top: 16,
  right: 16,
  zIndex: 100,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
};

const selectStyle: React.CSSProperties = {
  appearance: 'none',
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  padding: '8px 32px 8px 12px',
  fontSize: 13,
  color: '#0f172a',
  cursor: 'pointer',
  fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
  backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%2394a3b8' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 10px center',
  minWidth: 200,
};

const spinnerStyle: React.CSSProperties = {
  fontSize: 11,
  color: '#94a3b8',
};
