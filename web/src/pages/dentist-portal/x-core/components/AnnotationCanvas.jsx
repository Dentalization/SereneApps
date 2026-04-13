import React, { forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import { ANNOTATION_COLORS, drawAnnotations } from '../utils/reportUtils';

const MIN_POINTER_DISTANCE = 0.008;

const AnnotationCanvas = forwardRef(function AnnotationCanvas(
  {
    width,
    height,
    active,
    tool,
    annotations,
    onChange,
    className = '',
    style = {},
  },
  forwardedRef
) {
  const canvasRef = useRef(null);
  const [draftAnnotation, setDraftAnnotation] = useState(null);
  const [textDraft, setTextDraft] = useState(null);

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

    drawAnnotations(ctx, annotations, width, height);

    if (draftAnnotation) {
      drawAnnotations(ctx, [draftAnnotation], width, height);
    }
  };

  useEffect(() => {
    drawCanvas();
  }, [annotations, draftAnnotation, height, width]);

  useEffect(() => {
    if (!active) {
      setDraftAnnotation(null);
      setTextDraft(null);
    }
  }, [active]);

  const normalizePoint = (event) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect || !rect.width || !rect.height) {
      return { x: 0, y: 0 };
    }

    return {
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height,
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
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const point = normalizePoint(event);

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
    setTextDraft({ ...point, label: '' });
  };

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
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onClick={handleClick}
        />
      )}

      {active && textDraft && (
        <div
          className="absolute z-30 -translate-y-1/2"
          style={{
            left: `${textDraft.x * width}px`,
            top: `${textDraft.y * height}px`,
          }}
        >
          <input
            autoFocus
            type="text"
            value={textDraft.label}
            onChange={(event) => setTextDraft((current) => current ? { ...current, label: event.target.value } : current)}
            onBlur={(event) => commitTextDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                commitTextDraft(textDraft.label);
              }
              if (event.key === 'Escape') {
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
