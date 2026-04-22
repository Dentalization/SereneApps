export const PROJECTION_SIZE_EPSILON_PX = 2;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export const isProjectionFrameCurrent = ({
  containerWidth,
  containerHeight,
  viewportWidthCss,
  viewportHeightCss,
  epsilonPx = PROJECTION_SIZE_EPSILON_PX,
}) => (
  Number.isFinite(containerWidth)
  && Number.isFinite(containerHeight)
  && Number.isFinite(viewportWidthCss)
  && Number.isFinite(viewportHeightCss)
  && containerWidth > 0
  && containerHeight > 0
  && viewportWidthCss > 0
  && viewportHeightCss > 0
  && Math.abs(viewportWidthCss - containerWidth) <= epsilonPx
  && Math.abs(viewportHeightCss - containerHeight) <= epsilonPx
);

export const buildProjectedImageBounds = ({
  projectedCorners,
  viewportWidth,
  viewportHeight,
  epsilonPx = PROJECTION_SIZE_EPSILON_PX,
}) => {
  if (!Array.isArray(projectedCorners) || projectedCorners.length < 4) return null;
  if (projectedCorners.some((point) => !point?.frameCurrent)) return null;

  const xs = projectedCorners.map((point) => point.x);
  const ys = projectedCorners.map((point) => point.y);
  if (
    xs.some((value) => !Number.isFinite(value))
    || ys.some((value) => !Number.isFinite(value))
    || !Number.isFinite(viewportWidth)
    || !Number.isFinite(viewportHeight)
    || viewportWidth <= 0
    || viewportHeight <= 0
  ) {
    return null;
  }

  const minX = clamp(Math.min(...xs), 0, viewportWidth);
  const maxX = clamp(Math.max(...xs), 0, viewportWidth);
  const minY = clamp(Math.min(...ys), 0, viewportHeight);
  const maxY = clamp(Math.max(...ys), 0, viewportHeight);
  const width = maxX - minX;
  const height = maxY - minY;

  if (width <= epsilonPx || height <= epsilonPx) return null;

  return {
    x: minX,
    y: minY,
    width,
    height,
  };
};
