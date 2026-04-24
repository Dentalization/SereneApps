import vtkImageData from '@kitware/vtk.js/Common/DataModel/ImageData';
import vtkDataArray from '@kitware/vtk.js/Common/Core/DataArray';

export const SURFACE_TRACE_MIN_STEP_MM = 0.65;
export const BRUSH_RADIUS_MIN_MM = 0.8;
export const BRUSH_RADIUS_MAX_MM = 8;
export const BRUSH_RADIUS_DEFAULT_MM = 2.6;

export function arraysNearlyEqual(a, b, epsilon = 1e-3) {
  if (!a || !b || a.length !== b.length) return false;
  return a.every((value, index) => Math.abs(value - b[index]) <= epsilon);
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

export function cameraStateApproximatelyMatches(expected, current, epsilon = 0.75) {
  if (!expected || !current) return true;
  const expectedPosition = expected.position || expected.camera_position;
  const expectedFocalPoint = expected.focal_point || expected.focalPoint;
  const expectedViewUp = expected.view_up || expected.viewUp;
  const currentPosition = current.position || current.camera_position;
  const currentFocalPoint = current.focal_point || current.focalPoint;
  const currentViewUp = current.view_up || current.viewUp;

  return arraysNearlyEqual(expectedPosition, currentPosition, epsilon)
    && arraysNearlyEqual(expectedFocalPoint, currentFocalPoint, epsilon)
    && arraysNearlyEqual(expectedViewUp, currentViewUp, 0.08);
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
