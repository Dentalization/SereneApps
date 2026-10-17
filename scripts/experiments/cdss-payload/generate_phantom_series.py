#!/usr/bin/env python3
"""
generate_phantom_series.py

Generates deterministic synthetic CT-like DICOM series using pydicom.
Geometry is copied from the real dental CBCT study (Section 1.1):
  - In-plane matrix: 561 x 561 (Rows: 561, Columns: 561)
  - Pixel spacing: [0.25, 0.25] mm
  - Slice thickness: 0.25 mm
  - Bit depth: 16-bit signed (BitsAllocated=16, BitsStored=16, HighBit=15, PixelRepresentation=1)
  - HU calibration: RescaleSlope=1.0, RescaleIntercept=0.0

Synthetic Content:
  - Background air (-1000 HU)
  - Soft tissue elliptical cylinder (+40 HU)
  - Bone/mandible structures (+800 to +1200 HU)
  - High-density tooth/enamel structures (+2000 HU)
  - Deterministic pseudo-random Gaussian noise (seed=42) to prevent trivial compression

Generates N ∈ {25, 50, 100, 200, 401} under .experiment-scratch/phantom-N{N}/
"""

import os
import sys
import argparse
from pathlib import Path
import numpy as np
import pydicom
from pydicom.dataset import Dataset, FileMetaDataset
from pydicom.uid import ExplicitVRLittleEndian, generate_uid

# Constants matching real CBCT geometry
ROWS = 561
COLS = 561
PIXEL_SPACING = [0.25, 0.25]
SLICE_THICKNESS = 0.25
BITS_ALLOCATED = 16
BITS_STORED = 16
HIGH_BIT = 15
PIXEL_REPRESENTATION = 1  # signed int16
RESCALE_SLOPE = 1.0
RESCALE_INTERCEPT = 0.0

# SOP Class UID for CT Image Storage
CT_IMAGE_STORAGE_UID = "1.2.840.10008.5.1.4.1.1.2"


def generate_3d_volume(n_slices: int, seed: int = 42) -> np.ndarray:
    """
    Generate a 3D numpy array of shape (n_slices, ROWS, COLS) in Hounsfield Units.
    """
    rng = np.random.RandomState(seed)

    # Coordinate grids in mm relative to center
    z_coords = (np.arange(n_slices) - n_slices / 2.0) * SLICE_THICKNESS
    y_coords = (np.arange(ROWS) - ROWS / 2.0) * PIXEL_SPACING[0]
    x_coords = (np.arange(COLS) - COLS / 2.0) * PIXEL_SPACING[1]

    # Initialize volume with air (-1000 HU)
    volume = np.full((n_slices, ROWS, COLS), -1000.0, dtype=np.float32)

    # 2D in-plane meshgrid
    xx, yy = np.meshgrid(x_coords, y_coords)

    # Outer soft tissue cylinder (elliptical face outline, semi-axes ~55mm x ~65mm)
    # Scaled to fit within 561x561 (which spans ~140mm x ~140mm)
    soft_tissue_mask_2d = ((xx / 55.0) ** 2 + (yy / 65.0) ** 2) <= 1.0

    # U-shaped dental arch / mandible bone
    # Parabolic curve: y ≈ a * x^2
    mandible_mask_2d = (
        (((xx / 42.0) ** 2 + (yy / 48.0) ** 2) <= 1.0) &
        (((xx / 30.0) ** 2 + (yy / 36.0) ** 2) >= 1.0) &
        (yy <= 25.0)
    )

    # Tooth structures: discrete dense spots along the anterior arch
    tooth_mask_2d = np.zeros_like(xx, dtype=bool)
    arch_angles = np.linspace(-np.pi * 0.75, np.pi * 0.75, 14)
    for theta in arch_angles:
        tx = 36.0 * np.sin(theta)
        ty = -10.0 + 36.0 * np.cos(theta) * 0.8
        t_dist_sq = (xx - tx) ** 2 + (yy - ty) ** 2
        tooth_mask_2d |= (t_dist_sq <= (3.5 ** 2))

    for k in range(n_slices):
        z = z_coords[k]
        # Soft tissue extends through all slices
        volume[k][soft_tissue_mask_2d] = 40.0

        # Mandible bone present in lower/middle 80% of volume
        z_relative = (k / max(1, n_slices - 1))
        if 0.1 <= z_relative <= 0.9:
            volume[k][mandible_mask_2d] = 850.0

        # Teeth present in mid-superior slices
        if 0.35 <= z_relative <= 0.75:
            volume[k][tooth_mask_2d] = 1800.0

    # Add pseudo-random Gaussian noise (mean=0, std=30 HU)
    noise = rng.normal(0.0, 30.0, size=volume.shape).astype(np.float32)
    volume += noise

    # Clip to valid CT range: [-1024, 3071]
    volume = np.clip(volume, -1024.0, 3071.0)
    return volume.astype(np.int16)


def create_dicom_slice(
    pixel_data: np.ndarray,
    slice_idx: int,
    total_slices: int,
    study_uid: str,
    series_uid: str,
    study_date: str = "20261004",
    study_time: str = "080000",
) -> Dataset:
    """Create a single DICOM slice Dataset."""
    sop_instance_uid = generate_uid()

    # File meta dataset
    file_meta = FileMetaDataset()
    file_meta.MediaStorageSOPClassUID = CT_IMAGE_STORAGE_UID
    file_meta.MediaStorageSOPInstanceUID = sop_instance_uid
    file_meta.TransferSyntaxUID = ExplicitVRLittleEndian

    # Main dataset
    ds = Dataset()
    ds.file_meta = file_meta
    ds.is_little_endian = True
    ds.is_implicit_VR = False

    # Identification & Patient tags (generic phantom)
    ds.SOPClassUID = CT_IMAGE_STORAGE_UID
    ds.SOPInstanceUID = sop_instance_uid
    ds.StudyInstanceUID = study_uid
    ds.SeriesInstanceUID = series_uid
    ds.Modality = "CT"
    ds.SeriesDescription = f"Phantom-N{total_slices} Synthetic Series"
    ds.StudyDescription = "Synthetic Phantom Benchmark Study"
    ds.PatientName = f"Phantom^N{total_slices}"
    ds.PatientID = f"PHANTOM-N{total_slices}"
    ds.PatientBirthDate = "20000101"
    ds.PatientSex = "O"
    ds.StudyDate = study_date
    ds.StudyTime = study_time
    ds.SeriesDate = study_date
    ds.SeriesTime = study_time

    # Acquisition & Geometry
    ds.InstanceNumber = slice_idx + 1
    ds.Rows = ROWS
    ds.Columns = COLS
    ds.PixelSpacing = [f"{PIXEL_SPACING[0]:.4f}", f"{PIXEL_SPACING[1]:.4f}"]
    ds.SliceThickness = f"{SLICE_THICKNESS:.4f}"

    # Z position: starting from 0.0 mm upwards
    z_pos = slice_idx * SLICE_THICKNESS
    origin_x = -(COLS * PIXEL_SPACING[1]) / 2.0
    origin_y = -(ROWS * PIXEL_SPACING[0]) / 2.0
    ds.ImagePositionPatient = [f"{origin_x:.4f}", f"{origin_y:.4f}", f"{z_pos:.4f}"]
    ds.ImageOrientationPatient = ["1.0000", "0.0000", "0.0000", "0.0000", "1.0000", "0.0000"]
    ds.SliceLocation = f"{z_pos:.4f}"

    # Pixel Representation & Calibration
    ds.SamplesPerPixel = 1
    ds.PhotometricInterpretation = "MONOCHROME2"
    ds.BitsAllocated = BITS_ALLOCATED
    ds.BitsStored = BITS_STORED
    ds.HighBit = HIGH_BIT
    ds.PixelRepresentation = PIXEL_REPRESENTATION
    ds.RescaleSlope = f"{RESCALE_SLOPE:.1f}"
    ds.RescaleIntercept = f"{RESCALE_INTERCEPT:.1f}"
    ds.RescaleType = "HU"

    # Window settings for viewer compatibility (dental bone window)
    ds.WindowCenter = "400"
    ds.WindowWidth = "2000"

    # Pixel Data
    ds.PixelData = pixel_data.tobytes()

    return ds


def generate_series(n_slices: int, output_dir: Path, seed: int = 42) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    print(f"[Phantom] Generating N={n_slices} series in {output_dir} (seed={seed})...")

    study_uid = generate_uid()
    series_uid = generate_uid()

    volume_3d = generate_3d_volume(n_slices, seed=seed)

    for i in range(n_slices):
        slice_ds = create_dicom_slice(
            pixel_data=volume_3d[i],
            slice_idx=i,
            total_slices=n_slices,
            study_uid=study_uid,
            series_uid=series_uid,
        )
        file_path = output_dir / f"slice_{i+1:04d}.dcm"
        slice_ds.save_as(str(file_path), write_like_original=False)

    print(f"[Phantom] Wrote {n_slices} DICOM slices to {output_dir}")

    # Validation: read back all files
    validate_series(output_dir, n_slices, series_uid)

    # Manifest logging
    import json
    from datetime import datetime, timezone
    scratch_dir = output_dir.parent
    manifest_path = scratch_dir / "manifest.jsonl"
    with open(manifest_path, "a") as mf:
        mf.write(json.dumps({
            "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "type": "phantom",
            "tierN": n_slices,
            "path": str(output_dir.resolve()),
            "sliceCount": n_slices,
        }) + "\n")


def validate_series(series_dir: Path, expected_slices: int, expected_series_uid: str) -> None:
    files = sorted(series_dir.glob("*.dcm"))
    if len(files) != expected_slices:
        raise ValueError(f"Validation failed: expected {expected_slices} files, found {len(files)}")

    for idx, fp in enumerate(files):
        ds = pydicom.dcmread(str(fp), force=True)
        if ds.Modality != "CT":
            raise ValueError(f"Slice {fp.name}: expected Modality 'CT', got '{ds.Modality}'")
        if ds.SeriesInstanceUID != expected_series_uid:
            raise ValueError(f"Slice {fp.name}: SeriesInstanceUID mismatch")
        if ds.Rows != ROWS or ds.Columns != COLS:
            raise ValueError(f"Slice {fp.name}: dimensions mismatch ({ds.Rows}x{ds.Columns})")
        if ds.pixel_array.shape != (ROWS, COLS):
            raise ValueError(f"Slice {fp.name}: pixel_array shape mismatch")
        if ds.InstanceNumber != idx + 1:
            raise ValueError(f"Slice {fp.name}: InstanceNumber {ds.InstanceNumber} != {idx + 1}")

    print(f"[Phantom] Validation PASSED for {series_dir.name} ({expected_slices} slices verified).")


def main():
    parser = argparse.ArgumentParser(description="Generate synthetic CT DICOM series for CDSS payload characterization.")
    parser.add_argument("--tiers", nargs="+", type=int, default=[25, 50, 100, 200, 401], help="Slice counts to generate")
    parser.add_argument("--base-dir", type=str, default=".experiment-scratch", help="Output base directory")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for reproducibility")
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parents[3]
    base_dir = repo_root / args.base_dir

    for n in args.tiers:
        tier_dir = base_dir / f"phantom-N{n}"
        generate_series(n, tier_dir, seed=args.seed + n)

    print("\n[Phantom] All requested phantom series generated and validated successfully.")


if __name__ == "__main__":
    main()
