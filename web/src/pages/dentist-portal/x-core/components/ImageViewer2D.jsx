import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
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
import {
    build2DMeasurementRecord,
    isPersistedMeasurementRecord,
    measurement2DFromRecord,
} from '../utils/clinicalPersistenceRecords.mjs';
import { getAnnotationReviewIssues } from '../utils/annotationQuality';
import { buildImagingUrl, buildStudyAssetParams } from '../utils/imagingUrl';
import ShortcutHelpButton from './ShortcutHelpButton';
import SeriesSidebar from './SeriesSidebar';

const MEASUREMENT_COLOR = '#1D9E75';
const WL_DRAG_SENSITIVITY = 0.005;
const SCALE_BAR_OPTIONS_MM = [5, 10, 20, 50, 100];
const MEASUREMENT_HIT_RADIUS_SCREEN_PX = 14;
const MEASUREMENT_DRAG_THRESHOLD_SCREEN_PX = 5;
const IMAGE_SHORTCUTS = [
    { key: '+ / =', label: 'Zoom in' },
    { key: '-', label: 'Zoom out' },
    { key: '0', label: 'Fit to screen' },
    { key: 'Ctrl/Cmd + Z', label: 'Undo annotation/measurement' },
    { key: 'Ctrl/Cmd + Shift + Z / Y', label: 'Redo annotation/measurement' },
    { key: 'Right-drag', label: 'Window/Level adjust' },
    { key: 'I', label: 'Invert image' },
    { key: 'F', label: 'Fullscreen' },
];

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const distanceBetweenPoints = (a, b) => Math.hypot((b?.x || 0) - (a?.x || 0), (b?.y || 0) - (a?.y || 0));

const distancePointToSegment = (point, start, end) => {
    const dx = (end?.x || 0) - (start?.x || 0);
    const dy = (end?.y || 0) - (start?.y || 0);
    const lenSq = (dx * dx) + (dy * dy);
    if (!lenSq) return distanceBetweenPoints(point, start);
    const t = clamp((((point?.x || 0) - (start?.x || 0)) * dx + (((point?.y || 0) - (start?.y || 0)) * dy)) / lenSq, 0, 1);
    return distanceBetweenPoints(point, {
        x: (start?.x || 0) + (dx * t),
        y: (start?.y || 0) + (dy * t),
    });
};

const buildDentistName = (user) => [user?.profile?.title, user?.name].filter(Boolean).join(' ').trim();

const drawMeasurementOverlay = (ctx, measurements, pixelSpacing) => {
    ctx.save();
    measurements.forEach((measurement) => {
        ctx.strokeStyle = MEASUREMENT_COLOR;
        ctx.fillStyle = MEASUREMENT_COLOR;
        ctx.lineWidth = 1.25;
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.moveTo(measurement.start.x, measurement.start.y);
        ctx.lineTo(measurement.end.x, measurement.end.y);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(measurement.start.x, measurement.start.y, 2.5, 0, Math.PI * 2);
        ctx.arc(measurement.end.x, measurement.end.y, 2.5, 0, Math.PI * 2);
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
        ctx.font = '600 11px sans-serif';
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

const resolveStateUpdate = (updater, current) => (
    typeof updater === 'function' ? updater(current) : updater
);

const listHasSameItems = (a = [], b = []) => (
    Array.isArray(a)
    && Array.isArray(b)
    && a.length === b.length
    && a.every((item, index) => item === b[index])
);

const ImageViewer2D = ({
    study,
    seriesInfo,
    onBack,
    onSwitchSeries,
    activeToothContext = null,
    isFullscreen: passedIsFullscreen,
    toggleFullscreen: passedToggleFullscreen,
    comparisonPaneId = null,
}) => {
    const { user } = useAuth();
    const containerRef = useRef(null);
    const wrapperRef = useRef(null);
    const imgRef = useRef(null);

    const [showSeriesPanel, setShowSeriesPanel] = useState(false);

    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [windowCenter, setWindowCenter] = useState(0.5);
    const [windowWidth, setWindowWidth] = useState(1.0);
    const [windowLevelDrag, setWindowLevelDrag] = useState(null);
    const [inverted, setInverted] = useState(false);
    const [localIsFullscreen, setLocalIsFullscreen] = useState(false);
    const isFullscreen = passedIsFullscreen !== undefined ? passedIsFullscreen : localIsFullscreen;
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const [measureMode, setMeasureMode] = useState(false);
    const [annotateMode, setAnnotateMode] = useState(false);
    const [annotationTool, setAnnotationTool] = useState('arrow');
    const [annotations, setAnnotations] = useState([]);
    const [annotationsHistory, setAnnotationsHistory] = useState([]);
    const [annotationsRedo, setAnnotationsRedo] = useState([]);
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
    const [measurementsHistory, setMeasurementsHistory] = useState([]);
    const [measurementsRedo, setMeasurementsRedo] = useState([]);
    const [pendingPoint, setPendingPoint] = useState(null);
    const [selectedMeasurementId, setSelectedMeasurementId] = useState(null);
    const [measurementDragState, setMeasurementDragState] = useState(null);
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
    const annotationsRef = useRef([]);
    const annotationsHistoryRef = useRef([]);
    const annotationsRedoRef = useRef([]);
    const measurementsRef = useRef([]);
    const measurementsHistoryRef = useRef([]);
    const measurementsRedoRef = useRef([]);
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

    useEffect(() => {
        annotationsRef.current = annotations;
    }, [annotations]);

    useEffect(() => {
        measurementsRef.current = measurements;
    }, [measurements]);

    const replaceAnnotationsState = useCallback((updater) => {
        const next = resolveStateUpdate(updater, annotationsRef.current);
        annotationsRef.current = Array.isArray(next) ? next : [];
        annotationsHistoryRef.current = [];
        annotationsRedoRef.current = [];
        setAnnotations(annotationsRef.current);
        setAnnotationsHistory([]);
        setAnnotationsRedo([]);
    }, []);

    const replaceMeasurementsState = useCallback((updater) => {
        const next = resolveStateUpdate(updater, measurementsRef.current);
        measurementsRef.current = Array.isArray(next) ? next : [];
        measurementsHistoryRef.current = [];
        measurementsRedoRef.current = [];
        setMeasurements(measurementsRef.current);
        setMeasurementsHistory([]);
        setMeasurementsRedo([]);
    }, []);

    const measurementClinicalRecords = useMemo(() => (
        measurements
            .map((measurement) => build2DMeasurementRecord(measurement, {
                seriesUid,
                viewerType: '2d',
                sourceWidth: imageSize.width,
                sourceHeight: imageSize.height,
                pixelSpacing: effectivePixelSpacing,
                calibrationMethod,
            }))
            .filter(Boolean)
    ), [calibrationMethod, effectivePixelSpacing, imageSize.height, imageSize.width, measurements, seriesUid]);

    const handleHydrateClinicalRecords = useCallback((records) => {
        const nextMeasurements = (records || [])
            .filter(isPersistedMeasurementRecord)
            .map((record) => measurement2DFromRecord(record, {
                sourceWidth: imageSize.width || record?.metadata?.source_width,
                sourceHeight: imageSize.height || record?.metadata?.source_height,
            }))
            .filter(Boolean);
        replaceMeasurementsState(nextMeasurements);
    }, [imageSize.height, imageSize.width, replaceMeasurementsState]);

    const annotationPersistence = usePersistentAnnotations({
        study,
        seriesUid,
        viewerType: '2d',
        annotations,
        setAnnotations,
        clinicalRecords: measurementClinicalRecords,
        onHydrateClinicalRecords: handleHydrateClinicalRecords,
        enabled: imageLoaded && imageSize.width > 0 && imageSize.height > 0,
        scope: annotationPersistenceScope,
    });

    const pushAnnotationsState = useCallback((updater) => {
        const current = annotationsRef.current;
        const next = resolveStateUpdate(updater, current);
        if (!Array.isArray(next) || next === current || listHasSameItems(current, next)) return;

        const nextHistory = [...annotationsHistoryRef.current, current];
        annotationsRef.current = next;
        annotationsHistoryRef.current = nextHistory;
        annotationsRedoRef.current = [];
        setAnnotations(next);
        setAnnotationsHistory(nextHistory);
        setAnnotationsRedo([]);
    }, []);

    const pushMeasurementsState = useCallback((updater) => {
        const current = measurementsRef.current;
        const next = resolveStateUpdate(updater, current);
        if (!Array.isArray(next) || next === current || listHasSameItems(current, next)) return;

        const nextHistory = [...measurementsHistoryRef.current, current];
        measurementsRef.current = next;
        measurementsHistoryRef.current = nextHistory;
        measurementsRedoRef.current = [];
        setMeasurements(next);
        setMeasurementsHistory(nextHistory);
        setMeasurementsRedo([]);
    }, []);

    const pushMeasurementsHistorySnapshot = useCallback((previous) => {
        const current = measurementsRef.current;
        if (!Array.isArray(previous) || previous === current || listHasSameItems(previous, current)) return;

        const nextHistory = [...measurementsHistoryRef.current, previous];
        measurementsHistoryRef.current = nextHistory;
        measurementsRedoRef.current = [];
        setMeasurementsHistory(nextHistory);
        setMeasurementsRedo([]);
    }, []);

    const undoAnnotationsState = useCallback(() => {
        const history = annotationsHistoryRef.current;
        if (!history.length) return;

        const current = annotationsRef.current;
        const previous = history[history.length - 1];
        const nextHistory = history.slice(0, -1);
        const nextRedo = [current, ...annotationsRedoRef.current];

        annotationsRef.current = previous;
        annotationsHistoryRef.current = nextHistory;
        annotationsRedoRef.current = nextRedo;
        setAnnotations(previous);
        setAnnotationsHistory(nextHistory);
        setAnnotationsRedo(nextRedo);
    }, []);

    const redoAnnotationsState = useCallback(() => {
        const redo = annotationsRedoRef.current;
        if (!redo.length) return;

        const current = annotationsRef.current;
        const next = redo[0];
        const nextRedo = redo.slice(1);
        const nextHistory = [...annotationsHistoryRef.current, current];

        annotationsRef.current = next;
        annotationsHistoryRef.current = nextHistory;
        annotationsRedoRef.current = nextRedo;
        setAnnotations(next);
        setAnnotationsHistory(nextHistory);
        setAnnotationsRedo(nextRedo);
    }, []);

    const undoMeasurementsState = useCallback(() => {
        const history = measurementsHistoryRef.current;
        if (!history.length) return;

        const current = measurementsRef.current;
        const previous = history[history.length - 1];
        const nextHistory = history.slice(0, -1);
        const nextRedo = [current, ...measurementsRedoRef.current];

        measurementsRef.current = previous;
        measurementsHistoryRef.current = nextHistory;
        measurementsRedoRef.current = nextRedo;
        setMeasurements(previous);
        setMeasurementsHistory(nextHistory);
        setMeasurementsRedo(nextRedo);
    }, []);

    const redoMeasurementsState = useCallback(() => {
        const redo = measurementsRedoRef.current;
        if (!redo.length) return;

        const current = measurementsRef.current;
        const next = redo[0];
        const nextRedo = redo.slice(1);
        const nextHistory = [...measurementsHistoryRef.current, current];

        measurementsRef.current = next;
        measurementsHistoryRef.current = nextHistory;
        measurementsRedoRef.current = nextRedo;
        setMeasurements(next);
        setMeasurementsHistory(nextHistory);
        setMeasurementsRedo(nextRedo);
    }, []);

    const handleUndoMeasurement = useCallback(() => {
        if (pendingPoint) {
            setPendingPoint(null);
            setPreviewPoint(null);
            setMeasurementDragState(null);
            return;
        }

        setSelectedMeasurementId(null);
        undoMeasurementsState();
    }, [pendingPoint, undoMeasurementsState]);

    const handleRedoMeasurement = useCallback(() => {
        setSelectedMeasurementId(null);
        redoMeasurementsState();
    }, [redoMeasurementsState]);

    const handleUndoAnnotation = useCallback(() => {
        undoAnnotationsState();
    }, [undoAnnotationsState]);

    const handleRedoAnnotation = useCallback(() => {
        redoAnnotationsState();
    }, [redoAnnotationsState]);

    const handleClearMeasurements = useCallback(() => {
        pushMeasurementsState([]);
        setPendingPoint(null);
        setSelectedMeasurementId(null);
        setMeasurementDragState(null);
        setPreviewPoint(null);
    }, [pushMeasurementsState]);

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
        if (!viewport || !image) {
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
    }, []);

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
        replaceMeasurementsState([]);
        setPendingPoint(null);
        setSelectedMeasurementId(null);
        setMeasurementDragState(null);
        setPreviewPoint(null);
        setMeasureMode(false);
        setAnnotateMode(false);
        setAnnotationTool('arrow');
        replaceAnnotationsState([]);
        setImageBounds(null);
        setWindowCenter(0.5);
        setWindowWidth(1.0);
        setWindowLevelDrag(null);
        setReportModalOpen(false);
        setHistoryOpen(false);
        setSnapshots([]);
        setSnapshotOverlay(null);
    }, [replaceAnnotationsState, replaceMeasurementsState, studyKey, seriesUid]);

    useEffect(() => {
        if (measureMode) return;
        setPendingPoint(null);
        setPreviewPoint(null);
        setSelectedMeasurementId(null);
        setMeasurementDragState(null);
    }, [measureMode]);

    useEffect(() => {
        if (!selectedMeasurementId) return;
        if (!measurements.some((measurement) => measurement.id === selectedMeasurementId)) {
            setSelectedMeasurementId(null);
        }
    }, [measurements, selectedMeasurementId]);

    useEffect(() => {
        if (!measureMode || !selectedMeasurementId) return undefined;

        const handleKeyDown = (event) => {
            if (event.key !== 'Delete' && event.key !== 'Backspace') return;
            const activeTag = document.activeElement?.tagName?.toLowerCase();
            if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') return;
            event.preventDefault();
            pushMeasurementsState((current) => current.filter((measurement) => measurement.id !== selectedMeasurementId));
            setSelectedMeasurementId(null);
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [measureMode, pushMeasurementsState, selectedMeasurementId]);

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

    useLayoutEffect(() => {
        if (!imageLoaded) {
            setImageBounds(null);
            return;
        }

        syncImageBounds();
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
        
        // If there is significant horizontal scroll, pan horizontally
        if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
            setPan((current) => ({
                ...current,
                x: current.x - event.deltaX,
            }));
        } else {
            // Otherwise zoom (standard vertical scroll zooms)
            const delta = event.deltaY > 0 ? -0.1 : 0.1;
            const nextZoom = Math.max(0.1, Math.min(10, zoom + delta));
            if (nextZoom === zoom) return;

            const rect = containerRef.current?.getBoundingClientRect();
            if (rect) {
                const mouseX = event.clientX - rect.left;
                const mouseY = event.clientY - rect.top;
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                const relX = mouseX - centerX;
                const relY = mouseY - centerY;
                const ratio = nextZoom / zoom;

                setPan((current) => ({
                    x: relX - (relX - current.x) * ratio,
                    y: relY - (relY - current.y) * ratio,
                }));
            }
            setZoom(nextZoom);
        }
    }, [zoom]);

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
        const handleFullscreenChange = () => setLocalIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const toggleFullscreen = useCallback(() => {
        if (passedToggleFullscreen) {
            passedToggleFullscreen();
            return;
        }

        if (!wrapperRef.current) return;
        if (!document.fullscreenElement) {
            wrapperRef.current.requestFullscreen().catch(console.error);
            return;
        }
        document.exitFullscreen();
    }, [passedToggleFullscreen]);

    useEffect(() => {
        const handleKeyDown = (event) => {
            const activeTag = document.activeElement?.tagName?.toLowerCase();
            const isTextInput = activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select';
            const viewerFocused = wrapperRef.current?.contains(document.activeElement);
            if (isTextInput) return;
            if (document.activeElement !== document.body && !viewerFocused) return;

            const key = event.key.toLowerCase();
            const isUndoShortcut = (event.ctrlKey || event.metaKey) && key === 'z' && !event.shiftKey;
            const isRedoShortcut = (event.ctrlKey || event.metaKey) && ((key === 'z' && event.shiftKey) || key === 'y');
            if (isUndoShortcut || isRedoShortcut) {
                if (!annotateMode && !measureMode) return;
                event.preventDefault();
                if (annotateMode) {
                    if (isRedoShortcut) {
                        handleRedoAnnotation();
                    } else {
                        handleUndoAnnotation();
                    }
                } else {
                    if (isRedoShortcut) {
                        handleRedoMeasurement();
                    } else {
                        handleUndoMeasurement();
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
            } else if (key === 'arrowleft') {
                event.preventDefault();
                setPan((current) => ({ ...current, x: current.x + 30 }));
            } else if (key === 'arrowright') {
                event.preventDefault();
                setPan((current) => ({ ...current, x: current.x - 30 }));
            } else if (key === 'arrowup') {
                event.preventDefault();
                setPan((current) => ({ ...current, y: current.y + 30 }));
            } else if (key === 'arrowdown') {
                event.preventDefault();
                setPan((current) => ({ ...current, y: current.y - 30 }));
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [
        annotateMode,
        fitToScreen,
        handleRedoAnnotation,
        handleRedoMeasurement,
        handleUndoAnnotation,
        handleUndoMeasurement,
        measureMode,
        toggleFullscreen,
        zoomIn,
        zoomOut,
    ]);

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

    const getMeasurementPoint = useCallback((event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        return {
            x: ((event.clientX - rect.left) / rect.width) * imageSize.width,
            y: ((event.clientY - rect.top) / rect.height) * imageSize.height,
        };
    }, [imageSize.height, imageSize.width]);

    const measurementHitRadius = useMemo(
        () => MEASUREMENT_HIT_RADIUS_SCREEN_PX / Math.max(zoom, 0.1),
        [zoom]
    );
    const measurementDragThreshold = useMemo(
        () => MEASUREMENT_DRAG_THRESHOLD_SCREEN_PX / Math.max(zoom, 0.1),
        [zoom]
    );

    const updateMeasurementById = useCallback((measurementId, updater) => {
        const nextMeasurements = measurementsRef.current.map((measurement) => (
            measurement.id === measurementId ? updater(measurement) : measurement
        ));
        measurementsRef.current = nextMeasurements;
        setMeasurements(nextMeasurements);
    }, []);

    const getMeasurementHit = useCallback((point) => {
        for (let index = measurements.length - 1; index >= 0; index -= 1) {
            const measurement = measurements[index];
            if (distanceBetweenPoints(point, measurement.start) <= measurementHitRadius) {
                return { measurement, handle: 'start' };
            }
            if (distanceBetweenPoints(point, measurement.end) <= measurementHitRadius) {
                return { measurement, handle: 'end' };
            }
            if (distancePointToSegment(point, measurement.start, measurement.end) <= measurementHitRadius) {
                return { measurement, handle: 'move' };
            }
        }
        return null;
    }, [measurementHitRadius, measurements]);

    const commitMeasurement = useCallback((start, end) => {
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        if (Math.hypot(dx, dy) < 3) return false;

        pushMeasurementsState((current) => [
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
    }, [calibrationMethod, effectivePixelSpacing, pushMeasurementsState]);

    const handleMeasurementPointerDown = useCallback((event) => {
        if ((!measureMode && !calibrationMode) || !imageLoaded || !imageSize.width || !imageSize.height) return;
        if (event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.setPointerCapture?.(event.pointerId);

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
            setPreviewPoint(null);
            return;
        }

        const hit = getMeasurementHit(nextPoint);
        if (hit) {
            setSelectedMeasurementId(hit.measurement.id);
            setPreviewPoint(null);
            setPendingPoint(null);
            setMeasurementDragState({
                type: 'edit',
                measurementId: hit.measurement.id,
                handle: hit.handle,
                originPoint: nextPoint,
                originalMeasurement: {
                    ...hit.measurement,
                    start: { ...hit.measurement.start },
                    end: { ...hit.measurement.end },
                },
                originalMeasurements: measurementsRef.current,
            });
            return;
        }

        setSelectedMeasurementId(null);
        if (pendingPoint) {
            setMeasurementDragState({
                type: 'create',
                originPoint: pendingPoint,
                pointerDownPoint: nextPoint,
                usePendingPoint: true,
            });
            setPreviewPoint(nextPoint);
            return;
        }

        setMeasurementDragState({
            type: 'create',
            originPoint: nextPoint,
            pointerDownPoint: nextPoint,
            usePendingPoint: false,
        });
        setPreviewPoint(nextPoint);
    }, [
        calibrationDraft,
        calibrationMode,
        getMeasurementPoint,
        getMeasurementHit,
        imageLoaded,
        imageSize.height,
        imageSize.width,
        measureMode,
        pendingPoint,
    ]);

    const handleMeasurementPointerMove = useCallback((event) => {
        if ((!measureMode && !calibrationMode) || (!measurementDragState && !pendingPoint && !calibrationDraft)) return;
        event.preventDefault();
        event.stopPropagation();
        const nextPoint = getMeasurementPoint(event);

        if (measurementDragState?.type === 'edit') {
            const { measurementId, handle, originPoint, originalMeasurement } = measurementDragState;
            if (!originalMeasurement) return;
            if (handle === 'start') {
                updateMeasurementById(measurementId, (measurement) => ({
                    ...measurement,
                    start: nextPoint,
                }));
            } else if (handle === 'end') {
                updateMeasurementById(measurementId, (measurement) => ({
                    ...measurement,
                    end: nextPoint,
                }));
            } else {
                const dx = nextPoint.x - originPoint.x;
                const dy = nextPoint.y - originPoint.y;
                updateMeasurementById(measurementId, (measurement) => ({
                    ...measurement,
                    start: {
                        x: originalMeasurement.start.x + dx,
                        y: originalMeasurement.start.y + dy,
                    },
                    end: {
                        x: originalMeasurement.end.x + dx,
                        y: originalMeasurement.end.y + dy,
                    },
                }));
            }
            return;
        }

        setPreviewPoint(nextPoint);
    }, [
        calibrationDraft,
        calibrationMode,
        getMeasurementPoint,
        measureMode,
        measurementDragState,
        pendingPoint,
        updateMeasurementById,
    ]);

    const handleMeasurementPointerUp = useCallback((event) => {
        if ((!measureMode && !calibrationMode) || (!measurementDragState && !pendingPoint)) return;
        event.preventDefault();
        event.stopPropagation();
        try { event.currentTarget.releasePointerCapture?.(event.pointerId); } catch (_) {}

        if (measurementDragState?.type === 'edit') {
            pushMeasurementsHistorySnapshot(measurementDragState.originalMeasurements);
            setMeasurementDragState(null);
            return;
        }

        if (!measurementDragState?.originPoint) return;

        const endPoint = getMeasurementPoint(event);
        const pointerTravel = distanceBetweenPoints(endPoint, measurementDragState.pointerDownPoint || measurementDragState.originPoint);

        if (measurementDragState.usePendingPoint) {
            if (commitMeasurement(measurementDragState.originPoint, endPoint)) {
                setPendingPoint(null);
                setPreviewPoint(null);
            } else {
                setPendingPoint(measurementDragState.originPoint);
                setPreviewPoint(endPoint);
            }
            setMeasurementDragState(null);
            return;
        }

        if (pointerTravel >= measurementDragThreshold && commitMeasurement(measurementDragState.originPoint, endPoint)) {
            setPendingPoint(null);
            setPreviewPoint(null);
        } else {
            setPendingPoint(measurementDragState.originPoint);
            setPreviewPoint(endPoint);
        }
        setMeasurementDragState(null);
    }, [
        calibrationMode,
        commitMeasurement,
        getMeasurementPoint,
        measureMode,
        measurementDragState,
        measurementDragThreshold,
        pendingPoint,
        pushMeasurementsHistorySnapshot,
    ]);

    const renderMeasurementLabel = useCallback((measurement, options = {}) => {
        const dx = measurement.end.x - measurement.start.x;
        const dy = measurement.end.y - measurement.start.y;
        const distancePx = Math.sqrt((dx * dx) + (dy * dy));
        const distanceMm = effectivePixelSpacing ? distancePx * effectivePixelSpacing : null;
        const label = distanceMm != null ? `${distanceMm.toFixed(2)} mm` : `${distancePx.toFixed(1)} px`;
        const midX = (measurement.start.x + measurement.end.x) / 2;
        const midY = (measurement.start.y + measurement.end.y) / 2;
        const pillWidth = Math.max(56, label.length * 6.5 + 14);
        const invZoom = 1 / Math.max(zoom, 0.1);
        const isPreview = Boolean(options.preview);

        return (
            <g key={`${measurement.id}-${isPreview ? 'preview' : 'label'}`}>
                <rect
                    x={midX - ((pillWidth * invZoom) / 2)}
                    y={midY - (22 * invZoom)}
                    width={pillWidth * invZoom}
                    height={17 * invZoom}
                    rx={8.5 * invZoom}
                    fill={isPreview ? 'rgba(15, 23, 42, 0.82)' : 'rgba(15, 23, 42, 0.92)'}
                    stroke={isPreview ? 'rgba(29, 158, 117, 0.35)' : 'rgba(29, 158, 117, 0.55)'}
                    strokeWidth={Math.max(0.5 * invZoom, 0.1)}
                />
                <text
                    x={midX}
                    y={midY - (10 * invZoom)}
                    fill="#ffffff"
                    fontSize={10 * invZoom}
                    fontWeight="600"
                    textAnchor="middle"
                    dominantBaseline="middle"
                >
                    {label}
                </text>
            </g>
        );
    }, [effectivePixelSpacing, zoom]);

    const previewMeasurement = useMemo(() => {
        if (!pendingPoint || !previewPoint) return null;
        if (distanceBetweenPoints(pendingPoint, previewPoint) < 3) return null;
        return {
            id: 'measurement-preview',
            start: pendingPoint,
            end: previewPoint,
        };
    }, [pendingPoint, previewPoint]);

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
            replaceAnnotationsState([]);
            replaceMeasurementsState([]);
            setPendingPoint(null);
            setMeasurementDragState(null);
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
    }, [
        annotations.length,
        measurements.length,
        persistAnnotationSession,
        refreshSnapshots,
        replaceAnnotationsState,
        replaceMeasurementsState,
    ]);

    const handleRestoreAnnotationSession = useCallback((snapshot) => {
        const nextAnnotations = (snapshot?.annotations || []).map((annotation) => normalizeAnnotationForPersistence(annotation, {
            seriesUid,
            viewerType: '2d',
            sourceWidth: imageSize.width,
            sourceHeight: imageSize.height,
        }));
        const featureState = snapshot?.feature_state || snapshot?.featureState || {};
        replaceAnnotationsState(nextAnnotations);
        setSnapshotOverlay(null);
        replaceMeasurementsState(Array.isArray(featureState.measurements) ? featureState.measurements : []);
        if (Number.isFinite(Number(featureState.zoom))) setZoom(Number(featureState.zoom));
        if (featureState.pan && Number.isFinite(Number(featureState.pan.x)) && Number.isFinite(Number(featureState.pan.y))) {
            setPan({ x: Number(featureState.pan.x), y: Number(featureState.pan.y) });
        }
        if (Number.isFinite(Number(featureState.calibration_factor))) {
            setCalibrationFactor(Number(featureState.calibration_factor));
        }
        setHistoryOpen(false);
    }, [imageSize.height, imageSize.width, replaceAnnotationsState, replaceMeasurementsState, seriesUid]);

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

        pushAnnotationsState((current) => current.map((annotation) => (
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
    }, [pushAnnotationsState, study?.id]);

    const handleSubmitAnnotationsForReview = useCallback(async () => {
        if (!study?.id || !annotations.length) return;
        const reviewIssues = getAnnotationReviewIssues(annotations);
        if (reviewIssues.length > 0) {
            setReviewError(`Cannot submit yet. Fix ${reviewIssues.length} annotation(s): ${reviewIssues[0].errors.join(', ')}`);
            return;
        }
        setReviewError('');
        const ids = annotations.map((annotation) => annotation.id).filter(Boolean);
        pushAnnotationsState((current) => current.map((annotation) => ({
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
    }, [annotations, pushAnnotationsState, seriesUid, study?.id]);

    useEffect(() => {
        if (historyOpen) {
            refreshSnapshots();
        }
    }, [historyOpen, refreshSnapshots]);

    const isComparison = comparisonPaneId !== null;
    const containerClasses = `relative flex h-full flex-col overflow-hidden bg-slate-950 text-slate-100 outline-none ${
        isComparison
            ? 'rounded-none border-none shadow-none'
            : 'rounded-3xl border border-slate-800 shadow-2xl'
    }`;

    return (
        <div ref={wrapperRef} tabIndex={0} className={containerClasses}>
            <div className="relative z-30 flex items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/95 px-4 py-2.5 backdrop-blur-sm shrink-0">
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

                <div className="flex items-center gap-2 flex-nowrap">
                    {/* View Controls Group */}
                    <div className="flex items-center gap-1.5 bg-slate-900/60 p-0.5 rounded-lg border border-slate-800/80">
                        <button
                            onClick={() => setInverted((current) => !current)}
                            className={`rounded-lg p-1.5 text-xs transition ${
                                inverted
                                    ? 'border border-amber-500/40 bg-amber-500/20 text-amber-400'
                                    : 'bg-transparent text-gray-400 hover:text-white'
                            }`}
                            title="Invert Colors"
                        >
                            <AppIcon name="Contrast" size={16} />
                        </button>
                    </div>

                    <div className="h-4 w-px bg-slate-800" />

                    {/* Diagnostic Mode Tools Group */}
                    <div className="flex items-center gap-1.5">
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
                                setMeasurementDragState(null);
                                setPreviewPoint(null);
                            }}
                            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                                measureMode
                                    ? 'border border-cyan-500/40 bg-cyan-500/20 text-cyan-400'
                                    : 'bg-slate-800 text-gray-400 hover:text-white'
                            }`}
                            title="Measurement Mode"
                        >
                            <AppIcon name="Ruler" size={15} />
                            <span className="hidden xl:inline">Measure</span>
                        </button>

                        {calibrationNeedsReview && (
                            <button
                                onClick={() => {
                                    setCalibrationMode((current) => !current);
                                    setMeasureMode(false);
                                    setAnnotateMode(false);
                                    setPendingPoint(null);
                                    setCalibrationDraft(null);
                                    setMeasurementDragState(null);
                                    setPreviewPoint(null);
                                }}
                                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                                    calibrationMode
                                        ? 'border border-emerald-500/40 bg-emerald-500/20 text-emerald-300'
                                        : 'bg-amber-500/15 text-amber-300 hover:bg-amber-500/25'
                                }`}
                                title="Manual calibration"
                            >
                                <AppIcon name="Gauge" size={15} />
                                <span className="hidden xl:inline">Calibrate</span>
                            </button>
                        )}

                        <button
                            onClick={() => {
                                setAnnotateMode((current) => {
                                    const next = !current;
                                    if (next) {
                                        setMeasureMode(false);
                                        setCalibrationMode(false);
                                        setAnnotationTool((currentTool) => currentTool === 'select' ? 'arrow' : currentTool);
                                        setPendingPoint(null);
                                        setCalibrationDraft(null);
                                        setMeasurementDragState(null);
                                        setPreviewPoint(null);
                                    }
                                    return next;
                                });
                            }}
                            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                                annotateMode
                                    ? 'border border-rose-500/40 bg-rose-500/20 text-rose-300'
                                    : 'bg-slate-800 text-gray-400 hover:text-white'
                            }`}
                            title="Annotation Mode"
                        >
                            <AppIcon name="Edit3" size={15} />
                            <span className="hidden xl:inline">Annotate</span>
                        </button>
                    </div>



                    <div className="h-4 w-px bg-slate-800" />

                    {/* Actions Group (Export, Session, New) */}
                    <div className="flex items-center gap-1.5">
                        <button onClick={captureScreenshot} className="rounded-lg bg-slate-800 p-2 text-gray-400 transition hover:bg-slate-700 hover:text-white" title="Save Screenshot">
                            <AppIcon name="Camera" size={15} />
                        </button>

                        <Dropdown label="Export" icon="Download" labelClassName="hidden lg:inline">
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
                            <Dropdown label="Session" icon="Package" labelClassName="hidden lg:inline">
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
                            <Dropdown label="New" icon="Plus" labelClassName="hidden lg:inline">
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
                    </div>

                    <div className="h-4 w-px bg-slate-800" />

                    {/* System Controls Group (Fullscreen, Help) */}
                    <div className="flex items-center gap-1.5 bg-slate-900/60 p-0.5 rounded-lg border border-slate-800/80">
                        <button onClick={toggleFullscreen} className="rounded-lg bg-transparent p-1.5 text-gray-400 transition hover:bg-slate-800 hover:text-white" title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}>
                            <AppIcon name={isFullscreen ? 'Minimize2' : 'Maximize2'} size={15} />
                        </button>
                        <ShortcutHelpButton shortcuts={IMAGE_SHORTCUTS} />
                    </div>

                    {allowSeriesSwitch && (
                        <>
                            <div className="mx-1 h-6 w-px bg-slate-800" />
                            <button onClick={() => setShowSeriesPanel((prev) => !prev)} className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-2.5 py-1.5 text-xs font-medium text-white transition shadow-lg shadow-purple-600/20 hover:bg-purple-500">
                                <AppIcon name="Layers" size={15} />
                                <span className="hidden sm:inline">Series</span>
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
                        transition: 'none',
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
                            window.requestAnimationFrame?.(syncImageBounds);
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
                                onPointerDown={handleMeasurementPointerDown}
                                onPointerMove={handleMeasurementPointerMove}
                                onPointerUp={handleMeasurementPointerUp}
                                onPointerLeave={() => {
                                    setPreviewPoint(pendingPoint || null);
                                }}
                            >
                                {measurements.map((measurement) => (
                                    <g key={measurement.id}>
                                        {(() => {
                                            const isSelected = measurement.id === selectedMeasurementId;
                                            const strokeWidth = Math.max((isSelected ? 1.75 : 1.15) / Math.max(zoom, 0.1), 0.22);
                                            const handleRadius = Math.max((isSelected ? 3.4 : 2.6) / Math.max(zoom, 0.1), 0.38);
                                            return (
                                                <>
                                                    <line
                                                        x1={measurement.start.x}
                                                        y1={measurement.start.y}
                                                        x2={measurement.end.x}
                                                        y2={measurement.end.y}
                                                        stroke={MEASUREMENT_COLOR}
                                                        strokeWidth={strokeWidth}
                                                        strokeLinecap="round"
                                                        opacity={isSelected ? 1 : 0.95}
                                                    />
                                                    <circle
                                                        cx={measurement.start.x}
                                                        cy={measurement.start.y}
                                                        r={handleRadius}
                                                        fill={MEASUREMENT_COLOR}
                                                        stroke={isSelected ? '#ffffff' : 'rgba(15, 23, 42, 0.75)'}
                                                        strokeWidth={Math.max(0.75 / Math.max(zoom, 0.1), 0.15)}
                                                    />
                                                    <circle
                                                        cx={measurement.end.x}
                                                        cy={measurement.end.y}
                                                        r={handleRadius}
                                                        fill={MEASUREMENT_COLOR}
                                                        stroke={isSelected ? '#ffffff' : 'rgba(15, 23, 42, 0.75)'}
                                                        strokeWidth={Math.max(0.75 / Math.max(zoom, 0.1), 0.15)}
                                                    />
                                                    {renderMeasurementLabel(measurement)}
                                                </>
                                            );
                                        })()}
                                    </g>
                                ))}

                                {previewMeasurement && (
                                    <>
                                        <line
                                            x1={previewMeasurement.start.x}
                                            y1={previewMeasurement.start.y}
                                            x2={previewMeasurement.end.x}
                                            y2={previewMeasurement.end.y}
                                            stroke={MEASUREMENT_COLOR}
                                            strokeWidth={Math.max(1 / Math.max(zoom, 0.1), 0.18)}
                                            strokeLinecap="round"
                                            strokeDasharray={`${4 / Math.max(zoom, 0.1)} ${4 / Math.max(zoom, 0.1)}`}
                                            opacity="0.75"
                                        />
                                        {renderMeasurementLabel(previewMeasurement, { preview: true })}
                                    </>
                                )}

                                {pendingPoint && (
                                    <circle
                                        cx={pendingPoint.x}
                                        cy={pendingPoint.y}
                                        r={Math.max(2.9 / Math.max(zoom, 0.1), 0.38)}
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

                {imageLoaded && imageSize.width > 0 && imageSize.height > 0 && viewportSize.width > 0 && viewportSize.height > 0 && (
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
                                hideSurface={true}
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
                            onChange={pushAnnotationsState}
                            activeToothContext={activeToothContext}
                            reviewMode={reviewMode}
                            onReviewAnnotation={handleReviewAnnotation}
                            className="absolute inset-0 z-[70]"
                            hideSurface={true}
                        />
                    </>
                )}

                {imageLoaded && (measureMode || annotateMode) && (
                    <div
                        className="absolute bottom-16 left-1/2 -translate-x-1/2 z-[80] flex items-center gap-1.5 p-2 bg-slate-950/90 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-md"
                        onPointerDown={(e) => e.stopPropagation()}
                        onPointerMove={(e) => e.stopPropagation()}
                        onPointerUp={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        onMouseMove={(e) => e.stopPropagation()}
                        onMouseUp={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                        onWheel={(e) => e.stopPropagation()}
                    >
                        {measureMode && (
                            <div className="flex items-center gap-1">
                                <span className="rounded-xl border border-cyan-500/30 bg-cyan-500/15 px-3 py-1.5 text-[11px] font-bold text-cyan-200">
                                    Distance
                                </span>
                                <button
                                    type="button"
                                    onClick={handleUndoMeasurement}
                                    disabled={!pendingPoint && measurementsHistory.length === 0}
                                    className="rounded-md bg-slate-800 p-1.5 text-gray-400 transition hover:bg-slate-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-slate-800 disabled:hover:text-gray-400"
                                    title="Undo Measurement"
                                >
                                    <AppIcon name="Undo2" size={15} />
                                </button>
                                <button
                                    type="button"
                                    onClick={handleRedoMeasurement}
                                    disabled={measurementsRedo.length === 0}
                                    className="rounded-md bg-slate-800 p-1.5 text-gray-400 transition hover:bg-slate-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-slate-800 disabled:hover:text-gray-400"
                                    title="Redo Measurement"
                                >
                                    <AppIcon name="Redo2" size={15} />
                                </button>
                                <button
                                    type="button"
                                    onClick={handleClearMeasurements}
                                    className="rounded-md bg-slate-800 p-1.5 text-gray-400 transition hover:bg-slate-700 hover:text-white"
                                    title="Clear Measurements"
                                >
                                    <AppIcon name="Trash2" size={15} />
                                </button>
                            </div>
                        )}

                        {annotateMode && (
                            <div className="flex items-center gap-1.5">
                                {[
                                    ['select', 'MousePointer2', 'Select'],
                                    ['arrow', 'ArrowRight', 'Arrow'],
                                    ['circle', 'Circle', 'Circle'],
                                    ['freehand', 'PenLine', 'Surface'],
                                    ['brush', 'Paintbrush', 'Brush'],
                                    ['text', 'Type', 'Text'],
                                ].map(([toolName, iconName, label]) => (
                                    <button
                                        key={toolName}
                                        type="button"
                                        onClick={() => setAnnotationTool(toolName)}
                                        className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11px] font-bold transition ${
                                            annotationTool === toolName
                                                ? 'border border-rose-500/40 bg-rose-500/20 text-rose-200'
                                                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                                        }`}
                                        title={`${label} annotation`}
                                    >
                                        <AppIcon name={iconName} size={14} />
                                        <span>{label}</span>
                                    </button>
                                ))}

                                <div className="mx-1 h-5 w-px bg-slate-800" />

                                <button
                                    type="button"
                                    onClick={handleUndoAnnotation}
                                    disabled={annotationsHistory.length === 0}
                                    className="rounded-xl bg-slate-800 p-1.5 text-slate-400 transition hover:bg-slate-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-slate-800 disabled:hover:text-slate-400"
                                    title="Undo last annotation"
                                >
                                    <AppIcon name="Undo2" size={15} />
                                </button>
                                <button
                                    type="button"
                                    onClick={handleRedoAnnotation}
                                    disabled={annotationsRedo.length === 0}
                                    className="rounded-xl bg-slate-800 p-1.5 text-slate-400 transition hover:bg-slate-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-slate-800 disabled:hover:text-slate-400"
                                    title="Redo last annotation"
                                >
                                    <AppIcon name="Redo2" size={15} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => pushAnnotationsState([])}
                                    className="relative rounded-xl bg-slate-800 p-1.5 text-slate-400 transition hover:bg-rose-900/60 hover:text-rose-200"
                                    title="Clear annotations"
                                >
                                    <AppIcon name="Trash2" size={15} />
                                    {annotations.length > 0 && (
                                        <span className="absolute -right-1 -top-1 min-w-[14px] rounded-full bg-rose-500 px-1 text-center text-[9px] font-bold leading-[14px] text-white">
                                            {annotations.length > 99 ? '99+' : annotations.length}
                                        </span>
                                    )}
                                </button>

                                {annotationPersistence.saving && (
                                    <span className="px-2 text-[10px] font-mono uppercase tracking-wider text-cyan-300">Saving</span>
                                )}
                                {annotationPersistence.error && (
                                    <span className="px-2 text-[10px] font-mono uppercase tracking-wider text-amber-300" title={annotationPersistence.error.message || 'Backend save failed; local cache is active'}>
                                        Local
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
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
                                {windowLevelDrag ? 'Right-drag: Window/Level' : calibrationMode ? 'Click two points: Calibrate' : annotateMode ? 'Drag/Click: Annotate' : measureMode ? 'Click/drag: Measure • Drag handles: Edit' : 'Drag: Pan'}
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

                <SeriesSidebar
                    study={study}
                    currentSeriesUid={seriesInfo?.series_uid}
                    onSelectSeries={(series) => {
                        setShowSeriesPanel(false);
                        if (onSwitchSeries) onSwitchSeries(series);
                    }}
                    visible={allowSeriesSwitch && showSeriesPanel}
                    onClose={() => setShowSeriesPanel(false)}
                    position="right"
                />
            </div>
        </div>
    );
};

export default ImageViewer2D;
