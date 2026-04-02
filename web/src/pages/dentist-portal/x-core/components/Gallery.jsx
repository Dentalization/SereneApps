import React, { useState, useRef, useEffect } from 'react';
import AppIcon from '../../../../components/AppIcon';
import { getAccessToken } from '../../../../utils/auth/tokenStorage';
import { PY_API_BASE } from '../../../../config/api';

async function batchFetch(items, asyncFn, concurrency = 5) {
    const results = [];
    for (let i = 0; i < items.length; i += concurrency) {
        const chunk = items.slice(i, i + concurrency);
        const chunkResults = await Promise.allSettled(chunk.map(asyncFn));
        results.push(...chunkResults);
    }
    return results;
}

const SERIES_LOAD_STATE = {
    READY: 'ready',
    ORPHAN: 'orphan',
    SERVICE_ERROR: 'service-error'
};

const IMAGING_SERVICE_OFFLINE_MESSAGE = 'Cannot connect to the imaging service. Start the X-Core Python service and retry.';

function getStudyKey(study) {
    return study.folderName || study.id;
}

function getSeriesLoadErrorMessage(error) {
    const message = error?.message || '';
    if (
        error?.name === 'TypeError' ||
        message === 'Failed to fetch' ||
        message === 'Load failed' ||
        message.includes('NetworkError')
    ) {
        return IMAGING_SERVICE_OFFLINE_MESSAGE;
    }
    return message || IMAGING_SERVICE_OFFLINE_MESSAGE;
}

function normalizeStudySeriesState(study) {
    if (!study) return study;

    const series = study.series || [];
    const totalSeries = study.totalSeries ?? series.length;

    if (study.seriesLoadState) {
        return {
            ...study,
            series,
            totalSeries,
            seriesLoadError: study.seriesLoadError || null
        };
    }

    if (series.length > 0) {
        return {
            ...study,
            series,
            totalSeries,
            seriesLoadState: SERIES_LOAD_STATE.READY,
            seriesLoadError: null
        };
    }

    // Cached studies from older sessions may not have a load-state yet.
    // Default to service-error so failed fetches never masquerade as orphans.
    return {
        ...study,
        series,
        totalSeries,
        seriesLoadState: SERIES_LOAD_STATE.SERVICE_ERROR,
        seriesLoadError: study.seriesLoadError || IMAGING_SERVICE_OFFLINE_MESSAGE
    };
}

async function fetchStudySeries(study) {
    const studyKey = getStudyKey(study);

    console.log('[Gallery] Fetching series for study:', {
        id: study.id,
        folderName: study.folderName,
        originalName: study.originalName,
        patientName: study.patientName,
        studyKey
    });

    try {
        const response = await fetch(`${PY_API_BASE}/gallery/${studyKey}`);

        if (response.ok) {
            const data = await response.json();
            const series = data.series || [];

            return normalizeStudySeriesState({
                ...study,
                series,
                totalSeries: data.total_series || series.length,
                seriesLoadState: series.length > 0 ? SERIES_LOAD_STATE.READY : SERIES_LOAD_STATE.ORPHAN,
                seriesLoadError: series.length > 0 ? null : 'No scan files found on disk.'
            });
        }

        let payload = null;
        try {
            payload = await response.json();
        } catch (_) {
            payload = null;
        }

        if (response.status === 404) {
            return normalizeStudySeriesState({
                ...study,
                series: [],
                totalSeries: 0,
                seriesLoadState: SERIES_LOAD_STATE.ORPHAN,
                seriesLoadError: 'Study folder not found on disk.'
            });
        }

        return normalizeStudySeriesState({
            ...study,
            series: [],
            totalSeries: 0,
            seriesLoadState: SERIES_LOAD_STATE.SERVICE_ERROR,
            seriesLoadError: payload?.detail || payload?.error || `Imaging service returned ${response.status}.`
        });
    } catch (error) {
        return normalizeStudySeriesState({
            ...study,
            series: [],
            totalSeries: 0,
            seriesLoadState: SERIES_LOAD_STATE.SERVICE_ERROR,
            seriesLoadError: getSeriesLoadErrorMessage(error)
        });
    }
}

function shouldRevalidateCachedStudies(cachedStudies) {
    return cachedStudies.some((study) => {
        if (!study?.seriesLoadState) return true;
        return study.seriesLoadState !== SERIES_LOAD_STATE.READY;
    });
}

const Gallery = ({ onSelectStudy, onUploadClick, refreshTrigger, onStudyDeleted, cachedStudies, onStudiesLoaded }) => {
    const [viewMode, setViewMode] = useState('grid');
    const [searchQuery, setSearchQuery] = useState('');
    const [studies, setStudies] = useState([]);
    const [studiesWithSeries, setStudiesWithSeries] = useState([]); // Studies with expanded series cards
    const [loading, setLoading] = useState(true);
    const [fetchingSeries, setFetchingSeries] = useState(false);
    const [error, setError] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const scrollRef = useRef(null);

    useEffect(() => {
        return () => {
            if (scrollRef.current) {
                sessionStorage.setItem('gallery-scroll', scrollRef.current.scrollTop);
            }
        };
    }, []);

    // Fetch Studies from Backend
    const restoreScrollPosition = () => {
        setTimeout(() => {
            if (scrollRef.current) {
                scrollRef.current.scrollTo(0, parseInt(sessionStorage.getItem('gallery-scroll') || '0', 10));
            }
        }, 0);
    };

    const fetchSeriesForStudies = async (studies, options = {}) => {
        const { showSpinner = true } = options;
        if (showSpinner) setFetchingSeries(true);
        const results = await batchFetch(studies, fetchStudySeries);
        const studiesWithSeriesData = results.map((r, i) =>
            r.status === 'fulfilled'
                ? normalizeStudySeriesState(r.value)
                : normalizeStudySeriesState({
                    ...studies[i],
                    series: [],
                    totalSeries: 0,
                    seriesLoadState: SERIES_LOAD_STATE.SERVICE_ERROR,
                    seriesLoadError: IMAGING_SERVICE_OFFLINE_MESSAGE
                })
        );
        setStudiesWithSeries(studiesWithSeriesData);
        if (onStudiesLoaded) onStudiesLoaded(studiesWithSeriesData);
        if (showSpinner) setFetchingSeries(false);
        restoreScrollPosition();
        return studiesWithSeriesData;
    };

    const handleRetrySeriesLoad = async () => {
        const sourceStudies = studies.length > 0
            ? studies
            : (studiesRef.current.length > 0 ? studiesRef.current : []);

        if (sourceStudies.length === 0) return;
        await fetchSeriesForStudies(sourceStudies);
    };

    React.useEffect(() => {
        const fetchStudies = async () => {
            if (cachedStudies) {
                const normalizedCache = cachedStudies.map(normalizeStudySeriesState);
                setStudies(normalizedCache);
                setStudiesWithSeries(normalizedCache);
                setLoading(false);
                restoreScrollPosition();

                if (shouldRevalidateCachedStudies(normalizedCache)) {
                    fetchSeriesForStudies(normalizedCache, { showSpinner: false }).catch((err) => {
                        console.error('[Gallery] Background revalidation failed:', err);
                    });
                }
                return;
            }
            setLoading(true);
            try {
                const token = getAccessToken();
                const response = await fetch('/api/v1/x-core/studies', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    throw new Error(`Something went wrong on our end. Please try again in a few minutes.`);
                }

                const text = await response.text();
                try {
                    const data = JSON.parse(text);
                    const formattedStudies = data.map(study => ({
                        ...study, // Preserve original fields
                        // View-specific fields
                        // Logic: Use DICOM Patient Name -> Original Folder Name -> Patient Name (DB)
                        patientName: study.metadata?.PatientName
                            ? study.metadata.PatientName.replace(/\^/g, ' ').trim()
                            : (study.originalName && study.originalName !== study.folderName && study.originalName !== 'Upload'
                                ? study.originalName
                                : (study.patient?.name || 'Unknown')),

                        realPatientId: study.patientId, // Keep for reference
                        // Handle numeric IDs gracefully, maybe show DICOM ID if available
                        patientIdDisplay: study.metadata?.PatientID || `P-${study.patientId}`,

                        originalName: study.originalName || study.folderName || 'Unknown',
                        dateDisplay: study.studyDate ? new Date(study.studyDate).toISOString().split('T')[0] : 'N/A',
                        statusDisplay: (study.status || 'Unknown').charAt(0).toUpperCase() + (study.status || 'unknown').slice(1)
                    }));
                    setStudies(formattedStudies);

                    // Fetch series information for each study
                    await fetchSeriesForStudies(formattedStudies);
                } catch (e) {
                    throw new Error(`Failed to parse studies data. Please try refreshing the page.`);
                }

            } catch (error) {
                console.error("[Gallery] Failed to fetch studies:", error.message);
                setError(error.message);
            } finally {
                setLoading(false);
            }
        };
        fetchStudies();
    }, [refreshTrigger]);

    // Keep a ref to current studies so polling doesn't cause infinite re-renders
    const studiesRef = useRef(studiesWithSeries);
    useEffect(() => {
        studiesRef.current = studiesWithSeries;
    }, [studiesWithSeries]);

    // Auto-refresh while any series is still converting
    useEffect(() => {
        const hasConverting = studiesWithSeries.some(study =>
            (study.series || []).some(s => s.status === 'converting' || s.status === 'pending')
        );

        if (!hasConverting) return;

        const interval = setInterval(async () => {
            const current = studiesRef.current;
            const updated = await Promise.all(
                current.map(async (study) => {
                    const hasIncomplete = (study.series || []).some(
                        s => s.status === 'converting' || s.status === 'pending'
                    );
                    if (!hasIncomplete) return study;

                    return fetchStudySeries(study);
                })
            );

            setStudiesWithSeries(updated);
            if (onStudiesLoaded) onStudiesLoaded(updated);
        }, 4000);

        return () => clearInterval(interval);
    }, [studiesWithSeries.map(s => s.id + (s.series || []).map(x => x.status).join('')).join(',')]);
    // ↑ Only restart the interval when study IDs or statuses actually change

    const filteredStudies = studiesWithSeries.filter(s =>
        s.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.patientIdDisplay.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const serviceErrorStudies = filteredStudies.filter(study => study.seriesLoadState === SERIES_LOAD_STATE.SERVICE_ERROR);
    const orphanStudies = filteredStudies.filter(study => study.seriesLoadState === SERIES_LOAD_STATE.ORPHAN);
    const healthyStudies = filteredStudies.filter(
        study => study.seriesLoadState === SERIES_LOAD_STATE.READY && study.series && study.series.length > 0
    );

    // Flatten to series cards for gallery display (Smart Series Grouping)
    const seriesCards = healthyStudies.flatMap(study =>
        (study.series || []).map(series => ({
            ...series,
            study: study,
            // Use series info to build card
            id: `${study.id}-${series.series_uid}`,
            patientName: study.patientName,
            patientIdDisplay: study.patientIdDisplay,
            dateDisplay: study.dateDisplay,
            statusDisplay: study.statusDisplay,
            thumbnailUrl: `${PY_API_BASE}/thumbnail/${study.folderName || study.id}/${series.series_uid}`
        }))
    );

    const emptyState = (() => {
        if (serviceErrorStudies.length > 0) {
            return {
                icon: 'AlertCircle',
                title: 'Study previews unavailable',
                description: 'We found study records, but the imaging service could not load them. Start the X-Core Python service and retry.'
            };
        }

        if (orphanStudies.length > 0) {
            return {
                icon: 'FileWarning',
                title: 'No viewable studies available',
                description: 'Only orphan study records matched this view. Delete them to free storage or upload a new study.'
            };
        }

        if (searchQuery) {
            return {
                icon: 'SearchX',
                title: 'No matching results',
                description: `We couldn't find any studies matching "${searchQuery}". Try adjusting your filters.`
            };
        }

        return {
            icon: 'FolderOpen',
            title: 'No studies found',
            description: 'Get started by uploading a patient\'s DICOM study or J. Morita dataset folder to the secure X-Core storage.'
        };
    })();

    const handleDelete = async (study) => {
        try {
            const token = getAccessToken();
            const response = await fetch(`/api/v1/x-core/studies/${study.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                // Immediately remove from local state for instant UI feedback
                setStudiesWithSeries(prev => prev.filter(s => s.id !== study.id));
                if (onStudyDeleted) onStudyDeleted();
            } else {
                const data = await response.json().catch(() => ({}));
                const msg = data.error || `Server returned ${response.status}`;
                console.error("[Gallery] Delete failed:", msg);
                alert(`Failed to delete study: ${msg}`);
            }
        } catch (error) {
            console.error("Delete failed", error);
            alert("Failed to delete study. Please check your connection.");
        }
    };

    return (
        <div className="space-y-6" ref={scrollRef}>
            {/* Header Actions */}
            <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                    <AppIcon name="Search" size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                    <input
                        type="text"
                        placeholder="Search details..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-primary/20 bg-surface focus:ring-2 focus:ring-accent outline-none"
                    />
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`p-2 rounded-lg border ${viewMode === 'grid' ? 'bg-accent/10 border-accent text-accent' : 'border-primary/20 text-muted'}`}
                    >
                        <AppIcon name="LayoutGrid" size={20} />
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`p-2 rounded-lg border ${viewMode === 'list' ? 'bg-accent/10 border-accent text-accent' : 'border-primary/20 text-muted'}`}
                    >
                        <AppIcon name="List" size={20} />
                    </button>
                    <button
                        onClick={onUploadClick}
                        className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-xl hover:bg-accent-hover transition shadow-sm"
                    >
                        <AppIcon name="UploadCloud" size={20} />
                        <span>New Scan</span>
                    </button>
                </div>
            </div>

            {/* Grid View */}
            {loading || fetchingSeries ? (
                <div className="flex justify-center py-20">
                    <div className="flex flex-col items-center gap-4 text-muted">
                        <AppIcon name="Loader2" size={40} className="animate-spin text-accent" />
                        <p>{fetchingSeries ? "Analyzing metadata..." : "Loading studies..."}</p>
                    </div>
                </div>
            ) : error ? (
                <div className="flex justify-center py-20">
                    <div className="flex flex-col items-center gap-4 text-red-500 bg-red-50 p-6 rounded-xl border border-red-100">
                        <AppIcon name="AlertCircle" size={40} />
                        <p className="font-medium">Failed to load studies</p>
                        <p className="text-sm opacity-80 max-w-md text-center">{error}</p>
                        <button
                            onClick={handleRetrySeriesLoad}
                            className="text-xs underline hover:text-red-700 mt-2"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    {serviceErrorStudies.length > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
                            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                                <div className="flex items-center gap-2">
                                    <AppIcon name="AlertCircle" size={18} className="text-red-500" />
                                    <span className="font-semibold text-red-700 text-sm">
                                        {serviceErrorStudies.length} study {serviceErrorStudies.length === 1 ? 'preview' : 'previews'} unavailable
                                    </span>
                                    <span className="text-xs text-red-500">— The imaging service could not be reached or returned an error.</span>
                                </div>
                                <button
                                    onClick={handleRetrySeriesLoad}
                                    className="text-xs font-medium text-red-600 underline hover:text-red-700"
                                >
                                    Retry
                                </button>
                            </div>
                            <div className="space-y-2">
                                {serviceErrorStudies.map(study => (
                                    <div key={study.id} className="bg-white rounded-lg px-4 py-3 border border-red-100">
                                        <div className="flex items-start gap-3">
                                            <AppIcon name="AlertCircle" size={16} className="text-red-400 mt-0.5" />
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                                    <span className="text-sm font-medium text-primary">{study.patientName}</span>
                                                    <span className="text-xs text-secondary">{study.patientIdDisplay}</span>
                                                    <span className="text-xs text-red-500">({study.folderName})</span>
                                                </div>
                                                <p className="text-xs text-red-500 mt-1">{study.seriesLoadError || IMAGING_SERVICE_OFFLINE_MESSAGE}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Orphan Studies Warning — DB records with missing files */}
                    {orphanStudies.length > 0 && (
                        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <AppIcon name="AlertTriangle" size={18} className="text-amber-500" />
                                <span className="font-semibold text-amber-700 text-sm">
                                    {orphanStudies.length} orphan {orphanStudies.length === 1 ? 'study' : 'studies'} found
                                </span>
                                <span className="text-xs text-amber-500">— No scan files found on disk. Delete record to free storage.</span>
                            </div>
                            <div className="space-y-2">
                                {orphanStudies.map(study => (
                                    <div key={study.id} className="flex items-center justify-between bg-white rounded-lg px-4 py-2 border border-amber-100">
                                        <div className="flex items-center gap-3">
                                            <AppIcon name="FileWarning" size={16} className="text-amber-400" />
                                            <div>
                                                <span className="text-sm font-medium text-primary">{study.patientName}</span>
                                                <span className="text-xs text-secondary ml-2">{study.patientIdDisplay}</span>
                                                <span className="text-xs text-amber-500 ml-2">({study.folderName})</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setDeleteTarget(study); }}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-medium transition"
                                        >
                                            <AppIcon name="Trash2" size={14} />
                                            Delete Record
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {viewMode === 'grid' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {seriesCards.length === 0 ? (
                                <div className="col-span-full flex flex-col items-center justify-center py-24 px-4 text-center rounded-3xl border-2 border-dashed border-primary/10 bg-surface/50">
                                    <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mb-6 ring-8 ring-accent/5">
                                        <AppIcon name={emptyState.icon} size={40} className="text-accent" />
                                    </div>
                                    <h3 className="text-xl font-semibold text-primary mb-2">
                                        {emptyState.title}
                                    </h3>
                                    <p className="text-secondary max-w-sm mb-8 text-sm leading-relaxed">
                                        {emptyState.description}
                                    </p>
                                    {!searchQuery && (
                                        <button
                                            onClick={onUploadClick}
                                            className="flex items-center gap-2 px-6 py-3 bg-accent text-white rounded-xl hover:bg-accent-hover transition shadow-lg shadow-accent/20 hover:shadow-accent/40 hover:-translate-y-0.5"
                                        >
                                            <AppIcon name="UploadCloud" size={20} />
                                            <span>Upload First Study</span>
                                        </button>
                                    )}
                                </div>
                            ) : seriesCards.map(card => {
                                const isReady = card.status === 'ready';
                                const isConverting = card.status === 'converting' || card.status === 'pending';

                                return (
                                    <div
                                        key={card.id}
                                        onClick={() => isReady && onSelectStudy({
                                            ...card.study,
                                            selectedSeriesUid: card.series_uid,
                                            selectedSeriesType: card.type
                                        })}
                                        className={`group relative bg-surface-elevated rounded-2xl border border-primary/10 overflow-hidden transition ${isReady
                                            ? 'hover:shadow-theme-lg cursor-pointer'
                                            : 'opacity-75 cursor-not-allowed'
                                            }`}
                                    >
                                        {/* Series Thumbnail */}
                                        <div className="aspect-video bg-gray-900 flex items-center justify-center relative overflow-hidden">
                                            {isReady ? (
                                                <>
                                                    <img
                                                        src={card.thumbnailUrl}
                                                        alt={card.title}
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => {
                                                            e.target.style.display = 'none';
                                                            e.target.nextSibling.style.display = 'flex';
                                                        }}
                                                    />
                                                    <div className="absolute inset-0 items-center justify-center hidden">
                                                        <AppIcon name={card.type === '3D Volume' ? 'Box' : 'Image'} size={48} className="text-gray-700" />
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                                    <div className="flex flex-col items-center gap-2">
                                                        <AppIcon name="Loader2" size={24} className="text-accent animate-spin" />
                                                        <span className="text-xs text-white font-medium">
                                                            {card.status === 'converting' ? 'Processing...' : 'Queued'}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Type Badge */}
                                            <span className="absolute top-2 left-2 px-2 py-1 bg-black/70 text-white text-xs rounded-md backdrop-blur-sm flex items-center gap-1">
                                                <AppIcon name={card.type === '3D Volume' ? 'Box' : 'Image'} size={12} />
                                                {card.type}
                                            </span>

                                            {/* Modality Badge */}
                                            <span className="absolute top-2 right-2 px-2 py-1 bg-black/50 text-white text-xs rounded-md backdrop-blur-sm">
                                                {card.modality}
                                            </span>

                                            {card.num_slices > 1 && (
                                                <span className="absolute bottom-2 right-2 px-2 py-1 bg-cyan-500/80 text-white text-xs rounded-md backdrop-blur-sm font-medium">
                                                    {card.num_slices} slices
                                                </span>
                                            )}
                                        </div>

                                        <div className="p-4 space-y-2">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h3 className="font-semibold text-primary">{card.patientName}</h3>
                                                    <p className="text-xs text-cyan-500 font-medium">{card.title}</p>
                                                    <p className="text-xs text-secondary">{card.patientIdDisplay}</p>
                                                </div>
                                                {isReady && (
                                                    <AppIcon name="ChevronRight" size={16} className="text-muted group-hover:text-accent transition-transform group-hover:translate-x-1" />
                                                )}
                                            </div>
                                            <div className="pt-2 border-t border-primary/10 flex justify-between items-center text-xs text-secondary">
                                                <span>{card.dateDisplay}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className={
                                                        isConverting
                                                            ? 'text-blue-500 font-medium'
                                                            : card.statusDisplay === 'Analyzed'
                                                                ? 'text-emerald-500 font-medium'
                                                                : 'text-amber-500'
                                                    }>
                                                        {isConverting ? 'Processing' : card.statusDisplay}
                                                    </span>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(card.study); }}
                                                        className="p-1 hover:bg-red-50 hover:text-red-500 rounded transition text-muted"
                                                        title="Delete Study"
                                                    >
                                                        <AppIcon name="Trash2" size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : seriesCards.length === 0 ? (
                        <div className="bg-surface-elevated rounded-2xl border border-primary/10 px-6 py-16 text-center">
                            <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AppIcon name={emptyState.icon} size={28} className="text-accent" />
                            </div>
                            <h3 className="text-lg font-semibold text-primary mb-2">{emptyState.title}</h3>
                            <p className="text-sm text-secondary max-w-md mx-auto">{emptyState.description}</p>
                        </div>
                    ) : (
                        <div className="bg-surface-elevated rounded-2xl border border-primary/10 overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-surface border-b border-primary/10">
                                    <tr>
                                        <th className="px-6 py-4 font-medium text-secondary">Status</th>
                                        <th className="px-6 py-4 font-medium text-secondary">Patient</th>
                                        <th className="px-6 py-4 font-medium text-secondary">Series</th>
                                        <th className="px-6 py-4 font-medium text-secondary">Type</th>
                                        <th className="px-6 py-4 font-medium text-secondary">Modality</th>
                                        <th className="px-6 py-4 font-medium text-secondary">Slices</th>
                                        <th className="px-6 py-4 font-medium text-secondary">Date</th>
                                        <th className="px-6 py-4 font-medium text-secondary">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-primary/5">
                                    {seriesCards.map(card => (
                                        <tr key={card.id} className="hover:bg-primary/5 transition">
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${card.statusDisplay === 'Analyzed' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                                                    }`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${card.statusDisplay === 'Analyzed' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></span>
                                                    {card.statusDisplay}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-medium text-primary">{card.patientName}</td>
                                            <td className="px-6 py-4 text-cyan-600 font-medium text-xs">{card.title}</td>
                                            <td className="px-6 py-4">
                                                <span className="flex items-center gap-1 text-xs">
                                                    <AppIcon name={card.type === '3D Volume' ? 'Box' : 'Image'} size={14} className="text-accent" />
                                                    {card.type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="px-2 py-1 rounded bg-secondary/10 text-secondary text-xs">{card.modality}</span>
                                            </td>
                                            <td className="px-6 py-4 text-secondary">{card.num_slices}</td>
                                            <td className="px-6 py-4 text-secondary">{card.dateDisplay}</td>
                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => onSelectStudy({
                                                        ...card.study,
                                                        selectedSeriesUid: card.series_uid,
                                                        selectedSeriesType: card.type
                                                    })}
                                                    className="p-1.5 hover:bg-accent/10 rounded text-accent transition"
                                                >
                                                    <AppIcon name="ExternalLink" size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteTarget !== null && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteTarget(null)}>
                    <div className="bg-white rounded-3xl border border-primary/10 shadow-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Study</h3>
                        <p className="text-gray-600 mb-6 font-medium">
                            Are you sure you want to delete {deleteTarget.patientName}'s study? This action cannot be undone.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setDeleteTarget(null)}
                                className="px-5 py-2.5 rounded-xl font-semibold text-gray-700 hover:bg-gray-100 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    handleDelete(deleteTarget);
                                    setDeleteTarget(null);
                                }}
                                className="px-5 py-2.5 rounded-xl font-semibold bg-red-600 text-white hover:bg-red-700 shadow-sm shadow-red-500/20 transition"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Gallery;
