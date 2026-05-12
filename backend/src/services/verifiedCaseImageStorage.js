import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

const DEFAULT_SIGNED_URL_TTL_MS = 15 * 60 * 1000;

function safeName(name = 'image') {
  return String(name).replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 120) || 'image';
}

function bufferFromBase64(value = '') {
  const clean = String(value).replace(/^data:[^;]+;base64,/, '');
  return Buffer.from(clean, 'base64');
}

function base64Url(input) {
  return Buffer.from(input).toString('base64url');
}

function fromBase64Url(input) {
  return Buffer.from(input, 'base64url').toString('utf8');
}

function signPayload(payload, secret) {
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url');
}

function createSignedToken(storageRef, { secret, ttlMs = DEFAULT_SIGNED_URL_TTL_MS } = {}) {
  if (!secret) throw new Error('verified_case_storage_signing_secret_required');
  const payload = base64Url(JSON.stringify({ storageRef, exp: Date.now() + ttlMs }));
  return `${payload}.${signPayload(payload, secret)}`;
}

function readSignedToken(token, { secret } = {}) {
  if (!secret) throw new Error('verified_case_storage_signing_secret_required');
  const [payload, signature] = String(token || '').split('.');
  if (!payload || !signature || signature !== signPayload(payload, secret)) {
    throw new Error('invalid_signed_storage_token');
  }
  const parsed = JSON.parse(fromBase64Url(payload));
  if (!parsed.storageRef || Number(parsed.exp || 0) < Date.now()) {
    throw new Error('signed_storage_url_expired');
  }
  return parsed.storageRef;
}

export function createMemoryImageStorageAdapter({
  state = {},
  publicBaseUrl = '/v1/case-storage',
  signingSecret = 'memory-verified-case-storage-test-secret',
  signedUrlTtlMs = DEFAULT_SIGNED_URL_TTL_MS,
} = {}) {
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
      signedUrl: `${publicBaseUrl.replace(/\/$/, '')}/${createSignedToken(ref, { secret: signingSecret, ttlMs: signedUrlTtlMs })}`,
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
      return `${publicBaseUrl.replace(/\/$/, '')}/${createSignedToken(storageRef, { secret: signingSecret, ttlMs: signedUrlTtlMs })}`;
    },
    async getObjectBuffer(storageRef) {
      const object = state.objects.get(storageRef);
      if (!object) throw new Error('storage_object_not_found');
      return Buffer.from(object.buffer);
    },
    async getSignedObject(token) {
      const storageRef = readSignedToken(token, { secret: signingSecret });
      const object = state.objects.get(storageRef);
      if (!object || object.archived) throw new Error('storage_object_not_found');
      return {
        storageRef,
        buffer: Buffer.from(object.buffer),
        metadata: object.metadata,
      };
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
  publicBaseUrl = process.env.VERIFIED_CASE_IMAGE_PUBLIC_BASE_URL || `/${process.env.API_VERSION || 'v1'}/case-storage`,
  signingSecret = process.env.VERIFIED_CASE_STORAGE_SIGNING_SECRET || process.env.JWT_SECRET,
  signedUrlTtlMs = Number(process.env.VERIFIED_CASE_SIGNED_URL_TTL_MS || DEFAULT_SIGNED_URL_TTL_MS),
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
    await fs.writeFile(`${absolutePath}.json`, JSON.stringify({ metadata: { ...metadata, kind } }, null, 2));
    return {
      storageRef: `local://${relativePath}`,
      signedUrl: `${publicBaseUrl.replace(/\/$/, '')}/${createSignedToken(`local://${relativePath}`, { secret: signingSecret, ttlMs: signedUrlTtlMs })}`,
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
    return `${publicBaseUrl.replace(/\/$/, '')}/${createSignedToken(storageRef, { secret: signingSecret, ttlMs: signedUrlTtlMs })}`;
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
    async getSignedObject(token) {
      const storageRef = readSignedToken(token, { secret: signingSecret });
      const absolutePath = refToPath(storageRef);
      let metadata = {};
      try {
        metadata = JSON.parse(await fs.readFile(`${absolutePath}.json`, 'utf8')).metadata || {};
      } catch {
        metadata = {};
      }
      return {
        storageRef,
        buffer: await fs.readFile(absolutePath),
        metadata,
      };
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
