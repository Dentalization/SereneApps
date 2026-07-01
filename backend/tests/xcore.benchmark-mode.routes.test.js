import 'dotenv/config';
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { signAccess } from '../src/utils/tokens.js';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'xcore-benchmark-route-test-secret';
process.env.XCORE_BENCHMARK_MODE = 'false';

const prisma = new PrismaClient();
const user = await prisma.user.create({
  data: {
    name: 'X-Core Benchmark Disabled Dentist',
    email: `xcore-benchmark-disabled-${Date.now()}@test.local`,
    password_hash: 'hash',
    roles: ['dentist'],
  },
});
const token = signAccess({ id: user.id.toString(), roles: user.roles });
const xCoreRouter = (await import('../src/routes/xCoreRoutes.js')).default;

after(async () => {
  await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
  await prisma.$disconnect();
});

test('benchmark callback and delete routes are not mounted when benchmark mode is disabled', async () => {
  const app = express();
  app.use('/v1/x-core', xCoreRouter);
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });

  try {
    const baseUrl = `http://127.0.0.1:${server.address().port}`;
    const callback = await fetch(`${baseUrl}/v1/x-core/benchmark/callback`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    assert.equal(callback.status, 404);

    const deletion = await fetch(`${baseUrl}/v1/x-core/benchmark/studies/not-a-number`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(deletion.status, 404);
    assert.equal(process.env.XCORE_BENCHMARK_MODE, 'false');
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});
