import crypto from 'crypto';

const MAX_MESSAGE_LENGTH = 4000;
const MAX_CHAT_ATTACHMENTS = 2;
const MAX_CHAT_ATTACHMENT_BYTES = 8 * 1024 * 1024;
const CLINICAL_SYSTEM_PROMPT = `You are Serene AI Clinical Decision Support for a licensed dentist.
Use only the patient context, verified clinical findings, visual detections, and conversation supplied by the server.
Distinguish observed findings, differential diagnoses, uncertainty, and recommended confirmation steps.
Never present AI output as a definitive diagnosis. Do not invent symptoms, history, tooth numbers, imaging findings, medications, or citations.
Prioritize urgent red flags and explicitly recommend immediate in-person assessment when indicated.
Consider allergies, conditions, and medications. State when available evidence is insufficient.
Respond in Bahasa Indonesia unless the dentist asks in English.
Keep patient-facing language separate from clinician-facing reasoning. The final decision remains with the dentist.`;

function sanitizeMessage(value) {
  return String(value || '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim();
}

function serializeMessage(message) {
  const metadata = message.metadata || {};
  return {
    id: message.id.toString(),
    role: message.role,
    actorType: metadata.actor_type || (message.role === 'dentist' ? 'dentist' : message.role),
    actorId: metadata.actor_id || message.userId?.toString?.() || message.user?.id?.toString?.() || null,
    actorName: metadata.actor_name || message.user?.name || (message.role === 'assistant' ? 'Serene AI' : null),
    content: message.content,
    createdAt: message.createdAt.toISOString(),
    requestId: metadata.request_id || null,
    status: 'sent',
  };
}

function stripEmbeddedClientContext(value) {
  const content = String(value || '').trim();
  if (!content.includes('[KONTEKS:')) return content;
  const question = content.match(/Pertanyaan user:\s*([\s\S]+)$/i)?.[1]?.trim();
  return question || content.replace(/\[KONTEKS:[\s\S]*?\[END KONTEKS\]\s*/i, '').trim();
}

function normalizeImageCandidate(value, type = 'original', description = null) {
  const raw = typeof value === 'string'
    ? value
    : value?.url || value?.data || value?.base64 || null;
  if (!raw) return null;
  const trimmed = raw.trim();
  let url = trimmed;
  if (
    !/^(data:image\/|https?:\/\/|\/uploads\/|\/v1\/|\/api\/)/i.test(trimmed) &&
    trimmed.length >= 8 &&
    /^[A-Za-z0-9+/=\r\n]+$/.test(trimmed)
  ) {
    url = `data:image/jpeg;base64,${trimmed.replace(/\s+/g, '')}`;
  }
  if (!/^(data:image\/|https?:\/\/|\/uploads\/|\/v1\/|\/api\/)/i.test(url)) return null;
  return { url, type, description: description || (type === 'annotated' ? 'Hasil anotasi AI' : 'Gambar asli pasien') };
}

function collectConversationImages(result, upstreamMessages = []) {
  const candidates = [
    normalizeImageCandidate(result.imageUrl, 'original'),
    normalizeImageCandidate(result.annotatedImageUrl, 'annotated'),
  ];
  for (const message of upstreamMessages) {
    const images = Array.isArray(message?.images) ? message.images : [];
    images.forEach((image) => candidates.push(normalizeImageCandidate(image, 'original')));
    const visual = message?.visual_findings || message?.metadata?.visual_findings || {};
    candidates.push(normalizeImageCandidate(
      message?.annotated_image_base64 ||
      message?.annotated_image_url ||
      visual.annotated_image_base64 ||
      visual.annotated_image_signed_url,
      'annotated',
    ));
  }

  const seen = new Set();
  return candidates.filter((candidate) => {
    if (!candidate || seen.has(candidate.url)) return false;
    seen.add(candidate.url);
    return true;
  });
}

function normalizeUpstreamMessage(message) {
  const role = message.role === 'user'
    ? 'patient'
    : message.role === 'assistant' || message.role === 'ai'
      ? 'assistant'
      : message.role;
  return {
    id: `deepdental:${message.id || crypto.randomUUID()}`,
    role,
    actorType: role,
    actorId: null,
    actorName: role === 'patient' ? 'Pasien' : role === 'assistant' ? 'Serene AI' : 'Sistem',
    content: role === 'patient'
      ? stripEmbeddedClientContext(message.content)
      : sanitizeMessage(message.content),
    createdAt: message.createdAt || message.created_at || new Date().toISOString(),
    requestId: null,
    status: 'sent',
  };
}

function syntheticAnalysisMessage(result) {
  const content = sanitizeMessage(
    result.summary ||
    result.overallAssessment ||
    result.findings ||
    (Array.isArray(result.detections) && result.detections.length
      ? `Analisis visual menemukan ${result.detections.length} area yang perlu ditinjau dokter gigi.`
      : ''),
  );
  if (!content) return null;
  return {
    id: `analysis:${result.id.toString()}`,
    role: 'assistant',
    actorType: 'assistant',
    actorId: 'serene-ai',
    actorName: 'Serene AI',
    content,
    createdAt: result.createdAt?.toISOString?.() || new Date().toISOString(),
    requestId: null,
    status: 'sent',
  };
}

function imageInputsFromMedia(media = []) {
  const encoded = media
    .map((image, index) => {
      const match = String(image?.url || '').match(/^data:(image\/[a-z0-9.+-]+);base64,([\s\S]+)$/i);
      if (!match || match[2].length > 8_000_000) return null;
      return {
        data: match[2].replace(/\s+/g, ''),
        filename: `${image.type || 'dental'}-${index + 1}.${match[1].includes('png') ? 'png' : 'jpg'}`,
      };
    })
    .filter(Boolean);
  const original = encoded.find((image) => image.filename.startsWith('original-'));
  return original ? [original] : encoded.slice(0, 1);
}

function imageInputFromAttachment(attachment, index = 0) {
  if (!attachment?.buffer || !attachment?.mimetype) return null;
  const buffer = Buffer.from(attachment.buffer);
  if (!buffer.length || buffer.length > MAX_CHAT_ATTACHMENT_BYTES) return null;
  return {
    data: buffer.toString('base64'),
    filename: attachment.originalname || `clinical-attachment-${index + 1}.jpg`,
  };
}

function mergeConversationMessages(upstreamMessages, localMessages) {
  const local = localMessages.map(serializeMessage);
  const upstream = upstreamMessages.map(normalizeUpstreamMessage).filter((message) => {
    return !local.some((persisted) => {
      const sameContent = persisted.content.trim() === message.content.trim();
      const compatibleRole =
        persisted.role === message.role ||
        (persisted.role === 'dentist' && message.role === 'patient');
      const timeDelta = Math.abs(new Date(persisted.createdAt) - new Date(message.createdAt));
      return sameContent && compatibleRole && Number.isFinite(timeDelta) && timeDelta <= 10 * 60 * 1000;
    });
  });
  return [...upstream, ...local];
}

function buildClinicalContext({ patient, result, history, media = [] }) {
  const medical = patient.patientProfile?.medicalDetails || {};
  const priorConversation = history.slice(-20).map((message) => ({
    role: message.role === 'dentist' ? 'user' : 'assistant',
    content: message.content,
  }));
  return {
    system: CLINICAL_SYSTEM_PROMPT,
    patient: {
      age_or_dob: patient.patientProfile?.dateOfBirth || null,
      gender: patient.patientProfile?.gender || null,
      allergies: medical.allergies || [],
      conditions: medical.conditions || [],
      medications: medical.medications || [],
    },
    analysis: {
      findings: result.findings || null,
      overall_assessment: result.overallAssessment || null,
      risk_level: result.riskLevel || null,
      confidence: result.confidenceScore || null,
      detections: result.detections || [],
      recommendations: result.recommendations || [],
      image_context: {
        available: media.length > 0,
        image_count: media.length,
        types: media.map((image) => image.type),
      },
    },
    conversation: priorConversation,
  };
}

function upstreamError(status) {
  const error = new Error('clinical_ai_unavailable');
  error.code = 'clinical_ai_unavailable';
  error.status = status === 429 ? 429 : 502;
  return error;
}

export function createDentistAIChatService({
  prisma,
  storage = null,
  fetchImpl = fetch,
  baseUrl = process.env.DEEPDENTAL_API_BASE_URL || 'https://api.dentalization.id',
  apiKey = process.env.DEEPDENTAL_API_KEY || process.env.SERENE_AI_API_KEY || '',
} = {}) {
  if (!prisma) throw new Error('prisma_required');

  async function persistAttachments({ attachments = [], resultId, dentistId, requestId }) {
    if (!attachments.length) return [];
    if (!storage?.putOriginalImage) {
      const error = new Error('attachment_storage_unavailable');
      error.status = 503;
      throw error;
    }
    const stored = [];
    try {
      for (const [index, attachment] of attachments.slice(0, MAX_CHAT_ATTACHMENTS).entries()) {
        const saved = await storage.putOriginalImage(attachment.buffer, {
          caseId: `ai-result-${resultId.toString()}`,
          fileName: attachment.originalname || `clinical-attachment-${index + 1}.jpg`,
          mimeType: attachment.mimetype,
          actorId: dentistId.toString(),
          requestId,
          aiResultId: resultId.toString(),
        });
        stored.push({
          storage_ref: saved.storageRef,
          signed_url: saved.signedUrl,
          file_name: attachment.originalname || `clinical-attachment-${index + 1}.jpg`,
          mime_type: attachment.mimetype,
          size_bytes: saved.sizeBytes,
          type: 'supplemental',
        });
      }
      return stored;
    } catch (error) {
      await Promise.all(stored.map((item) => storage.archiveObject?.(item.storage_ref).catch(() => null)));
      throw error;
    }
  }

  async function archiveAttachments(attachments = []) {
    if (!storage?.archiveObject) return;
    await Promise.all(attachments.map((item) => storage.archiveObject(item.storage_ref).catch(() => null)));
  }

  async function resolveMessageAttachments(messages = []) {
    if (!storage?.getSignedUrl) return new Map();
    const entries = await Promise.all(messages.flatMap((message) => {
      const attachments = Array.isArray(message.metadata?.attachments)
        ? message.metadata.attachments
        : [];
      return attachments.map(async (attachment) => {
        const url = await storage.getSignedUrl(attachment.storage_ref).catch(() => null);
        if (!url) return null;
        return {
          messageId: message.id.toString(),
          attachment: {
            url,
            type: attachment.type || 'supplemental',
            name: attachment.file_name || 'Gambar klinis tambahan',
            mimeType: attachment.mime_type || 'image/jpeg',
            sizeBytes: attachment.size_bytes || null,
          },
        };
      });
    }));
    const byMessage = new Map();
    for (const entry of entries.filter(Boolean)) {
      const current = byMessage.get(entry.messageId) || [];
      current.push(entry.attachment);
      byMessage.set(entry.messageId, current);
    }
    return byMessage;
  }

  async function storedAttachmentInputs(messages = []) {
    if (!storage?.getObjectBuffer) return [];
    const refs = messages
      .flatMap((message) => Array.isArray(message.metadata?.attachments) ? message.metadata.attachments : [])
      .slice(-MAX_CHAT_ATTACHMENTS);
    const inputs = await Promise.all(refs.map(async (attachment, index) => {
      try {
        const buffer = await storage.getObjectBuffer(attachment.storage_ref);
        return imageInputFromAttachment({
          buffer,
          mimetype: attachment.mime_type,
          originalname: attachment.file_name,
        }, index);
      } catch {
        return null;
      }
    }));
    return inputs.filter(Boolean);
  }

  async function requireAccess({ dentistId, patientId, resultId }) {
    const appointment = await prisma.appointment.findFirst({
      where: { dentistId, patientId },
      select: { id: true },
    });
    if (!appointment) {
      const error = new Error('forbidden');
      error.status = 403;
      throw error;
    }

    const result = await prisma.aIAnalysisResult.findFirst({
      where: { id: resultId, userId: patientId },
    });
    if (!result) {
      const error = new Error('ai_result_not_found');
      error.status = 404;
      throw error;
    }
    return result;
  }

  async function fetchUpstreamSession(result) {
    if (!result?.sessionId || !apiKey) return [];
    try {
      const response = await fetchImpl(
        new URL(`/api/v1/sessions/${encodeURIComponent(result.sessionId)}/messages`, `${baseUrl.replace(/\/$/, '')}/`),
        { headers: { 'X-API-Key': apiKey } },
      );
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data) ? data : (data?.messages || []);
    } catch {
      return [];
    }
  }

  async function getConversation({ dentistId, patientId, resultId, limit = 100 }) {
    const resultIdBigInt = BigInt(resultId);
    const result = await requireAccess({ dentistId, patientId, resultId: resultIdBigInt });
    const [localMessages, upstreamMessages] = await Promise.all([
      prisma.aIChatMessage.findMany({
        where: { aiResultId: resultIdBigInt },
        orderBy: { createdAt: 'asc' },
        take: Math.min(Math.max(Number(limit) || 100, 1), 200),
        include: { user: { select: { id: true, name: true, avatar_url: true } } },
      }),
      fetchUpstreamSession(result),
    ]);

    const messages = mergeConversationMessages(upstreamMessages, localMessages)
      .filter((message) => message.content);
    const attachmentsByMessage = await resolveMessageAttachments(localMessages);
    for (const message of messages) {
      const attachments = attachmentsByMessage.get(message.id);
      if (attachments?.length) message.attachments = attachments;
    }
    if (!messages.some((message) => message.role === 'assistant')) {
      const initial = syntheticAnalysisMessage(result);
      if (initial) messages.unshift(initial);
    }
    messages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    const attachmentImages = [...attachmentsByMessage.values()].flat()
      .map((attachment) => ({
        url: attachment.url,
        type: attachment.type,
        description: attachment.name,
      }));
    const images = [...collectConversationImages(result, upstreamMessages), ...attachmentImages];
    return {
      messages: messages.slice(-Math.min(Math.max(Number(limit) || 100, 1), 200)),
      context: {
        images,
        imageContextAvailable: images.length > 0,
        sessionLinked: Boolean(result.sessionId),
      },
    };
  }

  async function listMessages({ dentistId, patientId, resultId, limit = 100 }) {
    if (typeof resultId === 'string' && resultId.startsWith('case:')) {
      const caseId = resultId.replace(/^case:/, '');
      const cases = await prisma.$queryRawUnsafe(`
        SELECT session_id
        FROM verified_cases vc
        WHERE vc.id = $1::uuid
          AND vc.status <> 'archived'
          AND (
            vc.patient_id = $2
            OR EXISTS (
              SELECT 1 FROM patient_timeline_events pte
              WHERE pte.case_id = vc.id AND pte.patient_id = $2
            )
          )
          ${dentistId ? `AND (
            vc.created_by = ${BigInt(dentistId)}
            OR EXISTS (
              SELECT 1 FROM appointments apt
              WHERE apt.dentist_id = ${BigInt(dentistId)} AND apt.patient_id = $2 LIMIT 1
            )
          )` : ''}
        LIMIT 1
      `, caseId, patientId);

      if (cases.length === 0) {
        const error = new Error('ai_result_not_found');
        error.status = 404;
        throw error;
      }

      const sessionId = cases[0].session_id;
      if (!sessionId) {
        return [];
      }

      if (!apiKey) throw upstreamError(503);

      const url = new URL(`/api/v1/sessions/${sessionId}/messages`, baseUrl);
      const response = await fetchImpl(url.toString(), {
        headers: { 'X-API-Key': apiKey },
      });
      if (!response.ok) {
        throw upstreamError(response.status);
      }
      const data = await response.json();
      const rawMessages = Array.isArray(data) ? data : (data?.messages || []);

      return rawMessages.map((msg) => ({
        id: msg.id || String(Math.random()),
        role: msg.role === 'user' ? 'dentist' : (msg.role === 'assistant' ? 'assistant' : msg.role),
        actorType: msg.role === 'user' ? 'dentist' : 'assistant',
        actorId: null,
        actorName: msg.role === 'user' ? 'Dokter Gigi' : 'Serene AI',
        content: msg.content || '',
        createdAt: msg.createdAt || msg.created_at || new Date().toISOString(),
        requestId: null,
        status: 'sent',
      }));
    }

    return (await getConversation({ dentistId, patientId, resultId, limit })).messages;
  }

  async function chat({ dentistId, patientId, resultId, message, idempotencyKey, attachments = [] }) {
    const content = sanitizeMessage(message);
    if (!content || content.length > MAX_MESSAGE_LENGTH) {
      const error = new Error('invalid_message');
      error.status = 400;
      throw error;
    }
    if (!idempotencyKey || String(idempotencyKey).length > 128) {
      const error = new Error('idempotency_key_required');
      error.status = 400;
      throw error;
    }

    const result = await requireAccess({ dentistId, patientId, resultId });
    const existing = await prisma.aIChatMessage.findFirst({
      where: {
        aiResultId: resultId,
        role: 'assistant',
        metadata: { path: ['idempotency_key'], equals: String(idempotencyKey) },
      },
      include: { user: { select: { id: true, name: true, avatar_url: true } } },
    });
    if (existing) {
      return { duplicate: true, messages: await listMessages({ dentistId, patientId, resultId }) };
    }

    if (!Array.isArray(attachments) || attachments.length > MAX_CHAT_ATTACHMENTS) {
      const error = new Error('invalid_attachments');
      error.status = 400;
      throw error;
    }

    const [patient, dentist, history, upstreamMessages] = await Promise.all([
      prisma.user.findUnique({
        where: { id: patientId },
        select: {
          id: true,
          patientProfile: { select: { dateOfBirth: true, gender: true, medicalDetails: true } },
        },
      }),
      prisma.user.findUnique({ where: { id: dentistId }, select: { id: true, name: true } }),
      prisma.aIChatMessage.findMany({
        where: { aiResultId: resultId },
        orderBy: { createdAt: 'asc' },
        take: 40,
      }),
      fetchUpstreamSession(result),
    ]);
    const requestId = crypto.randomUUID();
    const media = collectConversationImages(result, upstreamMessages);
    const newAttachmentInputs = attachments
      .map(imageInputFromAttachment)
      .filter(Boolean);
    if (newAttachmentInputs.length !== attachments.length) {
      const error = new Error('invalid_attachments');
      error.status = 400;
      throw error;
    }
    const priorAttachmentInputs = await storedAttachmentInputs(history);
    const imageInputs = [
      ...newAttachmentInputs,
      ...priorAttachmentInputs,
      ...imageInputsFromMedia(media),
    ].slice(0, 3);
    const contextMedia = [
      ...media,
      ...attachments.map((attachment) => ({
        type: 'supplemental',
        description: attachment.originalname || 'Gambar klinis tambahan',
      })),
    ];
    const context = buildClinicalContext({
      patient: patient || {},
      result,
      history,
      media: contextMedia,
    });
    if (!apiKey) throw upstreamError(503);

    const storedAttachments = await persistAttachments({
      attachments,
      resultId,
      dentistId,
      requestId,
    });
    let response;
    let payload;
    try {
      response = await fetchImpl(new URL('/api/v1/chat', `${baseUrl.replace(/\/$/, '')}/`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
        body: JSON.stringify({
          message: content,
          role: 'dentist',
          language: 'id',
          session_id: result.sessionId || undefined,
          context,
          images: imageInputs.length ? imageInputs : undefined,
        }),
      });
      payload = await response.json().catch(() => ({}));
      if (!response.ok) throw upstreamError(response.status);
    } catch (error) {
      await archiveAttachments(storedAttachments);
      throw error;
    }
    const answer = sanitizeMessage(payload.reply || payload.content || payload.message);
    if (!answer) {
      await archiveAttachments(storedAttachments);
      throw upstreamError(502);
    }
    const sessionId = payload.session_id || payload.sessionId || result.sessionId || null;

    let created;
    try {
      created = await prisma.$transaction(async (tx) => {
        const common = {
          request_id: requestId,
          idempotency_key: String(idempotencyKey),
          ai_result_id: resultId.toString(),
          session_id: sessionId,
        };
        const dentistMessage = await tx.aIChatMessage.create({
          data: {
            aiResultId: resultId,
            userId: dentistId,
            role: 'dentist',
            content,
            metadata: {
              ...common,
              actor_type: 'dentist',
              actor_id: dentistId.toString(),
              actor_name: dentist?.name || 'Dokter Gigi',
              attachments: storedAttachments.map(({ signed_url: _signedUrl, ...attachment }) => attachment),
            },
          },
          include: { user: { select: { id: true, name: true, avatar_url: true } } },
        });
        const assistantMessage = await tx.aIChatMessage.create({
          data: {
            aiResultId: resultId,
            userId: dentistId,
            role: 'assistant',
            content: answer,
            metadata: {
              ...common,
              actor_type: 'assistant',
              actor_id: 'serene-ai',
              actor_name: 'Serene AI',
            },
          },
          include: { user: { select: { id: true, name: true, avatar_url: true } } },
        });
        if (sessionId && sessionId !== result.sessionId) {
          await tx.aIAnalysisResult.update({ where: { id: resultId }, data: { sessionId } });
        }
        return [dentistMessage, assistantMessage];
      });
    } catch (error) {
      await archiveAttachments(storedAttachments);
      throw error;
    }

    const serializedMessages = created.map(serializeMessage);
    if (storedAttachments.length) {
      serializedMessages[0].attachments = storedAttachments.map((attachment) => ({
        url: attachment.signed_url,
        type: attachment.type,
        name: attachment.file_name,
        mimeType: attachment.mime_type,
        sizeBytes: attachment.size_bytes,
      }));
    }
    return {
      duplicate: false,
      requestId,
      session: { linked: Boolean(sessionId) },
      messages: serializedMessages,
    };
  }

  return { chat, getConversation, listMessages };
}

export {
  CLINICAL_SYSTEM_PROMPT,
  MAX_CHAT_ATTACHMENTS,
  MAX_CHAT_ATTACHMENT_BYTES,
  MAX_MESSAGE_LENGTH,
  collectConversationImages,
  imageInputsFromMedia,
  imageInputFromAttachment,
  mergeConversationMessages,
  normalizeUpstreamMessage,
  sanitizeMessage,
  serializeMessage,
};
