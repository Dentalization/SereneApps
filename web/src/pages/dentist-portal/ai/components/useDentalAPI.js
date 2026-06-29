/**
 * useDentalAPI — Custom hook for all DeepDental API interactions.
 * Browser requests use the backend /py-api proxy; service credentials stay server-side.
 */
import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { getAccessToken } from '../../../../utils/auth/tokenStorage';
import {
  createDeepDentalClient,
  resolveDeepDentalConfig,
} from './deepDentalClient.mjs';
import { clinicalArtifactStore } from './clinicalArtifactStore.mjs';
import { normalizeVisualFindings } from './deepDentalSchemas.mjs';
import { buildImageQualityCoach, readImageDimensions } from './qualityCoach.mjs';
import { createVerifiedCaseWorkspaceClient } from './verifiedCaseWorkspaceClient.mjs';
import {
  buildClinicalHistoryItems,
  buildQualityMetricsFromFile,
  createWorkspaceRaceGuard,
} from './caseWorkspaceModels.mjs';
import {
  buildVisualFindingsFromCaseAnalysis,
  rehydrateAnnotatedImageArtifacts,
} from './caseAnalysisMapper.mjs';
import {
  buildFollowUpMessage,
  buildJournalReferenceQuestion,
  findLatestVisualFindings,
} from './dentalConversationContext.mjs';

const WORKSPACE_API_BASE_URL = [
  (import.meta.env.VITE_AUTH_API_BASE_URL || 'http://localhost:4000').replace(/\/$/, ''),
  (import.meta.env.VITE_AUTH_API_VERSION || '').replace(/^\//, ''),
].filter(Boolean).join('/');

function classifyError(content = '', err = null) {
  const raw = (content + (err?.message || '') + (err?.code || '')).toLowerCase();

  if (
    raw.includes('api_key_invalid') ||
    raw.includes('api key not valid') ||
    raw.includes('api key is not valid') ||
    raw.includes('deepdental_proxy_not_configured')
  ) {
    return {
      errorType: 'api_key_invalid',
      title: 'Serene AI Sedang Tidak Tersedia',
      description: 'Layanan AI belum terhubung dengan konfigurasi server yang aman. Hubungi admin klinik atau coba beberapa saat lagi.',
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
      description: 'Terlalu banyak permintaan dalam waktu bersamaan. Harap tunggu sebentar lalu coba lagi.',
      hint: null,
    };
  }
  if (
    raw.includes('failed to fetch') ||
    raw.includes('networkerror') ||
    raw.includes('network error') ||
    raw.includes('load failed') ||
    raw.includes('econnrefused') ||
    raw.includes('connection refused') ||
    raw.includes('request_timeout')
  ) {
    return {
      errorType: 'network_error',
      title: 'Koneksi Terputus',
      description: 'Tidak dapat menghubungi layanan AI. Pastikan koneksi aktif, lalu coba lagi.',
      hint: null,
    };
  }
  if (raw.includes('500') || raw.includes('internal server error') || raw.includes('server error')) {
    return {
      errorType: 'server_error',
      title: 'Serene AI Sedang Dalam Pemeliharaan',
      description: 'Layanan AI sedang mengalami gangguan sementara. Silakan coba beberapa menit lagi.',
      hint: null,
    };
  }
  if (raw.includes('output_parsing_failure') || raw.includes('parsing') || raw.includes('schema')) {
    return {
      errorType: 'parsing_error',
      title: 'Analisis Tidak Dapat Diselesaikan',
      description: 'AI tidak dapat memproses respons analisis ini. Coba ulangi dengan gambar atau deskripsi yang berbeda.',
      hint: null,
    };
  }
  return {
    errorType: 'generic',
    title: 'Terjadi Gangguan Sementara',
    description: 'Serene AI mengalami kendala teknis. Silakan coba lagi dalam beberapa saat.',
    hint: null,
  };
}

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
    // Removed: c.includes('500') and c.includes('server error') — too broad,
    // would block valid AI responses that mention error codes in analysis text.
  );
}

const TITLE_STOPWORDS = new Set([
  'apakah', 'bagaimana', 'mengapa', 'kenapa', 'apa', 'yang', 'ini', 'itu', 'ada', 'dan',
  'atau', 'dengan', 'untuk', 'pada', 'di', 'ke', 'dari', 'saya', 'pasien', 'dokter',
  'tolong', 'mohon', 'bisa', 'dapat', 'adalah', 'juga', 'sudah', 'akan', 'belum',
  'tidak', 'bukan', 'kita', 'kami', 'mereka', 'dia', 'ia', 'nya', 'sebuah', 'suatu',
  'jika', 'kalau', 'sangat', 'sekali', 'lebih', 'lagi', 'sudah', 'telah', 'namun',
  'what', 'how', 'why', 'when', 'where', 'who', 'which', 'the', 'a', 'an', 'is', 'are',
  'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'can', 'this', 'that', 'i', 'we', 'you', 'he', 'she',
  'they', 'it', 'my', 'your', 'his', 'her', 'our', 'their', 'at', 'in', 'on', 'to', 'of',
  'for', 'with', 'about', 'by', 'from', 'and', 'or', 'but', 'if', 'very', 'also', 'just',
]);

function generateSessionTitle(message = '', imageFile = null) {
  const stripped = message
    .replace(/\[SYSTEM CONTEXT[\s\S]*?---\s*INSTRUCTION ---[\s\S]*?\]/gi, '')
    .replace(/\[KONTEKS ANALISIS GAMBAR DENTAL[^\]]*\][\s\S]*?\[END KONTEKS\]\s*/gi, '')
    .replace(/\[DENTAL IMAGE ANALYSIS CONTEXT[^\]]*\][\s\S]*?\[END CONTEXT\]\s*/gi, '')
    .replace(/^Foto dental pasien sudah dianalisis oleh sistem deteksi AI[\s\S]*?data deteksi di atas sudah cukup\./gi, '')
    .replace(/Dentist Question:/gi, '')
    .trim();

  if (stripped && stripped.length > 3) {
    const firstSentence = stripped.split(/[\n.!?]/)[0].trim();
    if (firstSentence.length <= 55) return firstSentence || 'Sesi Analisis Baru';

    const words = firstSentence.split(/\s+/);
    const meaningful = words.filter((word) => {
      const clean = word.replace(/[^a-zA-Z0-9\u00C0-\u024F]/g, '').toLowerCase();
      return clean.length > 2 && !TITLE_STOPWORDS.has(clean);
    });
    if (meaningful.length >= 3) {
      const draft = meaningful.slice(0, 5).join(' ').replace(/[,;:]+$/, '');
      return draft.charAt(0).toUpperCase() + draft.slice(1);
    }

    const truncated = firstSentence.slice(0, 52);
    const lastSpace = truncated.lastIndexOf(' ');
    return (lastSpace > 28 ? truncated.slice(0, lastSpace) : truncated) + '...';
  }

  if (imageFile) {
    const base = imageFile.name?.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();
    const clean = base && base.length > 2 && base.length < 60 ? base : null;
    return clean || 'Analisis Gambar Dental';
  }

  return 'Sesi Analisis Baru';
}

const TITLE_CACHE_KEY = 'serene_session_titles';
const OWNED_KEY = 'serene_owned_sessions';

function saveLocalTitle(sessionId, title) {
  try {
    const map = JSON.parse(localStorage.getItem(TITLE_CACHE_KEY) || '{}');
    map[sessionId] = title;
    localStorage.setItem(TITLE_CACHE_KEY, JSON.stringify(map));
  } catch { /* non-critical */ }
}

function getLocalTitles() {
  try { return JSON.parse(localStorage.getItem(TITLE_CACHE_KEY) || '{}'); }
  catch { return {}; }
}

function deleteLocalTitle(sessionId) {
  try {
    const map = JSON.parse(localStorage.getItem(TITLE_CACHE_KEY) || '{}');
    delete map[sessionId];
    localStorage.setItem(TITLE_CACHE_KEY, JSON.stringify(map));
  } catch { /* non-critical */ }
}

function saveOwnedSession(dentistId, sessionId) {
  if (!dentistId) return;
  try {
    const map = JSON.parse(localStorage.getItem(OWNED_KEY) || '{}');
    if (!Array.isArray(map[dentistId])) map[dentistId] = [];
    if (!map[dentistId].includes(sessionId)) map[dentistId].push(sessionId);
    localStorage.setItem(OWNED_KEY, JSON.stringify(map));
  } catch { /* non-critical */ }
}

function getOwnedSessionIds(dentistId) {
  if (!dentistId) return null;
  try {
    const map = JSON.parse(localStorage.getItem(OWNED_KEY) || '{}');
    return new Set(map[dentistId] || []);
  } catch { return new Set(); }
}

function deleteOwnedSession(sessionId) {
  try {
    const map = JSON.parse(localStorage.getItem(OWNED_KEY) || '{}');
    Object.keys(map).forEach((dentistId) => {
      map[dentistId] = (map[dentistId] || []).filter((id) => id !== sessionId);
    });
    localStorage.setItem(OWNED_KEY, JSON.stringify(map));
  } catch { /* non-critical */ }
}

function patchSessionTitle(sessionId, title) {
  saveLocalTitle(sessionId, title);
}

function stripContextBlock(content) {
  if (!content) return '';
  let stripped = content
    .replace(/\[KONTEKS ANALISIS GAMBAR DENTAL[^\]]*\][\s\S]*?\[END KONTEKS\]\s*/gi, '')
    .replace(/\[DENTAL IMAGE ANALYSIS CONTEXT[^\]]*\][\s\S]*?\[END CONTEXT\]\s*/gi, '')
    .trim();
  if (/^Foto dental pasien sudah dianalisis oleh sistem deteksi AI \(YOLO\)/i.test(stripped)) {
    return '';
  }
  return stripped;
}

function hadImageContext(content) {
  if (!content) return false;
  return /\[KONTEKS ANALISIS GAMBAR DENTAL/i.test(content) ||
    /\[DENTAL IMAGE ANALYSIS CONTEXT/i.test(content) ||
    /^Foto dental pasien sudah dianalisis oleh sistem deteksi AI \(YOLO\)/i.test(content);
}

function extractTextContent(data = {}) {
  return data.content || data.reply || data.message || data.answer || data.text || data.response || '';
}

function createCaseWorkspaceDraft({ sessionId, imageFile, findings }) {
  return {
    caseId: sessionId ? `case-${sessionId}` : `case-local-${Date.now()}`,
    status: 'ai_draft',
    imageCount: imageFile ? 1 : 0,
    images: imageFile ? [{
      name: imageFile.name,
      mimeType: imageFile.type,
      size: imageFile.size,
    }] : [],
    review: {
      status: 'pending_clinician_review',
      updatedAt: null,
    },
    schemaWarnings: findings?.schema_warnings || [],
    exportReady: false,
    timelineLinkReady: false,
  };
}
function getWorkspaceErrorHint(error) {
  const payload = error?.response?.data || {};
  const apiError = payload?.error;
  const code = apiError?.code || payload?.errorCode || payload?.code || '';
  const message = apiError?.message || payload?.message || payload?.detail || '';
  if (code && message && code !== message) return `${code}: ${message}`;
  return String(message || code || error?.message || error || 'workspace_request_failed');
}

export default function useDentalAPI(role = 'dentist', dentistId = null, language = 'id') {
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [cases, setCases] = useState([]);
  const [caseWorkspace, setCaseWorkspace] = useState({
    caseRecord: null,
    images: [],
    findings: [],
    auditEvents: [],
    exports: [],
    timeline: [],
    isLoading: false,
    error: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [systemHealth, setSystemHealth] = useState(null);
  const msgIdRef = useRef(1);
  const titledSessionsRef = useRef(new Set());
  const objectUrlsRef = useRef(new Set());
  const abortControllersRef = useRef(new Set());
  const workspaceRaceRef = useRef(createWorkspaceRaceGuard());
  const pendingWorkspaceFilesRef = useRef(new Map());

  const client = useMemo(() => createDeepDentalClient({
    config: resolveDeepDentalConfig({
      VITE_DEEPDENTAL_PROXY_BASE_URL: import.meta.env.VITE_DEEPDENTAL_PROXY_BASE_URL,
    }),
    getAccessToken,
  }), []);
  const caseClient = useMemo(() => createVerifiedCaseWorkspaceClient(), []);
  const clinicalHistory = useMemo(() => buildClinicalHistoryItems({ sessions, cases }), [sessions, cases]);

  const nextId = useCallback(() => msgIdRef.current++, []);

  const revokeObjectUrls = useCallback(() => {
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrlsRef.current.clear();
  }, []);

  const abortRequests = useCallback(() => {
    abortControllersRef.current.forEach((controller) => controller.abort());
    abortControllersRef.current.clear();
  }, []);

  useEffect(() => () => {
    abortRequests();
    revokeObjectUrls();
  }, [abortRequests, revokeObjectUrls]);

  const createTrackedObjectUrl = useCallback((fileOrBlob) => {
    if (!fileOrBlob) return null;
    const url = URL.createObjectURL(fileOrBlob);
    objectUrlsRef.current.add(url);
    return url;
  }, []);

  const addMessage = useCallback((msg) => {
    setMessages((prev) => [...prev, { id: nextId(), timestamp: new Date().toISOString(), ...msg }]);
  }, []);

  const checkHealth = useCallback(async () => {
    if (!client.config.isConfigured) {
      const data = { status: 'configuration_error', detail: client.config.configurationError };
      setSystemHealth(data);
      return data;
    }

    try {
      const data = await client.health();
      setSystemHealth(data);
      return data;
    } catch {
      setSystemHealth({ status: 'error' });
      return null;
    }
  }, [client]);

  const createSession = useCallback(async () => {
    if (!client.config.isConfigured) return null;

    try {
      const sessionMeta = {
        source: role === 'dentist' ? 'deepdental_pro' : 'serene_patient_app',
        schema_version: '2026-05-07.deepdental.session.v1',
        ...(dentistId ? { dentist_id: String(dentistId) } : {}),
      };
      const data = await client.createSession({ role, language, metadata: sessionMeta });
      if (data.id) {
        setSessionId(data.id);
        setMessages([]);
        const newSession = {
          id: data.id,
          created_at: data.created_at || new Date().toISOString(),
          updated_at: data.updated_at || new Date().toISOString(),
          metadata: data.metadata || sessionMeta,
        };
        setSessions((prev) => (
          prev.some((session) => session.id === data.id) ? prev : [newSession, ...prev]
        ));
        saveOwnedSession(dentistId, data.id);
        return data.id;
      }
    } catch (err) {
      console.error('Failed to create session:', err);
    }
    return null;
  }, [client, dentistId, language, role]);

  const fetchSessions = useCallback(async () => {
    if (!client.config.isConfigured) return [];

    try {
      const data = await client.fetchSessions();
      const all = data.sessions || [];
      const mine = !dentistId ? all : all.filter((session) => {
        if (session.metadata?.dentist_id) {
          return String(session.metadata.dentist_id) === String(dentistId);
        }
        return getOwnedSessionIds(dentistId).has(session.id);
      });

      const localTitles = getLocalTitles();
      const merged = mine.map((session) => (
        session.metadata?.title
          ? session
          : localTitles[session.id]
            ? { ...session, metadata: { ...(session.metadata || {}), title: localTitles[session.id] } }
            : session
      ));
      setSessions(merged);
      return merged;
    } catch {
      return [];
    }
  }, [client, dentistId]);

  const fetchCases = useCallback(async () => {
    try {
      const data = await caseClient.listCases();
      const nextCases = Array.isArray(data.cases) ? data.cases : [];
      setCases(nextCases);
      return nextCases;
    } catch (err) {
      console.error('Failed to fetch verified cases:', err);
      return [];
    }
  }, [caseClient]);

  const loadCaseWorkspace = useCallback(async (caseId) => {
    if (!caseId) return null;
    const guard = workspaceRaceRef.current.start(caseId);
    setCaseWorkspace((current) => ({ ...current, isLoading: true, error: null }));

    try {
      const data = await caseClient.getCase(caseId);
      if (!guard.isActive()) return null;

      const caseRecord = data.case || null;
      let timeline = [];
      if (caseRecord?.patient_id) {
        try {
          const timelineData = await caseClient.getPatientTimeline(caseRecord.patient_id);
          if (!guard.isActive()) return null;
          timeline = timelineData.timeline_events || [];
        } catch {
          timeline = [];
        }
      }

      const nextWorkspace = {
        caseRecord,
        images: data.images || [],
        findings: data.findings || [],
        auditEvents: data.audit_events || [],
        exports: data.exports || [],
        timeline,
        isLoading: false,
        error: null,
      };
      setCaseWorkspace(nextWorkspace);
      await fetchCases();
      return nextWorkspace;
    } catch (err) {
      if (guard.isActive()) {
        setCaseWorkspace((current) => ({ ...current, isLoading: false, error: err }));
      }
      return null;
    }
  }, [caseClient, fetchCases]);

  const loadSession = useCallback(async (sid) => {
    try {
      abortRequests();
      revokeObjectUrls();
      setSessionId(sid);
      setMessages([]);
      titledSessionsRef.current.add(sid);

      const data = await client.loadMessages(sid);
      const rawMessages =
        Array.isArray(data) ? data :
          Array.isArray(data?.messages) ? data.messages :
            Array.isArray(data?.data) ? data.data :
              Array.isArray(data?.items) ? data.items :
                Array.isArray(data?.results) ? data.results :
                  [];

      const artifactEntries = await clinicalArtifactStore.getSessionEntries(sid);
      let artifactIndex = 0;
      let pendingFindings = null;

      const loaded = rawMessages.map((message) => {
        const isUser = message.role === 'user';
        const isAI = message.role === 'assistant';
        let content = message.content || '';
        let image = null;
        let visualFindings = message.visual_findings ? normalizeVisualFindings(message.visual_findings) : null;

        if (isUser && hadImageContext(content)) {
          content = stripContextBlock(content);
          const entry = artifactEntries[artifactIndex];
          if (entry) {
            artifactIndex += 1;
            image = {
              name: entry.userImageName || 'dental_image.jpg',
              url: entry.userImageBlob ? createTrackedObjectUrl(entry.userImageBlob) : null,
            };
            pendingFindings = entry.visualFindings || null;
          } else {
            image = { name: 'dental_image.jpg', url: null };
          }
        }

        if (isAI && pendingFindings) {
          if (!visualFindings) visualFindings = normalizeVisualFindings(pendingFindings);
          pendingFindings = null;
        }

        return {
          id: message.id || nextId(),
          type: isAI ? 'ai' : isUser ? 'user' : 'system',
          content,
          image,
          timestamp: message.created_at || new Date().toISOString(),
          visualFindings,
          sources: message.sources || [],
          review: message.review || null,
          caseWorkspace: message.caseWorkspace || null,
        };
      });

      setMessages(loaded);
      try {
        const sessionCase = await caseClient.getSessionCase(sid);
        if (sessionCase.case?.id) {
          const workspace = await loadCaseWorkspace(sessionCase.case.id);
          if (workspace) {
            setMessages(rehydrateAnnotatedImageArtifacts({
              messages: loaded,
              images: workspace.images,
              authBaseUrl: WORKSPACE_API_BASE_URL,
            }));
          }
        } else {
          setCaseWorkspace((current) => current.caseRecord?.session_id === sid ? current : { ...current, caseRecord: null, images: [], findings: [], auditEvents: [], exports: [], timeline: [], error: null });
        }
      } catch {
        setCaseWorkspace((current) => current.caseRecord?.session_id === sid ? current : { ...current, caseRecord: null, images: [], findings: [], auditEvents: [], exports: [], timeline: [], error: null });
      }
    } catch (err) {
      console.error('Failed to load session:', err);
      setMessages([{
        id: nextId(),
        type: 'error',
        errorType: 'network_error',
        title: 'Gagal Memuat Riwayat Sesi',
        description: 'Tidak dapat memuat percakapan sebelumnya. Periksa koneksi Anda atau coba sesi lain.',
        hint: err?.message || String(err),
        timestamp: new Date().toISOString(),
      }]);
    }
  }, [abortRequests, caseClient, client, createTrackedObjectUrl, loadCaseWorkspace, revokeObjectUrls]);

  const deleteSession = useCallback(async (sid) => {
    try {
      await client.deleteSession(sid);
    } catch (err) {
      console.error('Failed to delete session:', err);
    } finally {
      await clinicalArtifactStore.deleteSession(sid);
      deleteLocalTitle(sid);
      deleteOwnedSession(sid);
      setSessions((prev) => prev.filter((session) => session.id !== sid));
      if (sid === sessionId) {
        abortRequests();
        revokeObjectUrls();
        setSessionId(null);
        setMessages([]);
      }
    }
  }, [abortRequests, client, revokeObjectUrls, sessionId]);

  const bootstrap = useCallback(async () => {
    setIsBootstrapping(true);
    await clinicalArtifactStore.purgeExpired();
    await Promise.race([
      Promise.allSettled([checkHealth(), fetchSessions(), fetchCases()]),
      new Promise((resolve) => setTimeout(resolve, 1200)),
    ]);
    setIsBootstrapping(false);
  }, [checkHealth, fetchCases, fetchSessions]);

  const sendMessage = useCallback(async (message, imageFile = null) => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage && !imageFile) return;

    if (!client.config.isConfigured) {
      addMessage({
        type: 'error',
        errorType: 'api_key_invalid',
        title: 'Konfigurasi AI Belum Siap',
        description: client.config.configurationError || 'DeepDental proxy belum dikonfigurasi.',
        hint: null,
      });
      return;
    }

    if (imageFile) {
      const quality = buildImageQualityCoach(imageFile);
      if (!quality.canAnalyze) {
        addMessage({
          type: 'error',
          errorType: 'no_response',
          title: 'Gambar Belum Bisa Dianalisis',
          description: quality.suggestions[0] || 'Gunakan file gambar dental yang sesuai.',
          hint: null,
        });
        return;
      }
    }

    setIsLoading(true);

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

    const imageUrl = imageFile ? createTrackedObjectUrl(imageFile) : null;
    addMessage({
      type: 'user',
      content: trimmedMessage,
      image: imageFile ? { name: imageFile.name, url: imageUrl } : null,
    });

    const shouldTitle = activeSid && !titledSessionsRef.current.has(activeSid);
    if (shouldTitle) {
      titledSessionsRef.current.add(activeSid);
      const title = generateSessionTitle(trimmedMessage, imageFile);
      setSessions((prev) => prev.map((session) => (
        session.id === activeSid
          ? { ...session, metadata: { ...(session.metadata || {}), title } }
          : session
      )));
      patchSessionTitle(activeSid, title);
    }

    const requestController = new AbortController();
    abortControllersRef.current.add(requestController);

    try {
      let findings = null;
      let textContent = '';
      let sources = [];
      let suggestedQuestions = [];
      const priorVisualFindings = imageFile ? null : findLatestVisualFindings(messages);

      if (imageFile) {
        try {
          const title = generateSessionTitle(trimmedMessage, imageFile);
          const sessionCase = await caseClient.createSessionCase(activeSid, { title });
          const linkedCase = sessionCase.case;
          if (linkedCase?.id) {
            const uploaded = await caseClient.uploadImages(linkedCase.id, [imageFile]);
            const uploadedImage = uploaded.images?.[0];
            if (uploadedImage?.id) {
              pendingWorkspaceFilesRef.current.set(uploadedImage.id, imageFile);
              const dimensions = await readImageDimensions(imageFile);
              const qualityData = await caseClient.runQualityCheck(
                linkedCase.id,
                uploadedImage.id,
                buildQualityMetricsFromFile(imageFile, dimensions || {})
              );
              const qualityCheck = qualityData.quality_check;
              const canAnalyze = qualityCheck?.can_continue_analysis !== false;
              if (canAnalyze) {
                const analysisData = await caseClient.recordImageAnalysis(linkedCase.id, uploadedImage.id, {
                  context: trimmedMessage || 'Analisis klinis gambar dental dalam Bahasa Indonesia untuk dokter gigi.',
                });
                const analysis = analysisData.analysis || analysisData;
                findings = buildVisualFindingsFromCaseAnalysis({
                  analysis,
                  qualityCheck,
                  authBaseUrl: WORKSPACE_API_BASE_URL,
                });
                textContent = buildSummary(findings) || 'Analisis server-side selesai. Temuan masih berupa AI suggestion dan menunggu konfirmasi klinisi.';
              } else {
                findings = normalizeVisualFindings({
                  image_quality: qualityCheck?.quality_status || 'needs_retake',
                  concern_level: 'moderate',
                  findings: [],
                  recommendations: [qualityCheck?.recommendation || 'Retake image before AI analysis.'],
                  limitations: 'Image analysis was blocked by the clinical quality gate.',
                });
                textContent = `Quality precheck memblokir analisis gambar ini: ${qualityCheck?.recommendation || 'ambil ulang gambar sebelum analisis.'}`;
              }
              // Persist artifact for session reconstruction on reload (loadSession → getSessionEntries)
              await clinicalArtifactStore.saveSessionEntry(activeSid, {
                userImageName: imageFile.name,
                userImageBlob: imageFile,
                visualFindings: findings,
              });
              await loadCaseWorkspace(linkedCase.id);
            }
          }
        } catch (workspaceError) {
          console.warn('Verified Case Workspace analysis failed:', workspaceError?.message || workspaceError);
          addMessage({
            type: 'error',
            errorType: 'workspace_error',
            title: 'Analisis Workspace Kasus Gagal',
            description: 'Layanan DeepDental gagal memproses gambar pada workspace klinis. Coba lagi; jika masalah berulang, periksa status service AI.',
            hint: getWorkspaceErrorHint(workspaceError),
          });
          setIsLoading(false);
          return;
        }
      } else {
        const chatData = await client.chat({
          message: buildFollowUpMessage(messages, trimmedMessage),
          session_id: activeSid,
          role,
          language,
        }, requestController.signal);

        textContent = extractTextContent(chatData);
        findings = normalizeVisualFindings(chatData.visual_findings);
        sources = chatData.sources || [];
        suggestedQuestions = chatData.suggested_questions || [];
      }

      const referenceFindings = imageFile ? findings : priorVisualFindings;
      const referenceQuestion = buildJournalReferenceQuestion({
        message: trimmedMessage,
        findings: referenceFindings,
      });
      if (referenceFindings && referenceQuestion) {
        try {
          const referenceData = await client.knowledgeQuery({
            question: referenceQuestion,
            role,
            k: 6,
          }, requestController.signal);

          sources = [...sources, ...(referenceData.sources || [])];
          if (referenceData.answer) {
            const referenceSection = `### 📚 Rujukan Jurnal\n${referenceData.answer}`;
            textContent = textContent
              ? `${textContent}\n\n---\n\n${referenceSection}`
              : referenceSection;
          }
        } catch (referenceError) {
          console.warn('Journal reference query failed:', referenceError);
        }
      }

      if (textContent && isRawErrorContent(textContent)) {
        addMessage({ type: 'error', ...classifyError(textContent) });
        return;
      }

      if (!textContent && findings) textContent = buildSummary(findings);

      if (textContent || findings) {
        addMessage({
          type: 'ai',
          content: textContent || 'Analisis selesai. Lihat temuan klinis di bawah.',
          sources,
          visualFindings: findings,
          suggestedQuestions,
          review: findings ? { status: 'pending_clinician_review', updatedAt: null } : null,
          caseWorkspace: imageFile ? createCaseWorkspaceDraft({ sessionId: activeSid, imageFile, findings }) : null,
        });
      } else {
        addMessage({
          type: 'error',
          errorType: 'no_response',
          title: 'Serene AI Belum Dapat Merespons',
          description: 'AI belum dapat menghasilkan analisis saat ini. Coba gunakan gambar yang lebih jelas atau kirim ulang pertanyaan Anda.',
          hint: null,
        });
      }
    } catch (err) {
      console.error('Chat error:', err);
      if (err?.name !== 'AbortError') {
        addMessage({ type: 'error', ...classifyError('', err) });
      }
    } finally {
      abortControllersRef.current.delete(requestController);
      setIsLoading(false);
    }
  }, [addMessage, caseClient, client, createSession, createTrackedObjectUrl, language, loadCaseWorkspace, messages, role, sessionId]);

  const reviewFindings = useCallback((messageId, status) => {
    const updatedAt = new Date().toISOString();
    setMessages((prev) => prev.map((message) => (
      message.id === messageId
        ? {
          ...message,
          review: { status, updatedAt },
          caseWorkspace: message.caseWorkspace
            ? {
              ...message.caseWorkspace,
              status: status === 'confirmed' ? 'clinician_confirmed' : 'needs_revision',
              review: { status, updatedAt },
              exportReady: status === 'confirmed',
              timelineLinkReady: status === 'confirmed',
            }
            : message.caseWorkspace,
        }
        : message
    )));
  }, []);

  const createWorkspaceCase = useCallback(async ({ title = null, patientId = null } = {}) => {
    setCaseWorkspace((current) => ({ ...current, isLoading: true, error: null }));
    try {
      const body = {
        title: title || 'Verified dental case',
        ...(patientId ? { patient_id: patientId } : {}),
      };
      const data = sessionId
        ? await caseClient.createSessionCase(sessionId, body)
        : await caseClient.createCase(body);
      if (data.case?.id) {
        await fetchCases();
        return loadCaseWorkspace(data.case.id);
      }
      return null;
    } catch (err) {
      setCaseWorkspace((current) => ({ ...current, isLoading: false, error: err }));
      return null;
    }
  }, [caseClient, fetchCases, loadCaseWorkspace, sessionId]);

  const loadClinicalHistoryItem = useCallback(async (item) => {
    if (!item) return;
    if (item.type === 'case' && item.caseId) {
      await loadCaseWorkspace(item.caseId);
      if (item.sessionId) await loadSession(item.sessionId);
      return;
    }
    if (item.sessionId) await loadSession(item.sessionId);
  }, [loadCaseWorkspace, loadSession]);

  const archiveWorkspaceCase = useCallback(async (itemOrCase, reason = 'Archived from Clinical History Sidebar') => {
    const caseId = itemOrCase?.caseId || itemOrCase?.id || caseWorkspace.caseRecord?.id;
    if (!caseId) return;
    try {
      await caseClient.archiveCase(caseId, { reason });
      await fetchCases();
      if (caseWorkspace.caseRecord?.id === caseId) {
        setCaseWorkspace({
          caseRecord: null,
          images: [],
          findings: [],
          auditEvents: [],
          exports: [],
          timeline: [],
          isLoading: false,
          error: null,
        });
      }
    } catch (err) {
      setCaseWorkspace((current) => ({ ...current, error: err }));
    }
  }, [caseClient, caseWorkspace.caseRecord?.id, fetchCases]);

  const uploadWorkspaceImages = useCallback(async (files = []) => {
    if (!files.length) return;
    let activeCase = caseWorkspace.caseRecord;
    if (!activeCase?.id) {
      const createdWorkspace = await createWorkspaceCase({ title: files[0]?.name?.replace(/\.[^.]+$/, '') || 'Verified dental case' });
      activeCase = createdWorkspace?.caseRecord;
    }
    if (!activeCase?.id) return;

    setCaseWorkspace((current) => ({ ...current, isLoading: true, error: null }));
    try {
      const uploaded = await caseClient.uploadImages(activeCase.id, files);
      (uploaded.images || []).forEach((image, index) => {
        const file = files[index];
        if (file) pendingWorkspaceFilesRef.current.set(image.id, file);
      });

      await Promise.all((uploaded.images || []).map(async (image, index) => {
        const file = files[index];
        if (!file || !image.id) return null;
        const dimensions = await readImageDimensions(file);
        return caseClient.runQualityCheck(activeCase.id, image.id, buildQualityMetricsFromFile(file, dimensions || {}));
      }));

      await loadCaseWorkspace(activeCase.id);
      await fetchCases();
    } catch (err) {
      setCaseWorkspace((current) => ({ ...current, isLoading: false, error: err }));
    }
  }, [caseClient, caseWorkspace.caseRecord, createWorkspaceCase, fetchCases, loadCaseWorkspace]);

  const removeWorkspaceImage = useCallback(async (image) => {
    const caseId = caseWorkspace.caseRecord?.id;
    if (!caseId || !image?.id) return;
    try {
      await caseClient.removeImage(caseId, image.id);
      pendingWorkspaceFilesRef.current.delete(image.id);
      await loadCaseWorkspace(caseId);
    } catch (err) {
      setCaseWorkspace((current) => ({ ...current, error: err }));
    }
  }, [caseClient, caseWorkspace.caseRecord?.id, loadCaseWorkspace]);

  const analyzeWorkspaceImages = useCallback(async (imagesToAnalyze = []) => {
    const caseId = caseWorkspace.caseRecord?.id;
    if (!caseId || imagesToAnalyze.length === 0) return;
    setCaseWorkspace((current) => ({ ...current, isLoading: true, error: null }));

    try {
      for (const image of imagesToAnalyze) {
        await caseClient.recordImageAnalysis(caseId, image.id, {
          context: 'Analisis klinis multi-image untuk Verified Case Workspace. Label semua temuan sebagai preliminary AI suggestion.',
        });
      }

      await loadCaseWorkspace(caseId);
      await fetchCases();
    } catch (err) {
      setCaseWorkspace((current) => ({ ...current, isLoading: false, error: err }));
    }
  }, [caseClient, caseWorkspace.caseRecord?.id, fetchCases, loadCaseWorkspace]);

  const confirmWorkspaceFinding = useCallback(async (finding, patch = {}) => {
    const caseId = caseWorkspace.caseRecord?.id;
    if (!caseId || !finding?.id) return;
    setCaseWorkspace((c) => ({ ...c, isLoading: true, error: null }));
    try {
      await caseClient.confirmFinding(caseId, finding.id, patch);
      await loadCaseWorkspace(caseId);
    } catch (err) {
      console.error('confirmFinding failed:', err);
      setCaseWorkspace((c) => ({ ...c, isLoading: false, error: err }));
    }
  }, [caseClient, caseWorkspace.caseRecord?.id, loadCaseWorkspace]);

  const rejectWorkspaceFinding = useCallback(async (finding, reason = '') => {
    const caseId = caseWorkspace.caseRecord?.id;
    if (!caseId || !finding?.id) return;
    setCaseWorkspace((c) => ({ ...c, isLoading: true, error: null }));
    try {
      await caseClient.rejectFinding(caseId, finding.id, { reason });
      await loadCaseWorkspace(caseId);
    } catch (err) {
      console.error('rejectFinding failed:', err);
      setCaseWorkspace((c) => ({ ...c, isLoading: false, error: err }));
    }
  }, [caseClient, caseWorkspace.caseRecord?.id, loadCaseWorkspace]);

  const editWorkspaceFinding = useCallback(async (finding, patch = {}) => {
    const caseId = caseWorkspace.caseRecord?.id;
    if (!caseId || !finding?.id) return;
    setCaseWorkspace((c) => ({ ...c, isLoading: true, error: null }));
    try {
      await caseClient.editFinding(caseId, finding.id, patch);
      await loadCaseWorkspace(caseId);
    } catch (err) {
      console.error('editFinding failed:', err);
      setCaseWorkspace((c) => ({ ...c, isLoading: false, error: err }));
    }
  }, [caseClient, caseWorkspace.caseRecord?.id, loadCaseWorkspace]);

  const addManualWorkspaceFinding = useCallback(async (finding = {}) => {
    const caseId = caseWorkspace.caseRecord?.id;
    if (!caseId) return;
    setCaseWorkspace((c) => ({ ...c, isLoading: true, error: null }));
    try {
      await caseClient.addManualFinding(caseId, finding);
      await loadCaseWorkspace(caseId);
    } catch (err) {
      console.error('addManualFinding failed:', err);
      setCaseWorkspace((c) => ({ ...c, isLoading: false, error: err }));
    }
  }, [caseClient, caseWorkspace.caseRecord?.id, loadCaseWorkspace]);

  const verifyWorkspaceCase = useCallback(async () => {
    const caseId = caseWorkspace.caseRecord?.id;
    if (!caseId) return;
    setCaseWorkspace((c) => ({ ...c, isLoading: true, error: null }));
    try {
      await caseClient.verifyCase(caseId);
      await loadCaseWorkspace(caseId);
      await fetchCases();
    } catch (err) {
      console.error('verifyCase failed:', err);
      setCaseWorkspace((c) => ({ ...c, isLoading: false, error: err }));
    }
  }, [caseClient, caseWorkspace.caseRecord?.id, fetchCases, loadCaseWorkspace]);

  const exportWorkspacePdf = useCallback(async (options = {}) => {
    const caseId = caseWorkspace.caseRecord?.id;
    if (!caseId) return;
    setCaseWorkspace((c) => ({ ...c, isLoading: true, error: null }));
    try {
      const result = await caseClient.exportPdf(caseId, options);
      // Trigger browser download if API returns a URL
      const downloadUrl = result?.download_url || result?.url || result?.pdf_url || result?.file_url;
      if (downloadUrl) {
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `serene-case-${caseId}.pdf`;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      await loadCaseWorkspace(caseId);
      await fetchCases();
    } catch (err) {
      console.error('exportPdf failed:', err);
      setCaseWorkspace((c) => ({ ...c, isLoading: false, error: err }));
    }
  }, [caseClient, caseWorkspace.caseRecord?.id, fetchCases, loadCaseWorkspace]);

  const exportWorkspaceJson = useCallback(async (options = {}) => {
    const caseId = caseWorkspace.caseRecord?.id;
    if (!caseId) return;
    setCaseWorkspace((c) => ({ ...c, isLoading: true, error: null }));
    try {
      const result = await caseClient.exportJson(caseId, options);
      // Trigger browser download if API returns a URL
      const downloadUrl = result?.download_url || result?.url || result?.json_url || result?.file_url;
      if (downloadUrl) {
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `serene-case-${caseId}.json`;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      await loadCaseWorkspace(caseId);
      await fetchCases();
    } catch (err) {
      console.error('exportJson failed:', err);
      setCaseWorkspace((c) => ({ ...c, isLoading: false, error: err }));
    }
  }, [caseClient, caseWorkspace.caseRecord?.id, fetchCases, loadCaseWorkspace]);

  const linkWorkspacePatient = useCallback(async (patientInput = {}) => {
    const caseId = caseWorkspace.caseRecord?.id;
    if (!caseId) return;
    const patientId = patientInput.patient_id || patientInput.patientId || patientInput.id;
    if (!patientId) return;
    await caseClient.linkPatient(caseId, patientInput);
    await loadCaseWorkspace(caseId);
    await fetchCases();
  }, [caseClient, caseWorkspace.caseRecord?.id, fetchCases, loadCaseWorkspace]);

  // P2-G: Retry quality check for a previously uploaded workspace image
  const retryWorkspaceImage = useCallback(async (image) => {
    const caseId = caseWorkspace.caseRecord?.id;
    if (!caseId || !image?.id) return;
    const file = pendingWorkspaceFilesRef.current.get(image.id);
    if (!file) return; // Original File object required for quality metrics
    setCaseWorkspace((c) => ({ ...c, isLoading: true, error: null }));
    try {
      const dimensions = await readImageDimensions(file);
      await caseClient.runQualityCheck(
        caseId,
        image.id,
        buildQualityMetricsFromFile(file, dimensions || {})
      );
      await loadCaseWorkspace(caseId);
    } catch (err) {
      console.error('retryWorkspaceImage failed:', err);
      setCaseWorkspace((c) => ({ ...c, isLoading: false, error: err }));
    }
  }, [caseClient, caseWorkspace.caseRecord?.id, loadCaseWorkspace]);

  const startNewSession = useCallback(() => {
    abortRequests();
    revokeObjectUrls();
    workspaceRaceRef.current.cancel();
    setSessionId(null);
    setMessages([]);
    setCaseWorkspace({
      caseRecord: null,
      images: [],
      findings: [],
      auditEvents: [],
      exports: [],
      timeline: [],
      isLoading: false,
      error: null,
    });
  }, [abortRequests, revokeObjectUrls]);

  const clearLocalClinicalData = useCallback(async () => {
    abortRequests();
    revokeObjectUrls();
    await clinicalArtifactStore.clearAll();
    setMessages((prev) => prev.map((message) => (
      message.image ? { ...message, image: { ...message.image, url: null } } : message
    )));
  }, [abortRequests, revokeObjectUrls]);

  return {
    sessionId,
    messages,
    sessions,
    cases,
    clinicalHistory,
    caseWorkspace,
    isLoading,
    isBootstrapping,
    systemHealth,
    bootstrap,
    sendMessage,
    startNewSession,
    loadSession,
    deleteSession,
    fetchSessions,
    fetchCases,
    reviewFindings,
    clearLocalClinicalData,
    createWorkspaceCase,
    loadCaseWorkspace,
    loadClinicalHistoryItem,
    archiveWorkspaceCase,
    uploadWorkspaceImages,
    removeWorkspaceImage,
    retryWorkspaceImage,
    analyzeWorkspaceImages,
    confirmWorkspaceFinding,
    rejectWorkspaceFinding,
    editWorkspaceFinding,
    addManualWorkspaceFinding,
    verifyWorkspaceCase,
    exportWorkspacePdf,
    exportWorkspaceJson,
    linkWorkspacePatient,
  };
}

function buildSummary(findings) {
  if (!findings) return '';
  const parts = [];
  const iq = typeof findings.image_quality === 'string' ? findings.image_quality : 'dianalisis';
  parts.push(`**Kualitas Gambar:** ${iq.toUpperCase()}`);

  if (findings.concern_level) {
    const cl = typeof findings.concern_level === 'string' ? findings.concern_level : 'tidak diketahui';
    parts.push(`**Tingkat Keparahan:** ${cl.toUpperCase()}`);
  }

  if (findings.detections?.length > 0) {
    const grouped = {};
    findings.detections.forEach((d) => {
      const label = d.label || 'Tidak diketahui';
      if (!grouped[label]) grouped[label] = [];
      grouped[label].push(d);
    });
    parts.push(`\n**Patologi Terdeteksi (${findings.detections.length}):**`);
    Object.entries(grouped).forEach(([label, detections]) => {
      const maxConf = Math.max(...detections.map((d) => d.confidence || 0));
      parts.push(`- **${label}**: ${detections.length} marker, hingga ${(maxConf * 100).toFixed(0)}% kepercayaan`);
    });
  }

  if (findings.findings?.length > 0) {
    parts.push('\n**Temuan Klinis:**');
    findings.findings.forEach((finding, index) => {
      const location = finding.location ? `**${finding.location}**` : '';
      const severity = finding.severity ? ` (${finding.severity})` : '';
      const description = finding.description || '';
      parts.push(`${index + 1}. ${location}${severity}: ${description}`);
      if (finding.differentials?.length) {
        parts.push(`   Diagnosis banding: ${finding.differentials.join(', ')}`);
      }
    });
  }

  if (findings.recommendations?.length > 0) {
    parts.push('\n**Rekomendasi:**');
    findings.recommendations.forEach((recommendation) => parts.push(`- ${recommendation}`));
  }

  if (findings.limitations) {
    parts.push(`\n*Catatan: ${findings.limitations}*`);
  }

  return parts.join('\n');
}
