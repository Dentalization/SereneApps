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
}) => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - (margin * 2);
  const reportDate = new Date();
  let cursorY = 18;

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
  doc.setFontSize(10.5);
  const infoRows = [
    ['Patient', patientName || '—'],
    ['Dentist', dentistName || '—'],
    ['Study Date', metadata?.StudyDate || reportDate.toLocaleDateString()],
    ['Institution', metadata?.InstitutionName || clinicName || '—'],
  ];
  infoRows.forEach(([label, value]) => {
    doc.setTextColor(100, 116, 139);
    doc.text(`${label}:`, margin, cursorY);
    doc.setTextColor(15, 23, 42);
    doc.text(String(value || '—'), margin + 30, cursorY);
    cursorY += 5.5;
  });

  cursorY += 3;

  if (screenshotDataUrl) {
    doc.setTextColor(31, 41, 55);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Annotated View', margin, cursorY);
    cursorY += 4;

    const imageProps = doc.getImageProperties(screenshotDataUrl);
    const imageHeight = Math.min((imageProps.height * contentWidth) / imageProps.width, 110);
    doc.addImage(screenshotDataUrl, 'PNG', margin, cursorY, contentWidth, imageHeight);
    cursorY += imageHeight + 8;
  }

  if (cursorY > pageHeight - 70) {
    doc.addPage();
    cursorY = 18;
  }

  doc.setTextColor(31, 41, 55);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Clinical Notes', margin, cursorY);
  cursorY += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  const notes = clinicalNotes?.trim() || 'No clinical notes provided.';
  const wrappedNotes = doc.splitTextToSize(notes, contentWidth);
  doc.text(wrappedNotes, margin, cursorY);
  cursorY += (wrappedNotes.length * 5) + 6;

  if (includeMetadataSummary) {
    if (cursorY > pageHeight - 90) {
      doc.addPage();
      cursorY = 18;
    }

    doc.setTextColor(31, 41, 55);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('DICOM Metadata Summary', margin, cursorY);
    cursorY += 6;

    const sections = buildMetadataSections(metadata);
    sections.forEach((section) => {
      if (cursorY > pageHeight - 36) {
        doc.addPage();
        cursorY = 18;
      }

      doc.setFillColor(241, 245, 249);
      doc.roundedRect(margin, cursorY - 4.5, contentWidth, 7, 2, 2, 'F');
      doc.setTextColor(51, 65, 85);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.text(section.title, margin + 3, cursorY);
      cursorY += 6;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      section.rows.forEach(([label, value]) => {
        if (cursorY > pageHeight - 12) {
          doc.addPage();
          cursorY = 18;
        }
        doc.setTextColor(100, 116, 139);
        doc.text(`${label}:`, margin, cursorY);
        doc.setTextColor(15, 23, 42);
        const wrappedValue = doc.splitTextToSize(String(value || '—'), contentWidth - 34);
        doc.text(wrappedValue, margin + 34, cursorY);
        cursorY += Math.max(5, wrappedValue.length * 4.5);
      });

      cursorY += 3;
    });
  }

  const fileName = `report_${sanitizeFilename(patientName)}_${formatDateForFilename(reportDate)}.pdf`;
  doc.save(fileName);
  return fileName;
};
