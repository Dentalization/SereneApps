import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const secret = process.env.JWT_SECRET || 'replace-with-a-long-random-secret';
console.log('Using JWT Secret:', secret);

const token = jwt.sign({
  sub: 'dentist-1',
  roles: ['dentist'],
}, secret, { expiresIn: '1h' });

console.log('Generated Token:', token);

async function run() {
  const res = await fetch('http://localhost:4000/py-api/api/v1/sessions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      role: 'dentist',
      language: 'id'
    })
  });
  console.log('Status:', res.status);
  const data = await res.json();
  console.log('Response:', JSON.stringify(data, null, 2));
}

run().catch(console.error);
