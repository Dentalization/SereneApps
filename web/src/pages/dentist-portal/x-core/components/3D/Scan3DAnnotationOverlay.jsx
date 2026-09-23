import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import AppIcon from '../../../../../components/AppIcon';
import { TOOLS } from './scan3DMeasurements.mjs';

/**
 * Scan3DAnnotationOverlay
 *
 * Absolute-positioned HUD overlay over the VTK canvas.
 * Renders:
 *   - SVG distance lines between world points (projected to screen)
 *   - Floating labels (distance, point, text) that can be dragged
 *   - Pending pick indicator (first click waiting for second)
 *
 * World→Screen projection is performed by the caller via `worldToScreen`.
 * This component only owns layout/rendering; state lives in Scan3DMeshViewer.
 */
const Scan3DAnnotationOverlay = memo(function Scan3DAnnotationOverlay({
  measurements = [],
  pendingPick = null,
  worldToScreen,          // (worldPt) => {x, y} | null
  activeTool = TOOLS.NONE,
  onDeleteMeasurement,
  onRenameMeasurement,
  onMoveMeasurementLabel,
  containerRef,           // ref to the VTK container div (for bounds)
}) {
  const overlayRef = useRef(null);
  // Force re-render on each animation frame so screen projections stay fresh
  const [tick, setTick] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    let running = true;
    const loop = () => {
      if (!running) return;
      setTick(t => t + 1);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      running = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Project a world point to screen coords relative to the overlay div
  const project = useCallback((worldPt) => {
    if (!worldPt || !worldToScreen) return null;
    return worldToScreen(worldPt);
  }, [worldToScreen, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  // -------------------------------------------------------------------
  // Build screen-space data for each measurement
  // -------------------------------------------------------------------
  const projected = measurements.map(m => {
    if (m.type === 'measurement') {
      const s = project(m.coordinates?.world_start);
      const e = project(m.coordinates?.world_end);
      const mid = project(m.coordinates?.world_mid);
      return { ...m, screenStart: s, screenEnd: e, screenMid: mid, visible: !!(s && e) };
    }
    if (m.type === 'point' || m.type === 'text') {
      const pt = project(m.coordinates?.world_point);
      return { ...m, screenPt: pt, visible: !!pt };
    }
    return { ...m, visible: false };
  });

  const pendingScreen = pendingPick ? project(pendingPick) : null;

  // -------------------------------------------------------------------
  // Label drag logic (self-contained in each label)
  // -------------------------------------------------------------------

  return (
    <div
      ref={overlayRef}
      className="pointer-events-none absolute inset-0 z-20"
      style={{ userSelect: 'none' }}
    >
      {/* SVG Layer — lines, arrows, point markers */}
      <svg className="absolute inset-0 h-full w-full pointer-events-none" style={{ overflow: 'visible' }}>
        <defs>
          <marker id="arrowhead-scan3d" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
            <polygon points="0 0, 7 3.5, 0 7" fill="#22d3ee" opacity="0.9" />
          </marker>
        </defs>

        {/* Pending first-click indicator */}
        {pendingScreen && (
          <g>
            <circle cx={pendingScreen.x} cy={pendingScreen.y} r={8} fill="none" stroke="#22d3ee" strokeWidth="2" strokeDasharray="4 2" opacity="0.9" />
            <circle cx={pendingScreen.x} cy={pendingScreen.y} r={3} fill="#22d3ee" opacity="0.95" />
            <text x={pendingScreen.x + 12} y={pendingScreen.y + 4} fill="#22d3ee" fontSize="11" fontWeight="600" style={{ fontFamily: 'monospace' }}>
              Klik titik ke-2
            </text>
          </g>
        )}

        {projected.map(m => {
          if (!m.visible) return null;

          // Distance line
          if (m.type === 'measurement' && m.screenStart && m.screenEnd) {
            return (
              <g key={m.id}>
                {/* Glow shadow */}
                <line
                  x1={m.screenStart.x} y1={m.screenStart.y}
                  x2={m.screenEnd.x} y2={m.screenEnd.y}
                  stroke="#22d3ee" strokeWidth="4" strokeLinecap="round" opacity="0.18"
                />
                {/* Main line */}
                <line
                  x1={m.screenStart.x} y1={m.screenStart.y}
                  x2={m.screenEnd.x} y2={m.screenEnd.y}
                  stroke="#22d3ee" strokeWidth="1.8" strokeLinecap="round" opacity="0.88"
                />
                {/* Endpoint dots */}
                <circle cx={m.screenStart.x} cy={m.screenStart.y} r={4} fill="#22d3ee" opacity="0.9" />
                <circle cx={m.screenEnd.x} cy={m.screenEnd.y} r={4} fill="#22d3ee" opacity="0.9" />
              </g>
            );
          }

          // Point marker
          if (m.type === 'point' && m.screenPt) {
            const color = m.metadata?.color || '#38bdf8';
            return (
              <g key={m.id}>
                <circle cx={m.screenPt.x} cy={m.screenPt.y} r={10} fill={color} opacity="0.18" />
                <circle cx={m.screenPt.x} cy={m.screenPt.y} r={5} fill={color} opacity="0.9" />
                <circle cx={m.screenPt.x} cy={m.screenPt.y} r={5} fill="none" stroke="white" strokeWidth="1.2" opacity="0.7" />
              </g>
            );
          }

          // Text anchor dot
          if (m.type === 'text' && m.screenPt) {
            const color = m.metadata?.color || '#f59e0b';
            return (
              <g key={m.id}>
                <circle cx={m.screenPt.x} cy={m.screenPt.y} r={4} fill={color} opacity="0.9" />
              </g>
            );
          }

          return null;
        })}
      </svg>

      {/* DOM Label Layer — floating chips */}
      {projected.map(m => {
        if (!m.visible) return null;

        let anchorX = null;
        let anchorY = null;

        if (m.type === 'measurement' && m.screenMid) {
          anchorX = m.screenMid.x;
          anchorY = m.screenMid.y;
        } else if ((m.type === 'point' || m.type === 'text') && m.screenPt) {
          anchorX = m.screenPt.x;
          anchorY = m.screenPt.y;
        }

        if (anchorX === null) return null;

        const offset = m.metadata?.labelOffset || { x: 0, y: -20 };

        return (
          <DraggableLabel
            key={m.id}
            measurement={m}
            anchorX={anchorX}
            anchorY={anchorY}
            offset={offset}
            onDelete={onDeleteMeasurement}
            onRename={onRenameMeasurement}
            onMove={onMoveMeasurementLabel}
          />
        );
      })}

      {/* Active tool cursor hint — top-left badge */}
      {activeTool !== TOOLS.NONE && (
        <div
          className="pointer-events-none absolute left-1/2 top-16 -translate-x-1/2 z-30"
          style={{ pointerEvents: 'none' }}
        >
          <div className="flex items-center gap-1.5 rounded-full border border-cyan-400/40 bg-cyan-500/15 px-3 py-1 text-[11px] font-semibold text-cyan-200 shadow-lg backdrop-blur">
            {activeTool === TOOLS.DISTANCE && '📏 Klik dua titik untuk mengukur jarak'}
            {activeTool === TOOLS.POINT && '📍 Klik permukaan untuk menandai titik'}
            {activeTool === TOOLS.TEXT && '🏷️ Klik permukaan untuk menambah catatan'}
          </div>
        </div>
      )}
    </div>
  );
});

// ---------------------------------------------------------------------------
// DraggableLabel — individual floating measurement chip
// ---------------------------------------------------------------------------
function DraggableLabel({ measurement, anchorX, anchorY, offset, onDelete, onRename, onMove }) {
  const [editing, setEditing] = useState(false);
  const [draftLabel, setDraftLabel] = useState('');
  const [localOffset, setLocalOffset] = useState(offset);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef(null);
  const elemRef = useRef(null);

  // Sync offset from parent when not dragging
  useEffect(() => {
    if (!isDraggingRef.current) {
      setLocalOffset(offset);
    }
  }, [offset]);

  useEffect(() => {
    const label = measurement.metadata?.label
      || measurement.metadata?.text
      || (measurement.metadata?.distance_mm != null ? `${measurement.metadata.distance_mm.toFixed(1)} mm` : '');
    setDraftLabel(label);
  }, [measurement.metadata]);

  const x = anchorX + (localOffset?.x || 0);
  const y = anchorY + (localOffset?.y || 0);

  const handlePointerDown = (e) => {
    e.stopPropagation();
    if (editing) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    isDraggingRef.current = true;
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      baseOffset: { ...localOffset },
    };
  };

  const handlePointerMove = (e) => {
    if (!isDraggingRef.current || !dragStartRef.current) return;
    e.stopPropagation();
    const dx = e.clientX - dragStartRef.current.clientX;
    const dy = e.clientY - dragStartRef.current.clientY;
    setLocalOffset({
      x: dragStartRef.current.baseOffset.x + dx,
      y: dragStartRef.current.baseOffset.y + dy,
    });
  };

  const handlePointerUp = (e) => {
    if (!isDraggingRef.current) return;
    e.stopPropagation();
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (_) {}
    isDraggingRef.current = false;
    onMove?.(measurement.id, localOffset);
    dragStartRef.current = null;
  };

  const commitLabel = useCallback(() => {
    setEditing(false);
    onRename?.(measurement.id, draftLabel);
  }, [draftLabel, measurement.id, onRename]);

  let chipColor = 'bg-slate-950/90 border-cyan-400/40 text-white';
  if (measurement.type === 'point') chipColor = 'bg-slate-950/90 border-sky-400/40 text-sky-200';
  if (measurement.type === 'text') chipColor = 'bg-slate-950/90 border-amber-400/40 text-amber-200';

  return (
    <div
      ref={elemRef}
      className={`pointer-events-auto absolute z-30 flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold shadow-xl cursor-grab active:cursor-grabbing select-none ${chipColor}`}
      style={{
        left: `${x}px`,
        top: `${y}px`,
        transform: 'translate(-50%, -50%)',
        touchAction: 'none',
        backdropFilter: 'blur(8px)',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); }}
      title="Drag to move · Double-click to rename"
    >
      {editing ? (
        <input
          autoFocus
          type="text"
          value={draftLabel}
          onChange={e => setDraftLabel(e.target.value)}
          onBlur={commitLabel}
          onClick={e => e.stopPropagation()}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); commitLabel(); }
            if (e.key === 'Escape') { e.preventDefault(); setEditing(false); }
          }}
          className="w-28 rounded border border-cyan-400/50 bg-slate-900 px-1.5 py-0.5 text-[11px] text-white outline-none"
        />
      ) : (
        <span>
          {measurement.metadata?.distance_mm != null
            ? `${Number(measurement.metadata.distance_mm).toFixed(2)} mm`
            : (measurement.metadata?.label || measurement.metadata?.text || '—')}
        </span>
      )}

      {/* Delete button */}
      <button
        className="ml-0.5 rounded-full p-0.5 text-slate-400 hover:bg-rose-500/20 hover:text-rose-300 transition"
        onClick={e => { e.stopPropagation(); onDelete?.(measurement.id); }}
        title="Hapus"
        onPointerDown={e => e.stopPropagation()}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
          <path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

export default Scan3DAnnotationOverlay;
