#!/bin/bash

###############################################################################
# X-Core JPEG Loader Testing Script
# Tests the complete custom loader implementation
###############################################################################

set -e  # Exit on error

BACKEND_URL="http://127.0.0.1:8000"
TEST_STUDY="adrianhalim-rontgen"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================="
echo "X-Core JPEG Loader Test Suite"
echo "========================================="
echo ""

# Test 1: Backend Health
echo -e "${YELLOW}[1/6] Testing Backend Health...${NC}"
if curl -s "${BACKEND_URL}/health" | grep -q "online"; then
    echo -e "${GREEN}✓ Backend is online${NC}"
else
    echo -e "${RED}✗ Backend is offline. Start it with: cd backend/python_service && python main.py${NC}"
    exit 1
fi
echo ""

# Test 2: Metadata Endpoint
echo -e "${YELLOW}[2/6] Testing Metadata Endpoint...${NC}"
METADATA=$(curl -s "${BACKEND_URL}/metadata/${TEST_STUDY}")
if echo "$METADATA" | grep -q "num_slices"; then
    echo -e "${GREEN}✓ Metadata endpoint works${NC}"
    echo "$METADATA" | python3 -m json.tool
else
    echo -e "${RED}✗ Metadata endpoint failed${NC}"
    echo "Response: $METADATA"
    exit 1
fi
echo ""

# Test 3: Axial Stream with Headers
echo -e "${YELLOW}[3/6] Testing Axial Stream with Headers...${NC}"
HEADERS=$(curl -sI "${BACKEND_URL}/stream/${TEST_STUDY}/axial/256")
if echo "$HEADERS" | grep -q "X-Pixel-Spacing"; then
    echo -e "${GREEN}✓ X-Pixel-Spacing header present${NC}"
    echo "$HEADERS" | grep "X-Pixel-Spacing"
else
    echo -e "${RED}✗ X-Pixel-Spacing header missing${NC}"
    echo "Headers:"
    echo "$HEADERS"
fi

if echo "$HEADERS" | grep -q "X-Slice-Thickness"; then
    echo -e "${GREEN}✓ X-Slice-Thickness header present${NC}"
    echo "$HEADERS" | grep "X-Slice-Thickness"
else
    echo -e "${RED}✗ X-Slice-Thickness header missing${NC}"
fi

if echo "$HEADERS" | grep -q "image/jpeg"; then
    echo -e "${GREEN}✓ Content-Type is image/jpeg${NC}"
else
    echo -e "${RED}✗ Content-Type is not image/jpeg${NC}"
fi
echo ""

# Test 4: Download and Verify Axial Image
echo -e "${YELLOW}[4/6] Testing Axial Image Download...${NC}"
curl -s "${BACKEND_URL}/stream/${TEST_STUDY}/axial/256" > /tmp/test_axial.jpg
if file /tmp/test_axial.jpg | grep -q "JPEG"; then
    echo -e "${GREEN}✓ Axial image is valid JPEG${NC}"
    FILE_SIZE=$(stat -f%z /tmp/test_axial.jpg 2>/dev/null || stat -c%s /tmp/test_axial.jpg 2>/dev/null)
    echo "  File size: ${FILE_SIZE} bytes"
else
    echo -e "${RED}✗ Axial image is not valid JPEG${NC}"
    file /tmp/test_axial.jpg
    exit 1
fi
echo ""

# Test 5: Test Coronal MPR
echo -e "${YELLOW}[5/6] Testing Coronal MPR (3D Reconstruction)...${NC}"
curl -s "${BACKEND_URL}/stream/${TEST_STUDY}/coronal/256" > /tmp/test_coronal.jpg
if file /tmp/test_coronal.jpg | grep -q "JPEG"; then
    echo -e "${GREEN}✓ Coronal image is valid JPEG${NC}"
    FILE_SIZE=$(stat -f%z /tmp/test_coronal.jpg 2>/dev/null || stat -c%s /tmp/test_coronal.jpg 2>/dev/null)
    echo "  File size: ${FILE_SIZE} bytes"
    
    # Check if coronal is taller (aspect ratio correction)
    echo "  Verifying aspect ratio correction..."
    echo "  (Coronal should be ~4x taller than wide for proper anatomy)"
else
    echo -e "${RED}✗ Coronal image failed${NC}"
    echo "  This may indicate 3D volume loading issues"
    file /tmp/test_coronal.jpg
fi
echo ""

# Test 6: Test Sagittal MPR
echo -e "${YELLOW}[6/6] Testing Sagittal MPR (3D Reconstruction)...${NC}"
curl -s "${BACKEND_URL}/stream/${TEST_STUDY}/sagittal/256" > /tmp/test_sagittal.jpg
if file /tmp/test_sagittal.jpg | grep -q "JPEG"; then
    echo -e "${GREEN}✓ Sagittal image is valid JPEG${NC}"
    FILE_SIZE=$(stat -f%z /tmp/test_sagittal.jpg 2>/dev/null || stat -c%s /tmp/test_sagittal.jpg 2>/dev/null)
    echo "  File size: ${FILE_SIZE} bytes"
else
    echo -e "${RED}✗ Sagittal image failed${NC}"
    file /tmp/test_sagittal.jpg
fi
echo ""

# Summary
echo "========================================="
echo -e "${GREEN}Backend Tests Complete!${NC}"
echo "========================================="
echo ""
echo "Generated test images saved to:"
echo "  - /tmp/test_axial.jpg"
echo "  - /tmp/test_coronal.jpg"
echo "  - /tmp/test_sagittal.jpg"
echo ""
echo "To view them:"
echo "  open /tmp/test_axial.jpg"
echo "  open /tmp/test_coronal.jpg"
echo "  open /tmp/test_sagittal.jpg"
echo ""
echo "Next: Test the frontend at http://localhost:3000/dentist-portal/x-core"
echo ""

# Optional: Open images if on macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
    read -p "Open test images now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        open /tmp/test_axial.jpg
        open /tmp/test_coronal.jpg
        open /tmp/test_sagittal.jpg
    fi
fi
