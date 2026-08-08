from fastapi import FastAPI, HTTPException, Response, BackgroundTasks, Request, WebSocket, WebSocketDisconnect, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import FileResponse, StreamingResponse
import uvicorn
import asyncio
import os
import sys
import glob
import threading
import time
import numpy as np
import json
import tempfile
from io import BytesIO
from collections import OrderedDict
from contextlib import asynccontextmanager
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
    suppress_fov_background,
    log_python_event,
    notify_backend_callback,
)


@asynccontextmanager
async def _app_lifespan(_app: FastAPI):
    global _conversion_ws_loop
    _conversion_ws_loop = asyncio.get_running_loop()
    yield


app = FastAPI(title="X-Core Intelligent Streamer", lifespan=_app_lifespan)

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
        "X-VTI-Size",
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
_conversion_progress = {}
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
DENSITY_HISTOGRAM_VERSION = 2

_density_locks = {}
_density_locks_lock = threading.Lock()


def _write_json_atomic(data: dict, target_path: str) -> None:
    dir_path = os.path.dirname(target_path)
    with tempfile.NamedTemporaryFile(
        mode='w', dir=dir_path, suffix='.tmp', delete=False
    ) as tmp:
        json.dump(data, tmp, indent=2)
        tmp_path = tmp.name
    os.replace(tmp_path, target_path)   # atomic on POSIX, best-effort on Windows


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
    study_id = event.get("studyId") or event.get("study_id")
    if study_id:
        with _conversion_state_lock:
            _conversion_progress[str(study_id)] = {
                **event,
                "updatedAt": datetime.now(timezone.utc).isoformat(),
            }
    loop = _conversion_ws_loop
    if not loop or not loop.is_running():
        return
    asyncio.run_coroutine_threadsafe(_broadcast_conversion_status(event), loop)


def _get_conversion_progress(study_id: str) -> dict:
    with _conversion_state_lock:
        progress = _conversion_progress.get(str(study_id))
    if progress:
        return progress
    study_path = os.path.join(UPLOAD_DIR, study_id)
    if os.path.exists(study_path):
        try:
            if any(name.startswith("volume") and name.endswith(".vti") for name in os.listdir(study_path)):
                return {
                    "studyId": study_id,
                    "status": "ready",
                    "stage": "cached",
                    "progress": 100,
                }
        except FileNotFoundError:
            pass
    return {
        "studyId": study_id,
        "status": "pending",
        "stage": "waiting",
        "progress": 0,
    }


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
    run_id: str = None,
    case_id: str = None,
    iteration: str = None,
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
            conversion_kwargs = {
                "force": force,
                "segment": segment,
                "progress_callback": _emit_conversion_status,
                "study_id": os.path.basename(os.path.normpath(study_path)),
                "quality": quality,
            }
            if run_id:
                conversion_kwargs["run_id"] = run_id
            if case_id:
                conversion_kwargs["case_id"] = case_id
            if iteration:
                conversion_kwargs["iteration"] = iteration
            convert_study_to_vti(
                study_path,
                **conversion_kwargs,
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


@app.get("/api/v1/health")
def versioned_health_check():
    return health_check()


@app.get("/api/v1/sessions")
def list_ai_sessions_compat(page: int = 1, per_page: int = 30):
    return {
        "sessions": [],
        "total": 0,
        "page": max(1, page),
        "per_page": max(1, per_page),
        "service": "x-core-streamer",
        "warning": "AI diagnosis sessions are not served by the X-Core Python streamer.",
    }


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


def _load_gallery_from_manifest(study_path: str, study_id: str, is_converting: bool) -> dict:
    manifest_path = os.path.join(study_path, "series_manifest.json")
    with open(manifest_path, 'r') as f:
        series_cards = json.load(f)

    for card in series_cards:
        safe_uid = card['series_uid'].replace('.', '_')[:50]
        if card['classification'] == '3D':
            card['has_vti'] = os.path.exists(os.path.join(study_path, f"volume_{safe_uid}.vti"))
            card['status'] = 'ready' if card['has_vti'] else ('converting' if is_converting else 'pending')
            card.update(get_segmentation_metadata(study_path, safe_uid))
            card['source_kind'] = 'DICOM'
        else:
            static_img_path = os.path.join(study_path, f"image_{safe_uid}.jpg")
            card['has_image'] = os.path.exists(static_img_path)
            card['status'] = 'ready' if card['has_image'] else ('converting' if is_converting else 'pending')
            card.update({
                "has_labels": False,
                "num_labels": 0,
                "segmentation_method": None,
                "segmentation_status": "missing",
            })
            # Determine source_kind: if pre-rendered JPG exists, it's STATIC_JPG;
            # otherwise it's a native DICOM 2D series.
            card['source_kind'] = 'STATIC_JPG' if card['has_image'] else 'DICOM'
        card['has_thumb'] = os.path.exists(os.path.join(study_path, f"thumb_{safe_uid}.jpg"))
        card['thumbnail_url'] = f"/thumb/{study_id}/{card['series_uid']}" if card['has_thumb'] else f"/thumbnail/{study_id}/{card['series_uid']}"

    return {
        "study_id": study_id,
        "total_series": len(series_cards),
        "series": series_cards,
        "is_converting": is_converting,
    }



def _build_gallery_from_scan(study_path: str, study_id: str, is_converting: bool) -> dict:
    series_groups = scan_dicom_series(study_path)
    if not series_groups:
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


@app.get("/gallery/{study_id}")
def get_study_gallery(study_id: str, background_tasks: BackgroundTasks, share_token: str = None):
    _authorize_study_access(study_id, share_token)
    study_path = os.path.join(UPLOAD_DIR, study_id)

    if not os.path.exists(study_path):
        raise HTTPException(status_code=404, detail="Study not found")

    try:
        is_converting = _is_conversion_in_progress(study_path)
        manifest_path = os.path.join(study_path, "series_manifest.json")

        if os.path.exists(manifest_path):
            return _load_gallery_from_manifest(study_path, study_id, is_converting)

        entry_count = sum(1 for e in os.scandir(study_path)
                          if e.is_file() and not e.name.endswith(
                              ('.vti', '.json', '.jpg', '.txt', '.xml', '.md')))

        if entry_count > 50:
            background_tasks.add_task(generate_study_thumbnails, study_path)
            return {
                "study_id": study_id,
                "total_series": None,
                "series": [],
                "is_converting": True,
                "scanning": True,
            }

        print(f"[Gallery] No manifest for {study_id}, scanning DICOM files...")
        return _build_gallery_from_scan(study_path, study_id, is_converting)
        
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


def _compute_density_histogram(values, bins=None, spacing=(1.0, 1.0, 1.0), study_vti: str = None) -> dict:
    scalar_values = np.asarray(values, dtype=np.float32).ravel()
    scalar_values = scalar_values[np.isfinite(scalar_values)]
    if bins is None:
        bins = np.linspace(0.0, 1.0, 33, dtype=np.float32)

    counts, bin_edges = np.histogram(scalar_values, bins=bins)
    # Density mode must classify bone candidates only. Values below ~0.30 are
    # air/soft/FOV background on normalized CBCT and were causing D4 cylinders.
    bone_candidate_min = 0.30
    d4_max = 0.3375
    d3_max = 0.4625
    d2_max = 0.5625
    d4_mask_all = (scalar_values >= bone_candidate_min) & (scalar_values < d4_max)
    d3_mask_all = (scalar_values >= d4_max) & (scalar_values < d3_max)
    d2_mask_all = (scalar_values >= d3_max) & (scalar_values < d2_max)
    d1_mask_all = scalar_values >= d2_max
    air_mask_all = scalar_values < bone_candidate_min

    d4_count = int(np.count_nonzero(d4_mask_all))
    d3_count = int(np.count_nonzero(d3_mask_all))
    d2_count = int(np.count_nonzero(d2_mask_all))
    d1_count = int(np.count_nonzero(d1_mask_all))
    air_count = int(np.count_nonzero(air_mask_all))
    total_bone = d1_count + d2_count + d3_count + d4_count
    spacing_values = tuple(float(value) for value in spacing)
    voxel_volume_mm3 = spacing_values[0] * spacing_values[1] * spacing_values[2]

    if bone_candidate_min >= d4_max or total_bone == 0:
        zero_histogram = {
            "version": DENSITY_HISTOGRAM_VERSION,
            "study_vti": study_vti,
            "bins": [float(value) for value in bin_edges.tolist()],
            "counts": [int(value) for value in counts.tolist()],
            "total_voxels": int(scalar_values.size),
            "air_voxels": air_count,
            "candidate_voxels": 0,
            "density_voxel_count": 0,
            "voxel_spacing_mm": [float(value) for value in spacing_values],
            "voxel_volume_mm3": round(voxel_volume_mm3, 4),
            "d1_pct": 0.0,
            "d2_pct": 0.0,
            "d3_pct": 0.0,
            "d4_pct": 0.0,
            "categories": {
                "D1": {
                    "label": "D1 - Dense Cortical",
                    "hu_range": ">1250 HU",
                    "normalized_threshold": ">0.5625",
                    "voxel_count": 0,
                    "volume_ml": 0.0,
                    "percentage": 0.0,
                },
                "D2": {
                    "label": "D2 - Thick Cortical, Fine Trabecular",
                    "hu_range": "850-1250 HU",
                    "normalized_threshold": "0.4625-0.5625",
                    "voxel_count": 0,
                    "volume_ml": 0.0,
                    "percentage": 0.0,
                },
                "D3": {
                    "label": "D3 - Thin Cortical, Coarse Trabecular",
                    "hu_range": "350-850 HU",
                    "normalized_threshold": "0.3375-0.4625",
                    "voxel_count": 0,
                    "volume_ml": 0.0,
                    "percentage": 0.0,
                },
                "D4": {
                    "label": "D4 - Fine Trabecular Only",
                    "hu_range": "<350 HU",
                    "normalized_threshold": "0.30-0.3375",
                    "voxel_count": 0,
                    "volume_ml": 0.0,
                    "percentage": 0.0,
                },
            },
        }
        return zero_histogram

    def pct(count) -> float:
        if total_bone == 0:
            return 0.0
        return round((count / total_bone) * 100.0, 2)

    def vol_ml(count) -> float:
        return round((count * voxel_volume_mm3) / 1000.0, 2)

    return {
        "version": DENSITY_HISTOGRAM_VERSION,
        "study_vti": study_vti,
        "bins": [float(value) for value in bin_edges.tolist()],
        "counts": [int(value) for value in counts.tolist()],
        "total_voxels": int(scalar_values.size),
        "air_voxels": air_count,
        "candidate_voxels": total_bone,
        "density_voxel_count": total_bone,
        "voxel_spacing_mm": [float(value) for value in spacing_values],
        "voxel_volume_mm3": round(voxel_volume_mm3, 4),
        "d1_pct": pct(d1_count),
        "d2_pct": pct(d2_count),
        "d3_pct": pct(d3_count),
        "d4_pct": pct(d4_count),
        "categories": {
            "D1": {
                "label": "D1 - Dense Cortical",
                "hu_range": ">1250 HU",
                "normalized_threshold": ">0.5625",
                "voxel_count": d1_count,
                "volume_ml": vol_ml(d1_count),
                "percentage": pct(d1_count),
            },
            "D2": {
                "label": "D2 - Thick Cortical, Fine Trabecular",
                "hu_range": "850-1250 HU",
                "normalized_threshold": "0.4625-0.5625",
                "voxel_count": d2_count,
                "volume_ml": vol_ml(d2_count),
                "percentage": pct(d2_count),
            },
            "D3": {
                "label": "D3 - Thin Cortical, Coarse Trabecular",
                "hu_range": "350-850 HU",
                "normalized_threshold": "0.3375-0.4625",
                "voxel_count": d3_count,
                "volume_ml": vol_ml(d3_count),
                "percentage": pct(d3_count),
            },
            "D4": {
                "label": "D4 - Fine Trabecular Only",
                "hu_range": "<350 HU",
                "normalized_threshold": "0.30-0.3375",
                "voxel_count": d4_count,
                "volume_ml": vol_ml(d4_count),
                "percentage": pct(d4_count),
            },
        },
    }


def _read_vti_scalar_values_and_spacing(vti_path: str) -> tuple[np.ndarray, tuple]:
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

    spacing = tuple(float(value) for value in image_data.GetSpacing())
    return vtk_to_numpy(scalars), spacing


def _read_vti_scalar_values(vti_path: str) -> np.ndarray:
    return _read_vti_scalar_values_and_spacing(vti_path)[0]


def _compute_density_histogram_for_vti(
    vti_path: str,
    cache_path: str = None,
    study_id: str = None,
    series_uid: str = None,
    force_refresh: bool = False,
    check_stale: bool = False,
) -> dict:
    if cache_path:
        with _density_locks_lock:
            lock = _density_locks.get(cache_path)
            if not lock:
                lock = threading.Lock()
                _density_locks[cache_path] = lock
        
        with lock:
            # Re-check cache after acquiring lock
            cached = _load_json_file(cache_path)
            if cached and cached.get("categories") and cached.get("version") == DENSITY_HISTOGRAM_VERSION and not force_refresh:
                if not check_stale:
                    return cached
                vti_mtime = os.path.getmtime(vti_path)
                cache_mtime = os.path.getmtime(cache_path) if os.path.exists(cache_path) else 0
                if cache_mtime >= vti_mtime:
                    return cached

            try:
                volume, spacing, _ = _read_vti_volume(vti_path)
                values = suppress_fov_background(volume, spacing).ravel()
            except Exception as exc:
                print(f"[Density] ROI suppression unavailable, using raw VTI values: {exc}")
                values, spacing = _read_vti_scalar_values_and_spacing(vti_path)

            result = _compute_density_histogram(values, spacing=spacing, study_vti=os.path.basename(vti_path))
            result.update({
                "study_id": study_id,
                "series_uid": series_uid,
                "vti_mtime": os.path.getmtime(vti_path),
            })

            _write_json_atomic(result, cache_path)
            print(f"[Density] Histogram computed and cached: {cache_path}")
            return result
    else:
        try:
            volume, spacing, _ = _read_vti_volume(vti_path)
            values = suppress_fov_background(volume, spacing).ravel()
        except Exception as exc:
            values, spacing = _read_vti_scalar_values_and_spacing(vti_path)

        result = _compute_density_histogram(values, spacing=spacing, study_vti=os.path.basename(vti_path))
        result.update({
            "study_id": study_id,
            "series_uid": series_uid,
            "vti_mtime": os.path.getmtime(vti_path),
        })
        return result


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


def _render_preview_png_from_volume(volume: np.ndarray, size: int = 256) -> bytes:
    try:
        from PIL import Image
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Pillow unavailable for preview rendering: {exc}") from exc

    if volume is None or getattr(volume, "ndim", 0) != 3:
        raise HTTPException(status_code=500, detail="Preview volume must be a 3D array")

    mid_index = int(volume.shape[2] // 2)
    slice_data = np.asarray(volume[:, :, mid_index], dtype=np.float32)
    finite_values = slice_data[np.isfinite(slice_data)]
    if finite_values.size == 0:
        normalized = np.zeros(slice_data.shape, dtype=np.uint8)
    else:
        low, high = np.percentile(finite_values, [2, 98])
        if not np.isfinite(low) or not np.isfinite(high) or high <= low:
            low = float(np.min(finite_values))
            high = float(np.max(finite_values))
        if high <= low:
            normalized = np.zeros(slice_data.shape, dtype=np.uint8)
        else:
            scaled = np.clip((slice_data - low) / (high - low), 0.0, 1.0)
            normalized = np.round(scaled * 255.0).astype(np.uint8)

    preview_array = np.flipud(normalized.T)
    image = Image.fromarray(preview_array, mode='L')
    resampling = getattr(getattr(Image, 'Resampling', Image), 'BILINEAR')
    image = image.resize((size, size), resample=resampling)
    output = BytesIO()
    image.save(output, format='PNG')
    return output.getvalue()


def _render_middle_axial_preview_png(vti_path: str, size: int = 256) -> bytes:
    volume, _, _ = _read_vti_volume(vti_path)
    return _render_preview_png_from_volume(volume, size=size)


@app.get("/quality/{study_id}")
def get_cbct_quality_assessment(study_id: str, series_uid: str = None, share_token: str = None):
    """
    Automated CBCT quality assessment for clinical review:
    - SNR (signal-to-noise ratio) in dB
    - Contrast-to-noise ratio
    - Streak artifact score (0–1, higher = more metal artifact)
    - FOV coverage: % of volume that is non-air
    - Histogram uniformity across slices (detects motion artifact)
    - Voxel isotropy check: warns if spacing[0] != spacing[1] != spacing[2]
    """
    _authorize_study_access(study_id, share_token)
    study_path, vti_path = _resolve_or_create_volume_path(study_id, series_uid, create_if_missing=True)
    
    volume, spacing, origin = _read_vti_volume(vti_path)
    
    # SNR: mean signal in bone region / std in air region
    bone_region = volume[volume > 0.40]
    air_region = volume[volume < 0.05]
    snr = float(np.mean(bone_region) / (np.std(air_region) + 1e-8)) if bone_region.size > 0 else 0.0
    
    # Streak artifacts: very high gradient magnitude → metal/beam hardening
    # Use finite differences on 3 sampled slices for speed
    mid = volume.shape[2] // 2
    slice_data = volume[:, :, max(0, mid - 1)]
    grad_x = np.abs(np.diff(slice_data, axis=0))
    grad_y = np.abs(np.diff(slice_data, axis=1))
    streak_score = float(np.percentile(np.concatenate([grad_x.ravel(), grad_y.ravel()]), 99))
    
    # FOV coverage
    fov_coverage = float(np.mean(volume > 0.03))
    
    # Isotropy
    sx, sy, sz = spacing
    is_isotropic = abs(sx - sy) < 0.05 and abs(sx - sz) < 0.05
    
    return {
        "study_id": study_id,
        "series_uid": series_uid,
        "snr_db": round(20 * np.log10(max(snr, 1e-8)), 2),
        "streak_artifact_score": round(min(streak_score / 0.15, 1.0), 3),
        "fov_coverage_pct": round(fov_coverage * 100, 2),
        "is_isotropic": is_isotropic,
        "voxel_spacing_mm": list(spacing),
        "quality_grade": (
            "A" if snr > 40 and streak_score < 0.05 else
            "B" if snr > 25 else
            "C" if snr > 15 else "D"
        ),
        "recommendations": [
            r for r, cond in [
                ("Rescan recommended: low SNR", snr < 15),
                ("Metal artifact reduction (MAR) advised", streak_score > 0.10),
                ("Non-isotropic voxels: MPR views may be distorted", not is_isotropic),
            ] if cond
        ],
    }


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


@app.get("/preview/{study_id}")
def get_volume_preview(study_id: str, series_uid: str = None, share_token: str = None):
    _authorize_study_access(study_id, share_token)
    _, vti_path = _resolve_or_create_volume_path(study_id, series_uid, create_if_missing=True)
    png_bytes = _render_middle_axial_preview_png(vti_path)
    return Response(
        content=png_bytes,
        media_type="image/png",
        headers={"Cache-Control": "public, max-age=300"},
    )


@app.get("/segmentation-progress/{study_id}")
async def stream_segmentation_progress(study_id: str, request: Request, share_token: str = None):
    _authorize_study_access(study_id, share_token)

    async def event_generator():
        last_payload = None
        while True:
            if await request.is_disconnected():
                break
            current = _get_conversion_progress(study_id)
            payload = json.dumps(current, sort_keys=True)
            if payload != last_payload:
                yield f"data: {payload}\n\n"
                last_payload = payload
            if current.get("status") in ("ready", "complete", "failed", "error"):
                await asyncio.sleep(0.5)
                break
            await asyncio.sleep(0.5)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.get("/density-histogram/{study_id}")
def get_bone_density_histogram(study_id: str, series_uid: str = None, share_token: str = None, refresh: bool = False, check_stale: bool = False):
    """
    Return cached Misch D1-D4 bone-density counts, percentages, and volumes.
    """
    _authorize_study_access(study_id, share_token)
    study_path, vti_path = _resolve_or_create_volume_path(study_id, series_uid, create_if_missing=True)
    safe_uid = series_uid.replace('.', '_')[:50] if series_uid else None
    cache_name = f"density_{safe_uid}.json" if safe_uid else "density_default.json"
    cache_path = os.path.join(study_path, cache_name)

    if not refresh and not check_stale:
        cached = _load_json_file(cache_path)
        if cached and cached.get("categories") and cached.get("version") == DENSITY_HISTOGRAM_VERSION:
            return cached

    try:
        return _compute_density_histogram_for_vti(vti_path, cache_path, study_id, series_uid, force_refresh=refresh, check_stale=check_stale)
    except Exception as exc:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Density computation failed: {exc}")


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
    request: Request,
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

    run_id = request.headers.get("x-benchmark-run-id")
    case_id = request.headers.get("x-benchmark-case-id")
    iteration = request.headers.get("x-benchmark-iteration")

    try:
        generate_study_thumbnails(study_path, force=force)
    except Exception as thumb_error:
        print(f"[THUMB] Pre-generation failed for {study_id}: {thumb_error}")
    
    # Run conversion in background so the upload response returns immediately
    background_tasks.add_task(
        _ensure_vti_conversion_singleflight,
        study_path,
        force,
        True,
        segment,
        quality,
        run_id,
        case_id,
        iteration
    )
    
    return {
        "status": "converting",
        "study_id": study_id,
        "message": "VTI conversion started in background",
        "segment": segment,
        "quality": quality,
    }


@app.get("/instances/{study_id}/{series_uid}")
def get_series_instances(study_id: str, series_uid: str, share_token: str = None):
    """
    Return per-instance metadata for a series, including real SOPInstanceUIDs.
    
    SOURCE_KIND values:
      - DICOM:      native .dcm file with full DICOM metadata
      - STATIC_JPG: pre-rendered JPEG (from vti_converter image_{safe_uid}.jpg)
      - STATIC_PNG: standalone PNG/JPEG image file in study folder
      - MORITA:     J. Morita proprietary format
    
    For each instance, the response includes:
      - sop_instance_uid: real UID from DICOM tag, or stable hash for static files
      - instance_number: from DICOM InstanceNumber, or positional index
      - image_index: zero-based position within the series
      - source_kind: DICOM | STATIC_JPG | STATIC_PNG | MORITA
      - source_path: relative path within study folder (for pixel-perfect routing)
      - source_instance_key: canonical key matching xCoreAnalysisCaseDomain logic
      - width / height: from DICOM tags or actual image size
      - thumbnail_url: pre-generated thumb or on-demand endpoint
    """
    _authorize_study_access(study_id, share_token)
    study_path = os.path.join(UPLOAD_DIR, study_id)
    if not os.path.exists(study_path):
        raise HTTPException(status_code=404, detail="Study not found")

    safe_uid = series_uid.replace('.', '_')[:50]
    instances = []

    # --- Strategy 1: Manifest-driven DICOM series ---
    manifest_path = os.path.join(study_path, "series_manifest.json")
    if os.path.exists(manifest_path):
        try:
            with open(manifest_path, 'r') as f:
                series_cards = json.load(f)
            manifest_series = next(
                (card for card in series_cards if card.get('series_uid') == series_uid), None
            )
            if manifest_series:
                classification = manifest_series.get('classification', '2D')
                modality = manifest_series.get('modality', 'DX')
                
                if classification == '2D':
                    # For 2D series: scan DICOM files to get real SOPInstanceUIDs
                    try:
                        dicom_files = []
                        for ext in ('*.dcm', '*.DCM', '*.dcom', '*.DCOM', '*.ima', '*.IMA'):
                            dicom_files.extend(
                                glob.glob(os.path.join(study_path, '**', ext), recursive=True)
                            )
                        # Also scan extensionless files
                        for root, _, files in os.walk(study_path):
                            for fname in files:
                                fp = os.path.join(root, fname)
                                _, ext = os.path.splitext(fname)
                                if not ext or fname.replace('.', '').isdigit():
                                    dicom_files.append(fp)
                        
                        dicom_files = sorted(set(dicom_files))
                        
                        # Filter to this series
                        series_files = []
                        for fp in dicom_files:
                            try:
                                import pydicom
                                ds = pydicom.dcmread(fp, stop_before_pixels=True, force=True)
                                s_uid = str(getattr(ds, 'SeriesInstanceUID', ''))
                                if s_uid == series_uid:
                                    inst_num = int(getattr(ds, 'InstanceNumber', 0))
                                    sop_uid = str(getattr(ds, 'SOPInstanceUID', ''))
                                    rows = int(getattr(ds, 'Rows', 0))
                                    cols = int(getattr(ds, 'Columns', 0))
                                    series_files.append((inst_num, fp, sop_uid, rows, cols))
                            except Exception:
                                continue
                        
                        series_files.sort(key=lambda x: x[0])
                        
                        for idx, (inst_num, fp, sop_uid, rows, cols) in enumerate(series_files):
                            rel_path = os.path.relpath(fp, study_path)
                            if sop_uid:
                                source_instance_key = f"sop:{sop_uid}"
                            else:
                                source_instance_key = f"series:{series_uid}:image:{idx}"
                                sop_uid = None
                            instances.append({
                                "sop_instance_uid": sop_uid or None,
                                "instance_number": inst_num or (idx + 1),
                                "image_index": idx,
                                "frame_count": 1,
                                "source_kind": "DICOM",
                                "source_path": rel_path,
                                "source_instance_key": source_instance_key,
                                "width": cols or 1200,
                                "height": rows or 1600,
                                "modality": modality,
                                "thumbnail_url": f"/thumb/{study_id}/{series_uid}?index={idx}",
                                "display_label": f"Image {inst_num or idx + 1}",
                            })
                    except Exception as dicom_err:
                        print(f"[Instances] DICOM scan failed for {study_id}/{series_uid}: {dicom_err}")
                
                if not instances:
                    # Fallback: check for pre-rendered static image
                    static_img_path = os.path.join(study_path, f"image_{safe_uid}.jpg")
                    if os.path.exists(static_img_path):
                        import hashlib
                        file_hash = hashlib.sha256(f"{study_id}:{series_uid}:image".encode()).hexdigest()[:32]
                        source_instance_key = f"series:{series_uid}:image:0"
                        instances.append({
                            "sop_instance_uid": None,
                            "instance_number": 1,
                            "image_index": 0,
                            "frame_count": 1,
                            "source_kind": "STATIC_JPG",
                            "source_path": f"image_{safe_uid}.jpg",
                            "source_instance_key": source_instance_key,
                            "width": 1200,
                            "height": 1600,
                            "modality": modality,
                            "thumbnail_url": f"/thumb/{study_id}/{series_uid}",
                            "display_label": "Image 1",
                        })
        except Exception as manifest_err:
            print(f"[Instances] Manifest read failed for {study_id}/{series_uid}: {manifest_err}")

    # --- Strategy 2: Scan for standalone static image files (PNG/JPG) ---
    if not instances:
        static_extensions = ['.png', '.jpg', '.jpeg', '.PNG', '.JPG', '.JPEG']
        static_files = []
        for ext in static_extensions:
            static_files.extend(glob.glob(os.path.join(study_path, f'*{ext}')))
        static_files = sorted(set(static_files))
        
        for idx, fp in enumerate(static_files):
            fname = os.path.basename(fp)
            rel_path = os.path.relpath(fp, study_path)
            import hashlib
            file_hash = hashlib.sha256(f"{study_id}:{series_uid}:{fname}".encode()).hexdigest()[:16]
            source_instance_key = f"series:{series_uid}:image:{idx}"
            instances.append({
                "sop_instance_uid": None,
                "instance_number": idx + 1,
                "image_index": idx,
                "frame_count": 1,
                "source_kind": "STATIC_PNG",
                "source_path": rel_path,
                "source_instance_key": source_instance_key,
                "width": 0,
                "height": 0,
                "modality": "DX",
                "thumbnail_url": f"/thumb/{study_id}/{series_uid}?index={idx}",
                "display_label": fname,
            })

    # --- Strategy 3: Morita handler detection ---
    if not instances:
        try:
            from services.morita_handler import MoritaHandler
            morita = MoritaHandler(study_path)
            if morita.is_morita_study():
                morita_images = morita.list_images()
                for idx, img_info in enumerate(morita_images):
                    source_instance_key = f"series:{series_uid}:image:{idx}"
                    instances.append({
                        "sop_instance_uid": None,
                        "instance_number": idx + 1,
                        "image_index": idx,
                        "frame_count": 1,
                        "source_kind": "MORITA",
                        "source_path": img_info.get('path', ''),
                        "source_instance_key": source_instance_key,
                        "width": img_info.get('width', 0),
                        "height": img_info.get('height', 0),
                        "modality": "DX",
                        "thumbnail_url": f"/thumb/{study_id}/{series_uid}?index={idx}",
                        "display_label": img_info.get('label', f"Image {idx + 1}"),
                    })
        except Exception:
            pass

    # --- Fallback: single synthesized instance for 3D volumes (slice-based) ---
    if not instances:
        source_instance_key = f"series:{series_uid}:legacy"
        instances.append({
            "sop_instance_uid": None,
            "instance_number": 1,
            "image_index": 0,
            "frame_count": 1,
            "source_kind": "DICOM",
            "source_path": "",
            "source_instance_key": source_instance_key,
            "width": 0,
            "height": 0,
            "modality": "CT",
            "thumbnail_url": f"/thumb/{study_id}/{series_uid}",
            "display_label": "Volume",
        })

    return {
        "study_id": study_id,
        "series_uid": series_uid,
        "instances": instances,
        "total": len(instances),
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
def stream_slice(
    study_id: str,
    view: str,
    index: int,
    request: Request,
    series_uid: str = None,
    share_token: str = None
):
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

        run_id = request.headers.get("x-benchmark-run-id") or request.query_params.get("x-benchmark-run-id")
        if run_id:
            log_python_event(run_id, 'slice_render_start', {
                "studyId": study_id,
                "view": view,
                "index": index,
                "seriesUid": series_uid
            })
            notify_backend_callback(run_id, 'slice_render_start', {
                "studyId": study_id,
                "view": view,
                "index": index,
                "seriesUid": series_uid
            })

        start_time = time.time()
        image_bytes, headers = handler.get_slice(view, index)
        duration = time.time() - start_time
            
        if run_id:
            log_python_event(run_id, 'slice_render_end', {
                "studyId": study_id,
                "view": view,
                "index": index,
                "seriesUid": series_uid,
                "latency_seconds": duration
            })
            notify_backend_callback(run_id, 'slice_render_end', {
                "studyId": study_id,
                "view": view,
                "index": index,
                "seriesUid": series_uid,
                "latency_seconds": duration
            })

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
