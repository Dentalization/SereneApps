import test from 'node:test';
import assert from 'node:assert/strict';

const { __testables } = await import('../src/services/clinicTeledentistryService.js');
const { __testables: clinicPolicyTestables } = await import('../src/services/clinicAuthorizationPolicyService.js');
const { __testables: videoWebhookTestables } = await import('../src/services/communications/videoWebhookHandler.js');

test('clinic teledentistry capabilities keep observer and chat review owner-only', () => {
  const previousPolicy = process.env.CLINIC_ADMIN_CAN_VIEW_CLINICAL_SUMMARY;
  delete process.env.CLINIC_ADMIN_CAN_VIEW_CLINICAL_SUMMARY;
  assert.deepEqual(__testables.capabilitiesForClinicRole('clinic_owner'), {
    canObserve: true,
    canViewSummaries: true,
    canViewClinicalSummaryBody: true,
    canViewChatHistory: true,
    canViewAuditLog: true,
    canViewSessions: true
  });
  assert.equal(__testables.capabilitiesForClinicRole('clinic_admin').canObserve, false);
  assert.equal(__testables.capabilitiesForClinicRole('clinic_admin').canViewSummaries, true);
  assert.equal(__testables.capabilitiesForClinicRole('clinic_admin').canViewClinicalSummaryBody, false);
  process.env.CLINIC_ADMIN_CAN_VIEW_CLINICAL_SUMMARY = 'true';
  assert.equal(__testables.capabilitiesForClinicRole('clinic_admin').canViewClinicalSummaryBody, true);
  assert.equal(__testables.capabilitiesForClinicRole('clinic_staff').canViewChatHistory, false);
  if (previousPolicy === undefined) {
    delete process.env.CLINIC_ADMIN_CAN_VIEW_CLINICAL_SUMMARY;
  } else {
    process.env.CLINIC_ADMIN_CAN_VIEW_CLINICAL_SUMMARY = previousPolicy;
  }
});

test('assigned branch scope is enforced for non-owner clinic staff', () => {
  assert.deepEqual(
    __testables.scopedClinicBranchIdsForContext(
      { clinicRole: 'clinic_admin', assignedBranchId: 22n },
      [11n, 22n, 33n]
    ),
    [22n]
  );
  assert.deepEqual(
    __testables.scopedClinicBranchIdsForContext(
      { clinicRole: 'clinic_owner', assignedBranchId: 22n },
      [11n, 22n, 33n]
    ),
    [11n, 22n, 33n]
  );
});

test('shared clinic observer policy returns audit-safe denial reasons', () => {
  const appointment = {
    clinicBranchId: 22n,
    consultationType: 'virtual',
    videoRoomRef: null,
    clinicBranch: { clinicProfileId: 10n }
  };

  assert.equal(
    clinicPolicyTestables.evaluateClinicObserverStaffAccess({ staff: null, appointment }).reason,
    'not_clinic_staff'
  );
  assert.equal(
    clinicPolicyTestables.evaluateClinicObserverStaffAccess({
      staff: { id: 1n, role: 'clinic_owner', isActive: false, clinicProfileId: 10n },
      appointment
    }).reason,
    'inactive_clinic_staff'
  );
  assert.equal(
    clinicPolicyTestables.evaluateClinicObserverStaffAccess({
      staff: { id: 1n, role: 'clinic_owner', isActive: true, clinicProfileId: 99n },
      appointment
    }).reason,
    'cross_clinic_denied'
  );
  assert.equal(
    clinicPolicyTestables.evaluateClinicObserverStaffAccess({
      staff: { id: 1n, role: 'clinic_owner', isActive: true, clinicProfileId: 10n },
      appointment: { ...appointment, consultationType: 'onsite', videoRoomRef: null }
    }).reason,
    'appointment_not_tele'
  );
  assert.equal(
    clinicPolicyTestables.evaluateClinicObserverStaffAccess({
      staff: { id: 1n, role: 'clinic_admin', isActive: true, clinicProfileId: 10n, assignedBranchId: 33n },
      appointment
    }).reason,
    'cross_branch_denied'
  );
  assert.equal(
    clinicPolicyTestables.evaluateClinicObserverStaffAccess({
      staff: { id: 1n, role: 'clinic_admin', isActive: true, clinicProfileId: 10n, assignedBranchId: 22n },
      appointment
    }).reason,
    'clinic_role_not_allowed'
  );
  assert.equal(
    clinicPolicyTestables.evaluateClinicObserverStaffAccess({
      staff: { id: 1n, role: 'clinic_owner', isActive: true, clinicProfileId: 10n },
      appointment
    }).allowed,
    true
  );
});

test('shared clinic policy classifies tele appointments consistently', () => {
  assert.equal(clinicPolicyTestables.isTeleAppointment({ consultationType: 'tele' }), true);
  assert.equal(clinicPolicyTestables.isTeleAppointment({ consultationType: 'onsite', videoRoomRef: 'appointment-1' }), true);
  assert.equal(clinicPolicyTestables.isTeleAppointment({ consultationType: 'onsite' }), false);
});

test('session buckets distinguish waiting from live and ended', () => {
  assert.equal(__testables.sessionBucket({ status: 'confirmed', videoSessions: [] }), 'waiting');
  assert.equal(__testables.sessionBucket({ status: 'confirmed', videoSessions: [{ leftAt: null, actorRole: 'observer' }] }), 'waiting');
  assert.equal(__testables.sessionBucket({ status: 'confirmed', videoSessions: [{ leftAt: null, actorRole: 'participant' }] }), 'live');
  assert.equal(__testables.sessionBucket({ status: 'completed', videoSessions: [] }), 'completed');
  assert.equal(__testables.sessionBucket({ status: 'cancelled', videoSessions: [] }), 'ended');
  assert.deepEqual(__testables.sessionStatusWhere('live'), {
    videoSessions: {
      some: {
        leftAt: null,
        actorRole: { notIn: ['observer', 'clinic_observer'] }
      }
    }
  });
});

test('clinic chat projection redacts attachment download URLs while preserving tombstone state', () => {
  const expired = __testables.serializeMessage({
    id: 1n,
    senderId: 2n,
    message: 'attachment',
    messageType: 'file',
    fileName: 'scan.pdf',
    storageObjectKey: 'private/object.pdf',
    mediaRetentionUntil: new Date(Date.now() - 60_000),
    metadata: {},
    createdAt: new Date()
  });

  assert.equal(expired.fileUrl, null);
  assert.equal(expired.attachmentAvailable, false);
  assert.equal(expired.mediaTombstoneReason, 'retention_expired');
});

test('observer track publish webhook is classified as a violation', () => {
  assert.equal(
    videoWebhookTestables.isObserverTrackPublishEvent(
      { StatusCallbackEvent: 'track-added', TrackSid: 'MT00000000000000000000000000000000' },
      { type: 'clinic_observer' }
    ),
    true
  );
  assert.equal(
    videoWebhookTestables.isObserverTrackPublishEvent(
      { StatusCallbackEvent: 'track-subscribed', TrackSid: 'MT00000000000000000000000000000000' },
      { type: 'clinic_observer' }
    ),
    false
  );
  assert.equal(
    videoWebhookTestables.isObserverTrackPublishEvent(
      { StatusCallbackEvent: 'track-added', TrackSid: 'MT00000000000000000000000000000000' },
      { type: 'user' }
    ),
    false
  );
});

test('observer video sessions are tagged separately from clinical participants', () => {
  assert.equal(
    videoWebhookTestables.videoSessionActorRole({ type: 'clinic_observer', role: 'observer' }),
    'observer'
  );
  assert.equal(
    videoWebhookTestables.videoSessionActorRole({ type: 'communication_participant', role: 'guardian' }),
    'guardian'
  );
  assert.equal(
    videoWebhookTestables.videoSessionActorRole({ type: 'user' }),
    'participant'
  );
});
