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

The Sonar scan is configured in `sonar-project.properties` and covers `backend/src`, `web/src`, `mobile/src`, and `backend/python_service`.

## Required Sonar Configuration

Before running the GitHub Action, replace these placeholders in `sonar-project.properties`:

```properties
sonar.projectKey=SERENEAPPS_PROJECT_KEY_REPLACE_ME
sonar.organization=SERENEAPPS_ORGANIZATION_REPLACE_ME
```

For SonarQube Server, also configure `SONAR_HOST_URL` as a GitHub Actions repository variable. For SonarCloud, keep the organization and project key from SonarCloud and use `SONAR_TOKEN` as a repository secret.

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
sonar-scanner -Dsonar.token="$SONAR_TOKEN"
```

For SonarQube Server local runs, add:

```bash
sonar-scanner -Dsonar.token="$SONAR_TOKEN" -Dsonar.host.url="https://your-sonarqube.example.com"
```

## GitHub Actions

The workflow is `.github/workflows/sonarqube-maintainability.yml`.

1. Add repository secret `SONAR_TOKEN`.
2. For SonarQube Server only, add repository variable `SONAR_HOST_URL`.
3. Run the workflow manually from GitHub Actions, or trigger it on `push` / `pull_request` to `main` or `master`.
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
curl -u "$SONAR_TOKEN:" \
  "$SONAR_HOST_URL/api/measures/component?component=<project-key>&metricKeys=code_smells,sqale_index,complexity,duplicated_lines_density,sqale_rating"
```
