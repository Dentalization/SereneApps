# Backend Consultation / Chat Testability Summary

Generated at: 2026-06-17.

## Evidence Files

| Evidence | Path |
|---|---|
| Node.js test runner output and coverage | `paper-evidence/testability/backend_chat_node_test_output.txt` |
| New adapter tests | `backend/tests/communications.adapter.mock.test.js` |
| New helper tests | `backend/tests/communications.testability.extra.test.js` |

## Command Executed

```bash
cd backend
env TWILIO_MOCK_MODE=false node --test --experimental-test-coverage '--test-coverage-exclude=tests/**' --test-concurrency=1 tests/communications*.test.js
```

## Result

| Metric | Previous | New |
|---|---:|---:|
| Test cases | 31 | 36 |
| Passed | 31 | 36 |
| Failed | 0 | 0 |
| Skipped | 0 | 0 |
| Line coverage | 19.61% | 20.47% |
| Branch coverage | 69.58% | 69.97% |
| Function coverage | 22.66% | 25.09% |

## Added Tests

Added 5 Node.js tests:

- mock ConversationsAdapter workflow without Twilio credentials;
- mock token metadata and TTL behavior;
- actor role selection for patient, dentist, invited observer, pending participant, and admin;
- observer token mode normalization and TTL clamp;
- waiting-room ended state after the appointment grace window.

## Skipped Tests

No skipped tests were reported in the latest consultation/chat focused run.

## Remaining Untested Areas

- full database-backed message send route success path;
- invalid appointment/session route responses with real auth middleware;
- attachment upload validation through HTTP multipart route;
- unauthorized access through full route stack;
- external Twilio failure propagation outside mock mode;
- closed-session write blocking if the behavior is enforced in route/service code.

The added tests are intentionally service-level because they are stable and do not require external Twilio credentials.
