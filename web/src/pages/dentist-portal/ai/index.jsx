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
  const [showSidebar, setShowSidebar] = useState(false); // Settings sidebar toggle

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
    return (
      <div className="flex min-h-screen bg-background theme-transition">
        <div className="flex-shrink-0" style={{ width: 'var(--sidebar-width, 20rem)' }}>
          <SideBar />
        </div>
        <div className="flex-1 min-w-0 flex flex-col items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-accent/20 flex items-center justify-center animate-pulse">
              <Icon name="Brain" size={24} className="text-accent" />
            </div>
            <p className="text-sm text-secondary animate-pulse">Initializing DeepDental AI...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background theme-transition">
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
              alt="Annotated dental analysis"
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
            className="bg-surface-elevated rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-primary/10 flex items-center justify-between">
              <h2 className="text-base font-medium text-primary">Session History</h2>
              <button
                type="button"
                onClick={() => setShowSessionHistory(false)}
                className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-surface transition-colors"
              >
                <Icon name="X" size={18} />
              </button>
            </div>
            <div className="p-3 overflow-y-auto max-h-[60vh]">
              {sessionHistory.length === 0 ? (
                <p className="text-sm text-secondary text-center py-8">No previous sessions</p>
              ) : (
                <div className="space-y-1">
                  {sessionHistory.map((session) => (
                    <div
                      key={session.id}
                      className={`p-3 rounded-xl transition-all cursor-pointer ${
                        session.id === sessionId
                          ? 'bg-accent/10'
                          : 'hover:bg-surface'
                      }`}
                      onClick={() => loadSession(session)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-primary truncate">
                            Session {session.id.slice(0, 8)}
                          </p>
                          <p className="text-xs text-secondary">
                            {session.message_count} messages • {formatRelativeTime(session.created_at)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSession(session.id);
                          }}
                          className="p-1.5 rounded-lg text-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <Icon name="Trash2" size={14} />
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

      {/* Settings Sidebar (slide-in) */}
      {showSidebar && (
        <div 
          className="fixed inset-0 z-40 bg-black/30"
          onClick={() => setShowSidebar(false)}
        >
          <div 
            className="absolute right-0 top-0 h-full w-80 bg-surface-elevated shadow-2xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-primary/10 flex items-center justify-between">
              <h2 className="text-base font-medium text-primary">Settings</h2>
              <button
                type="button"
                onClick={() => setShowSidebar(false)}
                className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-surface transition-colors"
              >
                <Icon name="X" size={18} />
              </button>
            </div>
            
            <div className="p-5 space-y-6">
              {/* AI Preferences */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-secondary mb-3">Preferences</h3>
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

              {/* System Status */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-secondary mb-3">System Status</h3>
                <div className="p-3 rounded-xl bg-surface border border-primary/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-primary">DeepDental API</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      systemHealth?.status === 'healthy'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {systemHealth?.status === 'healthy' ? 'Online' : 'Offline'}
                    </span>
                  </div>
                  <p className="text-xs text-secondary">v{systemHealth?.version || '1.0.0'}</p>
                </div>
              </div>

              {/* Session Metrics */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-secondary mb-3">Session</h3>
                <div className="grid grid-cols-2 gap-2">
                  {sessionStats.map((stat) => (
                    <div key={stat.label} className="p-3 rounded-xl bg-surface border border-primary/10">
                      <p className="text-xs text-secondary">{stat.label}</p>
                      <p className="text-lg font-semibold text-primary">{stat.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Uploaded Images */}
              {uploadedImages.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-secondary mb-3">
                    Uploaded Images ({uploadedImages.length})
                  </h3>
                  <div className="space-y-2">
                    {uploadedImages.map((image) => (
                      <button
                        key={image.id}
                        type="button"
                        onClick={() => {
                          setSelectedImage(image);
                          setShowSidebar(false);
                        }}
                        className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all ${
                          selectedImage?.id === image.id
                            ? 'bg-accent/10 border border-accent/30'
                            : 'hover:bg-surface border border-transparent'
                        }`}
                      >
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-surface flex-shrink-0">
                          <img src={image.url} alt={image.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-sm font-medium text-primary truncate">{image.name}</p>
                          <p className="text-xs text-secondary">{formatRelativeTime(image.uploadTime)}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Sidebar */}
      <div className="flex-shrink-0" style={{ width: 'var(--sidebar-width, 20rem)' }}>
        <SideBar />
      </div>

      {/* Main Content - Gemini-like Chat UI */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Minimal Header */}
        <header className="px-4 py-3 border-b border-primary/10 bg-surface-elevated/50 backdrop-blur-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-accent to-accent-hover flex items-center justify-center">
              <Icon name="Brain" size={16} className="text-white" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-primary">DeepDental AI</h1>
              <p className="text-xs text-secondary">
                {sessionId ? `Session ${sessionId.slice(0, 6)}` : 'New chat'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSessionHistory(true)}
              className="p-2 rounded-lg text-secondary hover:text-primary hover:bg-surface transition-colors"
              title="History"
            >
              <Icon name="History" size={18} />
            </button>
            <button
              type="button"
              onClick={handleNewSession}
              className="p-2 rounded-lg text-secondary hover:text-primary hover:bg-surface transition-colors"
              title="New chat"
            >
              <Icon name="Plus" size={18} />
            </button>
            <button
              type="button"
              onClick={() => setShowSidebar(true)}
              className="p-2 rounded-lg text-secondary hover:text-primary hover:bg-surface transition-colors"
              title="Settings"
            >
              <Icon name="Settings" size={18} />
            </button>
          </div>
        </header>

        {/* Chat Container */}
        <div 
          className="flex-1 overflow-y-auto"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          {isDragOver && (
            <div className="absolute inset-0 z-30 bg-accent/10 border-2 border-dashed border-accent flex items-center justify-center">
              <div className="text-center space-y-2">
                <Icon name="Upload" size={32} className="text-accent mx-auto" />
                <p className="text-sm font-medium text-accent">Drop image here</p>
              </div>
            </div>
          )}

          <div className="max-w-3xl mx-auto px-4">
            {/* Welcome State */}
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center min-h-[60vh] py-8">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/10 flex items-center justify-center mb-6">
                  <Icon name="Stethoscope" size={32} className="text-accent" />
                </div>
                <h2 className="text-2xl font-semibold text-primary mb-2">
                  {t('ai.welcomeMessage') || 'Hello, how can I help?'}
                </h2>
                <p className="text-sm text-secondary text-center max-w-md mb-8">
                  {t('ai.welcomeSubtitle') || 'Upload dental images for AI analysis, or ask questions about dental conditions and treatments.'}
                </p>
                
                {/* Quick Action Chips */}
                <div className="flex flex-wrap justify-center gap-2 max-w-xl">
                  {quickActions.slice(0, 4).map((action, index) => (
                    <button
                      key={index}
                      onClick={() => handleQuickAction(action)}
                      type="button"
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-primary/15 bg-surface hover:bg-accent/5 hover:border-accent/30 transition-all text-sm text-primary"
                    >
                      <Icon name={action.icon} size={16} className="text-accent" />
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="py-6 space-y-6">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex gap-3 max-w-[85%] ${message.type === 'user' ? 'flex-row-reverse' : ''}`}>
                    {/* Avatar */}
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      message.type === 'user'
                        ? 'bg-accent text-white'
                        : message.type === 'error'
                        ? 'bg-red-100 text-red-600 dark:bg-red-900/30'
                        : 'bg-gradient-to-br from-accent/20 to-emerald-500/20'
                    }`}>
                      <Icon 
                        name={message.type === 'user' ? 'User' : message.type === 'error' ? 'AlertCircle' : 'Brain'} 
                        size={16} 
                        className={message.type === 'assistant' ? 'text-accent' : ''}
                      />
                    </div>
                    
                    {/* Content */}
                    <div className="space-y-2">
                      {message.image && (
                        <div className={`rounded-2xl overflow-hidden ${message.type === 'user' ? 'max-w-xs' : ''}`}>
                          <img
                            src={message.image.url}
                            alt={message.image.name}
                            className="max-w-full h-auto"
                            style={{ maxHeight: '200px' }}
                          />
                        </div>
                      )}
                      
                      <div className={`rounded-2xl px-4 py-3 ${
                        message.type === 'user'
                          ? 'bg-accent text-white'
                          : message.type === 'error'
                          ? 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                          : message.type === 'system'
                          ? 'bg-blue-50 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
                          : 'bg-surface'
                      }`}>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                      </div>

                      {/* Visual Findings */}
                      {message.visualFindings && (
                        <div className="bg-surface rounded-2xl overflow-hidden">
                          <VisualFindingsCard findings={message.visualFindings} />
                        </div>
                      )}

                      {/* Sources */}
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

                      <p className="text-[10px] text-secondary">
                        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {/* Loading States */}
              {(isLoading || isAnalyzingImage || isUploading) && (
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-accent/20 to-emerald-500/20 flex items-center justify-center">
                    <Icon name="Brain" size={16} className="text-accent" />
                  </div>
                  <div className="bg-surface rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-2 text-sm text-secondary">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-accent/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="w-2 h-2 bg-accent/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="w-2 h-2 bg-accent/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                      </div>
                      <span>
                        {isAnalyzingImage ? 'Analyzing image...' : isUploading ? 'Processing...' : 'Thinking...'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>

        {/* Input Area - Fixed at bottom */}
        <div className="border-t border-primary/10 bg-surface-elevated/80 backdrop-blur-sm">
          <div className="max-w-3xl mx-auto p-4">
            {/* Selected Image Preview */}
            {selectedImage && (
              <div className="mb-3 flex items-center gap-3 p-2 rounded-xl bg-surface border border-primary/10">
                <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                  <img src={selectedImage.url} alt={selectedImage.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-primary truncate">{selectedImage.name}</p>
                  <div className="flex gap-2 mt-1">
                    <button
                      type="button"
                      onClick={handleQuickDetect}
                      disabled={isAnalyzingImage}
                      className="text-xs text-amber-600 hover:underline disabled:opacity-50"
                    >
                      Quick detect
                    </button>
                    <button
                      type="button"
                      onClick={handleQuickAnalysis}
                      disabled={isAnalyzingImage}
                      className="text-xs text-emerald-600 hover:underline disabled:opacity-50"
                    >
                      Full analysis
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedImage(null)}
                  className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-surface transition-colors"
                >
                  <Icon name="X" size={16} />
                </button>
              </div>
            )}

            {/* Input Form */}
            <form onSubmit={handleSubmit} className="flex items-end gap-2">
              <button
                type="button"
                onClick={openFilePicker}
                disabled={isUploading}
                className="flex-shrink-0 p-3 rounded-xl text-secondary hover:text-primary hover:bg-surface transition-colors disabled:opacity-50"
              >
                <Icon name={isUploading ? 'Loader2' : 'Paperclip'} size={20} className={isUploading ? 'animate-spin' : ''} />
              </button>

              <div className="flex-1 relative">
                <textarea
                  value={inputMessage}
                  onChange={(e) => {
                    setInputMessage(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                  placeholder={selectedImage 
                    ? "Describe what to analyze..." 
                    : "Ask anything about dental health..."}
                  className="w-full px-4 py-3 pr-12 rounded-2xl border border-primary/15 bg-surface text-primary placeholder:text-secondary/60 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent resize-none text-sm"
                  disabled={isLoading}
                  rows={1}
                  style={{ minHeight: '48px', maxHeight: '160px' }}
                />
                <button
                  type="submit"
                  disabled={isLoading || (!inputMessage.trim() && !selectedImage)}
                  className="absolute right-2 bottom-2 p-2 rounded-xl bg-accent text-white hover:bg-accent-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Icon name="ArrowUp" size={16} />
                </button>
              </div>
            </form>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files)}
            />

            <p className="text-[10px] text-center text-secondary mt-2">
              DeepDental AI can make mistakes. Verify important information.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAnalysisPage;
