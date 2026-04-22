import React, { useEffect, useState } from 'react';
import AppIcon from '../../../../components/AppIcon';

function getAnatomyBounds(values, dims, spacing) {
    const [nx, ny, nz] = dims;
    const sx = Math.max(Number(spacing[0]) || 1, 0.1);
    const sy = Math.max(Number(spacing[1]) || 1, 0.1);
    const sz = Math.max(Number(spacing[2]) || 1, 0.1);
    const marginX = Math.max(12, Math.round(32 / sx));
    const marginY = Math.max(12, Math.round(32 / sy));
    const marginZ = Math.max(6, Math.round(18 / sz));
    const boneThreshold = 0.34;
    let minX = nx;
    let minY = ny;
    let minZ = nz;
    let maxX = -1;
    let maxY = -1;
    let maxZ = -1;

    for (let z = 0; z < nz; z += 1) {
        const zOffset = nx * ny * z;
        for (let y = 0; y < ny; y += 1) {
            const rowOffset = zOffset + nx * y;
            for (let x = 0; x < nx; x += 1) {
                if (values[rowOffset + x] < boneThreshold) continue;
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
                if (z < minZ) minZ = z;
                if (z > maxZ) maxZ = z;
            }
        }
    }

    if (maxX < 0) {
        return { x0: 0, x1: nx - 1, y0: 0, y1: ny - 1, z0: Math.floor(nz * 0.4), z1: nz - 1 };
    }

    return {
        x0: Math.max(0, minX - marginX),
        x1: Math.min(nx - 1, maxX + marginX),
        y0: Math.max(0, minY - marginY),
        y1: Math.min(ny - 1, maxY + marginY),
        z0: Math.max(Math.floor(nz * 0.4), minZ - marginZ),
        z1: Math.min(nz - 1, maxZ + marginZ),
    };
}

/**
 * Estimates sinus air volume from the loaded VTK image data.
 * Air threshold: normalized value < 0.09 (roughly HU < -640).
 * Only an anatomy-derived superior ROI is counted to avoid scan-cylinder air.
 */
const SinusVolumePanel = ({ imageData, visible }) => {
    const [volumeMl, setVolumeMl] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!visible || !imageData) return undefined;

        setLoading(true);
        const timer = setTimeout(() => {
            try {
                const scalars = imageData.getPointData().getScalars();
                const values = scalars.getData();
                const dims = imageData.getDimensions();
                const spacing = imageData.getSpacing();
                const roi = getAnatomyBounds(values, dims, spacing);
                const airThreshold = 0.09;
                let airVoxels = 0;

                for (let z = roi.z0; z <= roi.z1; z += 1) {
                    for (let y = roi.y0; y <= roi.y1; y += 1) {
                        for (let x = roi.x0; x <= roi.x1; x += 1) {
                            const idx = x + dims[0] * (y + dims[1] * z);
                            if (values[idx] < airThreshold) {
                                airVoxels += 1;
                            }
                        }
                    }
                }

                const voxelVolumeMm3 = spacing[0] * spacing[1] * spacing[2];
                setVolumeMl((airVoxels * voxelVolumeMm3) / 1000);
            } catch (err) {
                console.warn('[SinusVolumePanel] Computation failed:', err);
                setVolumeMl(null);
            } finally {
                setLoading(false);
            }
        }, 0);

        return () => clearTimeout(timer);
    }, [imageData, visible]);

    if (!visible) return null;

    return (
        <div className="bg-black/75 backdrop-blur-md rounded-xl p-3 border border-white/10 shadow-2xl">
            <div className="flex items-center gap-2 mb-3">
                <AppIcon name="Wind" size={14} className="text-blue-400" />
                <span className="text-xs font-semibold text-white uppercase tracking-wider">Sinus Air Volume</span>
            </div>

            {loading ? (
                <div className="flex items-center gap-2 text-xs text-slate-400">
                    <AppIcon name="Loader2" size={12} className="animate-spin text-blue-400" />
                    Computing...
                </div>
            ) : volumeMl !== null ? (
                <>
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl font-mono font-bold text-blue-300">{volumeMl.toFixed(1)}</span>
                        <span className="text-xs text-slate-400">mL</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">
                        Superior anatomical ROI estimate. Normal bilateral maxillary is roughly 15-30 mL total.
                    </p>
                    {volumeMl < 8 && (
                        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-amber-300 bg-amber-500/10 rounded-lg px-2 py-1 border border-amber-500/20">
                            <AppIcon name="AlertTriangle" size={11} />
                            Low air volume - possible mucosal thickening
                        </div>
                    )}
                </>
            ) : (
                <p className="text-xs text-slate-500">Unavailable</p>
            )}
        </div>
    );
};

export default SinusVolumePanel;
