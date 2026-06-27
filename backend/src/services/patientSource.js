const CLINIC_WALK_IN_SOURCES = new Set([
  'clinic_billing',
  'clinic_created',
  'clinic_walk_in',
  'walk_in'
]);

const DENTIST_ADDED_SOURCES = new Set([
  'clinic_added',
  'dentist_added',
  'dentist_portal'
]);

const MOBILE_SOURCES = new Set([
  'mobile',
  'patient_mobile',
  'serene_mobile',
  'standard_booking'
]);

const SOURCE_DETAILS = {
  clinic_walk_in: { id: 'clinic_walk_in', label: 'Walk-in Klinik' },
  clinic_added: { id: 'clinic_added', label: 'Ditambahkan Dokter' },
  serene_mobile: { id: 'serene_mobile', label: 'Serene Mobile' },
  unknown: { id: 'unknown', label: 'Sumber tidak tercatat' }
};

function sourceCandidates(metadata) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return [];
  return [
    metadata.patientSource,
    metadata.source,
    metadata.createdFrom,
    metadata.channel
  ]
    .map((value) => String(value || '').trim().toLowerCase())
    .filter(Boolean);
}

function classifyCandidate(candidate) {
  if (CLINIC_WALK_IN_SOURCES.has(candidate)) return 'clinic_walk_in';
  if (DENTIST_ADDED_SOURCES.has(candidate)) return 'clinic_added';
  if (MOBILE_SOURCES.has(candidate)) return 'serene_mobile';
  if (candidate.includes('dentist_portal_patient_directory')) return 'clinic_added';
  return null;
}

export function resolvePatientSource({ appointments = [], medicalDetails = null } = {}) {
  const profileSource = sourceCandidates(medicalDetails)
    .map(classifyCandidate)
    .find(Boolean);
  if (profileSource) return { ...SOURCE_DETAILS[profileSource] };

  for (const appointment of appointments) {
    const resolved = sourceCandidates(appointment?.metadata)
      .map(classifyCandidate)
      .find(Boolean);
    if (resolved) return { ...SOURCE_DETAILS[resolved] };
  }

  return { ...SOURCE_DETAILS.unknown };
}

