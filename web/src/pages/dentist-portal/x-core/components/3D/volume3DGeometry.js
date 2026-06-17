import vtkImageData from '@kitware/vtk.js/Common/DataModel/ImageData.js';
import vtkDataArray from '@kitware/vtk.js/Common/Core/DataArray.js';

export const SURFACE_TRACE_MIN_STEP_MM = 0.65;
export const BRUSH_RADIUS_MIN_MM = 0.8;
export const BRUSH_RADIUS_MAX_MM = 8;
export const BRUSH_RADIUS_DEFAULT_MM = 2.6;

export function arraysNearlyEqual(a, b, epsilon = 1e-3) {
  if (!a || !b || a.length !== b.length) return false;
  return a.every((value, index) => Math.abs(value - b[index]) <= epsilon);
}

function normalizeVector3(vector) {
  if (!isWorldPoint3D(vector)) return null;
  const length = Math.hypot(Number(vector[0]), Number(vector[1]), Number(vector[2]));
  if (!Number.isFinite(length) || length <= 1e-6) return null;
  return [Number(vector[0]) / length, Number(vector[1]) / length, Number(vector[2]) / length];
}

function angleBetweenVectorsDeg(vectorA, vectorB) {
  const normalizedA = normalizeVector3(vectorA);
  const normalizedB = normalizeVector3(vectorB);
  if (!normalizedA || !normalizedB) return null;
  const dot = Math.max(-1, Math.min(1,
    (normalizedA[0] * normalizedB[0])
    + (normalizedA[1] * normalizedB[1])
    + (normalizedA[2] * normalizedB[2])
  ));
  return (Math.acos(dot) * 180) / Math.PI;
}

export function distanceMm(pointA, pointB) {
  const dx = pointA[0] - pointB[0];
  const dy = pointA[1] - pointB[1];
  const dz = pointA[2] - pointB[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function midpoint(pointA, pointB) {
  return [
    (pointA[0] + pointB[0]) / 2,
    (pointA[1] + pointB[1]) / 2,
    (pointA[2] + pointB[2]) / 2,
  ];
}

export function isWorldPoint3D(point) {
  return Array.isArray(point)
    && point.length >= 3
    && point.every((value) => Number.isFinite(Number(value)));
}

export function isWorldPathAnnotation(annotation) {
  return Array.isArray(annotation?.coordinates?.world_path)
    && annotation.coordinates.world_path.length >= 3
    && annotation.coordinates.world_path.every(isWorldPoint3D);
}

export function isWorldBrushAnnotation(annotation) {
  const centers = annotation?.coordinates?.world_brush?.centers;
  return Array.isArray(centers)
    && centers.length >= 1
    && centers.every(isWorldPoint3D);
}

export function isWorldLineAnnotation(annotation) {
  return ['arrow', 'circle'].includes(annotation?.type)
    && isWorldPoint3D(annotation?.coordinates?.world_start)
    && isWorldPoint3D(annotation?.coordinates?.world_end);
}

export function isWorldTextAnnotation(annotation) {
  return annotation?.type === 'text'
    && isWorldPoint3D(annotation?.coordinates?.world_point);
}

export function isWorldOverlayAnnotation(annotation) {
  return isWorldLineAnnotation(annotation) || isWorldTextAnnotation(annotation);
}

export function isWorldGeometryAnnotation(annotation) {
  return isWorldPathAnnotation(annotation) || isWorldBrushAnnotation(annotation) || isWorldOverlayAnnotation(annotation);
}

export function simplifyWorldPoints(points, minStepMm = SURFACE_TRACE_MIN_STEP_MM) {
  if (!Array.isArray(points) || points.length === 0) return [];
  const simplified = [points[0]];
  for (let index = 1; index < points.length - 1; index += 1) {
    if (distanceMm(points[index], simplified[simplified.length - 1]) >= minStepMm) {
      simplified.push(points[index]);
    }
  }
  const lastPoint = points[points.length - 1];
  if (!arraysNearlyEqual(lastPoint, simplified[simplified.length - 1], 1e-3)) {
    simplified.push(lastPoint);
  }
  return simplified;
}

export function simplifyWorldPath(points, minStepMm = SURFACE_TRACE_MIN_STEP_MM) {
  const simplified = simplifyWorldPoints(points, minStepMm);
  return simplified.length >= 3 ? simplified : [];
}

export function computeWorldPolygonAreaMm2(points) {
  if (!Array.isArray(points) || points.length < 3) return 0;
  let nx = 0;
  let ny = 0;
  let nz = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    nx += (current[1] - next[1]) * (current[2] + next[2]);
    ny += (current[2] - next[2]) * (current[0] + next[0]);
    nz += (current[0] - next[0]) * (current[1] + next[1]);
  }
  return 0.5 * Math.sqrt((nx * nx) + (ny * ny) + (nz * nz));
}

export function centroidOfWorldPath(points) {
  if (!Array.isArray(points) || points.length === 0) return null;
  const totals = points.reduce((accumulator, point) => ([
    accumulator[0] + point[0],
    accumulator[1] + point[1],
    accumulator[2] + point[2],
  ]), [0, 0, 0]);
  return totals.map((value) => value / points.length);
}

export function hexToRgbNormalized(hex, fallback = [0.886, 0.294, 0.290]) {
  if (typeof hex !== 'string') return fallback;
  const raw = hex.trim().replace('#', '');
  const normalized = raw.length === 3 ? raw.split('').map((char) => char + char).join('') : raw;
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return fallback;
  return [
    parseInt(normalized.slice(0, 2), 16) / 255,
    parseInt(normalized.slice(2, 4), 16) / 255,
    parseInt(normalized.slice(4, 6), 16) / 255,
  ];
}

export function cameraStateApproximatelyMatches(expected, current, angleDegEpsilon = 12) {
  if (!expected || !current) return true;
  const expectedPosition = expected.position || expected.camera_position;
  const expectedFocalPoint = expected.focal_point || expected.focalPoint;
  const expectedViewUp = expected.view_up || expected.viewUp;
  const currentPosition = current.position || current.camera_position;
  const currentFocalPoint = current.focal_point || current.focalPoint;
  const currentViewUp = current.view_up || current.viewUp;

  if (!isWorldPoint3D(expectedPosition) || !isWorldPoint3D(expectedFocalPoint)
    || !isWorldPoint3D(currentPosition) || !isWorldPoint3D(currentFocalPoint)) {
    return true;
  }

  const expectedDirection = [
    expectedFocalPoint[0] - expectedPosition[0],
    expectedFocalPoint[1] - expectedPosition[1],
    expectedFocalPoint[2] - expectedPosition[2],
  ];
  const currentDirection = [
    currentFocalPoint[0] - currentPosition[0],
    currentFocalPoint[1] - currentPosition[1],
    currentFocalPoint[2] - currentPosition[2],
  ];
  const directionAngle = angleBetweenVectorsDeg(expectedDirection, currentDirection);
  if (directionAngle === null) return true;
  if (directionAngle > angleDegEpsilon) return false;

  if (isWorldPoint3D(expectedViewUp) && isWorldPoint3D(currentViewUp)) {
    const viewUpAngle = angleBetweenVectorsDeg(expectedViewUp, currentViewUp);
    if (viewUpAngle !== null && viewUpAngle > Math.max(angleDegEpsilon, 20)) return false;
  }

  return true;
}

export function hashWorldAnnotation(annotation, selectedId = null) {
  if (!annotation) return '';
  const parts = [
    annotation.id || '',
    annotation.type || '',
    annotation.color || '',
    String(annotation.displayOpacity ?? annotation.opacity ?? 1),
    String(annotation.id === selectedId),
  ];

  const path = annotation.coordinates?.world_path;
  if (Array.isArray(path)) {
    parts.push(String(path.length));
    const step = Math.max(1, Math.floor(path.length / 8));
    for (let index = 0; index < path.length; index += step) {
      const point = path[index] || [];
      parts.push(point.map((value) => Number(value || 0).toFixed(1)).join(','));
    }
  }

  const brush = annotation.coordinates?.world_brush;
  if (brush) {
    const centers = Array.isArray(brush.centers) ? brush.centers : [];
    parts.push(String(centers.length), String(Number(brush.radius_mm || 0).toFixed(2)));
    if (centers.length > 0) {
      const first = centers[0] || [];
      const last = centers[centers.length - 1] || [];
      parts.push(
        first.map((value) => Number(value || 0).toFixed(1)).join(','),
        last.map((value) => Number(value || 0).toFixed(1)).join(','),
      );
    }
  }

  return parts.join('|');
}

export function densifyWorldPoints(points, maxStepMm) {
  if (!Array.isArray(points) || points.length < 2) return Array.isArray(points) ? [...points] : [];
  const safeStep = Math.max(Number(maxStepMm) || 0, 0.25);
  const result = [points[0]];

  for (let index = 1; index < points.length; index += 1) {
    const previous = result[result.length - 1];
    const current = points[index];
    const segmentDistance = distanceMm(previous, current);
    if (!Number.isFinite(segmentDistance) || segmentDistance <= safeStep) {
      result.push(current);
      continue;
    }

    const steps = Math.ceil(segmentDistance / safeStep);
    for (let step = 1; step < steps; step += 1) {
      const t = step / steps;
      result.push([
        previous[0] + ((current[0] - previous[0]) * t),
        previous[1] + ((current[1] - previous[1]) * t),
        previous[2] + ((current[2] - previous[2]) * t),
      ]);
    }
    result.push(current);
  }

  return result;
}

export function createBrushMaskImage(sourceImageData, centers, radiusMm) {
  if (!sourceImageData || !Array.isArray(centers) || centers.length === 0) return null;

  const spacing = (sourceImageData.getSpacing?.() || [1, 1, 1]).map((value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  });
  const dims = sourceImageData.getDimensions?.() || [0, 0, 0];
  if (!dims[0] || !dims[1] || !dims[2]) return null;

  const brushRadiusMm = Math.max(BRUSH_RADIUS_MIN_MM, Number(radiusMm) || BRUSH_RADIUS_DEFAULT_MM);
  const denseCenters = densifyWorldPoints(
    centers.filter(isWorldPoint3D),
    Math.max(brushRadiusMm * 0.45, Math.min(...spacing) * 0.9),
  );
  if (denseCenters.length === 0) return null;

  const indexCenters = denseCenters
    .map((center) => sourceImageData.worldToIndex?.(center))
    .filter((point) => Array.isArray(point) && point.length >= 3 && point.every((value) => Number.isFinite(value)));
  if (indexCenters.length === 0) return null;

  const radiusInVoxels = [
    Math.max(1, Math.ceil(brushRadiusMm / spacing[0])),
    Math.max(1, Math.ceil(brushRadiusMm / spacing[1])),
    Math.max(1, Math.ceil(brushRadiusMm / spacing[2])),
  ];

  let minI = dims[0];
  let minJ = dims[1];
  let minK = dims[2];
  let maxI = -1;
  let maxJ = -1;
  let maxK = -1;

  indexCenters.forEach((point) => {
    minI = Math.min(minI, Math.floor(point[0] - radiusInVoxels[0] - 1));
    minJ = Math.min(minJ, Math.floor(point[1] - radiusInVoxels[1] - 1));
    minK = Math.min(minK, Math.floor(point[2] - radiusInVoxels[2] - 1));
    maxI = Math.max(maxI, Math.ceil(point[0] + radiusInVoxels[0] + 1));
    maxJ = Math.max(maxJ, Math.ceil(point[1] + radiusInVoxels[1] + 1));
    maxK = Math.max(maxK, Math.ceil(point[2] + radiusInVoxels[2] + 1));
  });

  minI = Math.max(0, minI);
  minJ = Math.max(0, minJ);
  minK = Math.max(0, minK);
  maxI = Math.min(dims[0] - 1, maxI);
  maxJ = Math.min(dims[1] - 1, maxJ);
  maxK = Math.min(dims[2] - 1, maxK);

  const localDims = [
    (maxI - minI) + 1,
    (maxJ - minJ) + 1,
    (maxK - minK) + 1,
  ];
  if (localDims.some((value) => value <= 0)) return null;

  const maskValues = new Uint8Array(localDims[0] * localDims[1] * localDims[2]);
  const radiusSq = brushRadiusMm * brushRadiusMm;
  let voxelCount = 0;

  indexCenters.forEach((center) => {
    const localCenter = [
      center[0] - minI,
      center[1] - minJ,
      center[2] - minK,
    ];

    const iMin = Math.max(0, Math.floor(localCenter[0] - radiusInVoxels[0]));
    const iMax = Math.min(localDims[0] - 1, Math.ceil(localCenter[0] + radiusInVoxels[0]));
    const jMin = Math.max(0, Math.floor(localCenter[1] - radiusInVoxels[1]));
    const jMax = Math.min(localDims[1] - 1, Math.ceil(localCenter[1] + radiusInVoxels[1]));
    const kMin = Math.max(0, Math.floor(localCenter[2] - radiusInVoxels[2]));
    const kMax = Math.min(localDims[2] - 1, Math.ceil(localCenter[2] + radiusInVoxels[2]));

    for (let k = kMin; k <= kMax; k += 1) {
      const dzMm = (k - localCenter[2]) * spacing[2];
      const dzSq = dzMm * dzMm;
      for (let j = jMin; j <= jMax; j += 1) {
        const dyMm = (j - localCenter[1]) * spacing[1];
        const dySq = dyMm * dyMm;
        for (let i = iMin; i <= iMax; i += 1) {
          const dxMm = (i - localCenter[0]) * spacing[0];
          if ((dxMm * dxMm) + dySq + dzSq > radiusSq) continue;
          const idx = i + (localDims[0] * (j + (localDims[1] * k)));
          if (maskValues[idx]) continue;
          maskValues[idx] = 1;
          voxelCount += 1;
        }
      }
    }
  });

  if (voxelCount === 0) return null;

  const maskImage = vtkImageData.newInstance();
  maskImage.setDimensions(...localDims);
  maskImage.setSpacing(...spacing);
  const origin = sourceImageData.indexToWorld?.([minI, minJ, minK]) || sourceImageData.getOrigin?.() || [0, 0, 0];
  maskImage.setOrigin(...origin);
  const direction = sourceImageData.getDirection?.();
  if (direction && typeof maskImage.setDirection === 'function') {
    try {
      maskImage.setDirection(direction);
    } catch (_) {}
  }
  maskImage.getPointData().setScalars(vtkDataArray.newInstance({
    name: 'ManualBrushMask',
    numberOfComponents: 1,
    values: maskValues,
  }));

  return { maskImage, voxelCount };
}

export function stampBrushLabelToArray(sourceImageData, targetValues, centers, radiusMm, labelValue) {
  if (!sourceImageData || !targetValues || !Array.isArray(centers) || centers.length === 0) return 0;

  const spacing = (sourceImageData.getSpacing?.() || [1, 1, 1]).map((value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  });
  const dims = sourceImageData.getDimensions?.() || [0, 0, 0];
  if (!dims[0] || !dims[1] || !dims[2]) return 0;

  const brushRadiusMm = Math.max(BRUSH_RADIUS_MIN_MM, Number(radiusMm) || BRUSH_RADIUS_DEFAULT_MM);
  const denseCenters = densifyWorldPoints(
    centers.filter(isWorldPoint3D),
    Math.max(brushRadiusMm * 0.45, Math.min(...spacing) * 0.9),
  );
  const indexCenters = denseCenters
    .map((center) => sourceImageData.worldToIndex?.(center))
    .filter((point) => Array.isArray(point) && point.length >= 3 && point.every((value) => Number.isFinite(value)));
  if (indexCenters.length === 0) return 0;

  const radiusInVoxels = [
    Math.max(1, Math.ceil(brushRadiusMm / spacing[0])),
    Math.max(1, Math.ceil(brushRadiusMm / spacing[1])),
    Math.max(1, Math.ceil(brushRadiusMm / spacing[2])),
  ];
  const radiusSq = brushRadiusMm * brushRadiusMm;
  let affected = 0;

  indexCenters.forEach((center) => {
    const iMin = Math.max(0, Math.floor(center[0] - radiusInVoxels[0]));
    const iMax = Math.min(dims[0] - 1, Math.ceil(center[0] + radiusInVoxels[0]));
    const jMin = Math.max(0, Math.floor(center[1] - radiusInVoxels[1]));
    const jMax = Math.min(dims[1] - 1, Math.ceil(center[1] + radiusInVoxels[1]));
    const kMin = Math.max(0, Math.floor(center[2] - radiusInVoxels[2]));
    const kMax = Math.min(dims[2] - 1, Math.ceil(center[2] + radiusInVoxels[2]));

    for (let k = kMin; k <= kMax; k += 1) {
      const dzMm = (k - center[2]) * spacing[2];
      const dzSq = dzMm * dzMm;
      for (let j = jMin; j <= jMax; j += 1) {
        const dyMm = (j - center[1]) * spacing[1];
        const dySq = dyMm * dyMm;
        for (let i = iMin; i <= iMax; i += 1) {
          const dxMm = (i - center[0]) * spacing[0];
          if ((dxMm * dxMm) + dySq + dzSq > radiusSq) continue;
          const idx = i + (dims[0] * (j + (dims[1] * k)));
          if (targetValues[idx] !== labelValue) {
            targetValues[idx] = labelValue;
            affected += 1;
          }
        }
      }
    }
  });

  return affected;
}

function clampIndex(value, maxExclusive) {
  const rounded = Math.round(Number(value) || 0);
  return Math.max(0, Math.min(maxExclusive - 1, rounded));
}

export function rasterizeWorldPathAnnotation(annotation, imageData, targetValues, labelValue) {
  const path = annotation?.coordinates?.world_path;
  if (!imageData || !targetValues || !Array.isArray(path) || path.length < 3) return 0;

  const dims = imageData.getDimensions?.() || [0, 0, 0];
  if (!dims[0] || !dims[1] || !dims[2]) return 0;

  const indexPath = path
    .map((worldPoint) => imageData.worldToIndex?.(worldPoint))
    .filter((point) => Array.isArray(point) && point.length >= 3 && point.every((value) => Number.isFinite(value)));
  if (indexPath.length < 3) return 0;

  const minK = Math.max(0, Math.floor(Math.min(...indexPath.map((point) => point[2]))));
  const maxK = Math.min(dims[2] - 1, Math.ceil(Math.max(...indexPath.map((point) => point[2]))));
  const polygon2D = indexPath.map((point) => ({ i: point[0], j: point[1] }));

  let painted = 0;
  for (let k = minK; k <= maxK; k += 1) {
    const jValues = polygon2D.map((point) => point.j);
    const jStart = Math.max(0, Math.floor(Math.min(...jValues)));
    const jEnd = Math.min(dims[1] - 1, Math.ceil(Math.max(...jValues)));

    for (let j = jStart; j <= jEnd; j += 1) {
      const intersections = [];
      for (let index = 0; index < polygon2D.length; index += 1) {
        const current = polygon2D[index];
        const next = polygon2D[(index + 1) % polygon2D.length];
        const y0 = current.j;
        const y1 = next.j;
        const crosses = ((y0 <= j) && (y1 > j)) || ((y1 <= j) && (y0 > j));
        if (!crosses) continue;
        const t = (j - y0) / ((y1 - y0) || Number.EPSILON);
        intersections.push(current.i + ((next.i - current.i) * t));
      }
      intersections.sort((a, b) => a - b);
      for (let index = 0; index + 1 < intersections.length; index += 2) {
        const iStart = clampIndex(Math.ceil(intersections[index]), dims[0]);
        const iEnd = clampIndex(Math.floor(intersections[index + 1]), dims[0]);
        for (let i = iStart; i <= iEnd; i += 1) {
          const voxelIndex = i + (dims[0] * (j + (dims[1] * k)));
          if (targetValues[voxelIndex] !== labelValue) {
            targetValues[voxelIndex] = labelValue;
            painted += 1;
          }
        }
      }
    }
  }

  return painted;
}

export function distanceBetweenSegments(a0, a1, b0, b1) {
  if (!a0 || !a1 || !b0 || !b1) return Number.POSITIVE_INFINITY;
  const u = [a1[0] - a0[0], a1[1] - a0[1], a1[2] - a0[2]];
  const v = [b1[0] - b0[0], b1[1] - b0[1], b1[2] - b0[2]];
  const w = [a0[0] - b0[0], a0[1] - b0[1], a0[2] - b0[2]];
  const a = (u[0] * u[0]) + (u[1] * u[1]) + (u[2] * u[2]);
  const b = (u[0] * v[0]) + (u[1] * v[1]) + (u[2] * v[2]);
  const c = (v[0] * v[0]) + (v[1] * v[1]) + (v[2] * v[2]);
  const d = (u[0] * w[0]) + (u[1] * w[1]) + (u[2] * w[2]);
  const e = (v[0] * w[0]) + (v[1] * w[1]) + (v[2] * w[2]);
  const D = (a * c) - (b * b);
  let sN = 0;
  let sD = D;
  let tN = 0;
  let tD = D;

  if (D < 1e-8) {
    sN = 0;
    sD = 1;
    tN = e;
    tD = c;
  } else {
    sN = (b * e) - (c * d);
    tN = (a * e) - (b * d);
    if (sN < 0) {
      sN = 0;
      tN = e;
      tD = c;
    } else if (sN > sD) {
      sN = sD;
      tN = e + b;
      tD = c;
    }
  }

  if (tN < 0) {
    tN = 0;
    if (-d < 0) sN = 0;
    else if (-d > a) sN = sD;
    else {
      sN = -d;
      sD = a;
    }
  } else if (tN > tD) {
    tN = tD;
    if ((-d + b) < 0) sN = 0;
    else if ((-d + b) > a) sN = sD;
    else {
      sN = -d + b;
      sD = a;
    }
  }

  const sc = Math.abs(sN) < 1e-8 ? 0 : sN / sD;
  const tc = Math.abs(tN) < 1e-8 ? 0 : tN / tD;
  const dx = w[0] + (sc * u[0]) - (tc * v[0]);
  const dy = w[1] + (sc * u[1]) - (tc * v[1]);
  const dz = w[2] + (sc * u[2]) - (tc * v[2]);
  return Math.sqrt((dx * dx) + (dy * dy) + (dz * dz));
}
