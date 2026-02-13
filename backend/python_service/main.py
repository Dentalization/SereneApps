from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
import uvicorn
import os
import sys
import numpy as np
from services.dicom_handler import DicomHandler
from services.morita_handler import MoritaHandler

app = FastAPI(title="X-Core Intelligent Streamer")

# Add GZip compression for large JSON responses (like volume data)
app.add_middleware(GZipMiddleware, minimum_size=1000, compresslevel=6)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=[
        "X-Pixel-Spacing", 
        "X-Slice-Thickness", 
        "X-View-Type", 
        "X-Volume-Shape", 
        "X-Slice-Index",
        "X-Window-Center",
        "X-Window-Width"
    ],
)

# Upload Directory (Relative to backend execution or hardcoded for now)
# Assuming this service runs from backend/python_service
UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../uploads/x-core'))

@app.get("/health")
def health_check():
    return {"status": "online", "service": "x-core-streamer"}

@app.get("/gallery/{study_id}")
def get_study_gallery(study_id: str):
    """
    Smart Gallery Grouping Endpoint (Smart Series Grouping)
    
    Instead of showing 300+ individual files, return grouped series cards:
    - Series 1: "3D CBCT Volume" (300 slices) 
    - Series 2: "Panoramic" (1 image)
    
    Returns:
        List of series with thumbnails (middle slice), type, description
    """
    study_path = os.path.join(UPLOAD_DIR, study_id)
    
    if not os.path.exists(study_path):
        raise HTTPException(status_code=404, detail="Study not found")
    
    try:
        handler = DicomHandler(study_path)
        metadata = handler.get_metadata()
        
        # Build series cards for gallery
        series_cards = []
        for series_info in metadata.get('series', []):
            card = {
                "series_uid": series_info.get('series_uid', 'unknown'),
                "title": series_info.get('series_description', 'Unknown Series'),
                "type": series_info.get('type', '3D Volume'),  # "3D Volume" or "2D Image"
                "modality": series_info.get('modality', 'CT'),
                "num_slices": series_info.get('num_slices', 0),
                "thumbnail_index": series_info.get('num_slices', 1) // 2,  # Middle slice
                "series_number": series_info.get('series_number', 0)
            }
            series_cards.append(card)
        
        return {
            "study_id": study_id,
            "total_series": len(series_cards),
            "series": series_cards
        }
        
    except Exception as e:
        import traceback
        print(f"[ERROR] Gallery endpoint failed: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/thumbnail/{study_id}/{series_uid}")
def get_series_thumbnail(study_id: str, series_uid: str):
    """
    Generate thumbnail for series card (middle slice for 3D, first slice for 2D)
    
    Used in gallery to show preview of each series
    """
    study_path = os.path.join(UPLOAD_DIR, study_id)
    
    if not os.path.exists(study_path):
        raise HTTPException(status_code=404, detail="Study not found")
    
    try:
        handler = DicomHandler(study_path, series_uid=series_uid)
        metadata = handler.get_metadata()
        
        # Get middle slice as thumbnail
        middle_index = metadata['num_slices'] // 2
        image_bytes, headers = handler.get_slice('axial', middle_index)
        
        return Response(content=image_bytes, media_type="image/jpeg", headers=headers)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/volume/{study_id}")
def get_volume_data(study_id: str, series_uid: str = None):
    """
    Get raw volume data for VTK.js 3D rendering (used in "3D First" viewer)
    
    Returns:
        - Raw voxel data (flattened array)
        - Dimensions [z, y, x]
        - Spacing [x, y, z] in mm
        - Data range for volume rendering opacity mapping
    """
    study_path = os.path.join(UPLOAD_DIR, study_id)
    
    if not os.path.exists(study_path):
        raise HTTPException(status_code=404, detail="Study not found")
    
    try:
        handler = DicomHandler(study_path, series_uid=series_uid)
        
        # Load full volume
        if handler.volume is None:
            handler._load_volume()
        
        if handler.volume is None:
            raise HTTPException(status_code=500, detail="Failed to load volume")
        
        metadata = handler.get_metadata()
        
        # Convert to int16 to reduce size (DICOM data is typically int16)
        # This cuts transfer size in half compared to float32/float64
        volume_int16 = handler.volume.astype(np.int16)
        
        # Flatten volume to 1D array for transmission
        # tolist() is slow but necessary for JSON serialization
        # GZip middleware will compress this significantly
        volume_flat = volume_int16.flatten().tolist()
        
        print(f"[DEBUG] Volume size: {len(volume_flat)} voxels, {len(volume_flat) * 2 / 1024 / 1024:.2f} MB uncompressed")
        
        # Get data range for proper windowing in VTK
        data_min = int(np.min(volume_int16))
        data_max = int(np.max(volume_int16))
        
        return {
            "voxel_data": volume_flat,
            "dimensions": metadata['dimensions'],  # [z, y, x]
            "spacing": metadata['voxel_size'],  # [x, y, z] in mm
            "data_range": [data_min, data_max],
            "window_center": metadata['window_center'],
            "window_width": metadata['window_width']
        }
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/series/{study_id}")
def list_series(study_id: str):
    """
    List all DICOM series found in the study folder (The Acteon Way)
    
    This endpoint is called first to let the user choose which series to view:
    - Series 1: CBCT 3D Volume (300 slices)
    - Series 2: Panoramic 2D (1 slice)
    
    Returns:
        List of series with: series_uid, description, type (2D/3D), num_slices
    """
    study_path = os.path.join(UPLOAD_DIR, study_id)
    
    if not os.path.exists(study_path):
        raise HTTPException(status_code=404, detail="Study not found")
    
    try:
        handler = DicomHandler(study_path)
        metadata = handler.get_metadata()
        
        return {
            "study_id": study_id,
            "total_series": metadata.get('total_series_found', 0),
            "series": metadata.get('series', [])
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/stream/{study_id}/{view}/{index}")
def stream_slice(study_id: str, view: str, index: int, series_uid: str = None):
    """
    Stream a single slice with multi-series support
    
    Args:
        study_id: Folder name containing DICOM files
        view: axial, coronal, or sagittal
        index: Slice index
        series_uid: Optional - specific series to load (defaults to first series)
    """
    study_path = os.path.join(UPLOAD_DIR, study_id)
    
    if not os.path.exists(study_path):
        raise HTTPException(status_code=404, detail="Study not found")

    # Determine Handler based on content
    is_dicom = False
    try:
         temp_handler = DicomHandler(study_path, series_uid=series_uid)
         if len(temp_handler.files) > 0:
             is_dicom = True
    except:
         pass
    
    try:
        if is_dicom:
            handler = DicomHandler(study_path, series_uid=series_uid)
            image_bytes, headers = handler.get_slice(view, index)
        else:
            handler = MoritaHandler(study_path)
            image_bytes, headers = handler.get_slice(view, index)
            
        return Response(content=image_bytes, media_type="image/jpeg", headers=headers)
        
    except Exception as e:
        print(f"Streaming Error: {e}", file=sys.stderr)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/metadata/{study_id}")
def get_metadata(study_id: str, series_uid: str = None):
    """
    Get metadata with multi-series detection (The Acteon Way)
    
    Returns:
        - List of all series found in the folder
        - Dimensions, pixel spacing, voxel size for selected series
        - Window/Level values from DICOM
    
    Args:
        study_id: Folder name
        series_uid: Optional - specific series (defaults to first)
    """
    study_path = os.path.join(UPLOAD_DIR, study_id)
    
    if not os.path.exists(study_path):
        raise HTTPException(status_code=404, detail="Study not found")

    is_dicom = False
    try:
         temp_handler = DicomHandler(study_path, series_uid=series_uid)
         if len(temp_handler.files) > 0:
             is_dicom = True
    except:
         pass
    
    try:
        if is_dicom:
            handler = DicomHandler(study_path, series_uid=series_uid)
            return handler.get_metadata()
        else:
            handler = MoritaHandler(study_path)
            return handler.get_metadata()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
