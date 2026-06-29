import React, { useState } from 'react';
import { BrainCircuit, BriefcaseMedical, ChevronLeft, ChevronRight, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../../../../contexts/LanguageContext';
import AuditTrailPanel from './AuditTrailPanel.jsx';
import CaseExportPanel from './CaseExportPanel.jsx';
import ClinicianFindingPanel from './ClinicianFindingPanel.jsx';
import MultiImageUploader from './MultiImageUploader.jsx';
import PatientTimelinePanel from './PatientTimelinePanel.jsx';
import { getCaseStatusMeta } from './caseWorkspaceModels.mjs';

function WorkspaceHeader({ caseRecord, isLoading, onRefresh, onCreateCase, t }) {
  const meta = getCaseStatusMeta(caseRecord?.status);
  return (
    <div className="mb-4 rounded-2xl border border-border/40 bg-surface p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-2 text-indigo-600 dark:border-indigo-800 dark:bg-indigo-950/40">
            <BriefcaseMedical className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {caseRecord?.title || t('ai.deepDental.workspace.header.title', { fallbackText: 'Verified Case Workspace' })}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {caseRecord?.id
                ? t('ai.deepDental.workspace.header.caseId', { id: caseRecord.id, fallbackText: `Case ${caseRecord.id}` })
                : t('ai.deepDental.workspace.header.description', { fallbackText: 'Create a clinical case to attach images, findings, exports, and timeline events.' })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {caseRecord?.status && (
            <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-300">
              {meta.label}
            </span>
          )}
          <button
            type="button"
            onClick={caseRecord?.id ? onRefresh : onCreateCase}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:bg-slate-300"
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : caseRecord?.id ? <RefreshCw className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
            {caseRecord?.id
              ? t('ai.deepDental.workspace.actions.refresh', { fallbackText: 'Refresh' })
              : t('ai.deepDental.workspace.actions.createCase', { fallbackText: 'Create case' })}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function VerifiedCaseWorkspace({
  isOpen = false,
  onToggle,
  caseRecord,
  images = [],
  findings = [],
  auditEvents = [],
  exports = [],
  timeline = [],
  isLoading = false,
  onCreateCase,
  onRefresh,
  onUploadImages,
  onRemoveImage,
  onRetryImage,
  onAnalyzeImages,
  onConfirmFinding,
  onRejectFinding,
  onEditFinding,
  onAddManualFinding,
  onVerifyCase,
  onExportPdf,
  onExportJson,
  onLinkPatient,
}) {
  const { t } = useLanguage();
  const verified = ['verified', 'exported', 'archived'].includes(caseRecord?.status);
  const patientLinked = Boolean(caseRecord?.patient_id);
  const analyzableImages = images.filter((image) => ['acceptable', 'warning'].includes(image.quality_status || image.quality_check?.quality_status));
  const [activeMobileTab, setActiveMobileTab] = useState('case');
  const panelClass = (expanded) => `${expanded ? 'flex' : 'hidden lg:flex'} flex-shrink-0 flex-col overflow-hidden transition-all duration-300 bg-surface border-l border-border/60 rounded-l-2xl ${expanded ? 'w-[28rem] min-w-[28rem]' : 'w-[44px] min-w-[44px]'}`;
  const toggleLabel = isOpen
    ? t('ai.deepDental.workspace.close', { fallbackText: 'Close case workspace' })
    : t('ai.deepDental.workspace.open', { fallbackText: 'Open case workspace' });

  const analysisPanel = caseRecord?.id ? (
    <section className="rounded-2xl border border-border/40 bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            {t('ai.deepDental.workspace.analysis.title', { fallbackText: 'AI-assisted analysis' })}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('ai.deepDental.workspace.analysis.subtitle', { fallbackText: 'Run only after per-image quality precheck.' })}
          </p>
        </div>
        <BrainCircuit className="h-5 w-5 text-indigo-500" />
      </div>
      <button
        type="button"
        disabled={isLoading || analyzableImages.length === 0}
        onClick={() => onAnalyzeImages?.(analyzableImages)}
        className="mt-3 w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {t('ai.deepDental.workspace.analysis.button', { count: analyzableImages.length, fallbackText: `Analyze eligible images (${analyzableImages.length})` })}
      </button>
      {!patientLinked && (
        <p className="mt-2 text-[11px] leading-relaxed text-amber-700 dark:text-amber-300">
          Tautkan pasien sebelum verifikasi agar temuan dan laporan tercatat pada timeline klinis yang tepat.
        </p>
      )}
    </section>
  ) : null;

  const panels = {
    case: (
      <>
        <MultiImageUploader
          images={images}
          verified={verified}
          disabled={!caseRecord?.id || isLoading}
          onUpload={onUploadImages}
          onRemove={onRemoveImage}
          onRetry={onRetryImage}
        />
        {analysisPanel}
      </>
    ),
    findings: (
      <ClinicianFindingPanel
        findings={findings}
        caseStatus={caseRecord?.status}
        onConfirm={onConfirmFinding}
        onReject={onRejectFinding}
        onEdit={onEditFinding}
        onAddManual={onAddManualFinding}
        onVerifyCase={onVerifyCase}
      />
    ),
    audit: <AuditTrailPanel events={auditEvents} />,
    export: (
      <CaseExportPanel
        caseRecord={caseRecord}
        exports={exports}
        onExportPdf={onExportPdf}
        onExportJson={onExportJson}
      />
    ),
    timeline: (
      <PatientTimelinePanel
        timeline={timeline}
        caseRecord={caseRecord}
        onLinkPatient={onLinkPatient}
      />
    ),
  };

  return (
    <aside className={panelClass(isOpen)}>
      <div className="flex flex-shrink-0 items-center justify-between px-4 py-3 border-b border-border/40">
        {isOpen && (
          <span className="text-xs font-bold uppercase tracking-widest text-muted">
            {t('ai.deepDental.workspace.title', { fallbackText: 'Case Workspace' })}
          </span>
        )}
        <button
          type="button"
          onClick={() => onToggle?.(!isOpen)}
          aria-label={toggleLabel}
          className="ml-auto flex h-7 w-7 items-center justify-center rounded-lg transition-all duration-150 hover:scale-105 text-muted hover:bg-surface-elevated hover:text-primary"
        >
          {isOpen ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {isOpen && (
        <div className="flex-1 overflow-y-auto scrollbar-minimal p-4">
          <WorkspaceHeader
            caseRecord={caseRecord}
            isLoading={isLoading}
            onRefresh={onRefresh}
            onCreateCase={onCreateCase}
            t={t}
          />

          <div className="mb-4 grid grid-cols-5 gap-1 rounded-xl border border-border/40 bg-surface p-1 xl:hidden">
            {[
              ['case', t('ai.deepDental.workspace.tabs.case', { fallbackText: 'Case' })],
              ['findings', t('ai.deepDental.workspace.tabs.findings', { fallbackText: 'Findings' })],
              ['audit', t('ai.deepDental.workspace.tabs.audit', { fallbackText: 'Audit' })],
              ['export', t('ai.deepDental.workspace.tabs.export', { fallbackText: 'Export' })],
              ['timeline', t('ai.deepDental.workspace.tabs.timeline', { fallbackText: 'Timeline' })],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveMobileTab(key)}
                className={`rounded-lg px-2 py-2 text-[11px] font-semibold ${activeMobileTab === key ? 'bg-indigo-600 text-white' : 'text-muted'}`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="space-y-4 xl:hidden">
            {panels[activeMobileTab]}
          </div>

          <div className="hidden space-y-4 xl:block">
            {panels.case}
            {panels.findings}
            {panels.audit}
            {panels.export}
            {panels.timeline}
          </div>
        </div>
      )}
    </aside>
  );
}
