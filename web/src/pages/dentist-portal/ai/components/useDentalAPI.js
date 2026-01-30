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

/**
 * Try to extract JSON from an error detail string (e.g. schema validation errors)
 */
function extractFindingsFromErrorDetail(detail) {
  if (!detail || typeof detail !== 'string') return null;
  const patterns = [
    /from completion (\{[\s\S]*?\})\.\s*Got:/,
    /(\{[\s\S]*?"image_quality"[\s\S]*?\})/,
  ];
  for (const pattern of patterns) {
    const match = detail.match(pattern);
    if (match?.[1]) {
      try { return normalizeFindings(JSON.parse(match[1])); } catch { /* skip */ }
    }
  }
  return null;
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
        body: JSON.stringify({ role: 'dentist', language: 'bilingual', metadata: { source: 'deepdental_pro' } }),
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
        // ── IMAGE FLOW: Call /images/detect + /chat/upload in parallel ──

        // Build FormData for YOLO detection
        const detectForm = new FormData();
        detectForm.append('image', imageFile);
        detectForm.append('include_annotated', 'true');

        // Build FormData for chat with upload
        const chatForm = new FormData();
        chatForm.append('message', message || 'Berikan analisis dental lengkap untuk gambar ini termasuk temuan klinis, diagnosis diferensial, tingkat keparahan, dan rekomendasi perawatan');
        chatForm.append('session_id', sessionId);
        chatForm.append('role', 'dentist');
        chatForm.append('language', 'bilingual');
        chatForm.append('images', imageFile);

        // Fire both requests in parallel
        const [detectRes, chatRes] = await Promise.allSettled([
          fetch(api('/images/detect'), { method: 'POST', headers: authHeaders(), body: detectForm }),
          fetch(api('/chat/upload'), { method: 'POST', headers: authHeaders(), body: chatForm }),
        ]);

        // ── Process YOLO detection results ──
        if (detectRes.status === 'fulfilled' && detectRes.value.ok) {
          const detectData = await detectRes.value.json().catch(() => ({}));
          console.log('[DeepDental] /images/detect:', detectData.detections?.length || 0, 'detections');
          if (detectData.detections?.length > 0 || detectData.annotated_image_base64) {
            findings = {
              detections: detectData.detections || [],
              annotated_image_base64: detectData.annotated_image_base64 || null,
              processing_time_ms: detectData.processing_time_ms,
            };
          }
        } else {
          console.warn('[DeepDental] /images/detect failed');
        }

        // ── Process chat/upload results ──
        if (chatRes.status === 'fulfilled') {
          const chatData = await chatRes.value.json().catch(() => ({}));
          console.log('[DeepDental] /chat/upload status:', chatRes.value.status);

          // Get text content from LLM
          textContent = chatData.content || chatData.reply || '';
          sources = chatData.sources || [];
          suggestedQuestions = chatData.suggested_questions || [];

          // Merge visual_findings from chat (has LLM analysis: findings, recommendations, concern_level, image_quality)
          const chatFindings = normalizeFindings(chatData.visual_findings);
          if (chatFindings) {
            findings = {
              // YOLO detections + annotated image (from /images/detect — more reliable)
              detections: findings?.detections || chatFindings.detections || [],
              annotated_image_base64: findings?.annotated_image_base64 || chatFindings.annotated_image_base64 || null,
              // LLM analysis (from /chat/upload)
              image_quality: chatFindings.image_quality || null,
              concern_level: chatFindings.concern_level || null,
              findings: chatFindings.findings || [],
              recommendations: chatFindings.recommendations || [],
              limitations: chatFindings.limitations || null,
            };
          } else if (findings) {
            // Only have YOLO data, no LLM findings — keep what we have
            findings = normalizeFindings(findings);
          }

          // Try recover from error detail if still no content
          if (!textContent && !findings) {
            const detail = chatData.detail || chatData.message || '';
            const recovered = extractFindingsFromErrorDetail(detail);
            if (recovered) findings = recovered;
          }
        }

      } else {
        // ── TEXT-ONLY FLOW: Just /chat/upload ──
        const formData = new FormData();
        formData.append('message', message);
        formData.append('session_id', sessionId);
        formData.append('role', 'dentist');
        formData.append('language', 'bilingual');

        const chatRes = await fetch(api('/chat/upload'), {
          method: 'POST',
          headers: authHeaders(),
          body: formData,
        });

        const chatData = await chatRes.json().catch(() => ({}));
        textContent = chatData.content || chatData.reply || '';
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
              question: `Clinical analysis and treatment for: ${labels.join(', ')}. Differential diagnosis, severity, treatment.`,
              role: 'dentist',
              k: 4,
            }),
          });
          if (kbRes.ok) {
            const kbData = await kbRes.json();
            sources = [...sources, ...(kbData.sources || [])];
            if (!textContent && kbData.answer) {
              textContent = kbData.answer;
            } else if (textContent && kbData.answer && !textContent.includes(kbData.answer.slice(0, 40))) {
              textContent += '\n\n---\n\n' + kbData.answer;
            }
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
