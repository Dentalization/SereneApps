import express from 'express';
import { authenticateToken, requireRoles } from '../utils/tokens.js';
import { PrismaClient } from '@prisma/client';
import { FINANCIAL_OWNER_TYPES } from '../services/payments/ownership.js';
import { appointmentConfig, millisecondsFromHours } from '../services/appointments/config.js';
import { recordStatusChange } from '../services/appointments/audit.js';
import { emitAppointmentEvent } from '../services/communications.js';
import { emitPortalInvalidation } from '../services/portalCollaboration.js';
import { resolveDentistClinicContext } from '../services/dentistClinicContextService.js';
import videoRouter from './communications/video.js';
import clinicalSummaryRouter from './appointments/clinicalSummary.js';

const router = express.Router();
const prisma = new PrismaClient({
  log: ['query', 'error', 'warn']
});

// Verify database connection on startup
prisma.$connect().then(() => {
  console.log('✅ [Appointments Router] Prisma connected to database');
}).catch((error) => {
  console.error('❌ [Appointments Router] Prisma connection error:', error);
});

const DEFAULT_TIMEZONE = 'Asia/Jakarta';
const DEFAULT_TZ_OFFSET = '+07:00';
const DEFAULT_SLOT_MINUTES = 30;
const ACTIVE_APPOINTMENT_STATUSES = ['scheduled', 'confirmed'];
const PATIENT_MANAGEABLE_STATUSES = ['scheduled', 'confirmed'];
const STATUS_TRANSITION_ROLES = {
  patient: 'patient',
  dentist: 'dentist',
  staff: 'clinic_staff',
  system: 'system'
};

function sendError(res, status, code, message, extras = {}) {
  return res.status(status).json({
    error: {
      code,
      message,
      ...extras
    }
  });
}

/**
 * Send only a PHI-free invalidation signal. Authorized clients refetch the
 * appointment through their tenant-scoped endpoint instead of trusting socket
 * payload data.
 */
function emitAppointmentRealtimeUpdate(req, appointment, eventName = 'appointment:updated') {
  if (!appointment) return;
  const clinicProfileId = appointment.ownerClinicId
    || appointment.clinicBranch?.clinicProfileId
    || null;
  emitPortalInvalidation({
    io: req.app?.get?.('io'),
    eventName,
    entity: 'appointment',
    entityId: appointment.id,
    status: appointment.status || null,
    patientId: appointment.patientId,
    dentistId: appointment.dentistId,
    clinicProfileId,
  });
}

function toBigInt(value, fieldName) {
  try {
    return BigInt(value);
  } catch (err) {
    throw new Error(`INVALID_${fieldName?.toUpperCase() || 'ID'}`);
  }
}

function ensureIsoDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error('INVALID_DATE');
  }
  return date;
}

function buildDateTime(date, time, tzOffset = DEFAULT_TZ_OFFSET) {
  return new Date(`${date}T${time}${tzOffset}`);
}

function getDayKey(date, tzOffset = DEFAULT_TZ_OFFSET) {
  const localDate = new Date(`${date}T00:00:00${tzOffset}`);
  const dayIndex = localDate.getUTCDay(); // Sunday = 0
  const dayMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return dayMap[dayIndex];
}

function parseWorkingHours(workingHoursRaw) {
  if (!workingHoursRaw) return null;
  if (typeof workingHoursRaw === 'object') return workingHoursRaw;
  try {
    return JSON.parse(workingHoursRaw);
  } catch (err) {
    return null;
  }
}

function getWorkingWindow(date, dentistProfile) {
  const defaultWindow = { isOpen: true, open: '09:00:00', close: '17:00:00' };
  const workingHours = parseWorkingHours(dentistProfile?.clinicWorkingHours || dentistProfile?.clinic_working_hours);
  if (!workingHours) return defaultWindow;

  const dayKey = getDayKey(date);
  const dayConfig = workingHours[dayKey];
  if (!dayConfig || dayConfig.isOpen === false) {
    return { isOpen: false };
  }

  const openTime = dayConfig.open || '09:00';
  const closeTime = dayConfig.close || '17:00';
  return {
    isOpen: true,
    open: openTime.length === 5 ? `${openTime}:00` : openTime,
    close: closeTime.length === 5 ? `${closeTime}:00` : closeTime
  };
}

function generateSlotsForWindow(date, window, slotMinutes = DEFAULT_SLOT_MINUTES, tzOffset = DEFAULT_TZ_OFFSET) {
  if (!window.isOpen) return [];

  const slots = [];
  let cursor = buildDateTime(date, window.open, tzOffset);
  const endOfDay = buildDateTime(date, window.close, tzOffset);

  while (cursor < endOfDay) {
    const next = new Date(cursor.getTime() + slotMinutes * 60 * 1000);
    if (next > endOfDay) break;
    slots.push({ start: new Date(cursor), end: next });
    cursor = next;
  }
  return slots;
}

function slotOverlaps(slot, appointments) {
  return appointments.some(appt => {
    const apptStart = new Date(appt.startsAt ?? appt.starts_at);
    const apptEnd = new Date(appt.endsAt ?? appt.ends_at);
    return slot.start < apptEnd && slot.end > apptStart;
  });
}

function toIsoString(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

function serializeUserSlim(user) {
  if (!user) return null;
  return {
    id: user.id?.toString?.() ?? user.id,
    name: user.name || null,
    email: user.email || null,
    phone: user.phone_number ?? user.phoneNumber ?? null,
    avatar: user.avatar_url ?? user.avatarUrl ?? null
  };
}

function serializeDentistWithProfile(user, dentistProfile) {
  if (!user) return null;
  return {
    id: user.id?.toString?.() ?? user.id,
    name: user.name || null,
    email: user.email || null,
    phone: user.phone_number ?? user.phoneNumber ?? null,
    avatar: user.avatar_url ?? user.avatarUrl ?? dentistProfile?.avatar_url ?? null,
    profileId: dentistProfile?.id?.toString?.() ?? dentistProfile?.id ?? null,
    title: dentistProfile?.title || null,
    specialization: dentistProfile?.primarySpecialization || dentistProfile?.primary_specialization || 'Dokter Gigi Umum',
    dentistType: dentistProfile?.dentistType || dentistProfile?.dentist_type || 'clinic',
    clinicName: dentistProfile?.clinicName || dentistProfile?.clinic_name || null,
    clinicAddress: dentistProfile?.clinicAddress || dentistProfile?.clinic_address || null,
    consultationFee: dentistProfile?.consultationFee || dentistProfile?.consultation_fee || null
  };
}

function serializeBranch(branch) {
  if (!branch) return null;
  return {
    id: branch.id?.toString?.() ?? branch.id,
    name: branch.branchName ?? branch.name ?? null,
    city: branch.city || null,
    address: branch.streetAddress ?? branch.street_address ?? null,
    clinicProfileId: branch.clinicProfileId?.toString?.() ?? branch.clinic_profile_id?.toString?.() ?? null
  };
}

function serializeHistory(entries = []) {
  return entries.map((entry) => ({
    id: entry.id.toString(),
    previousStatus: entry.previousStatus,
    newStatus: entry.newStatus,
    changedBy: entry.changedBy ? entry.changedBy.toString() : null,
    changedByRole: entry.changedByRole,
    reason: entry.reason,
    notes: entry.notes,
    metadata: entry.metadata || {},
    createdAt: toIsoString(entry.createdAt)
  }));
}

function serializeAppointment(appointment) {
  // Generate booking code from appointment id
  const bookingCode = `SRN-${String(appointment.id).padStart(6, '0')}`;

  // Get latest payment intent for payment status
  const latestPayment = appointment.paymentIntents?.[0] || null;

  // CRITICAL FIX: Read consultation_type column first, fallback to metadata
  const metadata = appointment.metadata || {};
  const appointmentType =
    appointment.consultation_type ||
    appointment.consultationType ||
    metadata.appointmentType ||
    (appointment.videoRoomRef ? 'virtual' : 'onsite');

  return {
    id: appointment.id.toString(),
    bookingCode,
    dentistId: appointment.dentistId?.toString?.() ?? appointment.dentist_id?.toString?.() ?? null,
    patientId: appointment.patientId?.toString?.() ?? appointment.patient_id?.toString?.() ?? null,
    clinicBranchId: appointment.clinicBranchId
      ? appointment.clinicBranchId.toString()
      : appointment.clinic_branch_id
        ? appointment.clinic_branch_id.toString()
        : null,
    ownerType: appointment.ownerType ?? appointment.owner_type ?? 'dentist',
    ownerClinicId: appointment.ownerClinicId
      ? appointment.ownerClinicId.toString()
      : appointment.owner_clinic_id
        ? appointment.owner_clinic_id.toString()
        : null,
    startsAt: toIsoString(appointment.startsAt ?? appointment.starts_at),
    endsAt: toIsoString(appointment.endsAt ?? appointment.ends_at),
    status: appointment.status,
    appointmentType, // 'virtual' or 'onsite' - from consultation_type column
    consultationType: appointmentType, // Also include as consultationType for frontend compatibility
    reason: appointment.reason,
    notes: appointment.notes,
    cancellationReason: appointment.cancellationReason ?? appointment.cancellation_reason ?? null,
    cancellationFee: appointment.cancellationFee ?? appointment.cancellation_fee ?? null,
    chatRoomRef: appointment.chatRoomRef ?? appointment.chat_room_ref ?? null,
    videoRoomRef: appointment.videoRoomRef ?? appointment.video_room_ref ?? null,
    commStatus: appointment.commStatus ?? appointment.comm_status ?? null,
    metadata: appointment.metadata || {},
    createdAt: toIsoString(appointment.createdAt ?? appointment.created_at),
    updatedAt: toIsoString(appointment.updatedAt ?? appointment.updated_at),
    patient: serializeUserSlim(appointment.patient),
    dentist: serializeDentistWithProfile(appointment.dentist, appointment.dentistProfile),
    clinicBranch: serializeBranch(appointment.clinicBranch),
    healthForm: serializePreSessionHealthForm(appointment.preSessionHealthForm),
    statusHistory: appointment.statusHistory ? serializeHistory(appointment.statusHistory) : undefined,
    fee: appointment.fee ? Number(appointment.fee) : (appointment.dentistProfile?.consultationFee ? Number(appointment.dentistProfile.consultationFee) : (appointment.dentist?.dentistProfile?.[0]?.consultationFee ? Number(appointment.dentist.dentistProfile[0].consultationFee) : 0)),
    payment: latestPayment ? {
      id: latestPayment.id?.toString?.() ?? null,
      amount: latestPayment.amount,
      status: latestPayment.status,
      provider: latestPayment.provider || null,
      createdAt: toIsoString(latestPayment.createdAt)
    } : null
  };
}

function serializePreSessionHealthForm(form) {
  if (!form) return null;
  return {
    id: form.id?.toString?.() ?? form.id,
    appointmentId: form.appointmentId?.toString?.() ?? form.appointment_id?.toString?.() ?? null,
    patientId: form.patientId?.toString?.() ?? form.patient_id?.toString?.() ?? null,
    symptoms: form.symptoms || '',
    painLevel: form.painLevel ?? form.pain_level ?? null,
    allergies: form.allergies || '',
    medications: form.medications || '',
    notes: form.notes || '',
    answers: form.answers || {},
    submittedAt: toIsoString(form.submittedAt ?? form.submitted_at),
    updatedAt: toIsoString(form.updatedAt ?? form.updated_at)
  };
}

function normalizeHealthFormPayload(body = {}) {
  const trim = (value, max = 4000) => (
    typeof value === 'string' ? value.trim().slice(0, max) : ''
  );
  const painRaw = body.painLevel ?? body.pain_level;
  const painLevel = painRaw === null || painRaw === undefined || painRaw === ''
    ? null
    : Number(painRaw);

  if (painLevel !== null && (!Number.isInteger(painLevel) || painLevel < 1 || painLevel > 10)) {
    const error = new Error('INVALID_PAIN_LEVEL');
    error.code = 'invalid_pain_level';
    throw error;
  }

  return {
    symptoms: trim(body.symptoms),
    painLevel,
    allergies: trim(body.allergies),
    medications: trim(body.medications),
    notes: trim(body.notes),
    answers: body.answers && typeof body.answers === 'object' && !Array.isArray(body.answers)
      ? body.answers
      : {}
  };
}

async function findAppointmentForHealthForm(appointmentId, userId) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      id: true,
      patientId: true,
      dentistId: true,
      startsAt: true,
      status: true,
      consultationType: true,
      videoRoomRef: true
    }
  });

  if (!appointment) {
    const error = new Error('APPOINTMENT_NOT_FOUND');
    error.status = 404;
    throw error;
  }

  const isPatient = appointment.patientId === userId;
  const isDentist = appointment.dentistId === userId;
  if (!isPatient && !isDentist) {
    const error = new Error('FORBIDDEN');
    error.status = 403;
    throw error;
  }

  return { appointment, isPatient, isDentist };
}

function hasRole(roles = [], target) {
  return roles.includes(target);
}

function isClinicRole(role) {
  const clinicRoles = ['owner', 'manager', 'front_office', 'nurse', 'cashier', 'staff', 'clinic_admin', 'clinic_manager', 'clinic_staff'];
  return role && (role.startsWith('clinic_') || clinicRoles.includes(role));
}

function deriveDefaultView(roles = []) {
  if (roles.includes('dentist')) return 'dentist';
  if (roles.includes('patient')) return 'patient';
  if (roles.some(isClinicRole)) return 'clinic';
  return null;
}

async function resolveClinicStaffContext(userId) {
  return prisma.clinicStaff.findFirst({
    where: { userId: BigInt(userId), isActive: true },
    select: {
      id: true,
      role: true,
      clinicProfileId: true,
      assignedBranchId: true
    }
  });
}

function makeRouteError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

async function authorizeAppointmentStatusUpdate({ appointment, userId, roles }) {
  if (roles.includes('dentist')) {
    if (appointment.dentistId === userId) {
      return STATUS_TRANSITION_ROLES.dentist;
    }
    if (!roles.some(isClinicRole)) {
      throw makeRouteError(403, 'forbidden', 'Anda hanya dapat mengubah status janji temu Anda sendiri.');
    }
  }

  if (!roles.some(isClinicRole)) {
    throw makeRouteError(403, 'forbidden', 'Akses staf klinik diperlukan untuk mengubah status janji temu.');
  }

  const clinicContext = await resolveClinicStaffContext(userId);
  if (!clinicContext) {
    throw makeRouteError(403, 'clinic_context_missing', 'Akun Anda belum terhubung dengan klinik mana pun.');
  }

  const appointmentClinicId = appointment.ownerClinicId || appointment.clinicBranch?.clinicProfileId;
  if (!appointmentClinicId || appointmentClinicId.toString() !== clinicContext.clinicProfileId.toString()) {
    throw makeRouteError(403, 'cross_clinic_denied', 'Janji temu ini berada di klinik lain.');
  }

  if (
    clinicContext.assignedBranchId
    && appointment.clinicBranchId
    && clinicContext.assignedBranchId.toString() !== appointment.clinicBranchId.toString()
  ) {
    throw makeRouteError(403, 'cross_branch_denied', 'Janji temu ini berada di cabang lain.');
  }

  return STATUS_TRANSITION_ROLES.staff;
}

async function authorizeAppointmentCancellation({ appointment, userId, roles }) {
  if (roles.includes('patient')) {
    if (appointment.patientId === userId) {
      return STATUS_TRANSITION_ROLES.patient;
    }
    if (!roles.includes('dentist') && !roles.some(isClinicRole)) {
      throw makeRouteError(403, 'forbidden', 'Anda hanya dapat membatalkan janji temu Anda sendiri.');
    }
  }
  return authorizeAppointmentStatusUpdate({ appointment, userId, roles });
}

function metadataWithStatusStamp(metadata, status, userId) {
  const next = metadata && typeof metadata === 'object' ? { ...metadata } : {};
  next.lastOperationalStatus = status;
  next.lastOperationalStatusAt = new Date().toISOString();
  next.lastOperationalStatusBy = userId.toString();
  return next;
}

router.get('/availability', authenticateToken, async (req, res) => {
  try {
    const dentistIdRaw = req.query.dentistId || req.query.dentist_id;
    const dateRaw = req.query.date;
    const slotMinutes = parseInt(req.query.slotMinutes || req.query.slot_minutes || DEFAULT_SLOT_MINUTES, 10);
    const tzOffset = req.query.tzOffset || req.query.tz_offset || DEFAULT_TZ_OFFSET;

    if (!dentistIdRaw) {
      return sendError(res, 400, 'dentist_id_required', 'Parameter dentistId wajib diisi.');
    }
    if (!dateRaw) {
      return sendError(res, 400, 'date_required', 'Parameter tanggal wajib diisi (YYYY-MM-DD).');
    }

    // dentistIdRaw from mobile is the DentistProfile.id
    const dentistProfileId = toBigInt(dentistIdRaw, 'dentistId');
    const date = ensureIsoDate(dateRaw);

    // First lookup dentist profile by id to get userId and working hours
    const dentistProfile = await prisma.dentistProfile.findUnique({
      where: { id: dentistProfileId },
      select: {
        userId: true,
        clinicWorkingHours: true,
        clinic_working_hours: true
      }
    });

    if (!dentistProfile) {
      return sendError(res, 404, 'dentist_not_found', 'Dokter gigi tidak ditemukan.');
    }

    const dentistId = dentistProfile.userId;

    const workingWindow = getWorkingWindow(date, dentistProfile);
    if (!workingWindow.isOpen) {
      return res.json({
        dentistId: dentistId.toString(),
        date,
        timezone: DEFAULT_TIMEZONE,
        slotDurationMinutes: slotMinutes,
        slots: []
      });
    }

    const baseSlots = generateSlotsForWindow(date, workingWindow, slotMinutes, tzOffset);

    const dayStart = buildDateTime(date, '00:00:00', tzOffset);
    const dayEnd = buildDateTime(date, '23:59:59', tzOffset);

    const existingAppointments = await prisma.appointment.findMany({
      where: {
        dentistId,
        status: { in: ACTIVE_APPOINTMENT_STATUSES },
        startsAt: { gte: dayStart, lt: dayEnd }
      },
      select: { startsAt: true, endsAt: true, status: true }
    });

    const availableSlots = baseSlots
      .filter(slot => !slotOverlaps(slot, existingAppointments))
      .map(slot => ({
        start: slot.start.toISOString(),
        end: slot.end.toISOString()
      }));

    return res.json({
      dentistId: dentistId.toString(),
      date,
      timezone: DEFAULT_TIMEZONE,
      slotDurationMinutes: slotMinutes,
      slots: availableSlots
    });
  } catch (error) {
    console.error('Error fetching availability:', error);
    if (error.message === 'INVALID_DATE') {
      return sendError(res, 400, 'invalid_date', 'Format tanggal tidak valid. Gunakan YYYY-MM-DD.');
    }
    if (error.message && error.message.startsWith('INVALID_')) {
      return sendError(res, 400, 'invalid_parameter', `Parameter tidak valid: ${error.message}`);
    }
    return sendError(res, 500, 'availability_failed', 'Gagal memuat ketersediaan jadwal.');
  }
});

router.get(
  '/config',
  authenticateToken,
  async (req, res) => {
    try {
      res.json({
        success: true,
        data: {
          reminderMinutes: [15, 30, 60, 120],
          rescheduleCutoffHours: appointmentConfig.rescheduleCutoffHours,
          cancelCutoffHours: appointmentConfig.cancelCutoffHours,
          cancellationFeePercent: appointmentConfig.cancellationFeePercent,
        }
      });
    } catch (error) {
      console.error('Error fetching appointment config:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch appointment configuration' });
    }
  }
);

router.post(
  '/',
  authenticateToken,
  requireRoles(['patient']),
  async (req, res) => {
    const patientId = toBigInt(req.user.id, 'patientId');
    const {
      dentistId: dentistIdRaw,
      clinicBranchId: clinicBranchIdRaw,
      start,
      end,
      reason,
      notes,
      metadata,
      appointmentType // 'virtual' or 'onsite'
    } = req.body || {};

    console.log('[APPOINTMENT POST] Request received:', {
      patientId: patientId.toString(),
      dentistIdRaw,
      clinicBranchIdRaw,
      start,
      end,
      reason,
      appointmentType,
      timestamp: new Date().toISOString()
    });

    try {
      if (!dentistIdRaw) {
        console.log('[APPOINTMENT POST] Error: Missing dentistIdRaw');
        return sendError(res, 400, 'dentist_id_required', 'Pilih dokter gigi yang tersedia sebelum membuat janji temu.');
      }
      if (!start || !end) {
        console.log('[APPOINTMENT POST] Error: Missing start/end time');
        return sendError(res, 400, 'time_required', 'Waktu mulai dan selesai janji temu wajib diisi.');
      }

      // dentistIdRaw from mobile is the DentistProfile.id, we need to get the User.id
      const dentistProfileId = toBigInt(dentistIdRaw, 'dentistId');
      const clinicBranchId = clinicBranchIdRaw ? toBigInt(clinicBranchIdRaw, 'clinicBranchId') : null;

      // Look up the dentist profile to get the actual user_id and practice type
      const dentistProfile = await prisma.dentistProfile.findUnique({
        where: { id: dentistProfileId },
        select: { userId: true }
      });

      if (!dentistProfile) {
        return sendError(res, 404, 'dentist_not_found', 'Dokter gigi tidak ditemukan.');
      }

      const dentistId = dentistProfile.userId;
      const clinicContext = await resolveDentistClinicContext({
        prismaClient: prisma,
        dentistUserId: dentistId
      });
      const dentistType = clinicContext ? 'clinic' : 'independent';

      if (dentistId === patientId) {
        return sendError(res, 400, 'self_booking_not_allowed', 'Pasien tidak dapat membuat janji dengan dirinya sendiri.');
      }

      // Resolve clinic branch to avoid writing inconsistent foreign keys
      let resolvedClinicBranchId = null;
      let resolvedClinicProfileId = null;
      if (clinicContext) {
        const assignedBranchId = clinicContext.branchId ? BigInt(clinicContext.branchId) : null;
        const assignedClinicId = BigInt(clinicContext.clinicProfileId);
        if (!assignedBranchId) {
          return sendError(res, 400, 'clinic_branch_required', 'Cabang klinik diperlukan untuk janji temu dokter klinik.');
        }

        if (
          clinicBranchId
          && clinicBranchId !== assignedBranchId
          && clinicBranchId !== assignedClinicId
        ) {
          return sendError(
            res,
            400,
            'clinic_branch_not_assigned',
            'Dokter gigi tidak ditugaskan pada cabang klinik yang dipilih.'
          );
        }

        resolvedClinicBranchId = assignedBranchId;
        resolvedClinicProfileId = assignedClinicId;
      }

      const startsAt = new Date(start);
      const endsAt = new Date(end);
      if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
        return sendError(res, 400, 'invalid_time', 'Format waktu tidak valid. Gunakan format ISO 8601.');
      }
      if (endsAt <= startsAt) {
        return sendError(res, 400, 'invalid_duration', 'Waktu selesai harus lebih lama dibandingkan waktu mulai.');
      }

      const now = new Date();
      if (startsAt < now) {
        console.log('[APPOINTMENT POST] Error: Trying to book in the past', { startsAt, now });
        return sendError(res, 400, 'cannot_book_past', 'Janji temu tidak bisa dijadwalkan pada waktu yang sudah lewat.');
      }

      const ownerType = dentistType !== 'independent'
        ? FINANCIAL_OWNER_TYPES.CLINIC
        : FINANCIAL_OWNER_TYPES.INDEPENDENT_DENTIST;
      const ownerClinicId = ownerType === FINANCIAL_OWNER_TYPES.CLINIC ? resolvedClinicProfileId : null;

      console.log('[APPOINTMENT POST] Validation passed:', {
        dentistId: dentistId.toString(),
        patientId: patientId.toString(),
        resolvedClinicBranchId: resolvedClinicBranchId?.toString() || null,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        dentistType,
        ownerType,
        ownerClinicId: ownerClinicId?.toString() || null
      });

      let createdAppointment;
      await prisma.$transaction(async (tx) => {
        console.log('[APPOINTMENT POST] Transaction started');
        // Use dentistId as bigint for advisory lock
        await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock($1::bigint)', dentistId);
        console.log('[APPOINTMENT POST] Advisory lock acquired');

        const overlapping = await tx.appointment.findFirst({
          where: {
            dentistId,
            status: { in: ACTIVE_APPOINTMENT_STATUSES },
            startsAt: { lt: endsAt },
            endsAt: { gt: startsAt }
          },
          select: { id: true }
        });

        if (overlapping) {
          console.log('[APPOINTMENT POST] Error: Slot conflict detected', { overlapping });
          const slotError = new Error('SLOT_TAKEN');
          slotError.code = 'slot_taken';
          throw slotError;
        }

        console.log('[APPOINTMENT POST] No conflicts, creating appointment');
        // Map appointmentType/type to consultation_type column (accept virtual aliases)
        const inputType = (appointmentType || req.body?.type || '').toLowerCase();
        const consultationType = ['virtual', 'teleconsultation', 'online'].includes(inputType)
          ? 'virtual'
          : 'onsite';

        createdAppointment = await tx.appointment.create({
          data: {
            dentistId,
            patientId,
            clinicBranchId: resolvedClinicBranchId,
            ownerType,
            ownerClinicId,
            startsAt,
            endsAt,
            status: 'scheduled',
            consultationType, // ✅ Store in column for web display
            reason: reason || null,
            notes: notes || null,
            metadata: {
              ...(metadata && typeof metadata === 'object' && !Array.isArray(metadata) ? metadata : {}),
              appointmentType: inputType || 'onsite' // Also keep in metadata
            }
          }
        });
        console.log('[APPOINTMENT POST] Appointment created IN TRANSACTION:', {
          id: createdAppointment.id.toString(),
          dentistId: createdAppointment.dentistId.toString(),
          patientId: createdAppointment.patientId.toString(),
          startsAt: createdAppointment.startsAt,
          status: createdAppointment.status
        });

        const statusChangeResult = await recordStatusChange(tx, {
          appointmentId: createdAppointment.id,
          previousStatus: null,
          newStatus: 'scheduled',
          changedBy: patientId,
          changedByRole: STATUS_TRANSITION_ROLES.patient,
          reason: 'appointment_created',
          metadata: {
            createdAt: startsAt,
            createdBy: patientId.toString()
          }
        });
        console.log('[APPOINTMENT POST] Status history recorded IN TRANSACTION');

        // Verify appointment exists within transaction
        const verifyInTx = await tx.appointment.findUnique({
          where: { id: createdAppointment.id },
          select: { id: true, status: true }
        });
        console.log('[APPOINTMENT POST] Verified in transaction:', verifyInTx);
      });
      console.log('[APPOINTMENT POST] ✅ Transaction committed successfully, appointment ID:', createdAppointment.id.toString());

      // CRITICAL: Verify appointment actually exists in DB after transaction commit
      const verifyPostCommit = await prisma.appointment.findUnique({
        where: { id: createdAppointment.id },
        select: { id: true, status: true, startsAt: true, patientId: true, dentistId: true }
      });
      console.log('[APPOINTMENT POST] 🔍 POST-COMMIT VERIFICATION:', verifyPostCommit);

      if (!verifyPostCommit) {
        console.error('[APPOINTMENT POST] ❌ CRITICAL: Appointment ID', createdAppointment.id.toString(), 'does not exist after transaction commit!');
        throw new Error('PHANTOM_APPOINTMENT: Transaction committed but data missing from database');
      }

      // Fetch dentist profile details for response (use different variable name)
      const dentistProfileDetails = await prisma.dentistProfile.findFirst({
        where: { userId: dentistId },
        select: {
          title: true,
          primarySpecialization: true,
          clinicName: true,
          clinicAddress: true,
          consultationFee: true
        }
      });

      const dentistUser = await prisma.user.findUnique({
        where: { id: dentistId },
        select: {
          id: true,
          name: true,
          email: true,
          phone_number: true,
          avatar_url: true
        }
      });

      const fullAppointment = await prisma.appointment.findUnique({
        where: { id: createdAppointment.id },
        include: {
          patient: {
            select: {
              id: true,
              name: true,
              email: true,
              phone_number: true,
              avatar_url: true
            }
          },
          dentist: {
            select: {
              id: true,
              name: true,
              email: true,
              phone_number: true,
              avatar_url: true
            }
          },
          clinicBranch: {
            select: {
              id: true,
              branchName: true,
              city: true,
              streetAddress: true,
              clinicProfileId: true
            }
          }
        }
      });

      const responsePayload = {
        appointment: serializeAppointment(fullAppointment),
        dentist: dentistUser
          ? {
            id: dentistUser.id.toString(),
            name: dentistUser.name,
            email: dentistUser.email,
            phone: dentistUser.phone_number,
            avatar: dentistUser.avatar_url,
            title: dentistProfileDetails?.title || null,
            specialization: dentistProfileDetails?.primarySpecialization || null,
            clinicName: dentistProfileDetails?.clinicName || null,
            clinicAddress: dentistProfileDetails?.clinicAddress || null,
            consultationFee: dentistProfileDetails?.consultationFee || null
          }
          : null
      };

      console.log('[APPOINTMENT POST] SUCCESS - Appointment created and responding:', {
        appointmentId: fullAppointment.id.toString(),
        patientId: fullAppointment.patientId.toString(),
        dentistId: fullAppointment.dentistId.toString(),
        startsAt: fullAppointment.startsAt,
        endsAt: fullAppointment.endsAt,
        status: fullAppointment.status,
        responseStructure: {
          hasAppointmentKey: !!responsePayload.appointment,
          appointmentId: responsePayload.appointment?.id,
          hasDentistKey: !!responsePayload.dentist
        }
      });

      emitAppointmentRealtimeUpdate(req, fullAppointment, 'appointment:created');

      return res.status(201).json(responsePayload);
    } catch (error) {
      console.error('[APPOINTMENT POST] Error caught:', {
        message: error.message,
        code: error.code,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      if (error.code === 'slot_taken' || error.message === 'SLOT_TAKEN') {
        console.log('[APPOINTMENT POST] Returning 409: Slot taken');
        return sendError(res, 409, 'slot_taken', 'Waktu yang dipilih baru saja terisi. Silakan pilih slot lain.');
      }
      if (error.message && error.message.startsWith('INVALID_')) {
        console.log('[APPOINTMENT POST] Returning 400: Invalid payload');
        return sendError(res, 400, 'invalid_payload', 'Data permintaan tidak valid. Periksa kembali formulir Anda.');
      }
      console.error('[APPOINTMENT POST] Unexpected error creating appointment:', error);
      return sendError(res, 500, 'create_appointment_failed', 'Terjadi kesalahan saat membuat janji temu. Coba lagi nanti.');
    }
  }
);

router.patch(
  '/:appointmentId/reschedule',
  authenticateToken,
  requireRoles(['patient']),
  async (req, res) => {
    try {
      const { appointmentId } = req.params;
      const appointmentBigInt = toBigInt(appointmentId, 'appointmentId');
      const { startsAt: newStartsAtRaw, endsAt: newEndsAtRaw, reason } = req.body || {};

      if (!newStartsAtRaw || !newEndsAtRaw) {
        return sendError(res, 400, 'time_required', 'Waktu mulai dan selesai baru wajib diisi.');
      }

      const newStartsAt = new Date(newStartsAtRaw);
      const newEndsAt = new Date(newEndsAtRaw);
      if (Number.isNaN(newStartsAt.getTime()) || Number.isNaN(newEndsAt.getTime())) {
        return sendError(res, 400, 'invalid_time', 'Format waktu baru tidak valid.');
      }
      if (newEndsAt <= newStartsAt) {
        return sendError(res, 400, 'invalid_duration', 'Waktu selesai harus lebih lama dibandingkan waktu mulai.');
      }

      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentBigInt },
        include: {
          patient: {
            select: {
              id: true,
              name: true,
              email: true,
              phone_number: true,
              avatar_url: true
            }
          },
          dentist: {
            select: {
              id: true,
              name: true,
              email: true,
              phone_number: true,
              avatar_url: true
            }
          },
          clinicBranch: {
            select: {
              id: true,
              branchName: true,
              city: true,
              streetAddress: true,
              clinicProfileId: true
            }
          }
        }
      });

      if (!appointment) {
        return sendError(res, 404, 'appointment_not_found', 'Janji temu tidak ditemukan atau sudah dihapus.');
      }

      const userId = toBigInt(req.user.id, 'userId');
      if (appointment.patientId !== userId) {
        return sendError(res, 403, 'forbidden', 'Anda tidak diizinkan mengubah janji temu ini.');
      }

      if (!PATIENT_MANAGEABLE_STATUSES.includes(appointment.status)) {
        return sendError(res, 409, 'cannot_reschedule_status', 'Janji temu dalam status ini tidak bisa dijadwalkan ulang.');
      }

      const now = new Date();
      const timeUntilAppointment = appointment.startsAt.getTime() - now.getTime();
      if (timeUntilAppointment < millisecondsFromHours(appointmentConfig.rescheduleCutoffHours)) {
        return sendError(res, 400, 'reschedule_window_elapsed', 'Penjadwalan ulang hanya bisa dilakukan minimal 24 jam sebelum janji temu.');
      }

      if (newStartsAt <= now) {
        return sendError(res, 400, 'invalid_time', 'Pilih waktu baru di masa depan.');
      }

      let updatedAppointment;
      await prisma.$transaction(async (tx) => {
        // Use dentistId as bigint for advisory lock
        await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock($1::bigint)', appointment.dentistId);

        const overlapping = await tx.appointment.findFirst({
          where: {
            dentistId: appointment.dentistId,
            id: { not: appointment.id },
            status: { in: ACTIVE_APPOINTMENT_STATUSES },
            startsAt: { lt: newEndsAt },
            endsAt: { gt: newStartsAt }
          },
          select: { id: true }
        });

        if (overlapping) {
          const slotError = new Error('SLOT_TAKEN');
          slotError.code = 'slot_taken';
          throw slotError;
        }

        const incomingMetadata = appointment.metadata && typeof appointment.metadata === 'object' ? appointment.metadata : {};

        updatedAppointment = await tx.appointment.update({
          where: { id: appointment.id },
          data: {
            startsAt: newStartsAt,
            endsAt: newEndsAt,
            metadata: {
              ...incomingMetadata,
              lastReschedule: {
                previousStartsAt: appointment.startsAt,
                previousEndsAt: appointment.endsAt,
                requestedAt: now,
                reason: reason || null
              }
            }
          }
        });

        await recordStatusChange(tx, {
          appointmentId: appointment.id,
          previousStatus: appointment.status,
          newStatus: appointment.status,
          changedBy: userId,
          changedByRole: STATUS_TRANSITION_ROLES.patient,
          reason: 'patient_reschedule',
          metadata: {
            previousStartsAt: appointment.startsAt,
            previousEndsAt: appointment.endsAt,
            newStartsAt,
            newEndsAt,
            reason: reason || null
          }
        });
      });

      const fullAppointment = await prisma.appointment.findUnique({
        where: { id: updatedAppointment.id },
        include: {
          patient: {
            select: {
              id: true,
              name: true,
              email: true,
              phone_number: true,
              avatar_url: true
            }
          },
          dentist: {
            select: {
              id: true,
              name: true,
              email: true,
              phone_number: true,
              avatar_url: true
            }
          },
          clinicBranch: {
            select: {
              id: true,
              branchName: true,
              city: true,
              streetAddress: true,
              clinicProfileId: true
            }
          }
        }
      });

      emitAppointmentEvent({
        type: 'appointment_rescheduled',
        appointmentId: appointment.id,
        payload: {
          previousStartsAt: appointment.startsAt,
          newStartsAt,
          reason: reason || null
        }
      }).catch((error) => {
        console.error('Failed to emit reschedule event:', error);
      });

      emitAppointmentRealtimeUpdate(req, fullAppointment);

      return res.json({ appointment: serializeAppointment(fullAppointment) });
    } catch (error) {
      if (error.code === 'slot_taken' || error.message === 'SLOT_TAKEN') {
        return sendError(res, 409, 'slot_taken', 'Waktu baru yang dipilih sudah terisi.');
      }
      console.error('Error rescheduling appointment:', error);
      return sendError(res, 500, 'reschedule_failed', 'Terjadi kesalahan saat mengirim permintaan penjadwalan ulang.');
    }
  }
);

router.patch(
  '/:appointmentId/cancel',
  authenticateToken,
  requireRoles(['patient', 'dentist', 'clinic_admin', 'clinic_staff', 'clinic_manager', 'owner', 'manager', 'front_office', 'nurse', 'cashier', 'staff']),
  async (req, res) => {
    try {
      const { appointmentId } = req.params;
      const appointmentBigInt = toBigInt(appointmentId, 'appointmentId');
      const { reason } = req.body || {};
      const userId = toBigInt(req.user.id, 'userId');
      const roles = req.user.roles || [];

      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentBigInt },
        include: {
          patient: {
            select: {
              id: true,
              name: true,
              email: true,
              phone_number: true,
              avatar_url: true
            }
          },
          dentist: {
            select: {
              id: true,
              name: true,
              email: true,
              phone_number: true,
              avatar_url: true
            }
          },
          clinicBranch: {
            select: {
              id: true,
              branchName: true,
              city: true,
              streetAddress: true,
              clinicProfileId: true
            }
          },
          paymentIntents: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              id: true,
              amount: true,
              status: true
            }
          }
        }
      });

      if (!appointment) {
        return sendError(res, 404, 'appointment_not_found', 'Janji temu tidak ditemukan atau sudah dihapus.');
      }

      const changedByRole = await authorizeAppointmentCancellation({ appointment, userId, roles });

      if (!PATIENT_MANAGEABLE_STATUSES.includes(appointment.status)) {
        return sendError(res, 409, 'cannot_cancel_status', 'Janji temu dalam status ini tidak dapat dibatalkan.');
      }

      const now = new Date();
      if (changedByRole === STATUS_TRANSITION_ROLES.patient) {
        const timeUntilAppointment = appointment.startsAt.getTime() - now.getTime();
        if (timeUntilAppointment < millisecondsFromHours(appointmentConfig.cancelCutoffHours)) {
          return sendError(res, 400, 'cancel_window_elapsed', 'Pembatalan hanya diperbolehkan hingga beberapa jam sebelum janji.');
        }
      }

      const latestIntent = appointment.paymentIntents?.[0];
      const cancellationFee =
        changedByRole === STATUS_TRANSITION_ROLES.patient
        && appointmentConfig.cancellationFeePercent > 0
        && latestIntent?.amount
          ? Math.round((latestIntent.amount * appointmentConfig.cancellationFeePercent) / 100)
          : null;

      let cancelledAppointment;
      await prisma.$transaction(async (tx) => {
        cancelledAppointment = await tx.appointment.update({
          where: { id: appointment.id },
          data: {
            status: 'cancelled',
            cancellationReason: reason || null,
            cancellationFee,
            commStatus: 'cancelled',
            metadata: {
              ...(appointment.metadata && typeof appointment.metadata === 'object' ? appointment.metadata : {}),
              cancelledAt: now,
              cancelledBy: userId.toString(),
              cancelledByRole: changedByRole
            }
          }
        });

        await recordStatusChange(tx, {
          appointmentId: appointment.id,
          previousStatus: appointment.status,
          newStatus: 'cancelled',
          changedBy: userId,
          changedByRole,
          reason: `${changedByRole}_cancelled`,
          metadata: {
            cancellationFee,
            reason: reason || null,
            cancelledByRole: changedByRole
          }
        });
      });

      const fullAppointment = await prisma.appointment.findUnique({
        where: { id: cancelledAppointment.id },
        include: {
          patient: {
            select: {
              id: true,
              name: true,
              email: true,
              phone_number: true,
              avatar_url: true
            }
          },
          dentist: {
            select: {
              id: true,
              name: true,
              email: true,
              phone_number: true,
              avatar_url: true
            }
          },
          clinicBranch: {
            select: {
              id: true,
              branchName: true,
              city: true,
              streetAddress: true,
              clinicProfileId: true
            }
          }
        }
      });

      emitAppointmentEvent({
        type: 'appointment_cancelled',
        appointmentId: appointment.id,
        payload: {
          cancellationReason: reason || null,
          cancelledAt: now,
          cancellationFee,
          cancelledBy: userId.toString(),
          cancelledByRole: changedByRole
        }
      }).catch((error) => {
        console.error('Failed to emit cancellation event:', error);
      });

      emitAppointmentRealtimeUpdate(req, fullAppointment, 'appointment:cancelled');

      return res.json({ appointment: serializeAppointment(fullAppointment) });
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      if (error.status) {
        return sendError(res, error.status, error.code || 'cancel_forbidden', error.message);
      }
      return sendError(res, 500, 'cancel_failed', 'Terjadi kesalahan saat membatalkan janji temu.');
    }
  }
);

router.get(
  '/:appointmentId/pre-session-health-form',
  authenticateToken,
  async (req, res) => {
    try {
      const appointmentId = toBigInt(req.params.appointmentId, 'appointmentId');
      const userId = toBigInt(req.user.id, 'userId');
      const { appointment, isPatient } = await findAppointmentForHealthForm(appointmentId, userId);

      const form = await prisma.appointmentPreSessionHealthForm.findUnique({
        where: { appointmentId }
      });

      return res.json({
        appointmentId: appointment.id.toString(),
        form: serializePreSessionHealthForm(form),
        required: false,
        canEdit: isPatient && ['scheduled', 'confirmed'].includes(appointment.status),
        status: form ? 'submitted' : 'missing'
      });
    } catch (error) {
      if (error.status === 404) {
        return sendError(res, 404, 'appointment_not_found', 'Janji temu tidak ditemukan.');
      }
      if (error.status === 403) {
        return sendError(res, 403, 'forbidden', 'Anda tidak memiliki akses ke formulir pra-sesi ini.');
      }
      if (error.message && error.message.startsWith('INVALID_')) {
        return sendError(res, 400, 'invalid_appointment_id', 'ID janji temu tidak valid.');
      }
      console.error('Error fetching pre-session health form:', error);
      return sendError(res, 500, 'fetch_health_form_failed', 'Gagal memuat formulir pra-sesi.');
    }
  }
);

router.put(
  '/:appointmentId/pre-session-health-form',
  authenticateToken,
  requireRoles(['patient']),
  async (req, res) => {
    try {
      const appointmentId = toBigInt(req.params.appointmentId, 'appointmentId');
      const userId = toBigInt(req.user.id, 'userId');
      const { appointment, isPatient } = await findAppointmentForHealthForm(appointmentId, userId);

      if (!isPatient) {
        return sendError(res, 403, 'forbidden', 'Hanya pasien pada janji temu ini yang dapat mengisi formulir pra-sesi.');
      }
      if (!['scheduled', 'confirmed'].includes(appointment.status)) {
        return sendError(res, 409, 'health_form_locked', 'Formulir pra-sesi tidak dapat diubah untuk status janji temu ini.');
      }

      const payload = normalizeHealthFormPayload(req.body || {});
      const form = await prisma.appointmentPreSessionHealthForm.upsert({
        where: { appointmentId },
        create: {
          appointmentId,
          patientId: userId,
          symptoms: payload.symptoms || null,
          painLevel: payload.painLevel,
          allergies: payload.allergies || null,
          medications: payload.medications || null,
          notes: payload.notes || null,
          answers: payload.answers
        },
        update: {
          symptoms: payload.symptoms || null,
          painLevel: payload.painLevel,
          allergies: payload.allergies || null,
          medications: payload.medications || null,
          notes: payload.notes || null,
          answers: payload.answers
        }
      });

      return res.json({
        appointmentId: appointment.id.toString(),
        form: serializePreSessionHealthForm(form),
        required: false,
        status: 'submitted'
      });
    } catch (error) {
      if (error.status === 404) {
        return sendError(res, 404, 'appointment_not_found', 'Janji temu tidak ditemukan.');
      }
      if (error.status === 403) {
        return sendError(res, 403, 'forbidden', 'Anda tidak memiliki akses ke formulir pra-sesi ini.');
      }
      if (error.code === 'invalid_pain_level') {
        return sendError(res, 400, 'invalid_pain_level', 'Skala nyeri harus berupa angka 1 sampai 10.');
      }
      if (error.message && error.message.startsWith('INVALID_')) {
        return sendError(res, 400, 'invalid_appointment_id', 'ID janji temu tidak valid.');
      }
      console.error('Error saving pre-session health form:', error);
      return sendError(res, 500, 'save_health_form_failed', 'Gagal menyimpan formulir pra-sesi.');
    }
  }
);

router.get(
  '/:appointmentId',
  authenticateToken,
  async (req, res) => {
    try {
      const { appointmentId } = req.params;
      const appointmentBigInt = toBigInt(appointmentId, 'appointmentId');
      const userId = toBigInt(req.user.id, 'userId');
      const roles = req.user.roles || [];

      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentBigInt },
        include: {
          patient: {
            select: {
              id: true,
              name: true,
              email: true,
              phone_number: true,
              avatar_url: true
            }
          },
          dentist: {
            select: {
              id: true,
              name: true,
              email: true,
              phone_number: true,
              avatar_url: true,
              dentistProfile: true
            }
          },
          clinicBranch: {
            select: {
              id: true,
              branchName: true,
              city: true,
              streetAddress: true,
              clinicProfileId: true
            }
          },
          statusHistory: {
            orderBy: { createdAt: 'desc' },
            take: 10
          },
          paymentIntents: {
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        }
      });

      if (!appointment) {
        return sendError(res, 404, 'appointment_not_found', 'Janji temu tidak ditemukan atau sudah dihapus.');
      }

      // Map dentistProfile from nested dentist relation (it's an array, take first)
      if (appointment.dentist) {
        appointment.dentistProfile = appointment.dentist.dentistProfile?.[0] || null;
      }

      // Authorization check
      const isPatient = appointment.patientId === userId;
      const isDentist = appointment.dentistId === userId;
      const isClinicStaff = roles.some(isClinicRole);

      if (!isPatient && !isDentist && !isClinicStaff) {
        return sendError(res, 403, 'forbidden', 'Anda tidak memiliki akses ke janji temu ini.');
      }

      return res.json({ appointment: serializeAppointment(appointment) });
    } catch (error) {
      console.error('Error fetching appointment details:', error);
      return sendError(res, 500, 'fetch_appointment_failed', 'Gagal mengambil detail janji temu.');
    }
  }
);

router.patch(
  '/:appointmentId/confirm',
  authenticateToken,
  requireRoles(['dentist', 'clinic_admin', 'clinic_staff', 'clinic_manager', 'owner', 'manager', 'front_office', 'nurse', 'cashier', 'staff']),
  async (req, res) => {
    try {
      const { appointmentId } = req.params;
      const appointmentBigInt = toBigInt(appointmentId, 'appointmentId');
      const userId = toBigInt(req.user.id, 'userId');
      const roles = req.user.roles || [];

      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentBigInt },
        include: {
          patient: {
            select: {
              id: true,
              name: true,
              email: true,
              phone_number: true,
              avatar_url: true
            }
          },
          dentist: {
            select: {
              id: true,
              name: true,
              email: true,
              phone_number: true,
              avatar_url: true
            }
          },
          clinicBranch: {
            select: {
              id: true,
              branchName: true,
              city: true,
              streetAddress: true,
              clinicProfileId: true
            }
          }
        }
      });

      if (!appointment) {
        return sendError(res, 404, 'appointment_not_found', 'Janji temu tidak ditemukan atau sudah dihapus.');
      }

      const changedByRole = await authorizeAppointmentStatusUpdate({ appointment, userId, roles });

      // Check if appointment is in a confirmable status
      if (!['scheduled', 'rescheduled'].includes(appointment.status)) {
        if (appointment.status === 'confirmed') {
          return res.json({
            appointment: serializeAppointment(appointment),
            message: 'Janji temu sudah dikonfirmasi sebelumnya.'
          });
        }
        return sendError(res, 409, 'cannot_confirm_status', `Janji temu dengan status ${appointment.status} tidak dapat dikonfirmasi.`);
      }

      let confirmedAppointment;
      await prisma.$transaction(async (tx) => {
        confirmedAppointment = await tx.appointment.update({
          where: { id: appointment.id },
          data: {
            status: 'confirmed',
            metadata: metadataWithStatusStamp({
              ...(appointment.metadata && typeof appointment.metadata === 'object' ? appointment.metadata : {}),
              confirmedAt: new Date().toISOString(),
              confirmedBy: userId.toString()
            }, 'confirmed', userId)
          }
        });

        await recordStatusChange(tx, {
          appointmentId: appointment.id,
          previousStatus: appointment.status,
          newStatus: 'confirmed',
          changedBy: userId,
          changedByRole,
          reason: 'staff_confirmed',
          metadata: {
            confirmedAt: new Date(),
            confirmedBy: userId.toString()
          }
        });
      });

      const fullAppointment = await prisma.appointment.findUnique({
        where: { id: confirmedAppointment.id },
        include: {
          patient: {
            select: {
              id: true,
              name: true,
              email: true,
              phone_number: true,
              avatar_url: true
            }
          },
          dentist: {
            select: {
              id: true,
              name: true,
              email: true,
              phone_number: true,
              avatar_url: true
            }
          },
          clinicBranch: {
            select: {
              id: true,
              branchName: true,
              city: true,
              streetAddress: true,
              clinicProfileId: true
            }
          }
        }
      });

      emitAppointmentEvent({
        type: 'appointment_confirmed',
        appointmentId: appointment.id,
        payload: {
          confirmedAt: new Date(),
          confirmedBy: userId.toString()
        }
      }).catch((error) => {
        console.error('Failed to emit confirmation event:', error);
      });

      emitAppointmentRealtimeUpdate(req, fullAppointment);

      return res.json({
        appointment: serializeAppointment(fullAppointment),
        message: 'Janji temu berhasil dikonfirmasi.'
      });
    } catch (error) {
      console.error('Error confirming appointment:', error);
      if (error.status) {
        return sendError(res, error.status, error.code || 'confirm_forbidden', error.message);
      }
      return sendError(res, 500, 'confirm_failed', 'Terjadi kesalahan saat mengkonfirmasi janji temu.');
    }
  }
);

const OPERATIONAL_STATUS_ACTIONS = {
  'check-in': {
    status: 'check-in',
    allowedFrom: ['scheduled', 'rescheduled', 'confirmed'],
    eventType: 'appointment_checked_in',
    reason: 'staff_check_in'
  },
  start: {
    status: 'in-chair',
    allowedFrom: ['scheduled', 'rescheduled', 'confirmed', 'check-in'],
    eventType: 'appointment_started',
    reason: 'staff_started'
  },
  complete: {
    status: 'completed',
    allowedFrom: ['scheduled', 'rescheduled', 'confirmed', 'check-in', 'in-chair'],
    eventType: 'appointment_completed',
    reason: 'staff_completed'
  },
  'no-show': {
    status: 'no-show',
    allowedFrom: ['scheduled', 'rescheduled', 'confirmed', 'check-in'],
    eventType: 'appointment_no_show',
    reason: 'staff_no_show'
  }
};

for (const [actionPath, transition] of Object.entries(OPERATIONAL_STATUS_ACTIONS)) {
  router.patch(
    `/:appointmentId/${actionPath}`,
    authenticateToken,
    requireRoles(['dentist', 'clinic_admin', 'clinic_staff', 'clinic_manager', 'owner', 'manager', 'front_office', 'nurse', 'cashier', 'staff']),
    async (req, res) => {
      try {
        const appointmentBigInt = toBigInt(req.params.appointmentId, 'appointmentId');
        const userId = toBigInt(req.user.id, 'userId');
        const roles = req.user.roles || [];

        const appointment = await prisma.appointment.findUnique({
          where: { id: appointmentBigInt },
          include: {
            patient: {
              select: {
                id: true,
                name: true,
                email: true,
                phone_number: true,
                avatar_url: true
              }
            },
            dentist: {
              select: {
                id: true,
                name: true,
                email: true,
                phone_number: true,
                avatar_url: true
              }
            },
            clinicBranch: {
              select: {
                id: true,
                branchName: true,
                city: true,
                streetAddress: true,
                clinicProfileId: true
              }
            },
            statusHistory: {
              orderBy: { createdAt: 'desc' },
              take: 10
            },
            paymentIntents: {
              orderBy: { createdAt: 'desc' },
              take: 1
            }
          }
        });

        if (!appointment) {
          return sendError(res, 404, 'appointment_not_found', 'Janji temu tidak ditemukan atau sudah dihapus.');
        }

        const changedByRole = await authorizeAppointmentStatusUpdate({ appointment, userId, roles });

        if (appointment.status === transition.status) {
          return res.json({
            appointment: serializeAppointment(appointment),
            message: 'Status janji temu sudah sesuai.'
          });
        }

        if (!transition.allowedFrom.includes(appointment.status)) {
          return sendError(res, 409, 'cannot_update_status', `Janji temu dengan status ${appointment.status} tidak dapat diubah ke ${transition.status}.`);
        }

        let updatedAppointment;
        await prisma.$transaction(async (tx) => {
          updatedAppointment = await tx.appointment.update({
            where: { id: appointment.id },
            data: {
              status: transition.status,
              metadata: metadataWithStatusStamp(appointment.metadata, transition.status, userId)
            }
          });

          await recordStatusChange(tx, {
            appointmentId: appointment.id,
            previousStatus: appointment.status,
            newStatus: transition.status,
            changedBy: userId,
            changedByRole,
            reason: transition.reason,
            notes: req.body?.notes || null,
            metadata: {
              source: 'clinic_schedule',
              action: actionPath
            }
          });
        });

        const fullAppointment = await prisma.appointment.findUnique({
          where: { id: updatedAppointment.id },
          include: {
            patient: {
              select: {
                id: true,
                name: true,
                email: true,
                phone_number: true,
                avatar_url: true
              }
            },
            dentist: {
              select: {
                id: true,
                name: true,
                email: true,
                phone_number: true,
                avatar_url: true
              }
            },
            clinicBranch: {
              select: {
                id: true,
                branchName: true,
                city: true,
                streetAddress: true,
                clinicProfileId: true
              }
            },
            statusHistory: {
              orderBy: { createdAt: 'desc' },
              take: 10
            },
            paymentIntents: {
              orderBy: { createdAt: 'desc' },
              take: 1
            }
          }
        });

        emitAppointmentEvent({
          type: transition.eventType,
          appointmentId: appointment.id,
          payload: {
            previousStatus: appointment.status,
            status: transition.status,
            changedBy: userId.toString(),
            branchId: appointment.clinicBranchId?.toString?.() || null
          }
        }).catch((error) => {
          console.error('Failed to emit operational appointment event:', error);
        });

        emitAppointmentRealtimeUpdate(req, fullAppointment);

        return res.json({
          appointment: serializeAppointment(fullAppointment),
          message: 'Status janji temu diperbarui.'
        });
      } catch (error) {
        console.error(`Error updating appointment status via ${actionPath}:`, error);
        if (error.status) {
          return sendError(res, error.status, error.code || 'status_update_forbidden', error.message);
        }
        return sendError(res, 500, 'status_update_failed', 'Terjadi kesalahan saat mengubah status janji temu.');
      }
    }
  );
}

router.use('/', clinicalSummaryRouter);
router.use('/', videoRouter);

router.get(
  '/',
  authenticateToken,
  async (req, res) => {
    try {
      const userId = toBigInt(req.user.id, 'userId');
      const roles = req.user.roles || [];
      const requestedView = req.query.view;
      const defaultView = deriveDefaultView(roles);
      const view = requestedView || defaultView;

      if (!view) {
        return sendError(res, 403, 'forbidden', 'Peran Anda tidak memiliki akses ke daftar janji temu ini.');
      }

      const allowedViews = ['patient', 'dentist', 'clinic'];
      if (!allowedViews.includes(view)) {
        return sendError(res, 400, 'invalid_view', 'Parameter view tidak dikenal.');
      }

      if (view === 'patient' && !hasRole(roles, 'patient')) {
        return sendError(res, 403, 'forbidden', 'Anda harus masuk sebagai pasien untuk melihat daftar ini.');
      }

      if (view === 'dentist' && !hasRole(roles, 'dentist')) {
        return sendError(res, 403, 'forbidden', 'Akses dokter diperlukan untuk melihat daftar ini.');
      }

      let clinicContext = null;
      if (view === 'clinic') {
        if (!roles.some(isClinicRole)) {
          return sendError(res, 403, 'forbidden', 'Akses staf klinik diperlukan untuk melihat jadwal klinik.');
        }
        clinicContext = await resolveClinicStaffContext(userId);
        if (!clinicContext) {
          return sendError(res, 403, 'clinic_context_missing', 'Akun Anda belum terhubung dengan klinik mana pun.');
        }
      }

      const statuses = req.query.status
        ? String(req.query.status)
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
        : null;

      const limit = Math.min(parseInt(req.query.limit || '200', 10), 500);
      const includeHistory = req.query.includeHistory === 'true';
      const orderDirection = req.query.order === 'desc' ? 'desc' : 'asc';
      const search = req.query.q ? String(req.query.q).trim() : '';

      let from = null;
      let to = null;
      if (req.query.from) {
        from = new Date(req.query.from);
        if (Number.isNaN(from.getTime())) {
          return sendError(res, 400, 'invalid_from', 'Format parameter from tidak valid.');
        }
      }
      if (req.query.to) {
        to = new Date(req.query.to);
        if (Number.isNaN(to.getTime())) {
          return sendError(res, 400, 'invalid_to', 'Format parameter to tidak valid.');
        }
      }

      const where = {};

      if (view === 'patient') {
        where.patientId = userId;
      } else if (view === 'dentist') {
        where.dentistId = userId;
      } else if (view === 'clinic') {
        const isManageRole = roles.some(r =>
          ['owner', 'clinic_owner', 'manager', 'clinic_manager', 'admin', 'clinic_admin'].includes(r)
        );
        if (clinicContext.assignedBranchId && !isManageRole) {
          where.clinicBranchId = clinicContext.assignedBranchId;
        } else {
          where.clinicBranch = {
            clinicProfileId: clinicContext.clinicProfileId
          };
        }
      }

      if (statuses?.length) {
        where.status = { in: statuses };
      }

      if (from || to) {
        where.startsAt = {};
        if (from) {
          where.startsAt.gte = from;
        }
        if (to) {
          where.startsAt.lte = to;
        }
      }

      const andFilters = [];
      if (search) {
        andFilters.push({
          OR: [
            {
              patient: {
                name: { contains: search, mode: 'insensitive' }
              }
            },
            {
              dentist: {
                name: { contains: search, mode: 'insensitive' }
              }
            },
            {
              reason: { contains: search, mode: 'insensitive' }
            }
          ]
        });
      }

      if (andFilters.length) {
        where.AND = andFilters;
      }

      const appointments = await prisma.appointment.findMany({
        where,
        include: {
          preSessionHealthForm: true,
          patient: {
            select: {
              id: true,
              name: true,
              email: true,
              phone_number: true,
              avatar_url: true
            }
          },
          dentist: {
            select: {
              id: true,
              name: true,
              email: true,
              phone_number: true,
              avatar_url: true,
              dentistProfile: {
                take: 1,
                select: {
                  id: true,
                  title: true,
                  primarySpecialization: true,
                  dentist_type: true,
                  clinicName: true,
                  clinicAddress: true,
                  consultationFee: true
                }
              }
            }
          },
          clinicBranch: {
            select: {
              id: true,
              branchName: true,
              city: true,
              streetAddress: true,
              clinicProfileId: true
            }
          },
          paymentIntents: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              id: true,
              amount: true,
              status: true,
              provider: true,
              createdAt: true
            }
          },
          statusHistory: includeHistory
            ? {
              orderBy: { createdAt: 'desc' },
              take: 10
            }
            : false
        },
        orderBy: { startsAt: orderDirection },
        take: limit
      });

      // Map dentistProfile from nested dentist relation (it's an array, take first)
      const appointmentsWithProfile = appointments.map(apt => ({
        ...apt,
        dentistProfile: apt.dentist?.dentistProfile?.[0] || null
      }));

      const serialized = appointmentsWithProfile.map(serializeAppointment);
      const summary = serialized.reduce(
        (acc, item) => {
          acc.total += 1;
          acc.byStatus[item.status] = (acc.byStatus[item.status] || 0) + 1;
          return acc;
        },
        { total: 0, byStatus: {} }
      );

      return res.json({
        appointments: serialized,
        summary,
        view
      });
    } catch (error) {
      console.error('Error fetching appointments:', error);
      return sendError(res, 500, 'list_appointments_failed', 'Gagal memuat daftar janji temu.');
    }
  }
);

export default router;
