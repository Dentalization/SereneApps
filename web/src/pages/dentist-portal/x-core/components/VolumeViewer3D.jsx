import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import '@kitware/vtk.js/favicon';
import '@kitware/vtk.js/Rendering/Profiles/Volume';

import vtkFullScreenRenderWindow from '@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow';
import vtkVolume from '@kitware/vtk.js/Rendering/Core/Volume';
import vtkVolumeMapper from '@kitware/vtk.js/Rendering/Core/VolumeMapper';
import vtkColorTransferFunction from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction';
import vtkPiecewiseFunction from '@kitware/vtk.js/Common/DataModel/PiecewiseFunction';
import vtkXMLImageDataReader from '@kitware/vtk.js/IO/XML/XMLImageDataReader';
import vtkPlane from '@kitware/vtk.js/Common/DataModel/Plane';
import AppIcon from '../../../../components/AppIcon';
import SeriesSidebar from './SeriesSidebar';

// ─── Global volume cache (on window to survive HMR) ────────────────────
// CACHE VERSION: bump this to force re-fetch after VTI regeneration
const VOLUME_CACHE_VERSION = 2;
if (!window.__volumeCache || window.__volumeCacheVersion !== VOLUME_CACHE_VERSION) {
  window.__volumeCache = new Map();
  window.__volumeCacheVersion = VOLUME_CACHE_VERSION;
  console.log('[VolumeViewer3D] Cache cleared — version', VOLUME_CACHE_VERSION);
}
const volumeCache = window.__volumeCache;

// ─── Constants ──────────────────────────────────────────────────────────
const SAMPLE_DISTANCE_INTERACTIVE = 1.0;
const SAMPLE_DISTANCE_STILL = 0.5;
const SLAB_MIN_MM = 1;
const SLAB_MAX_MM = 100;
const SLAB_DEFAULT_MM = 20;

// Window/Level defaults per render mode
// Data is MONAI-normalized [0.0, 1.0] where 0.0=Air(-1000HU), 0.25=Water(0HU), 1.0=Metal(3000HU)
const WL_DEFAULTS = {
    bone: { center: 0.40,  width: 0.60  },
    soft: { center: 0.28,  width: 0.25  },
    mip:  { center: 0.50,  width: 1.00  },
    xray: { center: 0.45,  width: 0.90  },
};

// Camera view presets (dental CBCT anatomical conventions)
const CAMERA_VIEWS = {
    front:  { position: [0, 0,  1], viewUp: [0, 1, 0], label: 'A', name: 'Anterior'  },
    back:   { position: [0, 0, -1], viewUp: [0, 1, 0], label: 'P', name: 'Posterior' },
    left:   { position: [-1, 0, 0], viewUp: [0, 1, 0], label: 'L', name: 'Left'      },
    right:  { position: [1,  0, 0], viewUp: [0, 1, 0], label: 'R', name: 'Right'     },
    top:    { position: [0,  1, 0], viewUp: [0, 0, -1], label: 'S', name: 'Superior'  },
    bottom: { position: [0, -1, 0], viewUp: [0, 0,  1], label: 'I', name: 'Inferior'  },
};

// Background colors per mode
const BG_COLORS = {
    bone: [0.08, 0.08, 0.12],
    soft: [0.08, 0.08, 0.12],
    mip:  [0.0,  0.0,  0.0],
    xray: [0.0,  0.0,  0.0],
};

const VolumeViewer3D = ({ study, onBack, onSwitchToSliceMode, onSwitchSeries }) => {
    const containerRef = useRef(null);
    const wrapperRef = useRef(null);
    const vtkContextRef = useRef(null);

    // Core state
    const [loading, setLoading] = useState(true);
    const [loadingStage, setLoadingStage] = useState('Connecting...');
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [error, setError] = useState(null);
    const [preset, setPreset] = useState('bone');
    const [autoRotate, setAutoRotate] = useState(false);
    const [containerReady, setContainerReady] = useState(false);
    const [volumeInfo, setVolumeInfo] = useState(null);

    // Slab
    const [slabThickness, setSlabThickness] = useState(SLAB_DEFAULT_MM);
    const [slabEnabled, setSlabEnabled] = useState(false);
    const slabThicknessRef = useRef(SLAB_DEFAULT_MM);
    const slabEnabledRef = useRef(false);

    // Window/Level (Brightness/Contrast)
    const [windowCenter, setWindowCenter] = useState(WL_DEFAULTS.bone.center);
    const [windowWidth, setWindowWidth] = useState(WL_DEFAULTS.bone.width);

    // Invert (film negative)
    const [inverted, setInverted] = useState(false);

    // Fullscreen
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Series panel
    const [showSeriesPanel, setShowSeriesPanel] = useState(false);

    // Stable study key for caching
    const studyKey = useMemo(() => study?.folderName || study?.id || '', [study]);
    const seriesUid = useMemo(() => study?.selectedSeriesUid || '', [study]);
    const cacheKey = useMemo(() => `${studyKey}__${seriesUid}`, [studyKey, seriesUid]);

    // ═══════════════════════════════════════════════════════════════════
    // Transfer Function Presets — MONAI-Normalized [0.0, 1.0] Range
    //
    // Data is pre-processed by MONAI pipeline:
    //   ScaleIntensityRange(-1000 HU, 3000 HU) → [0.0, 1.0]
    //   CropForeground removes surrounding air/cylinder
    //   Spacing(0.5mm) ensures isotropic voxels
    //   Orientation(RAS) ensures consistent anatomy
    //
    // Normalized Value Reference:
    //   0.000 = Air  (-1000 HU)     0.225 = Fat    (-100 HU)
    //   0.250 = Water (   0 HU)     0.288 = Soft   ( 150 HU)
    //   0.325 = Cancellous (300 HU) 0.500 = Cortical (1000 HU)
    //   0.625 = Enamel (1500 HU)    1.000 = Metal   (3000 HU)
    //
    // hu(v) converts standard HU to normalized [0,1] coordinate:
    //   hu(v) = (v + 1000) / 4000
    // ═══════════════════════════════════════════════════════════════════
    const applyPreset = useCallback((ctfun, ofun, presetName, dataRange, options) => {
        const opts = options || {};
        const isInverted = opts.isInverted || false;

        ctfun.removeAllPoints();
        ofun.removeAllPoints();

        const dMin = dataRange[0];
        const dMax = dataRange[1];

        // Map HU → normalized value
        const hu = (v) => (v + 1000) / 4000;

        // Safe bounds
        const lo = Math.min(dMin, -0.05);
        const hi = Math.max(dMax, 1.05);

        console.log('[VolumeViewer3D] applyPreset:', presetName,
            '| range:', dMin.toFixed(3), '→', dMax.toFixed(3),
            '| MONAI normalized [0,1]');

        if (presetName === 'bone') {
            // ── BONE / TEETH (CLEAN & SHARP) ──
            
            // 1. Color: Keep it realistic
            ctfun.addRGBPoint(0.0, 0.0, 0.0, 0.0);
            ctfun.addRGBPoint(0.4, 0.0, 0.0, 0.0);       // Keep dark
            ctfun.addRGBPoint(0.42, 0.86, 0.65, 0.47);   // Beige (Bone Start)
            ctfun.addRGBPoint(0.60, 0.95, 0.88, 0.78);   // White (Main Bone)
            ctfun.addRGBPoint(1.0, 1.0, 0.98, 0.94);     // Enamel/Metal (Highlight)

            // 2. Opacity: THE CLEANER
            ofun.addPoint(0.0, 0.0);
            
            // Cutoff at 0.42 — removes all neck/cheek flesh completely
            ofun.addPoint(0.42, 0.0);    
            
            // Fast transition to bone (Sharp Edge)
            ofun.addPoint(0.45, 0.2);     
            ofun.addPoint(0.55, 0.7);     // Solid Jawbone
            ofun.addPoint(0.80, 0.9);     // Teeth Very Solid
            ofun.addPoint(1.0, 1.0);

        } else if (presetName === 'soft') {
            // ── SOFT TISSUE ──
            // Show gums, skin, muscles with peak visibility; dim bone
            ctfun.addRGBPoint(lo,           0.0,  0.0,  0.0);
            ctfun.addRGBPoint(hu(-100),     0.0,  0.0,  0.0);  // 0.225
            ctfun.addRGBPoint(hu(0),        0.45, 0.22, 0.18); // 0.250
            ctfun.addRGBPoint(hu(150),      0.85, 0.55, 0.50); // 0.288
            ctfun.addRGBPoint(hu(400),      0.90, 0.70, 0.60); // 0.350
            ctfun.addRGBPoint(hu(800),      0.50, 0.50, 0.50); // 0.450
            ctfun.addRGBPoint(hi,           0.35, 0.35, 0.35);

            ofun.addPoint(lo,          0.0);
            ofun.addPoint(hu(-200),    0.0);      // Air → transparent
            ofun.addPoint(hu(-50),     0.02);     // Fat begins
            ofun.addPoint(hu(50),      0.12);     // Soft tissue
            ofun.addPoint(hu(200),     0.25);     // Peak soft tissue
            ofun.addPoint(hu(500),     0.15);     // Bone (dimmed)
            ofun.addPoint(hu(1000),    0.08);     // Dense bone (faded)
            ofun.addPoint(hi,          0.05);

        } else if (presetName === 'mip') {
            // ── MIP (Maximum Intensity Projection) ──
            // W/L-parameterized grayscale
            const wCenter = opts.wCenter !== undefined ? opts.wCenter : 0.5;
            const wWidth  = opts.wWidth  !== undefined ? opts.wWidth  : 1.0;
            const lower = wCenter - wWidth / 2;
            const upper = wCenter + wWidth / 2;

            if (isInverted) {
                ctfun.addRGBPoint(lower, 1.0, 1.0, 1.0);
                ctfun.addRGBPoint(upper, 0.0, 0.0, 0.0);
            } else {
                ctfun.addRGBPoint(lower, 0.0, 0.0, 0.0);
                ctfun.addRGBPoint(upper, 1.0, 1.0, 1.0);
            }

            // Threshold — air transparent, bone/teeth visible
            ofun.addPoint(lo,          0.0);
            ofun.addPoint(hu(100),     0.0);      // 0.275
            ofun.addPoint(hu(300),     0.3);      // 0.325
            ofun.addPoint(hu(600),     0.8);      // 0.400
            ofun.addPoint(hu(1000),    1.0);      // 0.500
            ofun.addPoint(hi,          1.0);

        } else if (presetName === 'xray') {
            // ── X-RAY DRR (Digital Radiograph Reconstruction) ──
            // Very low opacity, Composite blend accumulates through volume
            const wCenter = opts.wCenter !== undefined ? opts.wCenter : 0.45;
            const wWidth  = opts.wWidth  !== undefined ? opts.wWidth  : 0.9;
            const lower = wCenter - wWidth / 2;
            const upper = wCenter + wWidth / 2;

            if (isInverted) {
                ctfun.addRGBPoint(lower, 1.0, 1.0, 1.0);
                ctfun.addRGBPoint(upper, 0.0, 0.0, 0.0);
            } else {
                ctfun.addRGBPoint(lower, 0.0, 0.0, 0.0);
                ctfun.addRGBPoint(upper, 1.0, 1.0, 1.0);
            }

            // DRR: air fully transparent, tissue/bone barely opaque (accumulates)
            ofun.addPoint(lo,          0.0);
            ofun.addPoint(hu(-200),    0.0);        // Air → fully transparent
            ofun.addPoint(hu(0),       0.003);      // Soft tissue → barely visible
            ofun.addPoint(hu(300),     0.01);       // Cancellous bone
            ofun.addPoint(hu(800),     0.03);       // Cortical bone
            ofun.addPoint(hu(2000),    0.06);       // Enamel
            ofun.addPoint(hi,          0.08);       // Metal
        }
    }, []);

    // ═══════════════════════════════════════════════════════════════════
    // Slab Clipping
    // ═══════════════════════════════════════════════════════════════════
    const updateSlabClipping = useCallback((thicknessMM) => {
        const ctx = vtkContextRef.current;
        if (!ctx) return;
        const { mapper, renderer, renderWindow, slabPlanes } = ctx;

        mapper.removeAllClippingPlanes();

        if (!slabPlanes || thicknessMM >= SLAB_MAX_MM) {
            renderWindow.render();
            return;
        }

        const camera = renderer.getActiveCamera();
        const fp = camera.getFocalPoint();
        const dir = camera.getDirectionOfProjection();
        const len = Math.sqrt(dir[0] * dir[0] + dir[1] * dir[1] + dir[2] * dir[2]);
        const n = [dir[0] / len, dir[1] / len, dir[2] / len];
        const halfSlab = thicknessMM / 2.0;

        slabPlanes[0].setNormal(n[0], n[1], n[2]);
        slabPlanes[0].setOrigin(
            fp[0] - n[0] * halfSlab,
            fp[1] - n[1] * halfSlab,
            fp[2] - n[2] * halfSlab
        );

        slabPlanes[1].setNormal(-n[0], -n[1], -n[2]);
        slabPlanes[1].setOrigin(
            fp[0] + n[0] * halfSlab,
            fp[1] + n[1] * halfSlab,
            fp[2] + n[2] * halfSlab
        );

        mapper.addClippingPlane(slabPlanes[0]);
        mapper.addClippingPlane(slabPlanes[1]);
        renderWindow.render();
    }, []);

    // ═══════════════════════════════════════════════════════════════════
    // Container Readiness
    // ═══════════════════════════════════════════════════════════════════
    useEffect(() => {
        if (!containerRef.current) return;
        const check = () => {
            if (containerRef.current?.offsetWidth > 0 && containerRef.current?.offsetHeight > 0) {
                setContainerReady(true);
            }
        };
        check();
        const timer = setTimeout(check, 100);
        return () => clearTimeout(timer);
    }, []);

    // ═══════════════════════════════════════════════════════════════════
    // Main Volume Loading Effect
    // ═══════════════════════════════════════════════════════════════════
    useEffect(() => {
        if (!study || !containerReady) return;

        let cancelled = false;

        const isCached = volumeCache.has(cacheKey);
        console.log('[VolumeViewer3D] Mount | cacheKey:', cacheKey, '| cached:', isCached, '| globalCacheSize:', volumeCache.size);

        const loadVolume = async () => {
            setLoading(true);
            setError(null);
            setLoadingProgress(isCached ? 85 : 0);
            setLoadingStage(isCached ? 'Restoring from cache...' : 'Connecting...');

            try {
                let imageData;

                if (isCached) {
                    console.log('[VolumeViewer3D] ✅ Cache HIT:', cacheKey, '| Cache size:', volumeCache.size);
                    imageData = volumeCache.get(cacheKey);
                } else {
                    console.log('[VolumeViewer3D] ❌ Cache MISS:', cacheKey, '| Cached keys:', [...volumeCache.keys()]);
                    const url = `http://127.0.0.1:8000/volume/${studyKey}${seriesUid ? '?series_uid=' + seriesUid : ''}${seriesUid ? '&' : '?'}v=${VOLUME_CACHE_VERSION}`;
                    console.log('[VolumeViewer3D] Fetching VTI from:', url);

                    setLoadingStage('Downloading 3D volume...');
                    setLoadingProgress(5);

                    const response = await fetch(url);
                    if (!response.ok) {
                        const text = await response.text();
                        throw new Error('Server error ' + response.status + ': ' + text.substring(0, 200));
                    }

                    const contentLength = response.headers.get('Content-Length');
                    const totalBytes = contentLength ? parseInt(contentLength) : 0;
                    const reader = response.body.getReader();
                    const chunks = [];
                    let receivedBytes = 0;

                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        if (cancelled) return;

                        chunks.push(value);
                        receivedBytes += value.length;

                        if (totalBytes > 0) {
                            const pct = Math.round((receivedBytes / totalBytes) * 60);
                            setLoadingProgress(5 + pct);
                            setLoadingStage('Downloading... ' + (receivedBytes / (1024 * 1024)).toFixed(1) + 'MB / ' + (totalBytes / (1024 * 1024)).toFixed(1) + 'MB');
                        } else {
                            setLoadingStage('Downloading... ' + (receivedBytes / (1024 * 1024)).toFixed(1) + 'MB');
                        }
                    }

                    if (cancelled) return;

                    setLoadingStage('Decompressing volume...');
                    setLoadingProgress(70);

                    const fullBuffer = new Uint8Array(receivedBytes);
                    let offset = 0;
                    for (const chunk of chunks) {
                        fullBuffer.set(chunk, offset);
                        offset += chunk.length;
                    }

                    setLoadingStage('Parsing 3D data...');
                    setLoadingProgress(75);

                    const vtiReader = vtkXMLImageDataReader.newInstance();
                    vtiReader.parseAsArrayBuffer(fullBuffer.buffer);
                    imageData = vtiReader.getOutputData(0);

                    if (!imageData) {
                        throw new Error('Failed to parse VTI file - no output data');
                    }

                    volumeCache.set(cacheKey, imageData);
                    console.log('[VolumeViewer3D] 💾 Cached volume:', cacheKey, '| Cache size:', volumeCache.size);
                }

                if (cancelled) return;

                const scalars = imageData.getPointData().getScalars();
                const dataRange = scalars.getRange();
                const dims = imageData.getDimensions();
                const spacing = imageData.getSpacing();

                console.log('[VolumeViewer3D] Volume loaded:', {
                    dimensions: dims, spacing, dataRange,
                    numVoxels: dims[0] * dims[1] * dims[2]
                });

                setVolumeInfo({ dimensions: dims, spacing, voxels: dims[0] * dims[1] * dims[2] });

                setLoadingStage('Initializing 3D renderer...');
                setLoadingProgress(85);

                const fullScreenRenderer = vtkFullScreenRenderWindow.newInstance({
                    container: containerRef.current,
                    background: BG_COLORS.bone
                });

                const renderer = fullScreenRenderer.getRenderer();
                const renderWindow = fullScreenRenderer.getRenderWindow();
                const interactor = fullScreenRenderer.getInteractor();

                const mapper = vtkVolumeMapper.newInstance();
                mapper.setInputData(imageData);
                mapper.setSampleDistance(SAMPLE_DISTANCE_STILL);
                mapper.setMaximumSamplesPerRay(2000);
                mapper.setBlendModeToComposite();

                const actor = vtkVolume.newInstance();
                actor.setMapper(mapper);

                const ctfun = vtkColorTransferFunction.newInstance();
                const ofun = vtkPiecewiseFunction.newInstance();

                applyPreset(ctfun, ofun, 'bone', dataRange, {
                    wCenter: WL_DEFAULTS.bone.center,
                    wWidth: WL_DEFAULTS.bone.width,
                    isInverted: false
                });

                actor.getProperty().setRGBTransferFunction(0, ctfun);
                actor.getProperty().setScalarOpacity(0, ofun);
                actor.getProperty().setInterpolationTypeToLinear();

                // Gradient opacity — sharpens bone surface edges
                actor.getProperty().setUseGradientOpacity(0, true);
                actor.getProperty().setGradientOpacityMinimumValue(0, 0);
                actor.getProperty().setGradientOpacityMinimumOpacity(0, 0.0);
                actor.getProperty().setGradientOpacityMaximumValue(0, 100);
                actor.getProperty().setGradientOpacityMaximumOpacity(0, 1.0);

                // Lighting
                actor.getProperty().setShade(true);
                actor.getProperty().setAmbient(0.3);
                actor.getProperty().setDiffuse(0.7);
                actor.getProperty().setSpecular(0.2);
                actor.getProperty().setSpecularPower(10.0);

                const avgSpacing = (spacing[0] + spacing[1] + spacing[2]) / 3;
                actor.getProperty().setScalarOpacityUnitDistance(0, avgSpacing * 2.5);

                const slabPlanes = [
                    vtkPlane.newInstance(),
                    vtkPlane.newInstance()
                ];

                // Super-sampling: coarse while interacting, fine on idle
                let sharpenTimer = null;
                interactor.onStartInteraction(() => {
                    if (sharpenTimer) { clearTimeout(sharpenTimer); sharpenTimer = null; }
                    mapper.setSampleDistance(SAMPLE_DISTANCE_INTERACTIVE);
                });
                interactor.onEndInteraction(() => {
                    sharpenTimer = setTimeout(() => {
                        mapper.setSampleDistance(SAMPLE_DISTANCE_STILL);
                        renderWindow.render();
                    }, 200);
                });

                setLoadingStage('Rendering 3D view...');
                setLoadingProgress(95);

                renderer.addVolume(actor);

                // ── Robust camera positioning ──
                // Center on actual volume bounds (handles datasets with non-origin coordinates)
                const bounds = imageData.getBounds();
                const volCenter = [
                    (bounds[0] + bounds[1]) / 2,
                    (bounds[2] + bounds[3]) / 2,
                    (bounds[4] + bounds[5]) / 2
                ];
                console.log('[VolumeViewer3D] Volume bounds:', bounds, '| center:', volCenter);

                renderer.resetCamera();
                const camera = renderer.getActiveCamera();
                camera.setFocalPoint(volCenter[0], volCenter[1], volCenter[2]);
                renderer.resetCamera();
                camera.elevation(15);
                camera.zoom(1.3);

                renderWindow.render();

                vtkContextRef.current = {
                    fullScreenRenderer,
                    renderer,
                    renderWindow,
                    interactor,
                    actor,
                    mapper,
                    ctfun,
                    ofun,
                    dataRange,
                    imageData,
                    slabPlanes,
                    sharpenTimer
                };

                setLoadingProgress(100);
                if (isCached) {
                    setLoading(false); // Instant for cached volumes
                } else {
                    setTimeout(() => setLoading(false), 150);
                }

            } catch (err) {
                if (cancelled) return;
                console.error('[VolumeViewer3D] Error:', err);
                setError(err.message || 'Failed to load volume');
                setLoading(false);
            }
        };

        // Skip initial delay for cached volumes
        const timer = isCached ? null : setTimeout(loadVolume, 50);
        if (isCached) loadVolume();

        return () => {
            cancelled = true;
            clearTimeout(timer);
            if (vtkContextRef.current) {
                if (vtkContextRef.current.sharpenTimer) clearTimeout(vtkContextRef.current.sharpenTimer);
                vtkContextRef.current.fullScreenRenderer.delete();
                vtkContextRef.current = null;
            }
        };
    }, [study, containerReady, cacheKey, studyKey, seriesUid, applyPreset]);

    // Auto-rotate
    useEffect(() => {
        if (!autoRotate || !vtkContextRef.current) return;
        const { renderer, renderWindow } = vtkContextRef.current;
        const camera = renderer.getActiveCamera();
        const id = setInterval(() => {
            camera.azimuth(0.8);
            renderWindow.render();
        }, 50);
        return () => clearInterval(id);
    }, [autoRotate]);

    // ═══════════════════════════════════════════════════════════════════
    // Slab Clipping Sync (slider changes + enable/disable)
    // ═══════════════════════════════════════════════════════════════════
    useEffect(() => {
        slabThicknessRef.current = slabThickness;
        slabEnabledRef.current = slabEnabled;
        if (slabEnabled) {
            updateSlabClipping(slabThickness);
        } else {
            const ctx = vtkContextRef.current;
            if (ctx) {
                ctx.mapper.removeAllClippingPlanes();
                ctx.renderWindow.render();
            }
        }
    }, [slabThickness, slabEnabled, updateSlabClipping]);

    // ═══════════════════════════════════════════════════════════════════
    // Slab follows camera rotation (recalculate when user finishes rotating)
    // ═══════════════════════════════════════════════════════════════════
    useEffect(() => {
        const ctx = vtkContextRef.current;
        if (!ctx) return;

        const { interactor } = ctx;

        // onEndInteraction fires when user releases mouse after drag/rotation
        const sub = interactor.onEndInteraction(() => {
            if (slabEnabledRef.current) {
                updateSlabClipping(slabThicknessRef.current);
            }
        });

        return () => sub.unsubscribe();
    }, [slabEnabled, updateSlabClipping]);

    // ═══════════════════════════════════════════════════════════════════
    // Window/Level Sync (MIP & X-Ray only)
    // ═══════════════════════════════════════════════════════════════════
    useEffect(() => {
        const ctx = vtkContextRef.current;
        if (!ctx) return;
        if (preset !== 'mip' && preset !== 'xray') return;

        applyPreset(ctx.ctfun, ctx.ofun, preset, ctx.dataRange, {
            wCenter: windowCenter,
            wWidth: windowWidth,
            isInverted: inverted
        });
        ctx.renderWindow.render();
    }, [windowCenter, windowWidth, inverted, preset, applyPreset]);

    // ═══════════════════════════════════════════════════════════════════
    // Fullscreen Management
    // ═══════════════════════════════════════════════════════════════════
    useEffect(() => {
        const handleFSChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFSChange);
        return () => document.removeEventListener('fullscreenchange', handleFSChange);
    }, []);

    const toggleFullscreen = useCallback(() => {
        if (!wrapperRef.current) return;
        if (!document.fullscreenElement) {
            wrapperRef.current.requestFullscreen().catch(console.error);
        } else {
            document.exitFullscreen();
        }
    }, []);

    // ═══════════════════════════════════════════════════════════════════
    // Preset / Render-Mode Change Handler
    // ═══════════════════════════════════════════════════════════════════
    const changePreset = useCallback((presetName) => {
        if (!vtkContextRef.current) return;
        const { ctfun, ofun, dataRange, renderWindow, actor, mapper, fullScreenRenderer } = vtkContextRef.current;

        // Use WL_DEFAULTS for all presets (data is [0,1] normalized)
        const defaults = WL_DEFAULTS[presetName] || WL_DEFAULTS.bone;

        setWindowCenter(defaults.center);
        setWindowWidth(defaults.width);
        setInverted(false);

        applyPreset(ctfun, ofun, presetName, dataRange, {
            wCenter: defaults.center,
            wWidth: defaults.width,
            isInverted: false
        });

        // Background color per mode
        const bg = BG_COLORS[presetName];
        fullScreenRenderer.getRenderer().setBackground(bg[0], bg[1], bg[2]);

        // Helper: get average spacing
        const sp = vtkContextRef.current.imageData.getSpacing();
        const avgSp = (sp[0] + sp[1] + sp[2]) / 3;

        if (presetName === 'bone') {
            mapper.setBlendModeToComposite();
            actor.getProperty().setShade(true);
            actor.getProperty().setAmbient(0.3);
            actor.getProperty().setDiffuse(0.7);
            actor.getProperty().setSpecular(0.2);
            actor.getProperty().setSpecularPower(10);
            actor.getProperty().setUseGradientOpacity(0, true);
            actor.getProperty().setGradientOpacityMinimumValue(0, 0);
            actor.getProperty().setGradientOpacityMinimumOpacity(0, 0.0);
            actor.getProperty().setGradientOpacityMaximumValue(0, 0.05);
            actor.getProperty().setGradientOpacityMaximumOpacity(0, 1.0);
            actor.getProperty().setScalarOpacityUnitDistance(0, avgSp * 2.5);
            setSlabEnabled(false);

        } else if (presetName === 'soft') {
            mapper.setBlendModeToComposite();
            actor.getProperty().setShade(true);
            actor.getProperty().setAmbient(0.35);
            actor.getProperty().setDiffuse(0.7);
            actor.getProperty().setSpecular(0.1);
            actor.getProperty().setSpecularPower(10);
            actor.getProperty().setUseGradientOpacity(0, true);
            actor.getProperty().setGradientOpacityMinimumValue(0, 0);
            actor.getProperty().setGradientOpacityMinimumOpacity(0, 0.0);
            actor.getProperty().setGradientOpacityMaximumValue(0, 0.03);
            actor.getProperty().setGradientOpacityMaximumOpacity(0, 1.0);
            actor.getProperty().setScalarOpacityUnitDistance(0, avgSp * 2.5);
            setSlabEnabled(false);

        } else if (presetName === 'mip') {
            mapper.setBlendModeToMaximumIntensity();
            actor.getProperty().setShade(false);
            actor.getProperty().setAmbient(1.0);
            actor.getProperty().setDiffuse(0.0);
            actor.getProperty().setSpecular(0.0);
            actor.getProperty().setUseGradientOpacity(0, false);
            actor.getProperty().setScalarOpacityUnitDistance(0, avgSp * 2.5);
            setSlabEnabled(true);

        } else if (presetName === 'xray') {
            // Use Composite (NOT AverageIntensity) for reliable DRR simulation.
            // AverageIntensity averages with air voxels → black. Composite accumulates.
            mapper.setBlendModeToComposite();
            actor.getProperty().setShade(false);
            actor.getProperty().setAmbient(1.0);
            actor.getProperty().setDiffuse(0.0);
            actor.getProperty().setSpecular(0.0);
            actor.getProperty().setUseGradientOpacity(0, false);
            // High unit distance keeps overall volume translucent (X-ray look)
            actor.getProperty().setScalarOpacityUnitDistance(0, avgSp * 3.0);
            setSlabEnabled(true);
        }

        setPreset(presetName);
        renderWindow.render();
    }, [applyPreset]);

    // ═══════════════════════════════════════════════════════════════════
    // Camera View Presets (Acteon-style anatomical views)
    // ═══════════════════════════════════════════════════════════════════
    const setCameraView = useCallback((viewName) => {
        const ctx = vtkContextRef.current;
        if (!ctx) return;

        const { renderer, renderWindow, imageData } = ctx;
        const view = CAMERA_VIEWS[viewName];
        if (!view) return;

        const camera = renderer.getActiveCamera();
        const bounds = imageData.getBounds();
        const center = [
            (bounds[0] + bounds[1]) / 2,
            (bounds[2] + bounds[3]) / 2,
            (bounds[4] + bounds[5]) / 2
        ];
        const maxDim = Math.max(
            bounds[1] - bounds[0],
            bounds[3] - bounds[2],
            bounds[5] - bounds[4]
        );

        camera.setFocalPoint(center[0], center[1], center[2]);
        camera.setPosition(
            center[0] + view.position[0] * maxDim * 2,
            center[1] + view.position[1] * maxDim * 2,
            center[2] + view.position[2] * maxDim * 2
        );
        camera.setViewUp(view.viewUp[0], view.viewUp[1], view.viewUp[2]);

        renderer.resetCamera();
        camera.zoom(1.3);
        renderWindow.render();

        if (slabEnabled) {
            setTimeout(() => updateSlabClipping(slabThickness), 50);
        }
    }, [slabEnabled, slabThickness, updateSlabClipping]);

    // ═══════════════════════════════════════════════════════════════════
    // Screenshot Export
    // ═══════════════════════════════════════════════════════════════════
    const captureScreenshot = useCallback(() => {
        const ctx = vtkContextRef.current;
        if (!ctx) return;

        ctx.renderWindow.render();

        const canvas = containerRef.current?.querySelector('canvas');
        if (!canvas) return;

        const dataURL = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = 'xcore-' + preset + '-' + Date.now() + '.png';
        link.href = dataURL;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, [preset]);

    // ═══════════════════════════════════════════════════════════════════
    // Reset Camera
    // ═══════════════════════════════════════════════════════════════════
    const resetCamera = useCallback(() => {
        if (!vtkContextRef.current) return;
        const { renderer, renderWindow, imageData } = vtkContextRef.current;

        // Center on actual data bounds (handles datasets with non-origin coordinates)
        const bounds = imageData.getBounds();
        const center = [
            (bounds[0] + bounds[1]) / 2,
            (bounds[2] + bounds[3]) / 2,
            (bounds[4] + bounds[5]) / 2
        ];

        const camera = renderer.getActiveCamera();
        camera.setFocalPoint(center[0], center[1], center[2]);
        renderer.resetCamera();
        camera.zoom(1.3);
        renderWindow.render();

        if (slabEnabled) {
            setTimeout(() => updateSlabClipping(slabThickness), 50);
        }
    }, [slabEnabled, slabThickness, updateSlabClipping]);

    // Slab handlers
    const handleSlabChange = useCallback((e) => {
        setSlabThickness(Number(e.target.value));
    }, []);

    const toggleSlab = useCallback(() => {
        setSlabEnabled(prev => !prev);
    }, []);

    const toggleInvert = useCallback(() => {
        setInverted(prev => !prev);
    }, []);

    // ═══════════════════════════════════════════════════════════════════
    // Render
    // ═══════════════════════════════════════════════════════════════════
    const isMipOrXray = preset === 'mip' || preset === 'xray';

    return (
        <div ref={wrapperRef} className="flex flex-col h-full bg-slate-950 text-slate-100 rounded-3xl overflow-hidden shadow-2xl border border-slate-800">
            {/* ─── Header Toolbar ─────────────────────────────────── */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-900/95 border-b border-slate-800 backdrop-blur-sm">
                {/* Left: Back + Title */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={onBack}
                        className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-white transition"
                    >
                        <AppIcon name="ArrowLeft" size={18} />
                    </button>
                    <div>
                        <h2 className="text-white font-semibold text-base leading-tight">
                            3D Volume Rendering
                        </h2>
                        <p className="text-gray-500 text-xs">
                            {volumeInfo
                                ? volumeInfo.dimensions[0] + '\u00D7' + volumeInfo.dimensions[1] + '\u00D7' + volumeInfo.dimensions[2] + ' \u2022 ' + (volumeInfo.voxels / 1e6).toFixed(1) + 'M voxels'
                                : 'Initializing...'}
                        </p>
                    </div>
                </div>

                {/* Center: Render Mode Selector */}
                <div className="flex items-center gap-3">
                    <div className="flex gap-0.5 bg-slate-800/80 rounded-lg p-0.5">
                        {[
                            { id: 'bone', label: 'Bone', icon: 'Bone' },
                            { id: 'soft', label: 'Soft', icon: 'Heart' },
                            { id: 'mip',  label: 'MIP',  icon: 'Zap' },
                            { id: 'xray', label: 'X-Ray', icon: 'Scan' }
                        ].map(function(p) {
                            return (
                                <button
                                    key={p.id}
                                    onClick={function() { changePreset(p.id); }}
                                    className={'px-3 py-1.5 rounded-md text-xs font-medium transition-all ' + (
                                        preset === p.id
                                            ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30'
                                            : 'text-gray-400 hover:text-white hover:bg-slate-700'
                                    )}
                                >
                                    {p.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Right: Tools */}
                <div className="flex items-center gap-1.5">
                    {/* Invert (MIP/X-Ray only) */}
                    {isMipOrXray && (
                        <button
                            onClick={toggleInvert}
                            className={'p-2 rounded-lg transition text-xs ' + (
                                inverted
                                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                                    : 'bg-slate-800 text-gray-400 hover:text-white'
                            )}
                            title="Invert Colors (Film Negative)"
                        >
                            <AppIcon name="Contrast" size={18} />
                        </button>
                    )}

                    <button
                        onClick={function() { setAutoRotate(!autoRotate); }}
                        className={'p-2 rounded-lg transition ' + (
                            autoRotate
                                ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30'
                                : 'bg-slate-800 text-gray-400 hover:text-white'
                        )}
                        title="Auto-rotate"
                    >
                        <AppIcon name="RotateCw" size={18} />
                    </button>

                    <button
                        onClick={resetCamera}
                        className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-gray-400 hover:text-white transition"
                        title="Reset View"
                    >
                        <AppIcon name="Focus" size={18} />
                    </button>

                    <button
                        onClick={captureScreenshot}
                        className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-gray-400 hover:text-white transition"
                        title="Save Screenshot"
                    >
                        <AppIcon name="Camera" size={18} />
                    </button>

                    <button
                        onClick={toggleFullscreen}
                        className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-gray-400 hover:text-white transition"
                        title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                    >
                        <AppIcon name={isFullscreen ? 'Minimize2' : 'Maximize2'} size={18} />
                    </button>

                    <div className="h-6 w-px bg-slate-700 mx-1" />

                    <button
                        onClick={() => setShowSeriesPanel(prev => !prev)}
                        className={'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition shadow-lg ' + (
                            showSeriesPanel
                                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-cyan-500/10'
                                : 'bg-slate-800 text-gray-400 hover:text-white hover:bg-slate-700'
                        )}
                        title="Switch Series"
                    >
                        <AppIcon name="Layers" size={16} />
                        <span>Series</span>
                    </button>

                    <button
                        onClick={onSwitchToSliceMode}
                        className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-medium transition shadow-lg shadow-purple-600/20"
                    >
                        <AppIcon name="LayoutGrid" size={16} />
                        <span>Slice View</span>
                    </button>
                </div>
            </div>

            {/* ─── Main Viewport Area ────────────────────────────── */}
            <div ref={containerRef} className="flex-1 relative" style={{ minHeight: '400px', width: '100%' }}>
                {/* Loading Overlay */}
                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-950 z-10">
                        <div className="flex flex-col items-center gap-5 text-white max-w-md w-full px-8">
                            <div className="relative">
                                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-600/20 flex items-center justify-center animate-pulse">
                                    <AppIcon name="Loader2" size={40} className="animate-spin text-cyan-400" />
                                </div>
                            </div>
                            <div className="text-center">
                                <p className="text-lg font-semibold mb-1">Loading 3D Volume</p>
                                <p className="text-sm text-gray-400">{loadingStage}</p>
                            </div>
                            <div className="w-full">
                                <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                                    <div
                                        className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full transition-all duration-300 ease-out rounded-full"
                                        style={{ width: loadingProgress + '%' }}
                                    />
                                </div>
                                <p className="text-right text-xs text-gray-500 mt-1">{loadingProgress}%</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Error Overlay */}
                {error && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-950 z-10">
                        <div className="flex flex-col items-center gap-4 text-red-400 bg-red-950/40 p-8 rounded-2xl border border-red-500/20 max-w-lg">
                            <AppIcon name="AlertCircle" size={48} />
                            <p className="text-lg font-semibold">Failed to Load Volume</p>
                            <p className="text-sm text-gray-400 text-center leading-relaxed">{error}</p>
                            <div className="flex gap-3 mt-2">
                                <button
                                    onClick={function() {
                                        volumeCache.delete(cacheKey);
                                        window.location.reload();
                                    }}
                                    className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium transition"
                                >
                                    Retry
                                </button>
                                <button
                                    onClick={onSwitchToSliceMode}
                                    className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition"
                                >
                                    Try Slice View
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ─── Left Tool Panel ───────────────────────────── */}
                {!loading && !error && (
                    <div className="absolute top-3 left-3 z-20 flex flex-col gap-2 w-56">
                        {/* Window/Level Panel (MIP & X-Ray only) */}
                        {isMipOrXray && (
                            <div className="bg-black/75 backdrop-blur-md rounded-xl p-3 border border-white/10 shadow-2xl">
                                <div className="flex items-center gap-2 mb-3">
                                    <AppIcon name="SunMedium" size={14} className="text-cyan-400" />
                                    <span className="text-xs font-semibold text-white uppercase tracking-wider">Window / Level</span>
                                </div>

                                {/* Brightness (Level/Center) */}
                                <div className="mb-2.5">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[10px] text-gray-400 uppercase tracking-wide">Brightness</span>
                                        <span className="text-xs font-mono text-cyan-400">{windowCenter.toFixed(2)}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min={vtkContextRef.current?.dataRange?.[0] ?? 0.0}
                                        max={vtkContextRef.current?.dataRange?.[1] ?? 1.0}
                                        step={0.01}
                                        value={windowCenter}
                                        onChange={(e) => setWindowCenter(Number(e.target.value))}
                                        className="w-full h-1 bg-slate-700 rounded-full appearance-none cursor-pointer accent-cyan-500"
                                    />
                                </div>

                                {/* Contrast (Window/Width) */}
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[10px] text-gray-400 uppercase tracking-wide">Contrast</span>
                                        <span className="text-xs font-mono text-cyan-400">{windowWidth.toFixed(2)}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min={0.01}
                                        max={2.0}
                                        step={0.02}
                                        value={windowWidth}
                                        onChange={(e) => setWindowWidth(Number(e.target.value))}
                                        className="w-full h-1 bg-slate-700 rounded-full appearance-none cursor-pointer accent-cyan-500"
                                    />
                                </div>

                                {/* Quick reset */}
                                <button
                                    onClick={() => {
                                        const d = WL_DEFAULTS[preset] || WL_DEFAULTS.bone;
                                        setWindowCenter(d.center);
                                        setWindowWidth(d.width);
                                    }}
                                    className="mt-2 w-full py-1 text-[10px] text-gray-500 hover:text-white bg-slate-800/50 hover:bg-slate-700/50 rounded transition uppercase tracking-wider"
                                >
                                    Reset W/L
                                </button>
                            </div>
                        )}

                        {/* Slab Thickness Panel (MIP & X-Ray) */}
                        {isMipOrXray && (
                            <div className="bg-black/75 backdrop-blur-md rounded-xl p-3 border border-white/10 shadow-2xl">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <AppIcon name="Scissors" size={14} className="text-cyan-400" />
                                        <span className="text-xs font-semibold text-white uppercase tracking-wider">Slab</span>
                                    </div>
                                    <button
                                        onClick={toggleSlab}
                                        className={'px-2 py-0.5 rounded text-[10px] font-semibold transition ' + (
                                            slabEnabled
                                                ? 'bg-cyan-500 text-white'
                                                : 'bg-slate-700 text-gray-400 hover:text-white'
                                        )}
                                    >
                                        {slabEnabled ? 'ON' : 'OFF'}
                                    </button>
                                </div>
                                {slabEnabled && (
                                    <div>
                                        <input
                                            type="range"
                                            min={SLAB_MIN_MM}
                                            max={SLAB_MAX_MM}
                                            step={1}
                                            value={slabThickness}
                                            onChange={handleSlabChange}
                                            className="w-full h-1 bg-slate-700 rounded-full appearance-none cursor-pointer accent-cyan-500"
                                        />
                                        <div className="flex items-center justify-between mt-1">
                                            <span className="text-[10px] text-gray-500">{SLAB_MIN_MM}mm</span>
                                            <span className="text-xs font-mono text-cyan-400">{slabThickness}mm</span>
                                            <span className="text-[10px] text-gray-500">{SLAB_MAX_MM}mm</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Camera View Presets */}
                        <div className="bg-black/75 backdrop-blur-md rounded-xl p-3 border border-white/10 shadow-2xl">
                            <div className="flex items-center gap-2 mb-2">
                                <AppIcon name="Compass" size={14} className="text-cyan-400" />
                                <span className="text-xs font-semibold text-white uppercase tracking-wider">Views</span>
                            </div>
                            <div className="grid grid-cols-3 gap-1">
                                {Object.entries(CAMERA_VIEWS).map(([key, view]) => (
                                    <button
                                        key={key}
                                        onClick={() => setCameraView(key)}
                                        className="py-1.5 rounded-md text-[10px] font-semibold bg-slate-800/80 text-gray-400 hover:bg-slate-700 hover:text-white transition"
                                        title={view.name}
                                    >
                                        {view.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* ─── Series Sidebar ────────────────────────────── */}
                <SeriesSidebar
                    study={study}
                    currentSeriesUid={seriesUid}
                    onSelectSeries={(series) => {
                        setShowSeriesPanel(false);
                        if (onSwitchSeries) {
                            onSwitchSeries(series);
                        }
                    }}
                    visible={showSeriesPanel}
                    onClose={() => setShowSeriesPanel(false)}
                    position="right"
                />

                {/* ─── Mode Label Badge ──────────────────────────── */}
                {!loading && !error && (
                    <div className="absolute top-3 right-3 z-20">
                        <div className={'px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest border backdrop-blur-sm ' + (
                            preset === 'bone' ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' :
                            preset === 'soft' ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' :
                            preset === 'mip'  ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' :
                                                'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        )}>
                            {preset === 'bone' ? 'Bone / Teeth' :
                             preset === 'soft' ? 'Soft Tissue' :
                             preset === 'mip'  ? 'MIP — Implant View' :
                                                 'X-Ray — Panoramic'}
                            {inverted && isMipOrXray ? ' (Inv)' : ''}
                        </div>
                    </div>
                )}

                {/* ─── Bottom Status Bar ─────────────────────────── */}
                {!loading && !error && (
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 bg-black/60 backdrop-blur-md px-5 py-2 rounded-full text-white text-[11px] border border-white/10 shadow-2xl">
                        <span className="flex items-center gap-3">
                            <span className="text-gray-400">Drag: Rotate</span>
                            <span className="text-white/20">{'\u2022'}</span>
                            <span className="text-gray-400">Right-click: Pan</span>
                            <span className="text-white/20">{'\u2022'}</span>
                            <span className="text-gray-400">Scroll: Zoom</span>
                            {isMipOrXray && (
                                <>
                                    <span className="text-white/20">{'\u2022'}</span>
                                    <span className="text-cyan-400/80">W/L: Use left panel sliders</span>
                                </>
                            )}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VolumeViewer3D;
