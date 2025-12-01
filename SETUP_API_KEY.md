# 🔑 Setup API Key untuk AI Diagnosis

## ⚠️ PENTING: Mengatasi 401 Unauthorized Error

Jika kamu mendapat error **401 Unauthorized** saat menggunakan AI Diagnosis, itu karena API key yang digunakan adalah placeholder `dd_live_your_api_key_here`.

## 🚀 Quick Fix (Production Cloud API)

### 1. Dapatkan API Key dari Admin

Hubungi admin Dentalization untuk mendapatkan production API key yang valid.

### 2. Buat File `.env` di folder `mobile/`

```bash
cd mobile
cp .env.example .env
```

### 3. Edit `.env` dan Masukkan API Key yang Benar

```env
# Production Cloud API (Recommended)
EXPO_PUBLIC_AI_URL=https://api.dentalization.id/api/v1
EXPO_PUBLIC_AI_KEY=dd_live_xxxxxxxxxxxxxxxxxxxxxxxxx

# Jangan set AI_MODE untuk production
```

### 4. Restart Expo

```bash
# Stop expo (Ctrl+C)
# Clear cache
npx expo start -c
```

### 5. Test Lagi

Buka app → AI Diagnosis → Pilih gambar → Analyze

Seharusnya sekarang tidak ada 401 error lagi! ✅

## 🏠 Alternative: Local Development Mode

Jika kamu ingin test dengan **local DeepDental server** di localhost:8000:

### 1. Edit `.env`

```env
# Local Development Mode
EXPO_PUBLIC_AI_MODE=local
# EXPO_PUBLIC_AI_URL tidak perlu diset, akan auto-detect localhost
EXPO_PUBLIC_AI_KEY=dd_live_your_local_api_key_here
```

### 2. Start Local DeepDental Server

```bash
cd /path/to/deepdental-api
python main.py
```

Server harus running di `http://localhost:8000`

### 3. Generate API Key (jika belum punya)

```bash
cd /path/to/deepdental-api
python scripts/create_api_key.py
```

Copy key yang di-generate (contoh: `dd_live_abc123def456...`)

### 4. Update `.env` dengan Key Baru

```env
EXPO_PUBLIC_AI_MODE=local
EXPO_PUBLIC_AI_KEY=dd_live_abc123def456...
```

### 5. Restart Expo

```bash
npx expo start -c
```

## 📋 Environment Variables Explained

### Production Cloud (Recommended)

```env
EXPO_PUBLIC_AI_URL=https://api.dentalization.id/api/v1
EXPO_PUBLIC_AI_KEY=dd_live_real_key_from_admin
```

**Kapan digunakan:**
- ✅ Testing dengan production API
- ✅ Tidak perlu setup local server
- ✅ Internet connection required
- ✅ Paling mudah untuk testing

### Local Development

```env
EXPO_PUBLIC_AI_MODE=local
EXPO_PUBLIC_AI_KEY=dd_live_local_key
```

**Kapan digunakan:**
- ✅ Development dan debugging
- ✅ Test perubahan di DeepDental API
- ✅ Tidak perlu internet untuk AI
- ⚠️ Harus running local server di port 8000

## 🔍 Cara Check API Key Saat Ini

Buka app dan lihat console log:

```
📱 API Configuration:
  AI URL: https://api.dentalization.id/api/v1
  Platform: ios
  ---
  💡 Using CLOUD DeepDental server (api.dentalization.id)
```

Kemudian di service log:

```
🤖 AI DIAGNOSIS SERVICE - REAL API MODE
   API URL: https://api.dentalization.id/api/v1
   API Key: dd_live_your_a...
```

Jika tertulis `dd_live_your_a...` berarti masih menggunakan placeholder! ❌

Seharusnya tertulis key yang benar: `dd_live_abc123d...` ✅

## 🧪 Test API Key Valid

### Cara 1: Menggunakan Test Script

```bash
cd /Users/adrianhalim/SereneApps
./test-production-api.sh
```

### Cara 2: Manual dengan cURL

```bash
# Test dengan API key
curl -X POST https://api.dentalization.id/api/v1/sessions \
  -H "X-API-Key: dd_live_your_real_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "patient",
    "language": "bilingual",
    "metadata": {"source": "test"}
  }'
```

**Expected Response (200 OK):**
```json
{
  "id": "sess_abc123",
  "user_id": "user_xyz",
  "role": "patient",
  "language": "bilingual",
  "created_at": "2025-12-01T10:30:00Z"
}
```

**Error Response (401 Unauthorized):**
```json
{
  "detail": "Invalid API key"
}
```

## 📖 Production API Endpoints

Base URL: `https://api.dentalization.id/api/v1`

### Available Endpoints:

1. **Health Check** (No auth)
   - `GET /health`

2. **Session Management**
   - `POST /sessions` - Create session
   - `GET /sessions` - List sessions
   - `GET /sessions/{session_id}` - Get session
   - `DELETE /sessions/{session_id}` - Delete session
   - `GET /sessions/{session_id}/messages` - Get messages
   - `DELETE /sessions/{session_id}/messages` - Clear messages

3. **Image Analysis**
   - `POST /images/analyze` - Full AI analysis
   - `POST /images/detect` - YOLO detection only

4. **Chat**
   - `POST /chat` - Text chat
   - `POST /chat/upload` - Chat with image upload

5. **Knowledge Base**
   - `POST /knowledge/query` - Query knowledge

6. **User Management**
   - `GET /users/me` - Get current user
   - `PATCH /users/me/preferences` - Update preferences

**Full Documentation:**  
https://api.dentalization.id/docs

## 🔐 Security Best Practices

### ❌ DON'T

```javascript
// Jangan hardcode API key di code
const API_KEY = 'dd_live_abc123...';
```

```env
# Jangan commit .env ke Git
# .env should be in .gitignore ✅
```

### ✅ DO

```javascript
// Gunakan environment variables
const API_KEY = process.env.EXPO_PUBLIC_AI_KEY;
```

```bash
# Share .env.example, bukan .env
# .env.example contains placeholders only
```

## 🐛 Troubleshooting

### Error: 401 Unauthorized

**Penyebab:** API key tidak valid atau masih placeholder

**Solusi:**
1. Check `.env` file exists di `mobile/` folder
2. Verify API key benar (starts with `dd_live_`)
3. Restart Expo: `npx expo start -c`
4. Test dengan curl command di atas

### Error: Network Error / Connection Refused

**Jika mode = cloud:**
- Check internet connection
- Verify URL: `https://api.dentalization.id/api/v1`
- Test dengan browser: https://api.dentalization.id/docs

**Jika mode = local:**
- Check DeepDental server running: `curl http://localhost:8000/api/v1/health`
- Start server: `python main.py`

### Error: API key not found in environment

**Penyebab:** Expo tidak load `.env` file

**Solusi:**
1. Make sure `.env` ada di `mobile/` folder (same level as `package.json`)
2. Restart Expo dengan clear cache: `npx expo start -c`
3. Check console log untuk verify env loaded

### Environment variables tidak berubah

**Penyebab:** Expo cache

**Solusi:**
```bash
# Clear cache dan restart
npx expo start -c

# Atau full reset
rm -rf node_modules .expo
npm install
npx expo start -c
```

## 📁 File Structure

```
mobile/
├── .env                    # ← Create this! (gitignored)
├── .env.example           # ← Template (committed to Git)
├── .gitignore             # ← Includes .env
├── package.json
└── src/
    └── config/
        └── api.config.js  # ← Reads EXPO_PUBLIC_* vars
```

## ✅ Checklist Setup

- [ ] File `.env` created di `mobile/` folder
- [ ] API key dari admin sudah dimasukkan
- [ ] `.env` ada di `.gitignore` (jangan commit!)
- [ ] Expo restarted dengan `npx expo start -c`
- [ ] Console log shows correct API URL and key preview
- [ ] Test create session berhasil (no 401)
- [ ] AI Diagnosis flow works end-to-end

## 🎯 Final Check

Run this in mobile app:

```bash
npx expo start
```

Console should show:

```
📱 API Configuration:
  AI Mode: Cloud (api.dentalization.id)
  AI URL: https://api.dentalization.id/api/v1
  ---
  💡 Using CLOUD DeepDental server (api.dentalization.id)

🤖 AI DIAGNOSIS SERVICE - REAL API MODE
   API URL: https://api.dentalization.id/api/v1
   API Key: dd_live_abc123d...  ✅ (bukan dd_live_your_a...)
```

If you see this, **API key setup is correct!** ✅

---

**Still getting 401?** Double-check:
1. `.env` file exists
2. API key is correct (contact admin)
3. Expo fully restarted
4. No typos in variable name (`EXPO_PUBLIC_AI_KEY`)

**Need help?** Check logs or contact dev team.
