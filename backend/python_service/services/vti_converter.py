"""
VTI Converter - Pre-computes DICOM series into optimized .vti files for instant 3D rendering.

This shifts all heavy processing to the backend (once, at upload time) so the frontend
simply loads a single compressed binary file instead of reconstructing 300+ slices.

Output: {study_path}/volume.vti (zlib-compressed XML Image Data)
Typical sizes: Raw ~200MB → Compressed ~30-50MB
"""

import os
import sys
import numpy as np
import pydicom
from pydicom.uid import ExplicitVRLittleEndian
import glob
from collections import defaultdict
import struct
import zlib
import base64
import time


def scan_dicom_series(study_path: str) -> dict:
    """
    Scan folder and group DICOM files by SeriesInstanceUID.
    Handles both standard DICOM extensions and extensionless files (common in dental CBCT).
    Returns dict: {series_uid: [(instance_number, z_pos, file_path), ...]}
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
    
    series_groups = defaultdict(list)
    
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
            
            series_groups[series_uid].append((instance_num, z_pos, fp))
        except Exception as e:
            print(f"[VTI] Skipping {fp}: {e}")
    
    return dict(series_groups)


def read_dicom_volume(file_list: list) -> tuple:
    """
    Read a sorted list of DICOM files into a 3D numpy array.
    Applies RescaleSlope/Intercept for HU calibration.
    Auto-detects raw unsigned data and normalizes to pseudo-HU.
    Returns: (volume_array, spacing, origin)
    """
    slices = []
    first_ds = None
    had_rescale = False  # Track if any slice had RescaleSlope/Intercept
    
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
    # If no RescaleSlope/Intercept was found and data is unsigned,
    # shift values to approximate standard Hounsfield Units:
    #   Air ≈ -1000, Water ≈ 0, Bone ≈ 300-3000
    vol_min = float(np.min(volume))
    vol_max = float(np.max(volume))
    
    if not had_rescale and vol_min >= 0:
        pixel_repr = int(getattr(first_ds, 'PixelRepresentation', 0))  # 0=unsigned
        bits_stored = int(getattr(first_ds, 'BitsStored', 16))
        
        if pixel_repr == 0:
            # Unsigned data without calibration — apply standard CT offset
            # Maps air (lowest values around 0) to approximately -1024 HU
            shift = -1024.0
            volume = volume + shift
            new_min = float(np.min(volume))
            new_max = float(np.max(volume))
            print(f"[VTI] \u26a0\ufe0f  Raw unsigned {bits_stored}-bit data detected (no RescaleSlope/Intercept)")
            print(f"[VTI] Applied HU normalization: shift = {shift}")
            print(f"[VTI] Range: [{vol_min:.0f}, {vol_max:.0f}] \u2192 [{new_min:.0f}, {new_max:.0f}]")
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
    
    return volume, spacing, origin


def write_vti_compressed(volume: np.ndarray, spacing: tuple, origin: tuple, output_path: str):
    """
    Write a 3D numpy array as a VTK XML ImageData (.vti) file with zlib compression.
    
    This is a pure-Python writer that produces files compatible with VTK.js's
    vtkXMLImageDataReader without requiring the VTK Python library to be installed.
    
    Uses base64-encoded zlib-compressed binary data (AppendedData format).
    """
    z, y, x = volume.shape
    num_points = x * y * z
    
    # Convert to int16 (standard DICOM range, saves space)
    vol_int16 = np.clip(volume, -32768, 32767).astype(np.int16)
    
    # VTK expects Fortran-order (X varies fastest), but numpy is C-order (Z varies fastest)
    # For VTI: dimensions are (X, Y, Z) and data is stored as flat array with X varying fastest
    # We need to transpose from (Z, Y, X) -> (X, Y, Z) then flatten in C-order
    # OR equivalently, flatten in Fortran order
    raw_bytes = vol_int16.tobytes(order='F')  # X varies fastest
    
    # Compress with zlib
    compressed = zlib.compress(raw_bytes, level=6)
    
    # Build header block (4 uint32 values): num_blocks, block_size, last_block_size, compressed_size
    # This is the VTK "header" for compressed data
    header = struct.pack('<IIII', 1, len(raw_bytes), len(raw_bytes), len(compressed))
    
    # Combine header + compressed data
    appended_data = header + compressed
    appended_b64 = base64.b64encode(appended_data).decode('ascii')
    
    # Data range for frontend reference
    data_min = int(np.min(vol_int16))
    data_max = int(np.max(vol_int16))
    
    # Write VTI XML
    vti_xml = f'''<?xml version="1.0"?>
<VTKFile type="ImageData" version="0.1" byte_order="LittleEndian" header_type="UInt32" compressor="vtkZLibDataCompressor">
  <ImageData WholeExtent="0 {x-1} 0 {y-1} 0 {z-1}" Origin="{origin[0]} {origin[1]} {origin[2]}" Spacing="{spacing[0]} {spacing[1]} {spacing[2]}">
    <FieldData>
      <DataArray type="Float64" Name="DataRange" NumberOfTuples="2" format="ascii">
        {data_min} {data_max}
      </DataArray>
    </FieldData>
    <Piece Extent="0 {x-1} 0 {y-1} 0 {z-1}">
      <PointData Scalars="Scalars">
        <DataArray type="Int16" Name="Scalars" NumberOfComponents="1" format="appended" offset="0"/>
      </PointData>
    </Piece>
  </ImageData>
  <AppendedData encoding="base64">
   _{appended_b64}
  </AppendedData>
</VTKFile>
'''
    
    with open(output_path, 'w') as f:
        f.write(vti_xml)
    
    file_size_mb = os.path.getsize(output_path) / (1024 * 1024)
    raw_size_mb = len(raw_bytes) / (1024 * 1024)
    ratio = file_size_mb / raw_size_mb * 100 if raw_size_mb > 0 else 0
    
    print(f"[VTI] Written: {output_path}")
    print(f"[VTI] Volume: {x}x{y}x{z} = {num_points:,} voxels")
    print(f"[VTI] Spacing: {spacing}")
    print(f"[VTI] Data range: [{data_min}, {data_max}]")
    print(f"[VTI] Raw size: {raw_size_mb:.1f}MB → Compressed: {file_size_mb:.1f}MB ({ratio:.1f}%)")
    
    return {
        "dimensions": [x, y, z],
        "spacing": list(spacing),
        "origin": list(origin),
        "data_range": [data_min, data_max],
        "file_size_bytes": os.path.getsize(output_path),
        "num_voxels": num_points
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
    
    For each series:
    - 3D series (>10 slices): Generate volume_{uid}.vti + thumbnail
    - 2D series (≤10 slices): Generate image_{uid}.jpg + thumbnail
    
    Args:
        study_path: Path to study folder containing DICOM files
        force: If True, regenerate even if files already exist
    
    Returns:
        Dict with conversion results per series
    """
    start_time = time.time()
    print(f"\n[VTI] ═══════════════════════════════════════════")
    print(f"[VTI] Converting study: {study_path}")
    print(f"[VTI] ═══════════════════════════════════════════")
    
    results = {}
    series_groups = scan_dicom_series(study_path)
    
    for series_uid, files_with_meta in series_groups.items():
        num_files = len(files_with_meta)
        safe_uid = series_uid.replace('.', '_')[:50]
        
        # Sort files by instance number, then by z-position
        files_with_meta.sort(key=lambda x: (x[0], x[1]))
        sorted_files = [fp for _, _, fp in files_with_meta]
        
        # Generate thumbnail from middle slice (always)
        thumb_path = os.path.join(study_path, f"thumb_{safe_uid}.jpg")
        if not os.path.exists(thumb_path) or force:
            generate_thumbnail(sorted_files, thumb_path)
        
        if num_files <= 10:
            # ── 2D Series (Panoramic, Cephalometric, etc.) ──
            img_path = os.path.join(study_path, f"image_{safe_uid}.jpg")
            
            if os.path.exists(img_path) and not force:
                print(f"[2D] Already exists: {img_path}")
                results[series_uid] = {"status": "exists", "type": "2d", "path": img_path}
            else:
                print(f"[2D] Processing 2D series {series_uid[:30]}... ({num_files} slices)")
                info = generate_2d_image(sorted_files, img_path)
                info["type"] = "2d"
                results[series_uid] = info
            continue
        
        # ── 3D Series (CBCT Volume) ──
        vti_path = os.path.join(study_path, f"volume_{safe_uid}.vti")
        
        # Also create a default volume.vti for the first 3D series
        default_vti = os.path.join(study_path, "volume.vti")
        is_first_3d = not os.path.exists(default_vti)
        
        if os.path.exists(vti_path) and not force:
            print(f"[VTI] Already exists: {vti_path}")
            results[series_uid] = {"status": "exists", "type": "3d", "path": vti_path}
            continue
        
        try:
            print(f"[VTI] Processing 3D series {series_uid[:30]}... ({num_files} slices)")
            
            # Read volume
            volume, spacing, origin = read_dicom_volume(sorted_files)
            print(f"[VTI] Volume shape: {volume.shape}, dtype: {volume.dtype}")
            
            # Write VTI
            info = write_vti_compressed(volume, spacing, origin, vti_path)
            info["status"] = "success"
            info["type"] = "3d"
            info["path"] = vti_path
            results[series_uid] = info
            
            # Copy as default volume.vti for first 3D series
            if is_first_3d:
                import shutil
                shutil.copy2(vti_path, default_vti)
                print(f"[VTI] Default volume.vti created")
            
        except Exception as e:
            import traceback
            print(f"[VTI] FAILED: {e}")
            traceback.print_exc()
            results[series_uid] = {"status": "error", "error": str(e)}
    
    elapsed = time.time() - start_time
    print(f"\n[VTI] ═══════════════════════════════════════════")
    print(f"[VTI] Conversion complete in {elapsed:.1f}s")
    print(f"[VTI] Results: {len(results)} series processed")
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
