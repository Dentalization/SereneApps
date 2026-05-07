import React from 'react';
import { CalendarClock, ExternalLink, Link2 } from 'lucide-react';

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function labelEvent(type = '') {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function PatientTimelinePanel({ timeline = [], caseRecord, onLinkPatient, labels = {} }) {
  const linked = Boolean(caseRecord?.patient_id);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{labels.title || 'Patient timeline'}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">{labels.subtitle || 'Case milestones linked to longitudinal care.'}</p>
        </div>
        <CalendarClock className="h-5 w-5 text-indigo-500" />
      </div>

      {!linked && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
          <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">{labels.unlinked || 'No patient linked yet.'}</p>
          <button
            type="button"
            onClick={onLinkPatient}
            className="mt-2 inline-flex items-center gap-2 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
          >
            <Link2 className="h-3.5 w-3.5" />
            {labels.linkPatient || 'Link patient'}
          </button>
        </div>
      )}

      {linked && timeline.length === 0 && (
        <p className="rounded-xl border border-slate-200 p-3 text-xs text-slate-500 dark:border-slate-800">{labels.empty || 'No timeline events yet.'}</p>
      )}

      {timeline.length > 0 && (
        <div className="space-y-2">
          {timeline.map((event) => (
            <div key={event.event_id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{labelEvent(event.event_type)}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{event.case_title} · {event.case_status}</p>
                </div>
                <span className="text-[10px] text-slate-500">{formatDate(event.event_date)}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                <span>{event.image_count || 0} images</span>
                {event.confirmed_findings_summary && <span>{event.confirmed_findings_summary}</span>}
                {event.related_session_id && <span>Session {event.related_session_id}</span>}
                {event.report_link && (
                  <span className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-300">
                    <ExternalLink className="h-3 w-3" />
                    Report linked
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
