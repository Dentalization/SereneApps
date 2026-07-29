/**
 * PHI-safe realtime invalidation for data shared by clinic and dentist portals.
 * Socket messages never contain names, contact data, notes, diagnoses, files,
 * treatment contents, or money. Receivers must refetch through a scoped API.
 */

const idValue = (value) => value?.toString?.() || null;

export function emitPortalInvalidation({
  io,
  eventName,
  entity,
  entityId = null,
  status = null,
  action = null,
  hasInvoice = null,
  patientId = null,
  dentistId = null,
  clinicProfileId = null,
  clinicProfileIds = [],
}) {
  if (!io || !eventName || !entity) return false;

  const rooms = new Set();
  if (patientId) rooms.add(`user:${idValue(patientId)}`);
  if (dentistId) rooms.add(`user:${idValue(dentistId)}`);
  if (clinicProfileId) rooms.add(`clinic:${idValue(clinicProfileId)}`);
  for (const clinicId of clinicProfileIds || []) {
    if (clinicId) rooms.add(`clinic:${idValue(clinicId)}`);
  }
  if (rooms.size === 0) return false;

  const payload = {
    entity,
    eventName,
    entityId: idValue(entityId),
    status: status || null,
    action: action || null,
    ...(typeof hasInvoice === 'boolean' ? { hasInvoice } : {}),
    occurredAt: new Date().toISOString(),
  };
  const [firstRoom, ...remainingRooms] = rooms;
  let audience = io.to(firstRoom);
  remainingRooms.forEach((room) => { audience = audience.to(room); });
  audience.emit(eventName, payload);
  return true;
}

export async function resolveClinicalCollaborationClinicIds({
  prismaClient,
  dentistId,
  patientId,
}) {
  if (!prismaClient || !dentistId || !patientId) return [];
  const appointments = await prismaClient.appointment.findMany({
    where: {
      dentistId: BigInt(dentistId),
      patientId: BigInt(patientId),
    },
    select: {
      ownerClinicId: true,
      clinicBranch: { select: { clinicProfileId: true } },
    },
    orderBy: { startsAt: 'desc' },
    take: 100,
  });
  const ids = new Map();
  appointments.forEach((appointment) => {
    const clinicId = appointment.ownerClinicId || appointment.clinicBranch?.clinicProfileId;
    if (clinicId) ids.set(clinicId.toString(), clinicId);
  });
  return [...ids.values()];
}

export async function emitClinicalPortalInvalidation({
  prismaClient,
  io,
  eventName,
  entity,
  entityId,
  action,
  status,
  dentistId,
  patientId,
}) {
  let clinicProfileIds = [];
  try {
    clinicProfileIds = await resolveClinicalCollaborationClinicIds({
      prismaClient,
      dentistId,
      patientId,
    });
  } catch {
    // The mutation has already succeeded. User-room invalidation must continue
    // even if optional clinic audience discovery is temporarily unavailable.
  }
  return emitPortalInvalidation({
    io,
    eventName,
    entity,
    entityId,
    action,
    status,
    dentistId,
    patientId,
    clinicProfileIds,
  });
}
