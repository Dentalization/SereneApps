# 📱 User Messages Style Guide

> **Last Updated:** November 19, 2025  
> **Purpose:** Standardisasi semua pesan yang ditampilkan ke user (pasien)

---

## 🎨 Komponen Standar: ValidationToast

Semua pesan ke user **HARUS** menggunakan komponen `ValidationToast` dengan styling konsisten.

### Import Component

```javascript
import ValidationToast from '../components/ValidationToast';
```

### State Management

```javascript
const [snackbar, setSnackbar] = useState({ 
  visible: false, 
  message: '', 
  status: 'info' 
});
```

### Usage

```jsx
<ValidationToast
  visible={snackbar.visible}
  message={snackbar.message}
  onDismiss={() => setSnackbar({ visible: false, message: '', status: 'info' })}
  status={snackbar.status}
/>
```

---

## 📊 Status Types & Visual Design

### 1. ✅ Success (status: 'success')
- **Gradient:** Teal/Turquoise (#00BFA6 → #5DF2D6)
- **Icon:** check-circle
- **Label:** "Berhasil"
- **Use Case:** Operasi berhasil, data tersimpan

**Examples:**
```javascript
setSnackbar({ 
  visible: true, 
  message: 'Profil berhasil diperbarui!',
  status: 'success'
});

setSnackbar({ 
  visible: true, 
  message: `Selamat datang kembali, ${userName}!`,
  status: 'success'
});
```

### 2. ❌ Error (status: 'error')
- **Gradient:** Red (#F44336 → #FF7961)
- **Icon:** alert-circle
- **Label:** "Butuh perhatian"
- **Use Case:** Operasi gagal, error kritis

**Examples:**
```javascript
setSnackbar({ 
  visible: true, 
  message: 'Gagal memperbarui profil. Silakan coba lagi.',
  status: 'error'
});

setSnackbar({ 
  visible: true, 
  message: 'Sesi Anda telah berakhir. Silakan login kembali',
  status: 'error'
});

setSnackbar({ 
  visible: true, 
  message: 'Login gagal. Silakan coba lagi.',
  status: 'error'
});
```

### 3. ⚠️ Warning (status: 'warning')
- **Gradient:** Orange (#FF9800 → #FFD54F)
- **Icon:** alert
- **Label:** "Perlu dicek"
- **Use Case:** Validasi form, data belum sinkron, permission issues

**Examples:**
```javascript
setSnackbar({ 
  visible: true, 
  message: 'Mohon perbaiki kesalahan pada form',
  status: 'warning'
});

setSnackbar({ 
  visible: true, 
  message: 'Profil tersimpan di aplikasi (belum sinkron ke server)',
  status: 'warning'
});

setSnackbar({ 
  visible: true, 
  message: 'Izin akses foto atau kamera diperlukan untuk mengubah avatar',
  status: 'warning'
});

setSnackbar({ 
  visible: true, 
  message: 'Item sudah ada dalam daftar',
  status: 'warning'
});
```

### 4. ℹ️ Info (status: 'info')
- **Gradient:** Purple (#62109F → #982BEA)
- **Icon:** information
- **Label:** "Informasi"
- **Use Case:** Informasi umum, tips, help messages

**Examples:**
```javascript
setSnackbar({ 
  visible: true, 
  message: 'Hubungi care@serene.id untuk bantuan.',
  status: 'info'
});

setSnackbar({ 
  visible: true, 
  message: 'Link reset dikirim ke email Anda.',
  status: 'info'
});

setSnackbar({ 
  visible: true, 
  message: 'Aktifkan Face ID di perangkat Anda',
  status: 'info'
});
```

---

## � Console Logging Best Practices

### ❌ JANGAN Gunakan console.error untuk Expected Errors

**Masalah:**
```javascript
// ❌ BAD - Menakutkan di log, padahal error normal
console.error('❌ Login failed:', error.response?.data);
// Output: ERROR  ❌ Login failed: User not found
```

**Solusi:**
```javascript
// ✅ GOOD - Informasi untuk development, tidak menakutkan
if (__DEV__) {
  console.log('⚠️ Login unsuccessful:', result.message);
}
// Output: LOG  ⚠️ Login unsuccessful: No account found with this email
```

### 📊 Console Log Levels

| Level | Use Case | Example |
|-------|----------|---------|
| `console.log('✅ ...')` | Success operations | Login successful, Data saved |
| `console.log('⚠️ ...')` | Expected errors (user input) | Login failed, Validation error |
| `console.log('📤 ...')` | Request sent | API call initiated |
| `console.log('💾 ...')` | Storage operations | Token saved, Data cached |
| `console.error('🔥 ...')` | **ONLY** for unexpected errors | Network crash, Parse error |

### 🎯 Development-Only Logging

Wrap detailed logs dengan `__DEV__` check:

```javascript
// ✅ GOOD - Only shows in development
if (__DEV__) {
  console.log('⚠️ Profile update error:', {
    status: error.response?.status,
    message: error.response?.data?.message || error.message,
  });
}
```

### 🚨 Production Safety

```javascript
// ❌ BAD - Exposes sensitive data in production
console.error('Login failed:', { email, password, token });

// ✅ GOOD - Safe for production
if (__DEV__) {
  console.log('⚠️ Login error:', {
    status: error.response?.status,
    message: error.response?.data?.message,
  });
}
```

---

## �🚫 JANGAN GUNAKAN Alert.alert()

**❌ SALAH:**
```javascript
Alert.alert('Error', 'Login failed: User not found');
Alert.alert('Permission Required', 'Please allow access to your photos');
```

**✅ BENAR:**
```javascript
setSnackbar({ 
  visible: true, 
  message: 'Login gagal: Pengguna tidak ditemukan',
  status: 'error'
});

setSnackbar({ 
  visible: true, 
  message: 'Izin akses foto diperlukan',
  status: 'warning'
});
```

---

## 📋 Checklist: LoginScreen

| Message | Status | ✅ |
|---------|--------|---|
| Form validation error | warning | ✅ |
| Login success | success | ✅ |
| Login failed | error | ✅ |
| Unexpected error | error | ✅ |
| Help message | info | ✅ |
| Forgot password | info | ✅ |
| Face ID prompt | info | ✅ |
| Fingerprint prompt | info | ✅ |

---

## 📋 Checklist: EditProfileScreen

| Message | Status | ✅ |
|---------|--------|---|
| Permission required (camera/photo) | warning | ✅ |
| Image picker failed | error | ✅ |
| Duplicate item in array | warning | ✅ |
| Form validation error | warning | ✅ |
| Avatar upload failed (auth) | error | ✅ |
| Avatar upload failed (other) | warning | ✅ |
| Profile update success | success | ✅ |
| Profile saved locally only | warning | ✅ |
| Profile update failed | error | ✅ |

---

## 🎯 Best Practices

### 1. **Message Bahasa Indonesia yang Jelas**
```javascript
// ✅ GOOD - Jelas, spesifik
message: 'Izin akses foto atau kamera diperlukan untuk mengubah avatar'

// ❌ BAD - Terlalu teknis
message: 'Permission denied for ImagePicker'
```

### 2. **Berikan Solusi atau Next Action**
```javascript
// ✅ GOOD - Memberikan solusi
message: 'Sesi Anda telah berakhir. Silakan login kembali'

// ❌ BAD - Hanya menyatakan masalah
message: 'Token expired'
```

### 3. **Hindari Jargon Teknis**
```javascript
// ✅ GOOD - User-friendly
message: 'Profil tersimpan di aplikasi (belum sinkron ke server)'

// ❌ BAD - Terlalu teknis
message: 'Backend endpoint returned 404'
```

### 4. **Konsisten dengan Tone of Voice**
- Gunakan "Anda" (formal tapi ramah)
- Hindari kata kasar atau menyalahkan user
- Berikan encouragement saat error

### 5. **Auto-dismiss Behavior**
- ValidationToast auto-dismiss setelah **5 detik**
- User bisa swipe up/left/right untuk dismiss lebih cepat
- Tap X button untuk close manual

---

## 🔄 Migration Checklist untuk Screen Lain

Untuk setiap screen yang masih menggunakan `Alert.alert()`:

1. [ ] Import ValidationToast component
2. [ ] Add snackbar state: `useState({ visible: false, message: '', status: 'info' })`
3. [ ] Replace semua `Alert.alert()` dengan `setSnackbar()`
4. [ ] Tentukan status yang tepat (success/error/warning/info)
5. [ ] Translate message ke Bahasa Indonesia jika belum
6. [ ] Add ValidationToast component di JSX
7. [ ] Test semua error scenarios

---

## 📝 Template Code

```javascript
import React, { useState } from 'react';
import ValidationToast from '../components/ValidationToast';

const MyScreen = () => {
  const [snackbar, setSnackbar] = useState({ 
    visible: false, 
    message: '', 
    status: 'info' 
  });

  const handleAction = async () => {
    try {
      // Your code here
      
      // Success
      setSnackbar({ 
        visible: true, 
        message: 'Operasi berhasil!',
        status: 'success'
      });
    } catch (error) {
      // Error
      setSnackbar({ 
        visible: true, 
        message: 'Terjadi kesalahan. Silakan coba lagi.',
        status: 'error'
      });
    }
  };

  return (
    <View>
      {/* Your UI */}
      
      <ValidationToast
        visible={snackbar.visible}
        message={snackbar.message}
        onDismiss={() => setSnackbar({ visible: false, message: '', status: 'info' })}
        status={snackbar.status}
      />
    </View>
  );
};
```

---

## 🎨 Visual Reference

```
┌─────────────────────────────────────────────────────┐
│  ✓  BERHASIL                                    ×   │
│  Profil berhasil diperbarui!                        │
│  [Gradient: Teal/Turquoise]                         │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  !  BUTUH PERHATIAN                             ×   │
│  Login gagal. Silakan coba lagi.                    │
│  [Gradient: Red]                                    │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  ⚠  PERLU DICEK                                 ×   │
│  Mohon perbaiki kesalahan pada form                 │
│  [Gradient: Orange]                                 │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  ℹ  INFORMASI                                   ×   │
│  Hubungi care@serene.id untuk bantuan.              │
│  [Gradient: Purple]                                 │
└─────────────────────────────────────────────────────┘
```

---

## 📚 References

- Component: `/mobile/src/features/settings/components/ValidationToast.jsx`
- Example Usage: `/mobile/src/features/settings/screens/LoginScreen.jsx`
- Example Usage: `/mobile/src/features/settings/screens/EditProfileScreen.jsx`

**Implemented Screens:**
- ✅ LoginScreen.jsx
- ✅ EditProfileScreen.jsx

**Todo:**
- [ ] RegisterScreen.jsx
- [ ] OTPScreen.jsx
- [ ] ForgotPasswordScreen.jsx
- [ ] ProfileScreen.jsx (jika ada interactive actions)
- [ ] Other settings screens

---

> **Note:** Setiap kali menambahkan message baru, update dokumen ini dengan contoh yang jelas!
