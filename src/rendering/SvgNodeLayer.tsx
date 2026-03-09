import { memo, useCallback } from 'react';
import type { GraphNode } from '../core/types';

interface SvgNodeLayerProps {
  nodes: GraphNode[];
  transform: { x: number; y: number; k: number };
  hoveredNodeId: string | null;
  highlightedNodeId: string | null;
  searchQuery: string;
  onNodeHover: (id: string | null) => void;
  onNodeClick: (id: string) => void;
  onDragStart: (id: string, x: number, y: number) => void;
  onDragMove: (id: string, x: number, y: number) => void;
  onDragEnd: (id: string) => void;
}

// Word-wrap text into lines that fit within maxWidth at a given font size
function wrapText(text: string, maxWidth: number, fontSize: number): string[] {
  const charWidth = fontSize * 0.55; // approximate average character width
  const maxChars = Math.floor(maxWidth / charWidth);
  if (text.length <= maxChars) return [text];

  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const test = current ? current + ' ' + word : word;
    if (test.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

const NodeComponent = memo(function NodeComponent({
  node,
  isHovered,
  isHighlighted,
  isSearchMatch,
  onHover,
  onClick,
  onDragStart,
}: {
  node: GraphNode;
  isHovered: boolean;
  isHighlighted: boolean;
  isSearchMatch: boolean;
  onHover: (id: string | null) => void;
  onClick: (id: string) => void;
  onDragStart: (id: string, x: number, y: number) => void;
}) {
  const hasChildren = node.children.length > 0;

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.button !== 0) return;

    let dragging = false;

    onDragStart(node.id, node.x, node.y);

    const handleMouseMove = (me: MouseEvent) => {
      dragging = true;
      const el = e.currentTarget as SVGElement;
      const svg = el.closest('svg');
      if (!svg) return;

      const event = new CustomEvent('node-drag', {
        detail: { nodeId: node.id, clientX: me.clientX, clientY: me.clientY },
        bubbles: true,
      });
      svg.dispatchEvent(event);
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);

      if (!dragging) {
        onClick(node.id);
      }

      const svg = (e.currentTarget as SVGElement)?.closest?.('svg');
      if (svg) {
        const event = new CustomEvent('node-drag-end', {
          detail: { nodeId: node.id },
          bubbles: true,
        });
        svg.dispatchEvent(event);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [node.id, node.x, node.y, onClick, onDragStart]);

  const w = node.width;
  const h = node.height;
  const x = node.x - w / 2;
  const y = node.y - h / 2;

  const borderColor = isHighlighted || isSearchMatch
    ? '#f59e0b'
    : isHovered
      ? '#0891b2'
      : '#83d6e8';

  const strokeWidth = isHovered || isHighlighted || isSearchMatch ? 2 : 1;
  const bgColor = isHovered ? '#d5f3fa' : '#e1f8fd';

  // Wrap label text
  const fontSize = 14;
  const lines = wrapText(node.label, w - 32, fontSize);
  const lineHeight = fontSize * 1.4;
  const textBlockHeight = lines.length * lineHeight;
  const textStartY = (h - textBlockHeight) / 2 + fontSize;

  return (
    <g
      transform={`translate(${x}, ${y})`}
      onMouseEnter={() => onHover(node.id)}
      onMouseLeave={() => onHover(null)}
      onMouseDown={handleMouseDown}
      style={{ cursor: 'pointer', pointerEvents: 'auto' }}
    >
      {/* Shadow (shadow-lg) */}
      <rect
        x={0}
        y={3}
        width={w}
        height={h}
        rx={6}
        fill="rgba(0,0,0,0.1)"
        filter="url(#shadowBlur)"
      />

      {/* Node body */}
      <rect
        width={w}
        height={h}
        rx={6}
        fill={bgColor}
        stroke={borderColor}
        strokeWidth={strokeWidth}
      />

      {/* Centered label text */}
      <text
        x={w / 2}
        textAnchor="middle"
        fill="#111827"
        fontSize={fontSize}
        fontFamily="Inter, ui-sans-serif, system-ui, sans-serif"
        fontWeight={500}
      >
        {lines.map((line, i) => (
          <tspan
            key={i}
            x={w / 2}
            y={textStartY + i * lineHeight}
          >
            {line}
          </tspan>
        ))}
      </text>

      {/* Top handle (connection point) */}
      {node.parentId && (
        <circle
          cx={w / 2}
          cy={0}
          r={3}
          fill="#1a192b"
          stroke="#ffffff"
          strokeWidth={1}
        />
      )}

      {/* +/- toggle on bottom edge */}
      {hasChildren && (
        <g transform={`translate(${w / 2}, ${h})`}>
          <circle
            r={10}
            fill={node.collapsed ? '#0d9488' : '#ffffff'}
            stroke={node.collapsed ? '#0d9488' : '#83d6e8'}
            strokeWidth={1.5}
          />
          <text
            textAnchor="middle"
            dominantBaseline="central"
            fill={node.collapsed ? '#ffffff' : '#0d9488'}
            fontSize={14}
            fontWeight="700"
            fontFamily="Inter, ui-sans-serif, system-ui, sans-serif"
            dy={0.5}
          >
            {node.collapsed ? '+' : '\u2212'}
          </text>
        </g>
      )}
    </g>
  );
});

export function SvgNodeLayer({
  nodes,
  transform,
  hoveredNodeId,
  highlightedNodeId,
  searchQuery,
  onNodeHover,
  onNodeClick,
  onDragStart,
  onDragMove,
  onDragEnd,
}: SvgNodeLayerProps) {
  const handleCustomDrag = useCallback((e: Event) => {
    const detail = (e as CustomEvent).detail;
    onDragMove(detail.nodeId, detail.clientX, detail.clientY);
  }, [onDragMove]);

  const handleCustomDragEnd = useCallback((e: Event) => {
    const detail = (e as CustomEvent).detail;
    onDragEnd(detail.nodeId);
  }, [onDragEnd]);

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        overflow: 'visible',
      }}
      ref={(svg) => {
        if (svg) {
          svg.addEventListener('node-drag', handleCustomDrag);
          svg.addEventListener('node-drag-end', handleCustomDragEnd);
        }
      }}
    >
      {/* Shadow filter definition */}
      <defs>
        <filter id="shadowBlur" x="-20%" y="-20%" width="140%" height="160%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="4" />
          <feOffset dy="2" />
          <feComposite in2="SourceAlpha" operator="arithmetic" k2="-1" k3="1" />
          <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.08 0" />
          <feBlend in2="SourceGraphic" />
        </filter>
      </defs>

      <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}>
        {nodes.map((node) => {
          const isSearchMatch = searchQuery !== '' &&
            node.label.toLowerCase().includes(searchQuery.toLowerCase());

          return (
            <NodeComponent
              key={node.id}
              node={node}
              isHovered={node.id === hoveredNodeId}
              isHighlighted={node.id === highlightedNodeId}
              isSearchMatch={isSearchMatch}
              onHover={onNodeHover}
              onClick={onNodeClick}
              onDragStart={onDragStart}
            />
          );
        })}
      </g>
    </svg>
  );
}
