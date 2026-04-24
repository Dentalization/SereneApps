import jsPDF from 'jspdf';

export const ANNOTATION_COLORS = {
  arrow: '#E24B4A',
  circle: '#EF9F27',
  freehand: '#E24B4A',
  region: '#E24B4A',
  text: '#FFFFFF',
};

const SECTION_DEFINITIONS = [
  {
    title: 'Patient',
    rows: [
      ['Patient Name', 'PatientName'],
      ['Patient ID', 'PatientID'],
      ['Birth Date', 'PatientBirthDate'],
      ['Sex', 'PatientSex'],
    ],
  },
  {
    title: 'Study',
    rows: [
      ['Study Date', 'StudyDate'],
      ['Description', 'StudyDescription'],
      ['Institution', 'InstitutionName'],
    ],
  },
  {
    title: 'Acquisition',
    rows: [
      ['Manufacturer', 'Manufacturer'],
      ['Model', 'ManufacturerModelName'],
      ['Software', 'SoftwareVersions'],
      ['KVP', 'KVP'],
      ['Exposure', 'Exposure'],
      ['Exposure Time', 'ExposureTime'],
      ['Focal Spots', 'FocalSpots'],
      ['Field of View', 'FieldOfViewDimensions'],
    ],
  },
  {
    title: 'Volume',
    rows: [
      ['Slices', 'num_slices'],
      ['Dimensions', 'dimensions'],
      ['Pixel Spacing', 'pixel_spacing'],
      ['Slice Thickness', 'slice_thickness'],
      ['Voxel Size', 'voxel_size'],
      ['Window Center', 'window_center'],
      ['Window Width', 'window_width'],
    ],
  },
];

const formatValue = (value, key = '') => {
  if (value === null || value === undefined || value === '') return '—';
  if (Array.isArray(value)) return value.length ? value.join(' × ') : '—';
  if (key === 'pixel_spacing' || key === 'slice_thickness') return `${value} mm`;
  if (key === 'voxel_size') return `${formatValue(value)} mm`;
  return String(value);
};

export const buildMetadataSections = (metadata) => SECTION_DEFINITIONS.map((section) => ({
  title: section.title,
  rows: section.rows.map(([label, key]) => [label, formatValue(metadata?.[key], key)]),
}));

const styleForScale = (options = {}) => {
  const displayScale = Math.max(0.1, Number(options.displayScale) || 1);
  return {
    displayScale,
    strokeWidth: Number(options.strokeWidth) || (1.2 / displayScale),
    regionStrokeWidth: Number(options.regionStrokeWidth) || (1.1 / displayScale),
    fontSize: Number(options.fontSize) || (9 / displayScale),
    textPaddingX: 5.5 / displayScale,
    textHeight: 15 / displayScale,
    textRadius: 6 / displayScale,
    arrowHeadMin: 5 / displayScale,
    arrowHeadMax: 11 / displayScale,
  };
};

const traceSmoothClosedPath = (ctx, points) => {
  if (!Array.isArray(points) || points.length < 3) return false;

  if (points.length === 3) {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    ctx.lineTo(points[1].x, points[1].y);
    ctx.lineTo(points[2].x, points[2].y);
    ctx.closePath();
    return true;
  }

  const midPoint = (a, b) => ({
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  });

  ctx.beginPath();
  const startMid = midPoint(points[0], points[1]);
  ctx.moveTo(startMid.x, startMid.y);

  for (let index = 1; index <= points.length; index += 1) {
    const current = points[index % points.length];
    const next = points[(index + 1) % points.length];
    const control = current;
    const end = midPoint(current, next);
    ctx.quadraticCurveTo(control.x, control.y, end.x, end.y);
  }

  ctx.closePath();
  return true;
};

export const drawArrow = (ctx, start, end, color, strokeWidth = 2, options = {}) => {
  const style = styleForScale(options);
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const angle = Math.atan2(dy, dx);
  const headLength = Math.max(style.arrowHeadMin, Math.min(style.arrowHeadMax, Math.hypot(dx, dy) * 0.14));

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = strokeWidth || style.strokeWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(end.x, end.y);
  ctx.lineTo(
    end.x - headLength * Math.cos(angle - Math.PI / 7),
    end.y - headLength * Math.sin(angle - Math.PI / 7)
  );
  ctx.lineTo(
    end.x - headLength * Math.cos(angle + Math.PI / 7),
    end.y - headLength * Math.sin(angle + Math.PI / 7)
  );
  ctx.closePath();
  ctx.fill();
  ctx.restore();
};

export const drawCircleAnnotation = (ctx, start, end, color, strokeWidth = 2) => {
  const centerX = (start.x + end.x) / 2;
  const centerY = (start.y + end.y) / 2;
  const radiusX = Math.abs(end.x - start.x) / 2;
  const radiusY = Math.abs(end.y - start.y) / 2;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = strokeWidth;
  ctx.beginPath();
  ctx.ellipse(centerX, centerY, Math.max(radiusX, 1), Math.max(radiusY, 1), 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
};

export const drawTextAnnotation = (ctx, point, label, color, options = {}) => {
  if (!label) return;

  const style = styleForScale(options);
  ctx.save();
  ctx.font = `600 ${style.fontSize}px monospace`;
  ctx.textBaseline = 'middle';
  const metrics = ctx.measureText(label);
  const width = metrics.width + (style.textPaddingX * 2);
  const height = style.textHeight;
  const x = point.x;
  const y = point.y;

  ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.lineWidth = Math.max(0.5 / style.displayScale, 0.15);
  ctx.beginPath();
  ctx.roundRect(x - style.textPaddingX, y - (height / 2), width, height, style.textRadius);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.fillText(label, x, y + (0.4 / style.displayScale));
  ctx.restore();
};

export const drawRegionAnnotation = (ctx, path, color, width, height, opacity = 1, options = {}) => {
  if (!Array.isArray(path) || path.length < 3) return;

  const style = styleForScale(options);
  const points = path.map((point) => ({
    x: (point?.x || 0) * width,
    y: (point?.y || 0) * height,
  }));

  ctx.save();
  traceSmoothClosedPath(ctx, points);
  ctx.globalAlpha = opacity * 0.25;
  ctx.fillStyle = color;
  ctx.fill();
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = color;
  ctx.lineWidth = style.regionStrokeWidth;
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.restore();
};

export const drawAnnotations = (ctx, annotations, width, height, options = {}) => {
  const style = styleForScale(options);
  annotations.forEach((annotation) => {
    const color = annotation.color || ANNOTATION_COLORS[annotation.type] || '#ffffff';
    const opacity = annotation.displayOpacity ?? annotation.opacity ?? 1;

    ctx.save();
    ctx.globalAlpha = opacity;

    if (annotation.type === 'text') {
      drawTextAnnotation(
        ctx,
        {
          x: annotation.coordinates.x * width,
          y: annotation.coordinates.y * height,
        },
        annotation.label,
        color,
        style
      );
      ctx.restore();
      return;
    }

    if (annotation.type === 'region' || annotation.type === 'freehand') {
      drawRegionAnnotation(ctx, annotation.coordinates?.path, color, width, height, opacity, style);
      ctx.restore();
      return;
    }

    if (!annotation.coordinates?.start || !annotation.coordinates?.end) {
      ctx.restore();
      return;
    }

    const start = {
      x: annotation.coordinates.start.x * width,
      y: annotation.coordinates.start.y * height,
    };
    const end = {
      x: annotation.coordinates.end.x * width,
      y: annotation.coordinates.end.y * height,
    };

    if (annotation.type === 'arrow') {
      drawArrow(ctx, start, end, color, style.strokeWidth, style);
      ctx.restore();
      return;
    }

    if (annotation.type === 'circle') {
      drawCircleAnnotation(ctx, start, end, color, style.strokeWidth);
    }
    ctx.restore();
  });
};

const sanitizeFilename = (value) => {
  const normalized = String(value || 'patient')
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '_');
  return normalized || 'patient';
};

const formatDateForFilename = (date) => date.toISOString().slice(0, 10);

const summarizeCoordinates = (annotation) => {
  if (annotation.type === 'text') {
    return `x=${Number(annotation.coordinates?.x || 0).toFixed(3)}, y=${Number(annotation.coordinates?.y || 0).toFixed(3)}`;
  }
  if (annotation.type === 'region' || annotation.type === 'freehand') {
    const worldPath = annotation.coordinates?.world_path || [];
    if (Array.isArray(worldPath) && worldPath.length >= 3) {
      const areaMm2 = annotation.metadata?.lesion_area_mm2;
      return `${worldPath.length} world pts${areaMm2 ? `, area ${areaMm2} mm²` : ''}`;
    }
    const worldBrush = annotation.coordinates?.world_brush;
    if (Array.isArray(worldBrush?.centers) && worldBrush.centers.length >= 1) {
      const volumeMm3 = annotation.metadata?.lesion_volume_mm3;
      const radiusMm = Number(worldBrush.radius_mm || 0);
      return `${worldBrush.centers.length} brush stamps${radiusMm ? `, r ${radiusMm} mm` : ''}${volumeMm3 ? `, vol ${volumeMm3} mm³` : ''}`;
    }
    const path = annotation.coordinates?.path || [];
    const area = annotation.metadata?.lesion_area_px;
    return `${path.length} pts${area ? `, area ${area} px²` : ''}`;
  }
  const start = annotation.coordinates?.start;
  const end = annotation.coordinates?.end;
  if (!start || !end) return '—';
  return `(${Number(start.x || 0).toFixed(3)}, ${Number(start.y || 0).toFixed(3)}) → (${Number(end.x || 0).toFixed(3)}, ${Number(end.y || 0).toFixed(3)})`;
};

const makeExportId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `export-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const buildTrainingAnnotation = (annotation, exportId, options = {}) => {
  const metadata = annotation.metadata || {};
  const type = annotation.type || annotation.annotation_type;
  const isWorldGeometry = (
    (Array.isArray(annotation.coordinates?.world_path) && annotation.coordinates.world_path.length >= 3)
    || (Array.isArray(annotation.coordinates?.world_brush?.centers) && annotation.coordinates.world_brush.centers.length >= 1)
  );
  return {
    export_id: exportId,
    annotation_id: annotation.id,
    type,
    geometry: annotation.coordinates || {},
    coordinate_system: isWorldGeometry ? 'world_ras_mm' : 'image_normalized_0_1',
    source: {
      width: metadata.source_width || options.sourceWidth || null,
      height: metadata.source_height || options.sourceHeight || null,
      study_id: options.studyId || null,
      study_key: options.studyKey || null,
      series_uid: annotation.series_uid || options.seriesUid || null,
      viewer_type: annotation.viewer_type || options.viewerType || null,
      slice_axis: annotation.slice_axis ?? annotation.sliceAxis ?? null,
      slice_index: annotation.slice_index ?? annotation.sliceIndex ?? null,
    },
    label: {
      finding_type: metadata.finding_type || null,
      severity: metadata.severity || null,
      tooth_number: metadata.tooth_number || null,
      surface: metadata.surface || null,
      lesion_area_px: metadata.lesion_area_px || null,
      lesion_area_mm2: metadata.lesion_area_mm2 || null,
      lesion_volume_mm3: metadata.lesion_volume_mm3 || null,
      text: annotation.label || null,
    },
    review: {
      status: annotation.review_status || 'draft',
      reviewed_by: annotation.reviewed_by ?? null,
      reviewed_at: annotation.reviewed_at || null,
      reviewer_comment: annotation.reviewer_comment || null,
      confidence_score: annotation.confidence_score ?? 0.7,
    },
  };
};

export const exportAnnotationsJson = (annotations, studyMetadata, options = {}) => {
  const patient = options.patientName || studyMetadata?.PatientName || 'Patient';
  const exportedAt = new Date();
  const exportedAnnotations = (annotations || []).map((annotation) => ({
    ...annotation,
    _export_id: makeExportId(),
  }));
  const hasWorldGeometry = exportedAnnotations.some((annotation) => (
    (Array.isArray(annotation.coordinates?.world_path) && annotation.coordinates.world_path.length >= 3)
    || (Array.isArray(annotation.coordinates?.world_brush?.centers) && annotation.coordinates.world_brush.centers.length >= 1)
  ));
  const payload = {
    export_version: '1.1',
    dataset_schema: 'xcore_annotation_training_v1',
    study: {
      id: options.studyId || null,
      folder: options.studyKey || null,
      series_uid: options.seriesUid || null,
      viewer_type: options.viewerType || null,
      patient,
      date: studyMetadata?.StudyDate || null,
      institution: studyMetadata?.InstitutionName || null,
    },
    exported_at: exportedAt.toISOString(),
    coordinate_system: hasWorldGeometry ? 'mixed_viewer_native' : 'image_normalized_0_1',
    annotations: exportedAnnotations,
    training_annotations: exportedAnnotations.map((annotation) => buildTrainingAnnotation(annotation, annotation._export_id, options)),
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `annotations_${sanitizeFilename(patient)}_${formatDateForFilename(exportedAt)}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return payload;
};

export const exportPdfReport = ({
  clinicName,
  dentistName,
  patientName,
  clinicalNotes,
  metadata,
  screenshotDataUrl,
  includeMetadataSummary,
  implantPlacements = [],
  densityHistogram = null,
  aiReport = '',
  annotations = [],
}) => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - (margin * 2);
  const reportDate = new Date();
  const footerReserve = 8;
  const contentBottom = pageHeight - margin - footerReserve;
  let cursorY = 18;

  const lineHeightFor = (fontSize) => Math.max(4.2, fontSize * 0.3528 * 1.2);
  const ensurePageSpace = (requiredHeight = 0, nextPageTop = 18) => {
    if (cursorY + requiredHeight > contentBottom) {
      doc.addPage();
      cursorY = nextPageTop;
    }
  };

  doc.setFillColor(15, 23, 42);
  doc.roundedRect(margin, cursorY - 6, contentWidth, 20, 4, 4, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(clinicName || 'Dental Clinic', margin + 6, cursorY + 2);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(reportDate.toLocaleDateString(), pageWidth - margin - 6, cursorY + 2, { align: 'right' });
  cursorY += 24;

  doc.setTextColor(31, 41, 55);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Patient Information', margin, cursorY);
  cursorY += 6;

  doc.setFont('helvetica', 'normal');
  const infoFontSize = 10.5;
  doc.setFontSize(infoFontSize);
  const infoLineHeight = lineHeightFor(infoFontSize);
  const infoRows = [
    ['Patient', patientName || '—'],
    ['Dentist', dentistName || '—'],
    ['Study Date', metadata?.StudyDate || reportDate.toLocaleDateString()],
    ['Institution', metadata?.InstitutionName || clinicName || '—'],
  ];
  infoRows.forEach(([label, value]) => {
    const wrappedValue = doc.splitTextToSize(String(value || '—'), contentWidth - 30);
    const rowHeight = Math.max(infoLineHeight, wrappedValue.length * infoLineHeight);
    ensurePageSpace(rowHeight + 1.5);

    doc.setTextColor(100, 116, 139);
    doc.text(`${label}:`, margin, cursorY);
    doc.setTextColor(15, 23, 42);
    doc.text(wrappedValue, margin + 30, cursorY);
    cursorY += rowHeight + 1.5;
  });

  cursorY += 3;

  if (screenshotDataUrl) {
    const imageProps = doc.getImageProperties(screenshotDataUrl);
    const imageHeight = Math.min((imageProps.height * contentWidth) / imageProps.width, 110);
    ensurePageSpace(4 + imageHeight + 8);

    doc.setTextColor(31, 41, 55);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Annotated View', margin, cursorY);
    cursorY += 4;

    doc.addImage(screenshotDataUrl, 'PNG', margin, cursorY, contentWidth, imageHeight);
    cursorY += imageHeight + 8;
  }

  doc.setTextColor(31, 41, 55);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  ensurePageSpace(12);
  doc.text('Clinical Notes', margin, cursorY);
  cursorY += 6;

  const notesFontSize = 10.5;
  const notesLineHeight = lineHeightFor(notesFontSize);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(notesFontSize);
  const notes = clinicalNotes?.trim() || 'No clinical notes provided.';
  const wrappedNotes = doc.splitTextToSize(notes, contentWidth);
  wrappedNotes.forEach((line) => {
    ensurePageSpace(notesLineHeight);
    doc.text(line, margin, cursorY);
    cursorY += notesLineHeight;
  });
  cursorY += 6;

  if (includeMetadataSummary) {
    ensurePageSpace(14);
    doc.setTextColor(31, 41, 55);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('DICOM Metadata Summary', margin, cursorY);
    cursorY += 6;

    const sections = buildMetadataSections(metadata);
    sections.forEach((section) => {
      ensurePageSpace(10);

      doc.setFillColor(241, 245, 249);
      doc.roundedRect(margin, cursorY - 4.5, contentWidth, 7, 2, 2, 'F');
      doc.setTextColor(51, 65, 85);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.text(section.title, margin + 3, cursorY);
      cursorY += 6;

      const metadataFontSize = 9.5;
      const metadataLineHeight = lineHeightFor(metadataFontSize);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(metadataFontSize);
      section.rows.forEach(([label, value]) => {
        const wrappedValue = doc.splitTextToSize(String(value || '—'), contentWidth - 34);
        const rowHeight = Math.max(metadataLineHeight, wrappedValue.length * metadataLineHeight);
        ensurePageSpace(rowHeight + 1.2);

        doc.setTextColor(100, 116, 139);
        doc.text(`${label}:`, margin, cursorY);
        doc.setTextColor(15, 23, 42);
        doc.text(wrappedValue, margin + 34, cursorY);
        cursorY += rowHeight + 1.2;
      });

      cursorY += 3;
    });
  }

  if (Array.isArray(annotations) && annotations.length > 0) {
    ensurePageSpace(16);
    doc.setTextColor(31, 41, 55);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Structured Annotations', margin, cursorY);
    cursorY += 7;

    const annotationFontSize = 8.2;
    const annotationLineHeight = lineHeightFor(annotationFontSize);
    doc.setFontSize(annotationFontSize);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin, cursorY - 4.5, contentWidth, 7, 2, 2, 'F');
    doc.setTextColor(51, 65, 85);
    doc.text('#', margin + 2, cursorY);
    doc.text('Type', margin + 10, cursorY);
    doc.text('Label', margin + 32, cursorY);
    doc.text('Finding', margin + 72, cursorY);
    doc.text('Severity', margin + 112, cursorY);
    doc.text('Conf.', margin + 134, cursorY);
    doc.text('Coordinates', margin + 150, cursorY);
    cursorY += 7;

    doc.setFont('helvetica', 'normal');
    annotations.forEach((annotation, index) => {
      ensurePageSpace(annotationLineHeight + 2);
      const metadata = annotation.metadata || {};
      doc.setTextColor(100, 116, 139);
      doc.text(String(index + 1), margin + 2, cursorY);
      doc.setTextColor(15, 23, 42);
      doc.text(String(annotation.type || annotation.annotation_type || '—').slice(0, 12), margin + 10, cursorY);
      doc.text(String(annotation.label || '—').slice(0, 22), margin + 32, cursorY);
      doc.text(String(metadata.finding_type || '—').slice(0, 18), margin + 72, cursorY);
      doc.text(String(metadata.severity || '—').slice(0, 8), margin + 112, cursorY);
      doc.text(String(annotation.confidence_score ?? '—').slice(0, 4), margin + 134, cursorY);
      doc.text(summarizeCoordinates(annotation).slice(0, 26), margin + 150, cursorY);
      cursorY += annotationLineHeight + 2;
    });
    cursorY += 4;
  }

  if (Array.isArray(implantPlacements) && implantPlacements.length > 0) {
    ensurePageSpace(16);
    doc.setTextColor(31, 41, 55);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Implant Planning', margin, cursorY);
    cursorY += 7;

    const tableFontSize = 8.8;
    const tableLineHeight = lineHeightFor(tableFontSize);
    doc.setFontSize(tableFontSize);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin, cursorY - 4.5, contentWidth, 7, 2, 2, 'F');
    doc.setTextColor(51, 65, 85);
    doc.text('#', margin + 2, cursorY);
    doc.text('Brand', margin + 12, cursorY);
    doc.text('Size', margin + 48, cursorY);
    doc.text('Position (mm)', margin + 78, cursorY);
    cursorY += 7;

    doc.setFont('helvetica', 'normal');
    implantPlacements.forEach((placement, index) => {
      ensurePageSpace(tableLineHeight + 2);
      const position = Array.isArray(placement.position)
        ? placement.position.map((value) => Number(value).toFixed(1)).join(', ')
        : '—';
      doc.setTextColor(100, 116, 139);
      doc.text(String(index + 1), margin + 2, cursorY);
      doc.setTextColor(15, 23, 42);
      doc.text(String(placement.brand || 'Implant'), margin + 12, cursorY);
      doc.text(`${placement.diameter || '—'} × ${placement.length || '—'} mm`, margin + 48, cursorY);
      doc.text(position, margin + 78, cursorY);
      cursorY += tableLineHeight + 2;
    });
    cursorY += 4;
  }

  if (densityHistogram) {
    ensurePageSpace(20);
    doc.setTextColor(31, 41, 55);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Bone Density Summary', margin, cursorY);
    cursorY += 7;

    const densityRows = [
      ['D1 dense cortical', `${densityHistogram.d1_pct ?? 0}%`],
      ['D2 good bone', `${densityHistogram.d2_pct ?? 0}%`],
      ['D3 adequate bone', `${densityHistogram.d3_pct ?? 0}%`],
      ['D4 poor density', `${densityHistogram.d4_pct ?? 0}%`],
      ['Candidate voxels', String(densityHistogram.density_voxel_count ?? 0)],
    ];
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    densityRows.forEach(([label, value]) => {
      ensurePageSpace(5);
      doc.setTextColor(100, 116, 139);
      doc.text(`${label}:`, margin, cursorY);
      doc.setTextColor(15, 23, 42);
      doc.text(String(value), margin + 50, cursorY);
      cursorY += 5;
    });
    cursorY += 3;
  }

  if (aiReport) {
    ensurePageSpace(14);
    doc.setTextColor(31, 41, 55);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('AI Preliminary Assessment', margin, cursorY);
    cursorY += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const aiLines = doc.splitTextToSize(String(aiReport), contentWidth);
    aiLines.forEach((line) => {
      ensurePageSpace(5);
      doc.text(line, margin, cursorY);
      cursorY += 5;
    });
    cursorY += 2;
    doc.setTextColor(180, 83, 9);
    doc.setFontSize(8.8);
    doc.text('AI-generated preliminary assessment — requires radiologist review.', margin, cursorY);
    cursorY += 5;
  }

  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`Generated ${reportDate.toLocaleString()}`, margin, pageHeight - 6);
    doc.text(`Page ${page} of ${totalPages}`, pageWidth - margin, pageHeight - 6, { align: 'right' });
  }

  const fileName = `report_${sanitizeFilename(patientName)}_${formatDateForFilename(reportDate)}.pdf`;
  doc.save(fileName);
  return fileName;
};
