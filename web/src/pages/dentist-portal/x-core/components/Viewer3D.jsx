import React, { useRef, useEffect, useState } from 'react';
import AppIcon from '../../../../components/AppIcon';
import useDICOMViewer from '../hooks/useDICOMViewer';

const Viewer3D = ({ study, onBack }) => {
    const { state, actions, refs } = useDICOMViewer(study);
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const [isFullScreen, setIsFullScreen] = useState(false);

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

    // Simulate AI Overlay Drawing
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

    return (
        <div className="flex flex-col h-full bg-slate-950 text-slate-100 rounded-3xl overflow-hidden shadow-2xl border border-slate-800">
            {/* Toolbar */}
            <div className="flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
                        <AppIcon name="ArrowLeft" size={20} />
                    </button>
                    <div>
                        <h2 className="font-bold text-white">{study?.patient?.name || 'Unknown Patient'}</h2>
                        <p className="text-xs text-slate-400">{study?.modality} • {study?.studyDate ? new Date(study.studyDate).toLocaleDateString() : 'N/A'}</p>
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

                    <div className="h-6 w-px bg-slate-800 mx-2" />

                    {/* Tool: Window/Level (Contrast) */}
                    <button
                        onClick={() => actions.setActiveTool('Wwwc')}
                        className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
                        title="Contrast (Window/Level)"
                    >
                        <AppIcon name="Sun" size={20} />
                    </button>

                    {/* Tool: Pan */}
                    <button
                        onClick={() => actions.setActiveTool('Pan')}
                        className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
                        title="Pan"
                    >
                        <AppIcon name="Move" size={20} />
                    </button>

                    {/* Tool: Zoom */}
                    <button
                        onClick={() => actions.setActiveTool('Zoom')}
                        className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
                        title="Zoom"
                    >
                        <AppIcon name="ZoomIn" size={20} />
                    </button>

                    {/* Tool: Length (Measure) */}
                    <button
                        onClick={() => actions.setActiveTool('Length')}
                        className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
                        title="Measure Length"
                    >
                        <AppIcon name="Ruler" size={20} />
                    </button>

                    <div className="h-6 w-px bg-slate-800 mx-2" />

                    <button
                        onClick={actions.togglePlay}
                        className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 text-slate-300"
                        title="Play Cine"
                    >
                        <AppIcon name={state.isPlaying ? "Pause" : "Play"} size={20} />
                    </button>

                    <button className="p-2 hover:bg-slate-800 rounded-lg text-slate-400" title="Reset">
                        <AppIcon name="RotateCcw" size={20} />
                    </button>
                    <button className="p-2 hover:bg-slate-800 rounded-lg text-slate-400" title="Layout">
                        <AppIcon name="LayoutGrid" size={20} />
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
                <div className={`flex-1 grid gap-1 bg-slate-900 p-1 ${study?.modality === '2D' ? 'grid-cols-1' : 'grid-cols-2 grid-rows-2'}`}>

                    {/* Primary View (Axial or 2D) */}
                    <div ref={refs.elementRef}
                        className={`relative bg-black rounded-lg overflow-hidden border ${state.activeView === 'axial' ? 'border-accent' : 'border-transparent'}`}
                        onClick={() => actions.setActiveView('axial')}
                    >
                        <div className="absolute top-2 left-2 text-xs font-mono text-cyan-400 bg-black/50 px-2 py-1 rounded">
                            {study?.modality === '2D' ? 'IMAGE' : `AXIAL [${state.axialIndex + 1}/${state.numSlices}]`}
                        </div>

                        {/* Canvas Container */}
                        <div className="w-full h-full flex items-center justify-center relative">
                            {/* AI Overlay Canvas */}
                            <canvas ref={canvasRef} width={300} height={300} className="absolute inset-0 pointer-events-none mx-auto my-auto z-10" />
                        </div>

                        {/* Slider (Only for 3D stacks) */}
                        {study?.modality !== '2D' && state.numSlices > 1 && (
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
                                className="absolute bottom-2 left-2 right-2 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer z-20"
                            />
                        )}
                    </div>

                    {/* Secondary Views (Only for 3D/CBCT) */}
                    {study?.modality !== '2D' && (
                        <>
                            {/* Coronal View */}
                            <div className={`relative bg-black rounded-lg overflow-hidden border ${state.activeView === 'coronal' ? 'border-accent' : 'border-transparent'}`}
                                onClick={() => actions.setActiveView('coronal')}
                            >
                                <div className="absolute top-2 left-2 text-xs font-mono text-purple-400 bg-black/50 px-2 py-1 rounded">CORONAL [{state.coronalIndex + 1}/{state.numSlices}]</div>
                                <div className="w-full h-full flex items-center justify-center opacity-30">
                                    <AppIcon name="User" size={64} className="text-purple-500" />
                                    <p className="mt-4 text-xs text-slate-500 font-mono">Click to View</p>
                                </div>
                            </div>

                            {/* Sagittal View */}
                            <div className={`relative bg-black rounded-lg overflow-hidden border ${state.activeView === 'sagittal' ? 'border-accent' : 'border-transparent'}`}
                                onClick={() => actions.setActiveView('sagittal')}
                            >
                                <div className="absolute top-2 left-2 text-xs font-mono text-emerald-400 bg-black/50 px-2 py-1 rounded">SAGITTAL [{state.sagittalIndex + 1}/{state.numSlices}]</div>
                                <div className="w-full h-full flex items-center justify-center opacity-30">
                                    <AppIcon name="User" size={64} className="text-emerald-500" />
                                    <p className="mt-4 text-xs text-slate-500 font-mono">Click to View</p>
                                </div>
                            </div>

                            {/* 3D Volume / MPR */}
                            <div className="relative bg-black rounded-lg overflow-hidden border border-transparent">
                                <div className="absolute top-2 left-2 text-xs font-mono text-amber-400 bg-black/50 px-2 py-1 rounded">3D VR</div>
                                <div className="w-full h-full flex items-center justify-center">
                                    <AppIcon name="Box" size={64} className="text-slate-700 animate-pulse" />
                                    <p className="mt-4 text-xs text-slate-500 font-mono">Volume Rendering Alpha</p>
                                </div>
                            </div>
                        </>
                    )}

                </div>
            )}
        </div>
    );
};

export default Viewer3D;
