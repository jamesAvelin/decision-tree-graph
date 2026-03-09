import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { zoom, zoomIdentity, type ZoomBehavior } from 'd3-zoom';
import { select } from 'd3-selection';
import 'd3-transition';
import { useGraphStore } from '../store/graphStore';
import type { GraphNode } from '../core/types';
import { LayoutScheduler } from '../core/LayoutScheduler';
import { CanvasEdgeLayer } from './CanvasEdgeLayer';
import { SvgNodeLayer } from './SvgNodeLayer';
import { MiniMap } from './MiniMap';
import { Tooltip } from './Tooltip';

export function GraphRenderer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const schedulerRef = useRef<LayoutScheduler | null>(null);
  const zoomRef = useRef<ZoomBehavior<HTMLDivElement, unknown> | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);
  const rootId = useGraphStore((s) => s.rootId);
  const layoutConfig = useGraphStore((s) => s.layoutConfig);
  const searchQuery = useGraphStore((s) => s.searchQuery);
  const hoveredNodeId = useGraphStore((s) => s.hoveredNodeId);
  const hoveredEdgeId = useGraphStore((s) => s.hoveredEdgeId);
  const highlightedNodeId = useGraphStore((s) => s.highlightedNodeId);
  const updateNodePositions = useGraphStore((s) => s.updateNodePositions);
  const updateEdgePoints = useGraphStore((s) => s.updateEdgePoints);
  const toggleCollapse = useGraphStore((s) => s.toggleCollapse);
  const setHoveredNodeId = useGraphStore((s) => s.setHoveredNodeId);
  const setIsAnimating = useGraphStore((s) => s.setIsAnimating);

  const isScrollMode = layoutConfig.mode === 'compact';

  const visibleNodes = useMemo(() => {
    if (!rootId) return [];
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
    const result: GraphNode[] = [];
    for (const id of visible) {
      const node = nodes.get(id);
      if (node) result.push(node);
    }
    return result;
  }, [nodes, rootId]);

  const visibleEdges = useMemo(() => {
    const visibleIds = new Set(visibleNodes.map((n) => n.id));
    return edges.filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target));
  }, [visibleNodes, edges]);

  // Compute graph bounds and scroll-mode transform
  const scrollInfo = useMemo(() => {
    if (!isScrollMode || visibleNodes.length === 0) {
      return { scrollTransform: { x: 0, y: 0, k: 1 }, graphHeight: dimensions.height };
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const node of visibleNodes) {
      minX = Math.min(minX, node.x - node.width / 2);
      minY = Math.min(minY, node.y - node.height / 2);
      maxX = Math.max(maxX, node.x + node.width / 2);
      maxY = Math.max(maxY, node.y + node.height / 2);
    }

    const padding = 40;
    const gh = maxY - minY + padding * 2;

    return {
      scrollTransform: {
        x: dimensions.width / 2, // center horizontally (layout centered at x=0)
        y: -minY + padding,
        k: 1,
      },
      graphHeight: Math.max(dimensions.height, gh),
    };
  }, [isScrollMode, visibleNodes, dimensions]);

  const activeTransform = isScrollMode ? scrollInfo.scrollTransform : transform;
  const contentHeight = isScrollMode ? scrollInfo.graphHeight : dimensions.height;

  // Initialize layout scheduler
  useEffect(() => {
    const scheduler = new LayoutScheduler({
      onPositionsUpdated: (positions) => {
        updateNodePositions(positions);
      },
      onEdgePointsUpdated: (edgePoints) => {
        updateEdgePoints(edgePoints);
      },
      onAnimationStart: () => setIsAnimating(true),
      onAnimationEnd: () => setIsAnimating(false),
    });
    schedulerRef.current = scheduler;
    return () => scheduler.destroy();
  }, [updateNodePositions, updateEdgePoints, setIsAnimating]);

  // Compute layout when config, visible nodes, or container width changes
  useEffect(() => {
    if (!schedulerRef.current || nodes.size === 0 || !rootId) return;

    const visibleNodeMap = new Map<string, typeof visibleNodes[0]>();
    for (const node of visibleNodes) {
      visibleNodeMap.set(node.id, {
        ...node,
        children: node.children.filter(
          (cid) => visibleNodeMap.has(cid) || visibleNodes.some((n) => n.id === cid),
        ),
      });
    }

    for (const [id, node] of visibleNodeMap) {
      visibleNodeMap.set(id, {
        ...node,
        children: node.children.filter((cid) => visibleNodeMap.has(cid)),
      });
    }

    const visibleEdgeList = edges.filter(
      (e) => visibleNodeMap.has(e.source) && visibleNodeMap.has(e.target),
    );

    schedulerRef.current.computeLayout(
      visibleNodeMap,
      visibleEdgeList,
      rootId,
      layoutConfig,
      dimensions.width, // pass container width for compact mode
    );
  }, [visibleNodes.length, layoutConfig, rootId, dimensions.width]);

  // Set up d3-zoom (only for non-scroll modes)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (isScrollMode) {
      // Remove zoom behavior in scroll mode
      select(container).on('.zoom', null);
      zoomRef.current = null;
      return;
    }

    const zoomBehavior = zoom<HTMLDivElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        const t = event.transform;
        setTransform({ x: t.x, y: t.y, k: t.k });
      });

    zoomRef.current = zoomBehavior;
    select(container).call(zoomBehavior);

    return () => {
      select(container).on('.zoom', null);
    };
  }, [isScrollMode]);

  // Resize observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  // Fit view (only for zoom modes)
  const fitView = useCallback(() => {
    if (isScrollMode) return;
    if (!containerRef.current || !zoomRef.current || visibleNodes.length === 0) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const node of visibleNodes) {
      minX = Math.min(minX, node.x - node.width / 2);
      minY = Math.min(minY, node.y - node.height / 2);
      maxX = Math.max(maxX, node.x + node.width / 2);
      maxY = Math.max(maxY, node.y + node.height / 2);
    }

    const padding = 60;
    const graphW = maxX - minX + padding * 2;
    const graphH = maxY - minY + padding * 2;
    const scale = Math.min(
      dimensions.width / graphW,
      dimensions.height / graphH,
      1.5,
    );

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const t = zoomIdentity
      .translate(dimensions.width / 2, dimensions.height / 2)
      .scale(scale)
      .translate(-centerX, -centerY);

    select(containerRef.current)
      .transition()
      .duration(500)
      .call(zoomRef.current.transform, t);
  }, [isScrollMode, visibleNodes, dimensions]);

  // Auto-fit on first load (zoom modes only)
  const hasFitted = useRef(false);
  useEffect(() => {
    if (isScrollMode) {
      hasFitted.current = true; // scroll mode doesn't need fit
      return;
    }
    if (!hasFitted.current && visibleNodes.length > 0 && visibleNodes[0].x !== 0) {
      hasFitted.current = true;
      setTimeout(fitView, 100);
    }
  }, [isScrollMode, visibleNodes, fitView]);

  // Auto-fit on resize (zoom modes only)
  const resizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (isScrollMode || !hasFitted.current) return;
    if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current);
    resizeTimerRef.current = setTimeout(fitView, 200);
    return () => {
      if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current);
    };
  }, [isScrollMode, dimensions, fitView]);

  // Navigate from minimap (zoom modes only)
  const handleMiniMapNavigate = useCallback((x: number, y: number) => {
    if (isScrollMode || !containerRef.current || !zoomRef.current) return;
    const t = zoomIdentity.translate(x, y).scale(transform.k);
    select(containerRef.current)
      .transition()
      .duration(300)
      .call(zoomRef.current.transform, t);
  }, [isScrollMode, transform.k]);

  // Node drag handlers (disabled in scroll mode)
  const handleDragStart = useCallback((nodeId: string) => {
    if (!isScrollMode) schedulerRef.current?.dragStart(nodeId);
  }, [isScrollMode]);

  const handleDragMove = useCallback((nodeId: string, clientX: number, clientY: number) => {
    if (isScrollMode) return;
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const graphX = (clientX - rect.left - transform.x) / transform.k;
    const graphY = (clientY - rect.top - transform.y) / transform.k;

    schedulerRef.current?.dragMove(nodeId, graphX, graphY);

    const positions = new Map<string, { x: number; y: number }>();
    positions.set(nodeId, { x: graphX, y: graphY });
    updateNodePositions(positions);
  }, [isScrollMode, transform, updateNodePositions]);

  const handleDragEnd = useCallback((nodeId: string) => {
    if (!isScrollMode) schedulerRef.current?.dragEnd(nodeId);
  }, [isScrollMode]);

  // Mouse tracking for tooltip
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  }, []);

  // Expose fitView globally for toolbar
  useEffect(() => {
    (window as any).__graphFitView = fitView;
    return () => { delete (window as any).__graphFitView; };
  }, [fitView]);

  const hoveredNode = hoveredNodeId ? nodes.get(hoveredNodeId) ?? null : null;

  const dotSpacing = 20;
  const dotRadius = 0.8;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflowY: isScrollMode ? 'auto' : 'hidden',
        overflowX: 'hidden',
        background: '#ffffff',
        cursor: isScrollMode ? 'default' : 'grab',
      }}
      onMouseMove={handleMouseMove}
    >
      {/* Inner content area — scrollable height in compact mode */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: contentHeight,
        }}
      >
        {/* Dot grid background */}
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
          }}
        >
          <defs>
            <pattern
              id="dotGrid"
              width={dotSpacing}
              height={dotSpacing}
              patternUnits="userSpaceOnUse"
              patternTransform={
                isScrollMode
                  ? undefined
                  : `translate(${transform.x}, ${transform.y}) scale(${transform.k})`
              }
            >
              <circle
                cx={dotSpacing / 2}
                cy={dotSpacing / 2}
                r={dotRadius}
                fill="#d1d5db"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dotGrid)" />
        </svg>

        <CanvasEdgeLayer
          edges={visibleEdges}
          nodes={nodes}
          transform={activeTransform}
          width={dimensions.width}
          height={contentHeight}
          hoveredEdgeId={hoveredEdgeId}
          searchQuery={searchQuery}
        />
        <SvgNodeLayer
          nodes={visibleNodes}
          transform={activeTransform}
          hoveredNodeId={hoveredNodeId}
          highlightedNodeId={highlightedNodeId}
          searchQuery={searchQuery}
          onNodeHover={setHoveredNodeId}
          onNodeClick={toggleCollapse}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
        />
      </div>

      {/* MiniMap only in zoom modes */}
      {!isScrollMode && (
        <MiniMap
          nodes={visibleNodes}
          transform={transform}
          viewWidth={dimensions.width}
          viewHeight={dimensions.height}
          onNavigate={handleMiniMapNavigate}
        />
      )}
      <Tooltip node={hoveredNode} x={mousePos.x} y={mousePos.y} />
    </div>
  );
}
