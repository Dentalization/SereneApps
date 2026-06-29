import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CLINICAL_SYSTEM_PROMPT,
  MAX_MESSAGE_LENGTH,
  collectConversationImages,
  createDentistAIChatService,
  imageInputsFromMedia,
  imageInputFromAttachment,
  mergeConversationMessages,
  normalizeUpstreamMessage,
  sanitizeMessage,
  serializeMessage,
} from '../src/services/dentistAIChatService.js';

test('clinical dentist prompt preserves uncertainty and dentist accountability', () => {
  assert.match(CLINICAL_SYSTEM_PROMPT, /Never present AI output as a definitive diagnosis/);
  assert.match(CLINICAL_SYSTEM_PROMPT, /Do not invent/);
  assert.match(CLINICAL_SYSTEM_PROMPT, /final decision remains with the dentist/);
});

test('dentist chat input removes control characters and enforces a bounded size', () => {
  assert.equal(sanitizeMessage('  evaluasi\u0000 karies  '), 'evaluasi karies');
  assert.equal(MAX_MESSAGE_LENGTH, 4000);
});

test('message serialization exposes provenance without internal clinical context', () => {
  const serialized = serializeMessage({
    id: 10n,
    userId: 20n,
    role: 'assistant',
    content: 'Perlu korelasi klinis.',
    createdAt: new Date('2026-06-28T00:00:00.000Z'),
    metadata: {
      actor_type: 'assistant',
      actor_id: 'serene-ai',
      actor_name: 'Serene AI',
      request_id: 'request-1',
      internal_context: 'must-not-be-returned',
    },
  });

  assert.equal(serialized.actorType, 'assistant');
  assert.equal(serialized.actorName, 'Serene AI');
  assert.equal(serialized.requestId, 'request-1');
  assert.equal('metadata' in serialized, false);
});

test('DeepDental patient messages retain role provenance and hide embedded client context', () => {
  const message = normalizeUpstreamMessage({
    id: 'msg-1',
    role: 'user',
    content: '[KONTEKS: hasil sebelumnya]\n[END KONTEKS]\n\nPertanyaan user: Apakah gigi ini perlu segera dirawat?',
    created_at: '2026-06-28T00:00:00.000Z',
  });

  assert.equal(message.role, 'patient');
  assert.equal(message.actorName, 'Pasien');
  assert.equal(message.content, 'Apakah gigi ini perlu segera dirawat?');
});

test('conversation media includes stored and upstream annotated images for reuse', () => {
  const images = collectConversationImages(
    {
      imageUrl: 'data:image/jpeg;base64,b3JpZ2luYWw=',
      annotatedImageUrl: null,
    },
    [{
      images: [],
      visual_findings: { annotated_image_base64: 'YW5ub3RhdGVk' },
    }],
  );

  assert.deepEqual(images.map((image) => image.type), ['original', 'annotated']);
  assert.equal(images[1].url, 'data:image/jpeg;base64,YW5ub3RhdGVk');
  assert.deepEqual(imageInputsFromMedia(images).map((image) => image.filename), ['original-1.jpg']);
});

test('mobile conversation merges upstream patient history with persisted dentist messages', async () => {
  const result = {
    id: 10n,
    userId: 20n,
    sessionId: 'sess-mobile',
    findings: 'Kemungkinan karies.',
    createdAt: new Date('2026-06-28T00:00:00.000Z'),
  };
  const prisma = {
    appointment: { findFirst: async () => ({ id: 1n }) },
    aIAnalysisResult: { findFirst: async () => result },
    aIChatMessage: {
      findMany: async () => [{
        id: 30n,
        userId: 40n,
        role: 'dentist',
        content: 'Perlu pemeriksaan perkusi?',
        metadata: { actor_name: 'drg. Sari' },
        createdAt: new Date('2026-06-28T00:02:00.000Z'),
        user: { id: 40n, name: 'drg. Sari' },
      }],
    },
  };
  const service = createDentistAIChatService({
    prisma,
    apiKey: 'server-secret',
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({
        messages: [{
          id: 'upstream-1',
          role: 'user',
          content: 'Gigi saya terasa sakit.',
          created_at: '2026-06-28T00:01:00.000Z',
          visual_findings: { annotated_image_base64: 'YW5ub3RhdGVk' },
        }],
      }),
    }),
  });

  const conversation = await service.getConversation({
    dentistId: 40n,
    patientId: 20n,
    resultId: 10n,
  });

  assert.deepEqual(conversation.messages.map((message) => message.role), ['assistant', 'patient', 'dentist']);
  assert.equal(conversation.context.imageContextAvailable, true);
  assert.equal(conversation.context.images[0].type, 'annotated');
});

test('persisted dentist exchange is not duplicated by the same DeepDental session messages', () => {
  const createdAt = new Date('2026-06-28T00:00:00.000Z');
  const messages = mergeConversationMessages(
    [
      { id: 'up-1', role: 'user', content: 'Perlu pemeriksaan perkusi?', created_at: createdAt.toISOString() },
      { id: 'up-2', role: 'assistant', content: 'Ya, korelasikan secara klinis.', created_at: createdAt.toISOString() },
    ],
    [
      {
        id: 1n,
        userId: 40n,
        role: 'dentist',
        content: 'Perlu pemeriksaan perkusi?',
        metadata: { actor_name: 'drg. Sari' },
        createdAt,
        user: { id: 40n, name: 'drg. Sari' },
      },
      {
        id: 2n,
        userId: 40n,
        role: 'assistant',
        content: 'Ya, korelasikan secara klinis.',
        metadata: { actor_name: 'Serene AI' },
        createdAt,
        user: { id: 40n, name: 'drg. Sari' },
      },
    ],
  );

  assert.equal(messages.length, 2);
  assert.deepEqual(messages.map((message) => message.role), ['dentist', 'assistant']);
});

test('clinical chat attachments are bounded and encoded for server-side AI requests', () => {
  const valid = imageInputFromAttachment({
    buffer: Buffer.from('synthetic-image'),
    mimetype: 'image/png',
    originalname: 'periapical.png',
  });
  const oversized = imageInputFromAttachment({
    buffer: Buffer.alloc(8 * 1024 * 1024 + 1),
    mimetype: 'image/png',
    originalname: 'oversized.png',
  });

  assert.equal(valid.filename, 'periapical.png');
  assert.equal(valid.data, Buffer.from('synthetic-image').toString('base64'));
  assert.equal(oversized, null);
});

test('dentist attachment is stored, sent to DeepDental, and returned with provenance', async () => {
  const result = {
    id: 10n,
    userId: 20n,
    sessionId: 'sess-mobile',
    imageUrl: 'data:image/jpeg;base64,b3JpZ2luYWw=',
    detections: [],
    recommendations: [],
  };
  let createdId = 100n;
  let chatRequestBody = null;
  const prisma = {
    appointment: { findFirst: async () => ({ id: 1n }) },
    aIAnalysisResult: {
      findFirst: async () => result,
      update: async () => result,
    },
    aIChatMessage: {
      findFirst: async () => null,
      findMany: async () => [],
    },
    user: {
      findUnique: async ({ where }) => ({
        id: where.id,
        name: where.id === 40n ? 'drg. Sari' : 'Pasien',
        patientProfile: null,
      }),
    },
    $transaction: async (handler) => handler({
      aIChatMessage: {
        create: async ({ data }) => ({
          id: createdId++,
          ...data,
          createdAt: new Date('2026-06-28T00:00:00.000Z'),
          user: { id: data.userId, name: 'drg. Sari' },
        }),
      },
      aIAnalysisResult: { update: async () => result },
    }),
  };
  const storage = {
    putOriginalImage: async () => ({
      storageRef: 'local://ai-result-10/original/periapical.png',
      signedUrl: '/v1/case-storage/signed-image',
      sizeBytes: 15,
    }),
    archiveObject: async () => true,
    getObjectBuffer: async () => Buffer.from('synthetic-image'),
    getSignedUrl: async () => '/v1/case-storage/signed-image',
  };
  const service = createDentistAIChatService({
    prisma,
    storage,
    apiKey: 'server-secret',
    fetchImpl: async (_url, options = {}) => {
      if (options.method !== 'POST') {
        return { ok: true, json: async () => ({ messages: [] }) };
      }
      chatRequestBody = JSON.parse(options.body);
      return {
        ok: true,
        json: async () => ({
          session_id: 'sess-mobile',
          content: 'Radiografi tambahan perlu dikorelasikan secara klinis.',
        }),
      };
    },
  });

  const response = await service.chat({
    dentistId: 40n,
    patientId: 20n,
    resultId: 10n,
    message: 'Evaluasi radiografi periapikal ini.',
    idempotencyKey: 'attachment-request-1',
    attachments: [{
      buffer: Buffer.from('synthetic-image'),
      mimetype: 'image/png',
      originalname: 'periapical.png',
    }],
  });

  assert.equal(chatRequestBody.role, 'dentist');
  assert.equal(chatRequestBody.images[0].filename, 'periapical.png');
  assert.equal(response.messages[0].attachments[0].url, '/v1/case-storage/signed-image');
  assert.equal(response.messages[0].actorName, 'drg. Sari');
});
