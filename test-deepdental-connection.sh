#!/bin/bash

# DeepDental API Connection Test
# This script verifies the DeepDental AI server is accessible

echo "🔍 Testing DeepDental AI Server Connection..."
echo "================================================"
echo ""

# Configuration
API_URL="http://localhost:8000/api/v1"
API_KEY="dd_live_your_api_key_here"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

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
    echo -e "${YELLOW}⚠️  Server is not running on port 8000${NC}"
    echo "To start the server:"
    echo "  1. cd /path/to/deepdental-api"
    echo "  2. python main.py"
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
            "source": "connection_test"
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
        echo -e "${YELLOW}⚠️  API Key is invalid${NC}"
        echo "Current API Key: ${API_KEY}"
        echo "To generate a new API key:"
        echo "  python scripts/create_api_key.py"
    fi
fi

echo ""
echo "================================================"
echo ""

# Summary
echo "🎯 Connection Test Summary"
echo "================================================"
echo "API URL: ${API_URL}"
echo "API Key: ${API_KEY}"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ ALL TESTS PASSED${NC}"
    echo ""
    echo "Your DeepDental AI server is ready!"
    echo "You can now use the mobile app for AI diagnosis."
    echo ""
    echo "Next steps:"
    echo "  1. cd mobile"
    echo "  2. npm start"
    echo "  3. Test AI Diagnosis feature"
else
    echo -e "${RED}❌ TESTS FAILED${NC}"
    echo ""
    echo "Please fix the issues above before using the mobile app."
fi

echo ""
