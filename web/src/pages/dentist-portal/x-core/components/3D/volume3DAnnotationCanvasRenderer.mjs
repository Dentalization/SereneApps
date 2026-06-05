const BRUSH_COLOR = 'rgba(245,158,11,0.85)';
const BRUSH_PATH_COLOR = 'rgba(245,158,11,0.65)';
const TRACE_COLOR = 'rgba(226,75,74,0.96)';
const TRACE_POINT_COLOR = 'rgba(226,75,74,0.92)';
const TRACE_SNAP_COLOR = 'rgba(34,197,94,0.9)';

const emptyState = () => ({
  brushPath: [],
  tracePath: [],
  traceSnapToClose: false,
  brushRadius: 0,
  brushActive: false,
});

const cloneState = (state) => ({
  brushPath: [...state.brushPath],
  tracePath: [...state.tracePath],
  traceSnapToClose: Boolean(state.traceSnapToClose),
  brushRadius: state.brushRadius,
  brushActive: Boolean(state.brushActive),
});

const normalizePointList = (points) => (
  Array.isArray(points)
    ? points.filter((point) => Number.isFinite(point?.x) && Number.isFinite(point?.y))
    : []
);

const applyPartialState = (current, next = {}) => ({
  brushPath: Object.prototype.hasOwnProperty.call(next, 'brushPath')
    ? normalizePointList(next.brushPath)
    : current.brushPath,
  tracePath: Object.prototype.hasOwnProperty.call(next, 'tracePath')
    ? normalizePointList(next.tracePath)
    : current.tracePath,
  traceSnapToClose: Object.prototype.hasOwnProperty.call(next, 'traceSnapToClose')
    ? Boolean(next.traceSnapToClose)
    : current.traceSnapToClose,
  brushRadius: Object.prototype.hasOwnProperty.call(next, 'brushRadius')
    ? Math.max(0, Number(next.brushRadius) || 0)
    : current.brushRadius,
  brushActive: Object.prototype.hasOwnProperty.call(next, 'brushActive')
    ? Boolean(next.brushActive)
    : current.brushActive,
});

const drawPolyline = (ctx, points, dpr) => {
  if (!Array.isArray(points) || points.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x * dpr, points[0].y * dpr);
  for (let index = 1; index < points.length; index += 1) {
    ctx.lineTo(points[index].x * dpr, points[index].y * dpr);
  }
  ctx.stroke();
};

export const drawVolume3DAnnotationCanvas = (ctx, state, {
  canvas = null,
  dpr = 1,
} = {}) => {
  if (!ctx) return;
  const width = canvas?.width || ctx.canvas?.width || 0;
  const height = canvas?.height || ctx.canvas?.height || 0;
  const safeDpr = Number.isFinite(dpr) && dpr > 0 ? dpr : 1;
  const current = applyPartialState(emptyState(), state);

  ctx.clearRect(0, 0, width, height);

  if (current.tracePath.length >= 2) {
    ctx.save();
    ctx.strokeStyle = TRACE_COLOR;
    ctx.lineWidth = 3 * safeDpr;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    drawPolyline(ctx, current.tracePath, safeDpr);
    ctx.restore();

    current.tracePath.forEach((point, index) => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(point.x * safeDpr, point.y * safeDpr, (index === 0 ? 4.2 : 3) * safeDpr, 0, Math.PI * 2);
      ctx.fillStyle = TRACE_POINT_COLOR;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 1.25 * safeDpr;
      ctx.stroke();
      ctx.restore();
    });

    if (current.traceSnapToClose) {
      const first = current.tracePath[0];
      ctx.save();
      ctx.beginPath();
      ctx.arc(first.x * safeDpr, first.y * safeDpr, 9 * safeDpr, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(34,197,94,0.25)';
      ctx.fill();
      ctx.strokeStyle = TRACE_SNAP_COLOR;
      ctx.lineWidth = 2 * safeDpr;
      ctx.stroke();
      ctx.restore();
    }
  }

  if (current.brushPath.length >= 2) {
    ctx.save();
    ctx.strokeStyle = BRUSH_PATH_COLOR;
    ctx.lineWidth = 2.5 * safeDpr;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.setLineDash?.([8 * safeDpr, 6 * safeDpr]);
    drawPolyline(ctx, current.brushPath, safeDpr);
    ctx.restore();
  }

  const brushPoint = current.brushPath[current.brushPath.length - 1];
  if (brushPoint && current.brushRadius > 0) {
    const radius = Math.max(6, current.brushRadius) * safeDpr;
    ctx.save();
    ctx.beginPath();
    ctx.arc(brushPoint.x * safeDpr, brushPoint.y * safeDpr, radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(245,158,11,0.12)';
    ctx.fill();
    ctx.strokeStyle = BRUSH_COLOR;
    ctx.lineWidth = 1.5 * safeDpr;
    ctx.setLineDash?.(current.brushActive ? [] : [5 * safeDpr, 4 * safeDpr]);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(brushPoint.x * safeDpr, brushPoint.y * safeDpr, 3 * safeDpr, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(245,158,11,0.9)';
    ctx.fill();
    ctx.restore();
  }
};

export const createVolume3DAnnotationCanvasController = ({
  getCanvas,
  getDevicePixelRatio = () => globalThis.devicePixelRatio || 1,
  requestFrame = (callback) => globalThis.requestAnimationFrame?.(callback) ?? globalThis.setTimeout(callback, 16),
  cancelFrame = (frameId) => {
    if (typeof globalThis.cancelAnimationFrame === 'function') {
      globalThis.cancelAnimationFrame(frameId);
      return;
    }
    globalThis.clearTimeout(frameId);
  },
} = {}) => {
  let state = emptyState();
  let frameId = 0;

  const draw = () => {
    frameId = 0;
    const canvas = getCanvas?.();
    const ctx = canvas?.getContext?.('2d');
    if (!ctx) return;
    drawVolume3DAnnotationCanvas(ctx, state, {
      canvas,
      dpr: getDevicePixelRatio(),
    });
  };

  const scheduleDraw = () => {
    if (!frameId) {
      frameId = requestFrame(draw);
    }
  };

  return {
    update(next) {
      state = applyPartialState(state, next);
      scheduleDraw();
    },
    clear() {
      state = emptyState();
      scheduleDraw();
    },
    drawNow() {
      if (frameId) {
        cancelFrame(frameId);
        frameId = 0;
      }
      draw();
    },
    dispose() {
      if (frameId) {
        cancelFrame(frameId);
        frameId = 0;
      }
    },
    getState() {
      return cloneState(state);
    },
  };
};
