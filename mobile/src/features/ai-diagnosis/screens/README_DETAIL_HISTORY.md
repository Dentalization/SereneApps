# Detail History Screen - Dokumentasi

## Overview
DetailHistoryScreen menampilkan riwayat diagnosis lengkap dengan fitur export laporan medis yang dapat dibagikan ke dokter gigi.

## Fitur Utama

### 1. **Dual Tab View**
- **Tab Hasil Diagnosis**: Menampilkan temuan, gambar teranotasi, saran tindakan
- **Tab Riwayat Chat**: Menampilkan semua percakapan dengan AI dalam sesi tersebut

### 2. **Export Laporan Medis**
Sistem menggunakan AI untuk generate laporan profesional dari percakapan.

#### Format Laporan yang Di-generate:
```
LAPORAN DIAGNOSIS GIGI
Tanggal: [DD Month YYYY]

1. RINGKASAN KONDISI
   [Deskripsi kondisi dari AI]

2. TEMUAN KLINIS
   [Detail temuan dengan lokasi dan keparahan]

3. REKOMENDASI PERAWATAN
   [Saran tindakan yang perlu dilakukan]

4. CATATAN TAMBAHAN
   [Informasi penting dari percakapan]
```

#### Cara Kerja Export:
1. User klik tombol Share/Save di header
2. System kirim prompt ke AI:
   ```javascript
   const reportPrompt = `Berdasarkan percakapan diagnosis gigi berikut, 
   buatkan laporan medis lengkap dengan format: ...
   
   PERCAKAPAN LENGKAP:
   ${conversationHistory}
   
   Buatkan laporan profesional yang dapat dibagikan ke dokter gigi.`;
   ```

3. AI generate laporan berdasarkan seluruh percakapan
4. User pilih format export:
   - **TXT**: Langsung share via Expo Sharing
   - **PDF**: Coming soon (perlu implementasi react-native-html-to-pdf)
   - **Save to DB**: Simpan ke database untuk akses nanti

### 3. **Data Parsing**
Screen ini menggunakan fungsi `parseAnalysisData()` yang sama dengan ResultScreen untuk konsistensi:
- Extract findings dari `visual_findings`, `findings`, atau `detections`
- Parse confidence values (support string "74%" dan float 0.74)
- Calculate risk level based on severity
- Extract recommendations dan observations

### 4. **Navigation Flow**
```
HistoryScreen 
  → User klik "Lihat detail"
  → DetailHistoryScreen (dengan sessionId)
  → Load full session via getSession(sessionId)
  → Display diagnosis + chat history
```

## API Dependencies

### Required Services:
- `getSession(sessionId)` - Load full session data
- `sendChatMessage(prompt, sessionId)` - Generate report via AI

### Expected Session Data Structure:
```javascript
{
  session_id: string,
  created_at: timestamp,
  messages: [
    {
      role: 'user' | 'assistant',
      content: string,
      created_at: timestamp,
      visual_findings?: {
        findings: [...],
        detections: [...],
        annotated_image_base64: string,
        recommendations: [...],
        observations: [...]
      }
    }
  ]
}
```

## UI Components

### Header Actions:
- **Share Button**: Export laporan dalam berbagai format
- **Save Button**: Simpan laporan ke database

### Stats Display:
- Akurasi rata-rata
- Jumlah temuan
- Jumlah saran tindakan

### Content Sections:
1. Visualisasi Area (annotated image)
2. Ringkasan kondisi
3. Detail temuan dengan badge severity
4. Pengamatan positif
5. Saran tindakan
6. Export actions card

## Future Enhancements

### PDF Export (TODO):
```javascript
import * as Print from 'expo-print';

const generatePDF = async (reportContent) => {
  const html = `
    <html>
      <head>
        <style>
          body { font-family: Arial; padding: 20px; }
          h1 { color: #7C3AED; }
          .section { margin: 20px 0; }
        </style>
      </head>
      <body>
        <h1>Laporan Diagnosis Gigi</h1>
        <div class="content">${reportContent.replace(/\n/g, '<br>')}</div>
      </body>
    </html>
  `;
  
  const { uri } = await Print.printToFileAsync({ html });
  await Sharing.shareAsync(uri);
};
```

### Save to Database API:
```javascript
// Backend endpoint: POST /api/diagnosis/reports
const saveReportToDatabase = async (sessionId, reportContent) => {
  const response = await fetch(`${API_BASE}/diagnosis/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: sessionId,
      report_content: reportContent,
      report_type: 'medical',
      created_at: new Date().toISOString(),
    }),
  });
  return response.json();
};
```

### Advanced Report Formats:
- **Format Dokter Umum**: Lebih teknis, bahasa medis
- **Format Pasien**: Bahasa sederhana, penjelasan lengkap
- **Format Asuransi**: Include kode diagnosis ICD-10

### Email Integration:
```javascript
import * as MailComposer from 'expo-mail-composer';

const emailReport = async (reportContent) => {
  await MailComposer.composeAsync({
    recipients: ['dokter@klinik.com'],
    subject: 'Laporan Diagnosis Gigi AI',
    body: reportContent,
    attachments: [pdfUri],
  });
};
```

## Styling Notes

- Menggunakan responsive `normalize()` function
- Gradient header sesuai risk level (low=green, medium=orange, high=red)
- Chat bubbles dengan styling berbeda untuk user vs AI
- Card-based layout untuk easy scanning
- Tab switcher untuk organize content

## Error Handling

- Loading state saat fetch session
- Toast notifications untuk user feedback
- Graceful fallback jika data tidak lengkap
- Alert confirmations untuk destructive actions

## Testing Checklist

- [ ] Load session dengan berbagai struktur data
- [ ] Generate report dengan berbagai panjang percakapan
- [ ] Export TXT berhasil dan bisa dibuka
- [ ] Share functionality works di iOS dan Android
- [ ] Tab switching smooth tanpa lag
- [ ] Back navigation preserves state
- [ ] Toast messages muncul dengan benar
- [ ] Image loading handles base64 dengan baik
