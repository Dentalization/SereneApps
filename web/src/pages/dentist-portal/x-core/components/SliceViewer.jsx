import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';

// VTK.js — 2D slice rendering (reuses Volume profile already loaded by VolumeViewer3D)
import '@kitware/vtk.js/Rendering/Profiles/Volume';
import { PY_API_BASE } from '../../../../config/api';

import vtkGenericRenderWindow   from '@kitware/vtk.js/Rendering/Misc/GenericRenderWindow';
import vtkImageMapper            from '@kitware/vtk.js/Rendering/Core/ImageMapper';
import vtkImageSlice             from '@kitware/vtk.js/Rendering/Core/ImageSlice';
import vtkColorTransferFunction  from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction';
import vtkPiecewiseFunction      from '@kitware/vtk.js/Common/DataModel/PiecewiseFunction';
import vtkInteractorStyleImage   from '@kitware/vtk.js/Interaction/Style/InteractorStyleImage';
import vtkXMLImageDataReader     from '@kitware/vtk.js/IO/XML/XMLImageDataReader';

import { SlicingMode } from '@kitware/vtk.js/Rendering/Core/ImageMapper/Constants';

import AppIcon from '../../../../components/AppIcon';
import SeriesSidebar from './SeriesSidebar';

// ─── Reuse the global volume cache from VolumeViewer3D ───────────
const VOLUME_CACHE_VERSION = 2;
function makeLRUCache(maxSize) {
  const map = new Map();
  return {
    has: k => map.has(k),
    get(k) { if (!map.has(k)) return undefined; const v = map.get(k); map.delete(k); map.set(k, v); return v; },
    set(k, v) { if (map.has(k)) map.delete(k); if (map.size >= maxSize) map.delete(map.keys().next().value); map.set(k, v); },
    delete: k => map.delete(k),
    clear: () => map.clear(),
    get size() { return map.size; },
    keys: () => map.keys(),
  };
}

if (!window.__volumeCache || window.__volumeCacheVersion !== VOLUME_CACHE_VERSION) {
    window.__volumeCache = makeLRUCache(3);
    window.__volumeCacheVersion = VOLUME_CACHE_VERSION;
}
const volumeCache = window.__volumeCache;

// ─── Axis Definitions ────────────────────────────────────────────
// NOTE: Static Tailwind class maps — JIT cannot detect dynamic `text-${color}-400` patterns
const AXIS = {
    axial:    { slicingMode: SlicingMode.K, dimIndex: 2, camUp: [0, -1, 0], camDir: [0, 0, -1], label: 'Axial',
        activeBtn: 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50',
        labelClass: 'text-cyan-400' },
    coronal:  { slicingMode: SlicingMode.J, dimIndex: 1, camUp: [0, 0,  1], camDir: [0, -1, 0], label: 'Coronal',
        activeBtn: 'bg-purple-500/20 text-purple-400 border border-purple-500/50',
        labelClass: 'text-purple-400' },
    sagittal: { slicingMode: SlicingMode.I, dimIndex: 0, camUp: [0, 0,  1], camDir: [-1, 0, 0], label: 'Sagittal',
        activeBtn: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50',
        labelClass: 'text-emerald-400' },
};

// MONAI-normalized [0.0, 1.0] where 0.0=Air(-1000HU), 1.0=Metal(3000HU)
const WL_PRESETS = {
    dental:    { center: 0.38, width: 0.70, label: 'Dental'     },
    bone:      { center: 0.45, width: 0.50, label: 'Bone'       },
    soft:      { center: 0.28, width: 0.30, label: 'Soft Tissue'},
    full:      { center: 0.50, width: 1.00, label: 'Full Range' },
};

const SliceViewer = ({ study, onBack, onSwitchTo3D, onSwitchSeries }) => {
    const wrapperRef = useRef(null);   // Outer wrapper for fullscreen
    const vtkContainerRef = useRef(null); // Dedicated div for VTK.js rendering
    const vtkRef = useRef(null); // { grw, renderer, mapper, actor, renderWindow, imageData }
    const pendingGrwRef = useRef(null);

    // State
    const [axis, setAxis] = useState('axial');
    const [sliceIndex, setSliceIndex] = useState(0);
    const [maxSlice, setMaxSlice] = useState(0);
    const [dimensions, setDimensions] = useState([0, 0, 0]);
    const [spacing, setSpacing] = useState([1, 1, 1]);
    const [loading, setLoading] = useState(true);
    const [loadingStage, setLoadingStage] = useState('Loading volume...');
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [error, setError] = useState(null);
    const [wlPreset, setWlPreset] = useState('dental');
    const [windowCenter, setWindowCenter] = useState(WL_PRESETS.dental.center);
    const [windowWidth, setWindowWidth] = useState(WL_PRESETS.dental.width);
    const [inverted, setInverted] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showSeriesPanel, setShowSeriesPanel] = useState(false);
    const [volumeInfo, setVolumeInfo] = useState(null);

    // Stable study key for cache lookup
    const studyKey = useMemo(() => study?.folderName || study?.id || '', [study]);
    const seriesUid = useMemo(() => study?.selectedSeriesUid || '', [study]);
    const cacheKey = useMemo(() => `${studyKey}__${seriesUid}`, [studyKey, seriesUid]);

    // ── Build Color Transfer Function (Window/Level) ─────────────
    const buildColorFunction = useCallback((center, width, invert) => {
        const ctf = vtkColorTransferFunction.newInstance();
        const low = center - width / 2;
        const high = center + width / 2;

        if (invert) {
            ctf.addRGBPoint(low,  1.0, 1.0, 1.0);
            ctf.addRGBPoint(high, 0.0, 0.0, 0.0);
        } else {
            ctf.addRGBPoint(low,  0.0, 0.0, 0.0);
            ctf.addRGBPoint(high, 1.0, 1.0, 1.0);
        }
        return ctf;
    }, []);

    const buildOpacityFunction = useCallback(() => {
        const ofun = vtkPiecewiseFunction.newInstance();
        ofun.addPoint(0.0, 1.0);
        ofun.addPoint(1.0, 1.0);
        return ofun;
    }, []);

    // ── Apply Window/Level to existing actor ─────────────────────
    const applyWindowLevel = useCallback((center, width, invert) => {
        const ctx = vtkRef.current;
        if (!ctx || !ctx.actor) return;

        const ctf = buildColorFunction(center, width, invert);
        ctx.actor.getProperty().setRGBTransferFunction(0, ctf);

        const ofun = buildOpacityFunction();
        ctx.actor.getProperty().setPiecewiseFunction(0, ofun);

        ctx.renderWindow.render();
    }, [buildColorFunction, buildOpacityFunction]);

    // ── Switch axis ──────────────────────────────────────────────
    const switchAxis = useCallback((newAxis) => {
        const ctx = vtkRef.current;
        if (!ctx) return;

        const axisDef = AXIS[newAxis];
        const dims = ctx.imageData.getDimensions();
        const sp = ctx.imageData.getSpacing();
        const origin = ctx.imageData.getOrigin();
        const maxIdx = dims[axisDef.dimIndex] - 1;
        const centerIdx = Math.floor(maxIdx / 2);

        // Update mapper slicing
        ctx.mapper.setSlicingMode(axisDef.slicingMode);
        ctx.mapper.setSlice(centerIdx);

        // Position camera for the new axis
        const cam = ctx.renderer.getActiveCamera();
        cam.setParallelProjection(true);

        // Compute center of volume
        const cx = origin[0] + (dims[0] * sp[0]) / 2;
        const cy = origin[1] + (dims[1] * sp[1]) / 2;
        const cz = origin[2] + (dims[2] * sp[2]) / 2;
        const center = [cx, cy, cz];

        // Position camera along the slice normal
        const dist = Math.max(dims[0] * sp[0], dims[1] * sp[1], dims[2] * sp[2]) * 2;
        const pos = [
            center[0] + axisDef.camDir[0] * dist,
            center[1] + axisDef.camDir[1] * dist,
            center[2] + axisDef.camDir[2] * dist,
        ];

        cam.setPosition(...pos);
        cam.setFocalPoint(...center);
        cam.setViewUp(...axisDef.camUp);

        ctx.renderer.resetCamera();

        // Ensure tight fit — zoom a bit more to fill screen
        cam.zoom(1.3);

        ctx.renderWindow.render();

        setAxis(newAxis);
        setSliceIndex(centerIdx);
        setMaxSlice(maxIdx);
    }, []);

    // ── Navigate to a specific slice ─────────────────────────────
    const goToSlice = useCallback((idx) => {
        const ctx = vtkRef.current;
        if (!ctx) return;

        const axisDef = AXIS[axis];
        const dims = ctx.imageData.getDimensions();
        const clamped = Math.max(0, Math.min(dims[axisDef.dimIndex] - 1, idx));

        ctx.mapper.setSlice(clamped);
        ctx.renderWindow.render();
        setSliceIndex(clamped);
    }, [axis]);

    // ── Mouse-wheel scroll → slice navigation ────────────────────
    // Uses capture phase + stopPropagation so VTK's interactor never sees the wheel event
    const handleWheel = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        const delta = e.deltaY > 0 ? 1 : -1;
        setSliceIndex(prev => {
            const next = prev + delta;
            const ctx = vtkRef.current;
            if (!ctx) return prev;
            const axisDef = AXIS[axis];
            const dims = ctx.imageData.getDimensions();
            const maxIdx = dims[axisDef.dimIndex] - 1;
            const clamped = Math.max(0, Math.min(maxIdx, next));
            ctx.mapper.setSlice(clamped);
            ctx.renderWindow.render();
            return clamped;
        });
    }, [axis]);

    // ── Fullscreen ───────────────────────────────────────────────
    useEffect(() => {
        const onFSChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', onFSChange);
        return () => document.removeEventListener('fullscreenchange', onFSChange);
    }, []);

    const toggleFullscreen = useCallback(() => {
        if (!document.fullscreenElement && wrapperRef.current) {
            wrapperRef.current.requestFullscreen().catch(() => {});
        } else {
            document.exitFullscreen().catch(() => {});
        }
    }, []);

    // ── Apply WL preset changes ──────────────────────────────────
    useEffect(() => {
        applyWindowLevel(windowCenter, windowWidth, inverted);
    }, [windowCenter, windowWidth, inverted, applyWindowLevel]);

    // ══════════════════════════════════════════════════════════════
    //  MAIN SETUP: Load imageData from cache or fetch, create VTK pipeline
    // ══════════════════════════════════════════════════════════════
    useEffect(() => {
        if (!study) return;

        let cancelled = false;

        const init = async () => {
            setLoading(true);
            setError(null);

            try {
                // ── Step 1: Get vtkImageData from cache or fetch ──
                let imageData;

                if (volumeCache.has(cacheKey)) {
                    console.log('[SliceViewer] Cache HIT:', cacheKey);
                    setLoadingStage('Restoring from cache...');
                    setLoadingProgress(80);
                    imageData = volumeCache.get(cacheKey);
                } else {
                    console.log('[SliceViewer] Cache MISS:', cacheKey, '| Downloading VTI...');
                    const url = `${PY_API_BASE}/volume/${studyKey}${seriesUid ? '?series_uid=' + seriesUid : ''}`;

                    setLoadingStage('Downloading 3D volume...');
                    setLoadingProgress(5);

                    const response = await fetch(url);
                    if (!response.ok) {
                        throw new Error(`Server error ${response.status}`);
                    }

                    const contentLength = response.headers.get('Content-Length');
                    const totalBytes = contentLength ? parseInt(contentLength) : 0;
                    const reader = response.body.getReader();
                    const chunks = [];
                    let received = 0;

                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        if (cancelled) return;
                        chunks.push(value);
                        received += value.length;
                        if (totalBytes > 0) {
                            setLoadingProgress(5 + Math.round((received / totalBytes) * 65));
                            setLoadingStage(`Downloading... ${(received / 1048576).toFixed(1)}MB / ${(totalBytes / 1048576).toFixed(1)}MB`);
                        } else {
                            setLoadingStage(`Downloading... ${(received / 1048576).toFixed(1)}MB`);
                        }
                    }
                    if (cancelled) return;

                    setLoadingStage('Decompressing...');
                    setLoadingProgress(72);

                    const buffer = new Uint8Array(received);
                    let offset = 0;
                    for (const c of chunks) { buffer.set(c, offset); offset += c.length; }

                    setLoadingStage('Parsing VTI...');
                    setLoadingProgress(78);

                    const vtiReader = vtkXMLImageDataReader.newInstance();
                    vtiReader.parseAsArrayBuffer(buffer.buffer);
                    imageData = vtiReader.getOutputData(0);

                    if (!imageData) throw new Error('VTI parse failed — no output data');

                    volumeCache.set(cacheKey, imageData);
                    console.log('[SliceViewer] Cached volume:', cacheKey);
                }

                if (cancelled) return;

                const dims = imageData.getDimensions();
                const sp = imageData.getSpacing();
                const scalars = imageData.getPointData().getScalars();
                const dataRange = scalars.getRange();

                setDimensions(dims);
                setSpacing(sp);
                setVolumeInfo({ dimensions: dims, spacing: sp, dataRange });
                console.log('[SliceViewer] Volume:', { dims, sp, dataRange });

                setLoadingStage('Initializing MPR viewer...');
                setLoadingProgress(90);

                // ── Step 2: Wait for container to be ready ──
                const container = vtkContainerRef.current;
                if (!container || cancelled) return;

                // Clean up any previous VTK context
                if (vtkRef.current) {
                    try { vtkRef.current.grw.delete(); } catch (_) {}
                    vtkRef.current = null;
                }

                // ── Step 3: Build VTK.js 2D pipeline ──
                const grw = vtkGenericRenderWindow.newInstance();
                pendingGrwRef.current = grw;
                grw.setContainer(container);
                grw.resize();

                const renderer = grw.getRenderer();
                const renderWindow = grw.getRenderWindow();

                // Dark background
                renderer.setBackground(0.05, 0.05, 0.08);

                // Interactor style: Image (pan, zoom, window/level)
                const iStyle = vtkInteractorStyleImage.newInstance();
                renderWindow.getInteractor().setInteractorStyle(iStyle);

                // Mapper
                const mapper = vtkImageMapper.newInstance();
                mapper.setInputData(imageData);

                // Start on Axial, center slice
                const axisDef = AXIS.axial;
                const maxIdx = dims[axisDef.dimIndex] - 1;
                const centerIdx = Math.floor(maxIdx / 2);
                mapper.setSlicingMode(axisDef.slicingMode);
                mapper.setSlice(centerIdx);

                // Actor with color-based W/L
                const actor = vtkImageSlice.newInstance();
                actor.setMapper(mapper);

                const ctf = buildColorFunction(windowCenter, windowWidth, inverted);
                actor.getProperty().setRGBTransferFunction(0, ctf);

                const ofun = buildOpacityFunction();
                actor.getProperty().setPiecewiseFunction(0, ofun);
                actor.getProperty().setInterpolationTypeToLinear();

                // CRITICAL: derive colorWindow/colorLevel from the CTF range
                // Default colorWindow=255/colorLevel=127.5 maps all [0,1] data to a single grey pixel
                actor.getProperty().setUseLookupTableScalarRange(true);

                renderer.addActor(actor);

                // Camera setup for Axial view
                const cam = renderer.getActiveCamera();
                cam.setParallelProjection(true);

                const origin = imageData.getOrigin();
                const cx = origin[0] + (dims[0] * sp[0]) / 2;
                const cy = origin[1] + (dims[1] * sp[1]) / 2;
                const cz = origin[2] + (dims[2] * sp[2]) / 2;

                const dist = Math.max(dims[0] * sp[0], dims[1] * sp[1], dims[2] * sp[2]) * 2;
                cam.setPosition(
                    cx + axisDef.camDir[0] * dist,
                    cy + axisDef.camDir[1] * dist,
                    cz + axisDef.camDir[2] * dist
                );
                cam.setFocalPoint(cx, cy, cz);
                cam.setViewUp(...axisDef.camUp);

                renderer.resetCamera();
                cam.zoom(1.3);

                renderWindow.render();

                // Store refs
                vtkRef.current = { grw, renderer, renderWindow, mapper, actor, imageData };

                setSliceIndex(centerIdx);
                setMaxSlice(maxIdx);
                setAxis('axial');
                setLoading(false);

                console.log('[SliceViewer] Ready — Axial slice', centerIdx, '/', maxIdx);

            } catch (err) {
                if (!cancelled) {
                    console.error('[SliceViewer] Error:', err);
                    setError(err.message || String(err));
                    setLoading(false);
                }
            }
        };

        init();

        return () => {
            cancelled = true;
            if (pendingGrwRef.current) {
                try { pendingGrwRef.current.delete(); } catch (_) {}
                pendingGrwRef.current = null;
            }
            if (vtkRef.current) {
                try { vtkRef.current.grw.delete(); } catch (_) {}
                vtkRef.current = null;
            }
        };
    }, [study, cacheKey, studyKey, seriesUid]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Handle resize ────────────────────────────────────────────
    useEffect(() => {
        const onResize = () => {
            const ctx = vtkRef.current;
            if (ctx) {
                ctx.grw.resize();
                ctx.renderer.resetCamera();
                ctx.renderer.getActiveCamera().zoom(1.3);
                ctx.renderWindow.render();
            }
        };
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    // ── Attach wheel handler to container ────────────────────────
    useEffect(() => {
        const el = vtkContainerRef.current;
        if (!el) return;
        // Capture phase fires BEFORE VTK's bubble-phase listener → we stopPropagation
        el.addEventListener('wheel', handleWheel, { passive: false, capture: true });
        return () => el.removeEventListener('wheel', handleWheel, { capture: true });
    }, [handleWheel]);

    // ── WL Preset change ─────────────────────────────────────────
    const selectWlPreset = useCallback((key) => {
        const p = WL_PRESETS[key];
        setWlPreset(key);
        setWindowCenter(p.center);
        setWindowWidth(p.width);
    }, []);

    // ══════════════════════════════════════════════════════════════
    //  RENDER
    // ══════════════════════════════════════════════════════════════
    const axisDef = AXIS[axis];

    return (
        <div ref={wrapperRef} className="flex flex-col h-full bg-slate-950 text-slate-100 rounded-3xl overflow-hidden shadow-2xl border border-slate-800">

            {/* ── Toolbar ── */}
            <div className="flex items-center justify-between p-3 bg-slate-900/95 border-b border-slate-800 backdrop-blur z-20">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
                        <AppIcon name="ArrowLeft" size={20} />
                    </button>
                    <div>
                        <h2 className="font-bold text-white text-sm">{study?.patientName || study?.originalName || 'Patient'}</h2>
                        <p className="text-[10px] text-slate-500">MPR Slice Viewer • {study?.folderName}</p>
                    </div>
                </div>

                <div className="flex items-center gap-1.5">
                    {/* Axis Buttons */}
                    {Object.entries(AXIS).map(([key, def]) => (
                        <button
                            key={key}
                            onClick={() => switchAxis(key)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                                axis === key
                                    ? def.activeBtn
                                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-transparent'
                            }`}
                        >
                            {def.label}
                        </button>
                    ))}

                    <div className="h-5 w-px bg-slate-800 mx-1" />

                    {/* W/L Presets */}
                    {Object.entries(WL_PRESETS).map(([key, p]) => (
                        <button
                            key={key}
                            onClick={() => selectWlPreset(key)}
                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition ${
                                wlPreset === key
                                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50'
                                    : 'bg-slate-800 text-slate-500 hover:bg-slate-700 hover:text-slate-300 border border-transparent'
                            }`}
                            title={p.label}
                        >
                            {p.label}
                        </button>
                    ))}

                    <div className="h-5 w-px bg-slate-800 mx-1" />

                    {/* Invert */}
                    <button
                        onClick={() => setInverted(v => !v)}
                        className={`p-1.5 rounded-lg transition ${inverted ? 'bg-yellow-500/20 text-yellow-400' : 'bg-slate-800 text-slate-500 hover:bg-slate-700'}`}
                        title="Invert (Film Negative)"
                    >
                        <AppIcon name="SunMoon" size={16} />
                    </button>

                    {/* 3D View */}
                    {study?.selectedSeriesType === '3D Volume' && (
                        <button
                            onClick={onSwitchTo3D}
                            className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-xs font-semibold transition shadow"
                            title="Switch to 3D Volume Rendering"
                        >
                            <AppIcon name="Box" size={14} />
                            3D
                        </button>
                    )}

                    {/* Series Panel Toggle */}
                    <button
                        onClick={() => setShowSeriesPanel(v => !v)}
                        className={`p-1.5 rounded-lg transition ${showSeriesPanel ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-500 hover:bg-slate-700'}`}
                        title="Series Panel"
                    >
                        <AppIcon name="Layers" size={16} />
                    </button>

                    {/* Fullscreen */}
                    <button onClick={toggleFullscreen} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400" title="Fullscreen">
                        <AppIcon name={isFullscreen ? "Minimize2" : "Maximize2"} size={16} />
                    </button>
                </div>
            </div>

            {/* ── Main VTK Container ── */}
            <div className="flex-1 relative bg-black">
                {/* VTK.js renders into this div via grw.setContainer() */}
                {/* VTK.js renders into this dedicated div */}
                <div
                    ref={vtkContainerRef}
                    className="absolute inset-0"
                    style={{ cursor: 'crosshair' }}
                />

                {/* ── Overlay: View label + slice info ── */}
                {!loading && !error && (
                    <>
                        {/* Top-left: Axis + Slice info */}
                        <div className="absolute top-3 left-3 z-10 pointer-events-none">
                            <span className={`text-xs font-mono font-bold bg-black/70 px-2 py-1 rounded ${axisDef.labelClass}`}>
                                {axisDef.label.toUpperCase()} [{sliceIndex + 1}/{maxSlice + 1}]
                            </span>
                        </div>

                        {/* Top-right: Volume info */}
                        {volumeInfo && (
                            <div className="absolute top-3 right-3 z-10 pointer-events-none text-[10px] font-mono text-slate-500 bg-black/60 px-2 py-1 rounded">
                                {volumeInfo.dimensions.join('×')} • {volumeInfo.spacing.map(s => s.toFixed(2)).join('×')}mm
                            </div>
                        )}

                        {/* Bottom-center: W/L readout */}
                        <div className="absolute bottom-14 left-1/2 -translate-x-1/2 z-10 pointer-events-none text-[10px] font-mono text-slate-500 bg-black/60 px-2 py-1 rounded">
                            W/L: {windowWidth.toFixed(3)} / {windowCenter.toFixed(3)}{inverted ? ' (Inv)' : ''}
                        </div>
                    </>
                )}

                {/* ── Slice Slider ── */}
                {!loading && !error && maxSlice > 0 && (
                    <div className="absolute bottom-3 left-4 right-4 z-10">
                        <input
                            type="range"
                            min={0}
                            max={maxSlice}
                            value={sliceIndex}
                            onChange={(e) => goToSlice(parseInt(e.target.value))}
                            className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                            style={{
                                background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${(sliceIndex / maxSlice) * 100}%, #1e293b ${(sliceIndex / maxSlice) * 100}%, #1e293b 100%)`,
                            }}
                        />
                    </div>
                )}

                {/* ── Loading overlay ── */}
                {loading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/95 z-30">
                        <div className="relative w-20 h-20 mb-4">
                            <svg className="animate-spin w-20 h-20" viewBox="0 0 80 80">
                                <circle cx="40" cy="40" r="35" strokeWidth="4" stroke="#1e293b" fill="none" />
                                <circle cx="40" cy="40" r="35" strokeWidth="4" stroke="#6366f1" fill="none"
                                    strokeDasharray={`${loadingProgress * 2.2} 220`} strokeLinecap="round"
                                    transform="rotate(-90 40 40)" />
                            </svg>
                            <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white">{loadingProgress}%</span>
                        </div>
                        <p className="text-sm font-semibold text-white mb-1">Loading MPR Viewer</p>
                        <p className="text-xs text-slate-400">{loadingStage}</p>
                    </div>
                )}

                {/* ── Error overlay ── */}
                {error && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/95 z-30 text-center p-8">
                        <AppIcon name="AlertTriangle" size={48} className="text-red-400 mb-4" />
                        <h3 className="text-lg font-bold text-red-400 mb-2">Failed to Load MPR</h3>
                        <p className="text-sm text-slate-400 max-w-md mb-4">{error}</p>
                        <button onClick={() => window.location.reload()} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-white text-sm">
                            Retry
                        </button>
                    </div>
                )}
            </div>

            {/* ── Series Sidebar ── */}
            <SeriesSidebar
                study={study}
                currentSeriesUid={study?.selectedSeriesUid}
                onSelectSeries={(series) => {
                    setShowSeriesPanel(false);
                    if (onSwitchSeries) onSwitchSeries(series);
                }}
                visible={showSeriesPanel}
                onClose={() => setShowSeriesPanel(false)}
                position="right"
            />
        </div>
    );
};

export default SliceViewer;
