import axios from 'axios';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AI_URL, API_CONFIG } from '../config/api.config';
import { API_BASE_URL } from './api';

// MOCK MODE DISABLED - Using real DeepDental API
const ENABLE_MOCK = false;

console.log('🤖 AI DIAGNOSIS SERVICE - REAL API MODE');
const AI_PROXY_URL = AI_URL || `${API_BASE_URL}/py-api/api/v1`;
console.log('   API Proxy URL:', AI_PROXY_URL);

// Request queue to prevent overwhelming the server
let requestQueue = [];
let isProcessingQueue = false;
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000; // 1 second between requests

// Create axios instance
const aiClient = axios.create({
  baseURL: AI_PROXY_URL,
  timeout: API_CONFIG.AI_TIMEOUT,
});

// Retry configuration
const MAX_RETRIES = 2;
const RETRY_DELAY = 2000; // 2 seconds
const RETRY_STATUS_CODES = [408, 429, 500, 502, 503, 504];

// Longer timeout for image analysis (first upload often slower due to cold start)
const IMAGE_ANALYSIS_TIMEOUT = 240000; // 4 minutes for image analysis
const PATIENT_ROLE = 'patient';

const normalizeMessages = (data) => {
  const messages = Array.isArray(data) ? data : (data?.messages || data?.items || []);
  return messages.map((message) => ({
    ...message,
    id: message.id || message.message_id,
    role: message.role || message.sender || 'assistant',
    actorType: message.actorType || (message.role === 'user' ? PATIENT_ROLE : message.role),
    content: message.content || message.message || message.reply || '',
    created_at: message.created_at || message.createdAt || null,
  }));
};

const normalizeAnnotatedImage = (data = {}) => {
  const visual = data.visual_findings || data.analysis?.visual_findings || {};
  return data.annotated_image_signed_url ||
    data.annotated_image_url ||
    data.annotated_image_base64 ||
    data.annotated_image ||
    visual.annotated_image_signed_url ||
    visual.annotated_image_base64 ||
    null;
};

const PATIENT_ANALYSIS_CONTEXT = [
  'Analyze this dental image for a patient-facing screening result.',
  'Use cautious language and never present the output as a definitive diagnosis.',
  'Return a complete structured response with image_quality, findings, detections, concern_level, recommendations, limitations, suggested_questions, and processing_time_ms.',
  'The limitations field is mandatory and must explain the limits of the image, modality, field of view, and AI interpretation.',
  'Use empty arrays instead of omitting array fields. Respond in Bahasa Indonesia.',
].join(' ');

const isStructuredAnalysisFailure = (error) => {
  if (error?.response?.status !== 500) return false;
  const data = error.response?.data || {};
  const detail = [
    data.detail,
    data.message,
    data.error?.code,
    data.error?.message,
  ].filter(Boolean).join(' ').toLowerCase();
  return /output[_ ]parsing|failed to parse|pydantic|schema|limitations|vision analysis/.test(detail);
};

const toPatientAnalysisPayload = (analyses, sessionId) => {
  const items = analyses.filter(Boolean);
  const detections = items.flatMap((item) => item.detections || item.visual_findings?.detections || []);
  const findings = items.flatMap((item) => item.findings || item.visual_findings?.findings || []);
  const recommendations = [...new Set(items.flatMap((item) => item.recommendations || item.visual_findings?.recommendations || []))];
  const primary = items[0] || {};
  const concernLevel = items
    .map((item) => item.concern_level || item.visual_findings?.concern_level)
    .find(Boolean) || 'low';
  const summary = findings
    .map((finding) => finding.finding || finding.description || finding.label)
    .filter(Boolean)
    .join(' ');
  const visualFindings = {
    image_quality: primary.image_quality || primary.visual_findings?.image_quality || {},
    findings,
    detections,
    concern_level: concernLevel,
    recommendations,
    limitations: primary.limitations || primary.visual_findings?.limitations || '',
    suggested_questions: primary.suggested_questions || primary.visual_findings?.suggested_questions || [],
    annotated_image_base64: normalizeAnnotatedImage(primary),
  };
  return {
    ...primary,
    session_id: sessionId,
    reply: summary || 'Analisis gambar selesai. Hasil ini merupakan skrining AI dan perlu dikonfirmasi oleh dokter gigi.',
    visual_findings: visualFindings,
    annotated_image_base64: visualFindings.annotated_image_base64,
    detections,
    findings,
    recommendations,
    concern_level: concernLevel,
  };
};

// Sleep utility
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Compress image to reduce payload size and avoid 413 errors
const compressImage = async (imageUri) => {
  try {
    if (__DEV__) console.log(`📦 Compressing image: ${imageUri}`);
    
    // Single pass compression: resize to 800x600 @ 0.6 quality
    // This typically produces 30-50KB images suitable for upload
    const manipResult = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ resize: { width: 800 } }], // Maintain aspect ratio
      { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
    );
    
    if (__DEV__) console.log(`✅ Image compressed to 800w @ 0.6 quality`);
    return manipResult.uri;
  } catch (error) {
    console.error('❌ Image compression failed:', error.message);
    return imageUri; // Fallback: use original
  }
};

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
  async (config) => {
    const accessToken = await AsyncStorage.getItem('accessToken');
    if (accessToken) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
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
      role: PATIENT_ROLE,
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
      sessionId: response.data.id || response.data.session_id || response.data.session?.id,
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
    if (!sereneUserId) {
      return { success: true, data: { sessions: [] }, sessions: [], total: 0 };
    }
    
    if (__DEV__) {
      console.log('📋 Listing sessions for Serene user:', sereneUserId || 'anonymous');
    }
    
    const response = await aiClient.get('/sessions', {
      params: { page, per_page: perPage * 5 }, // Fetch more to filter client-side
    });
    
    // Filter sessions by serene_user_id in metadata
    const allSessions = response.data.sessions || [];
    const userSessions = allSessions.filter((session) => {
      const sessionSereneUserId = session.metadata?.serene_user_id;
      return sessionSereneUserId === sereneUserId;
    });
    
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
    const response = await aiClient.get(`/sessions/${sessionId}/messages`, {
      params: { limit: 200, per_page: 200 },
    });
    const messages = normalizeMessages(response.data);
    
    if (__DEV__) {
      console.log('📨 getSessionMessages API Response:', {
        status: response.status,
        hasData: !!response.data,
        dataKeys: response.data ? Object.keys(response.data) : [],
        messagesCount: messages.length,
      });
      // Log first message structure if available
      if (messages[0]) {
        const firstMsg = messages[0];
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
      messages,
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

// Analyze the initial image through the dedicated visual-analysis endpoint.
export const analyzeImage = async ({ sessionId, imageUris, language = 'bilingual' }) => {
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
    const imageArray = Array.isArray(imageUris) ? imageUris : [imageUris];
    const analyses = [];
    const compressedImageUris = [];
    for (const imageUri of imageArray) {
      if (__DEV__) console.log('📸 Processing image for upload:', imageUri);
      const compressedUri = await compressImage(imageUri);
      compressedImageUris.push(compressedUri);
      const filename = imageUri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      const requestAnalysis = async (repair = false) => {
        const formData = new FormData();
        formData.append('image', { uri: compressedUri, name: filename, type });
        formData.append(
          'context',
          `${PATIENT_ANALYSIS_CONTEXT} Requested language: ${language}.${repair ? ' Regenerate the complete response and verify every required field.' : ''}`,
        );
        formData.append('role', PATIENT_ROLE);
        formData.append('include_annotated', 'true');
        return aiClient.post('/images/analyze', formData, {
          timeout: API_CONFIG.AI_TIMEOUT,
          headers: { Accept: 'application/json' },
        });
      };
      try {
        analyses.push((await requestAnalysis(false)).data);
      } catch (analysisError) {
        if (!isStructuredAnalysisFailure(analysisError)) throw analysisError;
        analyses.push((await requestAnalysis(true)).data);
      }
    }
    const normalized = toPatientAnalysisPayload(analyses, sessionId);
    normalized.source_image_uri = compressedImageUris[0] || imageArray[0] || null;
    const visualFindings = normalized.visual_findings;
    const annotatedImage = normalizeAnnotatedImage(normalized);

    return {
      success: true,
      data: normalized,
      findings: normalized.reply,
      imageQuality: visualFindings.image_quality || {},
      recommendations: visualFindings.recommendations || [],
      annotatedImage: annotatedImage,
      detections: visualFindings.detections || [],
      messageId: normalized.message_id || null,
    };
  } catch (error) {
    if (__DEV__) {
      console.log('❌ analyzeImage /images/analyze error payload:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
    }
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
        role: PATIENT_ROLE,
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
    formData.append('role', PATIENT_ROLE);
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

    if (__DEV__) {
      console.log('❌ sendChatWithImages error payload:', {
        status,
        data: error.response?.data,
        message: error.message,
      });
    }
    
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
      role: PATIENT_ROLE,
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
