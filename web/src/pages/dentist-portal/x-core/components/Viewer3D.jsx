import React, { useEffect, useState, useCallback, useRef } from 'react';
import AppIcon from '../../../../components/AppIcon';
import useSeriesList from '../hooks/useSeriesList';
import VolumeViewer3D from './VolumeViewer3D';
import ImageViewer2D from './ImageViewer2D';
import SliceViewer from './SliceViewer';
import SeriesSidebar from './SeriesSidebar';
import LinkedViewer from './LinkedViewer';
import { buildImagingUrl, buildStudyAssetParams } from '../utils/imagingUrl';

const Viewer3D = ({ study, onBack, comparisonPaneId = null, comparisonSyncEnabled = false, analysisCaseContext = null, onCaptureForCase = null }) => {
    const [activeStudy, setActiveStudy] = useState(study);
    const { allSeries } = useSeriesList(activeStudy);
    const [showSeriesSelector, setShowSeriesSelector] = useState(false);
    const [viewMode, setViewMode] = useState('auto'); // 'auto', '3d', 'slice', '2d'
    const parentWrapperRef = useRef(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const toggleFullscreen = useCallback(() => {
        const target = parentWrapperRef.current;
        if (!target) return;

        if (!(document.fullscreenElement || document.webkitFullscreenElement)) {
            const requestFS = target.requestFullscreen || target.webkitRequestFullscreen;
            if (requestFS) {
                Promise.resolve(requestFS.call(target)).catch(console.error);
            }
        } else {
            const exitFS = document.exitFullscreen || document.webkitExitFullscreen;
            if (exitFS) {
                Promise.resolve(exitFS.call(document)).catch(console.error);
            }
        }
    }, []);

    useEffect(() => {
        const handleFSChange = () => {
            setIsFullscreen(!!(document.fullscreenElement || document.webkitFullscreenElement));
        };
        document.addEventListener('fullscreenchange', handleFSChange);
        document.addEventListener('webkitfullscreenchange', handleFSChange);
        return () => {
            document.removeEventListener('fullscreenchange', handleFSChange);
            document.removeEventListener('webkitfullscreenchange', handleFSChange);
        };
    }, []);
    const [srReport, setSrReport] = useState(null);
    const [showSrPanel, setShowSrPanel] = useState(false);
    const studyKey = activeStudy?.folderName || activeStudy?.id || '';

    useEffect(() => {
        setActiveStudy(study);
    }, [study]);

    useEffect(() => {
        let cancelled = false;
        setSrReport(null);
        setShowSrPanel(false);

        const loadStructuredReport = async () => {
            if (!studyKey) return;
            try {
                const response = await fetch(buildImagingUrl(`/sr/${studyKey}`, buildStudyAssetParams(activeStudy)));
                if (!response.ok) return;
                const payload = await response.json();
                if (!cancelled && payload?.hasReport) {
                    setSrReport(payload);
                }
            } catch (error) {
                console.warn('[Viewer3D] Structured report unavailable:', error);
            }
        };

        loadStructuredReport();

        return () => {
            cancelled = true;
        };
    }, [activeStudy, studyKey]);

    const copyStructuredReport = useCallback(async () => {
        if (!srReport) return;
        const lines = [
            'DICOM Structured Report',
            '',
            'Measurements:',
            ...(srReport.measurements || []).map((item) => `${item.label}: ${item.value} ${item.unit || ''}`.trim()),
            '',
            'Findings:',
            ...(srReport.findings || []).map((item) => `${item.label}: ${item.text}`),
        ];
        try {
            await navigator.clipboard.writeText(lines.join('\n'));
        } catch (error) {
            console.warn('[Viewer3D] Failed to copy structured report:', error);
        }
    }, [srReport]);

    const renderWithStructuredReport = useCallback((content) => (
        <div className="relative h-full">
            {content}

            {srReport?.hasReport && (
                <button
                    onClick={() => setShowSrPanel((current) => !current)}
                    className="absolute right-4 top-4 z-40 inline-flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/20 px-3 py-2 text-xs font-semibold text-emerald-200 shadow-2xl backdrop-blur transition hover:bg-emerald-500/30"
                >
                    <AppIcon name="ClipboardList" size={16} />
                    Report
                </button>
            )}

            {showSrPanel && srReport?.hasReport && (
                <aside className="absolute right-0 top-0 z-50 flex h-full w-[320px] flex-col border-l border-slate-700 bg-slate-900 text-slate-100 shadow-2xl">
                    <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
                        <div>
                            <h3 className="text-sm font-semibold text-white">DICOM SR</h3>
                            <p className="text-[11px] text-slate-400">Measurements and findings</p>
                        </div>
                        <button onClick={() => setShowSrPanel(false)} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white">
                            <AppIcon name="X" size={16} />
                        </button>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto p-4">
                        <div className="mb-5">
                            <div className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-slate-400">Measurements</div>
                            {(srReport.measurements || []).length > 0 ? (
                                <div className="overflow-hidden rounded-xl border border-slate-700">
                                    {(srReport.measurements || []).map((item, index) => (
                                        <div key={`${item.label}-${index}`} className="grid grid-cols-[1fr_72px_52px] gap-2 border-b border-slate-800 px-3 py-2 text-xs last:border-b-0">
                                            <span className="text-slate-300">{item.label || 'Measurement'}</span>
                                            <span className="font-mono text-white">{item.value || '-'}</span>
                                            <span className="font-mono text-cyan-300">{item.unit || '-'}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-500">No measurements found.</p>
                            )}
                        </div>

                        <div>
                            <div className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-slate-400">Findings</div>
                            {(srReport.findings || []).length > 0 ? (
                                <div className="space-y-2">
                                    {(srReport.findings || []).map((item, index) => (
                                        <div key={`${item.label}-${index}`} className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2">
                                            <div className="text-[11px] uppercase tracking-wide text-slate-500">{item.label || 'Finding'}</div>
                                            <div className="mt-1 text-sm text-white">{item.text}</div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-500">No findings found.</p>
                            )}
                        </div>
                    </div>

                    <div className="border-t border-slate-700 p-4">
                        <button
                            onClick={copyStructuredReport}
                            className="mb-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-cyan-500"
                        >
                            <AppIcon name="Copy" size={14} />
                            Copy Report
                        </button>
                        <p className="text-[11px] text-slate-500">Generated by: {srReport.manufacturer || 'Unknown'}</p>
                    </div>
                </aside>
            )}
        </div>
    ), [copyStructuredReport, showSrPanel, srReport]);

    // Handle series switching from any viewer component
    const handleSwitchSeries = useCallback((series) => {
        const newStudy = {
            ...activeStudy,
            selectedSeriesUid: series.series_uid,
            selectedSeriesType: series.type,
        };
        setActiveStudy(newStudy);
        // Set view mode based on new series type
        if (series.type === '3D Volume') {
            setViewMode('3d');
        } else {
            setViewMode('2d');
        }
    }, [activeStudy]);

    // Determine initial view mode based on series type
    useEffect(() => {
        if (analysisCaseContext && activeStudy?.selectedSeriesType === '3D Volume') {
            setViewMode('slice'); // Analysis reports use the canonical slice/quad composite pipeline.
        } else if (activeStudy?.selectedSeriesType === '3D Volume') {
            setViewMode('3d'); // 3D First for volumetric series
        } else if (activeStudy?.selectedSeriesType === '2D Image') {
            setViewMode('2d'); // Dedicated 2D viewer for panoramic/ceph
        } else {
            setViewMode('slice'); // Fallback to slice view
        }
    }, [activeStudy?.selectedSeriesType, activeStudy?.selectedSeriesUid, analysisCaseContext]);

    const renderActiveViewer = () => {
        if (viewMode === '3d' && activeStudy?.selectedSeriesType === '3D Volume') {
            return (
                <VolumeViewer3D
                    study={activeStudy}
                    onBack={onBack}
                    onSwitchToSliceMode={() => setViewMode('slice')}
                    onSwitchToLinkedMode={() => setViewMode('linked')}
                    onSwitchSeries={handleSwitchSeries}
                    comparisonPaneId={comparisonPaneId}
                    comparisonSyncEnabled={comparisonSyncEnabled}
                    isFullscreen={isFullscreen}
                    toggleFullscreen={toggleFullscreen}
                    analysisCaseContext={analysisCaseContext}
                    onCaptureForCase={onCaptureForCase}
                />
            );
        }

        if (viewMode === 'linked' && activeStudy?.selectedSeriesType === '3D Volume') {
            return (
                <LinkedViewer
                    study={activeStudy}
                    onBack={onBack}
                    onExit={() => setViewMode('3d')}
                    onSwitchSeries={handleSwitchSeries}
                    isFullscreen={isFullscreen}
                    comparisonPaneId={comparisonPaneId}
                />
            );
        }

        if (viewMode === '2d') {
            const seriesInfo = allSeries.find(s => s.series_uid === activeStudy?.selectedSeriesUid) || {
                series_uid: activeStudy?.selectedSeriesUid,
                series_description: 'Panoramic Image',
                modality: 'OPG',
            };
            return (
                <ImageViewer2D
                    study={activeStudy}
                    seriesInfo={seriesInfo}
                    onBack={onBack}
                    onSwitchSeries={handleSwitchSeries}
                    comparisonPaneId={comparisonPaneId}
                    comparisonSyncEnabled={comparisonSyncEnabled}
                    isFullscreen={isFullscreen}
                    toggleFullscreen={toggleFullscreen}
                    analysisCaseContext={analysisCaseContext}
                    onCaptureForCase={onCaptureForCase}
                />
            );
        }

        return (
            <SliceViewer
                study={activeStudy}
                onBack={onBack}
                onSwitchTo3D={() => setViewMode('3d')}
                onSwitchSeries={handleSwitchSeries}
                comparisonPaneId={comparisonPaneId}
                comparisonSyncEnabled={comparisonSyncEnabled}
                isFullscreen={isFullscreen}
                toggleFullscreen={toggleFullscreen}
                analysisCaseContext={analysisCaseContext}
                onCaptureForCase={onCaptureForCase}
            />
        );
    };

    const isComparison = comparisonPaneId !== null;

    return (
        <div
            ref={parentWrapperRef}
            className={`h-full w-full bg-slate-950 transition-all duration-300 ${
                isComparison
                    ? 'rounded-none border-none shadow-none'
                    : 'rounded-3xl border border-slate-800 shadow-2xl overflow-hidden'
            }`}
        >
            {renderWithStructuredReport(renderActiveViewer())}
        </div>
    );
};

export default Viewer3D;
