import { randomUUID } from 'crypto';
import { query } from '../db.js';

let schemaReadyPromise = null;
const ensureSchema = async () => {
  if (schemaReadyPromise) return schemaReadyPromise;
  schemaReadyPromise = (async () => {
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
    vitals: ensureObject(incoming.vitals),
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

  return {
    ...rawPayload,
    id: rawPayload.id || row.id,
    lastUpdated: rawPayload.lastUpdated || updatedIso,
    lastVisit:
      rawPayload.lastVisit ||
      (createdIso ? createdIso.slice(0, 10) : new Date().toISOString().slice(0, 10)),
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
    `SELECT id, payload, created_at, updated_at
     FROM dentist_emr_records
     WHERE dentist_id = $1
     ORDER BY updated_at DESC`,
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
    `SELECT id, payload, created_at, updated_at
     FROM dentist_emr_records
     WHERE dentist_id = $1 AND id = $2
     LIMIT 1`,
    [dentistBigInt, recordId]
  );
  if (!rows.length) return null;
  return deserializeRow(rows[0]);
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
  await query(
    `INSERT INTO dentist_emr_records (id, dentist_id, patient_user_id, payload)
     VALUES ($1, $2, $3, $4::jsonb)`,
    [recordId, dentistBigInt, patientBigInt, JSON.stringify(sanitizedPayload)]
  );
  return sanitizedPayload;
};
