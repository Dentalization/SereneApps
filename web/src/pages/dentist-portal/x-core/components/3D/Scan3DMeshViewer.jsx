import React, { useEffect, useRef, useState, useCallback, useReducer } from 'react';
import AppIcon from '../../../../../components/AppIcon';
import { getAccessToken } from '../../../../../utils/auth/tokenStorage';
import { useAuth } from '../../../../../contexts/AuthContext';
import { resolveScanAssetCapability, scanAnnotationStorageKey, scanAssetPath, readBoundedAsset } from './scan3DAssetSafety.mjs';
import { createScanViewerTelemetry } from './scan3DViewerTelemetry.mjs';

import '@kitware/vtk.js/Rendering/Profiles/Geometry';
import vtkFullScreenRenderWindow from '@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow';
import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';
import vtkSTLReader from '@kitware/vtk.js/IO/Geometry/STLReader';
import vtkPLYReader from '@kitware/vtk.js/IO/Geometry/PLYReader';
import vtkOBJReader from '@kitware/vtk.js/IO/Misc/OBJReader';
import vtkOrientationMarkerWidget from '@kitware/vtk.js/Interaction/Widgets/OrientationMarkerWidget';
import vtkAnnotatedCubeActor from '@kitware/vtk.js/Rendering/Core/AnnotatedCubeActor';
import vtkCellPicker from '@kitware/vtk.js/Rendering/Core/CellPicker';

import Scan3DAnnotationOverlay from './Scan3DAnnotationOverlay';
import Scan3DMeasurementToolbar from './Scan3DMeasurementToolbar';
import ToothSegmentationOverlay from './ToothSegmentationOverlay';
import useToothInstances from '../../hooks/useToothInstances';
import {
  TOOLS,
  createMeasurementsState,
  setTool,
  handlePick,
  undoMeasurement,
  deleteMeasurement,
  clearAllMeasurements,
  hydrateMeasurements,
  renameMeasurement,
  moveMeasurementLabel,
} from './scan3DMeasurements.mjs';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COLOR_PRESETS = {
  enamel: { name: 'Enamel Putih', rgb: [0.96, 0.97, 0.99], specular: 0.35, diffuse: 0.75 },
  clinical: { name: 'Emas Klinis', rgb: [0.95, 0.78, 0.35], specular: 0.5, diffuse: 0.65 },
  cyan: { name: 'Sian Medis', rgb: [0.35, 0.85, 0.95], specular: 0.4, diffuse: 0.7 },
};

const VIEW_PRESETS = {
  occlusal: { name: '+Z', position: [0, 0, 85], focalPoint: [0, 10, 0], viewUp: [0, 1, 0] },
  frontal: { name: '−Y', position: [0, -85, 10], focalPoint: [0, 10, 0], viewUp: [0, 0, 1] },
  right: { name: '+X', position: [85, 0, 10], focalPoint: [0, 10, 0], viewUp: [0, 0, 1] },
  left: { name: '−X', position: [-85, 0, 10], focalPoint: [0, 10, 0], viewUp: [0, 0, 1] },
};

// ---------------------------------------------------------------------------
// Measurement state reducer (wraps pure state machine)
// ---------------------------------------------------------------------------
function measurementsReducer(state, action) {
  switch (action.type) {
    case 'RESET': return createMeasurementsState();
    case 'SET_TOOL': return setTool(state, action.tool);
    case 'PICK': {
      const { state: next } = handlePick(state, action.worldPoint, action.textContent);
      return next;
    }
    case 'UNDO': return undoMeasurement(state);
    case 'DELETE': return deleteMeasurement(state, action.id);
    case 'CLEAR': return clearAllMeasurements(state);
    case 'HYDRATE': return { ...hydrateMeasurements(state, action.annotations), scope: action.scope };
    case 'RENAME': return renameMeasurement(state, action.id, action.label);
    case 'MOVE_LABEL': return moveMeasurementLabel(state, action.id, action.offset);
    default: return state;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const Scan3DMeshViewer = ({
  study,
  onBack,
  isFullscreen = false,
  toggleFullscreen = null,
  analysisCaseContext = null,
  onCaptureForCase = null,
}) => {
  const studyId = study?.id || study?.studyId;
  const { user } = useAuth();
  const containerRef = useRef(null);
  const loadAbortRef = useRef(null);
  const colorPresetRef = useRef('enamel');
  const telemetryRef = useRef(createScanViewerTelemetry());
  const [telemetrySnapshot, setTelemetrySnapshot] = useState(null);
  const [viewerEpoch, setViewerEpoch] = useState(0);

  const vtkRef = useRef(null);

  const [scanStatus, setScanStatus] = useState('loading');
  const [statusData, setStatusData] = useState(null);
  const [loadProgress, setLoadProgress] = useState(0);
  const [isLoadingAsset, setIsLoadingAsset] = useState(false);
  const [assetError, setAssetError] = useState(null);

  // Viewer options
  const [representationMode, setRepresentationMode] = useState('surface');
  const [colorPreset, setColorPreset] = useState('enamel');
  const [showMetadataDrawer, setShowMetadataDrawer] = useState(false);
  const [stats, setStats] = useState({ vertexCount: 0, faceCount: 0, bounds: null });

  // Measurement & annotation state
  const [measState, measDispatch] = useReducer(measurementsReducer, createMeasurementsState());

  // Text input for text annotations
  const [pendingTextInput, setPendingTextInput] = useState(null); // {worldPoint, value}
  const textInputRef = useRef(null);

  // Phase 12 — Tooth Segmentation
  const [showTeeth, setShowTeeth] = useState(false);
  const [selectedFdi, setSelectedFdi] = useState(null);
  const {
    toothInstances,
    loading: toothLoading,
    segmentationStatus,
    triggerSegmentation,
  } = useToothInstances(studyId, { enabled: showTeeth && scanStatus === 'ready' });

  const diagnosticMode = scanStatus === 'failed'
    && statusData?.qualityAssessment?.status === 'insufficient'
    && Boolean(statusData?.diagnosticMesh);
  const assetDescriptor = statusData?.assets?.mesh || (diagnosticMode ? statusData.diagnosticMesh : null) || {};
  const assetSafety = resolveScanAssetCapability(assetDescriptor);
  const assetUrlFromStatus = scanAssetPath(studyId, assetDescriptor);
  const assetSha = assetDescriptor.sha256 || assetDescriptor.checksum?.sha256 || null;
  const annotationKey = scanAnnotationStorageKey({ scanId: studyId, ownerId: user?.id, asset: assetDescriptor });
  const measurementScope = annotationKey || `ephemeral:${studyId}:${assetSha || ''}`;
  const visibleMeasurements = measState.scope === measurementScope ? measState.measurements.filter((item) => assetSafety.canMeasure || item.type !== 'measurement') : [];

  // ---------------------------------------------------------------------------
  // 1. Status Polling
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let timer = null;
    let isMounted = true;

    const checkStatus = async () => {
      if (!studyId) return;
      try {
        const token = getAccessToken();
        const res = await fetch(`/api/v1/x-core/3d-scans/${encodeURIComponent(studyId)}/status`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.headers.get('Content-Type')?.includes('application/json')) throw new Error('Server mengirim halaman HTML, bukan status scan. Periksa jalur API /api dan layanan backend.');
        if (!res.ok) throw new Error(`Status aset tidak tersedia (${res.status})`);
        if (isMounted) {
          const data = await res.json();
          setStatusData(data);
          setScanStatus(data.status);
          if (['created', 'pending_capture', 'uploaded', 'processing', 'queued'].includes(data.status)) {
            timer = setTimeout(checkStatus, 2000);
          }
        }
      } catch (err) {
        if (isMounted) { setAssetError(err.message); setScanStatus('unavailable'); }
      }
    };

    checkStatus();

    return () => {
      isMounted = false;
      if (timer) clearTimeout(timer);
    };
  }, [studyId, scanStatus]);

  // Geometry checksum and user scope prevent annotations from attaching to a different asset.
  useEffect(() => {
    measDispatch({ type: 'RESET' });
    if (scanStatus !== 'ready') return;
    let items = [];
    try {
      const saved = annotationKey ? JSON.parse(localStorage.getItem(annotationKey) || 'null') : null;
      items = (saved?.annotations || []).filter((item) => assetSafety.canMeasure || item.type !== 'measurement');
    } catch (_) {}
    measDispatch({ type: 'HYDRATE', annotations: items, scope: measurementScope });
  }, [annotationKey, measurementScope, scanStatus, assetSafety.canMeasure]);

  useEffect(() => {
    if (!annotationKey || measState.scope !== annotationKey) return;
    try {
      localStorage.setItem(annotationKey, JSON.stringify({ assetSha256: assetSha, annotations: measState.measurements }));
    } catch (_) {}
  }, [annotationKey, assetSha, measState.measurements, measState.scope]);

  // ---------------------------------------------------------------------------
  // 3. Retry Handler
  // ---------------------------------------------------------------------------
  const handleRetry = async () => {
    try {
      const token = getAccessToken();
      const res = await fetch(`/api/v1/x-core/3d-scans/${encodeURIComponent(studyId)}/retry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error('Rekonstruksi belum dapat dijadwalkan ulang.');
      setScanStatus('queued');
    } catch (err) {
      setAssetError(err.message);
      setScanStatus('failed');
    }
  };

  const handleDownload = async () => {
    if (!assetUrlFromStatus) return;
    try {
      const response = await fetch(assetUrlFromStatus, {
        headers: { Authorization: `Bearer ${getAccessToken()}` }, redirect: 'error',
      });
      if (!response.ok) throw new Error('Unduhan aset tidak tersedia atau akses sesi berakhir.');
      const buffer = await readBoundedAsset(response);
      if (assetSha) {
        const digest = await crypto.subtle.digest('SHA-256', buffer);
        const actual = Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, '0')).join('');
        if (actual !== assetSha.toLowerCase()) throw new Error('Checksum unduhan aset tidak sesuai.');
      }
      const url = URL.createObjectURL(new Blob([buffer], { type: 'application/octet-stream' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `experimental_scan_${studyId}.${assetUrlFromStatus.split('.').pop()}`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) { setAssetError(error.message); }
  };

  // ---------------------------------------------------------------------------
  // 4. World→Screen projection (used by overlay)
  // ---------------------------------------------------------------------------
  const worldToScreen = useCallback((worldPt) => {
    if (!vtkRef.current?.renderer || !containerRef.current) return null;
    try {
      const { renderer, renderWindow } = vtkRef.current;
      const view = renderWindow.getViews()[0];
      const size = view.getSize();
      const bounds = containerRef.current.getBoundingClientRect();
      // vtk.js worldToDisplay: returns [displayX, displayY, displayZ] in viewport pixels
      const display = view.worldToDisplay(worldPt[0], worldPt[1], worldPt[2], renderer);
      // VTK display Y is bottom-origin; flip to top-origin for DOM
      return { x: display[0] * bounds.width / size[0], y: (size[1] - display[1]) * bounds.height / size[1] };
    } catch (_) {
      return null;
    }
  }, []);

  // ---------------------------------------------------------------------------
  // 5. VTK 3D Mesh Loader
  // ---------------------------------------------------------------------------
  const initVtkViewer = useCallback(async () => {
    if (!containerRef.current || (scanStatus !== 'ready' && !diagnosticMode) || !studyId) return;
    loadAbortRef.current?.abort();
    const controller = new AbortController();
    loadAbortRef.current = controller;
    const telemetry = createScanViewerTelemetry();
    telemetryRef.current = telemetry;
    const loadStarted = telemetry.start();

    if (vtkRef.current) {
      try {
        const { fullScreenRenderer, orientationWidget, actor, mapper, picker, polyData, reader, cubeActor } = vtkRef.current;
        reader?.delete();
        polyData?.delete();
        cubeActor?.delete();
        if (orientationWidget) orientationWidget.delete();
        if (actor) actor.delete();
        if (mapper) mapper.delete();
        if (picker) picker.delete();
        if (fullScreenRenderer) fullScreenRenderer.delete();
      } catch (e) {
        console.warn('[Scan3DMeshViewer] Cleanup error:', e);
      }
      vtkRef.current = null;
    }

    setIsLoadingAsset(true);
    setAssetError(null);
    setLoadProgress(15);

    try {
      const token = getAccessToken();
      const authHeaders = { Authorization: `Bearer ${token}` };

      if (!assetUrlFromStatus) throw new Error('Aset mesh terotorisasi belum tersedia pada manifest scan.');
      const assetFormat = assetDescriptor.format || assetUrlFromStatus.split('.').pop().toLowerCase();
      const response = await fetch(assetUrlFromStatus, { headers: authHeaders, signal: controller.signal, redirect: 'error' });
      if (!response.ok) throw new Error(`Aset 3D tidak dapat dimuat (${response.status})`);
      const buffer = await readBoundedAsset(response);
      if (controller.signal.aborted) return;
      telemetry.record('download', loadStarted);
      telemetry.fact('downloadBytes', buffer.byteLength);
      telemetry.fact('format', assetFormat);
      if (assetSha) {
        const digest = await crypto.subtle.digest('SHA-256', buffer);
        const actual = Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, '0')).join('');
        if (actual !== assetSha.toLowerCase()) throw new Error('Checksum aset berbeda dari manifest. Muat ulang status scan.');
      }
      if (controller.signal.aborted) return;
      setLoadProgress(65);
      const parseStarted = telemetry.start();
      const reader = assetFormat === 'stl' ? vtkSTLReader.newInstance()
        : assetFormat === 'ply' ? vtkPLYReader.newInstance() : vtkOBJReader.newInstance();
      if (assetFormat === 'obj') reader.parseAsText(new TextDecoder().decode(buffer));
      else reader.parseAsArrayBuffer(buffer);
      const polyData = reader.getOutputData();
      telemetry.record('parse', parseStarted);

      setLoadProgress(85);

      if (!polyData || polyData.getNumberOfPoints() === 0) {
        throw new Error('Mesh contains 0 vertices or empty geometry');
      }

      const fullScreenRenderer = vtkFullScreenRenderWindow.newInstance({
        container: containerRef.current,
        background: [0.03, 0.05, 0.08],
      });

      const renderer = fullScreenRenderer.getRenderer();
      const renderWindow = fullScreenRenderer.getRenderWindow();
      const interactor = fullScreenRenderer.getInteractor();

      const mapper = vtkMapper.newInstance();
      mapper.setInputData(polyData);

      const actor = vtkActor.newInstance();
      actor.setMapper(mapper);

      const preset = COLOR_PRESETS[colorPresetRef.current] || COLOR_PRESETS.enamel;
      actor.getProperty().setColor(...preset.rgb);
      actor.getProperty().setAmbient(0.2);
      actor.getProperty().setDiffuse(preset.diffuse);
      actor.getProperty().setSpecular(preset.specular);
      actor.getProperty().setSpecularPower(25);

      renderer.addActor(actor);

      // Orientation cube
      const cubeActor = vtkAnnotatedCubeActor.newInstance();
      cubeActor.setDefaultStyle({
        text: '',
        faceColor: [0.12, 0.16, 0.22],
        edgeColor: [0.25, 0.35, 0.45],
        textColor: [0.85, 0.95, 1.0],
        resolution: 300,
      });
      cubeActor.setXPlusFaceProperty({ text: '+X' });
      cubeActor.setXMinusFaceProperty({ text: '−X' });
      cubeActor.setYPlusFaceProperty({ text: '+Y' });
      cubeActor.setYMinusFaceProperty({ text: '−Y' });
      cubeActor.setZPlusFaceProperty({ text: '+Z' });
      cubeActor.setZMinusFaceProperty({ text: '−Z' });

      const orientationWidget = vtkOrientationMarkerWidget.newInstance({
        actor: cubeActor,
        interactor,
      });
      orientationWidget.setEnabled(true);
      orientationWidget.setViewportCorner(vtkOrientationMarkerWidget.Corners.BOTTOM_RIGHT);
      orientationWidget.setViewportSize(0.18);

      // Cell Picker — for world-point picking on mesh surface
      const picker = vtkCellPicker.newInstance();
      picker.setPickFromList(false);
      picker.initializePickList();

      renderer.resetCamera();
      renderer.resetCameraClippingRange();
      const renderStarted = telemetry.start();
      renderWindow.render();
      telemetry.record('initialRenderCpu', renderStarted);
      telemetry.record('loadToFirstRender', loadStarted);
      telemetry.fact('vertexCount', polyData.getNumberOfPoints());
      telemetry.fact('faceCount', polyData.getNumberOfPolys?.() ?? null);
      telemetry.fact('jsHeapUsedBytes', performance.memory?.usedJSHeapSize ?? null);
      setTelemetrySnapshot(telemetry.snapshot());

      setStats({
        vertexCount: polyData.getNumberOfPoints(),
        faceCount: polyData.getNumberOfPolys
          ? polyData.getNumberOfPolys()
          : null,
        bounds: polyData.getBounds(),
      });

      vtkRef.current = {
        polyData, reader, cubeActor,
        fullScreenRenderer,
        renderer,
        renderWindow,
        interactor,
        mapper,
        actor,
        orientationWidget,
        picker,
      };

      setViewerEpoch((value) => value + 1);
      setLoadProgress(100);
      setIsLoadingAsset(false);
    } catch (err) {
      if (controller.signal.aborted) return;
      console.error('[Scan3DMeshViewer] VTK init error:', err);
      setAssetError(err.message || 'Gagal memuat aset 3D mesh');
      setIsLoadingAsset(false);
    }
  }, [studyId, scanStatus, diagnosticMode, assetUrlFromStatus, assetSha, assetDescriptor.format]);

  useEffect(() => {
    if (scanStatus === 'ready' || diagnosticMode) {
      initVtkViewer();
    }
    return () => {
      loadAbortRef.current?.abort();
      if (vtkRef.current) {
        try {
          const { fullScreenRenderer, orientationWidget, actor, mapper, picker, polyData, reader, cubeActor } = vtkRef.current;
          reader?.delete();
          polyData?.delete();
          cubeActor?.delete();
          if (orientationWidget) orientationWidget.delete();
          if (actor) actor.delete();
          if (mapper) mapper.delete();
          if (picker) picker.delete();
          if (fullScreenRenderer) fullScreenRenderer.delete();
        } catch (_) {}
        vtkRef.current = null;
      }
    };
  }, [scanStatus, diagnosticMode, initVtkViewer]);

  // ---------------------------------------------------------------------------
  // 6. VTK pick handler (fires on left-click when a measurement tool is active)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const vtk = vtkRef.current;
    if (!vtk || diagnosticMode || measState.tool === TOOLS.NONE || (measState.tool === TOOLS.DISTANCE && !assetSafety.canMeasure)) return;

    const { interactor, renderer, renderWindow, picker } = vtk;

    const onLeftPress = (callData) => {
      // Only handle if not on a UI element
      const target = callData?.pokedRenderer;
      if (!target) return;

      const pos = callData.position;
      if (!pos) return;

      // Perform cell pick
      const pickStarted = telemetryRef.current.start();
      picker.pick([pos.x, pos.y, 0], renderer);
      telemetryRef.current.record('surfacePick', pickStarted);
      const pickedPos = picker.getPickPosition();

      if (!pickedPos || picker.getCellId() < 0) {
        // Miss — no geometry hit
        return;
      }

      if (measState.tool === TOOLS.TEXT) {
        // Show inline text prompt
        setPendingTextInput({ worldPoint: [...pickedPos], value: '' });
        return;
      }

      measDispatch({ type: 'PICK', worldPoint: [...pickedPos] });
      renderWindow.render();
    };

    const sub = interactor.onLeftButtonPress(onLeftPress);
    return () => { try { sub.unsubscribe?.(); } catch (_) {} };
  }, [measState.tool, viewerEpoch, assetSafety.canMeasure, diagnosticMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const subscribeToRender = useCallback((listener) => vtkRef.current?.interactor.onRenderEvent(listener), [viewerEpoch]);

  useEffect(() => {
    const container = containerRef.current;
    const interactor = vtkRef.current?.interactor;
    if (!container || !interactor) return undefined;
    let pendingInput = null;
    const onInput = (event) => {
      if (event.type === 'pointermove' && !event.buttons) return;
      pendingInput ??= telemetryRef.current.start();
    };
    const subscription = interactor.onRenderEvent(() => {
      if (pendingInput !== null) telemetryRef.current.record('inputToRenderCpu', pendingInput);
      pendingInput = null;
    });
    for (const event of ['pointerdown', 'pointermove', 'wheel']) container.addEventListener(event, onInput, { capture: true, passive: true });
    return () => {
      subscription.unsubscribe();
      for (const event of ['pointerdown', 'pointermove', 'wheel']) container.removeEventListener(event, onInput, true);
    };
  }, [viewerEpoch]);

  // ---------------------------------------------------------------------------
  // 7. Representation / color / view preset helpers
  // ---------------------------------------------------------------------------
  const setRepresentation = (mode) => {
    setRepresentationMode(mode);
    if (!vtkRef.current?.actor) return;
    const repValue = mode === 'wireframe' ? 1 : mode === 'points' ? 0 : 2;
    vtkRef.current.actor.getProperty().setRepresentation(repValue);
    vtkRef.current.renderWindow.render();
  };

  const handleColorChange = (key) => {
    colorPresetRef.current = key;
    setColorPreset(key);
    if (!vtkRef.current?.actor) return;
    const p = COLOR_PRESETS[key];
    if (p) {
      vtkRef.current.actor.getProperty().setColor(...p.rgb);
      vtkRef.current.actor.getProperty().setDiffuse(p.diffuse);
      vtkRef.current.actor.getProperty().setSpecular(p.specular);
      vtkRef.current.renderWindow.render();
    }
  };

  const applyViewPreset = (key) => {
    if (!vtkRef.current?.renderer) return;
    const p = VIEW_PRESETS[key];
    if (!p) return;
    const camera = vtkRef.current.renderer.getActiveCamera();
    const bounds = vtkRef.current.actor.getBounds();
    const center = [0, 1, 2].map((axis) => (bounds[axis * 2] + bounds[axis * 2 + 1]) / 2);
    const radius = Math.hypot(bounds[1] - bounds[0], bounds[3] - bounds[2], bounds[5] - bounds[4]);
    const length = Math.hypot(...p.position);
    camera.setPosition(...center.map((value, index) => value + p.position[index] / length * radius * 1.5));
    camera.setFocalPoint(...center);
    camera.setViewUp(...p.viewUp);
    vtkRef.current.renderer.resetCameraClippingRange();
    vtkRef.current.renderWindow.render();
  };

  const handleResetView = () => {
    if (!vtkRef.current?.renderer) return;
    vtkRef.current.renderer.resetCamera();
    vtkRef.current.renderWindow.render();
  };

  // ---------------------------------------------------------------------------
  // Derived display values
  // ---------------------------------------------------------------------------
  const patientName = study?.patient?.name || study?.patientName || 'Pasien 3D Scan';
  const scanIdentifier = study?.folderName || study?.scanIdentifier || `SCAN-3D-${studyId}`;
  const metadata = statusData?.metadata || study?.metadata || {};
  const metrics = statusData?.metrics || metadata?.metrics || {};
  const lidra = statusData?.lidra || metadata?.lidra || {};
  const engine = metrics?.engine || metadata?.reconstructionEngine || statusData?.job?.reconstructionEngine || 'Tidak tersedia';
  const qualityScore = lidra?.qualityScore;
  const qualityLabel = typeof qualityScore === 'number' ? `${qualityScore}% (heuristik akuisisi)` : 'Tidak tersedia';
  const geometryQuality = statusData?.qualityAssessment || metadata?.qualityAssessment;
  const geometryInsufficient = geometryQuality?.status === 'insufficient'
    || statusData?.job?.failureCode === 'RECONSTRUCTION_GEOMETRY_INSUFFICIENT';

  // ---------------------------------------------------------------------------
  // Render State 1: Capture / Queued / Processing
  // ---------------------------------------------------------------------------
  if (['created', 'pending_capture', 'uploaded', 'queued', 'processing'].includes(scanStatus)) {
    const progress = statusData?.progressPercent ?? 0;
    const stage = statusData?.currentStage || (scanStatus === 'processing' ? 'surface_reconstruction' : 'queued');
    const waitingForVideo = scanStatus === 'created' || scanStatus === 'pending_capture';
    const waitingForQueue = scanStatus === 'uploaded';
    const isReconstructing = scanStatus === 'processing' || scanStatus === 'queued';

    return (
      <div className="relative h-full w-full bg-slate-950 flex flex-col items-center justify-center p-6 text-white select-none">
        <div className="absolute top-4 left-4 z-20 flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold backdrop-blur border border-slate-700/60 transition"
          >
            <AppIcon name="ArrowLeft" size={14} />
            <span>Kembali ke Galeri</span>
          </button>
        </div>

        <div className="max-w-md w-full bg-slate-900/90 border border-cyan-500/20 rounded-3xl p-8 shadow-2xl backdrop-blur-xl text-center space-y-6">
          <div className="relative inline-flex items-center justify-center">
            <div className={`w-20 h-20 rounded-full border-4 border-cyan-500/20 border-t-cyan-400 ${isReconstructing ? 'animate-spin' : ''}`} />
            <div className="absolute inset-0 flex items-center justify-center">
              <AppIcon name="Cpu" size={32} className="text-cyan-400 animate-pulse" />
            </div>
          </div>

          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-xs font-semibold uppercase tracking-wider mb-2">
              <span className={`w-2 h-2 rounded-full bg-cyan-400 ${isReconstructing ? 'animate-ping' : ''}`} />
              {waitingForVideo ? 'Menunggu Rekaman Video' : (waitingForQueue ? 'Video Diterima' : 'Rekonstruksi 3D Berjalan')}
            </span>
            <h3 className="text-xl font-bold text-white tracking-tight">{patientName}</h3>
            <p className="text-xs text-slate-400 font-mono mt-0.5">{scanIdentifier}</p>
          </div>

          {isReconstructing && <div className="space-y-2 text-left">
            <div className="flex justify-between text-xs text-slate-300">
              <span className="font-semibold capitalize text-cyan-200">{stage.replace(/_/g, ' ')}</span>
              <span className="font-mono text-cyan-400 font-bold">{progress}%</span>
            </div>
            <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700/60 p-0.5">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>}

          {isReconstructing && <div className="grid grid-cols-2 gap-3 text-left">
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Engine</div>
              <div className="text-xs font-bold text-cyan-300 truncate mt-0.5">{engine}</div>
            </div>
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Skor Kualitas LIDRA</div>
              <div className="text-xs font-bold text-emerald-400 mt-0.5">{qualityLabel}</div>
            </div>
          </div>}

          <p className="text-[11px] text-slate-400 italic">
            {waitingForVideo
              ? 'Belum ada video yang siap dianalisis. Rekam dan unggah video dari aplikasi dokter gigi.'
              : (waitingForQueue
                ? 'Video telah diterima. Pemrosesan belum dimulai.'
                : 'Model 3D sedang diekstrak dan disaring geometrinya. Halaman ini akan memuat model secara otomatis begitu proses selesai.')}
          </p>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render State 2: Failed
  // ---------------------------------------------------------------------------
  if ((scanStatus === 'failed' && !diagnosticMode) || scanStatus === 'unavailable') {
    return (
      <div className="relative h-full w-full bg-slate-950 flex flex-col items-center justify-center p-6 text-white select-none">
        <div className="absolute top-4 left-4 z-20">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700"
          >
            <AppIcon name="ArrowLeft" size={14} />
            <span>Kembali ke Galeri</span>
          </button>
        </div>

        <div className="max-w-md w-full bg-slate-900 border border-rose-500/30 rounded-3xl p-8 shadow-2xl text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
            <AppIcon name="AlertTriangle" size={32} />
          </div>

          <div>
            <h3 className="text-lg font-bold text-white">{scanStatus === 'unavailable' ? 'Status Scan Tidak Tersedia' : (geometryInsufficient ? 'Mesh Belum Memadai' : 'Rekonstruksi 3D Belum Berhasil')}</h3>
            <p className="text-xs text-rose-300 mt-1">
              {assetError || statusData?.failureReason || metadata?.failureReason || 'Pemrosesan gagal. Periksa ketersediaan engine dan laporan scan.'}
            </p>
          </div>

          {geometryInsufficient && <div className="bg-slate-950/70 border border-amber-500/20 rounded-xl p-3 text-left text-xs text-slate-300 space-y-1">
            <div>Frame terdaftar: {geometryQuality?.registeredFrames ?? '—'} · Vertex: {geometryQuality?.vertexCount ?? '—'} · Face: {geometryQuality?.faceCount ?? '—'}</div>
            {geometryQuality?.reasons?.includes('CAPTURE_TARGET_SCREEN_SUSPECTED') && <div>Video tampak merekam layar. Rekam permukaan gigi atau model fisik secara langsung.</div>}
            {geometryQuality?.reasons?.length > 0 && <div>Alasan pemeriksaan: {geometryQuality.reasons.join(', ')}</div>}
            <div>Cakupan gigi belum dapat diverifikasi. Aset percobaan ini tidak dipublikasikan sebagai mesh siap pakai.</div>
          </div>}
          {scanStatus === 'failed' && !geometryInsufficient && <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 text-left text-xs text-slate-400 space-y-1">
            <div>• Pastikan video mencakup lengkung gigi secara perlahan.</div>
            <div>• Hindari pencahayaan terlalu gelap atau gerakan buram.</div>
          </div>}

          {scanStatus === 'failed' && statusData?.status === 'failed' && statusData?.job?.recoverable !== false && (
            <button
              onClick={handleRetry}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-cyan-600/20"
            >
              <AppIcon name="RefreshCw" size={14} />
              <span>Coba Lagi Rekonstruksi 3D</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render State 3: Ready (Interactive VTK 3D Canvas + Measurement overlay)
  // ---------------------------------------------------------------------------
  if (scanStatus === 'loading') return <div className="p-6 text-slate-300">Memverifikasi status dan akses aset 3D…</div>;

  return (
    <div className="relative h-full w-full bg-slate-950 overflow-hidden flex flex-col select-none">
      {/* 3D WebGL Canvas */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full z-0" />

      {diagnosticMode && <div className="absolute top-20 left-4 right-4 z-20 pointer-events-none max-w-xl rounded-xl border border-amber-400/50 bg-slate-950/90 px-4 py-3 text-amber-100 shadow-xl">
        <div className="text-sm font-bold">Mesh diagnostik — belum merekonstruksi gigi</div>
        <div className="mt-1 text-xs">Frame: {statusData?.qualityAssessment?.registeredFrames ?? '—'} · Vertex: {statusData?.qualityAssessment?.vertexCount ?? '—'} · Face: {statusData?.qualityAssessment?.faceCount ?? '—'}. Bentuk ini hanya untuk menelusuri kegagalan, bukan pengukuran atau diagnosis.</div>
        {geometryQuality?.reasons?.includes('CAPTURE_TARGET_SCREEN_SUSPECTED') && <div className="mt-1 text-xs font-semibold">Video tampak merekam layar. Kamera perlu diarahkan ke gigi atau model fisik langsung untuk memperoleh permukaan 3D.</div>}
        {geometryQuality?.reasons?.length > 0 && <div className="mt-1 text-xs">{geometryQuality.reasons.length} pemeriksaan belum lolos. Buka Info Rekonstruksi untuk rincian teknis.</div>}
      </div>}

      {/* Measurement + Annotation Overlay */}
      {!isLoadingAsset && !diagnosticMode && (
        <Scan3DAnnotationOverlay
          subscribeToRender={subscribeToRender}
          measurements={visibleMeasurements}
          pendingPick={measState.pendingPick}
          worldToScreen={worldToScreen}
          activeTool={measState.tool}
          onDeleteMeasurement={(id) => measDispatch({ type: 'DELETE', id })}
          onRenameMeasurement={(id, label) => measDispatch({ type: 'RENAME', id, label })}
          onMoveMeasurementLabel={(id, offset) => measDispatch({ type: 'MOVE_LABEL', id, offset })}
          containerRef={containerRef}
        />
      )}

      {/* Phase 12 — Tooth Segmentation Overlay */}
      {showTeeth && !isLoadingAsset && vtkRef.current?.renderer && (
        <ToothSegmentationOverlay
          toothInstances={toothInstances}
          renderer={vtkRef.current.renderer}
          renderWindow={vtkRef.current.renderWindow}
          containerRef={containerRef}
          visible={showTeeth}
          selectedFdi={selectedFdi}
          onSelect={setSelectedFdi}
        />
      )}

      {/* Text annotation inline input */}
      {pendingTextInput && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-amber-400/30 rounded-2xl p-5 shadow-2xl w-72 space-y-3">
            <div className="flex items-center gap-2 text-amber-300 text-xs font-bold">
              <AppIcon name="Type" size={14} />
              <span>Tambah Catatan Teks</span>
            </div>
            <input
              ref={textInputRef}
              autoFocus
              type="text"
              value={pendingTextInput.value}
              onChange={e => setPendingTextInput(prev => ({ ...prev, value: e.target.value }))}
              placeholder="Ketik catatan klinis…"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-amber-400/60 placeholder:text-slate-500"
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  measDispatch({
                    type: 'PICK',
                    worldPoint: pendingTextInput.worldPoint,
                    textContent: pendingTextInput.value || 'Catatan',
                  });
                  setPendingTextInput(null);
                }
                if (e.key === 'Escape') setPendingTextInput(null);
              }}
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  measDispatch({
                    type: 'PICK',
                    worldPoint: pendingTextInput.worldPoint,
                    textContent: pendingTextInput.value || 'Catatan',
                  });
                  setPendingTextInput(null);
                }}
                className="flex-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-white text-xs font-bold py-2 transition"
              >
                Simpan
              </button>
              <button
                onClick={() => setPendingTextInput(null)}
                className="flex-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold py-2 transition"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoadingAsset && (
        <div className="absolute inset-0 z-20 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center space-y-4">
          <div className="w-12 h-12 rounded-full border-3 border-cyan-500/20 border-t-cyan-400 animate-spin" />
          <div className="text-center">
            <p className="text-sm font-bold text-white">Memuat Aset 3D Mesh...</p>
            <p className="text-xs text-cyan-300 font-mono mt-0.5">{loadProgress}%</p>
          </div>
        </div>
      )}

      {/* Asset Error Banner */}
      {assetError && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 bg-rose-950/90 border border-rose-500 text-rose-200 px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow-2xl">
          <AppIcon name="AlertCircle" size={14} />
          <span>{assetError}</span>
          <button onClick={initVtkViewer} className="underline font-bold ml-2">Coba Ulang</button>
        </div>
      )}

      {/* Top Floating Control Bar */}
      <div className="relative z-10 p-4 flex items-center justify-between pointer-events-none">
        {/* Left: Back & Patient Info */}
        <div className="flex items-center gap-3 pointer-events-auto">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900/80 hover:bg-slate-800 text-slate-200 rounded-xl text-xs font-semibold backdrop-blur border border-slate-700/60 transition shadow-lg"
          >
            <AppIcon name="ArrowLeft" size={14} />
            <span>Galeri</span>
          </button>

          <div className="bg-slate-900/80 backdrop-blur border border-slate-700/60 rounded-xl px-3 py-1.5 shadow-lg">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white">{patientName}</span>
              <span className="px-2 py-0.5 bg-gradient-to-r from-cyan-600 to-indigo-600 text-white rounded text-[10px] font-bold uppercase tracking-wider">
                {diagnosticMode ? 'Mesh Diagnostik' : 'Kandidat Mesh 3D'}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2 mt-0.5">
              <span>{scanIdentifier}</span>
              <span>•</span>
              <span className="text-amber-300 font-semibold">Eksperimental · cakupan gigi belum diverifikasi · {assetSafety.capability} · skala {assetSafety.scaleStatus}</span>
              {measState.measurements.length > 0 && (
                <>
                  <span>•</span>
                  <span className="text-emerald-300 font-semibold">
                    {measState.measurements.length} anotasi
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={() => setShowMetadataDrawer(prev => !prev)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold backdrop-blur border transition shadow-lg ${
              showMetadataDrawer
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                : 'bg-slate-900/80 border-slate-700/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <AppIcon name="Info" size={14} />
            <span>Info Rekonstruksi</span>
          </button>

          {/* Phase 12 — Tooth Segmentation Toggle */}
          {scanStatus === 'ready' && (
            <button
              onClick={() => {
                if (!showTeeth) {
                  setShowTeeth(true);
                  if (segmentationStatus === 'not_computed' || segmentationStatus === 'idle') {
                    triggerSegmentation();
                  }
                } else {
                  setShowTeeth(false);
                  setSelectedFdi(null);
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold backdrop-blur border transition shadow-lg ${
                showTeeth
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                  : 'bg-slate-900/80 border-slate-700/60 text-slate-300 hover:bg-slate-800'
              }`}
              title="Tampilkan Segmentasi Gigi & FDI"
            >
              <AppIcon name="Grid3x3" size={14} />
              <span>Segmentasi Gigi</span>
              {showTeeth && toothLoading && (
                <span className="w-3 h-3 rounded-full border border-emerald-300 border-t-transparent animate-spin" />
              )}
              {showTeeth && !toothLoading && toothInstances.length > 0 && (
                <span className="px-1.5 py-0.5 bg-emerald-500/30 text-emerald-200 rounded text-[10px] font-bold">
                  {toothInstances.length}
                </span>
              )}
            </button>
          )}

          {toggleFullscreen && (
            <button
              onClick={toggleFullscreen}
              className="p-2 bg-slate-900/80 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-700/60 backdrop-blur transition shadow-lg"
              title={isFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh'}
            >
              <AppIcon name={isFullscreen ? 'Minimize' : 'Maximize'} size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Bottom Floating Viewer Toolbars */}
      <div className="absolute bottom-4 left-4 z-10 flex flex-wrap items-center gap-2 pointer-events-auto">
        {/* Reset Camera View */}
        <button
          onClick={handleResetView}
          className="flex items-center gap-1.5 px-3 py-2 bg-slate-900/85 hover:bg-slate-800 text-slate-200 rounded-xl text-xs font-semibold backdrop-blur border border-slate-700/60 transition shadow-lg"
          title="Kembalikan Sudut Kamera ke Posisi Semula"
        >
          <AppIcon name="RotateCcw" size={14} />
          <span>Reset Tampilan</span>
        </button>

        {/* View Presets */}
        <div className="flex items-center bg-slate-900/85 backdrop-blur border border-slate-700/60 rounded-xl p-1 shadow-lg">
          {Object.entries(VIEW_PRESETS).map(([key, item]) => (
            <button
              key={key}
              onClick={() => applyViewPreset(key)}
              className="px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-lg transition"
            >
              {item.name}
            </button>
          ))}
        </div>

        {/* Representation Mode Toggle */}
        <div className="flex items-center bg-slate-900/85 backdrop-blur border border-slate-700/60 rounded-xl p-1 shadow-lg">
          <button
            onClick={() => setRepresentation('surface')}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition ${representationMode === 'surface' ? 'bg-cyan-500 text-white shadow-sm' : 'text-slate-300 hover:text-white'}`}
          >
            Permukaan
          </button>
          <button
            onClick={() => setRepresentation('wireframe')}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition ${representationMode === 'wireframe' ? 'bg-cyan-500 text-white shadow-sm' : 'text-slate-300 hover:text-white'}`}
          >
            Wireframe
          </button>
          <button
            onClick={() => setRepresentation('points')}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition ${representationMode === 'points' ? 'bg-cyan-500 text-white shadow-sm' : 'text-slate-300 hover:text-white'}`}
          >
            Titik
          </button>
        </div>

        {/* Color Presets */}
        <div className="flex items-center bg-slate-900/85 backdrop-blur border border-slate-700/60 rounded-xl p-1 shadow-lg">
          {Object.entries(COLOR_PRESETS).map(([key, item]) => (
            <button
              key={key}
              onClick={() => handleColorChange(key)}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition ${colorPreset === key ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              {item.name}
            </button>
          ))}
        </div>

        {/* Measurement & Annotation Toolbar */}
        {!isLoadingAsset && !diagnosticMode && (
          <Scan3DMeasurementToolbar
            canMeasure={assetSafety.canMeasure}
            activeTool={measState.tool}
            canUndo={measState.undoStack.length > 0}
            hasMeasurements={measState.measurements.length > 0}
            measurementCount={measState.measurements.length}
            onSetTool={(tool) => { if (tool !== TOOLS.DISTANCE || assetSafety.canMeasure) measDispatch({ type: 'SET_TOOL', tool }); }}
            onUndo={() => measDispatch({ type: 'UNDO' })}
            onClearAll={() => measDispatch({ type: 'CLEAR' })}
          />
        )}
      </div>

      {/* Right Slide-in Info Drawer */}
      {showMetadataDrawer && (
        <aside className="absolute right-0 top-0 z-30 h-full w-80 bg-slate-900/95 backdrop-blur-xl border-l border-slate-700 p-5 shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <AppIcon name="Box" size={16} className="text-cyan-400" />
                <h4 className="text-sm font-bold text-white">Inspeksi Rekonstruksi</h4>
              </div>
              <button
                onClick={() => setShowMetadataDrawer(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                <AppIcon name="X" size={16} />
              </button>
            </div>

            {/* Pipeline Specs */}
            <div className="space-y-3">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Engine & Performa</div>
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Reconstruction Engine:</span>
                  <span className="font-mono text-cyan-300 font-semibold">{engine}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Waktu Proses:</span>
                  <span className="font-mono text-white">{metrics?.durationMs ?? metrics?.processingTimeMs ?? 'Tidak tersedia'} ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Keyframe Input:</span>
                  <span className="font-mono text-white">{metrics?.inputFrameCount ?? metrics?.sampledFrames ?? 'Tidak tersedia'} frame</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Format Aset:</span>
                  <span className="font-mono text-white">{telemetrySnapshot?.facts?.format || 'Tidak tersedia'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Status Klinis:</span>
                  <span className="font-mono text-emerald-400 font-bold">{assetSafety.clinicalStatus}</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-xs space-y-2">
              <button onClick={() => setTelemetrySnapshot(telemetryRef.current.snapshot())} className="text-cyan-300">Perbarui pengukuran viewer</button>
              <p>Load: {telemetrySnapshot?.durationsMs?.loadToFirstRender?.latest?.toFixed(1) ?? 'Tidak tersedia'} ms</p>
              <p>Render CPU: {telemetrySnapshot?.durationsMs?.initialRenderCpu?.latest?.toFixed(1) ?? 'Tidak tersedia'} ms</p>
              <p>Pick: {telemetrySnapshot?.durationsMs?.surfacePick?.latest?.toFixed(1) ?? 'Tidak tersedia'} ms</p>
              <p>Input ke render CPU: {telemetrySnapshot?.durationsMs?.inputToRenderCpu?.latest?.toFixed(1) ?? 'Tidak tersedia'} ms</p>
              <p>FPS / memori GPU: tidak diukur</p>
              <p>Heap JS: {telemetrySnapshot?.facts?.jsHeapUsedBytes ?? 'API tidak tersedia'} bytes</p>
              <p className="text-slate-400">Durasi CPU lokal, bukan validasi klinis atau waktu selesai GPU.</p>
            </div>

            {/* Quality diagnostics */}
            {geometryQuality?.reasons?.length > 0 && (
              <div className="space-y-2">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Alasan pemeriksaan</div>
                <div className="bg-slate-950/60 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-100 break-words">
                  {geometryQuality.reasons.map(reason => <div key={reason}>{reason}</div>)}
                </div>
              </div>
            )}

            {/* Geometry Specs */}
            <div className="space-y-3">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Geometri Permukaan</div>
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Jumlah Vertex:</span>
                  <span className="font-mono text-white">{stats.vertexCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Jumlah Poligon/Face:</span>
                  <span className="font-mono text-white">{stats.faceCount ?? 'Tidak tersedia'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Koordinat / Satuan:</span>
                  <span className="font-mono text-cyan-300">{assetSafety.coordinateSystem} / {assetSafety.units}</span>
                </div>
              </div>
            </div>

            {/* Annotations Summary */}
            {measState.measurements.length > 0 && (
              <div className="space-y-3">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Anotasi Visual ({measState.measurements.length})
                </div>
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 space-y-2 text-xs max-h-48 overflow-y-auto">
                  {measState.measurements.map((m, i) => (
                    <div key={m.id} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="shrink-0 text-[10px] text-slate-500 font-mono w-4">{i + 1}.</span>
                        <span className={`truncate font-medium ${
                          m.type === 'measurement' ? 'text-cyan-300' :
                          m.type === 'point' ? 'text-sky-300' : 'text-amber-300'
                        }`}>
                          {m.metadata?.label || m.metadata?.text || `${m.metadata?.distance_mm?.toFixed(2)} mm`}
                        </span>
                      </div>
                      <button
                        onClick={() => measDispatch({ type: 'DELETE', id: m.id })}
                        className="shrink-0 text-slate-500 hover:text-rose-400 transition"
                        title="Hapus"
                      >
                        <AppIcon name="X" size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Phase 12 — Tooth Segmentation Panel */}
            {showTeeth && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Segmentasi Gigi FDI
                  </div>
                  {toothInstances.length === 0 && !toothLoading && (
                    <button
                      onClick={triggerSegmentation}
                      className="text-[10px] text-emerald-400 hover:text-emerald-300 font-semibold transition"
                    >
                      Jalankan
                    </button>
                  )}
                </div>
                {toothLoading && (
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="w-3 h-3 rounded-full border border-slate-400 border-t-transparent animate-spin" />
                    <span>Mendeteksi gigi...</span>
                  </div>
                )}
                {!toothLoading && toothInstances.length > 0 && (
                  <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 space-y-1.5 text-xs max-h-52 overflow-y-auto">
                    {toothInstances.map(inst => (
                      <button
                        key={inst.fdi}
                        onClick={() => setSelectedFdi(prev => prev === inst.fdi ? null : inst.fdi)}
                        className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg transition ${
                          selectedFdi === inst.fdi ? 'bg-emerald-500/20 text-emerald-200' : 'hover:bg-slate-800 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ background: inst.color_hint }}
                          />
                          <span className="font-bold">FDI {inst.fdi}</span>
                          <span className="text-slate-500 capitalize">{inst.type}</span>
                        </div>
                        <span className="text-[10px] text-slate-500">{inst.method || inst.segmentation_method || 'Metode tidak tersedia'}</span>
                      </button>
                    ))}
                  </div>
                )}
                {!toothLoading && toothInstances.length === 0 && segmentationStatus !== 'idle' && (
                  <p className="text-[11px] text-slate-500">Belum ada data segmentasi.</p>
                )}
                <div className="px-2 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                  <p className="text-[10px] text-emerald-300/70 leading-relaxed">
                    ⚠ Segmentasi geometrik eksperimental. FDI berdasarkan posisi lengkung, bukan ML.
                  </p>
                </div>
              </div>
            )}

            {/* Research Disclaimer */}
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1">
              <div className="flex items-center gap-1.5 text-amber-300 text-xs font-bold">
                <AppIcon name="AlertCircle" size={14} />
                <span>Referensi Riset Eksperimental</span>
              </div>
              <p className="text-[11px] text-amber-200/80 leading-relaxed">
                Aset eksperimental untuk visualisasi. Skala dan orientasi anatomi belum tervalidasi. Rendering bukan bukti akurasi; tidak untuk diagnosis atau pengukuran klinis.
              </p>
            </div>
          </div>

          {/* Download Mesh Asset */}
          {!diagnosticMode && <div className="pt-4 border-t border-slate-800">
            <button
              onClick={handleDownload}
              disabled={!assetUrlFromStatus}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition border border-slate-700"
            >
              <AppIcon name="Download" size={14} />
              <span>Unduh Aset Eksperimental Asli</span>
            </button>
          </div>}
        </aside>
      )}
    </div>
  );
};

export default Scan3DMeshViewer;
