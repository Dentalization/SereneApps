import React, { useRef, useEffect, useState } from 'react';
import AppIcon from '../../../../components/AppIcon';
import useDICOMViewer from '../hooks/useDICOMViewer';
import VolumeViewer3D from './VolumeViewer3D';

const Viewer3D = ({ study, onBack }) => {
    const { state, actions, refs } = useDICOMViewer(study);
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const imgRef = useRef(null);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [showSeriesSelector, setShowSeriesSelector] = useState(false);
    const [viewMode, setViewMode] = useState('auto'); // 'auto', '3d', 'slice'

    // Determine initial view mode based on series type
    useEffect(() => {
        if (study?.selectedSeriesType === '3D Volume') {
            setViewMode('3d'); // 3D First for volumetric series
        } else {
            setViewMode('slice'); // Direct slice view for 2D images
        }
    }, [study?.selectedSeriesType]);

    // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS (React Rules of Hooks)
    useEffect(() => {
        const handleFullScreenChange = () => {
            setIsFullScreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullScreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullScreenChange);
    }, []);

    const toggleFullScreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
            });
        } else {
            document.exitFullscreen();
        }
    };

    // Sync canvas overlay size with image
    useEffect(() => {
        const img = imgRef.current;
        const canvas = canvasRef.current;
        if (!img || !canvas) return;

        const updateCanvasSize = () => {
            canvas.width = img.naturalWidth || 512;
            canvas.height = img.naturalHeight || 512;
        };

        if (img.complete) {
            updateCanvasSize();
        } else {
            img.addEventListener('load', updateCanvasSize);
            return () => img.removeEventListener('load', updateCanvasSize);
        }
    }, [state.imageSrc]);

    // Draw AI Overlay
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (state.showAIOverlay) {
            if (state.isAnalyzing) {
                ctx.fillStyle = 'rgba(0, 255, 255, 0.5)';
                ctx.font = '14px Inter';
                ctx.fillText('Analyzing...', 10, 20);
                return;
            }

            state.findings.forEach(finding => {
                // Filter by View and Slice
                // For this mock, we only show findings if they match the active view and current slice index
                // In a real app, you'd map 3D coordinates to the current 2D plane

                let isVisible = false;
                if (finding.view === 'axial' && state.activeView === 'axial' && Math.abs(finding.sliceIndex - state.axialIndex) < 2) isVisible = true;
                if (finding.view === 'coronal' && state.activeView === 'coronal' && Math.abs(finding.sliceIndex - state.coronalIndex) < 2) isVisible = true;
                if (finding.view === 'sagittal' && state.activeView === 'sagittal' && Math.abs(finding.sliceIndex - state.sagittalIndex) < 2) isVisible = true;

                if (isVisible) {
                    let [x, y, w, h] = finding.bbox;

                    // Adjust for MPR Flipping (Backend uses flipud for Coronal/Sagittal)
                    if (state.activeView === 'coronal' || state.activeView === 'sagittal') {
                        // We need the height of the image. 
                        // Canvas height should match image height here
                        y = canvas.height - y - h;
                    }

                    // Draw Box
                    ctx.strokeStyle = finding.type === 'Caries' ? '#ef4444' : '#eab308';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(x, y, w, h);

                    // Draw Label background
                    const text = `${finding.type} (${(finding.confidence * 100).toFixed(0)}%)`;
                    ctx.font = '12px Inter';
                    const textWidth = ctx.measureText(text).width;

                    ctx.fillStyle = finding.type === 'Caries' ? '#ef4444' : '#eab308';
                    ctx.fillRect(x, y - 18, textWidth + 8, 18);

                    // Draw Text
                    ctx.fillStyle = '#000000';
                    ctx.fillText(text, x + 4, y - 5);
                }
            });
        }
    }, [state.showAIOverlay, state.findings, state.isAnalyzing, state.activeView, state.axialIndex, state.coronalIndex, state.sagittalIndex]);

    // Conditional rendering: If 3D mode and volumetric series, show VolumeViewer3D
    if (viewMode === '3d' && study?.selectedSeriesType === '3D Volume') {
        return (
            <VolumeViewer3D
                study={study}
                onBack={onBack}
                onSwitchToSliceMode={() => setViewMode('slice')}
            />
        );
    }

    // Otherwise show slice viewer (original implementation)
    return (
        <div className="flex flex-col h-full bg-slate-950 text-slate-100 rounded-3xl overflow-hidden shadow-2xl border border-slate-800">
            {/* Toolbar */}
            <div className="flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
                        <AppIcon name="ArrowLeft" size={20} />
                    </button>
                    <div>
                        <h2 className="font-bold text-white">{study?.patientName || study?.originalName || 'Unknown Patient'}</h2>
                        <p className="text-xs text-slate-400">{study?.modality || '3D'} • {study?.studyDate ? new Date(study.studyDate).toLocaleDateString() : 'N/A'}</p>
                        <p className="text-[10px] text-slate-500">Folder: {study?.folderName}</p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={actions.toggleAI}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${state.showAIOverlay ? 'bg-accent/20 text-accent border border-accent/50' : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'}`}
                    >
                        <AppIcon name="BrainCircuit" size={18} />
                        {state.showAIOverlay ? 'AI On' : 'AI Off'}
                    </button>

                    {state.allSeries.length > 1 && (
                        <>
                            <div className="h-6 w-px bg-slate-800 mx-2" />
                            <button
                                onClick={() => setShowSeriesSelector(!showSeriesSelector)}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700"
                                title="Select Series"
                            >
                                <AppIcon name="Layers" size={18} />
                                <span>{state.allSeries.length} Series</span>
                            </button>
                        </>
                    )}

                    <div className="h-6 w-px bg-slate-800 mx-2" />

                    {/* 3D View Button (only for 3D Volume series) */}
                    {study?.selectedSeriesType === '3D Volume' && (
                        <>
                            <button
                                onClick={() => setViewMode('3d')}
                                className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg font-medium transition shadow-lg"
                                title="Switch to 3D Volume View"
                            >
                                <AppIcon name="Box" size={18} />
                                <span className="text-sm">3D View</span>
                            </button>
                            <div className="h-6 w-px bg-slate-800 mx-2" />
                        </>
                    )}

                    {/* View Selector (for MPR) */}
                    {state.currentSeries?.type === '3D Volume' && (
                        <>
                            <button
                                onClick={() => actions.setActiveView('axial')}
                                className={`px-3 py-2 rounded-lg text-xs font-medium transition ${
                                    state.activeView === 'axial'
                                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-transparent'
                                }`}
                            >
                                Axial
                            </button>
                            <button
                                onClick={() => actions.setActiveView('coronal')}
                                className={`px-3 py-2 rounded-lg text-xs font-medium transition ${
                                    state.activeView === 'coronal'
                                        ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50'
                                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-transparent'
                                }`}
                            >
                                Coronal
                            </button>
                            <button
                                onClick={() => actions.setActiveView('sagittal')}
                                className={`px-3 py-2 rounded-lg text-xs font-medium transition ${
                                    state.activeView === 'sagittal'
                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-transparent'
                                }`}
                            >
                                Sagittal
                            </button>
                            <div className="h-6 w-px bg-slate-800 mx-2" />
                        </>
                    )}

                    <button
                        onClick={actions.togglePlay}
                        className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 text-slate-300"
                        title="Play Cine"
                    >
                        <AppIcon name={state.isPlaying ? "Pause" : "Play"} size={20} />
                    </button>

                    <button 
                        onClick={toggleFullScreen}
                        className="p-2 hover:bg-slate-800 rounded-lg text-slate-400" 
                        title="Fullscreen"
                    >
                        <AppIcon name={isFullScreen ? "Minimize2" : "Maximize2"} size={20} />
                    </button>
                </div>
            </div>

            {/* Main Viewer Area */}
            {state.error ? (
                <div className="flex-1 flex flex-col items-center justify-center bg-slate-900 text-red-400 p-8 text-center">
                    <AppIcon name="AlertTriangle" size={48} className="mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Failed to Load Study</h3>
                    <p className="max-w-md">{state.error}</p>
                    <button onClick={() => window.location.reload()} className="mt-6 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-white">Retry</button>
                </div>
            ) : (
                <div className="flex-1 flex relative">
                    {/* Main Viewer */}
                    <div className="flex-1 flex items-center justify-center bg-black relative">
                        {state.imageSrc ? (
                            <>
                                {/* Direct Image Display */}
                                <img 
                                    ref={imgRef}
                                    src={state.imageSrc} 
                                    alt={`${state.activeView} slice ${state.axialIndex + 1}`}
                                    className="max-w-full max-h-full object-contain"
                                    style={{ imageRendering: 'crisp-edges' }}
                                />
                                
                                {/* AI Overlay Canvas */}
                                <canvas 
                                    ref={canvasRef} 
                                    className="absolute inset-0 m-auto pointer-events-none"
                                    style={{ 
                                        maxWidth: '100%',
                                        maxHeight: '100%',
                                        objectFit: 'contain'
                                    }}
                                />
                                
                                {/* View Label */}
                                <div className="absolute top-4 left-4 text-xs font-mono text-cyan-400 bg-black/70 px-3 py-1.5 rounded">
                                    {state.activeView.toUpperCase()} [{
                                        state.activeView === 'axial' ? state.axialIndex + 1 :
                                        state.activeView === 'coronal' ? state.coronalIndex + 1 :
                                        state.sagittalIndex + 1
                                    }/{state.numSlices}]
                                </div>

                                {/* Series Badge */}
                                {state.currentSeries && (
                                    <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/70 px-3 py-1.5 rounded text-xs">
                                        <AppIcon name={state.currentSeries.type === '3D Volume' ? 'Box' : 'Image'} size={14} className="text-accent" />
                                        <span className="text-white">{state.currentSeries.series_description}</span>
                                        {state.allSeries.length > 1 && (
                                            <button 
                                                onClick={() => setShowSeriesSelector(true)}
                                                className="ml-1 text-accent hover:text-accent-hover"
                                            >
                                                <AppIcon name="ChevronDown" size={14} />
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* Loading Indicator */}
                                {state.imageLoading && (
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                        <AppIcon name="Loader2" size={32} className="text-accent animate-spin" />
                                    </div>
                                )}

                                {/* Slice Slider */}
                                {state.numSlices > 1 && (
                                    <input
                                        type="range"
                                        min="0"
                                        max={state.numSlices - 1}
                                        value={
                                            state.activeView === 'coronal' ? state.coronalIndex :
                                            state.activeView === 'sagittal' ? state.sagittalIndex :
                                            state.axialIndex
                                        }
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value);
                                            if (state.activeView === 'coronal') actions.setCoronalIndex(val);
                                            else if (state.activeView === 'sagittal') actions.setSagittalIndex(val);
                                            else actions.setAxialIndex(val);
                                        }}
                                        className="absolute bottom-4 left-4 right-4 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer slider-thumb"
                                        style={{
                                            background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${((state.activeView === 'axial' ? state.axialIndex : state.activeView === 'coronal' ? state.coronalIndex : state.sagittalIndex) / (state.numSlices - 1)) * 100}%, #1e293b ${((state.activeView === 'axial' ? state.axialIndex : state.activeView === 'coronal' ? state.coronalIndex : state.sagittalIndex) / (state.numSlices - 1)) * 100}%, #1e293b 100%)`
                                        }}
                                    />
                                )}
                            </>
                        ) : (
                            <div className="flex flex-col items-center gap-4 text-slate-500">
                                <AppIcon name="Image" size={48} />
                                <p>Loading image...</p>
                            </div>
                        )}
                    </div>

                    {/* Series Selector Sidebar */}
                    {showSeriesSelector && state.allSeries.length > 1 && (
                        <div className="absolute right-0 top-0 bottom-0 w-80 bg-slate-900/95 backdrop-blur-sm border-l border-slate-800 p-4 overflow-y-auto">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold text-white">Select Series</h3>
                                <button 
                                    onClick={() => setShowSeriesSelector(false)}
                                    className="p-1 hover:bg-slate-800 rounded text-slate-400"
                                >
                                    <AppIcon name="X" size={18} />
                                </button>
                            </div>

                            <div className="space-y-2">
                                {state.allSeries.map((series) => (
                                    <button
                                        key={series.series_uid}
                                        onClick={() => {
                                            actions.changeSeries(series);
                                            setShowSeriesSelector(false);
                                        }}
                                        className={`w-full p-3 rounded-lg border text-left transition ${
                                            state.currentSeries?.series_uid === series.series_uid
                                                ? 'bg-accent/20 border-accent text-accent'
                                                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                                        }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <AppIcon 
                                                name={series.type === '3D Volume' ? 'Box' : 'Image'} 
                                                size={24} 
                                                className={state.currentSeries?.series_uid === series.series_uid ? 'text-accent' : 'text-slate-500'}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium truncate">{series.series_description}</div>
                                                <div className="text-xs opacity-70 mt-1">
                                                    {series.modality} • {series.type} • {series.num_slices} slices
                                                </div>
                                                <div className="text-xs opacity-50 mt-0.5">
                                                    Series {series.series_number}
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Viewer3D;
