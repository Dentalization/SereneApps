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

const Gallery = ({ onSelectStudy, onUploadClick, refreshTrigger, onStudyDeleted, cachedStudies, onStudiesLoaded }) => {
    const [viewMode, setViewMode] = useState('grid');
    const [searchQuery, setSearchQuery] = useState('');
    const [studies, setStudies] = useState([]);
    const [studiesWithSeries, setStudiesWithSeries] = useState([]); // Studies with expanded series cards
    const [loading, setLoading] = useState(true);
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
    React.useEffect(() => {
        const fetchStudies = async () => {
            if (cachedStudies) {
                setStudiesWithSeries(cachedStudies);
                setLoading(false);
                setTimeout(() => {
                    if (scrollRef.current) {
                        scrollRef.current.scrollTo(0, parseInt(sessionStorage.getItem('gallery-scroll') || '0', 10));
                    }
                }, 0);
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

    // Fetch series cards for each study (Smart Gallery Grouping)
    const fetchSeriesForStudies = async (studies) => {
        const results = await batchFetch(studies, async (study) => {
            try {
                const studyKey = study.folderName || study.id;
                const response = await fetch(`${PY_API_BASE}/gallery/${studyKey}`);
                if (!response.ok) return { ...study, series: [] };
                const data = await response.json();
                return { ...study, series: data.series || [], totalSeries: data.total_series || 0 };
            } catch {
                return { ...study, series: [] };
            }
        });
        const studiesWithSeriesData = results.map((r, i) =>
            r.status === 'fulfilled' ? r.value : { ...studies[i], series: [] }
        );
        setStudiesWithSeries(studiesWithSeriesData);
        if (onStudiesLoaded) onStudiesLoaded(studiesWithSeriesData);
        setTimeout(() => {
            if (scrollRef.current) {
                scrollRef.current.scrollTo(0, parseInt(sessionStorage.getItem('gallery-scroll') || '0', 10));
            }
        }, 0);
    };

    const filteredStudies = studiesWithSeries.filter(s =>
        s.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.patientIdDisplay.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Separate orphan studies (DB record exists but no files/series on disk)
    const orphanStudies = filteredStudies.filter(study => (!study.series || study.series.length === 0));
    const healthyStudies = filteredStudies.filter(study => study.series && study.series.length > 0);

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
            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="flex flex-col items-center gap-4 text-muted">
                        <AppIcon name="Loader2" size={40} className="animate-spin text-accent" />
                        <p>Loading studies...</p>
                    </div>
                </div>
            ) : error ? (
                <div className="flex justify-center py-20">
                    <div className="flex flex-col items-center gap-4 text-red-500 bg-red-50 p-6 rounded-xl border border-red-100">
                        <AppIcon name="AlertCircle" size={40} />
                        <p className="font-medium">Failed to load studies</p>
                        <p className="text-sm opacity-80 max-w-md text-center">{error}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="text-xs underline hover:text-red-700 mt-2"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            ) : viewMode === 'grid' && (
                <div className="space-y-4">
                    {/* Orphan Studies Warning — DB records with missing files */}
                    {orphanStudies.length > 0 && (
                        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <AppIcon name="AlertTriangle" size={18} className="text-amber-500" />
                                <span className="font-semibold text-amber-700 text-sm">
                                    {orphanStudies.length} orphan {orphanStudies.length === 1 ? 'study' : 'studies'} found
                                </span>
                                <span className="text-xs text-amber-500">— Files missing from disk. Delete to free storage.</span>
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

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {seriesCards.length === 0 && orphanStudies.length === 0 ? (
                            <div className="col-span-full flex flex-col items-center justify-center py-24 px-4 text-center rounded-3xl border-2 border-dashed border-primary/10 bg-surface/50">
                                <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mb-6 ring-8 ring-accent/5">
                                    <AppIcon name={searchQuery ? "SearchX" : "FolderOpen"} size={40} className="text-accent" />
                                </div>
                                <h3 className="text-xl font-semibold text-primary mb-2">
                                    {searchQuery ? "No matching results" : "No studies found"}
                                </h3>
                                <p className="text-secondary max-w-sm mb-8 text-sm leading-relaxed">
                                    {searchQuery
                                        ? `We couldn't find any studies matching "${searchQuery}". Try adjusting your filters.`
                                        : "Get started by uploading a patient's DICOM study or J. Morita dataset folder to the secure X-Core storage."}
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
                        ) : seriesCards.map(card => (
                            <div
                                key={card.id}
                                onClick={() => onSelectStudy({
                                    ...card.study,
                                    selectedSeriesUid: card.series_uid,
                                    selectedSeriesType: card.type
                                })}
                                className="group relative bg-surface-elevated rounded-2xl border border-primary/10 overflow-hidden hover:shadow-theme-lg transition cursor-pointer"
                            >
                                {/* Series Thumbnail (replaces generic icon) */}
                                <div className="aspect-video bg-gray-900 flex items-center justify-center relative overflow-hidden">
                                    <img
                                        src={card.thumbnailUrl}
                                        alt={card.title}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            // Fallback to icon if thumbnail fails
                                            e.target.style.display = 'none';
                                            e.target.nextSibling.style.display = 'flex';
                                        }}
                                    />
                                    <div className="absolute inset-0 items-center justify-center hidden">
                                        <AppIcon name={card.type === '3D Volume' ? 'Box' : 'Image'} size={48} className="text-gray-700" />
                                    </div>

                                    {/* Type Badge */}
                                    <span className="absolute top-2 left-2 px-2 py-1 bg-black/70 text-white text-xs rounded-md backdrop-blur-sm flex items-center gap-1">
                                        <AppIcon name={card.type === '3D Volume' ? 'Box' : 'Image'} size={12} />
                                        {card.type}
                                    </span>

                                    {/* Modality Badge */}
                                    <span className="absolute top-2 right-2 px-2 py-1 bg-black/50 text-white text-xs rounded-md backdrop-blur-sm">
                                        {card.modality}
                                    </span>

                                    {/* Slice Count */}
                                    {card.num_slices > 1 && (
                                        <span className="absolute bottom-2 right-2 px-2 py-1 bg-cyan-500/80 text-white text-xs rounded-md backdrop-blur-sm font-medium">
                                            {card.num_slices} slices
                                        </span>
                                    )}

                                    {card.study.status === 'Processing' && (
                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                            <div className="flex flex-col items-center gap-2">
                                                <AppIcon name="Loader2" size={24} className="text-accent animate-spin" />
                                                <span className="text-xs text-white font-medium">AI Analyzing...</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="p-4 space-y-2">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-semibold text-primary">{card.patientName}</h3>
                                            <p className="text-xs text-cyan-500 font-medium">{card.title}</p>
                                            <p className="text-xs text-secondary">{card.patientIdDisplay}</p>
                                        </div>
                                        <AppIcon name="ChevronRight" size={16} className="text-muted group-hover:text-accent transition-transform group-hover:translate-x-1" />
                                    </div>
                                    <div className="pt-2 border-t border-primary/10 flex justify-between items-center text-xs text-secondary">
                                        <span>{card.dateDisplay}</span>
                                        <div className="flex items-center gap-2">
                                            <span className={card.statusDisplay === 'Analyzed' ? 'text-emerald-500 font-medium' : 'text-amber-500'}>
                                                {card.statusDisplay}
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
                        ))}
                    </div>
                </div>
            )}

            {/* List View */}
            {viewMode === 'list' && (
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
