import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const CLINIC_XCORE_ALLOWED_ROLES = new Set([
  'clinic_owner',
  'clinical_director',
  'authorized_clinic_doctor',
  'clinic_admin_xcore',
]);

function accessError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

export function toBigIntId(value, fieldName = 'id') {
  try {
    return BigInt(value);
  } catch {
    throw accessError(400, `Invalid ${fieldName}`);
  }
}

export function normalizeClinicXCoreRole(role) {
  if (role === 'owner') return 'clinic_owner';
  return CLINIC_XCORE_ALLOWED_ROLES.has(role) ? role : null;
}

export function sameBigInt(a, b) {
  return a !== null && a !== undefined && b !== null && b !== undefined && BigInt(a) === BigInt(b);
}

function uniqueBigIntValues(values) {
  const seen = new Set();
  const result = [];
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const key = value.toString();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(BigInt(value));
  }
  return result;
}

export function clinicIdsIntersect(left = [], right = []) {
  const rightKeys = new Set(right.map((value) => value.toString()));
  return left.some((value) => rightKeys.has(value.toString()));
}

export async function getClinicXCoreContext(user, { prismaClient = prisma } = {}) {
  const userId = toBigIntId(user?.id, 'userId');
  const staff = await prismaClient.clinicStaff.findUnique({
    where: { userId },
    select: {
      id: true,
      userId: true,
      role: true,
      isActive: true,
      clinicProfileId: true,
      assignedBranchId: true,
    },
  });

  const clinicRole = normalizeClinicXCoreRole(staff?.role);
  if (!staff?.isActive || !clinicRole) {
    throw accessError(403, 'X-Core clinic access requires an authorized active clinical role');
  }

  return {
    userId,
    staffId: staff.id,
    clinicRole,
    clinicProfileId: staff.clinicProfileId,
    assignedBranchId: staff.assignedBranchId,
  };
}

export async function activeDentistClinicIds(userId, { prismaClient = prisma } = {}) {
  const staff = await prismaClient.clinicStaff.findUnique({
    where: { userId: toBigIntId(userId, 'userId') },
    select: {
      role: true,
      isActive: true,
      clinicProfileId: true,
    },
  });

  if (staff?.isActive && staff.role === 'dentist' && staff.clinicProfileId) {
    return [staff.clinicProfileId];
  }
  return [];
}

export function clinicStudyScopeWhere(clinicProfileId) {
  return {
    OR: [
      { clinicId: clinicProfileId },
      {
        dentist: {
          clinicStaff: {
            isActive: true,
            role: 'dentist',
            clinicProfileId,
          },
        },
      },
      {
        dentist: {
          dentistProfile: {
            some: { clinic_id: clinicProfileId },
          },
        },
      },
    ],
  };
}

export function clinicStudyScopeWhereForClinicIds(clinicProfileIds = []) {
  if (clinicProfileIds.length === 0) {
    return { id: -1n };
  }

  return {
    OR: [
      { clinicId: { in: clinicProfileIds } },
      {
        dentist: {
          clinicStaff: {
            isActive: true,
            role: 'dentist',
            clinicProfileId: { in: clinicProfileIds },
          },
        },
      },
      {
        dentist: {
          dentistProfile: {
            some: { clinic_id: { in: clinicProfileIds } },
          },
        },
      },
    ],
  };
}

export const studyAccessInclude = {
  dentist: {
    select: {
      id: true,
      name: true,
      email: true,
      clinicStaff: {
        select: {
          role: true,
          isActive: true,
          clinicProfileId: true,
        },
      },
      dentistProfile: {
        select: {
          clinic_id: true,
        },
      },
    },
  },
};

export function clinicIdsForStudy(study) {
  return uniqueBigIntValues([
    study?.clinicId,
    study?.dentist?.clinicStaff?.isActive && study?.dentist?.clinicStaff?.role === 'dentist'
      ? study?.dentist?.clinicStaff?.clinicProfileId
      : null,
    ...(study?.dentist?.dentistProfile || []).map((profile) => profile.clinic_id),
  ]);
}

export function isStudyScopedToClinic(study, clinicProfileId) {
  return clinicIdsForStudy(study).some((id) => sameBigInt(id, clinicProfileId));
}

export async function requireXCoreStudyOwner({ studyId, user, prismaClient = prisma }) {
  const parsedStudyId = toBigIntId(studyId, 'studyId');
  const userId = toBigIntId(user?.id, 'userId');
  const study = await prismaClient.imagingStudy.findUnique({
    where: { id: parsedStudyId },
    include: studyAccessInclude,
  });

  if (!study) {
    throw accessError(404, 'Study not found');
  }

  if (!sameBigInt(study.dentistId, userId)) {
    throw accessError(403, 'You do not have permission to access this study');
  }

  return { study, userId, accessScope: 'owner' };
}

export async function requireXCoreStudyReadAccess({ studyId, user, prismaClient = prisma }) {
  const parsedStudyId = toBigIntId(studyId, 'studyId');
  const userId = toBigIntId(user?.id, 'userId');
  const study = await prismaClient.imagingStudy.findUnique({
    where: { id: parsedStudyId },
    include: {
      ...studyAccessInclude,
      dentistShares: {
        where: {
          recipientDentistId: userId,
          revokedAt: null,
        },
        select: { id: true },
      },
    },
  });

  if (!study) {
    throw accessError(404, 'Study not found');
  }

  if (sameBigInt(study.dentistId, userId)) {
    return { study, userId, accessScope: 'owner' };
  }

  const recipientClinicIds = await activeDentistClinicIds(userId, { prismaClient });
  if (
    study.dentistShares?.length > 0
    && recipientClinicIds.length > 0
    && clinicIdsIntersect(recipientClinicIds, clinicIdsForStudy(study))
  ) {
    return { study, userId, accessScope: 'shared_with_me' };
  }

  try {
    const clinicContext = await getClinicXCoreContext(user, { prismaClient });
    if (isStudyScopedToClinic(study, clinicContext.clinicProfileId)) {
      return { study, userId, clinicContext, accessScope: 'clinic' };
    }
  } catch (error) {
    if (error?.status !== 403) throw error;
  }

  throw accessError(403, 'You do not have permission to access this study');
}

export async function shareableClinicIdsForOwnedStudy({ studyId, user, prismaClient = prisma }) {
  const ownerAccess = await requireXCoreStudyOwner({ studyId, user, prismaClient });
  const ownerClinicIds = await activeDentistClinicIds(ownerAccess.userId, { prismaClient });
  const studyClinicIds = clinicIdsForStudy(ownerAccess.study);
  const shareableClinicIds = studyClinicIds.length > 0
    ? ownerClinicIds.filter((clinicId) => clinicIdsIntersect([clinicId], studyClinicIds))
    : ownerClinicIds;

  if (shareableClinicIds.length === 0) {
    throw accessError(403, 'Only active clinic dentists can share X-Core studies with same-clinic dentists');
  }

  return {
    ...ownerAccess,
    clinicIds: shareableClinicIds,
  };
}

export async function eligibleShareDentists({ clinicIds, ownerDentistId, prismaClient = prisma }) {
  return prismaClient.user.findMany({
    where: {
      id: { not: ownerDentistId },
      roles: { has: 'dentist' },
      clinicStaff: {
        isActive: true,
        role: 'dentist',
        clinicProfileId: { in: clinicIds },
      },
      dentistProfile: { some: {} },
    },
    select: {
      id: true,
      name: true,
      email: true,
      avatar_url: true,
      clinicStaff: {
        select: {
          clinicProfileId: true,
          assignedBranchId: true,
        },
      },
      dentistProfile: {
        select: {
          title: true,
          primarySpecialization: true,
          clinic_id: true,
        },
        take: 1,
      },
    },
    orderBy: [{ name: 'asc' }, { id: 'asc' }],
  });
}

export async function requireEligibleShareRecipient({
  recipientDentistId,
  clinicIds,
  ownerDentistId,
  prismaClient = prisma,
}) {
  const parsedRecipientId = toBigIntId(recipientDentistId, 'recipientDentistId');
  if (sameBigInt(parsedRecipientId, ownerDentistId)) {
    throw accessError(400, 'recipientDentistId must refer to another dentist');
  }

  const dentists = await eligibleShareDentists({ clinicIds, ownerDentistId, prismaClient });
  const recipient = dentists.find((dentist) => sameBigInt(dentist.id, parsedRecipientId));
  if (!recipient) {
    throw accessError(403, 'Recipient dentist must be active in the same clinic');
  }

  return recipient;
}

export function serializeEligibleDentist(dentist) {
  const profile = dentist.dentistProfile?.[0] || {};
  return {
    id: dentist.id.toString(),
    name: dentist.name,
    email: dentist.email,
    avatarUrl: dentist.avatar_url || null,
    title: profile.title || null,
    specialization: profile.primarySpecialization || null,
    clinicId: dentist.clinicStaff?.clinicProfileId?.toString?.() || null,
    assignedBranchId: dentist.clinicStaff?.assignedBranchId?.toString?.() || null,
  };
}

export function handleAccessError(res, error) {
  const status = error?.status || 500;
  const message = status === 500 ? 'Internal Server Error' : error.message;
  return res.status(status).json({ error: message });
}
