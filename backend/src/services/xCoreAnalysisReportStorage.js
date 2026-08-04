import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const XCORE_REPORT_ROOT = path.resolve(__dirname, '../../uploads/x-core-analysis-reports');
const MAX_RENDER_BYTES = 18 * 1024 * 1024;
const MIN_RENDER_EDGE = 256;
const MAX_RENDER_PIXELS = 40_000_000;

function storageError(message, code, details = undefined) {
  return Object.assign(new Error(message), { status: 400, code, details });
}

export function checksum(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

export function decodeImageDataUrl(value) {
  const match = /^data:image\/(png|jpeg|jpg);base64,([a-zA-Z0-9+/=\s]+)$/.exec(String(value || ''));
  if (!match) throw storageError('Gambar laporan harus berupa data URL PNG atau JPEG.', 'unsupported_render_format');
  const buffer = Buffer.from(match[2], 'base64');
  if (!buffer.length || buffer.length > MAX_RENDER_BYTES) {
    throw storageError('Gambar laporan kosong atau melebihi batas 18 MB.', 'invalid_render_size');
  }
  return {
    buffer,
    declaredExtension: match[1] === 'png' ? 'png' : 'jpg',
    declaredMimeType: match[1] === 'png' ? 'image/png' : 'image/jpeg',
    checksum: checksum(buffer),
  };
}

function entropyOf(histogram, count) {
  return histogram.reduce((sum, frequency) => {
    if (!frequency) return sum;
    const probability = frequency / count;
    return sum - (probability * Math.log2(probability));
  }, 0);
}

function sampledPixelMetrics(pixels, width, height) {
  const count = pixels.length;
  let sum = 0;
  let sumSquares = 0;
  let black = 0;
  let white = 0;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  const histogram = new Array(256).fill(0);

  for (let index = 0; index < count; index += 1) {
    const value = pixels[index];
    sum += value;
    sumSquares += value * value;
    histogram[value] += 1;
    if (value <= 4) black += 1;
    if (value >= 251) white += 1;
    if (value > 10 && value < 250) {
      const x = index % width;
      const y = Math.floor(index / width);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  const mean = sum / count;
  const variance = Math.max(0, (sumSquares / count) - (mean * mean));
  const bboxRatio = maxX >= minX && maxY >= minY
    ? (((maxX - minX + 1) * (maxY - minY + 1)) / (width * height))
    : 0;
  return {
    mean: Number(mean.toFixed(3)),
    variance: Number(variance.toFixed(3)),
    entropy: Number(entropyOf(histogram, count).toFixed(3)),
    black_fraction: Number((black / count).toFixed(4)),
    white_fraction: Number((white / count).toFixed(4)),
    content_bbox_fraction: Number(bboxRatio.toFixed(4)),
  };
}

export async function validateRenderImage(dataUrl) {
  const decoded = decodeImageDataUrl(dataUrl);
  let metadata;
  try {
    metadata = await sharp(decoded.buffer, { failOn: 'error', limitInputPixels: MAX_RENDER_PIXELS }).metadata();
  } catch (error) {
    throw storageError('Gambar laporan tidak dapat didekode.', 'render_decode_failed', { reason: error.message });
  }
  const width = Number(metadata.width || 0);
  const height = Number(metadata.height || 0);
  const format = metadata.format;
  if (!['png', 'jpeg'].includes(format)) {
    throw storageError('Format gambar laporan tidak didukung.', 'unsupported_render_format');
  }
  if (width < MIN_RENDER_EDGE || height < MIN_RENDER_EDGE) {
    throw storageError(
      `Gambar laporan terlalu kecil (${width}×${height}). Dimensi minimum ${MIN_RENDER_EDGE}×${MIN_RENDER_EDGE}.`,
      'render_dimensions_too_small',
      { width, height, minimum: MIN_RENDER_EDGE },
    );
  }
  if ((width * height) > MAX_RENDER_PIXELS) {
    throw storageError('Dimensi gambar laporan melebihi batas aman.', 'render_dimensions_too_large', { width, height });
  }
  if (decoded.declaredExtension !== (format === 'png' ? 'png' : 'jpg')) {
    throw storageError('Isi file tidak sesuai dengan format data URL.', 'render_mime_mismatch');
  }

  const sample = await sharp(decoded.buffer, { failOn: 'error' })
    .rotate()
    .resize(128, 128, { fit: 'fill' })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const metrics = sampledPixelMetrics(sample.data, sample.info.width, sample.info.height);
  if (metrics.variance < 6 || metrics.entropy < 0.55) {
    throw storageError('Gambar laporan kosong atau hampir seragam.', 'render_nearly_uniform', metrics);
  }
  if (metrics.black_fraction > 0.88 && metrics.content_bbox_fraction < 0.28 && metrics.entropy < 2.2) {
    throw storageError('Area kosong mendominasi gambar laporan. Gunakan mode fit image.', 'render_empty_area_dominant', metrics);
  }
  const suspiciousMinimumBytes = Math.max(512, Math.floor((width * height) * 0.001));
  if (decoded.buffer.length < suspiciousMinimumBytes) {
    throw storageError('Ukuran file tidak masuk akal untuk dimensi gambar.', 'render_file_too_small', {
      width, height, bytes: decoded.buffer.length, minimum_bytes: suspiciousMinimumBytes,
    });
  }

  return {
    ...decoded,
    extension: format === 'png' ? 'png' : 'jpg',
    mimeType: format === 'png' ? 'image/png' : 'image/jpeg',
    width,
    height,
    validation: { valid: true, ...metrics, bytes: decoded.buffer.length },
  };
}

function assertStoragePath(storagePath) {
  const resolved = path.resolve(XCORE_REPORT_ROOT, storagePath);
  if (!resolved.startsWith(`${XCORE_REPORT_ROOT}${path.sep}`)) {
    throw Object.assign(new Error('Invalid report storage path'), { status: 400 });
  }
  return resolved;
}

export async function writeCaseRender({ caseId, itemId, renderType = 'ANNOTATED', dataUrl }) {
  const decoded = await validateRenderImage(dataUrl);
  const normalizedType = String(renderType).toUpperCase();
  if (!['CLEAN', 'ANNOTATED'].includes(normalizedType)) {
    throw storageError('Jenis gambar laporan tidak dikenal.', 'invalid_render_type');
  }
  const relativePath = path.join(
    String(caseId),
    'renders',
    String(itemId),
    `${normalizedType.toLowerCase()}-${decoded.checksum}.${decoded.extension}`,
  );
  const absolutePath = assertStoragePath(relativePath);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, decoded.buffer, { flag: 'wx' }).catch(async (error) => {
    if (error.code !== 'EEXIST') throw error;
  });
  return {
    storagePath: relativePath,
    checksum: decoded.checksum,
    buffer: decoded.buffer,
    width: decoded.width,
    height: decoded.height,
    mimeType: decoded.mimeType,
    validation: decoded.validation,
    renderType: normalizedType,
  };
}

export async function writeReportPdf({ caseId, reportId, version, buffer }) {
  const relativePath = path.join(String(caseId), 'reports', `xcore-${reportId}-v${version}.pdf`);
  const absolutePath = assertStoragePath(relativePath);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, buffer, { flag: 'wx' });
  return { storagePath: relativePath, checksum: checksum(buffer) };
}

export async function readStoredFile(storagePath) {
  return fs.readFile(assertStoragePath(storagePath));
}

export async function removeStoredFile(storagePath) {
  if (!storagePath) return;
  await fs.unlink(assertStoragePath(storagePath)).catch((error) => {
    if (error.code !== 'ENOENT') throw error;
  });
}
