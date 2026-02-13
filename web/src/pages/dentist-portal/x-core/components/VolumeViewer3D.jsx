import React, { useEffect, useRef, useState } from 'react';
import '@kitware/vtk.js/favicon';
import '@kitware/vtk.js/Rendering/Profiles/Volume';

import vtkFullScreenRenderWindow from '@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow';
import vtkVolume from '@kitware/vtk.js/Rendering/Core/Volume';
import vtkVolumeMapper from '@kitware/vtk.js/Rendering/Core/VolumeMapper';
import vtkColorTransferFunction from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction';
import vtkPiecewiseFunction from '@kitware/vtk.js/Common/DataModel/PiecewiseFunction';
import vtkImageData from '@kitware/vtk.js/Common/DataModel/ImageData';
import vtkDataArray from '@kitware/vtk.js/Common/Core/DataArray';
import AppIcon from '../../../../components/AppIcon';

const VolumeViewer3D = ({ study, onBack, onSwitchToSliceMode }) => {
    const containerRef = useRef(null);
    const vtkContextRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [error, setError] = useState(null);
    const [preset, setPreset] = useState('bone');
    const [autoRotate, setAutoRotate] = useState(false);
    const [containerReady, setContainerReady] = useState(false);

    // Define applyPreset function before it's used
    const applyPreset = (ctfun, ofun, presetName, dataRange) => {
        const [min, max] = dataRange;
        const range = max - min;

        ctfun.removeAllPoints();
        ofun.removeAllPoints();

        if (presetName === 'bone') {
            // Bone/CT preset
            ctfun.addRGBPoint(min, 0.0, 0.0, 0.0);
            ctfun.addRGBPoint(min + range * 0.3, 0.4, 0.25, 0.2);
            ctfun.addRGBPoint(min + range * 0.5, 0.8, 0.7, 0.6);
            ctfun.addRGBPoint(max, 1.0, 1.0, 1.0);

            ofun.addPoint(min, 0.0);
            ofun.addPoint(min + range * 0.2, 0.0);
            ofun.addPoint(min + range * 0.4, 0.3);
            ofun.addPoint(min + range * 0.6, 0.7);
            ofun.addPoint(max, 1.0);

        } else if (presetName === 'soft') {
            // Soft tissue preset
            ctfun.addRGBPoint(min, 0.0, 0.0, 0.0);
            ctfun.addRGBPoint(min + range * 0.2, 0.6, 0.3, 0.3);
            ctfun.addRGBPoint(min + range * 0.5, 0.9, 0.6, 0.6);
            ctfun.addRGBPoint(max, 1.0, 0.8, 0.8);

            ofun.addPoint(min, 0.0);
            ofun.addPoint(min + range * 0.1, 0.0);
            ofun.addPoint(min + range * 0.3, 0.5);
            ofun.addPoint(max, 0.9);

        } else if (presetName === 'mip') {
            // Maximum Intensity Projection
            ctfun.addRGBPoint(min, 0.0, 0.0, 0.0);
            ctfun.addRGBPoint(max, 1.0, 1.0, 1.0);

            ofun.addPoint(min, 0.0);
            ofun.addPoint(min + range * 0.5, 0.0);
            ofun.addPoint(max, 1.0);
        }
    };

    // Wait for container to be mounted and have dimensions
    useEffect(() => {
        if (!containerRef.current) return;
        
        const checkDimensions = () => {
            if (containerRef.current && containerRef.current.offsetWidth > 0 && containerRef.current.offsetHeight > 0) {
                console.log('[VolumeViewer3D] Container ready:', containerRef.current.offsetWidth, 'x', containerRef.current.offsetHeight);
                setContainerReady(true);
            }
        };
        
        // Check immediately
        checkDimensions();
        
        // Also check after a short delay in case layout is still settling
        const timer = setTimeout(checkDimensions, 100);
        
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (!study || !containerReady) return;

        const loadVolumeData = async () => {
            setLoading(true);
            setError(null);

            try {
                const studyKey = study.folderName || study.id;
                const seriesUid = study.selectedSeriesUid || '';
                const url = `http://127.0.0.1:8000/volume/${studyKey}${seriesUid ? `?series_uid=${seriesUid}` : ''}`;

                console.log('[VolumeViewer3D] Fetching volume data from:', url);
                console.log('[VolumeViewer3D] Container dimensions:', containerRef.current.offsetWidth, 'x', containerRef.current.offsetHeight);
                
                setLoadingProgress(10);
                const response = await fetch(url);

                if (!response.ok) {
                    throw new Error(`Failed to fetch volume: ${response.status}`);
                }

                setLoadingProgress(30);
                const data = await response.json();
                setLoadingProgress(50);
                
                console.log('[VolumeViewer3D] Volume data received:', {
                    dimensions: data.dimensions,
                    spacing: data.spacing,
                    dataRange: data.data_range,
                    voxelCount: data.voxel_data.length
                });

                // Initialize VTK.js
                const fullScreenRenderer = vtkFullScreenRenderWindow.newInstance({
                    container: containerRef.current,
                    background: [0.1, 0.1, 0.15]
                });

                const renderer = fullScreenRenderer.getRenderer();
                const renderWindow = fullScreenRenderer.getRenderWindow();

                setLoadingProgress(60);
                
                // Create image data from voxel array
                const imageData = vtkImageData.newInstance();
                const [z, y, x] = data.dimensions;
                imageData.setDimensions(x, y, z);
                imageData.setSpacing(data.spacing);
                imageData.setOrigin(0, 0, 0);

                // Convert to typed array (Int16Array for DICOM data - saves memory)
                const voxelArray = new Int16Array(data.voxel_data);
                
                // Create vtkDataArray (required by VTK.js)
                const dataArray = vtkDataArray.newInstance({
                    name: 'Scalars',
                    numberOfComponents: 1,
                    values: voxelArray
                });
                imageData.getPointData().setScalars(dataArray);

                console.log('[VolumeViewer3D] Image data configured:', imageData.getDimensions());
                setLoadingProgress(75);

                // Create volume mapper
                const mapper = vtkVolumeMapper.newInstance();
                mapper.setInputData(imageData);
                mapper.setSampleDistance(1.0);

                // Create volume actor
                const actor = vtkVolume.newInstance();
                actor.setMapper(mapper);

                // Configure color and opacity transfer functions (Bone preset)
                const ctfun = vtkColorTransferFunction.newInstance();
                const ofun = vtkPiecewiseFunction.newInstance();

                applyPreset(ctfun, ofun, 'bone', data.data_range);

                actor.getProperty().setRGBTransferFunction(0, ctfun);
                actor.getProperty().setScalarOpacity(0, ofun);
                actor.getProperty().setInterpolationTypeToLinear();
                actor.getProperty().setShade(true);
                actor.getProperty().setAmbient(0.2);
                actor.getProperty().setDiffuse(0.7);
                actor.getProperty().setSpecular(0.3);
                actor.getProperty().setSpecularPower(8.0);

                // Add to scene
                renderer.addVolume(actor);
                renderer.resetCamera();
                
                setLoadingProgress(90);
                renderWindow.render();

                // Store context for cleanup
                vtkContextRef.current = {
                    fullScreenRenderer,
                    renderer,
                    renderWindow,
                    actor,
                    ctfun,
                    ofun,
                    dataRange: data.data_range
                };

                setLoadingProgress(100);
                setTimeout(() => setLoading(false), 200);

            } catch (err) {
                console.error('[VolumeViewer3D] Error loading volume:', err);
                console.error('[VolumeViewer3D] Error stack:', err.stack);
                console.error('[VolumeViewer3D] Error details:', {
                    message: err.message,
                    name: err.name,
                    studyKey: study?.folderName || study?.id,
                    seriesUid: study?.selectedSeriesUid
                });
                setError(err.message || 'Failed to load volume data');
                setLoading(false);
            }
        };

        // Delay initialization to ensure container has dimensions
        const timer = setTimeout(() => {
            loadVolumeData();
        }, 100);

        return () => {
            clearTimeout(timer);
            // Cleanup VTK on unmount
            if (vtkContextRef.current) {
                vtkContextRef.current.fullScreenRenderer.delete();
                vtkContextRef.current = null;
            }
        };

    }, [study, containerReady]);

    // Auto-rotate effect
    useEffect(() => {
        if (!autoRotate || !vtkContextRef.current) return;

        const { renderer, renderWindow } = vtkContextRef.current;
        const camera = renderer.getActiveCamera();

        const intervalId = setInterval(() => {
            camera.azimuth(1);
            renderWindow.render();
        }, 50);

        return () => clearInterval(intervalId);
    }, [autoRotate]);

    const changePreset = (presetName) => {
        if (!vtkContextRef.current) return;

        const { ctfun, ofun, dataRange, renderWindow } = vtkContextRef.current;
        applyPreset(ctfun, ofun, presetName, dataRange);
        setPreset(presetName);
        renderWindow.render();
    };

    const resetCamera = () => {
        if (!vtkContextRef.current) return;
        const { renderer, renderWindow } = vtkContextRef.current;
        renderer.resetCamera();
        renderWindow.render();
    };

    return (
        <div className="flex flex-col h-full bg-slate-950 text-slate-100 rounded-3xl overflow-hidden shadow-2xl border border-slate-800">
            {/* Header Toolbar */}
                    <div className="flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={onBack}
                                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-white"
                            >
                                <AppIcon name="ArrowLeft" size={20} />
                            </button>
                            <div>
                                <h2 className="text-white font-semibold text-lg">
                                    3D Volume Rendering
                                </h2>
                                <p className="text-gray-400 text-sm">
                                    Rotate with mouse • Zoom with scroll
                                </p>
                            </div>
                        </div>
            
                        <div className="flex items-center gap-2">
                            {/* Preset Selector */}
                            <div className="flex gap-1 bg-slate-800 rounded-lg p-1">
                                <button
                                    onClick={() => changePreset('bone')}
                                    className={`px-3 py-2 rounded text-xs font-medium transition ${preset === 'bone'
                                            ? 'bg-cyan-500 text-white'
                                            : 'text-gray-400 hover:text-white'
                                        }`}
                                >
                                    Bone
                                </button>
                                <button
                                    onClick={() => changePreset('soft')}
                                    className={`px-3 py-2 rounded text-xs font-medium transition ${preset === 'soft'
                                            ? 'bg-cyan-500 text-white'
                                            : 'text-gray-400 hover:text-white'
                                        }`}
                                >
                                    Soft Tissue
                                </button>
                                <button
                                    onClick={() => changePreset('mip')}
                                    className={`px-3 py-2 rounded text-xs font-medium transition ${preset === 'mip'
                                            ? 'bg-cyan-500 text-white'
                                            : 'text-gray-400 hover:text-white'
                                        }`}
                                >
                                    MIP
                                </button>
                            </div>
            
                            <div className="h-6 w-px bg-slate-700" />
            
                            {/* Auto-rotate toggle */}
                            <button
                                onClick={() => setAutoRotate(!autoRotate)}
                                className={`p-2 rounded-lg transition ${autoRotate
                                        ? 'bg-cyan-500 text-white'
                                        : 'bg-slate-800 text-gray-400 hover:text-white'
                                    }`}
                                title="Auto-rotate"
                            >
                                <AppIcon name="RotateCw" size={20} />
                            </button>
            
                            <button
                                onClick={resetCamera}
                                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-gray-400 hover:text-white"
                                title="Reset View"
                            >
                                <AppIcon name="Maximize2" size={20} />
                            </button>
            
                            <div className="h-6 w-px bg-slate-700" />
            
                            {/* Switch to Slice Mode */}
                            <button
                                onClick={onSwitchToSliceMode}
                                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition"
                            >
                                <AppIcon name="Layers" size={18} />
                                <span>Slice View</span>
                            </button>
                        </div>
                    </div>
            {/* VTK Container */}
            <div ref={containerRef} className="flex-1 relative" style={{ minHeight: '400px', width: '100%' }}>
                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                        <div className="flex flex-col items-center gap-4 text-white max-w-md w-full px-8">
                            <AppIcon name="Loader2" size={48} className="animate-spin text-cyan-500" />
                            <p className="text-lg font-medium">Loading 3D Volume...</p>
                            
                            {/* Progress Bar */}
                            <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                                <div 
                                    className="bg-cyan-500 h-full transition-all duration-300 ease-out"
                                    style={{ width: `${loadingProgress}%` }}
                                />
                            </div>
                            <p className="text-sm text-gray-400">{loadingProgress}% - {
                                loadingProgress < 30 ? 'Fetching data...' :
                                loadingProgress < 60 ? 'Parsing volume...' :
                                loadingProgress < 80 ? 'Configuring renderer...' :
                                loadingProgress < 95 ? 'Rendering 3D view...' :
                                'Almost ready!'
                            }</p>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                        <div className="flex flex-col items-center gap-4 text-red-500 bg-red-900/20 p-8 rounded-xl border border-red-500/30">
                            <AppIcon name="AlertCircle" size={48} />
                            <p className="text-lg font-medium">Failed to Load Volume</p>
                            <p className="text-sm text-gray-400 max-w-md text-center">{error}</p>
                            <div className="flex gap-2 mt-4">
                                <button
                                    onClick={() => window.location.reload()}
                                    className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg"
                                >
                                    Retry
                                </button>
                                <button
                                    onClick={onSwitchToSliceMode}
                                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
                                >
                                    Try Slice View
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Instructions Overlay */}
            {!loading && !error && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-sm px-6 py-3 rounded-full text-white text-sm">
                    <span className="flex items-center gap-4">
                        <span>🖱️ Left Click + Drag: Rotate</span>
                        <span>•</span>
                        <span>🖱️ Right Click + Drag: Pan</span>
                        <span>•</span>
                        <span>⚙️ Scroll: Zoom</span>
                    </span>
                </div>
            )}
        </div>
    );
};

export default VolumeViewer3D;
