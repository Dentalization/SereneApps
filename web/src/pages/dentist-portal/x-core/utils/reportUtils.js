import jsPDF from 'jspdf';

export const ANNOTATION_COLORS = {
  arrow: '#E24B4A',
  circle: '#EF9F27',
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

export const drawArrow = (ctx, start, end, color, strokeWidth = 3) => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const angle = Math.atan2(dy, dx);
  const headLength = Math.max(12, Math.min(24, Math.hypot(dx, dy) * 0.18));

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = strokeWidth;
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

export const drawCircleAnnotation = (ctx, start, end, color, strokeWidth = 3) => {
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

export const drawTextAnnotation = (ctx, point, label, color) => {
  if (!label) return;

  ctx.save();
  ctx.font = '600 14px monospace';
  ctx.textBaseline = 'middle';
  const metrics = ctx.measureText(label);
  const width = metrics.width + 14;
  const height = 22;
  const x = point.x;
  const y = point.y;

  ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x - 6, y - (height / 2), width, height, 10);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.fillText(label, x + 1, y + 0.5);
  ctx.restore();
};

export const drawAnnotations = (ctx, annotations, width, height) => {
  annotations.forEach((annotation) => {
    const color = annotation.color || ANNOTATION_COLORS[annotation.type] || '#ffffff';

    if (annotation.type === 'text') {
      drawTextAnnotation(
        ctx,
        {
          x: annotation.coordinates.x * width,
          y: annotation.coordinates.y * height,
        },
        annotation.label,
        color
      );
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
      drawArrow(ctx, start, end, color);
      return;
    }

    if (annotation.type === 'circle') {
      drawCircleAnnotation(ctx, start, end, color);
    }
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
