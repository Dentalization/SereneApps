/**
 * Test script to simulate appointment creation from mobile app
 * This helps debug the phantom booking issue
 */

import axios from 'axios';

const API_BASE_URL = 'http://localhost:4000/v1';

// Test credentials - replace with actual test user
const TEST_PATIENT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Mjg4LCJyb2xlIjoicGF0aWVudCIsImlhdCI6MTczNzAyODIyMSwiZXhwIjoxNzM3MDMxODIxfQ.nC_JQzjJFZQV_U7o3W8bM5A6NNkC7WVKR-Z1MrJK8_o'; // Replace with valid token
const TEST_DENTIST_PROFILE_ID = 1; // Replace with valid dentist profile ID
const TEST_CLINIC_BRANCH_ID = 1; // Replace with valid clinic branch ID or null for independent

async function testAppointmentCreation() {
  console.log('\n=== Testing Appointment Creation ===\n');
  
  // Create appointment payload matching mobile app format
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(15, 30, 0, 0);
  
  const appointmentStart = tomorrow.toISOString();
  const appointmentEnd = new Date(tomorrow.getTime() + 60 * 60 * 1000).toISOString();
  
  const payload = {
    dentistId: TEST_DENTIST_PROFILE_ID,
    clinicBranchId: TEST_CLINIC_BRANCH_ID,
    start: appointmentStart,
    end: appointmentEnd,
    appointmentType: 'onsite',
    reason: 'Test appointment from script',
    notes: 'This is a test to debug phantom booking issue',
    metadata: {
      testRun: true,
      timestamp: new Date().toISOString()
    }
  };
  
  console.log('📤 Request Payload:');
  console.log(JSON.stringify(payload, null, 2));
  console.log('');
  
  try {
    const response = await axios.post(
      `${API_BASE_URL}/appointments`,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${TEST_PATIENT_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Response Status:', response.status);
    console.log('📥 Response Data:');
    console.log(JSON.stringify(response.data, null, 2));
    console.log('');
    
    // Verify appointment ID
    const appointmentId = response.data?.appointment?.id;
    if (appointmentId) {
      console.log(`🎯 Appointment Created with ID: ${appointmentId}`);
      console.log(`📋 Booking Code: SRN-${String(appointmentId).padStart(6, '0')}`);
      console.log('');
      console.log('🔍 Please verify this appointment exists in the database:');
      console.log(`   SELECT * FROM appointments WHERE id = ${appointmentId};`);
      console.log(`   SELECT * FROM appointment_status_history WHERE appointment_id = ${appointmentId};`);
    } else {
      console.warn('⚠️ No appointment ID in response!');
      console.warn('Response structure:', Object.keys(response.data || {}));
    }
    
  } catch (error) {
    console.error('❌ Error creating appointment:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Message:', error.message);
    }
  }
}

// Run the test
testAppointmentCreation();
