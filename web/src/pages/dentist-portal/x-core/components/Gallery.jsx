import React, { useState, useRef, useEffect, useMemo } from 'react';
import AppIcon from '../../../../components/AppIcon';
import { getAccessToken } from '../../../../utils/auth/tokenStorage';
import { PY_API_BASE } from '../../../../config/api';
import useConversionSocket from '../hooks/useConversionSocket';
import { buildImagingUrl, buildStudyAssetParams } from '../utils/imagingUrl';

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
        scanning: study.scanning || false,
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
                scanning: data.scanning || false,
                seriesLoadState: data.scanning ? SERIES_LOAD_STATE.READY : (series.length > 0 ? SERIES_LOAD_STATE.READY : SERIES_LOAD_STATE.ORPHAN),
                seriesLoadError: series.length > 0 || data.scanning ? null : 'No scan files found on disk.'
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

function hasIncompleteSeries(study) {
    return (study?.series || []).some(
        (series) => series.status === 'converting' || series.status === 'pending'
    );
}

const Gallery = ({ onSelectStudy, onUploadClick, refreshTrigger, onStudyDeleted, cachedStudies, onStudiesLoaded, onCompareSelected }) => {
    const [viewMode, setViewMode] = useState('grid');
    const [searchQuery, setSearchQuery] = useState('');
    const [studies, setStudies] = useState([]);
    const [studiesWithSeries, setStudiesWithSeries] = useState([]); // Studies with expanded series cards
    const [loading, setLoading] = useState(true);
    const [fetchingSeries, setFetchingSeries] = useState(false);
    const [error, setError] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [shareTarget, setShareTarget] = useState(null);
    const [shareExpiryHours, setShareExpiryHours] = useState(48);
    const [shareLoading, setShareLoading] = useState(false);
    const [shareError, setShareError] = useState(null);
    const [shareResult, setShareResult] = useState(null);
    const [compareMode, setCompareMode] = useState(false);
    const [selectedCompareIds, setSelectedCompareIds] = useState([]);
    const scrollRef = useRef(null);
    const onStudiesLoadedRef = useRef(onStudiesLoaded);
    const { latestEvent, connectionStatus } = useConversionSocket();

    useEffect(() => {
        onStudiesLoadedRef.current = onStudiesLoaded;
    }, [onStudiesLoaded]);

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

    useEffect(() => {
        if (!latestEvent?.studyId) return;

        let shouldRefreshStudy = false;
        setStudiesWithSeries((currentStudies) => {
            const nextStudies = currentStudies.map((study) => {
                if (String(getStudyKey(study)) !== String(latestEvent.studyId)) return study;

                if (latestEvent.status === 'complete') {
                    shouldRefreshStudy = true;
                    return study;
                }

                const nextSeries = (study.series || []).map((series) => {
                    if (latestEvent.seriesUid && series.series_uid !== latestEvent.seriesUid) {
                        return series;
                    }

                    if (latestEvent.status === 'started') {
                        return series.status === 'ready' ? series : { ...series, status: 'converting' };
                    }

                    if (latestEvent.status === 'processing') {
                        return { ...series, status: 'converting', conversionStage: latestEvent.stage, conversionProgress: latestEvent.progress };
                    }

                    if (latestEvent.status === 'ready') {
                        return { ...series, status: 'ready', has_vti: true, conversionStage: null, conversionProgress: 100 };
                    }

                    return series;
                });

                return { ...study, series: nextSeries };
            });

            if (onStudiesLoadedRef.current) onStudiesLoadedRef.current(nextStudies);
            return nextStudies;
        });

        if (shouldRefreshStudy) {
            const matchingStudy = studiesRef.current.find((study) => String(getStudyKey(study)) === String(latestEvent.studyId));
            if (matchingStudy) {
                fetchStudySeries(matchingStudy).then((updatedStudy) => {
                    setStudiesWithSeries((currentStudies) => {
                        const nextStudies = currentStudies.map((study) =>
                            String(getStudyKey(study)) === String(latestEvent.studyId) ? updatedStudy : study
                        );
                        if (onStudiesLoadedRef.current) onStudiesLoadedRef.current(nextStudies);
                        return nextStudies;
                    });
                }).catch((error) => console.error('[Gallery] WebSocket completion refresh failed:', error));
            }
        }
    }, [latestEvent]);

    const fallbackPollingKey = useMemo(() => (
        studiesWithSeries
            .map((study) => `${getStudyKey(study)}:${(study.series || []).map((series) => `${series.series_uid}:${series.status}`).join(',')}`)
            .join('|')
    ), [studiesWithSeries]);

    // Fallback polling while disconnected from the live conversion socket.
    useEffect(() => {
        if (connectionStatus === 'connected') return undefined;
        const hasConverting = studiesRef.current.some(hasIncompleteSeries);

        if (!hasConverting) return undefined;

        const interval = setInterval(async () => {
            const current = studiesRef.current;
            if (!current.some(hasIncompleteSeries)) {
                clearInterval(interval);
                return;
            }

            const updated = await Promise.all(
                current.map(async (study) => {
                    if (!hasIncompleteSeries(study)) return study;

                    return fetchStudySeries(study);
                })
            );

            setStudiesWithSeries(updated);
            if (onStudiesLoadedRef.current) onStudiesLoadedRef.current(updated);

            if (!updated.some(hasIncompleteSeries)) {
                clearInterval(interval);
            }
        }, 10000);

        return () => clearInterval(interval);
    }, [connectionStatus, fallbackPollingKey]);

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
        (study.series || []).map(series => {
            const thumbnailPath = series.thumbnail_url || `/thumbnail/${study.folderName || study.id}/${series.series_uid}`;
            return {
                ...series,
                study: study,
                // Use series info to build card
                id: `${study.id}-${series.series_uid}`,
                patientName: study.patientName,
                patientIdDisplay: study.patientIdDisplay,
                dateDisplay: study.dateDisplay,
                statusDisplay: study.statusDisplay,
                thumbnailUrl: buildImagingUrl(thumbnailPath, buildStudyAssetParams(study))
            };
        })
    );

    const readyVtiPrefetchKey = useMemo(() => (
        seriesCards
            .filter((card) => card.status === 'ready' && card.type === '3D Volume')
            .map((card) => `${getStudyKey(card.study)}:${card.series_uid}`)
            .join('|')
    ), [seriesCards]);

    useEffect(() => {
        const readyCards = seriesCards.filter((card) => card.status === 'ready' && card.type === '3D Volume');
        readyCards.slice(0, 8).forEach((card) => {
            const vtiUrl = buildImagingUrl(
                `/volume/${getStudyKey(card.study)}`,
                buildStudyAssetParams(card.study, { series_uid: card.series_uid })
            );
            fetch(vtiUrl, { method: 'HEAD' }).catch(() => {});
        });
    }, [readyVtiPrefetchKey]);

    const selectedCompareCards = seriesCards.filter((card) => selectedCompareIds.includes(card.id));
    const buildStudyFromCard = (card) => ({
        ...card.study,
        selectedSeriesUid: card.series_uid,
        selectedSeriesType: card.type,
        comparisonTitle: card.title,
        comparisonPatientName: card.patientName,
    });
    const toggleCompareSelection = (card) => {
        if (card.status !== 'ready') return;
        setSelectedCompareIds((current) => {
            if (current.includes(card.id)) {
                return current.filter((id) => id !== card.id);
            }
            if (current.length >= 2) {
                return [current[1], card.id];
            }
            return [...current, card.id];
        });
    };
    const handleCompareSelected = () => {
        if (selectedCompareCards.length !== 2 || !onCompareSelected) return;
        onCompareSelected(selectedCompareCards.map(buildStudyFromCard));
    };

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

    const openShareModal = (study) => {
        setShareTarget(study);
        setShareExpiryHours(48);
        setShareError(null);
        setShareResult(null);
    };

    const handleCreateShare = async () => {
        if (!shareTarget) return;

        try {
            setShareLoading(true);
            setShareError(null);

            const token = getAccessToken();
            const response = await fetch(`/api/v1/x-core/studies/${shareTarget.id}/share`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ expiresInHours: shareExpiryHours }),
            });

            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(payload.error || `Share request failed (${response.status})`);
            }

            setShareResult(payload);
        } catch (nextError) {
            console.error('[Gallery] Share failed:', nextError);
            setShareError(nextError.message || 'Failed to create share link');
        } finally {
            setShareLoading(false);
        }
    };

    const handleCopyShareUrl = async () => {
        if (!shareResult?.shareUrl) return;
        try {
            await navigator.clipboard.writeText(shareResult.shareUrl);
        } catch (copyError) {
            console.error('[Gallery] Copy share link failed:', copyError);
        }
    };

    const formatShareExpiry = (expiresAt) => {
        if (!expiresAt) return '';
        const date = new Date(expiresAt);
        return Number.isNaN(date.getTime()) ? '' : date.toLocaleString();
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
                    {connectionStatus === 'connected' && (
                        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-600">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.15)]" />
                            Live
                        </div>
                    )}
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
                        onClick={() => {
                            setCompareMode((current) => !current);
                            setSelectedCompareIds([]);
                        }}
                        className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition ${compareMode ? 'border-cyan-500 bg-cyan-500/10 text-cyan-600' : 'border-primary/20 text-muted hover:text-primary'}`}
                    >
                        <AppIcon name="Columns2" size={18} />
                        <span>Compare</span>
                    </button>
                    {compareMode && selectedCompareCards.length === 2 && (
                        <button
                            onClick={handleCompareSelected}
                            className="flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-500"
                        >
                            <AppIcon name="GitCompare" size={18} />
                            <span>Compare Selected</span>
                        </button>
                    )}
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
                        <p>{fetchingSeries ? (studiesWithSeries.some(s => s.scanning) ? "Scanning study contents..." : "Analyzing metadata...") : "Loading studies..."}</p>
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
                                const isCompareSelected = selectedCompareIds.includes(card.id);

                                return (
                                    <div
                                        key={card.id}
                                        onClick={() => {
                                            if (!isReady) return;
                                            if (compareMode) {
                                                toggleCompareSelection(card);
                                                return;
                                            }
                                            onSelectStudy(buildStudyFromCard(card));
                                        }}
                                        className={`group relative bg-surface-elevated rounded-2xl border overflow-hidden transition ${isCompareSelected ? 'border-cyan-500 ring-2 ring-cyan-500/20' : 'border-primary/10'} ${isReady
                                            ? 'hover:shadow-theme-lg cursor-pointer'
                                            : 'opacity-75 cursor-not-allowed'
                                            }`}
                                    >
                                        {compareMode && (
                                            <div className="absolute right-3 top-3 z-20 rounded-xl border border-white/20 bg-black/65 p-2 backdrop-blur">
                                                <input
                                                    type="checkbox"
                                                    checked={isCompareSelected}
                                                    readOnly
                                                    className="h-4 w-4 accent-cyan-500"
                                                    aria-label="Select for comparison"
                                                />
                                            </div>
                                        )}
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
                                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center px-6">
                                                    <div className="flex flex-col items-center gap-3 w-full">
                                                        <AppIcon name="Loader2" size={24} className="text-accent animate-spin" />
                                                        <div className="w-full space-y-1.5">
                                                            <div className="flex justify-between text-[10px] text-white font-medium uppercase tracking-wider">
                                                                <span>{card.conversionStage?.replace('_', ' ') || (card.status === 'converting' ? 'Processing' : 'Queued')}</span>
                                                                {card.conversionProgress > 0 && <span>{card.conversionProgress}%</span>}
                                                            </div>
                                                            <div className="h-1 w-full bg-white/20 rounded-full overflow-hidden">
                                                                <div 
                                                                    className="h-full bg-accent transition-all duration-500 ease-out shadow-[0_0_8px_rgba(var(--accent-rgb),0.5)]"
                                                                    style={{ width: `${card.conversionProgress || 5}%` }}
                                                                />
                                                            </div>
                                                        </div>
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
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            openShareModal(card.study);
                                                        }}
                                                        className="p-1 hover:bg-emerald-50 hover:text-emerald-600 rounded transition text-muted"
                                                        title="Share Study"
                                                    >
                                                        <AppIcon name="Share2" size={14} />
                                                    </button>
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
                                    {seriesCards.map(card => {
                                        const isCompareSelected = selectedCompareIds.includes(card.id);
                                        return (
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
                                                {compareMode ? (
                                                    <button
                                                        onClick={() => toggleCompareSelection(card)}
                                                        className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${isCompareSelected ? 'bg-cyan-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-cyan-50 hover:text-cyan-600'}`}
                                                    >
                                                        <AppIcon name={isCompareSelected ? 'CheckSquare' : 'Square'} size={16} />
                                                        Select
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => onSelectStudy(buildStudyFromCard(card))}
                                                        className="p-1.5 hover:bg-accent/10 rounded text-accent transition"
                                                        title="Open Study"
                                                    >
                                                        <AppIcon name="ExternalLink" size={18} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => openShareModal(card.study)}
                                                    className="ml-2 p-1.5 hover:bg-emerald-50 hover:text-emerald-600 rounded text-muted transition"
                                                    title="Share Study"
                                                >
                                                    <AppIcon name="Share2" size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                        );
                                    })}
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

            {shareTarget !== null && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setShareTarget(null)}>
                    <div className="w-full max-w-md rounded-3xl border border-primary/10 bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
                        <div className="mb-5 flex items-start justify-between gap-4">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Share Study</h3>
                                <p className="mt-1 text-sm text-gray-600">
                                    Generate a read-only link for {shareTarget.patientName || 'this patient'}.
                                </p>
                            </div>
                            <button
                                onClick={() => setShareTarget(null)}
                                className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                            >
                                <AppIcon name="X" size={18} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">Link Expiry</div>
                                <div className="grid grid-cols-4 gap-2">
                                    {[24, 48, 72, 168].map((hours) => (
                                        <button
                                            key={hours}
                                            onClick={() => setShareExpiryHours(hours)}
                                            className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                                                shareExpiryHours === hours
                                                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                                    : 'border-gray-200 text-gray-600 hover:border-emerald-300 hover:text-emerald-700'
                                            }`}
                                        >
                                            {hours}h
                                        </button>
                                    ))}
                                </div>
                                <p className="mt-2 text-xs text-gray-500">Link expires in {shareExpiryHours} hours.</p>
                            </div>

                            {shareError && (
                                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                                    {shareError}
                                </div>
                            )}

                            {shareResult?.shareUrl && (
                                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
                                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Share URL</div>
                                    <div className="break-all rounded-xl bg-white px-3 py-2 font-mono text-xs text-gray-700">
                                        {shareResult.shareUrl}
                                    </div>
                                    <div className="mt-3 flex items-center justify-between gap-3">
                                        <span className="text-xs text-emerald-700">
                                            Expires: {formatShareExpiry(shareResult.expiresAt)}
                                        </span>
                                        <button
                                            onClick={handleCopyShareUrl}
                                            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-500"
                                        >
                                            <AppIcon name="Copy" size={14} />
                                            Copy Link
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                onClick={() => setShareTarget(null)}
                                className="rounded-xl px-4 py-2.5 font-semibold text-gray-700 transition hover:bg-gray-100"
                            >
                                Close
                            </button>
                            <button
                                onClick={handleCreateShare}
                                disabled={shareLoading}
                                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <AppIcon name={shareLoading ? 'Loader2' : 'Share2'} size={16} className={shareLoading ? 'animate-spin' : ''} />
                                <span>{shareLoading ? 'Generating...' : 'Generate Link'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Gallery;
