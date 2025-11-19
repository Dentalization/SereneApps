// Test API call langsung ke backend
import fetch from 'node-fetch';

async function testDirectApiCall() {
  try {
    console.log('🔄 Testing direct API call to backend...');
    
    // Test GET /staff first
    const getResponse = await fetch('http://localhost:4000/v1/clinic/staff', {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📡 GET Response Status:', getResponse.status);
    
    if (getResponse.status === 401) {
      console.log('🔐 Need authentication - this is expected');
      console.log('✅ Backend is running and responding');
    } else {
      const getData = await getResponse.json();
      console.log('📊 GET Response Data:', getData);
    }
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Backend is NOT running! Please start it with: npm start');
    } else {
      console.error('❌ API test failed:', error.message);
    }
  }
}

testDirectApiCall();