import test from 'node:test';
import assert from 'node:assert/strict';
import { __testables } from '../src/services/communications/clinicalSummaryService.js';

test('clinical summary finalization requires core clinical fields', () => {
  const result = __testables.validateClinicalSummaryForFinalize({
    chiefComplaint: 'Nyeri gigi',
    objectiveFindings: '',
    assessment: 'Pulpitis reversible',
    plan: 'Obat dan kontrol'
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.missing, ['objectiveFindings']);
});

test('patient-facing summary serialization hides drafts', () => {
  const draft = {
    id: 'summary-id',
    appointmentId: 1n,
    dentistId: 2n,
    patientId: 3n,
    status: 'draft',
    chiefComplaint: 'hidden draft',
    diagnosisCodes: [],
    recommendations: []
  };

  assert.deepEqual(__testables.serializeSummary(draft, { includeDraft: false }), {
    status: 'pending',
    summary: null
  });

  const finalized = __testables.serializeSummary({ ...draft, status: 'finalized' }, { includeDraft: false });
  assert.equal(finalized.status, 'finalized');
  assert.equal(finalized.summary.chiefComplaint, 'hidden draft');
});
