import crypto from 'crypto';

function uuid() {
  return crypto.randomUUID();
}

function clone(value) {
  return JSON.parse(JSON.stringify(value ?? null));
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function actorScope(actor = {}) {
  return {
    actorId: actor.id?.toString?.() || actor.userId?.toString?.() || null,
    actorRole: actor.role || actor.roles?.[0] || null,
    tenantId: actor.tenantId || actor.tenant_id || null,
    clinicId: actor.clinicId || actor.clinic_id || null,
  };
}

function isTenantMatch(record, scope) {
  if (!scope.tenantId && !scope.clinicId) return true;
  if (scope.tenantId && record.tenant_id && String(record.tenant_id) !== String(scope.tenantId)) return false;
  if (scope.clinicId && record.clinic_id && String(record.clinic_id) !== String(scope.clinicId)) return false;
  return true;
}

function getState(state = {}) {
  if (!state.cases) {
    state.sequence = 0;
    state.cases = new Map();
    state.images = new Map();
    state.qualityChecks = new Map();
    state.aiFindings = new Map();
    state.clinicianFindings = new Map();
    state.auditEvents = new Map();
    state.exports = new Map();
    state.timelineEvents = new Map();
  }
  return state;
}

function caseSummary(state, caseRecord) {
  const images = [...state.images.values()].filter((image) => image.case_id === caseRecord.id && !image.archived);
  const findings = [
    ...state.aiFindings.values(),
    ...state.clinicianFindings.values(),
  ].filter((finding) => finding.case_id === caseRecord.id);
  return {
    ...caseRecord,
    image_count: images.length,
    has_low_quality_images: images.some((image) => ['warning', 'rejected', 'needs_retake'].includes(image.quality_status)),
    timeline_linked: Boolean(caseRecord.patient_id),
    finding_labels: [...new Set(findings.map((finding) => finding.label).filter(Boolean))],
    export_count: [...state.exports.values()].filter((entry) => entry.case_id === caseRecord.id).length,
  };
}

export function createMemoryVerifiedCaseWorkspaceRepository({ state: inputState = {} } = {}) {
  const state = getState(inputState);

  const repository = {
    async createCase(data) {
      const record = {
        id: uuid(),
        tenant_id: data.tenant_id || null,
        clinic_id: data.clinic_id || null,
        patient_id: data.patient_id || null,
        patient_name: data.patient_name || null,
        patient_code: data.patient_code || null,
        session_id: data.session_id || null,
        title: data.title || 'Untitled dental case',
        status: data.status || 'draft',
        created_by: data.created_by || null,
        created_at: data.created_at,
        updated_at: data.updated_at,
        verified_by: null,
        verified_at: null,
        exported_at: null,
        archived_at: null,
        metadata: data.metadata || {},
        last_message_preview: data.last_message_preview || '',
      };
      state.cases.set(record.id, record);
      return clone(caseSummary(state, record));
    },

    async listCases({ actor, includeArchived = false, search = '' } = {}) {
      const scope = actorScope(actor);
      const query = String(search || '').trim().toLowerCase();
      return [...state.cases.values()]
        .filter((record) => includeArchived || record.status !== 'archived')
        .filter((record) => isTenantMatch(record, scope))
        .map((record) => caseSummary(state, record))
        .filter((record) => {
          if (!query) return true;
          return [
            record.id,
            record.title,
            record.patient_id,
            record.patient_name,
            record.patient_code,
            record.session_id,
            record.last_message_preview,
            ...(record.finding_labels || []),
          ].filter(Boolean).join(' ').toLowerCase().includes(query);
        })
        .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
        .map(clone);
    },

    async getCase(caseId, { actor } = {}) {
      const record = state.cases.get(caseId);
      if (!record || !isTenantMatch(record, actorScope(actor))) return null;
      return clone(caseSummary(state, record));
    },

    async findCaseBySession(sessionId, { actor } = {}) {
      const record = [...state.cases.values()].find((entry) => entry.session_id === sessionId && entry.status !== 'archived' && isTenantMatch(entry, actorScope(actor)));
      return record ? clone(caseSummary(state, record)) : null;
    },

    async updateCase(caseId, patch, { actor } = {}) {
      const record = state.cases.get(caseId);
      if (!record || !isTenantMatch(record, actorScope(actor))) return null;
      Object.assign(record, patch, { updated_at: patch.updated_at || record.updated_at });
      state.cases.set(caseId, record);
      return clone(caseSummary(state, record));
    },

    async createImage(data) {
      const record = {
        id: uuid(),
        ...data,
        duplicate_of: data.duplicate_of || null,
        upload_status: data.upload_status || 'uploaded',
        quality_status: data.quality_status || null,
        annotated_image_ref: data.annotated_image_ref || null,
        annotated_image_mime_type: data.annotated_image_mime_type || null,
        archived: Boolean(data.archived),
      };
      state.images.set(record.id, record);
      return clone(record);
    },

    async listImages(caseId) {
      return [...state.images.values()].filter((image) => image.case_id === caseId).map(clone);
    },

    async getImage(caseId, imageId) {
      const image = state.images.get(imageId);
      return image && image.case_id === caseId ? clone(image) : null;
    },

    async findDuplicateImage(caseId, contentHash) {
      const image = [...state.images.values()].find((entry) => entry.case_id === caseId && !entry.archived && entry.content_hash === contentHash);
      return image ? clone(image) : null;
    },

    async updateImage(caseId, imageId, patch) {
      const image = state.images.get(imageId);
      if (!image || image.case_id !== caseId) return null;
      Object.assign(image, patch);
      state.images.set(imageId, image);
      return clone(image);
    },

    async createQualityCheck(data) {
      const record = { id: uuid(), ...data, _sequence: ++state.sequence };
      state.qualityChecks.set(record.id, record);
      return clone(record);
    },

    async listQualityChecks(caseId, imageId = null) {
      return [...state.qualityChecks.values()]
        .filter((entry) => entry.case_id === caseId && (!imageId || entry.image_id === imageId))
        .sort((a, b) => (new Date(b.created_at) - new Date(a.created_at)) || ((b._sequence || 0) - (a._sequence || 0)))
        .map(clone);
    },

    async getLatestQualityCheck(caseId, imageId) {
      return (await repository.listQualityChecks(caseId, imageId))[0] || null;
    },

    async createAiFinding(data) {
      const record = { id: uuid(), ...data };
      state.aiFindings.set(record.id, record);
      return clone(record);
    },

    async createClinicianFinding(data) {
      const record = { id: uuid(), ...data };
      state.clinicianFindings.set(record.id, record);
      return clone(record);
    },

    async listFindings(caseId) {
      return [
        ...state.aiFindings.values(),
        ...state.clinicianFindings.values(),
      ].filter((finding) => finding.case_id === caseId)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        .map(clone);
    },

    async getFinding(caseId, findingId) {
      const finding = state.aiFindings.get(findingId) || state.clinicianFindings.get(findingId);
      return finding && finding.case_id === caseId ? clone(finding) : null;
    },

    async createAuditEvent(data) {
      const record = { event_id: uuid(), ...data };
      state.auditEvents.set(record.event_id, record);
      return clone(record);
    },

    async listAuditEvents(caseId) {
      return [...state.auditEvents.values()]
        .filter((event) => event.case_id === caseId)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        .map(clone);
    },

    async updateAuditEvent() {
      throw new Error('audit_events_are_immutable');
    },

    async deleteAuditEvent() {
      throw new Error('audit_events_are_immutable');
    },

    async createExport(data) {
      const record = { id: uuid(), ...data };
      state.exports.set(record.id, record);
      return clone(record);
    },

    async listExports(caseId) {
      return [...state.exports.values()]
        .filter((entry) => entry.case_id === caseId)
        .sort((a, b) => new Date(b.exported_at) - new Date(a.exported_at))
        .map(clone);
    },

    async createTimelineEvent(data) {
      const record = { event_id: uuid(), ...data };
      state.timelineEvents.set(record.event_id, record);
      return clone(record);
    },

    async listPatientTimeline(patientId, { actor } = {}) {
      const scope = actorScope(actor);
      return [...state.timelineEvents.values()]
        .filter((event) => String(event.patient_id) === String(patientId))
        .filter((event) => {
          const caseRecord = state.cases.get(event.case_id);
          return !caseRecord || isTenantMatch(caseRecord, scope);
        })
        .sort((a, b) => new Date(b.event_date) - new Date(a.event_date))
        .map(clone);
    },
  };

  return repository;
}

function rowOne(result) {
  return result?.rows?.[0] || null;
}

export function createVerifiedCaseWorkspaceRepository({ query }) {
  if (typeof query !== 'function') throw new Error('query_required');

  const json = (value) => JSON.stringify(value ?? null);

  return {
    async createCase(data) {
      const result = await query(
        `INSERT INTO verified_cases (
          tenant_id, clinic_id, patient_id, session_id, title, status, created_by,
          created_at, updated_at, metadata
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb)
        RETURNING *`,
        [
          data.tenant_id || null,
          data.clinic_id || null,
          data.patient_id || null,
          data.session_id || null,
          data.title,
          data.status || 'draft',
          data.created_by || null,
          data.created_at,
          data.updated_at,
          json({
            ...(data.metadata || {}),
            patient_name: data.patient_name || null,
            patient_code: data.patient_code || null,
            last_message_preview: data.last_message_preview || '',
          }),
        ]
      );
      return rowOne(result);
    },

    async listCases({ actor, includeArchived = false, search = '' } = {}) {
      const scope = actorScope(actor);
      const result = await query(
        `SELECT
          vc.*,
          vc.metadata->>'patient_name' AS patient_name,
          vc.metadata->>'patient_code' AS patient_code,
          vc.metadata->>'last_message_preview' AS last_message_preview,
          COUNT(DISTINCT ci.id) FILTER (WHERE ci.archived = FALSE) AS image_count,
          COALESCE(BOOL_OR(ci.quality_status IN ('warning','rejected','needs_retake')) FILTER (WHERE ci.archived = FALSE), FALSE) AS has_low_quality_images,
          COALESCE(jsonb_agg(DISTINCT af.label) FILTER (WHERE af.label IS NOT NULL), '[]'::jsonb) AS ai_labels,
          COALESCE(jsonb_agg(DISTINCT cf.label) FILTER (WHERE cf.label IS NOT NULL), '[]'::jsonb) AS clinician_labels,
          COUNT(DISTINCT ce.id) AS export_count
        FROM verified_cases vc
        LEFT JOIN case_images ci ON ci.case_id = vc.id
        LEFT JOIN ai_findings af ON af.case_id = vc.id
        LEFT JOIN clinician_findings cf ON cf.case_id = vc.id
        LEFT JOIN case_exports ce ON ce.case_id = vc.id
        WHERE ($1::text IS NULL OR vc.tenant_id = $1)
          AND ($2::text IS NULL OR vc.clinic_id = $2)
          AND ($3::boolean = TRUE OR vc.status <> 'archived')
          AND (
            $4::text = ''
            OR vc.title ILIKE '%' || $4 || '%'
            OR vc.session_id ILIKE '%' || $4 || '%'
            OR vc.metadata->>'patient_name' ILIKE '%' || $4 || '%'
            OR vc.metadata->>'patient_code' ILIKE '%' || $4 || '%'
          )
        GROUP BY vc.id
        ORDER BY vc.updated_at DESC`,
        [scope.tenantId, scope.clinicId, includeArchived, search || '']
      );
      return result.rows.map((row) => ({
        ...row,
        image_count: Number(row.image_count || 0),
        export_count: Number(row.export_count || 0),
        timeline_linked: Boolean(row.patient_id),
        finding_labels: [...new Set([...asArray(row.ai_labels), ...asArray(row.clinician_labels)].filter(Boolean))],
      }));
    },

    async getCase(caseId, { actor } = {}) {
      const cases = await this.listCases({ actor, includeArchived: true });
      return cases.find((entry) => String(entry.id) === String(caseId)) || null;
    },

    async findCaseBySession(sessionId, { actor } = {}) {
      const cases = await this.listCases({ actor, includeArchived: false });
      return cases.find((entry) => entry.session_id === sessionId) || null;
    },

    async updateCase(caseId, patch, { actor } = {}) {
      const scope = actorScope(actor);
      const metadataPatch = {};
      if (patch.patient_name !== undefined) metadataPatch.patient_name = patch.patient_name;
      if (patch.patient_code !== undefined) metadataPatch.patient_code = patch.patient_code;
      if (patch.last_message_preview !== undefined) metadataPatch.last_message_preview = patch.last_message_preview;
      const result = await query(
        `UPDATE verified_cases
         SET
          patient_id = COALESCE($4, patient_id),
          session_id = COALESCE($5, session_id),
          title = COALESCE($6, title),
          status = COALESCE($7, status),
          verified_by = COALESCE($8, verified_by),
          verified_at = COALESCE($9, verified_at),
          exported_at = COALESCE($10, exported_at),
          archived_at = COALESCE($11, archived_at),
          updated_at = COALESCE($12, updated_at),
          metadata = metadata || $13::jsonb
         WHERE id = $1
           AND ($2::text IS NULL OR tenant_id = $2)
           AND ($3::text IS NULL OR clinic_id = $3)
         RETURNING *`,
        [
          caseId,
          scope.tenantId,
          scope.clinicId,
          patch.patient_id || null,
          patch.session_id || null,
          patch.title || null,
          patch.status || null,
          patch.verified_by || null,
          patch.verified_at || null,
          patch.exported_at || null,
          patch.archived_at || null,
          patch.updated_at || null,
          json(metadataPatch),
        ]
      );
      return rowOne(result) ? this.getCase(caseId, { actor }) : null;
    },

    async createImage(data) {
      const result = await query(
        `INSERT INTO case_images (
          case_id, file_name, mime_type, size_bytes, content_hash, storage_ref,
          annotated_image_ref, annotated_image_mime_type, duplicate_of, upload_status,
          quality_status, archived, created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
        RETURNING *`,
        [
          data.case_id,
          data.file_name,
          data.mime_type,
          data.size_bytes,
          data.content_hash,
          data.storage_ref,
          data.annotated_image_ref || null,
          data.annotated_image_mime_type || null,
          data.duplicate_of || null,
          data.upload_status || 'uploaded',
          data.quality_status || null,
          Boolean(data.archived),
          data.created_at,
          data.updated_at,
        ]
      );
      return rowOne(result);
    },

    async listImages(caseId) {
      const result = await query('SELECT * FROM case_images WHERE case_id = $1 ORDER BY created_at ASC', [caseId]);
      return result.rows;
    },

    async getImage(caseId, imageId) {
      return rowOne(await query('SELECT * FROM case_images WHERE case_id = $1 AND id = $2', [caseId, imageId]));
    },

    async findDuplicateImage(caseId, contentHash) {
      return rowOne(await query('SELECT * FROM case_images WHERE case_id = $1 AND content_hash = $2 AND archived = FALSE LIMIT 1', [caseId, contentHash]));
    },

    async updateImage(caseId, imageId, patch) {
      await query(
        `UPDATE case_images
         SET annotated_image_ref = COALESCE($3, annotated_image_ref),
             annotated_image_mime_type = COALESCE($4, annotated_image_mime_type),
             quality_status = COALESCE($5, quality_status),
             archived = COALESCE($6, archived),
             updated_at = COALESCE($7, updated_at)
         WHERE case_id = $1 AND id = $2`,
        [caseId, imageId, patch.annotated_image_ref || null, patch.annotated_image_mime_type || null, patch.quality_status || null, patch.archived ?? null, patch.updated_at || null]
      );
      return this.getImage(caseId, imageId);
    },

    async createQualityCheck(data) {
      return rowOne(await query(
        `INSERT INTO image_quality_checks (
          case_id, image_id, quality_score, quality_status, issues, recommendation,
          can_continue_analysis, metrics, checked_by, created_at
        ) VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8::jsonb,$9,$10)
        RETURNING *`,
        [data.case_id, data.image_id, data.quality_score, data.quality_status, json(data.issues || []), data.recommendation, data.can_continue_analysis, json(data.metrics || {}), data.checked_by || null, data.created_at]
      ));
    },

    async listQualityChecks(caseId, imageId = null) {
      const result = await query(
        'SELECT * FROM image_quality_checks WHERE case_id = $1 AND ($2::uuid IS NULL OR image_id = $2) ORDER BY created_at DESC',
        [caseId, imageId]
      );
      return result.rows;
    },

    async getLatestQualityCheck(caseId, imageId) {
      return rowOne(await query(
        'SELECT * FROM image_quality_checks WHERE case_id = $1 AND image_id = $2 ORDER BY created_at DESC LIMIT 1',
        [caseId, imageId]
      ));
    },

    async createAiFinding(data) {
      return rowOne(await query(
        `INSERT INTO ai_findings (
          case_id, image_id, label, tooth_or_region, severity, confidence, source, status,
          notes, raw_ai_result, created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12)
        RETURNING *`,
        [data.case_id, data.image_id || null, data.label, data.tooth_or_region || null, data.severity, data.confidence ?? null, data.source || 'ai', data.status || 'ai_suggested', data.notes || null, json(data.raw_ai_result || {}), data.created_at, data.updated_at]
      ));
    },

    async createClinicianFinding(data) {
      return rowOne(await query(
        `INSERT INTO clinician_findings (
          case_id, image_id, label, tooth_or_region, severity, confidence, source, status,
          notes, urgent_referral, needs_in_person_exam, confirmed_by, confirmed_at,
          created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
        RETURNING *`,
        [data.case_id, data.image_id || null, data.label, data.tooth_or_region || null, data.severity, data.confidence ?? null, data.source || 'clinician', data.status, data.notes || null, Boolean(data.urgent_referral), Boolean(data.needs_in_person_exam), data.confirmed_by || null, data.confirmed_at || null, data.created_at, data.updated_at]
      ));
    },

    async listFindings(caseId) {
      const result = await query(
        `(SELECT id, case_id, image_id, label, tooth_or_region, severity, confidence, source, status, notes, raw_ai_result, NULL::boolean AS urgent_referral, NULL::boolean AS needs_in_person_exam, NULL::bigint AS confirmed_by, NULL::timestamptz AS confirmed_at, created_at, updated_at FROM ai_findings WHERE case_id = $1)
         UNION ALL
         (SELECT id, case_id, image_id, label, tooth_or_region, severity, confidence, source, status, notes, NULL::jsonb AS raw_ai_result, urgent_referral, needs_in_person_exam, confirmed_by, confirmed_at, created_at, updated_at FROM clinician_findings WHERE case_id = $1)
         ORDER BY created_at ASC`,
        [caseId]
      );
      return result.rows;
    },

    async getFinding(caseId, findingId) {
      const findings = await this.listFindings(caseId);
      return findings.find((finding) => String(finding.id) === String(findingId)) || null;
    },

    async createAuditEvent(data) {
      return rowOne(await query(
        `INSERT INTO case_audit_events (
          case_id, actor_id, actor_role, event_type, before_json, after_json,
          reason, request_id, device_metadata, created_at
        ) VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7,$8,$9::jsonb,$10)
        RETURNING *`,
        [data.case_id, data.actor_id || null, data.actor_role, data.event_type, json(data.before_json), json(data.after_json), data.reason || null, data.request_id || null, json(data.device_metadata), data.created_at]
      ));
    },

    async listAuditEvents(caseId) {
      const result = await query('SELECT * FROM case_audit_events WHERE case_id = $1 ORDER BY created_at ASC', [caseId]);
      return result.rows;
    },

    async updateAuditEvent() {
      throw new Error('audit_events_are_immutable');
    },

    async deleteAuditEvent() {
      throw new Error('audit_events_are_immutable');
    },

    async createExport(data) {
      return rowOne(await query(
        `INSERT INTO case_exports (
          case_id, format, redacted, mime_type, storage_ref, exported_by, exported_at, metadata
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)
        RETURNING *`,
        [data.case_id, data.format, Boolean(data.redacted), data.mime_type, data.storage_ref, data.exported_by || null, data.exported_at, json(data.metadata || {})]
      ));
    },

    async listExports(caseId) {
      const result = await query('SELECT * FROM case_exports WHERE case_id = $1 ORDER BY exported_at DESC', [caseId]);
      return result.rows;
    },

    async createTimelineEvent(data) {
      return rowOne(await query(
        `INSERT INTO patient_timeline_events (
          patient_id, case_id, event_type, event_date, case_title, case_status,
          confirmed_findings_summary, image_count, report_link, related_session_id, details
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb)
        RETURNING *`,
        [data.patient_id, data.case_id || null, data.event_type, data.event_date, data.case_title || null, data.case_status || null, data.confirmed_findings_summary || null, data.image_count || 0, data.report_link || null, data.related_session_id || null, json(data.details || {})]
      ));
    },

    async listPatientTimeline(patientId, { actor } = {}) {
      const scope = actorScope(actor);
      const result = await query(
        `SELECT pte.*
         FROM patient_timeline_events pte
         LEFT JOIN verified_cases vc ON vc.id = pte.case_id
         WHERE pte.patient_id = $1
           AND ($2::text IS NULL OR vc.tenant_id IS NULL OR vc.tenant_id = $2)
           AND ($3::text IS NULL OR vc.clinic_id IS NULL OR vc.clinic_id = $3)
         ORDER BY pte.event_date DESC`,
        [patientId, scope.tenantId, scope.clinicId]
      );
      return result.rows;
    },
  };
}
