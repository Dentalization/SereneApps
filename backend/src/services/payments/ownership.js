export function resolvePaymentOwner(appointment = {}) {
  const ownerType = appointment.ownerType ?? appointment.owner_type ?? (appointment.clinicBranchId || appointment.clinic_branch_id ? 'clinic' : 'dentist');
  const ownerClinicId = appointment.ownerClinicId ?? appointment.owner_clinic_id ?? null;
  const ownerDentistId = ownerType === 'dentist'
    ? (appointment.dentistId ?? appointment.dentist_id ?? null)
    : null;

  return {
    ownerType,
    ownerClinicId,
    ownerDentistId
  };
}
