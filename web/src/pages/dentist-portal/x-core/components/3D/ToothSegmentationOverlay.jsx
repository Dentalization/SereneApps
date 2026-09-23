import { useEffect, useRef, useCallback } from 'react';

/**
 * ToothSegmentationOverlay — Phase 12
 *
 * Renders FDI tooth labels as positioned badges on top of the VTK canvas.
 * Each badge is placed at the world-space centroid of a tooth instance,
 * projected to screen coordinates via the VTK renderer every animation frame.
 *
 * Props:
 *   toothInstances  — Array<ToothInstance> from useToothInstances
 *   renderer        — VTK renderer ref (vtkRenderer)
 *   renderWindow    — VTK render window ref
 *   containerRef    — Ref to the outer div that positions absolutely
 *   visible         — Boolean toggle
 *   selectedFdi     — FDI number of selected tooth (or null)
 *   onSelect        — (fdi: number | null) → void
 */
export default function ToothSegmentationOverlay({
  toothInstances = [],
  renderer,
  renderWindow,
  containerRef,
  visible = true,
  selectedFdi = null,
  onSelect,
}) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const tooltipRef = useRef(null);

  // Project world [x,y,z] → container-relative {left, top}
  const worldToScreen = useCallback((x, y, z) => {
    if (!renderer || !containerRef?.current) return null;
    try {
      const display = renderer.worldToDisplay(x, y, z);
      if (!display || display[2] < 0 || display[2] > 1) return null; // behind camera
      const container = containerRef.current.getBoundingClientRect();
      const size = renderer.getRenderWindow()?.getSize() || [container.width, container.height];
      return {
        left: Math.round(display[0] * (container.width / size[0])),
        top: Math.round((size[1] - display[1]) * (container.height / size[1])),
      };
    } catch {
      return null;
    }
  }, [renderer, containerRef]);

  // Repaint overlay canvas via rAF (tracks mesh rotation)
  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !visible || !renderer) return;

    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    for (const inst of toothInstances) {
      const [cx, cy, cz] = inst.centroid || [0, 0, 0];
      const pos = worldToScreen(cx, cy, cz);
      if (!pos) continue;

      const { left: sx, top: sy } = pos;
      if (sx < 0 || sx > w || sy < 0 || sy > h) continue;

      const isSelected = inst.fdi === selectedFdi;
      const color = inst.color_hint || '#64748b';

      // Dot
      ctx.beginPath();
      ctx.arc(sx, sy, isSelected ? 7 : 5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = isSelected ? 1.0 : 0.75;
      ctx.fill();
      if (isSelected) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.globalAlpha = 1.0;

      // FDI label badge
      const label = String(inst.fdi);
      const badgeW = 26;
      const badgeH = 18;
      const bx = sx + 9;
      const by = sy - badgeH / 2;

      // Badge background
      ctx.fillStyle = isSelected ? '#fff' : color;
      ctx.globalAlpha = isSelected ? 1.0 : 0.88;
      roundRect(ctx, bx, by, badgeW, badgeH, 5);
      ctx.fill();
      ctx.globalAlpha = 1.0;

      // Badge text
      ctx.font = `bold 11px Inter, system-ui, sans-serif`;
      ctx.fillStyle = isSelected ? color : '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, bx + badgeW / 2, by + badgeH / 2);
    }
  }, [toothInstances, visible, renderer, worldToScreen, selectedFdi]);

  // rAF loop tied to renderer
  useEffect(() => {
    if (!visible || !renderer || toothInstances.length === 0) {
      const canvas = canvasRef.current;
      if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    let running = true;
    const loop = () => {
      if (!running) return;
      paint();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [paint, visible, renderer, toothInstances]);

  // Resize canvas to match container
  useEffect(() => {
    const container = containerRef?.current;
    if (!container) return;
    const ro = new ResizeObserver(() => {
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
      }
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, [containerRef]);

  // Click hit-test: find closest instance to click point
  const handleCanvasClick = useCallback((e) => {
    if (!visible || !renderer) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    let closestFdi = null;
    let closestDist = 24; // px threshold

    for (const inst of toothInstances) {
      const [cx, cy, cz] = inst.centroid || [0, 0, 0];
      const pos = worldToScreen(cx, cy, cz);
      if (!pos) continue;
      const dist = Math.hypot(pos.left - mx, pos.top - my);
      if (dist < closestDist) {
        closestDist = dist;
        closestFdi = inst.fdi;
      }
    }

    onSelect?.(closestFdi === selectedFdi ? null : closestFdi);
  }, [toothInstances, visible, renderer, worldToScreen, onSelect, selectedFdi]);

  // Tooltip on hover
  const handleCanvasMouseMove = useCallback((e) => {
    if (!visible || !renderer || !tooltipRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    let hoveredInst = null;
    let closestDist = 28;

    for (const inst of toothInstances) {
      const [cx, cy, cz] = inst.centroid || [0, 0, 0];
      const pos = worldToScreen(cx, cy, cz);
      if (!pos) continue;
      const dist = Math.hypot(pos.left - mx, pos.top - my);
      if (dist < closestDist) {
        closestDist = dist;
        hoveredInst = inst;
      }
    }

    const tooltip = tooltipRef.current;
    if (hoveredInst) {
      tooltip.style.display = 'block';
      tooltip.style.left = `${mx + 14}px`;
      tooltip.style.top = `${my - 10}px`;
      tooltip.innerHTML = `
        <div style="font-weight:600;font-size:13px;color:#f1f5f9">FDI ${hoveredInst.fdi}</div>
        <div style="font-size:11px;color:#94a3b8;text-transform:capitalize;margin-top:2px">${hoveredInst.type}</div>
        <div style="font-size:10px;color:#64748b;margin-top:3px">
          Confidence: ${Math.round((hoveredInst.confidence || 0) * 100)}%
        </div>
        ${hoveredInst.experimental ? '<div style="font-size:9px;color:#f59e0b;margin-top:3px">⚠ Experimental (geometric heuristic)</div>' : ''}
      `;
    } else {
      tooltip.style.display = 'none';
    }
  }, [toothInstances, visible, renderer, worldToScreen]);

  const handleCanvasMouseLeave = () => {
    if (tooltipRef.current) tooltipRef.current.style.display = 'none';
  };

  if (!visible || toothInstances.length === 0) return null;

  return (
    <>
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        onMouseMove={handleCanvasMouseMove}
        onMouseLeave={handleCanvasMouseLeave}
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'auto',
          cursor: 'pointer',
          zIndex: 12,
        }}
      />
      <div
        ref={tooltipRef}
        style={{
          display: 'none',
          position: 'absolute',
          zIndex: 20,
          background: 'rgba(15,23,42,0.92)',
          border: '1px solid rgba(148,163,184,0.2)',
          borderRadius: 8,
          padding: '7px 10px',
          pointerEvents: 'none',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          maxWidth: 180,
        }}
      />
    </>
  );
}

// CanvasRenderingContext2D.roundRect polyfill helper
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
