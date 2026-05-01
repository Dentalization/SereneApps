import crypto from 'crypto';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import { logCommunicationEvent } from './logging.js';

const prisma = new PrismaClient();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '../../..');

const DEFAULT_RETENTION_DAYS = 365;
const S3_ALGORITHM = 'AWS4-HMAC-SHA256';

function toAmzDate(date = new Date()) {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, '');
}

function sha256Hex(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function hmac(key, value, encoding) {
  return crypto.createHmac('sha256', key).update(value).digest(encoding);
}

function encodeS3Key(key) {
  return String(key).split('/').map(encodeURIComponent).join('/');
}

function getStorageRoot() {
  return path.resolve(process.env.COMM_ATTACHMENTS_LOCAL_ROOT || path.join(backendRoot, 'uploads', 'communication-objects'));
}

function getStorageDriver() {
  return String(process.env.COMM_ATTACHMENT_STORAGE_DRIVER || 'local-private').toLowerCase();
}

function getSigningSecret() {
  return process.env.COMM_ATTACHMENT_SIGNING_SECRET || process.env.JWT_SECRET || 'development-attachment-signing-secret';
}

function safeFileName(name = 'attachment') {
  return String(name).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 140) || 'attachment';
}

function retentionUntil() {
  const days = Math.max(1, Number(process.env.COMM_ATTACHMENT_RETENTION_DAYS || DEFAULT_RETENTION_DAYS));
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function signedUrlTtlSeconds() {
  return Math.max(60, Math.min(Number(process.env.COMM_ATTACHMENT_SIGNED_URL_TTL_SECONDS || 900), 3600));
}

function getS3Config() {
  const region = process.env.COMM_ATTACHMENT_S3_REGION || process.env.AWS_REGION || 'ap-southeast-1';
  const bucket = process.env.COMM_ATTACHMENT_BUCKET || '';
  const accessKeyId = process.env.COMM_ATTACHMENT_S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || '';
  const secretAccessKey = process.env.COMM_ATTACHMENT_S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || '';
  const sessionToken = process.env.COMM_ATTACHMENT_S3_SESSION_TOKEN || process.env.AWS_SESSION_TOKEN || '';
  const forcePathStyle = String(process.env.COMM_ATTACHMENT_S3_FORCE_PATH_STYLE || '').toLowerCase() === 'true';
  const endpoint = (process.env.COMM_ATTACHMENT_S3_ENDPOINT || (
    forcePathStyle
      ? `https://s3.${region}.amazonaws.com`
      : `https://${bucket}.s3.${region}.amazonaws.com`
  )).replace(/\/$/, '');

  if (!bucket || !accessKeyId || !secretAccessKey) {
    const error = new Error('COMM_ATTACHMENT_OBJECT_STORAGE_CONFIG_MISSING');
    error.status = 503;
    throw error;
  }

  return {
    bucket,
    accessKeyId,
    secretAccessKey,
    sessionToken,
    region,
    endpoint,
    forcePathStyle
  };
}

function buildS3Url({ objectKey, config = getS3Config() }) {
  const encodedKey = encodeS3Key(objectKey);
  const base = new URL(config.endpoint);
  if (config.forcePathStyle) {
    base.pathname = `${base.pathname.replace(/\/$/, '')}/${config.bucket}/${encodedKey}`;
  } else {
    base.pathname = `${base.pathname.replace(/\/$/, '')}/${encodedKey}`;
  }
  return base;
}

function signingKey({ secretAccessKey, date, region }) {
  const kDate = hmac(`AWS4${secretAccessKey}`, date);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, 's3');
  return hmac(kService, 'aws4_request');
}

function canonicalQuery(params) {
  return [...params.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
}

function signS3Request({ method, url, headers, payloadHash, config, now = new Date() }) {
  const amzDate = toAmzDate(now);
  const shortDate = amzDate.slice(0, 8);
  const credentialScope = `${shortDate}/${config.region}/s3/aws4_request`;
  const normalizedHeaders = {
    ...Object.fromEntries(Object.entries(headers || {}).map(([key, value]) => [key.toLowerCase(), String(value)])),
    host: url.host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate
  };
  if (config.sessionToken) normalizedHeaders['x-amz-security-token'] = config.sessionToken;

  const signedHeaders = Object.keys(normalizedHeaders).sort().join(';');
  const canonicalHeaders = Object.keys(normalizedHeaders)
    .sort()
    .map((key) => `${key}:${normalizedHeaders[key].trim()}\n`)
    .join('');
  const canonicalRequest = [
    method,
    url.pathname,
    canonicalQuery(url.searchParams),
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join('\n');
  const stringToSign = [
    S3_ALGORITHM,
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest)
  ].join('\n');
  const signature = hmac(signingKey({
    secretAccessKey: config.secretAccessKey,
    date: shortDate,
    region: config.region
  }), stringToSign, 'hex');

  return {
    ...normalizedHeaders,
    authorization: `${S3_ALGORITHM} Credential=${config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`
  };
}

function buildS3PresignedGetUrl({ objectKey, expiresInSeconds = signedUrlTtlSeconds() }) {
  const config = getS3Config();
  const now = new Date();
  const amzDate = toAmzDate(now);
  const shortDate = amzDate.slice(0, 8);
  const credentialScope = `${shortDate}/${config.region}/s3/aws4_request`;
  const url = buildS3Url({ objectKey, config });
  url.searchParams.set('X-Amz-Algorithm', S3_ALGORITHM);
  url.searchParams.set('X-Amz-Credential', `${config.accessKeyId}/${credentialScope}`);
  url.searchParams.set('X-Amz-Date', amzDate);
  url.searchParams.set('X-Amz-Expires', String(Math.max(60, Math.min(Number(expiresInSeconds) || 900, 3600))));
  url.searchParams.set('X-Amz-SignedHeaders', 'host');
  if (config.sessionToken) url.searchParams.set('X-Amz-Security-Token', config.sessionToken);

  const canonicalRequest = [
    'GET',
    url.pathname,
    canonicalQuery(url.searchParams),
    `host:${url.host}\n`,
    'host',
    'UNSIGNED-PAYLOAD'
  ].join('\n');
  const stringToSign = [
    S3_ALGORITHM,
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest)
  ].join('\n');
  const signature = hmac(signingKey({
    secretAccessKey: config.secretAccessKey,
    date: shortDate,
    region: config.region
  }), stringToSign, 'hex');
  url.searchParams.set('X-Amz-Signature', signature);
  return url.toString();
}

async function putS3Object({ objectKey, file }) {
  const config = getS3Config();
  const url = buildS3Url({ objectKey, config });
  const payloadHash = sha256Hex(file.buffer);
  const headers = signS3Request({
    method: 'PUT',
    url,
    payloadHash,
    config,
    headers: {
      'content-type': file.mimetype || 'application/octet-stream'
    }
  });
  const response = await fetch(url, {
    method: 'PUT',
    headers,
    body: file.buffer
  });
  if (!response.ok) {
    const error = new Error('COMM_ATTACHMENT_OBJECT_STORAGE_UPLOAD_FAILED');
    error.status = 503;
    error.providerStatus = response.status;
    throw error;
  }
}

async function deleteS3Object(objectKey) {
  const config = getS3Config();
  const url = buildS3Url({ objectKey, config });
  const payloadHash = sha256Hex('');
  const headers = signS3Request({
    method: 'DELETE',
    url,
    payloadHash,
    config
  });
  const response = await fetch(url, { method: 'DELETE', headers });
  if (!response.ok && response.status !== 404) {
    logCommunicationEvent('attachment_object_delete_failed', {
      objectKey,
      status: response.status
    }, 'warn');
  }
}

function signAttachment({ messageId, objectKey, expiresAt }) {
  return crypto
    .createHmac('sha256', getSigningSecret())
    .update(`${messageId}:${objectKey}:${expiresAt}`)
    .digest('hex');
}

export function buildSignedAttachmentUrl({ messageId, objectKey, expiresInSeconds = signedUrlTtlSeconds() }) {
  if (!messageId || !objectKey) return null;
  const expiresAt = Math.floor(Date.now() / 1000) + Math.max(60, Number(expiresInSeconds) || 900);
  const signature = signAttachment({ messageId: messageId.toString(), objectKey, expiresAt });
  const prefix = `/${process.env.API_VERSION || 'v1'}`;
  return `${prefix}/communications/attachments/${messageId}/download?expiresAt=${expiresAt}&signature=${signature}`;
}

export function verifySignedAttachmentUrl({ messageId, objectKey, expiresAt, signature }) {
  const expiry = Number(expiresAt);
  if (!Number.isFinite(expiry) || expiry < Math.floor(Date.now() / 1000)) return false;
  const expected = signAttachment({ messageId: messageId.toString(), objectKey, expiresAt: expiry });
  const provided = String(signature || '');
  if (provided.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
}

async function maybeRunMalwareScan({ objectKey, file }) {
  const scanUrl = process.env.COMM_ATTACHMENTS_MALWARE_SCAN_URL;
  if (!scanUrl) return 'not_configured';
  try {
    await fetch(scanUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        objectKey,
        fileName: file.originalname,
        mimeType: file.mimetype,
        size: file.size
      })
    });
    return 'queued';
  } catch (error) {
    logCommunicationEvent('attachment_scan_hook_failed', {
      objectKey,
      error: error.message
    }, 'warn');
    return 'scan_hook_failed';
  }
}

export async function storeChatAttachment({ appointmentId, file }) {
  if (!file?.buffer) {
    const error = new Error('ATTACHMENT_BUFFER_REQUIRED');
    error.status = 400;
    throw error;
  }
  const provider = getStorageDriver();
  const bucket = process.env.COMM_ATTACHMENT_BUCKET || 'serene-chat-attachments';
  const objectKey = [
    'appointments',
    appointmentId.toString(),
    'chat',
    `${crypto.randomUUID()}-${safeFileName(file.originalname)}`
  ].join('/');
  if (provider === 's3') {
    await putS3Object({ objectKey, file });
  } else {
    const absolutePath = path.join(getStorageRoot(), objectKey);
    await fsp.mkdir(path.dirname(absolutePath), { recursive: true });
    await fsp.writeFile(absolutePath, file.buffer);
  }
  const scanStatus = await maybeRunMalwareScan({ objectKey, file });

  return {
    storageProvider: provider,
    storageBucket: bucket,
    storageObjectKey: objectKey,
    fileName: file.originalname,
    mimeType: file.mimetype,
    fileSizeBytes: file.size,
    mediaRetentionUntil: retentionUntil(),
    mediaScanStatus: scanStatus,
    metadata: {
      storage: provider,
      bucket,
      objectKey,
      originalName: file.originalname,
      retentionPolicy: 'appointment_history',
      scanStatus
    }
  };
}

export function attachmentPresentationForMessage(message) {
  const mediaExpired = message.mediaRetentionUntil
    ? new Date(message.mediaRetentionUntil).getTime() < Date.now()
    : false;
  const tombstoned = Boolean(message.mediaDeletedAt)
    || message.metadata?.deleted === true
    || Boolean(message.mediaTombstoneReason);
  const objectKey = message.storageObjectKey || message.metadata?.objectKey;
  const signedUrl = objectKey && !mediaExpired && !tombstoned
    ? buildSignedAttachmentUrl({ messageId: message.id, objectKey })
    : null;

  return {
    fileUrl: signedUrl || (!objectKey ? message.fileUrl : null),
    attachmentAvailable: message.messageType !== 'file' || Boolean(signedUrl || (!objectKey && message.fileUrl && !mediaExpired && !tombstoned)),
    tombstoneReason: mediaExpired ? 'retention_expired' : message.mediaTombstoneReason || (tombstoned ? 'deleted' : null)
  };
}

export async function getAttachmentDownload({ messageId, expiresAt, signature }) {
  const message = await prisma.chatMessage.findUnique({
    where: { id: BigInt(messageId) },
    include: { chatRoom: { select: { appointmentId: true } } }
  });
  if (!message || message.messageType !== 'file') {
    const error = new Error('ATTACHMENT_NOT_FOUND');
    error.status = 404;
    throw error;
  }
  const objectKey = message.storageObjectKey || message.metadata?.objectKey;
  if (!objectKey || !verifySignedAttachmentUrl({ messageId, objectKey, expiresAt, signature })) {
    const error = new Error('ATTACHMENT_SIGNATURE_INVALID');
    error.status = 403;
    throw error;
  }
  const presentation = attachmentPresentationForMessage(message);
  if (!presentation.attachmentAvailable) {
    const error = new Error('ATTACHMENT_UNAVAILABLE');
    error.status = 410;
    throw error;
  }

  const absolutePath = path.join(getStorageRoot(), objectKey);
  const storageRoot = getStorageRoot();
  const relative = path.relative(storageRoot, absolutePath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    const error = new Error('ATTACHMENT_PATH_INVALID');
    error.status = 403;
    throw error;
  }
  if ((message.storageProvider || message.metadata?.storage) === 's3') {
    return {
      redirectUrl: buildS3PresignedGetUrl({ objectKey }),
      fileName: message.fileName || 'attachment',
      mimeType: message.mimeType || 'application/octet-stream',
      fileSizeBytes: message.fileSizeBytes
    };
  }
  try {
    await fsp.access(absolutePath, fs.constants.R_OK);
  } catch (_) {
    const error = new Error('ATTACHMENT_NOT_FOUND');
    error.status = 404;
    throw error;
  }
  return {
    stream: fs.createReadStream(absolutePath),
    fileName: message.fileName || 'attachment',
    mimeType: message.mimeType || 'application/octet-stream',
    fileSizeBytes: message.fileSizeBytes
  };
}

export async function tombstoneAttachmentMessage({ message, reason = 'retention_expired' }) {
  const objectKey = message.storageObjectKey || message.metadata?.objectKey;
  if (objectKey) {
    if ((message.storageProvider || message.metadata?.storage) === 's3') {
      await deleteS3Object(objectKey).catch(() => null);
    } else {
      const absolutePath = path.join(getStorageRoot(), objectKey);
      const storageRoot = getStorageRoot();
      const relative = path.relative(storageRoot, absolutePath);
      if (!relative.startsWith('..') && !path.isAbsolute(relative)) {
        await fsp.rm(absolutePath, { force: true }).catch(() => null);
      }
    }
  }
  return prisma.chatMessage.update({
    where: { id: message.id },
    data: {
      fileUrl: null,
      mediaDeletedAt: new Date(),
      mediaTombstoneReason: reason,
      metadata: {
        ...(message.metadata || {}),
        deleted: true,
        tombstoneReason: reason,
        tombstonedAt: new Date().toISOString()
      }
    }
  });
}

export const __testables = {
  attachmentPresentationForMessage,
  buildSignedAttachmentUrl,
  buildS3PresignedGetUrl,
  safeFileName,
  signS3Request,
  signedUrlTtlSeconds,
  verifySignedAttachmentUrl
};
