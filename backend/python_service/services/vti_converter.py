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
import numpy as np
import pydicom
from pydicom.uid import ExplicitVRLittleEndian
import glob
from collections import defaultdict
import time


# ── Strict 2D / 3D Classification Constants ──
# Native 2D modalities: single-frame radiographs (panoramic, cephalometric, periapical, etc.)
NATIVE_2D_MODALITIES = {'DX', 'PX', 'CR', 'IO', 'RG', 'MG', 'XA'}
# Native 3D modalities: volumetric datasets (CT, CBCT, MR, etc.)
NATIVE_3D_MODALITIES = {'CT', 'MR', 'PT', 'NM', 'US'}


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


def scan_dicom_series(study_path: str) -> dict:
    """
    Scan folder and group DICOM files by SeriesInstanceUID.
    Handles both standard DICOM extensions and extensionless files (common in dental CBCT).

    Returns dict: {
        series_uid: {
            'files': [(instance_number, z_pos, file_path), ...],
            'modality': str,            # DICOM Modality tag (e.g. 'CT', 'DX')
            'classification': '3D'|'2D',# Strict classification
            'num_files': int,
            'series_description': str,
        }
    }
    """
    extensions = ['*.dcm', '*.DCM', '*.dcom', '*.DCOM', '*.dicom', '*.DICOM', '*.ima', '*.IMA']
    all_files = []
    for ext in extensions:
        all_files.extend(glob.glob(os.path.join(study_path, "**", ext), recursive=True))
    
    # Also scan for extensionless files (many CBCT scanners like Morita, Planmeca, Vatech)
    for root, dirs, files in os.walk(study_path):
        for f in files:
            fp = os.path.join(root, f)
            # Skip known non-DICOM files
            _, ext = os.path.splitext(f)
            if ext.lower() in ('.vti', '.json', '.txt', '.xml', '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.zip', '.tar', '.gz', '.py', '.js', '.html', '.css', '.log', '.sql', '.md'):
                continue
            # Include files with no extension or numeric-only names
            if not ext or f.isdigit() or ext.lower() not in ('.dcm', '.dcom', '.dicom', '.ima'):
                all_files.append(fp)
    
    all_files = sorted(set(all_files))
    print(f"[VTI] Found {len(all_files)} candidate files in {study_path}")
    
    # Temporary accumulator: {series_uid: {'files': [...], 'modality': str, 'description': str}}
    _temp = defaultdict(lambda: {'files': [], 'modality': '', 'description': ''})
    
    for fp in all_files:
        try:
            ds = pydicom.dcmread(fp, force=True, stop_before_pixels=True)
            if not hasattr(ds, 'file_meta') or ds.file_meta is None:
                ds.file_meta = pydicom.dataset.FileMetaDataset()
            if not hasattr(ds.file_meta, 'TransferSyntaxUID') or ds.file_meta.TransferSyntaxUID is None:
                ds.file_meta.TransferSyntaxUID = ExplicitVRLittleEndian
            
            series_uid = str(getattr(ds, 'SeriesInstanceUID', 'unknown'))
            instance_num = int(getattr(ds, 'InstanceNumber', 0))
            
            # Also grab z-position for sorting if available
            z_pos = 0.0
            if hasattr(ds, 'ImagePositionPatient') and ds.ImagePositionPatient:
                z_pos = float(ds.ImagePositionPatient[2])
            
            _temp[series_uid]['files'].append((instance_num, z_pos, fp))

            # Read modality & description from first file encountered for this series
            if not _temp[series_uid]['modality']:
                _temp[series_uid]['modality'] = str(getattr(ds, 'Modality', '')).strip()
            if not _temp[series_uid]['description']:
                _temp[series_uid]['description'] = str(getattr(ds, 'SeriesDescription', 'Unknown Series')).strip()
        except Exception as e:
            print(f"[VTI] Skipping {fp}: {e}")
    
    # Build final dict with classification
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
        print(f"[VTI] Series {series_uid[:30]}... → {num_files} files, Modality={modality}, Class={classification}")
    
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


def monai_preprocess(volume: np.ndarray, spacing: tuple, origin: tuple, orientation_cosines: list = None) -> tuple:
    """
    MONAI preprocessing pipeline for dental CBCT volumes.

    Pipeline:
      1. Build diagonal affine matrix (dim0→Z, dim1→Y, dim2→X)
      2. Orientation("RAS") — reorder axes to Right-Anterior-Superior
      3. Spacing(0.5mm isotropic) — resample to uniform voxels
      4. ScaleIntensityRange(-1000→3000 mapped to 0.0→1.0) — universal normalizer
      5. CropForeground(threshold=0.1, margin=10) — cylinder/box artifact killer

    Input:  numpy (Z, Y, X) in Hounsfield Units
    Output: numpy (X, Y, Z) in [0.0, 1.0] float32, isotropic 0.5mm spacing

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

    affine = np.zeros((4, 4), dtype=np.float64)
    affine[0, 2] = sx    # dim2 (X in volume) → X-world (Right)
    affine[1, 1] = sy    # dim1 (Y in volume) → Y-world (Anterior)
    affine[2, 0] = sz    # dim0 (Z in volume) → Z-world (Superior)
    affine[3, 3] = 1.0
    affine[:3, 3] = [origin[0], origin[1], origin[2]]

    print(f"[MONAI] Affine: dim0→Z(sz={sz}), dim1→Y(sy={sy}), dim2→X(sx={sx})")

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

    # ── Step 4: Spacing(0.5mm isotropic) — Resample ──
    try:
        spacing_transform = Spacing(pixdim=(0.5, 0.5, 0.5), mode="bilinear")
        meta_tensor = spacing_transform(meta_tensor)
        print(f"[MONAI] After Spacing(0.5mm): shape={meta_tensor.shape}")
    except Exception as e:
        print(f"[MONAI] ⚠️  Spacing failed (using original): {e}")

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
        crop_transform = CropForeground(
            select_fn=lambda x: x > 0.1,
            margin=10
        )
        pre_crop_shape = meta_tensor.shape
        meta_tensor = crop_transform(meta_tensor)
        print(f"[MONAI] After CropForeground: {pre_crop_shape} → {meta_tensor.shape}")

        if meta_tensor.numel() < 1000:
            print(f"[MONAI] ⚠️  Crop produced tiny volume — reverting")
            raise ValueError("Crop too aggressive")
    except Exception as e:
        print(f"[MONAI] ⚠️  CropForeground skipped: {e}")

    # ── Step 7: Extract final numpy array ──
    # After Orientation("RAS"): axes are (R, A, S) = (X, Y, Z)
    # This is exactly what write_vti_vtk expects: shape (nx, ny, nz)
    result = meta_tensor.squeeze(0).detach().cpu().numpy().astype(np.float32)

    final_spacing = (0.5, 0.5, 0.5)

    # Get updated origin from MONAI affine
    if hasattr(meta_tensor, 'affine') and meta_tensor.affine is not None:
        new_affine = meta_tensor.affine.cpu().numpy()
        new_origin = (float(new_affine[0, 3]), float(new_affine[1, 3]), float(new_affine[2, 3]))
    else:
        new_origin = origin

    print(f"[MONAI] Final volume: shape={result.shape}, range=[{result.min():.4f}, {result.max():.4f}]")
    print(f"[MONAI] Final spacing: {final_spacing}, origin: {new_origin}")

    return result, final_spacing, new_origin


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


def generate_2d_image(file_list: list, output_path: str) -> dict:
    """
    Convert a 2D DICOM series (1-10 slices) to a high-quality JPEG.
    Used for Panoramic, Cephalometric, and other 2D imaging.
    
    Returns: dict with image info
    """
    import cv2
    
    try:
        ds = pydicom.dcmread(file_list[0], force=True)
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
    Generate a 256x256 JPEG thumbnail from the middle slice of a series.
    Returns True on success.
    """
    import cv2
    
    try:
        if target_index < 0:
            target_index = len(file_list) // 2  # Middle slice = best thumbnail
        target_index = min(target_index, len(file_list) - 1)
        
        ds = pydicom.dcmread(file_list[target_index], force=True)
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


def convert_study_to_vti(study_path: str, force: bool = False) -> dict:
    """
    Main entry point: Convert a DICOM study folder to output files.

    Uses STRICT 2D/3D classification from scan_dicom_series (Modality-based):
    - 3D series (CT/MR or >10 files with unknown modality): MONAI pipeline → VTI
    - 2D series (DX/PX/CR/IO or ≤10 files with unknown modality): Generate image_{uid}.jpg

    A 3D series will NEVER produce image_{uid}.jpg (no fake 2D from 3D slices).
    A 2D series will NEVER produce volume_{uid}.vti.

    Args:
        study_path: Path to study folder containing DICOM files
        force: If True, regenerate even if files already exist

    Returns:
        Dict with conversion results per series
    """
    start_time = time.time()
    print(f"\n[VTI] ═══════════════════════════════════════════")
    print(f"[VTI] MONAI Pipeline — Converting study: {study_path}")
    print(f"[VTI] Strict 2D/3D classification enabled")
    print(f"[VTI] ═══════════════════════════════════════════")

    results = {}
    series_groups = scan_dicom_series(study_path)
    is_first_3d = True  # Track first 3D series for default volume.vti

    for series_uid, series_info in series_groups.items():
        files_with_meta = series_info['files']
        classification = series_info['classification']
        modality = series_info['modality']
        num_files = series_info['num_files']
        safe_uid = series_uid.replace('.', '_')[:50]

        # Sort files by instance number, then by z-position
        files_with_meta.sort(key=lambda x: (x[0], x[1]))
        sorted_files = [fp for _, _, fp in files_with_meta]

        # Generate thumbnail from middle slice (always, for gallery)
        thumb_path = os.path.join(study_path, f"thumb_{safe_uid}.jpg")
        if not os.path.exists(thumb_path) or force:
            generate_thumbnail(sorted_files, thumb_path)

        # ════════════════════════════════════════════
        #  STRICT 2D PATH — Native 2D images only
        # ════════════════════════════════════════════
        if classification == '2D':
            img_path = os.path.join(study_path, f"image_{safe_uid}.jpg")

            if os.path.exists(img_path) and not force:
                print(f"[2D] Already exists: {img_path}")
                results[series_uid] = {
                    "status": "exists", "type": "2d", "path": img_path,
                    "modality": modality, "classification": classification,
                }
            else:
                print(f"[2D] Processing NATIVE 2D series {series_uid[:30]}... "
                      f"({num_files} files, Modality={modality})")
                info = generate_2d_image(sorted_files, img_path)
                info["type"] = "2d"
                info["modality"] = modality
                info["classification"] = classification
                results[series_uid] = info
            continue

        # ════════════════════════════════════════════
        #  STRICT 3D PATH — Volumetric data only
        #  NO image_{uid}.jpg will be generated here
        # ════════════════════════════════════════════
        vti_path = os.path.join(study_path, f"volume_{safe_uid}.vti")
        default_vti = os.path.join(study_path, "volume.vti")

        if os.path.exists(vti_path) and not force:
            print(f"[VTI] Already exists: {vti_path}")
            results[series_uid] = {
                "status": "exists", "type": "3d", "path": vti_path,
                "modality": modality, "classification": classification,
            }
            # Still update default volume.vti if this is the first 3D series
            if is_first_3d and not os.path.exists(default_vti):
                import shutil
                shutil.copy2(vti_path, default_vti)
                is_first_3d = False
            continue

        try:
            print(f"[VTI] Processing 3D series {series_uid[:30]}... "
                  f"({num_files} files, Modality={modality})")

            # Step 1: Robust DICOM loading with pydicom (handles force=True)
            volume, spacing, origin, orientation = read_dicom_volume(sorted_files)
            print(f"[VTI] Raw volume: shape={volume.shape}, dtype={volume.dtype}")

            # Step 2: MONAI preprocessing pipeline
            try:
                processed, new_spacing, new_origin = monai_preprocess(
                    volume, spacing, origin, orientation
                )
                print(f"[VTI] MONAI pipeline complete: {volume.shape} → {processed.shape}")
            except Exception as monai_err:
                # Fallback: if MONAI fails, do basic normalization without MONAI
                print(f"[VTI] ⚠️  MONAI pipeline failed: {monai_err}")
                print(f"[VTI] Falling back to basic normalization...")
                import traceback
                traceback.print_exc()

                # Basic fallback: scale to [0, 1] manually
                vol_min = float(np.min(volume))
                vol_max = float(np.max(volume))
                a_min = max(vol_min, -1000.0)
                a_max = min(vol_max, 3000.0)
                if a_max > a_min:
                    processed = np.clip(volume, a_min, a_max)
                    processed = ((processed - a_min) / (a_max - a_min)).astype(np.float32)
                else:
                    processed = np.zeros_like(volume, dtype=np.float32)

                # Transpose (Z, Y, X) → (X, Y, Z) for write_vti_vtk which expects XYZ order
                processed = np.ascontiguousarray(np.transpose(processed, (2, 1, 0)))

                # Spacing from read_dicom_volume is already (X, Y, Z) = (px, py, sz)
                new_spacing = spacing
                new_origin = origin
                print(f"[VTI] Fallback normalization: [{vol_min:.0f},{vol_max:.0f}] → [0.0, 1.0]")

            # Step 3: Write VTI using VTK writer with ZLib compression
            info = write_vti_vtk(processed, new_spacing, new_origin, vti_path)
            info["status"] = "success"
            info["type"] = "3d"
            info["path"] = vti_path
            info["modality"] = modality
            info["classification"] = classification
            results[series_uid] = info

            # Copy as default volume.vti for first 3D series processed
            if is_first_3d:
                import shutil
                shutil.copy2(vti_path, default_vti)
                is_first_3d = False
                print(f"[VTI] Default volume.vti updated from {os.path.basename(vti_path)}")

        except Exception as e:
            import traceback
            print(f"[VTI] FAILED: {e}")
            traceback.print_exc()
            results[series_uid] = {"status": "error", "error": str(e)}

    elapsed = time.time() - start_time
    print(f"\n[VTI] ═══════════════════════════════════════════")
    print(f"[VTI] Conversion complete in {elapsed:.1f}s")
    print(f"[VTI] Results: {len(results)} series processed")
    for uid, r in results.items():
        print(f"[VTI]   {uid[:30]}... → {r.get('classification','?')}/{r.get('type','?')} [{r.get('status','?')}]")
    print(f"[VTI] ═══════════════════════════════════════════\n")

    return results


# CLI entry point for manual conversion
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python vti_converter.py <study_path> [--force]")
        sys.exit(1)
    
    study_path = sys.argv[1]
    force = '--force' in sys.argv
    
    if not os.path.exists(study_path):
        print(f"Error: Path not found: {study_path}")
        sys.exit(1)
    
    results = convert_study_to_vti(study_path, force=force)
    
    import json
    print("\nResults:")
    print(json.dumps(results, indent=2, default=str))
