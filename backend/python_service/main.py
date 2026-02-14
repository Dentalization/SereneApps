from fastapi import FastAPI, HTTPException, Response, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import FileResponse, StreamingResponse
import uvicorn
import os
import sys
import numpy as np
from services.dicom_handler import DicomHandler
from services.morita_handler import MoritaHandler
from services.vti_converter import convert_study_to_vti

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
            series_uid = series_info.get('series_uid', 'unknown')
            safe_uid = series_uid.replace('.', '_')[:50]
            num_slices = series_info.get('num_slices', 0)
            series_type = series_info.get('type', '3D Volume')
            
            # Check if pre-generated files exist
            has_vti = os.path.exists(os.path.join(study_path, f"volume_{safe_uid}.vti"))
            has_image = os.path.exists(os.path.join(study_path, f"image_{safe_uid}.jpg"))
            has_thumb = os.path.exists(os.path.join(study_path, f"thumb_{safe_uid}.jpg"))
            
            card = {
                "series_uid": series_uid,
                "title": series_info.get('series_description', 'Unknown Series'),
                "type": series_type,
                "modality": series_info.get('modality', 'CT'),
                "num_slices": num_slices,
                "thumbnail_index": num_slices // 2,  # Middle slice = best thumbnail
                "series_number": series_info.get('series_number', 0),
                "has_vti": has_vti,
                "has_image": has_image,
                "has_thumb": has_thumb,
                # Use pre-generated thumb endpoint (fast) or fallback to on-demand
                "thumbnail_url": f"/thumb/{study_id}/{series_uid}" if has_thumb else f"/thumbnail/{study_id}/{series_uid}"
            }
            series_cards.append(card)
        
        # Sort: 3D volumes first, then by series_number
        series_cards.sort(key=lambda c: (0 if c['type'] == '3D Volume' else 1, c['series_number']))
        
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
def get_volume_vti(study_id: str, series_uid: str = None):
    """
    Serve pre-computed .vti file for instant 3D rendering.
    
    The frontend uses vtkXMLImageDataReader to load this single file
    instead of reconstructing 300+ slices on the fly.
    
    If .vti doesn't exist yet, triggers conversion first (blocking for first request,
    subsequent requests are instant).
    """
    study_path = os.path.join(UPLOAD_DIR, study_id)
    
    if not os.path.exists(study_path):
        raise HTTPException(status_code=404, detail="Study not found")
    
    # Determine which .vti file to serve
    if series_uid:
        safe_uid = series_uid.replace('.', '_')[:50]
        vti_path = os.path.join(study_path, f"volume_{safe_uid}.vti")
        # Fallback to default
        if not os.path.exists(vti_path):
            vti_path = os.path.join(study_path, "volume.vti")
    else:
        vti_path = os.path.join(study_path, "volume.vti")
    
    # If .vti doesn't exist, generate it now (first-time conversion)
    if not os.path.exists(vti_path):
        print(f"[Volume] VTI not found, generating on-demand for {study_id}...")
        try:
            convert_study_to_vti(study_path)
        except Exception as e:
            import traceback
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=f"VTI conversion failed: {str(e)}")
        
        # Re-check with series_uid
        if series_uid:
            safe_uid = series_uid.replace('.', '_')[:50]
            vti_path = os.path.join(study_path, f"volume_{safe_uid}.vti")
            if not os.path.exists(vti_path):
                vti_path = os.path.join(study_path, "volume.vti")
        
        if not os.path.exists(vti_path):
            raise HTTPException(status_code=404, detail="No 3D volume found in this study")
    
    file_size = os.path.getsize(vti_path)
    print(f"[Volume] Serving VTI: {vti_path} ({file_size / (1024*1024):.1f}MB)")
    
    return FileResponse(
        path=vti_path,
        media_type="application/xml",
        filename=f"volume_{study_id}.vti",
        headers={
            "Content-Length": str(file_size),
            "Cache-Control": "public, max-age=86400",  # Cache for 24h
            "X-VTI-Size": str(file_size)
        }
    )


@app.get("/image/{study_id}/{series_uid}")
def get_2d_image(study_id: str, series_uid: str):
    """
    Serve a pre-generated 2D DICOM image (Panoramic, Cephalometric, etc.) as JPEG.
    If not pre-generated, generates on-demand.
    """
    study_path = os.path.join(UPLOAD_DIR, study_id)
    if not os.path.exists(study_path):
        raise HTTPException(status_code=404, detail="Study not found")
    
    safe_uid = series_uid.replace('.', '_')[:50]
    img_path = os.path.join(study_path, f"image_{safe_uid}.jpg")
    
    # If not pre-generated, generate on demand
    if not os.path.exists(img_path):
        from services.vti_converter import scan_dicom_series, generate_2d_image
        series_groups = scan_dicom_series(study_path)
        if series_uid in series_groups:
            files = series_groups[series_uid]
            files.sort(key=lambda x: (x[0], x[1]))
            sorted_files = [fp for _, _, fp in files]
            generate_2d_image(sorted_files, img_path)
    
    if not os.path.exists(img_path):
        raise HTTPException(status_code=404, detail="2D image not found for this series")
    
    return FileResponse(
        path=img_path,
        media_type="image/jpeg",
        headers={"Cache-Control": "public, max-age=86400"}
    )


@app.get("/thumb/{study_id}/{series_uid}")
def get_series_thumb(study_id: str, series_uid: str):
    """
    Serve pre-generated thumbnail (fast, 256x256 JPEG).
    Falls back to on-demand thumbnail generation via DicomHandler.
    """
    study_path = os.path.join(UPLOAD_DIR, study_id)
    if not os.path.exists(study_path):
        raise HTTPException(status_code=404, detail="Study not found")
    
    safe_uid = series_uid.replace('.', '_')[:50]
    thumb_path = os.path.join(study_path, f"thumb_{safe_uid}.jpg")
    
    if os.path.exists(thumb_path):
        return FileResponse(
            path=thumb_path,
            media_type="image/jpeg",
            headers={"Cache-Control": "public, max-age=86400"}
        )
    
    # Fallback: generate thumbnail via DicomHandler (on-demand)
    try:
        handler = DicomHandler(study_path, series_uid=series_uid)
        metadata = handler.get_metadata()
        middle_index = metadata['num_slices'] // 2
        image_bytes, headers = handler.get_slice('axial', middle_index)
        return Response(content=image_bytes, media_type="image/jpeg", headers=headers)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/volume-status/{study_id}")
def get_volume_status(study_id: str):
    """Check if pre-computed .vti file exists for a study."""
    study_path = os.path.join(UPLOAD_DIR, study_id)
    
    if not os.path.exists(study_path):
        raise HTTPException(status_code=404, detail="Study not found")
    
    vti_path = os.path.join(study_path, "volume.vti")
    exists = os.path.exists(vti_path)
    
    return {
        "study_id": study_id,
        "vti_ready": exists,
        "vti_size": os.path.getsize(vti_path) if exists else 0
    }


@app.post("/convert/{study_id}")
def trigger_vti_conversion(study_id: str, background_tasks: BackgroundTasks, force: bool = False):
    """
    Manually trigger VTI conversion for a study.
    Called by Node.js backend after upload completes.
    """
    study_path = os.path.join(UPLOAD_DIR, study_id)
    
    if not os.path.exists(study_path):
        raise HTTPException(status_code=404, detail="Study not found")
    
    vti_path = os.path.join(study_path, "volume.vti")
    
    if os.path.exists(vti_path) and not force:
        return {"status": "already_exists", "study_id": study_id}
    
    # Run conversion in background so the upload response returns immediately
    background_tasks.add_task(convert_study_to_vti, study_path, force)
    
    return {"status": "converting", "study_id": study_id, "message": "VTI conversion started in background"}

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
