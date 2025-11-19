#!/bin/bash

echo "🧪 Testing Patient Profile Endpoints"
echo "======================================"
echo ""

# Step 1: Register new patient
echo "📝 Step 1: Registering new patient..."
REGISTER_RESPONSE=$(curl -s -X POST http://localhost:4000/v1/auth/patient/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Profile User",
    "email": "profiletest'$(date +%s)'@test.com",
    "password": "Test123!",
    "phoneNumber": "+628999888777"
  }')

TOKEN=$(echo $REGISTER_RESPONSE | jq -r '.accessToken')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Registration failed!"
  echo "$REGISTER_RESPONSE"
  exit 1
fi

echo "✅ Registration successful!"
echo "🔑 Access Token: ${TOKEN:0:50}..."
echo ""

# Step 2: Update profile
echo "�� Step 2: Updating patient profile..."
PROFILE_RESPONSE=$(curl -s -X PUT http://localhost:4000/v1/patient/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "date_of_birth": "1990-05-15",
    "gender": "male",
    "insurance_provider": "BPJS Kesehatan",
    "insurance_number": "0001234567890",
    "insurance_member_id": "PLAT-9912",
    "preferred_language": "id",
    "address": {
      "line1": "Jl. Sudirman No. 123",
      "line2": "Apt 45",
      "city": "Jakarta",
      "province": "DKI Jakarta",
      "postalCode": "12190"
    },
    "emergency_contact": {
      "name": "Jane Doe",
      "phone": "+6281987654321",
      "relationship": "Spouse"
    },
    "medical_details": {
      "allergies": ["Penicillin"],
      "medications": ["Aspirin 100mg"],
      "chronicConditions": ["Hypertension"],
      "notes": "Regular checkup needed"
    }
  }')

echo "$PROFILE_RESPONSE" | jq '.'

if echo "$PROFILE_RESPONSE" | jq -e '.status == "success"' > /dev/null 2>&1; then
  echo ""
  echo "✅ Profile update successful!"
else
  echo ""
  echo "❌ Profile update failed!"
fi

echo ""
echo "======================================"
echo "✨ Test completed!"
