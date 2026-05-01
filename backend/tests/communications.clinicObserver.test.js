import test from 'node:test';
import assert from 'node:assert/strict';

const { __testables } = await import('../src/services/clinicTeledentistryService.js');
const { __testables: videoWebhookTestables } = await import('../src/services/communications/videoWebhookHandler.js');

test('clinic teledentistry capabilities keep observer and chat review owner-only', () => {
  assert.deepEqual(__testables.capabilitiesForClinicRole('clinic_owner'), {
    canObserve: true,
    canViewSummaries: true,
    canViewChatHistory: true,
    canViewAuditLog: true,
    canViewSessions: true
  });
  assert.equal(__testables.capabilitiesForClinicRole('clinic_admin').canObserve, false);
  assert.equal(__testables.capabilitiesForClinicRole('clinic_admin').canViewSummaries, true);
  assert.equal(__testables.capabilitiesForClinicRole('clinic_staff').canViewChatHistory, false);
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

test('session buckets distinguish waiting from live and ended', () => {
  assert.equal(__testables.sessionBucket({ status: 'confirmed', videoSessions: [] }), 'waiting');
  assert.equal(__testables.sessionBucket({ status: 'confirmed', videoSessions: [{ leftAt: null }] }), 'live');
  assert.equal(__testables.sessionBucket({ status: 'completed', videoSessions: [] }), 'completed');
  assert.equal(__testables.sessionBucket({ status: 'cancelled', videoSessions: [] }), 'ended');
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
      { StatusCallbackEvent: 'track-added', TrackSid: 'MT00000000000000000000000000000000' },
      { type: 'user' }
    ),
    false
  );
});
