import axios from 'axios';
import * as FileSystem from 'expo-file-system';
import { AI_URL, AI_API_KEY, API_CONFIG } from '../config/api.config';

// MOCK MODE DISABLED - Using real DeepDental API
const ENABLE_MOCK = false;

console.log('🤖 AI DIAGNOSIS SERVICE - REAL API MODE');
console.log('   API URL:', AI_URL);
console.log('   API Key:', AI_API_KEY ? `${AI_API_KEY.substring(0, 15)}...` : 'NOT SET');

// Create axios instance
const aiClient = axios.create({
  baseURL: AI_URL,
  timeout: API_CONFIG.AI_TIMEOUT,
  headers: {
    'X-API-Key': AI_API_KEY,
  },
});

// Request interceptor for logging
aiClient.interceptors.request.use(
  (config) => {
    if (__DEV__) {
      console.log(`🤖 AI Request: ${config.method?.toUpperCase()} ${config.url}`);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for logging
aiClient.interceptors.response.use(
  (response) => {
    if (__DEV__) {
      console.log(`✅ AI Response: ${response.status} ${response.config.url}`);
    }
    return response;
  },
  (error) => {
    // Silent error - let components handle it with toast
    if (__DEV__) {
      console.log(`⚠️ AI Error: ${error.response?.status || 'Network'} ${error.config?.url || ''}`);
    }
    return Promise.reject(error);
  }
);

/**
 * ============================
 * HEALTH CHECK
 * ============================
 */
export const checkHealth = async () => {
  try {
    const response = await aiClient.get('/health');
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
    };
  }
};

/**
 * ============================
 * SESSION MANAGEMENT
 * ============================
 */

// Create new session
export const createSession = async (metadata = {}) => {
  // Mock mode
  if (ENABLE_MOCK) {
    console.log('🔧 MOCK MODE: Creating session...');
    await new Promise(resolve => setTimeout(resolve, 500));
    return {
      success: true,
      data: {
        id: `mock_session_${Date.now()}`,
        user_id: 'mock_user',
        role: 'patient',
        language: 'bilingual',
        created_at: new Date().toISOString(),
      },
      sessionId: `mock_session_${Date.now()}`,
    };
  }

  try {
    const response = await aiClient.post('/sessions', {
      role: 'patient',
      language: 'bilingual',
      metadata: {
        source: 'mobile_app',
        ...metadata,
      },
    });
    return {
      success: true,
      data: response.data,
      sessionId: response.data.id,
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
    };
  }
};

// Get session details
export const getSession = async (sessionId) => {
  try {
    const response = await aiClient.get(`/sessions/${sessionId}`);
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
    };
  }
};

// List all sessions
export const listSessions = async (page = 1, perPage = 20) => {
  // Mock mode
  if (ENABLE_MOCK) {
    console.log('🔧 MOCK MODE: Listing sessions...');
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return {
      success: true,
      data: {
        sessions: [
          {
            session_id: 'mock_session_1',
            created_at: new Date(Date.now() - 86400000).toISOString(), // Yesterday
            message_count: 5,
          },
          {
            session_id: 'mock_session_2',
            created_at: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
            message_count: 3,
          },
        ],
        total: 2,
        page,
        per_page: perPage,
      },
      sessions: [
        {
          session_id: 'mock_session_1',
          created_at: new Date(Date.now() - 86400000).toISOString(),
          message_count: 5,
        },
        {
          session_id: 'mock_session_2',
          created_at: new Date(Date.now() - 172800000).toISOString(),
          message_count: 3,
        },
      ],
      total: 2,
    };
  }

  try {
    const response = await aiClient.get('/sessions', {
      params: { page, per_page: perPage },
    });
    const normalizedSessions = (response.data.sessions || []).map((session) => ({
      ...session,
      session_id: session.session_id || session.id,
      id: session.id || session.session_id,
    }));
    return {
      success: true,
      data: {
        ...response.data,
        sessions: normalizedSessions,
      },
      sessions: normalizedSessions,
      total: response.data.total || 0,
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
    };
  }
};

// Delete session
export const deleteSession = async (sessionId) => {
  try {
    await aiClient.delete(`/sessions/${sessionId}`);
    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
    };
  }
};

// Get session messages (history)
export const getSessionMessages = async (sessionId) => {
  try {
    const response = await aiClient.get(`/sessions/${sessionId}/messages`);
    return {
      success: true,
      data: response.data,
      messages: response.data.messages || [],
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
    };
  }
};

/**
 * ============================
 * IMAGE ANALYSIS (CORE FEATURE)
 * ============================
 */

// Analyze image with full AI analysis (using /chat/upload endpoint for flexibility)
export const analyzeImage = async ({ sessionId, imageUris, language = 'bilingual', role = 'patient' }) => {
  // Mock mode
  if (ENABLE_MOCK) {
    console.log('🔧 MOCK MODE: Analyzing image...');
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate processing time
    
    return {
      success: true,
      data: {
        findings: 'Berdasarkan analisis gambar, terdeteksi beberapa area yang perlu perhatian.',
        image_quality: 'Kualitas gambar baik, pencahayaan memadai.',
        recommendations: [
          'Jadwalkan pemeriksaan rutin ke dokter gigi dalam 2 minggu',
          'Perhatikan kebersihan gigi dengan menyikat 2x sehari',
          'Gunakan benang gigi untuk membersihkan sela-sela gigi',
        ],
        annotated_image_base64: null, // Could add mock base64 image here
        detections: [
          { id: 1, label: 'Plak', confidence: 0.85, area: 'Gigi depan atas' },
          { id: 2, label: 'Karies ringan', confidence: 0.72, area: 'Gigi geraham kiri' },
        ],
        summary: 'Kondisi gigi secara umum cukup baik dengan beberapa area yang memerlukan perhatian khusus.',
        overall_assessment: 'Terdapat indikasi plak dan karies ringan yang sebaiknya ditangani segera.',
      },
    };
  }

  try {
    // Use /chat/upload endpoint instead of /images/analyze
    // This endpoint is more flexible with data structure
    const formData = new FormData();
    
    // Add analysis request message
    formData.append('message', 'Tolong analisis kondisi gigi saya dari foto yang saya upload. Berikan diagnosis lengkap, temuan, dan rekomendasi perawatan.');
    formData.append('session_id', sessionId);
    formData.append('role', role);
    formData.append('language', language);
    
    // Add images (support multiple images)
    const imageArray = Array.isArray(imageUris) ? imageUris : [imageUris];
    imageArray.forEach((imageUri, index) => {
      const filename = imageUri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      
      formData.append('images', {
        uri: imageUri,
        name: filename,
        type: type,
      });
    });

    const response = await aiClient.post('/chat/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: API_CONFIG.AI_TIMEOUT,
    });

    // Extract data from chat response
    const replyContent = response.data.reply || response.data.content || '';
    const visualFindings = response.data.visual_findings || {};
    const annotatedImage = visualFindings.annotated_image_base64 || response.data.annotated_image || null;

    return {
      success: true,
      data: response.data,
      findings: replyContent,
      imageQuality: visualFindings.image_quality || {},
      recommendations: visualFindings.recommendations || [],
      annotatedImage: annotatedImage,
      detections: visualFindings.detections || [],
      messageId: response.data.message_id || null,
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
    };
  }
};

// Detect only (YOLO without AI interpretation - faster)
export const detectOnly = async (imageUri, confidenceThreshold = 0.25) => {
  try {
    const formData = new FormData();
    
    const filename = imageUri.split('/').pop();
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';
    
    formData.append('image', {
      uri: imageUri,
      name: filename,
      type: type,
    });
    
    formData.append('confidence_threshold', confidenceThreshold.toString());

    const response = await aiClient.post('/images/detect', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: API_CONFIG.TIMEOUT,
    });

    return {
      success: true,
      data: response.data,
      detections: response.data.detections || [],
      annotatedImage: response.data.annotated_image || null,
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
    };
  }
};

/**
 * ============================
 * CHAT WITH AI
 * ============================
 */

// Send chat message (text only)
export const sendChatMessage = async (message, sessionId, images = []) => {
  try {
    const response = await aiClient.post('/chat', {
      message,
      session_id: sessionId,
      role: 'patient',
      language: 'bilingual',
      images: images.map(img => ({
        data: img.base64,
        filename: img.filename || 'image.jpg',
      })),
    });
    const replyContent = response.data.reply ?? response.data.content ?? '';

    return {
      success: true,
      data: response.data,
      reply: replyContent,
      messageId: response.data.message_id || null,
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
    };
  }
};

// Send chat with image upload (multipart)
export const sendChatWithImages = async (message, sessionId, imageUris = []) => {
  try {
    const formData = new FormData();
    
    formData.append('message', message);
    formData.append('session_id', sessionId);
    formData.append('role', 'patient');
    formData.append('language', 'bilingual');
    
    // Add images
    imageUris.forEach((imageUri, index) => {
      const filename = imageUri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      
      formData.append('images', {
        uri: imageUri,
        name: filename,
        type: type,
      });
    });

    const response = await aiClient.post('/chat/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: API_CONFIG.AI_TIMEOUT,
    });
    const replyContent = response.data.reply ?? response.data.content ?? '';
    const hasAnnotatedImage =
      response.data.has_annotated_image ??
      Boolean(response.data.visual_findings?.annotated_image_base64);

    return {
      success: true,
      data: response.data,
      reply: replyContent,
      messageId: response.data.message_id || null,
      hasAnnotatedImage,
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
    };
  }
};

/**
 * ============================
 * KNOWLEDGE BASE
 * ============================
 */

// Query knowledge base
export const queryKnowledge = async (question, k = 4) => {
  try {
    const response = await aiClient.post('/knowledge/query', {
      question,
      role: 'patient',
      k,
    });

    return {
      success: true,
      data: response.data,
      answer: response.data.answer || '',
      sources: response.data.sources || [],
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
    };
  }
};

/**
 * ============================
 * USER MANAGEMENT
 * ============================
 */

// Get current user
export const getCurrentUser = async () => {
  try {
    const response = await aiClient.get('/users/me');
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
    };
  }
};

// Update user preferences
export const updatePreferences = async (preferences) => {
  try {
    const response = await aiClient.patch('/users/me/preferences', preferences);
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
    };
  }
};

/**
 * ============================
 * UTILITY FUNCTIONS
 * ============================
 */

// Convert image URI to base64
export const imageUriToBase64 = async (uri) => {
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return base64;
  } catch (error) {
    return null;
  }
};

// Save base64 image to file
export const saveBase64Image = async (base64Data, filename = 'annotated_image.jpg') => {
  try {
    const fileUri = `${FileSystem.documentDirectory}${filename}`;
    await FileSystem.writeAsStringAsync(fileUri, base64Data, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return fileUri;
  } catch (error) {
    console.error('Error saving base64 image:', error);
    return null;
  }
};

export default {
  // Health
  checkHealth,
  
  // Sessions
  createSession,
  getSession,
  listSessions,
  deleteSession,
  getSessionMessages,
  
  // Image Analysis
  analyzeImage,
  detectOnly,
  
  // Chat
  sendChatMessage,
  sendChatWithImages,
  
  // Knowledge
  queryKnowledge,
  
  // User
  getCurrentUser,
  updatePreferences,
  
  // Utilities
  imageUriToBase64,
  saveBase64Image,
};
