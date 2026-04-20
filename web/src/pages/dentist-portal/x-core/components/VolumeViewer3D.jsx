import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import '@kitware/vtk.js/favicon';
import '@kitware/vtk.js/Rendering/Profiles/Volume';

import { VOLUME_PRESETS, WL_LUTS } from '../config/volumePresets';
import { VOLUME_CACHE_VERSION, volumeCache } from '../utils/volumeCache';
import { toothOverlayCache } from '../utils/toothOverlayCache';
import { buildImagingUrl, buildStudyAssetParams } from '../utils/imagingUrl';
import useStudyMetadata from '../hooks/useStudyMetadata';

import vtkFullScreenRenderWindow from '@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow';
import vtkVolume from '@kitware/vtk.js/Rendering/Core/Volume';
import vtkVolumeMapper from '@kitware/vtk.js/Rendering/Core/VolumeMapper';
import vtkColorTransferFunction from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction';
import vtkPiecewiseFunction from '@kitware/vtk.js/Common/DataModel/PiecewiseFunction';
import vtkXMLImageDataReader from '@kitware/vtk.js/IO/XML/XMLImageDataReader';
import vtkPlane from '@kitware/vtk.js/Common/DataModel/Plane';
import vtkImageMarchingCubes from '@kitware/vtk.js/Filters/General/ImageMarchingCubes';
import vtkWindowedSincPolyDataFilter from '@kitware/vtk.js/Filters/General/WindowedSincPolyDataFilter';
import vtkLineSource from '@kitware/vtk.js/Filters/Sources/LineSource';
import vtkCylinderSource from '@kitware/vtk.js/Filters/Sources/CylinderSource';
import vtkTubeFilter from '@kitware/vtk.js/Filters/General/TubeFilter';
import vtkPolyData from '@kitware/vtk.js/Common/DataModel/PolyData';
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';
import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';
import vtkLight from '@kitware/vtk.js/Rendering/Core/Light';
import vtkCellPicker from '@kitware/vtk.js/Rendering/Core/CellPicker';
import vtkOrientationMarkerWidget from '@kitware/vtk.js/Interaction/Widgets/OrientationMarkerWidget';
import vtkAnnotatedCubeActor from '@kitware/vtk.js/Rendering/Core/AnnotatedCubeActor';
import vtkWidgetManager from '@kitware/vtk.js/Widgets/Core/WidgetManager';
import vtkImplicitPlaneWidget from '@kitware/vtk.js/Widgets/Widgets3D/ImplicitPlaneWidget';
import vtkImageData from '@kitware/vtk.js/Common/DataModel/ImageData';
import vtkDataArray from '@kitware/vtk.js/Common/Core/DataArray';
import AppIcon from '../../../../components/AppIcon';
import { useAuth } from '../../../../contexts/AuthContext';
import MetadataPanel from './MetadataPanel';
import ReportExportModal from './ReportExportModal';
import SeriesSidebar from './SeriesSidebar';
import ShortcutHelpButton from './ShortcutHelpButton';
import ImplantPlanner from './ImplantPlanner';
import { getAccessToken } from '../../../../utils/auth/tokenStorage';
import { exportPdfReport } from '../utils/reportUtils';

// ─── Constants ──────────────────────────────────────────────────────────
const SAMPLE_DISTANCE_INTERACTIVE = 1.0;
const SAMPLE_DISTANCE_STILL = 0.5;
const PARTIAL_PREVIEW_THRESHOLD = 0.20;
const SLAB_MIN_MM = 1;
const SLAB_MAX_MM = 100;
const SLAB_DEFAULT_MM = 20;
const QUALITY_SETTINGS = {
    eco: { sampleDist: 1.8, maxSamples: 400, label: 'Eco', icon: 'Leaf' },
    standard: { sampleDist: 0.8, maxSamples: 1200, label: 'Standard', icon: 'Monitor' },
    high: { sampleDist: 0.45, maxSamples: 2500, label: 'High', icon: 'Zap' },
    ultra: { sampleDist: 0.28, maxSamples: 4500, label: 'Ultra', icon: 'Star' },
};
const QUALITY_KEYS = Object.keys(QUALITY_SETTINGS);
const VOLUME_SHORTCUTS = [
    { key: 'B', label: 'Bone preset' },
    { key: 'T', label: 'Soft tissue preset' },
    { key: 'M', label: 'MIP preset' },
    { key: 'X', label: 'X-ray preset' },
    { key: 'N', label: 'Sinus preset' },
    { key: 'D', label: 'Density preset' },
    { key: 'R', label: 'Auto-rotate' },
    { key: 'I', label: 'Invert MIP/X-ray' },
    { key: 'Space', label: 'Reset camera' },
    { key: 'F', label: 'Fullscreen' },
];

// Window/Level defaults per render mode
// Data is MONAI-normalized [0.0, 1.0] where 0.0=Air(-1000HU), 0.25=Water(0HU), 1.0=Metal(3000HU)
const WL_DEFAULTS = {
    bone: { center: 0.40,  width: 0.60  },
    soft: { center: 0.28,  width: 0.25  },
    mip:  { center: 0.46,  width: 0.42  },
    xray: { center: 0.34,  width: 0.58  },
    sinus: { center: 0.18, width: 0.35 },
    density: { center: 0.48, width: 0.36 },
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
    sinus: [0.02, 0.04, 0.08],
    density: [0.04, 0.05, 0.08],
};

const VOLUME_MODE_LUTS = {
    bone: 'dental',
    soft: 'softTissue',
    mip: 'implant',
    xray: 'dental',
    sinus: 'sinus',
    density: 'densityMap',
};

const PROJECTION_PRESETS = {
    mip: { slabMm: 28, view: 'right', zoom: 1.35 },
    xray: { slabMm: 55, view: 'front', zoom: 1.45 },
};

const DENSITY_LEGEND = [
    { label: 'D1', range: '>1250 HU', className: 'bg-blue-600', text: 'Dense cortical' },
    { label: 'D2', range: '850-1250 HU', className: 'bg-emerald-500', text: 'Good bone' },
    { label: 'D3', range: '350-850 HU', className: 'bg-yellow-500', text: 'Adequate bone' },
    { label: 'D4', range: '<350 HU', className: 'bg-red-500', text: 'Poor density' },
];
const MEASUREMENT_COLOR = [0.113, 0.62, 0.459];
const NERVE_COLOR = [1.0, 0.82, 0.18];
const PICK_SURFACE_CONTOUR = 0.42;
const overlayResourceMap = new WeakMap();

function clamp01(value) {
    return Math.max(0, Math.min(1, value));
}

function detectGPUTier() {
    try {
        if (typeof document === 'undefined') return 'medium';
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!gl) return 'low';
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        if (!ext) return 'medium';
        const renderer = String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '').toLowerCase();
        if (
            renderer.includes('apple m')
            || renderer.includes('nvidia')
            || renderer.includes('radeon rx')
            || renderer.includes('geforce')
        ) {
            return 'high';
        }
        if (renderer.includes('intel') || renderer.includes('integrated') || renderer.includes('hd graphics')) {
            return 'low';
        }
        return 'medium';
    } catch (_) {
        return 'medium';
    }
}

function defaultQualityForGPU() {
    const tier = detectGPUTier();
    if (tier === 'high') return 'high';
    if (tier === 'low') return 'eco';
    return 'standard';
}

function computeOpacityUnitDistance(imageData, multiplier = 1) {
    if (!imageData) return 1.0;
    const dims = imageData.getDimensions?.() || [1, 1, 1];
    const spacing = imageData.getSpacing?.() || [1, 1, 1];
    const safeSpacing = spacing.map((value) => {
        const parsed = Number(value);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
    });
    const physDiagonalMm = Math.sqrt(
        ((dims[0] || 1) * safeSpacing[0]) ** 2
        + ((dims[1] || 1) * safeSpacing[1]) ** 2
        + ((dims[2] || 1) * safeSpacing[2]) ** 2
    );
    const targetVisualDepthMm = 90.0;
    const unitDist = (physDiagonalMm / targetVisualDepthMm) * Math.max(...safeSpacing) * multiplier;
    return Math.max(0.3, Math.min(unitDist, 3.0));
}

function applyOpacityUnitDistance(actor, imageData, multiplier = 1) {
    actor?.getProperty?.()?.setScalarOpacityUnitDistance?.(0, computeOpacityUnitDistance(imageData, multiplier));
}

function applyBoneMaterial(actor) {
    const property = actor?.getProperty?.();
    if (!property) return;
    property.setShade(true);
    property.setAmbient(0.25);
    property.setDiffuse(0.75);
    property.setSpecular(0.35);
    property.setSpecularPower(18);
    property.setUseGradientOpacity(0, true);
    property.setGradientOpacityMinimumValue(0, 0);
    property.setGradientOpacityMinimumOpacity(0, 0.0);
    property.setGradientOpacityMaximumValue(0, 0.08);
    property.setGradientOpacityMaximumOpacity(0, 1.0);
}

function addGrayscaleLutPoints(ctfun, lutName, isInverted = false, windowOptions = null) {
    const lut = WL_LUTS[lutName] || WL_LUTS.dental;
    const useDisplayWindow = windowOptions?.wWidth > 0;
    const low = useDisplayWindow ? windowOptions.wCenter - (windowOptions.wWidth / 2) : 0;

    lut.forEach(([value, gray]) => {
        let level = useDisplayWindow ? clamp01((gray - low) / windowOptions.wWidth) : gray;
        if (isInverted) {
            level = 1 - level;
        }
        ctfun.addRGBPoint(value, level, level, level);
    });
}

function addProjectionWindowPoints(ctfun, presetName, isInverted = false, windowOptions = null) {
    const center = Number.isFinite(windowOptions?.wCenter) ? windowOptions.wCenter : WL_DEFAULTS[presetName]?.center || 0.45;
    const width = Math.max(Number(windowOptions?.wWidth) || WL_DEFAULTS[presetName]?.width || 0.5, 0.02);
    const low = center - (width / 2);
    const gamma = presetName === 'xray' ? 0.82 : 0.72;
    const stops = presetName === 'xray'
        ? [0.0, 0.12, 0.18, 0.24, 0.30, 0.38, 0.46, 0.58, 0.74, 1.0]
        : [0.0, 0.24, 0.30, 0.36, 0.42, 0.50, 0.62, 0.78, 1.0];

    stops.forEach((value) => {
        let level = clamp01((value - low) / width);
        level = Math.pow(level, gamma);
        if (presetName === 'mip' && value < 0.30) level = 0;
        if (presetName === 'xray' && value < 0.10) level = 0;
        if (isInverted) {
            level = 1 - level;
        }
        ctfun.addRGBPoint(value, level, level, level);
    });
}

function addColorPresetPoints(ctfun, colorPoints, isInverted = false) {
    colorPoints.forEach(([value, r, g, b]) => {
        ctfun.addRGBPoint(
            value,
            isInverted ? 1 - r : r,
            isInverted ? 1 - g : g,
            isInverted ? 1 - b : b
        );
    });
}

function applyMapperQuality(mapper, qualityKey, presetName) {
    if (!mapper) return;
    const q = QUALITY_SETTINGS[qualityKey] || QUALITY_SETTINGS.standard;
    if (presetName === 'mip' || presetName === 'xray') {
        mapper.setSampleDistance(Math.min(q.sampleDist, 0.35));
        mapper.setMaximumSamplesPerRay(Math.max(q.maxSamples, 2200));
        return;
    }
    mapper.setSampleDistance(q.sampleDist);
    mapper.setMaximumSamplesPerRay(q.maxSamples);
}

function setMapperToXrayProjection(mapper) {
    if (!mapper) return;
    if (typeof mapper.setBlendModeToRadonTransform === 'function') {
        mapper.setBlendModeToRadonTransform();
        return;
    }
    if (typeof mapper.setBlendModeToAdditiveIntensity === 'function') {
        mapper.setBlendModeToAdditiveIntensity();
        return;
    }
    mapper.setBlendModeToAverageIntensity();
}

function arraysNearlyEqual(a, b, epsilon = 1e-3) {
    if (!a || !b || a.length !== b.length) return false;
    return a.every((value, index) => Math.abs(value - b[index]) <= epsilon);
}

function setOverlayResources(actor, resources) {
    if (!actor || !resources) return;
    try {
        overlayResourceMap.set(actor, resources);
    } catch (_) {}
}

function overlayMatchesVolumeGeometry(cachedOverlay, imageData) {
    const labelImageData = cachedOverlay?.labelImageData;
    if (!labelImageData || !imageData) return false;

    return arraysNearlyEqual(labelImageData.getDimensions?.(), imageData.getDimensions?.(), 0)
        && arraysNearlyEqual(labelImageData.getSpacing?.(), imageData.getSpacing?.())
        && arraysNearlyEqual(labelImageData.getOrigin?.(), imageData.getOrigin?.());
}

function disposeToothActors(renderer, actors = []) {
    actors.forEach((actor) => {
        if (!actor) return;
        try { renderer?.removeActor?.(actor); } catch (_) {}
        try { actor.getMapper?.()?.delete?.(); } catch (_) {}
        try { actor.__xcoreSmoother?.delete?.(); } catch (_) {}
        try { actor.__xcoreMarching?.delete?.(); } catch (_) {}
        try { actor.__xcoreMaskImage?.delete?.(); } catch (_) {}
        try { actor.delete?.(); } catch (_) {}
    });
}

function disposeOverlayActors(renderer, actors = []) {
    actors.forEach((actor) => {
        if (!actor) return;
        const resources = overlayResourceMap.get(actor);
        try { renderer?.removeActor?.(actor); } catch (_) {}
        try { actor.getMapper?.()?.delete?.(); } catch (_) {}
        try { (resources?.source || actor.__xcoreSource)?.delete?.(); } catch (_) {}
        try { (resources?.tube || actor.__xcoreTube)?.delete?.(); } catch (_) {}
        try { (resources?.polyData || actor.__xcorePolyData)?.delete?.(); } catch (_) {}
        try { overlayResourceMap.delete(actor); } catch (_) {}
        try { actor.delete?.(); } catch (_) {}
    });
}

function disposeSurfacePickActor(ctx) {
    if (!ctx?.surfacePickActor) return;
    try { ctx.renderer?.removeActor?.(ctx.surfacePickActor); } catch (_) {}
    try { ctx.surfacePickActor.getMapper?.()?.delete?.(); } catch (_) {}
    try { ctx.surfacePickActor.__xcoreMarching?.delete?.(); } catch (_) {}
    try { ctx.surfacePickActor.delete?.(); } catch (_) {}
    ctx.surfacePickActor = null;
}

function syncMapperClipping(ctx, includeSlab = false) {
    if (!ctx?.mapper) return;
    ctx.mapper.removeAllClippingPlanes();
    if (ctx.clipPlane) {
        ctx.mapper.addClippingPlane(ctx.clipPlane);
    }
    if (includeSlab && ctx.slabPlanes?.length === 2) {
        ctx.mapper.addClippingPlane(ctx.slabPlanes[0]);
        ctx.mapper.addClippingPlane(ctx.slabPlanes[1]);
    }
    ctx.renderWindow?.render?.();
}

function distanceMm(pointA, pointB) {
    const dx = pointA[0] - pointB[0];
    const dy = pointA[1] - pointB[1];
    const dz = pointA[2] - pointB[2];
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function midpoint(pointA, pointB) {
    return [
        (pointA[0] + pointB[0]) / 2,
        (pointA[1] + pointB[1]) / 2,
        (pointA[2] + pointB[2]) / 2,
    ];
}

function buildDentistName(user) {
    return [user?.profile?.title, user?.name].filter(Boolean).join(' ').trim();
}

function setupClinicalLights(renderer, center, maxDim) {
    if (!renderer || !center) return [];
    try { renderer.removeAllLights?.(); } catch (_) {}

    const makeLight = ({ position, intensity, color }) => {
        const light = vtkLight.newInstance();
        light.setLightTypeToSceneLight();
        light.setPosition(
            center[0] + position[0] * maxDim,
            center[1] + position[1] * maxDim,
            center[2] + position[2] * maxDim
        );
        light.setFocalPoint(center[0], center[1], center[2]);
        light.setIntensity(intensity);
        light.setColor(...color);
        renderer.addLight(light);
        return light;
    };

    return [
        makeLight({ position: [1.5, 2.0, 1.0], intensity: 1.2, color: [1.0, 0.97, 0.92] }),
        makeLight({ position: [-2.0, 0.5, 0.5], intensity: 0.35, color: [0.88, 0.93, 1.0] }),
        makeLight({ position: [0, -1.0, -2.0], intensity: 0.20, color: [1.0, 1.0, 1.0] }),
    ];
}

function setupOrientationMarker(renderWindow, renderer) {
    if (!renderWindow?.getInteractor || !renderer) return null;
    try {
        const cubeActor = vtkAnnotatedCubeActor.newInstance();
        cubeActor.setDefaultStyle({
            text: '',
            fontStyle: 'bold',
            fontFamily: 'Arial',
            fontColor: 'white',
            fontSizeScale: 0.65,
            faceColor: '#0f172a',
            faceRotation: 0,
            edgeThickness: 0.1,
            edgeColor: '#475569',
        });
        cubeActor.setXPlusFaceProperty({ text: 'R', faceColor: '#1e293b' });
        cubeActor.setXMinusFaceProperty({ text: 'L', faceColor: '#1e293b' });
        cubeActor.setYPlusFaceProperty({ text: 'A', faceColor: '#1e293b' });
        cubeActor.setYMinusFaceProperty({ text: 'P', faceColor: '#1e293b' });
        cubeActor.setZPlusFaceProperty({ text: 'S', faceColor: '#1e293b' });
        cubeActor.setZMinusFaceProperty({ text: 'I', faceColor: '#1e293b' });

        const orientMarker = vtkOrientationMarkerWidget.newInstance({
            actor: cubeActor,
            interactor: renderWindow.getInteractor(),
            parentRenderer: renderer,
            viewportSize: 0.12,
            minPixelSize: 80,
            maxPixelSize: 120,
            interactiveRenderer: false,
        });
        orientMarker.setViewportCorner(vtkOrientationMarkerWidget.Corners.BOTTOM_RIGHT);
        orientMarker.setEnabled(true);
        return { orientMarker, cubeActor };
    } catch (orientationError) {
        console.warn('[VolumeViewer3D] Orientation cube setup failed:', orientationError);
        return null;
    }
}

async function addScreenshotWatermark(dataURL, { patientName, studyDate, preset, clinicName }) {
    if (typeof Image === 'undefined' || !dataURL?.startsWith?.('data:image')) return dataURL;
    try {
        const img = new Image();
        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = dataURL;
        });

        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const c = canvas.getContext('2d');
        if (!c) return dataURL;

        c.drawImage(img, 0, 0);
        const barH = Math.max(28, Math.round(img.height * 0.04));
        c.fillStyle = 'rgba(10, 20, 40, 0.82)';
        c.fillRect(0, 0, img.width, barH);

        c.fillStyle = '#FFFFFF';
        const fs = Math.max(11, Math.round(barH * 0.45));
        c.font = `500 ${fs}px sans-serif`;
        const watermark = `${patientName || 'Patient'} | ${studyDate || ''} | ${(preset || 'bone').toUpperCase()} | ${clinicName || ''}`;
        c.fillText(watermark, Math.round(img.width * 0.01), Math.round(barH * 0.68));
        return canvas.toDataURL('image/png');
    } catch (watermarkError) {
        console.warn('[VolumeViewer3D] Screenshot watermark failed:', watermarkError);
        return dataURL;
    }
}

async function buildPreviewSnapshot(imageData, sampleDist = 2.5) {
    if (typeof document === 'undefined' || !imageData) return null;
    const previewContainer = document.createElement('div');
    previewContainer.style.cssText = 'position:fixed;left:-10000px;top:-10000px;width:640px;height:480px;pointer-events:none;opacity:0;';
    document.body.appendChild(previewContainer);

    let fullScreenRenderer = null;
    let mapper = null;
    let actor = null;
    let ctfun = null;
    let ofun = null;
    let previewRenderer = null;
    let lights = [];

    try {
        fullScreenRenderer = vtkFullScreenRenderWindow.newInstance({
            container: previewContainer,
            background: BG_COLORS.bone,
        });
        const renderer = fullScreenRenderer.getRenderer();
        previewRenderer = renderer;
        const renderWindow = fullScreenRenderer.getRenderWindow();

        mapper = vtkVolumeMapper.newInstance();
        mapper.setInputData(imageData);
        mapper.setSampleDistance(sampleDist);
        mapper.setMaximumSamplesPerRay(280);
        mapper.setBlendModeToComposite();

        actor = vtkVolume.newInstance();
        actor.setMapper(mapper);

        ctfun = vtkColorTransferFunction.newInstance();
        ofun = vtkPiecewiseFunction.newInstance();
        addGrayscaleLutPoints(ctfun, 'dental', false);
        VOLUME_PRESETS.bone.opacity.forEach(([v, a]) => ofun.addPoint(v, a));

        actor.getProperty().setRGBTransferFunction(0, ctfun);
        actor.getProperty().setScalarOpacity(0, ofun);
        actor.getProperty().setInterpolationTypeToLinear();
        applyBoneMaterial(actor);
        applyOpacityUnitDistance(actor, imageData, 1);
        renderer.addVolume(actor);

        const bounds = imageData.getBounds();
        const center = [
            (bounds[0] + bounds[1]) / 2,
            (bounds[2] + bounds[3]) / 2,
            (bounds[4] + bounds[5]) / 2,
        ];
        const maxDim = Math.max(bounds[1] - bounds[0], bounds[3] - bounds[2], bounds[5] - bounds[4]);
        lights = setupClinicalLights(renderer, center, maxDim);
        renderer.resetCamera();
        renderWindow.render();

        const captures = renderWindow.captureImages?.('image/png', { scale: 1 });
        if (!Array.isArray(captures) || captures.length === 0) return null;
        return await captures[0];
    } catch (_) {
        return null;
    } finally {
        lights.forEach((light) => {
            try { previewRenderer?.removeLight?.(light); } catch (_) {}
            try { light?.delete?.(); } catch (_) {}
        });
        try { fullScreenRenderer?.getRenderer?.()?.removeVolume?.(actor); } catch (_) {}
        try { mapper?.delete?.(); } catch (_) {}
        try { actor?.delete?.(); } catch (_) {}
        try { ctfun?.delete?.(); } catch (_) {}
        try { ofun?.delete?.(); } catch (_) {}
        try { fullScreenRenderer?.delete?.(); } catch (_) {}
        previewContainer.remove();
    }
}

function disposeVolumeContext(ctx) {
    if (!ctx) return;

    try { ctx.clipWidget?.subscription?.unsubscribe?.(); } catch (_) {}
    try { ctx.clipWidget?.widgetManager?.removeWidgets?.(); } catch (_) {}
    try { ctx.clipWidget?.widgetManager?.delete?.(); } catch (_) {}
    try { ctx.clipPlane?.delete?.(); } catch (_) {}
    disposeSurfacePickActor(ctx);
    disposeToothActors(ctx.renderer, ctx.labelActors || []);
    disposeOverlayActors(ctx.renderer, ctx.overlayActors || []);
    (ctx.lights || []).forEach((light) => {
        try { ctx.renderer?.removeLight?.(light); } catch (_) {}
        try { light?.delete?.(); } catch (_) {}
    });
    try { ctx.orientMarker?.setEnabled?.(false); } catch (_) {}
    try { ctx.orientMarker?.delete?.(); } catch (_) {}
    try { ctx.orientationCube?.delete?.(); } catch (_) {}

    try { ctx.renderer?.removeVolume?.(ctx.actor); } catch (_) {}
    try { ctx.mapper?.delete?.(); } catch (_) {}
    try { ctx.actor?.delete?.(); } catch (_) {}
    try { ctx.ctfun?.delete?.(); } catch (_) {}
    try { ctx.ofun?.delete?.(); } catch (_) {}

    if (ctx.sharpenTimer) {
        clearTimeout(ctx.sharpenTimer);
    }

    try { ctx.fullScreenRenderer?.delete?.(); } catch (_) {}
}

function positionCameraForView(ctx, viewName, zoom = 1.3) {
    const view = CAMERA_VIEWS[viewName];
    if (!ctx || !view) return false;

    const { renderer, renderWindow, imageData } = ctx;
    const camera = renderer.getActiveCamera();
    const bounds = imageData.getBounds();
    const center = [
        (bounds[0] + bounds[1]) / 2,
        (bounds[2] + bounds[3]) / 2,
        (bounds[4] + bounds[5]) / 2,
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
    camera.zoom(zoom);
    renderWindow.render();
    return true;
}

function hslToRgb(h, s, l) {
    const hue = ((h % 360) + 360) % 360;
    const c = (1 - Math.abs((2 * l) - 1)) * s;
    const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
    const m = l - (c / 2);

    let r = 0;
    let g = 0;
    let b = 0;

    if (hue < 60) [r, g, b] = [c, x, 0];
    else if (hue < 120) [r, g, b] = [x, c, 0];
    else if (hue < 180) [r, g, b] = [0, c, x];
    else if (hue < 240) [r, g, b] = [0, x, c];
    else if (hue < 300) [r, g, b] = [x, 0, c];
    else [r, g, b] = [c, 0, x];

    return [r + m, g + m, b + m];
}

function getToothColor(labelIndex) {
    return hslToRgb((labelIndex * 37) % 360, 0.68, 0.58);
}

function waitForNextFrame() {
    return new Promise((resolve) => {
        if (typeof window === 'undefined' || !window.requestAnimationFrame) {
            setTimeout(resolve, 0);
            return;
        }
        window.requestAnimationFrame(() => resolve());
    });
}

function createBinaryMaskImage(sourceImageData, labelValue) {
    const scalars = sourceImageData.getPointData()?.getScalars();
    const values = scalars?.getData?.();
    if (!values?.length) return null;

    const maskValues = new Uint8Array(values.length);
    let voxelCount = 0;
    for (let index = 0; index < values.length; index += 1) {
        if (values[index] === labelValue) {
            maskValues[index] = 1;
            voxelCount += 1;
        }
    }

    if (voxelCount === 0) return null;

    const maskImage = vtkImageData.newInstance();
    maskImage.setDimensions(...sourceImageData.getDimensions());
    maskImage.setSpacing(...sourceImageData.getSpacing());
    maskImage.setOrigin(...sourceImageData.getOrigin());
    maskImage.getPointData().setScalars(vtkDataArray.newInstance({
        name: `ToothLabel${labelValue}`,
        numberOfComponents: 1,
        values: maskValues,
    }));

    return { maskImage, voxelCount };
}

const VolumeViewer3D = ({
    study,
    onBack,
    onSwitchToSliceMode,
    onSwitchToLinkedMode = null,
    onSwitchSeries,
    onVolumeLoaded = null,
    onSurfaceClick = null,
    linkedMode = false,
}) => {
    const { user } = useAuth();
    const containerRef = useRef(null);
    const wrapperRef = useRef(null);
    const moreToolsMenuRef = useRef(null);
    const vtkContextRef = useRef(null);
    const pendingVtkRef = useRef(null);
    const overlayAbortRef = useRef(null);
    const overlayBuildIdRef = useRef(0);
    const autoToothLoadKeyRef = useRef(null);
    const onVolumeLoadedRef = useRef(onVolumeLoaded);
    const implantSkipPersistRef = useRef(false);
    const measurementSkipPersistRef = useRef(false);
    const clipPlaneStateRef = useRef(null);

    // Core state
    const [loading, setLoading] = useState(true);
    const [loadingStage, setLoadingStage] = useState('Connecting...');
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [previewImage, setPreviewImage] = useState(null);
    const [error, setError] = useState(null);
    const [preset, setPreset] = useState('bone');
    const [autoRotate, setAutoRotate] = useState(false);
    const [containerReady, setContainerReady] = useState(false);
    const [volumeInfo, setVolumeInfo] = useState(null);
    const [quality, setQuality] = useState(defaultQualityForGPU);
    const [stlExporting, setStlExporting] = useState(false);
    const [stlError, setStlError] = useState(null);
    const [surfacePickLoading, setSurfacePickLoading] = useState(false);
    const qualityRef = useRef(quality);
    const presetRef = useRef('bone');

    // Interactive planning tools
    const [clippingMode, setClippingMode] = useState(false);
    const [clipError, setClipError] = useState(null);
    const [measureMode3D, setMeasureMode3D] = useState(false);
    const [measurePoints, setMeasurePoints] = useState([]);
    const [measurements3D, setMeasurements3D] = useState([]);
    const [measurementRevision, setMeasurementRevision] = useState(0);
    const [showNerveOverlay, setShowNerveOverlay] = useState(false);
    const [nerveLoading, setNerveLoading] = useState(false);
    const [nerveError, setNerveError] = useState(null);
    const [nerveInfo, setNerveInfo] = useState(null);
    const [implantPlannerOpen, setImplantPlannerOpen] = useState(false);
    const [implantPlaceMode, setImplantPlaceMode] = useState(false);
    const [implantDiameter, setImplantDiameter] = useState(4.1);
    const [implantLength, setImplantLength] = useState(10);
    const [implantBrand, setImplantBrand] = useState('Straumann');
    const [implantPlacements, setImplantPlacements] = useState([]);
    const [implantError, setImplantError] = useState(null);
    const [aiReportOpen, setAiReportOpen] = useState(false);
    const [aiReport, setAiReport] = useState('');
    const [aiReportLoading, setAiReportLoading] = useState(false);
    const [aiReportError, setAiReportError] = useState(null);
    const [densityHistogram, setDensityHistogram] = useState(null);
    const [densityLoading, setDensityLoading] = useState(false);
    const [densityError, setDensityError] = useState(null);
    const [reportModalOpen, setReportModalOpen] = useState(false);
    const [exportingReport, setExportingReport] = useState(false);
    const [reportWarningMessage, setReportWarningMessage] = useState('');

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
    const [showMoreTools, setShowMoreTools] = useState(false);

    // Series panel
    const [showSeriesPanel, setShowSeriesPanel] = useState(false);
    const [showMetadataPanel, setShowMetadataPanel] = useState(false);
    const [showTeethOverlay, setShowTeethOverlay] = useState(false);
    const [teethLoading, setTeethLoading] = useState(false);
    const [teethError, setTeethError] = useState(null);
    const [toothOverlayLoaded, setToothOverlayLoaded] = useState(false);
    const [toothOverlayAvailable, setToothOverlayAvailable] = useState(false);

    // Stable study key for caching
    const studyKey = useMemo(() => study?.folderName || study?.id || '', [study]);
    const seriesUid = useMemo(() => study?.selectedSeriesUid || '', [study]);
    const cacheKey = useMemo(() => `${studyKey}__${seriesUid}`, [studyKey, seriesUid]);
    const implantStorageKey = useMemo(() => `xcore.implants.${studyKey || 'study'}__${seriesUid || 'default'}`, [studyKey, seriesUid]);
    const measurementStorageKey = useMemo(() => `xcore.measurements3d.${studyKey || 'study'}__${seriesUid || 'default'}`, [studyKey, seriesUid]);
    const clipStorageKey = useMemo(() => `xcore.clipPlane.${studyKey || 'study'}__${seriesUid || 'default'}`, [studyKey, seriesUid]);
    const showBack = typeof onBack === 'function';
    const allowSeriesSwitch = !study?.readOnly && typeof onSwitchSeries === 'function';
    const currentSeriesInfo = useMemo(() => {
        const series = Array.isArray(study?.series) ? study.series : [];
        if (!seriesUid) return series.find((item) => item.classification === '3D') || null;
        return series.find((item) => item.series_uid === seriesUid) || null;
    }, [study?.series, seriesUid]);
    const knownLabelCount = Number(currentSeriesInfo?.num_labels || 0);
    const canLoadTeethOverlay = Boolean((currentSeriesInfo?.has_labels && knownLabelCount > 0) || toothOverlayAvailable || toothOverlayLoaded || teethLoading);
    const shouldShowTeethToggle = Boolean(currentSeriesInfo && currentSeriesInfo.classification !== '2D');
    const { metadata, loading: metadataLoading, error: metadataError } = useStudyMetadata(study, {
        enabled: !!studyKey,
    });
    const dentistName = useMemo(() => buildDentistName(user), [user]);
    const patientName = metadata?.PatientName || study?.patientName || study?.originalName || 'Patient';
    const clinicName = user?.profile?.clinic_name || metadata?.InstitutionName || 'Dental Clinic';
    const reportInitialValues = useMemo(() => ({
        dentistName,
        patientName,
        clinicalNotes: aiReport ? `AI preliminary assessment:\n${aiReport}` : '',
        includeScreenshot: true,
        includeMetadataSummary: true,
    }), [aiReport, dentistName, patientName]);

    useEffect(() => {
        onVolumeLoadedRef.current = onVolumeLoaded;
    }, [onVolumeLoaded]);

    useEffect(() => {
        presetRef.current = preset;
    }, [preset]);

    useEffect(() => {
        qualityRef.current = quality;
        const ctx = vtkContextRef.current;
        if (!ctx?.mapper || loading) return;
        applyMapperQuality(ctx.mapper, quality, presetRef.current);
        ctx.renderWindow.render();
    }, [cacheKey, loading, quality, preset]);

    const createToothOverlayActors = useCallback(async (labelImageData, labelIds = [], options = {}) => {
        const scalars = labelImageData.getPointData()?.getScalars();
        const values = scalars?.getData?.();
        if (!values?.length) return [];

        const uniqueLabels = labelIds.length
            ? labelIds.map((value) => Number(value)).filter((value) => value > 0)
            : (() => {
                const labelSet = new Set();
                for (let index = 0; index < values.length; index += 1) {
                    const value = values[index];
                    if (value > 0) {
                        labelSet.add(value);
                    }
                }
                return Array.from(labelSet).sort((a, b) => a - b);
            })();

        const ensureActive = () => {
            if (options.signal?.aborted || (options.buildId && overlayBuildIdRef.current !== options.buildId)) {
                const abortError = new Error('Tooth overlay load cancelled');
                abortError.name = 'AbortError';
                throw abortError;
            }
        };

        const actors = [];

        for (let index = 0; index < uniqueLabels.length; index += 1) {
            ensureActive();
            const labelValue = uniqueLabels[index];
            const maskPayload = createBinaryMaskImage(labelImageData, labelValue);
            if (!maskPayload || maskPayload.voxelCount < 24) {
                continue;
            }

            const marching = vtkImageMarchingCubes.newInstance({
                contourValue: 0.6,
                computeNormals: true,
                mergePoints: true,
            });
            marching.setInputData(maskPayload.maskImage);
            marching.update();

            const smoother = vtkWindowedSincPolyDataFilter.newInstance();
            smoother.setInputConnection(marching.getOutputPort());
            smoother.setNumberOfIterations(15);
            smoother.setPassBand(0.1);
            smoother.setBoundarySmoothing(false);
            smoother.setNonManifoldSmoothing(true);
            smoother.setNormalizeCoordinates(true);
            smoother.update();

            const mapper = vtkMapper.newInstance();
            mapper.setInputConnection(smoother.getOutputPort());

            const actor = vtkActor.newInstance();
            actor.setMapper(mapper);
            actor.setVisibility(false);
            actor.__xcoreMapper = mapper;
            actor.__xcoreMarching = marching;
            actor.__xcoreSmoother = smoother;
            actor.__xcoreMaskImage = maskPayload.maskImage;

            const [r, g, b] = getToothColor(index + 1);
            const property = actor.getProperty();
            property.setColor(r, g, b);
            property.setOpacity(0.78);
            property.setAmbient(0.25);
            property.setDiffuse(0.75);
            property.setSpecular(0.18);
            property.setSpecularPower(18);

            actors.push(actor);
            if (typeof options.onActor === 'function') {
                options.onActor(actor);
            }
            if (index < uniqueLabels.length - 1) {
                await waitForNextFrame();
            }
        }

        return actors;
    }, []);

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

        const lutName = VOLUME_MODE_LUTS[presetName] || 'dental';
        if (presetName === 'sinus') {
            ctfun.addRGBPoint(0.0, 0.0, 0.4, 0.85);
            ctfun.addRGBPoint(0.08, 0.0, 0.5, 0.90);
            ctfun.addRGBPoint(0.14, 0.8, 0.8, 0.9);
            ctfun.addRGBPoint(0.42, 0.95, 0.90, 0.82);
            ctfun.addRGBPoint(1.0, 1.0, 0.98, 0.95);
        } else if (presetName === 'density') {
            ctfun.addRGBPoint(0.00, 0.0, 0.0, 0.0);
            ctfun.addRGBPoint(0.32, 0.0, 0.0, 0.0);
            ctfun.addRGBPoint(0.338, 0.92, 0.18, 0.18);
            ctfun.addRGBPoint(0.395, 0.93, 0.72, 0.10);
            ctfun.addRGBPoint(0.462, 0.15, 0.78, 0.35);
            ctfun.addRGBPoint(0.563, 0.10, 0.35, 0.90);
            ctfun.addRGBPoint(1.0, 0.08, 0.28, 0.78);
        } else if (presetName === 'mip' || presetName === 'xray') {
            addProjectionWindowPoints(ctfun, presetName, isInverted, {
                wCenter: opts.wCenter !== undefined ? opts.wCenter : WL_DEFAULTS[presetName].center,
                wWidth: opts.wWidth !== undefined ? opts.wWidth : WL_DEFAULTS[presetName].width,
            });
        } else if (presetName === 'soft') {
            addColorPresetPoints(ctfun, VOLUME_PRESETS.soft.color, isInverted);
        } else {
            addGrayscaleLutPoints(ctfun, lutName, isInverted);
        }

        console.log('[VolumeViewer3D] applyPreset:', presetName,
            '| LUT:', lutName,
            '| range:', dMin.toFixed(3), '→', dMax.toFixed(3),
            '| MONAI normalized [0,1]');

        if (presetName === 'bone') {
            const preset = VOLUME_PRESETS.bone;
            preset.opacity.forEach(([v, a]) => ofun.addPoint(v, a));
        } else if (presetName === 'soft') {
            const preset = VOLUME_PRESETS.soft;
            preset.opacity.forEach(([v, a]) => ofun.addPoint(v, a));
        } else if (presetName === 'mip') {
            // ── MIP (Maximum Intensity Projection) ──
            // Gate low-density soft tissue/noise so dense tooth/implant anatomy dominates.
            ofun.addPoint(lo,   0.0);
            ofun.addPoint(0.24, 0.0);
            ofun.addPoint(0.30, 0.08);
            ofun.addPoint(0.36, 0.35);
            ofun.addPoint(0.42, 0.75);
            ofun.addPoint(0.50, 1.0);
            ofun.addPoint(hi,   1.0);

        } else if (presetName === 'xray') {
            // ── X-RAY DRR (Digital Radiograph Reconstruction) ──
            // Radon/additive projection needs enough opacity through dentin and bone;
            // the scalar window controls brightness/contrast instead of hiding anatomy.
            ofun.addPoint(lo,       0.0);
            ofun.addPoint(hu(-700), 0.0);
            ofun.addPoint(hu(-200), 0.03);
            ofun.addPoint(hu(0),    0.10);
            ofun.addPoint(hu(300),  0.26);
            ofun.addPoint(hu(700),  0.52);
            ofun.addPoint(hu(1200), 0.78);
            ofun.addPoint(hi,       1.0);
        } else if (presetName === 'sinus') {
            ofun.addPoint(0.0,  0.0);
            ofun.addPoint(0.04, 0.55);
            ofun.addPoint(0.10, 0.40);
            ofun.addPoint(0.14, 0.02);
            ofun.addPoint(0.40, 0.0);
            ofun.addPoint(0.43, 0.35);
            ofun.addPoint(0.55, 0.72);
            ofun.addPoint(1.0,  0.88);
        } else if (presetName === 'density') {
            ofun.addPoint(0.00, 0.0);
            ofun.addPoint(0.32, 0.0);
            ofun.addPoint(0.338, 0.28);
            ofun.addPoint(0.395, 0.42);
            ofun.addPoint(0.462, 0.56);
            ofun.addPoint(0.563, 0.72);
            ofun.addPoint(1.0, 0.82);
        }
    }, []);

    // ═══════════════════════════════════════════════════════════════════
    // Slab Clipping
    // ═══════════════════════════════════════════════════════════════════
    const updateSlabClipping = useCallback((thicknessMM) => {
        const ctx = vtkContextRef.current;
        if (!ctx) return;
        const { renderer, slabPlanes } = ctx;

        if (!slabPlanes || thicknessMM >= SLAB_MAX_MM) {
            ctx.slabClippingActive = false;
            syncMapperClipping(ctx, false);
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

        ctx.slabClippingActive = true;
        syncMapperClipping(ctx, true);
    }, []);

    // ═══════════════════════════════════════════════════════════════════
    // Container Readiness (robust: polls until container has real dimensions)
    // ═══════════════════════════════════════════════════════════════════
    useEffect(() => {
        if (!containerRef.current) return;
        let attempts = 0;
        const MAX_ATTEMPTS = 20; // 20 × 100ms = 2s max wait
        let timer;
        const check = () => {
            if (containerRef.current?.offsetWidth > 0 && containerRef.current?.offsetHeight > 0) {
                setContainerReady(true);
                return;
            }
            attempts++;
            if (attempts < MAX_ATTEMPTS) {
                timer = setTimeout(check, 100);
            } else {
                // Force ready after timeout — layout should be stable by now
                console.warn('[VolumeViewer3D] Container readiness timeout, forcing ready');
                setContainerReady(true);
            }
        };
        check();
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
            setPreviewImage(null);
            setShowTeethOverlay(false);
            setTeethLoading(false);
            setTeethError(null);
            setStlError(null);
            setClipError(null);
            setNerveError(null);
            setImplantError(null);
            setClippingMode(false);
            setMeasureMode3D(false);
            setMeasurePoints([]);
            setShowNerveOverlay(false);
            setNerveInfo(null);
            setImplantPlaceMode(false);
            setAiReport('');
            setAiReportError(null);
            setAiReportOpen(false);
            setDensityHistogram(null);
            setDensityError(null);
            setReportModalOpen(false);
            setReportWarningMessage('');
            setToothOverlayLoaded(false);
            setToothOverlayAvailable(false);
            setPreset('bone');
            setWindowCenter(WL_DEFAULTS.bone.center);
            setWindowWidth(WL_DEFAULTS.bone.width);
            setInverted(false);
            setAutoRotate(false);
            setSlabEnabled(false);
            setSlabThickness(SLAB_DEFAULT_MM);
            slabEnabledRef.current = false;
            slabThicknessRef.current = SLAB_DEFAULT_MM;
            overlayAbortRef.current?.abort();
            overlayAbortRef.current = null;
            overlayBuildIdRef.current += 1;
            autoToothLoadKeyRef.current = null;
            setLoadingProgress(isCached ? 85 : 0);
            setLoadingStage(isCached ? 'Restoring from cache...' : 'Connecting...');

            try {
                let imageData;

                if (isCached) {
                    console.log('[VolumeViewer3D] ✅ Cache HIT:', cacheKey, '| Cache size:', volumeCache.size);
                    imageData = volumeCache.get(cacheKey);
                } else {
                    console.log('[VolumeViewer3D] ❌ Cache MISS:', cacheKey, '| Cached keys:', [...volumeCache.keys()]);
                    const url = buildImagingUrl(
                        `/volume/${studyKey}`,
                        buildStudyAssetParams(study, {
                            series_uid: seriesUid || undefined,
                            v: VOLUME_CACHE_VERSION,
                        })
                    );
                    console.log('[VolumeViewer3D] Fetching VTI from:', url);

                    setLoadingStage('Connecting...');
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
                    let partialRendered = false;

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

                        if (!partialRendered && totalBytes > 0 && receivedBytes / totalBytes >= PARTIAL_PREVIEW_THRESHOLD) {
                            partialRendered = true;
                            try {
                                const partialBuffer = new Uint8Array(receivedBytes);
                                let partialOffset = 0;
                                for (const chunk of chunks) {
                                    partialBuffer.set(chunk, partialOffset);
                                    partialOffset += chunk.length;
                                }
                                const partialReader = vtkXMLImageDataReader.newInstance();
                                partialReader.parseAsArrayBuffer(partialBuffer.buffer);
                                const partialData = partialReader.getOutputData(0);
                                if (partialData && !cancelled) {
                                    const snapshot = await buildPreviewSnapshot(partialData, 2.5);
                                    if (snapshot && !cancelled) {
                                        setPreviewImage(snapshot);
                                        setLoadingStage('Partial preview ready — downloading full quality...');
                                    }
                                }
                            } catch (_) {
                                // Most compressed VTI files cannot be parsed partially; ignore and continue full load.
                            }
                        }
                    }

                    if (cancelled) return;

                    setLoadingStage('Decompressing...');
                    setLoadingProgress(70);

                    const fullBuffer = new Uint8Array(receivedBytes);
                    let offset = 0;
                    for (const chunk of chunks) {
                        fullBuffer.set(chunk, offset);
                        offset += chunk.length;
                    }

                    setLoadingStage('Decompressing...');
                    setLoadingProgress(78);

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

                setLoadingStage('Building 3D scene...');
                setLoadingProgress(85);

                const fullScreenRenderer = vtkFullScreenRenderWindow.newInstance({
                    container: containerRef.current,
                    background: BG_COLORS.bone
                });
                pendingVtkRef.current = fullScreenRenderer;

                const renderer = fullScreenRenderer.getRenderer();
                const renderWindow = fullScreenRenderer.getRenderWindow();
                const interactor = fullScreenRenderer.getInteractor();

                const mapper = vtkVolumeMapper.newInstance();
                mapper.setInputData(imageData);
                applyMapperQuality(mapper, qualityRef.current, 'bone');
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

                applyBoneMaterial(actor);
                applyOpacityUnitDistance(actor, imageData, 1);

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
                        applyMapperQuality(mapper, qualityRef.current, presetRef.current);
                        renderWindow.render();
                    }, 200);
                });

                setLoadingStage('Rendering...');
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
                const maxDim = Math.max(
                    bounds[1] - bounds[0],
                    bounds[3] - bounds[2],
                    bounds[5] - bounds[4]
                );
                console.log('[VolumeViewer3D] Volume bounds:', bounds, '| center:', volCenter);
                const lights = setupClinicalLights(renderer, volCenter, maxDim);
                const orientation = setupOrientationMarker(renderWindow, renderer);

                const labelActors = [];

                const volumeContext = {
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
                    sharpenTimer,
                    labelActors,
                    overlayActors: [],
                    clipPlane: null,
                    clipWidget: null,
                    surfacePickActor: null,
                    measurementActors: [],
                    implantActors: [],
                    nerveActor: null,
                    lights,
                    orientMarker: orientation?.orientMarker || null,
                    orientationCube: orientation?.cubeActor || null,
                };
                vtkContextRef.current = volumeContext;
                pendingVtkRef.current = null;
                positionCameraForView(volumeContext, 'right', 1.25);
                onVolumeLoadedRef.current?.(imageData);

                setLoadingProgress(100);

                // Helper: force VTK resize + re-render after React removes the loading overlay.
                // Without this, the canvas may be stale-sized or fail to display.
                const forceResizeAndRender = () => {
                    requestAnimationFrame(() => {
                        if (cancelled) return;
                        try {
                            fullScreenRenderer.resize();
                            renderWindow.render();
                            console.log('[VolumeViewer3D] Post-overlay resize+render complete');
                        } catch (e) {
                            console.warn('[VolumeViewer3D] Post-overlay render error:', e);
                        }
                    });
                };

                if (isCached) {
                    setLoading(false); // Instant for cached volumes
                    forceResizeAndRender();
                } else {
                    setTimeout(() => {
                        if (cancelled) return;
                        setLoading(false);
                        forceResizeAndRender();
                    }, 150);
                }

            } catch (err) {
                if (cancelled) return;
                console.error('[VolumeViewer3D] Error:', err);
                // Provide user-friendly error messages
                let errorMsg = err.message || 'Failed to load volume';
                if (err.name === 'TypeError' && (errorMsg === 'Failed to fetch' || errorMsg === 'Load failed' || errorMsg.includes('NetworkError'))) {
                    errorMsg = 'Cannot connect to imaging server (port 8000). Please ensure the Python service is running.';
                }
                setError(errorMsg);
                setLoading(false);
            }
        };

        // Skip initial delay for cached volumes
        const timer = isCached ? null : setTimeout(loadVolume, 50);
        if (isCached) loadVolume();

        return () => {
            cancelled = true;
            overlayAbortRef.current?.abort();
            overlayAbortRef.current = null;
            overlayBuildIdRef.current += 1;
            clearTimeout(timer);
            const ctx = vtkContextRef.current;
            if (ctx) {
                const cachedOverlay = toothOverlayCache.get(cacheKey);
                if (cachedOverlay?.actors?.some((actor) => (ctx.labelActors || []).includes(actor))) {
                    toothOverlayCache.set(cacheKey, {
                        ...cachedOverlay,
                        actors: [],
                    });
                }
                disposeVolumeContext(ctx);
                vtkContextRef.current = null;
            }
            if (pendingVtkRef.current) {
                try { pendingVtkRef.current.delete(); } catch (_) {}
                pendingVtkRef.current = null;
            }
            onVolumeLoadedRef.current?.(null);
        };
    }, [study, containerReady, cacheKey, studyKey, seriesUid, applyPreset]);

    const attachToothActors = useCallback((actors, visible) => {
        const ctx = vtkContextRef.current;
        if (!ctx || !Array.isArray(actors) || actors.length === 0) return false;

        const currentActors = new Set(ctx.labelActors || []);
        const nextActors = new Set(actors);
        currentActors.forEach((actor) => {
            if (!nextActors.has(actor)) {
                disposeToothActors(ctx.renderer, [actor]);
            }
        });
        actors.forEach((actor) => {
            if (!currentActors.has(actor)) {
                ctx.renderer.addActor(actor);
            }
            actor.setVisibility(visible);
        });
        ctx.labelActors = actors;
        ctx.renderWindow.render();
        return true;
    }, []);

    const loadToothOverlay = useCallback(async (options = {}) => {
        const { visibleOnLoad = true, silent = false } = options;
        const ctx = vtkContextRef.current;
        if (!ctx || teethLoading) return;

        const cachedOverlay = toothOverlayCache.get(cacheKey);
        if (cachedOverlay?.actors?.length) {
            if (overlayMatchesVolumeGeometry(cachedOverlay, ctx.imageData)) {
                attachToothActors(cachedOverlay.actors, visibleOnLoad);
                setToothOverlayAvailable(true);
                setToothOverlayLoaded(true);
                setTeethError(null);
                setShowTeethOverlay(visibleOnLoad);
                return;
            }

            disposeToothActors(null, cachedOverlay.actors);
            toothOverlayCache.delete(cacheKey);
            console.warn('[VolumeViewer3D] Cached overlay geometry mismatch, rebuilding...');
        } else if (cachedOverlay?.labelImageData && !overlayMatchesVolumeGeometry(cachedOverlay, ctx.imageData)) {
            toothOverlayCache.delete(cacheKey);
            console.warn('[VolumeViewer3D] Cached label geometry mismatch, refetching...');
        }

        overlayAbortRef.current?.abort();
        const controller = new AbortController();
        overlayAbortRef.current = controller;
        const buildId = overlayBuildIdRef.current + 1;
        overlayBuildIdRef.current = buildId;

        setTeethLoading(true);
        setTeethError(null);

        try {
            const reusableOverlay = toothOverlayCache.get(cacheKey);
            if (reusableOverlay?.labelImageData && overlayMatchesVolumeGeometry(reusableOverlay, ctx.imageData)) {
                const labelIds = reusableOverlay.labelIds || reusableOverlay.manifest?.label_ids || [];
                const rebuiltActors = await createToothOverlayActors(reusableOverlay.labelImageData, labelIds, {
                    signal: controller.signal,
                    buildId,
                    onActor: (actor) => {
                        const activeCtx = vtkContextRef.current;
                        if (!activeCtx || controller.signal.aborted || overlayBuildIdRef.current !== buildId) return;
                        actor.setVisibility(visibleOnLoad);
                        activeCtx.renderer.addActor(actor);
                        activeCtx.labelActors = [...(activeCtx.labelActors || []), actor];
                        activeCtx.renderWindow.render();
                    },
                });

                if (controller.signal.aborted || overlayBuildIdRef.current !== buildId) return;
                if (!rebuiltActors.length) {
                    throw new Error('No tooth overlay meshes could be rebuilt');
                }

                toothOverlayCache.set(cacheKey, {
                    ...reusableOverlay,
                    actors: rebuiltActors,
                });

                const activeCtx = vtkContextRef.current;
                if (activeCtx) {
                    activeCtx.labelActors = rebuiltActors;
                    rebuiltActors.forEach((actor) => actor.setVisibility(visibleOnLoad));
                    activeCtx.renderWindow.render();
                }

                setToothOverlayAvailable(true);
                setToothOverlayLoaded(true);
                setShowTeethOverlay(visibleOnLoad);
                return;
            }

            const assetParams = buildStudyAssetParams(study, {
                series_uid: seriesUid || undefined,
                v: VOLUME_CACHE_VERSION,
            });

            const manifestUrl = buildImagingUrl(`/labels-manifest/${studyKey}`, assetParams);
            const manifestResponse = await fetch(manifestUrl, { signal: controller.signal });
            if (!manifestResponse.ok) {
                throw new Error(`No tooth labels available (${manifestResponse.status})`);
            }
            const manifest = await manifestResponse.json();
            const labelIds = Array.isArray(manifest?.label_ids) ? manifest.label_ids : [];
            if (labelIds.length === 0) {
                throw new Error('Tooth label manifest has no labels');
            }

            const labelUrl = buildImagingUrl(`/labels/${studyKey}`, assetParams);
            const labelResponse = await fetch(labelUrl, { signal: controller.signal });
            if (!labelResponse.ok) {
                throw new Error(`Tooth label volume failed to load (${labelResponse.status})`);
            }

            const labelBuffer = await labelResponse.arrayBuffer();
            if (controller.signal.aborted || overlayBuildIdRef.current !== buildId) return;

            const labelReader = vtkXMLImageDataReader.newInstance();
            labelReader.parseAsArrayBuffer(labelBuffer);
            const labelImageData = labelReader.getOutputData(0);

            const builtActors = await createToothOverlayActors(labelImageData, labelIds, {
                signal: controller.signal,
                buildId,
                onActor: (actor) => {
                    const activeCtx = vtkContextRef.current;
                    if (!activeCtx || controller.signal.aborted || overlayBuildIdRef.current !== buildId) return;
                    actor.setVisibility(visibleOnLoad);
                    activeCtx.renderer.addActor(actor);
                    activeCtx.labelActors = [...(activeCtx.labelActors || []), actor];
                    activeCtx.renderWindow.render();
                },
            });

            if (controller.signal.aborted || overlayBuildIdRef.current !== buildId) return;
            if (!builtActors.length) {
                throw new Error('No tooth overlay meshes could be generated');
            }

            toothOverlayCache.set(cacheKey, {
                manifest,
                labelIds,
                labelImageData,
                actors: builtActors,
            });

            const activeCtx = vtkContextRef.current;
            if (activeCtx) {
                activeCtx.labelActors = builtActors;
                builtActors.forEach((actor) => actor.setVisibility(visibleOnLoad));
                activeCtx.renderWindow.render();
            }

            setToothOverlayAvailable(true);
            setToothOverlayLoaded(true);
            setShowTeethOverlay(visibleOnLoad);
            console.log('[VolumeViewer3D] Tooth overlays built:', builtActors.length);
        } catch (overlayError) {
            if (overlayError?.name !== 'AbortError') {
                console.warn('[VolumeViewer3D] Failed to load tooth overlays:', overlayError);
                if (!silent) {
                    setTeethError(overlayError.message || 'Failed to load tooth overlays');
                }
            }
        } finally {
            if (overlayAbortRef.current === controller) {
                overlayAbortRef.current = null;
            }
            if (!controller.signal.aborted) {
                setTeethLoading(false);
            }
        }
    }, [
        attachToothActors,
        cacheKey,
        createToothOverlayActors,
        seriesUid,
        study,
        studyKey,
        teethLoading,
    ]);

    const handleToggleTeeth = useCallback(() => {
        const ctx = vtkContextRef.current;
        if (!ctx) return;

        if (showTeethOverlay) {
            setShowTeethOverlay(false);
            return;
        }

        if (ctx.labelActors?.length || toothOverlayLoaded) {
            attachToothActors(ctx.labelActors || [], true);
            setShowTeethOverlay(true);
            return;
        }

        loadToothOverlay({ visibleOnLoad: true, silent: false });
    }, [attachToothActors, loadToothOverlay, showTeethOverlay, toothOverlayLoaded]);

    useEffect(() => {
        if (loading || error || teethLoading || toothOverlayLoaded || !vtkContextRef.current || !studyKey) return;
        if (autoToothLoadKeyRef.current === cacheKey) return;

        autoToothLoadKeyRef.current = cacheKey;
        loadToothOverlay({ visibleOnLoad: false, silent: true });
    }, [cacheKey, error, loadToothOverlay, loading, studyKey, teethLoading, toothOverlayLoaded]);

    useEffect(() => {
        const ctx = vtkContextRef.current;
        if (!ctx?.labelActors?.length) return;

        ctx.labelActors.forEach((actor) => actor.setVisibility(showTeethOverlay));
        ctx.renderWindow.render();
    }, [showTeethOverlay]);

    // Auto-rotate
    useEffect(() => {
        if (!autoRotate || !vtkContextRef.current) return;
        const { renderer, renderWindow, imageData } = vtkContextRef.current;
        const camera = renderer.getActiveCamera();
        const bounds = imageData.getBounds();
        const center = [
            (bounds[0] + bounds[1]) / 2,
            (bounds[2] + bounds[3]) / 2,
            (bounds[4] + bounds[5]) / 2,
        ];

        const id = setInterval(() => {
            camera.azimuth(0.6);
            camera.setFocalPoint(center[0], center[1], center[2]);
            camera.orthogonalizeViewUp();
            renderWindow.render();
        }, 50);
        return () => clearInterval(id);
    }, [autoRotate, cacheKey]);

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
                ctx.slabClippingActive = false;
                syncMapperClipping(ctx, false);
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
    }, [cacheKey, loading, slabEnabled, updateSlabClipping]);

    useEffect(() => {
        const ctx = vtkContextRef.current;
        if (!ctx?.interactor) return undefined;
        const sub = ctx.interactor.onEndInteraction(() => {
            setMeasurementRevision((value) => value + 1);
        });
        return () => sub.unsubscribe();
    }, [cacheKey, loading]);

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
        const handleFSChange = () => {
            setIsFullscreen(!!(document.fullscreenElement || document.webkitFullscreenElement));
            requestAnimationFrame(() => {
                const ctx = vtkContextRef.current;
                if (!ctx?.fullScreenRenderer) return;
                try {
                    ctx.fullScreenRenderer.resize();
                    ctx.renderWindow.render();
                } catch (_) {}
            });
        };

        document.addEventListener('fullscreenchange', handleFSChange);
        document.addEventListener('webkitfullscreenchange', handleFSChange);
        return () => {
            document.removeEventListener('fullscreenchange', handleFSChange);
            document.removeEventListener('webkitfullscreenchange', handleFSChange);
        };
    }, []);

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

    const toggleFullscreen = useCallback(() => {
        if (!wrapperRef.current) return;
        if (!(document.fullscreenElement || document.webkitFullscreenElement)) {
            const requestFullscreen = wrapperRef.current.requestFullscreen || wrapperRef.current.webkitRequestFullscreen;
            if (requestFullscreen) {
                Promise.resolve(requestFullscreen.call(wrapperRef.current)).catch(console.error);
            }
        } else {
            const exitFullscreen = document.exitFullscreen || document.webkitExitFullscreen;
            if (exitFullscreen) {
                Promise.resolve(exitFullscreen.call(document)).catch(console.error);
            }
        }
    }, []);

    // ═══════════════════════════════════════════════════════════════════
    // Preset / Render-Mode Change Handler
    // ═══════════════════════════════════════════════════════════════════
    const changePreset = useCallback((presetName) => {
        const ctx = vtkContextRef.current;
        if (!ctx) return;
        const { ctfun, ofun, dataRange, renderWindow, actor, mapper, fullScreenRenderer } = ctx;

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
        const bg = BG_COLORS[presetName] || BG_COLORS.bone;
        fullScreenRenderer.getRenderer().setBackground(bg[0], bg[1], bg[2]);
        presetRef.current = presetName;
        applyMapperQuality(mapper, qualityRef.current, presetName);

        if (presetName === 'bone') {
            mapper.setBlendModeToComposite();
            applyBoneMaterial(actor);
            applyOpacityUnitDistance(actor, ctx.imageData, 1);
            setSlabEnabled(false);
            slabEnabledRef.current = false;
            ctx.slabClippingActive = false;
            syncMapperClipping(ctx, false);
            positionCameraForView(ctx, 'right', 1.25);

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
            applyOpacityUnitDistance(actor, ctx.imageData, 1);
            setSlabEnabled(false);
            slabEnabledRef.current = false;
            ctx.slabClippingActive = false;
            syncMapperClipping(ctx, false);

        } else if (presetName === 'mip') {
            const projection = PROJECTION_PRESETS.mip;
            mapper.setBlendModeToMaximumIntensity();
            applyMapperQuality(mapper, qualityRef.current, 'mip');
            actor.getProperty().setShade(false);
            actor.getProperty().setAmbient(1.0);
            actor.getProperty().setDiffuse(0.0);
            actor.getProperty().setSpecular(0.0);
            actor.getProperty().setUseGradientOpacity(0, false);
            applyOpacityUnitDistance(actor, ctx.imageData, 1);
            setSlabEnabled(true);
            setSlabThickness(projection.slabMm);
            slabEnabledRef.current = true;
            slabThicknessRef.current = projection.slabMm;
            positionCameraForView(ctx, projection.view, projection.zoom);
            updateSlabClipping(projection.slabMm);

        } else if (presetName === 'xray') {
            const projection = PROJECTION_PRESETS.xray;
            setMapperToXrayProjection(mapper);
            applyMapperQuality(mapper, qualityRef.current, 'xray');
            actor.getProperty().setShade(false);
            actor.getProperty().setAmbient(1.0);
            actor.getProperty().setDiffuse(0.0);
            actor.getProperty().setSpecular(0.0);
            actor.getProperty().setUseGradientOpacity(0, false);
            applyOpacityUnitDistance(actor, ctx.imageData, 0.85);
            setSlabEnabled(true);
            setSlabThickness(projection.slabMm);
            slabEnabledRef.current = true;
            slabThicknessRef.current = projection.slabMm;
            positionCameraForView(ctx, projection.view, projection.zoom);
            updateSlabClipping(projection.slabMm);
        } else if (presetName === 'sinus') {
            mapper.setBlendModeToComposite();
            actor.getProperty().setShade(true);
            actor.getProperty().setAmbient(0.4);
            actor.getProperty().setDiffuse(0.7);
            actor.getProperty().setSpecular(0.1);
            actor.getProperty().setSpecularPower(8);
            actor.getProperty().setUseGradientOpacity(0, true);
            actor.getProperty().setGradientOpacityMinimumValue(0, 0);
            actor.getProperty().setGradientOpacityMinimumOpacity(0, 0.0);
            actor.getProperty().setGradientOpacityMaximumValue(0, 0.04);
            actor.getProperty().setGradientOpacityMaximumOpacity(0, 0.9);
            applyOpacityUnitDistance(actor, ctx.imageData, 0.9);
            setSlabEnabled(false);
            slabEnabledRef.current = false;
            ctx.slabClippingActive = false;
            syncMapperClipping(ctx, false);
            positionCameraForView(ctx, 'front', 1.25);
        } else if (presetName === 'density') {
            mapper.setBlendModeToComposite();
            actor.getProperty().setShade(true);
            actor.getProperty().setAmbient(0.35);
            actor.getProperty().setDiffuse(0.72);
            actor.getProperty().setSpecular(0.12);
            actor.getProperty().setSpecularPower(10);
            actor.getProperty().setUseGradientOpacity(0, true);
            actor.getProperty().setGradientOpacityMinimumValue(0, 0);
            actor.getProperty().setGradientOpacityMinimumOpacity(0, 0.0);
            actor.getProperty().setGradientOpacityMaximumValue(0, 0.05);
            actor.getProperty().setGradientOpacityMaximumOpacity(0, 0.85);
            applyOpacityUnitDistance(actor, ctx.imageData, 1);
            setSlabEnabled(false);
            slabEnabledRef.current = false;
            ctx.slabClippingActive = false;
            syncMapperClipping(ctx, false);
        }

        setPreset(presetName);
        renderWindow.render();
    }, [applyPreset, updateSlabClipping]);

    // ═══════════════════════════════════════════════════════════════════
    // Camera View Presets (Acteon-style anatomical views)
    // ═══════════════════════════════════════════════════════════════════
    const setCameraView = useCallback((viewName) => {
        const ctx = vtkContextRef.current;
        if (!ctx) return;

        if (!positionCameraForView(ctx, viewName, 1.3)) return;

        if (slabEnabled) {
            setTimeout(() => updateSlabClipping(slabThickness), 50);
        }
    }, [slabEnabled, slabThickness, updateSlabClipping]);

    // ═══════════════════════════════════════════════════════════════════
    // Screenshot Export
    // ═══════════════════════════════════════════════════════════════════
    const captureViewportImage = useCallback(async () => {
        const ctx = vtkContextRef.current;
        if (!ctx?.renderWindow?.captureImages) return null;

        try {
            const captures = ctx.renderWindow.captureImages('image/png', {
                scale: Math.max(window.devicePixelRatio || 1, 2),
            });
            if (!Array.isArray(captures) || captures.length === 0) return null;

            const dataURL = await captures[0];
            if (typeof dataURL !== 'string' || !dataURL.startsWith('data:image')) {
                return null;
            }

            return await addScreenshotWatermark(dataURL, {
                patientName,
                studyDate: metadata?.StudyDate,
                preset,
                clinicName,
            });
        } catch (captureError) {
            console.warn('[VolumeViewer3D] Screenshot capture failed:', captureError);
            return null;
        }
    }, [clinicName, metadata?.StudyDate, patientName, preset]);

    const captureScreenshot = useCallback(async () => {
        const dataURL = await captureViewportImage();
        if (!dataURL) return null;

        const link = document.createElement('a');
        link.download = 'xcore-' + preset + '-' + Date.now() + '.png';
        link.href = dataURL;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return dataURL;
    }, [captureViewportImage, preset]);

    const exportSTL = useCallback(async () => {
        const ctx = vtkContextRef.current;
        if (!ctx?.labelActors?.length || stlExporting) return;

        setStlExporting(true);
        setStlError(null);

        try {
            const [{ default: vtkSTLWriter }, { default: vtkAppendPolyData }] = await Promise.all([
                import('@kitware/vtk.js/IO/Geometry/STLWriter'),
                import('@kitware/vtk.js/Filters/General/AppendPolyData'),
            ]);

            const polyDataList = ctx.labelActors
                .map((actor) => actor.__xcoreSmoother?.getOutputData?.() || actor.__xcoreMarching?.getOutputData?.() || actor.getMapper?.()?.getInputData?.())
                .filter(Boolean);

            if (!polyDataList.length) {
                throw new Error('No tooth mesh data available to export.');
            }

            let outputPolyData = polyDataList[0];
            let appender = null;
            if (polyDataList.length > 1) {
                appender = vtkAppendPolyData.newInstance();
                polyDataList.forEach((polyData) => appender.addInputData(polyData));
                appender.update();
                outputPolyData = appender.getOutputData(0);
            }

            const stlOutput = vtkSTLWriter.writeSTL(outputPolyData);
            const stlBuffer = stlOutput instanceof DataView ? stlOutput.buffer : stlOutput;
            const blob = new Blob([stlBuffer], { type: 'model/stl' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `xcore-teeth-${studyKey || 'study'}-${Date.now()}.stl`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            try { appender?.delete?.(); } catch (_) {}
        } catch (exportError) {
            console.warn('[VolumeViewer3D] STL export failed:', exportError);
            setStlError(exportError.message || 'Failed to export STL');
        } finally {
            setStlExporting(false);
        }
    }, [stlExporting, studyKey]);

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

    const projectWorldToViewport = useCallback((worldPoint) => {
        const ctx = vtkContextRef.current;
        const container = containerRef.current;
        if (!ctx || !container || !worldPoint) return null;

        try {
            const view = ctx.renderWindow.getViews?.()?.[0] || ctx.interactor?.getView?.();
            if (!view?.worldToDisplay) return null;
            const display = view.worldToDisplay(worldPoint[0], worldPoint[1], worldPoint[2], ctx.renderer);
            const viewSize = view.getSize?.() || [container.clientWidth, container.clientHeight];
            const rect = container.getBoundingClientRect();
            return {
                x: (display[0] / Math.max(viewSize[0], 1)) * rect.width,
                y: rect.height - ((display[1] / Math.max(viewSize[1], 1)) * rect.height),
            };
        } catch (_) {
            return null;
        }
    }, []);

    const pickWorldPointFromPointer = useCallback((event) => {
        const ctx = vtkContextRef.current;
        const container = containerRef.current;
        if (!ctx || !container) return null;

        const rect = container.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = rect.height - (event.clientY - rect.top);

        try {
            const picker = vtkCellPicker.newInstance();
            picker.setTolerance?.(0.02);
            if (ctx.surfacePickActor) {
                picker.setPickFromList(true);
                picker.initializePickList();
                picker.addPickList(ctx.surfacePickActor);
            }
            const picked = picker.pick([x, y, 0], ctx.renderer);
            const pickedPosition = picked ? picker.getPickPosition?.() : null;
            const pickedCellId = picker.getCellId?.();
            picker.delete?.();
            if (pickedCellId >= 0 && pickedPosition && pickedPosition.every((value) => Number.isFinite(value))) {
                return [...pickedPosition];
            }
        } catch (_) {
            // Volumes are not always pickable by vtkCellPicker; fall back below.
        }

        try {
            const view = ctx.renderWindow.getViews?.()?.[0] || ctx.interactor?.getView?.();
            const world = view?.displayToWorld?.(x, y, 0.5, ctx.renderer);
            return world ? [world[0], world[1], world[2]] : null;
        } catch (_) {
            return null;
        }
    }, []);

    const createMeasurementActor = useCallback((pointA, pointB) => {
        const source = vtkLineSource.newInstance({ point1: pointA, point2: pointB, resolution: 1 });
        const mapper = vtkMapper.newInstance();
        mapper.setInputConnection(source.getOutputPort());
        const actor = vtkActor.newInstance();
        actor.setMapper(mapper);
        setOverlayResources(actor, { source });
        actor.getProperty().setColor(...MEASUREMENT_COLOR);
        actor.getProperty().setLineWidth(4);
        actor.getProperty().setOpacity(0.95);
        return actor;
    }, []);

    const ensureSurfacePickActor = useCallback(async () => {
        const ctx = vtkContextRef.current;
        if (!ctx?.imageData || ctx.surfacePickActor || surfacePickLoading) return ctx?.surfacePickActor || null;

        setSurfacePickLoading(true);
        try {
            await waitForNextFrame();
            const activeCtx = vtkContextRef.current;
            if (!activeCtx?.imageData || activeCtx.surfacePickActor) {
                return activeCtx?.surfacePickActor || null;
            }

            const marching = vtkImageMarchingCubes.newInstance({
                contourValue: PICK_SURFACE_CONTOUR,
                computeNormals: true,
                mergePoints: true,
            });
            marching.setInputData(activeCtx.imageData);
            marching.update();

            const mapper = vtkMapper.newInstance();
            mapper.setInputConnection(marching.getOutputPort());

            const actor = vtkActor.newInstance();
            actor.setMapper(mapper);
            actor.__xcoreMarching = marching;
            actor.setPickable?.(true);
            actor.getProperty().setColor(0.02, 0.03, 0.05);
            // Must be non-zero opacity for vtkPicker, but visually imperceptible.
            actor.getProperty().setOpacity(0.001);
            actor.getProperty().setAmbient(0);
            actor.getProperty().setDiffuse(0);
            actor.getProperty().setSpecular(0);

            activeCtx.renderer.addActor(actor);
            activeCtx.surfacePickActor = actor;
            activeCtx.renderWindow.render();
            return actor;
        } catch (surfaceError) {
            console.warn('[VolumeViewer3D] Surface pick actor failed:', surfaceError);
            return null;
        } finally {
            setSurfacePickLoading(false);
        }
    }, [surfacePickLoading]);

    const clearMeasurements3D = useCallback(() => {
        setMeasurePoints([]);
        setMeasurements3D([]);
        setMeasurementRevision((value) => value + 1);
    }, []);

    const undoMeasurement3D = useCallback(() => {
        setMeasurements3D((current) => current.slice(0, -1));
        setMeasurementRevision((value) => value + 1);
    }, []);

    const disableClipWidget = useCallback(() => {
        const ctx = vtkContextRef.current;
        if (!ctx) return;
        try { ctx.clipWidget?.subscription?.unsubscribe?.(); } catch (_) {}
        try { ctx.clipWidget?.widgetManager?.removeWidgets?.(); } catch (_) {}
        try { ctx.clipWidget?.widgetManager?.delete?.(); } catch (_) {}
        try { ctx.clipPlane?.delete?.(); } catch (_) {}
        ctx.clipWidget = null;
        ctx.clipPlane = null;
        syncMapperClipping(ctx, Boolean(ctx.slabClippingActive));
    }, []);

    const enableClipWidget = useCallback(() => {
        const ctx = vtkContextRef.current;
        if (!ctx) return;

        try {
            disableClipWidget();
            const widgetManager = vtkWidgetManager.newInstance();
            widgetManager.setRenderer(ctx.renderer);
            widgetManager.enablePicking();

            const planeWidget = vtkImplicitPlaneWidget.newInstance({
                normalVisible: true,
                originVisible: true,
                planeVisible: true,
                outlineVisible: true,
            });
            planeWidget.setPlaceFactor?.(1.05);
            planeWidget.placeWidget(ctx.imageData.getBounds());
            const restoredClip = clipPlaneStateRef.current;
            if (restoredClip?.origin && restoredClip?.normal) {
                try {
                    planeWidget.getWidgetState().setOrigin(...restoredClip.origin);
                    planeWidget.getWidgetState().setNormal(...restoredClip.normal);
                } catch (_) {}
            }
            const viewWidget = widgetManager.addWidget(planeWidget);
            widgetManager.grabFocus(planeWidget);

            const clipPlane = vtkPlane.newInstance();
            const applyPlane = () => {
                const state = planeWidget.getWidgetState();
                const origin = state.getOrigin();
                const normal = state.getNormal();
                clipPlane.setOrigin(origin[0], origin[1], origin[2]);
                clipPlane.setNormal(normal[0], normal[1], normal[2]);
                ctx.clipPlane = clipPlane;
                clipPlaneStateRef.current = { origin: [...origin], normal: [...normal], enabled: true };
                try {
                    localStorage.setItem(clipStorageKey, JSON.stringify(clipPlaneStateRef.current));
                } catch (_) {}
                syncMapperClipping(ctx, Boolean(ctx.slabClippingActive));
            };
            const subscription = planeWidget.onWidgetChange(applyPlane);
            ctx.clipWidget = { widgetManager, planeWidget, viewWidget, subscription };
            ctx.clipPlane = clipPlane;
            applyPlane();
            setClipError(null);
        } catch (clipSetupError) {
            console.warn('[VolumeViewer3D] Clip widget setup failed:', clipSetupError);
            setClipError(clipSetupError.message || 'Clip tool failed to start');
            setClippingMode(false);
        }
    }, [clipStorageKey, disableClipWidget]);

    useEffect(() => {
        if (loading || error) return undefined;
        if (clippingMode) {
            enableClipWidget();
        } else {
            disableClipWidget();
        }
        return undefined;
    }, [cacheKey, clippingMode, disableClipWidget, enableClipWidget, error, loading]);

    const flipClipPlane = useCallback(() => {
        const ctx = vtkContextRef.current;
        if (!ctx?.clipPlane) return;

        const currentNormal = ctx.clipPlane.getNormal();
        const flipped = [-currentNormal[0], -currentNormal[1], -currentNormal[2]];
        try {
            ctx.clipWidget?.planeWidget?.getWidgetState?.()?.setNormal?.(flipped[0], flipped[1], flipped[2]);
        } catch (_) {}
        ctx.clipPlane.setNormal(flipped[0], flipped[1], flipped[2]);
        syncMapperClipping(ctx, Boolean(ctx.slabClippingActive));
    }, []);

    const createImplantActor = useCallback((placement) => {
        const direction = placement.direction || [0, -1, 0];
        const source = vtkCylinderSource.newInstance({
            radius: Number(placement.diameter) / 2,
            height: Number(placement.length),
            resolution: 32,
            capping: true,
            center: placement.position,
            direction,
        });
        const mapper = vtkMapper.newInstance();
        mapper.setInputConnection(source.getOutputPort());
            const actor = vtkActor.newInstance();
            actor.setMapper(mapper);
            setOverlayResources(actor, { source });
            const property = actor.getProperty();
        property.setColor(0.78, 0.82, 0.88);
        property.setOpacity(0.72);
        property.setAmbient(0.22);
        property.setDiffuse(0.68);
        property.setSpecular(0.9);
        property.setSpecularPower(80);
        return actor;
    }, []);

    useEffect(() => {
        if (!implantStorageKey) return;
        implantSkipPersistRef.current = true;
        try {
            const stored = localStorage.getItem(implantStorageKey);
            setImplantPlacements(stored ? JSON.parse(stored) : []);
        } catch (_) {
            setImplantPlacements([]);
        }
    }, [implantStorageKey]);

    useEffect(() => {
        if (!implantStorageKey) return;
        if (implantSkipPersistRef.current) {
            implantSkipPersistRef.current = false;
            return;
        }
        try {
            localStorage.setItem(implantStorageKey, JSON.stringify(implantPlacements));
        } catch (_) {}
    }, [implantPlacements, implantStorageKey]);

    useEffect(() => {
        const ctx = vtkContextRef.current;
        if (!ctx || loading || error) return;

        if (ctx.implantActors?.length) {
            disposeOverlayActors(ctx.renderer, ctx.implantActors);
            ctx.overlayActors = (ctx.overlayActors || []).filter((actor) => !ctx.implantActors.includes(actor));
        }

        const actors = implantPlacements.map((placement) => createImplantActor(placement));
        actors.forEach((actor) => ctx.renderer.addActor(actor));
        ctx.implantActors = actors;
        ctx.overlayActors = [...(ctx.overlayActors || []), ...actors];
        ctx.renderWindow.render();
    }, [cacheKey, createImplantActor, error, implantPlacements, loading]);

    useEffect(() => {
        if (!measurementStorageKey) return;
        measurementSkipPersistRef.current = true;
        try {
            const stored = localStorage.getItem(measurementStorageKey);
            const parsed = stored ? JSON.parse(stored) : [];
            setMeasurements3D(Array.isArray(parsed) ? parsed : []);
        } catch (_) {
            setMeasurements3D([]);
        }
        setMeasurePoints([]);
        setMeasurementRevision((value) => value + 1);
    }, [measurementStorageKey]);

    useEffect(() => {
        if (!measurementStorageKey) return;
        if (measurementSkipPersistRef.current) {
            measurementSkipPersistRef.current = false;
            return;
        }
        try {
            const serializable = measurements3D.map((item) => ({
                id: item.id,
                pointA: item.pointA,
                pointB: item.pointB,
                midpoint: item.midpoint,
                distance: item.distance,
            }));
            localStorage.setItem(measurementStorageKey, JSON.stringify(serializable));
        } catch (_) {}
    }, [measurementStorageKey, measurements3D]);

    useEffect(() => {
        const ctx = vtkContextRef.current;
        if (!ctx || loading || error) return;

        if (ctx.measurementActors?.length) {
            disposeOverlayActors(ctx.renderer, ctx.measurementActors);
            ctx.overlayActors = (ctx.overlayActors || []).filter((actor) => !ctx.measurementActors.includes(actor));
        }

        const actors = measurements3D
            .filter((item) => Array.isArray(item.pointA) && Array.isArray(item.pointB))
            .map((item) => createMeasurementActor(item.pointA, item.pointB));

        actors.forEach((actor) => ctx.renderer.addActor(actor));
        ctx.measurementActors = actors;
        ctx.overlayActors = [...(ctx.overlayActors || []), ...actors];
        ctx.renderWindow.render();
        setMeasurementRevision((value) => value + 1);
    }, [cacheKey, createMeasurementActor, error, loading, measurements3D]);

    useEffect(() => {
        if (!clipStorageKey) return;
        try {
            const stored = localStorage.getItem(clipStorageKey);
            const parsed = stored ? JSON.parse(stored) : null;
            clipPlaneStateRef.current = parsed?.origin && parsed?.normal ? parsed : null;
            setClippingMode(Boolean(parsed?.enabled && parsed?.origin && parsed?.normal));
        } catch (_) {
            clipPlaneStateRef.current = null;
            setClippingMode(false);
        }
    }, [clipStorageKey]);

    useEffect(() => {
        if (!clipStorageKey || clippingMode) return;
        const current = clipPlaneStateRef.current;
        if (!current?.origin || !current?.normal) return;
        try {
            localStorage.setItem(clipStorageKey, JSON.stringify({ ...current, enabled: false }));
        } catch (_) {}
    }, [clipStorageKey, clippingMode]);

    useEffect(() => {
        if ((measureMode3D || implantPlaceMode || linkedMode) && !loading && !error) {
            ensureSurfacePickActor();
        }
    }, [ensureSurfacePickActor, error, implantPlaceMode, linkedMode, loading, measureMode3D]);

    const clearImplants = useCallback(() => {
        setImplantPlacements([]);
        setImplantPlaceMode(false);
    }, []);

    const buildNerveActor = useCallback((centerline, radiusMm) => {
        if (!Array.isArray(centerline) || centerline.length < 2) return null;
        const points = new Float32Array(centerline.length * 3);
        centerline.forEach((point, index) => {
            points[index * 3] = point[0];
            points[index * 3 + 1] = point[1];
            points[index * 3 + 2] = point[2];
        });

        const lines = new Uint32Array(centerline.length + 1);
        lines[0] = centerline.length;
        for (let index = 0; index < centerline.length; index += 1) {
            lines[index + 1] = index;
        }

        const polyData = vtkPolyData.newInstance();
        polyData.getPoints().setData(points, 3);
        polyData.getLines().setData(lines, 1);

        const tube = vtkTubeFilter.newInstance({
            radius: Math.max(0.4, Number(radiusMm) || 1.2),
            numberOfSides: 18,
            capping: true,
        });
        tube.setInputData(polyData);

        const mapper = vtkMapper.newInstance();
        mapper.setInputConnection(tube.getOutputPort());
        const actor = vtkActor.newInstance();
        actor.setMapper(mapper);
        setOverlayResources(actor, { tube, polyData });
        actor.getProperty().setColor(...NERVE_COLOR);
        actor.getProperty().setOpacity(0.62);
        actor.getProperty().setAmbient(0.35);
        actor.getProperty().setDiffuse(0.65);
        return actor;
    }, []);

    const loadNerveOverlay = useCallback(async () => {
        const ctx = vtkContextRef.current;
        if (!ctx || nerveLoading) return;

        setNerveLoading(true);
        setNerveError(null);

        try {
            const response = await fetch(buildImagingUrl(
                `/nerve-canal/${studyKey}`,
                buildStudyAssetParams(study, { series_uid: seriesUid || undefined })
            ));
            if (!response.ok) {
                throw new Error(`Nerve canal detection failed (${response.status})`);
            }
            const payload = await response.json();
            if (!payload.detected || !payload.centerline?.length) {
                throw new Error('No mandibular canal candidate detected');
            }

            const actor = buildNerveActor(payload.centerline, payload.radius_mm);
            if (!actor) {
                throw new Error('Nerve canal geometry was empty');
            }

            if (ctx.nerveActor) {
                disposeOverlayActors(ctx.renderer, [ctx.nerveActor]);
                ctx.overlayActors = (ctx.overlayActors || []).filter((item) => item !== ctx.nerveActor);
            }

            ctx.renderer.addActor(actor);
            ctx.nerveActor = actor;
            ctx.overlayActors = [...(ctx.overlayActors || []), actor];
            ctx.renderWindow.render();

            setNerveInfo(payload);
            setShowNerveOverlay(true);
        } catch (nerveOverlayError) {
            console.warn('[VolumeViewer3D] Nerve overlay failed:', nerveOverlayError);
            setNerveError(nerveOverlayError.message || 'Nerve overlay unavailable');
            setShowNerveOverlay(false);
        } finally {
            setNerveLoading(false);
        }
    }, [buildNerveActor, nerveLoading, seriesUid, study, studyKey]);

    const handleToggleNerve = useCallback(() => {
        const ctx = vtkContextRef.current;
        if (!ctx) return;

        if (showNerveOverlay) {
            ctx.nerveActor?.setVisibility(false);
            ctx.renderWindow.render();
            setShowNerveOverlay(false);
            return;
        }

        if (ctx.nerveActor) {
            ctx.nerveActor.setVisibility(true);
            ctx.renderWindow.render();
            setShowNerveOverlay(true);
            return;
        }

        loadNerveOverlay();
    }, [loadNerveOverlay, showNerveOverlay]);

    const loadDensityHistogram = useCallback(async () => {
        if (!studyKey || densityLoading) return null;
        setDensityLoading(true);
        setDensityError(null);

        try {
            const response = await fetch(buildImagingUrl(
                `/density-histogram/${studyKey}`,
                buildStudyAssetParams(study, { series_uid: seriesUid || undefined })
            ));
            if (!response.ok) {
                throw new Error(`Density histogram unavailable (${response.status})`);
            }
            const payload = await response.json();
            setDensityHistogram(payload);
            return payload;
        } catch (densityLoadError) {
            console.warn('[VolumeViewer3D] Density histogram failed:', densityLoadError);
            setDensityError(densityLoadError.message || 'Density histogram unavailable');
            return null;
        } finally {
            setDensityLoading(false);
        }
    }, [densityLoading, seriesUid, study, studyKey]);

    useEffect(() => {
        if (preset === 'density' && !densityHistogram && !densityLoading && !densityError) {
            loadDensityHistogram();
        }
    }, [densityError, densityHistogram, densityLoading, loadDensityHistogram, preset]);

    const makeFallbackAIReport = useCallback((findings) => {
        const toothCount = findings?.tooth_count ?? 0;
        const density = findings?.bone_density || {};
        return [
            `Segmentasi awal mendeteksi ${toothCount} struktur gigi pada volume CBCT.`,
            `Distribusi densitas kandidat tulang: D1 ${density.d1_pct ?? 0}%, D2 ${density.d2_pct ?? 0}%, D3 ${density.d3_pct ?? 0}%, D4 ${density.d4_pct ?? 0}%.`,
            'Temuan ini bersifat pendahuluan dan harus dikonfirmasi melalui evaluasi klinis serta interpretasi radiologis.'
        ].join(' ');
    }, []);

    const generateAIReport = useCallback(async () => {
        if (!studyKey || aiReportLoading) return;
        setAiReportLoading(true);
        setAiReportError(null);
        setAiReportOpen(true);

        try {
            const findingsResponse = await fetch(buildImagingUrl(
                `/ai-findings/${studyKey}`,
                buildStudyAssetParams(study, { series_uid: seriesUid || undefined })
            ));
            if (!findingsResponse.ok) {
                throw new Error(`AI findings unavailable (${findingsResponse.status})`);
            }
            const findings = await findingsResponse.json();
            const prompt = `Anda adalah asisten analisis radiograf dental. Buat laporan pendahuluan CBCT dalam Bahasa Indonesia, 3-4 kalimat, spesifik dan klinis.

Data:
- Teeth detected: ${findings.tooth_count}
- Volume dimensions: ${(findings.volume_dimensions || []).join('x')} voxels
- Spacing: ${(findings.spacing || []).join('x')} mm
- Density D1/D2/D3/D4: ${findings.bone_density?.d1_pct || 0}% / ${findings.bone_density?.d2_pct || 0}% / ${findings.bone_density?.d3_pct || 0}% / ${findings.bone_density?.d4_pct || 0}%
- Nerve canal: ${findings.nerve_canal?.detected ? `detected, confidence ${Math.round((findings.nerve_canal.confidence || 0) * 100)}%` : 'not detected'}
- Planned implants: ${implantPlacements.length}
- Scanner: ${metadata?.Manufacturer || 'Unknown'} ${metadata?.ManufacturerModelName || ''}

Tambahkan catatan bahwa ini bukan diagnosis final dan perlu review radiolog/dokter gigi.`;

            const token = getAccessToken();
            const aiResponse = await fetch('/api/v1/ai/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ message: prompt, context: 'cbct_report' }),
            });

            if (aiResponse.ok) {
                const aiPayload = await aiResponse.json();
                setAiReport(aiPayload.message || aiPayload.response || aiPayload.text || makeFallbackAIReport(findings));
            } else {
                setAiReport(makeFallbackAIReport(findings));
            }
        } catch (reportError) {
            console.warn('[VolumeViewer3D] AI report generation failed:', reportError);
            setAiReportError(reportError.message || 'AI report unavailable');
        } finally {
            setAiReportLoading(false);
        }
    }, [aiReportLoading, implantPlacements.length, makeFallbackAIReport, metadata, seriesUid, study, studyKey]);

    useEffect(() => {
        if (toothOverlayLoaded && !aiReport && !aiReportLoading && !aiReportError) {
            generateAIReport();
        }
    }, [aiReport, aiReportError, aiReportLoading, generateAIReport, toothOverlayLoaded]);

    const handleExportReport = useCallback(async (formValues) => {
        setExportingReport(true);
        setReportWarningMessage('');

        try {
            let screenshotDataUrl = null;
            if (formValues.includeScreenshot) {
                screenshotDataUrl = await captureViewportImage();
                if (!screenshotDataUrl) {
                    setReportWarningMessage('Screenshot could not be captured on this browser. The report will be exported without an image.');
                }
            }

            const histogram = densityHistogram || await loadDensityHistogram();
            exportPdfReport({
                clinicName,
                dentistName: formValues.dentistName,
                patientName: formValues.patientName,
                clinicalNotes: formValues.clinicalNotes,
                metadata,
                screenshotDataUrl,
                includeMetadataSummary: formValues.includeMetadataSummary,
                implantPlacements,
                densityHistogram: histogram,
                aiReport,
            });
            setReportModalOpen(false);
        } catch (reportError) {
            console.error('[VolumeViewer3D] Report export failed:', reportError);
            setReportWarningMessage(reportError.message || 'Failed to export report.');
        } finally {
            setExportingReport(false);
        }
    }, [
        aiReport,
        captureViewportImage,
        clinicName,
        densityHistogram,
        implantPlacements,
        loadDensityHistogram,
        metadata,
    ]);

    const handleViewportPointerDown = useCallback((event) => {
        if (event.button !== 0) return;
        const ctx = vtkContextRef.current;
        if (!ctx) return;

        if (!measureMode3D && !implantPlaceMode) return;
        event.preventDefault();
        event.stopPropagation();

        const point = pickWorldPointFromPointer(event);
        if (!point) return;

        if (implantPlaceMode) {
            const cameraDirection = ctx.renderer.getActiveCamera().getDirectionOfProjection();
            const placement = {
                id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
                position: point.map((value) => Number(value.toFixed(3))),
                direction: cameraDirection.map((value) => Number(value.toFixed(6))),
                diameter: Number(implantDiameter),
                length: Number(implantLength),
                brand: implantBrand,
                createdAt: new Date().toISOString(),
            };
            setImplantPlacements((current) => [...current, placement]);
            setImplantError(null);
            return;
        }

        setMeasurePoints((current) => {
            if (current.length === 0) return [point];
            const pointA = current[0];
            const pointB = point;
            const measurement = {
                id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
                pointA,
                pointB,
                midpoint: midpoint(pointA, pointB),
                distance: distanceMm(pointA, pointB),
            };
            setMeasurements3D((items) => [...items, measurement]);
            setMeasurementRevision((value) => value + 1);
            return [];
        });
    }, [
        implantBrand,
        implantDiameter,
        implantLength,
        implantPlaceMode,
        measureMode3D,
        pickWorldPointFromPointer,
    ]);

    const handleViewportClick = useCallback((event) => {
        if (!linkedMode || typeof onSurfaceClick !== 'function') return;
        if (measureMode3D || implantPlaceMode) return;
        const point = pickWorldPointFromPointer(event);
        if (point) {
            onSurfaceClick(point);
        }
    }, [implantPlaceMode, linkedMode, measureMode3D, onSurfaceClick, pickWorldPointFromPointer]);

    useEffect(() => {
        const handleKeyDown = (event) => {
            const activeTag = document.activeElement?.tagName?.toLowerCase();
            const isTextInput = activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select';
            const viewerFocused = wrapperRef.current?.contains(document.activeElement);
            if (isTextInput) return;
            if (document.activeElement !== document.body && !viewerFocused) return;

            const key = event.key.toLowerCase();
            if (key === 'b') {
                event.preventDefault();
                changePreset('bone');
            } else if (key === 't') {
                event.preventDefault();
                changePreset('soft');
            } else if (key === 'm') {
                event.preventDefault();
                changePreset('mip');
            } else if (key === 'x') {
                event.preventDefault();
                changePreset('xray');
            } else if (key === 'n') {
                event.preventDefault();
                changePreset('sinus');
            } else if (key === 'd') {
                event.preventDefault();
                changePreset('density');
            } else if (key === 'r') {
                event.preventDefault();
                setAutoRotate((current) => !current);
            } else if (key === 'f') {
                event.preventDefault();
                toggleFullscreen();
            } else if (event.code === 'Space') {
                event.preventDefault();
                resetCamera();
            } else if (key === 'i' && (preset === 'mip' || preset === 'xray')) {
                event.preventDefault();
                toggleInvert();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [changePreset, preset, resetCamera, toggleFullscreen, toggleInvert]);

    // ═══════════════════════════════════════════════════════════════════
    // Render
    // ═══════════════════════════════════════════════════════════════════
    const isMipOrXray = preset === 'mip' || preset === 'xray';
    const measurementLabels = useMemo(() => measurements3D.map((measurement) => ({
        id: measurement.id,
        distance: measurement.distance,
        screen: projectWorldToViewport(measurement.midpoint),
    })).filter((item) => item.screen), [measurementRevision, measurements3D, projectWorldToViewport]);

    return (
        <div ref={wrapperRef} tabIndex={0} className="flex flex-col h-full bg-slate-950 text-slate-100 rounded-3xl overflow-hidden shadow-2xl border border-slate-800 outline-none">
            {/* ─── Header Toolbar ─────────────────────────────────── */}
            <div className="relative z-[100] border-b border-slate-800 bg-slate-900/95 px-3 py-3 backdrop-blur-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                        {showBack && (
                            <button
                                onClick={onBack}
                                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-white transition"
                            >
                                <AppIcon name="ArrowLeft" size={18} />
                            </button>
                        )}
                        <div className="min-w-0">
                            <h2 className="truncate text-white font-semibold text-base leading-tight">
                                3D Volume Rendering
                            </h2>
                            <p className="truncate text-gray-500 text-xs">
                                {volumeInfo
                                    ? volumeInfo.dimensions[0] + '\u00D7' + volumeInfo.dimensions[1] + '\u00D7' + volumeInfo.dimensions[2] + ' \u2022 ' + (volumeInfo.voxels / 1e6).toFixed(1) + 'M voxels'
                                    : 'Initializing...'}
                            </p>
                        </div>
                    </div>

                    <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
                        <div className="flex max-w-full items-center gap-0.5 overflow-x-auto rounded-lg bg-slate-800/80 p-0.5">
                            {[
                                { id: 'bone', label: 'Bone' },
                                { id: 'soft', label: 'Soft' },
                                { id: 'mip', label: 'MIP' },
                                { id: 'xray', label: 'X-Ray' },
                                { id: 'sinus', label: 'Sinus' },
                                { id: 'density', label: 'Density' },
                            ].map((p) => (
                                <button
                                    key={p.id}
                                    onClick={() => changePreset(p.id)}
                                    className={'whitespace-nowrap px-3 py-1.5 rounded-md text-xs font-medium transition-all ' + (
                                        preset === p.id
                                            ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30'
                                            : 'text-gray-400 hover:text-white hover:bg-slate-700'
                                    )}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>

                        <label className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1.5 text-[11px] font-medium text-slate-400">
                            <AppIcon name={QUALITY_SETTINGS[quality]?.icon || 'Monitor'} size={14} />
                            <select
                                value={quality}
                                onChange={(event) => setQuality(event.target.value)}
                                className="bg-transparent text-xs font-semibold text-slate-200 outline-none"
                                title="Rendering quality"
                            >
                                {QUALITY_KEYS.map((key) => (
                                    <option key={key} value={key}>
                                        {QUALITY_SETTINGS[key].label}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                        <button
                            onClick={() => setClippingMode((current) => !current)}
                            className={'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition ' + (
                                clippingMode
                                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                                    : 'bg-slate-800 text-gray-400 hover:text-white hover:bg-slate-700'
                            )}
                            title="Interactive clipping plane"
                        >
                            <AppIcon name="Scissors" size={16} />
                            <span>Clip</span>
                        </button>

                        <button
                            onClick={() => {
                                setMeasureMode3D((current) => !current);
                                setImplantPlaceMode(false);
                            }}
                            className={'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition ' + (
                                measureMode3D
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                    : 'bg-slate-800 text-gray-400 hover:text-white hover:bg-slate-700'
                            )}
                            title="3D distance measurement"
                        >
                            <AppIcon name="Ruler" size={16} />
                            <span>Measure 3D</span>
                        </button>

                        <button
                            onClick={handleToggleNerve}
                            disabled={nerveLoading}
                            className={'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition ' + (
                                showNerveOverlay
                                    ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40'
                                    : 'bg-slate-800 text-gray-400 hover:text-white hover:bg-slate-700'
                            )}
                            title="Inferior alveolar nerve canal overlay"
                        >
                            <AppIcon name={nerveLoading ? 'Loader2' : 'Cable'} size={16} className={nerveLoading ? 'animate-spin' : ''} />
                            <span>Nerve</span>
                        </button>

                        <button
                            onClick={() => setImplantPlannerOpen((current) => !current)}
                            className={'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition ' + (
                                implantPlannerOpen
                                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                                    : 'bg-slate-800 text-gray-400 hover:text-white hover:bg-slate-700'
                            )}
                            title="Virtual implant planner"
                        >
                            <AppIcon name="CircleDotDashed" size={16} />
                            <span>Implant</span>
                        </button>

                        <button
                            onClick={() => setReportModalOpen(true)}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 text-xs font-medium text-gray-400 transition hover:bg-slate-700 hover:text-white"
                            title="Export planning report"
                        >
                            <AppIcon name="FileText" size={16} />
                            <span>Report</span>
                        </button>

                        {shouldShowTeethToggle && (
                            <button
                                onClick={handleToggleTeeth}
                                disabled={!canLoadTeethOverlay || teethLoading}
                                className={'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition ' + (
                                    canLoadTeethOverlay
                                        ? (showTeethOverlay
                                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                            : 'bg-slate-800 text-gray-400 hover:text-white hover:bg-slate-700')
                                        : 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed'
                                )}
                                title={
                                    canLoadTeethOverlay
                                        ? (teethLoading ? 'Loading tooth overlays...' : 'Toggle tooth overlay')
                                        : 'No tooth labels available for this series'
                                }
                            >
                                <AppIcon name={teethLoading ? 'Loader2' : 'Bone'} size={16} className={teethLoading ? 'animate-spin' : ''} />
                                <span>Teeth{knownLabelCount > 0 ? ` ${knownLabelCount}` : ''}</span>
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-1.5">
                        {typeof onSwitchToLinkedMode === 'function' && (
                            <button
                                onClick={onSwitchToLinkedMode}
                                className="flex items-center gap-2 px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-medium transition shadow-lg shadow-cyan-600/20"
                            >
                                <AppIcon name="PanelRightOpen" size={16} />
                                <span>Linked</span>
                            </button>
                        )}

                        {typeof onSwitchToSliceMode === 'function' && (
                            <button
                                onClick={onSwitchToSliceMode}
                                className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-medium transition shadow-lg shadow-purple-600/20"
                            >
                                <AppIcon name="LayoutGrid" size={16} />
                                <span>Slice View</span>
                            </button>
                        )}

                        <ShortcutHelpButton shortcuts={VOLUME_SHORTCUTS} />

                        <div className="relative" ref={moreToolsMenuRef}>
                            <button
                                onClick={() => setShowMoreTools((current) => !current)}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 text-xs font-medium text-gray-300 transition hover:bg-slate-700 hover:text-white"
                                title="More tools"
                            >
                                <span>More</span>
                                <AppIcon name={showMoreTools ? 'ChevronUp' : 'ChevronDown'} size={14} />
                            </button>

                            {showMoreTools && (
                                <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-slate-700 bg-slate-900/98 p-2 shadow-2xl">
                                    {isMipOrXray && (
                                        <button
                                            onClick={() => {
                                                toggleInvert();
                                                setShowMoreTools(false);
                                            }}
                                            className={'mb-1 flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs transition ' + (
                                                inverted
                                                    ? 'bg-amber-500/20 text-amber-300'
                                                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                            )}
                                        >
                                            <span className="flex items-center gap-2"><AppIcon name="Contrast" size={14} /> Invert</span>
                                            <span>{inverted ? 'On' : 'Off'}</span>
                                        </button>
                                    )}

                                    {clippingMode && (
                                        <button
                                            onClick={() => {
                                                flipClipPlane();
                                                setShowMoreTools(false);
                                            }}
                                            className="mb-1 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-slate-300 transition hover:bg-slate-800 hover:text-white"
                                        >
                                            <AppIcon name="Scissors" size={14} /> Flip clip plane
                                        </button>
                                    )}

                                    <button
                                        onClick={() => {
                                            setAutoRotate((current) => !current);
                                            setShowMoreTools(false);
                                        }}
                                        className={'mb-1 flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs transition ' + (
                                            autoRotate
                                                ? 'bg-cyan-500/20 text-cyan-300'
                                                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                        )}
                                    >
                                        <span className="flex items-center gap-2"><AppIcon name="RotateCw" size={14} /> Auto rotate</span>
                                        <span>{autoRotate ? 'On' : 'Off'}</span>
                                    </button>

                                    <button
                                        onClick={() => {
                                            resetCamera();
                                            setShowMoreTools(false);
                                        }}
                                        className="mb-1 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-slate-300 transition hover:bg-slate-800 hover:text-white"
                                    >
                                        <AppIcon name="Focus" size={14} /> Reset view
                                    </button>

                                    <button
                                        onClick={() => {
                                            captureScreenshot();
                                            setShowMoreTools(false);
                                        }}
                                        className="mb-1 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-slate-300 transition hover:bg-slate-800 hover:text-white"
                                    >
                                        <AppIcon name="Camera" size={14} /> Save screenshot
                                    </button>

                                    <button
                                        onClick={() => {
                                            generateAIReport();
                                            setShowMoreTools(false);
                                        }}
                                        disabled={aiReportLoading}
                                        className="mb-1 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-slate-300 transition hover:bg-slate-800 hover:text-white disabled:opacity-60"
                                    >
                                        <AppIcon name={aiReportLoading ? 'Loader2' : 'Sparkles'} size={14} className={aiReportLoading ? 'animate-spin' : ''} />
                                        Generate AI report
                                    </button>

                                    {toothOverlayLoaded && (
                                        <button
                                            onClick={() => {
                                                exportSTL();
                                                setShowMoreTools(false);
                                            }}
                                            disabled={stlExporting}
                                            className="mb-1 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-slate-300 transition hover:bg-slate-800 hover:text-white disabled:opacity-60"
                                        >
                                            <AppIcon name={stlExporting ? 'Loader2' : 'Download'} size={14} className={stlExporting ? 'animate-spin' : ''} />
                                            Export STL
                                        </button>
                                    )}

                                    <button
                                        onClick={() => {
                                            setShowSeriesPanel(false);
                                            setShowMetadataPanel((prev) => !prev);
                                            setShowMoreTools(false);
                                        }}
                                        className="mb-1 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-slate-300 transition hover:bg-slate-800 hover:text-white"
                                    >
                                        <AppIcon name="Info" size={14} /> DICOM info
                                    </button>

                                    {allowSeriesSwitch && (
                                        <button
                                            onClick={() => {
                                                setShowSeriesPanel((prev) => !prev);
                                                setShowMoreTools(false);
                                            }}
                                            className="mb-1 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-slate-300 transition hover:bg-slate-800 hover:text-white"
                                        >
                                            <AppIcon name="Layers" size={14} /> Series
                                        </button>
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
            </div>

            {/* ─── Main Viewport Area ────────────────────────────── */}
            <div
                ref={containerRef}
                onPointerDownCapture={handleViewportPointerDown}
                onClickCapture={handleViewportClick}
                className="flex-1 relative"
                style={{ minHeight: '400px', width: '100%', cursor: measureMode3D || implantPlaceMode ? 'crosshair' : undefined }}
            >
                {/* Loading Overlay */}
                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-950 z-10 overflow-hidden">
                        {previewImage && (
                            <img
                                src={previewImage}
                                alt=""
                                className="absolute inset-0 h-full w-full object-cover opacity-45 blur-[1px]"
                            />
                        )}
                        <div className="absolute inset-0 bg-slate-950/55" />
                        <div className="relative flex flex-col items-center gap-5 text-white max-w-md w-full px-8">
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
                        {teethError && (
                            <div className="bg-red-950/80 text-red-200 text-xs rounded-xl p-3 border border-red-500/30 shadow-2xl">
                                <div className="font-semibold mb-1">Tooth overlay unavailable</div>
                                <div className="text-red-200/80">{teethError}</div>
                            </div>
                        )}

                        {stlError && (
                            <div className="bg-red-950/80 text-red-200 text-xs rounded-xl p-3 border border-red-500/30 shadow-2xl">
                                <div className="font-semibold mb-1">STL export failed</div>
                                <div className="text-red-200/80">{stlError}</div>
                            </div>
                        )}

                        {clipError && (
                            <div className="bg-red-950/80 text-red-200 text-xs rounded-xl p-3 border border-red-500/30 shadow-2xl">
                                <div className="font-semibold mb-1">Clip tool unavailable</div>
                                <div className="text-red-200/80">{clipError}</div>
                            </div>
                        )}

                        {nerveError && (
                            <div className="bg-amber-950/80 text-amber-100 text-xs rounded-xl p-3 border border-amber-500/30 shadow-2xl">
                                <div className="font-semibold mb-1">Nerve overlay</div>
                                <div className="text-amber-100/80">{nerveError}</div>
                            </div>
                        )}

                        {implantError && (
                            <div className="bg-red-950/80 text-red-200 text-xs rounded-xl p-3 border border-red-500/30 shadow-2xl">
                                <div className="font-semibold mb-1">Implant planner</div>
                                <div className="text-red-200/80">{implantError}</div>
                            </div>
                        )}

                        {(measureMode3D || measurements3D.length > 0) && (
                            <div className="bg-black/75 backdrop-blur-md rounded-xl p-3 border border-white/10 shadow-2xl">
                                <div className="flex items-center justify-between gap-2 mb-2">
                                    <div className="flex items-center gap-2">
                                        <AppIcon name="Ruler" size={14} className="text-emerald-300" />
                                        <span className="text-xs font-semibold text-white uppercase tracking-wider">3D Measure</span>
                                    </div>
                                    <span className="text-[10px] text-slate-400">{measurePoints.length ? 'Pick second point' : 'Pick two points'}</span>
                                </div>
                                <div className="flex gap-1">
                                    <button
                                        onClick={undoMeasurement3D}
                                        disabled={!measurements3D.length}
                                        className="flex-1 rounded-lg bg-slate-800 px-2 py-1.5 text-[10px] font-semibold text-slate-300 transition hover:bg-slate-700 disabled:opacity-40"
                                    >
                                        Undo
                                    </button>
                                    <button
                                        onClick={clearMeasurements3D}
                                        disabled={!measurements3D.length && !measurePoints.length}
                                        className="flex-1 rounded-lg bg-slate-800 px-2 py-1.5 text-[10px] font-semibold text-slate-300 transition hover:bg-slate-700 disabled:opacity-40"
                                    >
                                        Clear
                                    </button>
                                </div>
                                {measurements3D.length > 0 && (
                                    <div className="mt-2 max-h-24 overflow-y-auto space-y-1">
                                        {measurements3D.slice(-4).map((item, index) => (
                                            <div key={item.id} className="flex items-center justify-between rounded-md bg-slate-900/70 px-2 py-1 text-[10px]">
                                                <span className="text-slate-400">M{Math.max(1, measurements3D.length - 3 + index)}</span>
                                                <span className="font-mono text-emerald-300">{item.distance.toFixed(2)} mm</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {implantPlannerOpen && (
                            <ImplantPlanner
                                brand={implantBrand}
                                diameter={implantDiameter}
                                length={implantLength}
                                placementCount={implantPlacements.length}
                                placeMode={implantPlaceMode}
                                onBrandChange={setImplantBrand}
                                onDiameterChange={setImplantDiameter}
                                onLengthChange={setImplantLength}
                                onTogglePlaceMode={() => {
                                    setImplantPlaceMode((current) => !current);
                                    setMeasureMode3D(false);
                                }}
                                onClear={clearImplants}
                            />
                        )}

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

                        {preset === 'density' && (
                            <div className="bg-black/75 backdrop-blur-md rounded-xl p-3 border border-white/10 shadow-2xl">
                                <div className="mb-2 flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <AppIcon name="Activity" size={14} className="text-blue-300" />
                                        <span className="text-xs font-semibold uppercase tracking-wider text-white">Misch Density</span>
                                    </div>
                                    <button
                                        onClick={loadDensityHistogram}
                                        disabled={densityLoading}
                                        className="rounded-md bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-300 transition hover:bg-slate-700 disabled:cursor-wait disabled:opacity-50"
                                    >
                                        {densityLoading ? 'Loading' : 'Refresh'}
                                    </button>
                                </div>
                                <div className="space-y-1.5">
                                    {DENSITY_LEGEND.map((item) => (
                                        <div key={item.label} className="flex items-center gap-2 rounded-lg bg-slate-900/60 px-2 py-1.5">
                                            <span className={`h-3 w-3 rounded-full ${item.className}`} />
                                            <span className="w-6 text-xs font-bold text-white">{item.label}</span>
                                            <span className="flex-1 text-[10px] text-slate-400">{item.range}</span>
                                            {densityHistogram && (
                                                <span className="font-mono text-[10px] text-white">
                                                    {densityHistogram[`${item.label.toLowerCase()}_pct`] ?? 0}%
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                {densityHistogram && (
                                    <div className="mt-2 rounded-lg border border-slate-800 bg-slate-950/70 px-2 py-1.5 text-[10px] text-slate-400">
                                        Candidate voxels: <span className="font-mono text-slate-200">{densityHistogram.density_voxel_count}</span>
                                    </div>
                                )}
                                {densityError && (
                                    <div className="mt-2 rounded-lg border border-amber-500/30 bg-amber-950/40 px-2 py-1.5 text-[10px] text-amber-200">
                                        {densityError}
                                    </div>
                                )}
                            </div>
                        )}
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

                <ReportExportModal
                    visible={reportModalOpen}
                    onClose={() => setReportModalOpen(false)}
                    onConfirm={handleExportReport}
                    initialValues={reportInitialValues}
                    exporting={exportingReport}
                    clinicName={clinicName}
                    warningMessage={reportWarningMessage}
                />

                {measurementLabels.map((item) => (
                    <div
                        key={item.id}
                        className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-950/85 px-2.5 py-1 text-[11px] font-semibold text-white shadow-xl ring-1 ring-emerald-400/40"
                        style={{ left: item.screen.x, top: item.screen.y }}
                    >
                        {item.distance.toFixed(2)} mm
                    </div>
                ))}

                {measureMode3D && measurePoints.length === 1 && (
                    <div className="pointer-events-none absolute left-1/2 top-20 z-30 -translate-x-1/2 rounded-full bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-100 ring-1 ring-emerald-400/40 backdrop-blur">
                        First point set — click second point
                    </div>
                )}

                {showNerveOverlay && nerveInfo && (
                    <div className="absolute right-3 top-16 z-20 rounded-xl border border-yellow-500/30 bg-yellow-500/15 px-3 py-2 text-xs text-yellow-100 backdrop-blur">
                        Nerve canal confidence {(Number(nerveInfo.confidence || 0) * 100).toFixed(0)}%
                    </div>
                )}

                {(aiReportOpen || aiReport || aiReportLoading || aiReportError) && (
                    <div className="absolute bottom-14 left-1/2 z-30 w-[min(720px,calc(100%-32px))] -translate-x-1/2 overflow-hidden rounded-2xl border border-cyan-500/20 bg-slate-950/90 text-slate-100 shadow-2xl backdrop-blur">
                        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2">
                            <div className="flex items-center gap-2">
                                <AppIcon name="Sparkles" size={15} className="text-cyan-300" />
                                <span className="text-xs font-semibold uppercase tracking-wider">AI Preliminary Report</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={generateAIReport}
                                    disabled={aiReportLoading}
                                    className="rounded-lg bg-slate-800 px-2 py-1 text-[10px] font-semibold text-slate-300 transition hover:bg-slate-700 disabled:opacity-50"
                                >
                                    Regenerate
                                </button>
                                <button
                                    onClick={() => setAiReportOpen((current) => !current)}
                                    className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-800 hover:text-white"
                                >
                                    <AppIcon name={aiReportOpen ? 'ChevronDown' : 'ChevronUp'} size={14} />
                                </button>
                            </div>
                        </div>
                        {aiReportOpen && (
                            <div className="px-4 py-3">
                                {aiReportLoading ? (
                                    <div className="flex items-center gap-2 text-sm text-slate-300">
                                        <AppIcon name="Loader2" size={16} className="animate-spin text-cyan-300" />
                                        Generating report...
                                    </div>
                                ) : aiReportError ? (
                                    <p className="text-sm text-red-200">{aiReportError}</p>
                                ) : (
                                    <p className="text-sm leading-relaxed text-slate-100">{aiReport || 'No report generated yet.'}</p>
                                )}
                                <p className="mt-2 text-[11px] text-amber-200/80">AI-generated preliminary assessment — requires radiologist review.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* ─── Mode Label Badge ──────────────────────────── */}
                {!loading && !error && (
                    <div className="absolute top-3 right-3 z-20">
                        <div className={'px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest border backdrop-blur-sm ' + (
                            preset === 'bone' ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' :
                            preset === 'soft' ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' :
                            preset === 'mip'  ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' :
                            preset === 'sinus' ? 'bg-blue-500/15 text-blue-300 border-blue-500/30' :
                            preset === 'density' ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30' :
                                                'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        )}>
                            {preset === 'bone' ? 'Bone / Teeth' :
                             preset === 'soft' ? 'Soft Tissue' :
                             preset === 'mip'  ? 'MIP — Implant View' :
                             preset === 'sinus' ? 'Sinus — Air Cavities' :
                             preset === 'density' ? 'Density — D1/D4' :
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
                            <span className="text-white/20">{'\u2022'}</span>
                            <span className="text-slate-300">Quality: {QUALITY_SETTINGS[quality]?.label || quality}</span>
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
