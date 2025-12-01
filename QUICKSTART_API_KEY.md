# 🚀 Quick Start - Setup API Key untuk Production

## 🎯 Masalah: 401 Unauthorized Error

Jika kamu mendapat error **401 Unauthorized** saat test AI Diagnosis, ini karena app masih menggunakan placeholder API key `dd_live_your_api_key_here`.

## ✅ Solusi Cepat (5 Langkah)

### 1️⃣ Dapatkan API Key

**Option A: Dari Admin (Recommended)**
- Hubungi admin Dentalization
- Minta production API key untuk `api.dentalization.id`

**Option B: Generate Sendiri (Development)**
```bash
cd /path/to/deepdental-api
python scripts/create_api_key.py
# Copy key yang muncul (starts with dd_live_...)
```

### 2️⃣ Buat File `.env`

```bash
cd mobile
cp .env.example .env
```

### 3️⃣ Edit `.env` dan Paste API Key

```env
# Production Cloud API
EXPO_PUBLIC_AI_URL=https://api.dentalization.id/api/v1
EXPO_PUBLIC_AI_KEY=dd_live_paste_your_real_key_here
```

**⚠️ PENTING:** Ganti `dd_live_paste_your_real_key_here` dengan API key yang kamu dapat!

### 4️⃣ Restart Expo dengan Clear Cache

```bash
# Stop expo (Ctrl+C di terminal yang running expo)
# Kemudian jalankan:
npx expo start -c
```

Flag `-c` akan clear cache dan reload environment variables.

### 5️⃣ Test di App

1. Buka app di simulator/device
2. Navigate ke **AI Diagnosis**
3. Pilih gambar gigi
4. Klik **Analyze**
5. Tunggu hasil (30-60 detik)

**Seharusnya sekarang tidak ada 401 error lagi!** ✅

## 🧪 Verify Setup Benar

### Check Console Logs

Saat expo start, kamu harus lihat:

```
📱 API Configuration:
  AI Mode: Cloud (api.dentalization.id)
  AI URL: https://api.dentalization.id/api/v1
  AI Key: dd_live_abc123d...  ✅ BUKAN dd_live_your_a...
  ---
  💡 Using CLOUD DeepDental server (api.dentalization.id)
```

**Jika masih tertulis:**
```
AI Key: dd_live_your_a...
⚠️  WARNING: Using placeholder API key!
```

Berarti `.env` belum ter-load atau API key salah!

### Test dengan Script

```bash
./test-production-api.sh dd_live_your_real_key_here
```

**Expected Output:**
```
✅ Health Check PASSED
✅ Create Session PASSED
✅ ALL TESTS PASSED
```

**Jika dapat 401:**
```
❌ Create Session FAILED
⚠️  API Key is INVALID
```

Berarti API key yang kamu masukkan salah atau expired.

## 📋 Troubleshooting Checklist

- [ ] File `.env` ada di folder `mobile/` (same level as package.json)
- [ ] API key di `.env` benar dan lengkap (contoh: `dd_live_abcd1234efgh5678...`)
- [ ] Tidak ada typo di variable name (`EXPO_PUBLIC_AI_KEY` bukan `EXPO_AI_KEY`)
- [ ] Expo sudah di-restart dengan `-c` flag
- [ ] Console log shows correct API key preview (not placeholder)
- [ ] Internet connection working

## 🔄 Alternative: Using Environment Variables Directly

Jika tidak mau pakai `.env` file, bisa set langsung saat start expo:

```bash
export EXPO_PUBLIC_AI_URL="https://api.dentalization.id/api/v1"
export EXPO_PUBLIC_AI_KEY="dd_live_your_real_key_here"
npx expo start
```

**Note:** Environment variables ini temporary, hilang saat close terminal.

## 📖 Production API Info

**Base URL:** `https://api.dentalization.id/api/v1`

**Documentation:** https://api.dentalization.id/docs

**Available Endpoints:**
- ✅ `POST /sessions` - Create diagnosis session
- ✅ `POST /images/analyze` - AI image analysis
- ✅ `GET /sessions` - List session history
- ✅ `POST /chat` - Chat with AI
- ✅ More... (see docs)

**Authentication:**
All endpoints (except `/health`) require:
```
X-API-Key: dd_live_your_real_key_here
```

## 🏠 Local Development Mode (Optional)

Jika kamu develop DeepDental API dan ingin test dengan localhost:

```env
# .env
EXPO_PUBLIC_AI_MODE=local
EXPO_PUBLIC_AI_KEY=dd_live_local_key
```

Kemudian start local server:
```bash
cd /path/to/deepdental-api
python main.py
```

Server harus jalan di `http://localhost:8000`

## 💡 Tips

### Don't Commit `.env`
File `.env` sudah di `.gitignore`. Jangan pernah commit API key ke Git!

### Share `.env.example` Instead
Untuk team member, share `.env.example` dengan placeholder:
```env
EXPO_PUBLIC_AI_KEY=dd_live_your_api_key_here
```

### Rotate Keys Regularly
Untuk security, rotate API key secara berkala.

### Use Different Keys for Dev/Prod
- Development: Local server key
- Production: Cloud API key dari admin

## 📞 Need Help?

**Masih dapat 401?**
1. Check `.env` file exists: `ls -la mobile/.env`
2. Check API key valid dengan test script
3. Verify expo restarted dengan `-c` flag
4. Check console logs untuk warnings

**API key tidak punya?**
- Contact admin team
- Atau generate sendiri dengan `python scripts/create_api_key.py`

**Masih error?**
- Check full documentation: `SETUP_API_KEY.md`
- Check server status: https://api.dentalization.id/docs

---

## ✅ Summary

**Before:**
```
❌ 401 Unauthorized
❌ API Key: dd_live_your_api_key_here (placeholder)
```

**After Setup:**
```
✅ 200 OK
✅ API Key: dd_live_abc123... (valid key)
✅ AI Diagnosis working!
```

**Files Created:**
- `mobile/.env` - Your local config (gitignored)
- `mobile/.env.example` - Template (committed)

**Commands Used:**
```bash
cp .env.example .env
# Edit .env with real API key
npx expo start -c
```

**That's it!** 🎉

Your AI Diagnosis feature should now work with the production API.
