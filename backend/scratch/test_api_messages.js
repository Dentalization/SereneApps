import 'dotenv/config';
import { signAccess } from '../src/utils/tokens.js';

const user = {
  id: '47',
  roles: ['dentist'],
  tenantId: '1',
  clinicId: '1'
};

const token = signAccess(user);

const res = await fetch('http://localhost:4000/v1/communications/rooms', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const data = await res.json();
console.log(JSON.stringify(data, null, 2));
