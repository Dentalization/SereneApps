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
import { buildImageQualityCoach } from './qualityCoach.mjs';

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
  );
}

const TITLE_STOPWORDS = new Set([
  'apakah','bagaimana','mengapa','kenapa','apa','yang','ini','itu','ada','dan',
  'atau','dengan','untuk','pada','di','ke','dari','saya','pasien','dokter',
  'tolong','mohon','bisa','dapat','adalah','juga','sudah','akan','belum',
  'tidak','bukan','kita','kami','mereka','dia','ia','nya','sebuah','suatu',
  'jika','kalau','sangat','sekali','lebih','lagi','sudah','telah','namun',
  'what','how','why','when','where','who','which','the','a','an','is','are',
  'was','were','be','been','have','has','had','do','does','did','will','would',
  'could','should','may','might','can','this','that','i','we','you','he','she',
  'they','it','my','your','his','her','our','their','at','in','on','to','of',
  'for','with','about','by','from','and','or','but','if','very','also','just',
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

export default function useDentalAPI(role = 'dentist', dentistId = null, language = 'id') {
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [systemHealth, setSystemHealth] = useState(null);
  const msgIdRef = useRef(1);
  const titledSessionsRef = useRef(new Set());
  const objectUrlsRef = useRef(new Set());
  const abortControllersRef = useRef(new Set());

  const client = useMemo(() => createDeepDentalClient({
    config: resolveDeepDentalConfig({
      VITE_DEEPDENTAL_PROXY_BASE_URL: import.meta.env.VITE_DEEPDENTAL_PROXY_BASE_URL,
    }),
    getAccessToken,
  }), []);

  const nextId = () => msgIdRef.current++;

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
    } catch (err) {
      console.error('Failed to load session:', err);
    }
  }, [abortRequests, client, createTrackedObjectUrl, revokeObjectUrls]);

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
    const initialRequests = Promise.allSettled([checkHealth(), fetchSessions()]);
    await Promise.race([
      initialRequests,
      new Promise((resolve) => setTimeout(resolve, 1200)),
    ]);
    setIsBootstrapping(false);
  }, [checkHealth, fetchSessions]);

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

      if (imageFile) {
        const formData = new FormData();
        formData.append('image', imageFile);
        formData.append('context', trimmedMessage || 'Analisis klinis gambar dental dalam Bahasa Indonesia untuk dokter gigi.');
        formData.append('role', role);
        formData.append('language', language);
        formData.append('include_annotated', 'true');

        const analysisData = await client.analyzeImage(formData, requestController.signal);
        findings = normalizeVisualFindings(analysisData.visual_findings || analysisData);
        textContent = extractTextContent(analysisData) || analysisData.summary || analysisData.overall_assessment || '';
        sources = analysisData.sources || [];
        suggestedQuestions = analysisData.suggested_questions || [];

        await clinicalArtifactStore.saveSessionEntry(activeSid, {
          msgSnippet: trimmedMessage.slice(0, 80),
          userImageBlob: imageFile,
          userImageName: imageFile.name,
          userImageType: imageFile.type,
          visualFindings: findings ? { ...findings } : null,
        });
      } else {
        const chatData = await client.chat({
          message: trimmedMessage,
          session_id: activeSid,
          role,
          language,
        }, requestController.signal);

        textContent = extractTextContent(chatData);
        findings = normalizeVisualFindings(chatData.visual_findings);
        sources = chatData.sources || [];
        suggestedQuestions = chatData.suggested_questions || [];
      }

      const labels = [...new Set((findings?.detections || []).map((d) => d.label).filter(Boolean))];
      if (labels.length > 0) {
        try {
          const kbData = await client.knowledgeQuery({
            question: `Analisis klinis lengkap dan perawatan untuk: ${labels.join(', ')}. Sertakan diagnosis diferensial, tingkat keparahan, opsi perawatan, dan prognosis. Jawab dalam Bahasa Indonesia.`,
            role,
            k: 6,
          }, requestController.signal);
          sources = [...sources, ...(kbData.sources || [])];
          if (!textContent && kbData.answer) textContent = kbData.answer;
        } catch { /* knowledge base is supplementary */ }
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
  }, [addMessage, client, createSession, createTrackedObjectUrl, language, role, sessionId]);

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

  const startNewSession = useCallback(() => {
    abortRequests();
    revokeObjectUrls();
    setSessionId(null);
    setMessages([]);
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
    isLoading,
    isBootstrapping,
    systemHealth,
    bootstrap,
    sendMessage,
    startNewSession,
    loadSession,
    deleteSession,
    fetchSessions,
    reviewFindings,
    clearLocalClinicalData,
  };
}

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
    Object.entries(grouped).forEach(([label, detections]) => {
      const maxConf = Math.max(...detections.map((d) => d.confidence || 0));
      parts.push(`- **${label}**: ${detections.length} marker, up to ${(maxConf * 100).toFixed(0)}% confidence`);
    });
  }

  if (findings.findings?.length > 0) {
    parts.push('\n**Clinical Findings:**');
    findings.findings.forEach((finding, index) => {
      const location = finding.location ? `**${finding.location}**` : '';
      const severity = finding.severity ? ` (${finding.severity})` : '';
      const description = finding.description || '';
      parts.push(`${index + 1}. ${location}${severity}: ${description}`);
      if (finding.differentials?.length) {
        parts.push(`   Differentials: ${finding.differentials.join(', ')}`);
      }
    });
  }

  if (findings.recommendations?.length > 0) {
    parts.push('\n**Recommendations:**');
    findings.recommendations.forEach((recommendation) => parts.push(`- ${recommendation}`));
  }

  if (findings.limitations) {
    parts.push(`\n*Limitations: ${findings.limitations}*`);
  }

  return parts.join('\n');
}
