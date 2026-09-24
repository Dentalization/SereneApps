---
type: "query"
date: "2026-09-24T17:25:21.148010+00:00"
question: "Why did X-Core scan status show Unexpected token HTML after phone upload?"
contributor: "graphify"
outcome: "useful"
---

# Q: Why did X-Core scan status show Unexpected token HTML after phone upload?

## Answer

The X-Core scan viewer requested /v1/x-core/3d-scans/:id/status from Vite, but Vite proxies only /api and returned the SPA HTML (200 text/html). Browser routes now use /api/v1 for status, retry and asset fetch; server-provided canonical /v1 asset URLs are strictly validated then prefixed with /api. Live local probe confirmed old path 200 text/html and new path 401 application/json without auth. This fixes viewer routing, not reconstruction success. Acquisition report is reused and frame identity checked before geometry publication.

## Outcome

- Signal: useful