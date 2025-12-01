#!/bin/bash

# DeepDental Production API Connection Test
# Tests connection to https://api.dentalization.id

echo "🔍 Testing DeepDental Production API..."
echo "================================================"
echo ""

# Configuration
API_URL="https://api.dentalization.id/api/v1"
API_KEY="${1:-dd_live_your_api_key_here}"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if API key provided
if [ "$API_KEY" = "dd_live_your_api_key_here" ]; then
    echo -e "${YELLOW}⚠️  No API key provided${NC}"
    echo ""
    echo "Usage:"
    echo "  ./test-production-api.sh dd_live_your_real_key_here"
    echo ""
    echo "Or set environment variable:"
    echo "  export EXPO_PUBLIC_AI_KEY='dd_live_your_real_key_here'"
    echo "  ./test-production-api.sh"
    echo ""
    exit 1
fi

echo -e "${BLUE}API URL: ${API_URL}${NC}"
echo -e "${BLUE}API Key: ${API_KEY:0:15}...${NC}"
echo ""

# Test 1: Health Check (No Auth)
echo "Test 1: Health Check Endpoint"
echo "URL: ${API_URL}/health"
echo "Method: GET (No authentication required)"
echo ""

HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "${API_URL}/health" 2>&1)
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$HEALTH_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Health Check PASSED${NC}"
    echo "Response:"
    echo "$RESPONSE_BODY" | jq . 2>/dev/null || echo "$RESPONSE_BODY"
else
    echo -e "${RED}❌ Health Check FAILED${NC}"
    echo "HTTP Code: $HTTP_CODE"
    echo "Response: $RESPONSE_BODY"
    echo ""
    echo -e "${RED}⚠️  Production API is not accessible${NC}"
    echo "Check your internet connection or API status at:"
    echo "  https://api.dentalization.id/docs"
    exit 1
fi

echo ""
echo "================================================"
echo ""

# Test 2: Create Session (With Auth)
echo "Test 2: Create Session Endpoint"
echo "URL: ${API_URL}/sessions"
echo "Method: POST"
echo "Auth: X-API-Key"
echo ""

SESSION_RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST "${API_URL}/sessions" \
    -H "X-API-Key: ${API_KEY}" \
    -H "Content-Type: application/json" \
    -d '{
        "role": "patient",
        "language": "bilingual",
        "metadata": {
            "source": "connection_test_production"
        }
    }' 2>&1)

HTTP_CODE=$(echo "$SESSION_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$SESSION_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Create Session PASSED${NC}"
    echo "Response:"
    echo "$RESPONSE_BODY" | jq . 2>/dev/null || echo "$RESPONSE_BODY"
    
    # Extract session ID
    SESSION_ID=$(echo "$RESPONSE_BODY" | jq -r '.id' 2>/dev/null)
    
    if [ "$SESSION_ID" != "null" ] && [ -n "$SESSION_ID" ]; then
        echo ""
        echo -e "${GREEN}Session ID: $SESSION_ID${NC}"
        
        # Clean up: Delete the test session
        echo ""
        echo "Cleaning up test session..."
        DELETE_RESPONSE=$(curl -s -w "\n%{http_code}" \
            -X DELETE "${API_URL}/sessions/${SESSION_ID}" \
            -H "X-API-Key: ${API_KEY}" 2>&1)
        
        DELETE_CODE=$(echo "$DELETE_RESPONSE" | tail -n1)
        if [ "$DELETE_CODE" = "200" ] || [ "$DELETE_CODE" = "204" ]; then
            echo -e "${GREEN}✅ Test session cleaned up${NC}"
        fi
    fi
else
    echo -e "${RED}❌ Create Session FAILED${NC}"
    echo "HTTP Code: $HTTP_CODE"
    echo "Response: $RESPONSE_BODY"
    
    if [ "$HTTP_CODE" = "401" ]; then
        echo ""
        echo -e "${RED}⚠️  API Key is INVALID${NC}"
        echo "Current API Key: ${API_KEY}"
        echo ""
        echo "To fix:"
        echo "  1. Contact admin for valid production API key"
        echo "  2. Update your .env file:"
        echo "     EXPO_PUBLIC_AI_KEY=dd_live_your_real_key_here"
        echo "  3. Restart Expo: npx expo start -c"
    fi
    exit 1
fi

echo ""
echo "================================================"
echo ""

# Test 3: List Sessions
echo "Test 3: List Sessions Endpoint"
echo "URL: ${API_URL}/sessions"
echo "Method: GET"
echo ""

LIST_RESPONSE=$(curl -s -w "\n%{http_code}" \
    "${API_URL}/sessions?page=1&per_page=5" \
    -H "X-API-Key: ${API_KEY}" 2>&1)

HTTP_CODE=$(echo "$LIST_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$LIST_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ List Sessions PASSED${NC}"
    
    TOTAL=$(echo "$RESPONSE_BODY" | jq -r '.total' 2>/dev/null)
    echo "Total sessions: $TOTAL"
else
    echo -e "${YELLOW}⚠️  List Sessions response: $HTTP_CODE${NC}"
fi

echo ""
echo "================================================"
echo ""

# Summary
echo "🎯 Connection Test Summary"
echo "================================================"
echo "API URL: ${API_URL}"
echo "API Key: ${API_KEY:0:15}..."
echo ""

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ ALL TESTS PASSED${NC}"
    echo ""
    echo "Your production API key is valid and working!"
    echo ""
    echo "Next steps for mobile app:"
    echo "  1. Create .env file in mobile/ folder"
    echo "  2. Add: EXPO_PUBLIC_AI_URL=${API_URL}"
    echo "  3. Add: EXPO_PUBLIC_AI_KEY=${API_KEY}"
    echo "  4. Restart: npx expo start -c"
    echo "  5. Test AI Diagnosis in the app"
    echo ""
    echo "Environment setup:"
    echo "  export EXPO_PUBLIC_AI_URL=\"${API_URL}\""
    echo "  export EXPO_PUBLIC_AI_KEY=\"${API_KEY}\""
    echo "  npx expo start"
else
    echo -e "${RED}❌ TESTS FAILED${NC}"
    echo ""
    echo "Please fix the API key issue before using the mobile app."
    echo "See SETUP_API_KEY.md for detailed instructions."
fi

echo ""
echo "API Documentation: https://api.dentalization.id/docs"
echo ""
