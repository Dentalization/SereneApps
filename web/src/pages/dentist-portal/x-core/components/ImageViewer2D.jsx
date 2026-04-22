import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AppIcon from '../../../../components/AppIcon';
import Dropdown, { DropdownItem, DropdownDivider } from '../../../../components/ui/Dropdown';
import { useAuth } from '../../../../contexts/AuthContext';
import useStudyMetadata from '../hooks/useStudyMetadata';
import usePersistentAnnotations from '../hooks/usePersistentAnnotations';
import AnnotationCanvas from './AnnotationCanvas';
import AnnotationHistoryPanel from './AnnotationHistoryPanel';
import AnnotationSessionModal from './AnnotationSessionModal';
import ReportExportModal from './ReportExportModal';
import { exportAnnotationsJson, exportPdfReport, drawAnnotations } from '../utils/reportUtils';
import {
    deleteAnnotationSnapshot,
    loadAnnotationSnapshots,
    normalizeAnnotationForPersistence,
    reviewStudyAnnotations,
    saveAnnotationSnapshot,
} from '../utils/annotationApi';
import {
    deleteLocalAnnotationSession,
    loadLocalAnnotationSessions,
    mergeAnnotationSessions,
    saveLocalAnnotationSession,
} from '../utils/annotationSessions.mjs';
import { getAnnotationReviewIssues } from '../utils/annotationQuality';
import { buildImagingUrl, buildStudyAssetParams } from '../utils/imagingUrl';
import ShortcutHelpButton from './ShortcutHelpButton';

const MEASUREMENT_COLOR = '#1D9E75';
const WL_DRAG_SENSITIVITY = 0.005;
const SCALE_BAR_OPTIONS_MM = [5, 10, 20, 50, 100];
const IMAGE_SHORTCUTS = [
    { key: '+ / =', label: 'Zoom in' },
    { key: '-', label: 'Zoom out' },
    { key: '0', label: 'Fit to screen' },
    { key: 'Ctrl/Cmd + Z', label: 'Undo annotation/measurement' },
    { key: 'Right-drag', label: 'Window/Level adjust' },
    { key: 'I', label: 'Invert image' },
    { key: 'F', label: 'Fullscreen' },
];

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const buildDentistName = (user) => [user?.profile?.title, user?.name].filter(Boolean).join(' ').trim();

const drawMeasurementOverlay = (ctx, measurements, pixelSpacing) => {
    ctx.save();
    measurements.forEach((measurement) => {
        ctx.strokeStyle = MEASUREMENT_COLOR;
        ctx.fillStyle = MEASUREMENT_COLOR;
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.moveTo(measurement.start.x, measurement.start.y);
        ctx.lineTo(measurement.end.x, measurement.end.y);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(measurement.start.x, measurement.start.y, 3, 0, Math.PI * 2);
        ctx.arc(measurement.end.x, measurement.end.y, 3, 0, Math.PI * 2);
        ctx.fill();

        const dx = measurement.end.x - measurement.start.x;
        const dy = measurement.end.y - measurement.start.y;
        const distancePx = Math.sqrt((dx * dx) + (dy * dy));
        const distanceMm = effectivePixelSpacing ? distancePx * effectivePixelSpacing : null;
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

const getScaleBar = (imageWidth, imageHeight, zoom, pixelSpacing) => {
    if (!imageWidth || !imageHeight || !pixelSpacing || pixelSpacing <= 0 || !zoom) return null;
    const maxImagePx = Math.min(imageWidth * 0.28, 180 / Math.max(zoom, 0.1));
    const selectedMm = SCALE_BAR_OPTIONS_MM.find((mm) => (mm / pixelSpacing) >= 48 && (mm / pixelSpacing) <= maxImagePx)
        || SCALE_BAR_OPTIONS_MM.find((mm) => (mm / pixelSpacing) >= 24)
        || SCALE_BAR_OPTIONS_MM[0];
    const lengthPx = selectedMm / pixelSpacing;
    return {
        label: `${selectedMm} mm`,
        lengthPx,
        x: 18,
        y: Math.max(30, imageHeight - 28),
    };
};

const drawScaleBar = (ctx, scaleBar) => {
    if (!scaleBar) return;
    const { x, y, lengthPx, label } = scaleBar;
    ctx.save();
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + lengthPx, y);
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + lengthPx, y);
    ctx.stroke();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.78)';
    ctx.fillRect(x - 4, y - 26, Math.max(54, label.length * 8), 18);
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 12px monospace';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + 3, y - 17);
    ctx.restore();
};

const ImageViewer2D = ({ study, seriesInfo, onBack, onSwitchSeries, activeToothContext = null }) => {
    const { user } = useAuth();
    const containerRef = useRef(null);
    const wrapperRef = useRef(null);
    const imgRef = useRef(null);

    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [windowCenter, setWindowCenter] = useState(0.5);
    const [windowWidth, setWindowWidth] = useState(1.0);
    const [windowLevelDrag, setWindowLevelDrag] = useState(null);
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
    const [calibrationFactor, setCalibrationFactor] = useState(null);
    const [calibrationMode, setCalibrationMode] = useState(false);
    const [calibrationDraft, setCalibrationDraft] = useState(null);
    const [calibrationDialog, setCalibrationDialog] = useState(null);
    const [calibrationLengthInput, setCalibrationLengthInput] = useState('10');
    const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
    const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
    const [imageBounds, setImageBounds] = useState(null);
    const [measurements, setMeasurements] = useState([]);
    const [pendingPoint, setPendingPoint] = useState(null);
    const [measurementDragStart, setMeasurementDragStart] = useState(null);
    const [previewPoint, setPreviewPoint] = useState(null);
    const [reportModalOpen, setReportModalOpen] = useState(false);
    const [exportingReport, setExportingReport] = useState(false);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [snapshots, setSnapshots] = useState([]);
    const [snapshotsLoading, setSnapshotsLoading] = useState(false);
    const [snapshotOverlay, setSnapshotOverlay] = useState(null);
    const [sessionModalMode, setSessionModalMode] = useState(null);
    const [sessionSaving, setSessionSaving] = useState(false);
    const [sessionError, setSessionError] = useState('');
    const [reviewError, setReviewError] = useState('');
    const reviewMode = useMemo(() => new URLSearchParams(window.location.search).get('mode') === 'review', []);

    const studyKey = study?.folderName || study?.id || '';
    const seriesUid = seriesInfo?.series_uid
        || study?.selectedSeriesUid
        || study?.series_uid
        || study?.seriesUid
        || study?.selectedSeries?.series_uid
        || study?.series?.[0]?.series_uid
        || study?.seriesList?.[0]?.series_uid
        || '';
    const { metadata } = useStudyMetadata(study, { enabled: !!studyKey && !!seriesUid });
    const showBack = typeof onBack === 'function';
    const allowSeriesSwitch = !study?.readOnly && typeof onSwitchSeries === 'function';

    const imageUrl = buildImagingUrl(
        `/image/${studyKey}/${seriesUid}`,
        buildStudyAssetParams(study, { retry: retryCount })
    );
    const canUseBackendSessions = useMemo(() => /^\d+$/.test(String(study?.id || '')), [study?.id]);
    const sessionScope = useMemo(() => ({
        study,
        studyKey,
        seriesUid,
        viewerType: '2d',
    }), [seriesUid, study, studyKey]);
    const seriesTitle = seriesInfo?.series_description || seriesInfo?.title || 'Panoramic Image';
    const modality = seriesInfo?.modality || 'OPG';
    const dentistName = useMemo(() => buildDentistName(user), [user]);
    const patientName = metadata?.PatientName || study?.patientName || study?.originalName || 'Patient';
    const clinicName = user?.profile?.clinic_name || metadata?.InstitutionName || 'Dental Clinic';
    const effectivePixelSpacing = calibrationFactor || pixelSpacing || 1;
    const calibrationMethod = calibrationFactor
        ? 'manual'
        : (pixelSpacing && pixelSpacing !== 1 ? 'dicom_header' : 'estimated');
    const calibrationNeedsReview = !pixelSpacing || pixelSpacing === 1;
    const scaleBar = useMemo(
        () => getScaleBar(imageSize.width, imageSize.height, zoom, effectivePixelSpacing),
        [effectivePixelSpacing, imageSize.height, imageSize.width, zoom]
    );

    const reportInitialValues = useMemo(() => ({
        dentistName,
        patientName,
        clinicalNotes: '',
        includeScreenshot: true,
        includeMetadataSummary: true,
    }), [dentistName, patientName]);
    const annotationPersistenceScope = useMemo(() => ({
        sourceWidth: imageSize.width,
        sourceHeight: imageSize.height,
    }), [imageSize.height, imageSize.width]);
    const annotationPersistence = usePersistentAnnotations({
        study,
        seriesUid,
        viewerType: '2d',
        annotations,
        setAnnotations,
        enabled: imageLoaded && imageSize.width > 0 && imageSize.height > 0,
        scope: annotationPersistenceScope,
    });

    const imageFilter = useMemo(() => {
        const brightness = windowCenter / 0.5;
        const contrast = 1 / windowWidth;
        return [
            `brightness(${brightness.toFixed(2)})`,
            `contrast(${contrast.toFixed(2)})`,
            inverted ? 'invert(1)' : '',
        ].filter(Boolean).join(' ');
    }, [inverted, windowCenter, windowWidth]);

    const syncImageBounds = useCallback(() => {
        const viewport = containerRef.current;
        const image = imgRef.current;
        if (!viewport || !image || !imageSize.width || !imageSize.height) {
            setImageBounds(null);
            return;
        }

        const viewportRect = viewport.getBoundingClientRect();
        const imageRect = image.getBoundingClientRect();
        if (!viewportRect.width || !viewportRect.height || !imageRect.width || !imageRect.height) {
            setImageBounds(null);
            return;
        }

        const nextBounds = {
            x: imageRect.left - viewportRect.left,
            y: imageRect.top - viewportRect.top,
            width: imageRect.width,
            height: imageRect.height,
        };

        setImageBounds((current) => {
            if (
                current
                && Math.abs(current.x - nextBounds.x) < 0.5
                && Math.abs(current.y - nextBounds.y) < 0.5
                && Math.abs(current.width - nextBounds.width) < 0.5
                && Math.abs(current.height - nextBounds.height) < 0.5
            ) {
                return current;
            }
            return nextBounds;
        });
    }, [imageSize.height, imageSize.width]);

    useEffect(() => {
        setRetryCount(0);
        setImageLoaded(false);
        setImageError(false);
        setPixelSpacing(null);
        setCalibrationFactor(null);
        setCalibrationMode(false);
        setCalibrationDraft(null);
        setCalibrationDialog(null);
        setCalibrationLengthInput('10');
        setMeasurements([]);
        setPendingPoint(null);
        setMeasureMode(false);
        setAnnotateMode(false);
        setAnnotationTool('arrow');
        setAnnotations([]);
        setImageBounds(null);
        setWindowCenter(0.5);
        setWindowWidth(1.0);
        setWindowLevelDrag(null);
        setReportModalOpen(false);
        setHistoryOpen(false);
        setSnapshots([]);
        setSnapshotOverlay(null);
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

    useEffect(() => {
        const element = containerRef.current;
        if (!element) return undefined;

        const syncViewportSize = () => {
            setViewportSize({
                width: element.clientWidth,
                height: element.clientHeight,
            });
        };

        syncViewportSize();

        if (typeof ResizeObserver !== 'undefined') {
            const observer = new ResizeObserver(syncViewportSize);
            observer.observe(element);
            return () => observer.disconnect();
        }

        window.addEventListener('resize', syncViewportSize);
        return () => window.removeEventListener('resize', syncViewportSize);
    }, []);

    useEffect(() => {
        if (!imageLoaded) {
            setImageBounds(null);
            return undefined;
        }

        const frameId = window.requestAnimationFrame(syncImageBounds);
        return () => window.cancelAnimationFrame(frameId);
    }, [
        imageLoaded,
        imageSize.height,
        imageSize.width,
        pan.x,
        pan.y,
        syncImageBounds,
        viewportSize.height,
        viewportSize.width,
        zoom,
    ]);

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

    const updateWindowLevelFromDrag = useCallback((event, dragState) => {
        const dx = event.clientX - dragState.startX;
        const dy = event.clientY - dragState.startY;
        setWindowCenter(clamp(dragState.startCenter - (dy * WL_DRAG_SENSITIVITY), 0, 1));
        setWindowWidth(clamp(dragState.startWidth + (dx * WL_DRAG_SENSITIVITY), 0.05, 2.0));
    }, []);

    const handleMouseDown = useCallback((event) => {
        if (event.button === 2) {
            event.preventDefault();
            event.stopPropagation();
            setIsDragging(false);
            setWindowLevelDrag({
                startX: event.clientX,
                startY: event.clientY,
                startCenter: windowCenter,
                startWidth: windowWidth,
            });
            return;
        }

        if (measureMode || annotateMode || calibrationMode) return;
        if (event.button !== 0) return;
        setIsDragging(true);
        setDragStart({ x: event.clientX - pan.x, y: event.clientY - pan.y });
    }, [annotateMode, calibrationMode, measureMode, pan, windowCenter, windowWidth]);

    const handleMouseMove = useCallback((event) => {
        if (windowLevelDrag) {
            event.preventDefault();
            updateWindowLevelFromDrag(event, windowLevelDrag);
            return;
        }

        if (!isDragging) return;
        setPan({
            x: event.clientX - dragStart.x,
            y: event.clientY - dragStart.y,
        });
    }, [dragStart, isDragging, updateWindowLevelFromDrag, windowLevelDrag]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
        setWindowLevelDrag(null);
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
        if (!windowLevelDrag) return undefined;

        const handleDocumentMouseMove = (event) => {
            event.preventDefault();
            updateWindowLevelFromDrag(event, windowLevelDrag);
        };

        const handleDocumentMouseUp = () => {
            setWindowLevelDrag(null);
        };

        document.addEventListener('mousemove', handleDocumentMouseMove);
        document.addEventListener('mouseup', handleDocumentMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleDocumentMouseMove);
            document.removeEventListener('mouseup', handleDocumentMouseUp);
        };
    }, [updateWindowLevelFromDrag, windowLevelDrag]);

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

    useEffect(() => {
        const handleKeyDown = (event) => {
            const activeTag = document.activeElement?.tagName?.toLowerCase();
            const isTextInput = activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select';
            const viewerFocused = wrapperRef.current?.contains(document.activeElement);
            if (isTextInput) return;
            if (document.activeElement !== document.body && !viewerFocused) return;

            const key = event.key.toLowerCase();
            if ((event.ctrlKey || event.metaKey) && key === 'z') {
                if (!annotateMode && !measureMode) return;
                event.preventDefault();
                if (annotateMode) {
                    setAnnotations((current) => current.slice(0, -1));
                } else {
                    if (pendingPoint) {
                        setPendingPoint(null);
                    } else {
                        setMeasurements((current) => current.slice(0, -1));
                    }
                }
            } else if (key === '+' || key === '=') {
                event.preventDefault();
                zoomIn();
            } else if (key === '-') {
                event.preventDefault();
                zoomOut();
            } else if (key === '0') {
                event.preventDefault();
                fitToScreen();
            } else if (key === 'i') {
                event.preventDefault();
                setInverted((current) => !current);
            } else if (key === 'f') {
                event.preventDefault();
                toggleFullscreen();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [annotateMode, fitToScreen, measureMode, pendingPoint, toggleFullscreen, zoomIn, zoomOut]);

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
        ctx.filter = imageFilter;
        ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
        ctx.restore();

        ctx.save();
        ctx.translate(drawX, drawY);
        ctx.scale(zoom, zoom);
        drawMeasurementOverlay(ctx, measurements, effectivePixelSpacing);
        drawAnnotations(ctx, annotations, imageSize.width, imageSize.height);
        drawScaleBar(ctx, scaleBar);
        ctx.restore();

        return canvas.toDataURL('image/png');
    }, [
        annotations,
        effectivePixelSpacing,
        imageFilter,
        imageLoaded,
        imageSize.height,
        imageSize.width,
        measurements,
        pan.x,
        pan.y,
        scaleBar,
        zoom,
    ]);

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
            setPreviewPoint(null);
            setMeasurementDragStart(null);
            return;
        }

        setMeasurements((current) => current.slice(0, -1));
    }, [pendingPoint]);

    const handleUndoAnnotation = useCallback(() => {
        setAnnotations((current) => current.slice(0, -1));
    }, []);

    const handleClearMeasurements = useCallback(() => {
        setMeasurements([]);
        setPendingPoint(null);
        setMeasurementDragStart(null);
        setPreviewPoint(null);
    }, []);

    const getMeasurementPoint = useCallback((event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        return {
            x: ((event.clientX - rect.left) / rect.width) * imageSize.width,
            y: ((event.clientY - rect.top) / rect.height) * imageSize.height,
        };
    }, [imageSize.height, imageSize.width]);

    const commitMeasurement = useCallback((start, end) => {
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        if (Math.hypot(dx, dy) < 3) return false;

        setMeasurements((current) => [
            ...current,
            {
                id: `${Date.now()}-${current.length}`,
                start,
                end,
                metadata: {
                    calibration_method: calibrationMethod,
                    pixel_spacing_mm: effectivePixelSpacing,
                },
            },
        ]);
        return true;
    }, [calibrationMethod, effectivePixelSpacing]);

    const handleMeasurementPointerDown = useCallback((event) => {
        if ((!measureMode && !calibrationMode) || !imageLoaded || !imageSize.width || !imageSize.height) return;
        if (event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();

        const nextPoint = getMeasurementPoint(event);

        if (calibrationMode) {
            if (!calibrationDraft) {
                setCalibrationDraft(nextPoint);
                setPreviewPoint(nextPoint);
                return;
            }

            setCalibrationDialog({
                start: calibrationDraft,
                end: nextPoint,
            });
            setCalibrationDraft(null);
            setCalibrationMode(false);
            return;
        }

        if (pendingPoint) {
            commitMeasurement(pendingPoint, nextPoint);
            setPendingPoint(null);
            setPreviewPoint(null);
            setMeasurementDragStart(null);
            return;
        }

        setPendingPoint(nextPoint);
        setMeasurementDragStart(nextPoint);
        setPreviewPoint(nextPoint);
    }, [
        calibrationDraft,
        calibrationMode,
        commitMeasurement,
        getMeasurementPoint,
        imageLoaded,
        imageSize.height,
        imageSize.width,
        measureMode,
        pendingPoint,
    ]);

    const handleMeasurementPointerMove = useCallback((event) => {
        if ((!measureMode && !calibrationMode) || (!measurementDragStart && !pendingPoint && !calibrationDraft)) return;
        event.preventDefault();
        event.stopPropagation();
        setPreviewPoint(getMeasurementPoint(event));
    }, [calibrationDraft, calibrationMode, getMeasurementPoint, measureMode, measurementDragStart, pendingPoint]);

    const handleMeasurementPointerUp = useCallback((event) => {
        if ((!measureMode && !calibrationMode) || !measurementDragStart) return;
        event.preventDefault();
        event.stopPropagation();

        const endPoint = getMeasurementPoint(event);
        if (commitMeasurement(measurementDragStart, endPoint)) {
            setPendingPoint(null);
        }
        setMeasurementDragStart(null);
        setPreviewPoint(null);
    }, [calibrationMode, commitMeasurement, getMeasurementPoint, measureMode, measurementDragStart]);

    const renderMeasurementLabel = useCallback((measurement) => {
        const dx = measurement.end.x - measurement.start.x;
        const dy = measurement.end.y - measurement.start.y;
        const distancePx = Math.sqrt((dx * dx) + (dy * dy));
        const distanceMm = effectivePixelSpacing ? distancePx * effectivePixelSpacing : null;
        const label = distanceMm != null ? `${distanceMm.toFixed(2)} mm` : `${distancePx.toFixed(1)} px`;
        const midX = (measurement.start.x + measurement.end.x) / 2;
        const midY = (measurement.start.y + measurement.end.y) / 2;
        const pillWidth = Math.max(60, label.length * 7 + 14);
        const invZoom = 1 / Math.max(zoom, 0.1);

        return (
            <g key={`${measurement.id}-label`}>
                <rect
                    x={midX - ((pillWidth * invZoom) / 2)}
                    y={midY - (24 * invZoom)}
                    width={pillWidth * invZoom}
                    height={18 * invZoom}
                    rx={9 * invZoom}
                    fill="rgba(15, 23, 42, 0.92)"
                    stroke="rgba(29, 158, 117, 0.55)"
                    strokeWidth={Math.max(0.5 * invZoom, 0.1)}
                />
                <text
                    x={midX}
                    y={midY - (11 * invZoom)}
                    fill="#ffffff"
                    fontSize={11 * invZoom}
                    fontWeight="600"
                    textAnchor="middle"
                    dominantBaseline="middle"
                >
                    {label}
                </text>
            </g>
        );
    }, [effectivePixelSpacing, zoom]);

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
                annotations,
            });

            setReportModalOpen(false);
        } catch (error) {
            console.error('[ImageViewer2D] Report export failed:', error);
        } finally {
            setExportingReport(false);
        }
    }, [annotations, captureCurrentViewDataUrl, clinicName, metadata]);

    const handleExportAnnotationsJson = useCallback(() => {
        exportAnnotationsJson(annotations, metadata, {
            patientName,
            studyId: study?.id,
            studyKey,
            seriesUid,
            viewerType: '2d',
        });
    }, [annotations, metadata, patientName, seriesUid, study?.id, studyKey]);

    const buildSessionAnnotations = useCallback(() => annotations.map((annotation) => normalizeAnnotationForPersistence(annotation, {
        seriesUid,
        viewerType: '2d',
        sourceWidth: imageSize.width,
        sourceHeight: imageSize.height,
    })), [annotations, imageSize.height, imageSize.width, seriesUid]);

    const buildSessionFeatureState = useCallback(() => ({
        viewer_type: '2d',
        image_size: imageSize,
        zoom,
        pan,
        pixel_spacing: pixelSpacing,
        calibration_factor: calibrationFactor,
        calibration_method: calibrationMethod,
        measurements,
    }), [calibrationFactor, calibrationMethod, imageSize, measurements, pan, pixelSpacing, zoom]);

    const refreshSnapshots = useCallback(async () => {
        if (!seriesUid) return;
        setSnapshotsLoading(true);
        const localItems = loadLocalAnnotationSessions(sessionScope);
        let serverItems = [];

        if (canUseBackendSessions) {
            try {
                serverItems = await loadAnnotationSnapshots(study.id, { seriesUid });
            } catch (error) {
                console.warn('[ImageViewer2D] Failed to load backend annotation snapshots:', error);
            }
        }

        setSnapshots(mergeAnnotationSessions(serverItems, localItems));
        setSnapshotsLoading(false);
    }, [canUseBackendSessions, seriesUid, sessionScope, study?.id]);

    const persistAnnotationSession = useCallback(async ({ note = '', source = 'manual' } = {}) => {
        if (!seriesUid) return null;
        const normalized = buildSessionAnnotations();
        const featureState = buildSessionFeatureState();
        const localSnapshot = saveLocalAnnotationSession(sessionScope, {
            note,
            annotations: normalized,
            featureState,
            source,
        });

        if (canUseBackendSessions) {
            try {
                const response = await saveAnnotationSnapshot(study.id, {
                    seriesUid,
                    note,
                    annotations: normalized,
                    featureState,
                });
                if (response?.snapshot?.id) {
                    deleteLocalAnnotationSession(sessionScope, localSnapshot.id);
                }
            } catch (error) {
                console.warn('[ImageViewer2D] Backend session snapshot failed; local snapshot kept:', error);
            }
        }

        await refreshSnapshots();
        return localSnapshot;
    }, [buildSessionAnnotations, buildSessionFeatureState, canUseBackendSessions, refreshSnapshots, seriesUid, sessionScope, study?.id]);

    const handleSaveAnnotationSession = useCallback(async ({ note = '' } = {}) => {
        try {
            setSessionSaving(true);
            setSessionError('');
            await persistAnnotationSession({ note, source: 'save' });
            setSessionModalMode(null);
            setHistoryOpen(true);
        } catch (error) {
            console.warn('[ImageViewer2D] Failed to save annotation session:', error);
            setSessionError(error.message || 'Failed to save annotation session');
        } finally {
            setSessionSaving(false);
        }
    }, [persistAnnotationSession]);

    const handleStartNewSession = useCallback(async ({ note = '', saveBeforeClear = true } = {}) => {
        try {
            setSessionSaving(true);
            setSessionError('');
            const hasWork = annotations.length > 0 || measurements.length > 0;
            if (saveBeforeClear && hasWork) {
                await persistAnnotationSession({ note, source: 'new-session' });
            }
            setAnnotations([]);
            setMeasurements([]);
            setPendingPoint(null);
            setMeasurementDragStart(null);
            setPreviewPoint(null);
            setCalibrationDraft(null);
            setCalibrationDialog(null);
            setSnapshotOverlay(null);
            setAnnotateMode(false);
            setMeasureMode(false);
            setCalibrationMode(false);
            setSessionModalMode(null);
            setHistoryOpen(true);
            await refreshSnapshots();
        } catch (error) {
            console.warn('[ImageViewer2D] Failed to start new annotation session:', error);
            setSessionError(error.message || 'Failed to start new session');
        } finally {
            setSessionSaving(false);
        }
    }, [annotations.length, measurements.length, persistAnnotationSession, refreshSnapshots]);

    const handleRestoreAnnotationSession = useCallback((snapshot) => {
        const nextAnnotations = (snapshot?.annotations || []).map((annotation) => normalizeAnnotationForPersistence(annotation, {
            seriesUid,
            viewerType: '2d',
            sourceWidth: imageSize.width,
            sourceHeight: imageSize.height,
        }));
        const featureState = snapshot?.feature_state || snapshot?.featureState || {};
        setAnnotations(nextAnnotations);
        setSnapshotOverlay(null);
        if (Array.isArray(featureState.measurements)) setMeasurements(featureState.measurements);
        if (Number.isFinite(Number(featureState.zoom))) setZoom(Number(featureState.zoom));
        if (featureState.pan && Number.isFinite(Number(featureState.pan.x)) && Number.isFinite(Number(featureState.pan.y))) {
            setPan({ x: Number(featureState.pan.x), y: Number(featureState.pan.y) });
        }
        if (Number.isFinite(Number(featureState.calibration_factor))) {
            setCalibrationFactor(Number(featureState.calibration_factor));
        }
        setHistoryOpen(false);
    }, [imageSize.height, imageSize.width, seriesUid]);

    const handleDeleteAnnotationSession = useCallback(async (snapshot) => {
        if (!snapshot?.id) return;
        try {
            if (snapshot.local) {
                deleteLocalAnnotationSession(sessionScope, snapshot.id);
            } else if (canUseBackendSessions) {
                await deleteAnnotationSnapshot(study.id, snapshot.id);
            }
            if (snapshotOverlay?.id === snapshot.id) {
                setSnapshotOverlay(null);
            }
            await refreshSnapshots();
        } catch (error) {
            console.warn('[ImageViewer2D] Failed to delete annotation session:', error);
        }
    }, [canUseBackendSessions, refreshSnapshots, sessionScope, snapshotOverlay?.id, study?.id]);

    const handleReviewAnnotation = useCallback(async (annotationId, reviewStatus, reviewerComment = '') => {
        if (!study?.id || !annotationId) return;
        const reviewedAt = new Date().toISOString();
        const localPatch = {
            review_status: reviewStatus,
            reviewed_at: reviewStatus === 'approved' || reviewStatus === 'rejected' ? reviewedAt : null,
            reviewer_comment: reviewerComment || null,
            confidence_score: reviewStatus === 'approved' ? 1 : reviewStatus === 'rejected' ? 0 : 0.7,
        };

        setAnnotations((current) => current.map((annotation) => (
            annotation.id === annotationId ? { ...annotation, ...localPatch } : annotation
        )));

        try {
            await reviewStudyAnnotations(study.id, {
                annotationIds: [annotationId],
                reviewStatus,
                reviewerComment,
            });
        } catch (error) {
            console.warn('[ImageViewer2D] Failed to update annotation review:', error);
        }
    }, [study?.id]);

    const handleSubmitAnnotationsForReview = useCallback(async () => {
        if (!study?.id || !annotations.length) return;
        const reviewIssues = getAnnotationReviewIssues(annotations);
        if (reviewIssues.length > 0) {
            setReviewError(`Cannot submit yet. Fix ${reviewIssues.length} annotation(s): ${reviewIssues[0].errors.join(', ')}`);
            return;
        }
        setReviewError('');
        const ids = annotations.map((annotation) => annotation.id).filter(Boolean);
        setAnnotations((current) => current.map((annotation) => ({
            ...annotation,
            review_status: 'submitted',
            confidence_score: annotation.confidence_score ?? 0.7,
        })));
        try {
            await reviewStudyAnnotations(study.id, {
                annotationIds: ids,
                seriesUid,
                viewerType: '2d',
                reviewStatus: 'submitted',
            });
        } catch (error) {
            console.warn('[ImageViewer2D] Failed to submit annotations:', error);
        }
    }, [annotations, seriesUid, study?.id]);

    useEffect(() => {
        if (historyOpen) {
            refreshSnapshots();
        }
    }, [historyOpen, refreshSnapshots]);

    return (
        <div ref={wrapperRef} tabIndex={0} className="relative flex h-full flex-col overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 text-slate-100 shadow-2xl outline-none">
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/95 px-4 py-3 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    {showBack && (
                        <button onClick={onBack} className="rounded-lg bg-slate-800 p-2 text-white transition hover:bg-slate-700">
                            <AppIcon name="ArrowLeft" size={18} />
                        </button>
                    )}
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
                                    setCalibrationMode(false);
                                }
                                return next;
                            });
                            setPendingPoint(null);
                            setCalibrationDraft(null);
                            setMeasurementDragStart(null);
                            setPreviewPoint(null);
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

                    {calibrationNeedsReview && (
                        <button
                            onClick={() => {
                                setCalibrationMode((current) => !current);
                                setMeasureMode(false);
                                setAnnotateMode(false);
                                setPendingPoint(null);
                                setCalibrationDraft(null);
                                setMeasurementDragStart(null);
                                setPreviewPoint(null);
                            }}
                            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition ${
                                calibrationMode
                                    ? 'border border-emerald-500/40 bg-emerald-500/20 text-emerald-300'
                                    : 'bg-amber-500/15 text-amber-300 hover:bg-amber-500/25'
                            }`}
                            title="Manual calibration"
                        >
                            <AppIcon name="Gauge" size={16} />
                            <span>Calibrate</span>
                        </button>
                    )}

                    <button
                        onClick={() => {
                            setAnnotateMode((current) => {
                                const next = !current;
                                if (next) {
                                    setMeasureMode(false);
                                    setCalibrationMode(false);
                                    setPendingPoint(null);
                                    setCalibrationDraft(null);
                                    setMeasurementDragStart(null);
                                    setPreviewPoint(null);
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
                                onClick={() => setAnnotationTool('select')}
                                className={`rounded-lg p-2 transition ${annotationTool === 'select' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-slate-800 text-gray-400 hover:text-white'}`}
                                title="Select/Edit Annotation"
                            >
                                <AppIcon name="MousePointer2" size={18} />
                            </button>
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
                                onClick={() => setAnnotationTool('freehand')}
                                className={`rounded-lg p-2 transition ${annotationTool === 'freehand' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'bg-slate-800 text-gray-400 hover:text-white'}`}
                                title="Freehand Region"
                            >
                                <AppIcon name="PenLine" size={18} />
                            </button>
                            <button
                                onClick={() => setAnnotationTool('text')}
                                className={`rounded-lg p-2 transition ${annotationTool === 'text' ? 'bg-slate-700 text-white border border-slate-500/40' : 'bg-slate-800 text-gray-400 hover:text-white'}`}
                                title="Text"
                            >
                                <AppIcon name="Type" size={18} />
                            </button>
                            <button onClick={handleUndoAnnotation} className="rounded-lg bg-slate-800 p-2 text-gray-400 transition hover:bg-slate-700 hover:text-white" title="Undo Annotation">
                                <AppIcon name="Undo2" size={18} />
                            </button>
                            <button onClick={() => setAnnotations([])} className="rounded-lg bg-slate-800 p-2 text-gray-400 transition hover:bg-slate-700 hover:text-white" title="Clear Annotations">
                                <AppIcon name="Trash2" size={18} />
                            </button>
                            {annotationPersistence.saving && (
                                <span className="px-1 text-[10px] font-mono uppercase tracking-wider text-cyan-300">Saving</span>
                            )}
                            {annotationPersistence.error && (
                                <span className="px-1 text-[10px] font-mono uppercase tracking-wider text-amber-300" title={annotationPersistence.error.message || 'Backend save failed; local cache is active'}>
                                    Local
                                </span>
                            )}
                        </>
                    )}

                    <button onClick={captureScreenshot} className="rounded-lg bg-slate-800 p-2 text-gray-400 transition hover:bg-slate-700 hover:text-white" title="Save Screenshot">
                        <AppIcon name="Camera" size={18} />
                    </button>

                    <Dropdown label="Export" icon="Download">
                        <DropdownItem
                            label="Export Report"
                            icon="FileText"
                            onClick={() => setReportModalOpen(true)}
                        />
                        <DropdownItem
                            label="Export JSON"
                            icon="Braces"
                            onClick={handleExportAnnotationsJson}
                        />
                    </Dropdown>

                    {(annotations.length > 0 || measurements.length > 0) && !study?.readOnly && (
                        <Dropdown label="Session" icon="Package">
                            <DropdownItem
                                label="Save Session"
                                icon="Save"
                                onClick={() => { setSessionError(''); setSessionModalMode('save'); }}
                            />
                            <DropdownItem
                                label="Submit for Review"
                                icon="Send"
                                onClick={handleSubmitAnnotationsForReview}
                            />
                        </Dropdown>
                    )}

                    {!study?.readOnly && (
                        <Dropdown label="New" icon="Plus">
                            <DropdownItem
                                label="New Session"
                                icon="PlusCircle"
                                onClick={() => { setSessionError(''); setSessionModalMode('new'); }}
                            />
                            <DropdownItem
                                label="History"
                                icon="History"
                                onClick={() => setHistoryOpen(true)}
                            />
                        </Dropdown>
                    )}

                    <button onClick={toggleFullscreen} className="rounded-lg bg-slate-800 p-2 text-gray-400 transition hover:bg-slate-700 hover:text-white" title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}>
                        <AppIcon name={isFullscreen ? 'Minimize2' : 'Maximize2'} size={18} />
                    </button>

                    <ShortcutHelpButton shortcuts={IMAGE_SHORTCUTS} />

                    {allowSeriesSwitch && (
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

            {reviewError && (
                <div className="absolute left-1/2 top-20 z-[120] max-w-lg -translate-x-1/2 rounded-2xl border border-amber-500/30 bg-amber-500/15 px-4 py-3 text-sm text-amber-100 shadow-2xl backdrop-blur">
                    <div className="flex items-start gap-3">
                        <AppIcon name="AlertTriangle" size={16} className="mt-0.5 shrink-0 text-amber-300" />
                        <div className="flex-1">{reviewError}</div>
                        <button type="button" onClick={() => setReviewError('')} className="rounded-lg p-1 text-amber-200/70 hover:bg-amber-500/15 hover:text-white">
                            <AppIcon name="X" size={14} />
                        </button>
                    </div>
                </div>
            )}

            <div
                ref={containerRef}
                className="relative flex-1 select-none overflow-hidden bg-black"
                style={{ cursor: windowLevelDrag || annotateMode || measureMode || calibrationMode ? 'crosshair' : (isDragging ? 'grabbing' : 'grab'), minHeight: '400px' }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onContextMenu={(event) => event.preventDefault()}
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
                            filter: imageFilter,
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
                                style={{ pointerEvents: measureMode || calibrationMode ? 'auto' : 'none' }}
                                onMouseDown={handleMeasurementPointerDown}
                                onMouseMove={handleMeasurementPointerMove}
                                onMouseUp={handleMeasurementPointerUp}
                            >
                                {measurements.map((measurement) => (
                                    <g key={measurement.id}>
                                        <line
                                            x1={measurement.start.x}
                                            y1={measurement.start.y}
                                            x2={measurement.end.x}
                                            y2={measurement.end.y}
                                            stroke={MEASUREMENT_COLOR}
                                            strokeWidth={Math.max(1.35 / Math.max(zoom, 0.1), 0.2)}
                                            strokeLinecap="round"
                                        />
                                        <circle cx={measurement.start.x} cy={measurement.start.y} r={Math.max(3 / Math.max(zoom, 0.1), 0.4)} fill={MEASUREMENT_COLOR} />
                                        <circle cx={measurement.end.x} cy={measurement.end.y} r={Math.max(3 / Math.max(zoom, 0.1), 0.4)} fill={MEASUREMENT_COLOR} />
                                        {renderMeasurementLabel(measurement)}
                                    </g>
                                ))}

                                {pendingPoint && previewPoint && (
                                    <line
                                        x1={pendingPoint.x}
                                        y1={pendingPoint.y}
                                        x2={previewPoint.x}
                                        y2={previewPoint.y}
                                        stroke={MEASUREMENT_COLOR}
                                        strokeWidth={Math.max(1.2 / Math.max(zoom, 0.1), 0.2)}
                                        strokeLinecap="round"
                                        strokeDasharray={`${4 / Math.max(zoom, 0.1)} ${4 / Math.max(zoom, 0.1)}`}
                                        opacity="0.75"
                                    />
                                )}

                                {pendingPoint && (
                                    <circle
                                        cx={pendingPoint.x}
                                        cy={pendingPoint.y}
                                        r={Math.max(3.2 / Math.max(zoom, 0.1), 0.4)}
                                        fill={MEASUREMENT_COLOR}
                                        stroke="#ffffff"
                                        strokeWidth={Math.max(1 / Math.max(zoom, 0.1), 0.15)}
                                    />
                                )}
                                {calibrationDraft && (
                                    <circle
                                        cx={calibrationDraft.x}
                                        cy={calibrationDraft.y}
                                        r={Math.max(3.2 / Math.max(zoom, 0.1), 0.4)}
                                        fill="#22c55e"
                                        stroke="#ffffff"
                                        strokeWidth={Math.max(1 / Math.max(zoom, 0.1), 0.15)}
                                    />
                                )}
                                {scaleBar && (
                                    <g className="pointer-events-none">
                                        <line
                                            x1={scaleBar.x}
                                            y1={scaleBar.y}
                                            x2={scaleBar.x + scaleBar.lengthPx}
                                            y2={scaleBar.y}
                                            stroke="rgba(0,0,0,0.9)"
                                            strokeWidth="5"
                                            strokeLinecap="square"
                                        />
                                        <line
                                            x1={scaleBar.x}
                                            y1={scaleBar.y}
                                            x2={scaleBar.x + scaleBar.lengthPx}
                                            y2={scaleBar.y}
                                            stroke="#ffffff"
                                            strokeWidth="3"
                                            strokeLinecap="square"
                                        />
                                        <rect
                                            x={scaleBar.x - 4}
                                            y={scaleBar.y - 26}
                                            width={Math.max(54, scaleBar.label.length * 8)}
                                            height="18"
                                            fill="rgba(0,0,0,0.78)"
                                        />
                                        <text
                                            x={scaleBar.x + 3}
                                            y={scaleBar.y - 17}
                                            fill="#ffffff"
                                            fontSize="12"
                                            fontWeight="700"
                                            fontFamily="monospace"
                                            dominantBaseline="middle"
                                        >
                                            {scaleBar.label}
                                        </text>
                                    </g>
                                )}
                            </svg>
                        </>
                    )}
                </div>

                {imageLoaded && imageBounds && viewportSize.width > 0 && viewportSize.height > 0 && (
                    <>
                        {snapshotOverlay?.annotations?.length > 0 && (
                            <AnnotationCanvas
                                width={viewportSize.width}
                                height={viewportSize.height}
                                sourceWidth={imageSize.width}
                                sourceHeight={imageSize.height}
                                zoom={zoom}
                                pan={pan}
                                viewportSize={viewportSize}
                                imageBounds={imageBounds}
                                active={false}
                                tool="select"
                                annotations={snapshotOverlay.annotations.map((annotation) => ({
                                    ...annotation,
                                    color: '#22c55e',
                                    displayOpacity: 0.5,
                                }))}
                                onChange={() => {}}
                                className="absolute inset-0 z-[65]"
                            />
                        )}
                        <AnnotationCanvas
                            width={viewportSize.width}
                            height={viewportSize.height}
                            sourceWidth={imageSize.width}
                            sourceHeight={imageSize.height}
                            zoom={zoom}
                            pan={pan}
                            viewportSize={viewportSize}
                            imageBounds={imageBounds}
                            active={annotateMode}
                            tool={annotationTool}
                            annotations={annotations}
                            onChange={setAnnotations}
                            activeToothContext={activeToothContext}
                            reviewMode={reviewMode}
                            onReviewAnnotation={handleReviewAnnotation}
                            className="absolute inset-0 z-[70]"
                        />
                    </>
                )}

                {imageLoaded && (
                    <div className="absolute right-3 top-3 z-20">
                        <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/15 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-indigo-400 backdrop-blur-sm">
                            {modality} — {seriesTitle}
                            {inverted ? ' (Inv)' : ''}
                        </div>
                    </div>
                )}

                {imageLoaded && (
                    <div className="absolute left-1/2 top-4 z-30 -translate-x-1/2">
                        {windowLevelDrag && (
                            <div className="rounded-full border border-amber-400/40 bg-slate-950/90 px-4 py-2 font-mono text-xs font-semibold text-white shadow-2xl backdrop-blur">
                                W: {windowWidth.toFixed(3)}&nbsp;&nbsp;L: {windowCenter.toFixed(3)}
                            </div>
                        )}
                    </div>
                )}

                {imageLoaded && (
                    <div className="absolute bottom-3 left-1/2 z-20 -translate-x-1/2 rounded-full border border-white/10 bg-black/60 px-5 py-2 text-[11px] text-white shadow-2xl backdrop-blur-md">
                        <span className="flex items-center gap-3">
                            <span className="text-gray-400">
                                {windowLevelDrag ? 'Right-drag: Window/Level' : calibrationMode ? 'Click two points: Calibrate' : annotateMode ? 'Drag/Click: Annotate' : measureMode ? 'Click: Measure' : 'Drag: Pan'}
                            </span>
                            <span className="text-white/20">{'\u2022'}</span>
                            <span className="text-gray-400">Scroll: Zoom</span>
                            <span className="text-white/20">{'\u2022'}</span>
                            <span className="text-cyan-400/80">Zoom: {Math.round(zoom * 100)}%</span>
                            <span className="text-white/20">{'\u2022'}</span>
                            <span className="text-amber-300/90">W/L: {windowWidth.toFixed(3)} / {windowCenter.toFixed(3)}</span>
                            <span className="text-white/20">{'\u2022'}</span>
                            <span className={calibrationMethod === 'estimated' ? 'text-amber-300/90' : 'text-emerald-300/90'}>
                                {calibrationMethod === 'manual'
                                    ? `Calibrated: ${effectivePixelSpacing.toFixed(3)} mm/px`
                                    : calibrationMethod === 'dicom_header'
                                        ? `Spacing: ${effectivePixelSpacing.toFixed(3)} mm/px`
                                        : 'Estimated: 1.000 mm/px'}
                            </span>
                        </span>
                    </div>
                )}

                {calibrationDialog && (
                    <div className="absolute inset-0 z-[90] flex items-center justify-center bg-black/40 backdrop-blur-sm">
                        <div className="w-80 rounded-2xl border border-emerald-500/25 bg-slate-950 p-4 text-white shadow-2xl">
                            <div className="mb-2 flex items-center gap-2">
                                <AppIcon name="Gauge" size={16} className="text-emerald-300" />
                                <h3 className="text-sm font-semibold">Manual Calibration</h3>
                            </div>
                            <p className="mb-3 text-xs text-slate-400">
                                This line represents how many millimeters?
                            </p>
                            <input
                                type="number"
                                min="0.1"
                                step="0.1"
                                value={calibrationLengthInput}
                                onChange={(event) => setCalibrationLengthInput(event.target.value)}
                                className="mb-3 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-sm text-white outline-none focus:border-emerald-400"
                            />
                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setCalibrationDialog(null)}
                                    className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const knownMm = Number.parseFloat(calibrationLengthInput);
                                        const dx = calibrationDialog.end.x - calibrationDialog.start.x;
                                        const dy = calibrationDialog.end.y - calibrationDialog.start.y;
                                        const distancePx = Math.sqrt((dx * dx) + (dy * dy));
                                        if (Number.isFinite(knownMm) && knownMm > 0 && distancePx > 0) {
                                            setCalibrationFactor(knownMm / distancePx);
                                        }
                                        setCalibrationDialog(null);
                                    }}
                                    className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
                                >
                                    Apply
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <AnnotationHistoryPanel
                    visible={historyOpen}
                    snapshots={snapshots}
                    loading={snapshotsLoading}
                    selectedSnapshotId={snapshotOverlay?.id || ''}
                    onClose={() => setHistoryOpen(false)}
                    onRefresh={refreshSnapshots}
                    onSelectSnapshot={(snapshot) => setSnapshotOverlay(snapshot)}
                    onRestoreSnapshot={handleRestoreAnnotationSession}
                    onDeleteSnapshot={handleDeleteAnnotationSession}
                    onNewSession={() => {
                        setSessionError('');
                        setSessionModalMode('new');
                    }}
                    onClearOverlay={() => setSnapshotOverlay(null)}
                />

                <AnnotationSessionModal
                    visible={Boolean(sessionModalMode)}
                    mode={sessionModalMode || 'save'}
                    annotationCount={annotations.length}
                    measurementCount={measurements.length}
                    loading={sessionSaving}
                    error={sessionError}
                    onClose={() => {
                        if (!sessionSaving) {
                            setSessionModalMode(null);
                            setSessionError('');
                        }
                    }}
                    onConfirm={sessionModalMode === 'new' ? handleStartNewSession : handleSaveAnnotationSession}
                />

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
