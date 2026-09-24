import path from 'node:path';
import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { normalizePatientPhone, withPatientIdentityTransaction, findPatientByIdentity } from '../services/patients/patientIdentityResolver.js';
import { enqueueScan, getScanJobStatus, retryScan, DEFAULT_SCAN_ENGINE } from '../services/scan3D/scan3DQueueService.js';
import { processScanNow } from '../services/scan3D/scan3DWorker.js';
import { reconstructionEngineRegistry } from '../services/scan3D/engines/reconstructionEngineRegistry.js';
import { privateScanDirectory, scanDirectory, confinedExistingFile, registeredAsset, safeComponent, sha256File } from '../services/scan3D/scanStorage.js';
import { inspectVideo } from '../services/scan3D/videoInspection.js';
import { clientScanMetadata, publicScanMetadata, associatedPatientWhere, EXPERIMENTAL_CAPABILITIES } from '../services/scan3D/scanIntegrity.js';

import { auditScanEvent, auditedScanUpdate } from '../services/scan3D/scanAudit.js';
const prisma = new PrismaClient();
function parseId(value) { try { const id = BigInt(value); return id > 0n ? id : null; } catch { return null; } }
const problem = (status, message, code) => Object.assign(new Error(message), { status, code });
function respondError(res, error) {
  if (!error.status || error.status >= 500) console.error('[xCoreScanController]', error);
  return res.status(error.status || 500).json({ error: error.status ? error.message : 'Scan operation failed', code: error.code || 'SCAN_OPERATION_FAILED' });
}
function dentistId(req) { const id = parseId(req.user?.id); if (!id) throw problem(401, 'Authentication required'); return id; }
async function clinicIdFor(id, client = prisma) {
  const staff = await client.clinicStaff.findUnique({ where: { userId: id } });
  if (staff) return staff.isActive && staff.role === 'dentist' ? staff.clinicProfileId : null;
  const profile = await client.dentistProfile.findFirst({ where: { userId: id }, select: { clinic_id: true } });
  return profile?.clinic_id || null;
}
async function authorizedScan(req, { write = false } = {}) {
  const ownerId = dentistId(req);
  const id = parseId(req.params.id);
  if (!id) throw problem(400, 'Invalid scan ID');
  const clinicId = write ? null : await clinicIdFor(ownerId);
  const scope = write ? { dentistId: ownerId } : { OR: [
    { dentistId: ownerId },
    ...(clinicId ? [{ clinicId, dentistShares: { some: { recipientDentistId: ownerId, revokedAt: null } } }] : []),
  ] };
  const scan = await prisma.imagingStudy.findFirst({ where: { id, modality: '3D_SCAN', ...scope },
    include: { patient: { select: { id: true, name: true, phone_number: true, email: true } } } });
  if (!scan) throw problem(404, 'Scan session not found or unauthorized');
  return scan;
}
export async function authorize3DScanUpload(req, res, next) {
  try { await authorizedScan(req, { write: true }); next(); } catch (error) { respondError(res, error); }
}
function patientJson(patient) {
  return { id: patient.id.toString(), name: patient.name, email: patient.email?.endsWith('@serene.local') ? null : patient.email,
    phone: patient.phone_number, mrn: `MRN-${patient.id.toString().padStart(6, '0')}`, gender: patient.patientProfile?.gender || null,
    createdAt: patient.createdAt?.toISOString() };
}
function scanJson(scan) {
  const metadata = publicScanMetadata(scan.metadata || {});
  return { id: scan.id.toString(), scanIdentifier: scan.folderName, patientId: scan.patientId?.toString() || null,
    dentistId: scan.dentistId?.toString() || null, clinicId: scan.clinicId?.toString() || null, status: scan.status,
    scanScope: metadata.scanScope || 'full', sizeInBytes: scan.sizeInBytes.toString(), createdAt: scan.createdAt.toISOString(),
    metadata, lidra: metadata.lidra || null, confidence: null, assets: metadata.assets, video: metadata.video || null,
    capabilities: metadata.capabilities, provenance: metadata.provenance, patient: scan.patient ? patientJson(scan.patient) : null };
}
function scanData(patient, ownerId, clinicId, metadata = {}, scope = 'full', draft = false) {
  const identifier = `SCAN-3D-${randomUUID()}`;
  return { patientId: patient.id, dentistId: ownerId, clinicId, studyDate: new Date(), modality: '3D_SCAN',
    folderName: identifier, originalName: `Dental 3D Scan - ${patient.name}`, description: `Smartphone Dental 3D Scan (${scope.toUpperCase()})`,
    status: 'created', sizeInBytes: 0n, metadata: { ...clientScanMetadata(metadata), scanScope: scope, scanIdentifier: identifier,
      captureMode: 'continuous_rgb', storageVersion: 'private_v1', capabilities: EXPERIMENTAL_CAPABILITIES, clinicalStatus: 'experimental',
      patientRegistrationDraft: draft, createdVia: 'dentist_mobile_scan', legacyStatus: 'pending_capture' } };
}
async function recordAssignment(tx, scan, ownerId) {
  await auditScanEvent(tx, scan, 'scan_created', ownerId);
  await tx.imagingStudyPatientAssignment.create({ data: { studyId: scan.id, previousPatientId: null,
    patientId: scan.patientId, assignedByDentistId: ownerId, source: 'upload' } });
}

export async function getScanPatients(req, res) {
  try {
    const ownerId = dentistId(req);
    const search = String(req.query.search || '').trim().slice(0, 100);
    const base = associatedPatientWhere(ownerId);
    const patients = await prisma.user.findMany({ where: { ...base, ...(search ? { AND: [{ OR: [
      { name: { contains: search, mode: 'insensitive' } }, { phone_number: { contains: search } }, { email: { contains: search, mode: 'insensitive' } },
    ] }] } : {}) }, include: { patientProfile: true }, orderBy: { createdAt: 'desc' }, take: Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20)) });
    return res.json({ patients: patients.map(patientJson) });
  } catch (error) { return respondError(res, error); }
}

export async function createScanPatient(req, res) {
  try {
    const ownerId = dentistId(req);
    const { name, phone, email, gender, dateOfBirth } = req.body || {};
    const normalizedName = String(name || '').trim();
    const normalizedPhone = normalizePatientPhone(phone);
    const normalizedEmail = email ? String(email).trim().toLowerCase() : null;
    if (!normalizedName || normalizedName.length > 200) throw problem(400, 'Nama pasien wajib diisi', 'PATIENT_NAME_REQUIRED');
    if (!normalizedPhone && !normalizedEmail) throw problem(400, 'Nomor telepon pasien wajib diisi', 'PATIENT_PHONE_REQUIRED');
    if (normalizedPhone && !/^\+[1-9]\d{7,14}$/.test(normalizedPhone)) throw problem(400, 'Invalid patient phone', 'INVALID_PATIENT_PHONE');
    if (normalizedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) throw problem(400, 'Invalid patient email', 'INVALID_PATIENT_EMAIL');
    if (dateOfBirth && (!Number.isFinite(Date.parse(dateOfBirth)) || Date.parse(dateOfBirth) > Date.now())) throw problem(400, 'Invalid date of birth');
    if (gender && !['male', 'female', 'other'].includes(gender)) throw problem(400, 'Invalid patient gender');
    const clinicId = await clinicIdFor(ownerId);
    const patient = await withPatientIdentityTransaction(prisma, async tx => {
      const byPhone = normalizedPhone ? await findPatientByIdentity(tx, { phone: normalizedPhone }) : null;
      const byEmail = normalizedEmail ? await tx.user.findUnique({ where: { email: normalizedEmail }, include: { patientProfile: true } }) : null;
      if (byPhone && byEmail && byPhone.id !== byEmail.id) throw problem(409, 'Patient identity requires reconciliation', 'PATIENT_IDENTITY_CONFLICT');
      let user = byPhone || byEmail;
      if (user) {
        const accessible = await tx.user.findFirst({ where: { id: user.id, ...associatedPatientWhere(ownerId) } });
        if (!accessible || !user.roles.includes('patient')) throw problem(409, 'Patient identity cannot be linked through this workflow', 'PATIENT_IDENTITY_CONFLICT');
        // Canonical reuse never changes another existing patient identity.
        return user;
      }
      user = await tx.user.create({ data: { name: normalizedName, email: normalizedEmail || `patient+${randomUUID()}@serene.local`,
        password_hash: await bcrypt.hash(randomUUID(), 10), phone_number: normalizedPhone, roles: ['patient'],
        patientProfile: { create: { gender: gender || null, dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null } } }, include: { patientProfile: true } });
      // Existing study/assignment models provide durable ownership; reuse this draft when capture begins.
      const draft = await tx.imagingStudy.create({ data: scanData(user, ownerId, clinicId, {}, 'full', true) });
      await recordAssignment(tx, draft, ownerId);
      return user;
    });
    return res.status(201).json({ patient: patientJson(patient) });
  } catch (error) { return respondError(res, error); }
}

export async function create3DScan(req, res) {
  try {
    const ownerId = dentistId(req);
    const { patientId, scanScope = 'full', notes = null, metadata = {} } = req.body || {};
    const id = parseId(patientId);
    if (!id) throw problem(400, 'patientId is required and must be valid', 'PATIENT_ID_REQUIRED');
    if (!['full', 'upper', 'lower'].includes(scanScope)) throw problem(400, 'Invalid scan scope');
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) throw problem(400, 'Invalid capture metadata');
    const patient = await prisma.user.findFirst({ where: { id, ...associatedPatientWhere(ownerId) } });
    if (!patient) throw problem(404, 'Patient not found or unauthorized', 'PATIENT_NOT_FOUND');
    const clinicId = await clinicIdFor(ownerId);
    const scan = await prisma.$transaction(async tx => {
      const draft = await tx.imagingStudy.findFirst({ where: { patientId: id, dentistId: ownerId, modality: '3D_SCAN', status: 'created', metadata: { path: ['patientRegistrationDraft'], equals: true } } });
      const data = scanData(patient, ownerId, clinicId, metadata, scanScope);
      data.metadata.notes = typeof notes === 'string' ? notes.slice(0, 2000) : null;
      if (draft) {
        const draftMetadata = { ...data.metadata, scanIdentifier: draft.folderName };
        const changed = await tx.imagingStudy.updateMany({ where: { id: draft.id, metadata: { equals: draft.metadata } }, data: { description: data.description, metadata: draftMetadata } });
        if (!changed.count) throw problem(409, 'Scan draft changed concurrently');
        return { ...draft, metadata: draftMetadata, patient };
      }
      const created = await tx.imagingStudy.create({ data });
      await recordAssignment(tx, created, ownerId);
      return { ...created, patient };
    });
    return res.status(201).json({ scan: scanJson(scan) });
  } catch (error) { return respondError(res, error); }
}
export async function get3DScanDetails(req, res) {
  try { return res.json({ scan: scanJson(await authorizedScan(req)) }); } catch (error) { return respondError(res, error); }
}

export async function upload3DScanVideo(req, res) {
  let staging;
  let published;
  let accepted = false;
  const started = performance.now();
  try {
    const scan = await authorizedScan(req, { write: true });
    if (!req.file) throw problem(400, 'Video file is required');
    if (!['created', 'pending_capture', 'uploaded', 'failed'].includes(scan.status)) throw problem(409, 'Scan cannot accept a replacement video in its current state');
    const directory = privateScanDirectory(scan);
    await fs.mkdir(directory, { recursive: true, mode: 0o700 });
    const uploadId = randomUUID();
    staging = path.join(directory, `.upload-${uploadId}`);
    if (req.file.path) await fs.copyFile(req.file.path, staging, fs.constants.COPYFILE_EXCL);
    else if (req.file.buffer) await fs.writeFile(staging, req.file.buffer, { flag: 'wx', mode: 0o600 });
    else throw problem(400, 'Video file is required');
    const video = await inspectVideo(staging);
    const fileName = `raw_${uploadId}${video.extension}`;
    published = path.join(directory, fileName);
    await fs.rename(staging, published);
    staging = null;
    let captureMetadata = null;
    if (req.body?.captureMetadata) {
      try { captureMetadata = JSON.parse(req.body.captureMetadata); } catch { throw problem(400, 'Invalid capture metadata'); }
      if (!captureMetadata || typeof captureMetadata !== 'object' || Array.isArray(captureMetadata)) throw problem(400, 'Invalid capture metadata');
      captureMetadata = { ...clientScanMetadata({ device: captureMetadata.device, platform: captureMetadata.platform }),
        schemaVersion: 'capture-1', source: 'client_capture', serverVerified: false,
        captureTimestamp: captureMetadata.captureTimestamp || null, osVersion: captureMetadata.osVersion || null,
        requested: captureMetadata.requested || null, observed: captureMetadata.observed || null };
    }
    const clientDeclared = { durationMs: req.body?.durationMs || null, resolution: req.body?.resolution || null, fps: req.body?.fps || null };
    const current = scan.metadata || {};
    const metadata = { ...current, storageVersion: 'private_v1', videoFileName: fileName, videoMimeType: video.mimeType,
      videoSizeInBytes: video.sizeInBytes, checksum: video.checksum, durationMs: video.durationMs, resolution: video.resolution, fps: video.fps,
      video: { ...video, fileName, clientDeclared }, captureMetadata, uploadedAt: new Date().toISOString(), preservedOriginal: true,
      assets: null, processingJob: null, lidra: null, metrics: null, confidence: null, cameraTrajectory: [], provenance: null,
      performance: { uploadReceiptMs: req.scanUploadStartedAt ? started - req.scanUploadStartedAt : null,
        inspectionAndStorageMs: performance.now() - started, videoBytes: video.sizeInBytes },
      capabilities: EXPERIMENTAL_CAPABILITIES, clinicalStatus: 'experimental' };
    const changed = await auditedScanUpdate(prisma, scan, { id: scan.id, status: scan.status, metadata: { equals: scan.metadata } },
      { status: 'uploaded', sizeInBytes: BigInt(video.sizeInBytes), metadata }, 'upload_completed');
    if (!changed.count) throw problem(409, 'Scan changed during upload; refresh before trying again', 'SCAN_CONFLICT');
    accepted = true;
    let updated = { ...scan, status: 'uploaded', sizeInBytes: BigInt(video.sizeInBytes), metadata };
    if (req.body?.autoQueue === 'true' || req.query?.autoQueue === 'true') updated = { ...(await enqueueScan(scan.id)).scan, patient: scan.patient };
    return res.json({ success: true, message: 'Video 3D scan berhasil diunggah', scan: scanJson(updated) });
  } catch (error) { return respondError(res, error); }
  finally {
    await Promise.all([req.file?.path, staging, !accepted && published].filter(Boolean).map(file => fs.unlink(file).catch(() => {})));
  }
}
export async function enqueue3DScan(req, res) {
  try {
    const scan = await authorizedScan(req, { write: true });
    const result = await enqueueScan(scan.id, { engine: req.body?.engine, configuration: req.body?.configuration });
    if (req.body?.immediate === true) processScanNow(scan.id).catch(error => console.error('[Scan3D immediate]', error));
    return res.json({ success: true, scan: scanJson({ ...result.scan, patient: scan.patient }), job: result.job });
  } catch (error) { return respondError(res, error); }
}
export async function get3DScanStatus(req, res) {
  try { const scan = await authorizedScan(req); return res.json({ success: true, ...await getScanJobStatus(scan.id) }); }
  catch (error) { return respondError(res, error); }
}
export async function retry3DScan(req, res) {
  try { const scan = await authorizedScan(req, { write: true }); const result = await retryScan(scan.id, { engine: req.body?.engine, configuration: req.body?.configuration });
    return res.json({ success: true, scan: scanJson({ ...result.scan, patient: scan.patient }), job: result.job }); }
  catch (error) { return respondError(res, error); }
}
export async function get3DScanAsset(req, res) {
  try {
    const scan = await authorizedScan(req);
    const fileName = safeComponent(req.params.fileName);
    const ext = path.extname(fileName).toLowerCase();
    const mime = { '.obj': 'model/obj', '.ply': 'application/octet-stream', '.stl': 'model/stl', '.glb': 'model/gltf-binary',
      '.gltf': 'model/gltf+json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.json': 'application/json', '.mtl': 'model/mtl' }[ext];
    if (!mime) throw problem(400, 'File type not permitted');
    const asset = registeredAsset(publicScanMetadata(scan.metadata).assets ? scan.metadata : {}, fileName);
    if (scan.status !== 'ready' || !asset) throw problem(404, 'Requested asset is not registered to a verified reconstruction');
    let file;
    try { file = await confinedExistingFile(scanDirectory(scan), asset.storagePath || fileName); }
    catch (error) { if (error.code === 'ENOENT') throw problem(404, 'Requested 3D asset is missing', 'ASSET_MISSING'); throw error; }
    if (await sha256File(file) !== asset.checksum) throw problem(409, 'Asset integrity check failed', 'ASSET_CORRUPTION');
    await auditScanEvent(prisma, scan, 'asset_viewed', dentistId(req), { checksum: asset.checksum });
    res.setHeader('Content-Type', mime);
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.sendFile(file);
  } catch (error) { return respondError(res, error); }
}
export async function get3DScanEngines(req, res) {
  try { dentistId(req); return res.json({ success: true, defaultEngine: DEFAULT_SCAN_ENGINE, engines: reconstructionEngineRegistry.list() }); }
  catch (error) { return respondError(res, error); }
}
export async function get3DScanLidraReport(req, res) {
  try {
    const scan = await authorizedScan(req);
    const report = scan.metadata?.lidra;
    if (!report || report.source === 'synthetic' || scan.metadata?.storageVersion !== 'private_v1') throw problem(404, 'LIDRA report from a verified video is not available');
    return res.json({ success: true, scanId: scan.id.toString(), scanIdentifier: scan.folderName, lidra: report });
  } catch (error) { return respondError(res, error); }
}
// No tooth segmentation model is installed. Previously generated arch/template caches cannot be
// treated as patient evidence. These endpoints fail closed until an actual implementation is validated.
export async function get3DScanToothInstances(req, res) {
  try { await authorizedScan(req); throw problem(503, 'Tooth segmentation is unavailable; no verified tooth instance implementation is configured', 'SEGMENTATION_UNAVAILABLE'); }
  catch (error) { return respondError(res, error); }
}
export async function trigger3DScanSegmentation(req, res) {
  try { await authorizedScan(req, { write: true }); throw problem(503, 'Tooth segmentation is unavailable; no verified tooth instance implementation is configured', 'SEGMENTATION_UNAVAILABLE'); }
  catch (error) { return respondError(res, error); }
}
