import express from 'express';
import multer from 'multer';
import { authenticateToken, requireRoles } from '../utils/tokens.js';
import { createVerifiedCaseWorkspaceService, verifiedCaseWorkspaceStore } from '../services/verifiedCaseWorkspaceService.js';
import { createVerifiedCaseWorkspaceRepository } from '../repositories/verifiedCaseWorkspaceRepository.js';
import { createLocalImageStorageAdapter } from '../services/verifiedCaseImageStorage.js';
import { createDeepDentalCaseAnalysisAdapter } from '../services/verifiedCaseAnalysisAdapter.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024, files: 20 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|png|webp|heic|heif)$/i.test(file.mimetype || '')) return cb(null, true);
    return cb(new Error('unsupported_file_type'));
  },
});

let defaultServicePromise = null;

function assertVerifiedCaseWorkspaceRuntimeMode(env = process.env) {
  if (env.NODE_ENV === 'production' && env.VERIFIED_CASE_WORKSPACE_STORE === 'memory') {
    throw new Error('verified_case_memory_store_forbidden');
  }
}

async function createDefaultDbBackedService() {
  const { query } = await import('../db.js');
  return createVerifiedCaseWorkspaceService({
    repository: createVerifiedCaseWorkspaceRepository({ query }),
    storage: createLocalImageStorageAdapter(),
    aiAdapter: createDeepDentalCaseAnalysisAdapter(),
  });
}

async function getDefaultService() {
  assertVerifiedCaseWorkspaceRuntimeMode();
  if (process.env.VERIFIED_CASE_WORKSPACE_STORE === 'memory') {
    return verifiedCaseWorkspaceStore;
  }
  if (!defaultServicePromise) defaultServicePromise = createDefaultDbBackedService();
  return defaultServicePromise;
}

async function verifyDefaultDentistPatientAccess({ dentistId, patientId }) {
  const { query } = await import('../db.js');
  const result = await query(
    `SELECT 1
       FROM appointments
      WHERE dentist_id = $1
        AND patient_id = $2
      LIMIT 1`,
    [dentistId, patientId]
  );
  return result.rows.length > 0;
}

function actorFromRequest(req) {
  const roles = req.user?.roles || [];
  return {
    id: req.user?.id || req.user?.userId,
    role: roles.includes('admin') ? 'admin' : roles.includes('dentist') ? 'dentist' : roles.includes('patient') ? 'patient' : roles[0],
    tenantId: req.user?.tenantId || req.user?.tenant_id || null,
    clinicId: req.user?.clinicId || req.user?.clinic_id || null,
  };
}

function sendError(res, status, code, message) {
  return res.status(status).json({ error: { code, message } });
}

function sendStoreError(res, error) {
  const code = error?.code || error?.message || 'case_workspace_error';
  const status = error?.status ||
    (code.includes('permission') ? 403 :
    code.includes('not_found') ? 404 :
    code.includes('required') ||
    code.includes('unsupported') ||
    code.includes('locked') ||
    code.includes('quality') ||
    code.includes('transition') ||
    code.includes('mutation') ? 400 :
    code.includes('scope') ||
    code.includes('signed_storage') ||
    code.includes('signed') ? 403 :
    500);
  if (status >= 500) {
    console.error('[VerifiedCaseWorkspace] request failed', {
      status,
      code,
      message: error?.message || String(error),
    });
  }
  return sendError(res, status, code, code.replace(/_/g, ' '));
}

function asyncRoute(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      sendStoreError(res, error);
    }
  };
}

function createVerifiedCasesRouter({
  service = null,
  serviceFactory = null,
  verifyDentistPatientAccess = verifyDefaultDentistPatientAccess,
} = {}) {
  const router = express.Router();
  const resolveService = async () => service || (serviceFactory ? serviceFactory() : getDefaultService());

  router.get('/case-storage/:token', asyncRoute(async (req, res) => {
    const svc = await resolveService();
    if (!svc.storage?.getSignedObject) {
      return sendError(res, 404, 'storage_object_not_found', 'Storage object not found.');
    }
    const object = await svc.storage.getSignedObject(req.params.token);
    res.setHeader('Content-Type', object.metadata?.mimeType || object.metadata?.mime_type || 'application/octet-stream');
    res.setHeader('Cache-Control', 'private, max-age=60');
    res.send(object.buffer);
  }));

  router.get('/cases', authenticateToken, requireRoles(['dentist', 'admin']), asyncRoute(async (req, res) => {
    const svc = await resolveService();
    const cases = await svc.listCases({
      actor: actorFromRequest(req),
      includeArchived: req.query.include_archived === 'true',
      search: req.query.search || '',
    });
    res.json({ cases });
  }));

  router.post('/cases', authenticateToken, requireRoles(['dentist', 'admin']), asyncRoute(async (req, res) => {
    const svc = await resolveService();
    const created = await svc.createCase({
      title: req.body.title,
      patientId: req.body.patient_id || req.body.patientId || null,
      patientCode: req.body.patient_code || req.body.patientCode || null,
      sessionId: req.body.session_id || req.body.sessionId || null,
      actor: actorFromRequest(req),
    });
    res.status(201).json({ case: created });
  }));

  router.get('/cases/:caseId', authenticateToken, requireRoles(['dentist', 'admin']), asyncRoute(async (req, res) => {
    const svc = await resolveService();
    const actor = actorFromRequest(req);
    res.json({
      case: await svc.getCase(req.params.caseId, { actor }),
      images: await svc.listImages(req.params.caseId, { actor }),
      findings: await svc.listFindings(req.params.caseId, { actor }),
      audit_events: await svc.listAuditEvents(req.params.caseId, { actor }),
      exports: await svc.listExports(req.params.caseId, { actor }),
    });
  }));

  router.patch('/cases/:caseId', authenticateToken, requireRoles(['dentist', 'admin']), asyncRoute(async (req, res) => {
    const svc = await resolveService();
    const updated = await svc.patchCase({
      caseId: req.params.caseId,
      patch: req.body,
      actor: actorFromRequest(req),
    });
    res.json({ case: updated });
  }));

  router.post('/cases/:caseId/verify', authenticateToken, requireRoles(['dentist', 'admin']), asyncRoute(async (req, res) => {
    const svc = await resolveService();
    res.json({ case: await svc.verifyCase({ caseId: req.params.caseId, actor: actorFromRequest(req) }) });
  }));

  router.post('/cases/:caseId/archive', authenticateToken, requireRoles(['dentist', 'admin']), asyncRoute(async (req, res) => {
    const svc = await resolveService();
    res.json({
      case: await svc.archiveCase({
        caseId: req.params.caseId,
        actor: actorFromRequest(req),
        reason: req.body.reason || null,
      }),
    });
  }));

  router.post('/cases/:caseId/images', authenticateToken, requireRoles(['dentist', 'admin']), upload.array('images', 20), asyncRoute(async (req, res) => {
    const svc = await resolveService();
    const files = req.files?.length ? req.files : req.file ? [req.file] : [];
    if (files.length === 0) return sendError(res, 400, 'image_required', 'At least one image is required.');
    const actor = actorFromRequest(req);
    const uploaded = [];
    for (const file of files) {
      uploaded.push(await svc.addCaseImage({ caseId: req.params.caseId, file, actor }));
    }
    res.status(201).json({ images: uploaded, case: await svc.getCase(req.params.caseId, { actor }) });
  }));

  router.get('/cases/:caseId/images', authenticateToken, requireRoles(['dentist', 'admin']), asyncRoute(async (req, res) => {
    const svc = await resolveService();
    res.json({ images: await svc.listImages(req.params.caseId, { actor: actorFromRequest(req) }) });
  }));

  router.delete('/cases/:caseId/images/:imageId', authenticateToken, requireRoles(['dentist', 'admin']), asyncRoute(async (req, res) => {
    const svc = await resolveService();
    res.json({
      image: await svc.removeCaseImage({
        caseId: req.params.caseId,
        imageId: req.params.imageId,
        actor: actorFromRequest(req),
        reason: req.body?.reason || req.query.reason || null,
      }),
    });
  }));

  router.post('/cases/:caseId/images/:imageId/quality-check', authenticateToken, requireRoles(['dentist', 'admin']), asyncRoute(async (req, res) => {
    const svc = await resolveService();
    const actor = actorFromRequest(req);
    const quality_check = await svc.runQualityCheck({
      caseId: req.params.caseId,
      imageId: req.params.imageId,
      actor,
      metrics: req.body.metrics || req.body,
    });
    res.json({ quality_check, case: await svc.getCase(req.params.caseId, { actor }) });
  }));

  router.post('/cases/:caseId/images/:imageId/analyze', authenticateToken, requireRoles(['dentist', 'admin']), asyncRoute(async (req, res) => {
    const svc = await resolveService();
    const analysis = await svc.recordImageAnalysis({
      caseId: req.params.caseId,
      imageId: req.params.imageId,
      actor: actorFromRequest(req),
      context: req.body.context || null,
    });
    res.json({ analysis });
  }));

  router.get('/cases/:caseId/findings', authenticateToken, requireRoles(['dentist', 'admin']), asyncRoute(async (req, res) => {
    const svc = await resolveService();
    res.json({ findings: await svc.listFindings(req.params.caseId, { actor: actorFromRequest(req) }) });
  }));

  router.post('/cases/:caseId/findings', authenticateToken, requireRoles(['dentist', 'admin']), asyncRoute(async (req, res) => {
    const svc = await resolveService();
    const finding = await svc.createClinicianFinding({
      caseId: req.params.caseId,
      actor: actorFromRequest(req),
      finding: req.body,
    });
    res.status(201).json({ finding });
  }));

  router.patch('/cases/:caseId/findings/:findingId', authenticateToken, requireRoles(['dentist', 'admin']), asyncRoute(async (req, res) => {
    const svc = await resolveService();
    res.json({
      finding: await svc.updateFinding({
        caseId: req.params.caseId,
        findingId: req.params.findingId,
        actor: actorFromRequest(req),
        patch: req.body,
      }),
    });
  }));

  router.post('/cases/:caseId/findings/:findingId/confirm', authenticateToken, requireRoles(['dentist', 'admin']), asyncRoute(async (req, res) => {
    const svc = await resolveService();
    res.json({
      finding: await svc.confirmFinding({
        caseId: req.params.caseId,
        findingId: req.params.findingId,
        actor: actorFromRequest(req),
        patch: req.body,
      }),
    });
  }));

  router.post('/cases/:caseId/findings/:findingId/reject', authenticateToken, requireRoles(['dentist', 'admin']), asyncRoute(async (req, res) => {
    const svc = await resolveService();
    res.json({
      finding: await svc.rejectFinding({
        caseId: req.params.caseId,
        findingId: req.params.findingId,
        actor: actorFromRequest(req),
        reason: req.body.reason || null,
      }),
    });
  }));

  router.get('/cases/:caseId/audit', authenticateToken, requireRoles(['dentist', 'admin']), asyncRoute(async (req, res) => {
    const svc = await resolveService();
    res.json({ audit_events: await svc.listAuditEvents(req.params.caseId, { actor: actorFromRequest(req) }) });
  }));

  router.post('/cases/:caseId/export/pdf', authenticateToken, requireRoles(['dentist', 'admin']), asyncRoute(async (req, res) => {
    const svc = await resolveService();
    const exportRecord = await svc.exportCase({ caseId: req.params.caseId, format: 'pdf', actor: actorFromRequest(req), redacted: Boolean(req.body.redacted), draft: Boolean(req.body.draft) });
    if (req.query.download === 'true') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${req.params.caseId}.pdf"`);
      return res.send(exportRecord.payload);
    }
    res.json({ export: exportRecord });
  }));

  router.post('/cases/:caseId/export/json', authenticateToken, requireRoles(['dentist', 'admin']), asyncRoute(async (req, res) => {
    const svc = await resolveService();
    res.json({ export: await svc.exportCase({ caseId: req.params.caseId, format: 'json', actor: actorFromRequest(req), redacted: Boolean(req.body.redacted), draft: Boolean(req.body.draft) }) });
  }));

  router.post('/cases/:caseId/link-patient', authenticateToken, requireRoles(['dentist', 'admin']), asyncRoute(async (req, res) => {
    const svc = await resolveService();
    const actor = actorFromRequest(req);
    const patientId = req.body.patient_id || req.body.patientId;
    if (actor.role === 'dentist') {
      const hasAccess = await verifyDentistPatientAccess({ dentistId: actor.id, patientId });
      if (!hasAccess) {
        const error = new Error('patient_access_denied');
        error.code = 'patient_access_denied';
        error.status = 403;
        throw error;
      }
    }
    res.json({
      case: await svc.linkPatient({
        caseId: req.params.caseId,
        patientId,
        patientName: req.body.patient_name || req.body.patientName || null,
        patientCode: req.body.patient_code || req.body.patientCode || null,
        actor,
      }),
    });
  }));

  router.get('/patients/:patientId/timeline', authenticateToken, requireRoles(['patient', 'dentist', 'admin']), asyncRoute(async (req, res) => {
    const svc = await resolveService();
    res.json({ timeline_events: await svc.getPatientTimeline(req.params.patientId, { actor: actorFromRequest(req) }) });
  }));

  router.get('/sessions/:sessionId/case', authenticateToken, requireRoles(['dentist', 'admin']), asyncRoute(async (req, res) => {
    const svc = await resolveService();
    res.json({ case: await svc.getSessionCase(req.params.sessionId, { actor: actorFromRequest(req) }) });
  }));

  router.post('/sessions/:sessionId/case', authenticateToken, requireRoles(['dentist', 'admin']), asyncRoute(async (req, res) => {
    const svc = await resolveService();
    const actor = actorFromRequest(req);
    const existing = await svc.getSessionCase(req.params.sessionId, { actor });
    if (existing) return res.json({ case: existing });
    if (req.body.case_id || req.body.caseId) {
      return res.json({
        case: await svc.linkSessionCase({
          sessionId: req.params.sessionId,
          caseId: req.body.case_id || req.body.caseId,
          actor,
        }),
      });
    }
    const created = await svc.createCase({
      title: req.body.title || 'Clinical case workspace',
      patientId: req.body.patient_id || req.body.patientId || null,
      patientCode: req.body.patient_code || req.body.patientCode || null,
      sessionId: req.params.sessionId,
      actor,
    });
    res.status(201).json({ case: created });
  }));

  return router;
}

const router = createVerifiedCasesRouter();

export { assertVerifiedCaseWorkspaceRuntimeMode, createVerifiedCasesRouter };
export default router;
