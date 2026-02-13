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

    def get_slice(self, view, index):
        # Morita export is typically axial slices in BMP.
        # MPR (Coronal/Sagittal) requires 3D volume reconstruction which is heavy.
        # For Phase 1, we map index to file for axial, or return error for others.
        
        if view == 'axial':
            if 0 <= index < len(self.files):
                fpath = self.files[index]
                img = cv2.imread(fpath)
                
                # Convert to JPEG for streaming
                _, encoded_img = cv2.imencode('.jpg', img, [int(cv2.IMWRITE_JPEG_QUALITY), 90])
                
                headers = {
                    "X-Pixel-Spacing": str(self.metadata["pixel_spacing"]),
                    "X-Slice-Thickness": str(self.metadata["slice_thickness"]),
                    "X-Slice-Index": str(index)
                }
                return encoded_img.tobytes(), headers
        
        raise ValueError(f"View {view} not supported for Morita (Axial Only for now)")

    def get_metadata(self):
        return {
            "num_slices": len(self.files),
            "pixel_spacing": self.metadata["pixel_spacing"],
            "slice_thickness": self.metadata["slice_thickness"]
        }
