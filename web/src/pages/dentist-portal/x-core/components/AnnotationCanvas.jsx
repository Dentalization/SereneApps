import React, { forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import { ANNOTATION_COLORS, drawAnnotations } from '../utils/reportUtils';

const MIN_POINTER_DISTANCE = 0.008;
const HIT_TEST_EPSILON_PX = 1;

const clamp01 = (value) => Math.max(0, Math.min(1, value));

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
    className = '',
    style = {},
  },
  forwardedRef
) {
  const canvasRef = useRef(null);
  const textInputRef = useRef(null);
  const [draftAnnotation, setDraftAnnotation] = useState(null);
  const [textDraft, setTextDraft] = useState(null);
  const annotationWidth = sourceWidth || width;
  const annotationHeight = sourceHeight || height;

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

    const drawInImageSpace = (items) => {
      if (!items.length) return;

      if (imageBounds && annotationWidth && annotationHeight) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(imageBounds.x, imageBounds.y, imageBounds.width, imageBounds.height);
        ctx.clip();
        ctx.translate(imageBounds.x, imageBounds.y);
        ctx.scale(imageBounds.width / annotationWidth, imageBounds.height / annotationHeight);
        drawAnnotations(ctx, items, annotationWidth, annotationHeight);
        ctx.restore();
        return;
      }

      drawAnnotations(ctx, items, annotationWidth, annotationHeight);
    };

    drawInImageSpace(annotations);

    if (draftAnnotation) {
      drawInImageSpace([draftAnnotation]);
    }
  };

  useEffect(() => {
    drawCanvas();
  }, [annotationHeight, annotationWidth, annotations, draftAnnotation, height, imageBounds, width]);

  useEffect(() => {
    if (!active) {
      setDraftAnnotation(null);
      setTextDraft(null);
    }
  }, [active]);

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

  const normalizePoint = (event) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect || !rect.width || !rect.height) {
      return null;
    }

    const pointerX = ((event.clientX - rect.left) / rect.width) * width;
    const pointerY = ((event.clientY - rect.top) / rect.height) * height;

    if (imageBounds && imageBounds.width > 0 && imageBounds.height > 0 && annotationWidth && annotationHeight) {
      const imageX = ((pointerX - imageBounds.x) / imageBounds.width) * annotationWidth;
      const imageY = ((pointerY - imageBounds.y) / imageBounds.height) * annotationHeight;

      if (
        imageX < -HIT_TEST_EPSILON_PX
        || imageY < -HIT_TEST_EPSILON_PX
        || imageX > annotationWidth + HIT_TEST_EPSILON_PX
        || imageY > annotationHeight + HIT_TEST_EPSILON_PX
      ) {
        return null;
      }

      return {
        x: clamp01(imageX / annotationWidth),
        y: clamp01(imageY / annotationHeight),
      };
    }

    if (annotationWidth && annotationHeight && zoom > 0) {
      const effectiveViewportWidth = viewportSize?.width || width;
      const effectiveViewportHeight = viewportSize?.height || height;
      const imageX = (pointerX - (effectiveViewportWidth / 2) - pan.x) / zoom + (annotationWidth / 2);
      const imageY = (pointerY - (effectiveViewportHeight / 2) - pan.y) / zoom + (annotationHeight / 2);

      if (
        imageX < -HIT_TEST_EPSILON_PX
        || imageY < -HIT_TEST_EPSILON_PX
        || imageX > annotationWidth + HIT_TEST_EPSILON_PX
        || imageY > annotationHeight + HIT_TEST_EPSILON_PX
      ) {
        return null;
      }

      return {
        x: clamp01(imageX / annotationWidth),
        y: clamp01(imageY / annotationHeight),
      };
    }

    return {
      x: pointerX / width,
      y: pointerY / height,
    };
  };

  const getCanvasPoint = (point) => {
    if (imageBounds) {
      return {
        x: imageBounds.x + (point.x * imageBounds.width),
        y: imageBounds.y + (point.y * imageBounds.height),
      };
    }

    return {
      x: point.x * width,
      y: point.y * height,
    };
  };

  const commitTextDraft = (value) => {
    if (!textDraft) return;

    const trimmedValue = value.trim();
    if (trimmedValue) {
      onChange([
        ...annotations,
        {
          id: `annotation-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          type: 'text',
          coordinates: { x: textDraft.x, y: textDraft.y },
          label: trimmedValue,
          color: ANNOTATION_COLORS.text,
        },
      ]);
    }

    setTextDraft(null);
  };

  const handlePointerDown = (event) => {
    if (!active || tool === 'text' || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const point = normalizePoint(event);
    if (!point) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);

    setDraftAnnotation({
      id: 'draft',
      type: tool,
      coordinates: { start: point, end: point },
      color: ANNOTATION_COLORS[tool],
    });
  };

  const handlePointerMove = (event) => {
    if (!active || !draftAnnotation) return;
    const point = normalizePoint(event);
    if (!point) return;
    setDraftAnnotation((current) => current ? {
      ...current,
      coordinates: {
        ...current.coordinates,
        end: point,
      },
    } : null);
  };

  const handlePointerUp = (event) => {
    if (!active || !draftAnnotation) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.releasePointerCapture?.(event.pointerId);

    const { start, end } = draftAnnotation.coordinates;
    const distance = Math.hypot(end.x - start.x, end.y - start.y);

    if (distance >= MIN_POINTER_DISTANCE) {
      onChange([
        ...annotations,
        {
          ...draftAnnotation,
          id: `annotation-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        },
      ]);
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
