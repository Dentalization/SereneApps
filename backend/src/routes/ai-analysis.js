/**
 * AI Analysis Routes
 * Routes for saving and retrieving AI dental analysis results
 */

import express from 'express';
import { authenticateToken, requireRoles } from '../utils/tokens.js';
import { PrismaClient } from '../generated/prisma/index.js';

const router = express.Router();
const prisma = new PrismaClient();

/* -------------------------------------------------- */
/* Helpers                                            */
/* -------------------------------------------------- */

function sendError(res, status, code, message) {
  return res.status(status).json({
    error: { code, message }
  });
}

function toBigInt(value, fieldName) {
  try {
    return BigInt(value);
  } catch {
    throw new Error(`INVALID_${fieldName?.toUpperCase() || 'ID'}`);
  }
}

/**
 * Convert empty string / undefined to null
 */
function sanitizeValue(value) {
  return value === '' || value === undefined ? null : value;
}

/**
 * Parse JSON safely
 */
function parseJsonField(value) {
  if (value === null || value === undefined || value === '') return undefined;
  if (typeof value === 'object') return value;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return undefined;
    }
  }
  return undefined;
}

/**
 * FINAL Prisma-safe JSON sanitizer
 * - removes undefined
 * - removes NaN / Infinity
 * - removes BigInt
 * - guarantees valid JSON
 */
function sanitizeJson(value, fallback) {
  try {
    if (value === null || value === undefined) return fallback;
    return JSON.parse(JSON.stringify(value));
  } catch {
    return fallback;
  }
}

/* -------------------------------------------------- */
/* POST /v1/ai-analysis                               */
/* -------------------------------------------------- */

router.post(
  '/',
  authenticateToken,
  requireRoles(['patient']),
  async (req, res) => {
    try {
      const userId = toBigInt(req.user.id, 'userId');

      const {
        sessionId,
        imageUrl,
        annotatedImageUrl,
        findings,
        summary,
        overallAssessment,
        riskLevel,
        confidenceScore,
        detections,
        recommendations,
        metadata
      } = req.body;

      if (!sessionId) {
        return sendError(res, 400, 'session_id_required', 'Session ID wajib diisi.');
      }

      const existing = await prisma.aIAnalysisResult.findFirst({
        where: { userId, sessionId }
      });

      /* ---------------- UPDATE ---------------- */

      if (existing) {
        const safeDetections = sanitizeJson(parseJsonField(detections), []);
        const safeRecommendations = sanitizeJson(parseJsonField(recommendations), []);
        const safeMetadata = sanitizeJson(parseJsonField(metadata), {});

        const updated = await prisma.aIAnalysisResult.update({
          where: { id: existing.id },
          data: {
            imageUrl: sanitizeValue(imageUrl) ?? existing.imageUrl,
            annotatedImageUrl: sanitizeValue(annotatedImageUrl) ?? existing.annotatedImageUrl,
            findings: sanitizeValue(findings) ?? existing.findings,
            summary: sanitizeValue(summary) ?? existing.summary,
            overallAssessment: sanitizeValue(overallAssessment) ?? existing.overallAssessment,
            riskLevel: sanitizeValue(riskLevel) ?? existing.riskLevel,
            confidenceScore:
              confidenceScore !== undefined && confidenceScore !== ''
                ? confidenceScore
                : existing.confidenceScore,

            // 🔥 NEVER NULL JSON
            detections: Array.isArray(safeDetections) ? safeDetections : [],
            recommendations: Array.isArray(safeRecommendations) ? safeRecommendations : [],
            metadata: typeof safeMetadata === 'object' && safeMetadata !== null ? safeMetadata : {}
          }
        });

        return res.json({
          aiAnalysis: {
            id: updated.id.toString(),
            sessionId: updated.sessionId,
            riskLevel: updated.riskLevel,
            createdAt: updated.createdAt.toISOString(),
            updatedAt: updated.updatedAt.toISOString()
          },
          message: 'AI analysis result updated'
        });
      }

      /* ---------------- CREATE ---------------- */

      const safeDetections = sanitizeJson(parseJsonField(detections), []);
      const safeRecommendations = sanitizeJson(parseJsonField(recommendations), []);
      const safeMetadata = sanitizeJson(parseJsonField(metadata), {});

      const dataToInsert = {
        userId,
        sessionId,
        imageUrl: sanitizeValue(imageUrl),
        annotatedImageUrl: sanitizeValue(annotatedImageUrl),
        findings: sanitizeValue(findings),
        summary: sanitizeValue(summary),
        overallAssessment: sanitizeValue(overallAssessment),
        riskLevel: sanitizeValue(riskLevel),
        confidenceScore:
          confidenceScore !== undefined && confidenceScore !== ''
            ? confidenceScore
            : null,

        // 🔥 CRITICAL: JSON CAN NEVER BE NULL
        detections: Array.isArray(safeDetections) ? safeDetections : [],
        recommendations: Array.isArray(safeRecommendations) ? safeRecommendations : [],
        metadata: typeof safeMetadata === 'object' && safeMetadata !== null ? safeMetadata : {}
      };

      const aiAnalysis = await prisma.aIAnalysisResult.create({
        data: dataToInsert
      });
      console.log(`[AI Analysis] Created result ID ${aiAnalysis.id} for user ${userId}, sessionId: ${aiAnalysis.sessionId}`);

      return res.status(201).json({
        aiAnalysis: {
          id: aiAnalysis.id.toString(),
          sessionId: aiAnalysis.sessionId,
          riskLevel: aiAnalysis.riskLevel,
          createdAt: aiAnalysis.createdAt.toISOString()
        },
        message: 'AI analysis result saved'
      });

    } catch (error) {
      console.error('Error saving AI analysis:', error);
      return sendError(res, 500, 'save_failed', 'Gagal menyimpan hasil AI analysis.');
    }
  }
);

/* -------------------------------------------------- */
/* GET /v1/ai-analysis                                */
/* -------------------------------------------------- */

router.get(
  '/',
  authenticateToken,
  requireRoles(['patient']),
  async (req, res) => {
    try {
      const userId = toBigInt(req.user.id, 'userId');
      const { limit = 20, offset = 0 } = req.query;

      const aiResults = await prisma.aIAnalysisResult.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
        skip: Number(offset)
      });

      const total = await prisma.aIAnalysisResult.count({
        where: { userId }
      });

      return res.json({
        aiResults: aiResults.map(r => ({
          id: r.id.toString(),
          sessionId: r.sessionId,
          imageUrl: r.imageUrl,
          annotatedImageUrl: r.annotatedImageUrl,
          findings: r.findings,
          summary: r.summary,
          overallAssessment: r.overallAssessment,
          riskLevel: r.riskLevel,
          confidenceScore: r.confidenceScore,
          detections: r.detections || [],
          recommendations: r.recommendations || [],
          createdAt: r.createdAt.toISOString()
        })),
        total,
        limit: Number(limit),
        offset: Number(offset)
      });
    } catch {
      return sendError(res, 500, 'fetch_failed', 'Gagal memuat riwayat AI analysis.');
    }
  }
);

/* -------------------------------------------------- */
/* GET /v1/ai-analysis/latest                         */
/* -------------------------------------------------- */

router.get(
  '/latest',
  authenticateToken,
  requireRoles(['patient']),
  async (req, res) => {
    try {
      const userId = toBigInt(req.user.id, 'userId');

      const latest = await prisma.aIAnalysisResult.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      });

      return res.json({
        aiAnalysis: latest
          ? {
              id: latest.id.toString(),
              sessionId: latest.sessionId,
              imageUrl: latest.imageUrl,
              annotatedImageUrl: latest.annotatedImageUrl,
              findings: latest.findings,
              summary: latest.summary,
              overallAssessment: latest.overallAssessment,
              riskLevel: latest.riskLevel,
              confidenceScore: latest.confidenceScore,
              detections: latest.detections || [],
              recommendations: latest.recommendations || [],
              createdAt: latest.createdAt.toISOString()
            }
          : null
      });
    } catch {
      return sendError(res, 500, 'fetch_failed', 'Gagal memuat AI analysis terbaru.');
    }
  }
);

/* -------------------------------------------------- */
/* GET /v1/ai-analysis/:id                            */
/* -------------------------------------------------- */

router.get(
  '/:id',
  authenticateToken,
  async (req, res) => {
    try {
      const userId = toBigInt(req.user.id, 'userId');
      const analysisId = toBigInt(req.params.id, 'analysisId');

      const result = await prisma.aIAnalysisResult.findFirst({
        where: { id: analysisId, userId }
      });

      if (!result) {
        return sendError(res, 404, 'not_found', 'AI analysis result tidak ditemukan.');
      }

      return res.json({
        aiAnalysis: {
          id: result.id.toString(),
          sessionId: result.sessionId,
          imageUrl: result.imageUrl,
          annotatedImageUrl: result.annotatedImageUrl,
          findings: result.findings,
          summary: result.summary,
          overallAssessment: result.overallAssessment,
          riskLevel: result.riskLevel,
          confidenceScore: result.confidenceScore,
          detections: result.detections || [],
          recommendations: result.recommendations || [],
          createdAt: result.createdAt.toISOString()
        }
      });
    } catch {
      return sendError(res, 500, 'fetch_failed', 'Gagal memuat AI analysis.');
    }
  }
);

/* -------------------------------------------------- */
/* DELETE /v1/ai-analysis/:id                         */
/* -------------------------------------------------- */

router.delete(
  '/:id',
  authenticateToken,
  requireRoles(['patient']),
  async (req, res) => {
    try {
      const userId = toBigInt(req.user.id, 'userId');
      const analysisId = toBigInt(req.params.id, 'analysisId');

      const result = await prisma.aIAnalysisResult.findFirst({
        where: { id: analysisId, userId }
      });

      if (!result) {
        return sendError(res, 404, 'not_found', 'AI analysis result tidak ditemukan.');
      }

      await prisma.aIAnalysisResult.delete({
        where: { id: analysisId }
      });

      return res.json({ message: 'AI analysis result deleted' });
    } catch {
      return sendError(res, 500, 'delete_failed', 'Gagal menghapus AI analysis.');
    }
  }
);

export default router;
