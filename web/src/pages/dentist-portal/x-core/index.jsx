import React, { useState } from 'react';
import AppIcon from '../../../components/AppIcon';
import SideBar from '../ui/SideBar';
import Gallery from './components/Gallery';
import Uploader from './components/Uploader';
import Viewer3D from './components/Viewer3D';
import ComparisonViewer from './components/ComparisonViewer';
import ErrorBoundary from './components/ErrorBoundary';
import { getAccessToken } from '../../../utils/auth/tokenStorage';

const XCore = () => {
    const [showUploader, setShowUploader] = useState(false);
    const [activeStudy, setActiveStudy] = useState(null);
    const [comparisonStudies, setComparisonStudies] = useState(null);
    const [studiesCache, setStudiesCache] = useState(null);

    const handleStudySelect = (study) => {
        setComparisonStudies(null);
        setActiveStudy(study);
        // Navigate to viewer or show details (Phase 2)
        console.log('Selected study:', study);
    };

    const [storageStats, setStorageStats] = useState({ usage: 0, limit: 10 * 1024 * 1024 * 1024, percent: 0 });

    const fetchStorage = React.useCallback(async () => {
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
    }, []);

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
                <SideBar />
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
                                <div className={`flex items-center gap-2 text-sm px-4 py-2 rounded-lg border transition-colors ${storageStats.percent > 90 ? 'bg-red-500/10 border-red-500/30 text-red-200' : 'bg-white/5 border-white/10 text-slate-300'}`}>
                                    <AppIcon name="HardDrive" size={16} className={storageStats.percent > 90 ? "text-red-400" : "text-emerald-400"} />
                                    <span>Storage: {formatBytes(storageStats.usage)} / {formatBytes(storageStats.limit)} ({storageStats.percent}%)</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-slate-300 bg-white/5 px-4 py-2 rounded-lg border border-white/10">
                                    <AppIcon name="Activity" size={16} className="text-accent" />
                                    <span>AI Engine: Online</span>
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
                                onUploadClick={() => setShowUploader(true)}
                                refreshTrigger={refreshTrigger}
                                onStudyDeleted={() => {
                                    setStudiesCache(null);
                                    setRefreshTrigger(prev => prev + 1);
                                    fetchStorage();
                                }}
                                cachedStudies={studiesCache}
                                onStudiesLoaded={setStudiesCache}
                                onCompareSelected={(studies) => {
                                    setActiveStudy(null);
                                    setComparisonStudies(studies);
                                }}
                            />
                        </ErrorBoundary>
                    ) : (
                        <div className="h-[calc(100vh-200px)]">
                            <ErrorBoundary onCleanup={() => { window.__volumeCache?.clear?.(); }}>
                                <Viewer3D study={activeStudy} onBack={() => setActiveStudy(null)} />
                            </ErrorBoundary>
                        </div>
                    )}
                </div>
            </div>

            {/* Uploader Modal */}
            {showUploader && (
                <Uploader
                    onClose={() => setShowUploader(false)}
                    onUploadComplete={() => {
                        setStudiesCache(null);
                        setRefreshTrigger(prev => prev + 1);
                        fetchStorage();
                    }}
                />
            )}
        </div>
    );
};

export default XCore;
