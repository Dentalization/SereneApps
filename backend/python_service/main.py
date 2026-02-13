from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os
import sys
from services.dicom_handler import DicomHandler
from services.morita_handler import MoritaHandler

app = FastAPI(title="X-Core Intelligent Streamer")

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
