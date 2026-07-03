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
export const ENDO_DIFFICULTY_FACTOR_GROUPS = Object.freeze({
  patientConsiderations: Object.freeze([
    'medical_complexity',
    'anesthesia_difficulty',
    'limited_mouth_opening',
    'gag_reflex',
    'patient_cooperation_concern',
    'emergency_pain_or_swelling',
  ]),
  diagnosticConsiderations: Object.freeze([
    'unclear_pain_origin',
    'referred_pain_possible',
    'chronic_orofacial_pain_history',
    'multiple_teeth_possible',
    'conflicting_test_results',
  ]),
  radiographicConsiderations: Object.freeze([
    'difficult_to_interpret',
    'limited_radiographic_visibility',
    'suspected_extra_canal',
    'cbct_considered',
    'proximity_to_vital_structure',
  ]),
  toothMorphologyFactors: Object.freeze([
    'crown_morphology_complex',
    'tilted_or_rotated_tooth',
    'limited_isolation',
    'deep_restoration',
    'cracked_tooth_concern',
  ]),
  canalMorphologyFactors: Object.freeze([
    'curved_canal',
    'calcified_canal',
    'canal_not_visible',
    'c_shaped_canal',
    'open_apex',
    'long_root',
    'root_anomaly',
  ]),
  previousTreatmentFactors: Object.freeze([
    'previous_rct',
    'suspected_missed_canal',
    'poor_obturation',
    'coronal_leakage',
    'post_core_obstruction',
    'separated_instrument',
    'ledge_or_perforation_history',
  ]),
  perioEndoFactors: Object.freeze([
    'deep_periodontal_pocket',
    'furcation_involvement',
    'suspected_perio_endo_lesion',
    'mobility_concern',
  ]),
  traumaResorptionFactors: Object.freeze([
    'trauma_history',
    'internal_resorption',
    'external_resorption',
    'root_fracture_concern',
    'immature_open_apex',
  ]),
});
export const ENDO_RADIOGRAPH_EVIDENCE_TYPES = Object.freeze([
  'preoperative',
  'working_length',
  'master_cone',
  'obturation',
  'follow_up',
  'cbct',
]);

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
