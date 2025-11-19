import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useAuth } from '../../../contexts/AuthContext';
import Icon from '../../../components/AppIcon';
import SideBar from '../ui/SideBar';

const MIN_BOOT_MS = 900;

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

  // Refs
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const bootstrapTimerRef = useRef(null);

  // API configuration - using production Serene AI API
  const API_BASE_URL = import.meta.env.VITE_SERENE_AI_API_BASE_URL || 'https://api.dentalization.id';
  const API_VERSION = import.meta.env.VITE_SERENE_AI_API_VERSION || 'v1';

  // Initialize session on component mount
  useEffect(() => {
    let isMounted = true;
    const start = Date.now();
    const initialize = async () => {
      try {
        await Promise.all([checkSystemHealth(), createSession()]);
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

  // Check system health
  const checkSystemHealth = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/${API_VERSION}/health`);
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      const data = await response.json();
      setSystemHealth(data);
      
      if (data.status === 'success') {
        const systemMessage = {
          id: Date.now(),
          type: 'system',
          content: '🤖 Serene AI is online and ready to help with your dental analysis!',
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, systemMessage]);
        
        if (data.dependencies && !data.dependencies.agent) {
          const warningMessage = {
            id: Date.now() + 1,
            type: 'system',
            content: '⚠️ AI Agent is offline - some features may be limited.',
            timestamp: new Date().toISOString(),
          };
          setMessages(prev => [...prev, warningMessage]);
        }
      }
    } catch (error) {
      console.error('Health check failed:', error);
      setSystemHealth({ status: 'error', message: error.message });
      const errorMessage = {
        id: Date.now(),
        type: 'system',
        content: `⚠️ Unable to connect to Serene AI backend. Please check if the server is running.`,
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
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success') {
          setSessionId(data.session.id);
          console.log('Session created:', data.session.id);
        } else {
          throw new Error(data.message || 'Failed to create session');
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error creating session:', error);
    }
  };

  // Upload image to AI service
  const uploadImage = async (file) => {
    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE_URL}/api/${API_VERSION}/images`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.status !== 'success') {
        throw new Error(data.message || 'Upload failed');
      }

      const imageData = {
        id: data.image.id,
        name: file.name,
        url: URL.createObjectURL(file),
        uploadTime: new Date().toISOString(),
      };

      setUploadedImages(prev => [imageData, ...prev]);
      setSelectedImage(imageData);
      return imageData;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  // Send message to AI agent
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

      const requestBody = {
        message: message,
        ...(image?.id && { image_id: image.id }),
      };

      const response = await fetch(`${API_BASE_URL}/api/${API_VERSION}/chat?session_id=${sessionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('💬 Chat response data:', data);
        
        if (data.status === 'success') {
          // Add AI response to chat
          const aiMessage = {
            id: Date.now() + 1,
            type: 'ai',
            content: data.assistant_message?.content || data.message,
            timestamp: new Date().toISOString(),
            analysis: data.analysis,
            resources: data.resources || [],
          };
          setMessages(prev => [...prev, aiMessage]);
        } else {
          throw new Error(data.message || 'Chat request failed');
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        id: Date.now() + 1,
        type: 'error',
        content: t('ai.analysisError'),
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);
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
      label: t('ai.analyzeImage'),
      icon: 'Search',
      message: t('ai.analyzeImageMessage'),
    },
    {
      label: t('ai.identifyConditions'),
      icon: 'Eye',
      message: t('ai.identifyConditionsMessage'),
    },
    {
      label: t('ai.treatmentRecommendations'),
      icon: 'Stethoscope',
      message: t('ai.treatmentMessage'),
    },
    {
      label: t('ai.riskAssessmentAction'),
      icon: 'AlertTriangle',
      message: t('ai.riskMessage'),
    },
  ];

  const handleQuickAction = (action) => {
    if (selectedImage) {
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
      <div className="flex-shrink-0" style={{ width: 'var(--sidebar-width, 20rem)' }}>
        <SideBar />
      </div>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="px-6 py-6 border-b border-primary/20 bg-surface-elevated theme-transition">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.24em] text-muted">
                {t('ai.workspaceBadge') || 'AI Workspace'}
              </p>
              <h1 className="text-3xl font-semibold text-primary theme-transition">
                {t('ai.title')}
              </h1>
              <p className="text-sm text-secondary max-w-2xl">
                {t('ai.subtitle') || 'Collaborate with Serene AI to interpret diagnostics, craft treatment plans, and keep every patient session documented.'}
              </p>
              <p className="text-xs text-muted">
                Session owner:&nbsp;
                <span className="font-semibold text-primary">
                  {user?.name || 'Your team'}
                </span>
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={checkSystemHealth}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-primary/20 text-primary hover:border-accent/40 hover:text-accent transition-colors duration-200"
              >
                <Icon name="Activity" size={16} />
                <span>{t('ai.checkHealth') || 'Run health check'}</span>
              </button>
              <button
                type="button"
                onClick={handleNewSession}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-white hover:bg-accent-hover transition-colors duration-200"
              >
                <Icon name="RotateCcw" size={16} />
                <span>{t('ai.newSession') || 'Start new session'}</span>
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-6 space-y-6">
            <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)_320px]">
              <aside className="space-y-6">
                <div className="bg-surface-elevated border border-primary/15 rounded-3xl shadow-theme-lg p-5 theme-transition">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-sm font-semibold uppercase tracking-wide text-primary">
                        Quick prompts
                      </h2>
                      <p className="text-xs text-secondary">
                        Use structured starters to guide the copilot.
                      </p>
                    </div>
                    <div className="p-2 rounded-lg bg-accent/10 text-accent">
                      <Icon name="Sparkles" size={16} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    {quickActions.map((action, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleQuickAction(action)}
                        className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-primary/15 text-left bg-surface hover:border-accent/40 hover:bg-accent/5 transition-all duration-200"
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

                <div className="bg-surface-elevated border border-primary/15 rounded-3xl shadow-theme-lg p-5 theme-transition">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-sm font-semibold uppercase tracking-wide text-primary">
                        Uploaded assets
                      </h2>
                      <p className="text-xs text-secondary">
                        Select an image to attach with your next prompt.
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
                      Clinical copilot thread
                    </h2>
                    <p className="text-xs text-secondary">
                      {messages.length} exchanges • {uploadedImages.length} assets shared
                    </p>
                  </div>
                  <div className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    systemHealth?.status === 'success'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                  }`}>
                    {systemHealth?.status === 'success' ? (t('ai.connected') || 'Online') : (t('ai.disconnected') || 'Limited')}
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

                        {message.analysis && (
                          <div className="mt-3 p-3 bg-surface-elevated border border-primary/15 rounded-lg">
                            <h4 className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">
                              {t('ai.analysisResults')}:
                            </h4>
                            <pre className="text-xs text-secondary whitespace-pre-wrap">
                              {JSON.stringify(message.analysis, null, 2)}
                            </pre>
                          </div>
                        )}

                        {message.resources && message.resources.length > 0 && (
                          <div className="mt-3 p-3 bg-surface-elevated border border-primary/15 rounded-lg space-y-2">
                            <h4 className="text-xs font-semibold text-primary uppercase tracking-wide">
                              Generated resources
                            </h4>
                            {message.resources.map((resource, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-xs text-secondary">
                                <Icon name="FileText" size={14} className="text-accent" />
                                <span>Resource #{idx + 1}</span>
                              </div>
                            ))}
                          </div>
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
                        <span>{t('ai.thinking')}</span>
                      </div>
                    </div>
                  )}

                  {isUploading && (
                    <div className="flex justify-start">
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-surface border border-primary/10 text-sm text-muted">
                        <div className="animate-spin">
                          <Icon name="Upload" size={16} className="text-accent" />
                        </div>
                        <span>Uploading asset…</span>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                <div className="border-t border-primary/15 px-6 py-5 bg-surface">
                  {selectedImage && (
                    <div className="mb-4 p-3 rounded-xl border border-primary/15 bg-surface-elevated flex items-center gap-3">
                      <div className="w-14 h-14 rounded-lg overflow-hidden bg-accent/10 flex items-center justify-center">
                        <img src={selectedImage.url} alt={selectedImage.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-primary truncate">{selectedImage.name}</p>
                        <p className="text-xs text-secondary">Attached for the next prompt</p>
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

                    <div className="flex-1 relative">
                      <textarea
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSubmit(e);
                          }
                        }}
                        placeholder={t('ai.inputPlaceholder')}
                        className="w-full px-4 py-3 rounded-xl border border-primary/20 bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent resize-none max-h-32 min-h-[3rem]"
                        disabled={isLoading}
                        rows={1}
                        style={{ height: 'auto' }}
                      />
                      {selectedImage && (
                        <div className="absolute -top-12 left-0 right-0 flex flex-wrap gap-1 p-2 bg-surface border border-primary/20 rounded-lg shadow-lg">
                          {quickActions.map((action, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => setInputMessage(action.message)}
                              className="px-2 py-1 text-xs bg-surface-elevated border border-primary/20 rounded-md hover:border-accent/40 hover:bg-accent/5 transition-all duration-200"
                            >
                              {action.label}
                            </button>
                          ))}
                        </div>
                      )}
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
                <div className="bg-surface-elevated border border-primary/15 rounded-3xl shadow-theme-lg p-5 theme-transition">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-sm font-semibold uppercase tracking-wide text-primary">
                        System status
                      </h2>
                      <p className="text-xs text-secondary">
                        Monitor backend services powering Serene AI.
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        systemHealth?.status === 'success'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}
                    >
                      {systemHealth?.status === 'success' ? (t('ai.connected') || 'Operational') : (t('ai.disconnected') || 'Attention needed')}
                    </span>
                  </div>
                  <p className="text-xs text-secondary leading-relaxed">
                    {systemHealth?.message || 'Core inference, agent orchestration, and storage services run in secure mode.'}
                  </p>
                  {systemHealth?.dependencies && (
                    <div className="mt-4 space-y-2 text-xs">
                      {Object.entries(systemHealth.dependencies).map(([service, status]) => (
                        <div key={service} className="flex items-center justify-between bg-surface px-3 py-2 rounded-lg border border-primary/15">
                          <span className="font-medium text-primary capitalize">{service}</span>
                          <span className={`text-[11px] uppercase tracking-wide ${
                            status ? 'text-emerald-500' : 'text-amber-500'
                          }`}>
                            {status ? 'active' : 'offline'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
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
