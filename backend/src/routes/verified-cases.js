import express from 'express';
import multer from 'multer';
import { authenticateToken, requireRoles } from '../utils/tokens.js';
import { verifiedCaseWorkspaceStore } from '../services/verifiedCaseWorkspaceService.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024, files: 20 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|png|webp|heic|heif)$/i.test(file.mimetype || '')) return cb(null, true);
    return cb(new Error('unsupported_file_type'));
  },
});

function actorFromRequest(req) {
  const roles = req.user?.roles || [];
  return {
    id: req.user?.id || req.user?.userId,
    role: roles.includes('admin') ? 'admin' : roles.includes('dentist') ? 'dentist' : roles.includes('patient') ? 'patient' : roles[0],
  };
}

function sendError(res, status, code, message) {
  return res.status(status).json({ error: { code, message } });
}

function sendStoreError(res, error) {
  const code = error?.code || error?.message || 'case_workspace_error';
  const status =
    code.includes('permission') ? 403 :
    code.includes('not_found') ? 404 :
    code.includes('required') || code.includes('unsupported') || code.includes('locked') ? 400 :
    500;
  return sendError(res, status, code, code.replace(/_/g, ' '));
}

function createVerifiedCasesRouter({ store = verifiedCaseWorkspaceStore } = {}) {
  const router = express.Router();

  router.get('/cases', authenticateToken, requireRoles(['dentist', 'admin']), (req, res) => {
    try {
      return res.json({
        cases: store.listCases({
          includeArchived: req.query.include_archived === 'true',
          search: req.query.search || '',
        }),
      });
    } catch (error) {
      return sendStoreError(res, error);
    }
  });

  router.post('/cases', authenticateToken, requireRoles(['dentist', 'admin']), (req, res) => {
    try {
      const created = store.createCase({
        title: req.body.title,
        patientId: req.body.patient_id || req.body.patientId || null,
        sessionId: req.body.session_id || req.body.sessionId || null,
        actor: actorFromRequest(req),
      });
      return res.status(201).json({ case: created });
    } catch (error) {
      return sendStoreError(res, error);
    }
  });

  router.get('/cases/:caseId', authenticateToken, requireRoles(['dentist', 'admin']), (req, res) => {
    try {
      return res.json({
        case: store.getCase(req.params.caseId),
        images: store.listImages(req.params.caseId),
        findings: store.listFindings(req.params.caseId),
        audit_events: store.listAuditEvents(req.params.caseId),
        exports: store.listExports(req.params.caseId),
      });
    } catch (error) {
      return sendStoreError(res, error);
    }
  });

  router.patch('/cases/:caseId', authenticateToken, requireRoles(['dentist', 'admin']), (req, res) => {
    try {
      if (req.body.status === 'verified') {
        return res.json({ case: store.verifyCase({ caseId: req.params.caseId, actor: actorFromRequest(req) }) });
      }
      return res.json({ case: store.patchCase({ caseId: req.params.caseId, patch: req.body, actor: actorFromRequest(req) }) });
    } catch (error) {
      return sendStoreError(res, error);
    }
  });

  router.post('/cases/:caseId/archive', authenticateToken, requireRoles(['dentist', 'admin']), (req, res) => {
    try {
      const archived = store.archiveCase({
        caseId: req.params.caseId,
        actor: actorFromRequest(req),
        reason: req.body.reason || null,
      });
      return res.json({ case: archived });
    } catch (error) {
      return sendStoreError(res, error);
    }
  });

  router.post('/cases/:caseId/images', authenticateToken, requireRoles(['dentist', 'admin']), upload.array('images', 20), (req, res) => {
    try {
      const files = req.files?.length ? req.files : req.file ? [req.file] : [];
      const bodyImages = Array.isArray(req.body.images) ? req.body.images : [];
      const uploaded = [
        ...files.map((file) => store.addCaseImage({ caseId: req.params.caseId, file, actor: actorFromRequest(req) })),
        ...bodyImages.map((file) => store.addCaseImage({ caseId: req.params.caseId, file, actor: actorFromRequest(req) })),
      ];
      if (uploaded.length === 0) return sendError(res, 400, 'image_required', 'At least one image is required.');
      return res.status(201).json({ images: uploaded, case: store.getCase(req.params.caseId) });
    } catch (error) {
      return sendStoreError(res, error);
    }
  });

  router.get('/cases/:caseId/images', authenticateToken, requireRoles(['dentist', 'admin']), (req, res) => {
    try {
      return res.json({ images: store.listImages(req.params.caseId) });
    } catch (error) {
      return sendStoreError(res, error);
    }
  });

  router.delete('/cases/:caseId/images/:imageId', authenticateToken, requireRoles(['dentist', 'admin']), (req, res) => {
    try {
      const image = store.removeCaseImage({
        caseId: req.params.caseId,
        imageId: req.params.imageId,
        actor: actorFromRequest(req),
        reason: req.body?.reason || req.query.reason || null,
      });
      return res.json({ image });
    } catch (error) {
      return sendStoreError(res, error);
    }
  });

  router.post('/cases/:caseId/images/:imageId/quality-check', authenticateToken, requireRoles(['dentist', 'admin']), (req, res) => {
    try {
      const quality_check = store.runQualityCheck({
        caseId: req.params.caseId,
        imageId: req.params.imageId,
        actor: actorFromRequest(req),
        metrics: req.body.metrics || req.body,
      });
      return res.json({ quality_check, case: store.getCase(req.params.caseId) });
    } catch (error) {
      return sendStoreError(res, error);
    }
  });

  router.post('/cases/:caseId/images/:imageId/analyze', authenticateToken, requireRoles(['dentist', 'admin']), (req, res) => {
    try {
      const analysis = store.recordImageAnalysis({
        caseId: req.params.caseId,
        imageId: req.params.imageId,
        actor: actorFromRequest(req),
        rawAiResult: req.body.raw_ai_result || req.body.rawAiResult || req.body,
        normalizedFindings: req.body.normalized_findings || req.body.normalizedFindings || req.body.visual_findings || {},
        annotatedImage: req.body.annotated_image || req.body.annotatedImage || null,
      });
      return res.json({ analysis });
    } catch (error) {
      return sendStoreError(res, error);
    }
  });

  router.get('/cases/:caseId/findings', authenticateToken, requireRoles(['dentist', 'admin']), (req, res) => {
    try {
      return res.json({ findings: store.listFindings(req.params.caseId) });
    } catch (error) {
      return sendStoreError(res, error);
    }
  });

  router.post('/cases/:caseId/findings', authenticateToken, requireRoles(['dentist', 'admin']), (req, res) => {
    try {
      const finding = store.createClinicianFinding({
        caseId: req.params.caseId,
        actor: actorFromRequest(req),
        finding: req.body,
      });
      return res.status(201).json({ finding });
    } catch (error) {
      return sendStoreError(res, error);
    }
  });

  router.patch('/cases/:caseId/findings/:findingId', authenticateToken, requireRoles(['dentist', 'admin']), (req, res) => {
    try {
      const finding = store.updateFinding({
        caseId: req.params.caseId,
        findingId: req.params.findingId,
        actor: actorFromRequest(req),
        patch: req.body,
      });
      return res.json({ finding });
    } catch (error) {
      return sendStoreError(res, error);
    }
  });

  router.post('/cases/:caseId/findings/:findingId/confirm', authenticateToken, requireRoles(['dentist', 'admin']), (req, res) => {
    try {
      const finding = store.confirmFinding({
        caseId: req.params.caseId,
        findingId: req.params.findingId,
        actor: actorFromRequest(req),
        patch: req.body,
      });
      return res.json({ finding });
    } catch (error) {
      return sendStoreError(res, error);
    }
  });

  router.post('/cases/:caseId/findings/:findingId/reject', authenticateToken, requireRoles(['dentist', 'admin']), (req, res) => {
    try {
      const finding = store.rejectFinding({
        caseId: req.params.caseId,
        findingId: req.params.findingId,
        actor: actorFromRequest(req),
        reason: req.body.reason || null,
      });
      return res.json({ finding });
    } catch (error) {
      return sendStoreError(res, error);
    }
  });

  router.get('/cases/:caseId/audit', authenticateToken, requireRoles(['dentist', 'admin']), (req, res) => {
    try {
      return res.json({ audit_events: store.listAuditEvents(req.params.caseId) });
    } catch (error) {
      return sendStoreError(res, error);
    }
  });

  router.post('/cases/:caseId/export/pdf', authenticateToken, requireRoles(['dentist', 'admin']), (req, res) => {
    try {
      const exportRecord = store.exportCase({ caseId: req.params.caseId, format: 'pdf', actor: actorFromRequest(req), redacted: Boolean(req.body.redacted) });
      if (req.query.download === 'true') {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${req.params.caseId}.pdf"`);
        return res.send(exportRecord.payload);
      }
      return res.json({ export: exportRecord });
    } catch (error) {
      return sendStoreError(res, error);
    }
  });

  router.post('/cases/:caseId/export/json', authenticateToken, requireRoles(['dentist', 'admin']), (req, res) => {
    try {
      const exportRecord = store.exportCase({ caseId: req.params.caseId, format: 'json', actor: actorFromRequest(req), redacted: Boolean(req.body.redacted) });
      return res.json({ export: exportRecord });
    } catch (error) {
      return sendStoreError(res, error);
    }
  });

  router.post('/cases/:caseId/link-patient', authenticateToken, requireRoles(['dentist', 'admin']), (req, res) => {
    try {
      const linked = store.linkPatient({
        caseId: req.params.caseId,
        patientId: req.body.patient_id || req.body.patientId,
        patientName: req.body.patient_name || req.body.patientName || null,
        patientCode: req.body.patient_code || req.body.patientCode || null,
        actor: actorFromRequest(req),
      });
      return res.json({ case: linked });
    } catch (error) {
      return sendStoreError(res, error);
    }
  });

  router.get('/patients/:patientId/timeline', authenticateToken, requireRoles(['patient', 'dentist', 'admin']), (req, res) => {
    try {
      const actor = actorFromRequest(req);
      if (actor.role === 'patient' && actor.id !== req.params.patientId) {
        return sendError(res, 403, 'permission_denied', 'Patients can only read their own timeline.');
      }
      return res.json({ timeline_events: store.getPatientTimeline(req.params.patientId) });
    } catch (error) {
      return sendStoreError(res, error);
    }
  });

  router.get('/sessions/:sessionId/case', authenticateToken, requireRoles(['dentist', 'admin']), (req, res) => {
    try {
      return res.json({ case: store.getSessionCase(req.params.sessionId) });
    } catch (error) {
      return sendStoreError(res, error);
    }
  });

  router.post('/sessions/:sessionId/case', authenticateToken, requireRoles(['dentist', 'admin']), (req, res) => {
    try {
      const existing = store.getSessionCase(req.params.sessionId);
      if (existing) return res.json({ case: existing });
      if (req.body.case_id || req.body.caseId) {
        return res.json({
          case: store.linkSessionCase({
            sessionId: req.params.sessionId,
            caseId: req.body.case_id || req.body.caseId,
            actor: actorFromRequest(req),
          }),
        });
      }
      const created = store.createCase({
        title: req.body.title || 'Clinical case workspace',
        patientId: req.body.patient_id || req.body.patientId || null,
        sessionId: req.params.sessionId,
        actor: actorFromRequest(req),
      });
      return res.status(201).json({ case: created });
    } catch (error) {
      return sendStoreError(res, error);
    }
  });

  return router;
}

const router = createVerifiedCasesRouter();

export { createVerifiedCasesRouter };
export default router;
