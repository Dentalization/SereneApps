/** Start both local scan services with the same private environment. */
import 'dotenv/config';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const python = path.resolve(backendDir, '../.venv/bin/python');
const baseUrl = new URL(process.env.PY_SERVICE_BASE_URL || 'http://127.0.0.1:8000');

if (!process.env.SCAN3D_SERVICE_TOKEN) throw new Error('Set SCAN3D_SERVICE_TOKEN in backend/.env before starting local scan services');
if (!existsSync(python)) throw new Error('Repository .venv is missing; install Python service dependencies first');
if (baseUrl.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(baseUrl.hostname) || baseUrl.pathname !== '/') {
  throw new Error('Local scan launcher requires PY_SERVICE_BASE_URL at http://127.0.0.1:<port>');
}

async function isListening() {
  try {
    const response = await fetch(new URL('/health', baseUrl), { signal: AbortSignal.timeout(800) });
    return response.ok;
  } catch { return false; }
}

if (await isListening()) throw new Error(`Python service is already listening at ${baseUrl.origin}; stop it before using the shared local launcher`);

const children = [];
const stop = () => { for (const child of children) if (child.exitCode === null) child.kill('SIGTERM'); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);

const pythonService = spawn(python, ['-m', 'uvicorn', 'main:app', '--app-dir', 'python_service',
  '--host', baseUrl.hostname, '--port', baseUrl.port || '8000'],
  { cwd: backendDir, env: process.env, stdio: 'inherit' });
children.push(pythonService);

let ready = false;
for (let attempt = 0; attempt < 50; attempt += 1) {
  if (pythonService.exitCode !== null) break;
  if (await isListening()) { ready = true; break; }
  await new Promise(resolve => setTimeout(resolve, 200));
}
if (!ready) { stop(); throw new Error('Python scan service did not become healthy'); }

const backend = spawn(process.execPath, ['src/server.js'], { cwd: backendDir, env: process.env, stdio: 'inherit' });
children.push(backend);
const exit = (name, code) => { console.error(`${name} exited (${code ?? 'signal'}); stopping the local scan stack`); stop(); process.exitCode = code || 1; };
pythonService.on('exit', code => exit('Python service', code));
backend.on('exit', code => exit('Backend', code));
