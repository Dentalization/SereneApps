# CDSS Complexity Refactor Plan

Generated at: 2026-06-17.

## Evidence

Radon command:

```bash
npm run maintainability:radon
```

Output files:

- `maintainability-results/radon-cdss-cc.json`
- `maintainability-results/radon-cdss-mi.json`
- `maintainability-results/radon-cdss-raw.json`
- `maintainability-results/radon-cdss-summary.json`

## Current Radon Findings

| Function | File | Line | Complexity | Rank |
|---|---|---:|---:|---|
| `convert_study_to_vti` | `backend/python_service/services/vti_converter.py` | 1472 | 48 | F |
| `scan_dicom_series` | `backend/python_service/services/vti_converter.py` | 164 | 43 | F |

CDSS service average cyclomatic complexity: 7.75.

CDSS service average maintainability index: 17.78.

## Refactor Plan for `scan_dicom_series`

Goal: split scanning/classification responsibilities without changing returned schema.

Proposed extraction:

| New helper | Responsibility |
|---|---|
| `collect_candidate_dicom_files(study_path)` | Return candidate DICOM-like file paths and exclude known generated/binary files. |
| `read_series_header(file_path)` | Read DICOM header safely and return normalized metadata or skip reason. |
| `group_dicom_headers(headers)` | Build image series and SR series accumulators. |
| `detect_plain_2d_images(study_path)` | Detect JPEG/PNG/TIFF image series. |
| `build_series_group(series_uid, data)` | Apply `classify_series` and return current output shape. |

Recommended tests before refactor:

- extensionless DICOM file is included;
- generated VTI/JSON/JPEG derivatives are excluded from DICOM candidate list;
- SR modality is separated from image series when `include_sr=True`;
- plain PNG/JPEG is classified as `2D`;
- modality priority overrides file-count heuristic.

## Refactor Plan for `convert_study_to_vti`

Goal: split 2D, 3D, manifest, and benchmark-event responsibilities while keeping the asynchronous flow and output files unchanged.

Proposed extraction:

| New helper | Responsibility |
|---|---|
| `conversion_quality_to_spacing(quality)` | Resolve quality string to target spacing. |
| `emit_benchmark_event_pair(run_id, event_type, details)` | Centralize Python log + backend callback. |
| `prepare_series_files(series_info)` | Sort files and return `safe_uid`, sorted paths, and common metadata. |
| `process_2d_series(...)` | Generate thumbnail/image and return result dict. |
| `process_3d_series(...)` | Read volume, MONAI preprocess, FOV suppress, write VTI, optional segmentation. |
| `build_series_manifest(study_path, series_groups)` | Build and persist `series_manifest.json`. |

Recommended tests before refactor:

- 2D plain image path writes `image_{uid}.jpg` and never writes VTI;
- 3D DICOM path writes `volume_{uid}.vti` and default `volume.vti`;
- manifest status is `ready` only when expected output exists;
- `force=false` reuses existing outputs;
- benchmark events are still emitted when `run_id` is supplied;
- segmentation failure writes a failed label manifest without failing conversion.

## Why Refactor Was Not Performed Now

The two target functions are in the CDSS asynchronous conversion path. Refactoring them without broader fixture coverage could alter imaging output, benchmark timestamps, or frontend compatibility. The safer manuscript action is to report the Radon findings and include this targeted refactor plan as future maintainability work.
