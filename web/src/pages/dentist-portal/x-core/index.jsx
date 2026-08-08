import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import AppIcon from '../../../components/AppIcon';
import SideBar from '../ui/SideBar';
import Gallery from './components/Gallery';
import Uploader from './components/Uploader';
import Viewer3D from './components/Viewer3D';
import ComparisonViewer from './components/ComparisonViewer';
import ErrorBoundary from './components/ErrorBoundary';
import { getAccessToken } from '../../../utils/auth/tokenStorage';
import AnalysisCaseWorkspace from '../../../features/x-core-analysis/AnalysisCaseWorkspace';
import { saveAnalysisRender } from '../../../features/x-core-analysis/api';

const XCore = ({
    portal = 'dentist',
    SidebarComponent = SideBar,
    readOnly = false,
    studiesEndpoint = portal === 'clinic' ? '/api/v1/x-core/clinic/studies' : '/api/v1/x-core/studies',
    allowUpload = !readOnly,
}) => {
    const [searchParams] = useSearchParams();
    const requestedStudyId = searchParams.get('studyId');
    const [showUploader, setShowUploader] = useState(false);
    const [activeStudy, setActiveStudy] = useState(null);
    const [comparisonStudies, setComparisonStudies] = useState(null);
    const [studiesCache, setStudiesCache] = useState(null);
    const [showAnalysisCases, setShowAnalysisCases] = useState(false);
    const [analysisContext, setAnalysisContext] = useState(null);
    const showStorageStats = !readOnly;

    const handleStudySelect = (study) => {
        setComparisonStudies(null);
        setActiveStudy(study);
        // Navigate to viewer or show details (Phase 2)
        console.log('Selected study:', study);
    };

    const [storageStats, setStorageStats] = useState({ usage: 0, limit: 10 * 1024 * 1024 * 1024, percent: 0 });

    const fetchStorage = React.useCallback(async () => {
        if (!showStorageStats) return;
        try {
            const token = getAccessToken();
            const response = await fetch('/api/v1/x-core/storage', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                setStorageStats({
                    usage: Number(data.usage),
                    limit: Number(data.limit),
                    percent: data.percent
                });
            }
        } catch (error) {
            console.error("Failed to fetch storage stats", error);
        }
    }, [showStorageStats]);

    React.useEffect(() => {
        fetchStorage();
    }, [fetchStorage]);

    const formatBytes = (bytes) => {
        if (bytes === 0) return '0 GB';
        const gb = bytes / (1024 * 1024 * 1024);
        return `${gb.toFixed(2)} GB`;
    };

    const [refreshTrigger, setRefreshTrigger] = useState(0);

    return (
        <div className="flex h-screen bg-background theme-transition overflow-hidden">
            {/* Sidebar */}
            <div className="flex-shrink-0 z-50 transition-all duration-300 relative" style={{ width: 'var(--sidebar-width, 20rem)' }}>
                <SidebarComponent />
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl shrink-0">
                        <div className="absolute top-0 right-0 p-12 opacity-10">
                            <AppIcon name="Cpu" size={200} />
                        </div>
                        <div className="relative z-10 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md border border-white/20">
                                    <AppIcon name="Cpu" size={32} className="text-accent" />
                                </div>
                                <div>
                                    <h1 className="text-3xl font-bold tracking-tight">X-Core Series</h1>
                                    <p className="text-slate-300">Advanced Imaging & AI Hub</p>
                                </div>
                            </div>

                            <div className="flex gap-6 pt-4">
                                {!readOnly && (
                                    <button
                                        type="button"
                                        onClick={() => setShowAnalysisCases(true)}
                                        className="flex items-center gap-2 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/20"
                                    >
                                        <AppIcon name="Files" size={16} />
                                        Analysis Cases
                                    </button>
                                )}
                                {showStorageStats && (
                                    <div className={`flex items-center gap-2 text-sm px-4 py-2 rounded-lg border transition-colors ${storageStats.percent > 90 ? 'bg-red-500/10 border-red-500/30 text-red-200' : 'bg-white/5 border-white/10 text-slate-300'}`}>
                                        <AppIcon name="HardDrive" size={16} className={storageStats.percent > 90 ? "text-red-400" : "text-emerald-400"} />
                                        <span>Storage: {formatBytes(storageStats.usage)} / {formatBytes(storageStats.limit)} ({storageStats.percent}%)</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-2 text-sm text-slate-300 bg-white/5 px-4 py-2 rounded-lg border border-white/10">
                                    <AppIcon name="Activity" size={16} className="text-accent" />
                                    <span>{readOnly ? 'Clinic Scope: Restricted' : 'AI Engine: Online'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Views */}
                    {comparisonStudies?.length === 2 ? (
                        <div className="h-[calc(100vh-200px)]">
                            <ErrorBoundary onCleanup={() => { window.__volumeCache?.clear?.(); }}>
                                <ComparisonViewer studies={comparisonStudies} onExit={() => setComparisonStudies(null)} />
                            </ErrorBoundary>
                        </div>
                    ) : !activeStudy ? (
                        <ErrorBoundary>
                            <Gallery
                                onSelectStudy={handleStudySelect}
                                onUploadClick={() => {
                                    if (allowUpload) setShowUploader(true);
                                }}
                                refreshTrigger={refreshTrigger}
                                onStudyDeleted={() => {
                                    setStudiesCache(null);
                                    setRefreshTrigger(prev => prev + 1);
                                    fetchStorage();
                                }}
                                cachedStudies={studiesCache}
                                onStudiesLoaded={setStudiesCache}
                                initialStudyId={requestedStudyId}
                                studiesEndpoint={studiesEndpoint}
                                readOnly={readOnly}
                                allowUpload={allowUpload}
                                allowDelete={!readOnly}
                                allowShare={!readOnly}
                                onCompareSelected={(studies) => {
                                    setActiveStudy(null);
                                    setComparisonStudies(studies);
                                }}
                            />
                        </ErrorBoundary>
                    ) : (
                        <div className="h-[calc(100vh-200px)]">
                            <ErrorBoundary onCleanup={() => { window.__volumeCache?.clear?.(); }}>
                                <Viewer3D
                                    study={activeStudy}
                                    onBack={() => {
                                        setActiveStudy(null);
                                        if (analysisContext) setShowAnalysisCases(true);
                                    }}
                                    analysisCaseContext={analysisContext}
                                    onCaptureForCase={analysisContext ? async (renders) => {
                                        const render = await saveAnalysisRender(analysisContext.caseId, analysisContext.itemId, renders);
                                        setAnalysisContext((current) => ({ ...current, render }));
                                        return render;
                                    } : null}
                                />
                            </ErrorBoundary>
                        </div>
                    )}
                </div>
            </div>

            {/* Uploader Modal */}
            {showUploader && allowUpload && (
                <Uploader
                    onClose={() => setShowUploader(false)}
                    onUploadComplete={() => {
                        setStudiesCache(null);
                        setRefreshTrigger(prev => prev + 1);
                        fetchStorage();
                    }}
                />
            )}
            {showAnalysisCases && !readOnly && (
                <AnalysisCaseWorkspace
                    studies={studiesCache || []}
                    studiesEndpoint={studiesEndpoint}
                    onClose={() => setShowAnalysisCases(false)}
                    onOpenItem={(analysisCase, item, study) => {
                        if (!study) return;
                        setAnalysisContext({
                            caseId: analysisCase.id,
                            itemId: item.id,
                            label: item.title || item.radiograph_type,
                            structuredFindings: item.structured_findings || [],
                            renderStatus: item.render_status || null,
                            viewerType: item.viewer_type,
                            sopInstanceUid: item.sop_instance_uid,
                            instanceNumber: item.instance_number,
                            frameIndex: item.frame_index,
                            imageIndex: item.image_index,
                            sourceInstanceKey: item.source_instance_key,
                        });
                        setShowAnalysisCases(false);
                        setActiveStudy({
                            ...study,
                            selectedSeriesUid: item.series_uid,
                            selectedSeriesType: item.viewer_type === '2d' ? '2D Image' : '3D Volume',
                        });
                    }}
                />
            )}
        </div>
    );
};

export default XCore;
