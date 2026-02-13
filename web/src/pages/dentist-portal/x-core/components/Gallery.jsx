import React, { useState } from 'react';
import AppIcon from '../../../../components/AppIcon';
import { getAccessToken } from '../../../../utils/auth/tokenStorage';

const Gallery = ({ onSelectStudy, onUploadClick, refreshTrigger, onStudyDeleted }) => {
    const [viewMode, setViewMode] = useState('grid');
    const [searchQuery, setSearchQuery] = useState('');



    const [studies, setStudies] = useState([]);
    const [studiesWithSeries, setStudiesWithSeries] = useState([]); // Studies with expanded series cards
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch Studies from Backend
    React.useEffect(() => {
        const fetchStudies = async () => {
            setLoading(true);
            try {
                const token = getAccessToken();
                const response = await fetch('/api/v1/x-core/studies', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    const text = await response.text();
                    throw new Error(`Server Error: ${response.status} ${response.statusText} - ${text.substring(0, 100)}`);
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
                    throw new Error(`JSON Parse Error: ${e.message} - Response: ${text.substring(0, 50)}...`);
                }

            } catch (error) {
                console.error("[Gallery] Failed to fetch studies:", error);
                console.error("[Gallery] Error name:", error.name);
                console.error("[Gallery] Error message:", error.message);
                console.error("[Gallery] Error stack:", error.stack);
                setError(error.message);
            } finally {
                setLoading(false);
            }
        };
        fetchStudies();
    }, [refreshTrigger]);
    
    // Fetch series cards for each study (Smart Gallery Grouping)
    const fetchSeriesForStudies = async (studies) => {
        try {
            const studiesWithSeriesData = await Promise.all(
                studies.map(async (study) => {
                    try {
                        const studyKey = study.folderName || study.id;
                        const response = await fetch(`http://127.0.0.1:8000/gallery/${studyKey}`);
                        
                        if (!response.ok) {
                            console.warn(`Failed to fetch series for ${studyKey}`);
                            return { ...study, series: [] };
                        }
                        
                        const data = await response.json();
                        return { 
                            ...study, 
                            series: data.series || [],
                            totalSeries: data.total_series || 0
                        };
                    } catch (error) {
                        console.warn(`Error fetching series for study ${study.id}:`, error);
                        return { ...study, series: [] };
                    }
                })
            );
            
            setStudiesWithSeries(studiesWithSeriesData);
        } catch (error) {
            console.error("Error in fetchSeriesForStudies:", error);
            // Fallback to showing studies without series data
            setStudiesWithSeries(studies.map(s => ({ ...s, series: [] })));
        }
    };

    const filteredStudies = studiesWithSeries.filter(s =>
        s.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.patientIdDisplay.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    // Flatten to series cards for gallery display (Smart Series Grouping)
    const seriesCards = filteredStudies.flatMap(study => 
        (study.series || []).map(series => ({
            ...series,
            study: study,
            // Use series info to build card
            id: `${study.id}-${series.series_uid}`,
            patientName: study.patientName,
            patientIdDisplay: study.patientIdDisplay,
            dateDisplay: study.dateDisplay,
            statusDisplay: study.statusDisplay,
            thumbnailUrl: `http://127.0.0.1:8000/thumbnail/${study.folderName || study.id}/${series.series_uid}`
        }))
    );

    const handleDelete = async (e, study) => {
        e.stopPropagation(); // Prevent opening the study
        if (!window.confirm(`Are you sure you want to delete ${study.patientName}'s study? This action cannot be undone.`)) {
            return;
        }

        try {
            const token = getAccessToken();
            const response = await fetch(`/api/v1/x-core/studies/${study.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                if (onStudyDeleted) onStudyDeleted();
            }
        } catch (error) {
            console.error("Delete failed", error);
            alert("Failed to delete study");
        }
    };

    // We need to access onDelete from props if we change the signature, 
    // but to avoid breaking changes let's check if we can add it to the component definition above.
    // I will assume I can edit the component definition in a separate block or relying on the previous tool output.
    // Wait, I need to update the prop definition first.

    return (
        <div className="space-y-6">
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {seriesCards.length === 0 ? (
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
                                <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                    <button
                                        onClick={(e) => handleDelete(e, card.study)}
                                        className="p-2 bg-red-500/80 hover:bg-red-500 text-white rounded-lg backdrop-blur-sm shadow-sm"
                                        title="Delete Study"
                                    >
                                        <AppIcon name="Trash2" size={16} />
                                    </button>
                                </div>
                                <div className="pt-2 border-t border-primary/10 flex justify-between text-xs text-secondary">
                                    <span>{card.dateDisplay}</span>
                                    <span className={card.statusDisplay === 'Analyzed' ? 'text-emerald-500 font-medium' : 'text-amber-500'}>
                                        {card.statusDisplay}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
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
        </div>
    );
};

export default Gallery;
