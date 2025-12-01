# 🚀 Starting DeepDental AI Server

## Prerequisites
Your DeepDental API server needs to be running on port 8000 for the mobile app to work.

## Quick Start

### 1. Navigate to DeepDental Project
```bash
cd /path/to/your/deepdental-api-project
```

### 2. Activate Virtual Environment (if using)
```bash
# macOS/Linux
source venv/bin/activate

# Windows
venv\Scripts\activate
```

### 3. Start the Server
```bash
python main.py
```

The server should start on `http://localhost:8000`

### 4. Verify Server is Running
Open a new terminal and run:
```bash
curl http://localhost:8000/api/v1/health
```

Expected response:
```json
{
  "status": "ok",
  "components": {
    "llm": "available",
    "yolo": "available",
    "vector_db": "available"
  }
}
```

## Important Configuration

### API Key Setup
Based on your Postman collection, the API key is: `dd_live_your_api_key_here`

This is currently set in `/mobile/src/config/api.config.js`

**For Production:** You should:
1. Generate a real API key using the DeepDental server's `scripts/create_api_key.py`
2. Store it securely using React Native's SecureStore
3. Never commit API keys to version control

### Update API Key in Mobile App
If you have a different API key, edit:
```javascript
// mobile/src/config/api.config.js
AI_API_KEY: 'dd_live_your_actual_key_here'
```

## Testing the Integration

### 1. Start Backend (Port 3000)
```bash
cd backend
npm start
```

### 2. Start AI Server (Port 8000)
```bash
cd /path/to/deepdental-api
python main.py
```

### 3. Start Mobile App
```bash
cd mobile
npm start
```

### 4. Test AI Diagnosis Flow
1. Open the mobile app
2. Navigate to AI Diagnosis
3. Take/select a dental image
4. Wait for analysis
5. View results with detections and recommendations

## Troubleshooting

### "Connection refused" on localhost:8000
- AI server is not running
- Start it with `python main.py` in the DeepDental project

### "Invalid API Key" error
- Check the API key in `api.config.js` matches your server
- Generate new key: `python scripts/create_api_key.py`

### Physical Device Testing
If testing on a physical device, update `LOCAL_IP` in `api.config.js`:
```javascript
const LOCAL_IP = '192.168.1.12'; // Your computer's IP
```

Find your IP:
- macOS: `ifconfig | grep "inet " | grep -v 127.0.0.1`
- Windows: `ipconfig`
- Linux: `hostname -I`

### Timeout Errors
- Image analysis can take 30-60 seconds
- Check server logs for processing status
- Ensure good internet connection for LLM API

## API Endpoints Being Used

The mobile app uses these DeepDental API endpoints:

1. **Health Check** (GET `/api/v1/health`)
   - No auth required
   - Verifies server status

2. **Create Session** (POST `/api/v1/sessions`)
   - Creates new diagnosis session
   - Returns session_id for tracking

3. **Analyze Image** (POST `/api/v1/images/analyze`)
   - Full AI analysis with YOLO + Gemini
   - Returns findings, detections, annotated image
   - Requires X-API-Key header

4. **List Sessions** (GET `/api/v1/sessions`)
   - Retrieves diagnosis history
   - Paginated results

See `DeepDental API.postman_collection.json` for full API documentation.

## Current Status

✅ Mock mode **DISABLED** - Using real API  
✅ API endpoints configured from Postman collection  
✅ API key set: `dd_live_your_api_key_here`  
⏳ **AI Server Status:** Not running (need to start)  

## Next Steps

1. ✅ Locate your DeepDental API project folder
2. ✅ Start the server with `python main.py`
3. ✅ Verify health endpoint responds
4. ✅ Test image analysis from mobile app
5. ✅ Check server logs for processing details

---

**Once the server is running, the mobile app will automatically connect and use real AI analysis!** 🎉
