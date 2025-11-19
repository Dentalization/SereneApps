// Simple script to test the staff API endpoint
const axios = require('axios');

// Get token from command line argument or use a default test token
const token = process.argv[2] || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0Iiwicm9sZXMiOlsib3duZXIiXSwiaWF0IjoxNzU5NDAwNzAxLCJleHAiOjE3NTk0MDE2MDF9.3i6FQLZdDtnb40JkN4nFzKGTSo_oGoRXKXgAbl1TOZ4';

// Base URL from .env file
const baseURL = 'http://localhost:4000';

async function testAPI() {
  console.log('Testing Staff API...');
  console.log('Base URL:', baseURL);
  console.log('Token:', token.substring(0, 20) + '...');

  try {
    // Test health endpoint (no auth required)
    console.log('\n1. Testing health endpoint...');
    const healthResponse = await axios.get(`${baseURL}/health`);
    console.log('Health endpoint response:', healthResponse.status, healthResponse.data);

    // Create axios instance with auth header
    const authAxios = axios.create({
      baseURL,
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    // Test debug endpoint (auth required)
    console.log('\n2. Testing debug endpoint...');
    const debugUrl = '/v1/clinic/debug-user';
    console.log('Debug endpoint URL:', baseURL + debugUrl);
    try {
      const debugResponse = await authAxios.get(debugUrl);
      console.log('Debug endpoint response:', debugResponse.status);
      console.log('Debug data:', debugResponse.data);
    } catch (error) {
      console.error('Debug endpoint error:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
        baseURL: error.config?.baseURL,
        fullURL: (error.config?.baseURL || '') + (error.config?.url || '')
      });
    }

    // Test staff endpoint (auth required)
    console.log('\n3. Testing staff endpoint...');
    const staffUrl = '/v1/clinic/staff';
    console.log('Staff endpoint URL:', baseURL + staffUrl);
    try {
      const staffResponse = await authAxios.get(staffUrl);
      console.log('Staff endpoint response:', staffResponse.status);
      console.log('Staff count:', staffResponse.data?.staff?.length || 0);
      console.log('Staff data:', JSON.stringify(staffResponse.data, null, 2));
    } catch (error) {
      console.error('Staff endpoint error:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        url: error.config?.url,
        baseURL: error.config?.baseURL,
        fullURL: (error.config?.baseURL || '') + (error.config?.url || '')
      });
    }

  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testAPI();