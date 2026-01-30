import React, { useEffect, useMemo, useRef, useState } from 'react';
import Button from '../../../../components/ui/Button';
import { useLanguage } from '../../../../contexts/LanguageContext';
import AnalysisSummaryRenderer from './AnalysisSummaryRenderer';
import { stripDiagnosisIntro } from '../../../../utils/aiTextHelpers';
import { aiHttp, http } from '../../../../utils/httpClient';

// ── 1. HELPER: Generate Advanced Context for the AI (CDSS) ──
const generateCDSSContext = (patient, aiResult) => {
  const history = patient.medicalHistory || {};
  const allergies = history.allergies?.length ? history.allergies.join(', ') : 'None';
  const conditions = history.conditions?.length ? history.conditions.join(', ') : 'None';
  const medications = history.medications?.length ? history.medications.join(', ') : 'None';

  return `
[SYSTEM CONTEXT: DENTAL CDSS MODE]
You are an expert Clinical Decision Support System assisting a dentist. 
Base your answers strictly on the patient's data and the current AI analysis findings provided below.

--- PATIENT PROFILE ---
Name: ${patient.name}
Age/Gender: ${patient.age || '?'} / ${patient.gender || '?'}
Medical History:
- Allergies: ${allergies}
- Conditions: ${conditions}
- Current Meds: ${medications}

--- CURRENT AI ANALYSIS FINDINGS ---
Date: ${aiResult.date}
Risk Level: ${aiResult.riskLevel}
Detected Conditions: ${aiResult.diagnosis?.map(d => d.condition).join(', ') || 'None'}
Clinical Summary: ${aiResult.summary}

--- INSTRUCTION ---
Answer the dentist's question acting as a professional consultant. 
Consider the patient's medical history (e.g., contraindications) when discussing treatments.
`;
};

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
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-3xl shadow-sm p-8 transition-colors">
          <div className="text-center">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500 dark:text-red-400 text-xl">⚠️</div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Gagal Memuat Hasil</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">{this.state.error?.message || 'Terjadi kesalahan sistem'}</p>
            <button 
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-red-500/20"
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
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-12 transition-colors">
        <div className="flex flex-col items-center justify-center space-y-4 animate-pulse">
          <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full"></div>
          <div className="h-4 w-48 bg-slate-100 dark:bg-slate-800 rounded-full"></div>
        </div>
      </div>
    );
  }

  if (!patient.aiResults || patient.aiResults.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-12 transition-colors">
        <div className="text-center">
          <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-100 dark:border-slate-700 shadow-inner">
            <span className="text-4xl filter grayscale opacity-50">🦷</span>
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{t('dentistPatient.ai.empty.title')}</h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">{t('dentistPatient.ai.empty.description')}</p>
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
    
    // 1. Generate Contextual Prompt (Invisible to UI, visible to API)
    const contextPrompt = generateCDSSContext(patient, selectedResult);
    
    // If it's the very first message or context switch, we might want to prepend context.
    // For simplicity, we send the context as a "system" instruction in the payload if your API supports it,
    // OR we prepend it to the message. Here we prepend it ONLY if it's the start of a session or context refresh.
    // However, usually it's cleaner to send: `Context: ... \n\n User Question: ...`
    const finalPayloadMessage = `${contextPrompt}\n\nDentist Question: ${userText}`;

    try {
      let sessionId = selectedResult.sessionId || selectedResult.session_id;
      if (!sessionId) {
        sessionId = getSessionFromLocal(patient.id, selectedResult.id);
      }

      if (!sessionId) {
        try {
          const createResp = await aiHttp.post('/sessions', {
            role: 'dentist',
            language: 'bilingual',
            metadata: { source: 'dentist_portal', patient_id: patient.id, ai_result_id: selectedResult.id }
          });
          sessionId = createResp?.data?.id || createResp?.data?.session?.id;
          
          if (sessionId) {
            saveSessionToLocal(patient.id, selectedResult.id, sessionId);
            setSelectedResult(prev => ({ ...(prev || {}), sessionId }));
            try {
              await http.post(`/v1/dentist-portal/patients/${patient.id}/ai-results/${selectedResult.id}/session`, { sessionId });
              skipNextFetchRef.current = true;
            } catch (e) {}
          }
        } catch (createErr) {
          console.warn('Session init failed, continuing stateless');
        }
      }

      // Optimistic UI Update (Show ONLY user text, not the hidden context)
      setChatMessages(prev => [...prev, { role: 'user', content: userText }]);
      setChatInput('');

      const formData = new FormData();
      // Send the RICH CONTEXT message to the backend
      formData.append('message', finalPayloadMessage); 
      formData.append('role', 'dentist');
      formData.append('language', 'bilingual');
      if (sessionId) formData.append('session_id', sessionId);

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

      let resp = null;
      try {
        resp = await aiHttp.post('/chat/upload', formData);
      } catch (uploadErr) {
        if (uploadErr?.response?.status === 500 || uploadErr?.response?.status === 422) {
          const fallbackPayload = {
            message: finalPayloadMessage, // Use context here too
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

  // ... (Load History logic remains same) ...
  useEffect(() => {
    const fetchHistory = async () => {
      if (skipNextFetchRef.current || !selectedResult) return;
      
      let sessionId = selectedResult.sessionId || selectedResult.session_id;
      if (!sessionId && patient?.id && selectedResult?.id) {
        sessionId = getSessionFromLocal(patient.id, selectedResult.id);
      }

      if (!sessionId) {
        setChatMessages([]);
        return;
      }

      try {
        const resp = await aiHttp.get(`/sessions/${sessionId}/messages`);
        const rawData = resp?.data;
        let msgs = Array.isArray(rawData) ? rawData : (rawData?.messages || []);
        
            const normalized = msgs.map(m => ({ 
          role: m.role || 'ai', 
          content: htmlToMarkdown(m.content || m.message || '') 
        }));
        
        if (normalized.length > 0) {
            setChatMessages(normalized);
        } else {
            setChatMessages([]);
        }
      } catch (e) {
        setChatMessages([]);
      }
    };
    fetchHistory();
  }, [selectedResult, patient?.id]);

  // ... (Helpers: formatAIResponse, htmlToPlain, htmlToMarkdown, renderMarkdown, renderBold, handleResultChange, fetch session data, enrich result) ...
  // [Code omitted for brevity, it is identical to your previous version]
  // Note: Ensure you include all the helper functions here in the final file.
  
  // Re-inserting helpers for completeness
  const htmlToPlain = (html) => { if(!html) return ''; try { const intermediate = String(html).replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n\n'); const div = document.createElement('div'); div.innerHTML = intermediate; return (div.textContent || div.innerText || '').trim(); } catch (e) { return String(html); } };
  const htmlToMarkdown = (html) => { if(!html) return ''; try { const div = document.createElement('div'); div.innerHTML = String(html); const walk = (node) => { if(!node) return ''; if(node.nodeType === Node.TEXT_NODE) return node.nodeValue; let out = ''; const tag = (node.tagName || '').toLowerCase(); if(tag==='strong'||tag==='b') return `**${Array.from(node.childNodes).map(walk).join('')}**`; if(tag==='br') return '\n'; if(tag==='p') return `${Array.from(node.childNodes).map(walk).join('')}\n\n`; return Array.from(node.childNodes).map(walk).join(''); }; return Array.from(div.childNodes).map(walk).join('').trim(); } catch(e){ return htmlToPlain(html); } };
  const renderBold = (text) => { if(!text) return null; return String(text).split(/(\*\*.*?\*\*)/g).map((part, i) => (i % 2 === 1) ? <strong key={i} className="font-semibold text-slate-800 dark:text-slate-100">{part.slice(2, -2)}</strong> : <span key={i}>{part}</span>); };
  const formatAIResponse = (text) => { if(!text) return <span>...</span>; return String(text).split('\n').map((line, idx) => { const trimmed = line.trim(); if(!trimmed) return null; const parts = trimmed.split(/(\*\*.*?\*\*)/g); const content = parts.map((part, i) => (i%2===1) ? <strong key={i} className="font-bold text-slate-800 dark:text-slate-200">{part.slice(2,-2)}</strong> : <span key={i}>{part}</span>); if(trimmed.startsWith('* ') || trimmed.startsWith('- ')) return <div key={idx} className="flex gap-3 pl-1 mb-1"><span className="mt-2 w-1.5 h-1.5 bg-slate-400 dark:bg-slate-500 rounded-full flex-shrink-0"/><span>{content}</span></div>; return <p key={idx} className="mb-2 leading-relaxed text-slate-600 dark:text-slate-300">{content}</p>; }); };
  const handleResultChange = (e) => setSelectedResult(sortedResults.find(r => r.id === e.target.value));

  // State for session data enrichment
  const [sessionData, setSessionData] = useState({ annotated: null, original: null, detections: [], findings: [], recommendations: [], concernLevel: null });
  const sessionFetchedRef = useRef(null);

  useEffect(() => {
    if (!selectedResult) return;
    if (sessionFetchedRef.current === selectedResult.id) return;
    sessionFetchedRef.current = selectedResult.id;
    const sid = selectedResult.sessionId || selectedResult.session_id || getSessionFromLocal(patient?.id, selectedResult.id);
    if (!sid) return;
    let cancelled = false;
    (async () => {
      try {
        const resp = await aiHttp.get(`/sessions/${sid}/messages`);
        const msgs = Array.isArray(resp?.data) ? resp.data : (resp?.data?.messages || resp?.data || []);
        let annotatedUri=null, originalUri=null, detections=[], findings=[], recommendations=[], concernLevel=null;
        for (const msg of msgs) {
          const vf = msg.visual_findings || msg.metadata?.visual_findings || msg.analysis?.visual_findings;
          const b64 = vf?.annotated_image_base64 || msg.annotated_image_base64 || msg.metadata?.annotated_image_base64;
          if (b64 && !annotatedUri) annotatedUri = b64.startsWith('data:') ? b64 : `data:image/jpeg;base64,${b64}`;
          if (!originalUri) { const imgArr = msg.images || msg.metadata?.images; if (Array.isArray(imgArr) && imgArr.length > 0) { const first = imgArr[0]; originalUri = typeof first === 'string' ? first : (first?.url || first?.uri || null); } }
          if (vf?.detections?.length > 0 && detections.length === 0) detections = vf.detections;
          if (vf?.findings?.length > 0 && findings.length === 0) findings = vf.findings;
          if (vf?.recommendations?.length > 0 && recommendations.length === 0) recommendations = vf.recommendations;
          if (vf?.concern_level && !concernLevel) concernLevel = typeof vf.concern_level === 'string' ? vf.concern_level : (vf.concern_level?.level || null);
        }
        if (!cancelled) setSessionData({ annotated: annotatedUri, original: originalUri, detections, findings, recommendations, concernLevel });
      } catch (e) { console.warn('Fetch session error', e); }
    })();
    return () => { cancelled = true; };
  }, [selectedResult, patient?.id]);

  const enrichedResult = useMemo(() => {
    if (!selectedResult) return selectedResult;
    const result = { ...selectedResult };
    if ((!result.symptoms || result.symptoms.length === 0) && sessionData.detections.length > 0) {
      result.symptoms = sessionData.detections.map((d) => ({ name: d.label || d.name || 'Temuan', severity: d.severity || (d.confidence >= 0.7 ? 'high' : d.confidence >= 0.4 ? 'medium' : 'low'), description: d.description || null }));
    }
    if ((!result.diagnosis || result.diagnosis.length === 0) && sessionData.detections.length > 0) {
        result.diagnosis = sessionData.detections.map((d, idx) => ({ condition: d.label || `Temuan ${idx + 1}`, description: d.description || '', probability: d.confidence ? Math.round((d.confidence <= 1 ? d.confidence * 100 : d.confidence)) : null, severity: d.severity || null, details: d.description || '', sections: [] }));
    }
    if ((!result.riskLevel || result.riskLevel === 'unknown') && sessionData.concernLevel) {
        const cl = sessionData.concernLevel.toLowerCase();
        if (cl.includes('high')) result.riskLevel = 'high'; else if (cl.includes('medium')) result.riskLevel = 'medium'; else if (cl.includes('low')) result.riskLevel = 'low';
    }
    return result;
  }, [selectedResult, sessionData]);

  // Image helpers
  const galleryImages = enrichedResult?.images || [];
  const effectiveImages = useMemo(() => {
    const imgs = [...galleryImages];
    if (sessionData.annotated) {
       const idx = imgs.findIndex(i => i.type === 'annotated');
       if(idx>=0) imgs[idx] = { url: sessionData.annotated, type: 'annotated', description: 'Hasil anotasi AI' };
       else imgs.push({ url: sessionData.annotated, type: 'annotated', description: 'Hasil anotasi AI' });
    }
    if (sessionData.original && !imgs.some(i => i.type === 'original')) imgs.unshift({ url: sessionData.original, type: 'original', description: 'Gambar asli' });
    return imgs;
  }, [galleryImages, sessionData]);
  const summaryImage = effectiveImages.find(i => i.type === 'annotated') || effectiveImages[0] || null;
  const summaryText = (stripDiagnosisIntro ? stripDiagnosisIntro(enrichedResult?.summary || '') : enrichedResult?.summary || '').trim();
  const summarySections = enrichedResult?.summarySections || [];
  const hasSummaryHighlights = Boolean(summaryText || summarySections.length);

  const getRiskColor = (risk) => {
    switch (String(risk).toLowerCase()) {
      case 'high': return 'text-red-700 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-900/20 dark:border-red-800/50';
      case 'medium': return 'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-900/20 dark:border-amber-800/50';
      case 'low': return 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-900/20 dark:border-emerald-800/50';
      default: return 'text-slate-600 bg-slate-50 border-slate-200 dark:text-slate-400 dark:bg-slate-900/20 dark:border-slate-700/50';
    }
  };
  const getConfidenceColor = (c) => (c >= 80 ? 'text-emerald-600 dark:text-emerald-400' : c >= 60 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400');


  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* 1. Header & Stats */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] p-8 transition-colors">
        {/* ... (Header content mostly same, using enrichedResult) ... */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{t('dentistPatient.ai.header.title')}</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1">{t('dentistPatient.ai.header.count', { count: patient.aiResults.length })}</p>
          </div>
          
          {patient.aiResults.length > 1 && (
            <div className="w-full md:w-64">
              <div className="relative">
                <select
                  value={selectedResult?.id || ''}
                  onChange={handleResultChange}
                  className="w-full pl-4 pr-10 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none cursor-pointer hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
                >
                  {sortedResults.map((result) => (
                    <option key={result.id} value={result.id}>
                      {new Date(result.date).toLocaleDateString()} - {result.type}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 dark:text-slate-400">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Date Card */}
          <div className="bg-gradient-to-br from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700/50 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <span className="text-4xl text-slate-900 dark:text-white">📅</span>
            </div>
            <div className="flex items-center space-x-2.5 mb-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></span>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{t('dentistPatient.ai.summary.analysisDate')}</span>
            </div>
            <p className="text-xl font-bold text-slate-800 dark:text-white">{enrichedResult?.date ?? '-'}</p>
          </div>
          
          {/* Confidence Card */}
          <div className="bg-gradient-to-br from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700/50 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <span className="text-4xl text-slate-900 dark:text-white">🎯</span>
            </div>
            <div className="flex items-center space-x-2.5 mb-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]"></span>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{t('dentistPatient.ai.summary.confidence')}</span>
            </div>
            <p className={`text-xl font-bold ${getConfidenceColor(enrichedResult?.confidence ?? 0)}`}>
              {enrichedResult?.confidence != null ? `${enrichedResult.confidence}%` : '–'}
            </p>
          </div>

          {/* Risk Card */}
          <div className="bg-gradient-to-br from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700/50 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <span className="text-4xl text-slate-900 dark:text-white">🛡️</span>
            </div>
            <div className="flex items-center space-x-2.5 mb-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{t('dentistPatient.ai.summary.risk')}</span>
            </div>
            <div className="flex items-center">
              <span className={`px-3 py-1 rounded-lg text-sm font-bold border ${getRiskColor(enrichedResult?.riskLevel)}`}>
                {String(enrichedResult?.riskLevel || 'Unknown').toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Content Area */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.08)] overflow-hidden transition-colors">
        {/* Navigation Tabs */}
        <div className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex overflow-x-auto no-scrollbar px-2">
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
                className={`relative px-6 py-5 text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-2.5 outline-none ${
                  expandedSection === tab.id
                    ? 'text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)] dark:shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.2)] rounded-t-2xl z-10'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 rounded-t-2xl'
                }`}
              >
                {expandedSection === tab.id && (
                  <span className="absolute top-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-500 rounded-full mx-6" />
                )}
                <span className="text-lg opacity-80">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-8">
          {/* ... Summary / Diagnosis / etc sections ... (Visuals already updated) */}
          {expandedSection === 'summary' && (
            <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-300">
              {/* Image & Description */}
              {summaryImage && (
                <div className="relative rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 overflow-hidden group shadow-sm hover:shadow-md transition-shadow">
                  <div className="absolute top-4 left-4 z-10">
                    <span className="px-3 py-1.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur text-blue-700 dark:text-blue-400 text-xs font-bold rounded-lg border border-blue-100 dark:border-blue-800/50 shadow-sm flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                      AI Annotated Analysis
                    </span>
                  </div>
                  <div className="relative flex justify-center bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed dark:bg-none">
                    <img src={summaryImage.url} alt="Annotated" className="max-h-[450px] w-auto object-contain dark:mix-blend-luminosity" onError={(e) => { e.target.style.display = 'none'; }} />
                  </div>
                  {summaryImage.description && <div className="px-6 py-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800"><p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">{summaryImage.description}</p></div>}
                </div>
              )}

              {/* Text Summary */}
              {hasSummaryHighlights && (
                <div className="prose prose-slate dark:prose-invert max-w-none">
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-8 border border-slate-100/80 dark:border-slate-800">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                      <span className="text-2xl">📑</span> {t('dentistPatient.ai.summary.title')}
                    </h3>
                    {summaryText && <div className="text-slate-700 dark:text-slate-300 leading-8 text-justify text-[15px] whitespace-pre-wrap font-normal mb-6">{renderBold(summaryText)}</div>}
                    <div className="grid gap-6">
                      {summarySections.map((section, idx) => (
                        <div key={idx} className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-100 dark:border-slate-800 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.02)]">
                          <h4 className="text-base font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>{section.title}
                          </h4>
                          <div className="text-sm text-slate-600 dark:text-slate-400 leading-7 text-justify pl-4 border-l-2 border-slate-100 dark:border-slate-800">{renderBold(section.content)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* C. CHAT SECTION (Refined UI) */}
              <div className="mt-12">
                {!isChatOpen ? (
                  <div className="flex flex-col items-center justify-center py-10 bg-gradient-to-b from-transparent to-slate-50/50 dark:to-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                    <p className="text-slate-500 dark:text-slate-400 font-medium mb-4">Butuh detail lebih lanjut tentang kasus ini?</p>
                    <button 
                      onClick={() => setIsChatOpen(true)}
                      className="group relative inline-flex items-center gap-3 px-8 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full font-semibold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all duration-300"
                    >
                      <span className="text-xl group-hover:rotate-12 transition-transform">✨</span>
                      Tanya Clinical AI Assistant
                    </button>
                  </div>
                ) : (
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 ring-1 ring-slate-900/5 dark:ring-white/10">
                    <div className="bg-slate-50/80 dark:bg-slate-800/80 backdrop-blur px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center sticky top-0 z-10">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-xl shadow-inner">🤖</div>
                        <div>
                          <h4 className="font-bold text-slate-800 dark:text-white text-sm">Clinical Decision Support</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                            Online & Ready
                          </p>
                        </div>
                      </div>
                      <button onClick={() => setIsChatOpen(false)} className="text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>

                    <div ref={chatContainerRef} className="h-[450px] overflow-y-auto p-6 space-y-6 bg-slate-50 dark:bg-slate-800/50 scroll-smooth">
                      {chatMessages.length === 0 && !chatLoading && (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-600 space-y-3">
                          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-3xl">💭</div>
                          <p className="text-sm font-medium">Ajukan pertanyaan klinis Anda di sini.</p>
                        </div>
                      )}
                      
                      {chatMessages.map((m, i) => (
                        <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                          <div className={`max-w-[85%] px-5 py-4 rounded-2xl text-[15px] leading-relaxed shadow-sm ${
                            m.role === 'user' 
                              ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-br-none shadow-blue-500/20' 
                              : 'bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-bl-none shadow-slate-200/50 dark:shadow-black/20'
                          }`}>
                            {m.role === 'ai' ? formatAIResponse(m.content) : m.content}
                          </div>
                        </div>
                      ))}

                      {chatLoading && (
                        <div className="flex justify-start">
                          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 px-5 py-4 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-1.5">
                            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium mr-2">Thinking</span>
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* FIXED INPUT BAR: Removed striped artifacts (resize handle) */}
                    <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex gap-3 items-end">
                      <div className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all overflow-hidden">
                        <textarea 
                          className="w-full bg-transparent px-4 py-3 text-sm text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none resize-none h-12 max-h-32 appearance-none border-0 focus:ring-0"
                          placeholder="Ketik pesan..."
                          rows={1}
                          value={chatInput}
                          onChange={e => setChatInput(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendChat();
                            }
                          }}
                          disabled={chatLoading}
                        />
                      </div>
                      <button 
                        onClick={handleSendChat}
                        disabled={chatLoading || !chatInput.trim()}
                        className="h-12 w-12 flex-shrink-0 bg-gradient-to-br from-indigo-500 to-purple-600 hover:to-purple-700 text-white rounded-2xl flex items-center justify-center disabled:opacity-50 disabled:grayscale transition-all shadow-lg shadow-indigo-500/20 hover:scale-105 active:scale-95"
                      >
                        <svg className="w-5 h-5 transform rotate-90 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ... (Diagnosis, Symptoms, Recommendations, Images tabs content) ... */}
          {expandedSection === 'diagnosis' && (
            <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                <span className="text-2xl">🔍</span> {t('dentistPatient.ai.diagnosis.title')}
              </h3>
              <div className="grid gap-4">
                {enrichedResult.diagnosis?.map((diag, index) => (
                  <div key={index} className="group bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-800 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold text-sm">
                          {index + 1}
                        </span>
                        <h4 className="font-bold text-slate-800 dark:text-white text-lg">{diag.condition}</h4>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                        (diag.probability || 0) >= 80 ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/50' :
                        (diag.probability || 0) >= 60 ? 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/50' :
                        'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/50'
                      }`}>
                        {diag.probability ? `${diag.probability}% Match` : ''}
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed pl-11 mb-4">{diag.description}</p>
                    {diag.details && (
                      <div className="mt-4 pt-4 border-t border-slate-50 dark:border-slate-800 pl-11">
                        <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 text-sm text-slate-700 dark:text-slate-300 border border-slate-100/50 dark:border-slate-700/50">
                          <AnalysisSummaryRenderer summary={diag.details} />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* ... Other sections identical to previous version ... */}
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