import React, { memo, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import AppIcon from '../../../../../components/AppIcon';

const arrowHeadPoints = (startScreen, endScreen) => {
  const dx = endScreen.x - startScreen.x;
  const dy = endScreen.y - startScreen.y;
  const angle = Math.atan2(dy, dx);
  const head = Math.max(8, Math.min(14, Math.hypot(dx, dy) * 0.14));
  const leftX = endScreen.x - (head * Math.cos(angle - (Math.PI / 7)));
  const leftY = endScreen.y - (head * Math.sin(angle - (Math.PI / 7)));
  const rightX = endScreen.x - (head * Math.cos(angle + (Math.PI / 7)));
  const rightY = endScreen.y - (head * Math.sin(angle + (Math.PI / 7)));
  return `${endScreen.x},${endScreen.y} ${leftX},${leftY} ${rightX},${rightY}`;
};

const stopUiEvent = (event) => {
  event.stopPropagation();
};

const normalizeLabelOffset = (offset) => ({
  x: Number.isFinite(Number(offset?.x)) ? Number(offset.x) : 0,
  y: Number.isFinite(Number(offset?.y)) ? Number(offset.y) : 0,
});

const MeasurementLabel = memo(function MeasurementLabel({
  measurement,
  visible,
  positionStore,
  onMove,
  onRename,
}) {
  const elementRef = useRef(null);
  const [editing, setEditing] = useState(false);
  const [draftLabel, setDraftLabel] = useState(measurement.label || '');
  const position = useSyncExternalStore(
    useCallback((listener) => positionStore?.subscribe?.(measurement.id, listener) || (() => { }), [measurement.id, positionStore]),
    useCallback(() => positionStore?.getPosition?.(measurement.id) || null, [measurement.id, positionStore]),
    useCallback(() => positionStore?.getPosition?.(measurement.id) || null, [measurement.id, positionStore]),
  );
  const hasPosition = Boolean(position);
  const storedOffset = useMemo(
    () => normalizeLabelOffset(measurement.labelOffset),
    [measurement.labelOffset?.x, measurement.labelOffset?.y],
  );
  const canDrag = measurement.draggable !== false && Boolean(measurement.sourceId || measurement.id);

  const [dragOffset, setDragOffset] = useState(storedOffset);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef(null);
  const dragMovedRef = useRef(false);

  useEffect(() => {
    setDraftLabel(measurement.label || '');
  }, [measurement.label]);

  useEffect(() => {
    if (!isDragging) {
      setDragOffset(storedOffset);
    }
  }, [isDragging, storedOffset]);

  useEffect(() => {
    if (!elementRef.current || !position) return;
    elementRef.current.style.left = `${position.x + dragOffset.x}px`;
    elementRef.current.style.top = `${position.y + dragOffset.y}px`;
  }, [position, dragOffset]);

  const handlePointerDown = (event) => {
    event.stopPropagation();
    if (editing || !canDrag) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragMovedRef.current = false;
    dragStartRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      offsetX: dragOffset.x,
      offsetY: dragOffset.y,
      currentOffset: dragOffset,
    };
    setIsDragging(true);
  };

  const handlePointerMove = (event) => {
    if (!isDragging || !dragStartRef.current) return;
    event.stopPropagation();
    const dx = event.clientX - dragStartRef.current.startX;
    const dy = event.clientY - dragStartRef.current.startY;
    if (Math.hypot(dx, dy) > 2) {
      dragMovedRef.current = true;
    }
    const nextOffset = {
      x: dragStartRef.current.offsetX + dx,
      y: dragStartRef.current.offsetY + dy,
    };
    dragStartRef.current.currentOffset = nextOffset;
    setDragOffset(nextOffset);
  };

  const handlePointerUp = (event) => {
    if (!isDragging) return;
    event.stopPropagation();
    try { event.currentTarget.releasePointerCapture(event.pointerId); } catch (_) {}
    const finalOffset = dragStartRef.current?.currentOffset || dragOffset;
    setIsDragging(false);
    dragStartRef.current = null;
    onMove?.(measurement.sourceId || measurement.id, finalOffset);
  };

  const commitLabel = useCallback(() => {
    setEditing(false);
    onRename?.(measurement.sourceId || measurement.id, draftLabel);
  }, [draftLabel, measurement.id, measurement.sourceId, onRename]);

  return (
    <div
      ref={elementRef}
      className={`pointer-events-auto absolute z-30 -translate-x-1/2 -translate-y-1/2 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-xl cursor-grab active:cursor-grabbing select-none transition-[opacity,background-color,border-color] duration-200 ${measurement.isTotal
        ? 'bg-emerald-950/95 text-emerald-200 ring-2 ring-emerald-400/60 text-xs px-3 py-1.5'
        : 'bg-slate-950/85 text-white ring-1 ring-emerald-400/40'
        }`}
      style={{
        opacity: visible && hasPosition ? 1 : 0,
        pointerEvents: visible && hasPosition ? 'auto' : 'none',
        touchAction: 'none',
      }}
      title={editing ? '' : 'Drag to move · Double-click to rename · Click to copy'}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onDoubleClick={(event) => {
        event.stopPropagation();
        setEditing(true);
      }}
      onClick={(event) => {
        if (editing || isDragging || dragMovedRef.current) {
          dragMovedRef.current = false;
          return;
        }
        event.stopPropagation();
        navigator.clipboard?.writeText(`${measurement.distance.toFixed(2)} mm`).catch(() => { });
      }}
    >
      {editing ? (
        <input
          type="text"
          value={draftLabel}
          onChange={(event) => setDraftLabel(event.target.value)}
          onBlur={commitLabel}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              commitLabel();
            }
            if (event.key === 'Escape') {
              event.preventDefault();
              setDraftLabel(measurement.label || '');
              setEditing(false);
            }
          }}
          className="w-28 rounded-md border border-emerald-400/50 bg-slate-900 px-1.5 py-0.5 text-[11px] text-white outline-none"
          autoFocus
        />
      ) : (
        measurement.label || `${measurement.distance.toFixed(2)} mm`
      )}
    </div>
  );
});

const renderProjectedAnnotations = (
  annotations = [],
  strokeWidth = '2',
  includeText = false,
  hoverHandlers = {},
) => (
  <>
    <svg className="pointer-events-none absolute inset-0 h-full w-full">
      {annotations.map((annotation) => {
        if (annotation.type === 'arrow') {
          return (
            <g
              key={annotation.id}
              opacity={annotation.opacity ?? 1}
              style={{ pointerEvents: 'visiblePainted' }}
              onMouseEnter={(event) => hoverHandlers.onEnter?.(annotation, event)}
              onMouseMove={(event) => hoverHandlers.onMove?.(event)}
              onMouseLeave={hoverHandlers.onLeave}
            >
              <line
                x1={annotation.startScreen.x}
                y1={annotation.startScreen.y}
                x2={annotation.endScreen.x}
                y2={annotation.endScreen.y}
                stroke={annotation.color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
              />
              <polygon
                points={arrowHeadPoints(annotation.startScreen, annotation.endScreen)}
                fill={annotation.color}
              />
            </g>
          );
        }
        if (annotation.type === 'circle') {
          const radius = Math.max(2, Math.hypot(
            annotation.endScreen.x - annotation.startScreen.x,
            annotation.endScreen.y - annotation.startScreen.y,
          ));
          return (
            <circle
              key={annotation.id}
              style={{ pointerEvents: 'visiblePainted' }}
              cx={annotation.startScreen.x}
              cy={annotation.startScreen.y}
              r={radius}
              stroke={annotation.color}
              strokeWidth={strokeWidth}
              fill="none"
              opacity={annotation.opacity ?? 1}
              onMouseEnter={(event) => hoverHandlers.onEnter?.(annotation, event)}
              onMouseMove={(event) => hoverHandlers.onMove?.(event)}
              onMouseLeave={hoverHandlers.onLeave}
            />
          );
        }
        return null;
      })}
    </svg>
    {includeText && annotations.filter((annotation) => annotation.type === 'text').map((annotation) => (
      <div
        key={annotation.id}
        className="pointer-events-auto absolute -translate-y-1/2 rounded-full border border-white/15 bg-slate-950/85 px-2 py-0.5 text-[10px] font-semibold text-white shadow-xl"
        style={{
          left: annotation.screenPoint.x,
          top: annotation.screenPoint.y,
          opacity: annotation.opacity ?? 1,
        }}
        onMouseEnter={(event) => hoverHandlers.onEnter?.(annotation, event)}
        onMouseMove={(event) => hoverHandlers.onMove?.(event)}
        onMouseLeave={hoverHandlers.onLeave}
      >
        {annotation.label}
      </div>
    ))}
  </>
);

export default function Volume3DOverlayLayer({
  annotateMode,
  annotationTool,
  brushOperation,
  brushRadiusMm,
  commitTextDraft3D,
  hiddenAnnotationCount,
  isWorldBrushAnnotation,
  measureMode3D,
  measurePoints,
  measurements3D,
  measurementLabelStore,
  measurementLabelsVisible,
  measurementPreview,
  measurementScreenOverlays,
  onMoveMeasurementLabel,
  onRenameMeasurement,
  projectedSnapshotWorldOverlayAnnotations,
  projectedWorldOverlayAnnotations,
  selectedWorldAnnotation,
  textDraft3D,
  textDraftScreenPoint,
  setTextDraft3D,
  worldOverlayPreview,
}) {
  const [hoveredAnnotation, setHoveredAnnotation] = useState(null);
  const [hoverPosition, setHoverPosition] = useState(null);
  const hoverHandlers = useMemo(() => ({
    onEnter: (annotation, event) => {
      setHoveredAnnotation(annotation);
      setHoverPosition({ x: event.clientX, y: event.clientY });
    },
    onMove: (event) => setHoverPosition({ x: event.clientX, y: event.clientY }),
    onLeave: () => {
      setHoveredAnnotation(null);
      setHoverPosition(null);
    },
  }), []);
  return (
    <>
      {projectedSnapshotWorldOverlayAnnotations.length > 0 && (
        <div data-xcore-ui="true" className="pointer-events-none absolute inset-0 z-[14]">
          {renderProjectedAnnotations(projectedSnapshotWorldOverlayAnnotations, '2', true, hoverHandlers)}
        </div>
      )}

      {projectedWorldOverlayAnnotations.length > 0 && (
        <div data-xcore-ui="true" className="pointer-events-none absolute inset-0 z-[15]">
          {renderProjectedAnnotations(projectedWorldOverlayAnnotations, '2.25', true, hoverHandlers)}
          <svg className="absolute inset-0 h-full w-full">
            {worldOverlayPreview && worldOverlayPreview.type === 'arrow' && (
              <g opacity="0.9">
                <line
                  x1={worldOverlayPreview.startScreen.x}
                  y1={worldOverlayPreview.startScreen.y}
                  x2={worldOverlayPreview.endScreen.x}
                  y2={worldOverlayPreview.endScreen.y}
                  stroke={worldOverlayPreview.color}
                  strokeWidth="2"
                  strokeDasharray="6 5"
                  strokeLinecap="round"
                />
              </g>
            )}
            {worldOverlayPreview && worldOverlayPreview.type === 'circle' && (
              <circle
                cx={worldOverlayPreview.startScreen.x}
                cy={worldOverlayPreview.startScreen.y}
                r={Math.max(2, Math.hypot(
                  worldOverlayPreview.endScreen.x - worldOverlayPreview.startScreen.x,
                  worldOverlayPreview.endScreen.y - worldOverlayPreview.startScreen.y,
                ))}
                stroke={worldOverlayPreview.color}
                strokeWidth="2"
                strokeDasharray="6 5"
                fill="none"
                opacity="0.9"
              />
            )}
          </svg>
        </div>
      )}

      {textDraft3D && textDraftScreenPoint && (
        <div
          data-xcore-ui="true"
          className="absolute z-[82] -translate-y-1/2"
          style={{
            left: textDraftScreenPoint.x,
            top: textDraftScreenPoint.y,
          }}
        >
          <input
            type="text"
            value={textDraft3D.value}
            onChange={(event) => setTextDraft3D((current) => current ? { ...current, value: event.target.value } : current)}
            onBlur={(event) => commitTextDraft3D(event.target.value)}
            onPointerDown={stopUiEvent}
            onClick={stopUiEvent}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                event.stopPropagation();
                commitTextDraft3D(textDraft3D.value);
              }
              if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                setTextDraft3D(null);
              }
            }}
            placeholder="Add note"
            autoFocus
            className="w-40 rounded-lg border border-slate-600 bg-slate-900/95 px-3 py-1.5 text-xs text-white outline-none"
          />
        </div>
      )}

      {measurementScreenOverlays?.length > 0 && (
        <svg className="pointer-events-none absolute inset-0 z-20 h-full w-full">
          {measurementScreenOverlays.map((overlay) => {
            if (overlay.type === 'polyline') {
              return (
                <polyline
                  key={overlay.id}
                  points={(overlay.points || []).map((point) => `${point.x},${point.y}`).join(' ')}
                  fill="none"
                  stroke={overlay.color || 'rgba(29, 158, 117, 0.92)'}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="7 5"
                />
              );
            }
            return (
              <g key={overlay.id}>
                <line
                  x1={overlay.startScreen.x}
                  y1={overlay.startScreen.y}
                  x2={overlay.endScreen.x}
                  y2={overlay.endScreen.y}
                  stroke={overlay.color || 'rgba(29, 158, 117, 0.92)'}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeDasharray="7 5"
                />
                {[overlay.startScreen, overlay.endScreen].map((point, index) => (
                  <circle
                    key={`${overlay.id}-${index}`}
                    cx={point.x}
                    cy={point.y}
                    r="4"
                    fill="rgba(29, 158, 117, 0.95)"
                    stroke="rgba(255,255,255,0.9)"
                    strokeWidth="1.5"
                  />
                ))}
              </g>
            );
          })}
        </svg>
      )}

      {(measurements3D || []).map((measurement) => (
        <MeasurementLabel
          key={measurement.id}
          measurement={measurement}
          visible={measurementLabelsVisible}
          positionStore={measurementLabelStore}
          onMove={onMoveMeasurementLabel}
          onRename={onRenameMeasurement}
        />
      ))}

      {measurementPreview && (
        <>
          <svg className="pointer-events-none absolute inset-0 z-20 h-full w-full">
            <line
              x1={measurementPreview.startScreen.x}
              y1={measurementPreview.startScreen.y}
              x2={measurementPreview.endScreen.x}
              y2={measurementPreview.endScreen.y}
              stroke="rgba(29, 158, 117, 0.92)"
              strokeWidth="2"
              strokeDasharray="6 5"
              strokeLinecap="round"
            />
            <circle
              cx={measurementPreview.startScreen.x}
              cy={measurementPreview.startScreen.y}
              r="4.5"
              fill="rgba(29, 158, 117, 0.96)"
              stroke="rgba(255,255,255,0.92)"
              strokeWidth="1.5"
            />
            <circle
              cx={measurementPreview.endScreen.x}
              cy={measurementPreview.endScreen.y}
              r="4.5"
              fill="rgba(29, 158, 117, 0.96)"
              stroke="rgba(255,255,255,0.92)"
              strokeWidth="1.5"
            />
          </svg>
          <div
            className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-950/80 px-2.5 py-1 text-[11px] font-semibold text-white shadow-xl ring-1 ring-emerald-400/30"
            style={{ left: measurementPreview.midpointScreen.x, top: measurementPreview.midpointScreen.y }}
          >
            {measurementPreview.distance.toFixed(2)} mm
          </div>
        </>
      )}

      {measureMode3D && measurePoints.length === 1 && (
        <div className="pointer-events-none absolute left-1/2 top-20 z-30 -translate-x-1/2 rounded-full bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-100 ring-1 ring-emerald-400/40 backdrop-blur">
          First point set — move to preview, click second point
        </div>
      )}

      {annotateMode && annotationTool === 'freehand' && (
        <div className="pointer-events-none absolute left-1/2 top-20 z-30 -translate-x-1/2 rounded-full bg-rose-500/15 px-3 py-1.5 text-xs font-semibold text-rose-100 ring-1 ring-rose-400/35 backdrop-blur">
          Drag on the bone surface to trace a 3D segmentation loop
        </div>
      )}

      {annotateMode && annotationTool === 'brush' && (
        <div className="pointer-events-none absolute left-1/2 top-20 z-30 -translate-x-1/2 rounded-full bg-amber-500/15 px-3 py-1.5 text-xs font-semibold text-amber-100 ring-1 ring-amber-400/35 backdrop-blur">
          {brushOperation === 'subtract' ? 'Subtract from' : 'Paint on'} the bone surface {selectedWorldAnnotation && isWorldBrushAnnotation(selectedWorldAnnotation) ? 'for the selected 3D segment' : 'to create or update a 3D segment'} · Brush {brushRadiusMm.toFixed(1)} mm
        </div>
      )}

      {!annotateMode && hiddenAnnotationCount > 0 && (
        <div className="pointer-events-none absolute left-1/2 top-20 z-30 -translate-x-1/2 rounded-full bg-amber-500/15 px-3 py-1.5 text-xs font-semibold text-amber-100 ring-1 ring-amber-400/30 backdrop-blur">
          {hiddenAnnotationCount} annotation{hiddenAnnotationCount > 1 ? 's are' : ' is'} hidden until the saved camera view is restored
        </div>
      )}

      {hoveredAnnotation && hoverPosition && !annotateMode && (
        <div
          className="pointer-events-none fixed z-[200] rounded-xl border border-white/15 bg-slate-950/95 px-3 py-2 text-xs text-white shadow-2xl backdrop-blur"
          style={{ left: hoverPosition.x + 12, top: hoverPosition.y - 8 }}
        >
          <div className="flex items-center gap-1.5 font-semibold text-slate-200">
            <AppIcon name="Info" size={11} className="text-cyan-400" />
            {hoveredAnnotation.metadata?.finding_type || hoveredAnnotation.type || 'Annotation'}
          </div>
          {hoveredAnnotation.metadata?.severity && (
            <div className="mt-0.5 text-[10px] text-slate-400">
              Severity: {hoveredAnnotation.metadata.severity}
            </div>
          )}
        </div>
      )}
    </>
  );
}
