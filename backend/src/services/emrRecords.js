import { randomUUID } from 'crypto';
import { query } from '../db.js';

let schemaReadyPromise = null;
const ensureSchema = async () => {
  if (schemaReadyPromise) return schemaReadyPromise;
  schemaReadyPromise = (async () => {
    await query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        IF NEW IS NULL THEN
          RETURN NEW;
        END IF;
        NEW.updated_at = now();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS dentist_emr_records (
        id VARCHAR(64) PRIMARY KEY,
        dentist_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        patient_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
        payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await query(`
      ALTER TABLE dentist_emr_records
        ADD COLUMN IF NOT EXISTS patient_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_dentist_emr_records_dentist
      ON dentist_emr_records (dentist_id, updated_at DESC)
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_dentist_emr_records_patient
      ON dentist_emr_records (patient_user_id)
    `);
    await query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_trigger WHERE tgname = 'update_dentist_emr_records_updated_at'
        ) THEN
          CREATE TRIGGER update_dentist_emr_records_updated_at
          BEFORE UPDATE ON dentist_emr_records
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        END IF;
      END $$;
    `);
  })().catch((error) => {
    schemaReadyPromise = null;
    throw error;
  });
  return schemaReadyPromise;
};

const ensureObject = (value) =>
  value && typeof value === 'object' && !Array.isArray(value) ? value : {};

const ensureArray = (value) => (Array.isArray(value) ? value : []);

const VITAL_UNITS = Object.freeze({
  bloodPressure: 'mmHg',
  heartRate: 'bpm',
  temperature: '°C',
  spo2: '%',
});

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeVitalValue = (field, value) => {
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

const normalizeVitals = (vitals) => {
  const obj = ensureObject(vitals);
  return {
    bloodPressure: normalizeVitalValue('bloodPressure', obj.bloodPressure),
    heartRate: normalizeVitalValue('heartRate', obj.heartRate),
    temperature: normalizeVitalValue('temperature', obj.temperature),
    spo2: normalizeVitalValue('spo2', obj.spo2),
  };
};

const toTrimmedStrings = (value) =>
  ensureArray(value)
    .map((item) => (item == null ? '' : String(item).trim()))
    .filter(Boolean);

const normalizeProcedures = (items) =>
  ensureArray(items).map((item) => ({
    label: item?.label ?? (typeof item === 'string' ? item : ''),
    icd9: item?.icd9 ?? 'N/A',
    status: item?.status ?? 'Planned',
  }));

const normalizeMedications = (items) =>
  ensureArray(items).map((item) => ({
    name: item?.name ?? (typeof item === 'string' ? item : ''),
    dosage: item?.dosage ?? '',
  }));

const normalizeMarks = (marks) =>
  ensureArray(marks)
    .map((mark) => ({
      code: mark?.code ? String(mark.code).toUpperCase() : null,
      pos: mark?.pos ? String(mark.pos).toUpperCase() : null,
    }))
    .filter((mark) => Boolean(mark.code) && Boolean(mark.pos));

const normalizePlan = (plan) => {
  const obj = ensureObject(plan);
  return {
    treatmentPlan: toTrimmedStrings(obj.treatmentPlan),
    procedures: normalizeProcedures(obj.procedures),
    medications: normalizeMedications(obj.medications),
    kie: toTrimmedStrings(obj.kie),
  };
};

const normalizeAlerts = (alerts, medicalDetails) => {
  const alertObj = ensureObject(alerts);
  const medDetails = ensureObject(medicalDetails);
  return {
    allergies: toTrimmedStrings(alertObj.allergies?.length ? alertObj.allergies : medDetails.allergies),
    systemic: toTrimmedStrings(alertObj.systemic?.length ? alertObj.systemic : medDetails.chronicConditions),
  };
};

const EMR_RECORD_SELECT = `
  SELECT r.id,
         r.dentist_id,
         r.patient_user_id,
         r.payload,
         r.created_at,
         r.updated_at,
         d.name AS dentist_name,
         COALESCE(d.avatar_url, dp.avatar_url) AS dentist_avatar
  FROM dentist_emr_records r
  JOIN users d ON d.id = r.dentist_id
  LEFT JOIN LATERAL (
    SELECT avatar_url
    FROM dentist_profiles
    WHERE user_id = d.id
    ORDER BY id ASC
    LIMIT 1
  ) dp ON TRUE
`;

const buildDentistAudit = (row) => {
  if (!row?.dentist_id) return null;
  return {
    id: row.dentist_id.toString(),
    name: row.dentist_name || 'Unknown Dentist',
    avatar: row.dentist_avatar || null,
  };
};

const isValidDateString = (value) => {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
};

const serializeDateOnly = (value, fallback = new Date()) => {
  if (isValidDateString(value)) {
    const date = new Date(value);
    return date.toISOString().slice(0, 10);
  }
  return fallback.toISOString().slice(0, 10);
};

const buildPayload = (incoming = {}) => {
  const now = new Date();
  const recordId =
    typeof incoming.id === 'string' && incoming.id.trim().length > 0
      ? incoming.id.trim()
      : `emr-${randomUUID()}`;

  const medicalDetails = ensureObject(incoming.medicalDetails);
  const payload = {
    ...incoming,
    id: recordId,
    name: incoming.name || incoming.patientName || '',
    patientName: incoming.patientName || incoming.name || '',
    rmNumber: incoming.rmNumber || incoming.rm_number || `RM-${recordId}`,
    lastVisit: serializeDateOnly(incoming.lastVisit, now),
    lastUpdated: incoming.lastUpdated || now.toISOString(),
    alerts: normalizeAlerts(incoming.alerts, medicalDetails),
    plan: normalizePlan(incoming.plan),
    odontogramMarks: normalizeMarks(incoming.odontogramMarks),
    documents: ensureArray(incoming.documents),
    consent: ensureObject(incoming.consent),
    vitals: normalizeVitals(incoming.vitals),
    vitalUnits: VITAL_UNITS,
    medicalDetails,
    diagnoses: ensureObject(incoming.diagnoses),
    contact: ensureObject(incoming.contact),
    address: ensureObject(incoming.address),
    profilePicture: incoming.profilePicture || incoming.avatar || null,
  };

  return { payload, recordId };
};

const deserializeRow = (row) => {
  if (!row) return null;
  const rawPayload =
    typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload || {};
  const updatedIso = row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at;
  const createdIso = row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at;
  const dentist = buildDentistAudit(row) || rawPayload.dentist || rawPayload.createdBy || null;

  return {
    ...rawPayload,
    id: rawPayload.id || row.id,
    patientUserId: row.patient_user_id?.toString?.() || rawPayload.patientUserId || null,
    dentistId: row.dentist_id?.toString?.() || rawPayload.dentistId || dentist?.id || null,
    dentist,
    createdBy: dentist,
    createdAt: createdIso || rawPayload.createdAt,
    updatedAt: updatedIso || rawPayload.updatedAt,
    lastUpdated: updatedIso || rawPayload.lastUpdated,
    lastVisit:
      rawPayload.lastVisit ||
      (createdIso ? createdIso.slice(0, 10) : new Date().toISOString().slice(0, 10)),
    vitals: normalizeVitals(rawPayload.vitals),
    vitalUnits: VITAL_UNITS,
    odontogramMarks: normalizeMarks(rawPayload.odontogramMarks),
    alerts: normalizeAlerts(rawPayload.alerts, rawPayload.medicalDetails),
    plan: normalizePlan(rawPayload.plan),
  };
};

const toBigIntOrNull = (value) => {
  if (value === null || value === undefined || value === '') return null;
  try {
    return BigInt(value);
  } catch (error) {
    throw new Error(`Invalid identifier: ${value}`);
  }
};

export const listEmrRecordsForDentist = async (dentistId) => {
  await ensureSchema();
  const dentistBigInt = toBigIntOrNull(dentistId);
  if (!dentistBigInt) {
    throw new Error('dentistId is required');
  }
  const { rows } = await query(
    `${EMR_RECORD_SELECT}
     WHERE r.dentist_id = $1
     ORDER BY r.updated_at DESC`,
    [dentistBigInt]
  );
  return rows.map(deserializeRow);
};

export const getEmrRecordForDentist = async (dentistId, recordId) => {
  await ensureSchema();
  const dentistBigInt = toBigIntOrNull(dentistId);
  if (!dentistBigInt) {
    throw new Error('dentistId is required');
  }
  const { rows } = await query(
    `${EMR_RECORD_SELECT}
     WHERE r.dentist_id = $1 AND r.id = $2
     LIMIT 1`,
    [dentistBigInt, recordId]
  );
  if (!rows.length) return null;
  return deserializeRow(rows[0]);
};

export const listEmrRecordsForPatient = async (patientUserId) => {
  await ensureSchema();
  const patientBigInt = toBigIntOrNull(patientUserId);
  if (!patientBigInt) {
    throw new Error('patientUserId is required');
  }
  const { rows } = await query(
    `${EMR_RECORD_SELECT}
     WHERE r.patient_user_id = $1
     ORDER BY r.created_at DESC`,
    [patientBigInt]
  );
  return rows.map(deserializeRow);
};

export const updateEmrConsentDocumentForDentist = async ({
  dentistId,
  patientUserId,
  recordId,
  document,
}) => {
  await ensureSchema();
  const dentistBigInt = toBigIntOrNull(dentistId);
  const patientBigInt = toBigIntOrNull(patientUserId);
  if (!dentistBigInt || !patientBigInt || !recordId) {
    const err = new Error('INVALID_EMR_CONSENT_REQUEST');
    err.status = 400;
    throw err;
  }

  const existing = await query(
    `${EMR_RECORD_SELECT}
     WHERE r.id = $1 AND r.patient_user_id = $2
     LIMIT 1`,
    [recordId, patientBigInt]
  );
  if (!existing.rows.length) {
    const err = new Error('EMR_RECORD_NOT_FOUND');
    err.status = 404;
    err.publicMessage = 'EMR record tidak ditemukan.';
    throw err;
  }

  const current = deserializeRow(existing.rows[0]);
  if (current.dentistId !== dentistBigInt.toString()) {
    const err = new Error('EMR_CONSENT_OWNER_ONLY');
    err.status = 403;
    err.publicMessage = 'Hanya dentist pembuat EMR yang dapat mengunggah informed consent.';
    throw err;
  }

  const consentDocument = {
    name: document.name,
    url: document.url,
    mimeType: document.mimeType,
    size: document.size,
    uploadedAt: new Date().toISOString(),
    uploadedBy: current.dentist,
  };
  const payload = {
    ...current,
    consent: {
      ...ensureObject(current.consent),
      status: `Uploaded ${document.name}`,
      workflow: 'in-clinic-upload',
      document: consentDocument,
    },
    documents: [
      ...ensureArray(current.documents).filter((item) => item?.type !== 'Informed Consent'),
      {
        type: 'Informed Consent',
        name: document.name,
        url: document.url,
        mimeType: document.mimeType,
        uploadedAt: consentDocument.uploadedAt,
      },
    ],
  };

  const updated = await query(
    `WITH updated AS (
       UPDATE dentist_emr_records
       SET payload = $3::jsonb,
           updated_at = now()
       WHERE id = $1 AND patient_user_id = $2 AND dentist_id = $4
       RETURNING id, dentist_id, patient_user_id, payload, created_at, updated_at
     )
     SELECT updated.id,
            updated.dentist_id,
            updated.patient_user_id,
            updated.payload,
            updated.created_at,
            updated.updated_at,
            d.name AS dentist_name,
            COALESCE(d.avatar_url, dp.avatar_url) AS dentist_avatar
     FROM updated
     JOIN users d ON d.id = updated.dentist_id
     LEFT JOIN LATERAL (
       SELECT avatar_url
       FROM dentist_profiles
       WHERE user_id = d.id
       ORDER BY id ASC
       LIMIT 1
     ) dp ON TRUE`,
    [recordId, patientBigInt, JSON.stringify(payload), dentistBigInt]
  );
  return deserializeRow(updated.rows[0]);
};

export const createEmrRecordForDentist = async ({
  dentistId,
  patientUserId = null,
  payload,
}) => {
  await ensureSchema();
  const dentistBigInt = toBigIntOrNull(dentistId);
  if (!dentistBigInt) {
    throw new Error('dentistId is required');
  }
  const patientBigInt = toBigIntOrNull(payload?.patientUserId ?? patientUserId);
  const { payload: sanitizedPayload, recordId } = buildPayload(payload);
  const { rows } = await query(
    `WITH inserted AS (
       INSERT INTO dentist_emr_records (id, dentist_id, patient_user_id, payload)
       VALUES ($1, $2, $3, $4::jsonb)
       RETURNING id, dentist_id, patient_user_id, payload, created_at, updated_at
     )
     SELECT inserted.id,
            inserted.dentist_id,
            inserted.patient_user_id,
            inserted.payload,
            inserted.created_at,
            inserted.updated_at,
            d.name AS dentist_name,
            COALESCE(d.avatar_url, dp.avatar_url) AS dentist_avatar
     FROM inserted
     JOIN users d ON d.id = inserted.dentist_id
     LEFT JOIN LATERAL (
       SELECT avatar_url
       FROM dentist_profiles
       WHERE user_id = d.id
       ORDER BY id ASC
       LIMIT 1
     ) dp ON TRUE`,
    [recordId, dentistBigInt, patientBigInt, JSON.stringify(sanitizedPayload)]
  );
  return deserializeRow(rows[0]);
};
