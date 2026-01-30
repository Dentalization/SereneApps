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


export default function useDentalAPI() {
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [systemHealth, setSystemHealth] = useState(null);
  const msgIdRef = useRef(1);

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
      const r = await fetch(api('/sessions'), {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify({ role: 'dentist', language: 'id', metadata: { source: 'deepdental_pro' } }),
      });
      const data = await r.json();
      if (data.id) {
        setSessionId(data.id);
        setMessages([]);
        return data.id;
      }
    } catch (err) {
      console.error('Failed to create session:', err);
    }
    return null;
  }, []);

  const fetchSessions = useCallback(async () => {
    try {
      const r = await fetch(api('/sessions?page=1&per_page=20'), { headers: authHeaders() });
      const data = await r.json();
      setSessions(data.sessions || []);
      return data.sessions || [];
    } catch {
      return [];
    }
  }, []);

  const loadSession = useCallback(async (sid) => {
    try {
      setSessionId(sid);
      const r = await fetch(api(`/sessions/${sid}/messages`), { headers: authHeaders() });
      const data = await r.json();
      if (Array.isArray(data)) {
        const loaded = data.map((m) => ({
          id: m.id || nextId(),
          type: m.role === 'assistant' ? 'ai' : m.role === 'user' ? 'user' : 'system',
          content: m.content || '',
          timestamp: m.created_at || new Date().toISOString(),
          visualFindings: m.visual_findings ? normalizeFindings(m.visual_findings) : null,
          sources: m.sources || [],
        }));
        setMessages(loaded);
      }
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
    const start = Date.now();
    await Promise.all([checkHealth(), fetchSessions()]);
    const sid = await createSession();
    // Ensure minimum boot time for smooth UX
    const elapsed = Date.now() - start;
    if (elapsed < 900) await new Promise((r) => setTimeout(r, 900 - elapsed));
    setIsBootstrapping(false);
    return sid;
  }, [checkHealth, fetchSessions, createSession]);

  // ── Send Message / Analyze Image ────────────────────

  const sendMessage = useCallback(async (message, imageFile = null) => {
    if (!sessionId || (!message.trim() && !imageFile)) return;

    setIsLoading(true);

    // Add user message
    const imageUrl = imageFile ? URL.createObjectURL(imageFile) : null;
    addMessage({
      type: 'user',
      content: message,
      image: imageFile ? { name: imageFile.name, url: imageUrl } : null,
    });

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

        const analysisPrompt = message
          || `Berdasarkan hasil deteksi AI pada foto dental pasien, ditemukan ${detections.length} marker patologi:\n${detectionSummary}\n\nBerikan analisis dental lengkap dan mendetail dalam Bahasa Indonesia. Sertakan:\n1) Temuan klinis pada setiap patologi yang terdeteksi\n2) Diagnosis diferensial dengan penjelasan masing-masing\n3) Tingkat keparahan dan urgensi\n4) Rekomendasi perawatan step-by-step\n5) Prognosis\n\nJawab selengkap mungkin sebagai dokter gigi spesialis.`;

        const chatForm = new FormData();
        chatForm.append('message', analysisPrompt);
        chatForm.append('session_id', sessionId);
        chatForm.append('role', 'dentist');
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
          console.error('[DeepDental] text-chat error:', err);
        }

      } else {
        // ── TEXT-ONLY FLOW: Just /chat/upload ──
        const formData = new FormData();
        formData.append('message', message);
        formData.append('session_id', sessionId);
        formData.append('role', 'dentist');
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
              role: 'dentist',
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
          content: 'Analysis returned no results. Please try again with a clearer dental image.',
        });
      }
    } catch (err) {
      console.error('Chat error:', err);
      addMessage({ type: 'error', content: `Request failed: ${err.message}` });
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, addMessage]);

  // ── New Session ─────────────────────────────────────

  const startNewSession = useCallback(async () => {
    const sid = await createSession();
    await fetchSessions();
    return sid;
  }, [createSession, fetchSessions]);

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
