import React, { useEffect, useMemo, useRef, useState } from 'react';
import Button from '../../../../components/ui/Button';
import { useLanguage } from '../../../../contexts/LanguageContext';
import AnalysisSummaryRenderer from './AnalysisSummaryRenderer';
import { stripDiagnosisIntro, cleanAIDentistOutput } from '../../../../utils/aiTextHelpers';
import { aiHttp, http } from '../../../../utils/httpClient';
import { buildAnnotatedImageDataUrl } from '../../ai/components/deepDentalSchemas.mjs';

// ── Error Classifier ────────────────────────────────
function classifyAIError(content = '', err = null) {
  const raw = (content + ' ' + (err?.message || '') + ' ' + (err?.response?.data?.detail || '')).toLowerCase();
  if (
    raw.includes('api_key_invalid') || raw.includes('api key not valid') ||
    raw.includes('api key is not valid') || raw.includes('please pass a valid api key')
  ) return {
    errorType: 'unavailable',
    title: 'Serene AI Sedang Tidak Tersedia',
    description: 'Layanan AI kami sedang mengalami gangguan teknis. Tim kami sedang bekerja untuk memulihkannya. Silakan coba beberapa saat lagi.',
  };
  if (
    raw.includes('quota_exceeded') || raw.includes('rate_limit') ||
    raw.includes('429') || raw.includes('too many requests') ||
    raw.includes('resource has been exhausted')
  ) return {
    errorType: 'busy',
    title: 'Serene AI Sedang Sibuk',
    description: 'Terlalu banyak permintaan dalam waktu bersamaan. Harap tunggu sebentar lalu coba lagi.',
  };
  if (
    raw.includes('failed to fetch') || raw.includes('networkerror') ||
    raw.includes('network error') || raw.includes('econnrefused') ||
    raw.includes('load failed')
  ) return {
    errorType: 'network',
    title: 'Koneksi Terputus',
    description: 'Tidak dapat menghubungi layanan AI. Pastikan koneksi internet Anda aktif, lalu coba lagi.',
  };
  if (
    raw.includes('500') || raw.includes('internal server error') || raw.includes('server error')
  ) return {
    errorType: 'maintenance',
    title: 'Serene AI Sedang Dalam Pemeliharaan',
    description: 'Layanan AI sedang mengalami gangguan sementara. Silakan coba beberapa menit lagi.',
  };
  return {
    errorType: 'generic',
    title: 'Terjadi Gangguan Sementara',
    description: 'Serene AI mengalami kendala teknis. Silakan coba lagi dalam beberapa saat.',
  };
}

function isRawAIError(text = '') {
  const c = text.toLowerCase();
  return (
    c.includes('invalid argument') || c.includes('api_key_invalid') ||
    c.includes('api key not valid') || c.includes('quota_exceeded') ||
    c.includes('resource has been exhausted') || c.includes('internal server error') ||
    c.includes('output_parsing_failure')
  );
}

const ERROR_STYLES = {
  unavailable: { bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800/50', icon: '🔧', badge: 'AI Tidak Tersedia', badgeCls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', textCls: 'text-amber-800 dark:text-amber-200' },
  busy: { bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-800/50', icon: '⏳', badge: 'AI Sedang Sibuk', badgeCls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300', textCls: 'text-orange-800 dark:text-orange-200' },
  network: { bg: 'bg-slate-50 dark:bg-slate-800/60', border: 'border-slate-200 dark:border-slate-700', icon: '📶', badge: 'Koneksi Terputus', badgeCls: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300', textCls: 'text-slate-700 dark:text-slate-300' },
  maintenance: { bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800/50', icon: '🛠️', badge: 'Sedang Maintenance', badgeCls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300', textCls: 'text-red-800 dark:text-red-200' },
  generic: { bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800/50', icon: '⚠️', badge: 'Gangguan Sementara', badgeCls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300', textCls: 'text-red-800 dark:text-red-200' },
};

const SUMMARY_CARD_STYLES = {
  findings: {
    card: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800/50',
    title: 'text-blue-800 dark:text-blue-300',
    dot: 'bg-blue-500',
    text: 'text-sm text-blue-900 dark:text-blue-200 leading-relaxed',
  },
  interpretation: {
    card: 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800/50',
    title: 'text-amber-800 dark:text-amber-300',
    dot: 'bg-amber-500',
    text: 'text-sm text-amber-900 dark:text-amber-200 leading-relaxed',
  },
  recommendations: {
    card: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800/50',
    title: 'text-emerald-800 dark:text-emerald-300',
    dot: 'bg-emerald-500',
    text: 'text-sm text-emerald-900 dark:text-emerald-200 leading-relaxed',
  },
};

const isLikelyNetworkError = (err) => {
  const msg = String(err?.message || '').toLowerCase();
  return err?.code === 'ERR_NETWORK' || (!err?.response && (
    msg.includes('network error') ||
    msg.includes('failed to fetch') ||
    msg.includes('load failed')
  ));
};

const fetchSessionMessagesResilient = async (sessionId, retries = 2) => {
  let lastErr = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const paged = await aiHttp.get(`/sessions/${sessionId}/messages?limit=200&per_page=200`);
      return Array.isArray(paged?.data) ? paged.data : (paged?.data?.messages || paged?.data || []);
    } catch (pagedErr) {
      lastErr = pagedErr;
      try {
        const plain = await aiHttp.get(`/sessions/${sessionId}/messages`);
        return Array.isArray(plain?.data) ? plain.data : (plain?.data?.messages || plain?.data || []);
      } catch (plainErr) {
        lastErr = plainErr;
      }
    }

    if (attempt < retries - 1) {
      await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
    }
  }

  throw lastErr;
};

function AIErrorBubble({ errorType, title, description }) {
  const s = ERROR_STYLES[errorType] || ERROR_STYLES.generic;
  return (
    <div className={`max-w-[85%] rounded-2xl rounded-bl-none border ${s.bg} ${s.border} overflow-hidden shadow-sm`}>
      <div className="flex items-center gap-2 px-4 pt-3 pb-1.5">
        <span className="text-lg">{s.icon}</span>
        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${s.badgeCls}`}>{s.badge}</span>
      </div>
      <p className={`px-4 pb-3 text-[14px] leading-relaxed font-semibold ${s.textCls}`}>{title}</p>
      <p className={`px-4 pb-4 text-[13px] leading-relaxed ${s.textCls} opacity-80`}>{description}</p>
    </div>
  );
}

// ── 1. HELPER: Generate Advanced Context for the AI (CDSS) ──
const generateCDSSContext = (patient, aiResult, detections = []) => {
  const history = patient.medicalHistory || {};
  const allergies = history.allergies?.length ? history.allergies.join(', ') : 'None';
  const conditions = history.conditions?.length ? history.conditions.join(', ') : 'None';
  const medications = history.medications?.length ? history.medications.join(', ') : 'None';

  let detectionBlock = '';
  if (detections.length > 0) {
    const lines = detections.map((d, i) => {
      const label = d.label || d.name || `Finding ${i + 1}`;
      const conf = d.confidence != null
        ? `${(d.confidence <= 1 ? (d.confidence * 100).toFixed(0) : d.confidence)}%`
        : '?';
      return `  ${i + 1}. ${label} (confidence: ${conf})`;
    });
    detectionBlock = `\nAI Visual Detections (YOLO — ${detections.length} markers):\n${lines.join('\n')}`;
  }

  const diagList = aiResult.diagnosis?.length
    ? aiResult.diagnosis.map(d => {
      const prob = d.probability ? ` (${d.probability}%)` : '';
      return `${d.condition}${prob}`;
    }).join(', ')
    : 'None';

  const summarySnippet = (aiResult.summary || '').slice(0, 500);

  return `
[SYSTEM CONTEXT: DENTAL CDSS MODE]
You are an expert Clinical Decision Support System assisting a dentist.
Base your answers strictly on the patient's data and the current AI analysis findings provided below.
All visual detection data is ALREADY available — do NOT ask for images or image paths.

--- PATIENT PROFILE ---
Name: ${patient.name}
Age/Gender: ${patient.age || '?'} / ${patient.gender || '?'}
Medical History:
- Allergies: ${allergies}
- Conditions: ${conditions}
- Current Meds: ${medications}

--- CURRENT AI ANALYSIS FINDINGS ---
Date: ${aiResult.date || 'N/A'}
Risk Level: ${aiResult.riskLevel || 'Unknown'}
Confidence: ${aiResult.confidence != null ? `${aiResult.confidence}%` : 'N/A'}
Detected Conditions: ${diagList}
${detectionBlock}
Clinical Summary: ${summarySnippet || 'See detection data above.'}

--- INSTRUCTION ---
Answer the dentist's question acting as a professional clinical consultant.
Use the detection data above as your primary clinical reference.
Consider the patient's medical history (e.g., contraindications) when discussing treatments.
Respond in Bahasa Indonesia unless the dentist writes in English.
`;
};

/**
 * ROBUST VERSION: Strip the CDSS context block from a message for display.
 * Returns only the dentist's actual question text with no garbage残留.
 */
function stripCDSSContextRobust(content) {
  if (!content) return '';
  const raw = String(content).trim();
  if (!raw) return '';

  const normalized = raw.replace(/\\n/g, '\n');

  // Priority 1: Extract dentist question if explicitly marked
  const questionMatch = normalized.match(/Dentist Question:\s*([\s\S]+?)(?=\n\n\[|\n---\s*INSTRUCTION|$)/i);
  if (questionMatch?.[1]?.trim()) {
    return questionMatch[1].trim();
  }

  // Priority 2: If no CDSS marker, return as-is (already cleaned by htmlToMarkdown)
  if (!/\[SYSTEM CONTEXT:\s*DENTAL CDSS MODE\]/i.test(normalized)) {
    return normalized;
  }

  // Priority 3: Aggressive cleanup for malformed persisted prompts
  const cleaned = normalized
    .replace(/\[SYSTEM CONTEXT:\s*DENTAL CDSS MODE\][\s\S]*?---\s*INSTRUCTION\s*---/i, '')
    .replace(/Answer the dentist's question[\s\S]*?Respond in Bahasa Indonesia unless the dentist writes in English\.?/i, '')
    .replace(/^Dentist Question:\s*/i, '')
    .replace(/^\s*\[.*?\]\s*$/gm, '') // Remove leftover bracketed metadata lines
    .trim();

  // Final sanity check: if it still looks like system text, return empty
  if (!cleaned || /\[SYSTEM CONTEXT|---\s*(PATIENT PROFILE|CURRENT AI ANALYSIS|INSTRUCTION)\s*---/i.test(cleaned)) {
    return '';
  }

  return cleaned;
}

// Legacy wrapper for backward compatibility
function stripCDSSContext(content) {
  return stripCDSSContextRobust(content);
}

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

// ── TEXT PROCESSING HELPERS ────────────────────────────────

/** Check whether a string contains HTML tags */
const isHTML = (str) => /<\/?[a-z][\s\S]*>/i.test(str);

const htmlToPlain = (html) => {
  if (!html) return '';
  try {
    const intermediate = String(html).replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n\n');
    const div = document.createElement('div');
    div.innerHTML = intermediate;
    return (div.textContent || div.innerText || '').trim();
  } catch (e) { return String(html); }
};

/**
 * Convert HTML to markdown-ish text. If the input is already
 * plain markdown (no HTML tags), return it unchanged.
 */
const htmlToMarkdown = (input) => {
  if (!input) return '';
  const str = String(input);

  // Fast-path: no HTML tags → already markdown, return as-is
  if (!isHTML(str)) return str;

  try {
    const div = document.createElement('div');
    div.innerHTML = str;

    const walk = (node) => {
      if (!node) return '';
      if (node.nodeType === Node.TEXT_NODE) return node.nodeValue;
      const tag = (node.tagName || '').toLowerCase();
      const children = () => Array.from(node.childNodes).map(walk).join('');

      if (tag === 'strong' || tag === 'b') return `**${children()}**`;
      if (tag === 'em' || tag === 'i') return `*${children()}*`;
      if (tag === 'br') return '\n';
      if (tag === 'p') return `${children()}\n\n`;
      if (tag === 'li') return `* ${children()}\n`;
      if (tag === 'ul' || tag === 'ol') return `\n${children()}\n`;
      if (/^h[1-6]$/.test(tag)) return `**${children()}**\n\n`;
      return children();
    };

    return Array.from(div.childNodes).map(walk).join('').trim();
  } catch (e) {
    return htmlToPlain(str);
  }
};

/**
 * The DeepDental API collapses \n when storing session messages.
 * This function re-inserts line breaks before block-level markdown patterns.
 */
const reinsertMarkdownBreaks = (text) => {
  if (!text) return text;
  const s0 = String(text).replace(/\\n/g, '\n');
  // If the text already contains real newlines it is formatted correctly
  if (s0.includes('\n')) return s0;

  let s = s0;

  // 1. Bold numbered headings  **1. Title:**  or  **2) Title:**
  s = s.replace(/ (\*\*\d+[\.\)]\s)/g, '\n\n$1');

  // 2. Bullet lines: "* text" / "* **text"  (star + space = markdown bullet)
  s = s.replace(/ (\* (?:\*\*)?[A-Za-z])/g, '\n$1');

  // 3. Dash bullet lines: "- text" / "- **text"
  s = s.replace(/ (- (?:\*\*)?[A-Za-z])/g, '\n$1');

  // 4. Numbered list items: "1. **Text"  (space before digit)
  s = s.replace(/ (\d+\.\s+\*\*[A-Z])/g, '\n$1');

  // 4b. Numbered list items without bold marker: "1. Text"
  s = s.replace(/ (\d+[\.\)]\s+[A-Za-z])/g, '\n$1');

  // 5. Bold section headings like  **Perbandingan dan Rekomendasi Klinis:**
  s = s.replace(/(?<![*\-]) (\*\*[A-Z][^*]{4,}:\*\*)/g, '\n\n$1');

  // 6. Plain headings ending with colon.
  s = s.replace(/ ([A-Z][A-Za-z\s]{4,40}:)(?=\s)/g, '\n\n$1');

  return s.trim();
};

/**
 * ✅ NEW: Pre-process plain text to inject markdown-like structure for better rendering.
 * Detects long paragraphs, sentence boundaries, and common dental terminology patterns.
 */
const preprocessSummaryText = (text) => {
  if (!text) return text;
  let t = String(text).trim();

  // 1. Ensure sentences ending with .!? have a newline after them (if followed by capital letter)
  t = t.replace(/([.!?])\s+(?=[A-Z])/g, '$1\n\n');

  // 2. Detect common dental section headers and add spacing
  const headers = [
    'Temuan Klinis', 'Interpretasi', 'Rekomendasi', 'Diagnosis',
    'Area', 'Lesi', 'Karies', 'Plak', 'Kalkulus', 'Gingivitis',
    'Perawatan', 'Tindak Lanjut', 'Saran', 'Kesimpulan'
  ];
  headers.forEach(header => {
    const regex = new RegExp(`(^|\\n)(${header}[^:\\n]{0,30}:)`, 'gi');
    t = t.replace(regex, '$1\n**$2**\n');
  });

  // 3. Break up very long paragraphs (>200 chars without line break)
  t = t.split('\n').map(line => {
    if (line.length > 200 && !line.match(/^[\*\-\d]/)) {
      // Insert soft break after sentence boundaries within long lines
      return line.replace(/([.!?])\s+(?=[A-Z])/g, '$1\n');
    }
    return line;
  }).join('\n');

  // 4. Ensure bullet-like items get proper markdown marker
  t = t.replace(/^(?:\-|\•|\*)\s+/gm, '* ');

  return t.trim();
};

/**
 * ✅ NEW: Unified message normalization pipeline for consistent chat history processing.
 * Applies to ALL message roles (user, ai, error) for structure preservation.
 */
const normalizeMessageContent = (content, role) => {
  if (!content) return '';

  // Step 1: Convert HTML to markdown-safe text
  let normalized = htmlToMarkdown(String(content));

  // Step 2: Strip CDSS context for user messages
  if (role === 'user') {
    normalized = stripCDSSContextRobust(normalized);
  }

  // Step 3: ALWAYS reinsert markdown breaks for structure restoration (CRITICAL FIX)
  normalized = reinsertMarkdownBreaks(normalized);

  // Step 4: Final cleanup - remove any leftover system artifacts
  normalized = normalized
    .replace(/\[SYSTEM CONTEXT[^\]]*\][\s\S]*?---\s*INSTRUCTION\s*---/gi, '')
    .replace(/Answer the dentist's question[\s\S]*?Respond in Bahasa Indonesia.?/gi, '')
    .replace(/^\s*[\-\*]\s*$/gm, '') // Remove empty bullet lines
    .replace(/\n{3,}/g, '\n\n') // Collapse excessive newlines
    .trim();

  return normalized;
};

const renderBold = (text) => {
  if (!text) return null;
  return String(text).split(/(\*\*.*?\*\*)/g).map((part, i) =>
    (i % 2 === 1)
      ? <strong key={i} className="font-semibold text-slate-800 dark:text-slate-100">{part.slice(2, -2)}</strong>
      : <span key={i}>{part}</span>
  );
};

/**
 * Render an AI response string (markdown-ish) into formatted JSX.
 */
const formatAIResponse = (text) => {
  if (!text) return <span>...</span>;
  // Reconstruct newlines if API collapsed them
  const processed = reinsertMarkdownBreaks(String(text));
  return processed.split('\n').map((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) return <div key={idx} className="h-2" />; // blank line → spacer

    // Render inline bold (**text**)
    const renderInline = (str) =>
      str.split(/(\*\*.*?\*\*)/g).map((part, i) =>
        (i % 2 === 1)
          ? <strong key={i} className="font-bold text-slate-800 dark:text-slate-200">{part.slice(2, -2)}</strong>
          : <span key={i}>{part}</span>
      );

    // Bullet lines: * text  or  - text
    if (/^[\*\-]\s+/.test(trimmed)) {
      const bulletText = trimmed.replace(/^[\*\-]\s+/, '');
      return (
        <div key={idx} className="flex gap-3 pl-1 mb-1.5">
          <span className="mt-2 w-1.5 h-1.5 bg-slate-400 dark:bg-slate-500 rounded-full flex-shrink-0" />
          <span className="text-slate-600 dark:text-slate-300 leading-relaxed">{renderInline(bulletText)}</span>
        </div>
      );
    }
    // Numbered lines: 1. text  (including sub-numbers like 1.1.)
    if (/^\d+[\.\)]\s+/.test(trimmed)) {
      const match = trimmed.match(/^(\d+[\.\)])\s+(.*)/);
      if (match) {
        return (
          <div key={idx} className="flex gap-3 pl-1 mb-1.5">
            <span className="font-bold text-slate-500 dark:text-slate-400 min-w-[1.5rem] text-right flex-shrink-0">{match[1]}</span>
            <span className="text-slate-600 dark:text-slate-300 leading-relaxed">{renderInline(match[2])}</span>
          </div>
        );
      }
    }

    // Default: paragraph
    return <p key={idx} className="mb-2 leading-relaxed text-slate-600 dark:text-slate-300">{renderInline(trimmed)}</p>;
  });
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
    const contextPrompt = generateCDSSContext(patient, enrichedResult || selectedResult, sessionData.detections);
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
            } catch (e) { }
          }
        } catch (createErr) {
          console.warn('Session init failed, continuing stateless');
        }
      }

      // ✅ CRITICAL FIX: Apply same normalization to optimistic UI updates
      setChatMessages(prev => [...prev, {
        role: 'user',
        content: normalizeMessageContent(userText, 'user')
      }]);
      setChatInput('');

      const formData = new FormData();
      formData.append('message', finalPayloadMessage);
      formData.append('role', 'dentist');
      formData.append('language', 'bilingual');
      if (sessionId) formData.append('session_id', sessionId);

      const chatImage = effectiveImages.find(i => i.type === 'annotated') || effectiveImages[0] || null;
      if (chatImage?.url) {
        formData.append('image_url', chatImage.url);
        try {
          const isLocal = chatImage.url.includes('localhost') || chatImage.url.includes('127.0.0.1');
          const isDataUrl = chatImage.url.startsWith('data:');
          if (!isLocal && !isDataUrl) {
            const imgResp = await fetch(chatImage.url);
            if (imgResp.ok) {
              const blob = await imgResp.blob();
              formData.append('images', blob, 'context.jpg');
            }
          } else if (isDataUrl) {
            try {
              const resp = await fetch(chatImage.url);
              const blob = await resp.blob();
              formData.append('images', blob, 'context.jpg');
            } catch { /* data URL conversion failed, skip */ }
          }
        } catch (e) { /* ignore cors error */ }
      }

      let resp = null;
      try {
        resp = await aiHttp.post('/chat/upload', formData);
      } catch (uploadErr) {
        if (uploadErr?.response?.status === 500 || uploadErr?.response?.status === 422) {
          const fallbackPayload = {
            message: finalPayloadMessage,
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

      // Intercept raw API error leaks in the reply
      if (aiReply && isRawAIError(aiReply)) {
        const classified = classifyAIError(aiReply);
        setChatMessages(prev => [...prev, { role: 'error', ...classified }]);
        return;
      }

      if (!aiReply && sessionId) {
        for (let i = 0; i < 5 && !aiReply; i++) {
          await new Promise(r => setTimeout(r, 1000));
          try {
            const hist = await aiHttp.get(`/sessions/${sessionId}/messages`);
            const msgs = hist?.data?.messages || hist?.data || [];
            const lastAI = [...msgs].reverse().find(m => {
              const r = String(m?.role || '').toLowerCase();
              return r !== 'user' && r !== 'dentist';
            });
            if (lastAI) aiReply = reinsertMarkdownBreaks(htmlToMarkdown(lastAI.content || lastAI.message || ''));
          } catch (e) { }
        }
      }

      setChatMessages(prev => [...prev, {
        role: 'ai',
        content: normalizeMessageContent(aiReply || 'AI sedang memproses...', 'ai')
      }]);

    } catch (err) {
      const classified = classifyAIError('', err);
      setChatMessages(prev => [...prev, { role: 'error', ...classified }]);
    } finally {
      setChatLoading(false);
    }
  };

  // Load History with ✅ UNIFIED NORMALIZATION PIPELINE
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
        const msgs = await fetchSessionMessagesResilient(sessionId);

        // ✅ CRITICAL FIX: Use unified normalization for ALL messages
        const normalized = msgs
          .map((m) => {
            const apiRole = String(m?.role || '').toLowerCase();
            const role = (apiRole === 'user' || apiRole === 'dentist')
              ? 'user'
              : (apiRole === 'error' ? 'error' : 'ai');

            // Apply unified normalization pipeline
            let content = normalizeMessageContent(m?.content || m?.message || m?.reply || '', role);

            const cleaned = String(content || '').trim();
            if (!cleaned) return null;

            return { role, content: cleaned };
          })
          .filter(Boolean);

        if (normalized.length > 0) {
          setChatMessages(normalized);
        } else {
          setChatMessages([]);
        }
      } catch (e) {
        if (!isLikelyNetworkError(e)) {
          console.warn('Fetch history error', e);
        }
        // Keep previous messages during transient network outages.
      }
    };
    fetchHistory();
  }, [selectedResult, patient?.id]);

  // State for session data enrichment
  const [sessionData, setSessionData] = useState({ annotated: null, original: null, detections: [], findings: [], recommendations: [], concernLevel: null });
  const sessionFetchedRef = useRef(null);

  useEffect(() => {
    if (!selectedResult) return;
    if (sessionFetchedRef.current === selectedResult.id) return;
    const sid = selectedResult.sessionId || selectedResult.session_id || getSessionFromLocal(patient?.id, selectedResult.id);
    if (!sid) return;
    let cancelled = false;
    (async () => {
      try {
        const msgs = await fetchSessionMessagesResilient(sid);
        let annotatedUri = null, originalUri = null, detections = [], findings = [], recommendations = [], concernLevel = null;
        for (const msg of msgs) {
          const vf = msg.visual_findings || msg.metadata?.visual_findings || msg.analysis?.visual_findings;
          const b64 = vf?.annotated_image_base64 || msg.annotated_image_base64 || msg.metadata?.annotated_image_base64;
          if (b64 && !annotatedUri) {
            annotatedUri = buildAnnotatedImageDataUrl({
              ...(vf || {}),
              annotated_image_base64: b64,
            });
          }
          if (!originalUri) { const imgArr = msg.images || msg.metadata?.images; if (Array.isArray(imgArr) && imgArr.length > 0) { const first = imgArr[0]; originalUri = typeof first === 'string' ? first : (first?.url || first?.uri || null); } }
          if (vf?.detections?.length > 0 && detections.length === 0) detections = vf.detections;
          if (vf?.findings?.length > 0 && findings.length === 0) findings = vf.findings;
          if (vf?.recommendations?.length > 0 && recommendations.length === 0) recommendations = vf.recommendations;
          if (vf?.concern_level && !concernLevel) concernLevel = typeof vf.concern_level === 'string' ? vf.concern_level : (vf.concern_level?.level || null);
        }
        if (!cancelled) {
          setSessionData({ annotated: annotatedUri, original: originalUri, detections, findings, recommendations, concernLevel });
          sessionFetchedRef.current = selectedResult.id;
        }
      } catch (e) {
        if (!cancelled) {
          sessionFetchedRef.current = null;
        }
        if (!isLikelyNetworkError(e)) {
          console.warn('Fetch session error', e);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [selectedResult, patient?.id]);

  const enrichedResult = useMemo(() => {
    if (!selectedResult) return selectedResult;
    const result = { ...selectedResult };

    // Map backend field names to component field names
    if (result.confidence == null && result.confidenceScore != null) {
      result.confidence = result.confidenceScore <= 1 ? Math.round(result.confidenceScore * 100) : Math.round(result.confidenceScore);
    }
    if (!result.date && result.createdAt) {
      try { result.date = new Date(result.createdAt).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }); } catch { result.date = result.createdAt; }
    }
    const isWebAccessible = (url) => {
      if (!url) return false;
      if (url.startsWith('data:')) return true;
      if (url.startsWith('http://') || url.startsWith('https://')) return true;
      if (url.startsWith('/uploads/')) return true;
      return false;
    };
    if (!result.images || result.images.length === 0) {
      const imgs = [];
      if (isWebAccessible(result.annotatedImageUrl)) imgs.push({ url: result.annotatedImageUrl, type: 'annotated', description: 'Hasil anotasi AI' });
      if (isWebAccessible(result.imageUrl)) imgs.push({ url: result.imageUrl, type: 'original', description: 'Gambar asli pasien' });
      result.images = imgs;
    }
    if (!result.summary) {
      result.summary = result.findings || result.overallAssessment || null;
    }
    if (!result.findingsText && result.findings) {
      result.findingsText = typeof result.findings === 'string' ? result.findings : JSON.stringify(result.findings);
    }
    if (!result.overallAssessmentText && result.overallAssessment) {
      result.overallAssessmentText = typeof result.overallAssessment === 'string' ? result.overallAssessment : JSON.stringify(result.overallAssessment);
    }
    if ((!result.recommendations || result.recommendations.length === 0) && result.summary) {
      const textRecs = [];
      const summaryRaw = typeof result.summary === 'string' ? result.summary : '';
      const summaryStr = typeof reinsertMarkdownBreaks === 'function' ? reinsertMarkdownBreaks(summaryRaw) : summaryRaw;
      const numberedPattern = /(?:^|[\n\r]|\s{2,})\s*(\d+)[.)]\s+\*{0,2}([^\n]+?)(?=\s*\d+[.)]\s|\s*$)/g;
      let match;
      while ((match = numberedPattern.exec(summaryStr)) !== null) {
        const recText = match[2].replace(/\*{2,}/g, '').replace(/:\s*$/, '').trim();
        if (recText.length > 5) textRecs.push(recText);
      }
      if (textRecs.length === 0) {
        const parts = summaryStr.split(/\d+[.)]\s+/);
        parts.forEach((part, i) => {
          if (i === 0) return;
          const cleaned = part.replace(/\*{2,}/g, '').trim();
          if (cleaned.length > 10) textRecs.push(cleaned);
        });
      }
      if (textRecs.length > 0) result.recommendations = textRecs;
    }

    // Enrich from session detection data
    if ((!result.symptoms || result.symptoms.length === 0) && sessionData.detections.length > 0) {
      result.symptoms = sessionData.detections.map((d) => ({ name: d.label || d.name || 'Temuan', severity: d.severity || (d.confidence >= 0.7 ? 'high' : d.confidence >= 0.4 ? 'medium' : 'low'), description: d.description || null }));
    }
    if ((!result.diagnosis || result.diagnosis.length === 0) && sessionData.detections.length > 0) {
      result.diagnosis = sessionData.detections.map((d, idx) => ({ condition: d.label || `Temuan ${idx + 1}`, description: d.description || '', probability: d.confidence ? Math.round((d.confidence <= 1 ? d.confidence * 100 : d.confidence)) : null, severity: d.severity || null, details: d.description || '', sections: [] }));
    }
    if ((!result.recommendations || result.recommendations.length === 0)) {
      const backendRecs = selectedResult.recommendations || [];
      const sessionRecs = sessionData.recommendations || [];
      const merged = [...backendRecs, ...sessionRecs.filter(sr => !backendRecs.some(br => (br.text || br) === (sr.text || sr)))];
      if (merged.length > 0) result.recommendations = merged;
    }
    if ((!result.sessionFindings || result.sessionFindings.length === 0) && sessionData.findings.length > 0) {
      result.sessionFindings = sessionData.findings;
    }
    if ((!result.confidence || result.confidence === 0) && sessionData.detections.length > 0) {
      const maxConf = Math.max(...sessionData.detections.map(d => {
        if (d.confidence == null) return 0;
        return d.confidence <= 1 ? d.confidence * 100 : d.confidence;
      }));
      result.confidence = Math.round(maxConf);
    }
    if ((!result.riskLevel || result.riskLevel === 'unknown' || result.riskLevel === 'low') && sessionData.detections.length > 0) {
      if (sessionData.concernLevel) {
        const cl = sessionData.concernLevel.toLowerCase();
        if (cl.includes('high')) result.riskLevel = 'high';
        else if (cl.includes('medium')) result.riskLevel = 'medium';
        else if (cl.includes('low')) result.riskLevel = 'low';
      } else {
        const highConf = sessionData.detections.filter(d => {
          const c = d.confidence != null ? (d.confidence <= 1 ? d.confidence * 100 : d.confidence) : 0;
          return c >= 60;
        });
        if (highConf.length >= 3) result.riskLevel = 'high';
        else if (highConf.length >= 1) result.riskLevel = 'medium';
        else if (sessionData.detections.length > 0) result.riskLevel = 'low';
      }
    }
    return result;
  }, [selectedResult, sessionData]);

  // Image helpers
  const galleryImages = enrichedResult?.images || [];
  const effectiveImages = useMemo(() => {
    const isUsable = (url) => {
      if (!url) return false;
      if (url.startsWith('data:')) return true;
      if (url.startsWith('http://') || url.startsWith('https://')) return true;
      if (url.startsWith('/uploads/')) return true;
      return false;
    };
    const imgs = [...galleryImages.filter(i => isUsable(i.url))];

    if (sessionData.annotated && isUsable(sessionData.annotated)) {
      const idx = imgs.findIndex(i => i.type === 'annotated');
      if (idx >= 0) imgs[idx] = { url: sessionData.annotated, type: 'annotated', description: 'Hasil anotasi AI' };
      else imgs.push({ url: sessionData.annotated, type: 'annotated', description: 'Hasil anotasi AI' });
    }
    if (sessionData.original && isUsable(sessionData.original) && !imgs.some(i => i.type === 'original')) {
      imgs.unshift({ url: sessionData.original, type: 'original', description: 'Gambar asli' });
    }
    if (!imgs.some(i => i.type === 'annotated') && isUsable(enrichedResult?.annotatedImageUrl)) {
      imgs.push({ url: enrichedResult.annotatedImageUrl, type: 'annotated', description: 'Hasil anotasi AI' });
    }
    if (!imgs.some(i => i.type === 'original') && isUsable(enrichedResult?.imageUrl)) {
      imgs.unshift({ url: enrichedResult.imageUrl, type: 'original', description: 'Gambar asli pasien' });
    }
    return imgs;
  }, [galleryImages, sessionData, enrichedResult?.annotatedImageUrl, enrichedResult?.imageUrl]);
  const summaryImage = effectiveImages.find(i => i.type === 'annotated') || effectiveImages[0] || null;
  const rawSummary = enrichedResult?.summary || '';

  const cleanSummaryItem = (value = '') => {
    if (!value) return '';
    const cleaned = String(value)
      .replace(/\*\*/g, '')
      .replace(/\[\d+\]/g, '')
      .replace(/^\s*[\-\*•]\s+/, '')
      .replace(/^\s*\d+[\.)]\s+/, '')
      .replace(/^area\s+dan\s*:?\s*/i, '')
      .replace(/^area\s*\[?(\d+)\]?\s*:?\s*/i, 'Area $1: ')
      .replace(/^apa\s*artinya\s*ini\??\s*:?\s*/i, '')
      .replace(/\s+\.{3,}/g, '...')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleaned || /^(dan|dan\s*:|area\s*:?)$/i.test(cleaned)) return '';
    return cleaned;
  };

  const toUniqueSummaryItems = (items = [], limit = 6) => {
    const seen = new Set();
    const result = [];
    for (const item of items) {
      const cleaned = cleanSummaryItem(item);
      if (!cleaned || cleaned.length < 4) continue;
      const key = cleaned.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(cleaned);
      if (result.length >= limit) break;
    }
    return result;
  };

  const extractSummarySentences = (value = '', max = 4) => {
    if (!value) return [];
    const normalized = typeof reinsertMarkdownBreaks === 'function'
      ? reinsertMarkdownBreaks(String(value))
      : String(value);
    const chunks = normalized
      .split('\n')
      .flatMap((line) => line.split(/(?<=[.!?])\s+/))
      .map((line) => cleanSummaryItem(line))
      .filter(Boolean);
    return toUniqueSummaryItems(chunks, max);
  };

  const looksCorruptedSummary = (value = '') => {
    const text = String(value || '').trim();
    if (!text) return true;
    return /(^|\n)\s*(area\s+dan\s*:|dan\s*:?)\s*($|\n)/i.test(text);
  };

  const summaryText = (() => {
    const source = String(rawSummary || '').trim();
    if (!source) return '';

    let text = typeof cleanAIDentistOutput === 'function' ? cleanAIDentistOutput(source) : stripDiagnosisIntro(source);
    text = typeof reinsertMarkdownBreaks === 'function' ? reinsertMarkdownBreaks(text) : text;

    if (looksCorruptedSummary(text)) {
      const fallback = typeof stripDiagnosisIntro === 'function' ? stripDiagnosisIntro(source) : source;
      text = typeof reinsertMarkdownBreaks === 'function' ? reinsertMarkdownBreaks(fallback) : fallback;
    }

    return String(text || '').trim();
  })();

  const buildDentistSummaryCards = (text = '', result = {}) => {
    const buckets = {
      findings: [],
      interpretation: [],
      recommendations: [],
    };

    const resolveBucket = (heading = '') => {
      const h = heading.toLowerCase();
      if (/temuan|finding|area|gejala|lesi/.test(h)) return 'findings';
      if (/apa artinya|interpretasi|makna|assessment|penilaian|diagnosis/.test(h)) return 'interpretation';
      if (/rekomendasi|saran|tindak lanjut|perawatan|aksi/.test(h)) return 'recommendations';
      return null;
    };

    const normalized = typeof reinsertMarkdownBreaks === 'function'
      ? reinsertMarkdownBreaks(String(text || ''))
      : String(text || '');

    let activeBucket = 'findings';
    normalized.split('\n').forEach((lineRaw) => {
      const line = String(lineRaw || '').replace(/\*\*/g, '').trim();
      if (!line) return;

      const headerMatch = line.match(/^([^:]{3,64}):\s*(.*)$/);
      if (headerMatch) {
        const nextBucket = resolveBucket(headerMatch[1]);
        if (nextBucket) {
          activeBucket = nextBucket;
          const firstItem = cleanSummaryItem(headerMatch[2]);
          if (firstItem) buckets[activeBucket].push(firstItem);
          return;
        }
      }

      if (/^area\s*\[?\d+\]?/i.test(line)) activeBucket = 'findings';
      if (/^(apa\s*artinya|interpretasi|makna)/i.test(line)) activeBucket = 'interpretation';
      if (/^(rekomendasi|saran|tindak lanjut|perawatan)/i.test(line)) activeBucket = 'recommendations';

      const item = cleanSummaryItem(line);
      if (!item || /^(analysis summary|clinical summary)$/i.test(item)) return;
      buckets[activeBucket].push(item);
    });

    buckets.findings = toUniqueSummaryItems(buckets.findings, 6);
    buckets.interpretation = toUniqueSummaryItems(buckets.interpretation, 4);
    buckets.recommendations = toUniqueSummaryItems(buckets.recommendations, 6);

    if (buckets.findings.length === 0) {
      const diagnosisFallback = (result?.diagnosis || []).map((diag) => {
        const label = cleanSummaryItem(diag?.condition || '');
        const details = cleanSummaryItem(diag?.description || '');
        if (!label && !details) return '';
        return details ? `${label}: ${details}` : label;
      });
      buckets.findings = toUniqueSummaryItems(diagnosisFallback, 6);
    }

    if (buckets.findings.length === 0) {
      const findingsFallback = (result?.sessionFindings || []).map((f) =>
        cleanSummaryItem(typeof f === 'string' ? f : (f?.text || f?.finding || ''))
      );
      buckets.findings = toUniqueSummaryItems(findingsFallback, 6);
    }

    if (buckets.interpretation.length === 0) {
      buckets.interpretation = extractSummarySentences(result?.overallAssessmentText || result?.findingsText || '', 3);
    }

    if (buckets.recommendations.length === 0) {
      const recFallback = (result?.recommendations || []).map((rec) =>
        cleanSummaryItem(typeof rec === 'string' ? rec : (rec?.text || rec?.recommendation || rec?.title || ''))
      );
      buckets.recommendations = toUniqueSummaryItems(recFallback, 6);
    }

    return [
      {
        key: 'findings',
        icon: '🔬',
        title: 'Temuan Klinis Utama',
        style: SUMMARY_CARD_STYLES.findings,
        items: buckets.findings,
      },
      {
        key: 'interpretation',
        icon: '🧠',
        title: 'Interpretasi Klinis',
        style: SUMMARY_CARD_STYLES.interpretation,
        items: buckets.interpretation,
      },
      {
        key: 'recommendations',
        icon: '💡',
        title: 'Rencana Tindak Lanjut',
        style: SUMMARY_CARD_STYLES.recommendations,
        items: buckets.recommendations,
      },
    ].filter((section) => section.items.length > 0);
  };

  const summaryCards = useMemo(() => buildDentistSummaryCards(summaryText, enrichedResult), [summaryText, enrichedResult]);
  const summarySections = enrichedResult?.summarySections || [];
  const hasSummaryHighlights = Boolean(summaryCards.length || summaryText || summarySections.length);

  const getRiskColor = (risk) => {
    switch (String(risk).toLowerCase()) {
      case 'high': return 'text-red-700 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-900/20 dark:border-red-800/50';
      case 'medium': return 'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-900/20 dark:border-amber-800/50';
      case 'low': return 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-900/20 dark:border-emerald-800/50';
      default: return 'text-slate-600 bg-slate-50 border-slate-200 dark:text-slate-400 dark:bg-slate-900/20 dark:border-slate-700/50';
    }
  };
  const getConfidenceColor = (c) => (c >= 80 ? 'text-emerald-600 dark:text-emerald-400' : c >= 60 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400');

  const handleResultChange = (e) => setSelectedResult(sortedResults.find(r => r.id === e.target.value));

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* 1. Header & Stats */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] p-8 transition-colors">
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
                className={`relative px-6 py-5 text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-2.5 outline-none ${expandedSection === tab.id
                  ? 'text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)] dark:shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.2)] rounded-t-2xl z-[5]'
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
          {expandedSection === 'summary' && (
            <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-300">
              {/* Image & Description */}
              {summaryImage && (
                <div className="relative rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 overflow-hidden group shadow-sm hover:shadow-md transition-shadow">
                  <div className="absolute top-4 left-4 z-[2]">
                    <span className="px-3 py-1.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur text-blue-700 dark:text-blue-400 text-xs font-bold rounded-lg border border-blue-100 dark:border-blue-800/50 shadow-sm flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                      AI Annotated Analysis
                    </span>
                  </div>
                  <div className="relative flex justify-center bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed dark:bg-none">
                    <img src={summaryImage.url} alt="Annotated" className="max-h-[450px] w-auto object-contain dark:mix-blend-luminosity" onError={(e) => { e.target.style.display = 'none'; e.target.parentNode.style.display = 'none'; }} />
                  </div>
                  {summaryImage.description && <div className="px-6 py-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800"><p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">{summaryImage.description}</p></div>}
                </div>
              )}

              {/* Text Summary - ✅ NOW WITH preprocessSummaryText */}
              {hasSummaryHighlights && (
                <div className="prose prose-slate dark:prose-invert max-w-none">
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-8 border border-slate-100/80 dark:border-slate-800">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                      <span className="text-2xl">📑</span> {t('dentistPatient.ai.summary.title')}
                    </h3>
                    {summaryText && (
                      <div className="text-slate-700 dark:text-slate-300 leading-relaxed text-[15px] font-normal mb-6">
                        {formatAIResponse(preprocessSummaryText(summaryText))}
                      </div>
                    )}
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

              {/* C. CHAT SECTION */}
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
                    <div className="bg-slate-50/80 dark:bg-slate-800/80 backdrop-blur px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center sticky top-0 z-[10]">
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
                          {m.role === 'error' ? (
                            <AIErrorBubble errorType={m.errorType} title={m.title} description={m.description} />
                          ) : (
                            <div className={`max-w-[85%] px-5 py-4 rounded-2xl text-[15px] leading-relaxed shadow-sm ${m.role === 'user'
                              ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-br-none shadow-blue-500/20'
                              : 'bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-bl-none shadow-slate-200/50 dark:shadow-black/20'
                              }`}>
                              {m.role === 'ai' ? formatAIResponse(m.content) : m.content}
                            </div>
                          )}
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

                    {/* Input Bar */}
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

          {/* Diagnosis Tab */}
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
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${(diag.probability || 0) >= 80 ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/50' :
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

          {/* Symptoms Tab */}
          {expandedSection === 'symptoms' && (
            <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                <span className="text-2xl">📋</span> {t('dentistPatient.ai.tabs.symptoms') || 'Gejala & Temuan'}
              </h3>

              {(enrichedResult?.sessionFindings?.length > 0 || enrichedResult?.findingsText) && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-6 border border-blue-100 dark:border-blue-800/50">
                  <h4 className="text-base font-bold text-blue-800 dark:text-blue-300 mb-4 flex items-center gap-2">
                    <span className="text-lg">🔬</span> Temuan Klinis AI
                  </h4>
                  {enrichedResult?.sessionFindings?.length > 0 ? (
                    <ul className="space-y-3">
                      {enrichedResult.sessionFindings.map((f, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <span className="mt-2 w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                          <span className="text-sm text-blue-900 dark:text-blue-200 leading-relaxed">{typeof f === 'string' ? f : (f.text || f.finding || JSON.stringify(f))}</span>
                        </li>
                      ))}
                    </ul>
                  ) : enrichedResult?.findingsText ? (
                    <div className="text-sm text-blue-900 dark:text-blue-200 leading-relaxed">{formatAIResponse(reinsertMarkdownBreaks(enrichedResult.findingsText))}</div>
                  ) : null}
                </div>
              )}

              {enrichedResult?.overallAssessmentText && (
                <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl p-6 border border-indigo-100 dark:border-indigo-800/50">
                  <h4 className="text-base font-bold text-indigo-800 dark:text-indigo-300 mb-4 flex items-center gap-2">
                    <span className="text-lg">📊</span> Penilaian Keseluruhan
                  </h4>
                  <div className="text-sm text-indigo-900 dark:text-indigo-200 leading-relaxed">{formatAIResponse(reinsertMarkdownBreaks(enrichedResult.overallAssessmentText))}</div>
                </div>
              )}

              {enrichedResult?.symptoms?.length > 0 ? (
                <div className="grid gap-4">
                  {enrichedResult.symptoms.map((symptom, index) => {
                    const severityColors = {
                      high: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800/50',
                      medium: 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800/50',
                      low: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800/50'
                    };
                    const severityBadge = {
                      high: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
                      medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
                      low: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                    };
                    return (
                      <div key={index} className={`rounded-xl p-5 border ${severityColors[symptom.severity] || 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700'} transition-all hover:shadow-md`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/80 dark:bg-slate-800/80 text-sm font-bold text-slate-600 dark:text-slate-300 border border-slate-200/50 dark:border-slate-600/50">
                              {index + 1}
                            </span>
                            <h4 className="font-bold text-slate-800 dark:text-white text-base">{symptom.name}</h4>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${severityBadge[symptom.severity] || 'bg-slate-100 text-slate-600'}`}>
                            {symptom.severity || 'N/A'}
                          </span>
                        </div>
                        {symptom.description && (
                          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed pl-11">{symptom.description}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                !enrichedResult?.sessionFindings?.length && !enrichedResult?.findingsText && !enrichedResult?.overallAssessmentText && (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-600">
                    <span className="text-5xl mb-4">📋</span>
                    <p className="text-sm font-medium">Belum ada gejala yang terdeteksi</p>
                    <p className="text-xs mt-1">Data gejala akan muncul setelah AI menganalisis gambar dental</p>
                  </div>
                )
              )}
            </div>
          )}

          {/* Recommendations Tab */}
          {expandedSection === 'recommendations' && (
            <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                <span className="text-2xl">💡</span> {t('dentistPatient.ai.tabs.recommendations') || 'Rekomendasi'}
              </h3>
              {enrichedResult?.recommendations?.length > 0 ? (
                <div className="grid gap-4">
                  {enrichedResult.recommendations.map((rec, index) => {
                    const recText = typeof rec === 'string' ? rec : (rec.text || rec.recommendation || rec.title || JSON.stringify(rec));
                    const recPriority = rec.priority || rec.urgency || null;
                    const priorityCardColors = {
                      high: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800/50',
                      urgent: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800/50',
                      medium: 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800/50',
                      normal: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800/50',
                      low: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800/50'
                    };
                    const priorityBadge = {
                      high: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
                      urgent: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
                      medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
                      normal: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
                      low: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                    };
                    return (
                      <div key={index} className={`rounded-xl p-5 border ${priorityCardColors[recPriority?.toLowerCase()] || 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700'} transition-all hover:shadow-md`}>
                        <div className="flex items-start gap-3">
                          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/80 dark:bg-slate-800/80 text-sm font-bold text-slate-600 dark:text-slate-300 border border-slate-200/50 dark:border-slate-600/50 flex-shrink-0 mt-0.5">
                            {index + 1}
                          </span>
                          <div className="flex-1">
                            <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{formatAIResponse(recText)}</div>
                            {recPriority && (
                              <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold uppercase ${priorityBadge[recPriority?.toLowerCase()] || 'bg-slate-100 text-slate-600'}`}>
                                {recPriority}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : enrichedResult?.findingsText ? (
                <div className="rounded-xl p-5 border bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800/50 transition-all hover:shadow-md">
                  <div className="flex items-start gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/80 dark:bg-slate-800/80 text-sm flex-shrink-0 mt-0.5">📋</span>
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-slate-800 dark:text-white mb-2">Ringkasan Analisis AI</h4>
                      <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                        {formatAIResponse(reinsertMarkdownBreaks(enrichedResult.findingsText))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-600">
                  <span className="text-5xl mb-4">💡</span>
                  <p className="text-sm font-medium">Belum ada rekomendasi</p>
                  <p className="text-xs mt-1">Rekomendasi perawatan akan muncul setelah AI menganalisis gambar dental</p>
                </div>
              )}
            </div>
          )}

          {/* Images Tab */}
          {expandedSection === 'images' && (
            <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                <span className="text-2xl">📸</span> {t('dentistPatient.ai.tabs.images') || 'Gambar Dental'}
              </h3>
              {effectiveImages.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {effectiveImages.map((img, index) => (
                    <div key={index} className="group relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm hover:shadow-xl transition-all">
                      <div className="absolute top-3 left-3 z-[2]">
                        <span className={`px-3 py-1.5 text-xs font-bold rounded-lg border shadow-sm flex items-center gap-1.5 ${img.type === 'annotated'
                          ? 'bg-blue-50/90 dark:bg-blue-900/80 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700'
                          : 'bg-white/90 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600'
                          }`}>
                          {img.type === 'annotated' && <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />}
                          {img.type === 'annotated' ? 'AI Annotated' : img.type === 'original' ? 'Original' : `Gambar ${index + 1}`}
                        </span>
                      </div>
                      <div className="aspect-[4/3] bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                        <img
                          src={img.url}
                          alt={img.description || `Dental image ${index + 1}`}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            const fallback = e.target.nextElementSibling;
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                        <div className="hidden flex-col items-center gap-2 text-slate-400 dark:text-slate-500">
                          <span className="text-4xl">🖼️</span>
                          <span className="text-xs">Gambar tidak tersedia</span>
                        </div>
                      </div>
                      {img.description && (
                        <div className="px-5 py-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                          <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">{img.description}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-600">
                  <span className="text-5xl mb-4">📸</span>
                  <p className="text-sm font-medium">Belum ada gambar dental</p>
                  <p className="text-xs mt-1">Gambar akan tersedia setelah pasien mengunggah foto untuk analisis AI</p>
                </div>
              )}
            </div>
          )}
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
