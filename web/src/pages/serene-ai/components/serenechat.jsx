import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';

import useDentalAPI from '../../dentist-portal/ai/components/useDentalAPI';
import ChatMessage from '../../dentist-portal/ai/components/ChatMessage';
import { ImageLightbox } from '../../dentist-portal/ai/components/VisualFindingsCard';
import ThinkingLoader from '../../dentist-portal/ai/components/ThinkingLoader';
import InputBar from '../../dentist-portal/ai/components/InputBar';

/** Named export: lightweight debug widget */
export const SereneChatDebug = () => {
  const API_BASE_URL = import.meta.env.VITE_SERENE_AI_API_BASE_URL || 'https://api.dentalization.id';
  const API_VERSION = import.meta.env.VITE_SERENE_AI_API_VERSION || 'v1';
  const [apiTest, setApiTest] = useState(null);

  const testAPI = async () => {
    setApiTest('Testing...');
    try {
      const response = await fetch(`${API_BASE_URL}/api/${API_VERSION}/health`);
      const data = await response.json();
      setApiTest(`API OK: ${JSON.stringify(data)}`);
    } catch (err) {
      setApiTest(`API Error: ${err.message}`);
    }
  };

  return (
    <div style={{ padding: 20, border: '1px solid green', margin: 20 }}>
      <h2>SereneChat Debug Component</h2>
      <p>Component rendered successfully</p>
      <p>API URL: {API_BASE_URL}</p>
      <button onClick={testAPI}>Test API</button>
      {apiTest && <p>{apiTest}</p>}
    </div>
  );
};

// ── Empty State ─────────────────────────────────────

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="flex-1 flex items-center justify-center px-4 py-16"
    >
      <div className="text-center max-w-md">
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="inline-flex p-5 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 mb-6"
        >
          <Sparkles className="w-10 h-10 text-indigo-500" />
        </motion.div>
        <h2 className="text-xl font-bold text-primary mb-2">Ready to Analyze</h2>
        <p className="text-sm text-muted leading-relaxed mb-6">
          Upload a dental image or describe your concern to get AI-powered analysis with pathology detection and recommendations.
        </p>
        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            { icon: '🦷', label: 'Pathology Detection', sub: 'YOLO AI' },
            { icon: '🔬', label: 'Clinical Analysis', sub: 'Gemini LLM' },
            { icon: '📚', label: 'Evidence-Based', sub: 'Knowledge RAG' },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="p-3 rounded-xl bg-surface border border-primary hover:border-indigo-500/30 transition-colors"
            >
              <span className="text-2xl">{item.icon}</span>
              <p className="text-[11px] font-medium text-primary mt-2">{item.label}</p>
              <p className="text-[9px] text-muted mt-0.5">{item.sub}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ── Main Chat Component ─────────────────────────────

const SereneChat = () => {
  const {
    messages, isLoading, isBootstrapping, systemHealth,
    bootstrap, sendMessage,
  } = useDentalAPI('patient');

  const [lightboxImage, setLightboxImage] = useState(null);
  const messagesEndRef = useRef(null);

  // Interpret systemHealth permissively — backend may return different status strings
  const isHealthy = (() => {
    const s = systemHealth?.status;
    if (!s) return false;
    const st = String(s).toLowerCase();
    return ['ok', 'success', 'healthy', 'up', 'available'].includes(st) || (!st.includes('error') && !st.includes('fail') && !st.includes('down'));
  })();

  // Initialize on mount
  useEffect(() => { bootstrap(); }, [bootstrap]);

  // Auto-scroll when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  const handleSend = useCallback((text, imageFile) => {
    sendMessage(text, imageFile);
  }, [sendMessage]);

  const handleSuggestedQuestion = useCallback((q) => {
    sendMessage(q);
  }, [sendMessage]);

  if (isBootstrapping) {
    return (
      <div className="flex items-center justify-center py-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg animate-pulse">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <p className="text-sm text-muted font-medium">Initializing Serene AI...</p>
          <div className="w-48 h-1 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-indigo-500"
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: 2, ease: 'easeInOut' }}
            />
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-brand border border-border overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-secondary p-4 sm:p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold">Serene AI Assistant</h2>
              <p className="text-primary-foreground/80 text-sm">
                {isHealthy
                  ? 'Serene Ready'
                  : systemHealth
                    ? 'Connecting...'
                    : 'Connecting to AI backend...'}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  systemHealth?.status === 'ok' || systemHealth?.status === 'success'
                    ? 'bg-green-400'
                    : 'bg-yellow-400'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="relative" style={{ minHeight: '56rem' }}>
          <div className="overflow-y-auto p-4 sm:p-6 space-y-4" style={{ maxHeight: '56rem' }}>
            {messages.length === 0 ? (
              <EmptyState />
            ) : (
              <>
                <AnimatePresence mode="popLayout">
                  {messages.map((msg) => (
                    <ChatMessage
                      key={msg.id}
                      message={msg}
                      onImageClick={setLightboxImage}
                      onSuggestedQuestion={handleSuggestedQuestion}
                    />
                  ))}
                </AnimatePresence>
                <AnimatePresence>
                  {isLoading && <ThinkingLoader />}
                </AnimatePresence>
              </>
            )}
            <div ref={messagesEndRef} className="h-1" />
          </div>

          {/* Input Bar */}
          <div className="">
            <InputBar onSend={handleSend} isLoading={isLoading} />
          </div>
        </div>
      </div>

      {/* Lightbox Overlay */}
      <AnimatePresence>
        {lightboxImage && (
          <ImageLightbox base64={lightboxImage} onClose={() => setLightboxImage(null)} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default SereneChat;
