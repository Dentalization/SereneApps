import os
import pydicom
from pydicom.uid import ExplicitVRLittleEndian, ImplicitVRLittleEndian
import glob
import numpy as np
import cv2
from collections import defaultdict

# Import strict 2D/3D classification from vti_converter
try:
    from services.vti_converter import classify_series
except ImportError:
    try:
        from vti_converter import classify_series
    except ImportError:
        # Fallback inline if import fails
        NATIVE_2D_MODALITIES = {'DX', 'PX', 'CR', 'IO', 'RG', 'MG', 'XA'}
        NATIVE_3D_MODALITIES = {'CT', 'MR', 'PT', 'NM', 'US'}
        def classify_series(num_files: int, modality: str) -> str:
            mod = modality.strip().upper() if modality else ''
            if mod in NATIVE_2D_MODALITIES: return '2D'
            if mod in NATIVE_3D_MODALITIES: return '3D'
            return '3D' if num_files > 10 else '2D'

class DicomHandler:
    def __init__(self, study_path, series_uid=None):
        """
        Initialize DICOM handler with multi-series detection (The Acteon Way)
        
        Args:
            study_path: Path to folder containing DICOM files
            series_uid: Optional - load specific series only
        """
        self.study_path = study_path
        self.series_uid = series_uid
        self.all_series = {}  # Dict: {series_uid: [file_paths]}
        self.files = []
        self.volume = None
        self.shape = None
        self.first_ds = None
        
        # Scan folder and group by series
        self._scan_and_group_series()
        
        # If specific series requested, use only those files
        if series_uid and series_uid in self.all_series:
            self.files = self.all_series[series_uid]
        elif len(self.all_series) > 0:
            # Default to first series
            first_series_uid = list(self.all_series.keys())[0]
            self.files = self.all_series[first_series_uid]
        
        # Load first file metadata with robust error handling
        if self.files:
            try:
                self.first_ds = self._read_dicom_safe(self.files[0])
            except Exception as e:
                print(f"Failed to read first DICOM: {e}")
                self.first_ds = None

    def _read_dicom_safe(self, file_path):
        """
        Robust DICOM reader with Transfer Syntax fallback and compression support
        
        Fixes:
        - Missing Transfer Syntax UID
        - Compressed formats (JPEG Lossless, RLE, JPEG 2000)
        - Malformed DICOM headers
        """
        try:
            # First attempt: Standard read with force=True
            ds = pydicom.dcmread(file_path, force=True)
            
            # Fix missing Transfer Syntax UID
            if not hasattr(ds, 'file_meta') or ds.file_meta is None:
                ds.file_meta = pydicom.dataset.FileMetaDataset()
            
            if not hasattr(ds.file_meta, 'TransferSyntaxUID') or ds.file_meta.TransferSyntaxUID is None:
                # Fallback to Explicit VR Little Endian (most common)
                ds.file_meta.TransferSyntaxUID = ExplicitVRLittleEndian
            
            # Ensure pixel data handlers are available for compressed formats
            # pydicom will automatically use gdcm, pillow, or jpeg_ls if available
            if hasattr(ds, 'PixelData'):
                try:
                    # Trigger pixel data decompression to verify it works
                    _ = ds.pixel_array
                except Exception as pixel_err:
                    print(f"Warning: Could not decode pixel data for {file_path}: {pixel_err}")
                    # Try alternative: convert to uncompressed
                    try:
                        ds.decompress()
                    except:
                        pass
            
            return ds
            
        except Exception as e:
            print(f"Error reading DICOM {file_path}: {e}")
            raise

    def _scan_and_group_series(self):
        """
        Recursively scan folder and group files by SeriesInstanceUID (The Acteon Way)
        
        This separates:
        - 3D CBCT volumes (300+ slices)
        - 2D Panoramic images (1 slice)
        - Multiple scan series in one upload
        """
        extensions = ['*.dcm', '*.DCM', '*.dcom', '*.DCOM', '*.dicom', '*.DICOM', '*.ima', '*.IMA']
        all_files = []
        
        for ext in extensions:
            found_files = glob.glob(os.path.join(self.study_path, "**", ext), recursive=True)
            all_files.extend(found_files)
        
        # Also scan for extensionless files (common in dental CBCT: Morita, Planmeca, Vatech)
        for root, dirs, files in os.walk(self.study_path):
            for f in files:
                fp = os.path.join(root, f)
                _, ext = os.path.splitext(f)
                if ext.lower() in ('.vti', '.json', '.txt', '.xml', '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.zip', '.tar', '.gz', '.py', '.js', '.html', '.css', '.log', '.sql', '.md'):
                    continue
                if not ext or f.replace('.', '').isdigit():
                    all_files.append(fp)
        
        all_files = sorted(list(set(all_files)))
        
        # Group by SeriesInstanceUID
        series_groups = defaultdict(list)
        
        for file_path in all_files:
            try:
                ds = self._read_dicom_safe(file_path)
                
                # Get Series UID (primary grouping method)
                series_uid = getattr(ds, 'SeriesInstanceUID', 'unknown')
                
                # Fallback: If no SeriesInstanceUID, group by SeriesNumber
                if series_uid == 'unknown' or series_uid is None:
                    series_number = getattr(ds, 'SeriesNumber', 0)
                    series_uid = f"series_{series_number}"
                
                series_groups[series_uid].append(file_path)
                
            except Exception as e:
                print(f"Skipping file {file_path}: {e}")
                continue
        
        # Sort files within each series by InstanceNumber or ImagePositionPatient[2]
        for series_uid, file_list in series_groups.items():
            try:
                # Read first file to determine sort method
                test_ds = self._read_dicom_safe(file_list[0])
                
                if hasattr(test_ds, 'InstanceNumber'):
                    # Sort by InstanceNumber (most reliable)
                    file_list_with_meta = []
                    for fp in file_list:
                        try:
                            ds = self._read_dicom_safe(fp)
                            inst_num = int(getattr(ds, 'InstanceNumber', 999999))
                            file_list_with_meta.append((inst_num, fp))
                        except:
                            file_list_with_meta.append((999999, fp))
                    
                    file_list_with_meta.sort(key=lambda x: x[0])
                    series_groups[series_uid] = [fp for _, fp in file_list_with_meta]
                    
                elif hasattr(test_ds, 'ImagePositionPatient'):
                    # Sort by Z position
                    file_list_with_meta = []
                    for fp in file_list:
                        try:
                            ds = self._read_dicom_safe(fp)
                            z_pos = float(getattr(ds, 'ImagePositionPatient', [0, 0, 0])[2])
                            file_list_with_meta.append((z_pos, fp))
                        except:
                            file_list_with_meta.append((0.0, fp))
                    
                    file_list_with_meta.sort(key=lambda x: x[0])
                    series_groups[series_uid] = [fp for _, fp in file_list_with_meta]
                    
            except:
                # Keep original order if sorting fails
                pass
        
        self.all_series = dict(series_groups)

    def _load_volume(self):
        """Loads all DICOM files into a 3D numpy array (z, y, x) with proper pixel value scaling.
        Auto-detects raw unsigned data and normalizes to pseudo-HU."""
        if not self.files:
            return
        
        slices = []
        had_rescale = False
        for file_path in self.files:
            try:
                ds = self._read_dicom_safe(file_path)
                
                # Apply RescaleSlope and RescaleIntercept if present
                pixel_array = ds.pixel_array.astype(np.float32)
                
                slope = float(getattr(ds, 'RescaleSlope', 1.0))
                intercept = float(getattr(ds, 'RescaleIntercept', 0.0))
                
                if slope != 1.0 or intercept != 0.0:
                    pixel_array = pixel_array * slope + intercept
                    had_rescale = True
                
                slices.append(pixel_array)
                
            except Exception as e:
                print(f"Failed to load slice {file_path}: {e}")
                continue
        
        if not slices:
            print("No valid slices loaded")
            return

        try:
            # Stack into 3D volume (z, y, x)
            self.volume = np.stack(slices)
            self.shape = self.volume.shape
            print(f"Volume loaded: {self.shape}")
            
            # ── Raw Unsigned Detection & HU Normalization ──
            # If no RescaleSlope/Intercept and data is unsigned, shift to pseudo-HU
            vol_min = float(np.min(self.volume))
            vol_max = float(np.max(self.volume))
            
            if not had_rescale and vol_min >= 0 and self.first_ds:
                pixel_repr = int(getattr(self.first_ds, 'PixelRepresentation', 0))
                bits_stored = int(getattr(self.first_ds, 'BitsStored', 16))
                
                if pixel_repr == 0:  # Unsigned
                    shift = -1024.0
                    self.volume = self.volume + shift
                    print(f"[HU] Raw unsigned {bits_stored}-bit detected. Applied shift={shift}")
                    print(f"[HU] Range: [{vol_min:.0f}, {vol_max:.0f}] \u2192 [{np.min(self.volume):.0f}, {np.max(self.volume):.0f}]")
        except Exception as e:
            print(f"Error creating volume: {e}")
            self.volume = None

    def get_slice(self, view, index):
        """Get a slice with proper windowing from DICOM metadata (WindowCenter/WindowWidth)."""
        # Lazy load volume
        if self.volume is None:
            self._load_volume()

        pixel_array = None

        if self.volume is not None:
            # Volume-based slicing for MPR
            try:
                if view == 'axial':
                    if 0 <= index < self.shape[0]:
                        pixel_array = self.volume[index, :, :]
                    else:
                        raise ValueError("Index out of bounds")
                elif view == 'coronal':
                    if 0 <= index < self.shape[1]:
                        pixel_array = self.volume[:, index, :]
                        pixel_array = np.flipud(pixel_array)
                    else:
                        raise ValueError("Index out of bounds")
                elif view == 'sagittal':
                    if 0 <= index < self.shape[2]:
                        pixel_array = self.volume[:, :, index]
                        pixel_array = np.flipud(pixel_array)
                    else:
                        raise ValueError("Index out of bounds")
                else:
                    raise ValueError(f"Unknown view: {view}")
            except IndexError:
                raise ValueError("Index out of bounds")
        else:
            # Fallback to single file read
            if view == 'axial' and 0 <= index < len(self.files):
                ds = self._read_dicom_safe(self.files[index])
                pixel_array = ds.pixel_array.astype(np.float32)
                
                # Apply RescaleSlope/Intercept
                slope = float(getattr(ds, 'RescaleSlope', 1.0))
                intercept = float(getattr(ds, 'RescaleIntercept', 0.0))
                if slope != 1.0 or intercept != 0.0:
                    pixel_array = pixel_array * slope + intercept
            else:
                raise ValueError("Volume not loaded and view is not axial/index valid")

        # Get pixel value range for auto-windowing
        pixel_min = np.min(pixel_array)
        pixel_max = np.max(pixel_array)
        
        # Try to get WindowCenter/WindowWidth from DICOM metadata
        dicom_wc = None
        dicom_ww = None
        
        if self.first_ds:
            try:
                wc = getattr(self.first_ds, 'WindowCenter', None)
                ww = getattr(self.first_ds, 'WindowWidth', None)
                
                if wc is not None:
                    dicom_wc = float(wc[0]) if isinstance(wc, (list, pydicom.multival.MultiValue)) else float(wc)
                if ww is not None:
                    dicom_ww = float(ww[0]) if isinstance(ww, (list, pydicom.multival.MultiValue)) else float(ww)
            except:
                pass
        
        # Smart windowing: Use DICOM values only if they make sense for the data
        # Otherwise use auto-windowing for optimal contrast
        use_auto_window = False
        
        if dicom_wc is not None and dicom_ww is not None:
            # Check if DICOM window makes sense (window should cover actual pixel range)
            window_min = dicom_wc - (dicom_ww / 2.0)
            window_max = dicom_wc + (dicom_ww / 2.0)
            
            # If most pixels would be clipped, use auto-windowing instead
            if pixel_min < window_min - 500 or pixel_max > window_max + 500:
                use_auto_window = True
                print(f"[DEBUG] DICOM window invalid. Pixel range [{pixel_min:.2f}, {pixel_max:.2f}] vs Window [{window_min:.2f}, {window_max:.2f}]. Using auto-window.")
            else:
                print(f"[DEBUG] Using DICOM window. Pixel range [{pixel_min:.2f}, {pixel_max:.2f}], Window C/W: {dicom_wc:.2f}/{dicom_ww:.2f}")
        else:
            use_auto_window = True
            print(f"[DEBUG] No DICOM window found. Pixel range [{pixel_min:.2f}, {pixel_max:.2f}]. Using auto-window.")
        
        if use_auto_window:
            # Auto-windowing using percentile clipping (robust to outliers)
            # Use 1st and 99th percentile to ignore extreme outliers
            p1 = np.percentile(pixel_array, 1)
            p99 = np.percentile(pixel_array, 99)
            
            window_min = p1
            window_max = p99
            window_center = (p1 + p99) / 2.0
            window_width = p99 - p1
            
            print(f"[DEBUG] Auto-window computed: C/W = {window_center:.2f}/{window_width:.2f} [range: {window_min:.2f} to {window_max:.2f}]")
        else:
            # Use DICOM values
            window_center = dicom_wc
            window_width = dicom_ww
            window_min = window_center - (window_width / 2.0)
            window_max = window_center + (window_width / 2.0)
        
        # Apply windowing and normalize to 0-255
        pixel_array = np.clip(pixel_array, window_min, window_max)
        
        if window_max > window_min:
            pixel_array = ((pixel_array - window_min) / (window_max - window_min) * 255.0).astype(np.uint8)
        else:
            # All pixels are the same value
            pixel_array = np.full_like(pixel_array, 127, dtype=np.uint8)

        # Encode to JPEG
        _, encoded_img = cv2.imencode('.jpg', pixel_array, [int(cv2.IMWRITE_JPEG_QUALITY), 85])
        
        # Get metadata for headers
        ps = 1.0
        st = 1.0
        if self.first_ds:
            try:
                pixel_spacing = getattr(self.first_ds, 'PixelSpacing', [1.0, 1.0])
                ps = float(pixel_spacing[0]) if pixel_spacing else 1.0
            except:
                ps = 1.0
            
            try:
                st = float(getattr(self.first_ds, 'SliceThickness', 1.0))
            except:
                st = 1.0
        
        headers = {
            "X-View-Type": view,
            "X-Volume-Shape": str(self.shape) if self.shape else "N/A",
            "X-Pixel-Spacing": str(ps),
            "X-Slice-Thickness": str(st),
            "X-Slice-Index": str(index),
            "X-Window-Center": str(window_center),
            "X-Window-Width": str(window_width)
        }
        
        return encoded_img.tobytes(), headers

    def get_metadata(self):
        """
        Returns metadata with multi-series information (The Acteon Way)
        
        Returns list of available series so frontend can choose which to display:
        - Series 1: 3D CBCT Volume (300 slices)
        - Series 2: 2D Panoramic (1 slice)
        """
        # Get dimensions for current series
        if self.volume is None and len(self.files) > 0:
            # Read first file for basic dimensions
            rows = 512
            cols = 512
            if self.first_ds:
                rows = int(getattr(self.first_ds, 'Rows', 512))
                cols = int(getattr(self.first_ds, 'Columns', 512))
            z = len(self.files)
            dims = [z, rows, cols]
        elif self.volume is not None:
            dims = list(self.shape)
        else:
            dims = [0, 0, 0]

        # Get pixel spacing and slice thickness
        ps = 1.0
        st = 1.0
        window_center = 127.0
        window_width = 255.0
        
        if self.first_ds:
            try:
                pixel_spacing = getattr(self.first_ds, 'PixelSpacing', [1.0, 1.0])
                ps = float(pixel_spacing[0]) if pixel_spacing else 1.0
            except:
                ps = 1.0
            
            try:
                st = float(getattr(self.first_ds, 'SliceThickness', 1.0))
            except:
                st = 1.0
            
            try:
                wc = getattr(self.first_ds, 'WindowCenter', None)
                ww = getattr(self.first_ds, 'WindowWidth', None)
                
                if wc is not None:
                    window_center = float(wc[0]) if isinstance(wc, (list, pydicom.multival.MultiValue)) else float(wc)
                if ww is not None:
                    window_width = float(ww[0]) if isinstance(ww, (list, pydicom.multival.MultiValue)) else float(ww)
            except:
                pass
        
        # Build series list with metadata for each series
        series_list = []
        for series_uid, file_list in self.all_series.items():
            try:
                # Read first file of this series
                series_ds = self._read_dicom_safe(file_list[0])
                
                series_description = getattr(series_ds, 'SeriesDescription', 'Unknown Series')
                series_number = getattr(series_ds, 'SeriesNumber', 0)
                modality = str(getattr(series_ds, 'Modality', '')).strip()
                
                # ── Strict 2D/3D classification (Modality-based) ──
                classification = classify_series(len(file_list), modality)
                series_type = '3D Volume' if classification == '3D' else '2D Image'
                
                series_info = {
                    'series_uid': series_uid,
                    'series_number': int(series_number),
                    'series_description': str(series_description),
                    'modality': modality if modality else 'CT',
                    'type': series_type,
                    'classification': classification,
                    'num_slices': len(file_list),
                    'is_current': (series_uid == self.series_uid or (self.series_uid is None and series_uid == list(self.all_series.keys())[0]))
                }
                
                series_list.append(series_info)
                
            except Exception as e:
                print(f"Failed to get metadata for series {series_uid}: {e}")
                continue
        
        # Sort by series_number
        series_list.sort(key=lambda x: x['series_number'])
        
        # Calculate VoxelSize for accurate 3D rendering (X, Y, Z spacing)
        voxel_size = [ps, ps, st]  # [X, Y, Z] in mm
        
        return {
            "num_slices": dims[0],
            "dimensions": [int(d) for d in dims],
            "pixel_spacing": float(ps),
            "slice_thickness": float(st),
            "voxel_size": voxel_size,
            "window_center": float(window_center),
            "window_width": float(window_width),
            "series": series_list,  # Multi-series support (The Acteon Way)
            "total_series_found": len(self.all_series)
        }
