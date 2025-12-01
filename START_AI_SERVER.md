# 🚀 Start AI Server (DeepDental API)

## Current Status
❌ **AI Server is NOT running** (port 8000)
📱 **Mobile app is using MOCK MODE** for testing

## To Use Real AI Server:

### 1. Locate AI Server Project
Find where your DeepDental AI server project is located. Look for:
- Python files (main.py, app.py, etc.)
- requirements.txt
- Folders like: deepdental-api, ai-server, dental-ai, etc.

### 2. Start the Server

**Option A: If you have the project**
```bash
cd /path/to/deepdental-api
python main.py
# or
python app.py
# or
uvicorn main:app --reload --port 8000
```

**Option B: If using virtual environment**
```bash
cd /path/to/deepdental-api
source venv/bin/activate  # or: . venv/bin/activate
python main.py
```

**Option C: If using Docker**
```bash
cd /path/to/deepdental-api
docker-compose up
# or
docker run -p 8000:8000 deepdental-api
```

### 3. Verify Server is Running

Open browser and go to:
```
http://localhost:8000/api/v1/health
```

Should see response like:
```json
{
  "status": "ok",
  "components": {
    "database": "available",
    "llm": "available",
    "yolo": "available"
  }
}
```

### 4. Disable Mock Mode

Edit: `/mobile/src/services/aiDiagnosisService.js`

Change:
```javascript
const ENABLE_MOCK = true;
```

To:
```javascript
const ENABLE_MOCK = false;
```

### 5. Restart Mobile App

```bash
cd mobile
npm start
# App will reload automatically
```

---

## Testing with Postman

Import collection:
- File: `/docs/apiendpointAI/DeepDental API.postman_collection.json`
- Environment: `/docs/apiendpointAI/DeepDental Local.postman_environment.json`

Test endpoints:
1. Health Check (no auth)
2. Create Session
3. Analyze Image

---

## Common Issues

### Port 8000 Already in Use
```bash
# Find process using port 8000
lsof -ti:8000
# Kill it
kill -9 $(lsof -ti:8000)
```

### Python Dependencies Missing
```bash
pip install -r requirements.txt
```

### AI Server Not Found
- Check if you have the DeepDental API project
- May need to clone/download it separately
- Contact your team for the repository

---

## Mock Mode Info

**Currently enabled** for testing UI without server.

**Mock data includes:**
- ✅ Session creation
- ✅ Image analysis with fake findings
- ✅ Session history
- ✅ Realistic delays to simulate processing

**When to use Mock Mode:**
- Testing UI/UX
- Development without AI server
- Demo purposes

**When to use Real Server:**
- Production testing
- Real image analysis
- Accurate AI results

---

## Next Steps

1. **If you have AI server:** Start it and disable mock mode
2. **If you don't have it:** Continue with mock mode for UI testing
3. **For production:** Must use real AI server with proper API keys

**Questions?** Check:
- Postman collection for API documentation
- `/mobile/SETUP_AI_DIAGNOSIS.md` for mobile setup
- `/mobile/AI_DIAGNOSIS_FIXES.md` for troubleshooting
