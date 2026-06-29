import React from 'react';
import { CalendarClock, ExternalLink, Image, Link2 } from 'lucide-react';
import { useLanguage } from '../../../../contexts/LanguageContext';

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
  const { t } = useLanguage();
  const linked = Boolean(caseRecord?.patient_id);

  return (
    <section className="overflow-hidden rounded-2xl border border-border/40 bg-surface">
      <div className="flex items-center justify-between gap-3 border-b border-border/40 px-4 py-3.5">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-500/20 bg-cyan-500/10">
            <CalendarClock className="h-4 w-4 text-cyan-500" />
          </span>
          <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            {labels.title || t('ai.deepDental.workspace.timeline.title', { fallbackText: 'Timeline Pasien' })}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {labels.subtitle || t('ai.deepDental.workspace.timeline.subtitle', { fallbackText: 'Jejak kasus untuk perawatan berkelanjutan.' })}
          </p>
          </div>
        </div>
        {linked && (
          <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Terhubung
          </span>
        )}
      </div>

      <div className="p-4">
      {!linked && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
          <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
            {labels.unlinked || t('ai.deepDental.workspace.timeline.unlinked', { fallbackText: 'Kasus belum ditautkan ke pasien.' })}
          </p>
          <button
            type="button"
            onClick={onLinkPatient}
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-amber-700"
          >
            <Link2 className="h-3.5 w-3.5" />
            {labels.linkPatient || t('ai.deepDental.workspace.timeline.linkPatient', { fallbackText: 'Tautkan pasien' })}
          </button>
        </div>
      )}

      {linked && timeline.length === 0 && (
        <p className="rounded-xl border border-border/40 bg-surface-elevated/60 p-3 text-xs text-slate-500">
          {labels.empty || t('ai.deepDental.workspace.timeline.empty', { fallbackText: 'Belum ada aktivitas klinis pada timeline.' })}
        </p>
      )}

      {timeline.length > 0 && (
        <div className="relative space-y-0 before:absolute before:bottom-4 before:left-[7px] before:top-4 before:w-px before:bg-border/60">
            {timeline.map((event) => (
              <div key={event.event_id} className="relative pl-7">
              <span className="absolute left-0 top-4 h-[15px] w-[15px] rounded-full border-4 border-surface bg-cyan-500" />
              <div className="mb-3 rounded-xl border border-border/40 bg-surface-elevated/60 p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{labelEvent(event.event_type)}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{event.case_title} · {event.case_status}</p>
                </div>
                <span className="shrink-0 rounded-md bg-surface px-2 py-1 text-[10px] font-medium text-slate-500">{formatDate(event.event_date)}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-1">
                  <Image className="h-3 w-3" />
                  {event.image_count || 0} {t('ai.deepDental.workspace.timeline.images', { fallbackText: 'gambar' })}
                </span>
                {event.confirmed_findings_summary && <span>{event.confirmed_findings_summary}</span>}
                {event.related_session_id && (
                  <span>{t('ai.deepDental.workspace.timeline.session', { fallbackText: 'Sesi' })} {event.related_session_id}</span>
                )}
                {event.report_link && (
                  <span className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-300">
                    <ExternalLink className="h-3 w-3" />
                    {t('ai.deepDental.workspace.timeline.reportLinked', { fallbackText: 'Laporan terhubung' })}
                  </span>
                )}
              </div>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </section>
  );
}
