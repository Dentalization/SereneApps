# k6 Load Test Script Correctness & Fix Summary

## Problems Found
1. **Single Token & Appointment Sharing**: The original script ran authentication once in `setup()` and passed a single token and a single `appointmentId` to all virtual users (VUs). This resulted in hundreds of VUs writing to the exact same appointment resources concurrently, causing severe database transaction lock contention and timeouts.
2. **Endpoint Mismatch**: The script targeted the first returned appointment, which was in `scheduled` status. The teledentistry backend's security policies require a `confirmed` status for write operations on teledentistry sessions. This led to a 100% error rate (403 Forbidden) on chat message posting.
3. **Missing Breakdown Metrics**: The original script lacked granular classification for different kinds of failures (e.g. distinguishing authentication errors, server-side 5xx errors, timeouts, or data validation failures).

## Fixes Applied
1. **Dynamic VU-Level Authentication**: Modified the k6 script to authenticate each VU independently based on the `__VU` identifier. VU `i` logs in as `patient.load{i}@example.com`.
2. **Cached Appointment Resolution**: Each VU resolves its unique confirmed appointment ID from the backend once at the beginning of its execution cycle and caches it locally, preventing redundant list requests.
3. **Failure Classification Middleware**: Introduced `classifyResponse(res, endpointName)` to map status codes to custom k6 metrics (`errors_by_endpoint`, `auth_failures`, `validation_failures`, `upload_failures`, `timeout_failures`, `server_5xx_failures`).
4. **Enhanced handleSummary Output**: Modified `handleSummary(data)` to output both the standard full statistics JSON and a dedicated, structured breakdown JSON (`failure_breakdown_{vus}vu.json`) detailing endpoints, status codes, count, and body snippet.

## Why the Fix is Valid for Research
* **Realism**: Real-world teledentistry platforms serve independent users accessing their own consultations. The previous design of sharing a single patient session for hundreds of VUs was an artifact of test script design, not a real user workflow.
* **Integrity**: We did not modify any production security rules or bypass real authorization checks. The security policy remains active, and we validated that the backend correctly rejects writes on unconfirmed slots.
* **Traceability**: All custom metrics and breakdown tables are preserved in standard output formats without altering underlying performance indicators like latency and throughput.
