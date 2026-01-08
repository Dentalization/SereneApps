import express from 'express';
import { authenticateToken, requireRoles } from '../utils/tokens.js';
import { PrismaClient } from '../generated/prisma/index.js';
import { appointmentConfig, millisecondsFromHours } from '../services/appointments/config.js';
import { recordStatusChange } from '../services/appointments/audit.js';
import { emitAppointmentEvent } from '../services/communications.js';

const router = express.Router();
const prisma = new PrismaClient();

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
    avatar: user.avatar_url ?? user.avatarUrl ?? null,
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
  
  // Get appointment type from metadata or determine from videoRoomRef
  const metadata = appointment.metadata || {};
  const appointmentType = metadata.appointmentType || (appointment.videoRoomRef ? 'virtual' : 'onsite');
  
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
    startsAt: toIsoString(appointment.startsAt ?? appointment.starts_at),
    endsAt: toIsoString(appointment.endsAt ?? appointment.ends_at),
    status: appointment.status,
    appointmentType, // 'virtual' or 'onsite'
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
    statusHistory: appointment.statusHistory ? serializeHistory(appointment.statusHistory) : undefined,
    payment: latestPayment ? {
      id: latestPayment.id?.toString?.() ?? null,
      amount: latestPayment.amount,
      status: latestPayment.status,
      provider: latestPayment.provider || null,
      createdAt: toIsoString(latestPayment.createdAt)
    } : null
  };
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
      clinicProfileId: true,
      assignedBranchId: true
    }
  });
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
      appointmentType // 'virtual' or 'onsite'
    } = req.body || {};

    try {
    if (!dentistIdRaw) {
      return sendError(res, 400, 'dentist_id_required', 'Pilih dokter gigi yang tersedia sebelum membuat janji temu.');
    }
    if (!start || !end) {
      return sendError(res, 400, 'time_required', 'Waktu mulai dan selesai janji temu wajib diisi.');
    }

      // dentistIdRaw from mobile is the DentistProfile.id, we need to get the User.id
      const dentistProfileId = toBigInt(dentistIdRaw, 'dentistId');
      const clinicBranchId = clinicBranchIdRaw ? toBigInt(clinicBranchIdRaw, 'clinicBranchId') : null;
      
      // Look up the dentist profile to get the actual user_id and practice type
      const dentistProfile = await prisma.dentistProfile.findUnique({
        where: { id: dentistProfileId },
        select: { userId: true, dentist_type: true, clinic_id: true }
      });
      
      if (!dentistProfile) {
        return sendError(res, 404, 'dentist_not_found', 'Dokter gigi tidak ditemukan.');
      }
      
      const dentistId = dentistProfile.userId;
      const dentistType = dentistProfile.dentist_type || 'clinic';
      
      if (dentistId === patientId) {
        return sendError(res, 400, 'self_booking_not_allowed', 'Pasien tidak dapat membuat janji dengan dirinya sendiri.');
      }

      // Resolve clinic branch to avoid writing inconsistent foreign keys
      let resolvedClinicBranchId = null;
      if (dentistType !== 'independent') {
        // First, treat incoming value as a branch id
        if (clinicBranchId) {
          const branchById = await prisma.clinicBranch.findUnique({
            where: { id: clinicBranchId },
            select: { id: true, clinicProfileId: true, isActive: true, isMainBranch: true }
          });
          if (branchById && branchById.isActive) {
            resolvedClinicBranchId = branchById.id;
          } else {
            // If not a branch id, try interpreting as clinic_profile_id
            const branchByProfile = await prisma.clinicBranch.findFirst({
              where: { clinicProfileId: clinicBranchId, isActive: true },
              orderBy: [{ isMainBranch: 'desc' }, { id: 'asc' }]
            });
            if (branchByProfile) {
              resolvedClinicBranchId = branchByProfile.id;
            }
          }
        }

        // Fallback to dentist profile's clinic if no branch provided or resolved
        if (!resolvedClinicBranchId && dentistProfile.clinic_id) {
          const branchFromProfile = await prisma.clinicBranch.findFirst({
            where: { clinicProfileId: dentistProfile.clinic_id, isActive: true },
            orderBy: [{ isMainBranch: 'desc' }, { id: 'asc' }]
          });
          if (branchFromProfile) {
            resolvedClinicBranchId = branchFromProfile.id;
          }
        }

        if (!resolvedClinicBranchId) {
          return sendError(res, 400, 'clinic_branch_required', 'Cabang klinik diperlukan untuk janji temu dokter klinik.');
        }
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
        return sendError(res, 400, 'cannot_book_past', 'Janji temu tidak bisa dijadwalkan pada waktu yang sudah lewat.');
      }

      let createdAppointment;
      await prisma.$transaction(async (tx) => {
        // Use dentistId as bigint for advisory lock
        await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock($1::bigint)', dentistId);

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
          const slotError = new Error('SLOT_TAKEN');
          slotError.code = 'slot_taken';
          throw slotError;
        }

        createdAppointment = await tx.appointment.create({
          data: {
            dentistId,
            patientId,
            clinicBranchId: resolvedClinicBranchId,
            startsAt,
            endsAt,
            status: 'scheduled',
            reason: reason || null,
            notes: notes || null,
            metadata: {
              appointmentType: appointmentType || 'onsite' // 'virtual' or 'onsite'
            }
          }
        });

        await recordStatusChange(tx, {
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
      });

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

      return res.status(201).json(responsePayload);
    } catch (error) {
      if (error.code === 'slot_taken' || error.message === 'SLOT_TAKEN') {
        return sendError(res, 409, 'slot_taken', 'Waktu yang dipilih baru saja terisi. Silakan pilih slot lain.');
      }
      if (error.message && error.message.startsWith('INVALID_')) {
        return sendError(res, 400, 'invalid_payload', 'Data permintaan tidak valid. Periksa kembali formulir Anda.');
      }
      console.error('Error creating appointment:', error);
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
  requireRoles(['patient']),
  async (req, res) => {
    try {
      const { appointmentId } = req.params;
      const appointmentBigInt = toBigInt(appointmentId, 'appointmentId');
      const { reason } = req.body || {};

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

      const userId = toBigInt(req.user.id, 'userId');
      if (appointment.patientId !== userId) {
        return sendError(res, 403, 'forbidden', 'Anda tidak diizinkan membatalkan janji temu ini.');
      }

      if (!PATIENT_MANAGEABLE_STATUSES.includes(appointment.status)) {
        return sendError(res, 409, 'cannot_cancel_status', 'Janji temu dalam status ini tidak dapat dibatalkan.');
      }

      const now = new Date();
      const timeUntilAppointment = appointment.startsAt.getTime() - now.getTime();
      if (timeUntilAppointment < millisecondsFromHours(appointmentConfig.cancelCutoffHours)) {
        return sendError(res, 400, 'cancel_window_elapsed', 'Pembatalan hanya diperbolehkan hingga beberapa jam sebelum janji.');
      }

      const latestIntent = appointment.paymentIntents?.[0];
      const cancellationFee =
        appointmentConfig.cancellationFeePercent > 0 && latestIntent?.amount
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
              cancelledBy: userId.toString()
            }
          }
        });

        await recordStatusChange(tx, {
          appointmentId: appointment.id,
          previousStatus: appointment.status,
          newStatus: 'cancelled',
          changedBy: userId,
          changedByRole: STATUS_TRANSITION_ROLES.patient,
          reason: 'patient_cancelled',
          metadata: {
            cancellationFee,
            reason: reason || null
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
          cancellationFee
        }
      }).catch((error) => {
        console.error('Failed to emit cancellation event:', error);
      });

      return res.json({ appointment: serializeAppointment(fullAppointment) });
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      return sendError(res, 500, 'cancel_failed', 'Terjadi kesalahan saat membatalkan janji temu.');
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
          }
        }
      });

      if (!appointment) {
        return sendError(res, 404, 'appointment_not_found', 'Janji temu tidak ditemukan atau sudah dihapus.');
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
  requireRoles(['dentist', 'clinic_admin', 'clinic_staff', 'clinic_manager', 'owner', 'manager', 'front_office']),
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

      // If user is dentist, verify it's their appointment
      if (roles.includes('dentist') && appointment.dentistId !== userId) {
        return sendError(res, 403, 'forbidden', 'Anda hanya dapat mengkonfirmasi janji temu Anda sendiri.');
      }

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
            metadata: {
              ...(appointment.metadata && typeof appointment.metadata === 'object' ? appointment.metadata : {}),
              confirmedAt: new Date(),
              confirmedBy: userId.toString()
            }
          }
        });

        await recordStatusChange(tx, {
          appointmentId: appointment.id,
          previousStatus: appointment.status,
          newStatus: 'confirmed',
          changedBy: userId,
          changedByRole: roles.includes('dentist') ? STATUS_TRANSITION_ROLES.dentist : STATUS_TRANSITION_ROLES.staff,
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

      return res.json({ 
        appointment: serializeAppointment(fullAppointment),
        message: 'Janji temu berhasil dikonfirmasi.'
      });
    } catch (error) {
      console.error('Error confirming appointment:', error);
      return sendError(res, 500, 'confirm_failed', 'Terjadi kesalahan saat mengkonfirmasi janji temu.');
    }
  }
);

export default router;
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
        if (clinicContext.assignedBranchId) {
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
