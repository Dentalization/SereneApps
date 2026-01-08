/**
 * AI Analysis Sync Service
 * Syncs AI diagnosis results from mobile to backend
 */

import api from './api';

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
    const recommendations = rawRecommendations.map((r) => ({
      title: r.title || r.name || r.action || 'Rekomendasi',
      description: r.description || r.text || r.details || r.recommendation || '',
      priority: r.priority || r.importance || 'normal',
      urgency: r.urgency || r.timeframe || 'normal',
    }));

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

    // Large base64 annotated image can blow up payload; cap length
    const annotatedRaw = analysisResult.annotatedImageUrl || analysisResult.annotated_image_url || null;
    const annotatedImageUrl = typeof annotatedRaw === 'string' && annotatedRaw.length > 300000 ? null : annotatedRaw;

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
      imageUrl: analysisResult.imageUrl || analysisResult.image_url || null,
      annotatedImageUrl,
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

    const response = await api.post('/ai-analysis', payload);
    return response.data;
  } catch (error) {
    const status = error.response?.status;
    const data = error.response?.data;
    console.error('Error saving AI analysis:', status, data || error.message);
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
