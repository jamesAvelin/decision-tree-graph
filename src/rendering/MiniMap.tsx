import { useMemo } from 'react';
import type { GraphNode } from '../core/types';

interface MiniMapProps {
  nodes: GraphNode[];
  transform: { x: number; y: number; k: number };
  viewWidth: number;
  viewHeight: number;
  onNavigate: (x: number, y: number) => void;
}

const MINIMAP_W = 180;
const MINIMAP_H = 120;
const PADDING = 20;

export function MiniMap({ nodes, transform, viewWidth, viewHeight, onNavigate }: MiniMapProps) {
  const { bounds, scale } = useMemo(() => {
    if (nodes.length === 0) {
      return { bounds: { minX: 0, minY: 0, maxX: 800, maxY: 600 }, scale: 1 };
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const node of nodes) {
      minX = Math.min(minX, node.x - node.width / 2);
      minY = Math.min(minY, node.y - node.height / 2);
      maxX = Math.max(maxX, node.x + node.width / 2);
      maxY = Math.max(maxY, node.y + node.height / 2);
    }

    minX -= PADDING;
    minY -= PADDING;
    maxX += PADDING;
    maxY += PADDING;

    const graphW = maxX - minX;
    const graphH = maxY - minY;
    const s = Math.min(MINIMAP_W / graphW, MINIMAP_H / graphH);

    return { bounds: { minX, minY, maxX, maxY }, scale: s };
  }, [nodes]);

  const vpX = (-transform.x / transform.k - bounds.minX) * scale;
  const vpY = (-transform.y / transform.k - bounds.minY) * scale;
  const vpW = (viewWidth / transform.k) * scale;
  const vpH = (viewHeight / transform.k) * scale;

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const graphX = mx / scale + bounds.minX;
    const graphY = my / scale + bounds.minY;

    onNavigate(
      -graphX * transform.k + viewWidth / 2,
      -graphY * transform.k + viewHeight / 2,
    );
  };

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 16,
        right: 16,
        width: MINIMAP_W,
        height: MINIMAP_H,
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      }}
    >
      <svg
        width={MINIMAP_W}
        height={MINIMAP_H}
        style={{ cursor: 'pointer' }}
        onClick={handleClick}
      >
        <rect width={MINIMAP_W} height={MINIMAP_H} fill="#f8fafc" />

        {nodes.map((node) => (
          <rect
            key={node.id}
            x={(node.x - node.width / 2 - bounds.minX) * scale}
            y={(node.y - node.height / 2 - bounds.minY) * scale}
            width={Math.max(node.width * scale, 2)}
            height={Math.max(node.height * scale, 2)}
            fill={node.type === 'leaf' ? '#10b981' : node.type === 'chance' ? '#f59e0b' : '#0d9488'}
            rx={1}
          />
        ))}

        <rect
          x={vpX}
          y={vpY}
          width={vpW}
          height={vpH}
          fill="rgba(13, 148, 136, 0.08)"
          stroke="#0d9488"
          strokeWidth={1}
          rx={2}
        />
      </svg>
    </div>
  );
}
