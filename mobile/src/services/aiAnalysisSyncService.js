/**
 * AI Analysis Sync Service
 * Syncs AI diagnosis results from mobile to backend
 * UPDATED: Removed Base64 size limit to fix missing images on Web Dashboard
 */

import api from './api';
import * as FileSystem from 'expo-file-system/legacy';

const MAX_STORED_IMAGE_BYTES = 6 * 1024 * 1024;

const inferImageMimeType = (uri = '') => {
  const normalized = String(uri).toLowerCase();
  if (normalized.includes('.png')) return 'image/png';
  if (normalized.includes('.webp')) return 'image/webp';
  return 'image/jpeg';
};

const toPersistableImageUrl = async (value) => {
  if (!value || typeof value !== 'string') return null;
  if (/^data:image\//i.test(value)) {
    return value.length <= 8 * 1024 * 1024 ? value : null;
  }
  if (/^(https?:\/\/|\/uploads\/)/i.test(value)) return value;
  if (!/^(file|content):\/\//i.test(value)) return null;

  const info = await FileSystem.getInfoAsync(value);
  if (!info?.exists || (info.size && info.size > MAX_STORED_IMAGE_BYTES)) return null;
  const base64 = await FileSystem.readAsStringAsync(value, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return `data:${inferImageMimeType(value)};base64,${base64}`;
};

/**
 * Save AI analysis result to backend
 * @param {Object} analysisResult - The AI analysis result to save
 * @returns {Promise<Object>} Saved analysis data
 */
export const saveAIAnalysis = async (analysisResult) => {
  try {
    // Normalize and sanitize payload to avoid 500s from oversized or invalid fields
    const rawDetections = Array.isArray(analysisResult.detections) ? analysisResult.detections : [];
    const detections = rawDetections.map((d) => ({
      label: d.label || d.name || d.type || d.condition || 'Temuan',
      confidence: typeof d.confidence === 'number' ? d.confidence : (typeof d.probability === 'number' ? d.probability / 100 : 0),
      area: d.area || d.location || d.bbox || null,
      description: d.description || d.details || d.notes || null,
      details: d.details || d.explanation || null,
      severity: d.severity || null,
    }));

    const rawRecommendations = Array.isArray(analysisResult.recommendations) ? analysisResult.recommendations : [];
    const recommendations = rawRecommendations.map((r) => {
      if (typeof r === 'string') {
        return {
          title: 'Rekomendasi',
          description: r,
          priority: 'normal',
          urgency: 'normal',
        };
      }
      return {
        title: r.title || r.name || r.action || 'Rekomendasi',
        description: r.description || r.text || r.details || r.recommendation || '',
        priority: r.priority || r.importance || 'normal',
        urgency: r.urgency || r.timeframe || 'normal',
      };
    });

    // Extract confidence from multiple possible sources
    const confidenceScoreRaw = analysisResult.confidence_score || analysisResult.confidenceScore || analysisResult.confidence;
    let confidenceScore = null;
    if (typeof confidenceScoreRaw === 'number') {
      // If 0-1 range, convert to percentage
      confidenceScore = confidenceScoreRaw <= 1 ? Math.round(confidenceScoreRaw * 100) : confidenceScoreRaw;
    } else if (detections.length > 0) {
      // Calculate average confidence from detections
      const avgConfidence = detections.reduce((sum, d) => sum + (d.confidence || 0), 0) / detections.length;
      confidenceScore = avgConfidence <= 1 ? Math.round(avgConfidence * 100) : avgConfidence;
    }

    // --- FIX: IMAGE SIZE LIMIT REMOVED ---
    // Previously capped at 300k chars, causing missing images on web.
    // Now allowing full base64 string to pass through.
    const annotatedRaw = analysisResult.annotatedImageUrl || analysisResult.annotated_image_url || null;
    const [imageUrl, annotatedImageUrl] = await Promise.all([
      toPersistableImageUrl(analysisResult.imageUrl || analysisResult.image_url || null),
      toPersistableImageUrl(annotatedRaw),
    ]);

    const rawSession = analysisResult.session_id || analysisResult.sessionId || analysisResult.id;
    const sessionIdSafe = typeof rawSession === 'string' ? rawSession.slice(0, 255) : String(rawSession || '').slice(0, 255);

    // Extract findings and summary from multiple sources
    const findings = analysisResult.findings || 
                    analysisResult.reply || 
                    analysisResult.content || 
                    (detections.length > 0 ? detections.map(d => d.label).join(', ') : null);
    
    const summary = analysisResult.summary || 
                   analysisResult.overall_summary || 
                   analysisResult.diagnosis_summary || 
                   null;
    
    const overallAssessment = analysisResult.overall_assessment || 
                             analysisResult.overallAssessment || 
                             analysisResult.assessment || 
                             analysisResult.conclusion || 
                             null;
    
    // Determine risk level from multiple sources
    let riskLevel = analysisResult.risk_level || analysisResult.riskLevel || null;
    if (!riskLevel && detections.length > 0) {
      // Infer risk from detections severity
      const severities = detections.map(d => d.severity).filter(Boolean);
      if (severities.includes('high') || severities.includes('severe')) riskLevel = 'high';
      else if (severities.includes('medium') || severities.includes('moderate')) riskLevel = 'medium';
      else if (severities.includes('low') || severities.includes('mild')) riskLevel = 'low';
    }
    riskLevel = riskLevel || 'unknown';

    const payload = {
      sessionId: sessionIdSafe,
      imageUrl,
      annotatedImageUrl, // Now contains the full base64 string
      findings,
      summary,
      overallAssessment,
      riskLevel,
      confidenceScore,
      detections,
      recommendations,
      metadata: {
        source: 'mobile_app',
        analyzedAt: analysisResult.timestamp || new Date().toISOString(),
        originalId: analysisResult.id,
        detectionCount: detections.length,
        recommendationCount: recommendations.length,
      },
    };

    // Defensive: avoid sending extremely large payloads that may break the server
    try {
      const payloadSize = JSON.stringify(payload).length;
      if (payloadSize > 12 * 1024 * 1024) {
        throw new Error('AI analysis payload exceeds the secure upload limit.');
      }

      const response = await api.post('/ai-analysis', payload);
      return response.data;
    } catch (postError) {
      const status = postError.response?.status;
      // If server error (5xx) and we originally included annotated image, retry without it
      if ((status === 413 || status >= 500 || status === undefined) && annotatedImageUrl) {
        try {
          const fallback = { ...payload };
          fallback.annotatedImageUrl = null;
          fallback.metadata = { ...(fallback.metadata || {}), retriedWithoutImage: true };
          console.warn('Retrying AI analysis save without annotatedImageUrl due to server error');
          const retryResp = await api.post('/ai-analysis', fallback);
          return retryResp.data;
        } catch (retryErr) {
          throw retryErr;
        }
      }
      throw postError;
    }
  } catch (error) {
    const status = error.response?.status;
    const data = error.response?.data;
    console.error('Error saving AI analysis:', status, data || error.message);
    
    // If payload is too large (413), we might want to log it specifically
    if (status === 413) {
        console.error('⚠️ Payload Too Large: The annotated image might be too big for the server configuration.');
    }
    
    throw error;
  }
};

/**
 * Get user's AI analysis history from backend
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} AI analysis history
 */
export const getAIAnalysisHistory = async (params = {}) => {
  try {
    const response = await api.get('/ai-analysis', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching AI analysis history:', error);
    throw error;
  }
};

/**
 * Get latest AI analysis result
 * @returns {Promise<Object>} Latest AI analysis
 */
export const getLatestAIAnalysis = async () => {
  try {
    const response = await api.get('/ai-analysis/latest');
    return response.data;
  } catch (error) {
    console.error('Error fetching latest AI analysis:', error);
    throw error;
  }
};

/**
 * Sync local AI analysis history to backend
 * Used after login or periodically to ensure data is synced
 * @param {Array} localHistory - Array of local AI analysis results
 */
export const syncAIAnalysisHistory = async (localHistory = []) => {
  if (!localHistory.length) return { synced: 0, failed: 0 };
  
  let synced = 0;
  let failed = 0;

  for (const result of localHistory) {
    try {
      await saveAIAnalysis(result);
      synced++;
    } catch (error) {
      console.warn('Failed to sync AI analysis:', result.id, error.message);
      failed++;
    }
  }

  return { synced, failed };
};

export default {
  saveAIAnalysis,
  getAIAnalysisHistory,
  getLatestAIAnalysis,
  syncAIAnalysisHistory
};
