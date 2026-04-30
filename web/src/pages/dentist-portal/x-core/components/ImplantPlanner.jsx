import React from 'react';

import AppIcon from '../../../../components/AppIcon';

const IMPLANT_BRANDS = ['Straumann', 'Nobel', 'Osstem'];
const IMPLANT_DIAMETERS = [3.3, 3.75, 4.1, 4.5, 5.0];
const IMPLANT_LENGTHS = [8, 10, 11.5, 13, 16];

const ImplantPlanner = ({
    brand,
    diameter,
    length,
    placementCount,
    placeMode,
    onBrandChange,
    onDiameterChange,
    onLengthChange,
    onTogglePlaceMode,
    onClear,
    hasCollisions = false,
    hasBoundaryWarnings = false,
    safetyZonesVisible = true,
    onToggleSafetyZones,
}) => (
    <div className="bg-black/75 backdrop-blur-md rounded-xl p-3 border border-white/10 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <AppIcon name="CircleDotDashed" size={14} className="text-sky-300" />
                <span className="text-xs font-semibold uppercase tracking-wider text-white">Implant Plan</span>
            </div>
            <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">{placementCount}</span>
        </div>

        <label className="mb-2 block text-[10px] uppercase tracking-wide text-slate-500">
            Brand
            <select
                value={brand}
                onChange={(event) => onBrandChange(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-white outline-none"
            >
                {IMPLANT_BRANDS.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
        </label>

        <div className="grid grid-cols-2 gap-2">
            <label className="block text-[10px] uppercase tracking-wide text-slate-500">
                Diameter
                <select
                    value={diameter}
                    onChange={(event) => onDiameterChange(Number(event.target.value))}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-white outline-none"
                >
                    {IMPLANT_DIAMETERS.map((item) => <option key={item} value={item}>{item}mm</option>)}
                </select>
            </label>
            <label className="block text-[10px] uppercase tracking-wide text-slate-500">
                Length
                <select
                    value={length}
                    onChange={(event) => onLengthChange(Number(event.target.value))}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-white outline-none"
                >
                    {IMPLANT_LENGTHS.map((item) => <option key={item} value={item}>{item}mm</option>)}
                </select>
            </label>
        </div>

        <button
            onClick={onTogglePlaceMode}
            className={'mt-3 w-full rounded-lg px-3 py-2 text-xs font-semibold transition ' + (
                placeMode
                    ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            )}
        >
            {placeMode ? 'Click Bone Surface to Place' : 'Place Implant'}
        </button>

        <button
            type="button"
            onClick={onToggleSafetyZones}
            className={'mt-2 flex w-full items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide transition ' + (
                safetyZonesVisible
                    ? 'border border-sky-400/30 bg-sky-400/15 text-sky-200'
                    : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white'
            )}
        >
            <AppIcon name="ShieldCheck" size={12} />
            Safety Zones
        </button>

        {hasCollisions && (
            <div className="mt-2 rounded-lg bg-rose-500/20 border border-rose-500/40 px-2 py-1.5 flex items-start gap-2">
                <AppIcon name="AlertTriangle" size={12} className="text-rose-400 mt-0.5 shrink-0" />
                <span className="text-[10px] text-rose-200 font-medium leading-tight">
                    Collision detected. Implants are too close.
                </span>
            </div>
        )}

        {hasBoundaryWarnings && (
            <div className="mt-2 rounded-lg bg-amber-500/20 border border-amber-500/40 px-2 py-1.5 flex items-start gap-2">
                <AppIcon name="AlertTriangle" size={12} className="text-amber-300 mt-0.5 shrink-0" />
                <span className="text-[10px] text-amber-100 font-medium leading-tight">
                    Safety zone reaches the volume boundary.
                </span>
            </div>
        )}

        {placementCount > 0 && (
            <button
                onClick={onClear}
                className="mt-2 w-full rounded-lg bg-slate-900 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400 transition hover:bg-slate-800 hover:text-white"
            >
                Clear Implants
            </button>
        )}
    </div>
);

export default ImplantPlanner;
