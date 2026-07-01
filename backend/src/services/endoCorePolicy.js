import { specialistWorkspaceError, specialistWorkspaceId } from './specialistWorkspaceAuthorization.js';

export const ENDO_FDI_TEETH = Object.freeze([
  '18', '17', '16', '15', '14', '13', '12', '11',
  '21', '22', '23', '24', '25', '26', '27', '28',
  '38', '37', '36', '35', '34', '33', '32', '31',
  '41', '42', '43', '44', '45', '46', '47', '48',
]);
export const ENDO_DIAGNOSTIC_TEST_TYPES = Object.freeze([
  'cold', 'percussion', 'palpation', 'mobility', 'probing',
]);
export const ENDO_TREATMENT_STAGE_TYPES = Object.freeze([
  'assessment', 'access', 'working_length', 'cleaning_shaping',
  'medication', 'obturation', 'restoration', 'follow_up',
]);
export const ENDO_STAGE_STATUSES = Object.freeze([
  'planned', 'in_progress', 'completed', 'skipped',
]);
export const ENDO_DIFFICULTY_LEVELS = Object.freeze(['low', 'moderate', 'high']);

export function requireAllowed(value, allowed, code, message = code) {
  if (!allowed.includes(value)) throw specialistWorkspaceError(400, code, message);
  return value;
}

export function parseOptionalDate(value, fieldName) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw specialistWorkspaceError(400, `invalid_${fieldName}`, `Invalid ${fieldName}.`);
  }
  return parsed;
}

export async function requireEndoCase(
  prismaClient,
  user,
  caseId,
  { editable = false } = {},
) {
  const id = specialistWorkspaceId(caseId, 'case_id');
  const specialistCase = await prismaClient.specialistCase.findUnique({
    where: { id },
    include: { endoCaseDetail: true },
  });
  if (!specialistCase || specialistCase.caseType !== 'endodontic') {
    throw specialistWorkspaceError(404, 'endo_case_not_found');
  }
  const dentistId = specialistWorkspaceId(user?.id ?? user?.userId, 'user_id');
  if (!Array.isArray(user?.roles) || !user.roles.includes('dentist') || specialistCase.dentistId !== dentistId) {
    throw specialistWorkspaceError(403, 'endo_case_access_denied');
  }
  if (editable && !['draft', 'active'].includes(specialistCase.status)) {
    throw specialistWorkspaceError(409, 'endo_case_not_editable');
  }
  return specialistCase;
}

