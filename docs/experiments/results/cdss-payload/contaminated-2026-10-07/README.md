# Quarantined Contaminated Dataset (2026-10-07)

## Status: CONTAMINATED / INDICATIVE ONLY

This dataset contains the outputs of the payload scaling sweep and concurrency probe executed on 2026-10-07 under relaxed preflight gate conditions. It is preserved for reference only and quarantined from clean experimental results.

### Experimental Conditions During Run:
- **Gate Thresholds Configured**:
  - Max Swap Allowed: `6,000 MB` (strict default: `500 MB`)
  - Min Available Memory: `500 MB` (strict default: `3,000 MB`)
  - AC Power Required: `false` (strict default: `true`)
  - Normal Thermal State Required: `true`
- **Measured Preflight State at Run Time**:
  - Power Source: `Battery Power` (charger unplugged)
  - Swap Used: `3,867.4 MB` (host had substantial active swap)
  - Available Memory: `2,524.8 MB`
  - Thermal State: `Normal`
- **Active User Applications Open During Run**:
  - `Antigravity IDE.app` (Electron, plugins, language server)
  - `Google Chrome.app`
  - `Claude.app`
- **Observed Distortions**:
  - $N=401$ results exhibited non-monotonic peak RSS ($2,288\text{ MB}$, below the $N=200$ value of $2,443\text{ MB}$, despite a theoretical ~5 GB footprint based on $N=25..200$ linear trend).
  - Heavy swap growth during runs (up to $+963\text{ MB}$) caused OS page thrashing and distorted wall-clock conversion times.
  - Initial run attempts prior to this dataset were cleared without archival.
