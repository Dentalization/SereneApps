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
            <h3 className="text-lg font-medium text-error mb-2">Gagal Memuat Hasil</h3>
            <p className="text-secondary text-sm">{this.state.error?.message || 'Terjadi kesalahan sistem'}</p>
            <button 
              onClick={() => this.setState({ hasError: false, error: null })}
              className="mt-4 px-4 py-2 bg-brand-primary text-white rounded-lg text-sm"
            >
              Coba Lagi
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Helper timestamp
const getResultTimestamp = (result) => {
  if (!result) return 0;
  try {
    const dateValue = result.date || result.createdAt || result.recordedAt || result.timestamp;
    if (!dateValue) return 0;
    const parsed = new Date(dateValue).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
  } catch (e) { return 0; }
};

// --- HELPER: LocalStorage Session Management ---
// Kunci penyimpanan: ai_chat_session_{patientId}_{resultId}
const getSessionStorageKey = (patientId, resultId) => `ai_chat_session_${patientId}_${resultId}`;

const saveSessionToLocal = (patientId, resultId, sessionId) => {
  if (!patientId || !resultId || !sessionId) return;
  try {
    localStorage.setItem(getSessionStorageKey(patientId, resultId), sessionId);
  } catch (e) { /* ignore */ }
};

const getSessionFromLocal = (patientId, resultId) => {
  if (!patientId || !resultId) return null;
  try {
    return localStorage.getItem(getSessionStorageKey(patientId, resultId));
  } catch (e) { return null; }
};

// Component Utama
const PatientAIResult = ({ patient }) => {
  const { t } = useLanguage();

  // State untuk Chat Toggle
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  // Ref khusus untuk container chat
  const chatContainerRef = useRef(null);

  if (!patient) {
    return (
      <div className="bg-surface border border-primary/20 rounded-2xl shadow-theme-lg p-6">
        <div className="text-center py-8 text-secondary">Memuat data pasien...</div>
      </div>
    );
  }

  if (!patient.aiResults || patient.aiResults.length === 0) {
    return (
      <div className="bg-surface border border-primary/20 rounded-2xl shadow-theme-lg p-6 theme-transition">
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-surface-elevated rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/10">
            <span className="text-3xl">🦷</span>
          </div>
          <h3 className="text-lg font-medium text-primary mb-2">{t('dentistPatient.ai.empty.title')}</h3>
          <p className="text-secondary">{t('dentistPatient.ai.empty.description')}</p>
        </div>
      </div>
    );
  }

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

  // Reset chat view saat ganti hasil analisis
  useEffect(() => {
    if (!sortedResults.length) {
      setSelectedResult(null);
      return;
    }
    setSelectedResult((prev) => {
      // Jika result ID sama, pertahankan. Jika beda, reset chat open state.
      if (prev && sortedResults.some((result) => result.id === prev.id)) {
        return prev;
      }
      setIsChatOpen(false); 
      return sortedResults[0];
    });
  }, [sortedResults]);

  // FIX: Scroll internal container chat saja
  useEffect(() => {
    if (isChatOpen && chatContainerRef.current) {
      const { scrollHeight, clientHeight } = chatContainerRef.current;
      chatContainerRef.current.scrollTo({
        top: scrollHeight - clientHeight,
        behavior: 'smooth'
      });
    }
  }, [chatMessages, isChatOpen, chatLoading]);

  // --- HANDLER: Send Chat ---
  const handleSendChat = async () => {
    if (!chatInput?.trim() || !selectedResult) return;
    setChatLoading(true);

    const userText = chatInput.trim();

    try {
      // 1. Resolve Session ID (Prioritas: State -> Props -> LocalStorage)
      let sessionId = selectedResult.sessionId || selectedResult.session_id;
      
      if (!sessionId) {
        sessionId = getSessionFromLocal(patient.id, selectedResult.id);
      }

      // 2. Create Session if truly null
      if (!sessionId) {
        try {
          const createResp = await aiHttp.post('/sessions', {
            role: 'dentist',
            language: 'bilingual',
            metadata: { source: 'dentist_portal', patient_id: patient.id, ai_result_id: selectedResult.id }
          });
          sessionId = createResp?.data?.id || createResp?.data?.session?.id;
          
          if (sessionId) {
            // Simpan ke state & LocalStorage agar persistent di refresh
            saveSessionToLocal(patient.id, selectedResult.id, sessionId);
            setSelectedResult(prev => ({ ...(prev || {}), sessionId }));

            // Coba simpan ke Backend (Best Effort)
            try {
              await http.post(`/v1/dentist-portal/patients/${patient.id}/ai-results/${selectedResult.id}/session`, { sessionId });
              skipNextFetchRef.current = true;
            } catch (e) {}
          }
        } catch (createErr) {
          console.warn('Session init failed, continuing stateless');
        }
      }

      // 3. Optimistic UI
      setChatMessages(prev => [...prev, { role: 'user', content: userText }]);
      setChatInput('');

      // 4. Payload
      const formData = new FormData();
      formData.append('message', userText);
      formData.append('role', 'dentist');
      formData.append('language', 'bilingual');
      if (sessionId) formData.append('session_id', sessionId);

      // 5. Attach Image (URL Fallback for Mobile/Expo)
      const summaryImage = selectedResult?.images?.[0];
      if (summaryImage?.url) {
        formData.append('image_url', summaryImage.url); 
        
        try {
          const isLocalhost = summaryImage.url.includes('localhost') || summaryImage.url.includes('127.0.0.1');
          if (!isLocalhost) {
            const imgResp = await fetch(summaryImage.url);
            if (imgResp.ok) {
              const blob = await imgResp.blob();
              formData.append('images', blob, 'context.jpg');
            }
          }
        } catch (e) { /* ignore cors error */ }
      }

      // 6. Send
      let resp = null;
      try {
        resp = await aiHttp.post('/chat/upload', formData);
      } catch (uploadErr) {
        // Fallback text-only
        if (uploadErr?.response?.status === 500 || uploadErr?.response?.status === 422) {
          const fallbackPayload = {
            message: userText,
            session_id: sessionId,
            role: 'dentist',
            language: 'bilingual',
            image_url: summaryImage?.url
          };
          resp = await aiHttp.post('/chat', fallbackPayload);
        } else {
          throw uploadErr;
        }
      }

      let aiReply = resp?.data?.reply || resp?.data?.content || '';

      // 7. Polling if empty (ensure we fetch history if direct reply is missing)
      if (!aiReply && sessionId) {
        for (let i = 0; i < 5 && !aiReply; i++) {
          await new Promise(r => setTimeout(r, 1000));
          try {
            const hist = await aiHttp.get(`/sessions/${sessionId}/messages`);
            const msgs = hist?.data?.messages || hist?.data || [];
              const lastAI = [...msgs].reverse().find(m => m.role !== 'user');
              if (lastAI) aiReply = htmlToMarkdown(lastAI.content);
          } catch (e) {}
        }
      }

      setChatMessages(prev => [...prev, { role: 'ai', content: htmlToMarkdown(aiReply) || 'AI sedang memproses...' }]);

    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'ai', content: 'Gagal mengirim pesan.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  // --- Load History (Enhanced with Local Storage Check) ---
  useEffect(() => {
    const fetchHistory = async () => {
      if (skipNextFetchRef.current || !selectedResult) return;
      
      // 1. Cek Session ID dari Props/State atau LocalStorage
      let sessionId = selectedResult.sessionId || selectedResult.session_id;
      if (!sessionId && patient?.id && selectedResult?.id) {
        sessionId = getSessionFromLocal(patient.id, selectedResult.id);
      }

      if (!sessionId) {
        setChatMessages([]);
        return;
      }

      // 2. Load pesan jika session ID ada
      try {
        const resp = await aiHttp.get(`/sessions/${sessionId}/messages`);
        const rawData = resp?.data;
        let msgs = Array.isArray(rawData) ? rawData : (rawData?.messages || []);
        
        // Normalisasi pesan (konversi HTML ke plain agar format dapat diterapkan ulang)
            const normalized = msgs.map(m => ({ 
          role: m.role || 'ai', 
          content: htmlToMarkdown(m.content || m.message || '') 
        }));
        
        // Hanya update jika ada pesan (menghindari wipe out state loading)
        if (normalized.length > 0) {
            setChatMessages(normalized);
        } else {
            // Jika kosong, biarkan kosong (jangan timpa jika sebelumnya ada optimistik UI, tapi ini load awal)
            setChatMessages([]);
        }
      } catch (e) {
        setChatMessages([]);
      }
    };
    fetchHistory();
  }, [selectedResult, patient?.id]); // Re-run jika pasien atau hasil analisis berubah

  // --- Helpers ---
  const formatAIResponse = (text) => {
    if (!text) return <span>...</span>;
    return String(text).split('\n').map((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) return null;
      // Bold Parsing
      const parts = trimmed.split(/(\*\*.*?\*\*)/g);
      const content = parts.map((part, i) => 
        (i % 2 === 1) ? <strong key={i} className="font-bold text-slate-900">{part.slice(2, -2)}</strong> : <span key={i}>{part}</span>
      );
      if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
        return <div key={idx} className="flex gap-2 pl-2"><span className="mt-2 w-1.5 h-1.5 bg-gray-500 rounded-full flex-shrink-0"/><span>{content}</span></div>;
      }
      return <p key={idx} className="mb-1">{content}</p>;
    });
  };

  // Convert potential stored HTML back to plain text while preserving simple breaks
  const htmlToPlain = (html) => {
    if (!html) return '';
    try {
      // Preserve <br> and </p> as newlines
      const intermediate = String(html).replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n\n');
      const div = document.createElement('div');
      div.innerHTML = intermediate;
      return (div.textContent || div.innerText || '').trim();
    } catch (e) {
      return String(html);
    }
  };

  // Convert simple HTML tags to lightweight Markdown so our formatter can re-apply styling
  const htmlToMarkdown = (html) => {
    if (!html) return '';
    try {
      const div = document.createElement('div');
      div.innerHTML = String(html);

      const walk = (node) => {
        if (!node) return '';
        if (node.nodeType === Node.TEXT_NODE) return node.nodeValue;

        let out = '';
        const tag = (node.tagName || '').toLowerCase();

        if (tag === 'strong' || tag === 'b') {
          return `**${Array.from(node.childNodes).map(walk).join('')}**`;
        }
        if (tag === 'em' || tag === 'i') {
          return `*${Array.from(node.childNodes).map(walk).join('')}*`;
        }
        if (tag === 'br') return '\n';
        if (tag === 'p') return `${Array.from(node.childNodes).map(walk).join('')}\n\n`;
        if (tag === 'li') return `- ${Array.from(node.childNodes).map(walk).join('')}\n`;
        if (tag === 'ul' || tag === 'ol') return `${Array.from(node.childNodes).map(walk).join('')}\n`;
        if (tag === 'a') {
          const href = node.getAttribute('href') || '';
          const text = Array.from(node.childNodes).map(walk).join('');
          return href ? `${text} (${href})` : text;
        }

        // default: recurse children
        out = Array.from(node.childNodes).map(walk).join('');
        return out;
      };

      return Array.from(div.childNodes).map(walk).join('').trim();
    } catch (e) {
      return htmlToPlain(html);
    }
  };

  const renderBold = (text) => {
    if (!text) return null;
    return String(text).split(/(\*\*.*?\*\*)/g).map((part, i) => 
      (i % 2 === 1) ? <strong key={i} className="font-semibold text-primary">{part.slice(2, -2)}</strong> : <span key={i}>{part}</span>
    );
  };

  const handleResultChange = (e) => setSelectedResult(sortedResults.find(r => r.id === e.target.value));

  // Data Preparation
  const summaryText = (stripDiagnosisIntro ? stripDiagnosisIntro(selectedResult?.summary || '') : selectedResult?.summary || '').trim();
  const summarySections = selectedResult?.summarySections || selectedResult?.diagnosis?.[0]?.sections || [];
  const hasSummaryHighlights = Boolean(summaryText || summarySections.length);
  const galleryImages = selectedResult?.images || [];
  const summaryImage = galleryImages[0] || null;

  const getRiskColor = (risk) => {
    switch (String(risk).toLowerCase()) {
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

  return (
    <div className="space-y-6">
      {/* 1. Header & Stats (Selalu Muncul) */}
      <div className="bg-surface border border-primary/20 rounded-2xl shadow-theme-lg p-6 theme-transition">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-primary">{t('dentistPatient.ai.header.title')}</h2>
          <span className="text-sm text-secondary">{t('dentistPatient.ai.header.count', { count: patient.aiResults.length })}</span>
        </div>

        {patient.aiResults.length > 1 && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-text-primary mb-2">
              {t('dentistPatient.ai.controls.select')}
            </label>
            <select
              value={selectedResult?.id || ''}
              onChange={handleResultChange}
              className="w-full px-3 py-2 border border-primary/10 rounded-md bg-background text-primary focus:ring-2 focus:ring-brand-primary focus:border-transparent"
            >
              {sortedResults.map((result) => (
                <option key={result.id} value={result.id}>{result.date} - {result.type}</option>
              ))}
            </select>
          </div>
        )}

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
              {String(selectedResult?.riskLevel || 'Unknown').toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Main Content Area */}
      <div className="bg-surface-elevated border border-primary/10 rounded-xl shadow-theme-md theme-transition">
        {/* Navigation Tabs */}
        <div className="border-b border-primary/10">
          <div className="flex overflow-x-auto">
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
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
                  expandedSection === tab.id
                    ? 'border-brand-primary text-brand-primary bg-brand-primary/5'
                    : 'border-transparent text-secondary hover:text-primary hover:bg-muted/50'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6">
          {expandedSection === 'summary' && (
            <div className="space-y-6">
              
              {/* A. VISUALISASI (Gambar Selalu di Atas) */}
              <h3 className="text-lg font-semibold text-primary">{t('dentistPatient.ai.summary.title')}</h3>
              
              {summaryImage && (
                <div className="relative rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span className="text-sm font-semibold text-slate-700">Visualisasi Area Gigi</span>
                    </div>
                    <span className="text-xs text-slate-500 bg-white border px-2 py-0.5 rounded">AI Annotated</span>
                  </div>
                  <div className="relative bg-slate-100 flex justify-center">
                    <img
                      src={summaryImage.url}
                      alt="Annotated"
                      className="max-h-[400px] w-auto object-contain"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.parentElement.innerHTML = `<div class="p-8 text-center text-gray-400 text-sm">Gambar tidak dapat dimuat</div>`;
                      }}
                    />
                  </div>
                  {summaryImage.description && (
                    <div className="px-4 py-3 bg-slate-50 border-t">
                      <p className="text-sm leading-relaxed text-slate-600">{summaryImage.description}</p>
                    </div>
                  )}
                </div>
              )}

              {/* B. RINGKASAN TEKS (Wajib Dibaca Dulu) */}
              {hasSummaryHighlights && (
                <div className="bg-surface rounded-lg p-6 border border-primary/10 shadow-sm space-y-4">
                  {summaryText && (
                    <div className="text-primary leading-[1.8] text-justify text-sm whitespace-pre-wrap">
                      {renderBold(summaryText)}
                    </div>
                  )}
                  {summarySections.map((section, idx) => (
                    <div key={idx} className="pt-3 border-t border-primary/10">
                      <h4 className="text-sm font-semibold text-primary mb-2">{section.title}</h4>
                      <div className="text-sm text-secondary leading-[1.7] text-justify pl-2 border-l-2 border-primary/10">
                        {renderBold(section.content)}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* C. CHAT SECTION (DEFAULT HIDDEN/COLLAPSED) */}
              {/* Ini solusi untuk "Dentist harus baca dulu" */}
              <div className="mt-8 border-t border-primary/10 pt-6">
                {!isChatOpen ? (
                  <div className="text-center">
                    <p className="text-secondary text-sm mb-3">Ada pertanyaan lebih lanjut mengenai hasil analisis di atas?</p>
                    <button 
                      onClick={() => setIsChatOpen(true)}
                      className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-primary/10 text-brand-primary rounded-full font-medium hover:bg-brand-primary/20 transition-colors"
                    >
                      <span className="text-lg">💬</span>
                      Tanya Asisten AI
                    </button>
                  </div>
                ) : (
                  <div className="bg-surface rounded-xl border border-primary/20 overflow-hidden shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="bg-gradient-to-r from-brand-primary/5 to-transparent px-4 py-3 border-b border-primary/10 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🤖</span>
                        <div>
                          <h4 className="font-semibold text-primary text-sm">Clinical Decision Support System</h4>
                          <p className="text-xs text-secondary">Konteks: Hasil analisis pasien ini</p>
                        </div>
                      </div>
                      <button onClick={() => setIsChatOpen(false)} className="text-secondary hover:text-error p-1">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>

                    <div 
                      ref={chatContainerRef} // Ref scroll internal di sini
                      className="h-80 overflow-y-auto p-4 space-y-4 bg-gray-50/50"
                    >
                      {chatMessages.length === 0 && !chatLoading && (
                        <div className="text-center text-gray-400 text-sm py-10">
                          Silakan ajukan pertanyaan terkait diagnosis atau rencana perawatan.
                        </div>
                      )}
                      
                      {chatMessages.map((m, i) => (
                        <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                            m.role === 'user' 
                              ? 'bg-brand-primary text-white rounded-br-sm' 
                              : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm'
                          }`}>
                            {m.role === 'ai' ? formatAIResponse(m.content) : m.content}
                          </div>
                        </div>
                      ))}

                      {/* AI Typing Indicator */}
                      {chatLoading && (
                        <div className="flex justify-start">
                          <div className="bg-white border border-gray-200 px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm flex items-center gap-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="p-3 bg-white border-t flex gap-2">
                      <input 
                        className="flex-1 border rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all"
                        placeholder="Ketik pertanyaan klinis..."
                        value={chatInput}
                        onChange={e => setChatInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSendChat()}
                        disabled={chatLoading}
                      />
                      <button 
                        onClick={handleSendChat}
                        disabled={chatLoading || !chatInput.trim()}
                        className="bg-brand-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <svg className="w-5 h-5 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* Expanded Sections: Diagnosis */}
          {expandedSection === 'diagnosis' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-primary mb-4">{t('dentistPatient.ai.diagnosis.title')}</h3>
              {selectedResult.diagnosis?.map((diag, index) => (
                <div key={index} className="bg-surface rounded-lg p-5 border border-primary/10 hover:border-brand-primary/30 transition-colors">
                  <div className="flex justify-between mb-2">
                    <h4 className="font-semibold text-primary">{diag.condition}</h4>
                    <span className={`text-sm font-medium ${getConfidenceColor(diag.probability)}`}>
                      {diag.probability ? `${diag.probability}%` : ''}
                    </span>
                  </div>
                  <p className="text-sm text-secondary leading-relaxed">{diag.description}</p>
                  
                  {/* Detailed breakdown if available */}
                  {diag.details && (
                    <div className="mt-3 pt-3 border-t border-dashed border-gray-200">
                      <AnalysisSummaryRenderer summary={diag.details} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Expanded Sections: Symptoms */}
          {expandedSection === 'symptoms' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-primary mb-4">{t('dentistPatient.ai.symptoms.title')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedResult.symptoms?.map((symptom, index) => (
                  <div key={index} className="p-4 bg-surface rounded-lg border border-primary/10 flex items-start gap-3">
                    <div className="mt-1.5 w-2 h-2 rounded-full bg-brand-primary flex-shrink-0"></div>
                    <div>
                      <p className="font-medium text-primary">{symptom.name}</p>
                      {symptom.severity && <p className="text-xs text-secondary mt-1 capitalize">Tingkat keparahan: {symptom.severity}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Expanded Sections: Recommendations */}
          {expandedSection === 'recommendations' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-primary mb-4">{t('dentistPatient.ai.recommendations.title')}</h3>
              <div className="space-y-3">
                {selectedResult.recommendations?.map((rec, index) => (
                  <div key={index} className="flex items-start space-x-4 p-5 bg-surface rounded-lg border border-primary/10">
                    <div className="w-8 h-8 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center font-bold text-sm flex-shrink-0">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-primary mb-1">{rec.title}</h4>
                      <p className="text-sm text-secondary leading-relaxed">{rec.description}</p>
                      <div className="flex gap-2 mt-3">
                        {rec.urgency && (
                          <span className={`inline-block px-2.5 py-1 text-xs rounded-md font-medium bg-gray-100 text-gray-600 border border-gray-200`}>
                            {getUrgencyLabel(rec.urgency)}
                          </span>
                        )}
                        {rec.priority && (
                          <span className={`inline-block px-2.5 py-1 text-xs rounded-md font-medium ${
                            rec.priority === 'high' ? 'bg-orange-50 text-orange-700 border-orange-100' : 'bg-blue-50 text-blue-700 border-blue-100'
                          }`}>
                            Prioritas: {rec.priority}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Expanded Sections: Images */}
          {expandedSection === 'images' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-primary mb-4">{t('dentistPatient.ai.images.title')}</h3>
              {galleryImages.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {galleryImages.map((image, index) => (
                    <div key={index} className="bg-surface rounded-xl border border-primary/10 overflow-hidden group shadow-sm hover:shadow-md transition-shadow">
                      <div className="aspect-video bg-gray-100 relative">
                        <img 
                          src={image.url} 
                          alt={image.description}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      </div>
                      <div className="p-4 bg-white">
                        <p className="text-sm font-semibold text-primary mb-1">{image.type || 'Clinical Image'}</p>
                        <p className="text-xs text-secondary">{image.description || 'Tidak ada deskripsi'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl">📷</div>
                  <p className="text-secondary font-medium">{t('dentistPatient.ai.images.empty')}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="border-t border-primary/10 px-6 py-4 bg-gray-50/50">
          <div className="flex justify-between items-center">
            <div className="text-xs text-secondary font-medium">
              {t('dentistPatient.ai.footer.performedOn', { date: selectedResult?.date ?? '-' })}
            </div>
            <div className="flex space-x-3">
              <Button variant="outline" size="sm" className="bg-white hover:bg-gray-50">
                {t('dentistPatient.ai.footer.export')}
              </Button>
              <Button variant="outline" size="sm" className="bg-white hover:bg-gray-50">
                {t('dentistPatient.ai.footer.share')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Wrap with Error Boundary
const PatientAIResultWithErrorBoundary = (props) => (
  <PatientAIResultErrorBoundary>
    <PatientAIResult {...props} />
  </PatientAIResultErrorBoundary>
);

export default PatientAIResultWithErrorBoundary;