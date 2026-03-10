import { useMemo } from 'react';
import type { GraphEdge, GraphNode } from '../core/types';

interface SvgEdgeLabelLayerProps {
  edges: GraphEdge[];
  nodes: Map<string, GraphNode>;
  transform: { x: number; y: number; k: number };
  width: number;
  height: number;
  hoveredEdgeId: string | null;
}

/**
 * Compute label position: use edge midpoint if points exist, otherwise
 * fall back to midpoint between source and target node positions.
 */
function getLabelPosition(
  edge: GraphEdge,
  nodes: Map<string, GraphNode>,
): { x: number; y: number } | null {
  // Prefer edge points if available
  if (edge.points.length >= 2) {
    let totalLen = 0;
    for (let i = 0; i < edge.points.length - 1; i++) {
      const dx = edge.points[i + 1][0] - edge.points[i][0];
      const dy = edge.points[i + 1][1] - edge.points[i][1];
      totalLen += Math.sqrt(dx * dx + dy * dy);
    }

    let remaining = totalLen / 2;
    for (let i = 0; i < edge.points.length - 1; i++) {
      const dx = edge.points[i + 1][0] - edge.points[i][0];
      const dy = edge.points[i + 1][1] - edge.points[i][1];
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len === 0) continue;
      if (remaining <= len) {
        const t = remaining / len;
        return {
          x: edge.points[i][0] + t * dx,
          y: edge.points[i][1] + t * dy,
        };
      }
      remaining -= len;
    }

    const first = edge.points[0];
    const last = edge.points[edge.points.length - 1];
    return { x: (first[0] + last[0]) / 2, y: (first[1] + last[1]) / 2 };
  }

  // Fallback: midpoint between source and target nodes
  const source = nodes.get(edge.source);
  const target = nodes.get(edge.target);
  if (source && target) {
    return {
      x: (source.x + target.x) / 2,
      y: (source.y + target.y) / 2,
    };
  }

  return null;
}

/**
 * SVG overlay layer that renders edge labels ABOVE the node layer.
 * This solves the problem of canvas-rendered labels being hidden behind SVG node rectangles.
 */
export function SvgEdgeLabelLayer({
  edges,
  nodes,
  transform,
  width,
  height,
  hoveredEdgeId,
}: SvgEdgeLabelLayerProps) {
  const labelledEdges = useMemo(
    () => edges.filter((e) => e.label),
    [edges],
  );

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width,
        height,
        pointerEvents: 'none',
        overflow: 'visible',
      }}
    >
      <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}>
        {labelledEdges.map((edge) => {
          const pos = getLabelPosition(edge, nodes);
          if (!pos) return null;
          const lx = pos.x;
          const ly = pos.y - 12;
          const isHovered = edge.id === hoveredEdgeId;

          return (
            <EdgeLabel
              key={edge.id}
              label={edge.label!}
              x={lx}
              y={ly}
              isHovered={isHovered}
            />
          );
        })}
      </g>
    </svg>
  );
}

function EdgeLabel({
  label,
  x,
  y,
  isHovered,
}: {
  label: string;
  x: number;
  y: number;
  isHovered: boolean;
}) {
  const estimatedWidth = label.length * 6.5;
  const padX = 6;
  const padY = 4;
  const rw = estimatedWidth + padX * 2;
  const rh = 14 + padY * 2;
  const radius = 4;

  return (
    <g>
      <rect
        x={x - rw / 2}
        y={y - rh / 2}
        width={rw}
        height={rh}
        rx={radius}
        ry={radius}
        fill="#ffffff"
        stroke="#e2e8f0"
        strokeWidth={1}
      />
      <text
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="central"
        fill={isHovered ? '#0891b2' : '#374151'}
        style={{
          fontSize: '11px',
          fontWeight: 600,
          fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
        }}
      >
        {label}
      </text>
    </g>
  );
}
