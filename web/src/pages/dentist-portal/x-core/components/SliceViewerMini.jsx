import React, { useEffect, useMemo, useRef, useState } from 'react';

import vtkGenericRenderWindow from '@kitware/vtk.js/Rendering/Misc/GenericRenderWindow';
import vtkInteractorStyleImage from '@kitware/vtk.js/Interaction/Style/InteractorStyleImage';
import vtkImageMapper from '@kitware/vtk.js/Rendering/Core/ImageMapper';
import vtkImageSlice from '@kitware/vtk.js/Rendering/Core/ImageSlice';
import vtkColorTransferFunction from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction';
import vtkPiecewiseFunction from '@kitware/vtk.js/Common/DataModel/PiecewiseFunction';
import { SlicingMode } from '@kitware/vtk.js/Rendering/Core/ImageMapper/Constants';

const AXES = {
    axial: {
        slicingMode: SlicingMode.K,
        dimIndex: 2,
        camUp: [0, -1, 0],
        camDir: [0, 0, -1],
        color: '#22d3ee',
        label: 'Axial',
    },
    coronal: {
        slicingMode: SlicingMode.J,
        dimIndex: 1,
        camUp: [0, 0, 1],
        camDir: [0, -1, 0],
        color: '#c084fc',
        label: 'Coronal',
    },
    sagittal: {
        slicingMode: SlicingMode.I,
        dimIndex: 0,
        camUp: [0, 0, 1],
        camDir: [-1, 0, 0],
        color: '#34d399',
        label: 'Sagittal',
    },
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const buildColorFunction = () => {
    const ctf = vtkColorTransferFunction.newInstance();
    ctf.addRGBPoint(0.0, 0.0, 0.0, 0.0);
    ctf.addRGBPoint(0.42, 0.74, 0.74, 0.74);
    ctf.addRGBPoint(1.0, 1.0, 1.0, 1.0);
    return ctf;
};

const buildOpacityFunction = () => {
    const ofun = vtkPiecewiseFunction.newInstance();
    ofun.addPoint(0.0, 1.0);
    ofun.addPoint(1.0, 1.0);
    return ofun;
};

const SliceViewerMini = ({ axis, imageData, crosshairWorld, onCrosshairChange }) => {
    const containerRef = useRef(null);
    const ctxRef = useRef(null);
    const axisDef = AXES[axis] || AXES.axial;
    const [sliceIndex, setSliceIndex] = useState(0);
    const [dims, setDims] = useState([0, 0, 0]);
    const [cameraModifiedTick, setCameraModifiedTick] = useState(0);
    const [crosshairScreen, setCrosshairScreen] = useState(null);
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

    const maxSlice = useMemo(() => Math.max((dims[axisDef.dimIndex] || 1) - 1, 0), [axisDef.dimIndex, dims]);

    useEffect(() => {
        if (!imageData || !containerRef.current) return undefined;

        const nextDims = imageData.getDimensions();
        const spacing = imageData.getSpacing();
        const origin = imageData.getOrigin();
        const centeredSlice = Math.floor(Math.max(nextDims[axisDef.dimIndex] - 1, 0) / 2);
        setDims(nextDims);
        setSliceIndex(centeredSlice);

        const grw = vtkGenericRenderWindow.newInstance({ listenWindowResize: false });
        grw.setContainer(containerRef.current);
        grw.resize();

        const renderer = grw.getRenderer();
        const renderWindow = grw.getRenderWindow();
        renderer.setBackground(0.03, 0.04, 0.07);
        renderWindow.getInteractor().setInteractorStyle(vtkInteractorStyleImage.newInstance());

        const mapper = vtkImageMapper.newInstance();
        mapper.setInputData(imageData);
        mapper.setSlicingMode(axisDef.slicingMode);
        mapper.setSlice(centeredSlice);

        const actor = vtkImageSlice.newInstance();
        actor.setMapper(mapper);
        actor.getProperty().setInterpolationTypeToLinear();
        actor.getProperty().setRGBTransferFunction(0, buildColorFunction());
        actor.getProperty().setPiecewiseFunction(0, buildOpacityFunction());
        actor.getProperty().setUseLookupTableScalarRange(true);
        renderer.addActor(actor);

        const camera = renderer.getActiveCamera();
        const cx = origin[0] + (nextDims[0] * spacing[0]) / 2;
        const cy = origin[1] + (nextDims[1] * spacing[1]) / 2;
        const cz = origin[2] + (nextDims[2] * spacing[2]) / 2;
        const dist = Math.max(nextDims[0] * spacing[0], nextDims[1] * spacing[1], nextDims[2] * spacing[2]) * 2;
        camera.setParallelProjection(true);
        camera.setPosition(
            cx + axisDef.camDir[0] * dist,
            cy + axisDef.camDir[1] * dist,
            cz + axisDef.camDir[2] * dist
        );
        camera.setFocalPoint(cx, cy, cz);
        camera.setViewUp(...axisDef.camUp);
        renderer.resetCamera();
        camera.zoom(1.05);
        renderWindow.render();

        const subscription = camera.onModified(() => {
            setCameraModifiedTick((t) => t + 1);
        });

        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (!entry) return;
            const width = Math.round(entry.contentRect.width);
            const height = Math.round(entry.contentRect.height);
            if (width > 0 && height > 0) {
                grw.resize();
                renderer.resetCamera();
                camera.zoom(1.05);
                setContainerSize({ width, height });
                renderWindow.render();
            }
        });
        observer.observe(containerRef.current);

        ctxRef.current = { grw, renderer, renderWindow, mapper, actor, imageData };

        return () => {
            subscription.unsubscribe();
            observer.disconnect();
            ctxRef.current = null;
            try { mapper.delete(); } catch (_) {}
            try { actor.delete(); } catch (_) {}
            try { grw.delete(); } catch (_) {}
        };
    }, [axisDef.camDir, axisDef.camUp, axisDef.dimIndex, axisDef.slicingMode, imageData]);

    useEffect(() => {
        const ctx = ctxRef.current;
        if (!ctx || !crosshairWorld || !imageData) return;

        const indexPoint = imageData.worldToIndex(crosshairWorld);
        if (!Array.isArray(indexPoint) || indexPoint.some((value) => !Number.isFinite(value))) return;

        const nextSlice = clamp(Math.round(indexPoint[axisDef.dimIndex]), 0, maxSlice);
        ctx.mapper.setSlice(nextSlice);
        ctx.renderWindow.render();
        setSliceIndex(nextSlice);

        try {
            const view = ctx.grw.getRenderWindow().getViews?.()?.[0] || ctx.grw.getInteractor?.()?.getView?.();
            if (view?.worldToDisplay) {
                const display = view.worldToDisplay(crosshairWorld[0], crosshairWorld[1], crosshairWorld[2], ctx.renderer);
                const rect = containerRef.current.getBoundingClientRect();
                const viewSize = view.getSize?.() || [rect.width, rect.height];
                if (rect.width > 0 && rect.height > 0) {
                    setCrosshairScreen({
                        x: (display[0] / Math.max(viewSize[0], 1)) * rect.width,
                        y: rect.height - ((display[1] / Math.max(viewSize[1], 1)) * rect.height),
                    });
                }
            }
        } catch (err) {
            console.warn('Failed to calculate crosshair screen position:', err);
        }
    }, [axisDef.dimIndex, crosshairWorld, imageData, maxSlice, cameraModifiedTick, containerSize]);

    const displayToWorld = (displayX, displayY) => {
        const ctx = ctxRef.current;
        if (!ctx) return null;
        try {
            const view = ctx.grw.getRenderWindow().getViews?.()?.[0] || ctx.grw.getInteractor?.()?.getView?.();
            if (!view?.displayToWorld) return null;
            const camera = ctx.renderer.getActiveCamera();
            const focalPoint = camera.getFocalPoint();
            const displayFocal = view.worldToDisplay(focalPoint[0], focalPoint[1], focalPoint[2], ctx.renderer);
            const displayZ = displayFocal[2];
            const world = view.displayToWorld(displayX, displayY, displayZ, ctx.renderer);
            return Array.isArray(world) ? world.slice(0, 3) : null;
        } catch (_) {
            return null;
        }
    };

    const getDisplayPoint = (event) => {
        if (!containerRef.current) return null;
        const rect = containerRef.current.getBoundingClientRect();
        const ctx = ctxRef.current;
        if (!ctx || !rect) return null;
        const view = ctx.grw.getRenderWindow().getViews?.()?.[0] || ctx.grw.getInteractor?.()?.getView?.();
        const viewSize = view.getSize?.() || [rect.width, rect.height];
        const x = ((event.clientX - rect.left) / rect.width) * viewSize[0];
        const y = (1 - (event.clientY - rect.top) / rect.height) * viewSize[1];
        return { x, y };
    };

    const handlePointerAction = (event) => {
        const displayPoint = getDisplayPoint(event);
        if (!displayPoint) return;
        const world = displayToWorld(displayPoint.x, displayPoint.y);
        if (world && imageData && onCrosshairChange) {
            const indexPoint = imageData.worldToIndex(world);
            if (Array.isArray(indexPoint)) {
                indexPoint[axisDef.dimIndex] = sliceIndex;
                const correctedWorld = imageData.indexToWorld(indexPoint);
                if (correctedWorld) {
                    onCrosshairChange(correctedWorld);
                }
            }
        }
    };

    const [isPointerDown, setIsPointerDown] = useState(false);

    const handlePointerDown = (event) => {
        if (event.button !== 0) return;
        setIsPointerDown(true);
        event.currentTarget.setPointerCapture(event.pointerId);
        handlePointerAction(event);
    };

    const handlePointerMove = (event) => {
        if (!isPointerDown) return;
        handlePointerAction(event);
    };

    const handlePointerUp = (event) => {
        if (!isPointerDown) return;
        setIsPointerDown(false);
        try { event.currentTarget.releasePointerCapture(event.pointerId); } catch (_) {}
    };

    const handleWheel = (event) => {
        const ctx = ctxRef.current;
        if (!ctx || !imageData) return;
        event.preventDefault();
        const delta = event.deltaY > 0 ? 1 : -1;
        const nextSlice = clamp(sliceIndex + delta, 0, maxSlice);

        const indexPoint = crosshairWorld ? imageData.worldToIndex(crosshairWorld) : imageData.getDimensions().map(d => Math.floor(d / 2));
        indexPoint[axisDef.dimIndex] = nextSlice;

        const nextWorld = imageData.indexToWorld(indexPoint);
        if (nextWorld && onCrosshairChange) {
            onCrosshairChange(nextWorld);
        }
    };

    return (
        <div
            className="relative min-h-0 overflow-hidden rounded-2xl border bg-slate-950"
            style={{ borderColor: axisDef.color, touchAction: 'none' }}
            onWheel={handleWheel}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
        >
            <div ref={containerRef} className="h-full w-full" />
            <div className="pointer-events-none absolute left-2 top-2 rounded-lg bg-slate-950/80 px-2 py-1 text-[11px] font-bold uppercase tracking-wider" style={{ color: axisDef.color }}>
                {axisDef.label}
            </div>
            <div className="pointer-events-none absolute right-2 top-2 rounded-lg bg-black/60 px-2 py-1 font-mono text-[10px] text-slate-300">
                {sliceIndex + 1}/{maxSlice + 1}
            </div>
            {crosshairScreen ? (
                <>
                    <div
                        className="pointer-events-none absolute top-0 h-full w-px"
                        style={{
                            left: `${crosshairScreen.x}px`,
                            backgroundColor: axisDef.color,
                            boxShadow: `0 0 4px ${axisDef.color}`,
                        }}
                    />
                    <div
                        className="pointer-events-none absolute left-0 w-full h-px"
                        style={{
                            top: `${crosshairScreen.y}px`,
                            backgroundColor: axisDef.color,
                            boxShadow: `0 0 4px ${axisDef.color}`,
                        }}
                    />
                </>
            ) : (
                <>
                    <div className="pointer-events-none absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/20" />
                    <div className="pointer-events-none absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-white/20" />
                </>
            )}
        </div>
    );
};

export default SliceViewerMini;
