import React, { useCallback, useRef, useState } from 'react';
import AppIcon from '../../../../components/AppIcon';
import Viewer3D from './Viewer3D';

const ComparisonViewer = ({ studies = [], onExit }) => {
    const [dividerPercent, setDividerPercent] = useState(50);
    const [syncEnabled, setSyncEnabled] = useState(true);
    const wrapperRef = useRef(null);
    const leftPaneRef = useRef(null);
    const rightPaneRef = useRef(null);
    const forwardingRef = useRef(false);

    const mirrorEvent = useCallback((sourceIndex, event) => {
        if (!syncEnabled || forwardingRef.current) return;
        if (!['wheel', 'mousedown', 'mousemove', 'mouseup'].includes(event.type)) return;

        const targetPane = sourceIndex === 0 ? rightPaneRef.current : leftPaneRef.current;
        if (!targetPane) return;

        const target = targetPane.querySelector('canvas') || targetPane;
        forwardingRef.current = true;
        try {
            if (event.type === 'wheel') {
                target.dispatchEvent(new WheelEvent('wheel', {
                    bubbles: true,
                    cancelable: true,
                    deltaX: event.deltaX,
                    deltaY: event.deltaY,
                    deltaMode: event.deltaMode,
                    clientX: event.clientX,
                    clientY: event.clientY,
                }));
            } else {
                target.dispatchEvent(new MouseEvent(event.type, {
                    bubbles: true,
                    cancelable: true,
                    button: event.button,
                    buttons: event.buttons,
                    clientX: event.clientX,
                    clientY: event.clientY,
                    movementX: event.movementX,
                    movementY: event.movementY,
                }));
            }
        } finally {
            window.setTimeout(() => {
                forwardingRef.current = false;
            }, 0);
        }
    }, [syncEnabled]);

    const startDividerDrag = useCallback((event) => {
        event.preventDefault();
        const rect = wrapperRef.current?.getBoundingClientRect();
        if (!rect) return;

        const handleMove = (moveEvent) => {
            const nextPercent = ((moveEvent.clientX - rect.left) / rect.width) * 100;
            setDividerPercent(Math.max(30, Math.min(70, nextPercent)));
        };
        const handleUp = () => {
            document.removeEventListener('mousemove', handleMove);
            document.removeEventListener('mouseup', handleUp);
        };

        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleUp);
    }, []);

    if (studies.length !== 2) return null;

    return (
        <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 text-slate-100 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/95 px-4 py-3">
                <div>
                    <h2 className="text-base font-semibold text-white">Comparison Mode</h2>
                    <p className="text-xs text-slate-400">Two independent viewer contexts, side-by-side</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setSyncEnabled((current) => !current)}
                        className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${syncEnabled ? 'border border-cyan-500/40 bg-cyan-500/15 text-cyan-300' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                    >
                        <AppIcon name="Link2" size={16} />
                        Sync Zoom/Pan
                    </button>
                    <button
                        onClick={onExit}
                        className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-700 hover:text-white"
                    >
                        <AppIcon name="X" size={16} />
                        Exit Comparison
                    </button>
                </div>
            </div>

            <div ref={wrapperRef} className="relative flex min-h-0 flex-1">
                {studies.map((study, index) => {
                    const width = index === 0 ? dividerPercent : 100 - dividerPercent;
                    const ref = index === 0 ? leftPaneRef : rightPaneRef;
                    return (
                        <div
                            key={`${study.folderName || study.id}-${study.selectedSeriesUid}-${index}`}
                            ref={ref}
                            className="relative min-w-0"
                            style={{ width: `${width}%` }}
                            onWheelCapture={(event) => mirrorEvent(index, event)}
                            onMouseDownCapture={(event) => mirrorEvent(index, event)}
                            onMouseMoveCapture={(event) => mirrorEvent(index, event)}
                            onMouseUpCapture={(event) => mirrorEvent(index, event)}
                        >
                            <div className="absolute left-3 top-3 z-30 rounded-xl border border-white/10 bg-black/65 px-3 py-2 backdrop-blur">
                                <div className="text-xs font-semibold text-white">{study.comparisonPatientName || study.patientName || 'Patient'}</div>
                                <div className="text-[11px] text-cyan-300">{study.comparisonTitle || study.selectedSeriesUid}</div>
                            </div>
                            <Viewer3D
                                study={study}
                                onBack={onExit}
                                comparisonPaneId={index}
                                comparisonSyncEnabled={syncEnabled}
                            />
                        </div>
                    );
                })}

                <button
                    type="button"
                    onMouseDown={startDividerDrag}
                    className="absolute top-0 z-40 h-full w-1 cursor-col-resize bg-slate-700 transition hover:bg-cyan-500"
                    style={{ left: `calc(${dividerPercent}% - 2px)` }}
                    aria-label="Resize comparison panes"
                />
            </div>
        </div>
    );
};

export default ComparisonViewer;
