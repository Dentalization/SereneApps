import os
import cv2
import numpy as np
import glob

class MoritaHandler:
    def __init__(self, study_path):
        self.study_path = study_path
        # J. Morita often (but not always) organizes files in subfolders like 'd' for processed
        # or flat. We'll look for BMP/SLX/JPG.
        self.files = sorted(glob.glob(os.path.join(study_path, "**", "*.[bB][mM][pP]"), recursive=True))
        if not self.files:
             self.files = sorted(glob.glob(os.path.join(study_path, "**", "*.[jJ][pP][gG]"), recursive=True))
             
        # Parse photo_proc.txt for metadata if available
        self.metadata = self._parse_proc_file()
        
        # 3D Volume cache for MPR
        self.volume = None
        self.shape = None

    def _parse_proc_file(self):
        proc_path = os.path.join(self.study_path, 'photo_proc.txt')
        meta = {
            "pixel_spacing": 0.25, # Default fallback
            "slice_thickness": 1.0
        }
        
        if os.path.exists(proc_path):
            try:
                with open(proc_path, 'r', encoding='utf-8', errors='ignore') as f:
                    for line in f:
                        if '=' in line:
                            key, val = line.strip().split('=', 1)
                            # Actual keys vary by machine version, these are educated guesses/common keys
                            if key == 'PixelSize':
                                meta["pixel_spacing"] = float(val)
                            elif key == 'SlicePitch':
                                meta["slice_thickness"] = float(val)
            except Exception:
                pass 
                
        return meta

    def _load_volume(self):
        """
        Load all BMP files into a 3D numpy array (z, y, x) for MPR reconstruction.
        This is lazy-loaded only when coronal/sagittal views are requested.
        """
        if not self.files or self.volume is not None:
            return
        
        print(f"[MoritaHandler] Loading {len(self.files)} slices into 3D volume...")
        
        slices = []
        for fpath in self.files:
            img = cv2.imread(fpath, cv2.IMREAD_GRAYSCALE)
            if img is not None:
                slices.append(img)
        
        if not slices:
            return
        
        # Stack into 3D volume (z, y, x)
        self.volume = np.stack(slices, axis=0)
        self.shape = self.volume.shape
        print(f"[MoritaHandler] Volume loaded: shape = {self.shape}")
    
    def get_slice(self, view, index):
        """
        Get a slice from the specified view (axial, coronal, or sagittal).
        For coronal and sagittal views, the volume is rescaled to account for
        different pixel spacing vs slice thickness to avoid "squashed" appearance.
        """
        pixel_array = None
        
        if view == 'axial':
            # Direct file access for axial (most efficient)
            if 0 <= index < len(self.files):
                fpath = self.files[index]
                pixel_array = cv2.imread(fpath, cv2.IMREAD_GRAYSCALE)
            else:
                raise ValueError("Index out of bounds")
        
        elif view in ['coronal', 'sagittal']:
            # Lazy load volume for MPR
            if self.volume is None:
                self._load_volume()
            
            if self.volume is None:
                raise ValueError("Failed to load 3D volume for MPR")
            
            # Calculate aspect ratio correction
            # SliceThickness (z-spacing) is usually larger than PixelSpacing (x,y spacing)
            # E.g., SliceThickness = 1.0mm, PixelSpacing = 0.25mm
            # Aspect ratio = SliceThickness / PixelSpacing = 4.0
            aspect_ratio = self.metadata["slice_thickness"] / self.metadata["pixel_spacing"]
            
            if view == 'coronal':
                # Coronal view: slice along Y axis -> (z, x) plane
                if 0 <= index < self.shape[1]:
                    pixel_array = self.volume[:, index, :]
                    # Flip vertically for standard orientation
                    pixel_array = np.flipud(pixel_array)
                    
                    # Rescale Z dimension to account for slice thickness
                    # New height = original_height * aspect_ratio
                    new_height = int(pixel_array.shape[0] * aspect_ratio)
                    pixel_array = cv2.resize(pixel_array, (pixel_array.shape[1], new_height), 
                                            interpolation=cv2.INTER_LINEAR)
                else:
                    raise ValueError("Index out of bounds")
            
            elif view == 'sagittal':
                # Sagittal view: slice along X axis -> (z, y) plane
                if 0 <= index < self.shape[2]:
                    pixel_array = self.volume[:, :, index]
                    # Flip vertically for standard orientation
                    pixel_array = np.flipud(pixel_array)
                    
                    # Rescale Z dimension to account for slice thickness
                    new_height = int(pixel_array.shape[0] * aspect_ratio)
                    pixel_array = cv2.resize(pixel_array, (pixel_array.shape[1], new_height), 
                                            interpolation=cv2.INTER_LINEAR)
                else:
                    raise ValueError("Index out of bounds")
        else:
            raise ValueError(f"Unknown view: {view}")
        
        # Convert to JPEG for streaming
        _, encoded_img = cv2.imencode('.jpg', pixel_array, [int(cv2.IMWRITE_JPEG_QUALITY), 90])
        
        headers = {
            "X-Pixel-Spacing": str(self.metadata["pixel_spacing"]),
            "X-Slice-Thickness": str(self.metadata["slice_thickness"]),
            "X-Slice-Index": str(index),
            "X-View-Type": view
        }
        return encoded_img.tobytes(), headers

    def get_metadata(self):
        """
        Return metadata including dimensions for all three views.
        For MPR support, we need to provide dimensions for all axes.
        """
        # Lazy load volume to get accurate dimensions
        if self.volume is None and len(self.files) > 0:
            # Read first file to get 2D dimensions
            first_img = cv2.imread(self.files[0], cv2.IMREAD_GRAYSCALE)
            if first_img is not None:
                rows, cols = first_img.shape
                z = len(self.files)
                dimensions = [z, rows, cols]
            else:
                dimensions = [len(self.files), 512, 512]
        elif self.volume is not None:
            dimensions = list(self.shape)
        else:
            dimensions = [0, 0, 0]
        
        return {
            "num_slices": len(self.files),  # Default to axial (Z)
            "dimensions": dimensions,  # [z, y, x]
            "pixel_spacing": self.metadata["pixel_spacing"],
            "slice_thickness": self.metadata["slice_thickness"],
            "modality": "CBCT"  # J. Morita is typically CBCT
        }
