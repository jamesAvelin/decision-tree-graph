import { useRef, useEffect, useCallback } from 'react';
import type { GraphEdge, GraphNode } from '../core/types';

interface CanvasEdgeLayerProps {
  edges: GraphEdge[];
  nodes: Map<string, GraphNode>;
  transform: { x: number; y: number; k: number };
  width: number;
  height: number;
  hoveredEdgeId: string | null;
  searchQuery: string;
}

/**
 * Place label at the midpoint of the total edge path length.
 * This positions labels between nodes rather than near the source where
 * they can be hidden behind node rectangles (canvas renders below SVG nodes).
 */
function findLabelPosition(points: [number, number][]): { x: number; y: number } {
  if (points.length < 2) {
    const p = points[0] || [0, 0];
    return { x: p[0], y: p[1] };
  }

  // Compute total path length
  let totalLen = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const dx = points[i + 1][0] - points[i][0];
    const dy = points[i + 1][1] - points[i][1];
    totalLen += Math.sqrt(dx * dx + dy * dy);
  }

  // Walk to the midpoint
  let remaining = totalLen / 2;
  for (let i = 0; i < points.length - 1; i++) {
    const dx = points[i + 1][0] - points[i][0];
    const dy = points[i + 1][1] - points[i][1];
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) continue;
    if (remaining <= len) {
      const t = remaining / len;
      return {
        x: points[i][0] + t * dx,
        y: points[i][1] + t * dy,
      };
    }
    remaining -= len;
  }

  // Fallback: midpoint of first and last point
  const first = points[0];
  const last = points[points.length - 1];
  return { x: (first[0] + last[0]) / 2, y: (first[1] + last[1]) / 2 };
}

export function CanvasEdgeLayer({
  edges,
  nodes,
  transform,
  width,
  height,
  hoveredEdgeId,
  searchQuery,
}: CanvasEdgeLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.k, transform.k);

    for (const edge of edges) {
      if (edge.points.length < 2) continue;

      const isHovered = edge.id === hoveredEdgeId;
      const source = nodes.get(edge.source);
      const target = nodes.get(edge.target);
      const isSearchMatch = searchQuery && (
        (source && source.label.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (target && target.label.toLowerCase().includes(searchQuery.toLowerCase()))
      );

      // Draw orthogonal step path
      ctx.beginPath();
      ctx.strokeStyle = isHovered
        ? '#0891b2'
        : isSearchMatch
          ? '#f59e0b'
          : '#374151';
      ctx.lineWidth = isHovered ? 2.5 : 2;
      ctx.lineJoin = 'round';

      ctx.moveTo(edge.points[0][0], edge.points[0][1]);
      for (let i = 1; i < edge.points.length; i++) {
        ctx.lineTo(edge.points[i][0], edge.points[i][1]);
      }
      ctx.stroke();

      // Arrowhead at the end
      const last = edge.points[edge.points.length - 1];
      const prev = edge.points[edge.points.length - 2];
      const angle = Math.atan2(last[1] - prev[1], last[0] - prev[0]);
      const arrowSize = 8;

      ctx.beginPath();
      ctx.fillStyle = isHovered ? '#0891b2' : '#374151';
      ctx.moveTo(last[0], last[1]);
      ctx.lineTo(
        last[0] - arrowSize * Math.cos(angle - Math.PI / 6),
        last[1] - arrowSize * Math.sin(angle - Math.PI / 6),
      );
      ctx.lineTo(
        last[0] - arrowSize * Math.cos(angle + Math.PI / 6),
        last[1] - arrowSize * Math.sin(angle + Math.PI / 6),
      );
      ctx.closePath();
      ctx.fill();

      // Edge label — positioned at midpoint of edge, offset above the line
      if (edge.label) {
        const pos = findLabelPosition(edge.points);
        const lx = pos.x;
        const ly = pos.y - 12; // slightly above the midpoint

        ctx.font = '600 11px Inter, ui-sans-serif, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const textWidth = ctx.measureText(edge.label).width;
        const padX = 6;
        const padY = 4;
        const rx = lx - textWidth / 2 - padX;
        const ry = ly - 7 - padY;
        const rw = textWidth + padX * 2;
        const rh = 14 + padY * 2;
        const radius = 4;

        // Rounded white background with subtle border
        ctx.beginPath();
        ctx.moveTo(rx + radius, ry);
        ctx.lineTo(rx + rw - radius, ry);
        ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + radius);
        ctx.lineTo(rx + rw, ry + rh - radius);
        ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - radius, ry + rh);
        ctx.lineTo(rx + radius, ry + rh);
        ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - radius);
        ctx.lineTo(rx, ry + radius);
        ctx.quadraticCurveTo(rx, ry, rx + radius, ry);
        ctx.closePath();
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = isHovered ? '#0891b2' : '#374151';
        ctx.fillText(edge.label, lx, ly);
      }
    }

    ctx.restore();
  }, [edges, nodes, transform, width, height, hoveredEdgeId, searchQuery]);

  useEffect(() => {
    const frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width,
        height,
        pointerEvents: 'none',
      }}
    />
  );
}
