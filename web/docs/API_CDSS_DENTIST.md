# DeepDental API Documentation

**Version:** 1.0.0  
**Backend Base URL:** `/api/v1`  
**Dentist Portal Proxy:** `/py-api/api/v1`  
**Server-to-DeepDental Authentication:** `X-API-Key` injected by backend proxy only  
**Browser-to-Proxy Authentication:** app `Authorization: Bearer <access token>`

AI-powered teledentistry assistant REST API untuk diagnosis dental menggunakan computer vision dan LLM.

> Security note: web clients must not call DeepDental directly with a long-lived service key. The dentist portal uses `/py-api/api/v1`; the Node backend validates the app bearer token, strips any client-supplied service key, and injects the DeepDental key from backend environment.

---

## 🏥 Health

### GET `/api/v1/health`
Check API health status dan status komponen individual.

**Response 200:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "components": {
    "database": { "status": "up" },
    "llm": { "status": "up" },
    "yolo": { "status": "up" }
  }
}
```

---

## 💬 Sessions Management

### POST `/api/v1/sessions`
Membuat sesi chat baru. Setiap sesi memiliki riwayat percakapan yang terisolasi.

**Headers for direct backend/API tooling:**
- `X-API-Key` (required): API key untuk autentikasi

**Headers from dentist portal browser to proxy:**
- `Authorization: Bearer <access token>`

**Request Body:**
```json
{
  "role": "dentist",            // "patient" (awam) | "dentist" (profesional)
  "language": "id",             // "id" | "en" | "bilingual"
  "metadata": {}                // optional metadata
}
```

**Contoh untuk Dentist:**
```json
{
  "role": "dentist",
  "language": "id",
  "metadata": {
    "source": "deepdental_pro",
    "clinic_id": "clinic_123",
    "specialization": "endodontist"
  }
}
```

**Response 200:**
```json
{
  "id": "session_uuid",
  "user_id": "user_uuid",
  "tenant_id": "tenant_uuid",
  "role": "dentist",
  "language": "id",
  "created_at": "2025-12-24T00:00:00Z",
  "updated_at": "2025-12-24T00:00:00Z",
  "message_count": 0,
  "metadata": {}
}
```

---

### GET `/api/v1/sessions`
List semua sesi user dengan pagination.

**Headers:**
- `X-API-Key` (required)

**Query Parameters:**
- `page` (default: 1, min: 1): Nomor halaman
- `per_page` (default: 20, max: 100, min: 1): Jumlah item per halaman

**Response 200:**
```json
{
  "sessions": [
    {
      "id": "session_uuid",
      "user_id": "user_uuid",
      "role": "patient",
      "language": "bilingual",
      "created_at": "2025-12-24T00:00:00Z",
      "message_count": 5
    }
  ],
  "pagination": {
    "total": 50,
    "page": 1,
    "per_page": 20,
    "total_pages": 3
  }
}
```

---

### GET `/api/v1/sessions/{session_id}`
Get detail sesi berdasarkan ID.

**Headers:**
- `X-API-Key` (required)

**Path Parameters:**
- `session_id` (required): ID sesi

**Response 200:**
```json
{
  "id": "session_uuid",
  "user_id": "user_uuid",
  "tenant_id": "tenant_uuid",
  "role": "patient",
  "language": "bilingual",
  "created_at": "2025-12-24T00:00:00Z",
  "updated_at": "2025-12-24T00:00:00Z",
  "message_count": 10,
  "metadata": {}
}
```

---

### DELETE `/api/v1/sessions/{session_id}`
Hapus sesi dan semua pesan di dalamnya.

**Headers:**
- `X-API-Key` (required)

**Path Parameters:**
- `session_id` (required)

**Response 200:**
```json
{
  "success": true,
  "message": "Session deleted successfully"
}
```

---

### GET `/api/v1/sessions/{session_id}/messages`
Get semua pesan dalam sesi.

**Headers:**
- `X-API-Key` (required)

**Path Parameters:**
- `session_id` (required)

**Response 200:**
```json
{
  "session_id": "session_uuid",
  "messages": [
    {
      "id": "msg_uuid",
      "session_id": "session_uuid",
      "role": "user",
      "content": "Apa ini karies?",
      "images": ["base64_string"],
      "sources": [
        {
          "citation_number": 1,
          "source": "Dental Pathology Handbook",
          "page": 42,
          "excerpt": "...",
          "relevance_rank": 1
        }
      ],
      "visual_findings": {},
      "created_at": "2025-12-24T00:00:00Z"
    }
  ],
  "total": 10
}
```

---

### DELETE `/api/v1/sessions/{session_id}/messages`
Hapus semua pesan dalam sesi (sesi tetap ada).

**Headers:**
- `X-API-Key` (required)

**Path Parameters:**
- `session_id` (required)

**Response 200:**
```json
{
  "success": true,
  "message": "Messages cleared successfully"
}
```

---

## 💬 Chat

### POST `/api/v1/chat`
Kirim pesan chat dengan optional base64-encoded images.

**Headers:**
- `X-API-Key` (required)

**Request Body (Patient):**
```json
{
  "message": "Apa diagnosis untuk gambar ini?",
  "session_id": "session_uuid",
  "role": "patient",
  "language": "bilingual",
  "images": [
    {
      "data": "base64_encoded_image",
      "filename": "dental_xray.jpg"
    }
  ]
}
```

**Request Body (Dentist):**
```json
{
  "message": "Analyze this periapical radiograph for any signs of periapical pathology",
  "session_id": "session_uuid",
  "role": "dentist",
  "language": "bilingual",
  "images": [
    {
      "data": "base64_encoded_image",
      "filename": "periapical_xray.jpg"
    }
  ]
}
```

**Response 200:**
```json
{
  "session_id": "session_uuid",
  "message_id": "msg_uuid",
  "content": "Berdasarkan analisis gambar...",
  "sources": [
    {
      "citation_number": 1,
      "source": "Clinical Dental Pathology",
      "page": 156,
      "excerpt": "Caries characteristics include...",
      "relevance_rank": 1
    }
  ],
  "visual_findings": {
    "schema_version": "2026-05-07.deepdental.visual-findings.v1",
    "image_quality": "good",
    "findings": [
      {
        "mark_id": "[1]",
        "location": "upper right molar",
        "description": "Possible caries lesion",
        "severity": "moderate",
        "confidence": "high",
        "differentials": ["dental caries", "enamel hypoplasia"]
      }
    ],
    "detections": [
      {
        "mark_id": "[1]",
        "label": "caries",
        "confidence": 0.89,
        "bbox": [120, 80, 200, 150]
      }
    ],
    "concern_level": "moderate",
    "recommendations": ["Konsultasi dengan dokter gigi", "Pemeriksaan lebih lanjut"],
    "limitations": "Image quality affects accuracy",
    "annotated_image_base64": "base64_annotated_image",
    "annotated_image_mime_type": "image/png"
  },
  "suggested_questions": [
    "Bagaimana cara merawat karies?",
    "Apakah perlu cabut gigi?"
  ]
}
```

---

### POST `/api/v1/chat/upload`
Kirim pesan chat dengan file upload (multipart form-data).

**Headers:**
- `X-API-Key` (required)

**Form Data:**
- `message` (required): Text pesan user
- `session_id` (required): ID sesi
- `role` (optional): Role user ("patient" | "dentist")
- `language` (optional): Bahasa response ("id" | "en" | "bilingual")
- `images` (optional): Array file gambar

**Response 200:** Same as `/api/v1/chat`

**Dentist portal behavior:** text-only chat uses `/api/v1/chat` JSON. Image analysis uses `/api/v1/images/analyze`. The portal no longer sends a detection-summary prompt through `/chat/upload` without an image file.

---

### POST `/api/v1/analysis/from-detections`
Formal contract for converting already-computed detector output into clinical reasoning. This endpoint replaces any prompt-only workaround that embeds detector output inside ordinary chat text.

**Headers:**
- `X-API-Key` (required for direct API tooling)

**Request Body:**
```json
{
  "contract": "analysis_from_detections",
  "schema_version": "2026-05-07.deepdental.analysis-from-detections.v1",
  "session_id": "session_uuid",
  "role": "dentist",
  "language": "id",
  "message": "Apa prioritas klinisnya?",
  "detections": [
    {
      "mark_id": "[1]",
      "label": "caries",
      "confidence": 0.91,
      "bbox": [120, 80, 200, 150]
    }
  ],
  "image_metadata": {
    "file_name": "scan.png",
    "mime_type": "image/png",
    "size_bytes": 1200000
  }
}
```

**Response 200:** Same clinical response envelope as `/api/v1/chat`, with `visual_findings.schema_version` and `visual_findings.annotated_image_mime_type` when annotated output is present.

---

## 🖼️ Image Analysis

### POST `/api/v1/images/analyze`
Analisis visual lengkap dengan SoM grounding. Menggunakan YOLO untuk deteksi dan Gemini untuk analisis detail.

**Headers:**
- `X-API-Key` (required)

**Form Data:**
- `image` (required): File gambar (binary)
- `context` (optional): Konteks tambahan untuk analisis
- `role` (optional): Role user
- `include_annotated` (optional): Include annotated image (default: true)

**Response 200:**
```json
{
  "schema_version": "2026-05-07.deepdental.visual-findings.v1",
  "image_quality": "good",
  "findings": [
    {
      "mark_id": "[1]",
      "location": "upper right molar",
      "description": "Suspected dental caries",
      "severity": "moderate",
      "confidence": "high",
      "differentials": ["caries", "staining"]
    }
  ],
  "detections": [
    {
      "mark_id": "[1]",
      "label": "caries",
      "confidence": 0.92,
      "bbox": [100, 50, 180, 120]
    }
  ],
  "concern_level": "moderate",
  "recommendations": ["Konsultasi dokter gigi", "Foto X-ray"],
  "limitations": "Lighting conditions may affect accuracy",
  "annotated_image_base64": "base64_image_with_marks",
  "annotated_image_mime_type": "image/jpeg",
  "suggested_questions": ["Apa penyebab karies?", "Bagaimana pencegahannya?"],
  "processing_time_ms": 1250
}
```

---

### POST `/api/v1/images/detect`
YOLO detection only (tanpa LLM analysis). Lebih cepat untuk deteksi patologi tanpa analisis detail.

**Headers:**
- `X-API-Key` (required)

**Form Data:**
- `image` (required): File gambar (binary)
- `include_annotated` (optional): Include annotated image

**Response 200:**
```json
{
  "schema_version": "2026-05-07.deepdental.visual-findings.v1",
  "detections": [
    {
      "mark_id": "[1]",
      "label": "caries",
      "confidence": 0.89,
      "bbox": [120, 80, 200, 150]
    },
    {
      "mark_id": "[2]",
      "label": "calculus",
      "confidence": 0.76,
      "bbox": [50, 100, 90, 140]
    }
  ],
  "annotated_image_base64": "base64_image",
  "annotated_image_mime_type": "image/png",
  "processing_time_ms": 350
}
```

---

## 📚 Knowledge Base

### POST `/api/v1/knowledge/query`
Query dental knowledge base secara langsung. Returns synthesized answer dengan sources dan citations.

**Headers:**
- `X-API-Key` (required)

**Request Body (Patient):**
```json
{
  "question": "Apa penyebab karies gigi?",
  "role": "patient",
  "k": 4                    // jumlah dokumen yang di-retrieve
}
```

**Request Body (Dentist):**
```json
{
  "question": "What are the latest treatment protocols for reversible pulpitis?",
  "role": "dentist",
  "k": 6
}
```

**Response 200:**
```json
{
  "answer": "Karies gigi disebabkan oleh kombinasi bakteri, gula, dan asam...",
  "sources": [
    {
      "citation_number": 1,
      "source": "Modern Dental Pathology",
      "page": 89,
      "excerpt": "Dental caries is a multifactorial disease...",
      "relevance_rank": 1
    }
  ],
  "confidence": "high",
  "coverage_gaps": ["Specific prevention methods not covered"],
  "suggested_questions": [
    "Bagaimana cara mencegah karies?",
    "Apa saja gejala karies?"
  ]
}
```

---

## 👤 User Management

---

## 🧾 Verified Case Workspace

Endpoint berikut berjalan di API SereneApps (`/v1`), bukan langsung di DeepDental Python API. Browser memakai bearer token aplikasi; service key DeepDental tetap berada di backend.

### POST `/v1/cases`
Create clinical case workspace.

```json
{
  "title": "Bitewing caries follow-up",
  "patient_id": "optional_patient_id",
  "session_id": "optional_deepdental_session_id"
}
```

### GET `/v1/cases`
List case history for ClinicalHistorySidebar.

Query:
- `search`
- `include_archived=true`

### GET `/v1/cases/{case_id}`
Returns case detail, images, findings, audit events, and exports.

### PATCH `/v1/cases/{case_id}`
Update safe case metadata only, such as title or last message preview. This endpoint must not mutate case status.

### POST `/v1/cases/{case_id}/verify`
Verify the case after patient linkage and clinician findings exist.

### POST `/v1/cases/{case_id}/archive`
Archive a clinical case instead of destructive delete.

```json
{ "reason": "Case closed after export" }
```

### POST `/v1/cases/{case_id}/images`
Multipart upload for one or more images.

Fields:
- `images`: repeated image file field

Each uploaded image receives a stable `image_id`, `storage_ref`, mime metadata, duplicate marker, upload status, and signed retrieval URL. Verified case images are not served from public `/uploads/verified-cases` paths; clients use `GET /v1/case-storage/{signed_token}` URLs returned by the API.

### POST `/v1/cases/{case_id}/images/{image_id}/quality-check`
Run per-image quality precheck.

```json
{
  "metrics": {
    "width": 1400,
    "height": 1000,
    "blur": 0.08,
    "brightness": 0.55,
    "contrast": 0.68,
    "dentalRelevance": 0.95,
    "teethVisible": true,
    "faceVisible": false
  }
}
```

Response includes `quality_score`, `quality_status`, `issues`, `recommendation`, and `can_continue_analysis`.

### POST `/v1/cases/{case_id}/images/{image_id}/analyze`
Run server-side AI analysis for one stored case image. The backend loads `case_images.storage_ref`, checks the latest quality check, runs the AI adapter, stores annotated image output, and persists preliminary AI findings.

```json
{
  "context": "Analisis klinis multi-image untuk Verified Case Workspace."
}
```

AI findings are stored as `ai_suggested`, never as final diagnosis.

Errors:
- `400 quality_check_required`
- `400 image_quality_blocks_analysis`

### Findings

- `GET /v1/cases/{case_id}/findings`
- `POST /v1/cases/{case_id}/findings`
- `PATCH /v1/cases/{case_id}/findings/{finding_id}`
- `POST /v1/cases/{case_id}/findings/{finding_id}/confirm`
- `POST /v1/cases/{case_id}/findings/{finding_id}/reject`

Clinician finding statuses:
- `ai_suggested`
- `clinician_confirmed`
- `clinician_rejected`
- `clinician_edited`
- `manual_added`

### Audit

`GET /v1/cases/{case_id}/audit`

Audit events are immutable and include actor, role, event type, before/after JSON, reason, timestamp, request id, and device metadata.

### Export

- `POST /v1/cases/{case_id}/export/pdf`
- `POST /v1/cases/{case_id}/export/json`

Exports require a linked patient and verified case. Each export creates a `case_exported` audit event and a `report_exported` patient timeline event.

Default exports reject non-verified cases with `400 case_verification_required`. Draft exports may only be produced by explicitly requesting draft mode and must be marked `DRAFT - NOT CLINICIAN VERIFIED`; draft exports do not move the case into `exported` status and do not create verified report timeline linkage.

### Case Storage Download

`GET /v1/case-storage/{signed_token}`

Returns the stored original, annotated, PDF, or JSON export object only when the HMAC-signed token is valid and unexpired. This endpoint replaces public static access to verified clinical artifacts.

### Tenant And Clinic Scope

Verified Case Workspace routes derive `tenant_id` and `clinic_id` from authenticated JWT claims, not caller-supplied headers. Dentist tokens without tenant/clinic scope are rejected with `403 tenant_scope_required`.

### Patient Timeline Linkage

- `POST /v1/cases/{case_id}/link-patient`
- `GET /v1/patients/{patient_id}/timeline`
- `GET /v1/sessions/{session_id}/case`
- `POST /v1/sessions/{session_id}/case`

Timeline cards include event date, case title/status, confirmed findings summary, image count, report link, and related session id.

### GET `/api/v1/users/me`
Get informasi user saat ini.

**Headers:**
- `X-API-Key` (required)

**Response 200:**
```json
{
  "user_id": "user_uuid",
  "tenant_id": "tenant_uuid",
  "default_role": "dentist",
  "language_preference": "bilingual",
  "created_at": "2025-12-24T00:00:00Z"
}
```

---

### PATCH `/api/v1/users/me/preferences`
Update preferensi user.

**Headers:**
- `X-API-Key` (required)

**Request Body:**
```json
{
  "default_role": "dentist",          // "patient" | "dentist"
  "language_preference": "id"         // "id" | "en" | "bilingual"
}
```

**Response 200:**
```json
{
  "user_id": "user_uuid",
  "tenant_id": "tenant_uuid",
  "default_role": "dentist",
  "language_preference": "id",
  "created_at": "2025-12-24T00:00:00Z"
}
```

---

## 📝 Error Responses

Semua endpoint dapat mengembalikan error berikut:

**422 Validation Error:**
```json
{
  "detail": [
    {
      "loc": ["body", "message"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

**401 Unauthorized:**
```json
{
  "detail": "Invalid or missing API key"
}
```

**404 Not Found:**
```json
{
  "detail": "Session not found"
}
```

**500 Internal Server Error:**
```json
{
  "detail": "Internal server error"
}
```

---

## 🔑 Authentication

Semua endpoint memerlukan `X-API-Key` header:

```http
X-API-Key: your_api_key_here
```

---

## 📊 Response Schema Types

### UserRole
- `patient`: Pasien - untuk pertanyaan umum dan penjelasan sederhana
- `dentist`: Dokter gigi - untuk analisis profesional dan terminologi medis

**Catatan:** Role menentukan tingkat detail dan kompleksitas response dari AI:
- **Patient role**: Jawaban menggunakan bahasa awam, fokus pada edukasi dan penjelasan yang mudah dipahami
- **Dentist role**: Jawaban menggunakan terminologi medis, detail klinis, dan rekomendasi profesional

### Language
- `id`: Bahasa Indonesia
- `en`: English  
- `bilingual`: Bilingual (ID/EN) - recommended untuk context Indonesia

### SeverityLevel
- `minimal`: Minimal concern - kondisi ringan
- `mild`: Mild concern - perlu monitoring
- `moderate`: Moderate concern - perlu konsultasi
- `severe`: Severe concern - perlu tindakan segera
- `critical`: Critical concern - emergency

### ConfidenceLevel
- `low`: < 0.5 - tingkat kepercayaan rendah
- `medium`: 0.5 - 0.75 - tingkat kepercayaan sedang
- `high`: > 0.75 - tingkat kepercayaan tinggi
