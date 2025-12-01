# Setup AI Diagnosis Feature

## 🚨 IMPORTANT: Testing on Physical Device

### 1. Update IP Address
Edit `/mobile/src/config/api.config.js` dan ubah `LOCAL_IP`:

```javascript
const LOCAL_IP = '192.168.1.100'; // <-- GANTI DENGAN IP KOMPUTER KAMU!
```

### Cara Cari IP Address:

**macOS:**
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
# atau
System Preferences → Network → WiFi → Advanced → TCP/IP
```

**Windows:**
```cmd
ipconfig
# Cari IPv4 Address
```

**Linux:**
```bash
hostname -I
# atau
ip addr show
```

### 2. Pastikan di WiFi yang Sama
- Komputer dan HP **HARUS** di WiFi yang sama
- Matikan VPN jika ada
- Pastikan firewall tidak memblokir port 8000 dan 3000

### 3. Start Backend & AI Server

**Backend (Port 3000):**
```bash
cd backend
npm start
```

**AI Server (Port 8000):**
```bash
cd deepdental-api  # atau folder AI server
python main.py
```

### 4. Test Connection

**Dari HP browser, buka:**
- Backend: `http://YOUR_IP:3000/api/health`
- AI API: `http://YOUR_IP:8000/api/v1/health`

Jika gagal → masalah network/firewall!

---

## 📱 Testing Camera

### iOS Simulator
Camera **TIDAK BISA** di simulator, gunakan:
- Physical device
- Atau test dengan image picker saja

### Android Emulator  
Bisa pakai virtual camera tapi kadang buggy.

### Physical Device
Pastikan permission camera sudah granted di app settings.

---

## 🔍 Debugging

### Check Logs
```bash
# iOS
npx react-native log-ios

# Android  
npx react-native log-android

# atau
npm start
# lalu tekan 'j' untuk debugging
```

### Common Errors

**Error: Network Error**
- ✅ Ganti localhost → IP lokal di api.config.js
- ✅ Pastikan server running
- ✅ Check firewall

**Error: Camera white screen**
- ✅ Check permissions
- ✅ Restart app
- ✅ Check expo-camera version

**Error: Session creation failed**
- ✅ Check AI API key
- ✅ Verify AI server running
- ✅ Check logs di server

---

## 📦 Required Packages

Sudah terinstall:
- ✅ expo-camera
- ✅ expo-image-picker
- ✅ expo-file-system
- ✅ expo-constants
- ✅ axios

---

## 🎯 Flow Testing

1. **Open AI Diagnosis** → AIHomeScreen
2. **Tap Mulai Diagnosis** → CameraScreen
3. **Take photo or pick from gallery** → ImagePreviewScreen
4. **Tap Analisis Sekarang** → Creates session → AnalysisScreen
5. **Wait for AI processing** → ResultScreen with findings
6. **Check History** → HistoryScreen with past sessions

---

## 🔧 Troubleshooting

### Camera tidak muncul
```javascript
// Check di CameraScreen.jsx console:
console.log('Permission:', hasPermission);
console.log('Camera Type:', type);
```

### API tidak respond
```javascript
// Check di aiDiagnosisService.js console:
// Akan print:
// 🤖 AI Request: POST /sessions
// ✅ AI Response: 200 /sessions
// atau
// ❌ AI Response Error: ...
```

### Image upload gagal
- Pastikan image URI valid
- Check file size tidak terlalu besar (max 10MB)
- Verify FormData format

---

## 📝 Next Steps

1. Update LOCAL_IP di config
2. Start kedua server (backend + AI)
3. Test di physical device
4. Check console logs untuk debugging

**Happy Testing! 🚀**
