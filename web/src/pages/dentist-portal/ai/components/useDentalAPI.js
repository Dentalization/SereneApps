/**
 * useDentalAPI — Custom hook for all DeepDental API interactions.
 * Handles sessions, chat, image analysis, knowledge queries.
 */
import { useState, useCallback, useRef } from 'react';

const API_BASE_URL = import.meta.env.VITE_SERENE_AI_API_BASE_URL || 'https://api.dentalization.id';
const API_VERSION = import.meta.env.VITE_SERENE_AI_API_VERSION || 'v1';
const API_KEY = import.meta.env.VITE_DEEPDENTAL_API_KEY || '';

const api = (path) => `${API_BASE_URL}/api/${API_VERSION}${path}`;

const jsonHeaders = () => ({
  'X-API-Key': API_KEY,
  'Content-Type': 'application/json',
});

const authHeaders = () => ({
  'X-API-Key': API_KEY,
});

// ── Error Classifier ────────────────────────────────

/**
 * Classify a raw error string or thrown Error into a structured error object
 * so the UI can render a friendly card instead of raw text.
 */
function classifyError(content = '', err = null) {
  const raw = (content + (err?.message || '')).toLowerCase();

  if (
    raw.includes('api_key_invalid') ||
    raw.includes('api key not valid') ||
    raw.includes('api key is not valid') ||
    raw.includes('please pass a valid api key')
  ) {
    return {
      errorType: 'api_key_invalid',
      title: 'Serene AI Sedang Tidak Tersedia',
      description: 'Layanan AI kami sedang mengalami gangguan teknis dan tidak dapat memproses permintaan saat ini. Tim kami sedang bekerja untuk memulihkannya. Silakan coba beberapa saat lagi.',
      hint: null,
    };
  }
  if (
    raw.includes('quota_exceeded') ||
    raw.includes('rate_limit') ||
    raw.includes('429') ||
    raw.includes('too many requests') ||
    raw.includes('resource has been exhausted')
  ) {
    return {
      errorType: 'rate_limited',
      title: 'Serene AI Sedang Sibuk',
      description: 'Terlalu banyak permintaan dalam waktu bersamaan. Layanan AI kami sedang mengantri permintaan. Harap tunggu sebentar lalu coba lagi.',
      hint: null,
    };
  }
  if (
    raw.includes('failed to fetch') ||
    raw.includes('networkerror') ||
    raw.includes('network error') ||
    raw.includes('load failed') ||
    raw.includes('econnrefused') ||
    raw.includes('connection refused')
  ) {
    return {
      errorType: 'network_error',
      title: 'Koneksi Terputus',
      description: 'Tidak dapat menghubungi layanan AI. Pastikan koneksi internet Anda aktif, lalu coba lagi.',
      hint: null,
    };
  }
  if (raw.includes('500') || raw.includes('internal server error') || raw.includes('server error')) {
    return {
      errorType: 'server_error',
      title: 'Serene AI Sedang Dalam Pemeliharaan',
      description: 'Layanan AI sedang mengalami gangguan sementara. Kami sedang menangani masalah ini. Silakan coba beberapa menit lagi.',
      hint: null,
    };
  }
  if (raw.includes('output_parsing_failure') || raw.includes('parsing') || raw.includes('schema')) {
    return {
      errorType: 'parsing_error',
      title: 'Analisis Tidak Dapat Diselesaikan',
      description: 'AI tidak dapat memproses permintaan ini saat ini. Coba ulangi dengan gambar atau deskripsi yang berbeda.',
      hint: null,
    };
  }
  // Generic
  return {
    errorType: 'generic',
    title: 'Terjadi Gangguan Sementara',
    description: 'Serene AI mengalami kendala teknis. Silakan coba lagi dalam beberapa saat.',
    hint: null,
  };
}

/**
 * Return true if content looks like a raw API/server error leak
 */
function isRawErrorContent(content = '') {
  const c = content.toLowerCase();
  return (
    c.includes('invalid argument') ||
    c.includes('api_key_invalid') ||
    c.includes('api key not valid') ||
    c.includes('quota_exceeded') ||
    c.includes('resource has been exhausted') ||
    c.includes('internal server error') ||
    c.includes('output_parsing_failure')
  );
}

// ── Session Auto-Title ──────────────────────────────

/**
 * Derive a human-readable session title from the first user message.
 * No LLM call — purely client-side heuristics.
 */
// Common Indonesian + English stopwords to skip when building a title
const TITLE_STOPWORDS = new Set([
  // Indonesian
  'apakah','bagaimana','mengapa','kenapa','apa','yang','ini','itu','ada','dan',
  'atau','dengan','untuk','pada','di','ke','dari','saya','pasien','dokter',
  'tolong','mohon','bisa','dapat','adalah','juga','sudah','akan','belum',
  'tidak','bukan','kita','kami','mereka','dia','ia','nya','sebuah','suatu',
  'jika','kalau','sangat','sekali','lebih','lagi','sudah','telah','namun',
  // English
  'what','how','why','when','where','who','which','the','a','an','is','are',
  'was','were','be','been','have','has','had','do','does','did','will','would',
  'could','should','may','might','can','this','that','i','we','you','he','she',
  'they','it','my','your','his','her','our','their','at','in','on','to','of',
  'for','with','about','by','from','and','or','but','if','very','also','just',
]);

function generateSessionTitle(message = '', imageFile = null) {
  // Strip system-injected CDSS context block and YOLO context blocks
  const stripped = message
    .replace(/\[SYSTEM CONTEXT[\s\S]*?---\s*INSTRUCTION ---[\s\S]*?\]/gi, '')
    .replace(/\[KONTEKS ANALISIS GAMBAR DENTAL[^\]]*\][\s\S]*?\[END KONTEKS\]\s*/gi, '')
    .replace(/\[DENTAL IMAGE ANALYSIS CONTEXT[^\]]*\][\s\S]*?\[END CONTEXT\]\s*/gi, '')
    .replace(/^Foto dental pasien sudah dianalisis oleh sistem deteksi AI[\s\S]*?data deteksi di atas sudah cukup\./gi, '')
    .replace(/Dentist Question:/gi, '')
    .trim();

  // Prefer the text message if meaningful (user typed something real)
  if (stripped && stripped.length > 3) {
    const firstSentence = stripped.split(/[\n.!?]/)[0].trim();

    if (firstSentence.length <= 55) {
      return firstSentence || 'Sesi Analisis Baru';
    }

    // Long message: extract meaningful keywords (skip stopwords)
    const words = firstSentence.split(/\s+/);
    const meaningful = words.filter(w => {
      const clean = w.replace(/[^a-zA-Z0-9\u00C0-\u024F]/g, '').toLowerCase();
      return clean.length > 2 && !TITLE_STOPWORDS.has(clean);
    });

    if (meaningful.length >= 3) {
      const draft = meaningful.slice(0, 5).join(' ').replace(/[,;:]+$/, '');
      return draft.charAt(0).toUpperCase() + draft.slice(1);
    }

    // Fallback: truncate at last word boundary before 52 chars
    const truncated = firstSentence.slice(0, 52);
    const lastSpace = truncated.lastIndexOf(' ');
    return (lastSpace > 28 ? truncated.slice(0, lastSpace) : truncated) + '\u2026';
  }

  // No meaningful text — use a clean filename (no emoji)
  if (imageFile) {
    const base = imageFile.name?.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();
    const clean = base && base.length > 2 && base.length < 60 ? base : null;
    return clean ? clean : 'Analisis Gambar Dental';
  }

  return 'Sesi Analisis Baru';
}

// ── localStorage helpers ─────────────────────────────
// Keyed by dentistId so each doctor's data is fully isolated.

const TITLE_CACHE_KEY = 'serene_session_titles';   // { [sessionId]: title }
const OWNED_KEY       = 'serene_owned_sessions';    // { [dentistId]: [sessionId, ...] }

function saveLocalTitle(sessionId, title) {
  try {
    const m = JSON.parse(localStorage.getItem(TITLE_CACHE_KEY) || '{}');
    m[sessionId] = title;
    localStorage.setItem(TITLE_CACHE_KEY, JSON.stringify(m));
  } catch { /* non-critical */ }
}

function getLocalTitles() {
  try { return JSON.parse(localStorage.getItem(TITLE_CACHE_KEY) || '{}'); }
  catch { return {}; }
}

/** Remember that THIS dentist owns this session (for backwards-compat with old sessions lacking dentist_id). */
function saveOwnedSession(dentistId, sessionId) {
  if (!dentistId) return;
  try {
    const m = JSON.parse(localStorage.getItem(OWNED_KEY) || '{}');
    if (!Array.isArray(m[dentistId])) m[dentistId] = [];
    if (!m[dentistId].includes(sessionId)) m[dentistId].push(sessionId);
    localStorage.setItem(OWNED_KEY, JSON.stringify(m));
  } catch { /* non-critical */ }
}

function getOwnedSessionIds(dentistId) {
  if (!dentistId) return null; // null means "no filter"
  try {
    const m = JSON.parse(localStorage.getItem(OWNED_KEY) || '{}');
    return new Set(m[dentistId] || []);
  } catch { return new Set(); }
}

/**
 * Save session title to localStorage only.
 * The DeepDental API does not expose a PUT/PATCH endpoint for sessions
 * (only POST create, GET list/detail, DELETE), so we persist titles locally.
 */
function patchSessionTitle(sessionId, title /*, metadata, apiHeaders — unused */) {
  saveLocalTitle(sessionId, title);
}

// ── Context Block & Image Cache Helpers ─────────────

/**
 * Strip system-injected [KONTEKS ANALISIS GAMBAR DENTAL] context blocks from messages.
 * These are prepended by the image flow for the LLM but should never be shown to users.
 */
function stripContextBlock(content) {
  if (!content) return '';
  let stripped = content
    .replace(/\[KONTEKS ANALISIS GAMBAR DENTAL[^\]]*\][\s\S]*?\[END KONTEKS\]\s*/gi, '')
    .replace(/\[DENTAL IMAGE ANALYSIS CONTEXT[^\]]*\][\s\S]*?\[END CONTEXT\]\s*/gi, '')
    .trim();
  // If remaining text is the default YOLO-only prompt (no user text was typed), clear it
  if (/^Foto dental pasien sudah dianalisis oleh sistem deteksi AI \(YOLO\)/i.test(stripped)) {
    return '';
  }
  return stripped;
}

/** Return true if a message originally had an image context block injected. */
function hadImageContext(content) {
  if (!content) return false;
  return /\[KONTEKS ANALISIS GAMBAR DENTAL/i.test(content) ||
         /\[DENTAL IMAGE ANALYSIS CONTEXT/i.test(content) ||
         /^Foto dental pasien sudah dianalisis oleh sistem deteksi AI \(YOLO\)/i.test(content);
}

/** Convert a File to a base64 data URL (returns null if file > maxSizeBytes). */
function fileToBase64(file, maxSizeBytes = 800 * 1024) {
  return new Promise((resolve) => {
    if (!file || file.size > maxSizeBytes) { resolve(null); return; }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

const SESSION_IMAGE_CACHE_KEY = 'serene_session_images';
const MAX_IMAGE_CACHE_SESSIONS = 10;

/**
 * Cache image-related data (user image, YOLO findings, annotated image) per session.
 * Handles localStorage quota gracefully — falls back to caching without large base64 fields.
 */
function saveSessionImageCache(sessionId, entry) {
  try {
    const cache = JSON.parse(localStorage.getItem(SESSION_IMAGE_CACHE_KEY) || '{}');
    if (!cache[sessionId]) cache[sessionId] = { entries: [], updatedAt: Date.now() };
    cache[sessionId].entries.push(entry);
    cache[sessionId].updatedAt = Date.now();
    // Evict oldest sessions if over limit
    const keys = Object.keys(cache);
    if (keys.length > MAX_IMAGE_CACHE_SESSIONS) {
      const sorted = keys.sort((a, b) => (cache[a].updatedAt || 0) - (cache[b].updatedAt || 0));
      sorted.slice(0, keys.length - MAX_IMAGE_CACHE_SESSIONS).forEach(k => delete cache[k]);
    }
    try {
      localStorage.setItem(SESSION_IMAGE_CACHE_KEY, JSON.stringify(cache));
    } catch {
      // Quota exceeded — retry without large base64 fields
      if (entry.userImageBase64) entry.userImageBase64 = null;
      if (entry.visualFindings?.annotated_image_base64) entry.visualFindings.annotated_image_base64 = null;
      cache[sessionId].entries[cache[sessionId].entries.length - 1] = entry;
      try { localStorage.setItem(SESSION_IMAGE_CACHE_KEY, JSON.stringify(cache)); } catch {}
    }
  } catch (e) {
    console.warn('[DeepDental] Image cache save failed:', e.message);
  }
}

function getSessionImageEntries(sessionId) {
  try {
    const cache = JSON.parse(localStorage.getItem(SESSION_IMAGE_CACHE_KEY) || '{}');
    return cache[sessionId]?.entries || [];
  } catch { return []; }
}


/**
 * Normalize visual_findings.image_quality from object → string
 */
function normalizeFindings(data) {
  if (!data || typeof data !== 'object') return null;

  const findings = { ...data };

  // Flatten image_quality if it's an object
  if (findings.image_quality && typeof findings.image_quality === 'object') {
    const iq = findings.image_quality;
    // Hoist limiting_factors → limitations
    if (iq.limiting_factors && !findings.limitations) {
      const factors = Array.isArray(iq.limiting_factors) ? iq.limiting_factors : [];
      if (factors.length > 0) {
        findings.limitations = factors.join(', ');
      }
    }
    findings.image_quality =
      iq.rating || iq.quality || iq.assessment || iq.value ||
      Object.values(iq).find((v) => typeof v === 'string') || 'analyzed';
  }

  // Normalize concern_level
  if (findings.concern_level && typeof findings.concern_level === 'object') {
    findings.concern_level =
      findings.concern_level.level || findings.concern_level.value || 'unknown';
  }

  return findings;
}


export default function useDentalAPI(role = 'dentist', dentistId = null) {
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [systemHealth, setSystemHealth] = useState(null);
  const msgIdRef = useRef(1);
  // Track which sessions have already been auto-titled (across renders)
  const titledSessionsRef = useRef(new Set());

  const nextId = () => msgIdRef.current++;

  // ── Helpers ──────────────────────────────────────────

  const addMessage = useCallback((msg) => {
    setMessages((prev) => [...prev, { id: nextId(), timestamp: new Date().toISOString(), ...msg }]);
  }, []);

  // ── Health ──────────────────────────────────────────

  const checkHealth = useCallback(async () => {
    try {
      const r = await fetch(api('/health'));
      const data = await r.json();
      setSystemHealth(data);
      return data;
    } catch {
      setSystemHealth({ status: 'error' });
      return null;
    }
  }, []);

  // ── Sessions ────────────────────────────────────────

  const createSession = useCallback(async () => {
    try {
      const sessionMeta = {
        source: role === 'dentist' ? 'deepdental_pro' : 'serene_patient_app',
        ...(dentistId ? { dentist_id: String(dentistId) } : {}),
      };
      const r = await fetch(api('/sessions'), {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify({ role, language: 'id', metadata: sessionMeta }),
      });
      const data = await r.json();
      if (data.id) {
        setSessionId(data.id);
        setMessages([]);
        // ── Optimistically add new session to sidebar immediately ──
        const newSession = {
          id: data.id,
          created_at: data.created_at || new Date().toISOString(),
          updated_at: data.updated_at || new Date().toISOString(),
          metadata: data.metadata || sessionMeta,
        };
        setSessions((prev) => {
          if (prev.some((s) => s.id === data.id)) return prev;
          return [newSession, ...prev];
        });
        // Remember this session belongs to this dentist (for old sessions without dentist_id)
        saveOwnedSession(dentistId, data.id);
        return data.id;
      }
    } catch (err) {
      console.error('Failed to create session:', err);
    }
    return null;
  }, [role, dentistId]);

  const fetchSessions = useCallback(async () => {
    try {
      const r = await fetch(api('/sessions?page=1&per_page=30'), { headers: authHeaders() });
      const data = await r.json();
      const all = data.sessions || [];

      let mine;
      if (!dentistId) {
        mine = all;
      } else {
        const ownedIds = getOwnedSessionIds(dentistId);
        mine = all.filter(s => {
          // Prefer server-stamped dentist_id for new sessions
          if (s.metadata?.dentist_id) {
            return String(s.metadata.dentist_id) === String(dentistId);
          }
          // Old sessions (no dentist_id): only include if this dentist created them
          return ownedIds.has(s.id);
        });
      }

      // Merge locally-cached titles for sessions where PATCH didn't persist
      const localTitles = getLocalTitles();
      const merged = mine.map(s =>
        s.metadata?.title
          ? s
          : localTitles[s.id]
            ? { ...s, metadata: { ...(s.metadata || {}), title: localTitles[s.id] } }
            : s
      );
      setSessions(merged);
      return merged;
    } catch {
      return [];
    }
  }, [dentistId]);;

  const loadSession = useCallback(async (sid) => {
    try {
      setSessionId(sid);
      setMessages([]);
      // Mark as titled so we don't overwrite an existing title on the first send
      titledSessionsRef.current.add(sid);
      // Request more messages to avoid losing early conversation history
      const r = await fetch(api(`/sessions/${sid}/messages?limit=200&per_page=200`), { headers: authHeaders() });
      const data = await r.json();
      console.log('[DeepDental] loadSession raw response type:', Array.isArray(data) ? 'array' : typeof data, 'keys:', data && typeof data === 'object' ? Object.keys(data) : 'n/a');
      // Handle all known response shapes
      const rawMessages =
        Array.isArray(data)             ? data :
        Array.isArray(data?.messages)   ? data.messages :
        Array.isArray(data?.data)        ? data.data :
        Array.isArray(data?.items)       ? data.items :
        Array.isArray(data?.results)     ? data.results :
        [];
      console.log(`[DeepDental] loadSession ${sid}: ${rawMessages.length} raw messages found`);

      // Retrieve cached image/findings data for this session
      const imageEntries = getSessionImageEntries(sid);
      let imageEntryIdx = 0;
      let pendingFindings = null; // queue findings for the next AI message

      const loaded = rawMessages.map((m) => {
        const isUser = m.role === 'user';
        const isAI = m.role === 'assistant';
        let content = m.content || '';
        let image = null;
        let vf = m.visual_findings ? normalizeFindings(m.visual_findings) : null;

        if (isUser && hadImageContext(content)) {
          // This was an image+text message — strip the context block
          content = stripContextBlock(content);
          // Restore cached user image if available
          const entry = imageEntries[imageEntryIdx];
          if (entry) {
            imageEntryIdx++;
            image = {
              name: entry.userImageName || 'dental_image.jpg',
              url: entry.userImageBase64 || null, // data URL or null
            };
            pendingFindings = entry.visualFindings || null;
          } else {
            // No cache entry — show placeholder (image exists but not cached)
            image = { name: 'dental_image.jpg', url: null };
          }
        }

        if (isAI && pendingFindings) {
          // Attach cached visual findings to this AI response
          if (!vf) vf = normalizeFindings(pendingFindings);
          pendingFindings = null;
        }

        return {
          id: m.id || nextId(),
          type: isAI ? 'ai' : isUser ? 'user' : 'system',
          content,
          image,
          timestamp: m.created_at || new Date().toISOString(),
          visualFindings: vf,
          sources: m.sources || [],
        };
      });

      setMessages(loaded);
    } catch (err) {
      console.error('Failed to load session:', err);
    }
  }, []);

  const deleteSession = useCallback(async (sid) => {
    try {
      await fetch(api(`/sessions/${sid}`), { method: 'DELETE', headers: authHeaders() });
      setSessions((prev) => prev.filter((s) => s.id !== sid));
      if (sid === sessionId) {
        setSessionId(null);
        setMessages([]);
      }
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  }, [sessionId]);

  // ── Bootstrap ───────────────────────────────────────

  const bootstrap = useCallback(async () => {
    setIsBootstrapping(true);
    // Kick off initial data loading immediately, but don't block first paint too long.
    // If API is slow, the page still opens and data hydrates once requests resolve.
    const initialRequests = Promise.allSettled([checkHealth(), fetchSessions()]);
    await Promise.race([
      initialRequests,
      new Promise((resolve) => setTimeout(resolve, 1200)),
    ]);
    setIsBootstrapping(false);
  }, [checkHealth, fetchSessions]);

  // ── Send Message / Analyze Image ────────────────────

  const sendMessage = useCallback(async (message, imageFile = null) => {
    if (!message.trim() && !imageFile) return;

    setIsLoading(true);

    // ── Lazy session creation: create server session on very first message ──
    let activeSid = sessionId;
    if (!activeSid) {
      activeSid = await createSession();
      if (!activeSid) {
        addMessage({
          type: 'error',
          errorType: 'server_error',
          title: 'Tidak Dapat Memulai Sesi',
          description: 'Gagal membuat sesi baru. Periksa koneksi Anda lalu coba lagi.',
          hint: null,
        });
        setIsLoading(false);
        return;
      }
    }

    // Add user message
    const imageUrl = imageFile ? URL.createObjectURL(imageFile) : null;
    addMessage({
      type: 'user',
      content: message,
      image: imageFile ? { name: imageFile.name, url: imageUrl } : null,
    });

    // ── Auto-title: only on the very first send per session ──
    const shouldTitle = activeSid && !titledSessionsRef.current.has(activeSid);
    if (shouldTitle) {
      titledSessionsRef.current.add(activeSid);
      const title = generateSessionTitle(message, imageFile);
      // Optimistic local update so the sidebar shows the name right away
      setSessions(prev => prev.map(s =>
        s.id === activeSid
          ? { ...s, metadata: { ...(s.metadata || {}), title } }
          : s
      ));
      // Persist to server in background — include dentist_id so it isn't wiped from metadata
      patchSessionTitle(
        activeSid,
        title,
        dentistId ? { dentist_id: String(dentistId) } : {},
        authHeaders()
      );
    }

    try {
      let findings = null;
      let textContent = '';
      let sources = [];
      let suggestedQuestions = [];

      if (imageFile) {
        // ── IMAGE FLOW ──
        // Step 1: YOLO detection (reliable, no LLM schema issues)
        // Step 2: Text-only chat with detection context (avoids DentistVisualAnalysisSchema parse failure)
        // NOTE: /chat/upload with images fails due to backend Pydantic schema requiring 'limitations'
        //       field that the LLM doesn't always produce → OUTPUT_PARSING_FAILURE

        const detectForm = new FormData();
        detectForm.append('image', imageFile);
        detectForm.append('include_annotated', 'true');

        let detectData = {};
        try {
          const detectRes = await fetch(api('/images/detect'), { method: 'POST', headers: authHeaders(), body: detectForm });
          if (detectRes.ok) {
            detectData = await detectRes.json().catch(() => ({}));
            console.log('[DeepDental] /images/detect:', detectData.detections?.length || 0, 'detections');
            if (detectData.detections?.length > 0 || detectData.annotated_image_base64) {
              findings = {
                detections: detectData.detections || [],
                annotated_image_base64: detectData.annotated_image_base64 || null,
                processing_time_ms: detectData.processing_time_ms,
              };
            }
          } else {
            console.warn('[DeepDental] /images/detect failed:', detectRes.status);
          }
        } catch (err) {
          console.error('[DeepDental] /images/detect error:', err);
        }

        // Step 2: Text-only chat — describe detections to LLM for full analysis
        // This avoids the DentistVisualAnalysisSchema parse failure that occurs with image uploads
        const detections = detectData.detections || [];
        const detectionSummary = detections.length > 0
          ? detections.map((d, i) => `${i + 1}. ${d.label} (confidence: ${(d.confidence * 100).toFixed(0)}%)`).join('\n')
          : 'Tidak ada patologi terdeteksi oleh YOLO.';

        // Build analysis prompt — ALWAYS include detection context so the LLM knows what YOLO found.
        // IMPORTANT: Do NOT send the image file to /chat/upload — the backend Pydantic schema
        // (DentistVisualAnalysisSchema) requires a 'limitations' field that the LLM doesn't always
        // produce, causing OUTPUT_PARSING_FAILURE or "Image not found" errors.
        // Instead, send TEXT-ONLY with all YOLO detection data baked into the prompt.
        const defaultPrompt = `Foto dental pasien sudah dianalisis oleh sistem deteksi AI (YOLO). Kamu TIDAK perlu melihat gambarnya karena hasil deteksi sudah tersedia di bawah ini.\n\nHASIL DETEKSI AI:\nDitemukan ${detections.length} marker patologi:\n${detectionSummary}\n\nBerdasarkan hasil deteksi di atas, berikan analisis dental lengkap dan mendetail dalam Bahasa Indonesia. Sertakan:\n1) Temuan klinis pada setiap patologi yang terdeteksi\n2) Diagnosis diferensial dengan penjelasan masing-masing\n3) Tingkat keparahan dan urgensi\n4) Rekomendasi perawatan step-by-step\n5) Prognosis\n\nJawab selengkap mungkin sebagai dokter gigi spesialis. JANGAN minta gambar atau path gambar — data deteksi di atas sudah cukup.`;

        let analysisPrompt;
        if (message && message.trim()) {
          // User typed a message — prepend detection context so the LLM uses YOLO data
          const contextBlock = detections.length > 0
            ? `[KONTEKS ANALISIS GAMBAR DENTAL — DATA SUDAH TERSEDIA, JANGAN MINTA GAMBAR]\nFoto dental pasien sudah dianalisis oleh sistem deteksi AI (YOLO). Kamu TIDAK perlu melihat atau meminta gambar — hasilnya sudah tersedia:\n\nHASIL DETEKSI AI (${detections.length} patologi ditemukan):\n${detectionSummary}\n\nGunakan data deteksi di atas untuk menjawab pertanyaan dokter berikut. JANGAN meminta path gambar atau upload ulang.\n[END KONTEKS]\n\n`
            : `[KONTEKS ANALISIS GAMBAR DENTAL — DATA SUDAH TERSEDIA, JANGAN MINTA GAMBAR]\nFoto dental pasien sudah dianalisis oleh sistem deteksi AI (YOLO) namun tidak ditemukan patologi spesifik. Berikan analisis umum berdasarkan pertanyaan dokter. JANGAN meminta path gambar.\n[END KONTEKS]\n\n`;
          analysisPrompt = contextBlock + message;
        } else {
          analysisPrompt = defaultPrompt;
        }

        // Send TEXT-ONLY to /chat/upload — no image file attached.
        // The YOLO detection results are embedded in the analysisPrompt text.
        const chatForm = new FormData();
        chatForm.append('message', analysisPrompt);
        chatForm.append('session_id', activeSid);
        chatForm.append('role', role);
        chatForm.append('language', 'id');

        try {
          const chatRes = await fetch(api('/chat/upload'), { method: 'POST', headers: authHeaders(), body: chatForm });
          const chatData = await chatRes.json().catch(() => ({}));
          console.log('[DeepDental] text-chat status:', chatRes.status, 'content length:', (chatData.content || '').length);

          textContent = chatData.content || chatData.reply || chatData.message || chatData.answer || chatData.text || '';
          sources = chatData.sources || [];
          suggestedQuestions = chatData.suggested_questions || [];

          // Merge any visual_findings from chat response
          const chatFindings = normalizeFindings(chatData.visual_findings);
          if (chatFindings && findings) {
            findings = {
              ...findings,
              image_quality: chatFindings.image_quality || null,
              concern_level: chatFindings.concern_level || null,
              findings: chatFindings.findings || [],
              recommendations: chatFindings.recommendations || [],
              limitations: chatFindings.limitations || null,
            };
          }
        } catch (err) {
          console.error('[DeepDental] image-chat error:', err);
        }

        // Cache image + findings in localStorage for session restore after page refresh
        try {
          const userImageBase64 = await fileToBase64(imageFile);
          saveSessionImageCache(activeSid, {
            msgSnippet: (message || '').slice(0, 80),
            userImageBase64,
            userImageName: imageFile.name,
            visualFindings: findings ? { ...findings } : null,
          });
        } catch (e) {
          console.warn('[DeepDental] Failed to cache image data:', e.message);
        }

      } else {
        // ── TEXT-ONLY FLOW: Just /chat/upload ──
        const formData = new FormData();
        formData.append('message', message);
        formData.append('session_id', activeSid);
        formData.append('role', role);
        formData.append('language', 'id');

        const chatRes = await fetch(api('/chat/upload'), {
          method: 'POST',
          headers: authHeaders(),
          body: formData,
        });

        const chatData = await chatRes.json().catch(() => ({}));
        console.log('[DeepDental] text-only /chat/upload status:', chatRes.status, 'keys:', Object.keys(chatData));
        textContent = chatData.content || chatData.reply || chatData.message || chatData.answer || chatData.text || chatData.response || '';
        findings = normalizeFindings(chatData.visual_findings);
        sources = chatData.sources || [];
        suggestedQuestions = chatData.suggested_questions || [];
      }

      // ── Query knowledge base for citations ──
      const labels = [...new Set((findings?.detections || []).map((d) => d.label).filter(Boolean))];
      if (labels.length > 0) {
        try {
          const kbRes = await fetch(api('/knowledge/query'), {
            method: 'POST',
            headers: jsonHeaders(),
            body: JSON.stringify({
              question: `Analisis klinis lengkap dan perawatan untuk: ${labels.join(', ')}. Sertakan diagnosis diferensial, tingkat keparahan, opsi perawatan, dan prognosis. Jawab dalam Bahasa Indonesia.`,
              role,
              k: 6,
            }),
          });
          if (kbRes.ok) {
            const kbData = await kbRes.json();
            sources = [...sources, ...(kbData.sources || [])];
            // Only use KB answer as fallback when LLM returned nothing
            if (!textContent && kbData.answer) {
              textContent = kbData.answer;
            }
            // Don't append KB answer to LLM text — sources/citations are shown separately
          }
        } catch { /* knowledge base is supplementary */ }
      }

      // ── Build final message ──
      // Check if textContent is actually a raw error leak from the backend
      if (textContent && isRawErrorContent(textContent)) {
        const classified = classifyError(textContent);
        addMessage({ type: 'error', ...classified });
        return;
      }

      if (!textContent && findings) {
        textContent = buildSummary(findings);
      }

      if (textContent || findings) {
        addMessage({
          type: 'ai',
          content: textContent || 'Analysis complete. See clinical findings below.',
          sources,
          visualFindings: findings,
          suggestedQuestions,
        });
      } else {
        addMessage({
          type: 'error',
          errorType: 'no_response',
          title: 'Serene AI Belum Dapat Merespons',
          description: 'AI kami belum dapat menghasilkan analisis saat ini. Coba gunakan gambar yang lebih jelas atau kirim ulang pertanyaan Anda.',
          hint: null,
        });
      }
    } catch (err) {
      console.error('Chat error:', err);
      const classified = classifyError('', err);
      addMessage({ type: 'error', ...classified });
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, addMessage, role, setSessions, createSession]);

  // ── New Session ─────────────────────────────────────

  const startNewSession = useCallback(() => {
    // Just reset local state — session is created lazily on next message
    setSessionId(null);
    setMessages([]);
  }, []);

  return {
    // State
    sessionId,
    messages,
    sessions,
    isLoading,
    isBootstrapping,
    systemHealth,
    // Actions
    bootstrap,
    sendMessage,
    startNewSession,
    loadSession,
    deleteSession,
    fetchSessions,
  };
}

// ── Summary builder ─────────────────────────────────

function buildSummary(findings) {
  if (!findings) return '';
  const parts = [];
  const iq = typeof findings.image_quality === 'string' ? findings.image_quality : 'analyzed';
  parts.push(`**Image Quality:** ${iq.toUpperCase()}`);

  if (findings.concern_level) {
    const cl = typeof findings.concern_level === 'string' ? findings.concern_level : 'unknown';
    parts.push(`**Concern Level:** ${cl.toUpperCase()}`);
  }

  if (findings.detections?.length > 0) {
    const grouped = {};
    findings.detections.forEach((d) => {
      const label = d.label || 'Unknown';
      if (!grouped[label]) grouped[label] = [];
      grouped[label].push(d);
    });
    parts.push(`\n**Detected Pathologies (${findings.detections.length}):**`);
    Object.entries(grouped).forEach(([label, dets]) => {
      const maxConf = Math.max(...dets.map((d) => d.confidence || 0));
      parts.push(`- **${label}** — ${dets.length} instance${dets.length > 1 ? 's' : ''}, up to ${(maxConf * 100).toFixed(0)}% confidence`);
    });
  }

  if (findings.findings?.length > 0) {
    parts.push(`\n**Clinical Findings:**`);
    findings.findings.forEach((f, i) => {
      const loc = f.location ? `**${f.location}**` : '';
      const sev = f.severity ? ` (${f.severity})` : '';
      const desc = f.description || '';
      parts.push(`${i + 1}. ${loc}${sev} — ${desc}`);
      if (f.differentials?.length) {
        parts.push(`   Differentials: ${f.differentials.join(', ')}`);
      }
    });
  }

  if (findings.recommendations?.length > 0) {
    parts.push(`\n**Recommendations:**`);
    findings.recommendations.forEach((r) => parts.push(`- ${r}`));
  }

  if (findings.limitations) {
    parts.push(`\n*Limitations: ${findings.limitations}*`);
  }

  return parts.join('\n');
}
