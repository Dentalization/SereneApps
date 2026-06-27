import React from 'react';
import AppIcon from '../../../../components/AppIcon';
import { buildAnnotatedImageDataUrl } from '../../ai/components/deepDentalSchemas.mjs';

const concernClasses = {
    minimal: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-200',
    low: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-200',
    mild: 'border-cyan-500/30 bg-cyan-500/15 text-cyan-200',
    moderate: 'border-amber-500/30 bg-amber-500/15 text-amber-200',
    severe: 'border-orange-500/30 bg-orange-500/15 text-orange-200',
    high: 'border-rose-500/30 bg-rose-500/15 text-rose-200',
    critical: 'border-rose-500/30 bg-rose-500/15 text-rose-200',
};

function formatConfidence(value) {
    if (value === null || value === undefined || value === '') return '';
    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
        const normalized = numeric <= 1 ? numeric * 100 : numeric;
        return `${Math.round(normalized)}%`;
    }
    return String(value);
}

const XCoreAiAnalysisPanel = ({
    visible,
    findings,
    loading = false,
    error = '',
    overlayVisible = false,
    onClose,
    onRetry,
    onCancel,
    onToggleOverlay,
}) => {
    if (!visible) return null;

    const detections = findings?.detections || [];
    const clinicalFindings = findings?.findings || [];
    const recommendations = findings?.recommendations || [];
    const suggestedQuestions = findings?.suggested_questions || [];
    const concern = String(findings?.concern_level || '').toLowerCase();
    const annotatedImageSrc = findings ? buildAnnotatedImageDataUrl(findings) : '';

    return (
        <aside
            role="dialog"
            aria-modal="false"
            aria-label="X-Core AI clinical reasoning"
            className="absolute right-0 top-0 z-[80] flex h-full w-full max-w-[420px] flex-col border-l border-cyan-500/20 bg-slate-950/95 text-slate-100 shadow-2xl backdrop-blur-xl"
        >
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
                <div className="flex items-center gap-3">
                    <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/15 p-2 text-cyan-300">
                        <AppIcon name="Brain" size={18} />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-white">AI Clinical Reasoning</h3>
                        <p className="text-[11px] text-slate-400">DeepDental analysis for X-Core 2D</p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
                    aria-label="Close AI analysis"
                >
                    <AppIcon name="X" size={16} />
                </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
                {loading && (
                    <div className="flex min-h-[320px] flex-col items-center justify-center text-center">
                        <div className="relative mb-5">
                            <div className="absolute inset-0 rounded-full bg-cyan-400/20 blur-xl" />
                            <AppIcon name="Loader2" size={42} className="relative animate-spin text-cyan-300" />
                        </div>
                        <h4 className="text-sm font-semibold text-white">Menganalisis citra 2D</h4>
                        <p className="mt-2 max-w-xs text-xs leading-relaxed text-slate-400">
                            AI sedang membuat deteksi, diagnosis banding, rekomendasi, dan batasan analisis.
                        </p>
                        <button
                            type="button"
                            onClick={onCancel}
                            className="mt-5 rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-800"
                        >
                            Batalkan
                        </button>
                    </div>
                )}

                {!loading && error && (
                    <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4">
                        <div className="flex items-start gap-3">
                            <AppIcon name="AlertTriangle" size={18} className="mt-0.5 shrink-0 text-rose-300" />
                            <div>
                                <h4 className="text-sm font-semibold text-rose-100">Analisis AI gagal</h4>
                                <p className="mt-1 text-xs leading-relaxed text-rose-200/75">{error}</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onRetry}
                            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-rose-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-rose-400"
                        >
                            <AppIcon name="RefreshCw" size={14} />
                            Coba lagi
                        </button>
                    </div>
                )}

                {!loading && !error && findings && (
                    <div className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                            <span className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-300">
                                Quality: {findings.image_quality || 'analyzed'}
                            </span>
                            {concern && (
                                <span className={`rounded-lg border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${concernClasses[concern] || concernClasses.mild}`}>
                                    Concern: {concern}
                                </span>
                            )}
                            <span className="rounded-lg border border-cyan-500/25 bg-cyan-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-cyan-200">
                                {detections.length} marker
                            </span>
                        </div>

                        {annotatedImageSrc && (
                            <section className="overflow-hidden rounded-2xl border border-slate-800 bg-black">
                                <img
                                    src={annotatedImageSrc}
                                    alt="DeepDental annotated 2D radiograph"
                                    className="max-h-64 w-full object-contain"
                                />
                                <button
                                    type="button"
                                    onClick={onToggleOverlay}
                                    className={`flex w-full items-center justify-center gap-2 border-t border-slate-800 px-3 py-2 text-xs font-semibold transition ${
                                        overlayVisible
                                            ? 'bg-cyan-500/20 text-cyan-200'
                                            : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                                    }`}
                                >
                                    <AppIcon name={overlayVisible ? 'EyeOff' : 'ScanSearch'} size={14} />
                                    {overlayVisible ? 'Tampilkan citra asli' : 'Tampilkan anotasi di viewer'}
                                </button>
                            </section>
                        )}

                        {detections.length > 0 && (
                            <section>
                                <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                                    <AppIcon name="Crosshair" size={14} className="text-cyan-300" />
                                    Deteksi
                                </div>
                                <div className="space-y-2">
                                    {detections.map((detection, index) => (
                                        <div key={detection.mark_id || `${detection.label}-${index}`} className="rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2">
                                            <div className="flex items-center justify-between gap-3">
                                                <span className="text-xs font-semibold capitalize text-white">
                                                    {detection.label || `Marker ${index + 1}`}
                                                </span>
                                                <span className="font-mono text-[11px] text-cyan-300">
                                                    {formatConfidence(detection.confidence)}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {clinicalFindings.length > 0 && (
                            <section>
                                <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                                    <AppIcon name="Stethoscope" size={14} className="text-emerald-300" />
                                    Reasoning klinis
                                </div>
                                <div className="space-y-2">
                                    {clinicalFindings.map((finding, index) => (
                                        <article key={finding.mark_id || `${finding.location}-${index}`} className="rounded-xl border border-slate-800 bg-slate-900/80 p-3">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="text-xs font-semibold text-white">
                                                    {finding.location || `Temuan ${index + 1}`}
                                                </span>
                                                {finding.severity && (
                                                    <span className="rounded-md border border-amber-500/25 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-amber-200">
                                                        {finding.severity}
                                                    </span>
                                                )}
                                                {finding.confidence && (
                                                    <span className="ml-auto font-mono text-[10px] text-slate-400">
                                                        {formatConfidence(finding.confidence)}
                                                    </span>
                                                )}
                                            </div>
                                            {finding.description && (
                                                <p className="mt-2 text-xs leading-relaxed text-slate-300">{finding.description}</p>
                                            )}
                                            {finding.differentials?.length > 0 && (
                                                <div className="mt-3">
                                                    <div className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">Diagnosis banding</div>
                                                    <div className="mt-1 flex flex-wrap gap-1">
                                                        {finding.differentials.map((item, differentialIndex) => (
                                                            <span key={`${item}-${differentialIndex}`} className="rounded-md border border-purple-500/20 bg-purple-500/10 px-2 py-1 text-[10px] text-purple-200">
                                                                {item}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </article>
                                    ))}
                                </div>
                            </section>
                        )}

                        {recommendations.length > 0 && (
                            <section className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">
                                <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-emerald-200">
                                    <AppIcon name="Lightbulb" size={14} />
                                    Rekomendasi
                                </div>
                                <ul className="space-y-2">
                                    {recommendations.map((recommendation, recommendationIndex) => (
                                        <li key={`${recommendation}-${recommendationIndex}`} className="flex gap-2 text-xs leading-relaxed text-emerald-100/80">
                                            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-emerald-300" />
                                            <span>{recommendation}</span>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}

                        {findings.limitations && (
                            <section className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3">
                                <div className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-amber-200">Limitations</div>
                                <p className="text-xs leading-relaxed text-amber-100/75">{findings.limitations}</p>
                            </section>
                        )}

                        {suggestedQuestions.length > 0 && (
                            <section>
                                <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Pertanyaan lanjutan</div>
                                <div className="space-y-1.5">
                                    {suggestedQuestions.map((question, questionIndex) => (
                                        <div key={`${question}-${questionIndex}`} className="rounded-lg border border-slate-800 px-3 py-2 text-xs text-slate-300">
                                            {question}
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        <button
                            type="button"
                            onClick={onRetry}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-xs font-semibold text-slate-200 transition hover:bg-slate-800"
                        >
                            <AppIcon name="RefreshCw" size={14} />
                            Analisis ulang
                        </button>
                    </div>
                )}
            </div>

            <div className="border-t border-amber-500/20 bg-amber-500/10 px-4 py-3">
                <p className="text-[10px] leading-relaxed text-amber-100/70">
                    AI-assisted preliminary findings. Hasil wajib dikonfirmasi melalui pemeriksaan klinis dan penilaian dokter gigi.
                </p>
            </div>
        </aside>
    );
};

export default XCoreAiAnalysisPanel;
