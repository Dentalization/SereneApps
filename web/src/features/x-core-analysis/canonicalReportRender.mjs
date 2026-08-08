export const CANONICAL_REPORT_RENDER_VERSION = 2;
export const CANONICAL_MAX_EDGE = 2400;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function canonicalRenderDimensions(sourceWidth, sourceHeight, maxEdge = CANONICAL_MAX_EDGE) {
  const width = Number(sourceWidth);
  const height = Number(sourceHeight);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error('Dimensi sumber radiografi tidak valid.');
  }
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    scale,
    aspectRatio: width / height,
  };
}

function midpoint(start, end) {
  return {
    x: ((Number(start?.x) || 0) + (Number(end?.x) || 0)) / 2,
    y: ((Number(start?.y) || 0) + (Number(end?.y) || 0)) / 2,
  };
}

export function annotationAnchor(annotation = {}, sourceWidth = 1, sourceHeight = 1) {
  const coordinates = annotation.coordinates || {};
  const normalize = (x, y) => {
    let nx = Number(x) || 0;
    let ny = Number(y) || 0;
    if (Math.abs(nx) > 1 && Number(sourceWidth) > 1) nx = nx / Number(sourceWidth);
    if (Math.abs(ny) > 1 && Number(sourceHeight) > 1) ny = ny / Number(sourceHeight);
    return { x: clamp(nx, 0, 1), y: clamp(ny, 0, 1) };
  };

  if (Number.isFinite(Number(coordinates.x)) && Number.isFinite(Number(coordinates.y))) {
    return normalize(coordinates.x, coordinates.y);
  }
  if (coordinates.start && coordinates.end) {
    const point = annotation.type === 'arrow' ? coordinates.end : midpoint(coordinates.start, coordinates.end);
    return normalize(point.x, point.y);
  }
  if (Array.isArray(coordinates.path) && coordinates.path.length) {
    const total = coordinates.path.reduce((result, point) => ({
      x: result.x + (Number(point?.x) || 0),
      y: result.y + (Number(point?.y) || 0),
    }), { x: 0, y: 0 });
    return normalize(total.x / coordinates.path.length, total.y / coordinates.path.length);
  }
  return null;
}

export function markerPlacements(findings = [], annotations = [], width, height, outputScale = 1, sourceWidth = width, sourceHeight = height) {
  const annotationMap = new Map(annotations.map((annotation) => [String(annotation.id), annotation]));
  const radius = Math.max(11 / outputScale, Math.min(22 / outputScale, Math.min(width, height) * 0.025));
  const rawPlacements = findings
    .map((finding) => {
      const anchor = annotationAnchor(annotationMap.get(String(finding.annotation_id)), sourceWidth, sourceHeight);
      if (!anchor) return null;
      const baseX = anchor.x * width;
      const baseY = anchor.y * height;
      const offset = radius * 1.35;
      return {
        finding_id: finding.id,
        marker_number: Number(finding.marker_number),
        annotation_id: finding.annotation_id,
        anchor,
        x: clamp(baseX + offset, radius + 3, width - radius - 3),
        y: clamp(baseY - offset, radius + 3, height - radius - 3),
        radius,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.marker_number - b.marker_number);

  // Collision handling to prevent overlapping markers
  for (let i = 0; i < rawPlacements.length; i += 1) {
    for (let j = i + 1; j < rawPlacements.length; j += 1) {
      const p1 = rawPlacements[i];
      const p2 = rawPlacements[j];
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const distance = Math.hypot(dx, dy);
      const minDistance = (p1.radius + p2.radius) * 1.1;
      if (distance < minDistance) {
        const angle = distance > 0 ? Math.atan2(dy, dx) : Math.PI / 4;
        const push = (minDistance - distance) / 2;
        p2.x = clamp(p2.x + Math.cos(angle) * push, p2.radius + 3, width - p2.radius - 3);
        p2.y = clamp(p2.y + Math.sin(angle) * push, p2.radius + 3, height - p2.radius - 3);
      }
    }
  }

  return rawPlacements;
}

export function drawFindingMarkers(ctx, placements) {
  placements.forEach((marker) => {
    ctx.save();
    ctx.lineWidth = Math.max(2, marker.radius * 0.18);
    ctx.fillStyle = '#0E7490';
    ctx.strokeStyle = '#020617';
    ctx.beginPath();
    ctx.arc(marker.x, marker.y, marker.radius + (ctx.lineWidth * 0.7), 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = Math.max(1.5, marker.radius * 0.12);
    ctx.beginPath();
    ctx.arc(marker.x, marker.y, marker.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `800 ${Math.max(12, marker.radius * 1.15)}px ui-sans-serif, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(marker.marker_number), marker.x, marker.y + (marker.radius * 0.04));
    ctx.restore();
  });
}

function createCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

export function buildCanonical2DReportRenders({
  image,
  sourceWidth,
  sourceHeight,
  imageFilter = 'none',
  annotations = [],
  markerAnnotations = annotations,
  measurements = [],
  findings = [],
  pixelSpacing = null,
  drawAnnotations,
  drawMeasurements,
  drawScaleBar,
  getScaleBar,
  metadata = {},
}) {
  if (!image || typeof document === 'undefined') throw new Error('Radiografi belum siap dirender.');
  const dimensions = canonicalRenderDimensions(sourceWidth, sourceHeight);
  const canvas = createCanvas(dimensions.width, dimensions.height);
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Canvas report render tidak tersedia.');

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, dimensions.width, dimensions.height);
  ctx.save();
  ctx.filter = imageFilter || 'none';
  ctx.drawImage(image, 0, 0, dimensions.width, dimensions.height);
  ctx.restore();
  const cleanDataUrl = canvas.toDataURL('image/png');

  ctx.save();
  ctx.scale(dimensions.scale, dimensions.scale);
  drawMeasurements?.(ctx, measurements, pixelSpacing);
  drawAnnotations?.(ctx, annotations, sourceWidth, sourceHeight, { displayScale: dimensions.scale });
  const scaleBar = getScaleBar?.(sourceWidth, sourceHeight, 1, pixelSpacing);
  drawScaleBar?.(ctx, scaleBar);
  const placements = markerPlacements(findings, markerAnnotations, sourceWidth, sourceHeight, dimensions.scale, sourceWidth, sourceHeight);
  drawFindingMarkers(ctx, placements);
  ctx.restore();
  const annotatedDataUrl = canvas.toDataURL('image/png');
  const renderedAt = new Date().toISOString();
  const commonMetadata = {
    report_render_version: CANONICAL_REPORT_RENDER_VERSION,
    case_item_id: metadata.case_item_id,
    study_id: String(metadata.study_id),
    series_uid: metadata.series_uid,
    // Phase 6: Instance-level identity for annotation bleed prevention
    source_instance_key: metadata.source_instance_key || null,
    source_kind: metadata.source_kind || null,
    viewer_type: '2d',
    source_width: sourceWidth,
    source_height: sourceHeight,
    render_width: dimensions.width,
    render_height: dimensions.height,
    window_center: metadata.window_center ?? null,
    window_width: metadata.window_width ?? null,
    invert: Boolean(metadata.invert),
    rotation: Number(metadata.rotation) || 0,
    slice_index: null,
    pixel_spacing: pixelSpacing,
    rendered_at: renderedAt,
    annotation_revision: metadata.annotation_revision || null,
  };
  return {
    CLEAN: {
      data_url: cleanDataUrl,
      metadata: { ...commonMetadata, render_type: 'CLEAN', marker_count: 0 },
    },
    ANNOTATED: {
      data_url: annotatedDataUrl,
      metadata: { ...commonMetadata, render_type: 'ANNOTATED', marker_count: placements.length },
    },
    marker_placements: placements,
  };
}
