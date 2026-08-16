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

  const dragOffsetRef = useRef(storedOffset);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef(null);
  const dragMovedRef = useRef(false);

  useEffect(() => {
    setDraftLabel(measurement.label || '');
  }, [measurement.label]);

  useEffect(() => {
    if (!isDraggingRef.current) {
      dragOffsetRef.current = storedOffset;
      if (elementRef.current && position) {
        elementRef.current.style.left = `${position.x + storedOffset.x}px`;
        elementRef.current.style.top = `${position.y + storedOffset.y}px`;
      }
    }
  }, [position, storedOffset]);

  const handlePointerDown = (event) => {
    event.stopPropagation();
    if (editing || !canDrag) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragMovedRef.current = false;
    isDraggingRef.current = true;
    dragStartRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      offsetX: dragOffsetRef.current.x,
      offsetY: dragOffsetRef.current.y,
      currentOffset: { ...dragOffsetRef.current },
    };
  };

  const handlePointerMove = (event) => {
    if (!isDraggingRef.current || !dragStartRef.current) return;
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
    dragOffsetRef.current = nextOffset;

    if (elementRef.current && position) {
      elementRef.current.style.left = `${position.x + nextOffset.x}px`;
      elementRef.current.style.top = `${position.y + nextOffset.y}px`;
    }
  };

  const handlePointerUp = (event) => {
    if (!isDraggingRef.current) return;
    event.stopPropagation();
    try { event.currentTarget.releasePointerCapture(event.pointerId); } catch (_) { }
    const finalOffset = dragStartRef.current?.currentOffset || dragOffsetRef.current;
    isDraggingRef.current = false;
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
        left: position ? `${position.x + dragOffsetRef.current.x}px` : undefined,
        top: position ? `${position.y + dragOffsetRef.current.y}px` : undefined,
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
        if (editing || isDraggingRef.current || dragMovedRef.current) {
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

const ProjectedAnnotationsGroup = memo(function ProjectedAnnotationsGroup({
  annotations = [],
  strokeWidth = '2',
  includeText = false,
  hoverHandlers = {},
  className = 'pointer-events-none absolute inset-0',
}) {
  if (!annotations || annotations.length === 0) return null;

  return (
    <div data-xcore-ui="true" className={className}>
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
          className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/15 bg-slate-950/85 px-2.5 py-1 text-[11px] font-semibold text-white shadow-xl select-none"
          style={{
            left: `${annotation.screenPoint.x}px`,
            top: `${annotation.screenPoint.y}px`,
            opacity: annotation.opacity ?? 1,
          }}
          onMouseEnter={(event) => hoverHandlers.onEnter?.(annotation, event)}
          onMouseMove={(event) => hoverHandlers.onMove?.(event)}
          onMouseLeave={hoverHandlers.onLeave}
        >
          {annotation.label}
        </div>
      ))}
    </div>
  );
});

const MeasurementOverlaysLayer = memo(function MeasurementOverlaysLayer({
  overlays = [],
}) {
  if (!overlays || overlays.length === 0) return null;

  return (
    <svg className="pointer-events-none absolute inset-0 z-20 h-full w-full">
      {overlays.map((overlay) => {
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
  );
});

const WorldOverlayPreviewLayer = memo(function WorldOverlayPreviewLayer({
  preview,
}) {
  if (!preview) return null;

  return (
    <div data-xcore-ui="true" className="pointer-events-none absolute inset-0 z-[16]">
      <svg className="absolute inset-0 h-full w-full">
        {preview.type === 'arrow' && (
          <g opacity="0.9">
            <line
              x1={preview.startScreen.x}
              y1={preview.startScreen.y}
              x2={preview.endScreen.x}
              y2={preview.endScreen.y}
              stroke={preview.color}
              strokeWidth="2"
              strokeDasharray="6 5"
              strokeLinecap="round"
            />
          </g>
        )}
        {preview.type === 'circle' && (
          <circle
            cx={preview.startScreen.x}
            cy={preview.startScreen.y}
            r={Math.max(2, Math.hypot(
              preview.endScreen.x - preview.startScreen.x,
              preview.endScreen.y - preview.startScreen.y,
            ))}
            stroke={preview.color}
            strokeWidth="2"
            strokeDasharray="6 5"
            fill="none"
            opacity="0.9"
          />
        )}
      </svg>
    </div>
  );
});

const MeasurementPreviewLayer = memo(function MeasurementPreviewLayer({
  preview,
}) {
  if (!preview) return null;

  return (
    <>
      <svg className="pointer-events-none absolute inset-0 z-20 h-full w-full">
        <line
          x1={preview.startScreen.x}
          y1={preview.startScreen.y}
          x2={preview.endScreen.x}
          y2={preview.endScreen.y}
          stroke="rgba(29, 158, 117, 0.92)"
          strokeWidth="2"
          strokeDasharray="6 5"
          strokeLinecap="round"
        />
        <circle
          cx={preview.startScreen.x}
          cy={preview.startScreen.y}
          r="4.5"
          fill="rgba(29, 158, 117, 0.96)"
          stroke="rgba(255,255,255,0.92)"
          strokeWidth="1.5"
        />
        <circle
          cx={preview.endScreen.x}
          cy={preview.endScreen.y}
          r="4.5"
          fill="rgba(29, 158, 117, 0.96)"
          stroke="rgba(255,255,255,0.92)"
          strokeWidth="1.5"
        />
      </svg>
      <div
        className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-950/80 px-2.5 py-1 text-[11px] font-semibold text-white shadow-xl ring-1 ring-emerald-400/30"
        style={{ left: preview.midpointScreen.x, top: preview.midpointScreen.y }}
      >
        {preview.distance.toFixed(2)} mm
      </div>
    </>
  );
});

const HoverTooltip = memo(function HoverTooltip({
  hoveredAnnotation,
  hoverPosition,
  visible,
}) {
  if (!visible || !hoveredAnnotation || !hoverPosition) return null;

  return (
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
  );
});

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
      <ProjectedAnnotationsGroup
        annotations={projectedSnapshotWorldOverlayAnnotations}
        includeText={true}
        strokeWidth="2"
        strokeDasharray="6 4"
        opacity={0.88}
        onHoverEnter={hoverHandlers.onEnter}
        onHoverMove={hoverHandlers.onMove}
        onHoverLeave={hoverHandlers.onLeave}
      />

      <ProjectedAnnotationsGroup
        annotations={projectedWorldOverlayAnnotations}
        includeText={true}
        onHoverEnter={hoverHandlers.onEnter}
        onHoverMove={hoverHandlers.onMove}
        onHoverLeave={hoverHandlers.onLeave}
      />

      <WorldOverlayPreviewLayer preview={worldOverlayPreview} />

      {textDraft3D && textDraftScreenPoint && (
        <div
          data-xcore-ui="true"
          className="absolute z-30 -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${textDraftScreenPoint.x}px`, top: `${textDraftScreenPoint.y}px` }}
        >
          <div className="flex items-center gap-1 rounded-lg border border-cyan-500/40 bg-slate-900/90 p-1 shadow-xl backdrop-blur">
            <input
              type="text"
              autoFocus
              value={textDraft3D.text || ''}
              placeholder="Label..."
              className="w-32 bg-transparent px-2 py-0.5 text-xs text-white placeholder-slate-400 focus:outline-none"
              onChange={(e) => setTextDraft3D({ ...textDraft3D, text: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitTextDraft3D();
                if (e.key === 'Escape') setTextDraft3D(null);
              }}
            />
            <button
              onClick={() => commitTextDraft3D()}
              className="rounded bg-cyan-600 px-2 py-0.5 text-xs font-semibold text-white hover:bg-cyan-500"
            >
              OK
            </button>
          </div>
        </div>
      )}

      <MeasurementOverlaysLayer overlays={measurementScreenOverlays} />

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

      <MeasurementPreviewLayer preview={measurementPreview} />

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

      <HoverTooltip
        hoveredAnnotation={hoveredAnnotation}
        hoverPosition={hoverPosition}
        visible={!annotateMode}
      />
    </>
  );
}
