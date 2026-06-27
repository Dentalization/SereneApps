import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  Archive,
  Calendar,
  CheckCircle2,
  Clock3,
  FileText,
  Image as ImageIcon,
  Link2,
  Loader2,
  MessageSquare,
  Plus,
  Search,
  X,
} from 'lucide-react';
import {
  CASE_HISTORY_FILTERS,
  filterClinicalHistoryItems,
  getCaseStatusMeta,
} from './caseWorkspaceModels.mjs';

const FILTER_LABELS = {
  all: 'All',
  draft: 'Draft',
  pending_review: 'Pending review',
  verified: 'Verified',
  exported: 'Exported',
  has_images: 'Has images',
  low_quality: 'Low quality',
};

function formatTimestamp(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// Calendar-day comparison — avoids the Math.ceil duration bug where a session
// created at 11pm yesterday shows up as "Today" if viewed before noon today.
function groupItemsByDate(items, dateGroupLabels = {}) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const startOf7DaysAgo = new Date(startOfToday);
  startOf7DaysAgo.setDate(startOf7DaysAgo.getDate() - 7);

  const groups = [
    { key: 'today', label: dateGroupLabels.today || 'Hari Ini', items: [] },
    { key: 'yesterday', label: dateGroupLabels.yesterday || 'Kemarin', items: [] },
    { key: 'week', label: dateGroupLabels.week || '7 Hari Terakhir', items: [] },
    { key: 'older', label: dateGroupLabels.older || 'Lebih Lama', items: [] },
  ];

  for (const item of items) {
    const d = new Date(item.updatedAt || item.createdAt || item.timestamp || 0);
    if (d >= startOfToday) groups[0].items.push(item);
    else if (d >= startOfYesterday) groups[1].items.push(item);
    else if (d >= startOf7DaysAgo) groups[2].items.push(item);
    else groups[3].items.push(item);
  }

  return groups.filter((g) => g.items.length > 0);
}

function StatusBadge({ status }) {
  const meta = getCaseStatusMeta(status);
  const toneClass = {
    slate: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    blue: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
    cyan: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800',
    amber: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
    violet: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800',
    rose: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
  }[meta.tone || 'slate'];
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${toneClass}`}>
      {meta.label}
    </span>
  );
}

function HistoryItem({ item, isActive, onSelect, onArchive, labels }) {
  const isCase = item.type === 'case';
  return (
    <div className={`group rounded-xl border p-3 transition-colors ${
      isActive
        ? 'border-indigo-300 bg-indigo-50/80 dark:border-indigo-700 dark:bg-indigo-950/30'
        : 'border-slate-200 bg-white/70 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/70 dark:hover:border-slate-700'
    }`}>
      <button
        type="button"
        onClick={() => onSelect?.(item)}
        aria-label={`${labels.open || 'Open'} ${item.title}`}
        className="w-full text-left"
      >
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 rounded-lg p-2 ${isCase ? 'bg-indigo-500/10 text-indigo-600' : 'bg-slate-500/10 text-slate-500'}`}>
            {isCase ? <FileText className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{item.title}</h3>
              {isCase && <StatusBadge status={item.status} />}
              {!isCase && <span className="rounded-full border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:border-slate-700">Chat</span>}
            </div>
            {item.patientLabel && (
              <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{item.patientLabel}</p>
            )}
            {item.lastMessagePreview && (
              <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{item.lastMessagePreview}</p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1">
                <Clock3 className="h-3 w-3" />
                {formatTimestamp(item.updatedAt)}
              </span>
              <span className="inline-flex items-center gap-1">
                <ImageIcon className="h-3 w-3" />
                {item.imageCount}
              </span>
              {item.timelineLinked && (
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <Link2 className="h-3 w-3" />
                  Timeline
                </span>
              )}
              {item.hasLowQualityImages && (
                <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-3 w-3" />
                  Quality
                </span>
              )}
            </div>
          </div>
        </div>
      </button>
      {isCase && item.status !== 'archived' && (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={() => onArchive?.(item)}
            aria-label={`${labels.archive || 'Archive case'} ${item.title}`}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-500 opacity-0 transition-opacity hover:text-rose-600 group-hover:opacity-100 focus:opacity-100 dark:border-slate-700"
          >
            <Archive className="h-3 w-3" />
            {labels.archive || 'Archive'}
          </button>
        </div>
      )}
    </div>
  );
}

export default function ClinicalHistorySidebar({
  isOpen,
  onClose,
  items = [],
  currentSessionId,
  currentCaseId,
  onSelect,
  onArchive,
  onNewSession,
  isLoading = false,
  error = null,
  labels = {},
}) {
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const filteredItems = useMemo(() => filterClinicalHistoryItems(items, { filter, query }), [filter, items, query]);

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[45] bg-black/40 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{ x: isOpen ? 0 : -390 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed left-0 top-0 z-50 h-screen w-[22rem] p-4"
      >
        <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-950">
          <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-2 text-indigo-600 dark:border-indigo-800 dark:bg-indigo-950/40">
                  <Activity className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">{labels.title || 'Clinical history'}</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{labels.subtitle || 'Sessions and verified cases'}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={labels.close || 'Close clinical history'}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="border-b border-slate-200 p-4 dark:border-slate-800">
            <button
              type="button"
              onClick={onNewSession}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" />
              {labels.newSession || 'New clinical case'}
            </button>

            <label className="mt-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500 focus-within:border-indigo-400 dark:border-slate-800 dark:bg-slate-900">
              <Search className="h-4 w-4" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={labels.search || 'Search title, patient, case, findings'}
                aria-label={labels.search || 'Search clinical history'}
                className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100"
              />
            </label>

            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {CASE_HISTORY_FILTERS.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key)}
                  className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-semibold ${
                    filter === key
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300'
                      : 'border-slate-200 text-slate-500 hover:text-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:text-slate-100'
                  }`}
                >
                  {labels.filters?.[key] || FILTER_LABELS[key]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {isLoading && (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                {labels.loading || 'Loading clinical history...'}
              </div>
            )}

            {!isLoading && error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
                {labels.error || 'Unable to load clinical history.'}
              </div>
            )}

            {!isLoading && !error && filteredItems.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-3 rounded-full border border-slate-200 bg-slate-50 p-3 text-slate-400 dark:border-slate-800 dark:bg-slate-900">
                  <Calendar className="h-6 w-6" />
                </div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{labels.empty || 'No clinical history'}</p>
                <p className="mt-1 max-w-[14rem] text-xs text-slate-500 dark:text-slate-400">{labels.emptyDescription || 'Create a case or open a chat session to begin.'}</p>
              </div>
            )}

            <div className="space-y-4">
              {groupItemsByDate(filteredItems, labels.dateGroups || {}).map((group) => (
                <div key={group.key}>
                  <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-600">
                    {group.label}
                  </p>
                  <div className="space-y-2">
                    {group.items.map((item) => (
                      <HistoryItem
                        key={`${item.type}:${item.id}`}
                        item={item}
                        isActive={(item.caseId && item.caseId === currentCaseId) || (item.sessionId && item.sessionId === currentSessionId)}
                        onSelect={onSelect}
                        onArchive={onArchive}
                        labels={labels}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-200 px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800">
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              {labels.sourceOfTruth || 'Backend case source of truth'}
            </span>
          </div>
        </div>
      </motion.aside>
    </>
  );
}
