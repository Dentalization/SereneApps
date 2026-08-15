"""
VTI Converter — MONAI-powered DICOM-to-VTI pipeline for dental CBCT.

Pipeline:
  1. Robust DICOM loading (pydicom force=True for non-standard headers)
  2. MONAI Transforms: Orientation(RAS) → Spacing(0.5mm iso) → ScaleIntensityRange → CropForeground
  3. VTK vtkXMLImageDataWriter with ZLib compression for .vti output

The MONAI pipeline solves:
  - Cylinder/Box Artifact  → CropForeground removes surrounding air
  - Upside-down/Mirrored   → Orientation("RAS") forces consistent orientation
  - Inconsistent Contrast  → ScaleIntensityRange normalizes ALL scanners to [0.0, 1.0]
  - Squashed Anatomy       → Spacing(0.5mm) makes isotropic voxels

Frontend receives data in [0.0, 1.0] range where:
  0.0 = Air (-1000 HU)
  ~0.25 = Soft tissue (0 HU)
  ~0.50 = Cancellous bone (1000 HU)
  1.0 = Max density (3000 HU / Metal)
"""

import os
import sys
import json
import shutil
import numpy as np
import pydicom
from pydicom.uid import ExplicitVRLittleEndian
import glob
from collections import defaultdict
import time
from typing import Optional
from datetime import datetime, timezone
import urllib.request

from services.morita_volume import discover_jm_volumes, load_jm_volume_for_viewer

def log_python_event(run_id: str, event_type: str, details: dict = None):
    if not run_id:
        return
    try:
        script_dir = os.path.dirname(os.path.abspath(__file__))
        results_dir = os.path.abspath(os.path.join(script_dir, "..", "..", "..", "scripts", "xcore-benchmark", "results", "raw"))
        os.makedirs(results_dir, exist_ok=True)
        log_file = os.path.join(results_dir, f"python-events-{run_id}.jsonl")

        safe_details = dict(details) if details else {}
        for k in ["patientName", "PatientName", "patientId", "PatientID", "dob", "DOB"]:
            safe_details.pop(k, None)

        entry = {
            "runId": run_id,
            "eventType": event_type,
            "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "details": safe_details
        }
        with open(log_file, "a") as f:
            f.write(json.dumps(entry) + "\n")
    except Exception as e:
        print(f"[X-Core Benchmark] Error writing python event log: {e}")

def notify_backend_callback(run_id: str, event_type: str, details: dict = None):
    if not run_id:
        return
    try:
        configured_base = os.environ.get("XCORE_NODE_API_BASE_URL")
        if configured_base:
            base = configured_base.rstrip("/")
        else:
            api_version = os.environ.get("API_VERSION", "v1").strip("/")
            base = f"http://127.0.0.1:4000/{api_version}"

        url = f"{base}/x-core/benchmark/callback"

        safe_details = dict(details) if details else {}
        for k in ["patientName", "PatientName", "patientId", "PatientID", "dob", "DOB"]:
            safe_details.pop(k, None)

        payload = {
            "runId": run_id,
            "eventType": event_type,
            "details": safe_details
        }

        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req) as resp:
            resp.read()
    except Exception as e:
        print(f"[X-Core Benchmark] Error sending notification callback to backend: {e}")

def _emit_progress(progress_callback, payload: dict):
    if callable(progress_callback):
        try:
            progress_callback(payload)
        except Exception as err:
            print(f"[vti_converter] Progress callback failed: {err}")


# ── Strict 2D / 3D Classification Constants ──
# Native 2D modalities: single-frame radiographs (panoramic, cephalometric, periapical, etc.)
NATIVE_2D_MODALITIES = {'DX', 'PX', 'CR', 'IO', 'RG', 'MG', 'XA'}
# Native 3D modalities: volumetric datasets (CT, CBCT, MR, etc.)
NATIVE_3D_MODALITIES = {'CT', 'MR', 'PT', 'NM', 'US'}

TOOTH_SEGMENT_THRESHOLD = 0.45
TOOTH_SEGMENT_MAX_LABELS = 32
TOOTH_SEGMENT_MIN_COMPONENT_VOXELS = 120
TOOTH_SEGMENT_EROSION_STEPS = 1
TOOTH_SEGMENT_METHOD = "heuristic_v2"
_NEIGHBOR_OFFSETS_6 = (
    (-1, 0, 0), (1, 0, 0),
    (0, -1, 0), (0, 1, 0),
    (0, 0, -1), (0, 0, 1),
)


def _link_or_copy_file(src_path: str, dest_path: str) -> bool:
    if not src_path or not dest_path or not os.path.exists(src_path):
        return False
    try:
        if os.path.lexists(dest_path):
            os.remove(dest_path)
        os.link(src_path, dest_path)
        return True
    except Exception:
        shutil.copy2(src_path, dest_path)
        return True


def _copy_default_volume_outputs(study_path: str, safe_uid: str) -> bool:
    vti_path = os.path.join(study_path, f"volume_{safe_uid}.vti")
    labels_path = os.path.join(study_path, f"labels_{safe_uid}.vti")
    labels_manifest_path = _label_manifest_path(study_path, safe_uid)
    default_vti = os.path.join(study_path, "volume.vti")
    default_labels = os.path.join(study_path, "labels.vti")
    default_labels_manifest = os.path.join(study_path, "labels.json")

    wrote_any = _link_or_copy_file(vti_path, default_vti)
    if os.path.exists(labels_path):
        wrote_any = _link_or_copy_file(labels_path, default_labels) or wrote_any
    if os.path.exists(labels_manifest_path):
        wrote_any = _link_or_copy_file(labels_manifest_path, default_labels_manifest) or wrote_any
    return wrote_any


def classify_series(num_files: int, modality: str) -> str:
    """
    Strictly classify a DICOM series as '3D' or '2D'.

    Rules (in priority order):
      1. If modality is a known 2D type (DX, PX, CR, IO, RG, MG, XA) → '2D'
         regardless of file count.
      2. If modality is a known 3D type (CT, MR, PT, NM, US) → '3D'
         regardless of file count.
      3. Fallback (unknown modality): >10 files → '3D', else → '2D'.
    """
    mod_upper = modality.strip().upper() if modality else ''

    if mod_upper in NATIVE_2D_MODALITIES:
        return '2D'
    if mod_upper in NATIVE_3D_MODALITIES:
        return '3D'
    # Unknown modality → heuristic by file count
    return '3D' if num_files > 10 else '2D'


def _find_candidate_dicom_files(study_path: str) -> list[str]:
    """Discover candidate DICOM file paths from extensions and extensionless files."""
    extensions = ['*.dcm', '*.DCM', '*.dcom', '*.DCOM', '*.dicom', '*.DICOM', '*.ima', '*.IMA']
    all_files = []
    for ext in extensions:
        all_files.extend(glob.glob(os.path.join(study_path, "**", ext), recursive=True))

    skip_extensions = (
        '.vti', '.json', '.txt', '.xml', '.jpg', '.jpeg', '.png', '.gif', '.bmp',
        '.zip', '.tar', '.gz', '.py', '.js', '.html', '.css', '.log', '.sql', '.md',
        '.dll', '.exe', '.pdb', '.db', '.dat', '.pak', '.bin', '.sys', '.ini', '.lnk',
        '.bat', '.cmd', '.cfg', '.config', '.manifest'
    )

    for root, _, files in os.walk(study_path):
        for f in files:
            if f.startswith('.'):
                continue
            fp = os.path.join(root, f)
            _, ext = os.path.splitext(f)
            if ext.lower() in skip_extensions:
                continue
            if not ext or f.isdigit():
                all_files.append(fp)

    return sorted(set(all_files))


def _parse_and_group_dicom_files(all_files: list[str]) -> tuple[dict, dict]:
    """Parse header tags and aggregate DICOM slices into normal and SR series."""
    _temp = defaultdict(lambda: {'files': [], 'modality': '', 'description': ''})
    _sr_temp = defaultdict(lambda: {'files': [], 'modality': 'SR', 'description': ''})

    for fp in all_files:
        try:
            ds = pydicom.dcmread(fp, force=True, stop_before_pixels=True)
            if not hasattr(ds, 'file_meta') or ds.file_meta is None:
                ds.file_meta = pydicom.dataset.FileMetaDataset()
            if not hasattr(ds.file_meta, 'TransferSyntaxUID') or ds.file_meta.TransferSyntaxUID is None:
                ds.file_meta.TransferSyntaxUID = ExplicitVRLittleEndian

            series_uid = str(getattr(ds, 'SeriesInstanceUID', 'unknown'))
            instance_num = int(getattr(ds, 'InstanceNumber', 0))
            modality = str(getattr(ds, 'Modality', '')).strip()

            z_pos = 0.0
            if hasattr(ds, 'ImagePositionPatient') and ds.ImagePositionPatient:
                z_pos = float(ds.ImagePositionPatient[2])

            if modality.upper() == 'SR':
                _sr_temp[series_uid]['files'].append((instance_num, z_pos, fp))
                if not _sr_temp[series_uid]['description']:
                    _sr_temp[series_uid]['description'] = str(getattr(ds, 'SeriesDescription', 'Structured Report')).strip()
                continue

            _temp[series_uid]['files'].append((instance_num, z_pos, fp))

            if not _temp[series_uid]['modality']:
                _temp[series_uid]['modality'] = modality
            if not _temp[series_uid]['description']:
                _temp[series_uid]['description'] = str(getattr(ds, 'SeriesDescription', 'Unknown Series')).strip()
        except Exception as e:
            print(f"[VTI] Skipping {fp}: {e}")

    series_groups = {}
    for series_uid, data in _temp.items():
        num_files = len(data['files'])
        modality = data['modality']
        classification = classify_series(num_files, modality)
        series_groups[series_uid] = {
            'files': data['files'],
            'modality': modality,
            'classification': classification,
            'num_files': num_files,
            'series_description': data['description'],
        }

    sr_series = {}
    for series_uid, data in _sr_temp.items():
        data['files'].sort(key=lambda item: (item[0], item[1]))
        sr_series[series_uid] = {
            'files': data['files'],
            'modality': 'SR',
            'classification': 'SR',
            'num_files': len(data['files']),
            'series_description': data['description'] or 'Structured Report',
        }

    return series_groups, sr_series


def _discover_plain_2d_series(study_path: str) -> dict:
    """Discover non-DICOM plain image files (Panorama/Ceph/Periapical photos)."""
    series_groups = {}

    # ── J. Morita raw CBCT volumes ──
    # A Morita .vol is neither DICOM nor a generic image.  Detect it before the
    # plain-image pass so its acquisition TIFF is not exposed as a false 2D
    # radiograph.
    jm_volumes = discover_jm_volumes(study_path)
    for volume in jm_volumes:
        series_uid = volume["series_uid"]
        series_groups[series_uid] = {
            'files': [(0, 0.0, volume['file_path'])],
            'modality': 'CBCT',
            'classification': '3D',
            'num_files': volume['num_slices'],
            'series_description': volume['description'],
            'source_format': 'jm_volume',
            'morita_volume': volume,
        }
        print(f"[VTI] Detected J. Morita volume: {os.path.basename(volume['file_path'])} → UID={series_uid}")

    # ── Non-DICOM Plain 2D Images (Panoramic/Ceph/Photos/etc.) ──
    pan_files = []
    for root, _, files in os.walk(study_path):
        for file in files:
            lower_file = file.lower()
            if any(lower_file.endswith(ext) for ext in ('.jpg', '.jpeg', '.tif', '.tiff', '.png')):
                if jm_volumes and lower_file in {'capture.tif', 'capture.tiff'}:
                    continue
                if not file.startswith(('thumb_', 'image_', 'labels_')):
                    pan_files.append(os.path.join(root, file))

    plain_series = {}
    added_names = set()
    for pan_file in pan_files:
        filename = os.path.basename(pan_file)
        name_without_ext = os.path.splitext(filename)[0]
        if name_without_ext.lower() in added_names:
            continue
        added_names.add(name_without_ext.lower())

        import hashlib
        series_uid = "pan_opg_" + hashlib.md5(name_without_ext.encode('utf-8')).hexdigest()

        fn_lower = filename.lower()
        if any(kw in fn_lower for kw in ('panorama', 'panoramic', 'opg', 'panoramik')):
            modality = "Panoramic"
        elif any(kw in fn_lower for kw in ('ceph', 'cephalometric', 'sefalometri', 'cephalometri')):
            modality = "Cephalometric"
        elif any(kw in fn_lower for kw in ('periapical', 'periapikal', 'pa', 'peri')):
            modality = "Intraoral Periapical"
        elif any(kw in fn_lower for kw in ('bitewing', 'bw', 'bite-wing')):
            modality = "Intraoral Bitewing"
        elif any(kw in fn_lower for kw in ('occlusal', 'oklusal', 'occ', 'occl')):
            modality = "Intraoral Occlusal"
        elif any(kw in fn_lower for kw in ('intraoral', 'io')):
            modality = "Intraoral"
        else:
            modality = "2D Image"

        plain_series[series_uid] = {
            'files': [(1, 0.0, pan_file)],
            'modality': modality,
            'classification': '2D',
            'num_files': 1,
            'series_description': f"{modality} Image ({name_without_ext})"
        }
        print(f"[VTI] Detected plain 2D series: {filename} → UID={series_uid}, Modality={modality}")

    series_groups.update(plain_series)
    return series_groups


def scan_dicom_series(study_path: str, include_sr: bool = False) -> dict:
    """
    Scan folder and group DICOM files by SeriesInstanceUID.
    Handles both standard DICOM extensions and extensionless files.
    """
    all_files = _find_candidate_dicom_files(study_path)
    print(f"[VTI] Found {len(all_files)} candidate files in {study_path}")

    series_groups, sr_series = _parse_and_group_dicom_files(all_files)
    plain_series = _discover_plain_2d_series(study_path)
    series_groups.update(plain_series)

    if include_sr:
        return series_groups, sr_series
    return series_groups


def read_dicom_volume(file_list: list) -> tuple:
    """
    Read a sorted list of DICOM files into a 3D numpy array.
    Uses pydicom with force=True for maximum compatibility with dental CBCT scanners.
    Applies RescaleSlope/Intercept for HU calibration.
    Auto-detects raw unsigned data and normalizes to pseudo-HU.
    Returns: (volume_array, spacing, origin, orientation_cosines)
    """
    slices = []
    first_ds = None
    had_rescale = False

    for fp in file_list:
        try:
            ds = pydicom.dcmread(fp, force=True)
            if not hasattr(ds, 'file_meta') or ds.file_meta is None:
                ds.file_meta = pydicom.dataset.FileMetaDataset()
            if not hasattr(ds.file_meta, 'TransferSyntaxUID') or ds.file_meta.TransferSyntaxUID is None:
                ds.file_meta.TransferSyntaxUID = ExplicitVRLittleEndian

            pixel_array = ds.pixel_array.astype(np.float32)
            slope = float(getattr(ds, 'RescaleSlope', 1.0))
            intercept = float(getattr(ds, 'RescaleIntercept', 0.0))
            if slope != 1.0 or intercept != 0.0:
                pixel_array = pixel_array * slope + intercept
                had_rescale = True

            slices.append(pixel_array)
            if first_ds is None:
                first_ds = ds
        except Exception as e:
            print(f"[VTI] Failed to read {fp}: {e}")

    if not slices or first_ds is None:
        raise ValueError("No valid DICOM slices found")

    volume = np.stack(slices)  # Shape: (Z, Y, X)

    # ═══ Raw Unsigned Detection & HU Normalization ═══
    vol_min = float(np.min(volume))
    vol_max = float(np.max(volume))

    if not had_rescale and vol_min >= 0:
        pixel_repr = int(getattr(first_ds, 'PixelRepresentation', 0))
        bits_stored = int(getattr(first_ds, 'BitsStored', 16))

        if pixel_repr == 0:
            shift = -1024.0
            volume = volume + shift
            new_min = float(np.min(volume))
            new_max = float(np.max(volume))
            print(f"[VTI] ⚠️  Raw unsigned {bits_stored}-bit data detected (no RescaleSlope/Intercept)")
            print(f"[VTI] Applied HU normalization: shift = {shift}")
            print(f"[VTI] Range: [{vol_min:.0f}, {vol_max:.0f}] → [{new_min:.0f}, {new_max:.0f}]")
        else:
            print(f"[VTI] Signed {bits_stored}-bit data (no rescale). Range: [{vol_min:.0f}, {vol_max:.0f}]")
    else:
        print(f"[VTI] Data calibrated (rescale={'yes' if had_rescale else 'no'}). Range: [{vol_min:.0f}, {vol_max:.0f}]")

    # Extract spacing
    pixel_spacing = getattr(first_ds, 'PixelSpacing', [1.0, 1.0])
    px = float(pixel_spacing[0]) if pixel_spacing else 1.0
    py = float(pixel_spacing[1]) if pixel_spacing else 1.0

    slice_thickness = float(getattr(first_ds, 'SliceThickness', 1.0))
    if slice_thickness <= 0:
        slice_thickness = 1.0

    # VTI uses (X, Y, Z) order for spacing
    spacing = (px, py, slice_thickness)

    # Get origin from ImagePositionPatient of first slice
    origin = (0.0, 0.0, 0.0)
    if hasattr(first_ds, 'ImagePositionPatient') and first_ds.ImagePositionPatient:
        origin = tuple(float(v) for v in first_ds.ImagePositionPatient)

    # Get orientation cosines for MONAI affine construction
    orientation = None
    if hasattr(first_ds, 'ImageOrientationPatient') and first_ds.ImageOrientationPatient:
        orientation = [float(v) for v in first_ds.ImageOrientationPatient]

    return volume, spacing, origin, orientation


def _slice_normal_z_sign(orientation_cosines: list = None) -> float:
    """
    Return the sign of the DICOM slice normal's patient-Z component.

    ImageOrientationPatient stores row and column direction cosines. Their cross
    product is the slice normal, which tells MONAI whether dim0 advances toward
    superior (+Z) or inferior (-Z) patient space.
    """
    if not orientation_cosines or len(orientation_cosines) < 6:
        return 1.0

    try:
        row = [float(v) for v in orientation_cosines[0:3]]
        col = [float(v) for v in orientation_cosines[3:6]]
    except (TypeError, ValueError):
        return 1.0

    normal_z = (row[0] * col[1]) - (row[1] * col[0])
    return -1.0 if normal_z < 0 else 1.0


def _crop_margin_voxels_for_spacing(spacing: tuple, physical_margin_mm: float = 12.0) -> int:
    try:
        pixel_spacing = float(spacing[0])
    except (TypeError, ValueError, IndexError):
        pixel_spacing = 1.0

    if pixel_spacing <= 0:
        pixel_spacing = 1.0

    return max(8, int(physical_margin_mm / pixel_spacing))


def suppress_fov_background(
    volume: np.ndarray,
    spacing: tuple,
    bone_threshold: float = 0.34,
    margin_mm: float = 32.0,
    z_window_mm: float = 10.0,
) -> np.ndarray:
    """
    Remove the scanner field-of-view cylinder from MONAI-normalized CBCT data.

    Dental CBCT exports often contain non-air values across the whole cylindrical
    acquisition FOV. Soft/sinus/density render modes then show the scan tube as
    anatomy. This keeps a generous per-slice elliptical ROI around hard tissue
    and zeroes low-value FOV background outside it.
    """
    if volume is None or volume.ndim != 3:
        return volume

    try:
        sx, sy, sz = (float(spacing[0]), float(spacing[1]), float(spacing[2]))
    except (TypeError, ValueError, IndexError):
        sx, sy, sz = (1.0, 1.0, 1.0)

    sx = sx if sx > 0 else 1.0
    sy = sy if sy > 0 else 1.0
    sz = sz if sz > 0 else 1.0

    nx, ny, nz = volume.shape
    bone_mask = np.isfinite(volume) & (volume >= bone_threshold)
    candidate_voxels = int(np.count_nonzero(bone_mask))
    min_candidates = max(400, int(volume.size * 0.0001))
    if candidate_voxels < min_candidates:
        print(f"[FOV] Suppression skipped: only {candidate_voxels} bone-candidate voxels")
        return volume

    margin_x = max(10, int(round(margin_mm / sx)))
    margin_y = max(10, int(round(margin_mm / sy)))
    z_window = max(2, int(round(z_window_mm / sz)))
    slice_bounds: list[tuple[int, int, int, int] | None] = []

    for z in range(nz):
        xs, ys = np.where(bone_mask[:, :, z])
        if xs.size == 0:
            slice_bounds.append(None)
            continue
        slice_bounds.append((int(xs.min()), int(xs.max()), int(ys.min()), int(ys.max())))

    cleaned = volume.copy()
    x_grid = np.arange(nx, dtype=np.float32)[:, None]
    y_grid = np.arange(ny, dtype=np.float32)[None, :]
    suppressed = 0

    for z in range(nz):
        merged_bounds = [b for b in slice_bounds[max(0, z - z_window):min(nz, z + z_window + 1)] if b]
        if not merged_bounds:
            slice_values = cleaned[:, :, z]
            suppressed += int(np.count_nonzero(slice_values > 0.02))
            slice_values[:] = 0.0
            continue

        min_x = max(0, min(b[0] for b in merged_bounds) - margin_x)
        max_x = min(nx - 1, max(b[1] for b in merged_bounds) + margin_x)
        min_y = max(0, min(b[2] for b in merged_bounds) - margin_y)
        max_y = min(ny - 1, max(b[3] for b in merged_bounds) + margin_y)

        cx = (min_x + max_x) / 2.0
        cy = (min_y + max_y) / 2.0
        rx = max((max_x - min_x) / 2.0, 1.0)
        ry = max((max_y - min_y) / 2.0, 1.0)
        outside_roi = (((x_grid - cx) ** 2) / (rx ** 2)) + (((y_grid - cy) ** 2) / (ry ** 2)) > 1.0
        slice_values = cleaned[:, :, z]
        suppressed += int(np.count_nonzero((slice_values > 0.02) & outside_roi))
        slice_values[outside_roi] = 0.0

    print(
        f"[FOV] Suppressed {suppressed:,} scan-background voxels "
        f"(bone_candidates={candidate_voxels:,}, margin={margin_mm}mm)"
    )
    return cleaned.astype(np.float32, copy=False)


def monai_preprocess(
    volume: np.ndarray,
    spacing: tuple,
    origin: tuple,
    orientation_cosines: list = None,
    target_spacing: tuple | None = (0.5, 0.5, 0.5),
) -> tuple:
    """
    MONAI preprocessing pipeline for dental CBCT volumes.

    Pipeline:
      1. Build diagonal affine matrix (dim0→Z, dim1→Y, dim2→X)
      2. Orientation("RAS") — reorder axes to Right-Anterior-Superior
      3. Spacing(target) — resample to requested voxel quality, or preserve native spacing
      4. ScaleIntensityRange(-1000→3000 mapped to 0.0→1.0) — universal normalizer
      5. CropForeground(threshold=0.05, adaptive physical margin) — preserves sinus air/soft tissue

    Input:  numpy (Z, Y, X) in Hounsfield Units
    Output: numpy (X, Y, Z) in [0.0, 1.0] float32, with requested/native spacing

    CRITICAL: The affine MUST correctly tell MONAI which numpy axis is which
    patient axis, so Orientation("RAS") can reorder them properly.
    """
    import torch
    from monai.transforms import (
        Orientation,
        Spacing,
        ScaleIntensityRange,
        CropForeground,
    )
    from monai.data import MetaTensor

    print(f"[MONAI] Input volume: shape={volume.shape}, range=[{volume.min():.0f}, {volume.max():.0f}]")

    # ── Step 1: Build affine matrix ──
    # Volume from pydicom is (Z, Y, X). We need affine to map voxel → patient mm.
    # Always use simple diagonal affine — reliable for standard axial dental CBCT.
    #
    # Affine columns: col0=dim0(Z), col1=dim1(Y), col2=dim2(X), col3=origin
    #   Row 0 (X/R world): only dim2 contributes → affine[0,2] = sx
    #   Row 1 (Y/A world): only dim1 contributes → affine[1,1] = sy
    #   Row 2 (Z/S world): only dim0 contributes → affine[2,0] = sz
    #
    # nibabel aff2axcodes on this → ('S', 'A', 'R') = dim0→S, dim1→A, dim2→R
    # MONAI Orientation("RAS") will reorder (S,A,R) → (R,A,S) = (X,Y,Z) ✓

    sx, sy, sz = spacing  # sx=PixelSpacing[0], sy=PixelSpacing[1], sz=SliceThickness

    z_sign = _slice_normal_z_sign(orientation_cosines)

    affine = np.zeros((4, 4), dtype=np.float64)
    affine[0, 2] = sx    # dim2 (X in volume) → X-world (Right)
    affine[1, 1] = sy    # dim1 (Y in volume) → Y-world (Anterior)
    affine[2, 0] = z_sign * sz  # dim0 (Z in volume) → patient Z, corrected for scanner slice normal
    affine[3, 3] = 1.0
    affine[:3, 3] = [origin[0], origin[1], origin[2]]

    print(f"[MONAI] Affine: dim0→Z(sz={z_sign * sz}, z_sign={z_sign}), dim1→Y(sy={sy}), dim2→X(sx={sx})")

    # ── Step 2: Convert to MONAI MetaTensor ──
    tensor = torch.from_numpy(volume.copy()).unsqueeze(0).float()  # (1, Z, Y, X)
    meta_tensor = MetaTensor(tensor, affine=torch.from_numpy(affine).float())
    print(f"[MONAI] MetaTensor shape: {meta_tensor.shape}")

    # ── Step 3: Orientation("RAS") — Reorder (S,A,R) → (R,A,S) = (X,Y,Z) ──
    try:
        orient_transform = Orientation(axcodes="RAS")
        meta_tensor = orient_transform(meta_tensor)
        print(f"[MONAI] After Orientation(RAS): shape={meta_tensor.shape}")
    except Exception as e:
        print(f"[MONAI] ⚠️  Orientation failed (using original): {e}")

    # ── Step 4: Spacing — Resample, unless native spacing was requested ──
    if target_spacing is not None:
        try:
            spacing_transform = Spacing(pixdim=target_spacing, mode="bilinear")
            meta_tensor = spacing_transform(meta_tensor)
            print(f"[MONAI] After Spacing{target_spacing}: shape={meta_tensor.shape}")
        except Exception as e:
            print(f"[MONAI] ⚠️  Spacing failed (using original): {e}")
    else:
        print("[MONAI] Native spacing preserved — no resampling")

    # ── Step 5: ScaleIntensityRange — Normalize HU → [0.0, 1.0] ──
    try:
        scale_transform = ScaleIntensityRange(
            a_min=-1000.0, a_max=3000.0,
            b_min=0.0, b_max=1.0,
            clip=True
        )
        meta_tensor = scale_transform(meta_tensor)
        print(f"[MONAI] After ScaleIntensity: range=[{meta_tensor.min():.4f}, {meta_tensor.max():.4f}]")
    except Exception as e:
        print(f"[MONAI] ⚠️  ScaleIntensity failed (using original): {e}")

    # ── Step 6: CropForeground — Remove surrounding air/cylinder ──
    try:
        pre_crop_tensor = meta_tensor.clone()
        pre_crop_shape = meta_tensor.shape
        crop_spacing = target_spacing if target_spacing is not None else spacing
        margin_voxels = _crop_margin_voxels_for_spacing(crop_spacing)
        crop_threshold = 0.05
        print(
            f"[MONAI] CropForeground: threshold={crop_threshold}, "
            f"margin={margin_voxels} voxels (12.0mm physical)"
        )
        try:
            crop_transform = CropForeground(
                select_fn=lambda x: x > crop_threshold,
                margin=margin_voxels,
                allow_smaller=True,
            )
        except TypeError:
            crop_transform = CropForeground(
                select_fn=lambda x: x > crop_threshold,
                margin=margin_voxels,
            )
        meta_tensor = crop_transform(meta_tensor)
        print(f"[MONAI] After CropForeground: {pre_crop_shape} → {meta_tensor.shape}")

        spatial_shape = tuple(int(value) for value in meta_tensor.shape[1:])
        if min(spatial_shape) < 64:
            print(f"[MONAI] ⚠️  Crop too aggressive ({meta_tensor.shape}) — reverting to pre-crop volume")
            meta_tensor = pre_crop_tensor
    except Exception as e:
        print(f"[MONAI] ⚠️  CropForeground skipped: {e}")

    # ── Step 7: Extract final numpy array ──
    # After Orientation("RAS"): axes are (R, A, S) = (X, Y, Z)
    # This is exactly what write_vti_vtk expects: shape (nx, ny, nz)
    result = meta_tensor.squeeze(0).detach().cpu().numpy().astype(np.float32)

    final_spacing = tuple(float(value) for value in (target_spacing if target_spacing is not None else spacing))

    # Get updated origin from MONAI affine
    if hasattr(meta_tensor, 'affine') and meta_tensor.affine is not None:
        new_affine = meta_tensor.affine.cpu().numpy()
        new_origin = (float(new_affine[0, 3]), float(new_affine[1, 3]), float(new_affine[2, 3]))
    else:
        new_origin = origin

    print(f"[MONAI] Final volume: shape={result.shape}, range=[{result.min():.4f}, {result.max():.4f}]")
    print(f"[MONAI] Final spacing: {final_spacing}, origin: {new_origin}")

    return result, final_spacing, new_origin


def prepare_volume_for_vti(series_info: dict, sorted_files: list[str], target_spacing: tuple | None) -> tuple:
    """Prepare either a DICOM or J. Morita raw volume for VTI output."""
    if series_info.get('source_format') == 'jm_volume':
        processed, spacing, origin = load_jm_volume_for_viewer(
            series_info['morita_volume'], requested_spacing=target_spacing,
        )
        print(f"[VTI] J. Morita volume prepared: shape={processed.shape}, spacing={spacing}")
        return processed, spacing, origin

    volume, spacing, origin, orientation = read_dicom_volume(sorted_files)
    print(f"[VTI] Raw volume: shape={volume.shape}, dtype={volume.dtype}")
    try:
        processed, new_spacing, new_origin = monai_preprocess(
            volume,
            spacing,
            origin,
            orientation,
            target_spacing=target_spacing,
        )
        print(f"[VTI] MONAI pipeline complete: {volume.shape} → {processed.shape}")
        return processed, new_spacing, new_origin
    except Exception as monai_err:
        # Preserve the established fallback for non-standard DICOM payloads.
        print(f"[VTI] ⚠️  MONAI pipeline failed: {monai_err}")
        print("[VTI] Falling back to basic normalization...")
        import traceback
        traceback.print_exc()

        vol_min = float(np.min(volume))
        vol_max = float(np.max(volume))
        a_min = max(vol_min, -1000.0)
        a_max = min(vol_max, 3000.0)
        if a_max > a_min:
            processed = np.clip(volume, a_min, a_max)
            processed = ((processed - a_min) / (a_max - a_min)).astype(np.float32)
        else:
            processed = np.zeros_like(volume, dtype=np.float32)

        processed = np.ascontiguousarray(np.transpose(processed, (2, 1, 0)))
        print(f"[VTI] Fallback normalization: [{vol_min:.0f},{vol_max:.0f}] → [0.0, 1.0]")
        return processed, spacing, origin


def _binary_erode(mask: np.ndarray, iterations: int = 1) -> np.ndarray:
    """
    Lightweight 3D erosion using 6-connectivity.

    This helps break thin bridges between teeth and adjacent jaw bone before the
    coarse connected-component pass. It is intentionally dependency-free so the
    optional segmentation step does not require scipy/skimage.
    """
    eroded = mask.astype(bool, copy=True)

    for _ in range(max(0, iterations)):
        if not eroded.any() or min(eroded.shape) < 3:
            break

        core = eroded[1:-1, 1:-1, 1:-1].copy()
        core &= eroded[:-2, 1:-1, 1:-1]
        core &= eroded[2:, 1:-1, 1:-1]
        core &= eroded[1:-1, :-2, 1:-1]
        core &= eroded[1:-1, 2:, 1:-1]
        core &= eroded[1:-1, 1:-1, :-2]
        core &= eroded[1:-1, 1:-1, 2:]

        next_mask = np.zeros_like(eroded, dtype=bool)
        next_mask[1:-1, 1:-1, 1:-1] = core
        eroded = next_mask

    return eroded


def _binary_dilate(mask: np.ndarray, iterations: int = 1, clip_mask: np.ndarray = None) -> np.ndarray:
    """Lightweight 3D dilation using one-voxel 6-connectivity."""
    dilated = mask.astype(bool, copy=True)

    for _ in range(max(0, iterations)):
        if not dilated.any():
            break

        expanded = dilated.copy()
        expanded[1:, :, :] |= dilated[:-1, :, :]
        expanded[:-1, :, :] |= dilated[1:, :, :]
        expanded[:, 1:, :] |= dilated[:, :-1, :]
        expanded[:, :-1, :] |= dilated[:, 1:, :]
        expanded[:, :, 1:] |= dilated[:, :, :-1]
        expanded[:, :, :-1] |= dilated[:, :, 1:]

        if clip_mask is not None:
            expanded &= clip_mask.astype(bool, copy=False)
        dilated = expanded

    return dilated


def _component_metadata(xs: np.ndarray, ys: np.ndarray, zs: np.ndarray, shape: tuple) -> dict:
    min_x, max_x = int(xs.min()), int(xs.max())
    min_y, max_y = int(ys.min()), int(ys.max())
    min_z, max_z = int(zs.min()), int(zs.max())

    return {
        "voxels": (xs, ys, zs),
        "size": int(xs.size),
        "centroid": [
            float(xs.mean()),
            float(ys.mean()),
            float(zs.mean()),
        ],
        "bounds": [
            [min_x, max_x],
            [min_y, max_y],
            [min_z, max_z],
        ],
        "touches_border": (
            min_x == 0 or min_y == 0 or min_z == 0
            or max_x == shape[0] - 1
            or max_y == shape[1] - 1
            or max_z == shape[2] - 1
        ),
    }


def _extract_connected_components(mask: np.ndarray) -> list[dict]:
    """
    Extract 6-connected 3D components with deterministic scan-order seeds.

    MONAI's connected-component helpers in this environment require skimage,
    which is not installed in the Python service venv. This dependency-light
    fallback keeps the heuristic path predictable and leaves a clear insertion
    point for a future nnU-Net instance model.
    """
    working = mask.astype(bool, copy=True)
    components = []
    shape_x, shape_y, shape_z = working.shape
    flat = working.reshape(-1)

    while True:
        candidates = np.flatnonzero(flat)
        if candidates.size == 0:
            break

        start = np.unravel_index(int(candidates[0]), working.shape)
        stack = [start]
        working[start] = False
        xs = []
        ys = []
        zs = []

        while stack:
            x, y, z = stack.pop()
            xs.append(x)
            ys.append(y)
            zs.append(z)

            for dx, dy, dz in _NEIGHBOR_OFFSETS_6:
                nx = x + dx
                ny = y + dy
                nz = z + dz
                if nx < 0 or ny < 0 or nz < 0:
                    continue
                if nx >= shape_x or ny >= shape_y or nz >= shape_z:
                    continue
                if not working[nx, ny, nz]:
                    continue
                working[nx, ny, nz] = False
                stack.append((nx, ny, nz))

        components.append(_component_metadata(
            np.asarray(xs, dtype=np.int32),
            np.asarray(ys, dtype=np.int32),
            np.asarray(zs, dtype=np.int32),
            working.shape,
        ))

    return components


def _scipy_components_to_list(labeled_array: np.ndarray, num_features: int, shape: tuple) -> list[dict]:
    components = []
    for label_id in range(1, int(num_features) + 1):
        xs, ys, zs = np.where(labeled_array == label_id)
        if xs.size == 0:
            continue
        components.append(_component_metadata(
            xs.astype(np.int32),
            ys.astype(np.int32),
            zs.astype(np.int32),
            shape,
        ))
    return components


def _empty_segmentation_manifest(status: str = "missing") -> dict:
    return {
        "segmentation_method": TOOTH_SEGMENT_METHOD,
        "segmentation_status": status,
        "num_labels": 0,
        "label_ids": [],
        "voxel_counts": {},
        "centroids": {},
        "bounds": {},
    }


def _build_label_manifest(label_volume: np.ndarray, status: str = "ready") -> dict:
    label_ids = [
        int(label_id)
        for label_id in np.unique(label_volume)
        if int(label_id) > 0
    ]

    manifest = {
        "segmentation_method": TOOTH_SEGMENT_METHOD,
        "segmentation_status": status,
        "num_labels": len(label_ids),
        "label_ids": label_ids,
        "voxel_counts": {},
        "centroids": {},
        "bounds": {},
    }

    for label_id in label_ids:
        xs, ys, zs = np.where(label_volume == label_id)
        metadata = _component_metadata(
            xs.astype(np.int32),
            ys.astype(np.int32),
            zs.astype(np.int32),
            label_volume.shape,
        )
        key = str(label_id)
        manifest["voxel_counts"][key] = metadata["size"]
        manifest["centroids"][key] = metadata["centroid"]
        manifest["bounds"][key] = metadata["bounds"]

    return manifest


def _component_regrows_to_boundary(component: dict, shape: tuple, clip_mask: np.ndarray) -> bool:
    seed_component = np.zeros(shape, dtype=bool)
    xs, ys, zs = component["voxels"]
    seed_component[xs, ys, zs] = True
    grown_component = _binary_dilate(seed_component, iterations=1, clip_mask=clip_mask)
    return (
        grown_component[0, :, :].any()
        or grown_component[-1, :, :].any()
        or grown_component[:, 0, :].any()
        or grown_component[:, -1, :].any()
        or grown_component[:, :, 0].any()
        or grown_component[:, :, -1].any()
    )


def _build_heuristic_tooth_labels(volume: np.ndarray) -> tuple[Optional[np.ndarray], dict]:
    """
    Deterministic threshold-based tooth candidate labels.

    Fixed sequence: threshold → one 6-connected erosion → 6-connected labeling
    → border/small-component rejection → largest 32 → centroid renumbering →
    one 6-connected regrowth clipped to the original threshold mask.
    """
    hard_tissue_mask = volume > TOOTH_SEGMENT_THRESHOLD
    if not hard_tissue_mask.any():
        return None, _empty_segmentation_manifest()

    seed_mask = _binary_erode(hard_tissue_mask, TOOTH_SEGMENT_EROSION_STEPS)
    if not seed_mask.any():
        return None, _empty_segmentation_manifest()

    try:
        from scipy import ndimage
        labeled_array, num_features = ndimage.label(seed_mask)
        components = _scipy_components_to_list(labeled_array, num_features, volume.shape)
    except Exception:
        components = _extract_connected_components(seed_mask)
    filtered = [
        component
        for component in components
        if component["size"] >= TOOTH_SEGMENT_MIN_COMPONENT_VOXELS
        and not component["touches_border"]
        and not _component_regrows_to_boundary(component, volume.shape, hard_tissue_mask)
    ]

    if not filtered:
        return None, _empty_segmentation_manifest()

    largest = sorted(filtered, key=lambda component: component["size"], reverse=True)[:TOOTH_SEGMENT_MAX_LABELS]
    ordered = sorted(
        largest,
        key=lambda component: (
            component["centroid"][0],
            component["centroid"][1],
            component["centroid"][2],
        ),
    )

    label_volume = np.zeros(volume.shape, dtype=np.uint16)
    next_label_id = 1
    for component in ordered:
        seed_component = np.zeros(volume.shape, dtype=bool)
        xs, ys, zs = component["voxels"]
        seed_component[xs, ys, zs] = True

        grown_component = _binary_dilate(seed_component, iterations=1, clip_mask=hard_tissue_mask)
        grown_component &= label_volume == 0
        if not grown_component.any():
            continue

        label_volume[grown_component] = next_label_id
        next_label_id += 1

    if int(label_volume.max()) == 0:
        return None, _empty_segmentation_manifest()

    return label_volume, _build_label_manifest(label_volume)


def _label_manifest_path(study_path: str, safe_uid: str) -> str:
    return os.path.join(study_path, f"labels_{safe_uid}.json")


def write_label_manifest(study_path: str, safe_uid: str, manifest: dict) -> str:
    manifest_path = _label_manifest_path(study_path, safe_uid)
    with open(manifest_path, "w") as manifest_file:
        json.dump(manifest, manifest_file, indent=2)
    print(f"[SEG] Written manifest: {manifest_path}")
    return manifest_path


def read_label_manifest(study_path: str, safe_uid: str) -> Optional[dict]:
    manifest_path = _label_manifest_path(study_path, safe_uid)
    if not os.path.exists(manifest_path):
        return None

    try:
        with open(manifest_path, "r") as manifest_file:
            return json.load(manifest_file)
    except Exception as exc:
        print(f"[SEG] Warning: failed to read manifest {manifest_path}: {exc}")
        return None


def get_segmentation_metadata(study_path: str, safe_uid: str) -> dict:
    labels_path = os.path.join(study_path, f"labels_{safe_uid}.vti")
    manifest = read_label_manifest(study_path, safe_uid)
    labels_exist = os.path.exists(labels_path)

    if labels_exist:
        return {
            "has_labels": True,
            "num_labels": int(manifest.get("num_labels", 0)) if manifest else 0,
            "segmentation_method": manifest.get("segmentation_method") if manifest else None,
            "segmentation_status": "ready",
        }

    if manifest:
        return {
            "has_labels": False,
            "num_labels": int(manifest.get("num_labels", 0) or 0),
            "segmentation_method": manifest.get("segmentation_method"),
            "segmentation_status": manifest.get("segmentation_status") or "missing",
        }

    return {
        "has_labels": False,
        "num_labels": 0,
        "segmentation_method": None,
        "segmentation_status": "missing",
    }


def write_vti_vtk(volume: np.ndarray, spacing: tuple, origin: tuple, output_path: str) -> dict:
    """
    Write a 3D numpy volume to VTI using VTK's vtkXMLImageDataWriter with ZLib compression.

    CRITICAL: Input volume must be in (X, Y, Z) axis order:
      - After MONAI RAS: shape = (R, A, S) = (X, Y, Z) ✓
      - Fallback mode: must transpose (Z, Y, X) → (X, Y, Z) before calling

    VTK convention:
      - SetDimensions(nx, ny, nz) — nx=X, ny=Y, nz=Z
      - Data stored as data[x + nx*y + nx*ny*z] — X varies fastest
      - numpy.flatten('F') on (nx, ny, nz) array → dim0(X) varies fastest ✓

    Args:
        volume: numpy float32 array, shape (nx, ny, nz) — X,Y,Z order
        spacing: (sx, sy, sz) in mm — X,Y,Z order
        origin: (ox, oy, oz) in mm
        output_path: path to write .vti file
    """
    import vtkmodules.vtkIOXML as vtkIOXML
    import vtkmodules.vtkCommonDataModel as vtkDataModel
    import vtkmodules.vtkCommonCore as vtkCore
    from vtkmodules.util.numpy_support import numpy_to_vtk

    nx, ny, nz = volume.shape

    # Create VTK ImageData
    image_data = vtkDataModel.vtkImageData()
    image_data.SetDimensions(nx, ny, nz)
    image_data.SetSpacing(spacing[0], spacing[1], spacing[2])
    image_data.SetOrigin(origin[0], origin[1], origin[2])

    # Convert numpy to VTK array
    # Fortran-order flatten: dim0 (X) varies fastest — matches VTK storage convention
    flat_data = volume.flatten(order='F').astype(np.float32)
    vtk_array = numpy_to_vtk(flat_data, deep=True)
    vtk_array.SetName("Scalars")
    vtk_array.SetNumberOfComponents(1)

    image_data.GetPointData().SetScalars(vtk_array)

    # Write with ZLib compression
    writer = vtkIOXML.vtkXMLImageDataWriter()
    writer.SetFileName(output_path)
    writer.SetInputData(image_data)
    writer.SetCompressorTypeToZLib()
    writer.SetDataModeToAppended()
    writer.SetEncodeAppendedData(True)  # Base64 encode for VTK.js compatibility
    writer.Write()

    file_size = os.path.getsize(output_path)
    file_size_mb = file_size / (1024 * 1024)
    num_voxels = nx * ny * nz
    raw_size_mb = num_voxels * 4 / (1024 * 1024)  # float32 = 4 bytes

    data_min = float(np.min(volume))
    data_max = float(np.max(volume))

    print(f"[VTI] Written: {output_path}")
    print(f"[VTI] Volume: {nx}x{ny}x{nz} (VTK XYZ) = {num_voxels:,} voxels")
    print(f"[VTI] Spacing: {spacing}")
    print(f"[VTI] Data range: [{data_min:.4f}, {data_max:.4f}]")
    print(f"[VTI] Raw: {raw_size_mb:.1f}MB → Compressed: {file_size_mb:.1f}MB ({file_size_mb/raw_size_mb*100:.1f}%)")

    return {
        "dimensions": [nx, ny, nz],
        "spacing": list(spacing),
        "origin": list(origin),
        "data_range": [data_min, data_max],
        "file_size_bytes": file_size,
        "num_voxels": num_voxels,
        "normalized": True,
        "pipeline": "MONAI"
    }


def write_label_vti_vtk(label_volume: np.ndarray, spacing: tuple, origin: tuple, output_path: str) -> dict:
    """
    Write an integer label map VTI aligned to the processed MONAI volume grid.
    """
    import vtkmodules.vtkIOXML as vtkIOXML
    import vtkmodules.vtkCommonDataModel as vtkDataModel
    from vtkmodules.util.numpy_support import numpy_to_vtk

    nx, ny, nz = label_volume.shape

    image_data = vtkDataModel.vtkImageData()
    image_data.SetDimensions(nx, ny, nz)
    image_data.SetSpacing(spacing[0], spacing[1], spacing[2])
    image_data.SetOrigin(origin[0], origin[1], origin[2])

    flat_data = label_volume.flatten(order='F').astype(np.uint16)
    vtk_array = numpy_to_vtk(flat_data, deep=True)
    vtk_array.SetName("Labels")
    vtk_array.SetNumberOfComponents(1)
    image_data.GetPointData().SetScalars(vtk_array)

    writer = vtkIOXML.vtkXMLImageDataWriter()
    writer.SetFileName(output_path)
    writer.SetInputData(image_data)
    writer.SetCompressorTypeToZLib()
    writer.SetDataModeToAppended()
    writer.SetEncodeAppendedData(True)
    writer.Write()

    file_size = os.path.getsize(output_path)
    label_count = int(label_volume.max()) if label_volume.size else 0

    print(f"[SEG] Written labels: {output_path} | labels={label_count} | size={file_size / 1048576:.1f}MB")

    return {
        "path": output_path,
        "dimensions": [nx, ny, nz],
        "spacing": list(spacing),
        "origin": list(origin),
        "file_size_bytes": file_size,
        "num_labels": label_count,
    }


def run_tooth_segmentation(
    volume: np.ndarray,
    spacing: tuple,
    study_path: str,
    safe_uid: str,
    origin: tuple = (0.0, 0.0, 0.0),
    strategy: str = "heuristic",
) -> Optional[dict]:
    """
    Build a coarse threshold-based tooth label map from the MONAI-normalized volume.

    TODO(nnU-Net): replace the threshold/erosion seed mask with model logits and
    keep the same `labels_{safe_uid}.vti` output contract for the frontend.
    """
    if strategy != "heuristic":
        raise ValueError(f"Unsupported tooth segmentation strategy: {strategy}")

    labels_path = os.path.join(study_path, f"labels_{safe_uid}.vti")
    label_volume, manifest = _build_heuristic_tooth_labels(volume)

    if label_volume is None:
        if os.path.exists(labels_path):
            os.remove(labels_path)
        write_label_manifest(study_path, safe_uid, manifest)
        print(f"[SEG] {TOOTH_SEGMENT_METHOD}: no tooth-like clusters found for {safe_uid}")
        return None

    label_ids = manifest["label_ids"]
    component_sizes = [manifest["voxel_counts"][str(label_id)] for label_id in label_ids]
    print(
        f"[SEG] {TOOTH_SEGMENT_METHOD}: Threshold>{TOOTH_SEGMENT_THRESHOLD:.2f} → {len(component_sizes)} clusters "
        f"({', '.join(str(size) for size in component_sizes[:8])}{'...' if len(component_sizes) > 8 else ''})"
    )
    info = write_label_vti_vtk(label_volume, spacing, origin, labels_path)
    write_label_manifest(study_path, safe_uid, manifest)
    info.update({
        "segmentation_method": manifest["segmentation_method"],
        "segmentation_status": manifest["segmentation_status"],
        "label_ids": manifest["label_ids"],
        "voxel_counts": manifest["voxel_counts"],
        "centroids": manifest["centroids"],
        "bounds": manifest["bounds"],
    })
    return info


def detect_mandibular_canal(volume: np.ndarray, spacing: tuple, origin: tuple = (0.0, 0.0, 0.0)) -> Optional[dict]:
    """
    Heuristic inferior alveolar canal candidate detection.

    This is intentionally conservative and dependency-light. It looks for a
    low-density tubular corridor in the inferior half of the MONAI-normalized
    CBCT volume and returns a smoothed centerline in world-space millimeters.

    TODO(nnU-Net): replace this heuristic with a trained mandibular canal model
    while preserving the JSON contract consumed by the frontend.
    """
    if volume is None or volume.size == 0 or volume.ndim != 3:
        return None

    sx, sy, sz = (tuple(spacing) + (1.0, 1.0, 1.0))[:3] if isinstance(spacing, tuple) else (1.0, 1.0, 1.0)
    ox, oy, oz = (tuple(origin) + (0.0, 0.0, 0.0))[:3] if isinstance(origin, tuple) else (0.0, 0.0, 0.0)
    nx, ny, nz = volume.shape

    canal_mask = (volume > 0.15) & (volume < 0.23)

    # MONAI output axes are X,Y,Z in RAS space; mandibular canal sits in the
    # inferior part of the volume, so ignore the superior half by Z index.
    superior_cut = max(1, int(nz * 0.58))
    canal_mask[:, :, superior_cut:] = False

    # Bound the search to the hard-tissue mandible envelope to avoid air pockets.
    hard_tissue = volume > 0.42
    inferior_hard = hard_tissue[:, :, :superior_cut]
    if inferior_hard.any():
        hx, hy, hz = np.where(inferior_hard)
        margin_vox = max(4, int(round(8.0 / max(float(sx), 0.1))))
        x0, x1 = max(0, int(hx.min()) - margin_vox), min(nx - 1, int(hx.max()) + margin_vox)
        y0, y1 = max(0, int(hy.min()) - margin_vox), min(ny - 1, int(hy.max()) + margin_vox)
        z0, z1 = max(0, int(hz.min()) - margin_vox), min(superior_cut - 1, int(hz.max()) + margin_vox)
        bounded = np.zeros_like(canal_mask, dtype=bool)
        bounded[x0:x1 + 1, y0:y1 + 1, z0:z1 + 1] = True
        canal_mask &= bounded

    if int(np.count_nonzero(canal_mask)) < 20:
        return None

    raw_points = []
    min_voxels_per_sample = 3
    for x_idx in range(nx):
        ys, zs = np.where(canal_mask[x_idx, :, :])
        if ys.size < min_voxels_per_sample:
            continue
        raw_points.append([
            float(x_idx),
            float(np.median(ys)),
            float(np.median(zs)),
        ])

    if len(raw_points) < 6:
        return None

    raw = np.asarray(raw_points, dtype=np.float32)

    # Smooth centerline with a small moving median/mean window and downsample to
    # keep payloads small.
    smoothed = []
    for idx in range(raw.shape[0]):
        lo = max(0, idx - 2)
        hi = min(raw.shape[0], idx + 3)
        smoothed.append(np.mean(raw[lo:hi], axis=0))
    smoothed = np.asarray(smoothed, dtype=np.float32)

    max_points = 96
    if smoothed.shape[0] > max_points:
        sample_idx = np.linspace(0, smoothed.shape[0] - 1, max_points).astype(np.int32)
        smoothed = smoothed[sample_idx]

    centerline = [
        [
            round(ox + float(point[0]) * float(sx), 3),
            round(oy + float(point[1]) * float(sy), 3),
            round(oz + float(point[2]) * float(sz), 3),
        ]
        for point in smoothed
    ]

    confidence = min(0.85, max(0.2, len(centerline) / 90.0))
    return {
        "centerline": centerline,
        "radius_mm": 1.2,
        "confidence": round(float(confidence), 3),
    }


def generate_2d_image(file_list: list, output_path: str) -> dict:
    """
    Convert a 2D DICOM series (1-10 slices) or plain image (JPEG/TIFF/PNG) to a high-quality JPEG.
    Used for Panoramic, Cephalometric, and other 2D imaging.
    
    Returns: dict with image info
    """
    import cv2
    
    try:
        input_path = file_list[0]
        ext = os.path.splitext(input_path.lower())[1]
        
        # Plain image support
        if ext in ('.jpg', '.jpeg', '.png', '.tif', '.tiff', '.bmp'):
            pixel_array = cv2.imread(input_path, cv2.IMREAD_GRAYSCALE)
            if pixel_array is None:
                raise ValueError(f"Could not load image: {input_path}")
            cv2.imwrite(output_path, pixel_array, [int(cv2.IMWRITE_JPEG_QUALITY), 95])
            
            rows, cols = pixel_array.shape[:2]
            file_size = os.path.getsize(output_path)
            print(f"[2D] Generated from plain image: {output_path} ({cols}x{rows}, {file_size/1024:.1f}KB)")
            
            return {
                "status": "success",
                "path": output_path,
                "dimensions": [cols, rows],
                "file_size_bytes": file_size
            }
            
        import pydicom
        from pydicom.uid import ExplicitVRLittleEndian
        ds = pydicom.dcmread(input_path, force=True)
        if not hasattr(ds, 'file_meta') or ds.file_meta is None:
            ds.file_meta = pydicom.dataset.FileMetaDataset()
        if not hasattr(ds.file_meta, 'TransferSyntaxUID') or ds.file_meta.TransferSyntaxUID is None:
            ds.file_meta.TransferSyntaxUID = ExplicitVRLittleEndian
        
        pixel_array = ds.pixel_array.astype(np.float32)
        
        # Apply RescaleSlope/Intercept
        slope = float(getattr(ds, 'RescaleSlope', 1.0))
        intercept = float(getattr(ds, 'RescaleIntercept', 0.0))
        if slope != 1.0 or intercept != 0.0:
            pixel_array = pixel_array * slope + intercept
        
        # Auto-window using percentile clipping
        p1 = np.percentile(pixel_array, 1)
        p99 = np.percentile(pixel_array, 99)
        
        pixel_array = np.clip(pixel_array, p1, p99)
        if p99 > p1:
            pixel_array = ((pixel_array - p1) / (p99 - p1) * 255.0).astype(np.uint8)
        else:
            pixel_array = np.full_like(pixel_array, 127, dtype=np.uint8)
        
        # Write JPEG
        cv2.imwrite(output_path, pixel_array, [int(cv2.IMWRITE_JPEG_QUALITY), 95])
        
        rows, cols = pixel_array.shape[:2]
        file_size = os.path.getsize(output_path)
        
        print(f"[2D] Generated: {output_path} ({cols}x{rows}, {file_size/1024:.1f}KB)")
        
        return {
            "status": "success",
            "path": output_path,
            "dimensions": [cols, rows],
            "file_size_bytes": file_size
        }
    except Exception as e:
        print(f"[2D] FAILED to generate image: {e}")
        return {"status": "error", "error": str(e)}


def generate_thumbnail(file_list: list, output_path: str, target_index: int = -1) -> bool:
    """
    Generate a 256x256 JPEG thumbnail from the middle slice of a series or a plain image.
    Returns True on success.
    """
    import cv2
    
    try:
        if target_index < 0:
            target_index = len(file_list) // 2  # Middle slice = best thumbnail
        target_index = min(target_index, len(file_list) - 1)
        
        input_path = file_list[target_index]
        ext = os.path.splitext(input_path.lower())[1]
        
        # Plain image support
        if ext in ('.jpg', '.jpeg', '.png', '.tif', '.tiff', '.bmp'):
            pixel_array = cv2.imread(input_path, cv2.IMREAD_GRAYSCALE)
            if pixel_array is None:
                raise ValueError(f"Could not load image: {input_path}")
            thumb = cv2.resize(pixel_array, (256, 256), interpolation=cv2.INTER_AREA)
            cv2.imwrite(output_path, thumb, [int(cv2.IMWRITE_JPEG_QUALITY), 85])
            print(f"[THUMB] Generated from plain image: {output_path}")
            return True
            
        import pydicom
        from pydicom.uid import ExplicitVRLittleEndian
        ds = pydicom.dcmread(input_path, force=True)
        if not hasattr(ds, 'file_meta') or ds.file_meta is None:
            ds.file_meta = pydicom.dataset.FileMetaDataset()
        if not hasattr(ds.file_meta, 'TransferSyntaxUID') or ds.file_meta.TransferSyntaxUID is None:
            ds.file_meta.TransferSyntaxUID = ExplicitVRLittleEndian
        
        pixel_array = ds.pixel_array.astype(np.float32)
        slope = float(getattr(ds, 'RescaleSlope', 1.0))
        intercept = float(getattr(ds, 'RescaleIntercept', 0.0))
        if slope != 1.0 or intercept != 0.0:
            pixel_array = pixel_array * slope + intercept
        
        # Auto-window
        p1 = np.percentile(pixel_array, 1)
        p99 = np.percentile(pixel_array, 99)
        pixel_array = np.clip(pixel_array, p1, p99)
        if p99 > p1:
            pixel_array = ((pixel_array - p1) / (p99 - p1) * 255.0).astype(np.uint8)
        else:
            pixel_array = np.full_like(pixel_array, 127, dtype=np.uint8)
        
        # Resize to 256x256 thumbnail
        thumb = cv2.resize(pixel_array, (256, 256), interpolation=cv2.INTER_AREA)
        cv2.imwrite(output_path, thumb, [int(cv2.IMWRITE_JPEG_QUALITY), 85])
        print(f"[THUMB] Generated: {output_path}")
        return True
    except Exception as e:
        print(f"[THUMB] FAILED: {e}")
        return False


def generate_series_thumbnail(series_info: dict, sorted_files: list[str], output_path: str) -> bool:
    """Generate a thumbnail for any supported source format."""
    if series_info.get('source_format') != 'jm_volume':
        return generate_thumbnail(sorted_files, output_path)

    try:
        volume, _spacing, _origin = load_jm_volume_for_viewer(
            series_info['morita_volume'], requested_spacing=(1.0, 1.0, 1.0),
        )
        import cv2
        middle_slice = (volume[:, :, volume.shape[2] // 2] * 255.0).astype(np.uint8)
        thumbnail = cv2.resize(middle_slice, (256, 256), interpolation=cv2.INTER_AREA)
        generated = bool(cv2.imwrite(output_path, thumbnail, [int(cv2.IMWRITE_JPEG_QUALITY), 85]))
        if generated:
            print(f"[THUMB] Generated from J. Morita volume: {output_path}")
        return generated
    except Exception as error:
        print(f"[THUMB] Failed to render J. Morita volume: {error}")
        return False


def generate_study_thumbnails(study_path: str, force: bool = False) -> dict:
    """
    Fast gallery-first pass: generate only per-series thumbnails.

    This avoids lazy thumbnail generation from /thumbnail while the heavier
    MONAI VTI conversion continues in the background.
    """
    print(f"[THUMB] Pre-generating study thumbnails: {study_path}")
    series_groups = scan_dicom_series(study_path)
    results = {}

    for series_uid, series_info in series_groups.items():
        files_with_meta = series_info.get('files', [])
        if not files_with_meta:
            continue

        safe_uid = series_uid.replace('.', '_')[:50]
        thumb_path = os.path.join(study_path, f"thumb_{safe_uid}.jpg")
        if os.path.exists(thumb_path) and not force:
            results[series_uid] = {"status": "exists", "path": thumb_path}
            continue

        files_with_meta.sort(key=lambda item: (item[0], item[1]))
        sorted_files = [fp for _, _, fp in files_with_meta]
        generated = generate_series_thumbnail(series_info, sorted_files, thumb_path)
        results[series_uid] = {
            "status": "success" if generated else "error",
            "path": thumb_path,
        }

    print(f"[THUMB] Thumbnail pass complete: {sum(1 for item in results.values() if item['status'] in ('success', 'exists'))}/{len(results)}")
    return results


def _sr_concept_label(item) -> str:
    sequence = getattr(item, 'ConceptNameCodeSequence', None)
    if sequence:
        concept = sequence[0]
        return str(getattr(concept, 'CodeMeaning', '') or getattr(concept, 'CodeValue', '') or 'Unnamed')
    return 'Unnamed'


def parse_sr_report(file_path: str) -> list[dict]:
    """
    Parse a DICOM Structured Report content tree into plain nested findings.
    """
    ds = pydicom.dcmread(file_path, force=True, stop_before_pixels=True)

    def parse_item(item) -> dict:
        node = {
            "label": _sr_concept_label(item),
            "value": None,
            "unit": None,
            "text": str(getattr(item, 'TextValue', '') or '') or None,
            "children": [],
        }

        measured_values = getattr(item, 'MeasuredValueSequence', None)
        if measured_values:
            measured = measured_values[0]
            node["value"] = str(getattr(measured, 'NumericValue', '') or '')
            unit_sequence = getattr(measured, 'MeasurementUnitsCodeSequence', None)
            if unit_sequence:
                unit = unit_sequence[0]
                node["unit"] = str(getattr(unit, 'CodeMeaning', '') or getattr(unit, 'CodeValue', '') or '')

        content_sequence = getattr(item, 'ContentSequence', None)
        if content_sequence:
            node["children"] = [parse_item(child) for child in content_sequence]

        return node
    content_sequence = getattr(ds, 'ContentSequence', None)
    if not content_sequence:
        return []

    return [parse_item(item) for item in content_sequence]


def _process_2d_series_conversion(
    study_path: str,
    study_identifier: str,
    series_uid: str,
    series_info: dict,
    sorted_files: list,
    force: bool,
    run_id: str,
) -> dict:
    safe_uid = series_uid.replace('.', '_')[:50]
    img_path = os.path.join(study_path, f"image_{safe_uid}.jpg")
    modality = series_info['modality']
    classification = series_info['classification']
    num_files = series_info['num_files']

    if os.path.exists(img_path) and not force:
        print(f"[2D] Already exists: {img_path}")
        return {
            "status": "exists", "type": "2d", "path": img_path,
            "modality": modality, "classification": classification,
        }

    print(f"[2D] Processing NATIVE 2D series {series_uid[:30]}... ({num_files} files, Modality={modality})")
    log_python_event(run_id, 'image_generation_start', {
        "studyId": study_identifier, "seriesUid": series_uid,
        "classification": classification, "numFiles": num_files
    })
    notify_backend_callback(run_id, 'image_generation_start', {
        "studyId": study_identifier, "seriesUid": series_uid,
        "classification": classification, "numFiles": num_files
    })
    info = generate_2d_image(sorted_files, img_path)
    log_python_event(run_id, 'image_generation_end', {
        "studyId": study_identifier, "seriesUid": series_uid, "status": info.get("status"),
        "output_size_bytes": os.path.getsize(img_path) if os.path.exists(img_path) else 0
    })
    notify_backend_callback(run_id, 'image_generation_end', {
        "studyId": study_identifier, "seriesUid": series_uid, "status": info.get("status"),
        "output_size_bytes": os.path.getsize(img_path) if os.path.exists(img_path) else 0
    })
    info["type"] = "2d"
    info["modality"] = modality
    info["classification"] = classification
    return info


def _process_3d_series_conversion(
    study_path: str,
    study_identifier: str,
    series_uid: str,
    series_info: dict,
    sorted_files: list,
    target_spacing: tuple,
    force: bool,
    segment: bool,
    progress_callback,
    run_id: str,
) -> tuple[dict, bool]:
    safe_uid = series_uid.replace('.', '_')[:50]
    modality = series_info['modality']
    classification = series_info['classification']
    num_files = series_info['num_files']

    vti_path = os.path.join(study_path, f"volume_{safe_uid}.vti")
    labels_path = os.path.join(study_path, f"labels_{safe_uid}.vti")
    needs_segmentation = segment and (force or not os.path.exists(labels_path))

    if os.path.exists(vti_path) and not force and not needs_segmentation:
        print(f"[VTI] Already exists: {vti_path}")
        segmentation_metadata = get_segmentation_metadata(study_path, safe_uid)
        res = {
            "status": "exists", "type": "3d", "path": vti_path,
            "modality": modality, "classification": classification,
            **segmentation_metadata,
        }
        wrote_default = _copy_default_volume_outputs(study_path, safe_uid)
        return res, wrote_default

    import psutil
    process = psutil.Process()
    start_rss = process.memory_info().rss
    log_python_event(run_id, 'volume_preparation_start', {"studyId": study_identifier, "seriesUid": series_uid, "start_rss_bytes": start_rss})
    notify_backend_callback(run_id, 'volume_preparation_start', {"studyId": study_identifier, "seriesUid": series_uid, "start_rss_bytes": start_rss})

    _emit_progress(progress_callback, {"studyId": study_identifier, "seriesUid": series_uid, "status": "processing", "stage": "dicom_read", "progress": 10})
    volume, spacing, origin, orientation = read_dicom_volume(sorted_files)
    peak_rss = max(start_rss, process.memory_info().rss)

    _emit_progress(progress_callback, {"studyId": study_identifier, "seriesUid": series_uid, "status": "processing", "stage": "monai_preprocess", "progress": 35})
    try:
        processed, new_spacing, new_origin = monai_preprocess(volume, spacing, origin, orientation, target_spacing=target_spacing)
        peak_rss = max(peak_rss, process.memory_info().rss)
    except Exception as monai_err:
        print(f"[VTI] ⚠️ MONAI pipeline failed: {monai_err}")
        vol_min, vol_max = float(np.min(volume)), float(np.max(volume))
        a_min, a_max = max(vol_min, -1000.0), min(vol_max, 3000.0)
        if a_max > a_min:
            processed = np.clip(volume, a_min, a_max)
            processed = ((processed - a_min) / (a_max - a_min)).astype(np.float32)
        else:
            processed = np.zeros_like(volume, dtype=np.float32)
        processed = np.ascontiguousarray(np.transpose(processed, (2, 1, 0)))
        new_spacing, new_origin = spacing, origin
        peak_rss = max(peak_rss, process.memory_info().rss)

    _emit_progress(progress_callback, {"studyId": study_identifier, "seriesUid": series_uid, "status": "processing", "stage": "fov_suppress", "progress": 60})
    processed = suppress_fov_background(processed, new_spacing)
    peak_rss = max(peak_rss, process.memory_info().rss)

    _emit_progress(progress_callback, {"studyId": study_identifier, "seriesUid": series_uid, "status": "processing", "stage": "vti_write", "progress": 80})
    info = write_vti_vtk(processed, new_spacing, new_origin, vti_path)
    peak_rss = max(peak_rss, process.memory_info().rss)

    log_python_event(run_id, 'volume_preparation_end', {"studyId": study_identifier, "seriesUid": series_uid, "peak_rss_bytes": peak_rss, "output_size_bytes": os.path.getsize(vti_path) if os.path.exists(vti_path) else 0})
    notify_backend_callback(run_id, 'volume_preparation_end', {"studyId": study_identifier, "seriesUid": series_uid, "peak_rss_bytes": peak_rss, "output_size_bytes": os.path.getsize(vti_path) if os.path.exists(vti_path) else 0})

    info["status"] = "success"
    info["type"] = "3d"
    info["path"] = vti_path
    info["modality"] = modality
    info["classification"] = classification

    if segment:
        try:
            run_tooth_segmentation(processed, new_spacing, study_path, safe_uid, new_origin)
        except Exception as segmentation_error:
            failed_manifest = _empty_segmentation_manifest(status="failed")
            failed_manifest["error"] = str(segmentation_error)
            if os.path.exists(labels_path):
                os.remove(labels_path)
            write_label_manifest(study_path, safe_uid, failed_manifest)
            print(f"[SEG] FAILED for {safe_uid}: {segmentation_error}")

    info.update(get_segmentation_metadata(study_path, safe_uid))
    wrote_default = _copy_default_volume_outputs(study_path, safe_uid)
    return info, wrote_default


def _write_series_manifest(study_path: str, study_id: str, series_groups: dict) -> None:
    manifest = []
    for series_uid, series_info in series_groups.items():
        safe_uid = series_uid.replace('.', '_')[:50]
        classification = series_info.get('classification', '3D')
        modality = series_info.get('modality', 'CT')
        num_files = series_info.get('num_files', 0)

        has_vti = os.path.exists(os.path.join(study_path, f"volume_{safe_uid}.vti"))
        has_image = os.path.exists(os.path.join(study_path, f"image_{safe_uid}.jpg"))
        has_thumb = os.path.exists(os.path.join(study_path, f"thumb_{safe_uid}.jpg"))

        segmentation_metadata = (
            get_segmentation_metadata(study_path, safe_uid)
            if classification == '3D'
            else {
                "has_labels": False,
                "num_labels": 0,
                "segmentation_method": None,
                "segmentation_status": "missing",
            }
        )

        manifest.append({
            "series_uid": series_uid,
            "title": series_info.get('series_description', 'Unknown Series'),
            "type": '3D Volume' if classification == '3D' else '2D Image',
            "classification": classification,
            "modality": modality if modality else 'CT',
            "num_slices": num_files,
            "series_number": series_info.get('series_number', 0),
            "has_vti": has_vti,
            "has_image": has_image,
            "has_thumb": has_thumb,
            **segmentation_metadata,
            "status": "ready" if (has_vti or has_image) else "pending",
            "thumbnail_url": f"/thumb/{study_id}/{series_uid}" if has_thumb else f"/thumbnail/{study_id}/{series_uid}"
        })

    manifest.sort(key=lambda c: (0 if c['type'] == '3D Volume' else 1, c.get('series_number', 0)))
    manifest_path = os.path.join(study_path, "series_manifest.json")
    with open(manifest_path, 'w') as f:
        json.dump(manifest, f, indent=2)


def convert_study_to_vti(
    study_path: str,
    force: bool = False,
    segment: bool = False,
    progress_callback=None,
    study_id: str = None,
    quality: str = "standard",
    run_id: str = None,
    case_id: str = None,
    iteration: str = None,
) -> dict:
    """Main entry point: Convert a DICOM study folder to output files."""
    start_time = time.time()
    study_identifier = study_id or os.path.basename(os.path.normpath(study_path))
    target_spacing_map = {
        "fast": (1.0, 1.0, 1.0),
        "standard": (0.5, 0.5, 0.5),
        "high": (0.3, 0.3, 0.3),
        "native": None,
    }
    if quality not in target_spacing_map:
        quality = "standard"
    target_spacing = target_spacing_map[quality]

    _emit_progress(progress_callback, {"studyId": study_identifier, "status": "started"})
    log_python_event(run_id, 'dicom_scan_start', {"studyId": study_identifier})
    notify_backend_callback(run_id, 'dicom_scan_start', {"studyId": study_identifier})

    results = {}
    series_groups = scan_dicom_series(study_path)
    default_volume_written = False

    log_python_event(run_id, 'dicom_scan_end', {"studyId": study_identifier, "series_count": len(series_groups)})
    notify_backend_callback(run_id, 'dicom_scan_end', {"studyId": study_identifier, "series_count": len(series_groups)})
    log_python_event(run_id, 'series_grouping_start', {"studyId": study_identifier})
    notify_backend_callback(run_id, 'series_grouping_start', {"studyId": study_identifier})

    series_details = {
        uid: {
            "modality": info.get("modality"),
            "classification": info.get("classification"),
            "num_files": info.get("num_files")
        } for uid, info in series_groups.items()
    }
    log_python_event(run_id, 'series_grouping_end', {"studyId": study_identifier, "series": series_details})
    notify_backend_callback(run_id, 'series_grouping_end', {"studyId": study_identifier, "series": series_details})

    for series_uid, series_info in series_groups.items():
        files_with_meta = series_info['files']
        classification = series_info['classification']
        safe_uid = series_uid.replace('.', '_')[:50]

        files_with_meta.sort(key=lambda x: (x[0], x[1]))
        sorted_files = [fp for _, _, fp in files_with_meta]

        thumb_path = os.path.join(study_path, f"thumb_{safe_uid}.jpg")
        if not os.path.exists(thumb_path) or force:
            generate_series_thumbnail(series_info, sorted_files, thumb_path)

        if classification == '2D':
            results[series_uid] = _process_2d_series_conversion(
                study_path, study_identifier, series_uid, series_info, sorted_files, force, run_id
            )
            continue

        try:
            info, wrote_def = _process_3d_series_conversion(
                study_path, study_identifier, series_uid, series_info, sorted_files,
                target_spacing, force, segment, progress_callback, run_id
            )
            results[series_uid] = info
            default_volume_written = default_volume_written or wrote_def
        except Exception as e:
            print(f"[VTI] FAILED: {e}")
            results[series_uid] = {"status": "error", "error": str(e)}

    _write_series_manifest(study_path, study_identifier, series_groups)

    elapsed = time.time() - start_time
    print(f"\n[VTI] ═══════════════════════════════════════════")
    print(f"[VTI] Conversion complete in {elapsed:.1f}s")
    print(f"[VTI] Results: {len(results)} series processed")
    for uid, r in results.items():
        print(f"[VTI]   {uid[:30]}... → {r.get('classification','?')}/{r.get('type','?')} [{r.get('status','?')}]")
    print(f"[VTI] ═══════════════════════════════════════════\n")
    if run_id:
        gen_files = []
        if os.path.exists(study_path):
            for name in os.listdir(study_path):
                name_lower = name.lower()
                is_leaking = False
                for kw in ["velika", "shakeela", "evangeline", "tan"]:
                    if kw in name_lower:
                        is_leaking = True
                        break
                if is_leaking:
                    ext = os.path.splitext(name)[1]
                    gen_files.append(f"anonymized_source_file{ext}")
                else:
                    gen_files.append(name)
        log_python_event(run_id, 'conversion_completed', {
            "studyId": study_identifier,
            "generated_files": gen_files
        })
        notify_backend_callback(run_id, 'conversion_completed', {
            "studyId": study_identifier,
            "generated_files": gen_files
        })

    return results


# CLI entry point for manual conversion
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python vti_converter.py <study_path> [--force] [--segment] [--quality=fast|standard|high|native]")
        sys.exit(1)
    
    study_path = sys.argv[1]
    force = '--force' in sys.argv
    segment = '--segment' in sys.argv
    quality = "standard"
    for arg in sys.argv[2:]:
        if arg.startswith("--quality="):
            quality = arg.split("=", 1)[1]
    
    if not os.path.exists(study_path):
        print(f"Error: Path not found: {study_path}")
        sys.exit(1)
    
    results = convert_study_to_vti(study_path, force=force, segment=segment, quality=quality)
    
    import json
    print("\nResults:")
    print(json.dumps(results, indent=2, default=str))
