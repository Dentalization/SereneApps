import {
  createAnalysisCase,
  generateAnalysisReport,
  getAnalysisCase,
  getAnalysisReportFile,
  listAnalysisCases,
  saveAnalysisCaseRender,
  updateAnalysisCase,
} from '../services/xCoreAnalysisCaseService.js';
import { requireXCoreStudyReadAccess } from '../services/xCoreAccessPolicyService.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function respondError(res, error) {
  console.error('[X-Core Analysis Case]', error);
  return res.status(error.status || 500).json({
    error: error.status ? error.message : 'X-Core analysis case operation failed',
    code: error.code || 'xcore_analysis_case_error',
  });
}

const accessFor = (req) => (studyId) => requireXCoreStudyReadAccess({
  studyId,
  user: req.user,
  prismaClient: prisma,
});

export async function listCases(req, res) {
  try { res.json({ cases: await listAnalysisCases(req.user.id) }); } catch (error) { respondError(res, error); }
}

export async function getCase(req, res) {
  try { res.json({ case: await getAnalysisCase(req.params.caseId, req.user.id) }); } catch (error) { respondError(res, error); }
}

export async function createCase(req, res) {
  try {
    const record = await createAnalysisCase({
      userId: req.user.id,
      patientId: req.body?.patient_id,
      payload: req.body,
      requireStudyAccess: accessFor(req),
    });
    res.status(201).json({ case: record });
  } catch (error) { respondError(res, error); }
}

export async function updateCase(req, res) {
  try {
    const record = await updateAnalysisCase({
      caseId: req.params.caseId,
      userId: req.user.id,
      payload: req.body,
      requireStudyAccess: accessFor(req),
    });
    res.json({ case: record });
  } catch (error) { respondError(res, error); }
}

export async function saveCaseRender(req, res) {
  try {
    const render = await saveAnalysisCaseRender({
      caseId: req.params.caseId,
      itemId: req.params.itemId,
      userId: req.user.id,
      dataUrl: req.body?.render_data_url,
    });
    res.json({ render });
  } catch (error) { respondError(res, error); }
}

export async function generateReport(req, res) {
  try {
    const report = await generateAnalysisReport({
      caseId: req.params.caseId,
      userId: req.user.id,
      status: req.body?.status || 'DRAFT',
    });
    res.status(201).json({ report });
  } catch (error) { respondError(res, error); }
}

export async function downloadReport(req, res) {
  try {
    const report = await getAnalysisReportFile({
      caseId: req.params.caseId,
      reportId: req.params.reportId,
      userId: req.user.id,
    });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="xcore-analysis-v${report.version}.pdf"`);
    res.setHeader('ETag', `"${report.checksum}"`);
    res.send(report.buffer);
  } catch (error) { respondError(res, error); }
}

