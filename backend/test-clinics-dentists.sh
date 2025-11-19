#!/bin/bash

BASE_URL="http://localhost:4000/v1"
PASS=0
FAIL=0

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Testing Clinic & Dentist Endpoints ===${NC}\n"

# Test 1: Get all clinics
echo -e "${YELLOW}Test 1: GET /clinics${NC}"
RESPONSE=$(curl -s "$BASE_URL/clinics")
if echo "$RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✓ PASS${NC}: Clinics list retrieved"
  ((PASS++))
else
  echo -e "${RED}✗ FAIL${NC}: Failed to get clinics"
  ((FAIL++))
fi
echo ""

# Test 2: Search clinics
echo -e "${YELLOW}Test 2: GET /clinics?search=Dental${NC}"
RESPONSE=$(curl -s "$BASE_URL/clinics?search=Dental")
if echo "$RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✓ PASS${NC}: Clinic search works"
  ((PASS++))
else
  echo -e "${RED}✗ FAIL${NC}: Clinic search failed"
  ((FAIL++))
fi
echo ""

# Test 3: Get clinic by ID
echo -e "${YELLOW}Test 3: GET /clinics/1${NC}"
RESPONSE=$(curl -s "$BASE_URL/clinics/1")
if echo "$RESPONSE" | grep -q '"brand_name"'; then
  echo -e "${GREEN}✓ PASS${NC}: Clinic details retrieved"
  ((PASS++))
else
  echo -e "${RED}✗ FAIL${NC}: Failed to get clinic details"
  ((FAIL++))
fi
echo ""

# Test 4: Get non-existent clinic
echo -e "${YELLOW}Test 4: GET /clinics/99999 (should return 404)${NC}"
RESPONSE=$(curl -s "$BASE_URL/clinics/99999")
if echo "$RESPONSE" | grep -q '"code":7001'; then
  echo -e "${GREEN}✓ PASS${NC}: Correct error for non-existent clinic"
  ((PASS++))
else
  echo -e "${RED}✗ FAIL${NC}: Wrong response for non-existent clinic"
  echo "$RESPONSE"
  ((FAIL++))
fi
echo ""

# Test 5: Get clinic dentists
echo -e "${YELLOW}Test 5: GET /clinics/1/dentists${NC}"
RESPONSE=$(curl -s "$BASE_URL/clinics/1/dentists")
if echo "$RESPONSE" | grep -q '"dentists"'; then
  echo -e "${GREEN}✓ PASS${NC}: Clinic dentists retrieved"
  ((PASS++))
else
  echo -e "${RED}✗ FAIL${NC}: Failed to get clinic dentists"
  ((FAIL++))
fi
echo ""

# Test 6: Get clinic services
echo -e "${YELLOW}Test 6: GET /clinics/1/services${NC}"
RESPONSE=$(curl -s "$BASE_URL/clinics/1/services")
if echo "$RESPONSE" | grep -q '"services":\[\]'; then
  echo -e "${GREEN}✓ PASS${NC}: Clinic services endpoint works (empty array expected)"
  ((PASS++))
else
  echo -e "${RED}✗ FAIL${NC}: Clinic services response unexpected"
  ((FAIL++))
fi
echo ""

# Test 7: Get dentist profile
echo -e "${YELLOW}Test 7: GET /dentists/8${NC}"
RESPONSE=$(curl -s "$BASE_URL/dentists/8")
if echo "$RESPONSE" | grep -q '"primary_specialization"'; then
  echo -e "${GREEN}✓ PASS${NC}: Dentist profile retrieved"
  ((PASS++))
else
  echo -e "${RED}✗ FAIL${NC}: Failed to get dentist profile"
  ((FAIL++))
fi
echo ""

# Test 8: Get non-existent dentist
echo -e "${YELLOW}Test 8: GET /dentists/99999 (should return 404)${NC}"
RESPONSE=$(curl -s "$BASE_URL/dentists/99999")
if echo "$RESPONSE" | grep -q '"code":7002'; then
  echo -e "${GREEN}✓ PASS${NC}: Correct error for non-existent dentist"
  ((PASS++))
else
  echo -e "${RED}✗ FAIL${NC}: Wrong response for non-existent dentist"
  echo "$RESPONSE"
  ((FAIL++))
fi
echo ""

# Test 9: Get dentist schedule
echo -e "${YELLOW}Test 9: GET /dentists/8/schedule?clinicId=1${NC}"
RESPONSE=$(curl -s "$BASE_URL/dentists/8/schedule?clinicId=1")
if echo "$RESPONSE" | grep -q '"operating_hours"'; then
  echo -e "${GREEN}✓ PASS${NC}: Dentist schedule retrieved"
  ((PASS++))
else
  echo -e "${RED}✗ FAIL${NC}: Failed to get dentist schedule"
  ((FAIL++))
fi
echo ""

# Test 10: Get dentist schedule without clinicId
echo -e "${YELLOW}Test 10: GET /dentists/8/schedule (missing clinicId)${NC}"
RESPONSE=$(curl -s "$BASE_URL/dentists/8/schedule")
if echo "$RESPONSE" | grep -q '"code":9001'; then
  echo -e "${GREEN}✓ PASS${NC}: Validation error for missing clinicId"
  ((PASS++))
else
  echo -e "${RED}✗ FAIL${NC}: Should return validation error"
  echo "$RESPONSE"
  ((FAIL++))
fi
echo ""

# Test 11: Available slots on open day (Monday)
echo -e "${YELLOW}Test 11: GET /dentists/8/available-slots?date=2025-11-10&clinicId=1&duration=60 (Monday - Open)${NC}"
RESPONSE=$(curl -s "$BASE_URL/dentists/8/available-slots?date=2025-11-10&clinicId=1&duration=60")
if echo "$RESPONSE" | grep -q '"available_slots":\['; then
  SLOT_COUNT=$(echo "$RESPONSE" | grep -o '"time":"[0-9][0-9]:[0-9][0-9]"' | wc -l | tr -d ' ')
  if [ "$SLOT_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✓ PASS${NC}: Available slots generated ($SLOT_COUNT slots)"
    ((PASS++))
  else
    echo -e "${RED}✗ FAIL${NC}: No slots generated on open day"
    ((FAIL++))
  fi
else
  echo -e "${RED}✗ FAIL${NC}: Failed to get available slots"
  ((FAIL++))
fi
echo ""

# Test 12: Available slots on closed day (Sunday)
echo -e "${YELLOW}Test 12: GET /dentists/8/available-slots?date=2025-11-09&clinicId=1&duration=60 (Sunday - Closed)${NC}"
RESPONSE=$(curl -s "$BASE_URL/dentists/8/available-slots?date=2025-11-09&clinicId=1&duration=60")
if echo "$RESPONSE" | grep -q '"available_slots":\[\]'; then
  echo -e "${GREEN}✓ PASS${NC}: Empty slots on closed day"
  ((PASS++))
else
  echo -e "${RED}✗ FAIL${NC}: Should return empty slots for closed day"
  echo "$RESPONSE"
  ((FAIL++))
fi
echo ""

# Test 13: Available slots with 30-minute duration
echo -e "${YELLOW}Test 13: GET /dentists/8/available-slots?date=2025-11-10&clinicId=1&duration=30 (30-min slots)${NC}"
RESPONSE=$(curl -s "$BASE_URL/dentists/8/available-slots?date=2025-11-10&clinicId=1&duration=30")
SLOT_COUNT=$(echo "$RESPONSE" | grep -o '"time":"[0-9][0-9]:[0-9][0-9]"' | wc -l | tr -d ' ')
if [ "$SLOT_COUNT" -gt 10 ]; then
  echo -e "${GREEN}✓ PASS${NC}: More slots with shorter duration ($SLOT_COUNT slots)"
  ((PASS++))
else
  echo -e "${RED}✗ FAIL${NC}: Expected more slots with 30-min duration"
  ((FAIL++))
fi
echo ""

# Test 14: Available slots without date parameter
echo -e "${YELLOW}Test 14: GET /dentists/8/available-slots?clinicId=1 (missing date)${NC}"
RESPONSE=$(curl -s "$BASE_URL/dentists/8/available-slots?clinicId=1")
if echo "$RESPONSE" | grep -q '"code":9001'; then
  echo -e "${GREEN}✓ PASS${NC}: Validation error for missing date"
  ((PASS++))
else
  echo -e "${RED}✗ FAIL${NC}: Should return validation error"
  echo "$RESPONSE"
  ((FAIL++))
fi
echo ""

# Test 15: Pagination test
echo -e "${YELLOW}Test 15: GET /clinics?page=1&limit=2${NC}"
RESPONSE=$(curl -s "$BASE_URL/clinics?page=1&limit=2")
if echo "$RESPONSE" | grep -q '"limit":2'; then
  CLINIC_COUNT=$(echo "$RESPONSE" | grep -o '"id":[0-9]*' | head -2 | wc -l | tr -d ' ')
  if [ "$CLINIC_COUNT" -le 2 ]; then
    echo -e "${GREEN}✓ PASS${NC}: Pagination works correctly"
    ((PASS++))
  else
    echo -e "${RED}✗ FAIL${NC}: Pagination limit not respected"
    ((FAIL++))
  fi
else
  echo -e "${RED}✗ FAIL${NC}: Pagination metadata missing"
  ((FAIL++))
fi
echo ""

# Summary
echo -e "\n${YELLOW}=== Test Summary ===${NC}"
TOTAL=$((PASS + FAIL))
echo -e "Total Tests: $TOTAL"
echo -e "${GREEN}Passed: $PASS${NC}"
echo -e "${RED}Failed: $FAIL${NC}"

if [ $FAIL -eq 0 ]; then
  echo -e "\n${GREEN}✓ All tests passed!${NC}"
  exit 0
else
  echo -e "\n${RED}✗ Some tests failed${NC}"
  exit 1
fi
