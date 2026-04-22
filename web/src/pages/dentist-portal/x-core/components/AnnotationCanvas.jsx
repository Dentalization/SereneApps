import React, { forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import { ANNOTATION_COLORS, drawAnnotations } from '../utils/reportUtils';
import {
  centroidOfPath,
  clamp01,
  clientToViewportPoint,
  distanceNormalizedAsPx,
  distanceToSegmentPx as geometryDistanceToSegmentPx,
  moveCoordinates,
  normalizedToImagePoint,
  normalizedToViewportPoint,
  pointInPolygon,
  polygonAreaPx,
  simplifyPath,
  viewportToNormalizedPoint,
} from '../utils/annotationGeometry.mjs';

const MIN_POINTER_DISTANCE = 0.008;
const HIT_TEST_EPSILON_PX = 1;
const HIT_RADIUS_PX = 12;
const FREEHAND_POINT_DISTANCE_PX = 4;
const FREEHAND_SIMPLIFY_EPSILON_PX = 2;
const FINDING_TYPES = [
  ['caries', 'Caries'],
  ['bone_resorption', 'Bone resorption'],
  ['implant_site', 'Implant site'],
  ['fracture', 'Fracture'],
  ['periapical_lesion', 'Periapical lesion'],
  ['other', 'Other'],
];
const SEVERITIES = [
  ['S1', 'S1 (mild)'],
  ['S2', 'S2 (moderate)'],
  ['S3', 'S3 (severe)'],
];
const SURFACES = ['', 'mesial', 'distal', 'occlusal', 'buccal', 'lingual', 'cervical', 'root'];
const FDI_TOOTH_NUMBERS = [
  '18', '17', '16', '15', '14', '13', '12', '11',
  '21', '22', '23', '24', '25', '26', '27', '28',
  '48', '47', '46', '45', '44', '43', '42', '41',
  '31', '32', '33', '34', '35', '36', '37', '38',
];

const AnnotationCanvas = forwardRef(function AnnotationCanvas(
  {
    width,
    height,
    active,
    tool,
    annotations,
    onChange,
    sourceWidth,
    sourceHeight,
    zoom = 1,
    pan = { x: 0, y: 0 },
    viewportSize,
    imageBounds,
    activeToothContext,
    reviewMode = false,
    onReviewAnnotation,
    className = '',
    style = {},
  },
  forwardedRef
) {
  const canvasRef = useRef(null);
  const textInputRef = useRef(null);
  const [draftAnnotation, setDraftAnnotation] = useState(null);
  const [textDraft, setTextDraft] = useState(null);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState(null);
  const [dragSelection, setDragSelection] = useState(null);
  const [metadataDraft, setMetadataDraft] = useState(null);
  const [labelDraft, setLabelDraft] = useState(null);
  const [rejectDraft, setRejectDraft] = useState(null);
  const annotationWidth = sourceWidth || width;
  const annotationHeight = sourceHeight || height;
  const geometryContext = useMemo(() => ({
    viewportSize: { width, height },
    imageSize: { width: annotationWidth, height: annotationHeight },
    imageBounds,
    zoom,
    pan,
  }), [annotationHeight, annotationWidth, height, imageBounds, pan, width, zoom]);
  const imageDisplayScale = useMemo(() => {
    if (!imageBounds || !annotationWidth || !annotationHeight) return 1;
    return Math.max(
      0.1,
      imageBounds.width / annotationWidth,
      imageBounds.height / annotationHeight
    );
  }, [annotationHeight, annotationWidth, imageBounds]);
  const selectedAnnotation = annotations.find((annotation) => annotation.id === selectedAnnotationId) || null;

  const hasVisibleCanvas = useMemo(
    () => active || annotations.length > 0 || !!draftAnnotation,
    [active, annotations.length, draftAnnotation]
  );

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !width || !height) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const drawSelection = (annotation) => {
      if (!annotation) return;

      ctx.save();
      ctx.strokeStyle = '#ffffff';
      ctx.fillStyle = '#ffffff';
      const invScale = 1 / imageDisplayScale;
      ctx.lineWidth = 1.25 * invScale;
      ctx.setLineDash([4 * invScale, 3 * invScale]);

      const toPx = (point) => normalizedToImagePoint(point, geometryContext.imageSize);

      if (annotation.type === 'text') {
        const point = toPx(annotation.coordinates);
        ctx.beginPath();
        ctx.arc(point.x, point.y, 5 * invScale, 0, Math.PI * 2);
        ctx.stroke();
      } else if ((annotation.type === 'region' || annotation.type === 'freehand') && Array.isArray(annotation.coordinates?.path)) {
        const path = annotation.coordinates.path.map(toPx);
        if (path.length >= 3) {
          ctx.beginPath();
          path.forEach((point, index) => {
            if (index === 0) {
              ctx.moveTo(point.x, point.y);
            } else {
              ctx.lineTo(point.x, point.y);
            }
          });
          ctx.closePath();
          ctx.stroke();
          ctx.setLineDash([]);
          path.filter((_, index) => index % Math.max(1, Math.ceil(path.length / 8)) === 0).forEach((point) => {
            ctx.beginPath();
            ctx.arc(point.x, point.y, 3 * invScale, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#0f172a';
            ctx.stroke();
            ctx.strokeStyle = '#ffffff';
          });
        }
      } else if (annotation.coordinates?.start && annotation.coordinates?.end) {
        const start = toPx(annotation.coordinates.start);
        const end = toPx(annotation.coordinates.end);
        const minX = Math.min(start.x, end.x);
        const minY = Math.min(start.y, end.y);
        const rectWidth = Math.abs(end.x - start.x);
        const rectHeight = Math.abs(end.y - start.y);

        if (annotation.type === 'circle') {
          ctx.strokeRect(minX, minY, rectWidth, rectHeight);
        } else {
          ctx.beginPath();
          ctx.moveTo(start.x, start.y);
          ctx.lineTo(end.x, end.y);
          ctx.stroke();
        }

        ctx.setLineDash([]);
        [start, end].forEach((point) => {
          ctx.beginPath();
          ctx.arc(point.x, point.y, 3.5 * invScale, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#0f172a';
          ctx.stroke();
          ctx.strokeStyle = '#ffffff';
        });
      }

      ctx.restore();
    };

    const drawInImageSpace = (items) => {
      if (!items.length) return;

      if (imageBounds && annotationWidth && annotationHeight) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(imageBounds.x, imageBounds.y, imageBounds.width, imageBounds.height);
        ctx.clip();
        ctx.translate(imageBounds.x, imageBounds.y);
        ctx.scale(imageBounds.width / annotationWidth, imageBounds.height / annotationHeight);
        drawAnnotations(ctx, items, annotationWidth, annotationHeight, { displayScale: imageDisplayScale });
        drawSelection(selectedAnnotation);
        ctx.restore();
        return;
      }

      drawAnnotations(ctx, items, annotationWidth, annotationHeight, { displayScale: imageDisplayScale });
      drawSelection(selectedAnnotation);
    };

    drawInImageSpace(annotations);

    if (draftAnnotation) {
      drawInImageSpace([draftAnnotation]);
    }
  };

  useEffect(() => {
    drawCanvas();
  }, [annotationHeight, annotationWidth, annotations, draftAnnotation, geometryContext, height, imageBounds, imageDisplayScale, selectedAnnotation, width]);

  useEffect(() => {
    if (!active) {
      setDraftAnnotation(null);
      setTextDraft(null);
      setMetadataDraft(null);
      setLabelDraft(null);
      setRejectDraft(null);
      setDragSelection(null);
    }
  }, [active]);

  useEffect(() => {
    if (!selectedAnnotationId) return;
    if (!annotations.some((annotation) => annotation.id === selectedAnnotationId)) {
      setSelectedAnnotationId(null);
      setMetadataDraft(null);
      setLabelDraft(null);
      setRejectDraft(null);
    }
  }, [annotations, selectedAnnotationId]);

  useEffect(() => {
    if (!active || !selectedAnnotationId) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        onChange(annotations.filter((annotation) => annotation.id !== selectedAnnotationId));
        setSelectedAnnotationId(null);
        setMetadataDraft(null);
        setLabelDraft(null);
        setRejectDraft(null);
      }
      if (event.key === 'Escape') {
        setSelectedAnnotationId(null);
        setMetadataDraft(null);
        setLabelDraft(null);
        setRejectDraft(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [active, annotations, onChange, selectedAnnotationId]);

  useEffect(() => {
    if (!active || !textDraft) return undefined;

    const frameId = window.requestAnimationFrame(() => {
      const input = textInputRef.current;
      if (!input) return;
      input.focus();
      const valueLength = input.value?.length || 0;
      input.setSelectionRange?.(valueLength, valueLength);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [active, textDraft]);

  useEffect(() => {
    if (!metadataDraft && !labelDraft && !rejectDraft) return undefined;

    const handlePointerDown = (event) => {
      if (event.target?.closest?.('[data-annotation-popover="true"]')) return;
      setMetadataDraft(null);
      setLabelDraft(null);
      setRejectDraft(null);
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setMetadataDraft(null);
        setLabelDraft(null);
        setRejectDraft(null);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [labelDraft, metadataDraft, rejectDraft]);

  const normalizePoint = (event) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    const viewportPoint = clientToViewportPoint(event, rect, width, height);
    if (!viewportPoint) return null;
    return viewportToNormalizedPoint({
      ...geometryContext,
      viewportSize: viewportSize || geometryContext.viewportSize,
      point: viewportPoint,
    });
  };

  const getCanvasPoint = (point) => normalizedToViewportPoint(point, {
    ...geometryContext,
    viewportSize: viewportSize || geometryContext.viewportSize,
  });

  const buildBaseMetadata = () => ({
    source_width: annotationWidth,
    source_height: annotationHeight,
    finding_type: 'other',
    severity: 'S1',
    tooth_number: activeToothContext?.number || activeToothContext?.tooth_number || '',
    surface: '',
  });

  const updateAnnotation = (annotationId, updater) => {
    onChange(annotations.map((annotation) => (
      annotation.id === annotationId ? updater(annotation) : annotation
    )));
  };

  const distancePx = (a, b) => distanceNormalizedAsPx(a, b, geometryContext.imageSize);

  const distanceToSegmentPx = (point, start, end) => (
    geometryDistanceToSegmentPx(point, start, end, geometryContext.imageSize)
  );

  const hitTestAnnotation = (point) => {
    for (let index = annotations.length - 1; index >= 0; index -= 1) {
      const annotation = annotations[index];
      if (annotation.type === 'text') {
        if (distancePx(point, annotation.coordinates) <= HIT_RADIUS_PX) {
          return { annotation, handle: 'point' };
        }
        continue;
      }

      if ((annotation.type === 'region' || annotation.type === 'freehand') && Array.isArray(annotation.coordinates?.path)) {
        const path = annotation.coordinates.path;
        if (path.some((pathPoint) => distancePx(point, pathPoint) <= HIT_RADIUS_PX) || pointInPolygon(point, path)) {
          return { annotation, handle: 'move' };
        }
        continue;
      }

      const { start, end } = annotation.coordinates || {};
      if (!start || !end) continue;

      if (distancePx(point, start) <= HIT_RADIUS_PX) return { annotation, handle: 'start' };
      if (distancePx(point, end) <= HIT_RADIUS_PX) return { annotation, handle: 'end' };

      const center = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
      if (distancePx(point, center) <= HIT_RADIUS_PX) return { annotation, handle: 'move' };

      if (annotation.type === 'arrow' && distanceToSegmentPx(point, start, end) <= HIT_RADIUS_PX) {
        return { annotation, handle: 'move' };
      }
    }

    return null;
  };

  const getAnnotationAnchor = (annotation) => {
    if (!annotation) return null;
    if (annotation.type === 'text') return annotation.coordinates;
    if ((annotation.type === 'region' || annotation.type === 'freehand') && annotation.coordinates?.path) {
      return centroidOfPath(annotation.coordinates.path);
    }
    if (annotation.coordinates?.end) return annotation.coordinates.end;
    if (annotation.coordinates?.start) return annotation.coordinates.start;
    return null;
  };

  const withMetadataDraft = (annotation) => {
    if (!annotation || annotation.type === 'text') return;
    const anchor = getAnnotationAnchor(annotation);
    setMetadataDraft({
      annotationId: annotation.id,
      anchor,
      metadata: {
        finding_type: annotation.metadata?.finding_type || 'other',
        severity: annotation.metadata?.severity || 'S1',
        surface: annotation.metadata?.surface || '',
        tooth_number: annotation.metadata?.tooth_number || activeToothContext?.number || activeToothContext?.tooth_number || '',
        lesion_area_px: annotation.metadata?.lesion_area_px || '',
      },
    });
  };

  const updateMetadataDraft = (patch) => {
    if (!metadataDraft) return;
    const nextMetadata = { ...metadataDraft.metadata, ...patch };
    updateAnnotation(metadataDraft.annotationId, (annotation) => ({
      ...annotation,
      metadata: {
        ...(annotation.metadata || {}),
        ...nextMetadata,
      },
    }));
    setMetadataDraft({ ...metadataDraft, metadata: nextMetadata });
  };

  const commitTextDraft = (value) => {
    if (!textDraft) return;

    const trimmedValue = value.trim();
    if (trimmedValue) {
      const annotation = {
        id: `annotation-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type: 'text',
        coordinates: { x: textDraft.x, y: textDraft.y },
        label: trimmedValue,
        color: ANNOTATION_COLORS.text,
        metadata: buildBaseMetadata(),
      };
      onChange([...annotations, annotation]);
      setSelectedAnnotationId(annotation.id);
    }

    setTextDraft(null);
  };

  const handlePointerDown = (event) => {
    if (!active || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const point = normalizePoint(event);
    if (!point) return;

    if (tool === 'select') {
      const hit = hitTestAnnotation(point);
      if (!hit) {
        setSelectedAnnotationId(null);
        setMetadataDraft(null);
        return;
      }
      setSelectedAnnotationId(hit.annotation.id);
      setDragSelection({
        annotationId: hit.annotation.id,
        handle: hit.handle,
        startPoint: point,
        originalCoordinates: hit.annotation.coordinates,
      });
      event.currentTarget.setPointerCapture?.(event.pointerId);
      return;
    }

    if (tool === 'text') return;

    event.currentTarget.setPointerCapture?.(event.pointerId);

    if (tool === 'freehand') {
      setDraftAnnotation({
        id: 'draft',
        type: 'region',
        coordinates: { path: [point] },
        color: ANNOTATION_COLORS.region,
        metadata: buildBaseMetadata(),
      });
      return;
    }

    setDraftAnnotation({
      id: 'draft',
      type: tool,
      coordinates: { start: point, end: point },
      color: ANNOTATION_COLORS[tool],
      metadata: buildBaseMetadata(),
    });
  };

  const handlePointerMove = (event) => {
    if (!active) return;
    const point = normalizePoint(event);
    if (!point) return;

    if (dragSelection) {
      const dx = point.x - dragSelection.startPoint.x;
      const dy = point.y - dragSelection.startPoint.y;
      updateAnnotation(dragSelection.annotationId, (annotation) => {
        if (annotation.type === 'text') {
          return {
            ...annotation,
            coordinates: {
              x: clamp01(dragSelection.originalCoordinates.x + dx),
              y: clamp01(dragSelection.originalCoordinates.y + dy),
            },
          };
        }

        if ((annotation.type === 'region' || annotation.type === 'freehand') && Array.isArray(dragSelection.originalCoordinates.path)) {
          return {
            ...annotation,
            coordinates: moveCoordinates(dragSelection.originalCoordinates, { x: dx, y: dy }),
          };
        }

        const start = dragSelection.originalCoordinates.start;
        const end = dragSelection.originalCoordinates.end;
        if (!start || !end) return annotation;

        if (dragSelection.handle === 'start') {
          return { ...annotation, coordinates: { ...annotation.coordinates, start: point } };
        }
        if (dragSelection.handle === 'end') {
          return { ...annotation, coordinates: { ...annotation.coordinates, end: point } };
        }

        return {
          ...annotation,
          coordinates: moveCoordinates(dragSelection.originalCoordinates, { x: dx, y: dy }),
        };
      });
      return;
    }

    if (!draftAnnotation) return;
    if (draftAnnotation.type === 'region') {
      setDraftAnnotation((current) => {
        if (!current) return null;
        const path = current.coordinates?.path || [];
        const lastPoint = path[path.length - 1];
        if (lastPoint && distancePx(point, lastPoint) < FREEHAND_POINT_DISTANCE_PX) {
          return current;
        }
        return {
          ...current,
          coordinates: {
            ...current.coordinates,
            path: [...path, point],
          },
        };
      });
      return;
    }

    setDraftAnnotation((current) => current ? {
      ...current,
      coordinates: {
        ...current.coordinates,
        end: point,
      },
    } : null);
  };

  const handlePointerUp = (event) => {
    if (!active) return;
    if (!dragSelection && !draftAnnotation) return;
    event.preventDefault();
    event.stopPropagation();
    try { event.currentTarget.releasePointerCapture?.(event.pointerId); } catch (_) {}

    if (dragSelection) {
      setDragSelection(null);
      return;
    }

    if (!draftAnnotation) return;

    if (draftAnnotation.type === 'region') {
      const finalPoint = normalizePoint(event);
      const rawPath = finalPoint
        ? [...(draftAnnotation.coordinates?.path || []), finalPoint]
        : (draftAnnotation.coordinates?.path || []);
      const simplifiedPath = simplifyPath(rawPath, FREEHAND_SIMPLIFY_EPSILON_PX, geometryContext.imageSize)
        .filter((point, index, path) => index === 0 || distancePx(point, path[index - 1]) >= 1);

      if (simplifiedPath.length >= 3) {
        const lesionAreaPx = Math.round(polygonAreaPx(simplifiedPath, geometryContext.imageSize));
        const annotation = {
          ...draftAnnotation,
          id: `annotation-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          coordinates: { path: simplifiedPath },
          metadata: {
            ...(draftAnnotation.metadata || {}),
            lesion_area_px: lesionAreaPx,
          },
        };
        onChange([...annotations, annotation]);
        setSelectedAnnotationId(annotation.id);
        withMetadataDraft(annotation);
      }

      setDraftAnnotation(null);
      return;
    }

    const { start, end } = draftAnnotation.coordinates;
    const distance = Math.hypot(end.x - start.x, end.y - start.y);

    if (distance >= MIN_POINTER_DISTANCE) {
      const annotation = {
        ...draftAnnotation,
        id: `annotation-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      };
      onChange([...annotations, annotation]);
      setSelectedAnnotationId(annotation.id);
      withMetadataDraft(annotation);
    }

    setDraftAnnotation(null);
  };

  const handleClick = (event) => {
    if (!active || tool !== 'text') return;
    event.preventDefault();
    event.stopPropagation();
    const point = normalizePoint(event);
    if (!point) return;
    setTextDraft({ ...point, label: '' });
  };

  const textDraftPosition = textDraft ? getCanvasPoint(textDraft) : null;
  const selectedAnchor = getAnnotationAnchor(selectedAnnotation);
  const selectedActionPosition = selectedAnchor ? getCanvasPoint(selectedAnchor) : null;
  const metadataDraftPosition = metadataDraft?.anchor ? getCanvasPoint(metadataDraft.anchor) : null;
  const labelDraftPosition = labelDraft?.anchor ? getCanvasPoint(labelDraft.anchor) : null;
  const rejectDraftPosition = rejectDraft?.anchor ? getCanvasPoint(rejectDraft.anchor) : null;

  return (
    <>
      {hasVisibleCanvas && (
        <canvas
          ref={(node) => {
            canvasRef.current = node;
            if (typeof forwardedRef === 'function') {
              forwardedRef(node);
            } else if (forwardedRef) {
              forwardedRef.current = node;
            }
          }}
          data-annotation-canvas="true"
          className={className}
          style={{
            ...style,
            pointerEvents: active ? 'auto' : 'none',
            touchAction: active ? 'none' : undefined,
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onClick={handleClick}
        />
      )}

      {active && selectedAnnotation && selectedActionPosition && (
        <div
          className="absolute z-[82] flex max-w-[300px] -translate-y-full flex-wrap items-center gap-1 rounded-xl border border-white/10 bg-slate-950/95 p-1 shadow-2xl backdrop-blur"
          style={{
            left: `${Math.min(Math.max(selectedActionPosition.x, 8), Math.max(width - 300, 8))}px`,
            top: `${Math.max(selectedActionPosition.y - 14, 44)}px`,
          }}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
          data-annotation-popover="true"
        >
          <button
            type="button"
            onClick={() => {
              setLabelDraft({
                annotationId: selectedAnnotation.id,
                anchor: selectedAnchor,
                value: selectedAnnotation.label || '',
              });
            }}
            className="rounded-lg px-2 py-1 text-[10px] font-semibold text-slate-200 hover:bg-slate-800"
          >
            Edit Label
          </button>
          <label className="flex cursor-pointer items-center rounded-lg px-2 py-1 text-[10px] font-semibold text-slate-200 hover:bg-slate-800">
            Color
            <input
              type="color"
              value={selectedAnnotation.color || ANNOTATION_COLORS[selectedAnnotation.type] || '#ffffff'}
              onChange={(event) => updateAnnotation(selectedAnnotation.id, (annotation) => ({ ...annotation, color: event.target.value }))}
              className="ml-1 h-4 w-5 cursor-pointer border-0 bg-transparent p-0"
              aria-label="Change annotation color"
            />
          </label>
          {selectedAnnotation.type !== 'text' && (
            <button
              type="button"
              onClick={() => withMetadataDraft(selectedAnnotation)}
              className="rounded-lg px-2 py-1 text-[10px] font-semibold text-cyan-200 hover:bg-slate-800"
            >
              Tags
            </button>
          )}
          {reviewMode && typeof onReviewAnnotation === 'function' && (
            <>
              <button
                type="button"
                onClick={() => onReviewAnnotation(selectedAnnotation.id, 'approved')}
                className="rounded-lg px-2 py-1 text-[10px] font-semibold text-emerald-300 hover:bg-emerald-500/15"
              >
                Approve
              </button>
              <button
                type="button"
                onClick={() => {
                  setRejectDraft({
                    annotationId: selectedAnnotation.id,
                    anchor: selectedAnchor,
                    value: selectedAnnotation.reviewer_comment || '',
                  });
                }}
                className="rounded-lg px-2 py-1 text-[10px] font-semibold text-amber-300 hover:bg-amber-500/15"
              >
                Reject
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => {
              onChange(annotations.filter((annotation) => annotation.id !== selectedAnnotation.id));
              setSelectedAnnotationId(null);
              setMetadataDraft(null);
              setLabelDraft(null);
              setRejectDraft(null);
            }}
            className="rounded-lg px-2 py-1 text-[10px] font-semibold text-red-300 hover:bg-red-500/15"
          >
            Delete
          </button>
        </div>
      )}

      {active && labelDraft && labelDraftPosition && (
        <div
          className="absolute z-[84] w-64 rounded-2xl border border-white/10 bg-slate-950/95 p-3 text-xs text-white shadow-2xl backdrop-blur"
          style={{
            left: `${Math.min(Math.max(labelDraftPosition.x + 12, 8), Math.max(width - 270, 8))}px`,
            top: `${Math.min(Math.max(labelDraftPosition.y + 12, 8), Math.max(height - 170, 8))}px`,
          }}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
          data-annotation-popover="true"
        >
          <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Annotation Label</div>
          <input
            value={labelDraft.value}
            onChange={(event) => setLabelDraft((current) => current ? { ...current, value: event.target.value } : current)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                updateAnnotation(labelDraft.annotationId, (annotation) => ({ ...annotation, label: labelDraft.value }));
                setLabelDraft(null);
              }
              if (event.key === 'Escape') {
                setLabelDraft(null);
              }
            }}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-2 text-xs text-white outline-none focus:border-cyan-400"
            autoFocus
          />
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setLabelDraft(null)}
              className="rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                updateAnnotation(labelDraft.annotationId, (annotation) => ({ ...annotation, label: labelDraft.value }));
                setLabelDraft(null);
              }}
              className="rounded-lg bg-cyan-500/20 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-cyan-200 hover:bg-cyan-500/30"
            >
              Save
            </button>
          </div>
        </div>
      )}

      {active && rejectDraft && rejectDraftPosition && (
        <div
          className="absolute z-[84] w-72 rounded-2xl border border-amber-400/20 bg-slate-950/95 p-3 text-xs text-white shadow-2xl backdrop-blur"
          style={{
            left: `${Math.min(Math.max(rejectDraftPosition.x + 12, 8), Math.max(width - 290, 8))}px`,
            top: `${Math.min(Math.max(rejectDraftPosition.y + 12, 8), Math.max(height - 210, 8))}px`,
          }}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
          data-annotation-popover="true"
        >
          <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300">Reject Annotation</div>
          <textarea
            value={rejectDraft.value}
            onChange={(event) => setRejectDraft((current) => current ? { ...current, value: event.target.value } : current)}
            rows={3}
            placeholder="Reviewer comment..."
            className="w-full resize-none rounded-lg border border-slate-700 bg-slate-900 px-2 py-2 text-xs text-white outline-none focus:border-amber-400"
            autoFocus
          />
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setRejectDraft(null)}
              className="rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onReviewAnnotation?.(rejectDraft.annotationId, 'rejected', rejectDraft.value || '');
                setRejectDraft(null);
              }}
              className="rounded-lg bg-amber-500/20 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-200 hover:bg-amber-500/30"
            >
              Reject
            </button>
          </div>
        </div>
      )}

      {active && metadataDraft && metadataDraftPosition && (
        <div
          className="absolute z-[84] w-64 rounded-2xl border border-cyan-400/20 bg-slate-950/95 p-3 text-xs text-white shadow-2xl backdrop-blur"
          style={{
            left: `${Math.min(Math.max(metadataDraftPosition.x + 12, 8), Math.max(width - 270, 8))}px`,
            top: `${Math.min(Math.max(metadataDraftPosition.y + 12, 8), Math.max(height - 360, 8))}px`,
          }}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
          data-annotation-popover="true"
        >
          <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300">Clinical Tags</div>
          <label className="mb-2 block">
            <span className="mb-1 block text-[10px] uppercase tracking-wider text-slate-500">Finding type</span>
            <select
              value={metadataDraft.metadata.finding_type}
              onChange={(event) => updateMetadataDraft({ finding_type: event.target.value })}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-white outline-none"
            >
              {FINDING_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="mb-2 block">
            <span className="mb-1 block text-[10px] uppercase tracking-wider text-slate-500">Severity</span>
            <select
              value={metadataDraft.metadata.severity}
              onChange={(event) => updateMetadataDraft({ severity: event.target.value })}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-white outline-none"
            >
              {SEVERITIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label>
              <span className="mb-1 block text-[10px] uppercase tracking-wider text-slate-500">Surface</span>
              <select
                value={metadataDraft.metadata.surface}
                onChange={(event) => updateMetadataDraft({ surface: event.target.value })}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-white outline-none"
              >
                {SURFACES.map((surface) => (
                  <option key={surface || 'none'} value={surface}>
                    {surface || '—'}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-1 block text-[10px] uppercase tracking-wider text-slate-500">Tooth</span>
              <input
                value={metadataDraft.metadata.tooth_number}
                onChange={(event) => updateMetadataDraft({ tooth_number: event.target.value })}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-white outline-none"
                placeholder="36"
              />
            </label>
          </div>
          <div className="mt-2 rounded-xl border border-slate-800 bg-slate-900/70 p-2">
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Link to Tooth</div>
            <div className="grid grid-cols-8 gap-1">
              {FDI_TOOTH_NUMBERS.map((toothNumber) => (
                <button
                  key={toothNumber}
                  type="button"
                  onClick={() => updateMetadataDraft({ tooth_number: toothNumber })}
                  className={`rounded px-1 py-1 text-[10px] font-mono transition ${
                    String(metadataDraft.metadata.tooth_number) === toothNumber
                      ? 'bg-cyan-500 text-slate-950'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {toothNumber}
                </button>
              ))}
            </div>
          </div>
          {metadataDraft.metadata.lesion_area_px && (
            <div className="mt-2 rounded-lg border border-rose-500/20 bg-rose-500/10 px-2 py-1.5 text-[10px] text-rose-100">
              Region area: <span className="font-mono text-white">{Number(metadataDraft.metadata.lesion_area_px).toLocaleString()} px²</span>
            </div>
          )}
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setMetadataDraft(null)}
              className="rounded-lg bg-cyan-500/20 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-cyan-200 hover:bg-cyan-500/30"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {active && textDraft && textDraftPosition && (
        <div
          className="absolute z-[80] -translate-y-1/2"
          style={{
            left: `${textDraftPosition.x}px`,
            top: `${textDraftPosition.y}px`,
          }}
          onPointerDown={(event) => {
            event.stopPropagation();
          }}
          onClick={(event) => {
            event.stopPropagation();
          }}
        >
          <input
            ref={textInputRef}
            type="text"
            value={textDraft.label}
            onChange={(event) => setTextDraft((current) => current ? { ...current, label: event.target.value } : current)}
            onBlur={(event) => commitTextDraft(event.target.value)}
            onPointerDown={(event) => {
              event.stopPropagation();
            }}
            onClick={(event) => {
              event.stopPropagation();
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                event.stopPropagation();
                commitTextDraft(textDraft.label);
              }
              if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                setTextDraft(null);
              }
            }}
            placeholder="Add note"
            className="w-40 rounded-lg border border-slate-600 bg-slate-900/95 px-3 py-1.5 text-xs text-white outline-none ring-0"
          />
        </div>
      )}
    </>
  );
});

export default AnnotationCanvas;
