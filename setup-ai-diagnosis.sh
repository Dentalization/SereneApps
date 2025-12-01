#!/bin/bash

# AI Diagnosis Quick Start Script
# This script helps setup and test AI Diagnosis feature

echo "🚀 SereneAI - AI Diagnosis Setup Helper"
echo "========================================"
echo ""

# Function to get local IP
get_local_ip() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -n 1)
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        IP=$(hostname -I | awk '{print $1}')
    else
        echo "⚠️  Windows detected. Please run: ipconfig"
        echo "    Look for IPv4 Address"
        exit 1
    fi
    echo $IP
}

# Get IP
echo "🔍 Detecting your local IP address..."
LOCAL_IP=$(get_local_ip)

if [ -z "$LOCAL_IP" ]; then
    echo "❌ Could not detect IP address!"
    echo "   Please find it manually:"
    echo "   - macOS: System Preferences → Network"
    echo "   - Linux: ip addr show"
    echo "   - Windows: ipconfig"
    exit 1
fi

echo "✅ Your local IP: $LOCAL_IP"
echo ""

# Ask to update config
echo "📝 Current configuration:"
grep "const LOCAL_IP" mobile/src/config/api.config.js || echo "Config file not found!"
echo ""

read -p "Update api.config.js with this IP? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Update config file
    sed -i.bak "s/const LOCAL_IP = '.*'/const LOCAL_IP = '$LOCAL_IP'/" mobile/src/config/api.config.js
    echo "✅ Config updated!"
    echo ""
fi

# Check servers
echo "🔍 Checking if servers are running..."
echo ""

# Check backend (port 3000)
if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "✅ Backend server: RUNNING (port 3000)"
else
    echo "❌ Backend server: NOT RUNNING"
    echo "   Start with: cd backend && npm start"
fi

# Check AI server (port 8000)
if curl -s http://localhost:8000/api/v1/health > /dev/null 2>&1; then
    echo "✅ AI server: RUNNING (port 8000)"
else
    echo "❌ AI server: NOT RUNNING"
    echo "   Start with: cd deepdental-api && python main.py"
fi

echo ""

# Test from phone IP
echo "📱 Test these URLs from your phone's browser:"
echo "   Backend: http://$LOCAL_IP:3000/api/health"
echo "   AI API:  http://$LOCAL_IP:8000/api/v1/health"
echo ""

# Check dependencies
echo "📦 Checking mobile dependencies..."
cd mobile

if npm list expo-camera expo-file-system expo-constants > /dev/null 2>&1; then
    echo "✅ All dependencies installed"
else
    echo "⚠️  Some dependencies missing"
    read -p "Install missing dependencies? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        npm install
    fi
fi

cd ..

echo ""
echo "✅ Setup complete!"
echo ""
echo "🎯 Next steps:"
echo "1. Make sure both servers are running"
echo "2. Phone and computer on same WiFi"
echo "3. Test URLs from phone browser"
echo "4. Run: cd mobile && npm start"
echo "5. Scan QR code with Expo Go"
echo ""
echo "📚 For detailed setup: mobile/SETUP_AI_DIAGNOSIS.md"
echo "🔧 For troubleshooting: mobile/AI_DIAGNOSIS_FIXES.md"
