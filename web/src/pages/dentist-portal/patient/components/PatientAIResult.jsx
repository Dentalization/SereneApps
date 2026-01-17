import React, { useEffect, useMemo, useRef, useState } from 'react';
import Button from '../../../../components/ui/Button';
import { useLanguage } from '../../../../contexts/LanguageContext';
import AnalysisSummaryRenderer from './AnalysisSummaryRenderer';
import { stripDiagnosisIntro } from '../../../../utils/aiTextHelpers';
import { aiHttp, http } from '../../../../utils/httpClient';

// Error Boundary Component
class PatientAIResultErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('❌ PatientAIResult Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-surface border border-error/20 rounded-2xl shadow-theme-lg p-6">
          <div className="text-center py-8">
            <h3 className="text-lg font-medium text-error mb-2">Error Loading AI Results</h3>
            <p className="text-secondary text-sm">{this.state.error?.message || 'Something went wrong'}</p>
            <button 
              onClick={() => this.setState({ hasError: false, error: null })}
              className="mt-4 px-4 py-2 bg-brand-primary text-white rounded-lg text-sm"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const getResultTimestamp = (result) => {
  if (!result) return 0;
  const dateValue = result.date || result.createdAt || result.recordedAt || result.timestamp;
  if (!dateValue) return 0;
  const parsed = new Date(dateValue).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

const PatientAIResult = ({ patient }) => {
  const { t } = useLanguage();

  // Debug logging
  console.log('🔍 PatientAIResult rendered with patient:', patient);

  if (!patient) {
    console.warn('⚠️ No patient provided to PatientAIResult');
    return (
      <div className="bg-surface border border-primary/20 rounded-2xl shadow-theme-lg p-6 theme-transition">
        <div className="text-center py-8">
          <p className="text-secondary">Loading patient data...</p>
        </div>
      </div>
    );
  }

  if (!patient.aiResults || patient.aiResults.length === 0) {
    console.log('ℹ️ No AI results for patient:', patient.id);
    return (
      <div className="bg-surface border border-primary/20 rounded-2xl shadow-theme-lg p-6 theme-transition">
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-surface-elevated rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/10">
            <svg className="w-8 h-8 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014.846 21H9.154a3.374 3.374 0 00-2.14-1.453l-.548-.547z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-primary mb-2">{t('dentistPatient.ai.empty.title')}</h3>
          <p className="text-secondary">{t('dentistPatient.ai.empty.description')}</p>
        </div>
      </div>
    );
  }

  console.log('✅ PatientAIResult: Rendering with', patient.aiResults.length, 'results');

  const sortedResults = useMemo(() => {
    if (!patient.aiResults?.length) return [];
    return [...patient.aiResults].sort((a, b) => getResultTimestamp(b) - getResultTimestamp(a));
  }, [patient.aiResults]);

  const [selectedResult, setSelectedResult] = useState(sortedResults[0] || null);
  const [expandedSection, setExpandedSection] = useState('summary');
  
  // Chat state
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const skipNextFetchRef = useRef(false);

  useEffect(() => {
    if (!sortedResults.length) {
      setSelectedResult(null);
      return;
    }
    setSelectedResult((prev) => {
      if (prev && sortedResults.some((result) => result.id === prev.id)) {
        return prev;
      }
      return sortedResults[0];
    });
  }, [sortedResults]);

  // --- HANDLER: Send Chat ---
  const handleSendChat = async () => {
    if (!chatInput?.trim() || !selectedResult) return;
    setChatLoading(true);

    const userText = chatInput.trim();

    try {
      let sessionId = selectedResult.sessionId || selectedResult.session_id || null;

      // 1. Session Management
      if (!sessionId) {
        try {
          console.log('📝 Creating new session...');
          const createResp = await aiHttp.post('/sessions', {
            role: 'dentist',
            language: 'bilingual',
            metadata: { source: 'dentist_portal', patient_id: patient.id, ai_result_id: selectedResult.id }
          });
          
          sessionId = createResp?.data?.id || createResp?.data?.session?.id || null;
          
          // Attempt persistence (Fail silently on 404)
          if (sessionId) {
            try {
              await http.post(`/v1/dentist-portal/patients/${patient.id}/ai-results/${selectedResult.id}/session`, { sessionId });
              skipNextFetchRef.current = true;
              setSelectedResult(prev => ({ ...(prev || {}), sessionId }));
            } catch (persistErr) {
              console.warn('⚠️ Session persist skipped:', persistErr?.response?.status || persistErr.message);
              // Update local state even if backend persist failed
              setSelectedResult(prev => ({ ...(prev || {}), sessionId }));
            }
          }
        } catch (createErr) {
          console.error('⚠️ Session creation failed:', createErr.message);
          // Proceed without session ID (stateless chat)
        }
      }

      // 2. Optimistic UI
      setChatMessages(prev => [...prev, { role: 'user', content: userText }]);
      setChatInput('');

      // 3. Prepare FormData
      const formData = new FormData();
      formData.append('message', userText);
      formData.append('role', 'dentist');
      formData.append('language', 'bilingual');
      if (sessionId) formData.append('session_id', sessionId);

      // 4. Handle Image Attachment
      const summaryImage = selectedResult?.images?.[0];
      if (summaryImage?.url) {
        try {
          // console.log('📸 Fetching image:', summaryImage.url);
          const imgResp = await fetch(summaryImage.url);
          if (imgResp.ok) {
            const blob = await imgResp.blob();
            // FIX: Force a valid extension so the backend detects it's an image
            const filename = 'context_image.jpg'; 
            formData.append('images', blob, filename);
            if (summaryImage.description) {
              formData.append('image_description', summaryImage.description);
            }
          }
        } catch (imgErr) {
          console.warn('⚠️ Image attachment skipped:', imgErr.message);
        }
      }

      // 5. Send Request
      console.log('📤 Sending to /chat/upload...');
      let resp = null;
      try {
        resp = await aiHttp.post('/chat/upload', formData);
      } catch (uploadErr) {
        console.error('❌ /chat/upload error', uploadErr?.message);
        // Fallback logic for orchestrator errors
        const status = uploadErr?.response?.status;
        const body = uploadErr?.response?.data || {};
        
        if (status === 500 || status === 422) {
          console.warn('⚠️ Falling back to text-only /chat');
          try {
            const fallbackPayload = {
              message: userText,
              session_id: sessionId,
              role: 'dentist',
              language: 'bilingual'
            };
            resp = await aiHttp.post('/chat', fallbackPayload);
          } catch (fallbackErr) {
            throw uploadErr; // Throw original error if fallback fails
          }
        } else {
          throw uploadErr;
        }
      }

      let aiReply = resp?.data?.reply || resp?.data?.content || resp?.data?.message || '';

      // 6. Polling Fallback
      if (!aiReply && sessionId) {
        console.log('⏳ Polling for response...');
        for (let i = 0; i < 5 && !aiReply; i++) {
          await new Promise(r => setTimeout(r, 1000));
          try {
            const hist = await aiHttp.get(`/sessions/${sessionId}/messages`);
            const raw = hist?.data;
            const messages = Array.isArray(raw) ? raw : (raw?.messages || []);
            
            if (Array.isArray(messages) && messages.length > 0) {
              const lastAI = [...messages].reverse().find(m => m.role !== 'user');
              if (lastAI) aiReply = lastAI.content || lastAI.message;
            }
          } catch (e) { /* ignore poll errors */ }
        }
      }

      // 7. Update UI
      setChatMessages(prev => [...prev, { 
        role: 'ai', 
        content: aiReply || 'AI sedang memproses jawaban...' 
      }]);

    } catch (err) {
      console.error('❌ Chat Error:', err);
      setChatMessages(prev => [...prev, { 
        role: 'ai', 
        content: 'Maaf, terjadi kesalahan saat mengirim pesan.' 
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  // --- EFFECT: Load History ---
  useEffect(() => {
    const fetchSessionMessages = async () => {
      if (skipNextFetchRef.current) {
        skipNextFetchRef.current = false;
        return;
      }
      if (!selectedResult) return;
      
      const sessionId = selectedResult.sessionId || selectedResult.session_id || null;
      if (!sessionId) {
        setChatMessages([]);
        return;
      }

      setChatLoading(true);
      try {
        const resp = await aiHttp.get(`/sessions/${sessionId}/messages`);
        const rawData = resp?.data;
        
        let msgs = [];
        if (Array.isArray(rawData)) {
          msgs = rawData;
        } else if (rawData && Array.isArray(rawData.messages)) {
          msgs = rawData.messages;
        } else {
          msgs = [];
        }

        const normalized = msgs.map(m => ({ 
          role: m.role || 'ai', 
          content: m.content || m.reply || m.message || '' 
        }));

        setChatMessages(prev => {
          if (normalized.length === 0 && prev.length > 0) return prev;
          return normalized;
        });
      } catch (err) {
        console.error('❌ Fetch History Error:', err);
        setChatMessages([]);
      } finally {
        setChatLoading(false);
      }
    };

    fetchSessionMessages();
  }, [selectedResult]);

  // --- Helper: Rich Text Formatter (HARDENED) ---
  const formatAIResponse = (text) => {
    if (!text) return <span className="text-secondary">Tidak ada respons</span>;

    // SAFETY: Ensure text is a string and preserve original line breaks but
    // do not interpret single asterisks or dashes as bullets. Only convert
    // double-asterisk bold markers (**text**) to <strong>.
    const safeText = String(text);
    const lines = safeText.split('\n');

    return (
      <div className="space-y-2 text-sm leading-relaxed text-justify">
        {lines.map((line, index) => {
          const trimmed = line.trim();
          if (!trimmed) return null;

          // Only handle bold markers; leave all other characters unchanged
          const parts = trimmed.split(/(\*\*.*?\*\*)/g);

          const formattedContent = parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return (
                <strong key={i} className="font-bold text-primary-dark">
                  {part.slice(2, -2)}
                </strong>
              );
            }
            return <span key={i}>{part}</span>;
          });

          return (
            <p key={index} className="m-0">
              {formattedContent}
            </p>
          );
        })}
      </div>
    );
  };

  // Render inline bold markers (**text**) into <strong>
  const renderBold = (text) => {
    if (!text && text !== 0) return null;
    const parts = String(text).split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-semibold text-primary">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  const handleResultChange = (event) => {
    const next = sortedResults.find((result) => result.id === event.target.value);
    if (next) setSelectedResult(next);
  };

  const summaryText = useMemo(() => {
    const narrative = selectedResult?.summary || selectedResult?.overallAssessment || selectedResult?.diagnosis?.[0]?.description || '';
    const filtered = stripDiagnosisIntro ? stripDiagnosisIntro(narrative) : narrative; // Safety check
    return filtered?.trim() || narrative?.trim() || null;
  }, [selectedResult]);

  const summarySections = selectedResult?.summarySections || selectedResult?.diagnosis?.[0]?.sections || [];
  const hasSummaryHighlights = Boolean(summaryText || summarySections.length);
  const galleryImages = selectedResult?.images || [];
  const summaryImage = galleryImages[0] || null;
  const renderedResultSummary = (stripDiagnosisIntro ? stripDiagnosisIntro(selectedResult?.summary || '') : selectedResult?.summary || '').trim() || null;

  const getRiskColor = (risk) => {
    switch (risk?.toLowerCase()) {
      case 'high': return 'text-error bg-error/10 border-error/30';
      case 'medium': return 'text-warning bg-warning/10 border-warning/30';
      case 'low': return 'text-success bg-success/10 border-success/30';
      default: return 'text-secondary bg-muted border-primary/10';
    }
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 80) return 'text-success';
    if (confidence >= 60) return 'text-warning';
    return 'text-error';
  };

  const getRiskLabel = (risk) => {
    const key = (risk || '').toLowerCase() || 'unknown';
    const label = t(`dentistPatient.ai.riskLevels.${key}`);
    return label.startsWith('dentistPatient') ? risk : label;
  };

  const getSeverityLabel = (severity) => {
    const key = (severity || '').toLowerCase() || 'unknown';
    const label = t(`dentistPatient.ai.severityLevels.${key}`);
    return label.startsWith('dentistPatient') ? severity : label;
  };

  const getUrgencyLabel = (urgency) => {
    const key = (urgency || '').toLowerCase() || 'normal';
    const label = t(`dentistPatient.ai.urgencyLevels.${key}`);
    return label.startsWith('dentistPatient') ? urgency : label;
  };

  const resultsCountLabel = t('dentistPatient.ai.header.count', { count: patient.aiResults.length });

  return (
    <div className="space-y-6">
      {/* AI Results Header */}
      <div className="bg-surface border border-primary/20 rounded-2xl shadow-theme-lg p-6 theme-transition">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-primary">{t('dentistPatient.ai.header.title')}</h2>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-secondary">{resultsCountLabel}</span>
          </div>
        </div>

        {/* Results Selector */}
        {patient.aiResults.length > 1 && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-text-primary mb-2">
              {t('dentistPatient.ai.controls.select')}
            </label>
            <select
              value={selectedResult?.id || ''}
              onChange={handleResultChange}
              className="w-full px-3 py-2 border border-primary/10 rounded-md bg-background text-primary focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-colors"
            >
              {sortedResults.map((result) => (
                <option key={result.id} value={result.id}>
                  {result.date} - {result.type}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Result Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-surface rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-2 h-2 bg-brand-primary rounded-full"></div>
              <span className="text-sm font-medium text-text-primary">{t('dentistPatient.ai.summary.analysisDate')}</span>
            </div>
            <p className="text-primary font-semibold">{selectedResult?.date ?? '-'}</p>
          </div>

          <div className="bg-surface rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-2 h-2 bg-brand-accent rounded-full"></div>
              <span className="text-sm font-medium text-text-primary">{t('dentistPatient.ai.summary.confidence')}</span>
            </div>
            <p className={`font-semibold ${getConfidenceColor(selectedResult?.confidence ?? 0)}`}>
              {selectedResult?.confidence != null ? `${selectedResult.confidence}%` : '–'}
            </p>
          </div>

          <div className="bg-surface rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-2 h-2 bg-trust-green rounded-full"></div>
              <span className="text-sm font-medium text-text-primary">{t('dentistPatient.ai.summary.risk')}</span>
            </div>
            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getRiskColor(selectedResult?.riskLevel)}`}>
              {getRiskLabel(selectedResult?.riskLevel)}
            </span>
          </div>
        </div>
      </div>

      {/* Detailed Results */}
      <div className="bg-surface-elevated border border-primary/10 rounded-xl shadow-theme-md theme-transition">
        {/* Tabs */}
        <div className="border-b border-primary/10">
          <div className="flex">
            {[
              { id: 'summary', label: t('dentistPatient.ai.tabs.summary'), icon: '📝' },
              { id: 'diagnosis', label: t('dentistPatient.ai.tabs.diagnosis'), icon: '🔍' },
              { id: 'symptoms', label: t('dentistPatient.ai.tabs.symptoms'), icon: '📋' },
              { id: 'recommendations', label: t('dentistPatient.ai.tabs.recommendations'), icon: '💡' },
              { id: 'images', label: t('dentistPatient.ai.tabs.images'), icon: '📸' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setExpandedSection(tab.id)}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  expandedSection === tab.id
                    ? 'border-brand-primary text-brand-primary bg-brand-primary/5'
                    : 'border-transparent text-secondary hover:text-primary hover:bg-muted/50'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {expandedSection === 'summary' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-primary mb-4">{t('dentistPatient.ai.summary.title')}</h3>
              
              {/* Annotated Image Card */}
              {summaryImage && (
                <div className="relative rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span className="text-sm font-semibold text-slate-700">Visualisasi Area Gigi</span>
                    </div>
                    <span className="text-xs text-slate-500">AI Annotated</span>
                  </div>
                  <div className="relative bg-slate-100">
                    <div className="aspect-video flex items-center justify-center">
                      <img
                        src={summaryImage.url}
                        alt={summaryImage.description || 'Annotated dental image'}
                        className="max-h-[420px] w-full object-contain"
                      />
                    </div>
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-100/90 to-transparent" />
                  </div>
                  {summaryImage.description && (
                    <div className="px-4 py-3 bg-slate-50 border-t">
                      <p className="text-sm leading-relaxed text-slate-600">{summaryImage.description}</p>
                    </div>
                  )}
                </div>
              )}

              {/* SHORT SUMMARY */}
              {hasSummaryHighlights && (
                <div className="bg-surface rounded-lg p-6 border border-primary/10 space-y-4">
                  {summaryText && (
                    <p className="text-primary leading-[1.8] text-justify whitespace-pre-wrap break-words text-sm">
                      {renderBold(summaryText)}
                    </p>
                  )}
                  {summarySections.length > 0 && (
                    <div className="space-y-3">
                      {summarySections.slice(0, 2).map((section, idx) => (
                        <div key={idx} className="pt-3 border-t border-primary/10">
                          <h4 className="text-sm font-semibold text-primary mb-2">{section.title}</h4>
                          <p className="text-sm text-secondary leading-[1.7] text-justify line-clamp-3">
                            {renderBold(section.content)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* AI Chat Section */}
              <div className="bg-surface rounded-lg border border-primary/10 overflow-hidden">
                <div className="bg-gradient-to-r from-brand-primary/10 to-brand-accent/10 px-6 py-4 border-b border-primary/10 flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-primary">{t('dentistPatient.ai.chat.title')}</h4>
                    <p className="text-xs text-secondary mt-1">Dapatkan insights lebih dalam tentang analisis ini</p>
                  </div>
                </div>

                {/* Messages */}
                <div className="p-6 space-y-4 min-h-80 max-h-96 overflow-y-auto bg-surface">
                  {chatLoading && !chatMessages.length && (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <div className="w-12 h-12 bg-brand-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                          <svg className="w-6 h-6 text-brand-primary animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        </div>
                        <p className="text-sm text-secondary">{t('dentistPatient.ai.chat.loading')}</p>
                      </div>
                    </div>
                  )}

                  {!chatLoading && chatMessages.length === 0 && (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-3 border border-primary/10">
                          <svg className="w-8 h-8 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <p className="text-sm text-secondary">{t('dentistPatient.ai.chat.empty')}</p>
                      </div>
                    </div>
                  )}

                  {chatMessages.length > 0 && (
                    <div className="space-y-3">
                      {chatMessages.map((m, i) => {
                        if (!m) return null; // SAFETY CHECK
                        return (
                          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`px-4 py-3 rounded-lg text-sm leading-relaxed ${
                              m.role === 'user'
                                ? 'max-w-md bg-brand-primary text-white rounded-br-none'
                                : 'max-w-3xl bg-muted text-primary rounded-bl-none border border-primary/10'
                            }`}>
                              {m.role === 'ai' ? formatAIResponse(m.content) : m.content}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Input */}
                <div className="p-4 border-t border-primary/10 bg-surface-elevated">
                  <div className="flex gap-2">
                    <input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={async (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); await handleSendChat(); } }}
                      placeholder={t('dentistPatient.ai.chat.placeholder')}
                      className="flex-1 px-4 py-2 border border-primary/10 rounded-lg bg-background text-primary placeholder-secondary focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-colors text-sm"
                      disabled={chatLoading}
                    />
                    <button
                      onClick={handleSendChat}
                      disabled={chatLoading || !chatInput.trim()}
                      className="px-4 py-2 bg-brand-primary text-white rounded-lg font-medium hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                      {chatLoading ? (
                        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      ) : (
                        <>
                          {t('dentistPatient.ai.chat.send')}
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {expandedSection === 'diagnosis' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-primary mb-4">{t('dentistPatient.ai.diagnosis.title')}</h3>
              {selectedResult.diagnosis?.map((diag, index) => {
                const summaryToRender = renderedResultSummary || diag.details || diag.description || null;
                const shouldRenderAnalysis = Boolean(summaryToRender || selectedResult?.findings || selectedResult?.overallAssessment);
                return (
                  <div key={index} className="bg-surface rounded-lg p-5 border border-primary/10">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="font-semibold text-primary text-base">{diag.condition}</h4>
                        <p className="text-sm text-secondary leading-relaxed mt-1">{diag.description}</p>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-medium ${getConfidenceColor(diag.probability || 0)}`}>
                          {diag.probability != null ? `${diag.probability}%` : '–'}
                        </div>
                        <div className="text-xs text-secondary">{t('dentistPatient.ai.diagnosis.probability')}</div>
                      </div>
                    </div>
                    {diag.severity && (
                      <div className="mt-3 p-3 bg-muted/30 rounded-md">
                        <p className="text-sm text-primary">{t('dentistPatient.ai.diagnosis.severity', { severity: getSeverityLabel(diag.severity) })}</p>
                      </div>
                    )}
                    {shouldRenderAnalysis && (
                      <div className="mt-4 p-4 bg-muted/10 rounded-md border border-primary/10 text-justify">
                        <AnalysisSummaryRenderer 
                          summary={summaryToRender}
                          findings={selectedResult?.findings}
                          overallAssessment={selectedResult?.overallAssessment}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {expandedSection === 'symptoms' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-primary mb-4">{t('dentistPatient.ai.symptoms.title')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedResult.symptoms?.map((symptom, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 bg-surface rounded-lg border border-primary/10">
                    <div className={`w-3 h-3 rounded-full ${
                      symptom.severity === 'high' ? 'bg-error' :
                      symptom.severity === 'medium' ? 'bg-warning' : 'bg-success'
                    }`}></div>
                    <div className="flex-1">
                      <p className="font-medium text-primary">{symptom.name}</p>
                      <p className="text-sm text-secondary">
                        {t('dentistPatient.ai.symptoms.severity', { severity: getSeverityLabel(symptom.severity) })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {expandedSection === 'recommendations' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-primary mb-4">{t('dentistPatient.ai.recommendations.title')}</h3>
              <div className="space-y-3">
                {selectedResult.recommendations?.map((rec, index) => (
                  <div key={index} className="flex items-start space-x-3 p-4 bg-surface rounded-lg border border-primary/10">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                      rec.priority === 'urgent' ? 'bg-error' :
                      rec.priority === 'high' ? 'bg-warning' : 'bg-brand-primary'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-primary mb-1">{rec.title}</h4>
                      <p className="text-sm text-secondary mb-2">{rec.description}</p>
                      {rec.urgency && (
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                          rec.urgency === 'immediate' ? 'bg-error/10 text-error' :
                          rec.urgency === 'soon' ? 'bg-warning/10 text-warning' :
                          'bg-brand-primary/10 text-brand-primary'
                        }`}>
                          {getUrgencyLabel(rec.urgency)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {expandedSection === 'images' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-primary mb-4">{t('dentistPatient.ai.images.title')}</h3>
              {galleryImages.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {galleryImages.map((image, index) => (
                    <div key={index} className="bg-surface rounded-lg border border-primary/10 overflow-hidden">
                      <div className="aspect-video bg-muted flex items-center justify-center">
                        <img 
                          src={image.url} 
                          alt={image.description}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-3">
                        <p className="text-sm font-medium text-primary">{image.type}</p>
                        <p className="text-xs text-secondary">{image.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-secondary">{t('dentistPatient.ai.images.empty')}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="border-t border-primary/10 px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="text-sm text-secondary">
              {t('dentistPatient.ai.footer.performedOn', { date: selectedResult?.date ?? '-' })}
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm">
                {t('dentistPatient.ai.footer.export')}
              </Button>
              <Button variant="outline" size="sm">
                {t('dentistPatient.ai.footer.share')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Wrap component with Error Boundary
const PatientAIResultWithErrorBoundary = (props) => (
  <PatientAIResultErrorBoundary>
    <PatientAIResult {...props} />
  </PatientAIResultErrorBoundary>
);

export default PatientAIResultWithErrorBoundary;