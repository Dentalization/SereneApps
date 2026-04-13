import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AppIcon from '../../../../components/AppIcon';
import { useAuth } from '../../../../contexts/AuthContext';
import { PY_API_BASE } from '../../../../config/api';
import useStudyMetadata from '../hooks/useStudyMetadata';
import AnnotationCanvas from './AnnotationCanvas';
import ReportExportModal from './ReportExportModal';
import { exportPdfReport, drawAnnotations } from '../utils/reportUtils';

const MEASUREMENT_COLOR = '#1D9E75';

const buildDentistName = (user) => [user?.profile?.title, user?.name].filter(Boolean).join(' ').trim();

const drawMeasurementOverlay = (ctx, measurements, pixelSpacing) => {
    ctx.save();
    measurements.forEach((measurement) => {
        ctx.strokeStyle = MEASUREMENT_COLOR;
        ctx.fillStyle = MEASUREMENT_COLOR;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.moveTo(measurement.start.x, measurement.start.y);
        ctx.lineTo(measurement.end.x, measurement.end.y);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(measurement.start.x, measurement.start.y, 4.5, 0, Math.PI * 2);
        ctx.arc(measurement.end.x, measurement.end.y, 4.5, 0, Math.PI * 2);
        ctx.fill();

        const dx = measurement.end.x - measurement.start.x;
        const dy = measurement.end.y - measurement.start.y;
        const distancePx = Math.sqrt((dx * dx) + (dy * dy));
        const distanceMm = pixelSpacing ? distancePx * pixelSpacing : null;
        const label = distanceMm != null ? `${distanceMm.toFixed(2)} mm` : `${distancePx.toFixed(1)} px`;
        const midX = (measurement.start.x + measurement.end.x) / 2;
        const midY = (measurement.start.y + measurement.end.y) / 2;
        const pillWidth = Math.max(60, label.length * 7 + 14);

        ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
        ctx.strokeStyle = 'rgba(29, 158, 117, 0.55)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(midX - (pillWidth / 2), midY - 24, pillWidth, 20, 10);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = '600 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, midX, midY - 13);
    });
    ctx.restore();
};

const ImageViewer2D = ({ study, seriesInfo, onBack, onSwitchSeries }) => {
    const { user } = useAuth();
    const containerRef = useRef(null);
    const wrapperRef = useRef(null);
    const imgRef = useRef(null);

    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [inverted, setInverted] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const [measureMode, setMeasureMode] = useState(false);
    const [annotateMode, setAnnotateMode] = useState(false);
    const [annotationTool, setAnnotationTool] = useState('arrow');
    const [annotations, setAnnotations] = useState([]);
    const [pixelSpacing, setPixelSpacing] = useState(null);
    const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
    const [measurements, setMeasurements] = useState([]);
    const [pendingPoint, setPendingPoint] = useState(null);
    const [reportModalOpen, setReportModalOpen] = useState(false);
    const [exportingReport, setExportingReport] = useState(false);

    const studyKey = study?.folderName || study?.id || '';
    const seriesUid = seriesInfo?.series_uid || study?.selectedSeriesUid || '';
    const { metadata } = useStudyMetadata(study, { enabled: !!studyKey && !!seriesUid });

    const baseImageUrl = `${PY_API_BASE}/image/${studyKey}/${seriesUid}`;
    const imageUrl = `${baseImageUrl}?retry=${retryCount}`;
    const seriesTitle = seriesInfo?.series_description || seriesInfo?.title || 'Panoramic Image';
    const modality = seriesInfo?.modality || 'OPG';
    const dentistName = useMemo(() => buildDentistName(user), [user]);
    const patientName = metadata?.PatientName || study?.patientName || study?.originalName || 'Patient';
    const clinicName = user?.profile?.clinic_name || metadata?.InstitutionName || 'Dental Clinic';

    const reportInitialValues = useMemo(() => ({
        dentistName,
        patientName,
        clinicalNotes: '',
        includeScreenshot: true,
        includeMetadataSummary: true,
    }), [dentistName, patientName]);

    useEffect(() => {
        setRetryCount(0);
        setImageLoaded(false);
        setImageError(false);
        setPixelSpacing(null);
        setMeasurements([]);
        setPendingPoint(null);
        setMeasureMode(false);
        setAnnotateMode(false);
        setAnnotationTool('arrow');
        setAnnotations([]);
        setReportModalOpen(false);
    }, [studyKey, seriesUid]);

    useEffect(() => {
        let cancelled = false;

        const fetchSpacingHeader = async () => {
            if (!studyKey || !seriesUid) return;

            try {
                const response = await fetch(imageUrl, { method: 'HEAD' });
                if (!response.ok) return;

                const spacingHeader = response.headers.get('X-Pixel-Spacing');
                const nextSpacing = spacingHeader ? Number.parseFloat(spacingHeader) : Number.NaN;

                if (!cancelled && Number.isFinite(nextSpacing) && nextSpacing > 0) {
                    setPixelSpacing(nextSpacing);
                }
            } catch (error) {
                console.warn('[ImageViewer2D] Failed to read image headers:', error);
            }
        };

        fetchSpacingHeader();

        return () => {
            cancelled = true;
        };
    }, [imageUrl, seriesUid, studyKey]);

    useEffect(() => {
        if ((pixelSpacing == null || pixelSpacing <= 0) && metadata?.pixel_spacing > 0) {
            setPixelSpacing(metadata.pixel_spacing);
        }
    }, [metadata, pixelSpacing]);

    const handleWheel = useCallback((event) => {
        event.preventDefault();
        const delta = event.deltaY > 0 ? -0.1 : 0.1;
        setZoom((current) => Math.max(0.1, Math.min(10, current + delta)));
    }, []);

    const zoomIn = useCallback(() => setZoom((current) => Math.min(10, current + 0.25)), []);
    const zoomOut = useCallback(() => setZoom((current) => Math.max(0.1, current - 0.25)), []);
    const fitToScreen = useCallback(() => {
        setZoom(1);
        setPan({ x: 0, y: 0 });
    }, []);

    const handleMouseDown = useCallback((event) => {
        if (measureMode || annotateMode) return;
        if (event.button !== 0) return;
        setIsDragging(true);
        setDragStart({ x: event.clientX - pan.x, y: event.clientY - pan.y });
    }, [annotateMode, measureMode, pan]);

    const handleMouseMove = useCallback((event) => {
        if (!isDragging) return;
        setPan({
            x: event.clientX - dragStart.x,
            y: event.clientY - dragStart.y,
        });
    }, [dragStart, isDragging]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    useEffect(() => {
        const element = containerRef.current;
        if (!element) return undefined;
        element.addEventListener('wheel', handleWheel, { passive: false });
        return () => element.removeEventListener('wheel', handleWheel);
    }, [handleWheel]);

    useEffect(() => {
        document.addEventListener('mouseup', handleMouseUp);
        return () => document.removeEventListener('mouseup', handleMouseUp);
    }, [handleMouseUp]);

    useEffect(() => {
        const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const toggleFullscreen = useCallback(() => {
        if (!wrapperRef.current) return;
        if (!document.fullscreenElement) {
            wrapperRef.current.requestFullscreen().catch(console.error);
            return;
        }
        document.exitFullscreen();
    }, []);

    const captureCurrentViewDataUrl = useCallback(() => {
        const viewport = containerRef.current;
        const img = imgRef.current;

        if (!viewport || !img || !imageLoaded || !imageSize.width || !imageSize.height) {
            return null;
        }

        const width = viewport.clientWidth;
        const height = viewport.clientHeight;
        const scale = Math.max(window.devicePixelRatio || 1, 2);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(width * scale);
        canvas.height = Math.round(height * scale);
        const ctx = canvas.getContext('2d');
        ctx.scale(scale, scale);
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, width, height);

        const drawWidth = imageSize.width * zoom;
        const drawHeight = imageSize.height * zoom;
        const drawX = (width / 2) + pan.x - (drawWidth / 2);
        const drawY = (height / 2) + pan.y - (drawHeight / 2);

        ctx.save();
        if (inverted) {
            ctx.filter = 'invert(1)';
        }
        ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
        ctx.restore();

        ctx.save();
        ctx.translate(drawX, drawY);
        ctx.scale(zoom, zoom);
        drawMeasurementOverlay(ctx, measurements, pixelSpacing);
        drawAnnotations(ctx, annotations, imageSize.width, imageSize.height);
        ctx.restore();

        return canvas.toDataURL('image/png');
    }, [annotations, imageLoaded, imageSize.height, imageSize.width, inverted, measurements, pan.x, pan.y, pixelSpacing, zoom]);

    const captureScreenshot = useCallback(() => {
        const dataUrl = captureCurrentViewDataUrl();
        if (!dataUrl) return;

        const link = document.createElement('a');
        link.download = `xcore-2d-${Date.now()}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, [captureCurrentViewDataUrl]);

    const handleUndoMeasurement = useCallback(() => {
        if (pendingPoint) {
            setPendingPoint(null);
            return;
        }

        setMeasurements((current) => current.slice(0, -1));
    }, [pendingPoint]);

    const handleClearMeasurements = useCallback(() => {
        setMeasurements([]);
        setPendingPoint(null);
    }, []);

    const handleMeasurementClick = useCallback((event) => {
        if (!measureMode || !imageLoaded || !imageSize.width || !imageSize.height) return;
        event.preventDefault();
        event.stopPropagation();

        const rect = event.currentTarget.getBoundingClientRect();
        const nextPoint = {
            x: ((event.clientX - rect.left) / rect.width) * imageSize.width,
            y: ((event.clientY - rect.top) / rect.height) * imageSize.height,
        };

        if (!pendingPoint) {
            setPendingPoint(nextPoint);
            return;
        }

        setMeasurements((current) => [
            ...current,
            {
                id: `${Date.now()}-${current.length}`,
                start: pendingPoint,
                end: nextPoint,
            },
        ]);
        setPendingPoint(null);
    }, [imageLoaded, imageSize.height, imageSize.width, measureMode, pendingPoint]);

    const renderMeasurementLabel = useCallback((measurement) => {
        const dx = measurement.end.x - measurement.start.x;
        const dy = measurement.end.y - measurement.start.y;
        const distancePx = Math.sqrt((dx * dx) + (dy * dy));
        const distanceMm = pixelSpacing ? distancePx * pixelSpacing : null;
        const label = distanceMm != null ? `${distanceMm.toFixed(2)} mm` : `${distancePx.toFixed(1)} px`;
        const midX = (measurement.start.x + measurement.end.x) / 2;
        const midY = (measurement.start.y + measurement.end.y) / 2;
        const pillWidth = Math.max(60, label.length * 7 + 14);

        return (
            <g key={`${measurement.id}-label`}>
                <rect
                    x={midX - (pillWidth / 2)}
                    y={midY - 24}
                    width={pillWidth}
                    height={20}
                    rx={10}
                    fill="rgba(15, 23, 42, 0.92)"
                    stroke="rgba(29, 158, 117, 0.55)"
                    strokeWidth="1"
                />
                <text
                    x={midX}
                    y={midY - 10}
                    fill="#ffffff"
                    fontSize="12"
                    fontWeight="600"
                    textAnchor="middle"
                    dominantBaseline="middle"
                >
                    {label}
                </text>
            </g>
        );
    }, [pixelSpacing]);

    const handleExportReport = useCallback(async (formValues) => {
        try {
            setExportingReport(true);
            const screenshotDataUrl = formValues.includeScreenshot ? captureCurrentViewDataUrl() : null;

            exportPdfReport({
                clinicName,
                dentistName: formValues.dentistName,
                patientName: formValues.patientName,
                clinicalNotes: formValues.clinicalNotes,
                metadata,
                screenshotDataUrl,
                includeMetadataSummary: formValues.includeMetadataSummary,
            });

            setReportModalOpen(false);
        } catch (error) {
            console.error('[ImageViewer2D] Report export failed:', error);
        } finally {
            setExportingReport(false);
        }
    }, [captureCurrentViewDataUrl, clinicName, metadata]);

    return (
        <div ref={wrapperRef} className="flex h-full flex-col overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 text-slate-100 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/95 px-4 py-3 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="rounded-lg bg-slate-800 p-2 text-white transition hover:bg-slate-700">
                        <AppIcon name="ArrowLeft" size={18} />
                    </button>
                    <div>
                        <h2 className="text-base font-semibold leading-tight text-white">{seriesTitle}</h2>
                        <p className="text-xs text-gray-500">{modality} — 2D Image</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button onClick={zoomOut} className="rounded-lg bg-slate-800 p-2 text-gray-400 transition hover:bg-slate-700 hover:text-white" title="Zoom Out">
                        <AppIcon name="ZoomOut" size={18} />
                    </button>
                    <span className="w-14 text-center font-mono text-xs text-gray-400">{Math.round(zoom * 100)}%</span>
                    <button onClick={zoomIn} className="rounded-lg bg-slate-800 p-2 text-gray-400 transition hover:bg-slate-700 hover:text-white" title="Zoom In">
                        <AppIcon name="ZoomIn" size={18} />
                    </button>
                    <button onClick={fitToScreen} className="rounded-lg bg-slate-800 p-2 text-gray-400 transition hover:bg-slate-700 hover:text-white" title="Fit to Screen">
                        <AppIcon name="Maximize" size={18} />
                    </button>
                </div>

                <div className="flex items-center gap-1.5">
                    <button
                        onClick={() => setInverted((current) => !current)}
                        className={`rounded-lg p-2 text-xs transition ${
                            inverted
                                ? 'border border-amber-500/40 bg-amber-500/20 text-amber-400'
                                : 'bg-slate-800 text-gray-400 hover:text-white'
                        }`}
                        title="Invert Colors"
                    >
                        <AppIcon name="Contrast" size={18} />
                    </button>

                    <button
                        onClick={() => {
                            setMeasureMode((current) => {
                                const next = !current;
                                if (next) {
                                    setAnnotateMode(false);
                                }
                                return next;
                            });
                            setPendingPoint(null);
                        }}
                        className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition ${
                            measureMode
                                ? 'border border-cyan-500/40 bg-cyan-500/20 text-cyan-400'
                                : 'bg-slate-800 text-gray-400 hover:text-white'
                        }`}
                        title="Measurement Mode"
                    >
                        <AppIcon name="Ruler" size={16} />
                        <span>Measure</span>
                    </button>

                    <button
                        onClick={() => {
                            setAnnotateMode((current) => {
                                const next = !current;
                                if (next) {
                                    setMeasureMode(false);
                                    setPendingPoint(null);
                                }
                                return next;
                            });
                        }}
                        className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition ${
                            annotateMode
                                ? 'border border-rose-500/40 bg-rose-500/20 text-rose-300'
                                : 'bg-slate-800 text-gray-400 hover:text-white'
                        }`}
                        title="Annotation Mode"
                    >
                        <AppIcon name="Edit3" size={16} />
                        <span>Annotate</span>
                    </button>

                    {measureMode && (
                        <>
                            <button onClick={handleUndoMeasurement} className="rounded-lg bg-slate-800 p-2 text-gray-400 transition hover:bg-slate-700 hover:text-white" title="Undo Measurement">
                                <AppIcon name="Undo2" size={18} />
                            </button>
                            <button onClick={handleClearMeasurements} className="rounded-lg bg-slate-800 p-2 text-gray-400 transition hover:bg-slate-700 hover:text-white" title="Clear Measurements">
                                <AppIcon name="Trash2" size={18} />
                            </button>
                        </>
                    )}

                    {annotateMode && (
                        <>
                            <button
                                onClick={() => setAnnotationTool('arrow')}
                                className={`rounded-lg p-2 transition ${annotationTool === 'arrow' ? 'bg-red-500/20 text-red-300 border border-red-500/40' : 'bg-slate-800 text-gray-400 hover:text-white'}`}
                                title="Arrow"
                            >
                                <AppIcon name="ArrowRight" size={18} />
                            </button>
                            <button
                                onClick={() => setAnnotationTool('circle')}
                                className={`rounded-lg p-2 transition ${annotationTool === 'circle' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-800 text-gray-400 hover:text-white'}`}
                                title="Circle"
                            >
                                <AppIcon name="Circle" size={18} />
                            </button>
                            <button
                                onClick={() => setAnnotationTool('text')}
                                className={`rounded-lg p-2 transition ${annotationTool === 'text' ? 'bg-slate-700 text-white border border-slate-500/40' : 'bg-slate-800 text-gray-400 hover:text-white'}`}
                                title="Text"
                            >
                                <AppIcon name="Type" size={18} />
                            </button>
                            <button onClick={() => setAnnotations((current) => current.slice(0, -1))} className="rounded-lg bg-slate-800 p-2 text-gray-400 transition hover:bg-slate-700 hover:text-white" title="Undo Annotation">
                                <AppIcon name="Undo2" size={18} />
                            </button>
                            <button onClick={() => setAnnotations([])} className="rounded-lg bg-slate-800 p-2 text-gray-400 transition hover:bg-slate-700 hover:text-white" title="Clear Annotations">
                                <AppIcon name="Trash2" size={18} />
                            </button>
                        </>
                    )}

                    <button onClick={captureScreenshot} className="rounded-lg bg-slate-800 p-2 text-gray-400 transition hover:bg-slate-700 hover:text-white" title="Save Screenshot">
                        <AppIcon name="Camera" size={18} />
                    </button>

                    <button onClick={() => setReportModalOpen(true)} className="flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-emerald-500" title="Export Report">
                        <AppIcon name="FileText" size={16} />
                        <span>Export Report</span>
                    </button>

                    <button onClick={toggleFullscreen} className="rounded-lg bg-slate-800 p-2 text-gray-400 transition hover:bg-slate-700 hover:text-white" title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}>
                        <AppIcon name={isFullscreen ? 'Minimize2' : 'Maximize2'} size={18} />
                    </button>

                    {onSwitchSeries && (
                        <>
                            <div className="mx-1 h-6 w-px bg-slate-700" />
                            <button onClick={onSwitchSeries} className="flex items-center gap-2 rounded-lg bg-purple-600 px-3 py-2 text-xs font-medium text-white transition shadow-lg shadow-purple-600/20 hover:bg-purple-500">
                                <AppIcon name="Layers" size={16} />
                                <span>Series</span>
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div
                ref={containerRef}
                className="relative flex-1 select-none overflow-hidden bg-black"
                style={{ cursor: annotateMode || measureMode ? 'crosshair' : (isDragging ? 'grabbing' : 'grab'), minHeight: '400px' }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
            >
                {!imageLoaded && !imageError && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-4">
                            <AppIcon name="Loader2" size={40} className="animate-spin text-cyan-400" />
                            <p className="text-sm text-gray-400">Loading image...</p>
                        </div>
                    </div>
                )}

                {imageError && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center">
                        <div className="rounded-2xl border border-red-500/20 bg-red-950/40 p-8 text-red-400">
                            <div className="flex flex-col items-center gap-4">
                                <AppIcon name="AlertCircle" size={48} />
                                <p className="text-lg font-semibold">Failed to Load Image</p>
                                <p className="text-sm text-gray-400">The 2D image could not be loaded from the server.</p>
                                <button
                                    onClick={() => {
                                        setImageError(false);
                                        setImageLoaded(false);
                                        setRetryCount((current) => current + 1);
                                    }}
                                    className="rounded-lg bg-red-600 px-5 py-2.5 font-medium text-white transition hover:bg-red-500"
                                >
                                    Retry
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div
                    className="absolute"
                    style={{
                        left: '50%',
                        top: '50%',
                        transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                        transformOrigin: 'center center',
                        transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                        width: imageSize.width || undefined,
                        height: imageSize.height || undefined,
                        display: imageLoaded ? 'block' : 'none',
                    }}
                >
                    <img
                        ref={imgRef}
                        src={imageUrl}
                        alt={seriesTitle}
                        draggable={false}
                        onLoad={(event) => {
                            setImageLoaded(true);
                            setImageError(false);
                            setImageSize({
                                width: event.currentTarget.naturalWidth,
                                height: event.currentTarget.naturalHeight,
                            });
                        }}
                        onError={() => {
                            setImageLoaded(false);
                            setImageError(true);
                        }}
                        className="block"
                        style={{
                            maxWidth: 'none',
                            maxHeight: 'none',
                            filter: inverted ? 'invert(1)' : 'none',
                            imageRendering: zoom > 2 ? 'pixelated' : 'auto',
                        }}
                    />

                    {imageLoaded && imageSize.width > 0 && imageSize.height > 0 && (
                        <>
                            <svg
                                width={imageSize.width}
                                height={imageSize.height}
                                viewBox={`0 0 ${imageSize.width} ${imageSize.height}`}
                                className="absolute inset-0"
                                style={{ pointerEvents: measureMode ? 'auto' : 'none' }}
                                onMouseDown={handleMeasurementClick}
                            >
                                {measurements.map((measurement) => (
                                    <g key={measurement.id}>
                                        <line
                                            x1={measurement.start.x}
                                            y1={measurement.start.y}
                                            x2={measurement.end.x}
                                            y2={measurement.end.y}
                                            stroke={MEASUREMENT_COLOR}
                                            strokeWidth="3"
                                            strokeLinecap="round"
                                        />
                                        <circle cx={measurement.start.x} cy={measurement.start.y} r="4.5" fill={MEASUREMENT_COLOR} />
                                        <circle cx={measurement.end.x} cy={measurement.end.y} r="4.5" fill={MEASUREMENT_COLOR} />
                                        {renderMeasurementLabel(measurement)}
                                    </g>
                                ))}

                                {pendingPoint && (
                                    <circle
                                        cx={pendingPoint.x}
                                        cy={pendingPoint.y}
                                        r="5"
                                        fill={MEASUREMENT_COLOR}
                                        stroke="#ffffff"
                                        strokeWidth="1.5"
                                    />
                                )}
                            </svg>

                            <AnnotationCanvas
                                width={imageSize.width}
                                height={imageSize.height}
                                active={annotateMode}
                                tool={annotationTool}
                                annotations={annotations}
                                onChange={setAnnotations}
                                className="absolute inset-0 z-20"
                            />
                        </>
                    )}
                </div>

                {imageLoaded && (
                    <div className="absolute right-3 top-3 z-20">
                        <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/15 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-indigo-400 backdrop-blur-sm">
                            {modality} — {seriesTitle}
                            {inverted ? ' (Inv)' : ''}
                        </div>
                    </div>
                )}

                {imageLoaded && (
                    <div className="absolute bottom-3 left-1/2 z-20 -translate-x-1/2 rounded-full border border-white/10 bg-black/60 px-5 py-2 text-[11px] text-white shadow-2xl backdrop-blur-md">
                        <span className="flex items-center gap-3">
                            <span className="text-gray-400">
                                {annotateMode ? 'Drag/Click: Annotate' : measureMode ? 'Click: Measure' : 'Drag: Pan'}
                            </span>
                            <span className="text-white/20">{'\u2022'}</span>
                            <span className="text-gray-400">Scroll: Zoom</span>
                            <span className="text-white/20">{'\u2022'}</span>
                            <span className="text-cyan-400/80">Zoom: {Math.round(zoom * 100)}%</span>
                            {pixelSpacing && (
                                <>
                                    <span className="text-white/20">{'\u2022'}</span>
                                    <span className="text-cyan-400/80">Spacing: {pixelSpacing.toFixed(3)} mm/px</span>
                                </>
                            )}
                        </span>
                    </div>
                )}

                <ReportExportModal
                    visible={reportModalOpen}
                    onClose={() => setReportModalOpen(false)}
                    onConfirm={handleExportReport}
                    initialValues={reportInitialValues}
                    exporting={exportingReport}
                    clinicName={clinicName}
                />
            </div>
        </div>
    );
};

export default ImageViewer2D;
