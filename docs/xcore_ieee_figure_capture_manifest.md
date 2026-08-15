# X-Core IEEE Figure Capture Manifest

Use real, de-identified X-Core screens only. Do not use browser screenshots as a substitute for a canonical report render, and do not submit test fixtures or synthetic/patient-identifiable images as production evidence.

| File name | Paper figure | What it proves | Required capture state |
|---|---|---|---|
| `figures/xcore-architecture.png` | Fig. 1 | Three-tier architecture | Author-produced architecture diagram; label it ``Source: authors''. |
| `figures/xcore-gallery-series.png` | Fig. 2 | Study/series organization | One de-identified study with 2D and/or 3D series cards visible. |
| `figures/xcore-2d-annotation.png` | Fig. 3 | Actual 2D annotation persistence | A real radiograph with an annotation and a measurement; redact all PHI. |
| `figures/xcore-3d-mpr.png` | Fig. 4 | 3D and multi-planar review | Volume and axial/coronal/sagittal panes visible; redact PHI. |
| `figures/xcore-analysis-case-workspace.png` | Fig. 5 | Multi-radiograph case model | Two periapicals plus one panoramic; tooth labels and order visible. |
| `figures/xcore-marker-finding-linkage.png` | Fig. 6 | Canonical annotated render | One actual annotated radiograph and the matching numbered findings. |
| `figures/xcore-report-preflight-versioning.png` | Fig. 7 | Freshness and immutability | One ready/stale transition and at least two report versions/checksums. |
| `figures/xcore-versioned-pdf-page.png` | Fig. 8 | Published report output | A de-identified PDF page rendered to PNG, with its annotated main image and findings. |

## Capture rules

1. Use a synthetic or explicitly consented/de-identified educational dataset; never commit patient-identifiable radiographs.
2. Keep each screenshot at native resolution. Crop browser chrome and unrelated portal navigation where it does not support the claim.
3. Redact patient name, medical-record number, birth date, contact information, study UID, and access token values.
4. Do not alter clinical content. Permitted edits are PHI redaction, crop, and lossless scaling for the two-column IEEE layout.
5. For Fig. 6 and Fig. 8, verify that the visible image is the canonical annotated render generated from the actual radiograph, not a black placeholder, a 1x1 image, or a generic mockup.
6. Add each exported PNG under `docs/figures/` before compiling the article from the `docs/` directory, or adjust the relative paths consistently in the `.tex` source.
