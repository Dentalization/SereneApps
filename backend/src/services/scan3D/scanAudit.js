// Reuse the existing security_events audit store; no patient names, tokens or filesystem paths.
export async function auditScanEvent(client, study, eventType, actorId = study.dentistId, detail = {}) {
  try {
    return await client.securityEvent.create({ data: { clinicProfileId: study.clinicId || null, userId: actorId || null,
      eventType, severity: eventType.includes('failed') ? 'medium' : 'low',
      metadata: { scanId: String(study.id), patientId: study.patientId == null ? null : String(study.patientId), ...detail } } });
  } catch (error) {
    console.warn('[scanAudit] Non-fatal audit log issue:', error?.message || error);
    return null;
  }
}

export async function auditedScanUpdate(client, study, where, data, eventType) {
  return client.$transaction(async tx => {
    const changed = await tx.imagingStudy.updateMany({ where, data });
    if (changed.count && eventType) await auditScanEvent(tx, study, eventType);
    return changed;
  });
}
