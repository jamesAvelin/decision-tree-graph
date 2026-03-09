import { useGraphStore } from '../store/graphStore';

export function Toolbar() {
  const isAnimating = useGraphStore((s) => s.isAnimating);

  const handleFitView = () => {
    const fitView = (window as any).__graphFitView;
    if (fitView) fitView();
  };

  return (
    <div style={toolbarStyle}>
      <button style={btnStyle} onClick={handleFitView} title="Fit to view (F)">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M2 5V3a1 1 0 011-1h2M11 2h2a1 1 0 011 1v2M14 11v2a1 1 0 01-1 1h-2M5 14H3a1 1 0 01-1-1v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>

      {isAnimating && (
        <div style={animIndicator}>
          <div style={spinnerStyle} />
        </div>
      )}
    </div>
  );
}

const toolbarStyle: React.CSSProperties = {
  position: 'absolute',
  top: 16,
  right: 16,
  display: 'flex',
  gap: 4,
  alignItems: 'center',
  zIndex: 100,
};

const btnStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  color: '#64748b',
  cursor: 'pointer',
  fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
};

const animIndicator: React.CSSProperties = {
  width: 36,
  height: 36,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const spinnerStyle: React.CSSProperties = {
  width: 16,
  height: 16,
  border: '2px solid #e2e8f0',
  borderTopColor: '#0d9488',
  borderRadius: '50%',
  animation: 'spin 0.8s linear infinite',
};
