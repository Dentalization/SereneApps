# DeepDental Dentist Portal Hardening

## Secure Request Flow

The dentist portal now calls DeepDental through `/py-api/api/v1`. The browser sends the app bearer token only. The Node backend validates that token for DeepDental API paths, strips any client-supplied service credential header, and injects the DeepDental service key from backend environment (`DEEPDENTAL_API_KEY` or `SERENE_AI_API_KEY`).

The browser no longer reads a long-lived DeepDental key from `VITE_*` variables, and the frontend defaults to the local proxy instead of silently falling back to `https://api.dentalization.id`.

## Storage Model

Session titles and ownership hints remain in `localStorage` because they are not clinical image artifacts. Dental image blobs, annotated outputs, and restored visual findings use IndexedDB through `clinicalArtifactStore` with a 24-hour retention policy. Session deletion removes matching IndexedDB artifacts, local titles, and ownership hints. The UI also exposes a clear-local-clinical-data action for the current browser.

## API Contract Changes

Image analysis uses `POST /api/v1/images/analyze` with multipart fields:

- `image`: dental image file
- `context`: clinician prompt or default Indonesian clinical analysis request
- `role`: `dentist`
- `language`: `id`
- `include_annotated`: `true`

The formal future contract for detection-only handoff is:

`POST /api/v1/analysis/from-detections`

```json
{
  "contract": "analysis_from_detections",
  "schema_version": "2026-05-07.deepdental.analysis-from-detections.v1",
  "session_id": "session_uuid",
  "role": "dentist",
  "language": "id",
  "message": "Apa prioritas klinisnya?",
  "detections": [
    { "label": "caries", "confidence": 0.91 }
  ],
  "image_metadata": {
    "file_name": "scan.png",
    "mime_type": "image/png",
    "size_bytes": 1200000
  }
}
```

Visual findings should return:

- `schema_version`: `2026-05-07.deepdental.visual-findings.v1`
- `annotated_image_base64`
- `annotated_image_mime_type`: `image/jpeg`, `image/png`, or `image/webp`
- `detections`, `findings`, `recommendations`, `limitations`, and `concern_level`

If legacy responses omit `annotated_image_mime_type`, the frontend records `annotated_image_mime_type_missing` in `schema_warnings` and renders with a JPEG fallback.

## Negative-Test Matrix

| Case | Expected behavior |
| --- | --- |
| Backend DeepDental key missing | Proxy returns `503 deepdental_proxy_not_configured`; UI shows AI unavailable/configuration error. |
| Missing app bearer token | Proxy returns `401 deepdental_proxy_auth_required`; browser never receives service credentials. |
| Invalid or expired app bearer token | Proxy returns `401 deepdental_proxy_auth_invalid`. |
| User lacks clinical role | Proxy returns `403 deepdental_proxy_forbidden`. |
| Oversized image | Quality Coach blocks analysis before request. |
| Unsupported image type | Quality Coach blocks analysis before request. |
| Malformed AI response | Renderer treats content as text/markdown only; no unsafe HTML injection path. |
| Schema drift in `image_quality` or `concern_level` | Frontend normalizes known object shapes and records `schema_warnings`. |
| Missing annotated mime type | Frontend records warning and uses explicit fallback. |
| Session delete | Server delete is attempted, then local clinical artifacts and local metadata are cleared. |

## Verification Checklist

- Browser source no longer references browser-exposed DeepDental API key variables.
- `ChatMessage` uses `react-markdown`, `remark-gfm`, and `rehype-sanitize`; no untrusted HTML injection.
- Annotated images render through mime-aware data URL helpers.
- Sensitive image artifacts use IndexedDB retention, not `localStorage`.
- Icon-only controls have accessible names or visible text.
- Dentist portal uses `role: dentist` and current language, with Indonesian-first defaults.
- Clinician review state can mark AI findings as confirmed or needing revision.
- Message data includes `caseWorkspace` hooks for future Verified Case Workspace export and timeline linkage.

## Remaining Known Risks

The external DeepDental backend still needs to implement `POST /api/v1/analysis/from-detections` before detection-only handoff can be used end to end. The current hardened image flow uses the documented `/images/analyze` endpoint instead of the previous text-only `/chat/upload` workaround.

The IndexedDB cache is browser-local and retention-based, not encrypted application storage. It is appropriate only for short-lived restore behavior and should be replaced by server-side case storage when Verified Case Workspace becomes persistent.

## Recommended Next Feature Slice

Build Verified Case Workspace persistence: multi-image case records, clinician-confirmed findings, exportable summary, patient timeline linkage, and audit events for AI draft versus clinician-confirmed output.

## Verified Case Workspace Implementation

The dentist AI page now includes a backend-owned clinical case workflow beside the existing chat flow. The workflow is not a chat attachment shortcut: it uses case records, case images, quality checks, AI findings, clinician findings, immutable audit events, exports, and patient timeline events.

### Backend Case Contract

The Node API exposes these authenticated endpoints under `/v1`:

- `POST /cases`, `GET /cases`, `GET /cases/{case_id}`, `PATCH /cases/{case_id}`, `POST /cases/{case_id}/archive`
- `POST /cases/{case_id}/images`, `GET /cases/{case_id}/images`, `DELETE /cases/{case_id}/images/{image_id}`
- `POST /cases/{case_id}/images/{image_id}/quality-check`
- `POST /cases/{case_id}/images/{image_id}/analyze`
- `GET /cases/{case_id}/findings`, `POST /cases/{case_id}/findings`, `PATCH /cases/{case_id}/findings/{finding_id}`
- `POST /cases/{case_id}/findings/{finding_id}/confirm`, `POST /cases/{case_id}/findings/{finding_id}/reject`
- `GET /cases/{case_id}/audit`
- `POST /cases/{case_id}/export/pdf`, `POST /cases/{case_id}/export/json`
- `POST /cases/{case_id}/link-patient`
- `GET /patients/{patient_id}/timeline`
- `GET /sessions/{session_id}/case`, `POST /sessions/{session_id}/case`

Dentist/admin roles can create cases, upload images, run quality checks, analyze images, confirm/reject/edit findings, verify cases, archive cases, and export reports. Patient timeline reads are limited to the patient themself unless the actor is dentist/admin.

### Data Model

Migration `048_create_verified_case_workspace.sql` defines:

- `verified_cases`
- `case_images`
- `image_quality_checks`
- `ai_findings`
- `clinician_findings`
- `case_audit_events`
- `case_exports`
- `patient_timeline_events`

Case statuses are explicit: `draft`, `images_uploaded`, `quality_checked`, `analysis_completed`, `pending_clinician_review`, `verified`, `exported`, and `archived`.

### Frontend Workflow

The AI page now uses:

- `ClinicalHistorySidebar` for merged chat/case history with filters, search, status badges, image count, timeline indicator, and low-quality warning.
- `VerifiedCaseWorkspace` for multi-image upload, per-image quality state, AI analysis, clinician confirmation, audit trail, export, and timeline linkage.
- `verifiedCaseWorkspaceClient.mjs` for the new case API contract through authenticated backend calls.

Images are uploaded to backend case endpoints and receive stable `image_id` values. The UI may keep temporary preview URLs, but case state, findings, audit events, exports, and timeline records are loaded from backend APIs.

### Current Caveat

The case route now defaults to a DB-backed repository using migration `048_create_verified_case_workspace.sql`. The previous in-memory store is retained only for unit tests or explicit local mock mode via `VERIFIED_CASE_WORKSPACE_STORE=memory`.

### Hardening Added On 2026-05-08

- Internal case, image, finding, audit, export, and timeline IDs are UUIDs.
- Uploaded image bytes are written through `verifiedCaseImageStorage` and returned as retrievable signed/local URLs.
- `/cases/{case_id}/images/{image_id}/analyze` loads the stored image server-side and runs the backend AI adapter; it no longer accepts browser-provided raw AI findings as the source of truth.
- Analysis is blocked unless the latest quality check exists and has `can_continue_analysis === true`.
- `PATCH /cases/{case_id}` updates safe metadata only; verification is handled by `POST /cases/{case_id}/verify`.
- Default PDF/JSON exports require `case.status === verified`.
- Audit events are immutable at repository contract level and migration trigger level.
- `verified_cases` includes `tenant_id` and `clinic_id`, and route/service access uses actor tenant/clinic scope.
- Patient timeline reads compare patient ids with string-safe equality for patient actors.
- Patient linkage is done through a confirmation modal instead of `window.prompt`.
- The workspace is available on mobile/tablet through Case, Findings, Audit, Export, and Timeline tabs.
