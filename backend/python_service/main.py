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
)

# Upload Directory (Relative to backend execution or hardcoded for now)
# Assuming this service runs from backend/python_service
UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../uploads/x-core'))

@app.get("/health")
def health_check():
    return {"status": "online", "service": "x-core-streamer"}

@app.get("/stream/{study_id}/{view}/{index}")
def stream_slice(study_id: str, view: str, index: int):
    study_path = os.path.join(UPLOAD_DIR, study_id)
    
    if not os.path.exists(study_path):
        raise HTTPException(status_code=404, detail="Study not found")

    # Determine Handler based on content
    # Try DicomHandler first (it now has robust recursive scanning)
    
    is_dicom = False
    try:
         # Quick check: check usage
         temp_handler = DicomHandler(study_path)
         if len(temp_handler.files) > 0:
             is_dicom = True
    except:
         pass
    
    try:
        if is_dicom:
            handler = DicomHandler(study_path)
            image_bytes, headers = handler.get_slice(view, index)
        else:
            handler = MoritaHandler(study_path)
            image_bytes, headers = handler.get_slice(view, index)
            
        return Response(content=image_bytes, media_type="image/jpeg", headers=headers)
        
    except Exception as e:
        print(f"Streaming Error: {e}", file=sys.stderr)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/metadata/{study_id}")
def get_metadata(study_id: str):
    study_path = os.path.join(UPLOAD_DIR, study_id)
    
    if not os.path.exists(study_path):
        raise HTTPException(status_code=404, detail="Study not found")

    is_dicom = False
    try:
         # Quick check
         temp_handler = DicomHandler(study_path)
         if len(temp_handler.files) > 0:
             is_dicom = True
    except:
         pass
    
    try:
        if is_dicom:
            handler = DicomHandler(study_path)
            return handler.get_metadata()
        else:
            handler = MoritaHandler(study_path)
            return handler.get_metadata()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
