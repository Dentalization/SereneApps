import assert from 'node:assert/strict';
import test from 'node:test';
import {
  findPatientByIdentity,
  normalizePatientPhone,
  withPatientIdentityTransaction
} from '../src/services/patients/patientIdentityResolver.js';
import fs from 'node:fs';

test('normalizes common Indonesian phone formats to one identity', () => {
  const expected = '+628123456789';
  assert.equal(normalizePatientPhone('0812-3456-789'), expected);
  assert.equal(normalizePatientPhone('812 3456 789'), expected);
  assert.equal(normalizePatientPhone('62 812 3456 789'), expected);
  assert.equal(normalizePatientPhone('+62 812 3456 789'), expected);
});

test('returns null for an empty phone', () => {
  assert.equal(normalizePatientPhone(''), null);
  assert.equal(normalizePatientPhone(null), null);
});

test('resolves a patient by canonical phone aliases before email', async () => {
  const expectedPatient = { id: 12n, phone_number: '08123456789' };
  const tx = {
    user: {
      findFirst: async ({ where }) => {
        assert.deepEqual(
          where.phone_number.in,
          ['+628123456789', '628123456789', '8123456789', '08123456789']
        );
        return expectedPatient;
      },
      findUnique: async () => {
        throw new Error('email fallback should not run');
      }
    }
  };

  assert.equal(
    await findPatientByIdentity(tx, {
      phone: '+62 812-3456-789',
      email: 'different@example.com'
    }),
    expectedPatient
  );
});

test('retries serializable identity transactions after a write conflict', async () => {
  let attempts = 0;
  const prisma = {
    $transaction: async (operation, options) => {
      attempts += 1;
      assert.equal(options.isolationLevel, 'Serializable');
      if (attempts === 1) {
        const conflict = new Error('write conflict');
        conflict.code = 'P2034';
        throw conflict;
      }
      return operation({ attempt: attempts });
    }
  };

  const result = await withPatientIdentityTransaction(
    prisma,
    async (tx) => tx.attempt
  );
  assert.equal(result, 2);
  assert.equal(attempts, 2);
});

test('identity resolver uses Prisma model operations without raw SQL', () => {
  const source = fs.readFileSync(
    new URL('../src/services/patients/patientIdentityResolver.js', import.meta.url),
    'utf8'
  );
  assert.doesNotMatch(source, /\$(queryRaw|executeRaw)/);
});
