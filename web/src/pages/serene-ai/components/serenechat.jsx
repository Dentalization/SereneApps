import React, { useState, useEffect, useRef } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

// ---- Config (top-level, single source of truth)
const API_BASE_URL = import.meta.env.VITE_SERENE_AI_API_BASE_URL || 'https://api.dentalization.id';
const API_VERSION = import.meta.env.VITE_SERENE_AI_API_VERSION || 'v1';

/** Named export: lightweight debug widget */
export const SereneChatDebug = () => {
  const [error, setError] = useState(null);
  const [apiTest, setApiTest] = useState(null);

  const testAPI = async () => {
    setApiTest('Testing...');
    try {
      const response = await fetch(`${API_BASE_URL}/api/${API_VERSION}/health`);
      const data = await response.json();
      setApiTest(`✅ API OK: ${JSON.stringify(data)}`);
    } catch (err) {
      setApiTest(`❌ API Error: ${err.message}`);
    }
  };

  useEffect(() => {
    try {
      console.log('SereneChatDebug mounted');
      const testApiUrl = import.meta.env.VITE_SERENE_AI_API_BASE_URL || 'https://api.dentalization.id';
      console.log('API URL:', testApiUrl);
    } catch (err) {
      console.error('Error in SereneChatDebug useEffect:', err);
      setError(err.message);
    }
  }, []);

  if (error) {
    return (
      <div style={{ padding: 20, border: '1px solid red', margin: 20 }}>
        <h3>SereneChat Error:</h3>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 20, border: '1px solid green', margin: 20 }}>
      <h2>SereneChat Debug Component</h2>
      <p>✅ Component rendered successfully</p>
      <p>🔗 API URL: {import.meta.env.VITE_SERENE_AI_API_BASE_URL || 'Not set'}</p>
      <button onClick={() => console.log('Button clicked')}>Test Button</button>
      <button onClick={testAPI} style={{ marginLeft: 10 }}>Test API</button>
      {apiTest && <p>{apiTest}</p>}
    </div>
  );
};

/** Safe preview for a File object (handles createObjectURL + cleanup) */
function MessageImagePreview({ file, maxHeight = 200 }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    if (!file) return;
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  if (!file || !url) return null;
  return (
    <>
      <img
        src={url}
        alt="Uploaded image"
        className="max-w-full h-auto rounded-lg border border-white/20"
        style={{ maxHeight }}
      />
      <div className="text-xs opacity-75 mt-1">📷 {file.name}</div>
    </>
  );
}

/** Default export: full chat UI */
const SereneChat = () => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadedImageId, setUploadedImageId] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [systemHealth, setSystemHealth] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [modalImageUrl, setModalImageUrl] = useState('');
  const [modalImageTitle, setModalImageTitle] = useState('');
  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  // UI helpers
  const [previewUrl, setPreviewUrl] = useState(null);     // preview for selectedFile above bar
  const inputRef = useRef(null);                           // auto-resize textarea
  const [dragActive, setDragActive] = useState(false);     // drag highlight

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Auto-scroll when messages change (only when user interacts)
  useEffect(() => {
    // Only auto-scroll if user has actually interacted (sent message, uploaded file, etc)
    if (messages.length > 0 && hasUserInteracted) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, hasUserInteracted]);

  // Init
  useEffect(() => {
    checkSystemHealth();
    createSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Preview URL for selectedFile (top preview)
  useEffect(() => {
    if (!selectedFile || !selectedFile.type?.startsWith('image/')) {
      setPreviewUrl(null);
      return;
    }
    const u = URL.createObjectURL(selectedFile);
    setPreviewUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [selectedFile]);

  // Auto-resize textarea
  useEffect(() => {
    if (!inputRef.current) return;
    inputRef.current.style.height = 'auto';
    inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 160) + 'px';
  }, [inputMessage]);

  const addSystemMessage = (content) => {
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), content, type: 'system', timestamp: new Date().toISOString() },
    ]);
  };

  const addUserMessage = (content, imageId = null, imageFile = null) => {
    const message = {
      id: Date.now(),
      content,
      type: 'user',
      timestamp: new Date().toISOString(),
      imageId,
      imageFile, // Store the actual file for preview
    };
    setMessages((prev) => [...prev, message]);
    return message;
  };

  const addAssistantMessage = (content, analysis = null, resources = []) => {
    console.log('🤖 Adding assistant message with:');
    console.log('   📝 Content:', content);
    console.log('   🔬 Analysis:', analysis);
    console.log('   📊 Resources:', resources);
    
    const message = {
      id: Date.now(),
      content,
      type: 'assistant',
      timestamp: new Date().toISOString(),
      analysis,
      resources,
    };
    
    console.log('💾 Final message object:', message);
    setMessages((prev) => [...prev, message]);
    return message;
  };

  const checkSystemHealth = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/${API_VERSION}/health`);
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      const data = await response.json();
      setSystemHealth(data);
      if (data.status === 'success') {
        addSystemMessage('🤖 Serene AI is online and ready to help with your dental analysis!');
        if (data.dependencies) {
          const deps = data.dependencies;
          if (!deps.agent) addSystemMessage('⚠️ AI Agent is offline - some features may be limited.');
          if (!deps.storage) addSystemMessage('⚠️ Storage system is offline - file uploads may fail.');
        }
      }
    } catch (error) {
      console.error('Health check failed:', error);
      addSystemMessage(
        `⚠️ Unable to connect to Serene AI backend (${API_BASE_URL}). Please check if the server is running.`
      );
      setSystemHealth({ status: 'error', message: error.message });
    }
  };

  const createSession = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/${API_VERSION}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      const data = await response.json();
      if (data.status === 'success') {
        setSessionId(data.session.id);
      }
    } catch (error) {
      console.error('Session creation failed:', error);
      addSystemMessage(
        `❌ Failed to create session: ${error.message}. You can still use the interface but conversations won't be saved.`
      );
    }
  };

  const uploadImage = async (file) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch(`${API_BASE_URL}/api/${API_VERSION}/images`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (data.status === 'success') {
        setUploadedImageId(data.image.id);
        return data.image.id;
      }
      throw new Error('Upload failed');
    } catch (error) {
      console.error('Image upload failed:', error);
      addSystemMessage('❌ Failed to upload image. Please try again.');
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() && !selectedFile) return;
    if (!sessionId) {
      addSystemMessage('❌ No active session. Please refresh the page.');
      return;
    }

    // Mark that user has interacted
    setHasUserInteracted(true);

    setIsLoading(true);
    let imageId = uploadedImageId;
    let fileToPreview = selectedFile;

    if (selectedFile) {
      imageId = await uploadImage(selectedFile);
      if (!imageId) {
        setIsLoading(false);
        return;
      }
    }

    addUserMessage(inputMessage || '📷 Analyze this image', imageId, fileToPreview);
    setInputMessage('');
    setSelectedFile(null);

    try {
      const body = {
        message: inputMessage || 'Analisis gambar dental ini dan berikan diagnosis.',
        ...(imageId ? { image_id: imageId } : {}),
      };

      const response = await fetch(
        `${API_BASE_URL}/api/${API_VERSION}/chat?session_id=${sessionId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      );

      const data = await response.json();
      console.log('💬 Chat response data:', data);
      
      if (data.status === 'success') {
        console.log('✅ Chat success - assistant message:', data.assistant_message?.content);
        console.log('🔬 Analysis data:', data.analysis);
        console.log('📊 Resources received:', data.resources);
        
        addAssistantMessage(
          data.assistant_message.content,
          data.analysis,
          data.resources || []
        );
      } else {
        console.log('❌ Chat failed with status:', data.status, 'message:', data.message);
        addAssistantMessage('❌ Sorry, I encountered an error processing your request. Please try again.');
      }
    } catch (error) {
      console.error('Chat request failed:', error);
      addAssistantMessage('❌ Unable to process your request. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const performDirectAnalysis = async () => {
    if (!selectedFile) {
      addSystemMessage('⚠️ Please select an image file for direct analysis.');
      return;
    }

    // Mark that user has interacted
    setHasUserInteracted(true);

    setIsLoading(true);
    addSystemMessage('🔍 Performing direct analysis...');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch(`${API_BASE_URL}/api/${API_VERSION}/analysis/direct`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.status === 'success') {
        const analysis = data.analysis;
        let analysisText = '🔍 **Direct Analysis Complete**\n\n';

        if (analysis && typeof analysis === 'object') {
          if (analysis.report) analysisText += `**Report:**\n${analysis.report}\n\n`;
          if (analysis.summary) analysisText += `**Summary:**\n${analysis.summary}\n\n`;
          if (analysis.findings) analysisText += `**Findings:**\n${analysis.findings}\n\n`;
          if (analysis.recommendations) analysisText += `**Recommendations:**\n${analysis.recommendations}\n\n`;
        } else if (typeof analysis === 'string') {
          analysisText += analysis;
        } else {
          analysisText += 'Analysis completed successfully.';
        }

        addAssistantMessage(analysisText, analysis);
        addSystemMessage('✅ Direct analysis completed successfully.');
      } else {
        addAssistantMessage('❌ Direct analysis failed. Please try again or use conversational mode.');
      }
    } catch (error) {
      console.error('Direct analysis failed:', error);
      addAssistantMessage('❌ Direct analysis failed. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
      setSelectedFile(null);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) setSelectedFile(file);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  /** Open visualization in modal using blob object URL (avoids CORS/mixed-content) */
  const viewVisualization = async (resourceId) => {
    console.log('🔍 viewVisualization called with resourceId:', resourceId);
    console.log('🔗 API_BASE_URL:', API_BASE_URL);
    console.log('📋 API_VERSION:', API_VERSION);
    
    try {
      let response;
      let blob;

      // Try with ?format=file
      try {
        const url1 = `${API_BASE_URL}/api/${API_VERSION}/resources/${resourceId}?format=file`;
        console.log('🌐 Trying URL 1:', url1);
        response = await fetch(url1);
        console.log('📡 Response 1 status:', response.status, response.statusText);
        if (response.ok) {
          blob = await response.blob();
          console.log('📦 Blob 1 size:', blob?.size, 'type:', blob?.type);
        }
      } catch (err) {
        console.log('❌ URL 1 failed:', err.message);
      }

      // Fallback without format
      if (!blob) {
        try {
          const url2 = `${API_BASE_URL}/api/${API_VERSION}/resources/${resourceId}`;
          console.log('🌐 Trying URL 2:', url2);
          response = await fetch(url2);
          console.log('📡 Response 2 status:', response.status, response.statusText);
          if (response.ok) {
            blob = await response.blob();
            console.log('📦 Blob 2 size:', blob?.size, 'type:', blob?.type);
          }
        } catch (err) {
          console.log('❌ URL 2 failed:', err.message);
        }
      }

      // Last fallback direct path
      if (!blob) {
        try {
          const url3 = `${API_BASE_URL}/resources/${resourceId}`;
          console.log('🌐 Trying URL 3:', url3);
          response = await fetch(url3);
          console.log('📡 Response 3 status:', response.status, response.statusText);
          if (response.ok) {
            blob = await response.blob();
            console.log('📦 Blob 3 size:', blob?.size, 'type:', blob?.type);
          }
        } catch (err) {
          console.log('❌ URL 3 failed:', err.message);
        }
      }

      if (blob && blob.size > 0) {
        const blobUrl = URL.createObjectURL(blob);
        console.log('✅ Created blob URL:', blobUrl);
        setModalImageUrl(blobUrl);
        setModalImageTitle(`Dental Visualization - ${resourceId}`);
        setShowImageModal(true);
        console.log('🖼️ Modal should now be open');
      } else {
        console.log('❌ No valid blob found for resourceId:', resourceId);
      }
    } catch (error) {
      console.error('🚨 Failed to load visualization:', error);
    }
  };

  const closeImageModal = () => {
    setShowImageModal(false);
    if (modalImageUrl && modalImageUrl.startsWith('blob:')) {
      URL.revokeObjectURL(modalImageUrl);
    }
    setModalImageUrl('');
    setModalImageTitle('');
  };

  const downloadVisualization = () => {
    if (modalImageUrl) {
      const link = document.createElement('a');
      link.href = modalImageUrl;
      link.download = `dental-visualization-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Cleanup blob URLs when component unmounts
  useEffect(() => {
    return () => {
      if (modalImageUrl && modalImageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(modalImageUrl);
      }
    };
  }, [modalImageUrl]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-brand border border-border overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-secondary p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Serene AI Assistant</h2>
              <p className="text-primary-foreground/80">
                {systemHealth
                  ? `${systemHealth.dependencies?.agent ? 'Serene Ready' : '❌ Serene is Offline'}`
                  : 'Connecting to AI backend...'}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  systemHealth?.status === 'success' ? 'bg-green-400' : 'bg-yellow-400'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="h-[32rem] overflow-y-auto p-6 space-y-4">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                  m.type === 'user'
                    ? 'bg-blue-600 text-white'
                    : m.type === 'system'
                    ? 'bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm'
                    : 'bg-white border border-gray-200 text-gray-900 shadow-sm'
                }`}
              >
                <div className="whitespace-pre-wrap">{m.content}</div>

                {/* Safe image preview for uploaded files */}
                {m.imageFile && (
                  <div className="mt-2">
                    <MessageImagePreview file={m.imageFile} />
                  </div>
                )}

                {/* Image ID info for non-preview cases */}
                {m.imageId && !m.imageFile && (
                  <div className="mt-2 text-xs opacity-75">📷 Image ID: {m.imageId}</div>
                )}

                {/* Visualization buttons & thumbnails */}
                {m.resources?.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {console.log('🎨 Rendering visualizations for message:', m.id, 'resources:', m.resources)}
                    {m.resources.map((rid) => (
                      <div key={rid} className="space-y-1">
                        {console.log('🖼️ Rendering resource:', rid)}
                        <button
                          onClick={() => {
                            console.log('🖱️ Visualization button clicked for:', rid);
                            viewVisualization(rid);
                          }}
                          className={`flex items-center space-x-2 text-xs rounded px-2 py-1 transition-colors w-full ${
                            m.type === 'user' 
                              ? 'bg-white/20 hover:bg-white/30 text-white' 
                              : 'bg-blue-100 hover:bg-blue-200 text-blue-800 border border-blue-200'
                          }`}
                        >
                          <Icon name="Image" size={12} />
                          <span>🎨 View Visualization: {rid}</span>
                        </button>

                        {/* Inline thumbnail (click => open via blob loader) */}
                        <div className="text-xs opacity-75 space-y-1">
                          {/* Method 1 */}
                          <div className="relative group">
                            <img 
                              src={`${API_BASE_URL}/api/${API_VERSION}/resources/${rid}?format=file`}
                              alt={`Visualization ${rid}`}
                              className="max-w-full h-auto rounded border border-white/20 mt-1 cursor-pointer hover:opacity-90 transition-all duration-200 hover:scale-[1.02]"
                              style={{ maxHeight: '150px' }}
                              onClick={(e) => {
                                console.log('🖱️ Image thumbnail clicked for:', rid);
                                e.preventDefault();
                                e.stopPropagation();
                                viewVisualization(rid);
                              }}
                              onLoad={() => {
                                console.log('✅ Image loaded successfully for:', rid);
                              }}
                              onError={(e) => { 
                                console.log('❌ Image failed to load for:', rid);
                                e.currentTarget.parentElement.style.display = 'none';
                                const next = e.currentTarget.parentElement.nextElementSibling;
                                if (next) next.style.display = 'block';
                              }}
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded cursor-pointer">
                              <div className="bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-medium text-gray-700 flex items-center gap-1">
                                <span>🔍</span>
                                Click to enlarge
                              </div>
                            </div>
                          </div>

                          {/* Method 2 fallback (hidden until method 1 fails) */}
                          <div className="relative group" style={{ display: 'none' }}>
                            <img 
                              src={`${API_BASE_URL}/api/${API_VERSION}/resources/${rid}`}
                              alt={`Visualization ${rid} (fallback)`}
                              className="max-w-full h-auto rounded border border-white/20 mt-1 cursor-pointer hover:opacity-90 transition-all duration-200 hover:scale-[1.02]"
                              style={{ maxHeight: '150px' }}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                viewVisualization(rid);
                              }}
                              onError={(e) => { 
                                e.currentTarget.parentElement.style.display = 'none';
                                const textFallback = e.currentTarget.parentElement.nextElementSibling;
                                if (textFallback) textFallback.style.display = 'block';
                              }}
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded cursor-pointer">
                              <div className="bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-medium text-gray-700 flex items-center gap-1">
                                <span>🔍</span>
                                Click to enlarge
                              </div>
                            </div>
                          </div>

                          {/* Text fallback */}
                          <div 
                            className="text-xs text-gray-500 italic p-2 bg-gray-100 rounded border cursor-pointer hover:bg-gray-200 transition-colors"
                            style={{ display: 'none' }}
                            onClick={(e) => {
                              e.preventDefault();
                              viewVisualization(rid);
                            }}
                          >
                            📊 Visualization available — click to view full size
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="text-xs opacity-60 mt-1">
                  {new Date(m.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 rounded-2xl px-4 py-2 flex items-center space-x-2 shadow-sm">
                <div className="animate-spin text-blue-600">
                  <Icon name="Loader" size={16} />
                </div>
                <span className="text-gray-900">AI is thinking...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area — Elegan (WhatsApp-like) */}
        <div className="border-t border-border bg-gradient-to-b from-transparent to-muted/40 px-3 sm:px-4 py-3 sm:py-4 space-y-3">

          {/* Attachment preview (muncul di atas bar) */}
          {selectedFile && (
            <div className="rounded-2xl border border-border bg-white/80 dark:bg-gray-900/80 shadow-sm backdrop-blur p-3 sm:p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {previewUrl && (
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="h-16 w-16 rounded-xl object-cover ring-1 ring-border"
                    />
                  )}
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-text-primary truncate">
                      {selectedFile.name}
                    </div>
                    <div className="text-xs text-text-secondary">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </div>

                    {/* Aksi sekunder */}
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        onClick={() => setSelectedFile(null)}
                        className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border border-border hover:bg-muted/60 text-text-secondary transition"
                        title="Hapus lampiran"
                      >
                        <Icon name="X" size={12} />
                        Hapus
                      </button>

                      <button
                        onClick={performDirectAnalysis}
                        disabled={isLoading}
                        className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border border-primary/30 text-primary hover:bg-primary/5 transition disabled:opacity-50"
                        title="Analisis langsung"
                      >
                        <Icon name="Zap" size={12} />
                        Direct Analysis
                      </button>
                    </div>
                  </div>
                </div>

                {/* Progress upload (jika perlu) */}
                {isUploading && (
                  <div className="w-28">
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full w-2/3 bg-primary/60 animate-pulse" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Chat bar (dengan tombol upload di dalam) */}
          <div
            onDragEnter={() => setDragActive(true)}
            onDragLeave={() => setDragActive(false)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              const file = e.dataTransfer.files?.[0];
              if (file && file.type.startsWith('image/')) setSelectedFile(file);
            }}
            className={[
              "group relative flex items-end gap-2 sm:gap-3 rounded-2xl border px-2.5 sm:px-3 py-1.5 sm:py-2",
              "bg-white/70 dark:bg-gray-900/70 backdrop-blur shadow-sm transition-all duration-200",
              "focus-within:ring-2 focus-within:ring-primary/15 focus-within:border-primary/30",
              dragActive ? "border-primary/40 bg-primary/5" : "border-border"
            ].join(" ")}
          >
            {/* Hidden input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* Camera icon (tetap center) */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="self-center p-2.5 rounded-full transition-colors shrink-0
                        text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10
                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              title="Ambil foto"
              aria-label="Ambil foto"
            >
              {isUploading ? (
                <span className="inline-block animate-spin">
                  <Icon name="Loader" size={18} />
                </span>
              ) : (
                <Icon name="Camera" size={18} />   
              )}
            </button>

            {/* Textarea (auto-resize, tanpa border, kontras jelas) */}
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyPress}         // onKeyPress deprecated → pakai onKeyDown
              placeholder="Tulis pesan…"
              aria-label="Ketik pesan"
              className="flex-1 bg-transparent border-0 outline-none focus:outline-none focus:ring-0
                        resize-none overflow-hidden
                        px-1 sm:px-2 py-1
                        text-gray-900 dark:text-gray-100
                        placeholder-gray-500 dark:placeholder-gray-400
                        caret-primary
                        min-h-[38px] max-h-40"
              rows={1}
            />

            {/* Send (tetap center) */}
            <button
              onClick={sendMessage}
              disabled={isLoading || (!inputMessage.trim() && !selectedFile)}
              className="self-center rounded-full p-2.5 sm:p-3 transition-all shrink-0
                        bg-primary text-white hover:opacity-90
                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30
                        disabled:opacity-50 disabled:cursor-not-allowed"
              title="Kirim"
              aria-label="Kirim"
            >
              {isLoading ? (
                <span className="inline-block animate-spin">
                  <Icon name="Loader" size={16} className="text-white" />
                </span>
              ) : (
                <Icon name="Send" size={16} className="text-white" />
              )}
            </button>
          </div>

          {/* Hint kecil */}
          <div className="text-[11px] text-text-secondary dark:text-gray-300 text-center">
            Enter untuk kirim • Shift+Enter untuk baris baru • Pastikan Gambar Jelas
          </div>
        </div>

      </div>

      {/* Image Modal — FULLSCREEN viewer */}
{showImageModal && (
  <div
    className="fixed inset-0 z-[9999] flex flex-col"
    role="dialog"
    aria-modal="true"
    aria-labelledby="image-modal-title"
  >
    {/* Backdrop */}
    <div
      className="absolute inset-0 bg-black/85 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) closeImageModal(); // tutup hanya jika benar2 klik backdrop
      }}
    />

    {/* Shell */}
    <div className="relative z-10 flex h-screen w-screen flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3
                      bg-white/90 dark:bg-gray-900/90
                      border-b border-black/10 dark:border-white/10
                      shadow-sm">
        <h3 id="image-modal-title" className="text-base sm:text-lg font-semibold truncate">
          {modalImageTitle || 'Dental Visualization'}
        </h3>
        <div className="flex items-center gap-1.5">
          <a
            href={modalImageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition"
            title="Open in new tab"
            aria-label="Open in new tab"
          >
            <Icon name="ExternalLink" size={18} />
          </a>
          <button
            onClick={downloadVisualization}
            className="p-2 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition"
            title="Download"
            aria-label="Download"
          >
            <Icon name="Download" size={18} />
          </button>
          <button
            onClick={closeImageModal}
            className="p-2 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition"
            title="Close"
            aria-label="Close"
          >
            <Icon name="X" size={18} />
          </button>
        </div>
      </div>

      {/* Canvas area (full viewport minus toolbar) */}
      <div
        className="flex-1 overflow-auto p-0 sm:p-4 flex items-center justify-center"
        onMouseDown={(e) => e.stopPropagation()} // cegah menutup saat klik konten
      >
        <img
          src={modalImageUrl}
          alt={modalImageTitle || 'Dental Visualization'}
          className="block select-none
                     max-h-[calc(100vh-64px)]  // 64px ≈ tinggi toolbar
                     max-w-[100vw]
                     object-contain"
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
      </div>
    </div>
  </div>
)}


    </div>
  );
};

export default SereneChat;
