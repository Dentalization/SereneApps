import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import '@kitware/vtk.js/Rendering/Profiles/Volume';

import vtkXMLImageDataReader from '@kitware/vtk.js/IO/XML/XMLImageDataReader';
import vtkInteractorStyleImage from '@kitware/vtk.js/Interaction/Style/InteractorStyleImage';
import vtkImageMapper from '@kitware/vtk.js/Rendering/Core/ImageMapper';
import vtkImageSlice from '@kitware/vtk.js/Rendering/Core/ImageSlice';
import vtkColorTransferFunction from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction';
import vtkPiecewiseFunction from '@kitware/vtk.js/Common/DataModel/PiecewiseFunction';
import vtkGenericRenderWindow from '@kitware/vtk.js/Rendering/Misc/GenericRenderWindow';
import vtkVolume from '@kitware/vtk.js/Rendering/Core/Volume';
import vtkVolumeMapper from '@kitware/vtk.js/Rendering/Core/VolumeMapper';
import vtkWidgetManager from '@kitware/vtk.js/Widgets/Core/WidgetManager';
import vtkLineWidget from '@kitware/vtk.js/Widgets/Widgets3D/LineWidget';
import vtkAngleWidget from '@kitware/vtk.js/Widgets/Widgets3D/AngleWidget';

import { SlicingMode } from '@kitware/vtk.js/Rendering/Core/ImageMapper/Constants';

import AppIcon from '../../../../components/AppIcon';
import { useAuth } from '../../../../contexts/AuthContext';
import { VOLUME_PRESETS, WL_LUT_LABELS, WL_LUTS } from '../config/volumePresets';
import useStudyMetadata from '../hooks/useStudyMetadata';
import usePersistentAnnotations from '../hooks/usePersistentAnnotations';
import { volumeCache } from '../utils/volumeCache';
import { buildImagingUrl, buildStudyAssetParams } from '../utils/imagingUrl';
import { drawAnnotations, exportAnnotationsJson, exportPdfReport } from '../utils/reportUtils';
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
    buildSliceMeasurementRecords,
    sliceMeasurementSpecFromRecord,
} from '../utils/clinicalPersistenceRecords.mjs';
import { getAnnotationReviewIssues } from '../utils/annotationQuality';
import { computeSyncedSliceIndices, quantizeDisplayCoordinate } from '../utils/sliceSyncMath';
import { buildProjectedImageBounds, isProjectionFrameCurrent } from '../utils/annotationProjection.mjs';
import { normalizeSliceClinicalContext } from '../utils/annotationClinicalContext.mjs';
import AnnotationCanvas from './AnnotationCanvas';
import AnnotationHistoryPanel from './AnnotationHistoryPanel';
import AnnotationSessionModal from './AnnotationSessionModal';
import MetadataPanel from './MetadataPanel';
import ReportExportModal from './ReportExportModal';
import SeriesSidebar from './SeriesSidebar';
import ShortcutHelpButton from './ShortcutHelpButton';
import {
    canonicalRenderDimensions,
    drawFindingMarkers,
    markerPlacements,
} from '../../../../features/x-core-analysis/canonicalReportRender.mjs';

const AXIS = {
    axial: {
        slicingMode: SlicingMode.K,
        dimIndex: 2,
        camUp: [0, -1, 0],
        camDir: [0, 0, -1],
        label: 'Axial',
        activeBtn: 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50',
        labelClass: 'text-cyan-400',
        paneBorderClass: 'border-cyan-500/70',
        colorHex: '#22d3ee',
    },
    coronal: {
        slicingMode: SlicingMode.J,
        dimIndex: 1,
        camUp: [0, 0, 1],
        camDir: [0, -1, 0],
        label: 'Coronal',
        activeBtn: 'bg-purple-500/20 text-purple-400 border border-purple-500/50',
        labelClass: 'text-purple-400',
        paneBorderClass: 'border-purple-500/70',
        colorHex: '#c084fc',
    },
    sagittal: {
        slicingMode: SlicingMode.I,
        dimIndex: 0,
        camUp: [0, 0, 1],
        camDir: [-1, 0, 0],
        label: 'Sagittal',
        activeBtn: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50',
        labelClass: 'text-emerald-400',
        paneBorderClass: 'border-emerald-500/70',
        colorHex: '#34d399',
    },
};

const CROSSHAIR_COLORS = {
    axial: {
        vertical: AXIS.sagittal.colorHex,
        horizontal: AXIS.coronal.colorHex,
    },
    coronal: {
        vertical: AXIS.sagittal.colorHex,
        horizontal: AXIS.axial.colorHex,
    },
    sagittal: {
        vertical: AXIS.coronal.colorHex,
        horizontal: AXIS.axial.colorHex,
    },
};

const AXIS_ORDER = ['axial', 'coronal', 'sagittal'];
const MEASUREMENT_COLOR = '#1D9E75';
const MEASUREMENT_RGB = [29, 158, 117];
const SINGLE_CAMERA_ZOOM = 1.3;
const QUAD_CAMERA_ZOOM = 1.05;
const WL_DRAG_SENSITIVITY = 0.005;
const DEFAULT_WINDOW_LEVEL = { center: 0.38, width: 0.70 };
const LUT_OPTION_KEYS = Object.keys(WL_LUTS);
const COMPARISON_RATIO_EPSILON = 1e-4;
const SLICE_TOLERANCE = 10;
const SLICE_WL_SHORTCUT_PRESETS = {
    '1': { label: 'Dental W/L', lut: 'dental' },
    '2': { label: 'Bone W/L', center: 0.40, width: 0.60 },
    '3': { label: 'Soft W/L', center: 0.28, width: 0.25 },
    '4': { label: 'Full W/L', center: 0.50, width: 1.00 },
};
const SLICE_SHORTCUTS = [
    { key: '↑ / ←', label: 'Previous slice' },
    { key: '↓ / →', label: 'Next slice' },
    { key: 'A', label: 'Axial plane' },
    { key: 'C', label: 'Coronal plane' },
    { key: 'S', label: 'Sagittal plane' },
    { key: '1 / 2 / 3 / 4', label: 'Dental / Bone / Soft / Full W/L' },
    { key: 'Ctrl/Cmd + Z', label: 'Undo annotation/measurement' },
    { key: 'Ctrl/Cmd + Shift + Z', label: 'Redo annotation' },
    { key: 'I', label: 'Invert image' },
    { key: 'Right-drag', label: 'Window/Level adjust' },
    { key: 'F', label: 'Fullscreen' },
];

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const ANNOTATION_HISTORY_LIMIT = 50;

const AnnotationCounterBadge = ({ value, activeClassName }) => {
    const displayValue = value > 99 ? '99+' : String(value);

    return (
        <motion.span
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={`pointer-events-none absolute right-0 top-0 flex h-4 min-w-4 translate-x-1/3 -translate-y-1/3 items-center justify-center overflow-hidden rounded-full px-1 text-[9px] font-bold leading-none ${activeClassName}`}
            aria-hidden="true"
        >
            <AnimatePresence mode="popLayout">
                <motion.span
                    key={displayValue}
                    initial={{ y: -4, scale: 0.82 }}
                    animate={{ y: 0, scale: 1, opacity: 1 }}
                    exit={{ y: 4, scale: 0.82, opacity: 0 }}
                    style={{ opacity: 0 }}
                    transition={{ duration: 0.14, ease: [0.2, 0.8, 0.2, 1] }}
                    className="font-mono tabular-nums absolute inset-0 flex items-center justify-center"
                >
                    {displayValue}
                </motion.span>
            </AnimatePresence>
        </motion.span>
    );
};
const resolveStateUpdate = (updater, current) => (
    typeof updater === 'function' ? updater(current) : updater
);
const listHasSameItems = (first = [], second = []) => (
    Array.isArray(first)
    && Array.isArray(second)
    && first.length === second.length
    && first.every((item, index) => item === second[index])
);

const buildCenteredSlices = (dims) => ({
    axial: Math.floor(Math.max((dims?.[2] ?? 1) - 1, 0) / 2),
    coronal: Math.floor(Math.max((dims?.[1] ?? 1) - 1, 0) / 2),
    sagittal: Math.floor(Math.max((dims?.[0] ?? 1) - 1, 0) / 2),
});

const emptyMeasurementLabels = () => ({
    axial: [],
    coronal: [],
    sagittal: [],
});

const buildDentistName = (user) => [user?.profile?.title, user?.name].filter(Boolean).join(' ').trim();

const drawMeasurementPillToCanvas = (ctx, label) => {
    const width = Math.max(60, label.text.length * 6.8 + 16);
    const x = label.x - (width / 2);
    const y = Math.max(label.y - 26, 10);

    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.strokeStyle = '#1D9E75';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, width, 22, 11);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label.text, label.x, y + 11);
    ctx.restore();
};

const SliceViewer = ({
    study,
    onBack,
    onSwitchTo3D,
    onSwitchSeries,
    comparisonPaneId = null,
    comparisonSyncEnabled = false,
    isFullscreen: passedIsFullscreen,
    toggleFullscreen: passedToggleFullscreen,
    analysisCaseContext = null,
    onCaptureForCase = null,
}) => {
    const { user } = useAuth();
    const wrapperRef = useRef(null);
    const moreToolsMenuRef = useRef(null);
    const viewerAreaRef = useRef(null);
    const vtkContainerRef = useRef(null);
    const vtkRef = useRef(null);
    const quadAxialRef = useRef(null);
    const quadCoronalRef = useRef(null);
    const quadSagittalRef = useRef(null);
    const quadVolumeRef = useRef(null);
    const quadRefs = useRef({ axial: null, coronal: null, sagittal: null, volume: null });
    const measurementStoreRef = useRef({ axial: [], coronal: [], sagittal: [] });
    const projectionRefreshFrameRef = useRef(null);
    const projectionRefreshFrame2Ref = useRef(null);
    const resizeObserverFrameRef = useRef(null);
    const comparisonSyncGuardRef = useRef(false);
    const comparisonSyncGuardFrameRef = useRef(null);
    const hydrateClinicalRecordsRef = useRef(() => {});
    const pendingMeasurementRecordsRef = useRef([]);
    const annotationsRef = useRef([]);
    const annotationsHistoryRef = useRef([]);
    const annotationsRedoRef = useRef([]);
    // Guard against concurrent capture calls (race condition fix)
    const captureInProgressRef = useRef(false);
    const comparisonLastBroadcastRef = useRef({
        axial: { slice: null, ratio: null },
        coronal: { slice: null, ratio: null },
        sagittal: { slice: null, ratio: null },
    });

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
    const [windowCenter, setWindowCenter] = useState(DEFAULT_WINDOW_LEVEL.center);
    const [windowWidth, setWindowWidth] = useState(DEFAULT_WINDOW_LEVEL.width);
    const [windowLevelDrag, setWindowLevelDrag] = useState(null);
    const [inverted, setInverted] = useState(false);
    const [localIsFullscreen, setLocalIsFullscreen] = useState(false);
    const isFullscreen = passedIsFullscreen !== undefined ? passedIsFullscreen : localIsFullscreen;
    const [showSeriesPanel, setShowSeriesPanel] = useState(false);
    const [showMetadataPanel, setShowMetadataPanel] = useState(false);
    const [showMoreTools, setShowMoreTools] = useState(false);
    const [volumeInfo, setVolumeInfo] = useState(null);
    const [imageData, setImageData] = useState(null);
    const [quadView, setQuadView] = useState(false);
    const [sliceIndices, setSliceIndices] = useState(buildCenteredSlices([1, 1, 1]));
    const [measurementMode, setMeasurementMode] = useState(false);
    const [measurementTool, setMeasurementTool] = useState('distance');
    const [measurementLabels, setMeasurementLabels] = useState(emptyMeasurementLabels);
    const [measurementRevision, setMeasurementRevision] = useState(0);
    const [quadCrosshairPositions, setQuadCrosshairPositions] = useState({});
    const [annotateMode, setAnnotateMode] = useState(false);
    const [annotationTool, setAnnotationTool] = useState('arrow');
    const [annotations, setAnnotations] = useState([]);
    const [annotationsHistory, setAnnotationsHistory] = useState([]);
    const [annotationsRedo, setAnnotationsRedo] = useState([]);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [snapshots, setSnapshots] = useState([]);
    const [snapshotsLoading, setSnapshotsLoading] = useState(false);
    const [snapshotOverlay, setSnapshotOverlay] = useState(null);
    const [sessionModalMode, setSessionModalMode] = useState(null);
    const [sessionSaving, setSessionSaving] = useState(false);
    const [sessionError, setSessionError] = useState('');
    const [reviewError, setReviewError] = useState('');
    const [reportModalOpen, setReportModalOpen] = useState(false);
    const [exportingReport, setExportingReport] = useState(false);
    const [caseCaptureState, setCaseCaptureState] = useState('idle');
    const [caseCaptureError, setCaseCaptureError] = useState('');
    const [reportWarningMessage, setReportWarningMessage] = useState('');
    const [viewerSize, setViewerSize] = useState({ width: 0, height: 0 });
    const [projectionRefreshTick, setProjectionRefreshTick] = useState(0);
    const [projectionReady, setProjectionReady] = useState(false);
    const reviewMode = useMemo(() => new URLSearchParams(window.location.search).get('mode') === 'review', []);

    const scheduleProjectionRefresh = useCallback(() => {
        if (projectionRefreshFrameRef.current != null) {
            window.cancelAnimationFrame(projectionRefreshFrameRef.current);
            projectionRefreshFrameRef.current = null;
        }
        if (projectionRefreshFrame2Ref.current != null) {
            window.cancelAnimationFrame(projectionRefreshFrame2Ref.current);
            projectionRefreshFrame2Ref.current = null;
        }

        setProjectionReady(false);
        projectionRefreshFrameRef.current = window.requestAnimationFrame(() => {
            projectionRefreshFrame2Ref.current = window.requestAnimationFrame(() => {
                setProjectionRefreshTick((current) => current + 1);
                setProjectionReady(true);
                projectionRefreshFrameRef.current = null;
                projectionRefreshFrame2Ref.current = null;
            });
        });
    }, []);

    useEffect(() => () => {
        if (projectionRefreshFrameRef.current != null) {
            window.cancelAnimationFrame(projectionRefreshFrameRef.current);
        }
        if (projectionRefreshFrame2Ref.current != null) {
            window.cancelAnimationFrame(projectionRefreshFrame2Ref.current);
        }
        if (resizeObserverFrameRef.current != null) {
            window.cancelAnimationFrame(resizeObserverFrameRef.current);
        }
    }, []);

    const studyKey = useMemo(() => study?.folderName || study?.id || '', [study]);
    const seriesUid = useMemo(() => (
        study?.selectedSeriesUid
        || study?.series_uid
        || study?.seriesUid
        || study?.selectedSeries?.series_uid
        || study?.series?.[0]?.series_uid
        || study?.seriesList?.[0]?.series_uid
        || ''
    ), [study]);
    const cacheKey = useMemo(() => `${studyKey}__${seriesUid}`, [studyKey, seriesUid]);
    const canUseBackendSessions = useMemo(() => /^\d+$/.test(String(study?.id || '')), [study?.id]);
    const sessionScope = useMemo(() => ({
        study,
        studyKey,
        seriesUid,
        viewerType: 'slice',
    }), [seriesUid, study, studyKey]);
    const showBack = typeof onBack === 'function';
    const allowSeriesSwitch = !study?.readOnly && typeof onSwitchSeries === 'function';
    const { metadata, loading: metadataLoading, error: metadataError } = useStudyMetadata(study, {
        enabled: !!studyKey,
    });
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
    const annotationPersistenceScope = useMemo(() => ({
        sourceWidth: viewerSize.width,
        sourceHeight: viewerSize.height,
    }), [viewerSize.height, viewerSize.width]);
    useEffect(() => {
        annotationsRef.current = annotations;
    }, [annotations]);
    const replaceAnnotationsState = useCallback((updater) => {
        const next = resolveStateUpdate(updater, annotationsRef.current);
        const normalized = Array.isArray(next) ? next : [];
        annotationsRef.current = normalized;
        annotationsHistoryRef.current = [];
        annotationsRedoRef.current = [];
        setAnnotations(normalized);
        setAnnotationsHistory([]);
        setAnnotationsRedo([]);
    }, []);
    const applyPersistenceAnnotationsState = useCallback((updater) => {
        if (typeof updater !== 'function') {
            replaceAnnotationsState(updater);
            return;
        }

        const next = updater(annotationsRef.current);
        const normalized = Array.isArray(next) ? next : [];
        annotationsRef.current = normalized;
        setAnnotations(normalized);
    }, [replaceAnnotationsState]);
    const pushAnnotationsState = useCallback((updater) => {
        const current = annotationsRef.current;
        const next = resolveStateUpdate(updater, current);
        if (!Array.isArray(next) || next === current || listHasSameItems(current, next)) return;

        const nextHistory = [...annotationsHistoryRef.current, current]
            .slice(-ANNOTATION_HISTORY_LIMIT);
        annotationsRef.current = next;
        annotationsHistoryRef.current = nextHistory;
        annotationsRedoRef.current = [];
        setAnnotations(next);
        setAnnotationsHistory(nextHistory);
        setAnnotationsRedo([]);
    }, []);
    const undoAnnotationsState = useCallback(() => {
        const history = annotationsHistoryRef.current;
        if (!history.length) return;

        const current = annotationsRef.current;
        const previous = history[history.length - 1];
        const nextHistory = history.slice(0, -1);
        const nextRedo = [current, ...annotationsRedoRef.current]
            .slice(0, ANNOTATION_HISTORY_LIMIT);
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
        const nextHistory = [...annotationsHistoryRef.current, current]
            .slice(-ANNOTATION_HISTORY_LIMIT);
        const nextRedo = redo.slice(1);
        annotationsRef.current = next;
        annotationsHistoryRef.current = nextHistory;
        annotationsRedoRef.current = nextRedo;
        setAnnotations(next);
        setAnnotationsHistory(nextHistory);
        setAnnotationsRedo(nextRedo);
    }, []);
    const measurementClinicalRecords = useMemo(() => buildSliceMeasurementRecords(measurementStoreRef.current, {
        seriesUid,
        sourceWidth: viewerSize.width,
        sourceHeight: viewerSize.height,
        sliceIndex,
        sliceIndices,
        spacing,
        dimensions,
    }), [dimensions, measurementLabels, measurementRevision, seriesUid, sliceIndex, sliceIndices, spacing, viewerSize.height, viewerSize.width]);
    const handleHydrateClinicalRecords = useCallback((records) => {
        hydrateClinicalRecordsRef.current?.(records);
    }, []);
    const annotationPersistence = usePersistentAnnotations({
        study,
        seriesUid,
        viewerType: 'slice',
        annotations,
        setAnnotations: applyPersistenceAnnotationsState,
        clinicalRecords: measurementClinicalRecords,
        onHydrateClinicalRecords: handleHydrateClinicalRecords,
        enabled: !loading && !error && !!imageData && !!seriesUid,
        scope: annotationPersistenceScope,
    });
    const getVisibleAnnotationsFromList = useCallback((items, axisName, currentSliceIndex, baseOpacity = 1, tolerance = SLICE_TOLERANCE) => (items || [])
        .filter((annotation) => {
            const annotationAxis = annotation.slice_axis || annotation.sliceAxis || axisName;
            const annotationSlice = annotation.slice_index ?? annotation.sliceIndex ?? currentSliceIndex;
            return annotationAxis === axisName && Math.abs(Number(annotationSlice) - currentSliceIndex) <= tolerance;
        })
        .map((annotation) => {
            const annotationSlice = annotation.slice_index ?? annotation.sliceIndex ?? currentSliceIndex;
            const offset = Math.abs(Number(annotationSlice) - currentSliceIndex);
            return {
                ...annotation,
                displayOpacity: (offset === 0 ? 1 : 0.4) * baseOpacity,
            };
        }), []);
    const getCurrentSliceAnnotationsForAxis = useCallback(
        (axisName, currentSliceIndex) => getVisibleAnnotationsFromList(annotations, axisName, currentSliceIndex, 1, 0),
        [annotations, getVisibleAnnotationsFromList]
    );
    const getNeighborAnnotationsForAxis = useCallback(
        (axisName, currentSliceIndex) => getVisibleAnnotationsFromList(annotations, axisName, currentSliceIndex)
            .filter((annotation) => (annotation.displayOpacity ?? 1) < 1),
        [annotations, getVisibleAnnotationsFromList]
    );
    const visibleAnnotations = useMemo(
        () => getCurrentSliceAnnotationsForAxis(axis, sliceIndex),
        [axis, getCurrentSliceAnnotationsForAxis, sliceIndex]
    );
    const neighborAnnotations = useMemo(
        () => getNeighborAnnotationsForAxis(axis, sliceIndex),
        [axis, getNeighborAnnotationsForAxis, sliceIndex]
    );
    const visibleSnapshotAnnotations = useMemo(
        () => getVisibleAnnotationsFromList(snapshotOverlay?.annotations || [], axis, sliceIndex, 0.5),
        [axis, getVisibleAnnotationsFromList, sliceIndex, snapshotOverlay]
    );
    const measurementCount = useMemo(() => (
        AXIS_ORDER.reduce((total, axisName) => total + (measurementLabels[axisName] || []).length, 0)
    ), [measurementLabels]);

    useEffect(() => {
        if (!annotationPersistence.loading && !loading && !error && imageData) {
            scheduleProjectionRefresh();
        }
    }, [annotationPersistence.loading, error, imageData, loading, scheduleProjectionRefresh]);

    const buildColorFunctionFromLut = useCallback((lut, invert) => {
        const ctf = vtkColorTransferFunction.newInstance();
        const stops = Array.isArray(lut) && lut.length ? lut : WL_LUTS.dental;

        stops.forEach(([value, gray]) => {
            const level = invert ? 1 - gray : gray;
            ctf.addRGBPoint(value, level, level, level);
        });

        return ctf;
    }, []);

    const buildLinearColorFunction = useCallback((center, width, invert) => {
        const ctf = vtkColorTransferFunction.newInstance();
        const low = center - width / 2;
        const high = center + width / 2;

        ctf.addRGBPoint(low, invert ? 1.0 : 0.0, invert ? 1.0 : 0.0, invert ? 1.0 : 0.0);
        ctf.addRGBPoint(high, invert ? 0.0 : 1.0, invert ? 0.0 : 1.0, invert ? 0.0 : 1.0);

        return ctf;
    }, []);

    const buildSliceColorFunction = useCallback((presetName, center, width, invert) => {
        const lut = WL_LUTS[presetName];
        if (lut) {
            return buildColorFunctionFromLut(lut, invert);
        }
        return buildLinearColorFunction(center, width, invert);
    }, [buildColorFunctionFromLut, buildLinearColorFunction]);

    const buildOpacityFunction = useCallback(() => {
        const ofun = vtkPiecewiseFunction.newInstance();
        ofun.addPoint(0.0, 1.0);
        ofun.addPoint(1.0, 1.0);
        return ofun;
    }, []);

    const applyWindowLevelToActor = useCallback((actor, presetName, center, width, invert) => {
        if (!actor) return;

        const ctf = buildSliceColorFunction(presetName, center, width, invert);
        actor.getProperty().setRGBTransferFunction(0, ctf);

        const ofun = buildOpacityFunction();
        actor.getProperty().setPiecewiseFunction(0, ofun);
        actor.getProperty().setUseLookupTableScalarRange(true);
    }, [buildOpacityFunction, buildSliceColorFunction]);

    const applyWindowLevel = useCallback((presetName, center, width, invert) => {
        const ctx = vtkRef.current;
        if (!ctx?.actor) return;
        applyWindowLevelToActor(ctx.actor, presetName, center, width, invert);
        ctx.renderWindow.render();
    }, [applyWindowLevelToActor]);

    const createSlicePaneContext = useCallback((container, nextImageData, axisName, zoomFactor, presetName, center, width, invert) => {
        if (!container || !nextImageData) return null;

        const grw = vtkGenericRenderWindow.newInstance({ listenWindowResize: false });
        grw.setContainer(container);
        grw.resize();

        const renderer = grw.getRenderer();
        const renderWindow = grw.getRenderWindow();
        const apiSpecificRenderWindow = grw.getApiSpecificRenderWindow();

        renderer.setBackground(0.05, 0.05, 0.08);

        const interactorStyle = vtkInteractorStyleImage.newInstance();
        renderWindow.getInteractor().setInteractorStyle(interactorStyle);

        const mapper = vtkImageMapper.newInstance();
        mapper.setInputData(nextImageData);

        const actor = vtkImageSlice.newInstance();
        actor.setMapper(mapper);
        actor.getProperty().setInterpolationTypeToLinear();
        applyWindowLevelToActor(actor, presetName, center, width, invert);

        renderer.addActor(actor);

        const widgetManager = vtkWidgetManager.newInstance();
        widgetManager.setRenderer(renderer);
        widgetManager.enablePicking();

        return {
            axisName,
            zoomFactor,
            container,
            grw,
            renderer,
            renderWindow,
            apiSpecificRenderWindow,
            mapper,
            actor,
            imageData: nextImageData,
            widgetManager,
        };
    }, [applyWindowLevelToActor]);

    const updateSlicePaneContext = useCallback((ctx, axisName, sliceValue, zoomFactor = SINGLE_CAMERA_ZOOM) => {
        if (!ctx) return;

        const axisDef = AXIS[axisName];
        const dims = ctx.imageData.getDimensions();
        const sp = ctx.imageData.getSpacing();
        const origin = ctx.imageData.getOrigin();
        const clampedSlice = clamp(sliceValue, 0, dims[axisDef.dimIndex] - 1);

        ctx.axisName = axisName;
        ctx.zoomFactor = zoomFactor;
        ctx.mapper.setSlicingMode(axisDef.slicingMode);
        ctx.mapper.setSlice(clampedSlice);

        const camera = ctx.renderer.getActiveCamera();
        camera.setParallelProjection(true);

        const cx = origin[0] + (dims[0] * sp[0]) / 2;
        const cy = origin[1] + (dims[1] * sp[1]) / 2;
        const cz = origin[2] + (dims[2] * sp[2]) / 2;
        const dist = Math.max(dims[0] * sp[0], dims[1] * sp[1], dims[2] * sp[2]) * 2;

        camera.setPosition(
            cx + axisDef.camDir[0] * dist,
            cy + axisDef.camDir[1] * dist,
            cz + axisDef.camDir[2] * dist
        );
        camera.setFocalPoint(cx, cy, cz);
        camera.setViewUp(...axisDef.camUp);

        ctx.renderer.resetCamera();
        camera.zoom(zoomFactor);
        ctx.renderWindow.render();
    }, []);

    const resizePaneContext = useCallback((ctx) => {
        if (!ctx) return;
        ctx.grw.resize();
        ctx.renderWindow.render();
    }, []);

    const destroyPaneContext = useCallback((ctx) => {
        if (!ctx) return;
        try {
            ctx.widgetManager?.removeWidgets?.();
            ctx.widgetManager?.delete?.();
        } catch (_) {}
        try {
            ctx.grw?.delete?.();
        } catch (_) {}
    }, []);

    const createVolumePreviewContext = useCallback((container, nextImageData) => {
        if (!container || !nextImageData) return null;

        const grw = vtkGenericRenderWindow.newInstance({ listenWindowResize: false });
        grw.setContainer(container);
        grw.resize();

        const renderer = grw.getRenderer();
        const renderWindow = grw.getRenderWindow();
        renderer.setBackground(0.08, 0.08, 0.12);

        const mapper = vtkVolumeMapper.newInstance();
        mapper.setInputData(nextImageData);
        mapper.setSampleDistance(0.7);
        mapper.setMaximumSamplesPerRay(1200);
        mapper.setBlendModeToComposite();

        const actor = vtkVolume.newInstance();
        actor.setMapper(mapper);

        const ctf = vtkColorTransferFunction.newInstance();
        const ofun = vtkPiecewiseFunction.newInstance();
        VOLUME_PRESETS.bone.color.forEach(([value, r, g, b]) => ctf.addRGBPoint(value, r, g, b));
        VOLUME_PRESETS.bone.opacity.forEach(([value, opacity]) => ofun.addPoint(value, opacity));

        actor.getProperty().setRGBTransferFunction(0, ctf);
        actor.getProperty().setScalarOpacity(0, ofun);
        actor.getProperty().setInterpolationTypeToLinear();
        actor.getProperty().setShade(true);
        actor.getProperty().setAmbient(0.3);
        actor.getProperty().setDiffuse(0.7);
        actor.getProperty().setSpecular(0.2);
        actor.getProperty().setSpecularPower(10);

        const spacingAverage = nextImageData.getSpacing().reduce((sum, value) => sum + value, 0) / 3;
        actor.getProperty().setScalarOpacityUnitDistance(0, spacingAverage * 2.5);

        renderer.addVolume(actor);
        renderer.resetCamera();
        renderer.getActiveCamera().zoom(1.2);
        renderWindow.render();

        return { grw, renderer, renderWindow, mapper, actor, container, imageData: nextImageData };
    }, []);

    const getPaneContext = useCallback((axisName) => {
        if (quadView) return quadRefs.current[axisName];
        if (vtkRef.current?.axisName === axisName) return vtkRef.current;
        return null;
    }, [quadView]);

    const getPaneDisplayPosition = useCallback((ctx, worldPoint) => {
        if (!ctx || !worldPoint) return null;

        const view = ctx.apiSpecificRenderWindow;
        const viewportSize = view.getViewportSize(ctx.renderer);
        const dpr = view.getComputedDevicePixelRatio?.() || window.devicePixelRatio || 1;
        const containerWidth = ctx.container?.clientWidth || 0;
        const containerHeight = ctx.container?.clientHeight || 0;
        const viewportWidthCss = viewportSize?.[0] ? viewportSize[0] / dpr : 0;
        const viewportHeightCss = viewportSize?.[1] ? viewportSize[1] / dpr : 0;

        if (
            containerWidth <= 0
            || containerHeight <= 0
            || viewportWidthCss <= 0
            || viewportHeightCss <= 0
        ) {
            return null;
        }

        const frameCurrent = isProjectionFrameCurrent({
            containerWidth,
            containerHeight,
            viewportWidthCss,
            viewportHeightCss,
        });
        const displayPoint = view.worldToDisplay(worldPoint[0], worldPoint[1], worldPoint[2], ctx.renderer);

        if (!Number.isFinite(displayPoint?.[0]) || !Number.isFinite(displayPoint?.[1])) {
            return null;
        }

        return {
            x: quantizeDisplayCoordinate(displayPoint[0] / dpr),
            y: quantizeDisplayCoordinate((viewportSize[1] - displayPoint[1]) / dpr),
            z: displayPoint[2],
            width: containerWidth,
            height: containerHeight,
            dpr,
            viewportHeight: viewportSize[1],
            frameCurrent,
        };
    }, []);

    const getAxisSourceDimensions = useCallback((axisName) => {
        if (!imageData) {
            return {
                width: Math.max(1, viewerSize.width || 1),
                height: Math.max(1, viewerSize.height || 1),
            };
        }

        const dims = imageData.getDimensions();
        if (axisName === 'axial') {
            return { width: Math.max(1, dims[0] || 1), height: Math.max(1, dims[1] || 1) };
        }
        if (axisName === 'coronal') {
            return { width: Math.max(1, dims[0] || 1), height: Math.max(1, dims[2] || 1) };
        }
        return { width: Math.max(1, dims[1] || 1), height: Math.max(1, dims[2] || 1) };
    }, [imageData, viewerSize.height, viewerSize.width]);

    const getSliceWorldCorners = useCallback((axisName, currentSliceIndex) => {
        if (!imageData) return null;

        const dims = imageData.getDimensions();
        const spacing = imageData.getSpacing();
        const origin = imageData.getOrigin();

        const maxI = Math.max((dims[0] || 1) - 1, 0);
        const maxJ = Math.max((dims[1] || 1) - 1, 0);
        const maxK = Math.max((dims[2] || 1) - 1, 0);

        const coord = (index, axisIndex) => origin[axisIndex] + (index * spacing[axisIndex]);

        if (axisName === 'axial') {
            const k = clamp(currentSliceIndex, 0, maxK);
            const z = coord(k, 2);
            const x0 = coord(0, 0);
            const x1 = coord(maxI, 0);
            const y0 = coord(0, 1);
            const y1 = coord(maxJ, 1);
            return [
                [x0, y0, z],
                [x1, y0, z],
                [x1, y1, z],
                [x0, y1, z],
            ];
        }

        if (axisName === 'coronal') {
            const j = clamp(currentSliceIndex, 0, maxJ);
            const y = coord(j, 1);
            const x0 = coord(0, 0);
            const x1 = coord(maxI, 0);
            const z0 = coord(0, 2);
            const z1 = coord(maxK, 2);
            return [
                [x0, y, z0],
                [x1, y, z0],
                [x1, y, z1],
                [x0, y, z1],
            ];
        }

        const i = clamp(currentSliceIndex, 0, maxI);
        const x = coord(i, 0);
        const y0 = coord(0, 1);
        const y1 = coord(maxJ, 1);
        const z0 = coord(0, 2);
        const z1 = coord(maxK, 2);
        return [
            [x, y0, z0],
            [x, y1, z0],
            [x, y1, z1],
            [x, y0, z1],
        ];
    }, [imageData]);

    const getAnnotationProjectionForPane = useCallback((axisName, currentSliceIndex, paneSize) => {
        const ctx = getPaneContext(axisName);
        if (!ctx) return null;

        const corners = getSliceWorldCorners(axisName, currentSliceIndex);
        if (!corners || corners.length < 4) return null;

        const projectedCorners = corners
            .map((corner) => getPaneDisplayPosition(ctx, corner))
            .filter(Boolean);

        const fallbackWidth = Math.max(1, paneSize?.width || ctx.container?.clientWidth || viewerSize.width || 1);
        const fallbackHeight = Math.max(1, paneSize?.height || ctx.container?.clientHeight || viewerSize.height || 1);
        const imageBounds = buildProjectedImageBounds({
            projectedCorners,
            viewportWidth: fallbackWidth,
            viewportHeight: fallbackHeight,
        });
        if (!imageBounds) return null;
        const sourceSize = getAxisSourceDimensions(axisName);

        return {
            sourceWidth: sourceSize.width,
            sourceHeight: sourceSize.height,
            viewportSize: {
                width: fallbackWidth,
                height: fallbackHeight,
            },
            imageBounds,
        };
    }, [getAxisSourceDimensions, getPaneContext, getPaneDisplayPosition, getSliceWorldCorners, viewerSize.height, viewerSize.width]);

    const syncMeasurementLabelForAxis = useCallback((axisName) => {
        const ctx = getPaneContext(axisName);
        const items = measurementStoreRef.current[axisName] || [];

        if (!ctx || items.length === 0) {
            setMeasurementLabels((current) => ({ ...current, [axisName]: [] }));
            return;
        }

        const nextLabels = items.map((item) => {
            if (item.type === 'distance') {
                const handle1 = item.factory.getWidgetState().getHandle1().getOrigin();
                const handle2 = item.factory.getWidgetState().getHandle2().getOrigin();
                if (!handle1 || !handle2) return null;

                const midpoint = [
                    (handle1[0] + handle2[0]) / 2,
                    (handle1[1] + handle2[1]) / 2,
                    (handle1[2] + handle2[2]) / 2,
                ];
                const position = getPaneDisplayPosition(ctx, midpoint);
                if (!position) return null;

                return {
                    id: item.id,
                    text: `${item.factory.getDistance().toFixed(2)} mm`,
                    x: position.x,
                    y: position.y,
                };
            }

            const handles = item.factory.getWidgetState().getHandleList();
            if (!handles || handles.length < 3) return null;

            const origins = handles.slice(0, 3).map((handle) => handle.getOrigin());
            if (origins.some((origin) => !origin)) return null;

            const centroid = origins.reduce(
                (accumulator, point) => [accumulator[0] + point[0], accumulator[1] + point[1], accumulator[2] + point[2]],
                [0, 0, 0]
            ).map((value) => value / 3);
            const position = getPaneDisplayPosition(ctx, centroid);
            if (!position) return null;

            return {
                id: item.id,
                text: `${(item.factory.getAngle() * 180 / Math.PI).toFixed(1)}°`,
                x: position.x,
                y: position.y,
            };
        }).filter(Boolean);

        setMeasurementLabels((current) => ({ ...current, [axisName]: nextLabels }));
    }, [getPaneContext, getPaneDisplayPosition]);

    const syncAllMeasurementLabels = useCallback(() => {
        AXIS_ORDER.forEach((axisName) => syncMeasurementLabelForAxis(axisName));
    }, [syncMeasurementLabelForAxis]);

    const removeMeasurementsForAxis = useCallback((axisName, paneContext = null) => {
        const ctx = paneContext || getPaneContext(axisName);
        const items = measurementStoreRef.current[axisName] || [];

        if (items.length === 0) {
            setMeasurementLabels((current) => ({ ...current, [axisName]: [] }));
            return;
        }

        items.forEach((item) => {
            try { item.subscription?.unsubscribe?.(); } catch (_) {}
            try { ctx?.widgetManager?.removeWidget?.(item.viewWidget || item.factory); } catch (_) {}
            try { item.factory?.delete?.(); } catch (_) {}
        });

        if (!ctx && items.length > 0) {
            console.debug('[SliceViewer] Measurement cleanup ran without pane context:', axisName, items.length);
        }

        measurementStoreRef.current[axisName] = [];
        setMeasurementLabels((current) => ({ ...current, [axisName]: [] }));
    }, [getPaneContext]);

    const clearAllMeasurements = useCallback(() => {
        AXIS_ORDER.forEach((axisName) => removeMeasurementsForAxis(axisName));
    }, [removeMeasurementsForAxis]);

    const resetMeasurementState = useCallback(() => {
        measurementStoreRef.current = { axial: [], coronal: [], sagittal: [] };
        setMeasurementLabels(emptyMeasurementLabels());
    }, []);

    const configureWidgetColor = useCallback((factory) => {
        try {
            factory.getWidgetState().getMoveHandle?.().setColor?.(MEASUREMENT_RGB);
            factory.getWidgetState().getHandle1?.().setColor?.(MEASUREMENT_RGB);
            factory.getWidgetState().getHandle2?.().setColor?.(MEASUREMENT_RGB);
            factory.getWidgetState().getHandleList?.().forEach?.((handle) => handle.setColor?.(MEASUREMENT_RGB));
        } catch (_) {}
        try {
            factory.setActiveColor?.(MEASUREMENT_RGB);
            factory.setUseActiveColor?.(true);
            factory.setScaleInPixels?.(true);
            factory.setDefaultScale?.(18);
        } catch (_) {}
    }, []);

    const ensureMeasurementWidget = useCallback((axisName) => {
        if (!measurementMode) return;

        const ctx = getPaneContext(axisName);
        if (!ctx?.widgetManager || ctx.widgetManager.getActiveWidget?.()) return;

        const factory = measurementTool === 'angle'
            ? vtkAngleWidget.newInstance()
            : vtkLineWidget.newInstance();
        const viewWidget = ctx.widgetManager.addWidget(factory);

        configureWidgetColor(factory);
        factory.placeWidget?.(ctx.imageData.getBounds());
        ctx.widgetManager.grabFocus(viewWidget);

        const item = {
            id: `${axisName}-${measurementTool}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            type: measurementTool,
            sliceIndex: sliceIndices[axisName] ?? sliceIndex,
            factory,
            viewWidget,
        };

        item.subscription = factory.onWidgetChangeEvent(() => {
            syncMeasurementLabelForAxis(axisName);
            setMeasurementRevision((value) => value + 1);
        });

        measurementStoreRef.current[axisName] = [
            ...(measurementStoreRef.current[axisName] || []),
            item,
        ];
        setMeasurementRevision((value) => value + 1);
        ctx.renderWindow.render();
    }, [configureWidgetColor, getPaneContext, measurementMode, measurementTool, sliceIndex, sliceIndices, syncMeasurementLabelForAxis]);

    const addPersistedMeasurementWidget = useCallback((spec) => {
        const ctx = getPaneContext(spec.axis);
        if (!ctx?.widgetManager || !ctx?.imageData) return false;

        const factory = spec.type === 'angle'
            ? vtkAngleWidget.newInstance()
            : vtkLineWidget.newInstance();
        const viewWidget = ctx.widgetManager.addWidget(factory);
        configureWidgetColor(factory);
        factory.placeWidget?.(ctx.imageData.getBounds());

        try {
            if (spec.type === 'angle') {
                const handles = factory.getWidgetState?.()?.getHandleList?.();
                if (Array.isArray(handles)) {
                    spec.worldPoints?.slice(0, 3).forEach((point, index) => {
                        handles[index]?.setOrigin?.(point);
                    });
                }
            } else {
                const state = factory.getWidgetState?.();
                state?.getHandle1?.()?.setOrigin?.(spec.worldStart);
                state?.getHandle2?.()?.setOrigin?.(spec.worldEnd);
                state?.getMoveHandle?.()?.setOrigin?.([
                    (spec.worldStart[0] + spec.worldEnd[0]) / 2,
                    (spec.worldStart[1] + spec.worldEnd[1]) / 2,
                    (spec.worldStart[2] + spec.worldEnd[2]) / 2,
                ]);
            }
        } catch (error) {
            console.warn('[SliceViewer] Failed to restore persisted measurement widget:', error);
            try { ctx.widgetManager.removeWidget?.(viewWidget || factory); } catch (_) {}
            try { factory.delete?.(); } catch (_) {}
            return false;
        }

        const item = {
            id: spec.id,
            type: spec.type,
            sliceIndex: spec.sliceIndex,
            factory,
            viewWidget,
            label: spec.label,
            metadata: spec.metadata,
        };
        item.subscription = factory.onWidgetChangeEvent(() => {
            syncMeasurementLabelForAxis(spec.axis);
            setMeasurementRevision((value) => value + 1);
        });

        measurementStoreRef.current[spec.axis] = [
            ...(measurementStoreRef.current[spec.axis] || []),
            item,
        ];
        syncMeasurementLabelForAxis(spec.axis);
        ctx.renderWindow.render();
        return true;
    }, [configureWidgetColor, getPaneContext, syncMeasurementLabelForAxis]);

    const restoreSliceMeasurementRecords = useCallback((records) => {
        const specs = (records || []).map(sliceMeasurementSpecFromRecord).filter(Boolean);
        pendingMeasurementRecordsRef.current = [];
        AXIS_ORDER.forEach((axisName) => removeMeasurementsForAxis(axisName));

        if (!specs.length) {
            setMeasurementRevision((value) => value + 1);
            return;
        }

        const deferred = specs.filter((spec) => !addPersistedMeasurementWidget(spec));
        pendingMeasurementRecordsRef.current = deferred;
        setMeasurementRevision((value) => value + 1);
    }, [addPersistedMeasurementWidget, removeMeasurementsForAxis]);

    hydrateClinicalRecordsRef.current = restoreSliceMeasurementRecords;

    useEffect(() => {
        if (!pendingMeasurementRecordsRef.current.length || !imageData) return;
        const frameId = window.requestAnimationFrame(() => {
            const pending = pendingMeasurementRecordsRef.current;
            pendingMeasurementRecordsRef.current = [];
            const deferred = pending.filter((spec) => !addPersistedMeasurementWidget(spec));
            pendingMeasurementRecordsRef.current = deferred;
            if (pending.length !== deferred.length) {
                setMeasurementRevision((value) => value + 1);
            }
        });
        return () => window.cancelAnimationFrame(frameId);
    }, [addPersistedMeasurementWidget, axis, imageData, quadView]);

    useEffect(() => {
        if (!measurementMode || !imageData) return undefined;

        const frameId = window.requestAnimationFrame(() => {
            if (quadView) {
                AXIS_ORDER.forEach((axisName) => ensureMeasurementWidget(axisName));
            } else {
                ensureMeasurementWidget(axis);
            }
        });

        return () => window.cancelAnimationFrame(frameId);
    }, [axis, ensureMeasurementWidget, imageData, measurementMode, measurementTool, quadView]);

    const currentWorldPoint = useMemo(() => {
        if (!imageData) return null;
        return imageData.indexToWorld([
            sliceIndices.sagittal,
            sliceIndices.coronal,
            sliceIndices.axial,
        ]);
    }, [imageData, sliceIndices]);

    const syncQuadCrosshairs = useCallback(() => {
        if (!quadView || !currentWorldPoint) {
            setQuadCrosshairPositions({});
            return;
        }

        const nextPositions = {};
        AXIS_ORDER.forEach((axisName) => {
            const ctx = quadRefs.current[axisName];
            const position = getPaneDisplayPosition(ctx, currentWorldPoint);
            if (position) {
                nextPositions[axisName] = position;
            }
        });
        setQuadCrosshairPositions(nextPositions);
    }, [currentWorldPoint, getPaneDisplayPosition, quadView]);

    const setSliceForAxis = useCallback((axisName, nextValue) => {
        setSliceIndices((current) => {
            const maxForAxis = Math.max((dimensions[AXIS[axisName].dimIndex] || 1) - 1, 0);
            const rawValue = typeof nextValue === 'function' ? nextValue(current[axisName] ?? 0) : nextValue;
            const clamped = clamp(rawValue, 0, maxForAxis);

            if (current[axisName] === clamped) {
                return current;
            }

            return {
                ...current,
                [axisName]: clamped,
            };
        });
        scheduleProjectionRefresh();
    }, [dimensions, scheduleProjectionRefresh]);

    const syncSlicesFromWorldPoint = useCallback((sourceAxis, worldPoint) => {
        if (!imageData || !worldPoint) return;

        const dims = imageData.getDimensions();
        const indexPoint = imageData.worldToIndex(worldPoint);

        if (!Array.isArray(indexPoint) || indexPoint.some((value) => !Number.isFinite(value))) {
            return;
        }

        setProjectionReady(false);
        setSliceIndices((current) => {
            const nextIndices = computeSyncedSliceIndices({
                sourceAxis,
                currentIndices: current,
                worldIndexPoint: indexPoint,
                dimensions: dims,
            });

            if (
                nextIndices.axial === current.axial
                && nextIndices.coronal === current.coronal
                && nextIndices.sagittal === current.sagittal
            ) {
                return current;
            }

            return nextIndices;
        });
        scheduleProjectionRefresh();
    }, [imageData, scheduleProjectionRefresh]);

    useEffect(() => {
        const handleMprCrosshairSync = (event) => {
            const point = event?.detail?.worldPoint;
            if (!Array.isArray(point) || point.length !== 3) return;
            syncSlicesFromWorldPoint('3d', point);
        };
        window.addEventListener('xcore:mpr_crosshair_sync', handleMprCrosshairSync);
        return () => window.removeEventListener('xcore:mpr_crosshair_sync', handleMprCrosshairSync);
    }, [syncSlicesFromWorldPoint]);

    const handleUndoMeasurement = useCallback(() => {
        const axisPriority = [axis, ...AXIS_ORDER.filter((axisName) => axisName !== axis)];
        const targetAxis = axisPriority.find((axisName) => (measurementStoreRef.current[axisName] || []).length > 0);
        if (!targetAxis) return;

        const items = measurementStoreRef.current[targetAxis];
        const lastItem = items[items.length - 1];
        const ctx = getPaneContext(targetAxis);

        try { lastItem?.subscription?.unsubscribe?.(); } catch (_) {}
        try { ctx?.widgetManager?.removeWidget?.(lastItem?.viewWidget || lastItem?.factory); } catch (_) {}
        try { lastItem?.factory?.delete?.(); } catch (_) {}

        measurementStoreRef.current[targetAxis] = items.slice(0, -1);
        syncMeasurementLabelForAxis(targetAxis);
        ctx?.renderWindow?.render?.();
    }, [axis, getPaneContext, syncMeasurementLabelForAxis]);

    const handleUndoAnnotation = useCallback(() => {
        undoAnnotationsState();
    }, [undoAnnotationsState]);

    const handleRedoAnnotation = useCallback(() => {
        redoAnnotationsState();
    }, [redoAnnotationsState]);

    const handleAxisAnnotationsChange = useCallback((axisName, currentSliceIndex, nextVisibleAnnotations) => {
        const currentVisible = getCurrentSliceAnnotationsForAxis(axisName, currentSliceIndex);
        const visibleIds = new Set(currentVisible.map((annotation) => annotation.id));
        const sourceSize = getAxisSourceDimensions(axisName);
        const sliceClinicalContext = normalizeSliceClinicalContext({
            sliceAxis: axisName,
            sliceIndex: currentSliceIndex,
            sliceCount: dimensions[AXIS[axisName].dimIndex] || null,
        });
        const scopedNext = nextVisibleAnnotations.map((annotation) => ({
            ...annotation,
            displayOpacity: undefined,
            slice_axis: axisName,
            slice_index: currentSliceIndex,
            viewer_type: 'slice',
            series_uid: annotation.series_uid || seriesUid,
            metadata: {
                ...(annotation.metadata || {}),
                source_width: annotation.metadata?.source_width || sourceSize.width,
                source_height: annotation.metadata?.source_height || sourceSize.height,
                ...(sliceClinicalContext || {}),
            },
        }));

        pushAnnotationsState((current) => [
            ...current.filter((annotation) => !visibleIds.has(annotation.id)),
            ...scopedNext,
        ]);
    }, [dimensions, getAxisSourceDimensions, getCurrentSliceAnnotationsForAxis, pushAnnotationsState, seriesUid]);

    const handleVisibleAnnotationsChange = useCallback((nextVisibleAnnotations) => {
        handleAxisAnnotationsChange(axis, sliceIndex, nextVisibleAnnotations);
    }, [axis, handleAxisAnnotationsChange, sliceIndex]);

    const handleExportAnnotationsJson = useCallback(() => {
        exportAnnotationsJson(annotations, metadata, {
            patientName,
            studyId: study?.id,
            studyKey,
            seriesUid,
            viewerType: 'slice',
        });
    }, [annotations, metadata, patientName, seriesUid, study?.id, studyKey]);

    const buildSessionAnnotations = useCallback(() => annotations.map((annotation) => normalizeAnnotationForPersistence(annotation, {
        seriesUid,
        viewerType: 'slice',
        sourceWidth: viewerSize.width,
        sourceHeight: viewerSize.height,
    })), [annotations, seriesUid, viewerSize.height, viewerSize.width]);

    const buildSessionFeatureState = useCallback(() => ({
        viewer_type: 'slice',
        axis,
        slice_index: sliceIndex,
        slice_indices: sliceIndices,
        measurement_labels: measurementLabels,
        dimensions,
        spacing,
    }), [axis, dimensions, measurementLabels, sliceIndex, sliceIndices, spacing]);

    const refreshSnapshots = useCallback(async () => {
        if (!seriesUid) return;
        setSnapshotsLoading(true);
        const localItems = loadLocalAnnotationSessions(sessionScope);
        let serverItems = [];

        if (canUseBackendSessions) {
            try {
                serverItems = await loadAnnotationSnapshots(study.id, { seriesUid });
            } catch (error) {
                console.warn('[SliceViewer] Failed to load backend annotation snapshots:', error);
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
                console.warn('[SliceViewer] Backend session snapshot failed; local snapshot kept:', error);
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
            console.warn('[SliceViewer] Failed to save annotation session:', error);
            setSessionError(error.message || 'Failed to save annotation session');
        } finally {
            setSessionSaving(false);
        }
    }, [persistAnnotationSession]);

    const handleStartNewSession = useCallback(async ({ note = '', saveBeforeClear = true } = {}) => {
        try {
            setSessionSaving(true);
            setSessionError('');
            const hasWork = annotations.length > 0 || measurementCount > 0;
            if (saveBeforeClear && hasWork) {
                await persistAnnotationSession({ note, source: 'new-session' });
            }
            replaceAnnotationsState([]);
            clearAllMeasurements();
            setSnapshotOverlay(null);
            setAnnotateMode(false);
            setMeasurementMode(false);
            setSessionModalMode(null);
            setHistoryOpen(true);
            await refreshSnapshots();
        } catch (error) {
            console.warn('[SliceViewer] Failed to start new annotation session:', error);
            setSessionError(error.message || 'Failed to start new session');
        } finally {
            setSessionSaving(false);
        }
    }, [annotations.length, clearAllMeasurements, measurementCount, persistAnnotationSession, refreshSnapshots, replaceAnnotationsState]);

    const handleRestoreAnnotationSession = useCallback((snapshot) => {
        const nextAnnotations = (snapshot?.annotations || []).map((annotation) => normalizeAnnotationForPersistence(annotation, {
            seriesUid,
            viewerType: 'slice',
            sourceWidth: viewerSize.width,
            sourceHeight: viewerSize.height,
        }));
        const featureState = snapshot?.feature_state || snapshot?.featureState || {};
        replaceAnnotationsState(nextAnnotations);
        setSnapshotOverlay(null);
        if (featureState.axis && AXIS[featureState.axis]) {
            setAxis(featureState.axis);
        }
        if (Number.isInteger(featureState.slice_index)) {
            const nextAxis = featureState.axis && AXIS[featureState.axis] ? featureState.axis : axis;
            setSliceIndex(featureState.slice_index);
            setSliceIndices((current) => ({
                ...current,
                [nextAxis]: featureState.slice_index,
            }));
        }
        if (featureState.slice_indices && typeof featureState.slice_indices === 'object') {
            setSliceIndices((current) => ({
                ...current,
                ...featureState.slice_indices,
            }));
        }
        setHistoryOpen(false);
        scheduleProjectionRefresh();
    }, [axis, replaceAnnotationsState, scheduleProjectionRefresh, seriesUid, viewerSize.height, viewerSize.width]);

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
            console.warn('[SliceViewer] Failed to delete annotation session:', error);
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
            console.warn('[SliceViewer] Failed to update annotation review:', error);
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
                viewerType: 'slice',
                reviewStatus: 'submitted',
            });
        } catch (error) {
            console.warn('[SliceViewer] Failed to submit annotations:', error);
        }
    }, [annotations, pushAnnotationsState, seriesUid, study?.id]);

    useEffect(() => {
        if (historyOpen) {
            refreshSnapshots();
        }
    }, [historyOpen, refreshSnapshots]);

    useEffect(() => {
        if (!showMoreTools) return undefined;

        const handlePointerDown = (event) => {
            if (!moreToolsMenuRef.current?.contains(event.target)) {
                setShowMoreTools(false);
            }
        };

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                setShowMoreTools(false);
            }
        };

        document.addEventListener('pointerdown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [showMoreTools]);

    const handleQuadPaneClick = useCallback((axisName, event) => {
        if (!imageData || !currentWorldPoint || event.button !== 0) return;

        const ctx = quadRefs.current[axisName];
        if (!ctx?.container || !ctx.apiSpecificRenderWindow) return;

        const rect = ctx.container.getBoundingClientRect();
        const currentPosition = getPaneDisplayPosition(ctx, currentWorldPoint);
        if (!currentPosition) return;

        const cssX = event.clientX - rect.left;
        const cssY = event.clientY - rect.top;
        const displayX = cssX * currentPosition.dpr;
        const displayY = currentPosition.viewportHeight - (cssY * currentPosition.dpr);

        const worldPoint = ctx.apiSpecificRenderWindow.displayToWorld(
            displayX,
            displayY,
            currentPosition.z,
            ctx.renderer
        );

        syncSlicesFromWorldPoint(axisName, worldPoint);
    }, [currentWorldPoint, getPaneDisplayPosition, imageData, syncSlicesFromWorldPoint]);

    const switchAxis = useCallback((nextAxis) => {
        if (quadView || nextAxis === axis) return;
        setProjectionReady(false);
        removeMeasurementsForAxis(axis);
        setAxis(nextAxis);
    }, [axis, quadView, removeMeasurementsForAxis]);

    const goToSlice = useCallback((indexValue) => {
        setSliceForAxis(axis, indexValue);
    }, [axis, setSliceForAxis]);

    const handleSingleWheel = useCallback((event) => {
        event.preventDefault();
        event.stopPropagation();
        const delta = event.deltaY > 0 ? 1 : -1;
        setSliceForAxis(axis, (current) => current + delta);
    }, [axis, setSliceForAxis]);

    const updateWindowLevelFromDrag = useCallback((event, dragState) => {
        const dx = event.clientX - dragState.startX;
        const dy = event.clientY - dragState.startY;
        setWlPreset('custom');
        setWindowCenter(clamp(dragState.startCenter - (dy * WL_DRAG_SENSITIVITY), 0, 1));
        setWindowWidth(clamp(dragState.startWidth + (dx * WL_DRAG_SENSITIVITY), 0.05, 2.0));
    }, []);

    const startWindowLevelDrag = useCallback((event) => {
        if (event.button !== 2 || loading || error) return false;
        event.preventDefault();
        event.stopPropagation();
        setWindowLevelDrag({
            startX: event.clientX,
            startY: event.clientY,
            startCenter: windowCenter,
            startWidth: windowWidth,
        });
        return true;
    }, [error, loading, windowCenter, windowWidth]);

    const selectWlPreset = useCallback((key) => {
        if (!WL_LUTS[key]) return;
        setWlPreset(key);
        setWindowCenter(DEFAULT_WINDOW_LEVEL.center);
        setWindowWidth(DEFAULT_WINDOW_LEVEL.width);
    }, []);

    const selectWlShortcutPreset = useCallback((key) => {
        const shortcutPreset = SLICE_WL_SHORTCUT_PRESETS[key];
        if (!shortcutPreset) return false;

        if (shortcutPreset.lut) {
            selectWlPreset(shortcutPreset.lut);
            return true;
        }

        setWlPreset('custom');
        setWindowCenter(shortcutPreset.center);
        setWindowWidth(shortcutPreset.width);
        return true;
    }, [selectWlPreset]);

    const toggleFullscreen = useCallback(() => {
        if (passedToggleFullscreen) {
            passedToggleFullscreen();
            return;
        }

        if (!document.fullscreenElement && wrapperRef.current) {
            wrapperRef.current.requestFullscreen().catch(() => {});
            return;
        }

        if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
        }
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
            const isRedoShortcut = (event.ctrlKey || event.metaKey)
                && ((key === 'z' && event.shiftKey) || key === 'y');
            if (isUndoShortcut || isRedoShortcut) {
                if (!measurementMode && !annotateMode) return;
                event.preventDefault();
                if (annotateMode) {
                    if (isRedoShortcut) {
                        handleRedoAnnotation();
                    } else {
                        handleUndoAnnotation();
                    }
                } else if (isUndoShortcut) {
                    handleUndoMeasurement();
                }
                return;
            }

            if (['arrowup', 'arrowleft'].includes(key)) {
                event.preventDefault();
                goToSlice((current) => current - 1);
            } else if (['arrowdown', 'arrowright'].includes(key)) {
                event.preventDefault();
                goToSlice((current) => current + 1);
            } else if (key === 'a') {
                event.preventDefault();
                switchAxis('axial');
            } else if (key === 'c') {
                event.preventDefault();
                switchAxis('coronal');
            } else if (key === 's') {
                event.preventDefault();
                switchAxis('sagittal');
            } else if (key === 'i') {
                event.preventDefault();
                setInverted((current) => !current);
            } else if (selectWlShortcutPreset(key)) {
                event.preventDefault();
            } else if (key === 'f') {
                event.preventDefault();
                toggleFullscreen();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [annotateMode, goToSlice, handleRedoAnnotation, handleUndoAnnotation, handleUndoMeasurement, measurementMode, selectWlShortcutPreset, switchAxis, toggleFullscreen]);

    const handleToggleQuadView = useCallback(() => {
        clearAllMeasurements();
        setProjectionReady(false);
        if (quadView) {
            setAxis('axial');
        }
        setQuadView((current) => !current);
    }, [clearAllMeasurements, quadView]);

    const captureCurrentViewDataUrl = useCallback(async (forcedAnnotations) => {
        const viewerArea = viewerAreaRef.current;
        if (!viewerArea || loading || error) return null;

        const viewportWidth = viewerArea.clientWidth;
        const viewportHeight = viewerArea.clientHeight;
        if (!viewportWidth || !viewportHeight) return null;
        const physicalDimensions = quadView
            ? { width: 4, height: 3 }
            : axis === 'axial'
                ? { width: (dimensions?.[0] || 1) * (spacing?.[0] || 1), height: (dimensions?.[1] || 1) * (spacing?.[1] || 1) }
                : axis === 'coronal'
                    ? { width: (dimensions?.[0] || 1) * (spacing?.[0] || 1), height: (dimensions?.[2] || 1) * (spacing?.[2] || 1) }
                    : { width: (dimensions?.[1] || 1) * (spacing?.[1] || 1), height: (dimensions?.[2] || 1) * (spacing?.[2] || 1) };
        const canonical = canonicalRenderDimensions(physicalDimensions.width * 512, physicalDimensions.height * 512, 2048);
        const width = canonical.width;
        const height = canonical.height;

        const capturePaneImage = async (paneContext) => {
            if (!paneContext?.renderWindow?.captureImages) return null;
            try {
                const captures = paneContext.renderWindow.captureImages('image/png', {
                    scale: Math.max(1, Math.min(3, width / Math.max(viewportWidth, 1))),
                });
                if (!Array.isArray(captures) || captures.length === 0) return null;
                const dataUrl = await captures[0];
                return typeof dataUrl === 'string' && dataUrl.startsWith('data:image') ? dataUrl : null;
            } catch (captureError) {
                console.warn('[SliceViewer] Failed to capture VTK pane image:', captureError);
                return null;
            }
        };

        const loadImageFromDataUrl = (dataUrl) => new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = () => reject(new Error('Unable to decode captured pane image'));
            image.src = dataUrl;
        });

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, width, height);
        let cleanDataUrl = null;

        if (quadView) {
            const paneContexts = {
                axial: quadRefs.current.axial,
                coronal: quadRefs.current.coronal,
                sagittal: quadRefs.current.sagittal,
                volume: quadRefs.current.volume,
            };

            const capturedImages = await Promise.all([
                capturePaneImage(paneContexts.axial),
                capturePaneImage(paneContexts.coronal),
                capturePaneImage(paneContexts.sagittal),
                capturePaneImage(paneContexts.volume),
            ]);

            if (capturedImages.some((value) => !value)) {
                return null;
            }

            let decodedImages;
            try {
                decodedImages = await Promise.all(capturedImages.map((dataUrl) => loadImageFromDataUrl(dataUrl)));
            } catch (decodeError) {
                console.warn('[SliceViewer] Failed to decode captured pane images:', decodeError);
                return null;
            }

            const panePadding = 1;
            const paneGap = 1;
            const paneWidth = (width - (panePadding * 2) - paneGap) / 2;
            const paneHeight = (height - (panePadding * 2) - paneGap) / 2;
            const paneLayout = {
                axial: { x: panePadding, y: panePadding, width: paneWidth, height: paneHeight },
                coronal: { x: panePadding + paneWidth + paneGap, y: panePadding, width: paneWidth, height: paneHeight },
                sagittal: { x: panePadding, y: panePadding + paneHeight + paneGap, width: paneWidth, height: paneHeight },
                volume: { x: panePadding + paneWidth + paneGap, y: panePadding + paneHeight + paneGap, width: paneWidth, height: paneHeight },
            };

            ctx.drawImage(decodedImages[0], paneLayout.axial.x, paneLayout.axial.y, paneLayout.axial.width, paneLayout.axial.height);
            ctx.drawImage(decodedImages[1], paneLayout.coronal.x, paneLayout.coronal.y, paneLayout.coronal.width, paneLayout.coronal.height);
            ctx.drawImage(decodedImages[2], paneLayout.sagittal.x, paneLayout.sagittal.y, paneLayout.sagittal.width, paneLayout.sagittal.height);
            ctx.drawImage(decodedImages[3], paneLayout.volume.x, paneLayout.volume.y, paneLayout.volume.width, paneLayout.volume.height);
            cleanDataUrl = canvas.toDataURL('image/png');

            AXIS_ORDER.forEach((axisName) => {
                const position = quadCrosshairPositions[axisName];
                const pane = paneLayout[axisName];
                if (!pane) return;
                if (!position) return;
                const colors = CROSSHAIR_COLORS[axisName];
                const x = pane.x + ((position.x / Math.max(viewportWidth / 2, 1)) * pane.width);
                const y = pane.y + ((position.y / Math.max(viewportHeight / 2, 1)) * pane.height);

                ctx.save();
                ctx.strokeStyle = colors.vertical;
                ctx.lineWidth = 1.5;
                ctx.setLineDash([4, 4]);
                ctx.beginPath();
                ctx.moveTo(x, pane.y);
                ctx.lineTo(x, pane.y + pane.height);
                ctx.stroke();

                ctx.strokeStyle = colors.horizontal;
                ctx.beginPath();
                ctx.moveTo(pane.x, y);
                ctx.lineTo(pane.x + pane.width, y);
                ctx.stroke();

                ctx.setLineDash([]);
                ctx.fillStyle = '#ffffff';
                ctx.strokeStyle = AXIS[axisName].colorHex;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(x, y, 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                ctx.restore();
            });

            AXIS_ORDER.forEach((axisName) => {
                const pane = paneLayout[axisName];
                if (!pane) return;
                (measurementLabels[axisName] || []).forEach((label) => {
                    ctx.save();
                    ctx.translate(pane.x, pane.y);
                    drawMeasurementPillToCanvas(ctx, label);
                    ctx.restore();
                });
            });
        } else {
            const singlePaneDataUrl = await capturePaneImage(getPaneContext(axis) || vtkRef.current);
            if (!singlePaneDataUrl) return null;

            let singlePaneImage;
            try {
                singlePaneImage = await loadImageFromDataUrl(singlePaneDataUrl);
            } catch (decodeError) {
                console.warn('[SliceViewer] Failed to decode captured image:', decodeError);
                return null;
            }

            const scaleToFit = Math.min(width / singlePaneImage.naturalWidth, height / singlePaneImage.naturalHeight);
            const drawWidth = singlePaneImage.naturalWidth * scaleToFit;
            const drawHeight = singlePaneImage.naturalHeight * scaleToFit;
            ctx.drawImage(singlePaneImage, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
            cleanDataUrl = canvas.toDataURL('image/png');
            (measurementLabels[axis] || []).forEach((label) => drawMeasurementPillToCanvas(ctx, label));
        }

        const activeAnnotations = forcedAnnotations || annotations;
        const activeVisibleAnnotations = activeAnnotations.filter((a) => (!a.slice_axis || a.slice_axis === axis) && (a.slice_index == null || a.slice_index === sliceIndex));

        if (activeVisibleAnnotations.length > 0) {
            drawAnnotations(ctx, activeVisibleAnnotations, width, height);
        }
        const findings = analysisCaseContext?.structuredFindings || analysisCaseContext?.structured_findings || [];
        const markerAnnotations = [...activeVisibleAnnotations, ...measurementClinicalRecords];
        const placements = markerPlacements(findings, markerAnnotations, width, height, 1, width, height);
        drawFindingMarkers(ctx, placements);
        const renderedAt = new Date().toISOString();
        const commonMetadata = {
            report_render_version: 2,
            case_item_id: analysisCaseContext?.itemId,
            study_id: String(study?.id),
            series_uid: seriesUid,
            viewer_type: 'slice',
            source_width: width,
            source_height: height,
            render_width: width,
            render_height: height,
            window_center: windowCenter,
            window_width: windowWidth,
            invert: inverted,
            rotation: 0,
            slice_index: sliceIndex,
            slice_axis: axis,
            view_mode: quadView ? 'quad' : 'single',
            pixel_spacing: spacing,
            rendered_at: renderedAt,
            annotation_revision: activeAnnotations.map((entry) => `${entry.id}:${entry.updated_at || entry.created_at || ''}`).join('|'),
        };
        return {
            CLEAN: { data_url: cleanDataUrl, metadata: { ...commonMetadata, render_type: 'CLEAN', marker_count: 0 } },
            ANNOTATED: {
                data_url: canvas.toDataURL('image/png'),
                metadata: { ...commonMetadata, render_type: 'ANNOTATED', marker_count: placements.length },
            },
            marker_placements: placements,
        };
    }, [
        analysisCaseContext,
        annotations,
        axis,
        dimensions,
        error,
        getPaneContext,
        inverted,
        loading,
        measurementClinicalRecords,
        measurementLabels,
        quadCrosshairPositions,
        quadView,
        seriesUid,
        sliceIndex,
        spacing,
        study?.id,
        windowCenter,
        windowWidth,
    ]);

    const handleExportReport = useCallback(async (formValues) => {
        try {
            setExportingReport(true);
            setReportWarningMessage('');
            const screenshotRender = formValues.includeScreenshot
                ? await captureCurrentViewDataUrl()
                : null;
            const screenshotDataUrl = screenshotRender?.ANNOTATED?.data_url || null;

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

            if (formValues.includeScreenshot && !screenshotDataUrl) {
                setReportWarningMessage('Screenshot could not be captured on this browser. The report will be exported without an image.');
            } else {
                setReportModalOpen(false);
            }
        } catch (reportError) {
            console.error('[SliceViewer] Report export failed:', reportError);
        } finally {
            setExportingReport(false);
        }
    }, [annotations, captureCurrentViewDataUrl, clinicName, metadata]);

    const captureForAnalysisCase = useCallback(async () => {
        if (!onCaptureForCase) return;
        // Race-condition guard: skip if a capture is already in flight
        if (captureInProgressRef.current) {
            console.warn('[SliceViewer] captureForAnalysisCase skipped: capture already in progress');
            return;
        }
        captureInProgressRef.current = true;
        setCaseCaptureState('saving');
        setCaseCaptureError('');
        try {
            try {
                await annotationPersistence.flushPendingSave();
            } catch (flushError) {
                console.warn('[SliceViewer] flushPendingSave failed, proceeding with in-memory annotations:', flushError);
            }
            const renders = await captureCurrentViewDataUrl();
            if (!renders) throw new Error('Viewer belum siap untuk dirender');
            await onCaptureForCase(renders);
            setCaseCaptureState('saved');
        } catch (captureError) {
            console.error('[SliceViewer] Case snapshot failed:', captureError);
            setCaseCaptureState('error');
            setCaseCaptureError(captureError?.message || 'Gambar laporan gagal disimpan.');
        } finally {
            captureInProgressRef.current = false;
        }
    }, [annotationPersistence, captureCurrentViewDataUrl, onCaptureForCase]);
 
    useEffect(() => {
        if (!loading && imageData && analysisCaseContext && onCaptureForCase && caseCaptureState === 'idle') {
            const timer = setTimeout(() => {
                captureForAnalysisCase();
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [loading, imageData, analysisCaseContext, onCaptureForCase, caseCaptureState, captureForAnalysisCase]);

    // Mark render as stale when slice/annotations/filter change.
    // We do NOT auto-retrigger capture — the drg must explicitly update.
    useEffect(() => {
        if (analysisCaseContext && caseCaptureState === 'saved') {
            setCaseCaptureState('stale');
        }
    }, [annotations, measurementRevision, measurementClinicalRecords, inverted, windowCenter, windowWidth, sliceIndex, axis]); // eslint-disable-line react-hooks/exhaustive-deps
 
    const handleBack = useCallback(async () => {
        if (analysisCaseContext && onCaptureForCase && caseCaptureState !== 'saved') {
            try {
                await captureForAnalysisCase();
            } catch (err) {
                console.error('[SliceViewer] Auto-capture on back failed:', err);
            }
        }
        if (typeof onBack === 'function') {
            onBack();
        }
    }, [analysisCaseContext, onCaptureForCase, caseCaptureState, captureForAnalysisCase, onBack]);

    useEffect(() => {
        const onFullscreenChange = () => {
            setLocalIsFullscreen(Boolean(document.fullscreenElement || document.webkitFullscreenElement));
            scheduleProjectionRefresh();
        };
        document.addEventListener('fullscreenchange', onFullscreenChange);
        document.addEventListener('webkitfullscreenchange', onFullscreenChange);
        return () => {
            document.removeEventListener('fullscreenchange', onFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
        };
    }, [scheduleProjectionRefresh]);

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
        setSliceIndex(sliceIndices[axis] ?? 0);
        setMaxSlice(Math.max((dimensions[AXIS[axis].dimIndex] || 1) - 1, 0));
    }, [axis, dimensions, sliceIndices]);

    useEffect(() => {
        if (!comparisonSyncEnabled || comparisonPaneId == null || comparisonSyncGuardRef.current) return;

        const maxForAxis = Math.max((dimensions[AXIS[axis].dimIndex] || 1) - 1, 0);
        const currentIndex = sliceIndices[axis] ?? 0;
        const ratio = maxForAxis > 0 ? currentIndex / maxForAxis : 0;
        const previous = comparisonLastBroadcastRef.current[axis] || { slice: null, ratio: null };
        if (
            previous.slice === currentIndex
            && previous.ratio != null
            && Math.abs(previous.ratio - ratio) < COMPARISON_RATIO_EPSILON
        ) {
            return;
        }

        comparisonLastBroadcastRef.current[axis] = { slice: currentIndex, ratio };

        window.dispatchEvent(new CustomEvent('xcore:comparison-slice', {
            detail: {
                sourcePaneId: comparisonPaneId,
                axis,
                ratio,
                slice: currentIndex,
            },
        }));
    }, [axis, comparisonPaneId, comparisonSyncEnabled, dimensions, sliceIndices]);

    useEffect(() => {
        if (!comparisonSyncEnabled || comparisonPaneId == null) return undefined;

        const handleComparisonSlice = (event) => {
            const detail = event.detail || {};
            if (detail.sourcePaneId === comparisonPaneId || !detail.axis || detail.axis !== axis) return;

            const maxForAxis = Math.max((dimensions[AXIS[axis].dimIndex] || 1) - 1, 0);
            const currentSlice = sliceIndices[axis] ?? 0;
            const hasExplicitSlice = Number.isFinite(detail.slice);
            const hasRatio = Number.isFinite(detail.ratio);
            const ratioValue = hasRatio ? clamp(detail.ratio, 0, 1) : null;
            const nextSlice = hasExplicitSlice
                ? clamp(Math.round(detail.slice), 0, maxForAxis)
                : hasRatio
                    ? clamp(Math.round(ratioValue * maxForAxis), 0, maxForAxis)
                    : null;

            if (nextSlice == null || nextSlice === currentSlice) return;

            comparisonSyncGuardRef.current = true;

            if (comparisonSyncGuardFrameRef.current != null) {
                window.cancelAnimationFrame(comparisonSyncGuardFrameRef.current);
            }

            comparisonLastBroadcastRef.current[axis] = {
                slice: nextSlice,
                ratio: maxForAxis > 0 ? nextSlice / maxForAxis : 0,
            };

            setSliceForAxis(axis, nextSlice);
            comparisonSyncGuardFrameRef.current = window.requestAnimationFrame(() => {
                comparisonSyncGuardRef.current = false;
                comparisonSyncGuardFrameRef.current = null;
            });
        };

        window.addEventListener('xcore:comparison-slice', handleComparisonSlice);
        return () => {
            window.removeEventListener('xcore:comparison-slice', handleComparisonSlice);
            if (comparisonSyncGuardFrameRef.current != null) {
                window.cancelAnimationFrame(comparisonSyncGuardFrameRef.current);
                comparisonSyncGuardFrameRef.current = null;
            }
            comparisonSyncGuardRef.current = false;
        };
    }, [axis, comparisonPaneId, comparisonSyncEnabled, dimensions, setSliceForAxis, sliceIndices]);

    useEffect(() => {
        resetMeasurementState();
        setMeasurementMode(false);
        setMeasurementTool('distance');
        setQuadCrosshairPositions({});
        setAnnotateMode(false);
        setAnnotationTool('arrow');
        replaceAnnotationsState([]);
        setWindowLevelDrag(null);
        setReportModalOpen(false);
        setReportWarningMessage('');
        setHistoryOpen(false);
        setSnapshots([]);
        setSnapshotOverlay(null);
        setShowSeriesPanel(false);
        setShowMetadataPanel(false);
    }, [cacheKey, replaceAnnotationsState, resetMeasurementState]);

    useEffect(() => {
        if (!study) return undefined;

        let cancelled = false;

        const init = async () => {
            setLoading(true);
            setError(null);

            try {
                let nextImageData = null;

                if (volumeCache.has(cacheKey)) {
                    console.log('[SliceViewer] Cache HIT:', cacheKey);
                    setLoadingStage('Restoring from cache...');
                    setLoadingProgress(82);
                    nextImageData = volumeCache.get(cacheKey);
                } else {
                    console.log('[SliceViewer] Cache MISS:', cacheKey, '| Downloading VTI...');
                    const url = buildImagingUrl(
                        `/volume/${studyKey}`,
                        buildStudyAssetParams(study, { series_uid: seriesUid || undefined })
                    );

                    setLoadingStage('Connecting...');
                    setLoadingProgress(5);

                    const response = await fetch(url);
                    if (!response.ok) {
                        throw new Error(`Server error ${response.status}`);
                    }

                    let buffer;

                    if (response.body?.getReader) {
                        const contentLength = response.headers.get('Content-Length');
                        const totalBytes = contentLength ? Number.parseInt(contentLength, 10) : 0;
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
                                setLoadingStage(
                                    `Downloading... ${(received / 1048576).toFixed(1)}MB / ${(totalBytes / 1048576).toFixed(1)}MB`
                                );
                            } else {
                                setLoadingStage(`Downloading... ${(received / 1048576).toFixed(1)}MB`);
                            }
                        }

                        if (cancelled) return;

                        buffer = new Uint8Array(received);
                        let offset = 0;
                        for (const chunk of chunks) {
                            buffer.set(chunk, offset);
                            offset += chunk.length;
                        }
                        buffer = buffer.buffer;
                    } else {
                        buffer = await response.arrayBuffer();
                    }

                    setLoadingStage('Decompressing...');
                    setLoadingProgress(78);

                    const reader = vtkXMLImageDataReader.newInstance();
                    reader.parseAsArrayBuffer(buffer);
                    nextImageData = reader.getOutputData(0);

                    if (!nextImageData) {
                        throw new Error('VTI parse failed — no output data');
                    }

                    volumeCache.set(cacheKey, nextImageData);
                    console.log('[SliceViewer] Cached volume:', cacheKey);
                }

                if (cancelled || !nextImageData) return;

                const dims = nextImageData.getDimensions();
                const nextSpacing = nextImageData.getSpacing();
                const scalars = nextImageData.getPointData().getScalars();
                const dataRange = scalars?.getRange?.() || [0, 1];
                const centeredSlices = buildCenteredSlices(dims);

                setDimensions(dims);
                setSpacing(nextSpacing);
                setVolumeInfo({ dimensions: dims, spacing: nextSpacing, dataRange });
                setImageData(nextImageData);
                setAxis('axial');
                setSliceIndices(centeredSlices);
                setSliceIndex(centeredSlices.axial);
                setMaxSlice(Math.max(dims[2] - 1, 0));
                setLoadingStage('Building 3D scene...');
                setLoadingProgress(95);
                setLoadingStage('Rendering...');
                setLoading(false);

                console.log('[SliceViewer] Volume ready:', { dims, spacing: nextSpacing, dataRange });
            } catch (nextError) {
                if (!cancelled) {
                    console.error('[SliceViewer] Error:', nextError);
                    setError(nextError.message || String(nextError));
                    setLoading(false);
                }
            }
        };

        init();

        return () => {
            cancelled = true;
        };
    }, [cacheKey, seriesUid, study, studyKey]);

    // Pane creation is split from slice/window updates so widgets survive normal interaction.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        if (quadView) {
            const singleContext = vtkRef.current;
            vtkRef.current = null;
            removeMeasurementsForAxis(singleContext?.axisName || axis, singleContext);
            destroyPaneContext(singleContext);
            return undefined;
        }

        if (!imageData || !vtkContainerRef.current) return undefined;

        const ctx = createSlicePaneContext(
            vtkContainerRef.current,
            imageData,
            axis,
            SINGLE_CAMERA_ZOOM,
            wlPreset,
            windowCenter,
            windowWidth,
            inverted
        );
        vtkRef.current = ctx;

        return () => {
            if (vtkRef.current === ctx) {
                vtkRef.current = null;
            }
            removeMeasurementsForAxis(ctx.axisName || axis, ctx);
            destroyPaneContext(ctx);
        };
    }, [axis, createSlicePaneContext, destroyPaneContext, imageData, quadView, removeMeasurementsForAxis]);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        if (!quadView) {
            const existing = { ...quadRefs.current };
            quadRefs.current = { axial: null, coronal: null, sagittal: null, volume: null };
            AXIS_ORDER.forEach((axisName) => {
                removeMeasurementsForAxis(axisName, existing[axisName]);
                destroyPaneContext(existing[axisName]);
            });
            destroyPaneContext(existing.volume);
            return undefined;
        }

        if (!imageData || !quadAxialRef.current || !quadCoronalRef.current || !quadSagittalRef.current || !quadVolumeRef.current) {
            return undefined;
        }

        const axialCtx = createSlicePaneContext(
            quadAxialRef.current,
            imageData,
            'axial',
            QUAD_CAMERA_ZOOM,
            wlPreset,
            windowCenter,
            windowWidth,
            inverted
        );
        const coronalCtx = createSlicePaneContext(
            quadCoronalRef.current,
            imageData,
            'coronal',
            QUAD_CAMERA_ZOOM,
            wlPreset,
            windowCenter,
            windowWidth,
            inverted
        );
        const sagittalCtx = createSlicePaneContext(
            quadSagittalRef.current,
            imageData,
            'sagittal',
            QUAD_CAMERA_ZOOM,
            wlPreset,
            windowCenter,
            windowWidth,
            inverted
        );
        const volumeCtx = createVolumePreviewContext(quadVolumeRef.current, imageData);

        quadRefs.current = {
            axial: axialCtx,
            coronal: coronalCtx,
            sagittal: sagittalCtx,
            volume: volumeCtx,
        };

        return () => {
            const existing = { ...quadRefs.current };
            quadRefs.current = { axial: null, coronal: null, sagittal: null, volume: null };
            AXIS_ORDER.forEach((axisName) => {
                removeMeasurementsForAxis(axisName, existing[axisName]);
                destroyPaneContext(existing[axisName]);
            });
            destroyPaneContext(existing.volume);
        };
    }, [createSlicePaneContext, createVolumePreviewContext, destroyPaneContext, imageData, quadView, removeMeasurementsForAxis]);

    useEffect(() => {
        if (!quadView) {
            applyWindowLevel(wlPreset, windowCenter, windowWidth, inverted);
            return;
        }

        AXIS_ORDER.forEach((axisName) => {
            const ctx = quadRefs.current[axisName];
            if (!ctx?.actor) return;
            applyWindowLevelToActor(ctx.actor, wlPreset, windowCenter, windowWidth, inverted);
            ctx.renderWindow.render();
        });
    }, [applyWindowLevel, applyWindowLevelToActor, inverted, quadView, windowCenter, windowWidth, wlPreset]);

    useEffect(() => {
        if (quadView || !vtkRef.current || !imageData) return;

        updateSlicePaneContext(vtkRef.current, axis, sliceIndices[axis] ?? 0, SINGLE_CAMERA_ZOOM);
        const frameId = window.requestAnimationFrame(() => {
            syncMeasurementLabelForAxis(axis);
            scheduleProjectionRefresh();
        });

        return () => window.cancelAnimationFrame(frameId);
    }, [axis, imageData, quadView, scheduleProjectionRefresh, sliceIndices, syncMeasurementLabelForAxis, updateSlicePaneContext]);

    useEffect(() => {
        if (!quadView || !imageData) return;

        AXIS_ORDER.forEach((axisName) => {
            updateSlicePaneContext(quadRefs.current[axisName], axisName, sliceIndices[axisName] ?? 0, QUAD_CAMERA_ZOOM);
        });

        const frameId = window.requestAnimationFrame(() => {
            syncAllMeasurementLabels();
            syncQuadCrosshairs();
            scheduleProjectionRefresh();
        });

        return () => window.cancelAnimationFrame(frameId);
    }, [imageData, quadView, scheduleProjectionRefresh, sliceIndices, syncAllMeasurementLabels, syncQuadCrosshairs, updateSlicePaneContext]);

    const syncRenderableLayout = useCallback(() => {
        const viewerArea = viewerAreaRef.current;
        if (viewerArea) {
            const nextSize = {
                width: Math.round(viewerArea.clientWidth),
                height: Math.round(viewerArea.clientHeight),
            };

            setViewerSize((current) => (
                current.width === nextSize.width && current.height === nextSize.height
                    ? current
                    : nextSize
            ));
        }

        if (quadView) {
            AXIS_ORDER.forEach((axisName) => resizePaneContext(quadRefs.current[axisName]));
            resizePaneContext(quadRefs.current.volume);
            syncAllMeasurementLabels();
            syncQuadCrosshairs();
            scheduleProjectionRefresh();
            return;
        }

        resizePaneContext(vtkRef.current);
        if (vtkRef.current) {
            updateSlicePaneContext(vtkRef.current, axis, sliceIndices[axis] ?? 0, SINGLE_CAMERA_ZOOM);
            syncMeasurementLabelForAxis(axis);
            scheduleProjectionRefresh();
        }
    }, [axis, quadView, resizePaneContext, scheduleProjectionRefresh, sliceIndices, syncAllMeasurementLabels, syncMeasurementLabelForAxis, syncQuadCrosshairs, updateSlicePaneContext]);

    useLayoutEffect(() => {
        const onResize = () => {
            if (resizeObserverFrameRef.current != null) {
                window.cancelAnimationFrame(resizeObserverFrameRef.current);
            }
            resizeObserverFrameRef.current = window.requestAnimationFrame(() => {
                resizeObserverFrameRef.current = null;
                syncRenderableLayout();
            });
        };

        const viewerArea = viewerAreaRef.current;
        let observer = null;

        if (viewerArea && typeof ResizeObserver !== 'undefined') {
            observer = new ResizeObserver(onResize);
            observer.observe(viewerArea);
        }

        onResize();
        window.addEventListener('resize', onResize);
        return () => {
            if (resizeObserverFrameRef.current != null) {
                window.cancelAnimationFrame(resizeObserverFrameRef.current);
                resizeObserverFrameRef.current = null;
            }
            observer?.disconnect?.();
            window.removeEventListener('resize', onResize);
        };
    }, [syncRenderableLayout]);

    useEffect(() => {
        const element = vtkContainerRef.current;
        if (!element || quadView) return undefined;

        const handleContextMenu = (event) => {
            event.preventDefault();
        };

        const handleMouseDownCapture = (event) => {
            if (startWindowLevelDrag(event)) {
                return;
            }

            if (measurementMode && event.button === 0) {
                ensureMeasurementWidget(axis);
            }
        };

        element.addEventListener('wheel', handleSingleWheel, { passive: false, capture: true });
        element.addEventListener('contextmenu', handleContextMenu, true);
        element.addEventListener('mousedown', handleMouseDownCapture, true);

        return () => {
            element.removeEventListener('wheel', handleSingleWheel, { capture: true });
            element.removeEventListener('contextmenu', handleContextMenu, true);
            element.removeEventListener('mousedown', handleMouseDownCapture, true);
        };
    }, [axis, ensureMeasurementWidget, handleSingleWheel, measurementMode, quadView, startWindowLevelDrag]);

    useEffect(() => {
        if (!quadView) return undefined;

        const panes = [
            ['axial', quadAxialRef.current],
            ['coronal', quadCoronalRef.current],
            ['sagittal', quadSagittalRef.current],
        ];

        const cleanups = panes.map(([axisName, element]) => {
            if (!element) return () => {};

            const handlePaneWheel = (event) => {
                event.preventDefault();
                event.stopPropagation();
                const delta = event.deltaY > 0 ? 1 : -1;
                setSliceForAxis(axisName, (current) => current + delta);
            };

            const handlePaneMouseDown = (event) => {
                if (startWindowLevelDrag(event)) {
                    return;
                }

                if (measurementMode && event.button === 0) {
                    ensureMeasurementWidget(axisName);
                    return;
                }
                handleQuadPaneClick(axisName, event);
            };

            const handlePaneContextMenu = (event) => {
                event.preventDefault();
            };

            element.addEventListener('wheel', handlePaneWheel, { passive: false, capture: true });
            element.addEventListener('contextmenu', handlePaneContextMenu, true);
            element.addEventListener('mousedown', handlePaneMouseDown, true);

            return () => {
                element.removeEventListener('wheel', handlePaneWheel, { capture: true });
                element.removeEventListener('contextmenu', handlePaneContextMenu, true);
                element.removeEventListener('mousedown', handlePaneMouseDown, true);
            };
        });

        return () => cleanups.forEach((cleanup) => cleanup());
    }, [ensureMeasurementWidget, handleQuadPaneClick, measurementMode, quadView, setSliceForAxis, startWindowLevelDrag]);

    useEffect(() => {
        return () => {
            clearAllMeasurements();
            if (comparisonSyncGuardFrameRef.current != null) {
                window.cancelAnimationFrame(comparisonSyncGuardFrameRef.current);
                comparisonSyncGuardFrameRef.current = null;
            }
            comparisonSyncGuardRef.current = false;
        };
    }, [clearAllMeasurements]);

    const axisDef = AXIS[axis];
    const currentLutLabel = WL_LUTS[wlPreset] ? (WL_LUT_LABELS[wlPreset] || wlPreset) : 'Custom W/L';
    const measurementHint = windowLevelDrag
        ? 'Right-drag to adjust window/level'
        : annotateMode
        ? annotationTool === 'text'
            ? 'Click to place a text note'
            : `Drag to place a ${annotationTool}`
        : measurementMode
        ? measurementTool === 'angle'
            ? 'Click to place three points for an angle'
            : 'Click and drag to place a ruler'
        : quadView
            ? 'Click a pane to sync crosshairs, scroll any pane to change its slice'
            : 'Scroll to navigate slices';

    const renderMeasurementPills = useCallback((axisName) => {
        return (measurementLabels[axisName] || []).map((label) => (
            <div
                key={label.id}
                className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full rounded-full px-2.5 py-1 text-[11px] font-semibold text-white shadow-lg"
                style={{
                    left: `${label.x}px`,
                    top: `${Math.max(label.y - 10, 22)}px`,
                    backgroundColor: 'rgba(15, 23, 42, 0.92)',
                    border: `1px solid ${MEASUREMENT_COLOR}`,
                    boxShadow: '0 10px 25px rgba(29, 158, 117, 0.18)',
                }}
            >
                {label.text}
            </div>
        ));
    }, [measurementLabels]);

    const renderQuadCrosshair = useCallback((axisName) => {
        const position = quadCrosshairPositions[axisName];
        if (!position) return null;

        const colors = CROSSHAIR_COLORS[axisName];
        return (
            <svg
                className="pointer-events-none absolute inset-0 z-10 h-full w-full"
                viewBox={`0 0 ${position.width} ${position.height}`}
                preserveAspectRatio="none"
            >
                <line
                    x1={position.x}
                    y1={0}
                    x2={position.x}
                    y2={position.height}
                    stroke={colors.vertical}
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                    opacity="0.9"
                />
                <line
                    x1={0}
                    y1={position.y}
                    x2={position.width}
                    y2={position.y}
                    stroke={colors.horizontal}
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                    opacity="0.9"
                />
                <circle
                    cx={position.x}
                    cy={position.y}
                    r="4"
                    fill="#ffffff"
                    stroke={AXIS[axisName].colorHex}
                    strokeWidth="1.5"
                />
            </svg>
        );
    }, [quadCrosshairPositions]);

    const renderPaneLabel = useCallback((axisName) => {
        const paneAxis = AXIS[axisName];
        const paneMaxSlice = Math.max((dimensions[paneAxis.dimIndex] || 1) - 1, 0);
        const paneSlice = sliceIndices[axisName] ?? 0;

        return (
            <div className="pointer-events-none absolute left-3 top-3 z-20">
                <span className={`rounded-lg bg-black/70 px-2.5 py-1 text-xs font-mono font-bold ${paneAxis.labelClass}`}>
                    {paneAxis.label.toUpperCase()} [{paneSlice + 1}/{paneMaxSlice + 1}]
                </span>
            </div>
        );
    }, [dimensions, sliceIndices]);

    const renderQuadPane = useCallback((axisName, ref) => {
        const paneElement = ref?.current;
        const paneSize = {
            width: Math.max(1, paneElement?.clientWidth || Math.floor((viewerSize.width - 3) / 2)),
            height: Math.max(1, paneElement?.clientHeight || Math.floor((viewerSize.height - 3) / 2)),
        };
        const paneSlice = sliceIndices[axisName] ?? 0;
        const annotationProjection = projectionReady ? getAnnotationProjectionForPane(axisName, paneSlice, paneSize) : null;
        const hasAnnotationProjection = projectionReady && !!annotationProjection?.imageBounds;

        return (
            <div className={`relative overflow-hidden border ${AXIS[axisName].paneBorderClass} bg-black`} style={{ cursor: windowLevelDrag || annotateMode || measurementMode ? 'crosshair' : 'crosshair' }}>
                <div ref={ref} className="absolute inset-0" />
                {renderQuadCrosshair(axisName)}
                {renderPaneLabel(axisName)}
                {renderMeasurementPills(axisName)}
                {snapshotOverlay?.annotations?.length > 0 && paneSize.width > 0 && paneSize.height > 0 && hasAnnotationProjection && (
                    <AnnotationCanvas
                        width={paneSize.width}
                        height={paneSize.height}
                        sourceWidth={annotationProjection.sourceWidth}
                        sourceHeight={annotationProjection.sourceHeight}
                        viewportSize={annotationProjection.viewportSize}
                        imageBounds={annotationProjection.imageBounds}
                        active={false}
                        tool="select"
                        annotations={getVisibleAnnotationsFromList(snapshotOverlay.annotations, axisName, paneSlice, 0.5).map((annotation) => ({
                            ...annotation,
                            color: '#22c55e',
                        }))}
                        onChange={() => {}}
                        className="absolute inset-0 z-[65]"
                    />
                )}
                {paneSize.width > 0 && paneSize.height > 0 && hasAnnotationProjection && getNeighborAnnotationsForAxis(axisName, paneSlice).length > 0 && (
                    <AnnotationCanvas
                        width={paneSize.width}
                        height={paneSize.height}
                        sourceWidth={annotationProjection.sourceWidth}
                        sourceHeight={annotationProjection.sourceHeight}
                        viewportSize={annotationProjection.viewportSize}
                        imageBounds={annotationProjection.imageBounds}
                        active={false}
                        tool="select"
                        annotations={getNeighborAnnotationsForAxis(axisName, paneSlice)}
                        onChange={() => {}}
                        className="absolute inset-0 z-[66]"
                    />
                )}
                {paneSize.width > 0 && paneSize.height > 0 && hasAnnotationProjection && (
                    <AnnotationCanvas
                        width={paneSize.width}
                        height={paneSize.height}
                        sourceWidth={annotationProjection.sourceWidth}
                        sourceHeight={annotationProjection.sourceHeight}
                        viewportSize={annotationProjection.viewportSize}
                        imageBounds={annotationProjection.imageBounds}
                        active={annotateMode}
                        tool={annotationTool}
                        annotations={getCurrentSliceAnnotationsForAxis(axisName, paneSlice)}
                        onChange={(nextAnnotations) => handleAxisAnnotationsChange(axisName, paneSlice, nextAnnotations)}
                        clinicalContext={{
                            sliceAxis: axisName,
                            sliceIndex: paneSlice,
                            sliceCount: dimensions[AXIS[axisName].dimIndex] || null,
                        }}
                        reviewMode={reviewMode}
                        onReviewAnnotation={handleReviewAnnotation}
                        className="absolute inset-0 z-[70]"
                    />
                )}
            </div>
        );
    }, [
        annotateMode,
        annotationTool,
        dimensions,
        getCurrentSliceAnnotationsForAxis,
        getNeighborAnnotationsForAxis,
        getAnnotationProjectionForPane,
        getVisibleAnnotationsFromList,
        handleAxisAnnotationsChange,
        handleReviewAnnotation,
        measurementMode,
        renderMeasurementPills,
        renderPaneLabel,
        renderQuadCrosshair,
        projectionReady,
        reviewMode,
        sliceIndices,
        snapshotOverlay,
        viewerSize.height,
        viewerSize.width,
        windowLevelDrag,
    ]);

    const singlePaneAnnotationProjection = useMemo(
        () => (projectionReady ? getAnnotationProjectionForPane(axis, sliceIndex, viewerSize) : null),
        [axis, getAnnotationProjectionForPane, projectionReady, projectionRefreshTick, sliceIndex, viewerSize]
    );

    const isComparison = comparisonPaneId !== null;
    const containerClasses = `relative flex h-full flex-col overflow-hidden bg-slate-950 text-slate-100 outline-none ${
        isComparison
            ? 'rounded-none border-none shadow-none'
            : 'rounded-3xl border border-slate-800 shadow-2xl'
    }`;

    return (
        <div ref={wrapperRef} tabIndex={0} className={containerClasses}>
            <div className="z-20 flex items-center justify-between border-b border-slate-800 bg-slate-900/95 p-3 backdrop-blur">
                <div className="flex items-center gap-3">
                    {showBack && (
                        <button onClick={handleBack} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white">
                            <AppIcon name="ArrowLeft" size={20} />
                        </button>
                    )}
                    <div>
                        <h2 className="text-sm font-bold text-white">{study?.patientName || study?.originalName || 'Patient'}</h2>
                        <p className="text-[10px] text-slate-500">MPR Slice Viewer • {study?.folderName}</p>
                    </div>
                </div>

                <div className="flex min-w-0 items-center gap-1.5">
                    {!quadView && Object.entries(AXIS).map(([key, def]) => (
                        <button
                            key={key}
                            onClick={() => switchAxis(key)}
                            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                                axis === key
                                    ? def.activeBtn
                                    : 'border border-transparent bg-slate-800 text-slate-400 hover:bg-slate-700'
                            }`}
                        >
                            {def.label}
                        </button>
                    ))}

                    {!quadView && <div className="mx-1 h-5 w-px bg-slate-800" />}

                    <label className="flex min-w-[220px] items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-[11px] font-medium text-slate-400">
                        <span className="uppercase tracking-wide text-slate-500">LUT</span>
                        <select
                            value={WL_LUTS[wlPreset] ? wlPreset : 'custom'}
                            onChange={(event) => selectWlPreset(event.target.value)}
                            className="bg-transparent font-semibold text-amber-300 outline-none"
                        >
                            {!WL_LUTS[wlPreset] && <option value="custom">Custom W/L</option>}
                            {LUT_OPTION_KEYS.map((key) => (
                                <option key={key} value={key}>
                                    {WL_LUT_LABELS[key] || key}
                                </option>
                            ))}
                        </select>
                    </label>

                    <div className="mx-1 h-5 w-px bg-slate-800" />

                    <button
                        onClick={() => {
                            setMeasurementMode((current) => {
                                const next = !current;
                                if (next) {
                                    setAnnotateMode(false);
                                }
                                return next;
                            });
                        }}
                        className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                            measurementMode
                                ? 'border border-cyan-500/40 bg-cyan-500/20 text-cyan-400'
                                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
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
                                    setMeasurementMode(false);
                                }
                                return next;
                            });
                        }}
                        className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                            annotateMode
                                ? 'border border-rose-500/40 bg-rose-500/20 text-rose-300'
                                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                        }`}
                        title="Annotation Mode"
                    >
                        <AppIcon name="Edit3" size={16} />
                        <span>Annotate</span>
                    </button>

                    <button
                        onClick={() => {
                            setReportWarningMessage('');
                            setReportModalOpen(true);
                        }}
                        className="flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-500"
                        title="Export Report"
                    >
                        <AppIcon name="FileText" size={16} />
                        <span>Export Report</span>
                    </button>

                    {analysisCaseContext && onCaptureForCase && (
                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={() => captureForAnalysisCase()}
                                disabled={caseCaptureState === 'saving'}
                                className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${caseCaptureState === 'saved' ? 'bg-emerald-500/20 text-emerald-300' : caseCaptureState === 'stale' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : caseCaptureState === 'error' ? 'bg-rose-500/20 text-rose-300' : 'bg-cyan-600 text-white hover:bg-cyan-500'}`}
                                title={caseCaptureError || 'Simpan canonical render slice untuk PDF kasus'}
                            >
                                <AppIcon name={caseCaptureState === 'saving' ? 'Loader2' : caseCaptureState === 'saved' ? 'Check' : caseCaptureState === 'stale' ? 'RefreshCw' : 'Camera'} size={15} className={caseCaptureState === 'saving' ? 'animate-spin' : ''} />
                                <span>{caseCaptureState === 'saving' ? 'Menyimpan…' : caseCaptureState === 'saved' ? 'Siap untuk laporan' : caseCaptureState === 'stale' ? 'Perlu diperbarui' : caseCaptureState === 'error' ? 'Gagal — coba lagi' : 'Simpan Gambar Laporan'}</span>
                            </button>
                            {caseCaptureError && caseCaptureState === 'error' && (
                                <span className="text-[10px] text-rose-300 font-medium px-2 py-1 rounded bg-rose-500/10 border border-rose-500/30 max-w-[200px] truncate" title={caseCaptureError}>
                                    {caseCaptureError}
                                </span>
                            )}
                        </div>
                    )}

                    {study?.selectedSeriesType === '3D Volume' && (
                        <button
                            onClick={onSwitchTo3D}
                            className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-700 hover:text-white"
                            title="Switch to 3D Volume Rendering"
                        >
                            <AppIcon name="Box" size={14} />
                            3D
                        </button>
                    )}

                    <button
                        onClick={handleToggleQuadView}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                            quadView
                                ? 'border border-cyan-500/40 bg-cyan-500/20 text-cyan-400'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                        }`}
                        title="Toggle Quad View"
                    >
                        <AppIcon name="LayoutGrid" size={14} />
                        <span>Quad View</span>
                    </button>

                    <ShortcutHelpButton shortcuts={SLICE_SHORTCUTS} />

                    <div className="relative" ref={moreToolsMenuRef}>
                        <button
                            onClick={() => setShowMoreTools((current) => !current)}
                            className="flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-700 hover:text-white"
                            title="More tools"
                        >
                            <span>More</span>
                            <AppIcon name={showMoreTools ? 'ChevronUp' : 'ChevronDown'} size={14} />
                        </button>

                        {showMoreTools && (
                            <div className="absolute right-0 top-full z-[140] mt-2 w-60 rounded-xl border border-slate-700 bg-slate-900/98 p-2 shadow-2xl">
                                <button
                                    onClick={() => {
                                        setInverted((current) => !current);
                                        setShowMoreTools(false);
                                    }}
                                    className={`mb-1 flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs transition ${
                                        inverted
                                            ? 'bg-amber-500/20 text-amber-300'
                                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                    }`}
                                >
                                    <span className="flex items-center gap-2"><AppIcon name="SunMoon" size={14} /> Invert</span>
                                    <span>{inverted ? 'On' : 'Off'}</span>
                                </button>

                                <button
                                    onClick={() => {
                                        setShowSeriesPanel(false);
                                        setShowMetadataPanel((current) => !current);
                                        setShowMoreTools(false);
                                    }}
                                    className="mb-1 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-slate-300 transition hover:bg-slate-800 hover:text-white"
                                >
                                    <AppIcon name="Info" size={14} /> DICOM info
                                </button>

                                {allowSeriesSwitch && (
                                    <button
                                        onClick={() => {
                                            setShowMetadataPanel(false);
                                            setShowSeriesPanel((current) => !current);
                                            setShowMoreTools(false);
                                        }}
                                        className="mb-1 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-slate-300 transition hover:bg-slate-800 hover:text-white"
                                    >
                                        <AppIcon name="Layers" size={14} /> Series
                                    </button>
                                )}



                                <button
                                    onClick={() => {
                                        handleExportAnnotationsJson();
                                        setShowMoreTools(false);
                                    }}
                                    className="mb-1 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-slate-300 transition hover:bg-slate-800 hover:text-white"
                                >
                                    <AppIcon name="Braces" size={14} /> Export JSON
                                </button>

                                {(annotations.length > 0 || measurementCount > 0) && !study?.readOnly && (
                                    <>
                                        <button
                                            onClick={() => {
                                                setSessionError('');
                                                setSessionModalMode('save');
                                                setShowMoreTools(false);
                                            }}
                                            className="mb-1 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-slate-300 transition hover:bg-slate-800 hover:text-white"
                                        >
                                            <AppIcon name="Save" size={14} /> Save session
                                        </button>
                                        <button
                                            onClick={() => {
                                                handleSubmitAnnotationsForReview();
                                                setShowMoreTools(false);
                                            }}
                                            className="mb-1 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-slate-300 transition hover:bg-slate-800 hover:text-white"
                                        >
                                            <AppIcon name="Send" size={14} /> Submit review
                                        </button>
                                    </>
                                )}

                                {!study?.readOnly && (
                                    <>
                                        <button
                                            onClick={() => {
                                                setSessionError('');
                                                setSessionModalMode('new');
                                                setShowMoreTools(false);
                                            }}
                                            className="mb-1 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-slate-300 transition hover:bg-slate-800 hover:text-white"
                                        >
                                            <AppIcon name="PlusCircle" size={14} /> New session
                                        </button>
                                        <button
                                            onClick={() => {
                                                setHistoryOpen(true);
                                                setShowMoreTools(false);
                                            }}
                                            className="mb-1 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-slate-300 transition hover:bg-slate-800 hover:text-white"
                                        >
                                            <AppIcon name="History" size={14} /> Session history
                                        </button>
                                    </>
                                )}

                                <button
                                    onClick={() => {
                                        toggleFullscreen();
                                        setShowMoreTools(false);
                                    }}
                                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-slate-300 transition hover:bg-slate-800 hover:text-white"
                                >
                                    <AppIcon name={isFullscreen ? 'Minimize2' : 'Maximize2'} size={14} />
                                    {isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                                </button>
                            </div>
                        )}
                    </div>
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

            <div ref={viewerAreaRef} className="relative flex-1 bg-black">
                {(measurementMode || annotateMode) && (
                    <div className="absolute left-1/2 top-4 z-[75] flex -translate-x-1/2 items-center gap-1.5 rounded-2xl border border-slate-700 bg-slate-950/90 p-1.5 shadow-2xl backdrop-blur">
                        {measurementMode && (
                            <>
                                <button
                                    onClick={() => setMeasurementTool('distance')}
                                    className={`rounded-xl px-3 py-1.5 text-[11px] font-bold transition ${
                                        measurementTool === 'distance'
                                            ? 'border border-cyan-500/40 bg-cyan-500/20 text-cyan-300'
                                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                                    }`}
                                >
                                    Distance
                                </button>
                                <button
                                    onClick={() => setMeasurementTool('angle')}
                                    className={`rounded-xl px-3 py-1.5 text-[11px] font-bold transition ${
                                        measurementTool === 'angle'
                                            ? 'border border-cyan-500/40 bg-cyan-500/20 text-cyan-300'
                                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                                    }`}
                                >
                                    Angle
                                </button>
                                <button
                                    onClick={clearAllMeasurements}
                                    className="rounded-xl bg-slate-800 p-1.5 text-slate-400 transition hover:bg-slate-700 hover:text-white"
                                    title="Clear measurements"
                                >
                                    <AppIcon name="Trash2" size={15} />
                                </button>
                            </>
                        )}

                        {annotateMode && (
                            <>
                                {[
                                    ['select', 'MousePointer2', 'Select'],
                                    ['arrow', 'ArrowRight', 'Arrow'],
                                    ['circle', 'Circle', 'Circle'],
                                    ['freehand', 'PenLine', 'Region'],
                                    ['text', 'Type', 'Text'],
                                ].map(([toolName, iconName, label]) => (
                                    <button
                                        key={toolName}
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
                                <div className="ml-1 flex shrink-0 items-center gap-2 border-l border-slate-700/80 py-1 pl-2 pr-1">
                                    <button
                                        type="button"
                                        onClick={handleUndoAnnotation}
                                        disabled={annotationsHistory.length === 0}
                                        className="relative grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-slate-800 text-slate-300 transition-colors duration-150 hover:bg-slate-700 hover:text-white active:bg-slate-600 disabled:cursor-not-allowed disabled:text-slate-500 disabled:hover:bg-slate-800"
                                        title={`Undo annotation (${annotationsHistory.length} available)`}
                                        aria-label={`Undo annotation, ${annotationsHistory.length} available`}
                                    >
                                        <AppIcon name="Undo2" size={15} />
                                        <AnimatePresence>
                                            {annotationsHistory.length > 0 && (
                                                <AnnotationCounterBadge
                                                    key="undo-badge"
                                                    value={annotationsHistory.length}
                                                    activeClassName="bg-cyan-400 text-slate-950"
                                                />
                                            )}
                                        </AnimatePresence>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleRedoAnnotation}
                                        disabled={annotationsRedo.length === 0}
                                        className="relative grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-slate-800 text-slate-300 transition-colors duration-150 hover:bg-slate-700 hover:text-white active:bg-slate-600 disabled:cursor-not-allowed disabled:text-slate-500 disabled:hover:bg-slate-800"
                                        title={`Redo annotation (${annotationsRedo.length} available)`}
                                        aria-label={`Redo annotation, ${annotationsRedo.length} available`}
                                    >
                                        <AppIcon name="Redo2" size={15} />
                                        <AnimatePresence>
                                            {annotationsRedo.length > 0 && (
                                                <AnnotationCounterBadge
                                                    key="redo-badge"
                                                    value={annotationsRedo.length}
                                                    activeClassName="bg-violet-400 text-slate-950"
                                                />
                                            )}
                                        </AnimatePresence>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => pushAnnotationsState([])}
                                        disabled={annotations.length === 0}
                                        className="relative grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-slate-800 text-slate-300 transition-colors duration-150 hover:bg-rose-900/60 hover:text-rose-200 active:bg-rose-900/80 disabled:cursor-not-allowed disabled:text-slate-500 disabled:hover:bg-slate-800"
                                        title={`Clear annotations (${annotations.length})`}
                                        aria-label={`Clear ${annotations.length} annotations`}
                                    >
                                        <AppIcon name="Trash2" size={15} />
                                        <AnimatePresence>
                                            {annotations.length > 0 && (
                                                <AnnotationCounterBadge
                                                    key="clear-badge"
                                                    value={annotations.length}
                                                    activeClassName="bg-rose-400 text-slate-950"
                                                />
                                            )}
                                        </AnimatePresence>
                                    </button>
                                </div>
                                {annotationPersistence.saving && (
                                    <span className="px-2 text-[10px] font-mono uppercase tracking-wider text-cyan-300">Saving</span>
                                )}
                                {annotationPersistence.error && (
                                    <span className="px-2 text-[10px] font-mono uppercase tracking-wider text-amber-300" title={annotationPersistence.error.message || 'Backend save failed; local cache is active'}>
                                        Local
                                    </span>
                                )}
                            </>
                        )}
                    </div>
                )}

                {!quadView && (
                    <div
                        ref={vtkContainerRef}
                        className="absolute inset-0"
                        style={{ cursor: windowLevelDrag || annotateMode || measurementMode ? 'crosshair' : 'crosshair' }}
                    />
                )}

                {quadView && (
                    <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-px bg-slate-900 p-px">
                        {renderQuadPane('axial', quadAxialRef)}
                        {renderQuadPane('coronal', quadCoronalRef)}
                        {renderQuadPane('sagittal', quadSagittalRef)}
                        <div className="relative overflow-hidden border border-slate-700 bg-black">
                            <div ref={quadVolumeRef} className="absolute inset-0" />
                            <div className="pointer-events-none absolute left-3 top-3 z-20">
                                <span className="rounded-lg bg-black/70 px-2.5 py-1 text-xs font-mono font-bold text-slate-200">
                                    3D PREVIEW
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {!loading && !error && !quadView && (
                    <>
                        <div className="pointer-events-none absolute left-3 top-3 z-10">
                            <span className={`rounded-lg bg-black/70 px-2 py-1 text-xs font-mono font-bold ${axisDef.labelClass}`}>
                                {axisDef.label.toUpperCase()} [{sliceIndex + 1}/{maxSlice + 1}]
                            </span>
                        </div>
                        {renderMeasurementPills(axis)}
                    </>
                )}

                {!loading && !error && volumeInfo && (
                    <div className="pointer-events-none absolute right-3 top-3 z-10 rounded bg-black/60 px-2 py-1 font-mono text-[10px] text-slate-500">
                        {volumeInfo.dimensions.join('×')} • {volumeInfo.spacing.map((value) => value.toFixed(2)).join('×')}mm
                    </div>
                )}

                {!loading && !error && (
                    <div className="pointer-events-none absolute bottom-14 left-1/2 z-10 -translate-x-1/2 rounded bg-black/60 px-2 py-1 font-mono text-[10px] text-slate-500">
                        {WL_LUTS[wlPreset] ? `LUT: ${currentLutLabel}` : `W/L: ${windowWidth.toFixed(3)} / ${windowCenter.toFixed(3)}`}{inverted ? ' (Inv)' : ''} • {measurementHint}
                    </div>
                )}

                {!loading && !error && windowLevelDrag && (
                    <div className="pointer-events-none absolute left-1/2 top-4 z-30 -translate-x-1/2 rounded-full border border-amber-400/40 bg-slate-950/90 px-4 py-2 font-mono text-xs font-semibold text-white shadow-2xl backdrop-blur">
                        W: {windowWidth.toFixed(3)}&nbsp;&nbsp;L: {windowCenter.toFixed(3)}
                    </div>
                )}

                {!loading && !error && !quadView && viewerSize.width > 0 && viewerSize.height > 0 && (
                    <>
                        {visibleSnapshotAnnotations.length > 0 && singlePaneAnnotationProjection?.imageBounds && (
                            <AnnotationCanvas
                                width={viewerSize.width}
                                height={viewerSize.height}
                                sourceWidth={singlePaneAnnotationProjection.sourceWidth}
                                sourceHeight={singlePaneAnnotationProjection.sourceHeight}
                                viewportSize={singlePaneAnnotationProjection.viewportSize}
                                imageBounds={singlePaneAnnotationProjection.imageBounds}
                                active={false}
                                tool="select"
                                annotations={visibleSnapshotAnnotations.map((annotation) => ({
                                    ...annotation,
                                    color: '#22c55e',
                                }))}
                                onChange={() => {}}
                                className="absolute inset-0 z-[65]"
                            />
                        )}
                        {neighborAnnotations.length > 0 && singlePaneAnnotationProjection?.imageBounds && (
                            <AnnotationCanvas
                                width={viewerSize.width}
                                height={viewerSize.height}
                                sourceWidth={singlePaneAnnotationProjection.sourceWidth}
                                sourceHeight={singlePaneAnnotationProjection.sourceHeight}
                                viewportSize={singlePaneAnnotationProjection.viewportSize}
                                imageBounds={singlePaneAnnotationProjection.imageBounds}
                                active={false}
                                tool="select"
                                annotations={neighborAnnotations}
                                onChange={() => {}}
                                className="absolute inset-0 z-[66]"
                            />
                        )}
                        {singlePaneAnnotationProjection?.imageBounds && (
                            <AnnotationCanvas
                                width={viewerSize.width}
                                height={viewerSize.height}
                                sourceWidth={singlePaneAnnotationProjection.sourceWidth}
                                sourceHeight={singlePaneAnnotationProjection.sourceHeight}
                                viewportSize={singlePaneAnnotationProjection.viewportSize}
                                imageBounds={singlePaneAnnotationProjection.imageBounds}
                                active={annotateMode}
                                tool={annotationTool}
                                annotations={visibleAnnotations}
                                onChange={handleVisibleAnnotationsChange}
                                clinicalContext={{
                                    sliceAxis: axis,
                                    sliceIndex,
                                    sliceCount: dimensions[AXIS[axis].dimIndex] || null,
                                }}
                                reviewMode={reviewMode}
                                onReviewAnnotation={handleReviewAnnotation}
                                className="absolute inset-0 z-[70]"
                            />
                        )}
                    </>
                )}

                {!loading && !error && !quadView && maxSlice > 0 && (
                    <div className="absolute bottom-3 left-4 right-4 z-10">
                        <input
                            type="range"
                            min={0}
                            max={maxSlice}
                            value={sliceIndex}
                            onChange={(event) => goToSlice(Number.parseInt(event.target.value, 10))}
                            className="h-1.5 w-full cursor-pointer appearance-none rounded-full"
                            style={{
                                background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${(sliceIndex / maxSlice) * 100}%, #1e293b ${(sliceIndex / maxSlice) * 100}%, #1e293b 100%)`,
                            }}
                        />
                    </div>
                )}

                {loading && (
                    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-950/95">
                        <div className="relative mb-4 h-20 w-20">
                            <svg className="h-20 w-20 animate-spin" viewBox="0 0 80 80">
                                <circle cx="40" cy="40" r="35" strokeWidth="4" stroke="#1e293b" fill="none" />
                                <circle
                                    cx="40"
                                    cy="40"
                                    r="35"
                                    strokeWidth="4"
                                    stroke="#6366f1"
                                    fill="none"
                                    strokeDasharray={`${loadingProgress * 2.2} 220`}
                                    strokeLinecap="round"
                                    transform="rotate(-90 40 40)"
                                />
                            </svg>
                            <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white">{loadingProgress}%</span>
                        </div>
                        <p className="mb-1 text-sm font-semibold text-white">Loading MPR Viewer</p>
                        <p className="text-xs text-slate-400">{loadingStage}</p>
                    </div>
                )}

                {error && (
                    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-950/95 p-8 text-center">
                        <AppIcon name="AlertTriangle" size={48} className="mb-4 text-red-400" />
                        <h3 className="mb-2 text-lg font-bold text-red-400">Failed to Load MPR</h3>
                        <p className="mb-4 max-w-md text-sm text-slate-400">{error}</p>
                        <button onClick={() => window.location.reload()} className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700">
                            Retry
                        </button>
                    </div>
                )}

                <SeriesSidebar
                    study={study}
                    currentSeriesUid={study?.selectedSeriesUid}
                    onSelectSeries={(series) => {
                        clearAllMeasurements();
                        setShowSeriesPanel(false);
                        if (onSwitchSeries) onSwitchSeries(series);
                    }}
                    visible={allowSeriesSwitch && showSeriesPanel}
                    onClose={() => setShowSeriesPanel(false)}
                    position="right"
                />

                <MetadataPanel
                    visible={showMetadataPanel}
                    onClose={() => setShowMetadataPanel(false)}
                    metadata={metadata}
                    loading={metadataLoading}
                    error={metadataError}
                    study={study}
                    studyKey={studyKey}
                    seriesUid={seriesUid}
                    title="DICOM Info"
                />

                {!loading && !error && (
                    <div className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-lg bg-black/60 px-2.5 py-1 font-mono text-[10px] text-slate-400">
                        Spacing: {spacing.map((value) => value.toFixed(2)).join(' × ')} mm
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
                    measurementCount={measurementCount}
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
                    onClose={() => {
                        setReportWarningMessage('');
                        setReportModalOpen(false);
                    }}
                    onConfirm={handleExportReport}
                    initialValues={reportInitialValues}
                    exporting={exportingReport}
                    clinicName={clinicName}
                    warningMessage={reportWarningMessage}
                />
            </div>
        </div>
    );
};

export default SliceViewer;
