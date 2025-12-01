# 🔧 Troubleshooting 504 Gateway Timeout

## Masalah

Saat melakukan AI image analysis, muncul error:
```
❌ AI Response Error: 504 Request failed with status code 504
```

## Penyebab

**504 Gateway Timeout** terjadi ketika:

1. **Server AI memproses terlalu lama** (>60 detik default timeout)
2. **Gambar berukuran besar** yang memakan waktu lama untuk:
   - Upload ke server
   - Processing YOLO detection
   - Gemini AI analysis
3. **Server overloaded** dengan banyak request
4. **Network gateway timeout** sebelum server selesai

## ✅ Solusi yang Sudah Diimplementasikan

### 1. Timeout Diperpanjang
**File:** `mobile/src/config/api.config.js`

```javascript
AI_TIMEOUT: 180000, // 3 menit (sebelumnya 60 detik)
```

### 2. Better Error Handling
**File:** `mobile/src/features/ai-diagnosis/screens/AnalysisScreen.jsx`

- Detect 504 timeout errors
- User-friendly error messages
- Retry option langsung dari alert dialog
- Penjelasan bahwa processing lama itu normal

### 3. User Feedback
Loading screen sekarang menampilkan:
```
"Menganalisis kondisi (ini bisa memakan waktu 1-3 menit)..."
```

## 🔍 Mengapa AI Analysis Lambat?

**Normal Processing Flow:**

1. **Upload Image** (~5-10 detik)
   - Mobile → Cloud API
   - Tergantung ukuran gambar & internet speed

2. **YOLO Detection** (~10-20 detik)
   - Deep learning model inference
   - Detect pathologies (caries, plaque, etc.)

3. **Gemini AI Analysis** (~30-60 detik)
   - LLM generates findings
   - Creates recommendations
   - Annotates image with markers

4. **Total:** 45-90 detik normal, bisa sampai 3 menit jika server busy

## 💡 Recommendations untuk User

### Untuk Mengurangi Timeout:

1. **Compress Image Sebelum Upload**
   - Gunakan gambar dengan resolusi lebih kecil
   - Idealnya < 2MB

2. **Good Network Connection**
   - WiFi lebih baik daripada mobile data
   - Stable connection

3. **Retry Jika Timeout**
   - Server mungkin less busy next time
   - Automatic retry available via dialog

4. **Waktu Testing**
   - Hindari jam sibuk
   - Off-peak hours lebih cepat

## 🛠️ Advanced Solutions (Opsional)

### Option 1: Implement Image Compression

**File:** `mobile/src/features/ai-diagnosis/screens/ImagePreviewScreen.jsx`

```javascript
import * as ImageManipulator from 'expo-image-manipulator';

const compressImage = async (uri) => {
  const manipResult = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 2048 } }], // Max width 2048px
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
  );
  return manipResult.uri;
};

// Before analyze:
const compressedUri = await compressImage(imageUri);
```

### Option 2: Show Progress Updates

Poll server untuk progress updates (if API supports):

```javascript
// Pseudo-code
while (analysisNotComplete) {
  const status = await checkAnalysisStatus(sessionId);
  setProgress(status.progress);
  setStatus(status.message);
  await sleep(2000);
}
```

### Option 3: Background Processing

Upload image dan return immediately, notify user when done:

```javascript
// 1. Upload → Get analysis_id
// 2. Navigate back to history
// 3. Poll in background
// 4. Push notification when ready
```

## 🚨 Jika Masih Timeout Terus

### Check Server Logs

Jika kamu punya akses ke DeepDental API server:

```bash
# Check if server is actually processing
tail -f logs/app.log

# Check for errors
grep "ERROR" logs/app.log

# Check processing times
grep "Processing time" logs/app.log
```

### Contact Admin

Jika timeout persists:
- Server might need performance optimization
- Increase server timeout settings
- Scale server resources

### Use Local Development

Untuk development/testing, gunakan local server:

```env
EXPO_PUBLIC_AI_MODE=local
```

Local server biasanya lebih cepat karena:
- No internet latency
- Dedicated resources
- Optimized for development

## 📊 Expected Timings

### Production Cloud API

| Stage | Time | 
|-------|------|
| Upload | 5-15s |
| YOLO Detection | 10-30s |
| Gemini Analysis | 30-90s |
| Download Result | 2-5s |
| **Total** | **47-140s** |

### Local Development

| Stage | Time |
|-------|------|
| Upload | 1-2s |
| YOLO Detection | 5-10s |
| Gemini Analysis | 20-30s |
| Download Result | <1s |
| **Total** | **26-43s** |

## ✅ Current Status

**Implemented:**
- ✅ 3-minute timeout
- ✅ 504 error detection
- ✅ User-friendly messages
- ✅ Retry mechanism
- ✅ Loading feedback

**Recommended:**
- ⏳ Image compression
- ⏳ Server optimization
- ⏳ Background processing

**Working Now:**
- ✅ Create session (200 OK)
- ⏳ Image analysis (504 timeout on cloud, needs optimization)

## 🎯 Next Steps

1. **Try Again** - Timeout bisa temporary karena server busy
2. **Wait & Retry** - Server mungkin less loaded nanti
3. **Use Smaller Images** - Compress sebelum upload
4. **Contact Admin** - Jika consistently timeout, server perlu optimization

---

**Note:** 504 timeout bukan berarti gambar tidak dianalisis. Server mungkin masih processing di background. Check history screen untuk melihat apakah hasil muncul later.
