# ESLint Maintainability Fix Summary

Generated at: 2026-06-17.

## Evidence Files

| Evidence | Path |
|---|---|
| Raw web ESLint report | `maintainability-results/eslint-web.json` |
| ESLint component summary | `maintainability-results/eslint-summary.json` |

## Commands Executed

```bash
cd web
npm run lint:report

cd ..
npm run maintainability:eslint
```

## Result

| Metric | Initial | Final |
|---|---:|---:|
| Web ESLint errors | 69 | 62 |
| Web ESLint warnings | 1915 | 1921 |
| Fixable web errors | 0 | 0 |
| Fixable web warnings | N/A | 8 |

## Files Changed

| File | Change |
|---|---|
| `web/eslint.config.cjs` | Added a local compatibility shim for existing `react-hooks/exhaustive-deps` disable comments so ESLint 9 does not treat the missing rule definition as an error. |
| `web/src/pages/dentist-portal/patient-emr/jquery.odontogram.js` | Removed one duplicate unreachable `break` statement. |

## Issues Fixed

- Removed 6 ESLint errors caused by disable comments referencing a rule that was not configured.
- Removed 1 unreachable-code error caused by a duplicated `break`.

## Issues Intentionally Not Fixed

| Issue | Count | Reason |
|---|---:|---|
| Duplicate translation keys in `web/src/translations/*.js` | 60 | Fixing requires content/product review because object key precedence determines visible UI strings. |
| `no-unreachable` in `web/src/App.jsx` and `web/src/pages/dentist-portal/home/DashboardDebug.jsx` | 2 | Requires control-flow review to avoid changing app fallback/error behavior. |
| `no-unused-vars`, `complexity`, `eqeqeq` warnings | 1913+ | Broad cleanup could become behavioral refactor; leave for separate maintainability sprint. |
| Unused eslint-disable directive warnings | 8 | Low risk and non-blocking; removing them is safe but not necessary for error reduction. |

## Risk Notes

- The safe fixes do not change business logic or UI text.
- Remaining translation duplicate keys should be reviewed by comparing duplicate values before changing them.
- The web app still has 62 ESLint errors, so the manuscript should not claim the web maintainability issue is fully resolved.
