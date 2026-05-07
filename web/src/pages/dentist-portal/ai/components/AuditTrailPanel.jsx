import React from 'react';
import { ClipboardList } from 'lucide-react';

function formatTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function labelEvent(type = '') {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function AuditTrailPanel({ events = [], labels = {} }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
      <div className="mb-4 flex items-center gap-2">
        <ClipboardList className="h-4 w-4 text-indigo-500" />
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{labels.title || 'Audit trail'}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">{labels.subtitle || 'Read-only immutable clinical actions.'}</p>
        </div>
      </div>

      {events.length === 0 ? (
        <p className="rounded-xl border border-slate-200 p-3 text-xs text-slate-500 dark:border-slate-800">{labels.empty || 'No audit events yet.'}</p>
      ) : (
        <ol className="space-y-3">
          {events.map((event) => (
            <li key={event.event_id} className="relative border-l border-slate-200 pl-4 dark:border-slate-800">
              <span className="absolute -left-1.5 top-1 h-3 w-3 rounded-full border-2 border-white bg-indigo-500 dark:border-slate-950" />
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{labelEvent(event.event_type)}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {event.actor_role || 'system'} · {event.actor_id || 'unknown'}
                    </p>
                  </div>
                  <time className="shrink-0 text-[10px] font-medium text-slate-500">{formatTime(event.created_at)}</time>
                </div>
                {event.reason && <p className="mt-2 text-[11px] text-slate-600 dark:text-slate-300">Reason: {event.reason}</p>}
                {event.request_id && <p className="mt-1 text-[10px] text-slate-500">Request: {event.request_id}</p>}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
