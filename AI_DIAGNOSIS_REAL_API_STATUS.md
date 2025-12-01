# ✅ AI Diagnosis - Real API Configuration

**Status:** READY FOR REAL API TESTING  
**Date:** December 1, 2025  
**Mock Mode:** DISABLED ❌  

## Current Configuration

### 1. API Service Configuration
**File:** `mobile/src/services/aiDiagnosisService.js`

```javascript
const ENABLE_MOCK = false; // ✅ Real API enabled
```

**Endpoints configured:**
- ✅ `/api/v1/health` - Health check
- ✅ `/api/v1/sessions` - Create/list/delete sessions
- ✅ `/api/v1/images/analyze` - Full AI analysis (YOLO + Gemini)
- ✅ `/api/v1/images/detect` - YOLO detection only
- ✅ `/api/v1/chat` - Chat with AI
- ✅ `/api/v1/knowledge/query` - Knowledge base queries

### 2. API Connection Settings
**File:** `mobile/src/config/api.config.js`

**Simulator/Emulator:**
```javascript
AI_URL: 'http://localhost:8000/api/v1'
AI_API_KEY: 'dd_live_your_api_key_here'
```

**Physical Device:**
```javascript
AI_URL: 'http://192.168.1.12:8000/api/v1'
AI_API_KEY: 'dd_live_your_api_key_here'
```

### 3. API Documentation Source
- ✅ Postman Collection: `docs/apiendpointAI/DeepDental API.postman_collection.json`
- ✅ Environment: `docs/apiendpointAI/DeepDental Local.postman_environment.json`

## API Endpoints Implementation

### Session Management
```javascript
// Create session
const result = await createSession({ source: 'mobile_app' });
// Returns: { success, data, sessionId }

// List sessions
const result = await listSessions(page, perPage);
// Returns: { success, data, sessions[], total }

// Delete session
const result = await deleteSession(sessionId);
```

### Image Analysis (Primary Feature)
```javascript
// Full AI analysis
const result = await analyzeImage({
  sessionId: 'session_id_here',
  imageUris: ['file://path/to/image.jpg'],
  language: 'bilingual',
  role: 'patient'
});

// Returns:
// {
//   success: true,
//   data: {
//     findings: 'Detected conditions...',
//     image_quality: 'Good quality',
//     recommendations: ['Schedule checkup...'],
//     annotated_image_base64: 'base64...',
//     detections: [
//       { id: 1, label: 'Caries', confidence: 0.85 }
//     ]
//   }
// }
```

### Request Format
The mobile app sends images as **multipart/form-data**:
```javascript
FormData {
  image: {
    uri: 'file://...',
    name: 'photo.jpg',
    type: 'image/jpeg'
  },
  session_id: 'session_123',
  language: 'bilingual',
  role: 'patient'
}
```

### Authentication
All requests include:
```javascript
headers: {
  'X-API-Key': 'dd_live_your_api_key_here'
}
```

## Server Requirements

### DeepDental AI Server Must Be Running
```bash
# Check if server is running
curl http://localhost:8000/api/v1/health

# Expected response:
{
  "status": "ok",
  "components": {
    "llm": "available",
    "yolo": "available",
    "vector_db": "available"
  }
}
```

### Start Server
```bash
cd /path/to/deepdental-api
python main.py
```

Server should start on: `http://localhost:8000`

## Testing Checklist

### ✅ Configuration
- [x] Mock mode disabled
- [x] API URL configured
- [x] API key set
- [x] Endpoints implemented per Postman collection

### ⏳ Server Status
- [ ] DeepDental server running on port 8000
- [ ] Health endpoint responding
- [ ] API key validated

### ⏳ Mobile App Testing
- [ ] Create session successful
- [ ] Image upload working
- [ ] AI analysis returning results
- [ ] Detections displayed
- [ ] Annotated images shown
- [ ] Session history working

## Expected User Flow

1. **Open AI Diagnosis Screen**
   - Camera ready to capture or select image

2. **Select/Capture Image**
   - Image preview shown
   - "Analyze" button enabled

3. **Create Session** (API Call #1)
   ```
   POST /api/v1/sessions
   Response: { id: "session_123", ... }
   ```

4. **Analyze Image** (API Call #2)
   ```
   POST /api/v1/images/analyze
   Body: multipart/form-data with image
   Response: { findings, detections, recommendations, annotated_image_base64 }
   ```

5. **Show Progress**
   - 20% - Uploading image
   - 40% - Processing image quality
   - 60% - AI analyzing image
   - 80% - Generating recommendations
   - 100% - Complete

6. **Display Results**
   - Findings text
   - Detections list with confidence scores
   - Annotated image with markers
   - Recommendations
   - Overall assessment

7. **Save to History**
   - Session stored on server
   - Viewable in History screen

## API Response Examples

### Create Session Response
```json
{
  "id": "sess_abc123xyz",
  "user_id": "user_456",
  "role": "patient",
  "language": "bilingual",
  "created_at": "2025-12-01T10:30:00Z"
}
```

### Analyze Image Response
```json
{
  "findings": "Berdasarkan analisis gambar, terdeteksi area yang memerlukan perhatian [1][2].",
  "image_quality": "Kualitas gambar baik, pencahayaan memadai untuk analisis.",
  "concern_level": "moderate",
  "recommendations": [
    "Jadwalkan pemeriksaan ke dokter gigi dalam 2 minggu",
    "Perhatikan kebersihan area yang terdeteksi",
    "Gunakan benang gigi secara teratur"
  ],
  "detections": [
    {
      "mark_id": 1,
      "label": "Caries",
      "confidence": 0.87,
      "bbox": [100, 150, 50, 50]
    },
    {
      "mark_id": 2,
      "label": "Plaque",
      "confidence": 0.72,
      "bbox": [200, 180, 60, 40]
    }
  ],
  "annotated_image_base64": "iVBORw0KGgoAAAANS...",
  "processing_time_ms": 3542.5
}
```

## Error Handling

The service handles these scenarios:

### Server Not Running
```javascript
{
  success: false,
  error: "Network Error"
}
```
**User sees:** "Tidak dapat terhubung ke server AI. Pastikan server berjalan."

### Invalid Image
```javascript
{
  success: false,
  error: "Invalid image format"
}
```
**User sees:** "Format gambar tidak valid. Gunakan JPG atau PNG."

### API Key Invalid
```javascript
{
  success: false,
  error: "Invalid API key"
}
```
**User sees:** "API key tidak valid. Hubungi administrator."

### Analysis Timeout
```javascript
{
  success: false,
  error: "Request timeout"
}
```
**User sees:** "Analisis memakan waktu terlalu lama. Coba lagi."

## Network Configuration

### Auto-Detection
The app automatically detects if running on simulator or physical device:

```javascript
const isSimulator = Constants.isDevice === false;

// Simulator: Use localhost
// Physical device: Use LOCAL_IP (192.168.1.12)
```

### For Physical Device Testing
1. Find your computer's local IP:
   ```bash
   # macOS
   ifconfig | grep "inet " | grep -v 127.0.0.1
   ```

2. Update `api.config.js`:
   ```javascript
   const LOCAL_IP = 'your.ip.address.here';
   ```

3. Ensure phone and computer on **same WiFi network**

## Logging & Debugging

All API calls are logged:

```
🤖 AI DIAGNOSIS SERVICE - REAL API MODE
   API URL: http://localhost:8000/api/v1
   API Key: dd_live_your_a...

🤖 AI Request: POST /sessions
✅ AI Response: 200 /sessions
✅ session_id disimpan: sess_abc123

🤖 AI Request: POST /images/analyze
✅ AI Response: 200 /images/analyze
📊 Detections: 2
⏱️ Processing time: 3542ms
```

## Production Considerations

### Security
- [ ] Move API key to SecureStore
- [ ] Implement API key rotation
- [ ] Add rate limiting awareness
- [ ] Handle API quota limits

### Performance
- [ ] Image compression before upload
- [ ] Retry logic for failed requests
- [ ] Queue for multiple image analysis
- [ ] Cache annotated images locally

### UX Improvements
- [ ] Show estimated wait time
- [ ] Allow cancellation of long requests
- [ ] Offline mode with queue
- [ ] Progress persistence across app restarts

## Files Modified

1. ✅ `mobile/src/services/aiDiagnosisService.js`
   - Disabled mock mode
   - All endpoints use real API

2. ✅ `mobile/src/config/api.config.js`
   - API URL configured
   - API key set
   - Auto environment detection

3. ✅ Created documentation:
   - `START_DEEPDENTAL_SERVER.md`
   - `AI_DIAGNOSIS_REAL_API_STATUS.md`

## Next Actions

### To Start Testing:

1. **Start DeepDental Server**
   ```bash
   cd /path/to/deepdental-api
   python main.py
   ```

2. **Verify Server Running**
   ```bash
   curl http://localhost:8000/api/v1/health
   ```

3. **Start Mobile App**
   ```bash
   cd mobile
   npm start
   ```

4. **Test AI Diagnosis Flow**
   - Navigate to AI Diagnosis
   - Select/capture dental image
   - Wait for analysis (30-60 seconds)
   - Verify results display correctly

---

**Status:** Configuration complete, ready for server startup and testing! 🚀

**Important:** The DeepDental AI server MUST be running on port 8000 for the app to work.
