import React, { useState, useEffect } from 'react';
import AppIcon from '../../../../components/AppIcon';
import { PY_API_BASE } from '../../../../config/api';

/**
 * SeriesSidebar — Reusable series selection panel
 * 
 * Shows all series in a study with thumbnails, metadata, and type badges.
 * Used in both VolumeViewer3D and Viewer3D (slice view).
 * 
 * Features:
 * - Auto-fetches series list from /gallery/{study_id}
 * - Shows thumbnail, modality, description, slice count
 * - Highlights current selection
 * - Smart default: auto-selects series with most slices
 * - Collapsible drawer design
 */
const SeriesSidebar = ({
    study,
    currentSeriesUid,
    onSelectSeries,
    visible,
    onClose,
    position = 'right', // 'left' or 'right'
}) => {
    const [seriesList, setSeriesList] = useState([]);
    const [loading, setLoading] = useState(true);

    const studyKey = study?.folderName || study?.id || '';

    // Fetch series list
    useEffect(() => {
        if (!studyKey) return;

        const fetchSeries = async () => {
            setLoading(true);
            try {
                const res = await fetch(`${PY_API_BASE}/gallery/${studyKey}`);
                if (!res.ok) throw new Error('Failed to fetch series');
                const data = await res.json();
                setSeriesList(data.series || []);
            } catch (err) {
                console.error('[SeriesSidebar] Fetch error:', err);
                setSeriesList([]);
            } finally {
                setLoading(false);
            }
        };

        fetchSeries();
    }, [studyKey]);

    if (!visible) return null;

    const posClass = position === 'left'
        ? 'left-0 border-r'
        : 'right-0 border-l';

    return (
        <div className={`absolute ${posClass} top-0 bottom-0 w-72 bg-slate-900/98 backdrop-blur-lg border-slate-700/50 z-30 flex flex-col shadow-2xl`}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                    <AppIcon name="Layers" size={16} className="text-cyan-400" />
                    <span className="text-sm font-semibold text-white uppercase tracking-wider">
                        Series ({seriesList.length})
                    </span>
                </div>
                <button
                    onClick={onClose}
                    className="p-1.5 hover:bg-slate-800 rounded-lg text-gray-400 hover:text-white transition"
                >
                    <AppIcon name="X" size={16} />
                </button>
            </div>

            {/* Series List */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-8 gap-3">
                        <AppIcon name="Loader2" size={24} className="animate-spin text-cyan-400" />
                        <span className="text-xs text-gray-500">Loading series...</span>
                    </div>
                ) : seriesList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 gap-3 text-gray-500">
                        <AppIcon name="FolderOpen" size={32} />
                        <span className="text-xs">No series found</span>
                    </div>
                ) : (
                    seriesList.map((series) => {
                        const isActive = series.series_uid === currentSeriesUid;
                        const is3D = series.type === '3D Volume';
                        const thumbUrl = `${PY_API_BASE}/thumb/${studyKey}/${series.series_uid}`;

                        return (
                            <button
                                key={series.series_uid}
                                onClick={() => onSelectSeries(series)}
                                className={`w-full rounded-xl border overflow-hidden transition-all text-left ${isActive
                                        ? 'bg-cyan-500/10 border-cyan-500/40 ring-1 ring-cyan-500/30'
                                        : 'bg-slate-800/60 border-slate-700/50 hover:bg-slate-800 hover:border-slate-600'
                                    }`}
                            >
                                {/* Thumbnail */}
                                <div className="relative aspect-[16/10] bg-black/50 overflow-hidden">
                                    <img
                                        src={thumbUrl}
                                        alt={series.title}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                        }}
                                    />

                                    {/* Type Badge */}
                                    <span className={`absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 backdrop-blur-sm ${is3D
                                            ? 'bg-cyan-500/80 text-white'
                                            : 'bg-purple-500/80 text-white'
                                        }`}>
                                        <AppIcon name={is3D ? 'Box' : 'Image'} size={10} />
                                        {is3D ? '3D' : '2D'}
                                    </span>

                                    {/* Modality Badge */}
                                    <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded text-[9px] font-medium bg-black/60 text-gray-300 backdrop-blur-sm">
                                        {series.modality}
                                    </span>

                                    {/* Slice Count */}
                                    {series.num_slices > 1 && (
                                        <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded text-[9px] font-mono bg-black/70 text-cyan-400 backdrop-blur-sm">
                                            {series.num_slices} slices
                                        </span>
                                    )}

                                    {/* Active indicator */}
                                    {isActive && (
                                        <div className="absolute bottom-1.5 left-1.5">
                                            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-cyan-500 text-white">
                                                <AppIcon name="Check" size={8} />
                                                Active
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Info */}
                                <div className="px-3 py-2">
                                    <div className={`text-xs font-medium truncate ${isActive ? 'text-cyan-400' : 'text-white'}`}>
                                        {series.title || 'Unknown Series'}
                                    </div>
                                    <div className="text-[10px] text-gray-500 mt-0.5">
                                        Series #{series.series_number}
                                        {series.has_vti && ' • VTI Ready'}
                                        {series.has_image && ' • Image Ready'}
                                    </div>
                                </div>
                            </button>
                        );
                    })
                )}
            </div>

            {/* Footer hint */}
            <div className="px-4 py-2 border-t border-slate-800 text-center">
                <span className="text-[10px] text-gray-600">
                    Click a series to switch view
                </span>
            </div>
        </div>
    );
};

export default SeriesSidebar;
