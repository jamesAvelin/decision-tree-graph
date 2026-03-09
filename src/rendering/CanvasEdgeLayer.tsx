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
 * Place label near the source (top) node so the decision is immediately visible.
 * Walks a short distance along the path from the start point.
 */
function findLabelPosition(points: [number, number][]): [number, number] {
  if (points.length < 2) return points[0] || [0, 0];

  const TARGET_DIST = 18; // pixels from source port
  let remaining = TARGET_DIST;

  for (let i = 0; i < points.length - 1; i++) {
    const dx = points[i + 1][0] - points[i][0];
    const dy = points[i + 1][1] - points[i][1];
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) continue;
    if (remaining <= len) {
      const t = remaining / len;
      return [points[i][0] + t * dx, points[i][1] + t * dy];
    }
    remaining -= len;
  }

  return points[1];
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

      // Edge label — plain text, no pill background
      if (edge.label) {
        const mid = findLabelPosition(edge.points);
        ctx.font = '600 12px Inter, ui-sans-serif, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Small white background behind text for readability
        const textWidth = ctx.measureText(edge.label).width;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(mid[0] - textWidth / 2 - 3, mid[1] - 8, textWidth + 6, 16);

        ctx.fillStyle = isHovered ? '#0891b2' : '#374151';
        ctx.fillText(edge.label, mid[0], mid[1]);
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
