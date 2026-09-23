import React, { memo } from 'react';
import AppIcon from '../../../../../components/AppIcon';
import { TOOLS } from './scan3DMeasurements.mjs';

/**
 * Scan3DMeasurementToolbar
 *
 * Floating pill toolbar for the 3D scan mesh viewer.
 * Appears in the bottom-left alongside the existing view/render controls.
 * Matches the existing toolbar style in Scan3DMeshViewer exactly.
 */
const Scan3DMeasurementToolbar = memo(function Scan3DMeasurementToolbar({
  activeTool,
  canUndo,
  hasMeasurements,
  measurementCount,
  onSetTool,
  onUndo,
  onClearAll,
}) {
  const btnBase = 'flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold rounded-xl transition';
  const btnActive = 'bg-cyan-500 text-white shadow-md shadow-cyan-500/25';
  const btnInactive = 'text-slate-300 hover:text-white hover:bg-slate-800/80';

  const toggleTool = (tool) => {
    onSetTool?.(activeTool === tool ? TOOLS.NONE : tool);
  };

  return (
    <div className="flex items-center bg-slate-900/85 backdrop-blur border border-slate-700/60 rounded-xl p-1 shadow-lg gap-0.5">
      {/* Separator label */}
      <span className="px-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider select-none">
        Ukur
      </span>

      {/* Distance tool */}
      <button
        onClick={() => toggleTool(TOOLS.DISTANCE)}
        className={`${btnBase} ${activeTool === TOOLS.DISTANCE ? btnActive : btnInactive}`}
        title="Ukur Jarak (klik 2 titik)"
        aria-pressed={activeTool === TOOLS.DISTANCE}
      >
        <AppIcon name="Ruler" size={13} />
        <span>Jarak</span>
      </button>

      {/* Point annotation tool */}
      <button
        onClick={() => toggleTool(TOOLS.POINT)}
        className={`${btnBase} ${activeTool === TOOLS.POINT ? btnActive : btnInactive}`}
        title="Tandai Titik Klinis"
        aria-pressed={activeTool === TOOLS.POINT}
      >
        <AppIcon name="MapPin" size={13} />
        <span>Titik</span>
      </button>

      {/* Text annotation tool */}
      <button
        onClick={() => toggleTool(TOOLS.TEXT)}
        className={`${btnBase} ${activeTool === TOOLS.TEXT ? btnActive : btnInactive}`}
        title="Tambah Catatan Teks"
        aria-pressed={activeTool === TOOLS.TEXT}
      >
        <AppIcon name="Type" size={13} />
        <span>Teks</span>
      </button>

      {/* Divider */}
      {(canUndo || hasMeasurements) && (
        <div className="mx-1 h-4 w-px bg-slate-700" aria-hidden="true" />
      )}

      {/* Undo */}
      {canUndo && (
        <button
          onClick={onUndo}
          className={`${btnBase} ${btnInactive}`}
          title="Batalkan Terakhir"
        >
          <AppIcon name="Undo2" size={13} />
        </button>
      )}

      {/* Clear all — only show when measurements exist */}
      {hasMeasurements && (
        <button
          onClick={onClearAll}
          className={`${btnBase} text-rose-400 hover:text-rose-300 hover:bg-rose-500/10`}
          title={`Hapus Semua (${measurementCount})`}
        >
          <AppIcon name="Trash2" size={13} />
          {measurementCount > 0 && (
            <span className="tabular-nums">{measurementCount}</span>
          )}
        </button>
      )}
    </div>
  );
});

export default Scan3DMeasurementToolbar;
