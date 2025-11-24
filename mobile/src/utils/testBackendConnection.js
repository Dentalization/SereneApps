import axios from 'axios';
import { Platform } from 'react-native';
import { API_BASE_URL } from '../services/api';

/**
 * Test backend connection
 * This utility helps verify that mobile app can connect to backend server
 */

export const testBackendConnection = async () => {
  console.log('\n🔍 Testing Backend Connection...');
  console.log('📍 API Base URL:', API_BASE_URL);
  console.log('📱 Platform:', Platform.OS);
  
  const tests = [];
  
  // Test 1: Health Check
  try {
    console.log('\n1️⃣ Testing /health endpoint...');
    const response = await axios.get(`${API_BASE_URL}/health`, { timeout: 5000 });
    console.log('✅ Health check passed:', response.data);
    tests.push({ name: 'Health Check', status: 'PASS', data: response.data });
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    tests.push({ 
      name: 'Health Check', 
      status: 'FAIL', 
      error: error.message,
      hint: 'Make sure backend server is running on port 4000'
    });
  }
  
  // Test 2: API Version
  try {
    console.log('\n2️⃣ Testing /v1 endpoint...');
    const response = await axios.get(`${API_BASE_URL}/v1`, { timeout: 5000 });
    console.log('✅ API version check passed:', response.data);
    tests.push({ name: 'API Version', status: 'PASS', data: response.data });
  } catch (error) {
    console.error('❌ API version check failed:', error.message);
    tests.push({ 
      name: 'API Version', 
      status: 'FAIL', 
      error: error.message 
    });
  }
  
  // Test 3: Test Registration Endpoint (without sending data)
  try {
    console.log('\n3️⃣ Testing registration endpoint availability...');
    // Send empty request to check if endpoint exists
    const response = await axios.post(
      `${API_BASE_URL}/v1/auth/patient/register`,
      {},
      { 
        timeout: 5000,
        validateStatus: (status) => status === 400 || status === 201 // Accept both
      }
    );
    console.log('✅ Registration endpoint is available');
    tests.push({ 
      name: 'Registration Endpoint', 
      status: 'PASS',
      note: 'Endpoint exists and responds'
    });
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ Registration endpoint is available (validation working)');
      tests.push({ 
        name: 'Registration Endpoint', 
        status: 'PASS',
        note: 'Endpoint exists, validation is working'
      });
    } else {
      console.error('❌ Registration endpoint test failed:', error.message);
      tests.push({ 
        name: 'Registration Endpoint', 
        status: 'FAIL', 
        error: error.message 
      });
    }
  }
  
  // Print Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 CONNECTION TEST SUMMARY');
  console.log('='.repeat(50));
  
  tests.forEach((test, index) => {
    const icon = test.status === 'PASS' ? '✅' : '❌';
    console.log(`${icon} ${index + 1}. ${test.name}: ${test.status}`);
    if (test.error) {
      console.log(`   Error: ${test.error}`);
    }
    if (test.hint) {
      console.log(`   💡 Hint: ${test.hint}`);
    }
  });
  
  const allPassed = tests.every(t => t.status === 'PASS');
  
  console.log('\n' + '='.repeat(50));
  if (allPassed) {
    console.log('🎉 ALL TESTS PASSED! Backend is ready.');
  } else {
    console.log('⚠️  SOME TESTS FAILED. Check errors above.');
  }
  console.log('='.repeat(50) + '\n');
  
  return {
    allPassed,
    tests,
    apiBaseUrl: API_BASE_URL,
  };
};

// Quick test function for manual testing
export const quickTest = () => {
  console.log('🚀 Running quick backend connection test...');
  testBackendConnection();
};
