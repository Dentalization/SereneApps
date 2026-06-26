const normalizeDate = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const VITAL_UNITS = {
  bloodPressure: 'mmHg',
  heartRate: 'bpm',
  temperature: '°C',
  spo2: '%',
};

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const formatVitalWithUnit = (field, value) => {
  const unit = VITAL_UNITS[field];
  const raw = value == null ? '' : String(value).trim();
  if (!raw || raw === '-') return '-';
  if (!unit) return raw;
  const withoutUnit = raw.replace(new RegExp(`\\s*${escapeRegExp(unit)}\\s*$`, 'i'), '').trim();
  let sanitized = withoutUnit;
  if (field === 'bloodPressure') {
    sanitized = withoutUnit
      .replace(/[^\d/]/g, '')
      .replace(/\/+/g, '/')
      .replace(/^\/+/, '')
      .split('/')
      .slice(0, 2)
      .join('/');
  } else if (field === 'temperature') {
    const normalized = withoutUnit.replace(',', '.').replace(/[^\d.]/g, '');
    const [whole, ...decimalParts] = normalized.split('.');
    sanitized = decimalParts.length ? `${whole}.${decimalParts.join('')}` : whole;
  } else {
    sanitized = withoutUnit.replace(/\D/g, '');
  }
  return sanitized ? `${sanitized} ${unit}` : '-';
};

export const splitLines = (text) =>
  text
    ? String(text)
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
    : [];

export const calculateAge = (dob) => {
  if (!dob) return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age;
};

const buildDocuments = (formData = {}) => {
  if (formData.consentFile) {
    return [
      {
        type: 'Informed Consent',
        name: formData.consentFile.name,
      },
    ];
  }
  if (formData.visitType === 'teledentistry') {
    return [
      {
        type: 'Digital Consent',
        name: 'Mobile signing pending',
      },
    ];
  }
  return [];
};

export const buildEmrPayload = (formData = {}, options = {}) => {
  const treatmentPlan = splitLines(formData.plan);
  const proceduresList = splitLines(formData.procedures).map((procedure) => ({
    label: procedure,
    icd9: formData.icd9 || 'N/A',
    status: 'Planned',
  }));
  const medications = splitLines(formData.medications).map((med) => ({
    name: med,
    dosage: '',
  }));
  const kieNotes = splitLines(formData.kie);
  const now = new Date();
  const isoTimestamp = now.toISOString();
  const visitDate = formData.dateOfVisit || formData.lastVisit || isoTimestamp.slice(0, 10);
  const vitals = formData.vitals || {};

  return {
    ...(options.id ? { id: options.id } : {}),
    ...(options.patientUserId ? { patientUserId: String(options.patientUserId) } : {}),
    rmNumber: formData.rmNumber || options.rmNumber || `RM-${Date.now()}`,
    nik: formData.nik,
    name: formData.patientName,
    patientName: formData.patientName,
    gender: formData.gender || 'N/A',
    dob: formData.dob,
    age: calculateAge(formData.dob),
    lastVisit: visitDate,
    lastUpdated: isoTimestamp,
    visitType: formData.visitType || 'in-clinic',
    alerts: {
      allergies: splitLines(formData.allergies),
      systemic: splitLines(formData.systemic),
    },
    medicalDetails: {
      allergies: splitLines(formData.allergies),
      chronicConditions: splitLines(formData.systemic),
      medications: splitLines(formData.medications),
      notes: formData.medicalHistory,
    },
    chiefComplaint: formData.chiefComplaint,
    medicalHistory: formData.medicalHistory,
    vitals: {
      bloodPressure: formatVitalWithUnit('bloodPressure', vitals.bloodPressure),
      heartRate: formatVitalWithUnit('heartRate', vitals.heartRate),
      temperature: formatVitalWithUnit('temperature', vitals.temperature),
      spo2: formatVitalWithUnit('spo2', vitals.spo2),
    },
    vitalUnits: VITAL_UNITS,
    extraOral: [],
    intraOral: [],
    diagnoses: {
      working: formData.diagnosis || 'Pending',
      icd10: formData.icd10 || 'N/A',
    },
    plan: {
      treatmentPlan,
      procedures: proceduresList,
      medications,
      kie: kieNotes,
    },
    odontogramMarks: Array.isArray(formData.odontogramMarks) ? formData.odontogramMarks : [],
    documents: buildDocuments(formData),
    consent: {
      status:
        formData.visitType === 'in-clinic'
          ? formData.consentFile
            ? `Uploaded ${formData.consentFile.name}`
            : 'Awaiting upload'
          : 'Saved to EMR - mobile signing pending',
      witness: formData.visitType === 'in-clinic' ? 'Clinic Staff' : 'SereneAI System',
      workflow: formData.visitType === 'in-clinic' ? 'in-clinic-upload' : 'teledentistry-mobile-pending',
      mobileSigningAvailable: formData.visitType === 'in-clinic' ? null : false,
    },
    doctorSignature: 'Pending Signature',
  };
};

export const formatDateLabel = (value, fallback = '-') => {
  const date = normalizeDate(value);
  if (!date) {
    return value || fallback;
  }
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const formatDateTimeLabel = (value, fallback = '-') => {
  const date = normalizeDate(value);
  if (!date) {
    return value || fallback;
  }
  return date.toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};
