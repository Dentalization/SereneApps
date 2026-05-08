import React, { useState } from 'react';
import { BrainCircuit, BriefcaseMedical, Loader2, RefreshCw, ShieldCheck, X } from 'lucide-react';
import AuditTrailPanel from './AuditTrailPanel.jsx';
import CaseExportPanel from './CaseExportPanel.jsx';
import ClinicianFindingPanel from './ClinicianFindingPanel.jsx';
import MultiImageUploader from './MultiImageUploader.jsx';
import PatientTimelinePanel from './PatientTimelinePanel.jsx';
import { getCaseStatusMeta } from './caseWorkspaceModels.mjs';

function WorkspaceHeader({ caseRecord, isLoading, onRefresh, onCreateCase }) {
  const meta = getCaseStatusMeta(caseRecord?.status);
  return (
    <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-2 text-indigo-600 dark:border-indigo-800 dark:bg-indigo-950/40">
            <BriefcaseMedical className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {caseRecord?.title || 'Verified Case Workspace'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {caseRecord?.id ? `Case ${caseRecord.id}` : 'Create a clinical case to attach images, findings, exports, and timeline events.'}
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
            {caseRecord?.id ? 'Refresh' : 'Create case'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function VerifiedCaseWorkspace({
  isOpen = false,
  onClose,
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
  const verified = ['verified', 'exported', 'archived'].includes(caseRecord?.status);
  const analyzableImages = images.filter((image) => ['acceptable', 'warning'].includes(image.quality_status || image.quality_check?.quality_status));
  const [activeMobileTab, setActiveMobileTab] = useState('case');

  const analysisPanel = caseRecord?.id ? (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">AI-assisted analysis</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Run only after per-image quality precheck.</p>
        </div>
        <BrainCircuit className="h-5 w-5 text-indigo-500" />
      </div>
      <button
        type="button"
        disabled={isLoading || analyzableImages.length === 0}
        onClick={() => onAnalyzeImages?.(analyzableImages)}
        className="mt-3 w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        Analyze eligible images ({analyzableImages.length})
      </button>
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
    <aside className={`${isOpen ? 'fixed inset-0 z-[90] block' : 'hidden'} h-full w-full shrink-0 overflow-y-auto border-l border-slate-200 bg-slate-50/95 p-4 dark:border-slate-800 dark:bg-slate-950/95 xl:static xl:z-auto xl:block xl:w-[28rem] xl:bg-slate-50/70 xl:dark:bg-slate-950/70`}>
      <div className="mb-3 flex justify-end xl:hidden">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close case workspace"
          className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 dark:border-slate-800 dark:bg-slate-900"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <WorkspaceHeader
        caseRecord={caseRecord}
        isLoading={isLoading}
        onRefresh={onRefresh}
        onCreateCase={onCreateCase}
      />

      <div className="mb-4 grid grid-cols-5 gap-1 rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-950 xl:hidden">
        {[
          ['case', 'Case'],
          ['findings', 'Findings'],
          ['audit', 'Audit'],
          ['export', 'Export'],
          ['timeline', 'Timeline'],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveMobileTab(key)}
            className={`rounded-lg px-2 py-2 text-[11px] font-semibold ${activeMobileTab === key ? 'bg-indigo-600 text-white' : 'text-slate-500 dark:text-slate-400'}`}
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
    </aside>
  );
}
