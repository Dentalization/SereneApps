from fastapi import FastAPI, HTTPException, Response, BackgroundTasks, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import FileResponse, StreamingResponse
import uvicorn
import asyncio
import os
import sys
import threading
import time
import numpy as np
import json
from collections import OrderedDict
from datetime import datetime, timezone
from urllib import error as urllib_error
from urllib import parse as urllib_parse
from urllib import request as urllib_request
from services.dicom_handler import DicomHandler
from services.morita_handler import MoritaHandler
from services.vti_converter import (
    convert_study_to_vti,
    detect_mandibular_canal,
    generate_study_thumbnails,
    get_segmentation_metadata,
    parse_sr_report,
    read_label_manifest,
    scan_dicom_series,
)

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
        "X-Window-Width",
        "X-Segmentation-Status",
        "X-Segmentation-Method",
        "X-Labels-Count",
        "Accept-Ranges",
        "Content-Range",
    ],
)

# Upload Directory (Relative to backend execution or hardcoded for now)
# Assuming this service runs from backend/python_service
UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../uploads/x-core'))

# Per-study conversion coordination to prevent duplicate heavy MONAI jobs.
# Singleflight pattern: the first request creates an Event and performs the
# conversion, while followers wait on the same Event and then inspect the
# shared failure state after the leader signals completion.
_conversion_state_lock = threading.Lock()
_conversion_events = {}
_conversion_failures = {}
_conversion_waiters = {}
_CONVERSION_WAIT_TIMEOUT_SECONDS = 300

# Shared viewer assets fan out into many Python requests. Cache successful
# Node share-token validations until JWT expiry to avoid re-validating every
# VTI/image/thumb/metadata/gallery asset request.
_share_validation_cache_lock = threading.Lock()
_share_validation_cache = OrderedDict()
_SHARE_VALIDATION_CACHE_MAX = 256
_conversion_ws_clients = set()
_conversion_ws_lock = threading.Lock()
_conversion_ws_loop = None


@app.on_event("startup")
async def _capture_event_loop():
    global _conversion_ws_loop
    _conversion_ws_loop = asyncio.get_running_loop()


async def _broadcast_conversion_status(event: dict) -> None:
    stale_clients = []
    with _conversion_ws_lock:
        clients = list(_conversion_ws_clients)

    for websocket in clients:
        try:
            await websocket.send_json(event)
        except Exception:
            stale_clients.append(websocket)

    if stale_clients:
        with _conversion_ws_lock:
            for websocket in stale_clients:
                _conversion_ws_clients.discard(websocket)


def _emit_conversion_status(event: dict) -> None:
    loop = _conversion_ws_loop
    if not loop or not loop.is_running():
        return
    asyncio.run_coroutine_threadsafe(_broadcast_conversion_status(event), loop)


def _is_conversion_in_progress(study_path: str) -> bool:
    with _conversion_state_lock:
        event = _conversion_events.get(study_path)
        return event is not None and not event.is_set()


def _study_has_segmentation_outputs(study_path: str) -> bool:
    try:
        return any(
            name in ("labels.vti", "labels.json")
            or (name.startswith("labels_") and (name.endswith(".vti") or name.endswith(".json")))
            for name in os.listdir(study_path)
        )
    except FileNotFoundError:
        return False


def _share_validation_url(token: str) -> str:
    configured_base = os.environ.get("XCORE_NODE_API_BASE_URL")
    if configured_base:
        base = configured_base.rstrip("/")
    else:
        api_version = os.environ.get("API_VERSION", "v1").strip("/")
        base = f"http://127.0.0.1:4000/{api_version}"
    quoted_token = urllib_parse.quote(token, safe="")
    return f"{base}/x-core/share/{quoted_token}/validate"


def _parse_expires_at(value: str) -> float | None:
    if not value:
        return None
    try:
        normalized = value.replace("Z", "+00:00")
        expires_at = datetime.fromisoformat(normalized)
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        return expires_at.timestamp()
    except Exception:
        return None


def _prune_share_validation_cache_locked(now_ts: float = None) -> None:
    now_ts = now_ts if now_ts is not None else time.time()
    expired_tokens = [
        token for token, entry in _share_validation_cache.items()
        if entry.get("expires_ts", 0) <= now_ts
    ]
    for token in expired_tokens:
        _share_validation_cache.pop(token, None)

    while len(_share_validation_cache) > _SHARE_VALIDATION_CACHE_MAX:
        _share_validation_cache.popitem(last=False)


def _get_cached_share_validation(study_id: str, share_token: str) -> dict | None:
    now_ts = time.time()
    with _share_validation_cache_lock:
        _prune_share_validation_cache_locked(now_ts)
        entry = _share_validation_cache.get(share_token)
        if not entry:
            return None

        payload = entry.get("payload") or {}
        if payload.get("folderName") != study_id:
            return None

        _share_validation_cache.move_to_end(share_token)
        return payload


def _store_share_validation_cache(share_token: str, payload: dict) -> None:
    expires_ts = _parse_expires_at(payload.get("expiresAt"))
    if not expires_ts or expires_ts <= time.time():
        return

    with _share_validation_cache_lock:
        _prune_share_validation_cache_locked()
        _share_validation_cache[share_token] = {
            "payload": payload,
            "expires_ts": expires_ts,
        }
        _share_validation_cache.move_to_end(share_token)
        _prune_share_validation_cache_locked()


def _validate_share_token(study_id: str, share_token: str) -> dict:
    cached = _get_cached_share_validation(study_id, share_token)
    if cached:
        return cached

    validate_url = _share_validation_url(share_token)
    request = urllib_request.Request(validate_url, headers={"Accept": "application/json"})

    try:
        with urllib_request.urlopen(request, timeout=5) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except urllib_error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore") if hasattr(exc, "read") else ""
        raise HTTPException(
            status_code=exc.code if exc.code in (401, 403, 404, 410) else 401,
            detail=detail or "Invalid or expired share token",
        ) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Share validation failed: {exc}") from exc

    folder_name = payload.get("folderName")
    if folder_name != study_id:
        raise HTTPException(status_code=403, detail="Share token does not grant access to this study")

    _store_share_validation_cache(share_token, payload)
    return payload


def _clear_share_validation_cache_for_tests() -> None:
    with _share_validation_cache_lock:
        _share_validation_cache.clear()


def _load_json_file(path: str) -> dict | None:
    if not os.path.exists(path):
        return None
    with open(path, "r") as file:
        return json.load(file)


def _iter_file_range(path: str, start: int, end: int, chunk_size: int = 512 * 1024):
    with open(path, "rb") as file:
        file.seek(start)
        remaining = end - start + 1
        while remaining > 0:
            chunk = file.read(min(chunk_size, remaining))
            if not chunk:
                break
            remaining -= len(chunk)
            yield chunk


def _parse_range_header(range_header: str, file_size: int) -> tuple[int, int] | None:
    if not range_header or not range_header.startswith("bytes="):
        return None

    range_spec = range_header.replace("bytes=", "", 1).split(",", 1)[0].strip()
    if "-" not in range_spec:
        return None

    start_raw, end_raw = range_spec.split("-", 1)
    try:
        if start_raw == "":
            suffix_length = int(end_raw)
            if suffix_length <= 0:
                return None
            return max(file_size - suffix_length, 0), file_size - 1

        start = int(start_raw)
        end = int(end_raw) if end_raw else file_size - 1
        if start < 0 or start >= file_size or end < start:
            return None
        return start, min(end, file_size - 1)
    except ValueError:
        return None


def _stream_vti_file(request: Request, file_path: str, filename: str, head_only: bool = False):
    file_size = os.path.getsize(file_path)
    base_headers = {
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=86400",
        "Content-Encoding": "identity",
        "X-VTI-Size": str(file_size),
    }

    range_header = request.headers.get("range")
    parsed_range = _parse_range_header(range_header, file_size) if range_header else None

    if range_header and parsed_range is None:
        raise HTTPException(
            status_code=416,
            detail="Requested range not satisfiable",
            headers={"Content-Range": f"bytes */{file_size}", **base_headers},
        )

    if parsed_range:
        start, end = parsed_range
        content_length = end - start + 1
        headers = {
            **base_headers,
            "Content-Range": f"bytes {start}-{end}/{file_size}",
            "Content-Length": str(content_length),
            "Content-Disposition": f'inline; filename="{filename}"',
        }
        if head_only:
            return Response(status_code=206, headers=headers, media_type="application/xml")
        return StreamingResponse(
            _iter_file_range(file_path, start, end),
            status_code=206,
            media_type="application/xml",
            headers=headers,
        )

    headers = {
        **base_headers,
        "Content-Length": str(file_size),
        "Content-Disposition": f'inline; filename="{filename}"',
    }
    if head_only:
        return Response(status_code=200, headers=headers, media_type="application/xml")
    return StreamingResponse(
        _iter_file_range(file_path, 0, file_size - 1),
        media_type="application/xml",
        headers=headers,
    )


def _authorize_study_access(study_id: str, share_token: str = None) -> dict | None:
    if not share_token:
        return None
    return _validate_share_token(study_id, share_token)


def _ensure_vti_conversion_singleflight(
    study_path: str,
    force: bool = False,
    wait: bool = True,
    segment: bool = False,
    quality: str = "standard",
) -> bool:
    """
    Ensure at most one conversion runs per study.

    Returns:
        True if this call executed conversion work.
        False if conversion was already done or handled by another in-flight request.
    """
    volume_path = os.path.join(study_path, "volume.vti")
    segmentation_ready = _study_has_segmentation_outputs(study_path)
    if os.path.exists(volume_path) and not force and (not segment or segmentation_ready):
        return False

    should_run = False
    registered_waiter = False
    with _conversion_state_lock:
        event = _conversion_events.get(study_path)
        if event is not None and event.is_set() and _conversion_waiters.get(study_path, 0) == 0:
            _conversion_events.pop(study_path, None)
            _conversion_failures.pop(study_path, None)
            event = None

        if event is None:
            event = threading.Event()
            _conversion_events[study_path] = event
            _conversion_failures.pop(study_path, None)
            should_run = True
        elif wait:
            _conversion_waiters[study_path] = _conversion_waiters.get(study_path, 0) + 1
            registered_waiter = True

    if should_run:
        conversion_failed = False
        failure_message = None

        try:
            convert_study_to_vti(
                study_path,
                force=force,
                segment=segment,
                progress_callback=_emit_conversion_status,
                study_id=os.path.basename(os.path.normpath(study_path)),
                quality=quality,
            )
            return True
        except Exception as exc:
            conversion_failed = True
            failure_message = f"{type(exc).__name__}: {exc}"
            raise
        finally:
            with _conversion_state_lock:
                if conversion_failed:
                    _conversion_failures[study_path] = failure_message
                else:
                    _conversion_failures.pop(study_path, None)

                done_event = _conversion_events.get(study_path)
                if done_event:
                    done_event.set()
                if _conversion_waiters.get(study_path, 0) == 0:
                    _conversion_events.pop(study_path, None)
                    if not conversion_failed:
                        _conversion_failures.pop(study_path, None)

    if not wait:
        return False

    try:
        completed = event.wait(timeout=_CONVERSION_WAIT_TIMEOUT_SECONDS)
        if not completed:
            raise TimeoutError(
                f"Timed out after {_CONVERSION_WAIT_TIMEOUT_SECONDS}s waiting for VTI conversion: {study_path}"
            )

        with _conversion_state_lock:
            failure_message = _conversion_failures.get(study_path)

        if failure_message:
            raise RuntimeError(
                f"VTI conversion failed while another request was converting {study_path}: {failure_message}"
            )

        return False
    finally:
        if registered_waiter:
            with _conversion_state_lock:
                remaining_waiters = _conversion_waiters.get(study_path, 0) - 1
                if remaining_waiters > 0:
                    _conversion_waiters[study_path] = remaining_waiters
                else:
                    _conversion_waiters.pop(study_path, None)
                    event = _conversion_events.get(study_path)
                    if event is None or event.is_set():
                        _conversion_events.pop(study_path, None)
                        _conversion_failures.pop(study_path, None)

@app.get("/health")
def health_check():
    return {"status": "online", "service": "x-core-streamer"}


@app.websocket("/ws/conversion-status")
async def conversion_status_websocket(websocket: WebSocket):
    global _conversion_ws_loop
    await websocket.accept()
    _conversion_ws_loop = asyncio.get_running_loop()
    with _conversion_ws_lock:
        _conversion_ws_clients.add(websocket)

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        with _conversion_ws_lock:
            _conversion_ws_clients.discard(websocket)


@app.get("/gallery/{study_id}")
def get_study_gallery(study_id: str, share_token: str = None):
    _authorize_study_access(study_id, share_token)
    study_path = os.path.join(UPLOAD_DIR, study_id)
    
    if not os.path.exists(study_path):
        raise HTTPException(status_code=404, detail="Study not found")
    
    try:
        is_converting = _is_conversion_in_progress(study_path)
        manifest_path = os.path.join(study_path, "series_manifest.json")
        
        # ── FAST PATH: Manifest exists (conversion already ran) ──
        if os.path.exists(manifest_path):
            with open(manifest_path, 'r') as f:
                series_cards = json.load(f)
            
            # Re-check actual file status (in case files were deleted externally)
            for card in series_cards:
                safe_uid = card['series_uid'].replace('.', '_')[:50]
                if card['classification'] == '3D':
                    card['has_vti'] = os.path.exists(os.path.join(study_path, f"volume_{safe_uid}.vti"))
                    card['status'] = 'ready' if card['has_vti'] else ('converting' if is_converting else 'pending')
                    card.update(get_segmentation_metadata(study_path, safe_uid))
                else:
                    card['has_image'] = os.path.exists(os.path.join(study_path, f"image_{safe_uid}.jpg"))
                    card['status'] = 'ready' if card['has_image'] else ('converting' if is_converting else 'pending')
                    card.update({
                        "has_labels": False,
                        "num_labels": 0,
                        "segmentation_method": None,
                        "segmentation_status": "missing",
                    })
                card['has_thumb'] = os.path.exists(os.path.join(study_path, f"thumb_{safe_uid}.jpg"))
                card['thumbnail_url'] = f"/thumb/{study_id}/{card['series_uid']}" if card['has_thumb'] else f"/thumbnail/{study_id}/{card['series_uid']}"
            
            return {
                "study_id": study_id,
                "total_series": len(series_cards),
                "series": series_cards,
                "is_converting": is_converting,
            }
        
        # ── SLOW PATH: No manifest yet — conversion hasn't run or is in progress ──
        # Use scan_dicom_series but only read headers (stop_before_pixels=True is already used)
        # This path should only happen briefly during the first gallery load after upload
        print(f"[Gallery] No manifest for {study_id}, scanning DICOM files...")
        
        series_groups = scan_dicom_series(study_path)
        
        if not series_groups:
            # No DICOM files found at all — true orphan
            return {
                "study_id": study_id,
                "total_series": 0,
                "series": [],
                "is_converting": is_converting,
            }
        
        series_cards = []
        for series_uid, series_info in series_groups.items():
            classification = series_info.get('classification', '3D')
            modality = series_info.get('modality', 'CT')
            num_files = series_info.get('num_files', 0)
            safe_uid = series_uid.replace('.', '_')[:50]
            
            has_vti = os.path.exists(os.path.join(study_path, f"volume_{safe_uid}.vti"))
            has_image = os.path.exists(os.path.join(study_path, f"image_{safe_uid}.jpg")) if classification == '2D' else False
            has_thumb = os.path.exists(os.path.join(study_path, f"thumb_{safe_uid}.jpg"))
            segmentation_metadata = (
                get_segmentation_metadata(study_path, safe_uid)
                if classification == '3D'
                else {
                    "has_labels": False,
                    "num_labels": 0,
                    "segmentation_method": None,
                    "segmentation_status": "missing",
                }
            )
            
            if classification == '3D':
                series_status = 'ready' if has_vti else ('converting' if is_converting else 'pending')
            else:
                series_status = 'ready' if has_image else ('converting' if is_converting else 'pending')
            
            series_cards.append({
                "series_uid": series_uid,
                "title": series_info.get('series_description', 'Unknown Series'),
                "type": '3D Volume' if classification == '3D' else '2D Image',
                "classification": classification,
                "modality": modality if modality else 'CT',
                "num_slices": num_files,
                "series_number": series_info.get('series_number', 0),
                "has_vti": has_vti,
                "has_image": has_image,
                "has_thumb": has_thumb,
                **segmentation_metadata,
                "status": series_status,
                "thumbnail_url": f"/thumb/{study_id}/{series_uid}" if has_thumb else f"/thumbnail/{study_id}/{series_uid}"
            })
        
        series_cards.sort(key=lambda c: (0 if c['type'] == '3D Volume' else 1, c.get('series_number', 0)))
        
        return {
            "study_id": study_id,
            "total_series": len(series_cards),
            "series": series_cards,
            "is_converting": is_converting,
        }
        
    except Exception as e:
        import traceback
        print(f"[ERROR] Gallery endpoint failed for {study_id}: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/status/{study_id}")
def get_study_status(study_id: str, share_token: str = None):
    """
    Returns current conversion status for a study.
    Used by frontend to poll until conversion completes.
    """
    _authorize_study_access(study_id, share_token)
    study_path = os.path.join(UPLOAD_DIR, study_id)
    
    if not os.path.exists(study_path):
        raise HTTPException(status_code=404, detail="Study not found")
    
    vti_path = os.path.join(study_path, "volume.vti")
    is_converting = _is_conversion_in_progress(study_path)
    vti_ready = os.path.exists(vti_path)
    
    if vti_ready:
        status = "ready"
    elif is_converting:
        status = "converting"
    else:
        status = "pending"
    
    return {
        "study_id": study_id,
        "status": status,
        "vti_ready": vti_ready,
        "is_converting": is_converting,
    }

@app.get("/thumbnail/{study_id}/{series_uid}")
def get_series_thumbnail(study_id: str, series_uid: str, share_token: str = None):
    """
    Generate thumbnail for series card (middle slice for 3D, first slice for 2D)
    
    Used in gallery to show preview of each series
    """
    _authorize_study_access(study_id, share_token)
    study_path = os.path.join(UPLOAD_DIR, study_id)
    
    if not os.path.exists(study_path):
        raise HTTPException(status_code=404, detail="Study not found")
    
    try:
        try:
            handler = DicomHandler(study_path, series_uid=series_uid)
            if len(handler.files) == 0:
                raise ValueError("No DICOM files found")
        except Exception:
            handler = MoritaHandler(study_path)
            
        metadata = handler.get_metadata()
        
        # Get middle slice as thumbnail
        middle_index = metadata['num_slices'] // 2
        image_bytes, headers = handler.get_slice('axial', middle_index)
        
        return Response(content=image_bytes, media_type="image/jpeg", headers=headers)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def _resolve_or_create_volume_path(study_id: str, series_uid: str = None, create_if_missing: bool = True) -> tuple[str, str]:
    study_path = os.path.join(UPLOAD_DIR, study_id)

    if not os.path.exists(study_path):
        raise HTTPException(status_code=404, detail="Study not found")

    if series_uid:
        safe_uid = series_uid.replace('.', '_')[:50]
        vti_path = os.path.join(study_path, f"volume_{safe_uid}.vti")
        if not os.path.exists(vti_path):
            vti_path = os.path.join(study_path, "volume.vti")
    else:
        vti_path = os.path.join(study_path, "volume.vti")

    if not os.path.exists(vti_path) and create_if_missing:
        print(f"[Volume] VTI not found, generating on-demand for {study_id}...")
        try:
            _ensure_vti_conversion_singleflight(study_path)
        except Exception as e:
            import traceback
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=f"VTI conversion failed: {str(e)}")

        if series_uid:
            safe_uid = series_uid.replace('.', '_')[:50]
            vti_path = os.path.join(study_path, f"volume_{safe_uid}.vti")
            if not os.path.exists(vti_path):
                vti_path = os.path.join(study_path, "volume.vti")

    if not os.path.exists(vti_path):
        raise HTTPException(status_code=404, detail="No 3D volume found in this study")

    return study_path, vti_path


def _compute_density_histogram(values, bins=None) -> dict:
    scalar_values = np.asarray(values, dtype=np.float32).ravel()
    scalar_values = scalar_values[np.isfinite(scalar_values)]
    if bins is None:
        bins = np.linspace(0.0, 1.0, 33, dtype=np.float32)

    counts, bin_edges = np.histogram(scalar_values, bins=bins)
    bone_values = scalar_values[scalar_values >= 0.30]
    total_bone = int(bone_values.size)

    def pct(mask) -> float:
        if total_bone == 0:
            return 0.0
        return round((int(np.count_nonzero(mask)) / total_bone) * 100.0, 2)

    d4_mask = (bone_values >= 0.30) & (bone_values < 0.3375)
    d3_mask = (bone_values >= 0.3375) & (bone_values < 0.4625)
    d2_mask = (bone_values >= 0.4625) & (bone_values < 0.5625)
    d1_mask = bone_values >= 0.5625

    return {
        "bins": [float(value) for value in bin_edges.tolist()],
        "counts": [int(value) for value in counts.tolist()],
        "total_voxels": int(scalar_values.size),
        "density_voxel_count": total_bone,
        "d1_pct": pct(d1_mask),
        "d2_pct": pct(d2_mask),
        "d3_pct": pct(d3_mask),
        "d4_pct": pct(d4_mask),
    }


def _read_vti_scalar_values(vti_path: str) -> np.ndarray:
    try:
        import vtk
        from vtk.util.numpy_support import vtk_to_numpy
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"VTK Python bindings unavailable: {exc}") from exc

    reader = vtk.vtkXMLImageDataReader()
    reader.SetFileName(vti_path)
    reader.Update()
    image_data = reader.GetOutput()
    if image_data is None:
        raise HTTPException(status_code=500, detail="Failed to read VTI image data")

    scalars = image_data.GetPointData().GetScalars()
    if scalars is None:
        raise HTTPException(status_code=500, detail="VTI file has no scalar data")

    return vtk_to_numpy(scalars)


def _read_vti_volume(vti_path: str) -> tuple[np.ndarray, tuple, tuple]:
    try:
        import vtk
        from vtk.util.numpy_support import vtk_to_numpy
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"VTK Python bindings unavailable: {exc}") from exc

    reader = vtk.vtkXMLImageDataReader()
    reader.SetFileName(vti_path)
    reader.Update()
    image_data = reader.GetOutput()
    if image_data is None:
        raise HTTPException(status_code=500, detail="Failed to read VTI image data")

    scalars = image_data.GetPointData().GetScalars()
    if scalars is None:
        raise HTTPException(status_code=500, detail="VTI file has no scalar data")

    dims = image_data.GetDimensions()
    values = vtk_to_numpy(scalars).reshape((dims[0], dims[1], dims[2]), order="F")
    spacing = tuple(float(value) for value in image_data.GetSpacing())
    origin = tuple(float(value) for value in image_data.GetOrigin())
    return values, spacing, origin


@app.head("/volume/{study_id}")
def head_volume_vti(request: Request, study_id: str, series_uid: str = None, share_token: str = None):
    _authorize_study_access(study_id, share_token)
    _, vti_path = _resolve_or_create_volume_path(study_id, series_uid, create_if_missing=False)
    return _stream_vti_file(request, vti_path, f"volume_{study_id}.vti", head_only=True)


@app.get("/volume/{study_id}")
def get_volume_vti(request: Request, study_id: str, series_uid: str = None, share_token: str = None):
    """
    Serve pre-computed .vti file for instant 3D rendering.

    The frontend uses vtkXMLImageDataReader to load this single file
    instead of reconstructing 300+ slices on the fly.

    If .vti doesn't exist yet, triggers conversion first (blocking for first request,
    subsequent requests are instant).
    """
    _authorize_study_access(study_id, share_token)
    _, vti_path = _resolve_or_create_volume_path(study_id, series_uid, create_if_missing=True)
    
    file_size = os.path.getsize(vti_path)
    print(f"[Volume] Serving VTI: {vti_path} ({file_size / (1024*1024):.1f}MB)")
    return _stream_vti_file(request, vti_path, f"volume_{study_id}.vti")


@app.get("/density-histogram/{study_id}")
def get_bone_density_histogram(study_id: str, series_uid: str = None, share_token: str = None):
    """
    Compute a Misch D1-D4 bone-density histogram from a MONAI-normalized VTI.
    Percentages are computed over density-candidate voxels only (>= 0.30).
    """
    _authorize_study_access(study_id, share_token)
    _, vti_path = _resolve_or_create_volume_path(study_id, series_uid, create_if_missing=True)
    values = _read_vti_scalar_values(vti_path)
    histogram = _compute_density_histogram(values)
    return {
        "study_id": study_id,
        "series_uid": series_uid,
        **histogram,
    }


@app.get("/nerve-canal/{study_id}")
def get_nerve_canal(study_id: str, series_uid: str = None, share_token: str = None):
    """
    Return a heuristic mandibular canal centerline if one can be detected.
    """
    _authorize_study_access(study_id, share_token)
    _, vti_path = _resolve_or_create_volume_path(study_id, series_uid, create_if_missing=True)
    volume, spacing, origin = _read_vti_volume(vti_path)
    canal = detect_mandibular_canal(volume, spacing, origin)

    if not canal:
        return {
            "study_id": study_id,
            "series_uid": series_uid,
            "detected": False,
            "centerline": [],
            "radius_mm": 0,
            "confidence": 0,
        }

    return {
        "study_id": study_id,
        "series_uid": series_uid,
        "detected": True,
        **canal,
    }


@app.get("/ai-findings/{study_id}")
def get_ai_findings(study_id: str, series_uid: str = None, share_token: str = None):
    """
    Aggregate lightweight structured CBCT analysis outputs for an LLM prompt.
    """
    _authorize_study_access(study_id, share_token)
    study_path, vti_path = _resolve_or_create_volume_path(study_id, series_uid, create_if_missing=True)

    safe_uid = series_uid.replace('.', '_')[:50] if series_uid else None
    manifest = read_label_manifest(study_path, safe_uid) if safe_uid else _load_json_file(os.path.join(study_path, "labels.json"))

    try:
        volume, spacing, origin = _read_vti_volume(vti_path)
        histogram = _compute_density_histogram(volume.ravel())
        dimensions = list(volume.shape)
        spacing_values = list(spacing)
        canal = detect_mandibular_canal(volume, spacing, origin)
    except Exception:
        values = _read_vti_scalar_values(vti_path)
        histogram = _compute_density_histogram(values)
        dimensions = []
        spacing_values = []
        canal = None

    return {
        "study_id": study_id,
        "series_uid": series_uid,
        "tooth_count": int(manifest.get("num_labels", 0)) if manifest else 0,
        "tooth_centroids": manifest.get("centroids", {}) if manifest else {},
        "segmentation_status": manifest.get("segmentation_status", "missing") if manifest else "missing",
        "bone_density": {
            "d1_pct": histogram["d1_pct"],
            "d2_pct": histogram["d2_pct"],
            "d3_pct": histogram["d3_pct"],
            "d4_pct": histogram["d4_pct"],
            "density_voxel_count": histogram["density_voxel_count"],
        },
        "volume_dimensions": dimensions,
        "spacing": spacing_values,
        "nerve_canal": {
            "detected": bool(canal),
            "confidence": canal.get("confidence", 0) if canal else 0,
            "radius_mm": canal.get("radius_mm", 0) if canal else 0,
            "points": len(canal.get("centerline", [])) if canal else 0,
        },
    }


@app.get("/labels/{study_id}")
def get_volume_labels(study_id: str, series_uid: str = None, share_token: str = None):
    """
    Serve an optional coarse tooth label-map VTI aligned with the MONAI volume.
    """
    _authorize_study_access(study_id, share_token)
    study_path = os.path.join(UPLOAD_DIR, study_id)

    if not os.path.exists(study_path):
        raise HTTPException(status_code=404, detail="Study not found")

    if series_uid:
        safe_uid = series_uid.replace('.', '_')[:50]
        labels_path = os.path.join(study_path, f"labels_{safe_uid}.vti")
        manifest = read_label_manifest(study_path, safe_uid)
        if not os.path.exists(labels_path):
            labels_path = os.path.join(study_path, "labels.vti")
            manifest_path = os.path.join(study_path, "labels.json")
            manifest = _load_json_file(manifest_path) or manifest
    else:
        labels_path = os.path.join(study_path, "labels.vti")
        manifest_path = os.path.join(study_path, "labels.json")
        manifest = _load_json_file(manifest_path)

    if not os.path.exists(labels_path):
        raise HTTPException(status_code=404, detail="No tooth segmentation labels found for this study")

    file_size = os.path.getsize(labels_path)
    print(f"[Labels] Serving labels: {labels_path} ({file_size / (1024*1024):.1f}MB)")

    return FileResponse(
        path=labels_path,
        media_type="application/xml",
        filename=f"labels_{study_id}.vti",
        headers={
            "Content-Length": str(file_size),
            "Cache-Control": "public, max-age=86400",
            "X-VTI-Size": str(file_size),
            "X-Segmentation-Status": str(manifest.get("segmentation_status", "ready") if manifest else "ready"),
            "X-Segmentation-Method": str(manifest.get("segmentation_method", "") if manifest else ""),
            "X-Labels-Count": str(manifest.get("num_labels", 0) if manifest else 0),
        },
    )


@app.get("/labels-manifest/{study_id}")
def get_volume_labels_manifest(study_id: str, series_uid: str = None, share_token: str = None):
    """
    Serve the lightweight tooth-label sidecar manifest used to gate lazy overlays.
    """
    _authorize_study_access(study_id, share_token)
    study_path = os.path.join(UPLOAD_DIR, study_id)

    if not os.path.exists(study_path):
        raise HTTPException(status_code=404, detail="Study not found")

    if series_uid:
        safe_uid = series_uid.replace('.', '_')[:50]
        manifest = read_label_manifest(study_path, safe_uid)
    else:
        manifest_path = os.path.join(study_path, "labels.json")
        manifest = _load_json_file(manifest_path)

    if not manifest:
        raise HTTPException(status_code=404, detail="No tooth segmentation manifest found for this study")

    return manifest


@app.get("/image/{study_id}/{series_uid}")
def get_2d_image(study_id: str, series_uid: str, share_token: str = None):
    """
    Serve a pre-generated 2D DICOM image (Panoramic, Cephalometric, etc.) as JPEG.
    If not pre-generated, generates on-demand — but ONLY for native 2D series.
    Rejects requests for 3D series (no fake 2D slices from volumes).
    """
    _authorize_study_access(study_id, share_token)
    study_path = os.path.join(UPLOAD_DIR, study_id)
    if not os.path.exists(study_path):
        raise HTTPException(status_code=404, detail="Study not found")
    
    safe_uid = series_uid.replace('.', '_')[:50]
    img_path = os.path.join(study_path, f"image_{safe_uid}.jpg")
    
    # If not pre-generated, generate on demand — but only for native 2D series
    if not os.path.exists(img_path):
        from services.vti_converter import scan_dicom_series, generate_2d_image
        series_groups = scan_dicom_series(study_path)
        if series_uid in series_groups:
            series_info = series_groups[series_uid]
            classification = series_info.get('classification', '2D')
            
            # STRICT: refuse to generate 2D image from a 3D volume series
            if classification == '3D':
                raise HTTPException(
                    status_code=400,
                    detail=f"Series {series_uid[:30]}... is a 3D Volume (Modality={series_info.get('modality','')}). "
                           f"Use /volume/{study_id} for 3D data. No 2D image available."
                )
            
            files = series_info['files']
            files.sort(key=lambda x: (x[0], x[1]))
            sorted_files = [fp for _, _, fp in files]
            generate_2d_image(sorted_files, img_path)
    
    if not os.path.exists(img_path):
        raise HTTPException(status_code=404, detail="2D image not found for this series")
    
    metadata_headers = {}
    try:
        handler = DicomHandler(study_path, series_uid=series_uid)
        metadata = handler.get_metadata()
        metadata_headers = {
            "X-Pixel-Spacing": str(metadata.get("pixel_spacing", 1.0)),
            "X-Slice-Thickness": str(metadata.get("slice_thickness", 1.0)),
            "X-Window-Center": str(metadata.get("window_center", 127.0)),
            "X-Window-Width": str(metadata.get("window_width", 255.0)),
        }
    except Exception as e:
        print(f"[Image] Warning: Failed to load metadata headers for {study_id}/{series_uid}: {e}")

    return FileResponse(
        path=img_path,
        media_type="image/jpeg",
        headers={
            "Cache-Control": "public, max-age=86400",
            **metadata_headers,
        }
    )


@app.get("/thumb/{study_id}/{series_uid}")
def get_series_thumb(study_id: str, series_uid: str, share_token: str = None):
    """
    Serve pre-generated thumbnail (fast, 256x256 JPEG).
    Falls back to on-demand thumbnail generation via DicomHandler.
    """
    _authorize_study_access(study_id, share_token)
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
    
    # Fallback: generate thumbnail (on-demand)
    try:
        try:
            handler = DicomHandler(study_path, series_uid=series_uid)
            if len(handler.files) == 0:
                raise ValueError("No DICOM files found")
        except Exception:
            handler = MoritaHandler(study_path)
            
        metadata = handler.get_metadata()
        middle_index = metadata['num_slices'] // 2
        image_bytes, headers = handler.get_slice('axial', middle_index)
        return Response(content=image_bytes, media_type="image/jpeg", headers=headers)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/volume-status/{study_id}")
def get_volume_status(study_id: str, share_token: str = None):
    """Check if pre-computed .vti file exists for a study."""
    _authorize_study_access(study_id, share_token)
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
def trigger_vti_conversion(
    study_id: str,
    background_tasks: BackgroundTasks,
    force: bool = False,
    segment: bool = False,
    quality: str = "standard",
):
    """
    Manually trigger VTI conversion for a study.
    Called by Node.js backend after upload completes.
    """
    study_path = os.path.join(UPLOAD_DIR, study_id)
    
    if not os.path.exists(study_path):
        raise HTTPException(status_code=404, detail="Study not found")
    
    vti_path = os.path.join(study_path, "volume.vti")
    
    if os.path.exists(vti_path) and not force and (not segment or _study_has_segmentation_outputs(study_path)):
        return {"status": "already_exists", "study_id": study_id}

    if _is_conversion_in_progress(study_path):
        return {"status": "converting", "study_id": study_id, "message": "VTI conversion already in progress"}

    try:
        generate_study_thumbnails(study_path, force=force)
    except Exception as thumb_error:
        print(f"[THUMB] Pre-generation failed for {study_id}: {thumb_error}")
    
    # Run conversion in background so the upload response returns immediately
    background_tasks.add_task(_ensure_vti_conversion_singleflight, study_path, force, True, segment, quality)
    
    return {
        "status": "converting",
        "study_id": study_id,
        "message": "VTI conversion started in background",
        "segment": segment,
        "quality": quality,
    }

@app.get("/series/{study_id}")
def list_series(study_id: str, share_token: str = None):
    """
    List all DICOM series found in the study folder (The Acteon Way)
    
    This endpoint is called first to let the user choose which series to view:
    - Series 1: CBCT 3D Volume (300 slices)
    - Series 2: Panoramic 2D (1 slice)
    
    Returns:
        List of series with: series_uid, description, type (2D/3D), num_slices
    """
    _authorize_study_access(study_id, share_token)
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
def stream_slice(study_id: str, view: str, index: int, series_uid: str = None, share_token: str = None):
    """
    Stream a single slice with multi-series support
    
    Args:
        study_id: Folder name containing DICOM files
        view: axial, coronal, or sagittal
        index: Slice index
        series_uid: Optional - specific series to load (defaults to first series)
    """
    _authorize_study_access(study_id, share_token)
    study_path = os.path.join(UPLOAD_DIR, study_id)
    
    if not os.path.exists(study_path):
        raise HTTPException(status_code=404, detail="Study not found")

    try:
        try:
            handler = DicomHandler(study_path, series_uid=series_uid)
            if len(handler.files) == 0:
                raise ValueError("No DICOM files found")
        except Exception:
            handler = MoritaHandler(study_path)

        image_bytes, headers = handler.get_slice(view, index)
            
        return Response(content=image_bytes, media_type="image/jpeg", headers=headers)
        
    except Exception as e:
        print(f"Streaming Error: {e}", file=sys.stderr)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/metadata/{study_id}")
def get_metadata(study_id: str, series_uid: str = None, share_token: str = None):
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
    _authorize_study_access(study_id, share_token)
    study_path = os.path.join(UPLOAD_DIR, study_id)
    
    if not os.path.exists(study_path):
        raise HTTPException(status_code=404, detail="Study not found")

    try:
        try:
            handler = DicomHandler(study_path, series_uid=series_uid)
            if len(handler.files) == 0:
                raise ValueError("No DICOM files found")
        except Exception:
            handler = MoritaHandler(study_path)

        return handler.get_metadata()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def _flatten_sr_nodes(nodes: list[dict]) -> tuple[list[dict], list[dict]]:
    findings = []
    measurements = []

    def walk(node: dict):
        if node.get("value") not in (None, ""):
            measurements.append({
                "label": node.get("label") or "Measurement",
                "value": node.get("value"),
                "unit": node.get("unit") or "",
            })
        if node.get("text"):
            findings.append({
                "label": node.get("label") or "Finding",
                "text": node.get("text"),
            })
        for child in node.get("children") or []:
            walk(child)

    for root_node in nodes:
        walk(root_node)

    return findings, measurements


@app.get("/sr/{study_id}")
def get_structured_report(study_id: str, share_token: str = None):
    """
    Return DICOM Structured Report findings and measurements if present.
    """
    _authorize_study_access(study_id, share_token)
    study_path = os.path.join(UPLOAD_DIR, study_id)

    if not os.path.exists(study_path):
        raise HTTPException(status_code=404, detail="Study not found")

    try:
        _, sr_series = scan_dicom_series(study_path, include_sr=True)
        findings = []
        measurements = []
        reports = []
        manufacturer = None

        for series_uid, series_info in sr_series.items():
            for _, _, file_path in series_info.get("files", []):
                try:
                    nodes = parse_sr_report(file_path)
                    file_findings, file_measurements = _flatten_sr_nodes(nodes)
                    findings.extend(file_findings)
                    measurements.extend(file_measurements)
                    reports.append({
                        "seriesUid": series_uid,
                        "description": series_info.get("series_description") or "Structured Report",
                        "file": os.path.basename(file_path),
                        "content": nodes,
                    })

                    if manufacturer is None:
                        import pydicom
                        sr_ds = pydicom.dcmread(file_path, force=True, stop_before_pixels=True)
                        manufacturer = str(getattr(sr_ds, "Manufacturer", "") or "") or manufacturer
                except Exception as sr_error:
                    print(f"[SR] Failed to parse {file_path}: {sr_error}")

        return {
            "hasReport": bool(findings or measurements or reports),
            "findings": findings,
            "measurements": measurements,
            "reports": reports,
            "manufacturer": manufacturer or None,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
