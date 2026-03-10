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

      // Edge labels are rendered in SvgEdgeLabelLayer (above node layer)
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
