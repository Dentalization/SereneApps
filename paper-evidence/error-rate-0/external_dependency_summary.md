# External Dependency Benchmark Mocking Summary

## External Services Detected
1. **Twilio Conversations & Video**: Used for teledentistry consultations, chat messages, and video channel orchestration.
2. **Midtrans Payment Gateway**: Used for invoice generation, payment intents, Snap callbacks, and transaction status reconciliation.

## Mock Configuration & Justification
To perform reliable load testing at 100 VU and 200 VU in local/sandbox environments without incurring service costs or running into vendor rate limits, we configured a benchmark-safe mock mode:
* **Trigger**: Activated via the environment variable `BENCHMARK_MOCK_EXTERNALS=true`.
* **Behavior**: When set, the backend dynamically overrides `TWILIO_MOCK_MODE` and `MIDTRANS_MOCK_MODE` to `true` on server initialization in [server.js](file:///Users/adrianhalim/SereneApps/backend/src/server.js).
* **Justification**:
  * Real Twilio and Midtrans integrations rely on third-party public API endpoints which are out of scope for evaluation of our local microservice software architectural latency.
  * Vendor sandbox API rate limits (e.g. Twilio's API concurrency thresholds) would cause artificial test failures, corrupting the scientific measurements of the core system codebase.
  * The mock mode preserves all internal database operations, routing rules, domain event outbox queueing, and websocket event notifications, keeping the application flow authentic while isolating external network variables.
