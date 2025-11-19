#!/bin/bash

echo "🧪 Testing Avatar Upload Endpoint"
echo "======================================"
echo ""

# Step 1: Register new patient
echo "📝 Step 1: Registering new patient..."
REGISTER_RESPONSE=$(curl -s -X POST http://localhost:4000/v1/auth/patient/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Avatar Test User",
    "email": "avatartest'$(date +%s)'@test.com",
    "password": "Test123!",
    "phoneNumber": "+628777666555"
  }')

TOKEN=$(echo $REGISTER_RESPONSE | jq -r '.accessToken')
USER_ID=$(echo $REGISTER_RESPONSE | jq -r '.user.id')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Registration failed!"
  echo "$REGISTER_RESPONSE" | jq '.'
  exit 1
fi

echo "✅ Registration successful!"
echo "🔑 User ID: $USER_ID"
echo "🔑 Access Token: ${TOKEN:0:50}..."
echo ""

# Step 2: Create a dummy image file
echo "📝 Step 2: Creating test image..."
TEMP_IMAGE="/tmp/test-avatar-$$.jpg"
# Create a 1x1 red pixel JPEG
echo -n -e '\xff\xd8\xff\xe0\x00\x10\x4a\x46\x49\x46\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00\xff\xdb\x00\x43\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\x09\x09\x08\x0a\x0c\x14\x0d\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a\x1f\x1e\x1d\x1a\x1c\x1c\x20\x24\x2e\x27\x20\x22\x2c\x23\x1c\x1c\x28\x37\x29\x2c\x30\x31\x34\x34\x34\x1f\x27\x39\x3d\x38\x32\x3c\x2e\x33\x34\x32\xff\xc0\x00\x0b\x08\x00\x01\x00\x01\x01\x01\x11\x00\xff\xc4\x00\x14\x00\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\xff\xc4\x00\x14\x10\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\xff\xda\x00\x08\x01\x01\x00\x00\x3f\x00\x7f\xff\xd9' > "$TEMP_IMAGE"

echo "✅ Test image created at: $TEMP_IMAGE"
echo ""

# Step 3: Upload avatar
echo "📝 Step 3: Uploading avatar..."
UPLOAD_RESPONSE=$(curl -s -X POST http://localhost:4000/v1/patient/avatar \
  -H "Authorization: Bearer $TOKEN" \
  -F "avatar=@$TEMP_IMAGE")

echo "$UPLOAD_RESPONSE" | jq '.'

if echo "$UPLOAD_RESPONSE" | jq -e '.status == "success"' > /dev/null 2>&1; then
  AVATAR_URL=$(echo "$UPLOAD_RESPONSE" | jq -r '.data.avatar_url')
  echo ""
  echo "✅ Avatar upload successful!"
  echo "🖼️  Avatar URL: $AVATAR_URL"
  
  # Verify file exists
  if [ -f "backend$AVATAR_URL" ]; then
    echo "✅ Avatar file exists on server"
  else
    echo "⚠️  Avatar file not found at: backend$AVATAR_URL"
  fi
else
  echo ""
  echo "❌ Avatar upload failed!"
fi

# Cleanup
rm -f "$TEMP_IMAGE"

echo ""
echo "======================================"
echo "✨ Test completed!"
