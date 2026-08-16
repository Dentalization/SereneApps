import vtkImageData from '@kitware/vtk.js/Common/DataModel/ImageData.js';
import vtkDataArray from '@kitware/vtk.js/Common/Core/DataArray.js';

export const SURFACE_TRACE_MIN_STEP_MM = 0.25;
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
    parts.push(String(Number(brush.radius_mm || 0).toFixed(2)));
    if (centers.length > 0) {
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      let minZ = Infinity;
      let maxZ = -Infinity;
      for (const p of centers) {
        if (p[0] < minX) minX = p[0];
        if (p[0] > maxX) maxX = p[0];
        if (p[1] < minY) minY = p[1];
        if (p[1] > maxY) maxY = p[1];
        if (p[2] < minZ) minZ = p[2];
        if (p[2] > maxZ) maxZ = p[2];
      }
      parts.push(
        `${minX.toFixed(1)},${maxX.toFixed(1)}`,
        `${minY.toFixed(1)},${maxY.toFixed(1)}`,
        `${minZ.toFixed(1)},${maxZ.toFixed(1)}`,
      );
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
    } catch (_) { }
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

  const indexPoints = path
    .map((worldPoint) => imageData.worldToIndex?.(worldPoint))
    .filter((point) => Array.isArray(point) && point.length >= 3 && point.every((value) => Number.isFinite(value)));
  if (indexPoints.length < 3) return 0;

  // Calculate polygon normal via Newell's method in index space
  const normal = [0, 0, 0];
  for (let idx = 0; idx < indexPoints.length; idx += 1) {
    const c = indexPoints[idx];
    const n = indexPoints[(idx + 1) % indexPoints.length];
    normal[0] += (c[1] - n[1]) * (c[2] + n[2]);
    normal[1] += (c[2] - n[2]) * (c[0] + n[0]);
    normal[2] += (c[0] - n[0]) * (c[1] + n[1]);
  }

  const absN = normal.map(Math.abs);
  const maxAxis = absN[0] > absN[1] ? (absN[0] > absN[2] ? 0 : 2) : (absN[1] > absN[2] ? 1 : 2);

  // Map 3D index axes to 2D projection plane (u, v) and slice sweep axis w
  const axisMap = {
    0: { u: 1, v: 2, w: 0 }, // Sagittal dominant (constant X / I)
    1: { u: 0, v: 2, w: 1 }, // Coronal dominant (constant Y / J)
    2: { u: 0, v: 1, w: 2 }, // Axial dominant (constant Z / K)
  }[maxAxis];

  const poly2D = indexPoints.map((p) => ({ u: p[axisMap.u], v: p[axisMap.v] }));
  const wVals = indexPoints.map((p) => p[axisMap.w]);
  const minW = Math.max(0, Math.floor(Math.min(...wVals)));
  const maxW = Math.min(dims[axisMap.w] - 1, Math.ceil(Math.max(...wVals)));

  const vVals = poly2D.map((p) => p.v);
  const minV = Math.max(0, Math.floor(Math.min(...vVals)));
  const maxV = Math.min(dims[axisMap.v] - 1, Math.ceil(Math.max(...vVals)));

  let painted = 0;
  const dimX = dims[0];
  const dimXY = dims[0] * dims[1];

  for (let w = minW; w <= maxW; w += 1) {
    for (let v = minV; v <= maxV; v += 1) {
      const nodes = [];
      for (let i = 0; i < poly2D.length; i += 1) {
        const j = (i + 1) % poly2D.length;
        const pi = poly2D[i];
        const pj = poly2D[j];
        if ((pi.v < v && pj.v >= v) || (pj.v < v && pi.v >= v)) {
          nodes.push(pi.u + (((v - pi.v) / ((pj.v - pi.v) || 1e-6)) * (pj.u - pi.u)));
        }
      }
      nodes.sort((a, b) => a - b);

      for (let i = 0; i + 1 < nodes.length; i += 2) {
        const uStart = Math.max(0, Math.ceil(nodes[i]));
        const uEnd = Math.min(dims[axisMap.u] - 1, Math.floor(nodes[i + 1]));

        for (let u = uStart; u <= uEnd; u += 1) {
          const coords = [0, 0, 0];
          coords[axisMap.u] = u;
          coords[axisMap.v] = v;
          coords[axisMap.w] = w;

          const voxelIdx = coords[0] + (coords[1] * dimX) + (coords[2] * dimXY);
          if (targetValues[voxelIdx] !== labelValue) {
            targetValues[voxelIdx] = labelValue;
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

/**
 * Canonical 3D World -> DOM Overlay screen coordinates projector.
 * Maps [x, y, z] in world space (mm) to { x, y } in CSS pixels relative to containerRect.
 * Includes strict camera forward-plane dot product check to prevent frustum mirroring.
 */
export function projectWorldToOverlay(worldPoint, renderer, renderWindow, containerRect) {
  if (!isWorldPoint3D(worldPoint) || !renderer || !renderWindow || !containerRect) return null;

  const rectWidth = Number(containerRect.width) || 0;
  const rectHeight = Number(containerRect.height) || 0;
  if (rectWidth <= 0 || rectHeight <= 0) return null;

  const camera = renderer.getActiveCamera?.();
  if (camera) {
    const camPos = camera.getPosition?.();
    const camFocal = camera.getFocalPoint?.();
    if (camPos && camFocal) {
      const vpn = [camFocal[0] - camPos[0], camFocal[1] - camPos[1], camFocal[2] - camPos[2]];
      const toPoint = [worldPoint[0] - camPos[0], worldPoint[1] - camPos[1], worldPoint[2] - camPos[2]];
      const dotForward = (vpn[0] * toPoint[0]) + (vpn[1] * toPoint[1]) + (vpn[2] * toPoint[2]);
      if (dotForward <= 0) return null; // Discard points behind camera lens plane
    }
  }

  const view = renderWindow.getViews?.()?.[0] || renderWindow.getInteractor?.()?.getView?.();
  if (!view?.worldToDisplay) return null;

  const display = view.worldToDisplay(worldPoint[0], worldPoint[1], worldPoint[2], renderer);
  if (!display || display.length < 3) return null;

  const displayX = Number(display[0]);
  const displayY = Number(display[1]);
  const displayZ = Number(display[2]);
  if (!Number.isFinite(displayX) || !Number.isFinite(displayY) || !Number.isFinite(displayZ)) return null;
  if (displayZ < -0.15 || displayZ > 1.15) return null;

  const viewport = renderer.getViewport?.() || [0, 0, 1, 1];
  const viewSize = view.getSize?.() || [rectWidth, rectHeight];
  const fbWidth = Math.max(Number(viewSize[0]) || 1, 1);
  const fbHeight = Math.max(Number(viewSize[1]) || 1, 1);

  const normX = displayX / fbWidth;
  const normY = displayY / fbHeight;

  return {
    x: normX * rectWidth,
    y: (1.0 - normY) * rectHeight,
    depth: displayZ,
    inViewport: normX >= viewport[0] && normX <= viewport[2] && normY >= viewport[1] && normY <= viewport[3],
  };
}

/**
 * Canonical DOM Pointer Event -> VTK Display Coordinates converter.
 * Maps (clientX, clientY) to [x, y] in VTK display space (0..fbWidth, 0..fbHeight, bottom-left origin).
 */
export function pointerToVtkDisplayCoords(event, containerRect, renderWindow, renderer = null) {
  if (!event || !containerRect) return { x: 0, y: 0 };

  const rectLeft = Number(containerRect.left) || 0;
  const rectTop = Number(containerRect.top) || 0;
  const rectWidth = Math.max(Number(containerRect.width) || 1, 1);
  const rectHeight = Math.max(Number(containerRect.height) || 1, 1);

  const domX = (Number(event.clientX) || 0) - rectLeft;
  const domY = (Number(event.clientY) || 0) - rectTop;

  const view = renderWindow?.getViews?.()?.[0] || renderWindow?.getInteractor?.()?.getView?.();
  const viewSize = view?.getSize?.() || [rectWidth, rectHeight];
  const fbWidth = Math.max(Number(viewSize[0]) || 1, 1);
  const fbHeight = Math.max(Number(viewSize[1]) || 1, 1);

  return {
    x: (domX / rectWidth) * fbWidth,
    y: (1.0 - (domY / rectHeight)) * fbHeight,
  };
}

/**
 * Intersects a ray with an Axis-Aligned Bounding Box (AABB).
 * bounds: [xMin, xMax, yMin, yMax, zMin, zMax]
 * Returns { hit: boolean, tMin: number, tMax: number }
 */
export function intersectRayAABB(rayOrigin, rayDir, bounds) {
  let tMin = -Infinity;
  let tMax = Infinity;

  for (let i = 0; i < 3; i++) {
    const invD = 1.0 / (rayDir[i] || (rayDir[i] >= 0 ? 1e-12 : -1e-12));
    let t0 = (bounds[i * 2] - rayOrigin[i]) * invD;
    let t1 = (bounds[i * 2 + 1] - rayOrigin[i]) * invD;

    if (invD < 0) {
      const temp = t0;
      t0 = t1;
      t1 = temp;
    }

    tMin = Math.max(tMin, t0);
    tMax = Math.min(tMax, t1);

    if (tMax <= tMin) {
      return { hit: false, tMin: 0, tMax: 0 };
    }
  }

  return { hit: tMax > 0, tMin: Math.max(0, tMin), tMax };
}

/**
 * Robust volume ray-march picker for CBCT 3D ImageData.
 * Traces a ray from camera through the volume and finds the first anatomical surface hit.
 * Enforces unit ray normalization for millimeter-accurate step sizes.
 */
export function pickVolumeRaySurface(rayOrigin, rawRayDir, imageData, thresholdNormalized = 0.20) {
  if (!imageData || !rayOrigin || !rawRayDir) return null;

  const rayDir = normalizeVector3(rawRayDir);
  if (!rayDir) return null;

  const bounds = imageData.getBounds?.();
  if (!bounds || bounds.length < 6) return null;

  const { hit, tMin, tMax } = intersectRayAABB(rayOrigin, rayDir, bounds);
  if (!hit || tMax <= tMin) return null;

  const dims = imageData.getDimensions?.() || [0, 0, 0];
  const spacing = imageData.getSpacing?.() || [1, 1, 1];
  const scalars = imageData.getPointData?.()?.getScalars?.()?.getData?.();
  if (!scalars || dims[0] <= 0 || dims[1] <= 0 || dims[2] <= 0) {
    // Return bounding box entry point if scalars unavailable
    return [
      rayOrigin[0] + (rayDir[0] * tMin),
      rayOrigin[1] + (rayDir[1] * tMin),
      rayOrigin[2] + (rayDir[2] * tMin),
    ];
  }

  const range = imageData.getPointData()?.getScalars()?.getRange?.() || [0, 1];
  const minVal = range[0];
  const valSpan = Math.max(range[1] - range[0], 1e-6);
  const rawThreshold = minVal + (thresholdNormalized * valSpan);

  const stepSize = Math.max(Math.min(spacing[0], spacing[1], spacing[2]) * 0.5, 0.2);
  const steps = Math.min(Math.ceil((tMax - tMin) / stepSize), 1200);

  const dimX = dims[0];
  const dimXY = dims[0] * dims[1];

  for (let s = 0; s <= steps; s++) {
    const t = tMin + (s * stepSize);
    const wx = rayOrigin[0] + (rayDir[0] * t);
    const wy = rayOrigin[1] + (rayDir[1] * t);
    const wz = rayOrigin[2] + (rayDir[2] * t);

    const ijk = imageData.worldToIndex?.([wx, wy, wz]);
    if (!ijk) continue;

    const i = Math.round(ijk[0]);
    const j = Math.round(ijk[1]);
    const k = Math.round(ijk[2]);

    if (i >= 0 && i < dims[0] && j >= 0 && j < dims[1] && k >= 0 && k < dims[2]) {
      const voxelIdx = i + (j * dimX) + (k * dimXY);
      const val = scalars[voxelIdx];
      if (val >= rawThreshold) {
        return [wx, wy, wz];
      }
    }
  }

  // Fallback to entry point into the volume
  return [
    rayOrigin[0] + (rayDir[0] * tMin),
    rayOrigin[1] + (rayDir[1] * tMin),
    rayOrigin[2] + (rayDir[2] * tMin),
  ];
}

/**
 * Clinical Geometry & Spatial Calibration Validator for CBCT 3D ImageData.
 * Assesses voxel isotropy, FOV dimension integrity, and potential spatial distortion.
 *
 * @param {object} imageData - vtkImageData instance
 * @param {object} [metadata] - Optional DICOM metadata object
 * @returns {object} Geometric validation report
 */
export function validateVolumeGeometry(imageData, metadata = null) {
  if (!imageData) {
    return {
      status: 'INVALID',
      isIsotropic: false,
      maxAnisotropyPct: 100,
      dimensions: [0, 0, 0],
      spacing: [1, 1, 1],
      fovMm: [0, 0, 0],
      voxelResolutionMm: 0,
      warnings: ['Volume image data is missing or not initialized.'],
      recommendations: ['Reload study or inspect DICOM source files.'],
    };
  }

  const dims = (imageData.getDimensions?.() || [0, 0, 0]).map((v) => Number(v) || 0);
  const spacing = (imageData.getSpacing?.() || [1, 1, 1]).map((v) => {
    const num = Number(v);
    return Number.isFinite(num) && num > 0 ? num : 1.0;
  });

  const [dimX, dimY, dimZ] = dims;
  const [spX, spY, spZ] = spacing;

  const fovMm = [
    Number((dimX * spX).toFixed(2)),
    Number((dimY * spY).toFixed(2)),
    Number((dimZ * spZ).toFixed(2)),
  ];

  const minSpacing = Math.min(spX, spY, spZ);
  const maxSpacing = Math.max(spX, spY, spZ);
  const maxAnisotropyPct = Number((((maxSpacing - minSpacing) / (minSpacing || 1e-6)) * 100).toFixed(2));
  const voxelResolutionMm = Number(((spX + spY + spZ) / 3).toFixed(3));

  const warnings = [];
  const recommendations = [];

  if (dimX < 2 || dimY < 2 || dimZ < 2) {
    warnings.push(`Low volume dimensions: [${dimX}, ${dimY}, ${dimZ}]`);
  }

  if (spX <= 0 || spY <= 0 || spZ <= 0) {
    warnings.push('Non-positive voxel spacing detected in dataset.');
  }

  let status = 'VERIFIED';
  let isIsotropic = true;

  if (maxAnisotropyPct > 15.0) {
    status = 'ANOMALOUS';
    isIsotropic = false;
    warnings.push(`Significant voxel anisotropy detected (${maxAnisotropyPct}% deviation). Physical calipers may exhibit directional variance.`);
    recommendations.push('Cross-reference measurements with axial/sagittal 2D slices before critical surgical planning.');
  } else if (maxAnisotropyPct > 5.0) {
    status = 'WARNING';
    isIsotropic = false;
    warnings.push(`Mild voxel anisotropy detected (${maxAnisotropyPct}% deviation). Spacing is non-cubic.`);
    recommendations.push('Verify millimeter calibration against anatomical landmarks.');
  } else {
    status = 'VERIFIED';
    isIsotropic = true;
  }

  return {
    status,
    isIsotropic,
    maxAnisotropyPct,
    dimensions: dims,
    spacing: [Number(spX.toFixed(4)), Number(spY.toFixed(4)), Number(spZ.toFixed(4))],
    fovMm,
    voxelResolutionMm,
    warnings,
    recommendations,
  };
}



