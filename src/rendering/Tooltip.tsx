import type { GraphNode } from '../core/types';

interface TooltipProps {
  node: GraphNode | null;
  x: number;
  y: number;
}

export function Tooltip({ node, x, y }: TooltipProps) {
  if (!node) return null;

  return (
    <div
      style={{
        position: 'fixed',
        left: x + 12,
        top: y - 8,
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        padding: '8px 12px',
        color: '#0f172a',
        fontSize: 12,
        fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
        pointerEvents: 'none',
        zIndex: 1000,
        maxWidth: 260,
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{node.label}</div>
      <div style={{ color: '#64748b', marginBottom: 2 }}>
        Type: <span style={{ color: '#0f172a' }}>{node.type}</span>
      </div>
      <div style={{ color: '#64748b', marginBottom: 2 }}>
        Children: <span style={{ color: '#0f172a' }}>{node.children.length}</span>
      </div>
      {node.data && Object.entries(node.data).map(([key, value]) => (
        <div key={key} style={{ color: '#64748b' }}>
          {key}: <span style={{ color: '#0f172a' }}>{String(value)}</span>
        </div>
      ))}
    </div>
  );
}
