import React, { useState, useRef, useEffect, useMemo } from 'react';
import AppIcon from '../../../../components/AppIcon';
import ModalPortal from '../../../../components/ui/ModalPortal';
import { getAccessToken } from '../../../../utils/auth/tokenStorage';
import { PY_API_BASE } from '../../../../config/api';
import useConversionSocket from '../hooks/useConversionSocket';
import { buildImagingUrl, buildStudyAssetParams } from '../utils/imagingUrl';
import { useToast } from '../../../../contexts/ToastContext';
import { useAuth } from '../../../../contexts/AuthContext';
import AssignStudyPatientModal from './AssignStudyPatientModal';

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
const SERIES_CACHE_STALE_AFTER_MS = 5 * 60 * 1000;

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
    const seriesCacheUpdatedAt = Number(
        study.seriesCacheUpdatedAt
        || study.cacheUpdatedAt
        || study.cachedAt
        || (series.length > 0 ? Date.now() : 0)
    ) || 0;

    if (study.seriesLoadState) {
        return {
            ...study,
            series,
            totalSeries,
            seriesLoadError: study.seriesLoadError || null,
            seriesCacheUpdatedAt,
        };
    }

    if (series.length > 0) {
        return {
            ...study,
            series,
            totalSeries,
            seriesLoadState: SERIES_LOAD_STATE.READY,
            seriesLoadError: null,
            seriesCacheUpdatedAt,
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
        seriesLoadError: study.seriesLoadError || IMAGING_SERVICE_OFFLINE_MESSAGE,
        seriesCacheUpdatedAt,
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

function shouldRevalidateCachedStudies(cachedStudies, staleAfterMs = SERIES_CACHE_STALE_AFTER_MS) {
    const now = Date.now();
    return cachedStudies.some((study) => {
        const series = study?.series || [];
        if (study?.seriesLoadState === SERIES_LOAD_STATE.READY && series.length > 0) {
            const lastUpdatedAt = Number(study?.seriesCacheUpdatedAt || 0);
            return !lastUpdatedAt || (now - lastUpdatedAt) > staleAfterMs;
        }
        return true;
    });
}

function hasIncompleteSeries(study) {
    return (study?.series || []).some(
        (series) => series.status === 'converting' || series.status === 'pending'
    );
}

const Gallery = ({
    onSelectStudy,
    onUploadClick,
    refreshTrigger,
    onStudyDeleted,
    cachedStudies,
    onStudiesLoaded,
    onCompareSelected,
    initialStudyId = null,
    studiesEndpoint = '/api/v1/x-core/studies',
    readOnly = false,
    allowUpload = true,
    allowDelete = true,
    allowShare = true,
}) => {
    const toast = useToast();
    const { user } = useAuth();
    const isIndependentDentist = !user?.clinicStaff?.clinicProfileId;
    const [viewMode, setViewMode] = useState('grid');
    const [searchQuery, setSearchQuery] = useState('');
    const [studies, setStudies] = useState([]);
    const [studiesWithSeries, setStudiesWithSeries] = useState([]); // Studies with expanded series cards
    const [loading, setLoading] = useState(true);
    const [fetchingSeries, setFetchingSeries] = useState(false);
    const [error, setError] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [patientAssignTarget, setPatientAssignTarget] = useState(null);
    const [shareTarget, setShareTarget] = useState(null);
    const [shareLoading, setShareLoading] = useState(false);
    const [shareError, setShareError] = useState(null);
    const [shareResult, setShareResult] = useState(null);
    const [shareDentists, setShareDentists] = useState([]);
    const [selectedRecipientDentistId, setSelectedRecipientDentistId] = useState('');
    const [shareType, setShareType] = useState('clinic'); // 'clinic' | 'email'
    const [shareEmail, setShareEmail] = useState('');
    const [compareMode, setCompareMode] = useState(false);
    const [selectedCompareIds, setSelectedCompareIds] = useState([]);
    const [selectedStudyDetails, setSelectedStudyDetails] = useState(null);
    const selectedStudy = useMemo(() => {
        if (!selectedStudyDetails) return null;
        return studiesWithSeries.find(s => s.id === selectedStudyDetails.id) || selectedStudyDetails;
    }, [selectedStudyDetails, studiesWithSeries]);
    const scrollRef = useRef(null);
    const onStudiesLoadedRef = useRef(onStudiesLoaded);
    const openedInitialStudyIdRef = useRef(null);
    const { latestEvent, connectionStatus } = useConversionSocket();

    useEffect(() => {
        onStudiesLoadedRef.current = onStudiesLoaded;
    }, [onStudiesLoaded]);

    useEffect(() => {
        if (!initialStudyId || openedInitialStudyIdRef.current === String(initialStudyId)) return;
        const matchingStudy = studiesWithSeries.find(
            (study) => String(getStudyKey(study)) === String(initialStudyId),
        );
        if (!matchingStudy) return;
        setSelectedStudyDetails(matchingStudy);
        openedInitialStudyIdRef.current = String(initialStudyId);
    }, [initialStudyId, studiesWithSeries]);

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
            const start = Date.now();
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
                const response = await fetch(studiesEndpoint, {
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
                const elapsed = Date.now() - start;
                const remaining = 900 - elapsed;
                if (remaining > 0) {
                    setTimeout(() => setLoading(false), remaining);
                } else {
                    setLoading(false);
                }
            }
        };
        fetchStudies();
    }, [refreshTrigger, studiesEndpoint]);

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

    // Fallback live progress while disconnected from the WebSocket.
    useEffect(() => {
        if (connectionStatus === 'connected') return undefined;
        const convertingStudies = studiesRef.current.filter(hasIncompleteSeries);

        if (convertingStudies.length === 0) return undefined;

        if (typeof EventSource !== 'undefined') {
            const sources = convertingStudies.map((study) => {
                const studyKey = getStudyKey(study);
                const url = buildImagingUrl(
                    `/segmentation-progress/${studyKey}`,
                    buildStudyAssetParams(study)
                );
                const source = new EventSource(url);

                source.onmessage = (event) => {
                    let payload = null;
                    try {
                        payload = JSON.parse(event.data);
                    } catch (_) {
                        payload = null;
                    }
                    if (!payload?.studyId) return;

                    if (payload.status === 'ready' || payload.status === 'complete') {
                        const matchingStudy = studiesRef.current.find((item) => String(getStudyKey(item)) === String(payload.studyId));
                        if (matchingStudy) {
                            fetchStudySeries(matchingStudy).then((updatedStudy) => {
                                setStudiesWithSeries((currentStudies) => {
                                    const nextStudies = currentStudies.map((item) =>
                                        String(getStudyKey(item)) === String(payload.studyId) ? updatedStudy : item
                                    );
                                    if (onStudiesLoadedRef.current) onStudiesLoadedRef.current(nextStudies);
                                    return nextStudies;
                                });
                            }).catch((error) => console.error('[Gallery] SSE completion refresh failed:', error));
                        }
                        source.close();
                        return;
                    }

                    setStudiesWithSeries((currentStudies) => {
                        const nextStudies = currentStudies.map((item) => {
                            if (String(getStudyKey(item)) !== String(payload.studyId)) return item;
                            const nextSeries = (item.series || []).map((series) => {
                                if (payload.seriesUid && series.series_uid !== payload.seriesUid) return series;
                                return {
                                    ...series,
                                    status: payload.status === 'processing' || payload.status === 'started' ? 'converting' : series.status,
                                    conversionStage: payload.stage || series.conversionStage,
                                    conversionProgress: payload.progress ?? series.conversionProgress,
                                };
                            });
                            return { ...item, series: nextSeries };
                        });
                        if (onStudiesLoadedRef.current) onStudiesLoadedRef.current(nextStudies);
                        return nextStudies;
                    });
                };

                source.onerror = () => {
                    source.close();
                };

                return source;
            });

            return () => sources.forEach((source) => source.close());
        }

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

    const formatBytes = (bytes) => {
        if (!bytes) return '0 MB';
        const num = Number(bytes);
        if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
        if (num < 1024 * 1024 * 1024) return `${(num / (1024 * 1024)).toFixed(1)} MB`;
        return `${(num / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    };

    const getStudyThumbnail = (study) => {
        const seriesList = study.series || [];
        const panSeries = seriesList.find(s => s.classification === '2D');
        const targetSeries = panSeries || seriesList[0];
        if (!targetSeries) return null;
        const thumbnailPath = targetSeries.thumbnail_url || `/thumbnail/${study.folderName || study.id}/${targetSeries.series_uid}`;
        return buildImagingUrl(thumbnailPath, buildStudyAssetParams(study));
    };

    const getStudyModalities = (study) => {
        const seriesList = study.series || [];
        const modalities = new Set();
        seriesList.forEach(s => {
            const mod = s.modality;
            if (mod === 'CBCT') {
                modalities.add('3D CBCT');
            } else if (mod === 'Panoramic') {
                modalities.add('2D Panoramik');
            } else if (mod === 'Cephalometric') {
                modalities.add('2D Sefalometri');
            } else if (mod === 'Intraoral Periapical') {
                modalities.add('Periapikal');
            } else if (mod === 'Intraoral Bitewing') {
                modalities.add('Bitewing');
            } else if (mod === 'Intraoral Occlusal') {
                modalities.add('Oklusal');
            } else if (mod === 'Intraoral') {
                modalities.add('Intraoral');
            } else {
                if (s.type === '3D Volume' || s.classification === '3D') {
                    modalities.add('3D CBCT');
                } else {
                    modalities.add(s.modality || '2D Panoramik');
                }
            }
        });
        return Array.from(modalities);
    };

    const getModalityBadgeClass = (mod) => {
        if (mod.includes('3D') || mod === 'CBCT') return 'bg-indigo-600/85 border border-indigo-500/30';
        if (mod.includes('Panoramik') || mod === 'Panoramic') return 'bg-emerald-600/85 border border-emerald-500/30';
        if (mod.includes('Sefalometri') || mod === 'Cephalometric') return 'bg-cyan-600/85 border border-cyan-500/30';
        if (['Periapikal', 'Bitewing', 'Oklusal', 'Intraoral'].some(k => mod.includes(k))) return 'bg-amber-600/85 border border-amber-500/30';
        return 'bg-slate-600/85 border border-slate-500/30';
    };


    const renderAccessBadge = (scope) => {
        switch (scope) {
            case 'clinic':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-md backdrop-blur-sm">
                        <AppIcon name="Hospital" size={10} className="stroke-[2.5]" />
                        <span>Klinik</span>
                    </span>
                );
            case 'shared_with_me':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-600 border border-cyan-500/20 rounded-md backdrop-blur-sm">
                        <AppIcon name="Share2" size={10} className="stroke-[2.5]" />
                        <span>Dibagikan</span>
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 rounded-md backdrop-blur-sm">
                        <AppIcon name="Lock" size={10} className="stroke-[2.5]" />
                        <span>Pribadi</span>
                    </span>
                );
        }
    };


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
                toast.success('Study deleted successfully!');
            } else {
                const data = await response.json().catch(() => ({}));
                const msg = data.error || `Server returned ${response.status}`;
                console.error("[Gallery] Delete failed:", msg);
                toast.error(`Failed to delete study: ${msg}`);
            }
        } catch (error) {
            console.error("Delete failed", error);
            toast.error("Failed to delete study. Please check your connection.");
        }
    };

    const openShareModal = (study) => {
        setShareTarget(study);
        setShareError(null);
        setShareResult(null);
        setShareDentists([]);
        setSelectedRecipientDentistId('');
        setShareType(isIndependentDentist ? 'email' : 'clinic');
        setShareEmail('');
        if (!isIndependentDentist) {
            fetchEligibleShareDentists(study);
        }
    };

    const canManageStudy = (study) => (
        !readOnly
        && study?.xcoreAccessScope !== 'clinic'
        && study?.xcoreAccessScope !== 'shared_with_me'
    );

    const handlePatientAssigned = (assignedStudy) => {
        const targetStudyId = String(assignedStudy.id);
        const applyAssignment = (study) => {
            if (String(study.id) !== targetStudyId) return study;
            return {
                ...study,
                patientId: assignedStudy.patientId,
                realPatientId: assignedStudy.patientId,
                patient: assignedStudy.patient,
                patientName: assignedStudy.patient?.name || 'Unknown patient',
                patientIdDisplay: `P-${assignedStudy.patientId}`,
            };
        };

        setStudies((current) => current.map(applyAssignment));
        setStudiesWithSeries((current) => {
            const next = current.map(applyAssignment);
            if (onStudiesLoadedRef.current) onStudiesLoadedRef.current(next);
            return next;
        });
        setSelectedStudyDetails((current) => current ? applyAssignment(current) : current);
        setPatientAssignTarget(null);
        toast.success('X-Core study assigned to the selected patient.');
    };

    const fetchEligibleShareDentists = async (study) => {
        try {
            setShareLoading(true);
            const token = getAccessToken();
            const response = await fetch(`/api/v1/x-core/studies/${study.id}/share/eligible-dentists`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(payload.error || `Dentist lookup failed (${response.status})`);
            }
            const dentists = payload.dentists || [];
            setShareDentists(dentists);
            setSelectedRecipientDentistId(dentists[0]?.id || '');
        } catch (nextError) {
            console.error('[Gallery] Eligible dentist lookup failed:', nextError);
            setShareError(nextError.message || 'Failed to load clinic dentists');
        } finally {
            setShareLoading(false);
        }
    };

    const handleCreateShare = async () => {
        if (!shareTarget) return;

        try {
            setShareLoading(true);
            setShareError(null);

            let bodyData = {};
            if (shareType === 'clinic') {
                if (!selectedRecipientDentistId) {
                    throw new Error('Select an active dentist in your clinic.');
                }
                bodyData = { recipientDentistId: selectedRecipientDentistId };
            } else {
                if (!shareEmail.trim()) {
                    throw new Error('Enter a valid dentist email address.');
                }
                bodyData = { email: shareEmail.trim() };
            }

            const token = getAccessToken();
            const response = await fetch(`/api/v1/x-core/studies/${shareTarget.id}/share`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(bodyData),
            });

            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(payload.error || `Share request failed (${response.status})`);
            }

            setShareResult(payload);
        } catch (nextError) {
            console.error('[Gallery] Share failed:', nextError);
            setShareError(nextError.message || 'Failed to share study');
        } finally {
            setShareLoading(false);
        }
    };

    return (
        <div className="space-y-6" ref={scrollRef}>
            {selectedStudy !== null ? (
                /* Patient Sub-Gallery Page */
                <div className="space-y-6 animate-fade-in">
                    {/* Sub-Gallery Header: Back button and Patient Metadata */}
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b border-primary/10">
                        <div className="space-y-3">
                            <button
                                onClick={() => setSelectedStudyDetails(null)}
                                className="flex items-center gap-2 text-sm text-accent hover:text-accent-hover font-semibold transition group"
                            >
                                <AppIcon name="ArrowLeft" size={16} className="transition-transform group-hover:-translate-x-1" />
                                <span>Kembali ke Galeri</span>
                            </button>
                            <div>
                                <div className="flex flex-wrap items-center gap-3">
                                    <h2 className="text-2xl font-bold text-primary">{selectedStudy.patientName}</h2>
                                    <span className="px-2.5 py-1 text-xs font-mono font-medium rounded-lg bg-primary/5 border border-primary/10 text-secondary">
                                        ID: {selectedStudy.patientIdDisplay}
                                    </span>
                                    {renderAccessBadge(selectedStudy.xcoreAccessScope)}
                                </div>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2 text-xs text-secondary font-medium">
                                    <div className="flex items-center gap-1">
                                        <AppIcon name="Calendar" size={14} className="text-muted" />
                                        <span>Tanggal Scan: {selectedStudy.dateDisplay}</span>
                                    </div>
                                    <span className="text-muted">•</span>
                                    <div className="flex items-center gap-1">
                                        <AppIcon name="HardDrive" size={14} className="text-muted" />
                                        <span>Ukuran Data: {formatBytes(selectedStudy.sizeInBytes)}</span>
                                    </div>
                                    {selectedStudy.metadata?.InstitutionName && (
                                        <>
                                            <span className="text-muted">•</span>
                                            <div className="flex items-center gap-1">
                                                <AppIcon name="Hospital" size={14} className="text-muted" />
                                                <span>Fasilitas: {selectedStudy.metadata.InstitutionName}</span>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Extended DICOM & Acquisition Metadata Panel */}
                                {selectedStudy.metadata && (
                                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 bg-primary/5 rounded-2xl border border-primary/10 p-4 animate-fade-in max-w-4xl">
                                        {/* Patient Clinical Info */}
                                        <div className="space-y-1">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Informasi Pasien</span>
                                            <div className="text-xs text-secondary space-y-1">
                                                <p className="flex items-center gap-1.5">
                                                    <span className="font-semibold text-primary">Tgl Lahir:</span> 
                                                    <span>{selectedStudy.metadata.PatientBirthDate ? selectedStudy.metadata.PatientBirthDate.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3') : '—'}</span>
                                                </p>
                                                <p className="flex items-center gap-1.5">
                                                    <span className="font-semibold text-primary">Jenis Kelamin:</span> 
                                                    <span>{selectedStudy.metadata.PatientSex === 'M' ? 'Laki-laki (M)' : selectedStudy.metadata.PatientSex === 'F' ? 'Perempuan (F)' : selectedStudy.metadata.PatientSex || '—'}</span>
                                                </p>
                                            </div>
                                        </div>

                                        {/* Study details */}
                                        <div className="space-y-1">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Detail Pemindaian</span>
                                            <div className="text-xs text-secondary space-y-1">
                                                <p className="flex items-center gap-1.5">
                                                    <span className="font-semibold text-primary">Deskripsi:</span> 
                                                    <span className="truncate" title={selectedStudy.metadata.StudyDescription}>{selectedStudy.metadata.StudyDescription || '—'}</span>
                                                </p>
                                                <p className="flex items-center gap-1.5">
                                                    <span className="font-semibold text-primary">Total Seri:</span> 
                                                    <span>{selectedStudy.series?.length || 0} scans</span>
                                                </p>
                                            </div>
                                        </div>

                                        {/* Acquisition Device Details */}
                                        <div className="space-y-1">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Informasi Perangkat</span>
                                            <div className="text-xs text-secondary space-y-1">
                                                <p className="flex items-center gap-1.5">
                                                    <span className="font-semibold text-primary">Produsen:</span> 
                                                    <span className="truncate text-accent font-medium" title={selectedStudy.metadata.Manufacturer}>{selectedStudy.metadata.Manufacturer || '—'}</span>
                                                </p>
                                                <p className="flex items-center gap-1.5">
                                                    <span className="font-semibold text-primary">Model Alat:</span> 
                                                    <span className="truncate" title={selectedStudy.metadata.ManufacturerModelName}>{selectedStudy.metadata.ManufacturerModelName || '—'}</span>
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                        </div>

                        <div className="flex gap-2.5 shrink-0 self-end sm:self-center">
                            {canManageStudy(selectedStudy) && (
                                <button
                                    onClick={() => setPatientAssignTarget(selectedStudy)}
                                    className="flex items-center gap-1.5 rounded-xl border border-blue-500/20 bg-blue-500/10 px-4 py-2.5 text-xs font-bold text-blue-700 shadow-sm transition hover:bg-blue-500/20"
                                >
                                    <AppIcon name="UserRoundPen" size={14} />
                                    <span>Change Patient</span>
                                </button>
                            )}
                            {allowShare && canManageStudy(selectedStudy) && (
                                <button
                                    onClick={() => openShareModal(selectedStudy)}
                                    className="flex items-center gap-1.5 px-4.5 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/25 border border-emerald-500/20 text-emerald-600 rounded-xl text-xs font-bold transition shadow-sm"
                                >
                                    <AppIcon name="Share2" size={14} />
                                    <span>Bagikan</span>
                                </button>
                            )}
                            {allowDelete && canManageStudy(selectedStudy) && (
                                <button
                                    onClick={() => setDeleteTarget(selectedStudy)}
                                    className="flex items-center gap-1.5 px-4.5 py-2.5 bg-red-500/10 hover:bg-red-500/25 border border-red-500/20 text-red-600 rounded-xl text-xs font-bold transition shadow-sm"
                                >
                                    <AppIcon name="Trash2" size={14} />
                                    <span>Hapus</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Sub-Gallery Scan Grid */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-2">
                                <AppIcon name="FolderOpen" size={14} />
                                <span>Hasil Pemindaian Pasien ({selectedStudy.series?.length || 0})</span>
                            </h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {(selectedStudy.series || []).map((series) => {
                                const isReady = series.status === 'ready';
                                const isConverting = series.status === 'converting' || series.status === 'pending';
                                const thumbnailPath = series.thumbnail_url || `/thumbnail/${selectedStudy.folderName || selectedStudy.id}/${series.series_uid}`;
                                const thumbnailUrl = buildImagingUrl(thumbnailPath, buildStudyAssetParams(selectedStudy));
                                const is3D = series.type === '3D Volume' || series.classification === '3D';

                                return (
                                    <div 
                                        key={series.series_uid} 
                                        className={`group relative bg-surface-elevated rounded-2xl border border-primary/10 overflow-hidden flex flex-col justify-between transition hover:shadow-theme-lg hover:border-primary/20 ${isReady ? 'cursor-pointer' : ''}`}
                                        onClick={() => {
                                            if (isReady) {
                                                onSelectStudy(buildStudyFromCard({ study: selectedStudy, ...series }));
                                            }
                                        }}
                                    >
                                        <div className="space-y-4">
                                            {/* Thumbnail / Scan cover */}
                                            <div className="aspect-video bg-gray-900 flex items-center justify-center relative overflow-hidden">
                                                {isReady ? (
                                                    <img 
                                                        src={thumbnailUrl} 
                                                        alt={series.title} 
                                                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-102" 
                                                    />
                                                ) : (
                                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                                        <AppIcon name="Loader2" size={32} className="text-accent animate-spin" />
                                                    </div>
                                                )}

                                                {/* Modality Tag */}
                                                <span className={`absolute top-3 left-3 px-2.5 py-1 text-white text-[10px] font-bold uppercase rounded-md backdrop-blur-md flex items-center gap-1 ${getModalityBadgeClass(series.modality)}`}>
                                                    <AppIcon name={is3D ? 'Box' : 'Image'} size={12} />
                                                    {series.modality === 'CBCT' ? '3D CBCT' : series.modality === 'Panoramic' ? 'Panoramik' : series.modality === 'Cephalometric' ? 'Sefalometri' : series.modality}
                                                </span>

                                                {/* Modality raw description */}
                                                <span className="absolute top-3 right-3 px-2 py-0.5 bg-black/55 text-white text-[10px] rounded-md backdrop-blur-md font-medium">
                                                    {series.modality}
                                                </span>

                                                {/* Inherited Series-level Access Badge */}
                                                <div className="absolute bottom-3 left-3 z-10">
                                                    {renderAccessBadge(selectedStudy.xcoreAccessScope)}
                                                </div>

                                                {series.num_slices > 1 && (
                                                    <span className="absolute bottom-3 right-3 px-2 py-1 bg-black/55 text-white text-[10px] rounded-md backdrop-blur-md font-semibold text-cyan-400">
                                                        {series.num_slices} slices
                                                    </span>
                                                )}
                                            </div>

                                            {/* Series description */}
                                            <div className="px-5 pb-3 space-y-1.5">
                                                <h4 className="font-bold text-primary text-sm line-clamp-1 group-hover:text-accent transition-colors">
                                                    {series.title || (is3D ? 'Volume 3D CBCT' : `Scan 2D ${series.modality}`)}
                                                </h4>
                                                <p className="text-xs text-secondary leading-relaxed">
                                                    {is3D ? '3D CBCT Volumetric Scan' : `2D ${series.modality} Scan`}
                                                </p>


                                                {/* Series Metadata row */}
                                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-secondary font-medium pt-1 border-t border-primary/5">
                                                    <span className="flex items-center gap-1">
                                                        <AppIcon name="Fingerprint" size={10} className="text-muted" />
                                                        <span>UID: {series.series_uid.substring(0, 8)}...</span>
                                                    </span>
                                                    {series.num_slices > 0 && (
                                                        <>
                                                            <span className="text-muted">•</span>
                                                            <span className="flex items-center gap-1">
                                                                <AppIcon name="Layers" size={10} className="text-muted" />
                                                                <span>{series.num_slices} slices</span>
                                                            </span>
                                                        </>
                                                    )}
                                                </div>


                                                {isConverting && (
                                                    <div className="pt-3 space-y-1.5">
                                                        <div className="flex justify-between text-[10px] text-accent font-semibold uppercase tracking-wider">
                                                            <span>{series.conversionStage?.replace('_', ' ') || 'Memproses'}</span>
                                                            {series.conversionProgress > 0 && <span>{series.conversionProgress}%</span>}
                                                        </div>
                                                        <div className="h-1.5 w-full bg-primary/10 rounded-full overflow-hidden">
                                                            <div 
                                                                className="h-full bg-accent transition-all duration-300"
                                                                style={{ width: `${series.conversionProgress || 5}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Action button */}
                                        <div className="p-5 pt-0">
                                            {isReady ? (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onSelectStudy(buildStudyFromCard({ study: selectedStudy, ...series }));
                                                    }}
                                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-xl text-xs font-semibold transition shadow-sm hover:shadow-accent/20"
                                                >
                                                    <AppIcon name="ExternalLink" size={14} />
                                                    <span>Buka Viewer</span>
                                                </button>
                                            ) : (
                                                <div className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary/5 border border-primary/10 text-muted rounded-xl text-xs font-semibold italic cursor-not-allowed">
                                                    <AppIcon name="Loader2" size={14} className="animate-spin" />
                                                    <span>Memproses...</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            ) : (
                <>
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
                    {allowUpload && (
                        <button
                            onClick={onUploadClick}
                            className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-xl hover:bg-accent-hover transition shadow-sm"
                        >
                            <AppIcon name="UploadCloud" size={20} />
                            <span>New Scan</span>
                        </button>
                    )}
                </div>
            </div>

            {loading || fetchingSeries ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {Array.from({
                        length: studies && studies.length > 0
                            ? studies.length
                            : cachedStudies && cachedStudies.length > 0
                                ? cachedStudies.length
                                : 3
                    }).map((_, idx) => (
                        <div key={idx} className="bg-surface-elevated rounded-2xl border border-primary/10 overflow-hidden animate-pulse">
                            {/* Cover placeholder with overlay badges */}
                            <div className="aspect-video bg-slate-900 relative overflow-hidden flex items-center justify-center">
                                <AppIcon name="FolderOpen" size={48} className="text-slate-800 dark:text-slate-700" />
                                
                                {/* Modality tags placeholder */}
                                <div className="absolute top-2 left-2 flex gap-1.5">
                                    <div className="w-16 h-4 bg-slate-800 dark:bg-slate-700 rounded" />
                                </div>

                                {/* Access badge placeholder */}
                                <div className="absolute top-2 right-2">
                                    <div className="w-14 h-4 bg-slate-800 dark:bg-slate-700 rounded" />
                                </div>

                                {/* Scan count badge placeholder */}
                                <span className="absolute bottom-2 left-2 px-2 py-1 bg-black/55 text-cyan-400/50 text-[10px] rounded backdrop-blur-sm font-semibold flex items-center gap-1">
                                    <AppIcon name="Layers" size={10} className="stroke-[2.5]" />
                                    <div className="w-8 h-2.5 bg-cyan-400/20 rounded" />
                                </span>

                                {/* Folder size badge placeholder */}
                                <span className="absolute bottom-2 right-2 px-2 py-1 bg-black/55 text-white/50 text-[10px] rounded backdrop-blur-sm font-medium">
                                    <div className="w-12 h-2.5 bg-white/20 rounded" />
                                </span>
                            </div>
                            
                            {/* Info placeholder */}
                            <div className="p-4 space-y-2">
                                <div className="flex justify-between items-start">
                                    <div className="min-w-0 flex-1">
                                        <div className="h-3.5 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                                        <div className="h-2.5 bg-slate-200/80 dark:bg-slate-700/80 rounded w-1/3 mt-1.5" />
                                        <div className="h-2 bg-slate-200/60 dark:bg-slate-700/60 rounded w-2/3 mt-1.5" />
                                    </div>
                                    <AppIcon name="ChevronRight" size={16} className="text-slate-300 dark:text-slate-700 mt-0.5" />
                                </div>
                                
                                <div className="pt-2 border-t border-primary/10 flex justify-between items-center text-xs text-secondary">
                                    <div className="h-2.5 bg-slate-200/70 dark:bg-slate-700/70 rounded w-16" />
                                    <div className="flex items-center gap-2">
                                        <div className="h-2.5 bg-slate-200/80 dark:bg-slate-700/80 rounded w-12" />
                                        <div className="p-1 rounded text-slate-300 dark:text-slate-700">
                                            <AppIcon name="Share2" size={14} />
                                        </div>
                                        <div className="p-1 rounded text-slate-300 dark:text-slate-700">
                                            <AppIcon name="Trash2" size={14} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
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
                                        {allowDelete && canManageStudy(study) && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setDeleteTarget(study); }}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-medium transition"
                                            >
                                                <AppIcon name="Trash2" size={14} />
                                                Delete Record
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {viewMode === 'grid' ? (
                        compareMode ? (
                            // Series Grid (For Comparison Mode)
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
                                                toggleCompareSelection(card);
                                            }}
                                            className={`group relative bg-surface-elevated rounded-2xl border overflow-hidden transition ${isCompareSelected ? 'border-cyan-500 ring-2 ring-cyan-500/20' : 'border-primary/10'} ${isReady
                                                ? 'hover:shadow-theme-lg cursor-pointer'
                                                : 'opacity-75 cursor-not-allowed'
                                                }`}
                                        >
                                            <div className="absolute right-3 top-3 z-20 rounded-xl border border-white/20 bg-black/65 p-2 backdrop-blur">
                                                <input
                                                    type="checkbox"
                                                    checked={isCompareSelected}
                                                    readOnly
                                                    className="h-4 w-4 accent-cyan-500"
                                                    aria-label="Select for comparison"
                                                />
                                            </div>
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
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            // Patient Study Grid (Default Gallery Mode)
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {healthyStudies.length === 0 ? (
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
                                        {!searchQuery && allowUpload && (
                                            <button
                                                onClick={onUploadClick}
                                                className="flex items-center gap-2 px-6 py-3 bg-accent text-white rounded-xl hover:bg-accent-hover transition shadow-lg shadow-accent/20 hover:shadow-accent/40 hover:-translate-y-0.5"
                                            >
                                                <AppIcon name="UploadCloud" size={20} />
                                                <span>Upload First Study</span>
                                            </button>
                                        )}
                                    </div>
                                ) : healthyStudies.map(study => {
                                    const studyModalities = getStudyModalities(study);
                                    const thumbnailUrl = getStudyThumbnail(study);
                                    const folderSize = formatBytes(study.sizeInBytes);
                                    const isConverting = hasIncompleteSeries(study);

                                    return (
                                        <div
                                            key={study.id}
                                            onClick={() => {
                                                setSelectedStudyDetails(study);
                                            }}
                                            className="group relative bg-surface-elevated rounded-2xl border border-primary/10 overflow-hidden transition hover:shadow-theme-lg cursor-pointer"
                                        >
                                            {/* Study Cover Image */}
                                            <div className="aspect-video bg-gray-900 flex items-center justify-center relative overflow-hidden">
                                                {thumbnailUrl ? (
                                                    <img
                                                        src={thumbnailUrl}
                                                        alt={study.patientName}
                                                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-102"
                                                    />
                                                ) : (
                                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                                        <AppIcon name="FolderOpen" size={48} className="text-gray-700" />
                                                    </div>
                                                )}

                                                {/* Modalities badges list */}
                                                <div className="absolute top-2 left-2 flex flex-wrap gap-1.5 z-10">
                                                    {studyModalities.map(mod => (
                                                        <span 
                                                            key={mod} 
                                                            className={`px-2 py-0.5 text-[10px] font-semibold rounded backdrop-blur-sm text-white ${getModalityBadgeClass(mod)}`}
                                                        >
                                                            {mod}
                                                        </span>
                                                    ))}
                                                </div>

                                                {/* Access Badge */}
                                                <div className="absolute top-2 right-2 z-10">
                                                    {renderAccessBadge(study.xcoreAccessScope)}
                                                </div>

                                                {/* Series / Scan Count Badge */}
                                                <span className="absolute bottom-2 left-2 px-2 py-1 bg-black/55 text-cyan-400 text-[10px] rounded backdrop-blur-sm font-semibold flex items-center gap-1">
                                                    <AppIcon name="Layers" size={10} className="stroke-[2.5]" />
                                                    <span>{study.series?.length || 0} Scan</span>
                                                </span>

                                                {/* Folder Size Badge */}
                                                <span className="absolute bottom-2 right-2 px-2 py-1 bg-black/55 text-white text-[10px] rounded backdrop-blur-sm font-medium">
                                                    {folderSize}
                                                </span>
                                            </div>

                                            <div className="p-4 space-y-2">
                                                <div className="flex justify-between items-start">
                                                    <div className="min-w-0 flex-1">
                                                        <h3 className="font-semibold text-primary truncate group-hover:text-accent transition-colors">{study.patientName}</h3>
                                                        <p className="text-xs text-secondary mt-0.5">{study.patientIdDisplay}</p>
                                                        <p className="text-[11px] text-muted truncate mt-1">Folder: {study.originalName}</p>
                                                        {study.metadata?.InstitutionName && (
                                                            <p className="text-[10px] text-secondary flex items-center gap-1 mt-1 font-medium truncate">
                                                                <AppIcon name="Hospital" size={10} className="text-muted shrink-0" />
                                                                <span className="truncate">{study.metadata.InstitutionName}</span>
                                                            </p>
                                                        )}
                                                    </div>
                                                    <AppIcon name="ChevronRight" size={16} className="text-muted group-hover:text-accent transition-transform group-hover:translate-x-1 mt-0.5" />
                                                </div>

                                                
                                                <div className="pt-2 border-t border-primary/10 flex justify-between items-center text-xs text-secondary">
                                                    <span>{study.dateDisplay}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className={
                                                            isConverting
                                                                ? 'text-blue-500 font-medium'
                                                                : study.statusDisplay === 'Analyzed'
                                                                    ? 'text-emerald-500 font-medium'
                                                                    : 'text-amber-500'
                                                        }>
                                                            {isConverting ? 'Processing' : study.statusDisplay}
                                                        </span>
                                                        {allowShare && canManageStudy(study) && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    openShareModal(study);
                                                                }}
                                                                className="p-1 hover:bg-emerald-50 hover:text-emerald-600 rounded transition text-muted"
                                                                title="Share Study"
                                                            >
                                                                <AppIcon name="Share2" size={14} />
                                                            </button>
                                                        )}
                                                        {allowDelete && canManageStudy(study) && (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); setDeleteTarget(study); }}
                                                                className="p-1 hover:bg-red-50 hover:text-red-500 rounded transition text-muted"
                                                                title="Delete Study"
                                                            >
                                                                <AppIcon name="Trash2" size={14} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )
                    ) : (
                        compareMode ? (
                            // Series List Table (For Comparison Mode)
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
                                            <th className="px-6 py-4 font-medium text-secondary">Access</th>
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
                                                <td className="px-6 py-4">
                                                    {renderAccessBadge(card.study?.xcoreAccessScope)}
                                                </td>
                                                <td className="px-6 py-4 text-secondary">{card.dateDisplay}</td>
                                                <td className="px-6 py-4">
                                                    <button
                                                        onClick={() => toggleCompareSelection(card)}
                                                        className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${isCompareSelected ? 'bg-cyan-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-cyan-50 hover:text-cyan-600'}`}
                                                    >
                                                        <AppIcon name={isCompareSelected ? 'CheckSquare' : 'Square'} size={16} />
                                                        Select
                                                    </button>
                                                </td>
                                            </tr>
                                            );
                                        })}
                                    </tbody>

                                </table>
                            </div>
                        ) : (
                            // Patient Study Table (Default Gallery Mode)
                            <div className="bg-surface-elevated rounded-2xl border border-primary/10 overflow-hidden">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-surface border-b border-primary/10">
                                        <tr>
                                            <th className="px-6 py-4 font-medium text-secondary">Status</th>
                                            <th className="px-6 py-4 font-medium text-secondary">Patient</th>
                                            <th className="px-6 py-4 font-medium text-secondary">Modality</th>
                                            <th className="px-6 py-4 font-medium text-secondary">Folder Size</th>
                                            <th className="px-6 py-4 font-medium text-secondary">Scans</th>
                                            <th className="px-6 py-4 font-medium text-secondary">Access</th>
                                            <th className="px-6 py-4 font-medium text-secondary">Date</th>
                                            <th className="px-6 py-4 font-medium text-secondary">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-primary/5">
                                        {healthyStudies.map(study => {
                                            const studyModalities = getStudyModalities(study);
                                            const folderSize = formatBytes(study.sizeInBytes);
                                            
                                            return (
                                            <tr 
                                                key={study.id} 
                                                className="hover:bg-primary/5 transition cursor-pointer"
                                                onClick={() => setSelectedStudyDetails(study)}
                                            >
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${study.statusDisplay === 'Analyzed' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                                                        }`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${study.statusDisplay === 'Analyzed' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></span>
                                                        {study.statusDisplay}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 font-medium text-primary">
                                                    <div>
                                                        <span className="text-sm font-semibold">{study.patientName}</span>
                                                        <span className="text-xs text-secondary block">{study.patientIdDisplay}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex gap-1">
                                                        {studyModalities.map(mod => (
                                                            <span key={mod} className={`px-2 py-0.5 rounded text-[10px] font-semibold text-white ${getModalityBadgeClass(mod)}`}>{mod}</span>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-secondary">{folderSize}</td>
                                                <td className="px-6 py-4 text-secondary">
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">{study.series?.length || 0} scans</span>
                                                        {study.metadata?.InstitutionName && (
                                                            <span className="text-[10px] text-muted flex items-center gap-0.5 mt-0.5 max-w-[150px] truncate" title={study.metadata.InstitutionName}>
                                                                <AppIcon name="Hospital" size={8} />
                                                                <span className="truncate">{study.metadata.InstitutionName}</span>
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {renderAccessBadge(study.xcoreAccessScope)}
                                                </td>
                                                <td className="px-6 py-4 text-secondary">{study.dateDisplay}</td>
                                                <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                                                    <button
                                                        onClick={() => setSelectedStudyDetails(study)}
                                                        className="p-1.5 hover:bg-accent/10 rounded text-accent transition"
                                                        title="Open Folder Details"
                                                    >
                                                        <AppIcon name="FolderOpen" size={18} />
                                                    </button>
                                                    {allowShare && canManageStudy(study) && (
                                                        <button
                                                            onClick={() => openShareModal(study)}
                                                            className="ml-2 p-1.5 hover:bg-emerald-50 hover:text-emerald-600 rounded text-muted transition"
                                                            title="Share Study"
                                                        >
                                                            <AppIcon name="Share2" size={18} />
                                                        </button>
                                                    )}
                                                    {allowDelete && canManageStudy(study) && (
                                                        <button
                                                            onClick={() => setDeleteTarget(study)}
                                                            className="ml-2 p-1.5 hover:bg-red-50 hover:text-red-500 rounded text-muted transition"
                                                            title="Delete Study"
                                                        >
                                                            <AppIcon name="Trash2" size={18} />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )
                    )}
                </div>
            )}

                </>
            )}

            {/* Delete Confirmation Modal */}
            {deleteTarget !== null && (
                <ModalPortal>
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
                </ModalPortal>
            )}

            {shareTarget !== null && (
                <ModalPortal>
                    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setShareTarget(null)}>
                        <div className="w-full max-w-md rounded-3xl border border-primary/10 bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
                            <div className="mb-5 flex items-start justify-between gap-4">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900">Share Study</h3>
                                    <p className="mt-1 text-sm text-gray-600">
                                        Grant read-only X-Core access for {shareTarget.patientName || 'this patient'} to another registered dentist.
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShareTarget(null)}
                                    className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                                >
                                    <AppIcon name="X" size={18} />
                                </button>
                            </div>

                            {!isIndependentDentist && (
                                <div className="flex rounded-xl bg-gray-100 p-1 mb-5">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShareType('clinic');
                                            setShareError(null);
                                            setShareResult(null);
                                        }}
                                        className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${
                                            shareType === 'clinic'
                                                ? 'bg-white text-gray-900 shadow-sm'
                                                : 'text-gray-500 hover:text-gray-900'
                                        }`}
                                    >
                                        Clinic Dentist
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShareType('email');
                                            setShareError(null);
                                            setShareResult(null);
                                        }}
                                        className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${
                                            shareType === 'email'
                                                ? 'bg-white text-gray-900 shadow-sm'
                                                : 'text-gray-500 hover:text-gray-900'
                                        }`}
                                    >
                                        Independent Dentist (by Email)
                                    </button>
                                </div>
                            )}

                            <div className="space-y-4">
                                {shareType === 'clinic' ? (
                                    <div>
                                        <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                                            Recipient Dentist
                                        </label>
                                        <select
                                            value={selectedRecipientDentistId}
                                            onChange={(event) => setSelectedRecipientDentistId(event.target.value)}
                                            disabled={shareLoading || shareDentists.length === 0}
                                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
                                        >
                                            {shareDentists.length === 0 ? (
                                                <option value="">No eligible active dentists</option>
                                            ) : shareDentists.map((dentist) => (
                                                <option key={dentist.id} value={dentist.id}>
                                                    {dentist.title ? `${dentist.title} ` : ''}{dentist.name}{dentist.specialization ? ` - ${dentist.specialization}` : ''}
                                                </option>
                                            ))}
                                        </select>
                                        <p className="mt-2 text-xs text-gray-500">Only active dentists in the same clinic are eligible.</p>
                                    </div>
                                ) : (
                                    <div>
                                        <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                                            Dentist's Registered Email
                                        </label>
                                        <input
                                            type="email"
                                            placeholder="dentist@example.com"
                                            value={shareEmail}
                                            onChange={(event) => setShareEmail(event.target.value)}
                                            disabled={shareLoading}
                                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
                                        />
                                        <p className="mt-2 text-xs text-gray-500">
                                            {isIndependentDentist
                                                ? "Enter the registered email of the dentist you want to share with (can be a clinic or independent dentist)."
                                                : "Enter the registered email of the independent dentist."}
                                        </p>
                                    </div>
                                )}

                                {shareError && (
                                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                                        {shareError}
                                    </div>
                                )}

                                {shareResult?.share && (
                                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
                                        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Shared</div>
                                        <p className="text-sm text-emerald-800">
                                            {shareResult.share.recipient?.name || 'The selected dentist'} ({shareResult.share.recipient?.email || shareEmail}) can now open this study from their X-Core gallery.
                                        </p>
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
                                    disabled={shareLoading || (shareType === 'clinic' ? !selectedRecipientDentistId : !shareEmail.trim())}
                                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    <AppIcon name={shareLoading ? 'Loader2' : 'Share2'} size={16} className={shareLoading ? 'animate-spin' : ''} />
                                    <span>{shareLoading ? 'Sharing...' : 'Share Study'}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </ModalPortal>
            )}

            <AssignStudyPatientModal
                study={patientAssignTarget}
                onClose={() => setPatientAssignTarget(null)}
                onAssigned={handlePatientAssigned}
            />
        </div>
    );
};

export default Gallery;
