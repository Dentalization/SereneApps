export const CLINIC_ROLES = {
  OWNER: 'clinic_owner',
  ADMIN: 'clinic_admin',
  STAFF: 'clinic_staff'
};

const OWNER_ALIASES = new Set(['clinic_owner', 'owner']);
const ADMIN_ALIASES = new Set(['clinic_admin', 'manager', 'clinic_manager', 'admin']);
const STAFF_ALIASES = new Set(['clinic_staff', 'staff', 'front_office', 'nurse', 'cashier']);
const XCORE_CLINICAL_ALIASES = new Set(['clinical_director', 'authorized_clinic_doctor', 'clinic_admin_xcore']);

export function collectUserRoles(userOrRoles) {
  if (Array.isArray(userOrRoles)) {
    return [...new Set(userOrRoles.filter(Boolean))];
  }

  const user = userOrRoles || {};
  return [
    ...(user.roles || []),
    ...(user.effectiveRoles || []),
    user.role,
    user.clinicStaff?.role,
    user.clinic_staff?.role,
    user.profile?.role,
  ].filter(Boolean).filter((role, index, roles) => roles.indexOf(role) === index);
}

// UI-only role hints. Backend authorization is authoritative and resolves
// clinic staff membership from the database on every teledentistry request.
export function getClinicRole(user) {
  const roles = collectUserRoles(user);
  if (roles.some((role) => OWNER_ALIASES.has(role))) return CLINIC_ROLES.OWNER;
  if (roles.some((role) => ADMIN_ALIASES.has(role) || XCORE_CLINICAL_ALIASES.has(role))) return CLINIC_ROLES.ADMIN;
  if (roles.some((role) => STAFF_ALIASES.has(role))) return CLINIC_ROLES.STAFF;
  return null;
}

export const canObserveSessions = (role) => role === CLINIC_ROLES.OWNER;

export const canViewSummaries = (role) => (
  role === CLINIC_ROLES.OWNER || role === CLINIC_ROLES.ADMIN
);

export const canViewAppointments = (role) => Object.values(CLINIC_ROLES).includes(role);
