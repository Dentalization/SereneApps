import axios from 'axios';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AI_URL, AI_API_KEY, API_CONFIG } from '../config/api.config';

// MOCK MODE DISABLED - Using real DeepDental API
const ENABLE_MOCK = false;

console.log('🤖 AI DIAGNOSIS SERVICE - REAL API MODE');
console.log('   API URL:', AI_URL);
console.log('   API Key:', AI_API_KEY ? `${AI_API_KEY.substring(0, 15)}...` : 'NOT SET');

// Request queue to prevent overwhelming the server
let requestQueue = [];
let isProcessingQueue = false;
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000; // 1 second between requests

// Create axios instance
const aiClient = axios.create({
  baseURL: AI_URL,
  timeout: API_CONFIG.AI_TIMEOUT,
  headers: {
    'X-API-Key': AI_API_KEY,
  },
});

// Retry configuration
const MAX_RETRIES = 2;
const RETRY_DELAY = 2000; // 2 seconds
const RETRY_STATUS_CODES = [408, 429, 500, 502, 503, 504];

// Longer timeout for image analysis (first upload often slower due to cold start)
const IMAGE_ANALYSIS_TIMEOUT = 240000; // 4 minutes for image analysis

// Sleep utility
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Request with retry logic
const requestWithRetry = async (config, retries = MAX_RETRIES) => {
  const startTime = Date.now();
  
  try {
    // Rate limiting - wait if last request was too recent
    const timeSinceLastRequest = Date.now() - lastRequestTime;
    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
      await sleep(MIN_REQUEST_INTERVAL - timeSinceLastRequest);
    }
    lastRequestTime = Date.now();
    
    if (__DEV__) {
      console.log(`⏱️  Request timeout: ${config.timeout ? `${config.timeout / 1000}s` : 'default'}`);
    }
    
    const response = await aiClient.request(config);
    
    const duration = Date.now() - startTime;
    if (__DEV__) {
      console.log(`✅ Request completed in ${(duration / 1000).toFixed(2)}s`);
    }
    
    return response;
  } catch (error) {
    const status = error.response?.status;
    const duration = Date.now() - startTime;
    const shouldRetry = RETRY_STATUS_CODES.includes(status) && retries > 0;
    
    if (__DEV__) {
      console.log(`❌ Request failed after ${(duration / 1000).toFixed(2)}s - Status: ${status || 'Network Error'}`);
    }
    
    if (shouldRetry) {
      const retryNumber = MAX_RETRIES - retries + 1;
      const retryDelay = RETRY_DELAY * retryNumber;
      
      if (__DEV__) {
        console.log(`🔄 Retry ${retryNumber}/${MAX_RETRIES} in ${retryDelay / 1000}s... (Status: ${status})`);
      }
      
      await sleep(retryDelay); // Exponential backoff
      return requestWithRetry(config, retries - 1);
    }
    
    throw error;
  }
};

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

/**
 * Get current Serene user ID from AsyncStorage
 * This is used to associate AI sessions with the logged-in user
 */
const getSereneUserId = async () => {
  try {
    const userStr = await AsyncStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      return user?.id?.toString() || null;
    }
    return null;
  } catch (error) {
    console.warn('Failed to get Serene user ID:', error);
    return null;
  }
};

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
    // Get current Serene user ID to associate session with user
    const sereneUserId = await getSereneUserId();
    
    if (__DEV__) {
      console.log('📝 Creating session for Serene user:', sereneUserId || 'anonymous');
    }
    
    const response = await aiClient.post('/sessions', {
      role: 'patient',
      language: 'bilingual',
      metadata: {
        source: 'mobile_app',
        serene_user_id: sereneUserId, // Associate with Serene user
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
    // Get current Serene user ID to filter sessions
    const sereneUserId = await getSereneUserId();
    
    if (__DEV__) {
      console.log('📋 Listing sessions for Serene user:', sereneUserId || 'anonymous');
    }
    
    const response = await aiClient.get('/sessions', {
      params: { page, per_page: perPage * 5 }, // Fetch more to filter client-side
    });
    
    // Filter sessions by serene_user_id in metadata
    const allSessions = response.data.sessions || [];
    const userSessions = sereneUserId 
      ? allSessions.filter(session => {
          const sessionSereneUserId = session.metadata?.serene_user_id;
          return sessionSereneUserId === sereneUserId;
        })
      : allSessions; // If no user logged in, show all (shouldn't happen normally)
    
    if (__DEV__) {
      console.log(`📋 Found ${allSessions.length} total sessions, ${userSessions.length} for current user`);
    }
    
    const normalizedSessions = userSessions.map((session) => ({
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
      total: normalizedSessions.length,
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
    
    if (__DEV__) {
      console.log('📨 getSessionMessages API Response:', {
        status: response.status,
        hasData: !!response.data,
        dataKeys: response.data ? Object.keys(response.data) : [],
        messagesCount: response.data?.messages?.length || 0,
      });
      // Log first message structure if available
      if (response.data?.messages?.[0]) {
        const firstMsg = response.data.messages[0];
        console.log('📨 First message from API:', {
          id: firstMsg.id,
          role: firstMsg.role,
          hasContent: !!firstMsg.content,
          hasImages: !!firstMsg.images,
          imagesLength: firstMsg.images?.length,
          hasMetadata: !!firstMsg.metadata,
          allKeys: Object.keys(firstMsg),
        });
      }
    }
    
    return {
      success: true,
      data: response.data,
      messages: response.data.messages || response.data || [],
    };
  } catch (error) {
    if (__DEV__) {
      console.log('❌ getSessionMessages error:', error.response?.data || error.message);
    }
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
    const response = await requestWithRetry({
      method: 'post',
      url: '/chat',
      data: {
        message,
        session_id: sessionId,
        role: 'patient',
        language: 'bilingual',
        images: images.map(img => ({
          data: img.base64,
          filename: img.filename || 'image.jpg',
        })),
      },
    });
    
    const replyContent = response.data.reply ?? response.data.content ?? '';

    return {
      success: true,
      data: response.data,
      reply: replyContent,
      messageId: response.data.message_id || null,
    };
  } catch (error) {
    const status = error.response?.status;
    let errorMessage = error.response?.data?.detail || error.message;
    
    // User-friendly error messages
    if (status === 504) {
      errorMessage = 'Server sedang sibuk. Mohon tunggu sebentar dan coba lagi.';
    } else if (status === 429) {
      errorMessage = 'Terlalu banyak permintaan. Mohon tunggu sebentar.';
    } else if (!error.response) {
      errorMessage = 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.';
    }
    
    return {
      success: false,
      error: errorMessage,
      statusCode: status,
    };
  }
};

// Send chat with image upload (multipart)
export const sendChatWithImages = async (message, sessionId, imageUris = []) => {
  try {
    const formData = new FormData();
    
    // Ensure message is always a valid string
    const messageText = typeof message === 'string' && message.trim() ? message.trim() : 'Ini foto gigi saya.';
    
    formData.append('message', messageText);
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

    const response = await requestWithRetry({
      method: 'post',
      url: '/chat/upload',
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: IMAGE_ANALYSIS_TIMEOUT, // Use longer timeout for image upload
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
    const status = error.response?.status;
    let errorMessage = error.response?.data?.detail || error.message;
    
    // User-friendly error messages for image upload
    if (status === 504) {
      errorMessage = 'Proses analisis memakan waktu lebih lama. Coba kirim ulang atau tunggu beberapa saat.';
    } else if (status === 413) {
      errorMessage = 'Ukuran gambar terlalu besar. Coba gunakan gambar dengan ukuran lebih kecil.';
    } else if (status === 429) {
      errorMessage = 'Terlalu banyak permintaan. Mohon tunggu sebentar.';
    } else if (!error.response) {
      errorMessage = 'Tidak dapat mengirim gambar. Periksa koneksi internet Anda.';
    }
    
    return {
      success: false,
      error: errorMessage,
      statusCode: status,
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
