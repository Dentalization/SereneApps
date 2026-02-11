/**
 * Dentist Portal Routes
 * CLEANED VERSION (No Duplicates)
 */

import express from 'express';
import { authenticateToken, requireRoles } from '../utils/tokens.js';
import { PrismaClient } from '../generated/prisma/index.js';
import { recordStatusChange } from '../services/appointments/audit.js';

const router = express.Router();
const prisma = new PrismaClient();

// --- Helper Functions ---

function sendError(res, status, code, message, extras = {}) {
  return res.status(status).json({ error: { code, message, ...extras } });
}

function toBigInt(value, fieldName) {
  try {
    return BigInt(value);
  } catch (err) {
    throw new Error(`INVALID_${fieldName?.toUpperCase() || 'ID'}`);
  }
}

function serializeScheduleEntry(entry) {
  if (!entry) return null;
  return {
    id: entry.id?.toString(),
    type: entry.type,
    status: entry.status,
    startAt: entry.startAt?.toISOString(),
    endAt: entry.endAt?.toISOString(),
    patientName: entry.patientName,
    patientPhone: entry.patientPhone,
    notes: entry.notes,
    metadata: entry.metadata || {},
    createdAt: entry.createdAt?.toISOString(),
    updatedAt: entry.updatedAt?.toISOString()
  };
}

function serializePatient(user, appointments = [], aiResults = []) {
  const now = new Date();
  const pastAppointments = appointments.filter(a => new Date(a.startsAt) < now);
  const futureAppointments = appointments.filter(a => new Date(a.startsAt) >= now);
  const lastVisit = pastAppointments.length > 0 ? pastAppointments.sort((a, b) => new Date(b.startsAt) - new Date(a.startsAt))[0] : null;
  const nextAppointment = futureAppointments.length > 0 ? futureAppointments.sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt))[0] : null;

  let status = 'inactive';
  if (futureAppointments.length > 0) status = 'active';
  else if (pastAppointments.length > 0) status = 'completed';
  if (aiResults.some(r => r.riskLevel === 'high')) status = 'needs_attention';

  return {
    id: user.id.toString(),
    name: user.name || 'Unknown',
    email: user.email || null,
    phone: user.phone_number || null,
    avatar: user.avatar_url || null,
    status,
    lastVisit: lastVisit ? new Date(lastVisit.startsAt).toISOString() : null,
    nextAppointment: nextAppointment ? new Date(nextAppointment.startsAt).toISOString() : null,
    appointmentCount: appointments.length,
    aiResults: aiResults.map(result => ({
      id: result.id.toString(),
      sessionId: result.sessionId,
      imageUrl: result.imageUrl,
      annotatedImageUrl: result.annotatedImageUrl,
      findings: result.findings,
      summary: result.summary,
      overallAssessment: result.overallAssessment,
      riskLevel: result.riskLevel,
      confidenceScore: result.confidenceScore,
      detections: result.detections || [],
      recommendations: result.recommendations || [],
      createdAt: result.createdAt?.toISOString() || null
    }))
  };
}

// --- Routes ---

// GET /v1/dentist-portal/patients
router.get(
  '/patients',
  authenticateToken,
  requireRoles(['dentist']),
  async (req, res) => {
    try {
      const dentistId = toBigInt(req.user.id, 'dentistId');
      const { search, status, sortBy = 'lastVisit', sortOrder = 'desc', limit = 50, offset = 0 } = req.query;

      const appointments = await prisma.appointment.findMany({
        where: { dentistId },
        include: {
          patient: {
            select: {
              id: true,
              name: true,
              email: true,
              phone_number: true,
              avatar_url: true
            }
          }
        },
        orderBy: { startsAt: 'desc' }
      });

      // --- AUTO-MARK OVERDUE across all fetched appointments ---
      const now = new Date();
      const overdueCandiates = appointments.filter(a =>
        ['scheduled', 'confirmed'].includes(a.status) && new Date(a.startsAt) < now
      );
      for (const apt of overdueCandiates) {
        try {
          const hasPaid = await prisma.paymentIntent.findFirst({
            where: { appointmentId: apt.id, status: 'succeeded' },
            select: { id: true }
          });
          if (!hasPaid) {
            await prisma.$transaction(async (tx) => {
              await tx.appointment.update({ where: { id: apt.id }, data: { status: 'overdue' } });
              await recordStatusChange(tx, {
                appointmentId: apt.id,
                previousStatus: apt.status,
                newStatus: 'overdue',
                changedBy: null,
                changedByRole: 'system',
                reason: 'Auto-marked overdue: past scheduled time with no successful payment',
                metadata: { trigger: 'dentist_portal_patients_list' }
              });
            });
            apt.status = 'overdue';
          }
        } catch (err) {
          console.error(`[DentistPortal] ⚠️ Failed to mark appointment ${apt.id} as overdue:`, err.message);
        }
      }

      const patientMap = new Map();
      for (const appointment of appointments) {
        if (!appointment.patient) continue;
        const patientIdStr = appointment.patient.id.toString();
        if (!patientMap.has(patientIdStr)) {
          patientMap.set(patientIdStr, { user: appointment.patient, appointments: [] });
        }
        patientMap.get(patientIdStr).appointments.push(appointment);
      }

      const patientIds = Array.from(patientMap.keys()).map(id => BigInt(id));
      const aiResults = patientIds.length
        ? await prisma.aIAnalysisResult.findMany({ where: { userId: { in: patientIds } }, orderBy: { createdAt: 'desc' } })
        : [];

      const aiResultsByUser = new Map();
      for (const result of aiResults) {
        const uid = result.userId.toString();
        if (!aiResultsByUser.has(uid)) aiResultsByUser.set(uid, []);
        aiResultsByUser.get(uid).push(result);
      }

      let patients = Array.from(patientMap.values()).map(({ user, appointments }) => {
        const patientAi = aiResultsByUser.get(user.id.toString()) || [];
        return serializePatient(user, appointments, patientAi);
      });

      if (search) {
        const q = search.toLowerCase();
        patients = patients.filter(p =>
          (p.name && p.name.toLowerCase().includes(q)) ||
          (p.email && p.email.toLowerCase().includes(q)) ||
          (p.phone && p.phone.includes(search))
        );
      }

      if (status) {
        patients = patients.filter(p => p.status === status);
      }

      patients.sort((a, b) => {
        let aVal;
        let bVal;
        switch (sortBy) {
          case 'name':
            aVal = a.name || '';
            bVal = b.name || '';
            break;
          case 'nextAppointment':
            aVal = a.nextAppointment ? new Date(a.nextAppointment) : new Date(0);
            bVal = b.nextAppointment ? new Date(b.nextAppointment) : new Date(0);
            break;
          case 'lastVisit':
          default:
            aVal = a.lastVisit ? new Date(a.lastVisit) : new Date(0);
            bVal = b.lastVisit ? new Date(b.lastVisit) : new Date(0);
        }
        return sortOrder === 'asc' ? (aVal > bVal ? 1 : aVal < bVal ? -1 : 0) : (aVal < bVal ? 1 : aVal > bVal ? -1 : 0);
      });

      const summary = {
        total: patients.length,
        byStatus: patients.reduce((acc, p) => {
          acc[p.status] = (acc[p.status] || 0) + 1;
          return acc;
        }, {}),
        withAiResults: patients.filter(p => p.aiResults.length > 0).length
      };

      const paginatedPatients = patients.slice(parseInt(offset, 10), parseInt(offset, 10) + parseInt(limit, 10));

      return res.json({
        patients: paginatedPatients,
        summary,
        pagination: {
          total: patients.length,
          limit: parseInt(limit, 10),
          offset: parseInt(offset, 10),
          hasMore: parseInt(offset, 10) + parseInt(limit, 10) < patients.length
        }
      });
    } catch (error) {
      console.error('Error fetching dentist patients:', error);
      return sendError(res, 500, 'fetch_patients_failed', 'Gagal memuat daftar pasien.');
    }
  }
);

// GET /v1/dentist-portal/patients/:patientId
router.get(
  '/patients/:patientId',
  authenticateToken,
  requireRoles(['dentist']),
  async (req, res) => {
    try {
      const dentistId = toBigInt(req.user.id, 'dentistId');
      const patientId = toBigInt(req.params.patientId, 'patientId');

      const appointments = await prisma.appointment.findMany({
        where: { dentistId, patientId },
        include: {
          patient: {
            select: { id: true, name: true, email: true, phone_number: true, avatar_url: true }
          }
        },
        orderBy: { startsAt: 'desc' }
      });

      if (appointments.length === 0) {
        return sendError(res, 404, 'patient_not_found', 'Pasien tidak ditemukan atau belum pernah membuat janji dengan Anda.');
      }

      const patient = appointments[0].patient;

      // --- AUTO-MARK OVERDUE for this patient's appointments ---
      const now = new Date();
      const overdueCandiates = appointments.filter(a =>
        ['scheduled', 'confirmed'].includes(a.status) && new Date(a.startsAt) < now
      );
      if (overdueCandiates.length > 0) {
        // Check which have no successful payment
        for (const apt of overdueCandiates) {
          try {
            const hasPaid = await prisma.paymentIntent.findFirst({
              where: { appointmentId: apt.id, status: 'succeeded' },
              select: { id: true }
            });
            if (!hasPaid) {
              await prisma.$transaction(async (tx) => {
                await tx.appointment.update({
                  where: { id: apt.id },
                  data: { status: 'overdue' }
                });
                await recordStatusChange(tx, {
                  appointmentId: apt.id,
                  previousStatus: apt.status,
                  newStatus: 'overdue',
                  changedBy: null,
                  changedByRole: 'system',
                  reason: 'Auto-marked overdue: past scheduled time with no successful payment',
                  notes: null,
                  metadata: { trigger: 'dentist_portal_view' }
                });
              });
              apt.status = 'overdue'; // Reflect in-memory for serialization
            }
          } catch (err) {
            console.error(`[DentistPortal] ⚠️ Failed to mark appointment ${apt.id} as overdue:`, err.message);
          }
        }
      }

      const aiResults = await prisma.aIAnalysisResult.findMany({
        where: { userId: patientId },
        orderBy: { createdAt: 'desc' },
        take: 10
      });

      const patientProfile = await prisma.patientProfile.findUnique({ where: { userId: patientId } });

      const serializedPatient = serializePatient(patient, appointments, aiResults);
      serializedPatient.appointments = appointments.map(a => ({
        id: a.id.toString(),
        startsAt: a.startsAt?.toISOString(),
        endsAt: a.endsAt?.toISOString(),
        date: a.startsAt?.toISOString().split('T')[0], // For patient portal compatibility
        status: a.status,
        rawStatus: a.status,
        consultation_type: a.consultation_type || 'onsite',
        type: a.consultation_type || 'onsite',
        channel: a.consultation_type === 'virtual' ? 'tele' : 'clinic',
        reason: a.reason,
        notes: a.notes,
        metadata: a.metadata || {}
      }));

      if (patientProfile) {
        serializedPatient.dateOfBirth = patientProfile.dateOfBirth?.toISOString().split('T')[0] || null;
        serializedPatient.gender = patientProfile.gender;
        serializedPatient.insurance = patientProfile.insuranceProvider
          ? {
            provider: patientProfile.insuranceProvider,
            number: patientProfile.insuranceNumber,
            memberId: patientProfile.insuranceMemberId
          }
          : null;
        serializedPatient.emergencyContact = patientProfile.emergencyContact;
        serializedPatient.medicalDetails = patientProfile.medicalDetails;
      }

      return res.json({ patient: serializedPatient });
    } catch (error) {
      console.error('Error fetching patient details:', error);
      return sendError(res, 500, 'fetch_patient_failed', 'Gagal memuat detail pasien.');
    }
  }
);

// GET /v1/dentist-portal/schedule
router.get(
  '/schedule',
  authenticateToken,
  requireRoles(['dentist']),
  async (req, res) => {
    try {
      const dentistId = toBigInt(req.user.id, 'dentistId');
      const from = req.query.from ? new Date(req.query.from) : new Date();
      const to = req.query.to ? new Date(req.query.to) : new Date(Date.now() + 30 * 86400000);
      if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
        return sendError(res, 400, 'invalid_date', 'Format tanggal tidak valid.');
      }

      const entries = await prisma.dentistScheduleEntry.findMany({
        where: {
          dentistId,
          startAt: {
            gte: from,
            lt: to
          }
        },
        orderBy: { startAt: 'asc' }
      });

      return res.json({ entries: entries.map(serializeScheduleEntry) });
    } catch (error) {
      console.error('Error fetching schedule entries:', error);
      return sendError(res, 500, 'schedule_fetch_failed', 'Gagal memuat jadwal.');
    }
  }
);

// POST /v1/dentist-portal/schedule
router.post(
  '/schedule',
  authenticateToken,
  requireRoles(['dentist']),
  async (req, res) => {
    try {
      const dentistId = toBigInt(req.user.id, 'dentistId');
      const { type, status, start, end, notes, metadata, patientName, patientPhone } = req.body || {};

      if (!type || !start || !end) {
        return sendError(res, 400, 'missing_data', 'Tipe dan rentang waktu wajib diisi.');
      }

      const startAt = new Date(start);
      const endAt = new Date(end);
      if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
        return sendError(res, 400, 'invalid_time', 'Waktu mulai atau selesai tidak valid.');
      }

      let parsedMetadata = metadata;
      if (typeof metadata === 'string') {
        try {
          parsedMetadata = JSON.parse(metadata);
        } catch (err) {
          parsedMetadata = {};
        }
      }

      const entry = await prisma.dentistScheduleEntry.create({
        data: {
          dentistId,
          type,
          status: status || (type === 'hold_slot' ? 'hold' : 'blocked'),
          startAt,
          endAt,
          notes: notes || null,
          patientName: patientName || null,
          patientPhone: patientPhone || null,
          metadata: parsedMetadata || {}
        }
      });

      return res.json({ entry: serializeScheduleEntry(entry) });
    } catch (error) {
      console.error('Error creating schedule entry:', error);
      return sendError(res, 500, 'schedule_create_failed', 'Gagal menyimpan jadwal.');
    }
  }
);

// GET /v1/dentist-portal/patients/:patientId/ai-results
router.get(
  '/patients/:patientId/ai-results',
  authenticateToken,
  requireRoles(['dentist']),
  async (req, res) => {
    try {
      const dentistId = toBigInt(req.user.id, 'dentistId');
      const patientId = toBigInt(req.params.patientId, 'patientId');

      const hasAppointment = await prisma.appointment.findFirst({
        where: { dentistId, patientId },
        select: { id: true }
      });

      if (!hasAppointment) {
        return sendError(res, 403, 'forbidden', 'Anda tidak memiliki akses ke data pasien ini.');
      }

      const aiResults = await prisma.aIAnalysisResult.findMany({
        where: { userId: patientId },
        orderBy: { createdAt: 'desc' }
      });
      console.log(`[Dentist] Fetched ${aiResults.length} AI results for patient ${patientId}`);

      return res.json({
        aiResults: aiResults.map(result => ({
          id: result.id.toString(),
          sessionId: result.sessionId,
          imageUrl: result.imageUrl,
          annotatedImageUrl: result.annotatedImageUrl,
          findings: result.findings,
          summary: result.summary,
          overallAssessment: result.overallAssessment,
          riskLevel: result.riskLevel,
          confidenceScore: result.confidenceScore,
          detections: result.detections || [],
          recommendations: result.recommendations || [],
          createdAt: result.createdAt?.toISOString() || null
        })),
        total: aiResults.length
      });
    } catch (error) {
      console.error('Error fetching patient AI results:', error);
      return sendError(res, 500, 'fetch_ai_results_failed', 'Gagal memuat hasil AI diagnosis pasien.');
    }
  }
);

// POST /v1/dentist-portal/patients/:patientId/ai-results/:resultId/session
router.post(
  '/patients/:patientId/ai-results/:resultId/session',
  authenticateToken,
  requireRoles(['dentist']),
  async (req, res) => {
    try {
      const dentistId = toBigInt(req.user.id, 'dentistId');
      const patientId = toBigInt(req.params.patientId, 'patientId');
      const resultId = toBigInt(req.params.resultId, 'resultId');

      const { sessionId } = req.body || {};
      if (!sessionId) {
        return sendError(res, 400, 'session_id_required', 'Session ID wajib diisi.');
      }

      // Verify dentist has access to this patient
      const hasAppointment = await prisma.appointment.findFirst({
        where: { dentistId, patientId },
        select: { id: true }
      });

      if (!hasAppointment) {
        return sendError(res, 403, 'forbidden', 'Anda tidak memiliki akses ke data pasien ini.');
      }

      const existing = await prisma.aIAnalysisResult.findFirst({ where: { id: resultId, userId: patientId } });
      if (!existing) {
        return sendError(res, 404, 'not_found', 'AI analysis result tidak ditemukan.');
      }

      await prisma.aIAnalysisResult.update({
        where: { id: resultId },
        data: { sessionId }
      });

      return res.json({ message: 'Session ID tersimpan', sessionId });
    } catch (error) {
      console.error('Error persisting AI sessionId:', error);
      return sendError(res, 500, 'save_failed', 'Gagal menyimpan sessionId.');
    }
  }
);

// GET /v1/dentist-portal/patients/:patientId/ai-results/poll?waitMs=1000
// Polling endpoint for eventual consistency - waits for AI results to appear
router.get(
  '/patients/:patientId/ai-results/poll',
  authenticateToken,
  requireRoles(['dentist']),
  async (req, res) => {
    try {
      const dentistId = toBigInt(req.user.id, 'dentistId');
      const patientId = toBigInt(req.params.patientId, 'patientId');
      const waitMs = parseInt(req.query.waitMs || '1000', 10);
      const maxWait = Math.min(waitMs, 3000); // Cap at 3s

      const hasAppointment = await prisma.appointment.findFirst({
        where: { dentistId, patientId },
        select: { id: true }
      });

      if (!hasAppointment) {
        return sendError(res, 403, 'forbidden', 'Anda tidak memiliki akses ke data pasien ini.');
      }

      // Retry up to maxWait ms with 200ms intervals
      let aiResults = [];
      const startTime = Date.now();
      const interval = 200;

      while (Date.now() - startTime < maxWait) {
        aiResults = await prisma.aIAnalysisResult.findMany({
          where: { userId: patientId },
          orderBy: { createdAt: 'desc' }
        });

        if (aiResults.length > 0) break;
        await new Promise(resolve => setTimeout(resolve, interval));
      }

      const elapsed = Date.now() - startTime;
      console.log(`[Dentist Poll] Found ${aiResults.length} results for patient ${patientId} after ${elapsed}ms`);

      return res.json({
        aiResults: aiResults.map(result => ({
          id: result.id.toString(),
          sessionId: result.sessionId,
          imageUrl: result.imageUrl,
          annotatedImageUrl: result.annotatedImageUrl,
          findings: result.findings,
          summary: result.summary,
          overallAssessment: result.overallAssessment,
          riskLevel: result.riskLevel,
          confidenceScore: result.confidenceScore,
          detections: result.detections || [],
          recommendations: result.recommendations || [],
          createdAt: result.createdAt?.toISOString() || null
        })),
        total: aiResults.length,
        polled: elapsed
      });
    } catch (error) {
      console.error('Error polling patient AI results:', error);
      return sendError(res, 500, 'poll_failed', 'Gagal polling hasil AI diagnosis pasien.');
    }
  }
);

// ============================================================================
// AI CHAT MESSAGE PERSISTENCE ENDPOINTS
// ============================================================================

// GET /v1/dentist-portal/patients/:patientId/ai-results/:resultId/messages
// Retrieve AI chat message history for a specific AI result
router.get(
  '/patients/:patientId/ai-results/:resultId/messages',
  authenticateToken,
  requireRoles(['dentist']),
  async (req, res) => {
    try {
      const dentistId = toBigInt(req.user.id, 'dentistId');
      const patientId = toBigInt(req.params.patientId, 'patientId');
      const resultId = toBigInt(req.params.resultId, 'resultId');
      const limit = parseInt(req.query.limit || '100', 10);

      // Verify dentist has access to this patient
      const hasAppointment = await prisma.appointment.findFirst({
        where: { dentistId, patientId },
        select: { id: true }
      });

      if (!hasAppointment) {
        return sendError(res, 403, 'forbidden', 'Anda tidak memiliki akses ke data pasien ini.');
      }

      // Verify AI result belongs to patient
      const aiResult = await prisma.aIAnalysisResult.findFirst({
        where: { id: resultId, userId: patientId },
        select: { id: true }
      });

      if (!aiResult) {
        return sendError(res, 404, 'not_found', 'AI analysis result tidak ditemukan.');
      }

      // Fetch chat messages
      const messages = await prisma.aIChatMessage.findMany({
        where: { aiResultId: resultId },
        orderBy: { createdAt: 'asc' },
        take: limit,
        select: {
          id: true,
          role: true,
          content: true,
          metadata: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              name: true,
              avatar_url: true
            }
          }
        }
      });

      console.log(`[AI Chat] Fetched ${messages.length} messages for AI result ${resultId}`);

      return res.json({
        messages: messages.map(msg => ({
          id: msg.id.toString(),
          role: msg.role,
          content: msg.content,
          metadata: msg.metadata || {},
          createdAt: msg.createdAt.toISOString(),
          user: {
            id: msg.user.id.toString(),
            name: msg.user.name,
            avatar: msg.user.avatar_url
          }
        })),
        total: messages.length
      });
    } catch (error) {
      console.error('Error fetching AI chat messages:', error);
      return sendError(res, 500, 'fetch_failed', 'Gagal memuat riwayat chat AI.');
    }
  }
);

// POST /v1/dentist-portal/patients/:patientId/ai-results/:resultId/messages
// Save a new AI chat message
router.post(
  '/patients/:patientId/ai-results/:resultId/messages',
  authenticateToken,
  requireRoles(['dentist']),
  async (req, res) => {
    try {
      const dentistId = toBigInt(req.user.id, 'dentistId');
      const patientId = toBigInt(req.params.patientId, 'patientId');
      const resultId = toBigInt(req.params.resultId, 'resultId');

      const { role, content, metadata } = req.body || {};

      // Validation
      if (!role || !content) {
        return sendError(res, 400, 'invalid_input', 'Role dan content wajib diisi.');
      }

      if (!['user', 'ai', 'dentist'].includes(role)) {
        return sendError(res, 400, 'invalid_role', 'Role harus salah satu dari: user, ai, dentist.');
      }

      if (typeof content !== 'string' || content.trim().length === 0) {
        return sendError(res, 400, 'invalid_content', 'Content tidak boleh kosong.');
      }

      // Verify dentist has access to this patient
      const hasAppointment = await prisma.appointment.findFirst({
        where: { dentistId, patientId },
        select: { id: true }
      });

      if (!hasAppointment) {
        return sendError(res, 403, 'forbidden', 'Anda tidak memiliki akses ke data pasien ini.');
      }

      // Verify AI result belongs to patient
      const aiResult = await prisma.aIAnalysisResult.findFirst({
        where: { id: resultId, userId: patientId },
        select: { id: true }
      });

      if (!aiResult) {
        return sendError(res, 404, 'not_found', 'AI analysis result tidak ditemukan.');
      }

      // Check for duplicate message (within last 5 seconds)
      const fiveSecondsAgo = new Date(Date.now() - 5000);
      const recentDuplicate = await prisma.aIChatMessage.findFirst({
        where: {
          aiResultId: resultId,
          userId: dentistId,
          role,
          content: content.trim(),
          createdAt: { gte: fiveSecondsAgo }
        }
      });

      if (recentDuplicate) {
        console.log(`[AI Chat] Duplicate message detected, returning existing message ID ${recentDuplicate.id}`);
        return res.status(200).json({
          message: 'Duplicate message ignored',
          isDuplicate: true
        });
      }

      // Save message
      const message = await prisma.aIChatMessage.create({
        data: {
          aiResultId: resultId,
          userId: dentistId,
          role,
          content: content.trim(),
          metadata: metadata || {}
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatar_url: true
            }
          }
        }
      });

      console.log(`[AI Chat] Saved message ID ${message.id} for AI result ${resultId}, role: ${role}`);

      return res.status(201).json({
        message: {
          id: message.id.toString(),
          role: message.role,
          content: message.content,
          metadata: message.metadata || {},
          createdAt: message.createdAt.toISOString(),
          user: {
            id: message.user.id.toString(),
            name: message.user.name,
            avatar: message.user.avatar_url
          }
        }
      });
    } catch (error) {
      console.error('Error saving AI chat message:', error);
      return sendError(res, 500, 'save_failed', 'Gagal menyimpan pesan chat AI.');
    }
  }
);

export default router;