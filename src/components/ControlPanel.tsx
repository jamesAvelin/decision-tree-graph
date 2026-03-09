import { useMemo } from 'react';
import { useGraphStore } from '../store/graphStore';
import type { GraphNode } from '../core/types';

export function ControlPanel() {
  const layoutConfig = useGraphStore((s) => s.layoutConfig);
  const setLayoutMode = useGraphStore((s) => s.setLayoutMode);
  const setDirection = useGraphStore((s) => s.setDirection);
  const setLayerSpacing = useGraphStore((s) => s.setLayerSpacing);
  const setNodeSpacing = useGraphStore((s) => s.setNodeSpacing);
  const setAutoSpacing = useGraphStore((s) => s.setAutoSpacing);
  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);
  const rootId = useGraphStore((s) => s.rootId);

  const { visibleNodeCount, visibleEdgeCount } = useMemo(() => {
    if (!rootId) return { visibleNodeCount: 0, visibleEdgeCount: 0 };
    const visible = new Set<string>();
    const queue = [rootId];
    while (queue.length > 0) {
      const id = queue.shift()!;
      const node = nodes.get(id);
      if (!node) continue;
      visible.add(id);
      if (!node.collapsed) {
        for (const cid of node.children) queue.push(cid);
      }
    }
    return {
      visibleNodeCount: visible.size,
      visibleEdgeCount: edges.filter((e) => visible.has(e.source) && visible.has(e.target)).length,
    };
  }, [nodes, edges, rootId]);

  const isAuto = layoutConfig.autoSpacing;

  return (
    <div style={panelStyle}>
      <div style={headerStyle}>Layout Settings</div>

      <div style={sectionStyle}>
        <label style={labelStyle}>Mode</label>
        <div style={buttonGroupStyle}>
          <button
            style={layoutConfig.mode === 'compact' ? activeButtonStyle : buttonStyle}
            onClick={() => setLayoutMode('compact')}
          >
            Compact
          </button>
          <button
            style={layoutConfig.mode === 'hierarchical' ? activeButtonStyle : buttonStyle}
            onClick={() => setLayoutMode('hierarchical')}
          >
            Layered
          </button>
          <button
            style={layoutConfig.mode === 'force' ? activeButtonStyle : buttonStyle}
            onClick={() => setLayoutMode('force')}
          >
            Force
          </button>
        </div>
      </div>

      <div style={sectionStyle}>
        <label style={labelStyle}>Direction</label>
        <div style={buttonGroupStyle}>
          <button
            style={layoutConfig.direction === 'TB' ? activeButtonStyle : buttonStyle}
            onClick={() => setDirection('TB')}
          >
            Top-Down
          </button>
          <button
            style={layoutConfig.direction === 'LR' ? activeButtonStyle : buttonStyle}
            onClick={() => setDirection('LR')}
          >
            Left-Right
          </button>
        </div>
      </div>

      <div style={sectionStyle}>
        <label style={labelStyle}>Spacing</label>
        <div style={buttonGroupStyle}>
          <button
            style={isAuto ? activeButtonStyle : buttonStyle}
            onClick={() => setAutoSpacing(true)}
          >
            Auto
          </button>
          <button
            style={!isAuto ? activeButtonStyle : buttonStyle}
            onClick={() => setAutoSpacing(false)}
          >
            Manual
          </button>
        </div>
      </div>

      <div style={{ ...sectionStyle, opacity: isAuto ? 0.4 : 1, pointerEvents: isAuto ? 'none' : 'auto' }}>
        <label style={labelStyle}>
          Layer Spacing: {layoutConfig.layerSpacing}px
        </label>
        <input
          type="range"
          min={60}
          max={300}
          value={layoutConfig.layerSpacing}
          onChange={(e) => setLayerSpacing(Number(e.target.value))}
          style={sliderStyle}
          disabled={isAuto}
        />
      </div>

      <div style={{ ...sectionStyle, opacity: isAuto ? 0.4 : 1, pointerEvents: isAuto ? 'none' : 'auto' }}>
        <label style={labelStyle}>
          Node Spacing: {layoutConfig.nodeSpacing}px
        </label>
        <input
          type="range"
          min={20}
          max={150}
          value={layoutConfig.nodeSpacing}
          onChange={(e) => setNodeSpacing(Number(e.target.value))}
          style={sliderStyle}
          disabled={isAuto}
        />
      </div>

      <div style={{ ...sectionStyle, borderTop: '1px solid #e2e8f0', paddingTop: 12, marginTop: 4 }}>
        <div style={{ color: '#94a3b8', fontSize: 11 }}>
          Nodes: {visibleNodeCount} visible
        </div>
        <div style={{ color: '#94a3b8', fontSize: 11 }}>
          Edges: {visibleEdgeCount} visible
        </div>
      </div>
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  position: 'absolute',
  top: 16,
  left: 16,
  width: 220,
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: 12,
  padding: 16,
  zIndex: 100,
  boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
  fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
};

const headerStyle: React.CSSProperties = {
  color: '#0f172a',
  fontSize: 14,
  fontWeight: 600,
  marginBottom: 16,
};

const sectionStyle: React.CSSProperties = {
  marginBottom: 12,
};

const labelStyle: React.CSSProperties = {
  color: '#64748b',
  fontSize: 11,
  fontWeight: 500,
  display: 'block',
  marginBottom: 6,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const buttonGroupStyle: React.CSSProperties = {
  display: 'flex',
  gap: 4,
};

const buttonStyle: React.CSSProperties = {
  flex: 1,
  padding: '6px 8px',
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: 6,
  color: '#64748b',
  fontSize: 12,
  cursor: 'pointer',
  fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
};

const activeButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  background: '#0d9488',
  borderColor: '#0d9488',
  color: '#ffffff',
  fontWeight: 600,
};

const sliderStyle: React.CSSProperties = {
  width: '100%',
  accentColor: '#0d9488',
};
