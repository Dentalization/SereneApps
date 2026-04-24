import React from 'react';
import AppIcon from '../../../../../components/AppIcon';

const stopUiEvent = (event) => {
  event.stopPropagation();
};

export default function Volume3DModeToolbar({
  annotateMode,
  annotationPersistence,
  annotationTool,
  brushOperation,
  brushRadiusMm,
  clearAllAnnotations,
  clearMeasurements3D,
  deleteSelectedWorldAnnotation,
  handleUndoAnnotation,
  isWorldBrushAnnotation,
  measureMode3D,
  selectedWorldAnnotation,
  setAnnotationTool,
  setBrushOperation,
  setBrushRadiusMm,
  setSelectedWorldAnnotationId,
  undoMeasurement3D,
}) {
  if (!measureMode3D && !annotateMode) return null;

  return (
    <div
      data-xcore-ui="true"
      onPointerDown={stopUiEvent}
      onPointerMove={stopUiEvent}
      onPointerUp={stopUiEvent}
      onClick={stopUiEvent}
      onWheel={stopUiEvent}
      className="flex w-fit max-w-full flex-wrap items-center justify-center gap-1.5 rounded-2xl border border-slate-700 bg-slate-950/90 p-1.5 shadow-2xl backdrop-blur"
    >
      {measureMode3D && (
        <>
          <span className="rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-3 py-1.5 text-[11px] font-bold text-emerald-200">
            Distance
          </span>
          <button
            type="button"
            onPointerDown={stopUiEvent}
            onClick={undoMeasurement3D}
            className="rounded-xl bg-slate-800 p-1.5 text-slate-400 transition hover:bg-slate-700 hover:text-white"
            title="Undo last measurement"
          >
            <AppIcon name="Undo2" size={15} />
          </button>
          <button
            type="button"
            onPointerDown={stopUiEvent}
            onClick={clearMeasurements3D}
            className="rounded-xl bg-slate-800 p-1.5 text-slate-400 transition hover:bg-slate-700 hover:text-white"
            title="Clear measurements"
          >
            <AppIcon name="Trash2" size={15} />
          </button>
        </>
      )}

      {annotateMode && (
        <>
          {[
            ['select', 'MousePointer2', 'Select'],
            ['arrow', 'ArrowRight', 'Arrow'],
            ['circle', 'Circle', 'Circle'],
            ['freehand', 'PenLine', 'Surface'],
            ['brush', 'Paintbrush', 'Brush'],
            ['text', 'Type', 'Text'],
          ].map(([toolName, iconName, label]) => (
            <button
              key={toolName}
              type="button"
              onPointerDown={stopUiEvent}
              onClick={() => setAnnotationTool(toolName)}
              className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11px] font-bold transition ${
                annotationTool === toolName
                  ? 'border border-rose-500/40 bg-rose-500/20 text-rose-200'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
              }`}
              title={`${label} annotation`}
            >
              <AppIcon name={iconName} size={14} />
              <span>{label}</span>
            </button>
          ))}

          {annotationTool === 'brush' && (
            <div className="ml-1 flex items-center gap-1 rounded-xl border border-cyan-500/25 bg-cyan-500/10 p-1 text-[11px] font-bold text-cyan-100">
              <button
                type="button"
                onPointerDown={stopUiEvent}
                onClick={() => setBrushOperation('add')}
                className={`rounded-lg px-2 py-1 transition ${brushOperation === 'add' ? 'bg-cyan-400 text-slate-950' : 'bg-slate-900/70 text-cyan-200 hover:bg-slate-800 hover:text-white'}`}
                title="Add to selected segment or create a new one"
              >
                Add
              </button>
              <button
                type="button"
                onPointerDown={stopUiEvent}
                onClick={() => setBrushOperation('subtract')}
                className={`rounded-lg px-2 py-1 transition ${brushOperation === 'subtract' ? 'bg-rose-400 text-slate-950' : 'bg-slate-900/70 text-cyan-200 hover:bg-slate-800 hover:text-white'}`}
                title="Subtract from selected segment or intersecting brush segments"
              >
                Subtract
              </button>
            </div>
          )}

          {annotationTool === 'brush' && (
            <div className="ml-1 flex items-center gap-1 rounded-xl border border-amber-500/25 bg-amber-500/10 px-1.5 py-1 text-[11px] font-bold text-amber-100">
              <button
                type="button"
                onPointerDown={stopUiEvent}
                onClick={() => setBrushRadiusMm((current) => Math.max(0.8, Number((current - 0.2).toFixed(2))))}
                className="rounded-lg bg-slate-900/70 p-1 text-amber-200 transition hover:bg-slate-800 hover:text-white"
                title="Decrease brush radius"
              >
                <AppIcon name="Minus" size={13} />
              </button>
              <span className="min-w-[4.5rem] text-center font-mono">{brushRadiusMm.toFixed(1)} mm</span>
              <button
                type="button"
                onPointerDown={stopUiEvent}
                onClick={() => setBrushRadiusMm((current) => Math.min(8, Number((current + 0.2).toFixed(2))))}
                className="rounded-lg bg-slate-900/70 p-1 text-amber-200 transition hover:bg-slate-800 hover:text-white"
                title="Increase brush radius"
              >
                <AppIcon name="Plus" size={13} />
              </button>
            </div>
          )}

          {selectedWorldAnnotation && (
            <div className="ml-1 flex items-center gap-1 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-1.5 py-1 text-[11px] font-bold text-emerald-100">
              <span className="max-w-[9rem] truncate px-1">
                {isWorldBrushAnnotation(selectedWorldAnnotation) ? 'Brush segment selected' : '3D segment selected'}
              </span>
              <button
                type="button"
                onPointerDown={stopUiEvent}
                onClick={() => setSelectedWorldAnnotationId(null)}
                className="rounded-lg bg-slate-900/70 p-1 text-emerald-200 transition hover:bg-slate-800 hover:text-white"
                title="Clear selection"
              >
                <AppIcon name="X" size={13} />
              </button>
              <button
                type="button"
                onPointerDown={stopUiEvent}
                onClick={deleteSelectedWorldAnnotation}
                className="rounded-lg bg-slate-900/70 p-1 text-rose-200 transition hover:bg-slate-800 hover:text-white"
                title="Delete selected 3D annotation"
              >
                <AppIcon name="Trash2" size={13} />
              </button>
            </div>
          )}

          <button
            type="button"
            onPointerDown={stopUiEvent}
            onClick={handleUndoAnnotation}
            className="rounded-xl bg-slate-800 p-1.5 text-slate-400 transition hover:bg-slate-700 hover:text-white"
            title="Undo last annotation"
          >
            <AppIcon name="Undo2" size={15} />
          </button>
          <button
            type="button"
            onPointerDown={stopUiEvent}
            onClick={clearAllAnnotations}
            className="rounded-xl bg-slate-800 p-1.5 text-slate-400 transition hover:bg-slate-700 hover:text-white"
            title="Clear annotations"
          >
            <AppIcon name="Trash2" size={15} />
          </button>
          {annotationPersistence?.saving && (
            <span className="px-2 text-[10px] font-mono uppercase tracking-wider text-cyan-300">Saving</span>
          )}
          {annotationPersistence?.error && (
            <span
              className="px-2 text-[10px] font-mono uppercase tracking-wider text-amber-300"
              title={annotationPersistence.error.message || 'Backend save failed; local cache is active'}
            >
              Local
            </span>
          )}
        </>
      )}
    </div>
  );
}
