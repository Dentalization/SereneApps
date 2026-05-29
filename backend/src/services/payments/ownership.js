export const FINANCIAL_OWNER_TYPES = Object.freeze({
  CLINIC: 'clinic',
  INDEPENDENT_DENTIST: 'dentist'
});

export const FINANCIAL_OWNER_TYPE_ALIASES = Object.freeze({
  clinic: FINANCIAL_OWNER_TYPES.CLINIC,
  CLINIC: FINANCIAL_OWNER_TYPES.CLINIC,
  independent_dentist: FINANCIAL_OWNER_TYPES.INDEPENDENT_DENTIST,
  INDEPENDENT_DENTIST: FINANCIAL_OWNER_TYPES.INDEPENDENT_DENTIST,
  dentist: FINANCIAL_OWNER_TYPES.INDEPENDENT_DENTIST,
  DENTIST: FINANCIAL_OWNER_TYPES.INDEPENDENT_DENTIST
});

function nullableBigIntLike(value) {
  return value === undefined || value === null || value === '' ? null : value;
}

function ownerIdComparable(value) {
  const normalized = nullableBigIntLike(value);
  return normalized === null ? null : String(normalized);
}

export function normalizeFinancialOwnerType(ownerType) {
  if (ownerType === undefined || ownerType === null || ownerType === '') return null;
  const normalized = FINANCIAL_OWNER_TYPE_ALIASES[String(ownerType)];
  if (!normalized) {
    const error = new Error(`Unsupported financial owner type: ${ownerType}`);
    error.code = 'UNSUPPORTED_FINANCIAL_OWNER_TYPE';
    throw error;
  }
  return normalized;
}

function resolveClinicOwnerId(appointment = {}) {
  return nullableBigIntLike(
    appointment.ownerClinicId ??
    appointment.owner_clinic_id ??
    appointment.clinicBranch?.clinicProfileId ??
    appointment.clinic_branch?.clinic_profile_id ??
    appointment.clinicBranch?.clinic_profile_id
  );
}

function hasClinicAppointmentSignal(appointment = {}) {
  return Boolean(
    nullableBigIntLike(appointment.clinicBranchId ?? appointment.clinic_branch_id) ||
    nullableBigIntLike(appointment.ownerClinicId ?? appointment.owner_clinic_id) ||
    nullableBigIntLike(appointment.clinicBranch?.clinicProfileId ?? appointment.clinic_branch?.clinic_profile_id)
  );
}

export function assertResolvedFinancialOwner(owner) {
  const ownerType = normalizeFinancialOwnerType(owner?.ownerType);
  const ownerClinicId = nullableBigIntLike(owner?.ownerClinicId);
  const ownerDentistId = nullableBigIntLike(owner?.ownerDentistId);

  if (!ownerType) {
    const error = new Error('Financial owner type is required');
    error.code = 'FINANCIAL_OWNER_TYPE_REQUIRED';
    throw error;
  }

  if (ownerType === FINANCIAL_OWNER_TYPES.CLINIC) {
    if (!ownerClinicId || ownerDentistId) {
      const error = new Error('Clinic-owned payments must have exactly one clinic owner and no dentist owner');
      error.code = 'INVALID_CLINIC_FINANCIAL_OWNER';
      throw error;
    }
  }

  if (ownerType === FINANCIAL_OWNER_TYPES.INDEPENDENT_DENTIST) {
    if (!ownerDentistId || ownerClinicId) {
      const error = new Error('Independent dentist-owned payments must have exactly one dentist owner and no clinic owner');
      error.code = 'INVALID_DENTIST_FINANCIAL_OWNER';
      throw error;
    }
  }

  return {
    ownerType,
    ownerClinicId: ownerType === FINANCIAL_OWNER_TYPES.CLINIC ? ownerClinicId : null,
    ownerDentistId: ownerType === FINANCIAL_OWNER_TYPES.INDEPENDENT_DENTIST ? ownerDentistId : null
  };
}

export function assertFinancialOwnershipImmutable(existingOwner, nextData = {}) {
  const ownershipKeys = ['ownerType', 'owner_type', 'ownerClinicId', 'owner_clinic_id', 'ownerDentistId', 'owner_dentist_id'];
  const attemptsOwnershipChange = ownershipKeys.some((key) => Object.prototype.hasOwnProperty.call(nextData || {}, key));
  if (!attemptsOwnershipChange) return true;

  const existing = {
    ownerType: normalizeFinancialOwnerType(existingOwner?.ownerType ?? existingOwner?.owner_type),
    ownerClinicId: ownerIdComparable(existingOwner?.ownerClinicId ?? existingOwner?.owner_clinic_id),
    ownerDentistId: ownerIdComparable(existingOwner?.ownerDentistId ?? existingOwner?.owner_dentist_id)
  };
  const next = {
    ownerType: normalizeFinancialOwnerType(nextData.ownerType ?? nextData.owner_type ?? existing.ownerType),
    ownerClinicId: ownerIdComparable(nextData.ownerClinicId ?? nextData.owner_clinic_id ?? existing.ownerClinicId),
    ownerDentistId: ownerIdComparable(nextData.ownerDentistId ?? nextData.owner_dentist_id ?? existing.ownerDentistId)
  };

  if (
    existing.ownerType !== next.ownerType ||
    existing.ownerClinicId !== next.ownerClinicId ||
    existing.ownerDentistId !== next.ownerDentistId
  ) {
    const error = new Error('Financial ownership is immutable after payment creation');
    error.code = 'FINANCIAL_OWNERSHIP_IMMUTABLE';
    error.status = 409;
    throw error;
  }

  return true;
}

export function resolvePaymentOwner(appointment = {}) {
  const explicitOwnerType = normalizeFinancialOwnerType(appointment.ownerType ?? appointment.owner_type);
  const ownerType = explicitOwnerType || (
    hasClinicAppointmentSignal(appointment)
      ? FINANCIAL_OWNER_TYPES.CLINIC
      : FINANCIAL_OWNER_TYPES.INDEPENDENT_DENTIST
  );

  const ownerClinicId = ownerType === FINANCIAL_OWNER_TYPES.CLINIC
    ? resolveClinicOwnerId(appointment)
    : null;
  const ownerDentistId = ownerType === FINANCIAL_OWNER_TYPES.INDEPENDENT_DENTIST
    ? nullableBigIntLike(appointment.ownerDentistId ?? appointment.owner_dentist_id ?? appointment.dentistId ?? appointment.dentist_id)
    : null;

  return assertResolvedFinancialOwner({
    ownerType,
    ownerClinicId,
    ownerDentistId
  });
}
