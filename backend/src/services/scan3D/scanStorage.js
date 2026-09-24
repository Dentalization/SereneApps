import path from 'node:path';
import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const SCAN_STORAGE_ROOT = process.env.SCAN3D_STORAGE_ROOT || fileURLToPath(new URL('../../../private/3d-scans/', import.meta.url));
export const LEGACY_SCAN_STORAGE_ROOT = fileURLToPath(new URL('../../../uploads/x-core/', import.meta.url));

export function safeComponent(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(value) || value.includes('..')) {
    throw Object.assign(new Error('Invalid scan storage path'), { status: 400, code: 'INVALID_STORAGE_PATH' });
  }
  return value;
}

export function scanDirectory(study) {
  // New captures are outside the public uploads tree. Legacy scans are read-only until re-uploaded.
  const root = study.metadata?.storageVersion === 'private_v1' ? SCAN_STORAGE_ROOT : LEGACY_SCAN_STORAGE_ROOT;
  return path.join(root, safeComponent(study.folderName));
}

export function privateScanDirectory(study) {
  return path.join(SCAN_STORAGE_ROOT, safeComponent(study.folderName));
}

export async function confinedExistingFile(directory, relativePath) {
  if (typeof relativePath !== 'string' || path.isAbsolute(relativePath) || relativePath.split(/[\\/]/).some(p => !p || p === '.' || p === '..')) {
    throw Object.assign(new Error('Invalid asset path'), { status: 400 });
  }
  const realDirectory = await fs.realpath(directory);
  const realFile = await fs.realpath(path.join(realDirectory, relativePath));
  if (!realFile.startsWith(`${realDirectory}${path.sep}`) || !(await fs.stat(realFile)).isFile()) {
    throw Object.assign(new Error('Asset path is outside scan storage'), { status: 404 });
  }
  return realFile;
}

export async function sha256File(filePath) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(filePath)) hash.update(chunk);
  return hash.digest('hex');
}

export function registeredAsset(metadata, fileName) {
  safeComponent(fileName);
  const asset = Object.values(metadata?.assets || {}).flat().find(value => value && typeof value === 'object' && value.fileName === fileName);
  return asset?.checksum && /^[a-f0-9]{64}$/.test(asset.checksum) ? asset : null;
}
