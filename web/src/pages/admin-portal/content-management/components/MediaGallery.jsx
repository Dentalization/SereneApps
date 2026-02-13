import React from 'react';
import AppIcon from '../../../../components/AppIcon';

const MediaGallery = () => {
    const assets = [
        { id: 1, name: 'X-Ray Template.png', type: 'image', size: '2.4 MB', date: 'Oct 24', dim: '1920x1080' },
        { id: 2, name: 'Clinic Tour.mp4', type: 'video', size: '45 MB', date: 'Oct 22', dim: '1080p' },
        { id: 3, name: 'Logo Vector.svg', type: 'vector', size: '120 KB', date: 'Oct 20', dim: '-' },
        { id: 4, name: 'Staff Photo.jpg', type: 'image', size: '5.1 MB', date: 'Oct 18', dim: '4000x3000' },
        { id: 5, name: 'Banner.png', type: 'image', size: '1.2 MB', date: 'Oct 15', dim: '1200x400' },
        { id: 6, name: 'Patient Guide.pdf', type: 'document', size: '3.5 MB', date: 'Oct 10', dim: '8 pages' },
    ];

    const getIcon = (type) => {
        switch (type) {
            case 'image': return 'Image';
            case 'video': return 'Film';
            case 'vector': return 'PenTool';
            case 'document': return 'FileText';
            default: return 'File';
        }
    };

    const getColor = (type) => {
        switch (type) {
            case 'image': return 'text-purple-500 bg-purple-500/10';
            case 'video': return 'text-rose-500 bg-rose-500/10';
            case 'vector': return 'text-orange-500 bg-orange-500/10';
            case 'document': return 'text-blue-500 bg-blue-500/10';
            default: return 'text-slate-500 bg-slate-500/10';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-surface-elevated border border-primary/10 rounded-2xl p-4">
                <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                    <AppIcon name="Grid" size={20} className="text-indigo-500" />
                    Imaging Center
                </h3>
                <div className="flex gap-2">
                    <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium shadow-sm hover:bg-indigo-700 transition-colors">
                        <AppIcon name="Upload" size={16} />
                        Upload Asset
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {assets.map((asset) => (
                    <div key={asset.id} className="group bg-surface-elevated border border-primary/10 rounded-2xl overflow-hidden hover:shadow-lg transition-all cursor-pointer relative">
                        {/* Preview Area (Placeholder) */}
                        <div className="aspect-square bg-surface border-b border-primary/5 flex items-center justify-center relative overflow-hidden group-hover:bg-surface-elevated transition-colors">
                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${getColor(asset.type)} mb-2 group-hover:scale-110 transition-transform duration-300`}>
                                <AppIcon name={getIcon(asset.type)} size={32} />
                            </div>

                            {/* Overlay Actions */}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[2px]">
                                <button className="p-2 rounded-xl bg-white/90 text-primary hover:scale-110 transition-transform shadow-lg">
                                    <AppIcon name="Download" size={18} />
                                </button>
                                <button className="p-2 rounded-xl bg-white/90 text-rose-600 hover:scale-110 transition-transform shadow-lg">
                                    <AppIcon name="Trash2" size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Metadata Footer */}
                        <div className="p-4">
                            <h4 className="font-bold text-primary text-sm truncate mb-1" title={asset.name}>{asset.name}</h4>
                            <div className="flex justify-between items-center text-xs text-secondary">
                                <span className="font-mono bg-primary/5 px-1.5 py-0.5 rounded">{asset.type}</span>
                                <span>{asset.size}</span>
                            </div>
                            <div className="mt-2 pt-2 border-t border-primary/5 flex justify-between items-center text-[10px] text-secondary/70">
                                <span>{asset.dim}</span>
                                <span>{asset.date}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MediaGallery;
