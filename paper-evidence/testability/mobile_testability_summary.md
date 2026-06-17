# Mobile Testability Summary

Generated at: 2026-06-17.

## Evidence Files

| Evidence | Path |
|---|---|
| Jest JSON result | `paper-evidence/testability/mobile_jest_results.json` |
| Jest terminal output | `paper-evidence/testability/mobile_jest_output.txt` |
| Coverage summary | `mobile/coverage/coverage-summary.json` |
| Coverage LCOV | `mobile/coverage/lcov.info` |

## Command Executed

```bash
cd mobile
npm test -- --coverage --runInBand --json --outputFile ../paper-evidence/testability/mobile_jest_results.json
```

## Result

| Metric | Previous | New |
|---|---:|---:|
| Test cases | 18 | 23 |
| Passed | 18 | 23 |
| Failed | 0 | 0 |
| Line coverage | 1.15% | 2.44% |
| Statement coverage | 1.11% | 2.40% |
| Branch coverage | 0.65% | 1.85% |
| Function coverage | 0.92% | 1.33% |

## Added Tests

Added 5 Jest tests in `mobile/__tests__/mobile-services.test.js`.

The tests cover:

- appointment creation payload mapping from mobile patient input to backend API contract;
- patient appointment list query construction;
- CDSS/AI analysis result normalization before backend sync;
- retry behavior when saving analysis with annotated image fails on server error;
- local AI analysis history sync summary for mixed success/failure cases.

## Remaining Untested Areas

- device-level camera/image-picker behavior;
- full appointment booking UI screens;
- Twilio/video runtime behavior on mobile device;
- CDSS result screens and navigation flows;
- offline persistence and push-notification flows.

The remaining low global coverage is expected because most mobile screens are still untested. The new tests improve the patient-facing service layer without requiring emulator/device dependencies.
