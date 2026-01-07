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
    const payload = {
      sessionId: analysisResult.session_id || analysisResult.sessionId || analysisResult.id,
      imageUrl: analysisResult.imageUrl || analysisResult.image_url || null,
      annotatedImageUrl: analysisResult.annotatedImageUrl || analysisResult.annotated_image_url || null,
      findings: analysisResult.findings || null,
      summary: analysisResult.summary || null,
      overallAssessment: analysisResult.overall_assessment || analysisResult.overallAssessment || null,
      riskLevel: analysisResult.risk_level || analysisResult.riskLevel || null,
      confidenceScore: analysisResult.confidence_score || analysisResult.confidenceScore || null,
      detections: analysisResult.detections || [],
      recommendations: analysisResult.recommendations || [],
      metadata: {
        source: 'mobile_app',
        analyzedAt: analysisResult.timestamp || new Date().toISOString(),
        originalId: analysisResult.id
      }
    };

    const response = await api.post('/ai-analysis', payload);
    return response.data;
  } catch (error) {
    console.error('Error saving AI analysis:', error);
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
