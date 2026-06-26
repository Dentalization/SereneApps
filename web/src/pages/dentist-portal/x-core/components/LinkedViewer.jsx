import React, { useEffect, useState } from 'react';

import AppIcon from '../../../../components/AppIcon';
import VolumeViewer3D from './VolumeViewer3D';
import SliceViewerMini from './SliceViewerMini';

const LinkedViewer = ({ study, onBack, onExit, onSwitchSeries, isFullscreen = false, comparisonPaneId = null }) => {
    const [sharedImageData, setSharedImageData] = useState(null);
    const [crosshairWorld, setCrosshairWorld] = useState(null);

    const title = study?.patientName || study?.originalName || study?.folderName || 'Linked Study';

    useEffect(() => {
        if (sharedImageData && !crosshairWorld) {
            const dims = sharedImageData.getDimensions();
            const centerIndices = [Math.floor(dims[0] / 2), Math.floor(dims[1] / 2), Math.floor(dims[2] / 2)];
            const centerWorld = sharedImageData.indexToWorld(centerIndices);
            setCrosshairWorld(centerWorld);
        }
    }, [sharedImageData, crosshairWorld]);

    useEffect(() => {
        const handleCrosshairSync = (event) => {
            const point = event?.detail?.worldPoint;
            if (Array.isArray(point) && point.length === 3) {
                setCrosshairWorld(point);
            }
        };
        window.addEventListener('xcore:mpr_crosshair_sync', handleCrosshairSync);
        return () => window.removeEventListener('xcore:mpr_crosshair_sync', handleCrosshairSync);
    }, []);

    const handleCrosshairChange = (point) => {
        if (Array.isArray(point) && point.length === 3) {
            setCrosshairWorld(point);
            window.dispatchEvent(new CustomEvent('xcore:mpr_crosshair_sync', {
                detail: {
                    worldPoint: point,
                    studyKey: study?.studyKey,
                }
            }));
        }
    };

    const isComparison = comparisonPaneId !== null;
    const containerClasses = `linked-viewer-container flex h-full flex-col overflow-hidden bg-slate-950 text-slate-100 outline-none ${
        isComparison
            ? 'rounded-none border-none shadow-none'
            : 'rounded-3xl border border-slate-800 shadow-2xl'
    }`;

    return (
        <div className={containerClasses}>
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/95 px-4 py-3">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onExit || onBack}
                        className="rounded-lg bg-slate-800 p-2 text-white transition hover:bg-slate-700"
                    >
                        <AppIcon name="ArrowLeft" size={18} />
                    </button>
                    <div>
                        <h2 className="text-sm font-semibold text-white">Linked 3D + MPR</h2>
                        <p className="text-xs text-slate-400">{title}</p>
                    </div>
                </div>
                <div className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-200">
                    Click 3D to move MPR crosshair
                </div>
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-[2fr_1fr] gap-1 p-1">
                <div className="min-h-0">
                    <VolumeViewer3D
                        study={study}
                        onBack={undefined}
                        onSwitchSeries={onSwitchSeries}
                        onVolumeLoaded={setSharedImageData}
                        onSurfaceClick={handleCrosshairChange}
                        linkedMode
                    />
                </div>
                <div className="grid min-h-0 grid-rows-3 gap-1">
                    <SliceViewerMini axis="axial" imageData={sharedImageData} crosshairWorld={crosshairWorld} onCrosshairChange={handleCrosshairChange} />
                    <SliceViewerMini axis="coronal" imageData={sharedImageData} crosshairWorld={crosshairWorld} onCrosshairChange={handleCrosshairChange} />
                    <SliceViewerMini axis="sagittal" imageData={sharedImageData} crosshairWorld={crosshairWorld} onCrosshairChange={handleCrosshairChange} />
                </div>
            </div>
        </div>
    );
};

export default LinkedViewer;
