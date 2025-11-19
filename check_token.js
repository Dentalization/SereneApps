// Quick script to check if backend endpoints exist
const axios = require('axios');

const testEndpoints = async () => {
  console.log('\n🔍 Checking backend endpoints...\n');
  
  const endpoints = [
    { method: 'PUT', path: '/v1/patient/profile' },
    { method: 'POST', path: '/v1/patient/avatar' },
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await axios({
        method: endpoint.method,
        url: `http://localhost:4000${endpoint.path}`,
        headers: {
          'Authorization': 'Bearer test-token'
        }
      });
      console.log(`✅ ${endpoint.method} ${endpoint.path} - EXISTS (${response.status})`);
    } catch (error) {
      if (error.response) {
        const status = error.response.status;
        const message = error.response.data;
        
        if (status === 401 || status === 403) {
          console.log(`✅ ${endpoint.method} ${endpoint.path} - EXISTS (${status} auth required)`);
        } else if (status === 404) {
          console.log(`❌ ${endpoint.method} ${endpoint.path} - NOT FOUND (endpoint belum dibuat)`);
        } else {
          console.log(`⚠️ ${endpoint.method} ${endpoint.path} - EXISTS (${status})`, message);
        }
      } else {
        console.log(`❌ ${endpoint.method} ${endpoint.path} - SERVER OFFLINE`);
      }
    }
  }
  
  console.log('\n');
};

testEndpoints();
