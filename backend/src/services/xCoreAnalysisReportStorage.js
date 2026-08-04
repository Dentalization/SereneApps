import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const XCORE_REPORT_ROOT = path.resolve(__dirname, '../../uploads/x-core-analysis-reports');
const MAX_RENDER_BYTES = 18 * 1024 * 1024;

export function checksum(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

export function decodeImageDataUrl(value) {
  const match = /^data:image\/(png|jpeg|jpg);base64,([a-zA-Z0-9+/=\s]+)$/.exec(String(value || ''));
  if (!match) throw Object.assign(new Error('render_data_url must be a PNG or JPEG data URL'), { status: 400 });
  const buffer = Buffer.from(match[2], 'base64');
  if (!buffer.length || buffer.length > MAX_RENDER_BYTES) {
    throw Object.assign(new Error('Rendered image is empty or exceeds 18 MB'), { status: 400 });
  }
  return { buffer, extension: match[1] === 'png' ? 'png' : 'jpg', checksum: checksum(buffer) };
}

function assertStoragePath(storagePath) {
  const resolved = path.resolve(XCORE_REPORT_ROOT, storagePath);
  if (!resolved.startsWith(`${XCORE_REPORT_ROOT}${path.sep}`)) {
    throw Object.assign(new Error('Invalid report storage path'), { status: 400 });
  }
  return resolved;
}

export async function writeCaseRender({ caseId, itemId, dataUrl }) {
  const decoded = decodeImageDataUrl(dataUrl);
  const relativePath = path.join(String(caseId), 'renders', `${itemId}-${decoded.checksum.slice(0, 12)}.${decoded.extension}`);
  const absolutePath = assertStoragePath(relativePath);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, decoded.buffer, { flag: 'wx' }).catch(async (error) => {
    if (error.code !== 'EEXIST') throw error;
  });
  return { storagePath: relativePath, checksum: decoded.checksum, buffer: decoded.buffer };
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

