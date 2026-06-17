export const CLINICAL_MEASUREMENT_TYPE = 'measurement';

const DEFAULT_MEASUREMENT_COLOR = '#1D9E75';

const roundNumber = (value, digits = 6) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Number(number.toFixed(digits));
};

const clamp01 = (value) => Math.max(0, Math.min(1, roundNumber(value)));

const isObject = (value) => Boolean(value && typeof value === 'object' && !Array.isArray(value));

const isPoint2D = (point) => (
  isObject(point)
  && Number.isFinite(Number(point.x))
  && Number.isFinite(Number(point.y))
);

const isWorldPoint = (point) => (
  Array.isArray(point)
  && point.length >= 3
  && point.every((value) => Number.isFinite(Number(value)))
);

const normalizeWorldPoint = (point) => point.slice(0, 3).map((value) => roundNumber(value, 3));

const normalizeScreenOffset = (offset) => {
  if (!isObject(offset)) return { x: 0, y: 0 };
  return {
    x: roundNumber(offset.x, 2),
    y: roundNumber(offset.y, 2),
  };
};

const distance2D = (start, end) => Math.hypot(
  Number(end?.x || 0) - Number(start?.x || 0),
  Number(end?.y || 0) - Number(start?.y || 0)
);

const distance3D = (start, end) => {
  if (!isWorldPoint(start) || !isWorldPoint(end)) return 0;
  return Math.hypot(
    Number(end[0]) - Number(start[0]),
    Number(end[1]) - Number(start[1]),
    Number(end[2]) - Number(start[2])
  );
};

const measurementRecordId = (viewerType, id) => {
  const sourceId = String(id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  return sourceId.startsWith(`measurement-${viewerType}-`)
    ? sourceId
    : `measurement-${viewerType}-${sourceId}`;
};

const sourceIdFromRecord = (record, viewerType) => {
  const stored = record?.metadata?.measurement_source_id;
  if (stored) return String(stored);
  const prefix = `measurement-${viewerType}-`;
  const id = String(record?.id || '');
  return id.startsWith(prefix) ? id.slice(prefix.length) : id;
};

const baseMeasurementRecord = ({
  id,
  viewerType,
  seriesUid,
  sliceAxis = null,
  sliceIndex = null,
  label = '',
  color = DEFAULT_MEASUREMENT_COLOR,
  coordinates,
  metadata,
}) => ({
  id,
  series_uid: seriesUid || '',
  viewer_type: viewerType,
  slice_axis: sliceAxis,
  slice_index: Number.isInteger(Number(sliceIndex)) ? Number(sliceIndex) : null,
  annotation_type: CLINICAL_MEASUREMENT_TYPE,
  type: CLINICAL_MEASUREMENT_TYPE,
  coordinates,
  label: label || '',
  color,
  metadata: {
    clinical_record_type: CLINICAL_MEASUREMENT_TYPE,
    ai_training_ready: true,
    finding_type: 'measurement',
    severity: 'S1',
    ...metadata,
  },
  review_status: 'draft',
  confidence_score: 0.95,
});

export const isPersistedMeasurementRecord = (record) => (
  record?.type === CLINICAL_MEASUREMENT_TYPE
  || record?.annotation_type === CLINICAL_MEASUREMENT_TYPE
  || record?.metadata?.clinical_record_type === CLINICAL_MEASUREMENT_TYPE
);

export const normalizeImagePoint = (point, sourceWidth, sourceHeight) => {
  if (!isPoint2D(point) || !(Number(sourceWidth) > 0) || !(Number(sourceHeight) > 0)) return null;
  return {
    x: clamp01(Number(point.x) / Number(sourceWidth)),
    y: clamp01(Number(point.y) / Number(sourceHeight)),
  };
};

export const denormalizeImagePoint = (point, sourceWidth, sourceHeight) => {
  if (!isPoint2D(point) || !(Number(sourceWidth) > 0) || !(Number(sourceHeight) > 0)) return null;
  return {
    x: roundNumber(Number(point.x) * Number(sourceWidth), 3),
    y: roundNumber(Number(point.y) * Number(sourceHeight), 3),
  };
};

export const build2DMeasurementRecord = (measurement, scope = {}) => {
  const sourceWidth = Number(scope.sourceWidth || measurement?.metadata?.source_width || 0);
  const sourceHeight = Number(scope.sourceHeight || measurement?.metadata?.source_height || 0);
  const start = normalizeImagePoint(measurement?.start, sourceWidth, sourceHeight);
  const end = normalizeImagePoint(measurement?.end, sourceWidth, sourceHeight);
  if (!start || !end) return null;

  const distancePx = distance2D(measurement.start, measurement.end);
  const pixelSpacing = Number(
    measurement?.metadata?.pixel_spacing_mm
    ?? scope.pixelSpacing
    ?? scope.pixel_spacing
    ?? 0
  );
  const distanceMm = pixelSpacing > 0 ? distancePx * pixelSpacing : null;
  const sourceId = String(measurement?.id || '');

  return baseMeasurementRecord({
    id: measurementRecordId(scope.viewerType || '2d', sourceId),
    viewerType: scope.viewerType || '2d',
    seriesUid: scope.seriesUid || scope.series_uid,
    label: measurement?.label || (distanceMm ? `${distanceMm.toFixed(2)} mm` : `${distancePx.toFixed(1)} px`),
    color: measurement?.color || DEFAULT_MEASUREMENT_COLOR,
    coordinates: {
      start,
      end,
      coordinate_space: 'normalized_image',
    },
    metadata: {
      ...(measurement?.metadata || {}),
      measurement_kind: scope.viewerType === 'slice' ? 'distance_slice_2d' : 'distance_2d',
      measurement_source_id: sourceId,
      source_width: sourceWidth,
      source_height: sourceHeight,
      unit: distanceMm ? 'mm' : 'px',
      distance_px: roundNumber(distancePx, 3),
      distance_mm: distanceMm === null ? null : roundNumber(distanceMm, 3),
      pixel_spacing_mm: pixelSpacing > 0 ? pixelSpacing : null,
      calibration_method: measurement?.metadata?.calibration_method || scope.calibrationMethod || scope.calibration_method || 'estimated',
      coordinate_system: 'normalized_image',
      original_start_px: {
        x: roundNumber(measurement.start.x, 3),
        y: roundNumber(measurement.start.y, 3),
      },
      original_end_px: {
        x: roundNumber(measurement.end.x, 3),
        y: roundNumber(measurement.end.y, 3),
      },
    },
  });
};

export const measurement2DFromRecord = (record, scope = {}) => {
  if (!isPersistedMeasurementRecord(record)) return null;
  const sourceWidth = Number(scope.sourceWidth || record?.metadata?.source_width || 0);
  const sourceHeight = Number(scope.sourceHeight || record?.metadata?.source_height || 0);
  const start = denormalizeImagePoint(record?.coordinates?.start, sourceWidth, sourceHeight);
  const end = denormalizeImagePoint(record?.coordinates?.end, sourceWidth, sourceHeight);
  if (!start || !end) return null;

  return {
    id: sourceIdFromRecord(record, record?.viewer_type || record?.viewerType || '2d'),
    start,
    end,
    label: record.label || '',
    color: record.color || DEFAULT_MEASUREMENT_COLOR,
    metadata: {
      ...(record.metadata || {}),
      persisted_annotation_id: record.id,
      calibration_method: record?.metadata?.calibration_method || 'estimated',
      pixel_spacing_mm: record?.metadata?.pixel_spacing_mm || null,
    },
  };
};

export const build3DMeasurementRecords = ({ measurements3D = [], polylineMeasurements = [] } = {}, scope = {}) => {
  const seriesUid = scope.seriesUid || scope.series_uid;
  const sourceWidth = Number(scope.sourceWidth || scope.source_width || 0);
  const sourceHeight = Number(scope.sourceHeight || scope.source_height || 0);
  const pointRecords = (measurements3D || []).map((measurement) => {
    if (!isWorldPoint(measurement?.pointA) || !isWorldPoint(measurement?.pointB)) return null;
    const pointA = normalizeWorldPoint(measurement.pointA);
    const pointB = normalizeWorldPoint(measurement.pointB);
    const distance = Number.isFinite(Number(measurement.distance))
      ? Number(measurement.distance)
      : distance3D(pointA, pointB);
    const sourceId = String(measurement.id || '');

    return baseMeasurementRecord({
      id: measurementRecordId('3d', sourceId),
      viewerType: '3d',
      seriesUid,
      label: measurement.label || `${distance.toFixed(2)} mm`,
      color: measurement.color || DEFAULT_MEASUREMENT_COLOR,
      coordinates: {
        world_start: pointA,
        world_end: pointB,
        midpoint: isWorldPoint(measurement.midpoint)
          ? normalizeWorldPoint(measurement.midpoint)
          : normalizeWorldPoint([
            (pointA[0] + pointB[0]) / 2,
            (pointA[1] + pointB[1]) / 2,
            (pointA[2] + pointB[2]) / 2,
          ]),
        coordinate_space: 'world_mm',
      },
      metadata: {
        ...(measurement.metadata || {}),
        measurement_kind: 'distance_3d',
        measurement_source_id: sourceId,
        source_width: sourceWidth,
        source_height: sourceHeight,
        unit: 'mm',
        distance_mm: roundNumber(distance, 3),
        label_offset_px: normalizeScreenOffset(measurement.labelOffset || measurement.label_offset_px || measurement.metadata?.label_offset_px),
        coordinate_system: 'world_mm',
      },
    });
  }).filter(Boolean);

  const polylineRecords = (polylineMeasurements || []).map((measurement) => {
    const points = (measurement?.points || []).filter(isWorldPoint).map(normalizeWorldPoint);
    if (points.length < 2) return null;
    const totalDistance = Number.isFinite(Number(measurement.totalDistance))
      ? Number(measurement.totalDistance)
      : points.slice(1).reduce((sum, point, index) => sum + distance3D(points[index], point), 0);
    const sourceId = String(measurement.id || '');

    return baseMeasurementRecord({
      id: measurementRecordId('3d', sourceId),
      viewerType: '3d',
      seriesUid,
      label: measurement.label || `${totalDistance.toFixed(2)} mm`,
      color: measurement.color || DEFAULT_MEASUREMENT_COLOR,
      coordinates: {
        world_points: points,
        coordinate_space: 'world_mm',
      },
      metadata: {
        ...(measurement.metadata || {}),
        measurement_kind: 'polyline_3d',
        measurement_source_id: sourceId,
        source_width: sourceWidth,
        source_height: sourceHeight,
        unit: 'mm',
        segments: Array.isArray(measurement.segments)
          ? measurement.segments.map((segment) => roundNumber(typeof segment === 'number' ? segment : segment?.distance, 3))
          : [],
        total_distance_mm: roundNumber(totalDistance, 3),
        label_offset_px: normalizeScreenOffset(measurement.labelOffset || measurement.label_offset_px || measurement.metadata?.label_offset_px),
        coordinate_system: 'world_mm',
      },
    });
  }).filter(Boolean);

  return [...pointRecords, ...polylineRecords];
};

export const measurements3DFromRecords = (records = []) => {
  const measurements3D = [];
  const polylineMeasurements = [];

  (records || []).filter(isPersistedMeasurementRecord).forEach((record) => {
    const kind = record?.metadata?.measurement_kind;
    if (kind === 'distance_3d' && isWorldPoint(record?.coordinates?.world_start) && isWorldPoint(record?.coordinates?.world_end)) {
      const pointA = normalizeWorldPoint(record.coordinates.world_start);
      const pointB = normalizeWorldPoint(record.coordinates.world_end);
      measurements3D.push({
        id: sourceIdFromRecord(record, '3d'),
        pointA,
        pointB,
        midpoint: isWorldPoint(record.coordinates.midpoint)
          ? normalizeWorldPoint(record.coordinates.midpoint)
          : normalizeWorldPoint([
            (pointA[0] + pointB[0]) / 2,
            (pointA[1] + pointB[1]) / 2,
            (pointA[2] + pointB[2]) / 2,
          ]),
        distance: Number(record?.metadata?.distance_mm) || distance3D(pointA, pointB),
        label: record.label || '',
        labelOffset: normalizeScreenOffset(record?.metadata?.label_offset_px),
        metadata: { ...(record.metadata || {}), persisted_annotation_id: record.id },
      });
      return;
    }

    if (kind === 'polyline_3d' && Array.isArray(record?.coordinates?.world_points)) {
      const points = record.coordinates.world_points.filter(isWorldPoint).map(normalizeWorldPoint);
      if (points.length < 2) return;
      polylineMeasurements.push({
        id: sourceIdFromRecord(record, '3d'),
        type: 'polyline',
        points,
        segments: Array.isArray(record?.metadata?.segments) ? record.metadata.segments : [],
        totalDistance: Number(record?.metadata?.total_distance_mm) || points.slice(1).reduce((sum, point, index) => sum + distance3D(points[index], point), 0),
        label: record.label || '',
        labelOffset: normalizeScreenOffset(record?.metadata?.label_offset_px),
        metadata: { ...(record.metadata || {}), persisted_annotation_id: record.id },
      });
    }
  });

  return { measurements3D, polylineMeasurements };
};

const getDistanceWidgetPoints = (factory) => {
  const state = factory?.getWidgetState?.();
  const start = state?.getHandle1?.()?.getOrigin?.();
  const end = state?.getHandle2?.()?.getOrigin?.();
  return isWorldPoint(start) && isWorldPoint(end) ? [normalizeWorldPoint(start), normalizeWorldPoint(end)] : null;
};

const getAngleWidgetPoints = (factory) => {
  const handles = factory?.getWidgetState?.()?.getHandleList?.();
  if (!Array.isArray(handles) || handles.length < 3) return null;
  const points = handles.slice(0, 3).map((handle) => handle?.getOrigin?.());
  return points.every(isWorldPoint) ? points.map(normalizeWorldPoint) : null;
};

export const buildSliceMeasurementRecord = (item, axisName, scope = {}) => {
  if (!item?.factory || !axisName) return null;
  const isAngle = item.type === 'angle';
  const points = isAngle ? getAngleWidgetPoints(item.factory) : getDistanceWidgetPoints(item.factory);
  if (!points) return null;
  const sourceId = String(item.id || '');
  const value = isAngle
    ? roundNumber((Number(item.factory.getAngle?.() || 0) * 180) / Math.PI, 3)
    : roundNumber(Number(item.factory.getDistance?.() || distance3D(points[0], points[1])), 3);

  return baseMeasurementRecord({
    id: measurementRecordId('slice', sourceId),
    viewerType: 'slice',
    seriesUid: scope.seriesUid || scope.series_uid,
    sliceAxis: axisName,
    sliceIndex: item.sliceIndex ?? item.slice_index ?? scope.sliceIndex ?? scope.slice_index ?? null,
    label: item.label || (isAngle ? `${value.toFixed(1)} deg` : `${value.toFixed(2)} mm`),
    color: item.color || DEFAULT_MEASUREMENT_COLOR,
    coordinates: isAngle
      ? {
        world_points: points,
        coordinate_space: 'world_mm',
      }
      : {
        world_start: points[0],
        world_end: points[1],
        coordinate_space: 'world_mm',
      },
    metadata: {
      measurement_kind: isAngle ? 'angle_slice' : 'distance_slice',
      measurement_source_id: sourceId,
      source_width: Number(scope.sourceWidth || scope.source_width || 0),
      source_height: Number(scope.sourceHeight || scope.source_height || 0),
      slice_index: item.sliceIndex ?? item.slice_index ?? scope.sliceIndex ?? scope.slice_index ?? null,
      unit: isAngle ? 'degree' : 'mm',
      distance_mm: isAngle ? null : value,
      angle_degrees: isAngle ? value : null,
      axis: axisName,
      dimensions: Array.isArray(scope.dimensions) ? scope.dimensions : [],
      spacing: Array.isArray(scope.spacing) ? scope.spacing : [],
      coordinate_system: 'world_mm',
    },
  });
};

export const buildSliceMeasurementRecords = (measurementStore = {}, scope = {}) => (
  Object.entries(measurementStore || {}).flatMap(([axisName, items]) => (
    (items || [])
      .map((item) => buildSliceMeasurementRecord(item, axisName, {
        ...scope,
        sliceIndex: scope.sliceIndices?.[axisName] ?? scope.sliceIndex,
      }))
      .filter(Boolean)
  ))
);

export const sliceMeasurementSpecFromRecord = (record) => {
  if (!isPersistedMeasurementRecord(record)) return null;
  const axisName = record?.slice_axis || record?.sliceAxis || record?.metadata?.axis;
  const kind = record?.metadata?.measurement_kind;
  if (!axisName || !kind) return null;

  if (kind === 'distance_slice' && isWorldPoint(record?.coordinates?.world_start) && isWorldPoint(record?.coordinates?.world_end)) {
    return {
      id: sourceIdFromRecord(record, 'slice'),
      type: 'distance',
      axis: axisName,
      sliceIndex: Number.isInteger(Number(record?.slice_index ?? record?.sliceIndex ?? record?.metadata?.slice_index))
        ? Number(record?.slice_index ?? record?.sliceIndex ?? record?.metadata?.slice_index)
        : null,
      worldStart: normalizeWorldPoint(record.coordinates.world_start),
      worldEnd: normalizeWorldPoint(record.coordinates.world_end),
      label: record.label || '',
      metadata: { ...(record.metadata || {}), persisted_annotation_id: record.id },
    };
  }

  if (kind === 'angle_slice' && Array.isArray(record?.coordinates?.world_points)) {
    const points = record.coordinates.world_points.filter(isWorldPoint).map(normalizeWorldPoint);
    if (points.length < 3) return null;
    return {
      id: sourceIdFromRecord(record, 'slice'),
      type: 'angle',
      axis: axisName,
      sliceIndex: Number.isInteger(Number(record?.slice_index ?? record?.sliceIndex ?? record?.metadata?.slice_index))
        ? Number(record?.slice_index ?? record?.sliceIndex ?? record?.metadata?.slice_index)
        : null,
      worldPoints: points.slice(0, 3),
      label: record.label || '',
      metadata: { ...(record.metadata || {}), persisted_annotation_id: record.id },
    };
  }

  return null;
};
