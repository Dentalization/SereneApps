# Verified Case Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a clinical case workflow that connects sessions, patients, multi-image uploads, quality checks, AI findings, clinician confirmation, audit events, exports, and patient timeline linkage.

**Architecture:** Add a backend-owned case workspace API and storage model, then let the dentist AI page consume that case source of truth while preserving existing DeepDental chat/session flows through the proxy. The frontend keeps temporary previews in memory/IndexedDB, but case state, findings, audit events, exports, and timeline records are loaded from backend APIs.

**Tech Stack:** Express, multer, Node test runner, React/Vite, axios authenticated client, existing DeepDental proxy/client, IndexedDB temporary cache.

---

### Task 1: Backend Case Domain

**Files:**
- Create: `backend/src/services/verifiedCaseWorkspaceService.js`
- Create: `backend/tests/verifiedCaseWorkspace.service.test.js`
- Create: `backend/migrations/048_create_verified_case_workspace.sql`

- [x] Write failing service tests for case creation, image upload, duplicate detection, quality checks, clinician findings, immutable audit events, exports, timeline linkage, archive behavior, and role permissions.
- [x] Implement a backend case workspace service with explicit statuses, finding statuses, audit event types, and timeline events.
- [x] Add a SQL migration defining `verified_cases`, `case_images`, `image_quality_checks`, `ai_findings`, `clinician_findings`, `case_audit_events`, `case_exports`, and `patient_timeline_events`.

### Task 2: Backend Routes

**Files:**
- Create: `backend/src/routes/verified-cases.js`
- Modify: `backend/src/server.js`

- [x] Add authenticated routes for `/cases`, `/cases/:caseId/images`, per-image quality check and analysis, findings confirm/reject/edit/manual add, audit, PDF/JSON export, patient linkage, patient timeline, and session-case linkage.
- [x] Enforce role gates: dentist/admin for clinical actions, dentist/admin for export, patient/dentist/admin for authorized timeline reads.

### Task 3: Frontend Case Workspace Client And Models

**Files:**
- Create: `web/src/pages/dentist-portal/ai/components/verifiedCaseWorkspaceClient.mjs`
- Create: `web/src/pages/dentist-portal/ai/components/caseWorkspaceModels.mjs`
- Create: `web/tests/verifiedCaseWorkspaceModels.test.mjs`

- [x] Add failing tests for clinical history filtering/search, duplicate image validation, status badges, race-safe active request handling, and API-key hygiene.
- [x] Implement a typed frontend client for the new case APIs using bearer auth through the existing auth client.
- [x] Implement pure model helpers used by the sidebar, uploader, quality panel, and tests.

### Task 4: Frontend Clinical UI

**Files:**
- Create: `web/src/pages/dentist-portal/ai/components/ClinicalHistorySidebar.jsx`
- Create: `web/src/pages/dentist-portal/ai/components/MultiImageUploader.jsx`
- Create: `web/src/pages/dentist-portal/ai/components/ClinicianFindingPanel.jsx`
- Create: `web/src/pages/dentist-portal/ai/components/AuditTrailPanel.jsx`
- Create: `web/src/pages/dentist-portal/ai/components/CaseExportPanel.jsx`
- Create: `web/src/pages/dentist-portal/ai/components/PatientTimelinePanel.jsx`
- Create: `web/src/pages/dentist-portal/ai/components/VerifiedCaseWorkspace.jsx`
- Modify: `web/src/pages/dentist-portal/ai/components/useDentalAPI.js`
- Modify: `web/src/pages/dentist-portal/ai/index.jsx`

- [x] Replace the simple session drawer with a clinical history sidebar that merges chat and case-linked sessions, adds filters/search/status badges, and archives cases instead of destructive case delete.
- [x] Add multi-image upload cards, per-image precheck display, AI analysis trigger, clinician confirmation/edit/reject/manual finding workflow, audit trail, export controls, and timeline linkage panel.
- [x] Guard race conditions by aborting stale session/case loads and ignoring out-of-date responses.

### Task 5: Docs, Collection, Verification

**Files:**
- Modify: `docs/apiendpointAI/DeepDental API.postman_collection.json`
- Modify: `web/docs/DEEPDENTAL_AI_HARDENING.md`
- Add: `web/tests/verifiedCaseWorkspaceContract.test.mjs`

- [x] Document the new endpoints and workflow.
- [x] Add non-regression tests for existing DeepDental API key and case workspace source-of-truth constraints.
- [x] Run targeted backend tests, full web tests, and production build before reporting completion.
