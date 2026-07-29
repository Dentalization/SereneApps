const idValue = (value) => value?.toString?.() || null;

function addressText(record = {}) {
  return [record.streetAddress, record.city, record.province, record.postalCode]
    .map((value) => (value === null || value === undefined ? '' : String(value).trim()))
    .filter(Boolean)
    .join(', ');
}

/**
 * Resolve the active clinic assignment for a dentist from ClinicStaff.
 * DentistProfile clinic fields are a compatibility mirror, never the authority.
 */
export async function resolveDentistClinicContext({ prismaClient, dentistUserId }) {
  if (!prismaClient || dentistUserId === null || dentistUserId === undefined) return null;

  const userId = BigInt(dentistUserId);
  const staff = await prismaClient.clinicStaff.findUnique({
    where: { userId },
    include: {
      clinicProfile: true,
      assignedBranch: true,
    },
  });

  if (!staff?.isActive || !staff.clinicProfile) return null;

  const assignedBranchBelongsToClinic = staff.assignedBranch
    && staff.assignedBranch.isActive
    && String(staff.assignedBranch.clinicProfileId) === String(staff.clinicProfileId);
  let branch = assignedBranchBelongsToClinic ? staff.assignedBranch : null;
  if (!branch) {
    branch = await prismaClient.clinicBranch.findFirst({
      where: {
        clinicProfileId: staff.clinicProfileId,
        isActive: true,
      },
      orderBy: [{ isMainBranch: 'desc' }, { createdAt: 'asc' }, { id: 'asc' }],
    });
  }

  const clinic = staff.clinicProfile;
  return {
    source: 'clinic_staff',
    staffId: idValue(staff.id),
    staffRole: staff.role,
    clinicProfileId: idValue(staff.clinicProfileId),
    clinicName: clinic.brandName || clinic.legalName,
    clinicLegalName: clinic.legalName,
    clinicStatus: clinic.status,
    branchId: idValue(branch?.id),
    branchName: branch?.branchName || null,
    branchCode: branch?.branchCode || null,
    clinicAddress: addressText(branch || clinic),
    operatingHours: branch?.operatingHours || clinic.operatingHours || null,
    timezone: clinic.timezone || 'Asia/Jakarta',
  };
}

/** Keep legacy DentistProfile classification aligned for older consumers. */
export async function syncDentistProfileClinicAssignment({ prismaClient, dentistUserId }) {
  if (!prismaClient || dentistUserId === null || dentistUserId === undefined) return null;

  const userId = BigInt(dentistUserId);
  const staff = await prismaClient.clinicStaff.findUnique({
    where: { userId },
    select: { clinicProfileId: true, isActive: true },
  });
  const clinicProfileId = staff?.isActive ? staff.clinicProfileId : null;

  await prismaClient.dentistProfile.updateMany({
    where: { userId },
    data: {
      clinic_id: clinicProfileId,
      dentist_type: clinicProfileId ? 'clinic' : 'independent',
    },
  });

  return {
    dentistType: clinicProfileId ? 'clinic' : 'independent',
    clinicProfileId: idValue(clinicProfileId),
  };
}

export const __testables = { addressText };
