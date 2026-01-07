/**
 * AI Analysis Routes
 * Routes for saving and retrieving AI dental analysis results
 */

import express from 'express';
import { authenticateToken, requireRoles } from '../utils/tokens.js';
import { PrismaClient } from '../generated/prisma/index.js';

const router = express.Router();
const prisma = new PrismaClient();

function sendError(res, status, code, message, extras = {}) {
  return res.status(status).json({
    error: {
      code,
      message,
      ...extras
    }
  });
}

function toBigInt(value, fieldName) {
  try {
    return BigInt(value);
  } catch (err) {
    throw new Error(`INVALID_${fieldName?.toUpperCase() || 'ID'}`);
  }
}

/**
 * POST /v1/ai-analysis
 * Save AI analysis result from mobile app
 */
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

      // Check if this session already exists
      const existing = await prisma.aIAnalysisResult.findFirst({
        where: {
          userId,
          sessionId
        }
      });

      if (existing) {
        // Update existing record
        const updated = await prisma.aIAnalysisResult.update({
          where: { id: existing.id },
          data: {
            imageUrl: imageUrl || existing.imageUrl,
            annotatedImageUrl: annotatedImageUrl || existing.annotatedImageUrl,
            findings: findings || existing.findings,
            summary: summary || existing.summary,
            overallAssessment: overallAssessment || existing.overallAssessment,
            riskLevel: riskLevel || existing.riskLevel,
            confidenceScore: confidenceScore !== undefined ? confidenceScore : existing.confidenceScore,
            detections: detections || existing.detections,
            recommendations: recommendations || existing.recommendations,
            metadata: metadata || existing.metadata
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

      // Create new record
      const aiAnalysis = await prisma.aIAnalysisResult.create({
        data: {
          userId,
          sessionId,
          imageUrl: imageUrl || null,
          annotatedImageUrl: annotatedImageUrl || null,
          findings: findings || null,
          summary: summary || null,
          overallAssessment: overallAssessment || null,
          riskLevel: riskLevel || null,
          confidenceScore: confidenceScore !== undefined ? confidenceScore : null,
          detections: detections || [],
          recommendations: recommendations || [],
          metadata: metadata || {}
        }
      });

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

/**
 * GET /v1/ai-analysis
 * Get user's AI analysis history
 */
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
        take: parseInt(limit, 10),
        skip: parseInt(offset, 10)
      });

      const total = await prisma.aIAnalysisResult.count({
        where: { userId }
      });

      return res.json({
        aiResults: aiResults.map(result => ({
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
          createdAt: result.createdAt?.toISOString() || null
        })),
        total,
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10)
      });
    } catch (error) {
      console.error('Error fetching AI analysis history:', error);
      return sendError(res, 500, 'fetch_failed', 'Gagal memuat riwayat AI analysis.');
    }
  }
);

/**
 * GET /v1/ai-analysis/latest
 * Get user's latest AI analysis result
 */
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

      if (!latest) {
        return res.json({ aiAnalysis: null });
      }

      return res.json({
        aiAnalysis: {
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
          createdAt: latest.createdAt?.toISOString() || null
        }
      });
    } catch (error) {
      console.error('Error fetching latest AI analysis:', error);
      return sendError(res, 500, 'fetch_failed', 'Gagal memuat AI analysis terbaru.');
    }
  }
);

/**
 * GET /v1/ai-analysis/:id
 * Get specific AI analysis result
 */
router.get(
  '/:id',
  authenticateToken,
  async (req, res) => {
    try {
      const userId = toBigInt(req.user.id, 'userId');
      const analysisId = toBigInt(req.params.id, 'analysisId');

      const result = await prisma.aIAnalysisResult.findFirst({
        where: {
          id: analysisId,
          userId
        }
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
          createdAt: result.createdAt?.toISOString() || null
        }
      });
    } catch (error) {
      console.error('Error fetching AI analysis:', error);
      return sendError(res, 500, 'fetch_failed', 'Gagal memuat AI analysis.');
    }
  }
);

/**
 * DELETE /v1/ai-analysis/:id
 * Delete AI analysis result
 */
router.delete(
  '/:id',
  authenticateToken,
  requireRoles(['patient']),
  async (req, res) => {
    try {
      const userId = toBigInt(req.user.id, 'userId');
      const analysisId = toBigInt(req.params.id, 'analysisId');

      const result = await prisma.aIAnalysisResult.findFirst({
        where: {
          id: analysisId,
          userId
        }
      });

      if (!result) {
        return sendError(res, 404, 'not_found', 'AI analysis result tidak ditemukan.');
      }

      await prisma.aIAnalysisResult.delete({
        where: { id: analysisId }
      });

      return res.json({ message: 'AI analysis result deleted' });
    } catch (error) {
      console.error('Error deleting AI analysis:', error);
      return sendError(res, 500, 'delete_failed', 'Gagal menghapus AI analysis.');
    }
  }
);

export default router;
