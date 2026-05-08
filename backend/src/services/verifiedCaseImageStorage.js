import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

function safeName(name = 'image') {
  return String(name).replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 120) || 'image';
}

function bufferFromBase64(value = '') {
  const clean = String(value).replace(/^data:[^;]+;base64,/, '');
  return Buffer.from(clean, 'base64');
}

export function createMemoryImageStorageAdapter({ state = {} } = {}) {
  if (!state.objects) {
    state.objects = new Map();
    state.archived = new Set();
  }

  async function putBuffer(buffer, metadata = {}, kind = 'original') {
    const ref = `memory://verified-cases/${metadata.caseId || 'case'}/${kind}/${crypto.randomUUID()}-${safeName(metadata.fileName || 'image')}`;
    state.objects.set(ref, {
      buffer: Buffer.from(buffer),
      metadata: { ...metadata, kind },
      archived: false,
    });
    return {
      storageRef: ref,
      signedUrl: `memory-signed://${encodeURIComponent(ref)}`,
      sizeBytes: Buffer.byteLength(buffer),
    };
  }

  return {
    async putOriginalImage(buffer, metadata = {}) {
      return putBuffer(buffer, metadata, 'original');
    },
    async putAnnotatedImage(input, metadata = {}) {
      const buffer = Buffer.isBuffer(input) ? input : bufferFromBase64(input);
      return putBuffer(buffer, metadata, 'annotated');
    },
    async getSignedUrl(storageRef) {
      if (!storageRef || !state.objects.has(storageRef)) return null;
      return `memory-signed://${encodeURIComponent(storageRef)}`;
    },
    async getObjectBuffer(storageRef) {
      const object = state.objects.get(storageRef);
      if (!object) throw new Error('storage_object_not_found');
      return Buffer.from(object.buffer);
    },
    async archiveObject(storageRef) {
      const object = state.objects.get(storageRef);
      if (object) object.archived = true;
      state.archived.add(storageRef);
      return true;
    },
    async isArchived(storageRef) {
      return state.archived.has(storageRef) || Boolean(state.objects.get(storageRef)?.archived);
    },
  };
}

export function createLocalImageStorageAdapter({
  rootDir = process.env.VERIFIED_CASE_IMAGE_STORAGE_DIR || path.resolve(process.cwd(), 'uploads', 'verified-cases'),
  publicBaseUrl = process.env.VERIFIED_CASE_IMAGE_PUBLIC_BASE_URL || '/uploads/verified-cases',
} = {}) {
  async function ensureDir(dir) {
    await fs.mkdir(dir, { recursive: true });
  }

  async function putBuffer(buffer, metadata = {}, kind = 'original') {
    const caseId = safeName(metadata.caseId || 'unlinked');
    const fileName = `${crypto.randomUUID()}-${safeName(metadata.fileName || `${kind}.bin`)}`;
    const relativePath = path.posix.join(caseId, kind, fileName);
    const absolutePath = path.join(rootDir, caseId, kind, fileName);
    await ensureDir(path.dirname(absolutePath));
    await fs.writeFile(absolutePath, buffer);
    return {
      storageRef: `local://${relativePath}`,
      signedUrl: `${publicBaseUrl.replace(/\/$/, '')}/${relativePath}`,
      sizeBytes: Buffer.byteLength(buffer),
    };
  }

  function refToPath(storageRef = '') {
    if (!storageRef.startsWith('local://')) throw new Error('unsupported_storage_ref');
    const relativePath = storageRef.replace(/^local:\/\//, '');
    return path.join(rootDir, relativePath);
  }

  function refToUrl(storageRef = '') {
    if (!storageRef?.startsWith('local://')) return null;
    return `${publicBaseUrl.replace(/\/$/, '')}/${storageRef.replace(/^local:\/\//, '')}`;
  }

  return {
    async putOriginalImage(buffer, metadata = {}) {
      return putBuffer(Buffer.from(buffer), metadata, 'original');
    },
    async putAnnotatedImage(input, metadata = {}) {
      const buffer = Buffer.isBuffer(input) ? input : bufferFromBase64(input);
      return putBuffer(buffer, metadata, 'annotated');
    },
    async getSignedUrl(storageRef) {
      return refToUrl(storageRef);
    },
    async getObjectBuffer(storageRef) {
      return fs.readFile(refToPath(storageRef));
    },
    async archiveObject(storageRef) {
      const absolutePath = refToPath(storageRef);
      const archivedPath = `${absolutePath}.archived`;
      try {
        await fs.rename(absolutePath, archivedPath);
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
      return true;
    },
  };
}
