# 🔔 Toast Notification System

## Overview
Sistem notifikasi Toast untuk menampilkan feedback kepada user dengan style yang konsisten dan modern, mirip dengan mobile ValidationToast.

## 📦 Components

### 1. **Toast Component** (`/src/components/Toast.jsx`)
Komponen UI untuk menampilkan notifikasi dengan 4 status berbeda.

**Status Types:**
- `success` ✓ - Hijau emerald untuk aksi berhasil
- `error` ⚠ - Merah untuk error/failure
- `warning` ⚡ - Kuning amber untuk peringatan
- `info` ℹ - Indigo/purple untuk informasi umum

**Features:**
- Auto-dismiss setelah duration tertentu (default 5 detik)
- Animasi slide-in dari atas dengan scale
- Manual dismiss dengan tombol close
- Gradient background sesuai status
- Responsive dan centered di top screen

### 2. **ToastContext** (`/src/contexts/ToastContext.jsx`)
Context provider untuk manage toast state global.

**API Methods:**
```javascript
const toast = useToast();

// Generic method
toast.showToast({ message: 'Hello', status: 'info', duration: 5000 });

// Convenience methods
toast.success('Berhasil!', 5000);
toast.error('Terjadi kesalahan', 7000);
toast.warning('Perlu perhatian', 6000);
toast.info('Informasi penting', 4000);
```

## 🚀 Usage Examples

### Basic Usage
```javascript
import { useToast } from 'contexts/ToastContext';

function MyComponent() {
  const toast = useToast();

  const handleSuccess = () => {
    toast.success('Data berhasil disimpan!');
  };

  const handleError = () => {
    toast.error('Gagal menyimpan data', 7000);
  };

  return (
    <button onClick={handleSuccess}>Save</button>
  );
}
```

### Registration Success
```javascript
// After successful registration
toast.success('Registrasi berhasil! Silakan login dengan akun Anda.', 6000);
setTimeout(() => {
  navigate('/auth/login', { state: { email } });
}, 1000);
```

### Login Success
```javascript
// After successful login
toast.success(`Selamat datang kembali, ${user.name}!`, 3000);
setTimeout(() => {
  navigate('/dashboard');
}, 500);
```

### Error Handling
```javascript
try {
  await api.saveData(data);
  toast.success('Data tersimpan');
} catch (error) {
  toast.error(error.message || 'Terjadi kesalahan', 7000);
}
```

## 🎨 Design Guidelines

### Duration Recommendations
- **Success**: 3-5 detik (user senang, gak perlu lama-lama)
- **Error**: 6-8 detik (user perlu waktu baca error message)
- **Warning**: 5-7 detik (perlu perhatian tapi tidak urgent)
- **Info**: 4-6 detik (informasi umum)

### Message Guidelines
✅ **Good Messages:**
- "Registrasi berhasil! Silakan login dengan akun Anda."
- "Data pasien berhasil diperbarui"
- "Email sudah terdaftar. Gunakan email lain atau login."
- "Koneksi terputus. Periksa internet Anda."

❌ **Bad Messages:**
- "Success" (terlalu singkat)
- "Error 500" (terlalu teknis)
- "Failed to update user profile in database due to..." (terlalu panjang)

### When to Use Each Status

**Success** ✓
- Registration/login berhasil
- Data tersimpan/diupdate
- Upload file berhasil
- Aksi delete berhasil

**Error** ⚠
- Registrasi gagal
- Login gagal
- Validasi form gagal
- Network error
- Server error

**Warning** ⚡
- Duplicate data
- Quota hampir habis
- Action butuh konfirmasi
- Incomplete data

**Info** ℹ
- Tips/hints
- Changelog
- System announcements
- Non-critical updates

## 📝 Implementation Checklist

### Already Implemented ✅
- [x] Toast component with 4 status types
- [x] ToastContext provider
- [x] Auto-dismiss functionality
- [x] Animation (slide + scale)
- [x] Manual dismiss button
- [x] Integrated in App.jsx
- [x] Register.jsx - success & error
- [x] Login.jsx - success & error

### Pending Implementation ⏳
- [ ] Profile update success/error
- [ ] File upload success/error
- [ ] Appointment booking success/error
- [ ] Network error handling global
- [ ] Form validation errors
- [ ] Logout confirmation
- [ ] Session expired warning
- [ ] Password change success

## 🔧 Migration from console.log

### Before (Bad ❌)
```javascript
console.log('Registration successful');
console.error('Login failed:', error);
alert('Data saved!'); // 😱 Never use alert!
```

### After (Good ✅)
```javascript
toast.success('Registrasi berhasil!');
toast.error('Login gagal: ' + error.message);
toast.success('Data tersimpan!');
```

## 🎯 Best Practices

1. **Always use toast for user feedback**
   - Jangan pakai console.log untuk user-facing messages
   - Jangan pakai alert() atau confirm()

2. **Choose appropriate duration**
   - Error messages: lebih lama (user perlu baca detail)
   - Success messages: lebih pendek (user sudah tau berhasil)

3. **Write clear messages**
   - Bahasa Indonesia formal tapi friendly
   - Jelaskan apa yang terjadi dan next action (kalau perlu)
   - Hindari istilah teknis

4. **One toast at a time**
   - System otomatis replace toast sebelumnya
   - Jangan spam multiple toasts sekaligus

5. **Combine with navigation**
   - Show toast → small delay → navigate
   - User sempat lihat feedback sebelum pindah halaman

## 🐛 Troubleshooting

### Toast tidak muncul
- Pastikan component wrapped dengan `<ToastProvider>`
- Check `useToast()` dipanggil di dalam component tree
- Cek browser console untuk error

### Toast muncul tapi langsung hilang
- Pastikan `duration` cukup lama (minimal 3000ms)
- Check ada navigation yang interfere

### Multiple toasts overlap
- System designed untuk 1 toast at a time
- Previous toast akan di-replace otomatis

## 📊 Coverage Status

| Feature | Toast Implemented | Status |
|---------|------------------|--------|
| Registration | ✅ | Success + Error |
| Login | ✅ | Success + Error |
| Logout | ❌ | Pending |
| Profile Update | ❌ | Pending |
| File Upload | ❌ | Pending |
| Appointments | ❌ | Pending |
| Network Errors | ❌ | Pending |
| Form Validation | ❌ | Pending |

## 🚀 Next Steps

1. Replace semua `console.log` user-facing dengan toast
2. Add toast untuk network errors (axios interceptor)
3. Add toast untuk form validation errors
4. Add toast untuk logout confirmation
5. Add toast untuk session expired
6. Add toast untuk profile updates
7. Test semua toast di production
