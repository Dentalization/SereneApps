import React, { useMemo, useState } from 'react';
import AppIcon from '../../../../components/AppIcon';

const compactDateTime = (value) => {
  if (!value) return 'Unknown time';
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return String(value);
  }
};

const snapshotIds = (snapshot) => new Set((snapshot?.annotations || []).map((annotation) => annotation.id));

const buildDiffSummary = (a, b) => {
  if (!a || !b) return null;
  const aIds = snapshotIds(a);
  const bIds = snapshotIds(b);
  const byIdA = new Map((a.annotations || []).map((annotation) => [annotation.id, annotation]));
  const added = [...bIds].filter((id) => !aIds.has(id)).length;
  const removed = [...aIds].filter((id) => !bIds.has(id)).length;
  let modified = 0;
  bIds.forEach((id) => {
    if (aIds.has(id) && JSON.stringify(byIdA.get(id)) !== JSON.stringify((b.annotations || []).find((item) => item.id === id))) {
      modified += 1;
    }
  });
  return { added, removed, modified };
};

const AnnotationHistoryPanel = ({
  visible,
  snapshots = [],
  loading = false,
  selectedSnapshotId = '',
  onClose,
  onRefresh,
  onSelectSnapshot,
  onRestoreSnapshot,
  onDeleteSnapshot,
  onNewSession,
  onClearOverlay,
}) => {
  const [compareA, setCompareA] = useState('');
  const [compareB, setCompareB] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState('');
  const diffSummary = useMemo(
    () => buildDiffSummary(
      snapshots.find((snapshot) => snapshot.id === compareA),
      snapshots.find((snapshot) => snapshot.id === compareB)
    ),
    [compareA, compareB, snapshots]
  );

  if (!visible) return null;

  return (
    <aside className="absolute right-0 top-0 z-[95] flex h-full w-[320px] flex-col border-l border-slate-700 bg-slate-950/95 text-white shadow-2xl backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-slate-800 p-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">Annotation History</div>
          <div className="mt-1 text-xs text-slate-500">{snapshots.length} saved sessions</div>
        </div>
        <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white">
          <AppIcon name="X" size={16} />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 p-3">
        {typeof onNewSession === 'function' && (
          <button
            type="button"
            onClick={onNewSession}
            className="flex items-center gap-2 rounded-lg bg-cyan-500 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-300"
          >
            <AppIcon name="PlusCircle" size={14} />
            New Session
          </button>
        )}
        <button
          type="button"
          onClick={onRefresh}
          className="flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700"
        >
          <AppIcon name={loading ? 'Loader2' : 'RefreshCw'} size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
        {selectedSnapshotId && (
          <button
            type="button"
            onClick={onClearOverlay}
            className="rounded-lg bg-cyan-500/15 px-3 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/25"
          >
            Clear Overlay
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {snapshots.length === 0 && !loading && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-400">
            No saved annotation sessions yet. Use Save Session or New Session to create a restorable snapshot.
          </div>
        )}

        {snapshots.map((snapshot) => {
          const active = snapshot.id === selectedSnapshotId;
          return (
            <div
              key={snapshot.id}
              className={`mb-2 w-full rounded-xl border p-3 text-left transition ${
                active
                  ? 'border-cyan-400/50 bg-cyan-500/15'
                  : 'border-slate-800 bg-slate-900/70 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-white">{compactDateTime(snapshot.snapshot_at)}</span>
                <div className="flex items-center gap-1">
                  {snapshot.local && (
                    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-200">Local</span>
                  )}
                  <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">
                    {(snapshot.annotations || []).length} items
                  </span>
                </div>
              </div>
              <div className="mt-1 text-xs text-slate-400">{snapshot.note || 'No note'}</div>
              <div className="mt-3 grid grid-cols-3 gap-1">
                <button
                  type="button"
                  onClick={() => onSelectSnapshot?.(snapshot)}
                  className={`rounded-lg px-2 py-1.5 text-[10px] font-semibold transition ${
                    active
                      ? 'bg-cyan-500/25 text-cyan-100'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  Overlay
                </button>
                <button
                  type="button"
                  onClick={() => onRestoreSnapshot?.(snapshot)}
                  className="rounded-lg bg-emerald-500/15 px-2 py-1.5 text-[10px] font-semibold text-emerald-200 hover:bg-emerald-500/25"
                >
                  Restore
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (pendingDeleteId !== snapshot.id) {
                      setPendingDeleteId(snapshot.id);
                      return;
                    }
                    setPendingDeleteId('');
                    onDeleteSnapshot?.(snapshot);
                  }}
                  onBlur={() => {
                    window.setTimeout(() => {
                      setPendingDeleteId((current) => (current === snapshot.id ? '' : current));
                    }, 160);
                  }}
                  className={`rounded-lg px-2 py-1.5 text-[10px] font-semibold transition ${
                    pendingDeleteId === snapshot.id
                      ? 'bg-red-500 text-white'
                      : 'bg-red-500/10 text-red-300 hover:bg-red-500/20'
                  }`}
                >
                  {pendingDeleteId === snapshot.id ? 'Confirm' : 'Delete'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {snapshots.length >= 2 && (
        <div className="border-t border-slate-800 p-3">
          <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Diff two sessions</div>
          <div className="grid grid-cols-2 gap-2">
            <select value={compareA} onChange={(event) => setCompareA(event.target.value)} className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-white">
              <option value="">From</option>
              {snapshots.map((snapshot) => <option key={snapshot.id} value={snapshot.id}>{compactDateTime(snapshot.snapshot_at)}</option>)}
            </select>
            <select value={compareB} onChange={(event) => setCompareB(event.target.value)} className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-white">
              <option value="">To</option>
              {snapshots.map((snapshot) => <option key={snapshot.id} value={snapshot.id}>{compactDateTime(snapshot.snapshot_at)}</option>)}
            </select>
          </div>
          {diffSummary && (
            <div className="mt-2 grid grid-cols-3 gap-1 text-center text-[10px] font-semibold">
              <span className="rounded bg-emerald-500/15 px-2 py-1 text-emerald-300">+{diffSummary.added} added</span>
              <span className="rounded bg-red-500/15 px-2 py-1 text-red-300">-{diffSummary.removed} removed</span>
              <span className="rounded bg-amber-500/15 px-2 py-1 text-amber-300">{diffSummary.modified} modified</span>
            </div>
          )}
        </div>
      )}
    </aside>
  );
};

export default AnnotationHistoryPanel;
