import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useAuth } from '../../../contexts/AuthContext';
import Icon from '../../../components/AppIcon';
import SideBar from '../ui/SideBar';

const MIN_BOOT_MS = 900;

// Severity color mapping
const SEVERITY_COLORS = {
  minimal: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  mild: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  moderate: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  severe: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

// Confidence badge colors
const CONFIDENCE_COLORS = {
  low: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  medium: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  high: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
};

const AIAnalysisPage = () => {
  const { t } = useLanguage();
  const { user } = useAuth();

  // State management
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [systemHealth, setSystemHealth] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [sessionHistory, setSessionHistory] = useState([]);
  const [showSessionHistory, setShowSessionHistory] = useState(false);
  const [userPreferences, setUserPreferences] = useState({ role: 'dentist', language: 'bilingual' });
  const [annotatedImageModal, setAnnotatedImageModal] = useState(null);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);

  // Refs
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const bootstrapTimerRef = useRef(null);

  // API configuration - DeepDental API
  const API_BASE_URL = import.meta.env.VITE_SERENE_AI_API_BASE_URL || 'https://api.dentalization.id';
  const API_VERSION = import.meta.env.VITE_SERENE_AI_API_VERSION || 'v1';
  const API_KEY = import.meta.env.VITE_DEEPDENTAL_API_KEY || '';

  // Common headers for all API calls
  const getHeaders = useCallback((contentType = 'application/json') => {
    const headers = {
      'X-API-Key': API_KEY,
    };
    if (contentType) {
      headers['Content-Type'] = contentType;
    }
    return headers;
  }, [API_KEY]);

  // Initialize session on component mount
  useEffect(() => {
    let isMounted = true;
    const start = Date.now();
    const initialize = async () => {
      try {
        await Promise.all([
          checkSystemHealth(),
          createSession(),
          fetchUserPreferences(),
          fetchSessionHistory(),
        ]);
      } finally {
        const finalize = () => {
          if (isMounted) {
            setBootstrapping(false);
            bootstrapTimerRef.current = null;
          }
        };
        const elapsed = Date.now() - start;
        const remaining = MIN_BOOT_MS - elapsed;
        if (remaining > 0) {
          bootstrapTimerRef.current = setTimeout(finalize, remaining);
        } else {
          finalize();
        }
      }
    };
    initialize();
    return () => {
      isMounted = false;
      if (bootstrapTimerRef.current) {
        clearTimeout(bootstrapTimerRef.current);
        bootstrapTimerRef.current = null;
      }
    };
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch user preferences from API
  const fetchUserPreferences = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/${API_VERSION}/users/me`, {
        headers: getHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        setUserPreferences({
          role: data.default_role || 'dentist',
          language: data.language_preference || 'bilingual',
        });
      }
    } catch (error) {
      console.error('Error fetching user preferences:', error);
    }
  };

  // Update user preferences
  const updateUserPreferences = async (prefs) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/${API_VERSION}/users/me/preferences`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({
          default_role: prefs.role,
          language_preference: prefs.language,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        setUserPreferences({
          role: data.default_role,
          language: data.language_preference,
        });
      }
    } catch (error) {
      console.error('Error updating preferences:', error);
    }
  };

  // Fetch session history
  const fetchSessionHistory = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/${API_VERSION}/sessions?page=1&per_page=10`, {
        headers: getHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        setSessionHistory(data.sessions || []);
      }
    } catch (error) {
      console.error('Error fetching session history:', error);
    }
  };

  // Load a previous session
  const loadSession = async (session) => {
    try {
      setSessionId(session.id);
      setShowSessionHistory(false);
      
      // Fetch messages for this session
      const response = await fetch(`${API_BASE_URL}/api/${API_VERSION}/sessions/${session.id}/messages`, {
        headers: getHeaders(),
      });
      
      if (response.ok) {
        const data = await response.json();
        const formattedMessages = data.messages.map(msg => ({
          id: msg.id,
          type: msg.role === 'user' ? 'user' : 'ai',
          content: msg.content,
          timestamp: msg.created_at,
          images: msg.images,
          sources: msg.sources,
          visualFindings: msg.visual_findings,
        }));
        setMessages(formattedMessages);
      }
    } catch (error) {
      console.error('Error loading session:', error);
    }
  };

  // Delete a session
  const deleteSession = async (sessionIdToDelete) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/${API_VERSION}/sessions/${sessionIdToDelete}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      
      if (response.ok) {
        setSessionHistory(prev => prev.filter(s => s.id !== sessionIdToDelete));
        if (sessionId === sessionIdToDelete) {
          await createSession();
        }
      }
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  };

  // Check system health
  const checkSystemHealth = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/${API_VERSION}/health`);
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      const data = await response.json();
      setSystemHealth(data);
      
      if (data.status === 'healthy') {
        const systemMessage = {
          id: Date.now(),
          type: 'system',
          content: '🤖 DeepDental AI siap membantu diagnosis dental Anda!',
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, systemMessage]);
        
        // Check component status
        if (data.components) {
          const offlineComponents = Object.entries(data.components)
            .filter(([, comp]) => comp.status !== 'up')
            .map(([name]) => name);
          
          if (offlineComponents.length > 0) {
            const warningMessage = {
              id: Date.now() + 1,
              type: 'system',
              content: `⚠️ Beberapa komponen offline: ${offlineComponents.join(', ')}`,
              timestamp: new Date().toISOString(),
            };
            setMessages(prev => [...prev, warningMessage]);
          }
        }
      }
    } catch (error) {
      console.error('Health check failed:', error);
      setSystemHealth({ status: 'error', message: error.message });
      const errorMessage = {
        id: Date.now(),
        type: 'system',
        content: `⚠️ Tidak dapat terhubung ke DeepDental AI. Silakan periksa koneksi.`,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  // Create a new chat session
  const createSession = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/${API_VERSION}/sessions`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          role: userPreferences.role,
          language: userPreferences.language,
          metadata: {
            clinic_id: user?.clinicId,
            dentist_name: user?.name,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSessionId(data.id);
        console.log('Session created:', data.id);
        // Refresh session history
        await fetchSessionHistory();
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error creating session:', error);
    }
  };

  // Convert file to base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
    });
  };

  // Upload image and get base64
  const uploadImage = async (file) => {
    try {
      setIsUploading(true);
      
      const base64Data = await fileToBase64(file);
      
      const imageData = {
        id: `img_${Date.now()}`,
        name: file.name,
        url: URL.createObjectURL(file),
        base64: base64Data,
        uploadTime: new Date().toISOString(),
        file: file,
      };

      setUploadedImages(prev => [imageData, ...prev]);
      setSelectedImage(imageData);
      return imageData;
    } catch (error) {
      console.error('Error processing image:', error);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  // Analyze image only (without chat) - POST /api/v1/images/analyze
  const analyzeImage = async (imageData, context = '') => {
    try {
      setIsAnalyzingImage(true);
      
      const formData = new FormData();
      formData.append('image', imageData.file);
      formData.append('context', context);
      formData.append('role', userPreferences.role);
      formData.append('include_annotated', 'true');

      const response = await fetch(`${API_BASE_URL}/api/${API_VERSION}/images/analyze`, {
        method: 'POST',
        headers: {
          'X-API-Key': API_KEY,
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        return data;
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error analyzing image:', error);
      return null;
    } finally {
      setIsAnalyzingImage(false);
    }
  };

  // Quick detect only (YOLO) - POST /api/v1/images/detect
  const detectImage = async (imageData) => {
    try {
      const formData = new FormData();
      formData.append('image', imageData.file);
      formData.append('include_annotated', 'true');

      const response = await fetch(`${API_BASE_URL}/api/${API_VERSION}/images/detect`, {
        method: 'POST',
        headers: {
          'X-API-Key': API_KEY,
        },
        body: formData,
      });

      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('Error detecting:', error);
      return null;
    }
  };

  // Query knowledge base - POST /api/v1/knowledge/query
  const queryKnowledge = async (question) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/${API_VERSION}/knowledge/query`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          question,
          role: userPreferences.role,
          k: 4,
        }),
      });

      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('Error querying knowledge:', error);
      return null;
    }
  };

  // Send message to AI - POST /api/v1/chat
  const sendMessage = async (message, image = null) => {
    if (!sessionId || (!message.trim() && !image)) return;

    try {
      setIsLoading(true);
      
      // Add user message to chat
      const userMessage = {
        id: Date.now(),
        type: 'user',
        content: message,
        timestamp: new Date().toISOString(),
        image,
      };
      setMessages(prev => [...prev, userMessage]);

      // Build request body according to API spec
      const requestBody = {
        message: message,
        session_id: sessionId,
        role: userPreferences.role,
        language: userPreferences.language,
      };

      // Add images if present (base64 encoded)
      if (image?.base64) {
        requestBody.images = [{
          data: image.base64,
          filename: image.name,
        }];
      }

      const response = await fetch(`${API_BASE_URL}/api/${API_VERSION}/chat`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('💬 Chat response:', data);
        
        // Build AI message with all response data
        const aiMessage = {
          id: data.message_id || Date.now() + 1,
          type: 'ai',
          content: data.content,
          timestamp: new Date().toISOString(),
          sources: data.sources || [],
          visualFindings: data.visual_findings,
          suggestedQuestions: data.suggested_questions || [],
        };
        setMessages(prev => [...prev, aiMessage]);
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        id: Date.now() + 1,
        type: 'error',
        content: `❌ ${error.message || t('ai.analysisError')}`,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Send message with file upload - POST /api/v1/chat/upload
  const sendMessageWithUpload = async (message, imageFile) => {
    if (!sessionId) return;

    try {
      setIsLoading(true);
      
      const formData = new FormData();
      formData.append('message', message);
      formData.append('session_id', sessionId);
      formData.append('role', userPreferences.role);
      formData.append('language', userPreferences.language);
      if (imageFile) {
        formData.append('images', imageFile);
      }

      // Add user message to chat
      const userMessage = {
        id: Date.now(),
        type: 'user',
        content: message,
        timestamp: new Date().toISOString(),
        image: imageFile ? { name: imageFile.name, url: URL.createObjectURL(imageFile) } : null,
      };
      setMessages(prev => [...prev, userMessage]);

      const response = await fetch(`${API_BASE_URL}/api/${API_VERSION}/chat/upload`, {
        method: 'POST',
        headers: {
          'X-API-Key': API_KEY,
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        
        const aiMessage = {
          id: data.message_id || Date.now() + 1,
          type: 'ai',
          content: data.content,
          timestamp: new Date().toISOString(),
          sources: data.sources || [],
          visualFindings: data.visual_findings,
          suggestedQuestions: data.suggested_questions || [],
        };
        setMessages(prev => [...prev, aiMessage]);
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('Error sending message with upload:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputMessage.trim() || selectedImage) {
      sendMessage(inputMessage, selectedImage);
      setInputMessage('');
      setSelectedImage(null);
    }
  };

  // Handle suggested question click
  const handleSuggestedQuestion = (question) => {
    setInputMessage(question);
  };

  // Handle quick image analysis
  const handleQuickAnalysis = async () => {
    if (!selectedImage) return;
    
    const result = await analyzeImage(selectedImage, 'Full dental analysis');
    if (result) {
      const analysisMessage = {
        id: Date.now(),
        type: 'ai',
        content: 'Berikut hasil analisis gambar dental:',
        timestamp: new Date().toISOString(),
        visualFindings: result,
        suggestedQuestions: result.suggested_questions || [],
      };
      setMessages(prev => [...prev, analysisMessage]);
    }
  };

  // Handle quick detect (YOLO only)
  const handleQuickDetect = async () => {
    if (!selectedImage) return;
    
    const result = await detectImage(selectedImage);
    if (result) {
      const detectMessage = {
        id: Date.now(),
        type: 'ai',
        content: `Deteksi selesai dalam ${result.processing_time_ms}ms. Ditemukan ${result.detections?.length || 0} temuan.`,
        timestamp: new Date().toISOString(),
        visualFindings: {
          detections: result.detections,
          annotated_image_base64: result.annotated_image_base64,
        },
      };
      setMessages(prev => [...prev, detectMessage]);
    }
  };

  // Handle file selection
  const handleFileSelect = async (files) => {
    const fileList = Array.from(files);
    for (const file of fileList) {
      if (file.type.startsWith('image/')) {
        await uploadImage(file);
      }
    }
  };

  // Handle drag and drop
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  // Quick action buttons for common analysis requests
  const quickActions = [
    {
      label: t('ai.analyzeImage') || 'Analyze Image',
      icon: 'Search',
      message: t('ai.analyzeImageMessage') || 'Please analyze this dental image and identify any pathologies.',
      action: 'chat',
    },
    {
      label: t('ai.identifyConditions') || 'Identify Conditions',
      icon: 'Eye',
      message: t('ai.identifyConditionsMessage') || 'What dental conditions can you identify in this image?',
      action: 'chat',
    },
    {
      label: t('ai.treatmentRecommendations') || 'Treatment Plan',
      icon: 'Stethoscope',
      message: t('ai.treatmentMessage') || 'Based on your findings, what treatment options would you recommend?',
      action: 'chat',
    },
    {
      label: t('ai.riskAssessmentAction') || 'Risk Assessment',
      icon: 'AlertTriangle',
      message: t('ai.riskMessage') || 'Please assess the risk level and urgency of treatment needed.',
      action: 'chat',
    },
    {
      label: 'Quick Detect',
      icon: 'Zap',
      message: '',
      action: 'detect',
    },
    {
      label: 'Full Analysis',
      icon: 'Microscope',
      message: '',
      action: 'analyze',
    },
  ];

  const handleQuickAction = async (action) => {
    if (action.action === 'detect' && selectedImage) {
      await handleQuickDetect();
    } else if (action.action === 'analyze' && selectedImage) {
      await handleQuickAnalysis();
    } else if (selectedImage) {
      sendMessage(action.message, selectedImage);
      setInputMessage('');
      setSelectedImage(null);
    } else {
      setInputMessage(action.message);
    }
  };

  const formatRelativeTime = (value) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    const diff = Date.now() - date.getTime();
    if (diff < 60 * 1000) return 'just now';
    const minutes = Math.floor(diff / (60 * 1000));
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  const aiResponses = useMemo(
    () => messages.filter((message) => message.type === 'ai'),
    [messages]
  );
  const latestAIResponse = aiResponses.length ? aiResponses[aiResponses.length - 1] : null;

  const sessionStats = [
    { label: 'Total messages', value: messages.length },
    { label: 'Images uploaded', value: uploadedImages.length },
    { label: 'AI insights', value: aiResponses.length },
    { label: 'Last response', value: formatRelativeTime(latestAIResponse?.timestamp) }
  ];

  const knowledgeHighlights = [
    {
      icon: 'Scan',
      title: 'Imaging quality tips',
      description: 'Capture occlusal and periapical views with ≥ 150 dpi resolution before requesting AI review.'
    },
    {
      icon: 'ClipboardCheck',
      title: 'Triaging workflow',
      description: 'Use AI findings to categorize cases into urgent, follow-up, or routine before handing off to staff.'
    },
    {
      icon: 'FileText',
      title: 'Documentation assist',
      description: 'Let Serene AI draft SOAP notes, ICD-10 codes, or insurance narratives directly from chat context.'
    }
  ];

  const openFilePicker = () => fileInputRef.current?.click();

  const handleNewSession = async () => {
    setMessages([]);
    setUploadedImages([]);
    setSelectedImage(null);
    await createSession();
  };

  // Render Visual Findings Component
  const VisualFindingsCard = ({ findings }) => {
    if (!findings) return null;

    return (
      <div className="mt-4 space-y-4">
        {/* Image Quality Badge */}
        {findings.image_quality && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-secondary">Image Quality:</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              findings.image_quality === 'good' ? 'bg-emerald-100 text-emerald-700' :
              findings.image_quality === 'fair' ? 'bg-amber-100 text-amber-700' :
              'bg-red-100 text-red-700'
            }`}>
              {findings.image_quality}
            </span>
          </div>
        )}

        {/* Concern Level */}
        {findings.concern_level && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-secondary">Concern Level:</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${SEVERITY_COLORS[findings.concern_level] || SEVERITY_COLORS.moderate}`}>
              {findings.concern_level}
            </span>
          </div>
        )}

        {/* Annotated Image */}
        {findings.annotated_image_base64 && (
          <div className="mt-3">
            <p className="text-xs font-medium text-secondary mb-2">Annotated Image:</p>
            <button
              type="button"
              onClick={() => setAnnotatedImageModal(findings.annotated_image_base64)}
              className="relative group"
            >
              <img
                src={`data:image/png;base64,${findings.annotated_image_base64}`}
                alt="Annotated dental analysis"
                className="max-w-full h-auto rounded-xl border border-primary/20 cursor-pointer hover:border-accent transition-colors"
                style={{ maxHeight: '300px' }}
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-xl flex items-center justify-center transition-all">
                <Icon name="Maximize2" size={24} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </button>
          </div>
        )}

        {/* Detections */}
        {findings.detections && findings.detections.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-medium text-secondary mb-2">Detections ({findings.detections.length}):</p>
            <div className="space-y-2">
              {findings.detections.map((detection, idx) => (
                <div key={idx} className="flex items-center gap-3 p-2 rounded-lg bg-surface border border-primary/10">
                  <span className="w-6 h-6 rounded-full bg-accent text-white text-xs font-bold flex items-center justify-center">
                    {detection.mark_id || idx + 1}
                  </span>
                  <div className="flex-1">
                    <span className="text-sm font-medium text-primary capitalize">{detection.label}</span>
                    <span className="text-xs text-secondary ml-2">
                      ({(detection.confidence * 100).toFixed(1)}% confidence)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Detailed Findings */}
        {findings.findings && findings.findings.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-medium text-secondary mb-2">Detailed Findings:</p>
            <div className="space-y-3">
              {findings.findings.map((finding, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-surface border border-primary/10">
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-accent text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      {finding.mark_id || idx + 1}
                    </span>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-primary">{finding.location}</span>
                        {finding.severity && (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${SEVERITY_COLORS[finding.severity]}`}>
                            {finding.severity}
                          </span>
                        )}
                        {finding.confidence && (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CONFIDENCE_COLORS[finding.confidence]}`}>
                            {finding.confidence} confidence
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-secondary">{finding.description}</p>
                      {finding.differentials && finding.differentials.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-muted">Differentials:</span>
                          {finding.differentials.map((diff, i) => (
                            <span key={i} className="px-2 py-0.5 rounded-full text-xs bg-surface-elevated border border-primary/10 text-secondary">
                              {diff}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {findings.recommendations && findings.recommendations.length > 0 && (
          <div className="mt-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-2 flex items-center gap-2">
              <Icon name="Lightbulb" size={14} />
              Recommendations
            </p>
            <ul className="space-y-1">
              {findings.recommendations.map((rec, idx) => (
                <li key={idx} className="text-sm text-blue-700 dark:text-blue-300 flex items-start gap-2">
                  <span className="text-blue-500">•</span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Limitations */}
        {findings.limitations && (
          <div className="mt-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <p className="text-xs text-amber-700 dark:text-amber-400 flex items-center gap-2">
              <Icon name="AlertCircle" size={12} />
              {findings.limitations}
            </p>
          </div>
        )}

        {/* Processing Time */}
        {findings.processing_time_ms && (
          <p className="text-xs text-muted">
            Processing time: {findings.processing_time_ms}ms
          </p>
        )}
      </div>
    );
  };

  // Render Sources/Citations Component
  const SourcesCitations = ({ sources }) => {
    if (!sources || sources.length === 0) return null;

    return (
      <div className="mt-4 p-3 rounded-xl bg-surface-elevated border border-primary/10">
        <p className="text-xs font-semibold text-primary mb-2 flex items-center gap-2">
          <Icon name="BookOpen" size={14} className="text-accent" />
          Sources & Citations
        </p>
        <div className="space-y-2">
          {sources.map((source, idx) => (
            <div key={idx} className="flex items-start gap-2 text-xs">
              <span className="w-5 h-5 rounded-full bg-accent/10 text-accent text-xs font-bold flex items-center justify-center flex-shrink-0">
                {source.citation_number || idx + 1}
              </span>
              <div className="flex-1">
                <p className="font-medium text-primary">{source.source}</p>
                {source.page && <p className="text-muted">Page {source.page}</p>}
                {source.excerpt && (
                  <p className="text-secondary italic mt-1 line-clamp-2">"{source.excerpt}"</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Suggested Questions Component
  const SuggestedQuestions = ({ questions, onSelect }) => {
    if (!questions || questions.length === 0) return null;

    return (
      <div className="mt-4">
        <p className="text-xs font-medium text-secondary mb-2">Suggested follow-up questions:</p>
        <div className="flex flex-wrap gap-2">
          {questions.map((question, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onSelect(question)}
              className="px-3 py-1.5 text-xs rounded-full bg-accent/10 text-accent hover:bg-accent/20 transition-colors border border-accent/20"
            >
              {question}
            </button>
          ))}
        </div>
      </div>
    );
  };

  if (bootstrapping) {
    const promptSkeletons = Array.from({ length: 4 });
    const assetSkeletons = Array.from({ length: 4 });
    const messageSkeletons = Array.from({ length: 5 });
    const statsSkeletons = Array.from({ length: 4 });
    const knowledgeSkeletons = Array.from({ length: 3 });

    return (
      <div className="flex min-h-screen bg-gradient-to-br from-background via-surface to-background theme-transition dentist-skeleton">
        <div className="flex-shrink-0" style={{ width: 'var(--sidebar-width, 20rem)' }}>
          <SideBar />
        </div>

        <div className="flex-1 min-w-0 flex flex-col">
          <header className="px-6 py-6 border-b border-primary/20 bg-surface-elevated skeleton-surface">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="space-y-3">
                <div className="h-3 w-32 rounded bg-accent/10 animate-pulse"></div>
                <div className="h-7 w-72 rounded-lg bg-accent/20 animate-pulse"></div>
                <div className="h-4 w-96 max-w-full rounded bg-accent/10 animate-pulse"></div>
                <div className="h-3 w-48 rounded bg-accent/10 animate-pulse"></div>
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="h-10 w-40 rounded-xl bg-accent/10 animate-pulse"></div>
                <div className="h-10 w-44 rounded-xl bg-accent/20 animate-pulse"></div>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)_320px]">
              <aside className="space-y-6">
                <div className="bg-surface-elevated border border-primary/15 rounded-3xl shadow-theme-lg p-5 skeleton-surface">
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-4 w-32 rounded bg-accent/10 animate-pulse"></div>
                    <div className="h-8 w-8 rounded-xl bg-accent/10 animate-pulse"></div>
                  </div>
                  <div className="space-y-2">
                    {promptSkeletons.map((_, idx) => (
                      <div key={idx} className="h-12 rounded-xl border border-primary/15 bg-surface animate-pulse"></div>
                    ))}
                  </div>
                </div>

                <div className="bg-surface-elevated border border-primary/15 rounded-3xl shadow-theme-lg p-5 skeleton-surface">
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-4 w-32 rounded bg-accent/10 animate-pulse"></div>
                    <div className="h-8 w-8 rounded-xl bg-accent/10 animate-pulse"></div>
                  </div>
                  <div className="space-y-3">
                    {assetSkeletons.slice(0, 3).map((_, idx) => (
                      <div key={idx} className="h-16 rounded-xl border border-primary/15 bg-surface animate-pulse"></div>
                    ))}
                    <div className="h-12 rounded-2xl border border-dashed border-primary/20 bg-surface animate-pulse"></div>
                  </div>
                </div>
              </aside>

              <section className="bg-surface-elevated border border-primary/15 rounded-3xl shadow-theme-lg skeleton-surface flex flex-col min-h-[520px]">
                <div className="px-6 py-4 border-b border-primary/15 flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="h-4 w-40 rounded bg-accent/10 animate-pulse"></div>
                    <div className="h-3 w-32 rounded bg-accent/10 animate-pulse"></div>
                  </div>
                  <div className="h-6 w-24 rounded-full bg-accent/10 animate-pulse"></div>
                </div>

                <div className="flex-1 overflow-hidden px-6 py-6 space-y-4">
                  {messageSkeletons.map((_, idx) => (
                    <div key={idx} className={`flex ${idx % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                      <div className="w-full max-w-2xl p-4 rounded-2xl border border-primary/15 bg-surface animate-pulse">
                        <div className="space-y-2">
                          <div className="h-4 w-5/6 rounded bg-accent/10"></div>
                          <div className="h-4 w-2/3 rounded bg-accent/10"></div>
                          <div className="h-4 w-1/2 rounded bg-accent/10"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-start">
                    <div className="h-8 w-40 rounded-full bg-accent/10 animate-pulse"></div>
                  </div>
                </div>

                <div className="border-t border-primary/15 px-6 py-5 bg-surface">
                  <div className="mb-4 p-3 rounded-xl border border-primary/15 bg-surface-elevated flex items-center gap-3">
                    <div className="w-14 h-14 rounded-lg bg-accent/10 animate-pulse"></div>
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="h-4 w-32 rounded bg-accent/10 animate-pulse"></div>
                      <div className="h-3 w-24 rounded bg-accent/10 animate-pulse"></div>
                    </div>
                    <div className="h-8 w-8 rounded-lg bg-accent/10 animate-pulse"></div>
                  </div>
                  <div className="flex items-end gap-3">
                    <div className="h-12 w-12 rounded-xl border border-primary/20 bg-surface animate-pulse"></div>
                    <div className="flex-1 h-12 rounded-xl border border-primary/20 bg-surface animate-pulse"></div>
                    <div className="h-12 w-12 rounded-xl bg-accent/20 animate-pulse"></div>
                  </div>
                </div>
              </section>

              <aside className="space-y-6">
                <div className="bg-surface-elevated border border-primary/15 rounded-3xl shadow-theme-lg p-5 skeleton-surface">
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-4 w-32 rounded bg-accent/10 animate-pulse"></div>
                    <div className="h-6 w-20 rounded-full bg-accent/10 animate-pulse"></div>
                  </div>
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, idx) => (
                      <div key={idx} className="h-12 rounded-xl border border-primary/15 bg-surface animate-pulse"></div>
                    ))}
                  </div>
                </div>

                <div className="bg-surface-elevated border border-primary/15 rounded-3xl shadow-theme-lg p-5 skeleton-surface">
                  <div className="h-4 w-32 rounded bg-accent/10 animate-pulse mb-4"></div>
                  <div className="grid grid-cols-2 gap-3">
                    {statsSkeletons.map((_, idx) => (
                      <div key={idx} className="h-16 rounded-2xl border border-primary/15 bg-surface animate-pulse"></div>
                    ))}
                  </div>
                </div>

                <div className="bg-surface-elevated border border-primary/15 rounded-3xl shadow-theme-lg p-5 skeleton-surface">
                  <div className="h-4 w-32 rounded bg-accent/10 animate-pulse mb-4"></div>
                  <div className="space-y-3">
                    {knowledgeSkeletons.map((_, idx) => (
                      <div key={idx} className="flex items-center gap-3 rounded-xl border border-primary/15 bg-surface px-3 py-3">
                        <div className="w-10 h-10 rounded-lg bg-accent/10 animate-pulse"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 w-32 rounded bg-accent/10 animate-pulse"></div>
                          <div className="h-3 w-48 rounded bg-accent/10 animate-pulse"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-background via-surface to-background theme-transition">
      {/* Annotated Image Modal */}
      {annotatedImageModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setAnnotatedImageModal(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-auto">
            <button
              type="button"
              onClick={() => setAnnotatedImageModal(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            >
              <Icon name="X" size={24} />
            </button>
            <img
              src={`data:image/png;base64,${annotatedImageModal}`}
              alt="Annotated dental analysis (full size)"
              className="max-w-full h-auto rounded-lg"
            />
          </div>
        </div>
      )}

      {/* Session History Modal */}
      {showSessionHistory && (
        <div 
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setShowSessionHistory(false)}
        >
          <div 
            className="bg-surface-elevated rounded-3xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-primary/15 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-primary">Session History</h2>
              <button
                type="button"
                onClick={() => setShowSessionHistory(false)}
                className="p-2 rounded-lg text-muted hover:text-primary hover:bg-accent/10 transition-colors"
              >
                <Icon name="X" size={20} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {sessionHistory.length === 0 ? (
                <p className="text-sm text-secondary text-center py-8">No previous sessions found.</p>
              ) : (
                <div className="space-y-2">
                  {sessionHistory.map((session) => (
                    <div
                      key={session.id}
                      className={`p-4 rounded-xl border transition-all cursor-pointer ${
                        session.id === sessionId
                          ? 'border-accent bg-accent/10'
                          : 'border-primary/15 hover:border-accent/40 hover:bg-accent/5'
                      }`}
                      onClick={() => loadSession(session)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-primary">
                            Session {session.id.slice(0, 8)}...
                          </p>
                          <p className="text-xs text-secondary">
                            {session.message_count} messages • {formatRelativeTime(session.created_at)}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="px-2 py-0.5 rounded-full text-xs bg-accent/10 text-accent">
                              {session.role}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-xs bg-surface border border-primary/10 text-secondary">
                              {session.language}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSession(session.id);
                          }}
                          className="p-2 rounded-lg text-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <Icon name="Trash2" size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex-shrink-0" style={{ width: 'var(--sidebar-width, 20rem)' }}>
        <SideBar />
      </div>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="px-6 py-6 border-b border-primary/20 bg-surface-elevated theme-transition">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.24em] text-muted">
                {t('ai.workspaceBadge') || 'DeepDental AI • CDSS'}
              </p>
              <h1 className="text-3xl font-semibold text-primary theme-transition">
                {t('ai.title')}
              </h1>
              <p className="text-sm text-secondary max-w-2xl">
                {t('ai.subtitle') || 'AI-powered dental diagnosis assistant dengan computer vision dan clinical decision support.'}
              </p>
              <div className="flex items-center gap-4 text-xs text-muted">
                <span>
                  Session: <span className="font-mono text-primary">{sessionId?.slice(0, 8) || '—'}...</span>
                </span>
                <span>•</span>
                <span>
                  Role: <span className="font-semibold text-accent capitalize">{userPreferences.role}</span>
                </span>
                <span>•</span>
                <span>
                  {user?.name || 'Dentist'}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setShowSessionHistory(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-primary/20 text-primary hover:border-accent/40 hover:text-accent transition-colors duration-200"
              >
                <Icon name="History" size={16} />
                <span>History</span>
              </button>
              <button
                type="button"
                onClick={checkSystemHealth}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-primary/20 text-primary hover:border-accent/40 hover:text-accent transition-colors duration-200"
              >
                <Icon name="Activity" size={16} />
                <span>{t('ai.checkHealth') || 'Health Check'}</span>
              </button>
              <button
                type="button"
                onClick={handleNewSession}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-white hover:bg-accent-hover transition-colors duration-200"
              >
                <Icon name="Plus" size={16} />
                <span>{t('ai.newSession') || 'New Session'}</span>
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-6 space-y-6">
            <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)_320px]">
              <aside className="space-y-6">
                {/* Quick Actions Panel */}
                <div className="bg-surface-elevated border border-primary/15 rounded-3xl shadow-theme-lg p-5 theme-transition">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-sm font-semibold uppercase tracking-wide text-primary">
                        Quick Actions
                      </h2>
                      <p className="text-xs text-secondary">
                        {selectedImage ? 'Select action for attached image' : 'Structured prompts for analysis'}
                      </p>
                    </div>
                    <div className="p-2 rounded-lg bg-accent/10 text-accent">
                      <Icon name="Sparkles" size={16} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    {quickActions.filter(a => a.action === 'chat').map((action, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleQuickAction(action)}
                        disabled={isLoading}
                        className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-primary/15 text-left bg-surface hover:border-accent/40 hover:bg-accent/5 transition-all duration-200 disabled:opacity-50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-accent/10 text-accent">
                            <Icon name={action.icon} size={16} />
                          </div>
                          <span className="text-sm font-medium text-primary">{action.label}</span>
                        </div>
                        <Icon name="ArrowUpRight" size={16} className="text-muted" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Knowledge Query Panel */}
                <div className="bg-surface-elevated border border-primary/15 rounded-3xl shadow-theme-lg p-5 theme-transition">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-sm font-semibold uppercase tracking-wide text-primary">
                        Knowledge Base
                      </h2>
                      <p className="text-xs text-secondary">
                        Query dental knowledge directly
                      </p>
                    </div>
                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                      <Icon name="BookOpen" size={16} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    {[
                      { q: 'What are treatment options for periapical abscess?', label: 'Periapical Abscess' },
                      { q: 'Differential diagnosis for tooth sensitivity', label: 'Tooth Sensitivity' },
                      { q: 'Best practices for root canal treatment', label: 'RCT Protocol' },
                    ].map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setInputMessage(item.q)}
                        className="w-full text-left px-3 py-2 rounded-lg border border-primary/10 bg-surface hover:border-blue-400/40 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-xs text-secondary hover:text-primary"
                      >
                        📚 {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Uploaded Assets Panel */}
                <div className="bg-surface-elevated border border-primary/15 rounded-3xl shadow-theme-lg p-5 theme-transition">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-sm font-semibold uppercase tracking-wide text-primary">
                        Uploaded Images
                      </h2>
                      <p className="text-xs text-secondary">
                        {uploadedImages.length} image{uploadedImages.length !== 1 ? 's' : ''} ready
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={openFilePicker}
                      className="p-2 rounded-lg border border-primary/15 text-muted hover:text-primary hover:border-accent/40 transition-colors duration-200"
                    >
                      <Icon name="Upload" size={16} />
                    </button>
                  </div>

                  {uploadedImages.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-primary/20 bg-surface p-4 text-center text-xs text-muted">
                      Drag intraoral imaging or CBCT slices here to jumpstart AI analysis.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {uploadedImages.slice(0, 6).map((image) => (
                        <button
                          key={image.id}
                          type="button"
                          onClick={() => setSelectedImage(image)}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl border transition-all duration-200 ${
                            selectedImage?.id === image.id
                              ? 'border-accent bg-accent/10 text-accent'
                              : 'border-primary/15 hover:border-accent/40 hover:bg-accent/5'
                          }`}
                        >
                          <div className="w-12 h-12 rounded-lg overflow-hidden bg-accent/10 flex items-center justify-center">
                            <img src={image.url} alt={image.name} className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1 min-w-0 text-left">
                            <p className="text-sm font-medium truncate">{image.name}</p>
                            <p className="text-xs text-muted">
                              Uploaded {formatRelativeTime(image.uploadTime)}
                            </p>
                          </div>
                          <Icon name="ChevronRight" size={16} className="text-muted" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </aside>

              <section
                className="relative bg-surface-elevated border border-primary/15 rounded-3xl shadow-theme-lg theme-transition flex flex-col min-h-[520px]"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                {isDragOver && (
                  <div className="absolute inset-0 z-30 bg-accent/10 border-2 border-dashed border-accent rounded-3xl flex items-center justify-center">
                    <div className="text-center space-y-2">
                      <Icon name="Upload" size={36} className="text-accent mx-auto" />
                      <p className="text-sm font-medium text-accent">{t('ai.dragDropText')}</p>
                      <p className="text-xs text-accent/80">Release to attach imaging to this session</p>
                    </div>
                  </div>
                )}

                <div className="px-6 py-4 border-b border-primary/15 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-primary uppercase tracking-wide">
                      DeepDental CDSS
                    </h2>
                    <p className="text-xs text-secondary">
                      {messages.length} messages • {uploadedImages.length} images • Role: {userPreferences.role}
                    </p>
                  </div>
                  <div className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    systemHealth?.status === 'healthy'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                  }`}>
                    {systemHealth?.status === 'healthy' ? 'Online' : 'Limited'}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
                  {messages.length === 0 && (
                    <div className="rounded-3xl border border-dashed border-primary/20 bg-surface p-8 text-center space-y-4">
                      <div className="w-14 h-14 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto">
                        <Icon name="MessageCircle" size={24} className="text-accent" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-lg font-semibold text-primary">
                          {t('ai.welcomeMessage')}
                        </h3>
                        <p className="text-sm text-secondary max-w-lg mx-auto">
                          {t('ai.welcomeSubtitle')}
                        </p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto">
                        {quickActions.map((action, index) => (
                          <button
                            key={index}
                            onClick={() => handleQuickAction(action)}
                            type="button"
                            className="p-3 rounded-xl border border-primary/15 bg-surface hover:border-accent/40 hover:bg-accent/5 transition-all duration-200"
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-accent/10 text-accent">
                                <Icon name={action.icon} size={16} />
                              </div>
                              <span className="text-sm font-medium text-primary">{action.label}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.type === 'user'
                          ? 'justify-end'
                          : message.type === 'system'
                          ? 'justify-center'
                          : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-2xl rounded-2xl px-5 py-4 shadow-sm ${
                          message.type === 'user'
                            ? 'bg-accent text-white'
                            : message.type === 'error'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                            : message.type === 'system'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 text-center'
                            : 'bg-surface border border-primary/10 text-primary'
                        }`}
                      >
                        {message.type !== 'user' && message.type !== 'system' && (
                          <div className="flex items-center gap-2 mb-2 text-accent">
                            <Icon name="Brain" size={16} />
                            <span className="text-xs font-semibold uppercase tracking-wide">
                              {t('ai.chatTitle')}
                            </span>
                          </div>
                        )}

                        {message.image && (
                          <div className="mb-3">
                            <img
                              src={message.image.url}
                              alt={message.image.name}
                              className="max-w-full h-auto rounded-xl border border-white/20"
                              style={{ maxHeight: '320px' }}
                            />
                            <div className="text-xs opacity-80 mt-1">
                              📷 {message.image.name}
                            </div>
                          </div>
                        )}

                        <p className="text-sm whitespace-pre-wrap leading-relaxed">
                          {message.content}
                        </p>

                        {/* Visual Findings */}
                        {message.visualFindings && (
                          <VisualFindingsCard findings={message.visualFindings} />
                        )}

                        {/* Sources & Citations */}
                        {message.sources && message.sources.length > 0 && (
                          <SourcesCitations sources={message.sources} />
                        )}

                        {/* Suggested Questions */}
                        {message.suggestedQuestions && message.suggestedQuestions.length > 0 && (
                          <SuggestedQuestions 
                            questions={message.suggestedQuestions} 
                            onSelect={handleSuggestedQuestion}
                          />
                        )}

                        <div className="text-[11px] uppercase tracking-wide mt-3 opacity-70">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}

                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-surface border border-primary/10 text-sm text-muted">
                        <div className="animate-spin">
                          <Icon name="Loader2" size={16} className="text-accent" />
                        </div>
                        <span>{t('ai.thinking') || 'Analyzing...'}</span>
                      </div>
                    </div>
                  )}

                  {isAnalyzingImage && (
                    <div className="flex justify-start">
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-surface border border-primary/10 text-sm text-muted">
                        <div className="animate-spin">
                          <Icon name="Scan" size={16} className="text-accent" />
                        </div>
                        <span>Running YOLO detection...</span>
                      </div>
                    </div>
                  )}

                  {isUploading && (
                    <div className="flex justify-start">
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-surface border border-primary/10 text-sm text-muted">
                        <div className="animate-spin">
                          <Icon name="Upload" size={16} className="text-accent" />
                        </div>
                        <span>Processing image...</span>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                <div className="border-t border-primary/15 px-6 py-5 bg-surface">
                  {selectedImage && (
                    <div className="mb-4 p-3 rounded-xl border border-accent/30 bg-accent/5">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-14 h-14 rounded-lg overflow-hidden bg-accent/10 flex items-center justify-center">
                          <img src={selectedImage.url} alt={selectedImage.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-primary truncate">{selectedImage.name}</p>
                          <p className="text-xs text-secondary">Image ready for analysis</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedImage(null)}
                          className="p-2 rounded-lg text-muted hover:text-primary hover:bg-accent/10 transition-colors duration-200"
                          aria-label="Remove selected image"
                        >
                          <Icon name="X" size={16} />
                        </button>
                      </div>
                      {/* Quick Analysis Actions */}
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={handleQuickDetect}
                          disabled={isAnalyzingImage || isLoading}
                          className="px-3 py-1.5 text-xs rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                        >
                          <Icon name="Zap" size={12} />
                          Quick Detect
                        </button>
                        <button
                          type="button"
                          onClick={handleQuickAnalysis}
                          disabled={isAnalyzingImage || isLoading}
                          className="px-3 py-1.5 text-xs rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                        >
                          <Icon name="Microscope" size={12} />
                          Full Analysis
                        </button>
                        <button
                          type="button"
                          onClick={() => setInputMessage('Analyze this dental image and identify all visible pathologies with severity assessment.')}
                          className="px-3 py-1.5 text-xs rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 transition-colors flex items-center gap-1.5"
                        >
                          <Icon name="MessageSquare" size={12} />
                          Chat Analysis
                        </button>
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="flex items-end gap-3">
                    <button
                      type="button"
                      onClick={openFilePicker}
                      disabled={isUploading}
                      className="flex-shrink-0 p-3 rounded-xl border border-primary/20 bg-surface text-accent hover:border-accent/40 hover:bg-accent/5 transition-colors duration-200 disabled:opacity-50"
                    >
                      <Icon name={isUploading ? 'Loader2' : 'Paperclip'} size={18} className={isUploading ? 'animate-spin' : ''} />
                    </button>

                    <div className="flex-1">
                      <textarea
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSubmit(e);
                          }
                        }}
                        placeholder={selectedImage 
                          ? "Describe what you want to analyze in this image..." 
                          : (t('ai.inputPlaceholder') || "Ask about dental conditions, treatment options, or upload an image...")}
                        className="w-full px-4 py-3 rounded-xl border border-primary/20 bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent resize-none max-h-32 min-h-[3rem]"
                        disabled={isLoading}
                        rows={1}
                        style={{ height: 'auto' }}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading || (!inputMessage.trim() && !selectedImage)}
                      className="flex-shrink-0 p-3 rounded-xl bg-accent text-white hover:bg-accent-hover transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Icon name="Send" size={18} />
                    </button>
                  </form>

                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileSelect(e.target.files)}
                  />
                </div>
              </section>

              <aside className="space-y-6">
                {/* System Status */}
                <div className="bg-surface-elevated border border-primary/15 rounded-3xl shadow-theme-lg p-5 theme-transition">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-sm font-semibold uppercase tracking-wide text-primary">
                        DeepDental API
                      </h2>
                      <p className="text-xs text-secondary">
                        v{systemHealth?.version || '1.0.0'}
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        systemHealth?.status === 'healthy'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}
                    >
                      {systemHealth?.status === 'healthy' ? 'Healthy' : 'Degraded'}
                    </span>
                  </div>
                  
                  {/* Component Status */}
                  {systemHealth?.components && (
                    <div className="space-y-2 text-xs">
                      {Object.entries(systemHealth.components).map(([component, info]) => (
                        <div key={component} className="flex items-center justify-between bg-surface px-3 py-2 rounded-lg border border-primary/15">
                          <span className="font-medium text-primary capitalize">{component}</span>
                          <span className={`text-[11px] uppercase tracking-wide flex items-center gap-1 ${
                            info?.status === 'up' ? 'text-emerald-500' : 'text-red-500'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${info?.status === 'up' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                            {info?.status === 'up' ? 'online' : 'offline'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* User Preferences */}
                <div className="bg-surface-elevated border border-primary/15 rounded-3xl shadow-theme-lg p-5 theme-transition">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-primary mb-4">
                    AI Preferences
                  </h2>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-secondary mb-1 block">Role</label>
                      <select
                        value={userPreferences.role}
                        onChange={(e) => updateUserPreferences({ ...userPreferences, role: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-primary/15 bg-surface text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                      >
                        <option value="dentist">Dentist (Professional)</option>
                        <option value="patient">Patient (Simplified)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-secondary mb-1 block">Language</label>
                      <select
                        value={userPreferences.language}
                        onChange={(e) => updateUserPreferences({ ...userPreferences, language: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-primary/15 bg-surface text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                      >
                        <option value="bilingual">Bilingual (ID/EN)</option>
                        <option value="id">Bahasa Indonesia</option>
                        <option value="en">English</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="bg-surface-elevated border border-primary/15 rounded-3xl shadow-theme-lg p-5 theme-transition">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-primary mb-4">
                    Session metrics
                  </h2>
                  <div className="grid grid-cols-2 gap-3">
                    {sessionStats.map((stat) => (
                      <div key={stat.label} className="rounded-2xl border border-primary/15 bg-surface px-4 py-3">
                        <p className="text-[11px] uppercase tracking-wide text-secondary mb-1">
                          {stat.label}
                        </p>
                        <p className="text-lg font-semibold text-primary">{stat.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-surface-elevated border border-primary/15 rounded-3xl shadow-theme-lg p-5 theme-transition">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-primary mb-4">
                    Best practices
                  </h2>
                  <div className="space-y-3">
                    {knowledgeHighlights.map((item) => (
                      <div key={item.title} className="flex items-start gap-3 rounded-xl border border-primary/15 bg-surface px-3 py-3">
                        <div className="p-2 rounded-lg bg-accent/10 text-accent mt-0.5">
                          <Icon name={item.icon} size={16} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-primary">{item.title}</p>
                          <p className="text-xs text-secondary leading-relaxed">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAnalysisPage;
