# Maintainability Testing Setup

This setup supports Thesis Chapter IV maintainability evaluation for SereneApps using:

- SonarQube or SonarCloud as the primary static analysis tool.
- ESLint JSON reports for backend, web, and mobile JavaScript/JSX source.
- Radon JSON reports for the CDSS Python service.

No production credentials are required for ESLint or Radon. Do not commit Sonar tokens, `.env` values, API keys, or generated secrets. Store the Sonar token only as the GitHub Actions secret `SONAR_TOKEN`.

## Scope

| Component | Source Scope | Supporting Tool Output |
|---|---|---|
| Backend | `backend/src/**/*.js` | `maintainability-results/eslint-backend.json` |
| Web application | `web/src/**/*.{js,jsx,mjs}` | `maintainability-results/eslint-web.json` |
| Mobile application | `mobile/src/**/*.{js,jsx}` | `maintainability-results/eslint-mobile.json` |
| CDSS Python service | `backend/python_service/**/*.py` excluding tests/cache | `maintainability-results/radon-cdss-*.json` |

The Sonar scan is configured in `sonar-project.properties`. The base source roots are `backend/src`, `web/src`, `mobile/src`, and `backend/python_service`, with `sonar.inclusions` narrowing the final SonarCloud scan to the thesis core modules: authentication, appointment, consultation/chat, CDSS integration, doctor/clinic/admin dashboard data flows, and patient-facing mobile appointment/CDSS flows. This keeps the private SonarCloud Free project under the organization LOC limit while preserving the evaluated thesis scope.

## Sonar Configuration

The current SonarCloud-style values in `sonar-project.properties` are:

```properties
sonar.projectKey=Dentalization_SereneApps
sonar.organization=dentalization
sonar.host.url=https://sonarcloud.io
```

Confirm these values against the Sonar project Information page before final thesis analysis. If SonarQube Cloud created different keys, copy the exact project key and organization key into `sonar-project.properties`. For SonarCloud, keep the organization and project key from SonarCloud and use `SONAR_TOKEN` as a repository secret.

The project must use one analysis method. For CI-based scans through GitHub Actions or `sonar-scanner`, disable SonarCloud Automatic Analysis from the project Administration > Analysis Method page.

The final SonarCloud scan intentionally uses `sonar.inclusions` because a full repository scan is above the private Free-plan LOC limit. If the SonarCloud organization is upgraded or the project is made eligible for a larger LOC allowance, remove or expand `sonar.inclusions` and rerun the scan to report full-repository Sonar metrics.

## Local Commands

Generate ESLint JSON reports:

```bash
npm run maintainability:eslint
```

Generate CDSS Python JSON reports. The script uses an existing Radon install when available; otherwise it creates `.maintainability-venv/` and installs pinned `radon==6.0.1` there.

```bash
npm run maintainability:radon
```

Validate that all maintainability setup files and scripts are present and that the known token value is not stored in repository files:

```bash
npm run maintainability:validate
```

Run Sonar locally if `sonar-scanner` is installed:

```bash
export SONAR_TOKEN="<use a local token, do not commit it>"
export SONAR_SCANNER_JAVA_OPTS="-Xmx4096m"
sonar-scanner -Dsonar.token="$SONAR_TOKEN"
```

Or run the pinned npm scanner without installing a global binary:

```bash
export SONAR_TOKEN="<use a local token, do not commit it>"
export SONAR_SCANNER_JAVA_OPTS="-Xmx4096m"
npx --yes @sonar/scan@4.3.6
```

For SonarQube Server local runs, add:

```bash
sonar-scanner -Dsonar.token="$SONAR_TOKEN" -Dsonar.host.url="https://your-sonarqube.example.com"
```

## GitHub Actions

The workflow is `.github/workflows/sonarqube-maintainability.yml`.

1. Add repository secret `SONAR_TOKEN`.
2. Ensure Automatic Analysis is disabled for the SonarCloud project.
3. Run the workflow manually from GitHub Actions, or trigger it on `push` / `pull_request` to `main` or `master`. The workflow sets `SONAR_SCANNER_JAVA_OPTS=-Xmx4096m` so the Java scanner has enough heap for the combined backend/web/mobile/CDSS scan.
4. Download the `maintainability-results` artifact for ESLint and Radon JSON evidence.
5. Read Sonar maintainability metrics from the SonarQube/SonarCloud project dashboard.

## Output Files

| File | Meaning |
|---|---|
| `maintainability-results/eslint-backend.json` | Raw ESLint findings for backend source |
| `maintainability-results/eslint-web.json` | Raw ESLint findings for web source |
| `maintainability-results/eslint-mobile.json` | Raw ESLint findings for mobile source |
| `maintainability-results/eslint-summary.json` | ESLint error/warning totals per JS component |
| `maintainability-results/radon-cdss-cc.json` | Raw Radon cyclomatic complexity results |
| `maintainability-results/radon-cdss-mi.json` | Raw Radon maintainability index results |
| `maintainability-results/radon-cdss-raw.json` | Raw Radon LOC/comment metrics |
| `maintainability-results/radon-cdss-summary.json` | CDSS complexity and maintainability index summary |
| `maintainability-results/sonar-measures.json` | Raw Sonar Web API response after final scan |
| `maintainability-results/sonar-summary.json` | Extracted Sonar measures for thesis copying |

## Thesis Table Template

Use SonarQube/SonarCloud for Code Smells, Technical Debt, Duplicated Code, and Maintainability Rating. Use ESLint/Radon outputs as supporting evidence.

| Komponen | Code Smells | Technical Debt | Complexity | Duplicated Code | Maintainability Rating | ESLint Errors | ESLint Warnings | Radon Avg. CC | Radon Avg. MI |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Backend | `[Sonar code_smells]` | `[Sonar sqale_index]` | `[Sonar complexity]` | `[Sonar duplicated_lines_density]` | `[Sonar sqale_rating]` | `[eslint-summary Backend errorCount]` | `[eslint-summary Backend warningCount]` | `N/A` | `N/A` |
| Web application | `[Sonar code_smells]` | `[Sonar sqale_index]` | `[Sonar complexity]` | `[Sonar duplicated_lines_density]` | `[Sonar sqale_rating]` | `[eslint-summary Web errorCount]` | `[eslint-summary Web warningCount]` | `N/A` | `N/A` |
| Mobile application | `[Sonar code_smells]` | `[Sonar sqale_index]` | `[Sonar complexity]` | `[Sonar duplicated_lines_density]` | `[Sonar sqale_rating]` | `[eslint-summary Mobile errorCount]` | `[eslint-summary Mobile warningCount]` | `N/A` | `N/A` |
| CDSS Python service | `[Sonar code_smells]` | `[Sonar sqale_index]` | `[Sonar complexity]` | `[Sonar duplicated_lines_density]` | `[Sonar sqale_rating]` | `N/A` | `N/A` | `[radon-cdss-summary averageComplexity]` | `[radon-cdss-summary averageMaintainabilityIndex]` |

Sonar metric keys useful for Chapter IV:

- `code_smells`
- `sqale_index`
- `complexity`
- `duplicated_lines_density`
- `sqale_rating`

Optional Sonar Web API query after a scan:

```bash
curl -H "Authorization: Bearer $SONAR_TOKEN" \
  "https://sonarcloud.io/api/measures/component?component=<project-key>&metricKeys=code_smells,sqale_index,complexity,duplicated_lines_density,sqale_rating"
```
