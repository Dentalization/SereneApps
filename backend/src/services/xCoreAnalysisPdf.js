import fs from 'fs/promises';
import path from 'path';
import PDFDocument from 'pdfkit';
import { fileURLToPath } from 'url';
import { buildRadiographSectionLabels, RADIOGRAPH_LABELS } from './xCoreAnalysisCaseDomain.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BRAND_ICON_PATH = path.resolve(__dirname, '../../../web/public/icon-192.png');
const COLORS = Object.freeze({
  ink: '#102A43',
  muted: '#627D98',
  line: '#D9E2EC',
  soft: '#F0F4F8',
  accent: '#0891B2',
  accentDark: '#0E7490',
  success: '#047857',
  warning: '#B45309',
  white: '#FFFFFF',
});
const CLINICAL_LABELS = Object.freeze({
  chief_complaint: 'Keluhan utama',
  clinical_indication: 'Indikasi klinis',
  clinical_notes: 'Data klinis / riwayat',
  limitation_notes: 'Catatan keterbatasan',
  recommendation: 'Rekomendasi',
});

const formatDate = (value, includeTime = false) => {
  if (!value) return 'Belum tersedia';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Belum tersedia';
  return new Intl.DateTimeFormat('id-ID', includeTime
    ? { dateStyle: 'long', timeStyle: 'short', timeZone: 'Asia/Jakarta' }
    : { dateStyle: 'long', timeZone: 'Asia/Jakarta' }).format(date);
};

const safeText = (value, fallback = 'Belum tersedia') => {
  if (value == null || value === '') return fallback;
  if (Array.isArray(value)) return value.length ? value.join(', ') : fallback;
  return String(value);
};

async function loadBrandIcon() {
  try { return await fs.readFile(BRAND_ICON_PATH); } catch { return null; }
}

function pageContentWidth(doc) {
  return doc.page.width - doc.page.margins.left - doc.page.margins.right;
}

function statusLabel(status) {
  return status === 'FINAL' ? 'FINAL' : 'DRAFT';
}

function drawPill(doc, text, x, y, color) {
  const saved = { x: doc.x, y: doc.y };
  const width = Math.max(56, doc.widthOfString(text, { size: 8 }) + 22);
  doc.roundedRect(x, y, width, 20, 10).fill(color);
  doc.fillColor(COLORS.white).font('Helvetica-Bold').fontSize(8).text(text, x, y + 6, { width, align: 'center', lineBreak: false });
  doc.x = saved.x;
  doc.y = saved.y;
  return width;
}

function drawPageHeader(doc, section, brandIcon) {
  const saved = { x: doc.x, y: doc.y };
  const left = doc.page.margins.left;
  const top = 21;
  if (brandIcon) doc.image(brandIcon, left, top, { fit: [22, 22] });
  doc.fillColor(COLORS.ink).font('Helvetica-Bold').fontSize(8.5)
    .text('SERENEAPPS · X-CORE', left + (brandIcon ? 29 : 0), top + 4, { lineBreak: false });
  if (section) {
    doc.fillColor(COLORS.muted).font('Helvetica').fontSize(8)
      .text(section, left, top + 4, { width: pageContentWidth(doc), align: 'right', lineBreak: false });
  }
  doc.moveTo(left, 48).lineTo(doc.page.width - doc.page.margins.right, 48).lineWidth(0.7).stroke(COLORS.line);
  doc.x = saved.x;
  doc.y = Math.max(saved.y, doc.page.margins.top);
}

function addPage(doc, { layout = 'portrait', section = null, brandIcon = null } = {}) {
  doc._xcoreSection = section;
  doc._xcoreBrandIcon = brandIcon;
  doc._xcoreAddingExplicitPage = true;
  doc.addPage({ size: 'A4', layout, margins: { top: 64, right: 42, bottom: 54, left: 42 } });
  doc._xcoreAddingExplicitPage = false;
  drawPageHeader(doc, section, brandIcon);
}

function drawKeyValue(doc, label, value, x, y, width) {
  const saved = { x: doc.x, y: doc.y };
  doc.fillColor(COLORS.muted).font('Helvetica-Bold').fontSize(7.5).text(label.toUpperCase(), x, y, { width });
  doc.fillColor(COLORS.ink).font('Helvetica').fontSize(10).text(safeText(value), x, y + 13, { width });
  doc.x = saved.x;
  doc.y = saved.y;
}

function drawSectionTitle(doc, eyebrow, title, subtitle = null) {
  const left = doc.page.margins.left;
  doc.fillColor(COLORS.accentDark).font('Helvetica-Bold').fontSize(8).text(eyebrow.toUpperCase(), left, doc.y);
  doc.moveDown(0.25).fillColor(COLORS.ink).font('Helvetica-Bold').fontSize(20).text(title, left, doc.y);
  if (subtitle) doc.moveDown(0.25).fillColor(COLORS.muted).font('Helvetica').fontSize(9.5).text(subtitle, left, doc.y);
}

function drawCover(doc, snapshot, labels, brandIcon) {
  addPage(doc, { layout: 'portrait', brandIcon });
  const left = doc.page.margins.left;
  const width = pageContentWidth(doc);
  const pillWidth = drawPill(doc, statusLabel(snapshot.report_status), doc.page.width - doc.page.margins.right - 62, 70,
    snapshot.report_status === 'FINAL' ? COLORS.success : COLORS.warning);
  drawSectionTitle(doc, 'Laporan radiologi', 'Laporan Analisis X-Core', snapshot.title || 'Kasus analisis radiografi');
  const cardTop = 137;
  doc.roundedRect(left, cardTop, width, 105, 10).fillAndStroke(COLORS.soft, COLORS.line);
  const cardY = cardTop + 17;
  const column = (width - 36) / 3;
  drawKeyValue(doc, 'Pasien', snapshot.patient?.name, left + 16, cardY, column);
  drawKeyValue(doc, 'Pembuat analisis', snapshot.creator?.name, left + 18 + column, cardY, column);
  drawKeyValue(doc, 'Fasilitas', snapshot.facility_name, left + 20 + (column * 2), cardY, column);
  drawKeyValue(doc, 'Tanggal laporan', formatDate(snapshot.generated_at, true), left + 16, cardY + 47, column);
  drawKeyValue(doc, 'Versi laporan', `Versi ${snapshot.report_version}`, left + 18 + column, cardY + 47, column);
  drawKeyValue(doc, 'Jumlah radiografi', `${snapshot.items.length} citra`, left + 20 + (column * 2), cardY + 47, column);
  doc.y = cardTop + 125;
  doc.x = left;

  doc.fillColor(COLORS.ink).font('Helvetica-Bold').fontSize(12).text('Konteks klinis');
  doc.moveDown(0.55);
  const clinicalRows = ['chief_complaint', 'clinical_indication', 'clinical_notes']
    .filter((key) => snapshot.clinical_data?.[key]);
  if (!clinicalRows.length) {
    doc.fillColor(COLORS.muted).font('Helvetica-Oblique').fontSize(9).text('Belum ada konteks klinis yang dicatat.');
  } else {
    clinicalRows.forEach((key) => {
      doc.fillColor(COLORS.muted).font('Helvetica-Bold').fontSize(8).text(CLINICAL_LABELS[key]);
      doc.fillColor(COLORS.ink).font('Helvetica').fontSize(9.5).text(safeText(snapshot.clinical_data[key]), { paragraphGap: 6 });
    });
  }

  doc.moveDown(0.8).fillColor(COLORS.ink).font('Helvetica-Bold').fontSize(12).text('Ringkasan radiografi');
  doc.moveDown(0.45);
  labels.forEach((label, index) => {
    const rowY = doc.y;
    doc.circle(left + 11, rowY + 7, 9).fill(COLORS.accentDark);
    doc.fillColor(COLORS.white).font('Helvetica-Bold').fontSize(8).text(String(index + 1), left + 2, rowY + 4, { width: 18, align: 'center', lineBreak: false });
    doc.fillColor(COLORS.ink).font('Helvetica-Bold').fontSize(9.5).text(label, left + 30, rowY + 1, { width: width - 30 });
    doc.fillColor(COLORS.muted).font('Helvetica').fontSize(8).text(
      `Pemeriksaan: ${formatDate(snapshot.items[index]?.study_date)}`,
      left + 30,
      rowY + 15,
      { width: width - 30 },
    );
    doc.y = rowY + 35;
  });
  if (pillWidth < 0) doc.text('');
}

function imageLayoutFor(item) {
  const width = Number(item.render_metadata?.render_width || 0);
  const height = Number(item.render_metadata?.render_height || 0);
  const ratio = width && height ? width / height : 1;
  if (item.radiograph_type === 'PANORAMIC') return 'landscape';
  if (item.viewer_type === 'slice' && item.render_metadata?.view_mode === 'quad') return 'landscape';
  if (item.radiograph_type === 'BITEWING') return ratio > 1.3 ? 'landscape' : 'portrait';
  if (item.radiograph_type === 'CEPHALOMETRIC') return ratio > 1.15 ? 'landscape' : 'portrait';
  if (item.radiograph_type === 'OTHER' && ratio > 1.55) return 'landscape';
  return 'portrait';
}

function imageDimensions(doc, item, image, layout) {
  const sourceWidth = Number(item.render_metadata?.render_width || image?.width || 1);
  const sourceHeight = Number(item.render_metadata?.render_height || image?.height || 1);
  const maxWidth = pageContentWidth(doc);
  const maxHeight = layout === 'landscape' ? 292 : (item.radiograph_type === 'PERIAPICAL' ? 360 : 340);
  const scale = Math.min(maxWidth / sourceWidth, maxHeight / sourceHeight);
  return {
    width: sourceWidth * scale,
    height: sourceHeight * scale,
    sourceWidth,
    sourceHeight,
  };
}

function drawImageMetadata(doc, item, x, y, width) {
  const pieces = [
    `Jenis radiografi: ${RADIOGRAPH_LABELS[item.radiograph_type] || RADIOGRAPH_LABELS.OTHER}`,
    item.tooth_numbers?.length ? `Nomor gigi: ${item.tooth_numbers.join(', ')}` : null,
    item.study_date ? `Tanggal pemeriksaan: ${formatDate(item.study_date)}` : null,
    item.viewer_type === 'slice' && item.render_metadata?.slice_axis
      ? `Bidang/slice: ${item.render_metadata.slice_axis} ${Number(item.render_metadata.slice_index || 0) + 1}` : null,
  ].filter(Boolean);
  doc.fillColor(COLORS.muted).font('Helvetica').fontSize(8).text(pieces.join('   •   '), x, y, { width });
}

function ensureContentSpace(doc, needed, context) {
  const bottom = doc.page.height - doc.page.margins.bottom;
  if (doc.y + needed <= bottom) return;
  addPage(doc, { layout: context.layout, section: `${context.label} · lanjutan`, brandIcon: context.brandIcon });
  doc.fillColor(COLORS.ink).font('Helvetica-Bold').fontSize(13).text(context.label);
  doc.moveDown(0.55);
}

function findingLocation(finding, item) {
  if (finding.tooth_numbers?.length) return `Gigi ${finding.tooth_numbers.join(', ')}`;
  if (finding.region) return finding.region;
  if (item.tooth_numbers?.length) return `Gigi ${item.tooth_numbers.join(', ')}`;
  return 'Regio tidak dicatat';
}

function drawFindings(doc, item, context) {
  ensureContentSpace(doc, 58, context);
  doc.fillColor(COLORS.ink).font('Helvetica-Bold').fontSize(11).text('Temuan');
  doc.moveDown(0.35);
  const findings = item.structured_findings || [];
  if (!findings.length) {
    doc.fillColor(COLORS.muted).font('Helvetica-Oblique').fontSize(9).text(item.findings || 'Tidak ada temuan bernomor yang dicatat.');
    return;
  }
  findings.forEach((finding) => {
    const location = findingLocation(finding, item);
    const title = finding.title ? `${finding.title}. ` : '';
    const text = `${location} — ${title}${finding.description}`;
    const textHeight = doc.heightOfString(text, { width: pageContentWidth(doc) - 40, font: 'Helvetica', size: 9.2 });
    ensureContentSpace(doc, Math.max(42, textHeight + 18), context);
    const rowY = doc.y;
    doc.circle(doc.page.margins.left + 12, rowY + 10, 10).fill(COLORS.accentDark);
    doc.fillColor(COLORS.white).font('Helvetica-Bold').fontSize(8.5)
      .text(String(finding.marker_number), doc.page.margins.left + 2, rowY + 7, { width: 20, align: 'center', lineBreak: false });
    doc.fillColor(COLORS.ink).font('Helvetica').fontSize(9.2)
      .text(text, doc.page.margins.left + 35, rowY + 2, { width: pageContentWidth(doc) - 35, paragraphGap: 3 });
    doc.y = Math.max(doc.y + 7, rowY + 31);
  });
}

function measurementValue(measurement) {
  return measurement.metadata?.value_label
    || measurement.metadata?.label
    || measurement.label
    || 'Nilai tidak tersedia';
}

function drawMeasurements(doc, item, context) {
  const measurements = [...new Map((item.measurements || []).map((measurement) => [measurement.id, measurement])).values()];
  if (!measurements.length) return;
  ensureContentSpace(doc, 68, context);
  doc.moveDown(0.45).fillColor(COLORS.ink).font('Helvetica-Bold').fontSize(11).text('Pengukuran');
  doc.moveDown(0.35);
  const left = doc.page.margins.left;
  const width = pageContentWidth(doc);
  const headerY = doc.y;
  doc.rect(left, headerY, width, 22).fill(COLORS.soft);
  doc.fillColor(COLORS.muted).font('Helvetica-Bold').fontSize(7.5).text('LABEL', left + 9, headerY + 7, { width: width * 0.58 });
  doc.text('NILAI', left + (width * 0.62), headerY + 7, { width: width * 0.34 });
  doc.y = headerY + 22;
  measurements.forEach((measurement, index) => {
    ensureContentSpace(doc, 28, context);
    const rowY = doc.y;
    if (index % 2) doc.rect(left, rowY, width, 26).fill('#F8FAFC');
    const label = measurement.metadata?.measurement_type || measurement.label || `Pengukuran ${index + 1}`;
    doc.fillColor(COLORS.ink).font('Helvetica').fontSize(8.5).text(label, left + 9, rowY + 8, { width: width * 0.56, lineBreak: false, ellipsis: true });
    doc.font('Helvetica-Bold').text(measurementValue(measurement), left + (width * 0.62), rowY + 8, { width: width * 0.34, lineBreak: false, ellipsis: true });
    doc.y = rowY + 26;
  });
}

function drawRadiographPage(doc, item, label, imageBuffer, brandIcon) {
  const layout = imageLayoutFor(item);
  addPage(doc, { layout, section: label, brandIcon });
  const context = { layout, label, brandIcon };
  drawSectionTitle(doc, `Radiografi ${item.display_order + 1}`, label, item.title && item.title !== label ? item.title : null);
  drawImageMetadata(doc, item, doc.page.margins.left, doc.y + 6, pageContentWidth(doc));
  doc.y += 29;
  let image;
  try { image = doc.openImage(imageBuffer); } catch { image = null; }
  if (!image) {
    doc.roundedRect(doc.page.margins.left, doc.y, pageContentWidth(doc), 180, 8).fill(COLORS.soft);
    doc.fillColor(COLORS.warning).font('Helvetica-Bold').fontSize(10)
      .text('Citra laporan tidak dapat dibaca.', doc.page.margins.left, doc.y + 80, { width: pageContentWidth(doc), align: 'center' });
    doc.y += 196;
  } else {
    const dimensions = imageDimensions(doc, item, image, layout);
    const x = doc.page.margins.left + ((pageContentWidth(doc) - dimensions.width) / 2);
    const y = doc.y;
    doc.rect(x - 1, y - 1, dimensions.width + 2, dimensions.height + 2).stroke(COLORS.line);
    doc.image(image, x, y, { width: dimensions.width, height: dimensions.height });
    doc.y = y + dimensions.height + 16;
  }
  drawFindings(doc, item, context);
  drawMeasurements(doc, item, context);
  const limitations = item.limitations || item.render_metadata?.limitations;
  if (limitations) {
    ensureContentSpace(doc, 48, context);
    doc.moveDown(0.5).fillColor(COLORS.warning).font('Helvetica-Bold').fontSize(9).text('Catatan keterbatasan');
    doc.fillColor(COLORS.ink).font('Helvetica').fontSize(8.5).text(safeText(limitations));
  }
}

function drawConclusion(doc, snapshot, brandIcon) {
  addPage(doc, { layout: 'portrait', section: 'Kesimpulan', brandIcon });
  drawSectionTitle(doc, 'Ringkasan akhir', 'Kesimpulan Analisis');
  doc.moveDown(0.8);
  const conclusionTop = doc.y;
  const conclusionText = snapshot.conclusion || 'Belum ada kesimpulan yang dicatat.';
  const conclusionHeight = doc.font('Helvetica').fontSize(10.5).heightOfString(conclusionText, { width: pageContentWidth(doc) - 36 });
  const conclusionCardHeight = Math.max(100, conclusionHeight + 36);
  const availableHeight = doc.page.height - doc.page.margins.bottom - conclusionTop;
  if (conclusionCardHeight <= availableHeight) {
    doc.roundedRect(doc.page.margins.left, conclusionTop, pageContentWidth(doc), conclusionCardHeight, 10).fillAndStroke(COLORS.soft, COLORS.line);
  }
  const conclusionY = conclusionTop + 18;
  doc.fillColor(COLORS.ink).font('Helvetica').fontSize(10.5)
    .text(conclusionText, doc.page.margins.left + 18, conclusionY, {
      width: pageContentWidth(doc) - 36,
    });
  doc.y = conclusionCardHeight <= availableHeight
    ? conclusionTop + conclusionCardHeight + 24
    : doc.y + 22;
  if (snapshot.clinical_data?.recommendation) {
    doc.fillColor(COLORS.ink).font('Helvetica-Bold').fontSize(11).text('Rekomendasi');
    doc.moveDown(0.3).font('Helvetica').fontSize(9.5).text(snapshot.clinical_data.recommendation);
    doc.moveDown(1);
  }
  const left = doc.page.margins.left;
  drawKeyValue(doc, 'Dibuat oleh', snapshot.creator?.name, left, doc.y + 15, 220);
  drawKeyValue(doc, 'Waktu pembuatan', formatDate(snapshot.generated_at, true), left + 260, doc.y + 15, 250);
  doc.y += 65;
  drawKeyValue(doc, 'Status laporan', statusLabel(snapshot.report_status), left, doc.y, 150);
  drawKeyValue(doc, 'Versi laporan', `Versi ${snapshot.report_version}`, left + 170, doc.y, 150);
  drawKeyValue(doc, 'ID laporan', String(snapshot.report_id).slice(0, 12), left + 340, doc.y, 170);
  doc.y += 60;
  doc.fillColor(COLORS.muted).font('Helvetica').fontSize(7.5)
    .text(`Report ID: ${snapshot.report_id}`, left, doc.y);
  doc.text(`Checksum snapshot: ${snapshot.snapshot_checksum || 'tercatat pada registrasi backend'}`, left, doc.y + 12);
}

function addFooters(doc, snapshot) {
  const range = doc.bufferedPageRange();
  for (let index = 0; index < range.count; index += 1) {
    doc.switchToPage(range.start + index);
    const left = doc.page.margins.left;
    const y = doc.page.height - 32;
    const originalBottomMargin = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc.moveTo(left, y - 8).lineTo(doc.page.width - doc.page.margins.right, y - 8).lineWidth(0.5).stroke(COLORS.line);
    doc.fillColor(COLORS.muted).font('Helvetica').fontSize(7)
      .text(`X-Core · Versi ${snapshot.report_version} · ${String(snapshot.report_id).slice(0, 8)}`, left, y, { lineBreak: false });
    doc.text(`Halaman ${index + 1} dari ${range.count}`, left, y, { width: pageContentWidth(doc), align: 'right', lineBreak: false });
    doc.page.margins.bottom = originalBottomMargin;
  }
}

export async function buildXCoreAnalysisPdf({ snapshot, imageBuffers }) {
  const brandIcon = await loadBrandIcon();
  const doc = new PDFDocument({
    autoFirstPage: false,
    bufferPages: true,
    compress: true,
    info: {
      Title: snapshot.title || 'Laporan Analisis X-Core',
      Author: snapshot.creator?.name || 'SereneApps X-Core',
      Subject: `Laporan radiografi X-Core versi ${snapshot.report_version}`,
      Keywords: 'X-Core, radiografi, laporan, temuan, pengukuran',
    },
  });
  const chunks = [];
  doc.on('pageAdded', () => {
    if (!doc._xcoreAddingExplicitPage) drawPageHeader(doc, doc._xcoreSection, doc._xcoreBrandIcon);
  });
  doc.on('data', (chunk) => chunks.push(chunk));
  const complete = new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  const orderedItems = [...snapshot.items].sort((a, b) => a.display_order - b.display_order);
  const labels = buildRadiographSectionLabels(orderedItems);
  drawCover(doc, snapshot, labels, brandIcon);
  orderedItems.forEach((item, index) => {
    drawRadiographPage(doc, item, labels[index], imageBuffers.get(item.id), brandIcon);
  });
  drawConclusion(doc, snapshot, brandIcon);
  addFooters(doc, snapshot);
  doc.end();
  return complete;
}
