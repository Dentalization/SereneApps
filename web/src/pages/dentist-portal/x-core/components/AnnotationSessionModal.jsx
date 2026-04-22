import React, { useEffect, useState } from 'react';
import AppIcon from '../../../../components/AppIcon';

const modeCopy = {
  save: {
    icon: 'Save',
    title: 'Save Annotation Session',
    eyebrow: 'SESSION SNAPSHOT',
    body: 'Create a snapshot of the current annotations and viewer state. This can be restored later from Annotation History.',
    confirm: 'Save Session',
  },
  new: {
    icon: 'PlusCircle',
    title: 'Start New Session',
    eyebrow: 'CLEAR CURRENT WORKSPACE',
    body: 'Start with a blank annotation workspace. Current annotations and measurements will be cleared after optional snapshot save.',
    confirm: 'Start New',
  },
};

const AnnotationSessionModal = ({
  visible,
  mode = 'save',
  annotationCount = 0,
  measurementCount = 0,
  loading = false,
  error = '',
  onClose,
  onConfirm,
}) => {
  const [note, setNote] = useState('');
  const [saveBeforeClear, setSaveBeforeClear] = useState(true);
  const copy = modeCopy[mode] || modeCopy.save;

  useEffect(() => {
    if (!visible) return;
    setNote('');
    setSaveBeforeClear(true);
  }, [visible, mode]);

  if (!visible) return null;

  const hasWork = annotationCount > 0 || measurementCount > 0;

  return (
    <div className="absolute inset-0 z-[130] flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-md">
      <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-700 bg-slate-950 text-white shadow-2xl">
        <div className="border-b border-slate-800 bg-slate-900/80 p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl border border-cyan-400/30 bg-cyan-400/10 p-3 text-cyan-300">
                <AppIcon name={copy.icon} size={22} />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-cyan-300">{copy.eyebrow}</div>
                <h3 className="mt-1 text-lg font-bold text-white">{copy.title}</h3>
                <p className="mt-1 text-sm leading-5 text-slate-400">{copy.body}</p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white">
              <AppIcon name="X" size={18} />
            </button>
          </div>
        </div>

        <div className="space-y-4 p-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Annotations</div>
              <div className="mt-1 font-mono text-2xl font-bold text-white">{annotationCount}</div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Measurements</div>
              <div className="mt-1 font-mono text-2xl font-bold text-white">{measurementCount}</div>
            </div>
          </div>

          {mode === 'new' && (
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3">
              <input
                type="checkbox"
                checked={saveBeforeClear}
                disabled={!hasWork}
                onChange={(event) => setSaveBeforeClear(event.target.checked)}
                className="mt-1 accent-amber-400"
              />
              <span>
                <span className="block text-sm font-semibold text-amber-100">Save snapshot before clearing</span>
                <span className="block text-xs leading-5 text-amber-200/70">Recommended. Keeps a restorable copy in Annotation History.</span>
              </span>
            </label>
          )}

          {(mode === 'save' || saveBeforeClear) && (
            <label className="block">
              <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Session note</span>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={3}
                placeholder="Example: Initial review, implant planning, follow-up comparison..."
                className="w-full resize-none rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400"
                autoFocus
              />
            </label>
          )}

          {error && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-800 bg-slate-900/60 p-4">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800 hover:text-white">
            Cancel
          </button>
          <button
            type="button"
            disabled={loading || (!hasWork && mode === 'save')}
            onClick={() => onConfirm?.({ note, saveBeforeClear })}
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-500"
          >
            <AppIcon name={loading ? 'Loader2' : copy.icon} size={16} className={loading ? 'animate-spin' : ''} />
            {copy.confirm}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnnotationSessionModal;
