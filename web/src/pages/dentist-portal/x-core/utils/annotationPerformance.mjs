const fallbackRequestFrame = (callback) => {
  if (typeof globalThis.requestAnimationFrame === 'function') {
    return globalThis.requestAnimationFrame(callback);
  }
  return globalThis.setTimeout(() => callback(Date.now()), 16);
};

const fallbackCancelFrame = (frameId) => {
  if (typeof globalThis.cancelAnimationFrame === 'function') {
    globalThis.cancelAnimationFrame(frameId);
    return;
  }
  globalThis.clearTimeout(frameId);
};

const roundTo = (value, digits) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Number(number.toFixed(digits));
};

const compactNumberTuple = (tuple, expectedLength, digits) => {
  if (!Array.isArray(tuple) || tuple.length < expectedLength) return null;
  const values = tuple.slice(0, expectedLength).map((value) => roundTo(value, digits));
  return values.every((value) => value !== null) ? values : null;
};

export const buildSurfaceAnchor = ({
  point,
  normal,
  cellId,
  barycentric,
  meshRevision,
  screenOffsetPx,
  confidence,
} = {}) => {
  const anchor = {};
  const surfacePoint = compactNumberTuple(point, 3, 3);
  const surfaceNormal = compactNumberTuple(normal, 3, 6);
  const barycentricTuple = compactNumberTuple(barycentric, 3, 6);
  const screenOffsetTuple = compactNumberTuple(screenOffsetPx, 2, 2);
  const placementConfidence = roundTo(confidence, 3);

  if (surfacePoint) anchor.surface_point = surfacePoint;
  if (surfaceNormal) anchor.surface_normal = surfaceNormal;
  if (Number.isInteger(cellId) && cellId >= 0) anchor.surface_cell_id = cellId;
  if (barycentricTuple) anchor.barycentric = barycentricTuple;
  if (typeof meshRevision === 'string' && meshRevision.trim()) {
    anchor.mesh_revision = meshRevision.trim();
  }
  if (screenOffsetTuple) anchor.screen_offset_px = screenOffsetTuple;
  if (placementConfidence !== null) anchor.placement_confidence = placementConfidence;

  return anchor;
};

export const createRafInputScheduler = ({
  requestFrame = fallbackRequestFrame,
  cancelFrame = fallbackCancelFrame,
} = {}) => {
  let frameId = 0;
  let latestSample = null;
  let latestHandler = null;

  const flush = (timestamp) => {
    frameId = 0;
    const sample = latestSample;
    const handler = latestHandler;
    latestSample = null;
    latestHandler = null;

    if (typeof handler === 'function') {
      handler(sample, timestamp);
    }
  };

  return {
    push(sample, handler) {
      latestSample = sample;
      latestHandler = handler;

      if (!frameId) {
        frameId = requestFrame(flush);
      }
      return frameId;
    },
    cancel() {
      if (frameId) {
        cancelFrame(frameId);
      }
      frameId = 0;
      latestSample = null;
      latestHandler = null;
    },
    isPending() {
      return Boolean(frameId);
    },
  };
};

export const createInteractionQualityController = ({
  getMapper,
  applyBaseQuality,
  render,
  interactiveSampleDistance = 1.4,
  interactiveMaxSamplesPerRay = 360,
} = {}) => {
  let active = false;

  const renderNow = () => {
    if (typeof render === 'function') {
      render();
    }
  };

  return {
    begin() {
      if (!active) {
        const mapper = typeof getMapper === 'function' ? getMapper() : null;
        if (mapper?.setSampleDistance) {
          mapper.setSampleDistance(interactiveSampleDistance);
        }
        if (mapper?.setMaximumSamplesPerRay) {
          mapper.setMaximumSamplesPerRay(interactiveMaxSamplesPerRay);
        }
        active = true;
      }
      renderNow();
    },
    end() {
      if (!active) return;
      active = false;
      if (typeof applyBaseQuality === 'function') {
        applyBaseQuality();
      }
    },
    isActive() {
      return active;
    },
  };
};
