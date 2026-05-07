# DeepDental Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the dentist DeepDental portal so secrets stay server-side, clinical image artifacts are retained only under an explicit IndexedDB policy, AI output renders safely, and the UI exposes quality review and clinician confirmation states.

**Architecture:** Browser requests go through the existing `/py-api/api/v1` proxy, which injects the DeepDental API key from backend environment only after app bearer-token authorization. The React module uses small helper modules for API policy, schema normalization, IndexedDB artifact retention, and quality precheck so tests can verify the security contract without mounting the full page.

**Tech Stack:** React 18, Vite, Express, Node `fetch`, IndexedDB, `node:test`, `react-markdown`, `remark-gfm`, `rehype-sanitize`.

---

### Task 1: Tests And Contracts

**Files:**
- Create: `web/tests/deepDentalAiContract.test.mjs`
- Create: `web/tests/deepDentalRenderingSafety.test.mjs`
- Create: `web/tests/clinicalArtifactStore.test.mjs`
- Create: `backend/tests/deepDentalProxy.test.js`
- Modify: `web/tests/securityHygiene.test.mjs`

- [ ] Add failing tests for proxy config, missing browser API key usage, schema/mime normalization, IndexedDB retention/delete behavior, quality coach output, and unsafe renderer removal.
- [ ] Run `node --test web/tests/deepDentalAiContract.test.mjs web/tests/deepDentalRenderingSafety.test.mjs web/tests/clinicalArtifactStore.test.mjs backend/tests/deepDentalProxy.test.js web/tests/securityHygiene.test.mjs`; expected result before implementation is module/import or assertion failure.

### Task 2: Server-Side DeepDental Proxy

**Files:**
- Create: `backend/src/utils/deepDentalProxy.js`
- Modify: `backend/src/server.js`
- Modify: `backend/.env.example`

- [ ] Move DeepDental proxy header/auth decisions into testable helpers.
- [ ] Require app bearer authentication for `/py-api/api/v1/*` DeepDental paths.
- [ ] Strip any client-supplied `X-API-Key` and inject `DEEPDENTAL_API_KEY` or `SERENE_AI_API_KEY` from backend env.
- [ ] Stream multipart bodies through the proxy and preserve parsed JSON body support.
- [ ] Return a visible `503 deepdental_proxy_not_configured` response if the backend secret is missing.

### Task 3: Frontend API Client And Storage

**Files:**
- Create: `web/src/pages/dentist-portal/ai/components/deepDentalClient.mjs`
- Create: `web/src/pages/dentist-portal/ai/components/deepDentalSchemas.mjs`
- Create: `web/src/pages/dentist-portal/ai/components/clinicalArtifactStore.mjs`
- Modify: `web/src/pages/dentist-portal/ai/components/useDentalAPI.js`
- Modify: `web/src/utils/httpClient.js`

- [ ] Replace production fallback with `/py-api/api/v1` or explicit `VITE_DEEPDENTAL_PROXY_BASE_URL`.
- [ ] Remove browser `X-API-Key` headers and add bearer token headers.
- [ ] Add timeout, cancellation, one retry with bounded backoff, and structured schema warnings.
- [ ] Replace image `localStorage` cache with IndexedDB retention entries and clear entries on delete/new session.
- [ ] Add object URL cleanup on preview removal, session switches, and component unmount.

### Task 4: Safe Rendering And Clinical UI

**Files:**
- Modify: `web/package.json`
- Modify: `web/package-lock.json`
- Modify: `web/src/pages/dentist-portal/ai/components/ChatMessage.jsx`
- Modify: `web/src/pages/dentist-portal/ai/components/VisualFindingsCard.jsx`
- Modify: `web/src/pages/dentist-portal/ai/components/InputBar.jsx`
- Modify: `web/src/pages/dentist-portal/ai/components/SessionSidebar.jsx`
- Modify: `web/src/pages/dentist-portal/ai/components/ThinkingLoader.jsx`
- Modify: `web/src/pages/dentist-portal/ai/index.jsx`
- Modify: `web/src/translations/id.js`
- Modify: `web/src/translations/en.js`

- [ ] Use `react-markdown` with `remark-gfm` and `rehype-sanitize`; remove `dangerouslySetInnerHTML`.
- [ ] Render annotated images through mime-aware data URL helpers.
- [ ] Add accessible names to icon-only controls and keyboard-safe delete buttons.
- [ ] Add Quality Coach image precheck in `InputBar`.
- [ ] Add clinician confirmation state for AI findings and prepare message data for a future Verified Case Workspace.
- [ ] Move DeepDental visible strings to `ai.deepDental` translations.

### Task 5: Docs, Collection, And Verification

**Files:**
- Modify: `web/docs/API_CDSS_DENTIST.md`
- Modify: `docs/apiendpointAI/DeepDental API.postman_collection.json`
- Modify: `docs/apiendpointAI/DeepDental Local.postman_environment.json`
- Create: `web/docs/DEEPDENTAL_AI_HARDENING.md`

- [ ] Document the secure proxy flow, artifact retention model, explicit analysis-from-detections contract, schema version, and annotated-image mime type fields.
- [ ] Update Postman examples to include dentist/id flows and negative cases.
- [ ] Run targeted Node tests and `npm run build` in `web`.
