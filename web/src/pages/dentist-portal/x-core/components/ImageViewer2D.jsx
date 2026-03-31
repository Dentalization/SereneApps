import React, { useState, useRef, useCallback, useEffect } from 'react';
import AppIcon from '../../../../components/AppIcon';

const PY_API_BASE = import.meta.env.VITE_SERENE_AI_API_BASE_URL?.replace(/\/$/, '') || 'http://127.0.0.1:8000';

/**
 * ImageViewer2D — Full-featured 2D DICOM image viewer
 * 
 * Used for:
 * - Panoramic (OPG) images
 * - Cephalometric X-rays
 * - Single-slice 2D DICOM series
 * 
 * Features:
 * - Pan (drag)
 * - Zoom (scroll / pinch / buttons)
 * - Fit to screen
 * - Invert colors
 * - Fullscreen
 * - Screenshot export
 */
const ImageViewer2D = ({ study, seriesInfo, onBack, onSwitchSeries }) => {
    const containerRef = useRef(null);
    const wrapperRef = useRef(null);
    const imgRef = useRef(null);

    // View state
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [inverted, setInverted] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);

    const studyKey = study?.folderName || study?.id || '';
    const seriesUid = seriesInfo?.series_uid || study?.selectedSeriesUid || '';

    // Image URL — use pre-generated 2D image endpoint
    const imageUrl = `${PY_API_BASE}/image/${studyKey}/${seriesUid}`;

    // ── Zoom ──
    const handleWheel = useCallback((e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setZoom(prev => Math.max(0.1, Math.min(10, prev + delta)));
    }, []);

    const zoomIn = useCallback(() => setZoom(prev => Math.min(10, prev + 0.25)), []);
    const zoomOut = useCallback(() => setZoom(prev => Math.max(0.1, prev - 0.25)), []);
    const fitToScreen = useCallback(() => {
        setZoom(1);
        setPan({ x: 0, y: 0 });
    }, []);

    // ── Pan (drag) ──
    const handleMouseDown = useCallback((e) => {
        if (e.button !== 0) return; // Left click only
        setIsDragging(true);
        setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }, [pan]);

    const handleMouseMove = useCallback((e) => {
        if (!isDragging) return;
        setPan({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y,
        });
    }, [isDragging, dragStart]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    // Attach wheel listener with passive: false
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        el.addEventListener('wheel', handleWheel, { passive: false });
        return () => el.removeEventListener('wheel', handleWheel);
    }, [handleWheel]);

    // Global mouse up (in case drag goes outside container)
    useEffect(() => {
        document.addEventListener('mouseup', handleMouseUp);
        return () => document.removeEventListener('mouseup', handleMouseUp);
    }, [handleMouseUp]);

    // ── Fullscreen ──
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

    // ── Screenshot ──
    const captureScreenshot = useCallback(() => {
        const img = imgRef.current;
        if (!img) return;

        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');

        if (inverted) {
            ctx.filter = 'invert(1)';
        }
        ctx.drawImage(img, 0, 0);

        const dataURL = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `xcore-2d-${Date.now()}.png`;
        link.href = dataURL;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, [inverted]);

    const seriesTitle = seriesInfo?.series_description || seriesInfo?.title || 'Panoramic Image';
    const modality = seriesInfo?.modality || 'OPG';

    return (
        <div ref={wrapperRef} className="flex flex-col h-full bg-slate-950 text-slate-100 rounded-3xl overflow-hidden shadow-2xl border border-slate-800">
            {/* ── Header Toolbar ── */}
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
                            {seriesTitle}
                        </h2>
                        <p className="text-gray-500 text-xs">
                            {modality} — 2D Image
                        </p>
                    </div>
                </div>

                {/* Center: Zoom Controls */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={zoomOut}
                        className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-gray-400 hover:text-white transition"
                        title="Zoom Out"
                    >
                        <AppIcon name="ZoomOut" size={18} />
                    </button>
                    <span className="text-xs font-mono text-gray-400 w-14 text-center">
                        {Math.round(zoom * 100)}%
                    </span>
                    <button
                        onClick={zoomIn}
                        className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-gray-400 hover:text-white transition"
                        title="Zoom In"
                    >
                        <AppIcon name="ZoomIn" size={18} />
                    </button>
                    <button
                        onClick={fitToScreen}
                        className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-gray-400 hover:text-white transition"
                        title="Fit to Screen"
                    >
                        <AppIcon name="Maximize" size={18} />
                    </button>
                </div>

                {/* Right: Tools */}
                <div className="flex items-center gap-1.5">
                    <button
                        onClick={() => setInverted(prev => !prev)}
                        className={'p-2 rounded-lg transition text-xs ' + (
                            inverted
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                                : 'bg-slate-800 text-gray-400 hover:text-white'
                        )}
                        title="Invert Colors"
                    >
                        <AppIcon name="Contrast" size={18} />
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

                    {onSwitchSeries && (
                        <>
                            <div className="h-6 w-px bg-slate-700 mx-1" />
                            <button
                                onClick={onSwitchSeries}
                                className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-medium transition shadow-lg shadow-purple-600/20"
                            >
                                <AppIcon name="Layers" size={16} />
                                <span>Series</span>
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* ── Main Image Area ── */}
            <div
                ref={containerRef}
                className="flex-1 relative overflow-hidden bg-black select-none"
                style={{ cursor: isDragging ? 'grabbing' : 'grab', minHeight: '400px' }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
            >
                {!imageLoaded && !imageError && (
                    <div className="absolute inset-0 flex items-center justify-center z-10">
                        <div className="flex flex-col items-center gap-4">
                            <AppIcon name="Loader2" size={40} className="animate-spin text-cyan-400" />
                            <p className="text-gray-400 text-sm">Loading image...</p>
                        </div>
                    </div>
                )}

                {imageError && (
                    <div className="absolute inset-0 flex items-center justify-center z-10">
                        <div className="flex flex-col items-center gap-4 text-red-400 bg-red-950/40 p-8 rounded-2xl border border-red-500/20">
                            <AppIcon name="AlertCircle" size={48} />
                            <p className="text-lg font-semibold">Failed to Load Image</p>
                            <p className="text-sm text-gray-400">The 2D image could not be loaded from the server.</p>
                            <button
                                onClick={() => { setImageError(false); setImageLoaded(false); }}
                                className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium transition"
                            >
                                Retry
                            </button>
                        </div>
                    </div>
                )}

                <img
                    ref={imgRef}
                    src={imageUrl}
                    alt={seriesTitle}
                    draggable={false}
                    onLoad={() => setImageLoaded(true)}
                    onError={() => setImageError(true)}
                    className="absolute"
                    style={{
                        left: '50%',
                        top: '50%',
                        transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                        transformOrigin: 'center center',
                        maxWidth: 'none',
                        maxHeight: 'none',
                        filter: inverted ? 'invert(1)' : 'none',
                        transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                        imageRendering: zoom > 2 ? 'pixelated' : 'auto',
                        display: imageLoaded ? 'block' : 'none',
                    }}
                />

                {/* Mode Badge */}
                {imageLoaded && (
                    <div className="absolute top-3 right-3 z-20">
                        <div className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest border backdrop-blur-sm bg-indigo-500/15 text-indigo-400 border-indigo-500/30">
                            {modality} — {seriesTitle}
                            {inverted ? ' (Inv)' : ''}
                        </div>
                    </div>
                )}

                {/* Bottom Status */}
                {imageLoaded && (
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 bg-black/60 backdrop-blur-md px-5 py-2 rounded-full text-white text-[11px] border border-white/10 shadow-2xl">
                        <span className="flex items-center gap-3">
                            <span className="text-gray-400">Drag: Pan</span>
                            <span className="text-white/20">{'\u2022'}</span>
                            <span className="text-gray-400">Scroll: Zoom</span>
                            <span className="text-white/20">{'\u2022'}</span>
                            <span className="text-cyan-400/80">Zoom: {Math.round(zoom * 100)}%</span>
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ImageViewer2D;
