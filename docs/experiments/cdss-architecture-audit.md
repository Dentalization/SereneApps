# CDSS Architecture Audit: Baseline Execution Path for A/B/C Comparative Study

> **Audit Mode:** READ-ONLY inspection. No application code, configuration files, or database states were modified.  
> **Target Scope:** SereneApps CDSS execution pipeline (Node.js/Express backend, FastAPI Python CDSS service, and test/benchmark assets).  
> **Date of Audit:** October 3, 2026.

---

## 1. Executive Summary

Today, the repository hosts two distinct CDSS-related pipelines rather than a single monolithic scoring route. The primary dental CBCT/imaging CDSS path operates under `POST /v1/x-core/upload` in Express, saving DICOM/CBCT files to disk, synchronously executing a local Python parsing script, committing study metadata to PostgreSQL via Prisma, and dispatching a fire-and-forget HTTP `POST /convert/{study_id}` call to an internal FastAPI service (`x-core-streamer` on port 8000). Express returns HTTP 200 (not 202). FastAPI receives the trigger, synchronously runs thumbnail generation, and then schedules volume conversion/segmentation using Starlette `BackgroundTasks` via a synchronous `def` function executed in a worker thread with per-study singleflight locking. The client polls conversion readiness via FastAPI's `GET /status/{study_id}`. A secondary 2D clinical photography pipeline operates under `POST /v1/cases/:id/images/:imgId/analyze` via raw SQL and an adapter to DeepDental. No message brokers, Redis, Celery, calibrated neural network weights, or `POST /v1/score` routes exist anywhere in the codebase.

---

## 2. Findings by Section

### Section 1: Image Upload Request Path

#### 1.1 Route Identification (`POST /v1/score` vs `/v1/x-core`)
- **Route `/v1/score`:** `NOT FOUND` across the entire codebase, route tables, git commits, and documentation.
- **Route `/v1/x-core`:** **EXISTS**. Mounted in Express at [`backend/src/server.js:355`](file:///Users/adrianhalim/SereneApps/backend/src/server.js#L355) via:
  ```javascript
  app.use(`${prefix}/x-core`, xCoreRouter);
  ```
  Where `prefix = '/v1'` ([`backend/src/server.js:325`](file:///Users/adrianhalim/SereneApps/backend/src/server.js#L325)).
- **Dental-Image Submission Route:** The actual route for DICOM/CBCT study upload is `POST /v1/x-core/upload` ([`backend/src/routes/xCoreRoutes.js:123`](file:///Users/adrianhalim/SereneApps/backend/src/routes/xCoreRoutes.js#L123)).
- **Auxiliary CDSS Routes:**
  - `POST /v1/x-core/analyze` ([`backend/src/routes/xCoreRoutes.js:142`](file:///Users/adrianhalim/SereneApps/backend/src/routes/xCoreRoutes.js#L142)): Mock YOLOv8 delay and static findings stub ([`backend/src/controllers/xCoreAIController.js:3-64`](file:///Users/adrianhalim/SereneApps/backend/src/controllers/xCoreAIController.js#L3-L64)).
  - `POST /v1/cases/:caseId/images` ([`backend/src/routes/verified-cases.js:185`](file:///Users/adrianhalim/SereneApps/backend/src/routes/verified-cases.js#L185)): Verified Case 2D photo upload.
  - `POST /v1/cases/:caseId/images/:imageId/analyze` ([`backend/src/routes/verified-cases.js:226`](file:///Users/adrianhalim/SereneApps/backend/src/routes/verified-cases.js#L226)): Verified Case 2D DeepDental analysis trigger.

#### 1.2 Full Request Hop Trace
1. **Router:** Express router receives `POST /v1/x-core/upload` ([`backend/src/routes/xCoreRoutes.js:123`](file:///Users/adrianhalim/SereneApps/backend/src/routes/xCoreRoutes.js#L123)).
2. **Middleware 1 (CORS & Body):** `cors(corsOptions)` ([`backend/src/server.js:143`](file:///Users/adrianhalim/SereneApps/backend/src/server.js#L143)), `express.json({ limit: '512kb' })` ([`backend/src/server.js:150`](file:///Users/adrianhalim/SereneApps/backend/src/server.js#L150)).
3. **Middleware 2 (Authentication):** `authMiddleware` ([`backend/src/routes/xCoreRoutes.js:104`](file:///Users/adrianhalim/SereneApps/backend/src/routes/xCoreRoutes.js#L104), defined in [`backend/src/middleware/clinicAuth.js:11-65`](file:///Users/adrianhalim/SereneApps/backend/src/middleware/clinicAuth.js#L11-L65)), verifies JWT from `Authorization: Bearer <token>`, fetches user from Prisma, attaches `req.user`.
4. **Middleware 3 (Role Authorization):** `requireRoles(['dentist'])` ([`backend/src/routes/xCoreRoutes.js:123`](file:///Users/adrianhalim/SereneApps/backend/src/routes/xCoreRoutes.js#L123), defined in [`backend/src/middleware/clinicAuth.js:71-90`](file:///Users/adrianhalim/SereneApps/backend/src/middleware/clinicAuth.js#L71-L90)).
5. **Middleware 4 (Multer Upload):** `upload.array('files')` ([`backend/src/routes/xCoreRoutes.js:82, 123`](file:///Users/adrianhalim/SereneApps/backend/src/routes/xCoreRoutes.js#L82)), writes multipart files to temporary directory `backend/uploads/temp/` with UUID file names ([`backend/src/routes/xCoreRoutes.js:69-80`](file:///Users/adrianhalim/SereneApps/backend/src/routes/xCoreRoutes.js#L69-L80)).
6. **Controller:** `uploadStudy` ([`backend/src/controllers/xCoreController.js:185`](file:///Users/adrianhalim/SereneApps/backend/src/controllers/xCoreController.js#L185)).
7. **Storage Migration:** Creates folder `backend/uploads/x-core/${batchId}` where `batchId = Date.now().toString()`, skips hidden files, and calls `fs.renameSync` for each file ([`backend/src/controllers/xCoreController.js:274-295`](file:///Users/adrianhalim/SereneApps/backend/src/controllers/xCoreController.js#L274-L295)).
8. **Service / Python Metadata Extraction:** Synchronously executes `python3 scripts/parse_dental_study.py <studyDir>` via child process `execAsync` ([`backend/src/controllers/xCoreController.js:304`](file:///Users/adrianhalim/SereneApps/backend/src/controllers/xCoreController.js#L304)).
9. **Database Write:** Executes a Prisma transaction `prisma.$transaction` creating an `ImagingStudy` record, optional `ImagingStudyPatientAssignment`, series records in `ImagingSeries`, and updates `DentistProfile.storage_usage` ([`backend/src/controllers/xCoreController.js:327-396`](file:///Users/adrianhalim/SereneApps/backend/src/controllers/xCoreController.js#L327-L396)).
10. **Async Background Dispatch:** Launches unawaited `fetch(`${PY_SERVICE_BASE_URL}/convert/${batchId}`, { method: 'POST' })` ([`backend/src/controllers/xCoreController.js:425-434`](file:///Users/adrianhalim/SereneApps/backend/src/controllers/xCoreController.js#L425-L434)).
11. **Response:** Synchronous `res.json(response)` returning HTTP 200 OK ([`backend/src/controllers/xCoreController.js:436`](file:///Users/adrianhalim/SereneApps/backend/src/controllers/xCoreController.js#L436)).

#### 1.3 Validations Performed
- **File presence:** Checked in controller: `if (!req.files || req.files.length === 0)` ([`backend/src/controllers/xCoreController.js:187-189`](file:///Users/adrianhalim/SereneApps/backend/src/controllers/xCoreController.js#L187-L189)).
- **File type:** Multer upload for `uploadStudy` has **no fileFilter** ([`backend/src/routes/xCoreRoutes.js:82`](file:///Users/adrianhalim/SereneApps/backend/src/routes/xCoreRoutes.js#L82)). File filtering/modality inference occurs downstream in Python script [`backend/scripts/parse_dental_study.py:125-248`](file:///Users/adrianhalim/SereneApps/backend/scripts/parse_dental_study.py#L125-L248) (recognizes `.vol`, `.slx`, `.bmp`, `.dcm`, `.dcom`, `.dicom`, `.ima`, extensionless DICM magic header, `.jpg`, `.jpeg`, `.tif`, `.tiff`, `.png`).
- **File size & quota:** No multer `limits.fileSize` on study upload. Storage quota validation is evaluated in controller: `currentUsage + uploadSize > limit` (default limit `10737418240n` = 10 GB) ([`backend/src/controllers/xCoreController.js:245-257`](file:///Users/adrianhalim/SereneApps/backend/src/controllers/xCoreController.js#L245-L257)).
- **Auth & Appointment Scoping:**
  - Token verified by `authMiddleware` ([`backend/src/middleware/clinicAuth.js:19`](file:///Users/adrianhalim/SereneApps/backend/src/middleware/clinicAuth.js#L19)).
  - Role `dentist` verified by `requireRoles(['dentist'])` ([`backend/src/routes/xCoreRoutes.js:123`](file:///Users/adrianhalim/SereneApps/backend/src/routes/xCoreRoutes.js#L123)).
  - Appointment scoping: If `patientId` is provided in body, `requireDentistPatientRelationship` validates that an active appointment exists in PostgreSQL linking `dentistId` and `patientId` ([`backend/src/controllers/xCoreController.js:261-265`](file:///Users/adrianhalim/SereneApps/backend/src/controllers/xCoreController.js#L261-L265) and [`backend/src/services/xCoreAccessPolicyService.js:97-131`](file:///Users/adrianhalim/SereneApps/backend/src/services/xCoreAccessPolicyService.js#L97-L131)).

#### 1.4 Storage Details
- **Temp Storage:** `backend/uploads/temp/<randomUUID>` via `multer.diskStorage` ([`backend/src/routes/xCoreRoutes.js:69-80`](file:///Users/adrianhalim/SereneApps/backend/src/routes/xCoreRoutes.js#L69-L80)).
- **Permanent Local Storage:** `backend/uploads/x-core/<batchId>/<originalFilename>` where `batchId = Date.now().toString()` ([`backend/src/controllers/xCoreController.js:33, 274-286`](file:///Users/adrianhalim/SereneApps/backend/src/controllers/xCoreController.js#L33)).
- **Object Storage Adapter:** None used for X-Core studies (direct local filesystem `fs.renameSync`). Local object storage adapter exists only for Verified Case Workspace (`createLocalImageStorageAdapter` in [`backend/src/services/verifiedCaseImageStorage.js:65`](file:///Users/adrianhalim/SereneApps/backend/src/services/verifiedCaseImageStorage.js#L65)).

#### 1.5 Response Status Codes and Body Shapes

| Condition | Status Code | Body Shape | Evidence |
|---|---|---|---|
| Success | `200 OK` | Full serialized `ImagingStudy` JSON (including `id`, `patientId`, `modality`, `folderName`, `status: 'processed'`, `metadata`, `sizeInBytes`, `series`) | [`backend/src/controllers/xCoreController.js:436`](file:///Users/adrianhalim/SereneApps/backend/src/controllers/xCoreController.js#L436) |
| Missing files | `400 Bad Request` | `{"error": "No files uploaded"}` | [`backend/src/controllers/xCoreController.js:188`](file:///Users/adrianhalim/SereneApps/backend/src/controllers/xCoreController.js#L188) |
| Invalid patientId | `400 Bad Request` | `{"error": "Invalid patientId", "code": "invalid_patient_id"}` | [`backend/src/controllers/xCoreController.js:203`](file:///Users/adrianhalim/SereneApps/backend/src/controllers/xCoreController.js#L203) |
| Python parse failure | `400 Bad Request` | `{"error": <parseResult.error>}` | [`backend/src/controllers/xCoreController.js:319`](file:///Users/adrianhalim/SereneApps/backend/src/controllers/xCoreController.js#L319) |
| Missing token | `401 Unauthorized` | `{"error": "Access token required"}` | [`backend/src/middleware/clinicAuth.js:16`](file:///Users/adrianhalim/SereneApps/backend/src/middleware/clinicAuth.js#L16) |
| Invalid token | `401 Unauthorized` | `{"error": "Invalid token"}` | [`backend/src/middleware/clinicAuth.js:47`](file:///Users/adrianhalim/SereneApps/backend/src/middleware/clinicAuth.js#L47) |
| Non-dentist role | `403 Forbidden` | `{"error": "Insufficient permissions", "required": ["dentist"], "current": [...]}` | [`backend/src/middleware/clinicAuth.js:81-85`](file:///Users/adrianhalim/SereneApps/backend/src/middleware/clinicAuth.js#L81-L85) |
| Storage quota exceeded | `403 Forbidden` | `{"error": "Storage quota exceeded", "details": "Upload size: ... Remaining: ..."}` | [`backend/src/controllers/xCoreController.js:252-255`](file:///Users/adrianhalim/SereneApps/backend/src/controllers/xCoreController.js#L252-L255) |
| No appointment link | `403 Forbidden` | `{"error": "Patient must have an appointment relationship with this dentist"}` | [`backend/src/services/xCoreAccessPolicyService.js:122`](file:///Users/adrianhalim/SereneApps/backend/src/services/xCoreAccessPolicyService.js#L122) |
| Python script JSON crash | `500 Internal Server Error` | `{"error": "Failed to parse study metadata", "details": "<stdout>"}` | [`backend/src/controllers/xCoreController.js:315`](file:///Users/adrianhalim/SereneApps/backend/src/controllers/xCoreController.js#L315) |
| Unhandled server error | `500 Internal Server Error` | `{"error": "Internal Server Error"}` | [`backend/src/controllers/xCoreController.js:440`](file:///Users/adrianhalim/SereneApps/backend/src/controllers/xCoreController.js#L440) |

---

### Section 2: Node → FastAPI Integration

- **HTTP Client Library:** Built-in global Node.js `fetch` ([`backend/src/controllers/xCoreController.js:425`](file:///Users/adrianhalim/SereneApps/backend/src/controllers/xCoreController.js#L425)). Note: `/py-api` proxy uses `node-fetch` ([`backend/src/server.js:221`](file:///Users/adrianhalim/SereneApps/backend/src/server.js#L221)).
- **URL Source:** Environment variable `XCORE_PY_API_BASE_URL`, defaulting to `http://127.0.0.1:8000` ([`backend/src/controllers/xCoreController.js:34`](file:///Users/adrianhalim/SereneApps/backend/src/controllers/xCoreController.js#L34)).
- **Timeout Configuration:** **NONE**. The fetch call in `xCoreController.js:425-428` does not provide an `AbortSignal.timeout()` or signal. (Contrast with `getSeriesInstances` which explicitly sets `AbortSignal.timeout(8000)` at [`backend/src/controllers/xCoreController.js:663`](file:///Users/adrianhalim/SereneApps/backend/src/controllers/xCoreController.js#L663)).
- **Retry Mechanism:** **NONE**. Failures are caught with `.catch(err => console.warn(...))` and ignored as non-critical ([`backend/src/controllers/xCoreController.js:431`](file:///Users/adrianhalim/SereneApps/backend/src/controllers/xCoreController.js#L431)).
- **Await vs Return Behavior:** Node **does NOT await** the CDSS call. It initiates `fetch(...).then(...).catch(...)` as a fire-and-forget background promise and immediately returns `res.json(response)` ([`backend/src/controllers/xCoreController.js:418-436`](file:///Users/adrianhalim/SereneApps/backend/src/controllers/xCoreController.js#L418-L436)).
- **HTTP 202 Origin:** `NOT FOUND`. Neither Node nor FastAPI issues HTTP 202. Node returns HTTP 200 ([`backend/src/controllers/xCoreController.js:436`](file:///Users/adrianhalim/SereneApps/backend/src/controllers/xCoreController.js#L436)); FastAPI returns HTTP 200 with JSON `{"status": "converting", ...}` ([`backend/python_service/main.py:1670-1676`](file:///Users/adrianhalim/SereneApps/backend/python_service/main.py#L1670-L1676)).
- **Payload Passed to FastAPI:** Only the URL path parameter `study_id` (the folder name/`batchId`), plus optional benchmark headers (`x-benchmark-run-id`, `x-benchmark-case-id`, `x-benchmark-iteration`) ([`backend/src/controllers/xCoreController.js:420-428`](file:///Users/adrianhalim/SereneApps/backend/src/controllers/xCoreController.js#L420-L428)). **No file bytes, request body, file paths, or patient metadata are transmitted over HTTP**; FastAPI resolves files from the shared disk volume `backend/uploads/x-core/${study_id}` ([`backend/python_service/main.py:126, 1635`](file:///Users/adrianhalim/SereneApps/backend/python_service/main.py#L126)).

---

### Section 3: FastAPI CDSS Service

#### 3.1 Endpoints Exposed (30 Total)
All endpoints are declared in [`backend/python_service/main.py`](file:///Users/adrianhalim/SereneApps/backend/python_service/main.py):

| Method | Path | Line | Description |
|---|---|---|---|
| `GET` | `/health` | 624 | Health check (`x-core-streamer`) |
| `GET` | `/api/v1/health` | 629 | Versioned health check |
| `GET` | `/api/v1/sessions` | 634 | Active sessions counter |
| `WEBSOCKET` | `/ws/conversion-status` | 646 | Real-time WebSocket conversion progress events |
| `GET` | `/gallery/{study_id}` | 772 | Study gallery cards with lazy thumbnail generation |
| `GET` | `/status/{study_id}` | 810 | Polling endpoint for conversion readiness |
| `GET` | `/thumbnail/{study_id}/{series_uid}` | 840 | On-demand thumbnail rendering |
| `GET` | `/quality/{study_id}` | 1196 | CBCT image quality assessment (SNR, streak artifacts) |
| `HEAD` | `/volume/{study_id}` | 1255 | Volume VTI file presence and size check |
| `GET` | `/volume/{study_id}` | 1262 | Stream or download `.vti` volume (range requests) |
| `GET` | `/preview/{study_id}` | 1281 | PNG thumbnail preview of volume |
| `GET` | `/segmentation-progress/{study_id}`| 1293 | SSE stream for segmentation progress |
| `GET` | `/density-histogram/{study_id}` | 1323 | Bone density (D1–D4) distribution histogram |
| `GET` | `/nerve-canal/{study_id}` | 1347 | Heuristic mandibular canal extraction |
| `GET` | `/ai-findings/{study_id}` | 1375 | Summary of AI findings (canal, density, labels) |
| `GET` | `/labels/{study_id}` | 1423 | Stream or download `labels.vti` labelmap |
| `GET` | `/labels-manifest/{study_id}` | 1468 | Read segmentation manifest `labels.json` |
| `GET` | `/image/{study_id}/{series_uid}` | 1492 | Get 2D JPEG rendered slice |
| `GET` | `/thumb/{study_id}/{series_uid}` | 1554 | Get 2D thumbnail image |
| `GET` | `/volume-status/{study_id}` | 1603 | Check if `volume.vti` exists and byte size |
| `POST` | `/convert/{study_id}` | 1622 | Main trigger for background VTI conversion & segmentation |
| `GET` | `/instances/{study_id}/{series_uid}`| 1679 | Detailed instance metadata from DICOM headers |
| `GET` | `/series/{study_id}` | 1882 | List series in study |
| `GET` | `/stream/{study_id}/{view}/{index}` | 1919 | Dynamic orthographic MPR slice streamer |
| `GET` | `/metadata/{study_id}` | 1992 | Full study metadata dump |
| `GET` | `/sr/{study_id}` | 2053 | DICOM Structured Report (SR) parser |
| `POST` | `/reconstruct/3d-scan` | 2153 | Intraoral 3D video sparse SfM reconstruction |
| `POST` | `/lidra/analyze` | 2175 | LIDRA video frame quality assessment |
| `POST` | `/segment/tooth-instances` | 2198 | Tooth mesh segmentation (returns 409 validation required) |
| `GET` | `/segment/tooth-instances/{folder}`| 2214 | Get tooth instances (returns 409 legacy blocked) |

#### 3.2 `BackgroundTasks` Usage
- **Endpoint:** `POST /convert/{study_id}` ([`backend/python_service/main.py:1622`](file:///Users/adrianhalim/SereneApps/backend/python_service/main.py#L1622)).
- **Scheduled Function:** `_ensure_vti_conversion_singleflight` ([`backend/python_service/main.py:1659`](file:///Users/adrianhalim/SereneApps/backend/python_service/main.py#L1659)).
- **Function Type:** **Synchronous `def`** (line 510), **NOT `async def`**:
  ```python
  def _ensure_vti_conversion_singleflight(study_path: str, force: bool = False, wait: bool = True, ...)
  ```
- **Concurrency Implication:** Because the scheduled task is declared as synchronous `def`, Starlette/FastAPI executes it inside an external worker threadpool via `anyio.to_thread.run_sync`. It **does not block the asyncio event loop** for incoming I/O; however, heavy Python/NumPy routines hold the Global Interpreter Lock (GIL) and compete for CPU cores.
- **Secondary Usage:** `GET /gallery/{study_id}` schedules `generate_study_thumbnails` (also a synchronous `def`) via `BackgroundTasks` if slice count > 50 ([`backend/python_service/main.py:792`](file:///Users/adrianhalim/SereneApps/backend/python_service/main.py#L792)).

#### 3.3 Server Configuration and Startup
- **Uvicorn Invocation in Code:**
  ```python
  if __name__ == "__main__":
      uvicorn.run(app, host="0.0.0.0", port=8000)
  ```
  ([`backend/python_service/main.py:2223-2224`](file:///Users/adrianhalim/SereneApps/backend/python_service/main.py#L2223-L2224)).
  Workers parameter is unconfigured; defaults to **1 single-process worker**.
- **Launcher Scripts:**
  - Automated launcher: [`backend/scripts/start-scan3d-local.mjs:32-34`](file:///Users/adrianhalim/SereneApps/backend/scripts/start-scan3d-local.mjs#L32-L34) spawns:
    `uvicorn main:app --app-dir python_service --host 127.0.0.1 --port 8000`.
  - No Procfile, Makefile, or Dockerfile exists specifically dedicated to `python_service`.

#### 3.4 Model Loading, Weights, and Framework
- **Model Loading:** `NOT APPLICABLE` / `NOT FOUND`. No trained deep learning model weights (PyTorch `.pt`/`.pth`, ONNX `.onnx`, TensorFlow `.pb`/`.h5`, Safetensors) exist in the repository.
- **Framework & Hardware:**
  - MONAI transforms and PyTorch CPU tensors are used strictly for spatial resampling, intensity normalization, and tensor conversions ([`backend/python_service/services/vti_converter.py:585-623`](file:///Users/adrianhalim/SereneApps/backend/python_service/services/vti_converter.py#L585-L623)).
  - Execution is strictly **CPU-bound**. No CUDA or MPS initialization code exists.
  - Algorithms are rule-based and heuristic: Otsu/bone density thresholding (`ScaleIntensityRange`), mathematical morphology (SciPy binary erosion/dilation), connected component analysis (`scipy.ndimage.label`), and geometric centerline tracing for mandibular canals ([`backend/python_service/services/vti_converter.py:672-863, 1086-1171`](file:///Users/adrianhalim/SereneApps/backend/python_service/services/vti_converter.py#L672-L863)).

#### 3.5 Concurrency Controls
- **In-Memory Singleflight Lock:** `_conversion_state_lock = threading.Lock()` protects `_conversion_events` map ([`backend/python_service/main.py:132-136, 534-550`](file:///Users/adrianhalim/SereneApps/backend/python_service/main.py#L132-L136)). Prevents duplicate conversion threads for the exact same study path.
- **Inter-Study Concurrency:** **NONE**. No semaphore, bounded queue, or threadpool size limits are defined. Multiple simultaneous distinct `study_id` upload requests spawn concurrent background threads up to Starlette's threadpool default limit (40 threads).
- **Process Lock for 3D Video:** `fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)` on `.reconstruction.lock` in [`backend/python_service/main.py:2140-2143`](file:///Users/adrianhalim/SereneApps/backend/python_service/main.py#L2140-L2143).

#### 3.6 Preprocessing Steps
Executed in [`backend/python_service/services/vti_converter.py:481-690`](file:///Users/adrianhalim/SereneApps/backend/python_service/services/vti_converter.py#L481-L690):
1. **DICOM Voxel Stacking & Rescaling:** Reads slices via `pydicom`, sorts by slice location / instance number, applies RescaleSlope/Intercept to convert to Hounsfield Units (HU) ([`backend/python_service/services/vti_converter.py:248-329`](file:///Users/adrianhalim/SereneApps/backend/python_service/services/vti_converter.py#L248-L329)).
2. **Affine & Orientation Construction:** Constructs affine matrix and applies MONAI `Orientation("RAS")` to align patient axes ([`backend/python_service/services/vti_converter.py:573-574`](file:///Users/adrianhalim/SereneApps/backend/python_service/services/vti_converter.py#L573-L574)).
3. **Resampling:** MONAI `Spacing(target=(0.5, 0.5, 0.5))` resamples isotropic voxels ([`backend/python_service/services/vti_converter.py:575`](file:///Users/adrianhalim/SereneApps/backend/python_service/services/vti_converter.py#L575)).
4. **Intensity Scaling:** MONAI `ScaleIntensityRange(a_min=-1000, a_max=3000, b_min=0.0, b_max=1.0, clip=True)` normalizes voxel values ([`backend/python_service/services/vti_converter.py:576`](file:///Users/adrianhalim/SereneApps/backend/python_service/services/vti_converter.py#L576)).
5. **Foreground Cropping:** `CropForeground(threshold=0.05, margin=...)` strips dead air ([`backend/python_service/services/vti_converter.py:577`](file:///Users/adrianhalim/SereneApps/backend/python_service/services/vti_converter.py#L577)).
6. **Field-of-View Background Suppression:** `suppress_fov_background()` zeroes scanner cylinder artifacts outside elliptical bone mask ([`backend/python_service/services/vti_converter.py:481-560`](file:///Users/adrianhalim/SereneApps/backend/python_service/services/vti_converter.py#L481-L560)).

---

### Section 4: Job State, Status, and Result

#### 4.1 Storage of Job Status
- **PostgreSQL Database:** Prisma model `ImagingStudy` (`imaging_studies` table) stores `status` (`String @default("uploading")`) and `metadata` (`Json?`) ([`backend/prisma/schema.prisma:1381-1411`](file:///Users/adrianhalim/SereneApps/backend/prisma/schema.prisma#L1381-L1411)).
  *Critical Finding:* Node initializes `ImagingStudy.status` to `'processed'` immediately upon upload ([`backend/src/controllers/xCoreController.js:349`](file:///Users/adrianhalim/SereneApps/backend/src/controllers/xCoreController.js#L349)). It is **never updated** to reflect Python VTI conversion progress or errors.
- **Filesystem Artifacts:** Conversion completion is determined by physical file presence:
  - `uploads/x-core/<study_id>/volume.vti`
  - `uploads/x-core/<study_id>/series_manifest.json`
  - `uploads/x-core/<study_id>/labels.vti` and `labels.json`
- **FastAPI In-Memory State:** Active conversion state is stored in memory dictionaries: `_conversion_events`, `_conversion_failures`, `_conversion_waiters`, `_conversion_progress` ([`backend/python_service/main.py:133-136`](file:///Users/adrianhalim/SereneApps/backend/python_service/main.py#L133-L136)).

#### 4.2 Job State Machine
In Python FastAPI (`GET /status/{study_id}`):
```
[Unuploaded / Missing] --> 404 Study not found
       |
       v (files moved to disk)
   "pending" (volume.vti absent, not currently in _conversion_events)
       |
       v (POST /convert/{study_id} scheduled)
  "converting" (event in _conversion_events is not set)
       |
       +---> [Conversion Failure] ---> "pending" (event popped, _conversion_failures set in memory)
       |
       v (volume.vti written to disk)
    "ready" (os.path.exists(volume.vti) == True)
```
- Transition 1 (`pending` -> `converting`): Triggered in `_ensure_vti_conversion_singleflight` when `threading.Event()` is created and added to `_conversion_events` ([`backend/python_service/main.py:542-545`](file:///Users/adrianhalim/SereneApps/backend/python_service/main.py#L542-L545)).
- Transition 2 (`converting` -> `ready`): Triggered when `convert_study_to_vti` writes `volume.vti` ([`backend/python_service/services/vti_converter.py:920-992`](file:///Users/adrianhalim/SereneApps/backend/python_service/services/vti_converter.py#L920-L992)) and `event.set()` signals completion ([`backend/python_service/main.py:586`](file:///Users/adrianhalim/SereneApps/backend/python_service/main.py#L586)).
- Transition 3 (`converting` -> failure): If an exception occurs, `_conversion_failures[study_path]` records the failure string and `event.set()` unblocks waiters ([`backend/python_service/main.py:578-586`](file:///Users/adrianhalim/SereneApps/backend/python_service/main.py#L578-L586)).

#### 4.3 GET Status / Result Endpoints
- **Endpoint:** `GET /status/{study_id}` ([`backend/python_service/main.py:810`](file:///Users/adrianhalim/SereneApps/backend/python_service/main.py#L810)).
- **Owner:** FastAPI Python service (accessible directly or proxied through Express via `GET /py-api/status/{study_id}` at [`backend/src/server.js:152`](file:///Users/adrianhalim/SereneApps/backend/src/server.js#L152)).
- **Polling Returns:**
  - `ready`: `{"study_id": study_id, "status": "ready", "vti_ready": true, "is_converting": false}` ([`backend/python_service/main.py:833-838`](file:///Users/adrianhalim/SereneApps/backend/python_service/main.py#L833-L838)).
  - `converting`: `{"study_id": study_id, "status": "converting", "vti_ready": false, "is_converting": true}`.
  - `pending`: `{"study_id": study_id, "status": "pending", "vti_ready": false, "is_converting": false}`.
- **WebSocket Streaming:** `WEBSOCKET /ws/conversion-status` broadcasts real-time `{studyId, progress, stage, status}` objects ([`backend/python_service/main.py:646-670`](file:///Users/adrianhalim/SereneApps/backend/python_service/main.py#L646-L670)).
- **Result Retrieval Endpoint:** `GET /ai-findings/{study_id}` ([`backend/python_service/main.py:1375-1420`](file:///Users/adrianhalim/SereneApps/backend/python_service/main.py#L1375-L1420)) returns tooth centroids, bone density breakdown, nerve canal coordinates, and volume dimensions.

#### 4.4 Failure Handling & Resilience
- **Inference Exception:** Logged to stderr; recorded in memory `_conversion_failures`. The HTTP response was already returned, so the client polling `GET /status/{study_id}` simply sees `status: "pending"` forever because `volume.vti` was never created. No failure flag is ever written to PostgreSQL.
- **Process Death Mid-Job:** All in-memory lock states and events disappear upon process restart. The partially written study directory remains on disk. On subsequent polls, `GET /status/{study_id}` returns `status: "pending"`. **There is no automatic crash recovery, restart scanner, or retry daemon.**
- **Database Write Failure:** If `tx.imagingStudy.create` fails in Express, the transaction rolls back, but files already moved to `uploads/x-core/${batchId}` remain orphaned on disk.
- **Idempotency & Deduplication:** `src/services/webhooks/idempotency.js` is **NOT used** in any CDSS or imaging route. Every upload to `POST /v1/x-core/upload` generates a timestamp-based ID (`batchId = Date.now().toString()`), creating duplicate records and directories even if identical files are submitted repeatedly. In FastAPI, `_ensure_vti_conversion_singleflight` performs file-level deduplication: if `volume.vti` already exists on disk and `force=False`, it immediately skips computation ([`backend/python_service/main.py:1642-1644`](file:///Users/adrianhalim/SereneApps/backend/python_service/main.py#L1642-L1644)).

---

### Section 5: Existing Instrumentation

#### 5.1 Timings Captured
1. **Benchmark Suite (`scripts/xcore-benchmark/`):**
   - **Upload Latency:** Measured in Node using `Date.now() - uploadStart` around the `POST /v1/x-core/upload` HTTP request ([`scripts/xcore-benchmark/run-single-folder-repeated-benchmark.js:189-197`](file:///Users/adrianhalim/SereneApps/scripts/xcore-benchmark/run-single-folder-repeated-benchmark.js#L189-L197)).
   - **Conversion Latency:** Measured using `Date.now() - conversionStart` while polling `GET /status/{study_id}` at 1-second intervals until `ready` ([`scripts/xcore-benchmark/run-single-folder-repeated-benchmark.js:205-234`](file:///Users/adrianhalim/SereneApps/scripts/xcore-benchmark/run-single-folder-repeated-benchmark.js#L205-L234)).
   - **Slice Stream Latencies (Axial/Coronal/Sagittal):** Wall-clock HTTP duration using `Date.now()` ([`scripts/xcore-benchmark/run-single-folder-repeated-benchmark.js:240-270`](file:///Users/adrianhalim/SereneApps/scripts/xcore-benchmark/run-single-folder-repeated-benchmark.js#L240-L270)).
   - **Storage:** Written to CSV `scripts/xcore-benchmark/results/benchmark-runs.csv` and JSONL `results/raw/backend-events-${runId}.jsonl`.
2. **Academic Study Latency Suite (`run-cdss-async-latency.js`):**
   - **Initial Response Time:** Measured via `performance.now()` around `POST /cases/:id/images` ([`Pengujian Latency, Tetability, dan Maintability/latency/cdss_async/run-cdss-async-latency.js:81-89`](file:///Users/adrianhalim/SereneApps/Pengujian%20Latency,%20Tetability,%20dan%20Maintability/latency/cdss_async/run-cdss-async-latency.js#L81-L89)).
   - **Queue Time:** **Simulated via synthetic random number formula:**
     ```javascript
     const queueTime = 80 + Math.random() * 40; // Simulated 80-120ms
     ```
     ([`Pengujian Latency, Tetability, dan Maintability/latency/cdss_async/run-cdss-async-latency.js:102`](file:///Users/adrianhalim/SereneApps/Pengujian%20Latency,%20Tetability,%20dan%20Maintability/latency/cdss_async/run-cdss-async-latency.js#L102)).
   - **Inference & Persistence Times:** Measured as a single round-trip HTTP request to `POST /cases/:id/images/:imgId/analyze` via `performance.now()`, and then **synthetically split using hard-coded percentages**:
     ```javascript
     const inferenceTime = analyzeDuration * 0.94; // 94% attributed to inference
     const persistenceTime = analyzeDuration * 0.06; // 6% attributed to DB
     ```
     ([`Pengujian Latency, Tetability, dan Maintability/latency/cdss_async/run-cdss-async-latency.js:152-153`](file:///Users/adrianhalim/SereneApps/Pengujian%20Latency,%20Tetability,%20dan%20Maintability/latency/cdss_async/run-cdss-async-latency.js#L152-L153)).
   - **End-to-End Processing Time:** Computed as:
     `endToEndTime = initialResponseTime + queueTime + inferenceTime + persistenceTime` ([`Pengujian Latency, Tetability, dan Maintability/latency/cdss_async/run-cdss-async-latency.js:154`](file:///Users/adrianhalim/SereneApps/Pengujian%20Latency,%20Tetability,%20dan%20Maintability/latency/cdss_async/run-cdss-async-latency.js#L154)).

#### 5.2 Logging Infrastructure
- **Node Backend:** Standard `console.log`, `console.warn`, `console.error`. When benchmark header `X-Benchmark-Run-Id` is passed, `logBackendEvent` executes synchronous `fs.appendFileSync` writing to JSONL ([`backend/src/controllers/xCoreController.js:67-94`](file:///Users/adrianhalim/SereneApps/backend/src/controllers/xCoreController.js#L67-L94)).
- **FastAPI Service:** Standard Python `print()`. When `run_id` is supplied, `log_python_event` executes file append `with open(..., "a") as f:` ([`backend/python_service/services/vti_converter.py:39-62`](file:///Users/adrianhalim/SereneApps/backend/python_service/services/vti_converter.py#L39-L62)).
- **APM / OpenTelemetry / Tracing:** `NOT FOUND`. No active OpenTelemetry SDK, Prometheus client, or distributed tracing middleware is hooked into Express or FastAPI. (`@opentelemetry/api` in `package-lock.json` is an unreferenced transitive dependency).

---

### Section 6: Benchmark and Test Assets

#### 6.1 k6 Load-Testing Scripts
- **Primary Script:** [`Pengujian Latency, Tetability, dan Maintability/latency/beban_pengguna/scripts/load-by-vu.k6.js`](file:///Users/adrianhalim/SereneApps/Pengujian%20Latency,%20Tetability,%20dan%20Maintability/latency/beban_pengguna/scripts/load-by-vu.k6.js).
- **Executor & VU Behavior:** `constant-vus` executor, parameterized by `__ENV.VUS` (default 10, tested at 1, 10, 50, 100, 200 VUs via wrapper scripts [`test_1vu.js` to `test_200vu.js`](file:///Users/adrianhalim/SereneApps/Pengujian%20Latency,%20Tetability,%20dan%20Maintability/latency/load-testing/scripts/test_1vu.js)), duration `__ENV.DURATION` (default `3m`).
- **Endpoints Exercised in Loop:**
  1. `POST /v1/auth/login` (group `1. Login pengguna`)
  2. `GET /v1/appointments?view=patient&limit=50&order=desc` (group `2. Ambil daftar appointment`)
  3. `GET /v1/appointments/:id` (group `3. Ambil detail konsultasi`)
  4. `POST /v1/communications/appointments/:id/chat/messages` (group `4. Kirim pesan konsultasi`)
  5. `POST /v1/communications/appointments/:id/chat/attachments` (group `5. Unggah citra gigi` - uploads sample JPEG `sample-dental.jpg`)
- **Think Time:** Explicit `sleep(1)` between VU iterations ([`load-by-vu.k6.js:173`](file:///Users/adrianhalim/SereneApps/Pengujian%20Latency,%20Tetability,%20dan%20Maintability/latency/beban_pengguna/scripts/load-by-vu.k6.js#L173)).
- **Thresholds:**
  - `http_req_failed: ['rate<0.01']` (failure rate under 1%)
  - `http_req_duration: ['p(95)<2000']` (95th percentile under 2000 ms)
- **Tags Applied:** `tags: { name: '...', feature: 'login' | 'list_appointment' | 'detail_consultation' | 'send_message' | 'upload_image' }`.

#### 6.2 Seed and Setup Scripts
- **k6 Fixture Setup:** In `setup()` function of [`load-by-vu.k6.js:35-101`](file:///Users/adrianhalim/SereneApps/Pengujian%20Latency,%20Tetability,%20dan%20Maintability/latency/beban_pengguna/scripts/load-by-vu.k6.js#L35-L101), helper functions in [`utils.js:39-140`](file:///Users/adrianhalim/SereneApps/Pengujian%20Latency,%20Tetability,%20dan%20Maintability/latency/beban_pengguna/scripts/utils.js#L39-L140) log in a test patient and dentist, automatically book an appointment via `POST /v1/appointments`, confirm it via `PATCH /v1/appointments/:id/confirm`, and execute a warmup cycle of chat messages and attachment uploads.
- **Repository Database Seeds:**
  - `backend/src/seed.js` ([`backend/src/seed.js:1-25`](file:///Users/adrianhalim/SereneApps/backend/src/seed.js#L1-L25)) and `backend/src/seed_simple.js`: Populates demo clinics, users, and dentists.
  - `backend/seeds/comprehensive_clinic_seed.sql`: Comprehensive SQL dump for clinic services and dentists.

#### 6.3 Third-Party Mock Toggles
- **Twilio (Video & Conversations):** Controlled by environment variable `TWILIO_MOCK_MODE=true` ([`backend/src/services/communications/conversationsAdapter.js:9`](file:///Users/adrianhalim/SereneApps/backend/src/services/communications/conversationsAdapter.js#L9), [`backend/src/services/communications/videoService.js:11`](file:///Users/adrianhalim/SereneApps/backend/src/services/communications/videoService.js#L11), [`backend/src/services/communications/config.js:12`](file:///Users/adrianhalim/SereneApps/backend/src/services/communications/config.js#L12)). When enabled, generates synthetic `mock_conv_...`, `mock_room_...`, and dummy JWT tokens without network requests.
- **Midtrans Payment Gateway:** Controlled by environment variable `MIDTRANS_MOCK_MODE=true` ([`backend/src/services/payments/midtrans.js:7`](file:///Users/adrianhalim/SereneApps/backend/src/services/payments/midtrans.js#L7)).

#### 6.4 Database Reset and Cleanup Mechanism
- **Benchmark Artifact Cleanup:** [`scripts/xcore-benchmark/cleanup-benchmark-artifacts.js`](file:///Users/adrianhalim/SereneApps/scripts/xcore-benchmark/cleanup-benchmark-artifacts.js) scans `imaging_studies` for `metadata.is_benchmark = true`, cascades deletions across `aIResult`, `imagingSeries`, and `imagingStudy`, decrements dentist storage quota, and deletes physical folders from `backend/uploads/x-core/`.
- **Database Migrations:** [`backend/src/migrate.js:1-25`](file:///Users/adrianhalim/SereneApps/backend/src/migrate.js#L1-L25) sequentially executes `.sql` scripts in `backend/migrations/`.

#### 6.5 CDSS Integration Test Suite & Skipped Tests
- **Location:** Defined in [`Pengujian Latency, Tetability, dan Maintability/testability/run-testability.sh:86-103`](file:///Users/adrianhalim/SereneApps/Pengujian%20Latency,%20Tetability,%20dan%20Maintability/testability/run-testability.sh#L86-L103).
- **Command to Run:**
  ```bash
  cd backend && node --test --experimental-test-coverage --test-coverage-exclude=tests/** --test-concurrency=1 \
    tests/deepDentalProxy.test.js \
    tests/verifiedCaseWorkspace.export.test.js \
    tests/verifiedCaseWorkspace.hardening.test.js \
    tests/verifiedCaseWorkspace.migration.test.js \
    tests/verifiedCaseWorkspace.postgres.test.js \
    tests/verifiedCaseWorkspace.productionGuard.test.js \
    tests/verifiedCaseWorkspace.routes.test.js \
    tests/verifiedCaseWorkspace.service.test.js \
    tests/xcore.annotation.validation.test.js
  ```
- **Skipped Test:** [`backend/tests/verifiedCaseWorkspace.postgres.test.js:15-17`](file:///Users/adrianhalim/SereneApps/backend/tests/verifiedCaseWorkspace.postgres.test.js#L15-L17):
  ```javascript
  const runPostgresIntegration = process.env.RUN_POSTGRES_INTEGRATION === '1' && Boolean(connectionString);
  const postgresTest = runPostgresIntegration ? test : test.skip;
  postgresTest('migration 048 and DB repository persist verified case workspace data in Postgres', async () => { ... });
  ```
  - **Reason Skipped:** Requires `RUN_POSTGRES_INTEGRATION=1` in the environment and a connected PostgreSQL instance. When run without this environment variable, Node's test runner marks it as skipped (resulting in the 33 passed / 1 skipped count reported in Table 4.7 of the academic testability report).

---

### Section 7: Dependencies and Versions

- **Python Runtime:** Python 3.14.0 (installed in local environment).
- **Python CDSS Dependency File:** [`backend/python_service/requirements.txt`](file:///Users/adrianhalim/SereneApps/backend/python_service/requirements.txt):
  - `fastapi`, `uvicorn`, `websockets`, `wsproto`, `pydicom`, `opencv-python-headless`, `numpy`, `python-multipart`, `Pillow`, `monai`, `torch`, `vtk`, `nibabel`, `scipy`.
- **Queue / Broker Libraries:** `NOT FOUND`. Celery, Redis, RabbitMQ, Bull, BullMQ, RQ, or Kombu are **completely absent** from all package manifests and code.
- **Node Runtime:** Node.js v22.12.0.
- **Express Version:** `^4.19.2` ([`backend/package.json:26`](file:///Users/adrianhalim/SereneApps/backend/package.json#L26)).
- **Database Connection Pool Settings:**
  - **Raw `pg.Pool` ([`backend/src/db.js:20-23`](file:///Users/adrianhalim/SereneApps/backend/src/db.js#L20-L23)):** Unconfigured in code; adopts `pg` v8.11.5 defaults:
    - `max`: 10 connections
    - `min`: 0 connections
    - `idleTimeoutMillis`: 10000 ms (10 seconds)
    - `connectionTimeoutMillis`: 0 (no timeout / infinite wait)
  - **Prisma Client (`@prisma/client` v6.16.1):** Pool size defaults to `num_physical_cpus * 2 + 1` (overridden in test scripts to `connection_limit=3` via `DATABASE_URL` query parameter at [`backend/package.json:12`](file:///Users/adrianhalim/SereneApps/backend/package.json#L12)).

---

### Section 8: Risks to Experimental Validity

1. **Synthetic Timings in Published Academic Latency Script (High Severity):**
   In [`Pengujian Latency, Tetability, dan Maintability/latency/cdss_async/run-cdss-async-latency.js:101-155`](file:///Users/adrianhalim/SereneApps/Pengujian%20Latency,%20Tetability,%20dan%20Maintability/latency/cdss_async/run-cdss-async-latency.js#L101-L155), `Queue Time` was not measured from a queue system; it was simulated with `80 + Math.random() * 40`. Furthermore, `Inference Time` and `Persistence Time` were synthetically calculated as a 94% / 6% mathematical split of an HTTP request duration. Comparing real experimental data from Architectures A, B, and C directly against these baseline figures would introduce severe attribution bias.
2. **Result Caching / Existing Volume Short-Circuit (High Severity):**
   In [`backend/python_service/main.py:1642-1644, 529-530`](file:///Users/adrianhalim/SereneApps/backend/python_service/main.py#L1642-L1644), if `volume.vti` already exists in `backend/uploads/x-core/<study_id>/` and `force=False`, FastAPI immediately returns `{"status": "already_exists"}` without executing conversion or heuristic analysis. Repeated benchmark iterations without clean storage directories or `force=True` will measure 0 ms computation time.
3. **Heavy Synchronous Operations in Node Upload Hot Path (High Severity):**
   In [`backend/src/controllers/xCoreController.js:278-304`](file:///Users/adrianhalim/SereneApps/backend/src/controllers/xCoreController.js#L278-L304), before Node returns an HTTP response, it synchronously executes `fs.renameSync` on every file in the batch and spawns a blocking Python process (`python3 scripts/parse_dental_study.py`) to parse headers. For large 3D series (100–500 slices), this synchronous work can take several seconds, heavily inflating the "initial response time" of Architecture B and C before any background job or broker queue is even reached.
4. **Synchronous Thumbnail Generation inside FastAPI POST Route (High Severity):**
   In [`backend/python_service/main.py:1653-1655`](file:///Users/adrianhalim/SereneApps/backend/python_service/main.py#L1653-L1655), `generate_study_thumbnails(study_path, force=force)` runs synchronously in the main thread of `trigger_vti_conversion` before `background_tasks.add_task` is called, delaying the immediate HTTP response.
5. **Absence of Calibrated Deep Learning Models (Medium Severity):**
   The Python service does not run deep learning inference with GPU acceleration or ONNX/PyTorch neural networks; it executes deterministic NumPy/SciPy/MONAI spatial transforms and heuristic filters ([`backend/python_service/services/vti_converter.py:446-863`](file:///Users/adrianhalim/SereneApps/backend/python_service/services/vti_converter.py#L446-L863)). Inferences do not exhibit typical GPU tensor batching, CUDA memory allocation, or model warm-up behaviors.
6. **In-Memory Global State and Singleflight Locking (Medium Severity):**
   FastAPI uses process-memory locks (`_conversion_state_lock`, `_conversion_events`) to deduplicate simultaneous requests for the same study ([`backend/python_service/main.py:132-136`](file:///Users/adrianhalim/SereneApps/backend/python_service/main.py#L132-L136)). This does not scale across multiple Uvicorn workers and will cause state loss if workers restart.
7. **Synchronous File Append Logging in Hot Path (Medium Severity):**
   Both Node ([`backend/src/controllers/xCoreController.js:90`](file:///Users/adrianhalim/SereneApps/backend/src/controllers/xCoreController.js#L90)) and Python ([`backend/python_service/services/vti_converter.py:58`](file:///Users/adrianhalim/SereneApps/backend/python_service/services/vti_converter.py#L58)) invoke blocking file append operations (`fs.appendFileSync` and `open(..., "a")`) during benchmark logging, introducing storage I/O jitter.
8. **Proxy and Client Timeouts in Synchronous Architecture A (Medium Severity):**
   Node's reverse proxy enforces timeouts (`resolveProxyTimeoutMs`, 120s–240s at [`backend/src/server.js:87, 196-198`](file:///Users/adrianhalim/SereneApps/backend/src/server.js#L87)), and `getSeriesInstances` hard-codes an 8-second timeout ([`backend/src/controllers/xCoreController.js:663`](file:///Users/adrianhalim/SereneApps/backend/src/controllers/xCoreController.js#L663)). In Architecture A (full synchronous wait), large CBCT volumes will risk timeout aborts unless these limits are systematically widened.

---

### Section 9: Candidate Seams for an Execution-Mode Flag

*(Analysis only. Clearly labeled as candidate, not decided. Core CDSS logic is preserved.)*

#### Seam 1: Node.js Controller Dispatch Seam
- **File:** [`backend/src/controllers/xCoreController.js`](file:///Users/adrianhalim/SereneApps/backend/src/controllers/xCoreController.js)
- **Function:** `uploadStudy` (around lines 416–437)
- **Why it is a seam:** This is the exact junction where Node has finalized database persistence and must decide whether to wait, fire-and-forget, or enqueue.
- **Hypothetical Behavior:**
  - `sync`: `const vtiResult = await fetch(`${PY_SERVICE_BASE_URL}/convert/${batchId}?mode=sync`, { method: 'POST' }); await vtiResult.json(); return res.status(200).json({ ...response, cdss: vtiResult });`
  - `background`: Current fire-and-forget `fetch()`, returning HTTP 202 `{ status: 'accepted', studyId: result.id, pollUrl: ... }`.
  - `queue`: Dispatch study ID to Redis/Celery queue via message producer and return HTTP 202 `{ status: 'accepted', jobId, pollUrl: ... }`.
- **Files Touched:** `backend/src/controllers/xCoreController.js`, `backend/src/routes/xCoreRoutes.js`.
- **Main Risk:** Express connections remain open for 15–60+ seconds in `sync` mode, exposing the Node process to connection pool exhaustion and reverse proxy gateway timeouts.

#### Seam 2: FastAPI Endpoint Handler Seam
- **File:** [`backend/python_service/main.py`](file:///Users/adrianhalim/SereneApps/backend/python_service/main.py)
- **Function:** `trigger_vti_conversion` (`POST /convert/{study_id}`, lines 1622–1676)
- **Why it is a seam:** This is where Python receives the conversion request and delegates execution to `BackgroundTasks`.
- **Hypothetical Behavior:**
  - `sync`: Directly call `_ensure_vti_conversion_singleflight(study_path, force=force, wait=True, ...)` and return completed volume metadata with HTTP 200.
  - `background`: Current `background_tasks.add_task(_ensure_vti_conversion_singleflight, ...)` returning HTTP 202.
  - `queue`: Enqueue Celery task `vti_conversion_task.delay(study_path, ...)` and return HTTP 202 with task ID.
- **Files Touched:** `backend/python_service/main.py`, new `backend/python_service/celery_app.py` / `tasks.py`.
- **Main Risk:** `trigger_vti_conversion` is currently a synchronous `def`. Executing CPU-heavy work directly inside it blocks Uvicorn worker threads unless offloaded cleanly.

#### Seam 3: Dedicated Task Dispatcher Abstraction in Python Service
- **File:** `backend/python_service/services/task_dispatcher.py` (New candidate module)
- **Function:** `dispatch_conversion_task(study_id, study_path, mode, background_tasks)`
- **Why it is a seam:** Isolates the dispatch mechanism entirely from route handlers, preserving existing endpoints and singleflight logic.
- **Files Touched:** `backend/python_service/main.py`, new `task_dispatcher.py`.
- **Main Risk:** Requires harmonizing status polling (`GET /status/{study_id}`) so clients receive identical response schemas across all three modes (in-memory progress, Celery AsyncResult status, or immediate completion).

---

## 3. Discrepancies Table

| Item / Claim | Code Reality | Paper / README / External Description | File & Line Evidence |
|---|---|---|---|
| **Submission Route** | `POST /v1/x-core/upload` | Paper text states `POST /v1/score`; Figure 2 shows `/v1/x-core`. (`/v1/score` does not exist). | [`backend/src/routes/xCoreRoutes.js:123`](file:///Users/adrianhalim/SereneApps/backend/src/routes/xCoreRoutes.js#L123); [`backend/src/server.js:355`](file:///Users/adrianhalim/SereneApps/backend/src/server.js#L355) |
| **Response Code** | HTTP 200 OK | Paper/study description states backend returns HTTP 202 Accepted. | [`backend/src/controllers/xCoreController.js:436`](file:///Users/adrianhalim/SereneApps/backend/src/controllers/xCoreController.js#L436); [`backend/python_service/main.py:1670`](file:///Users/adrianhalim/SereneApps/backend/python_service/main.py#L1670) |
| **Queue Time Measurement** | Synthetically generated random value (`80 + Math.random() * 40` ms) | Academic study latency reports present Queue Time as an empirical measurement of asynchronous queuing delay. | [`Pengujian Latency, Tetability, dan Maintability/latency/cdss_async/run-cdss-async-latency.js:102`](file:///Users/adrianhalim/SereneApps/Pengujian%20Latency,%20Tetability,%20dan%20Maintability/latency/cdss_async/run-cdss-async-latency.js#L102) |
| **Inference vs Persistence Split** | Fixed mathematical proportion (94% inference / 6% persistence) | Table 4.6 in study reports separate measured inference and persistence latency columns. | [`Pengujian Latency, Tetability, dan Maintability/latency/cdss_async/run-cdss-async-latency.js:152-153`](file:///Users/adrianhalim/SereneApps/Pengujian%20Latency,%20Tetability,%20dan%20Maintability/latency/cdss_async/run-cdss-async-latency.js#L152-L153) |
| **Model Type** | Rule-based spatial transforms, HU thresholding, morphological filters | Paper/system descriptions refer to "YOLOv8 / Deep Learning" and "AI dental analysis". | [`paper-evidence/cdss_description.md:25-38`](file:///Users/adrianhalim/SereneApps/paper-evidence/cdss_description.md#L25-L38); [`backend/src/controllers/xCoreAIController.js:11-54`](file:///Users/adrianhalim/SereneApps/backend/src/controllers/xCoreAIController.js#L11-L54) |
| **Async Broker** | No message broker or queue library present in repo | Architecture C references Redis + Celery. | `NOT FOUND` across all package manifests and code |
| **Job State Tracking** | Study status marked `'processed'` in DB upon upload; Python conversion state held in memory | Conceptual design assumes PostgreSQL/Prisma tracks full async conversion status machine. | [`backend/src/controllers/xCoreController.js:349`](file:///Users/adrianhalim/SereneApps/backend/src/controllers/xCoreController.js#L349); [`backend/python_service/main.py:133-136`](file:///Users/adrianhalim/SereneApps/backend/python_service/main.py#L133-L136) |

---

## 4. Risks to Validity (Ordered by Severity)

1. **Synthetic Timings in Published Latency Baseline (Critical):**  
   `run-cdss-async-latency.js` uses mathematical formulas for Queue Time, Inference Time, and Persistence Time rather than physical measurements. A new benchmark cannot validate against this baseline without acknowledging that the prior numbers were synthetic approximations.
2. **Result Caching / Existing Volume Short-Circuit (High):**  
   If study directories are not purged or `force=True` is omitted, the conversion pipeline returns `status: "already_exists"` in 0 ms, skewing benchmark averages.
3. **Synchronous Overhead in Node Upload Hot Path (High):**  
   The blocking Python subprocess (`scripts/parse_dental_study.py`) and multi-slice `fs.renameSync` in Express occur prior to the dispatch seam, artificially penalizing all architectures with non-CDSS file I/O latency.
4. **Synchronous Thumbnail Pre-Generation in FastAPI (High):**  
   `POST /convert/{study_id}` synchronously runs `generate_study_thumbnails` before adding the background task, inflating the initial response time.
5. **Lack of Neural Network Workload (Medium):**  
   The CPU-only, heuristic nature of the pipeline means CPU scheduling rather than GPU saturation will dominate the performance profile.
6. **In-Memory Concurrency Locks (Medium):**  
   Singleflight locking relies on process memory (`_conversion_state_lock`), rendering multi-worker process configurations inconsistent.
7. **Timeout Cut-offs in Architecture A (Medium):**  
   Default HTTP proxy timeouts (120s) and socket timeouts will abort synchronous processing under high load unless widened.

---

## 5. Open Questions for Adrian

1. **Route Naming Alignment:** Should the unified experiment route expose `POST /v1/x-core/upload`, or do you want an alias endpoint `POST /v1/score` created to match the manuscript text?
2. **Synchronous Express Hot Path:** Should the preliminary DICOM metadata parser (`scripts/parse_dental_study.py`) and physical file moving be moved into the background/worker pipeline, or must they strictly remain inside the upload controller?
3. **HTTP 202 Specification:** Should Architectures B and C formally return HTTP 202 Accepted with a standardized job status URL (`{"status": "accepted", "job_id": ..., "poll_url": ...}`), replacing the current HTTP 200 return?
4. **Baseline Comparison Strategy:** Given that Table 4.6 in the thesis used synthetic random values for Queue Time and hard-coded ratios (94%/6%) for Inference/Persistence on the 2D Verified Case pipeline, how should the paper contextualize the transition to empirical measurements on the 3D X-Core pipeline?
5. **Items Marked `NOT FOUND`:**
   - `POST /v1/score` route
   - HTTP 202 status code responses in the CDSS paths
   - Trained model weight files (`.pt`, `.pth`, `.onnx`, `.bin`)
   - Celery, Redis, RabbitMQ dependencies
   - OpenTelemetry / distributed tracing instrumentation
   - Dedicated Node status polling endpoint for X-Core studies
   - Hash-based upload deduplication / idempotency
   - Automated crash recovery / retry mechanisms
6. **Items Marked `UNRESOLVED`:**
   - Target concurrency / VU profile for the 3-way comparative experiment (current k6 scripts test 1–200 VUs for chat/auth, but single CBCT VTI conversions consume significant CPU memory).

---

## 6. Violations of Project Standards Seen in Audited Files

*(Report only; no modifications made.)*

1. **CommonJS `require()` in ESM Codebase:**
   - In [`Pengujian Latency, Tetability, dan Maintability/latency/cdss_async/run-cdss-async-latency.js:1-3`](file:///Users/adrianhalim/SereneApps/Pengujian%20Latency,%20Tetability,%20dan%20Maintability/latency/cdss_async/run-cdss-async-latency.js#L1-L3), `require('fs')`, `require('path')`, `require('perf_hooks')` are used, violating the project-wide ESM standard (`"type": "module"` in [`backend/package.json:5`](file:///Users/adrianhalim/SereneApps/backend/package.json#L5)).
2. **Raw SQL Bypassing Prisma ORM:**
   - In [`backend/src/repositories/verifiedCaseWorkspaceRepository.js:282, 403, 458, 484`](file:///Users/adrianhalim/SereneApps/backend/src/repositories/verifiedCaseWorkspaceRepository.js#L282), raw SQL statements are used directly (`INSERT INTO verified_cases`, `INSERT INTO case_images`, etc.) via `pg.Pool`, bypassing Prisma schema definitions.
   - In [`backend/src/routes/verified-cases.js:46-54`](file:///Users/adrianhalim/SereneApps/backend/src/routes/verified-cases.js#L46-L54), `SELECT 1 FROM appointments ...` executes raw SQL instead of using Prisma client queries.
3. **Blocking Synchronous File I/O in Async Hot Paths:**
   - In [`backend/src/controllers/xCoreController.js:276, 283, 289, 293`](file:///Users/adrianhalim/SereneApps/backend/src/controllers/xCoreController.js#L276), synchronous methods `fs.existsSync`, `fs.mkdirSync`, `fs.unlinkSync`, and `fs.renameSync` are called inside an asynchronous route handler.
   - In [`backend/src/controllers/xCoreController.js:90`](file:///Users/adrianhalim/SereneApps/backend/src/controllers/xCoreController.js#L90), `fs.appendFileSync` is used for event logging.
   - In [`backend/python_service/main.py:1653`](file:///Users/adrianhalim/SereneApps/backend/python_service/main.py#L1653), `generate_study_thumbnails` runs synchronously inside the request loop.
4. **Orphaned File Hazard on DB Transaction Failure:**
   - In [`backend/src/controllers/xCoreController.js:275-396`](file:///Users/adrianhalim/SereneApps/backend/src/controllers/xCoreController.js#L275-L396), physical files are moved to permanent directories *before* the Prisma database transaction executes. If the transaction fails, the uploaded folder remains orphaned on disk without cleanup.
