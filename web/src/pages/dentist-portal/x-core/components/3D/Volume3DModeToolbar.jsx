import React from 'react';
import AppIcon from '../../../../../components/AppIcon';

const stopUiEvent = (event) => {
  event.stopPropagation();
};

const ANNOTATION_COLOR_PALETTE = [
  '#E24B4A',
  '#f59e0b',
  '#22c55e',
  '#38bdf8',
  '#a78bfa',
  '#f472b6',
  '#ffffff',
  'custom',
];

export default function Volume3DModeToolbar({
  activeColor,
  annotateMode,
  annotationCustomColor,
  annotationPersistence,
  annotationCount = 0,
  annotationQualityScore,
  annotationTool,
  brushOperation,
  brushRadiusMm,
  canRedo = false,
  canUndo = false,
  clearAllAnnotations,
  clearMeasurements3D,
  deleteSelectedWorldAnnotation,
  heatmapOverlayMode,
  heatmapOpacity,
  setHeatmapOverlayMode,
  setHeatmapOpacity,
  handleRedo,
  handleUndoAnnotation,
  isWorldBrushAnnotation,
  measureMode3D,
  selectedWorldAnnotation,
  setActiveColor,
  setAnnotationTool,
  setBrushOperation,
  setBrushRadiusMm,
  setCustomAnnotationColor,
  setSelectedWorldAnnotationId,
  undoMeasurement3D,
}) {
  const customColorInputRef = React.useRef(null);
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
            disabled={!canUndo}
            className="rounded-xl bg-slate-800 p-1.5 text-slate-400 transition hover:bg-slate-700 hover:text-white"
            title="Undo last measurement"
          >
            <AppIcon name="Undo2" size={15} />
          </button>
          <button
            type="button"
            onPointerDown={stopUiEvent}
            onClick={handleRedo}
            disabled={!canRedo}
            className="rounded-xl bg-slate-800 p-1.5 text-slate-400 transition hover:bg-slate-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            title="Redo last change"
          >
            <AppIcon name="Redo2" size={15} />
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

          {['arrow', 'circle', 'text'].includes(annotationTool) && (
            <div className="ml-1 flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-900/70 p-1">
              {ANNOTATION_COLOR_PALETTE.map((hex) => {
                if (hex === 'custom') {
                  const customHex = annotationCustomColor || '#4fd1c5';
                  const isActive = activeColor === customHex;
                  return (
                    <React.Fragment key="custom">
                      <button
                        type="button"
                        onPointerDown={stopUiEvent}
                        onClick={() => customColorInputRef.current?.click()}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            customColorInputRef.current?.click();
                          }
                        }}
                        className={`relative h-5 w-5 rounded-full border-2 transition ${
                          isActive ? 'scale-110 border-white' : 'border-transparent hover:scale-105'
                        }`}
                        style={{ background: customHex }}
                        title={`Custom (${customHex})`}
                      >
                        <span className="absolute inset-0 rounded-full border border-slate-950/70" />
                      </button>
                      <input
                        ref={customColorInputRef}
                        type="color"
                        value={customHex}
                        onChange={(event) => {
                          const nextColor = event.target.value;
                          setCustomAnnotationColor?.(nextColor);
                          setActiveColor?.(nextColor);
                        }}
                        className="sr-only"
                        tabIndex={-1}
                        aria-hidden="true"
                      />
                    </React.Fragment>
                  );
                }
                return (
                  <button
                    key={hex}
                    type="button"
                    onPointerDown={stopUiEvent}
                    onClick={() => setActiveColor?.(hex)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        setActiveColor?.(hex);
                      }
                    }}
                    className={`h-5 w-5 rounded-full border-2 transition ${
                      activeColor === hex ? 'scale-110 border-white' : 'border-transparent hover:scale-105'
                    }`}
                    style={{ background: hex }}
                    title={hex}
                  />
                );
              })}
            </div>
          )}

          {annotationQualityScore && (
            <div className="ml-1 flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-2 py-1 text-[10px] text-slate-300">
              {(() => {
                const total = Math.max(0, Math.min(100, Number(annotationQualityScore.total) || 0));
                const color = total >= 80 ? '#22c55e' : total >= 50 ? '#f59e0b' : '#ef4444';
                const dims = annotationQualityScore.dimensions || {};
                const bars = [
                  ['Coverage', dims.coverage?.score || 0],
                  ['Severity', dims.severity?.score || 0],
                  ['Finding', dims.findingType?.score || 0],
                  ['Docs', dims.documentation?.score || 0],
                ];
                return (
                  <>
                    <svg className="h-8 w-8 shrink-0" viewBox="0 0 36 36" aria-label={`Quality ${total}/100`}>
                      <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(148,163,184,0.25)" strokeWidth="3" />
                      <circle
                        cx="18"
                        cy="18"
                        r="15"
                        fill="none"
                        stroke={color}
                        strokeWidth="3"
                        strokeDasharray={`${total} 100`}
                        pathLength="100"
                        strokeLinecap="round"
                        transform="rotate(-90 18 18)"
                      />
                      <text x="18" y="21" textAnchor="middle" className="fill-white text-[9px] font-bold">{total}</text>
                    </svg>
                    <div className="grid w-28 grid-cols-2 gap-x-2 gap-y-1">
                      {bars.map(([label, score]) => (
                        <div key={label} title={`${label}: ${score}/25`}>
                          <div className="mb-0.5 text-[8px] font-bold uppercase text-slate-500">{label}</div>
                          <div className="h-1 overflow-hidden rounded-full bg-slate-800">
                            <div className="h-full rounded-full" style={{ width: `${Math.min(100, (score / 25) * 100)}%`, background: color }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          <div className="ml-1 flex items-center gap-2 rounded-xl border border-violet-500/25 bg-violet-500/10 px-2 py-1 text-[11px] font-bold text-violet-100">
            <button
              type="button"
              onPointerDown={stopUiEvent}
              onClick={() => setHeatmapOverlayMode((current) => !current)}
              className={`flex items-center gap-1.5 rounded-lg px-2 py-1 transition ${heatmapOverlayMode ? 'bg-violet-500/80 text-white' : 'bg-slate-900/70 text-violet-300 hover:bg-slate-800 hover:text-white'}`}
              title="Toggle severity heatmap overlay"
            >
              <AppIcon name="Flame" size={13} />
              <span>Heatmap</span>
            </button>
            {heatmapOverlayMode && (
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.1"
                value={heatmapOpacity}
                onPointerDown={stopUiEvent}
                onChange={(e) => setHeatmapOpacity(parseFloat(e.target.value))}
                className="w-16 accent-violet-500 cursor-pointer"
                title={`Heatmap opacity: ${Math.round(heatmapOpacity * 100)}%`}
              />
            )}
          </div>

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
            disabled={!canUndo}
            className="rounded-xl bg-slate-800 p-1.5 text-slate-400 transition hover:bg-slate-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            title="Undo last annotation"
          >
            <AppIcon name="Undo2" size={15} />
          </button>
          <button
            type="button"
            onPointerDown={stopUiEvent}
            onClick={handleRedo}
            disabled={!canRedo}
            className="rounded-xl bg-slate-800 p-1.5 text-slate-400 transition hover:bg-slate-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            title="Redo last change"
          >
            <AppIcon name="Redo2" size={15} />
          </button>
          <button
            type="button"
            onPointerDown={stopUiEvent}
            onClick={clearAllAnnotations}
            className="relative rounded-xl bg-slate-800 p-1.5 text-slate-400 transition hover:bg-rose-900/60 hover:text-rose-200"
            title="Clear annotations"
          >
            <AppIcon name="Trash2" size={15} />
            {annotationCount > 0 && (
              <span className="absolute -right-1 -top-1 min-w-[14px] rounded-full bg-rose-500 px-1 text-center text-[9px] font-bold leading-[14px] text-white">
                {annotationCount > 99 ? '99+' : annotationCount}
              </span>
            )}
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
