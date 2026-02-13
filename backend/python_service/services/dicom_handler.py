import os
import pydicom
import glob
import numpy as np
import cv2

class DicomHandler:
    def __init__(self, study_path):
        self.study_path = study_path
        self.files = []
        # Support multiple extensions
        extensions = ['*.dcm', '*.DCM', '*.dcom', '*.DCOM', '*.dicom', '*.DICOM', '*.ima', '*.IMA']
        files = []
        for ext in extensions:
            files.extend(glob.glob(os.path.join(study_path, "**", ext), recursive=True))
            
        self.files = sorted(list(set(files)))
        self.volume = None
        self.shape = None
        
        # Load first file metadata
        if self.files:
            try:
                self.first_ds = pydicom.dcmread(self.files[0])
            except:
                self.first_ds = None
        else:
            self.first_ds = None

    def _load_volume(self):
        """Loads all DICOM files into a 3D numpy array (z, y, x)."""
        if not self.files:
            return
        
        slices = []
        for file_path in self.files:
            try:
                ds = pydicom.dcmread(file_path)
                slices.append(ds)
            except:
                pass
        
        # Sort by InstanceNumber if available, else ImagePositionPatient Z
        try:
            slices.sort(key=lambda x: int(x.InstanceNumber))
        except:
            try:
                slices.sort(key=lambda x: float(x.ImagePositionPatient[2]))
            except:
                pass 

        if not slices:
            return

        # Stack pixel arrays
        try:
            # Create 3D volume (z, y, x)
            # Normalize each slice first to handle different rescale/slope if needed? 
            # Usually series share same params.
            self.volume = np.stack([s.pixel_array for s in slices])
            self.shape = self.volume.shape
        except Exception as e:
            print(f"Error creating volume: {e}")
            self.volume = None

    def get_slice(self, view, index):
        # Lazy load volume for non-axial or if volume is preferred
        # For simplicity, we try to load volume for everything unless it fails
        if self.volume is None:
            self._load_volume()

        pixel_array = None

        if self.volume is not None:
            # Volume based slicing
            try:
                if view == 'axial':
                    if 0 <= index < self.shape[0]:
                        pixel_array = self.volume[index, :, :]
                    else:
                        raise ValueError("Index out of bounds")
                elif view == 'coronal':
                    if 0 <= index < self.shape[1]:
                        # (z, y, x) -> coronal is (z, x) at fixed y
                        # Need to flip vertically to match standard view
                        pixel_array = self.volume[:, index, :]
                        pixel_array = np.flipud(pixel_array)
                    else:
                        raise ValueError("Index out of bounds")
                elif view == 'sagittal':
                    if 0 <= index < self.shape[2]:
                         # (z, y, x) -> sagittal is (z, y) at fixed x
                        pixel_array = self.volume[:, :, index]
                        pixel_array = np.flipud(pixel_array)
                    else:
                        raise ValueError("Index out of bounds")
                else:
                    raise ValueError(f"Unknown view: {view}")
            except IndexError:
                 raise ValueError("Index out of bounds")

        else:
            # Fallback to single file read if volume load failed (only works for axial)
             if view == 'axial' and 0 <= index < len(self.files):
                 ds = pydicom.dcmread(self.files[index])
                 pixel_array = ds.pixel_array
             else:
                 raise ValueError("Volume not loaded and view is not axial/index valid")

        # Normalize and Windowing
        # Auto-windowing to 0-255 [0.05, 99.5 percentiles to ignore outliers]
        # Or simpler min/max
        min_val = np.min(pixel_array)
        max_val = np.max(pixel_array)
        
        if max_val - min_val > 0:
            pixel_array = ((pixel_array - min_val) / (max_val - min_val) * 255).astype(np.uint8)
        else:
            pixel_array = pixel_array.astype(np.uint8)

        # Encode to JPEG
        _, encoded_img = cv2.imencode('.jpg', pixel_array, [int(cv2.IMWRITE_JPEG_QUALITY), 85])
        
        headers = {
            "X-View-Type": view,
            "X-Volume-Shape": str(self.shape) if self.shape else "N/A"
        }
        
        return encoded_img.tobytes(), headers

    def get_metadata(self):
        # We need dimensions to return correct slider limits
        if self.volume is None and len(self.files) > 0:
             # Just read first file for basic dimensions
             rows = self.first_ds.Rows if self.first_ds else 512
             cols = self.first_ds.Columns if self.first_ds else 512
             z = len(self.files)
             dims = [z, rows, cols]
        elif self.volume is not None:
             dims = self.shape
        else:
             dims = [0, 0, 0]

        ps = 1.0
        st = 1.0
        if self.first_ds:
            ps = getattr(self.first_ds, 'PixelSpacing', [1.0, 1.0])[0]
            st = getattr(self.first_ds, 'SliceThickness', 1.0)
            
        return {
            "num_slices": dims[0], # Default to Z
            "dimensions": [int(d) for d in dims],
            "pixel_spacing": float(ps),
            "slice_thickness": float(st)
        }
