# CDSS / X-Core Technical Description

## Service Framework

The CDSS-related imaging service is implemented as a FastAPI application in `backend/python_service/main.py`. The Node.js backend calls the Python service asynchronously after an authenticated upload to `POST /v1/x-core/upload`.

## Processing Flow

1. The backend receives a multipart upload and stores files under the X-Core upload directory.
2. The backend persists imaging study metadata, then calls `POST /convert/{study_id}` on the Python service.
3. The Python service returns `status: converting` and runs conversion in a background task.
4. The frontend/client can poll `GET /status/{study_id}` until the study becomes `ready`.
5. The Python service writes derived artifacts such as thumbnails, JPEG images, VTI volumes, label maps, and `series_manifest.json`.

## Input Image Format

The repository supports:

- DICOM files with common extensions such as `.dcm`, `.DCM`, `.dcom`, `.dicom`, `.ima`.
- Extensionless or numeric files commonly exported by dental CBCT systems.
- Plain 2D image files: `.jpg`, `.jpeg`, `.png`, `.tif`, `.tiff`.

The benchmark scripts in `paper-evidence/` use synthetic PNG images and do not use real patient data.

## Model Type

Not identifiable from repository as a trained diagnostic model.

The code contains deterministic image-processing and heuristic analysis paths:

- DICOM loading and metadata extraction with `pydicom`.
- 2D image conversion with OpenCV.
- 3D CBCT preprocessing with MONAI transforms.
- VTI volume writing with VTK.
- Heuristic tooth candidate labeling using thresholding, erosion/dilation, and connected components.
- Heuristic mandibular canal candidate detection based on normalized density ranges and centerline extraction.

The code includes TODO comments for future nnU-Net style segmentation, but no trained model weights or model-loading code were identified.

## Preprocessing Steps

For 3D DICOM/CBCT series, `backend/python_service/services/vti_converter.py` performs:

- Forced DICOM reading with `pydicom`.
- Sorting by instance number and z-position.
- Rescale slope/intercept application when available.
- Unsigned raw pixel normalization fallback.
- Affine construction for DICOM axis interpretation.
- MONAI `Orientation("RAS")`.
- Optional resampling with MONAI `Spacing`, default target spacing `0.5 mm`.
- Intensity normalization with `ScaleIntensityRange(-1000, 3000) -> (0.0, 1.0)`.
- Foreground cropping with `CropForeground`.
- Field-of-view background suppression.

For 2D images, the service:

- Reads image data with OpenCV or DICOM pixel data with `pydicom`.
- Applies percentile clipping/windowing for DICOM 2D images.
- Writes JPEG derivatives for frontend viewing.

## Inference / Analysis Steps

The repository does not expose a trained diagnostic inference step. The identifiable analysis steps are:

- Series classification into `2D`, `3D`, or `SR` based on DICOM modality and file count.
- Optional heuristic tooth label generation:
  - hard-tissue threshold;
  - erosion;
  - connected-component extraction;
  - border and small-component filtering;
  - centroid-based deterministic relabeling;
  - dilation clipped to the hard-tissue mask.
- Optional heuristic mandibular canal candidate detection:
  - density threshold range;
  - inferior-volume restriction;
  - mandible envelope bounding;
  - median/mean centerline smoothing;
  - confidence derived from centerline length.

## Output Schema

Important output artifacts and API responses include:

| Output | Schema / fields |
|---|---|
| `GET /status/{study_id}` | `study_id`, `status`, `vti_ready`, `is_converting` |
| `series_manifest.json` | `series_uid`, `title`, `type`, `classification`, `modality`, `num_slices`, `has_vti`, `has_image`, `has_thumb`, `has_labels`, `num_labels`, `segmentation_method`, `segmentation_status`, `status` |
| 3D volume metadata | `dimensions`, `spacing`, `origin`, `data_range`, `file_size_bytes`, `num_voxels`, `normalized`, `pipeline` |
| Labels manifest | `segmentation_method`, `segmentation_status`, `num_labels`, `label_ids`, `voxel_counts`, `centroids`, `bounds` |
| `GET /ai-findings/{study_id}` | `study_id`, `series_uid`, `tooth_count`, `tooth_centroids`, `segmentation_status`, `bone_density`, `volume_dimensions`, `spacing`, `nerve_canal` |

## Confidence Score Format

The only identifiable confidence score in the CDSS/X-Core Python service is the mandibular canal heuristic confidence:

- numeric floating-point value;
- rounded to 3 decimals;
- capped between approximately `0.2` and `0.85`;
- derived from detected centerline length, not from a trained probabilistic clinical model.

No calibrated diagnostic confidence score for disease classification was identifiable from repository code.

## Metadata Returned

The service returns or stores:

- study and series identifiers;
- modality and classification;
- number of files/slices;
- VTI/image/thumbnail availability;
- segmentation availability and label counts;
- volume dimensions, spacing, origin, data range, and file size;
- density histogram percentages for D1-D4 categories in the `ai-findings` endpoint;
- optional nerve canal centerline metadata.

## Diagnostic Scope

The CDSS/X-Core output should be described as imaging visualization, structured extraction, screening, and triage support. It should not be described as an autonomous clinical diagnosis or clinically validated diagnostic model.

## Limitations

- Trained model architecture and weights are not identifiable from repository.
- No clinical validation dataset is included.
- Heuristic segmentation can fail on low-quality or atypical scans.
- Confidence values are heuristic and should not be interpreted as diagnostic probability.
- Performance benchmarks measure local software latency, not clinical accuracy.
