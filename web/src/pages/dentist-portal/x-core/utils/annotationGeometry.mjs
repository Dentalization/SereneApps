export const HIT_TEST_EPSILON_PX = 1;

export const clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0));

export const normalizePoint = (point) => ({
  x: clamp01(point?.x),
  y: clamp01(point?.y),
});

export const normalizePath = (path) => (Array.isArray(path) ? path.map(normalizePoint) : []);

export const clientToViewportPoint = (event, rect, viewportWidth, viewportHeight) => {
  if (!event || !rect || !rect.width || !rect.height || !viewportWidth || !viewportHeight) {
    return null;
  }

  return {
    x: ((event.clientX - rect.left) / rect.width) * viewportWidth,
    y: ((event.clientY - rect.top) / rect.height) * viewportHeight,
  };
};

export const viewportToImagePoint = ({
  point,
  viewportSize,
  imageSize,
  imageBounds,
  zoom = 1,
  pan = { x: 0, y: 0 },
}) => {
  const imageWidth = imageSize?.width || 0;
  const imageHeight = imageSize?.height || 0;
  if (!point || !imageWidth || !imageHeight) return null;

  if (imageBounds?.width > 0 && imageBounds?.height > 0) {
    return {
      x: ((point.x - imageBounds.x) / imageBounds.width) * imageWidth,
      y: ((point.y - imageBounds.y) / imageBounds.height) * imageHeight,
    };
  }

  if (viewportSize?.width > 0 && viewportSize?.height > 0 && zoom > 0) {
    return {
      x: (point.x - (viewportSize.width / 2) - (pan?.x || 0)) / zoom + (imageWidth / 2),
      y: (point.y - (viewportSize.height / 2) - (pan?.y || 0)) / zoom + (imageHeight / 2),
    };
  }

  return {
    x: (point.x / (viewportSize?.width || imageWidth)) * imageWidth,
    y: (point.y / (viewportSize?.height || imageHeight)) * imageHeight,
  };
};

export const imagePointToViewport = ({
  point,
  viewportSize,
  imageSize,
  imageBounds,
  zoom = 1,
  pan = { x: 0, y: 0 },
}) => {
  const imageWidth = imageSize?.width || 0;
  const imageHeight = imageSize?.height || 0;
  if (!point || !imageWidth || !imageHeight) return null;

  if (imageBounds?.width > 0 && imageBounds?.height > 0) {
    return {
      x: imageBounds.x + (point.x / imageWidth) * imageBounds.width,
      y: imageBounds.y + (point.y / imageHeight) * imageBounds.height,
    };
  }

  if (viewportSize?.width > 0 && viewportSize?.height > 0 && zoom > 0) {
    return {
      x: ((point.x - (imageWidth / 2)) * zoom) + (viewportSize.width / 2) + (pan?.x || 0),
      y: ((point.y - (imageHeight / 2)) * zoom) + (viewportSize.height / 2) + (pan?.y || 0),
    };
  }

  return {
    x: (point.x / imageWidth) * (viewportSize?.width || imageWidth),
    y: (point.y / imageHeight) * (viewportSize?.height || imageHeight),
  };
};

export const viewportToNormalizedPoint = (options) => {
  const imagePoint = viewportToImagePoint(options);
  const imageWidth = options?.imageSize?.width || 0;
  const imageHeight = options?.imageSize?.height || 0;
  if (!imagePoint || !imageWidth || !imageHeight) return null;

  if (
    imagePoint.x < -HIT_TEST_EPSILON_PX
    || imagePoint.y < -HIT_TEST_EPSILON_PX
    || imagePoint.x > imageWidth + HIT_TEST_EPSILON_PX
    || imagePoint.y > imageHeight + HIT_TEST_EPSILON_PX
  ) {
    return null;
  }

  return normalizePoint({
    x: imagePoint.x / imageWidth,
    y: imagePoint.y / imageHeight,
  });
};

export const normalizedToImagePoint = (point, imageSize) => ({
  x: clamp01(point?.x) * (imageSize?.width || 0),
  y: clamp01(point?.y) * (imageSize?.height || 0),
});

export const normalizedToViewportPoint = (point, options) => imagePointToViewport({
  ...options,
  point: normalizedToImagePoint(point, options?.imageSize),
});

export const distanceNormalizedAsPx = (a, b, imageSize) => Math.hypot(
  (clamp01(a?.x) - clamp01(b?.x)) * (imageSize?.width || 0),
  (clamp01(a?.y) - clamp01(b?.y)) * (imageSize?.height || 0)
);

export const squaredDistanceToSegmentPx = (point, start, end, imageSize) => {
  const px = clamp01(point?.x) * (imageSize?.width || 0);
  const py = clamp01(point?.y) * (imageSize?.height || 0);
  const sx = clamp01(start?.x) * (imageSize?.width || 0);
  const sy = clamp01(start?.y) * (imageSize?.height || 0);
  const ex = clamp01(end?.x) * (imageSize?.width || 0);
  const ey = clamp01(end?.y) * (imageSize?.height || 0);
  const dx = ex - sx;
  const dy = ey - sy;
  const lenSq = dx * dx + dy * dy;
  if (!lenSq) return ((px - sx) ** 2) + ((py - sy) ** 2);
  const t = Math.max(0, Math.min(1, ((px - sx) * dx + (py - sy) * dy) / lenSq));
  const projX = sx + t * dx;
  const projY = sy + t * dy;
  return ((px - projX) ** 2) + ((py - projY) ** 2);
};

export const distanceToSegmentPx = (point, start, end, imageSize) => (
  Math.sqrt(squaredDistanceToSegmentPx(point, start, end, imageSize))
);

export const simplifyPath = (points, epsilonPx, imageSize) => {
  const normalized = normalizePath(points);
  if (normalized.length <= 2) return normalized;

  let maxDistanceSq = 0;
  let splitIndex = 0;
  const first = normalized[0];
  const last = normalized[normalized.length - 1];

  for (let index = 1; index < normalized.length - 1; index += 1) {
    const distanceSq = squaredDistanceToSegmentPx(normalized[index], first, last, imageSize);
    if (distanceSq > maxDistanceSq) {
      maxDistanceSq = distanceSq;
      splitIndex = index;
    }
  }

  if (Math.sqrt(maxDistanceSq) <= epsilonPx || splitIndex === 0 || splitIndex === normalized.length - 1) {
    return [first, last];
  }

  const left = simplifyPath(normalized.slice(0, splitIndex + 1), epsilonPx, imageSize);
  const right = simplifyPath(normalized.slice(splitIndex), epsilonPx, imageSize);
  return [...left.slice(0, -1), ...right];
};

export const polygonAreaPx = (path, imageSize) => {
  const normalized = normalizePath(path);
  if (normalized.length < 3) return 0;
  let sum = 0;
  for (let index = 0; index < normalized.length; index += 1) {
    const current = normalized[index];
    const next = normalized[(index + 1) % normalized.length];
    sum += (
      current.x * (imageSize?.width || 0) * next.y * (imageSize?.height || 0)
    ) - (
      next.x * (imageSize?.width || 0) * current.y * (imageSize?.height || 0)
    );
  }
  return Math.abs(sum / 2);
};

export const centroidOfPath = (path) => {
  const normalized = normalizePath(path);
  if (!normalized.length) return null;
  const total = normalized.reduce((acc, point) => ({
    x: acc.x + point.x,
    y: acc.y + point.y,
  }), { x: 0, y: 0 });
  return { x: total.x / normalized.length, y: total.y / normalized.length };
};

export const pointInPolygon = (point, path) => {
  const normalized = normalizePath(path);
  if (normalized.length < 3) return false;
  const p = normalizePoint(point);
  let inside = false;
  for (let i = 0, j = normalized.length - 1; i < normalized.length; j = i, i += 1) {
    const xi = normalized[i].x;
    const yi = normalized[i].y;
    const xj = normalized[j].x;
    const yj = normalized[j].y;
    const intersects = ((yi > p.y) !== (yj > p.y))
      && (p.x < ((xj - xi) * (p.y - yi)) / ((yj - yi) || Number.EPSILON) + xi);
    if (intersects) inside = !inside;
  }
  return inside;
};

export const moveCoordinates = (coordinates, delta) => {
  if (coordinates?.path) {
    return {
      ...coordinates,
      path: normalizePath(coordinates.path).map((point) => normalizePoint({
        x: point.x + delta.x,
        y: point.y + delta.y,
      })),
    };
  }
  if (coordinates?.start && coordinates?.end) {
    return {
      ...coordinates,
      start: normalizePoint({ x: coordinates.start.x + delta.x, y: coordinates.start.y + delta.y }),
      end: normalizePoint({ x: coordinates.end.x + delta.x, y: coordinates.end.y + delta.y }),
    };
  }
  return normalizePoint({
    x: coordinates?.x + delta.x,
    y: coordinates?.y + delta.y,
  });
};
