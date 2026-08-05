import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AppIcon from '../../components/AppIcon';
import { getAccessToken } from '../../utils/auth/tokenStorage';
import {
  createAnalysisCase,
  deleteAnalysisCase,
  generateAnalysisReport,
  getAnalysisCase,
  listAnalysisCases,
  listAnalysisItemAnnotations,
  openAnalysisReport,
  preflightAnalysisReport,
  updateAnalysisCase,
} from './api';
import { caseItemLabel, RADIOGRAPH_TYPES, reportRenderStatusPresentation, resolveSeriesUid, suggestRadiographType } from './domain.mjs';

const newId = () => globalThis.crypto?.randomUUID?.() || 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
  const random = Math.floor(Math.random() * 16);
  return (character === 'x' ? random : ((random & 0x3) | 0x8)).toString(16);
});
const inputClass = 'w-full rounded-xl border border-primary bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-accent theme-transition';

function normalizeOrders(items) {
  return items.map((item, index) => ({ ...item, display_order: index }));
}

function serializeCaseItems(items) {
  return normalizeOrders(items).map((item) => ({
    id: item.id,
    study_id: item.study_id,
    series_id: item.series_id,
    series_uid: item.series_uid,
    viewer_type: item.viewer_type,
    radiograph_type: item.radiograph_type,
    tooth_numbers: item.tooth_numbers || [],
    display_order: item.display_order,
    title: item.title || '',
    findings: item.findings || '',
    structured_findings: item.structured_findings || [],
  }));
}

function sourceOptions(studies) {
  return studies.flatMap((study) => {
    const series = study.series?.length ? study.series : [{ id: null, series_uid: study.selectedSeriesUid || study.id, description: study.description }];
    // Use patientName (Gallery-formatted) first — falls back to patient.name, then patientIdDisplay, then 'Tanpa pasien'
    const patientLabel = study.patientName
      || study.patient?.name
      || study.patientIdDisplay
      || 'Tanpa pasien';
    const studyLabel = study.originalName || study.original_name || study.description || `Studi ${study.id}`;
    return series.map((entry) => ({
      key: `${study.id}:${resolveSeriesUid(entry)}`,
      study,
      series: entry,
      label: `${patientLabel} — ${studyLabel} / ${entry.series_description || entry.description || `Series ${entry.seriesNumber || entry.id || ''}`}`,
    }));
  });
}

export default function AnalysisCaseWorkspace({ studies: initialStudies = [], studiesEndpoint, onClose, onOpenItem }) {
  const [studies, setStudies] = useState(initialStudies);
  const [cases, setCases] = useState([]);
  const [activeCase, setActiveCase] = useState(null);
  const [selectedSource, setSelectedSource] = useState('');
  const [newType, setNewType] = useState('OTHER');
  const [newTeeth, setNewTeeth] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [preflightIssues, setPreflightIssues] = useState([]);
  const sources = useMemo(() => sourceOptions(studies), [studies]);

  const refreshCases = useCallback(async () => setCases(await listAnalysisCases()), []);
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      listAnalysisCases(),
      initialStudies.length ? Promise.resolve(initialStudies) : fetch(studiesEndpoint || '/api/v1/x-core/studies', {
        headers: { Authorization: `Bearer ${getAccessToken()}` },
      }).then((response) => response.ok ? response.json() : []),
    ]).then(([caseRows, studyRows]) => {
      if (cancelled) return;
      setCases(caseRows);
      setStudies(studyRows);
    }).catch((error) => setMessage(error.message)).finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [initialStudies, studiesEndpoint]);

  const loadCase = async (id) => {
    setLoading(true); setMessage('');
    try { setActiveCase(await getAnalysisCase(id)); } catch (error) { setMessage(error.message); }
    finally { setLoading(false); }
  };

  const source = sources.find((option) => option.key === selectedSource);
  useEffect(() => {
    if (source) setNewType(suggestRadiographType({ ...source.study, ...source.series }));
  }, [selectedSource, source]);

  const buildItem = (selected) => ({
    id: newId(),
    study_id: String(selected.study.id),
    series_id: selected.series.id ? String(selected.series.id) : null,
    series_uid: resolveSeriesUid(selected.series),
    viewer_type: selected.series.type === '3D Volume' ? 'slice' : '2d',
    radiograph_type: newType,
    tooth_numbers: newTeeth.split(/[ ,]+/).map((value) => value.trim()).filter(Boolean),
    display_order: activeCase?.items?.length || 0,
    title: '', findings: '', structured_findings: [],
  });

  const createCase = async () => {
    if (!source) return setMessage('Pilih citra pertama.');
    const patientId = source.study.patientId || source.study.patient_id;
    if (!patientId) return setMessage('Studi harus terhubung ke pasien sebelum dibuat menjadi kasus.');
    if (newType === 'PERIAPICAL' && !newTeeth.trim()) return setMessage('Nomor gigi wajib untuk periapikal.');
    setSaving(true); setMessage('');
    try {
      const created = await createAnalysisCase({
        patient_id: String(patientId), title: `Analisis X-Core — ${source.study.patient?.name || source.study.patientName || 'Pasien'}`,
        clinical_data: {}, conclusion: '', items: [buildItem(source)],
      });
      setActiveCase(created); await refreshCases(); setSelectedSource(''); setNewTeeth('');
    } catch (error) { setMessage(error.message); } finally { setSaving(false); }
  };

  const addItem = () => {
    if (!source) return setMessage('Pilih citra yang akan ditambahkan.');
    const patientId = source.study.patientId || source.study.patient_id;
    if (String(patientId || '') !== String(activeCase.patient_id)) return setMessage('Citra harus berasal dari pasien yang sama.');
    if (newType === 'PERIAPICAL' && !newTeeth.trim()) return setMessage('Nomor gigi wajib untuk periapikal.');
    setActiveCase((current) => ({ ...current, items: [...current.items, buildItem(source)] }));
    setSelectedSource(''); setNewTeeth(''); setMessage('Citra ditambahkan. Tekan Simpan untuk mempersistensikan perubahan.');
  };

  const patchItem = (id, patch) => setActiveCase((current) => ({
    ...current, items: current.items.map((item) => item.id === id ? { ...item, ...patch } : item),
  }));

  const moveItem = (index, direction) => setActiveCase((current) => {
    const next = [...current.items];
    const target = index + direction;
    if (target < 0 || target >= next.length) return current;
    [next[index], next[target]] = [next[target], next[index]];
    return { ...current, items: normalizeOrders(next) };
  });

  const save = async () => {
    setSaving(true); setMessage('');
    try {
      const saved = await updateAnalysisCase(activeCase.id, {
        title: activeCase.title, clinical_data: activeCase.clinical_data, conclusion: activeCase.conclusion,
        items: serializeCaseItems(activeCase.items),
      });
      setActiveCase(saved); await refreshCases(); setMessage('Kasus tersimpan di backend.');
    } catch (error) { setMessage(error.message); } finally { setSaving(false); }
  };

  const openItem = async (item) => {
    setSaving(true); setMessage('Menyimpan analisis sebelum membuka viewer…');
    try {
      const saved = await updateAnalysisCase(activeCase.id, {
        title: activeCase.title,
        clinical_data: activeCase.clinical_data,
        conclusion: activeCase.conclusion,
        items: serializeCaseItems(activeCase.items),
      });
      setActiveCase(saved);
      const savedItem = saved.items.find((candidate) => candidate.id === item.id);
      onOpenItem(saved, savedItem, studies.find((study) => String(study.id) === String(savedItem.study_id)));
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  };

  const generate = async () => {
    setSaving(true); setMessage('');
    try {
      const saved = await updateAnalysisCase(activeCase.id, {
        title: activeCase.title, clinical_data: activeCase.clinical_data, conclusion: activeCase.conclusion,
        items: serializeCaseItems(activeCase.items),
      });
      setActiveCase(saved);
      const preflight = await preflightAnalysisReport(activeCase.id);
      setPreflightIssues(preflight.issues || []);
      if (!preflight.ready) {
        setMessage(`PDF belum dapat dibuat. ${preflight.issues.length} citra perlu diperbarui.`);
        return;
      }
      const report = await generateAnalysisReport(activeCase.id, 'DRAFT');
      setActiveCase(await getAnalysisCase(activeCase.id));
      setMessage(`PDF versi ${report.version} berhasil dibuat dan disimpan.`);
    } catch (error) { setMessage(error.message); } finally { setSaving(false); }
  };

  const deleteActiveCase = async () => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus kasus analisis ini beserta seluruh dokumen PDF yang tersimpan?')) {
      return;
    }
    setSaving(true);
    setMessage('Menghapus kasus...');
    try {
      await deleteAnalysisCase(activeCase.id);
      setActiveCase(null);
      await refreshCases();
      setMessage('Kasus analisis berhasil dihapus.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  };

  const compatibleSources = sources.filter((entry) => !activeCase || String(entry.study.patientId || entry.study.patient_id || '') === String(activeCase.patient_id));

  return (
    <div className="dark fixed inset-0 z-[200] flex bg-background text-primary backdrop-blur theme-transition overflow-hidden">
      <aside className="sticky top-0 h-screen p-4 w-80 shrink-0 flex flex-col theme-transition">
        <div className="h-full flex flex-col rounded-3xl bg-surface-elevated border border-primary shadow-theme-lg overflow-hidden">
          <div className="p-4 border-b border-primary theme-transition">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-primary">Analysis Cases</h2>
                <p className="text-xs text-muted mt-0.5">Paket analisis multi-citra</p>
              </div>
              <button onClick={onClose} className="rounded-lg p-2 text-muted hover:text-primary hover:bg-accent-light transition-all duration-200"><AppIcon name="X" size={18} /></button>
            </div>
            <button
              onClick={() => setActiveCase(null)}
              className="w-full rounded-lg bg-accent px-3 py-2.5 text-sm font-semibold text-accent-text hover:bg-accent-hover transition-all duration-200 flex items-center justify-center gap-2"
            >
              <AppIcon name="Plus" size={16} />
              Kasus baru
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {cases.length === 0 && !loading && (
              <div className="text-center py-10 text-muted text-xs">Belum ada kasus analisis.</div>
            )}
            {cases.map((entry) => (
              <button
                key={entry.id}
                onClick={() => loadCase(entry.id)}
                className={`w-full rounded-lg border p-3 text-left transition-all duration-200 ${activeCase?.id === entry.id
                  ? 'border-accent bg-accent-light'
                  : 'border-primary bg-surface hover:bg-surface-hover hover:border-secondary'
                  }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="truncate text-sm font-medium leading-tight text-primary">{entry.title}</div>
                  <CaseStatusBadge status={entry.status} mini />
                </div>
                <div className="flex items-center gap-1 text-xs text-muted mt-1">
                  <AppIcon name="User" size={11} className="shrink-0" />
                  <span className="truncate">{entry.patient_name}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted mt-1">
                  <span className="flex items-center gap-1"><AppIcon name="Image" size={11} />{entry.item_count} citra</span>
                  <span className="flex items-center gap-1"><AppIcon name="FileText" size={11} />{entry.report_count} PDF</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-y-auto p-6">
        {loading ? <div className="flex h-full items-center justify-center"><AppIcon name="Loader2" className="animate-spin text-accent" size={30} /></div> : !activeCase ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="w-full max-w-2xl rounded-2xl border border-primary bg-surface-elevated p-7 shadow-theme-lg theme-transition">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-accent-light rounded-xl border border-accent">
                  <AppIcon name="Files" size={22} className="text-accent" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-primary">Buat kasus analisis</h3>
                  <p className="text-xs text-muted mt-0.5">Pilih radiografi pertama. Citra berikutnya harus milik pasien yang sama.</p>
                </div>
              </div>
              <div className="border-t border-primary pt-5">
                <SourceFields sources={sources} selectedSource={selectedSource} setSelectedSource={setSelectedSource} type={newType} setType={setNewType} teeth={newTeeth} setTeeth={setNewTeeth} />
                <button
                  disabled={saving}
                  onClick={createCase}
                  className="mt-5 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-text hover:bg-accent-hover transition-all duration-200 disabled:opacity-50 flex items-center gap-2"
                >
                  <AppIcon name="Plus" size={16} />
                  Buat kasus
                </button>
                {message && <p className="mt-4 text-sm text-warning">{message}</p>}
              </div>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-6xl space-y-5">
            <div className="rounded-2xl border border-primary bg-surface-elevated p-5 theme-transition">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="text-xl font-semibold truncate text-primary">{activeCase.title}</h3>
                    <CaseStatusBadge status={activeCase.status} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 mt-2">
                    <div className="flex items-center gap-1.5 text-xs text-muted">
                      <AppIcon name="User" size={12} className="text-muted shrink-0" />
                      <span className="font-medium text-secondary">Pasien:</span>
                      <span className="truncate">{activeCase.patient?.name || '—'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted">
                      <AppIcon name="Stethoscope" size={12} className="text-muted shrink-0" />
                      <span className="font-medium text-secondary">Dokter:</span>
                      <span className="truncate">{activeCase.creator?.name || '—'}</span>
                    </div>
                    {activeCase.facility_name && (
                      <div className="flex items-center gap-1.5 text-xs text-muted sm:col-span-2">
                        <AppIcon name="Building2" size={12} className="text-muted shrink-0" />
                        <span className="font-medium text-secondary">Fasilitas:</span>
                        <span className="truncate">{activeCase.facility_name}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-xs text-muted">
                      <AppIcon name="Clock" size={12} className="shrink-0" />
                      <span>Diperbarui: {new Date(activeCase.updated_at).toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted">
                      <AppIcon name="Image" size={12} className="shrink-0" />
                      <span>{activeCase.items.length} citra • {activeCase.reports?.length || 0} PDF</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={deleteActiveCase}
                    disabled={saving}
                    className="rounded-lg border border-red-500/30 px-4 py-2 text-sm font-semibold text-red-400 hover:bg-red-500/10 transition-all duration-200 disabled:opacity-50 flex items-center gap-2"
                  >
                    <AppIcon name="Trash2" size={15} />
                    Hapus
                  </button>
                  <button
                    onClick={save}
                    disabled={saving}
                    className="rounded-lg border border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-accent-light hover:text-primary transition-all duration-200 disabled:opacity-50 flex items-center gap-2"
                  >
                    <AppIcon name="Save" size={15} />
                    Simpan
                  </button>
                  <button
                    onClick={generate}
                    disabled={saving}
                    className="rounded-lg bg-success px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-all duration-200 disabled:opacity-50 flex items-center gap-2"
                  >
                    <AppIcon name="FileDown" size={15} />
                    Buat PDF
                  </button>
                </div>
              </div>
            </div>
            {message && <div className="rounded-xl border border-warning border-opacity-30 bg-warning-light px-4 py-3 text-sm text-warning">{message}</div>}
            {preflightIssues.length > 0 && (
              <div className="rounded-xl border border-error border-opacity-30 bg-error-light px-4 py-3 text-sm text-error">
                <div className="font-semibold">Laporan belum siap</div>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {preflightIssues.map((issue) => {
                    const item = activeCase?.items?.find((candidate) => candidate.id === issue.item_id);
                    const nameLabel = item ? (item.title || caseItemLabel(item, activeCase.items)) : `Citra ${issue.display_order + 1}`;
                    return (
                      <li key={`${issue.item_id}-${issue.code}`}>
                        <strong>{nameLabel}</strong>: {issue.message}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            <section className="grid gap-4 rounded-2xl border border-primary bg-surface-elevated p-5 md:grid-cols-2 theme-transition">
              <label className="text-xs text-muted">Judul kasus<input className={`${inputClass} mt-1`} value={activeCase.title} onChange={(e) => setActiveCase({ ...activeCase, title: e.target.value })} /></label>
              <label className="text-xs text-muted">Keluhan utama<input className={`${inputClass} mt-1`} value={activeCase.clinical_data?.chief_complaint || ''} onChange={(e) => setActiveCase({ ...activeCase, clinical_data: { ...activeCase.clinical_data, chief_complaint: e.target.value } })} /></label>
              <label className="text-xs text-muted md:col-span-2">Indikasi klinis<textarea rows={2} className={`${inputClass} mt-1`} value={activeCase.clinical_data?.clinical_indication || ''} onChange={(e) => setActiveCase({ ...activeCase, clinical_data: { ...activeCase.clinical_data, clinical_indication: e.target.value } })} /></label>
              <label className="text-xs text-muted md:col-span-2">Data klinis / riwayat<textarea rows={3} className={`${inputClass} mt-1`} value={activeCase.clinical_data?.clinical_notes || ''} onChange={(e) => setActiveCase({ ...activeCase, clinical_data: { ...activeCase.clinical_data, clinical_notes: e.target.value } })} /></label>
              <label className="text-xs text-muted md:col-span-2">Kesimpulan<textarea rows={3} className={`${inputClass} mt-1`} value={activeCase.conclusion || ''} onChange={(e) => setActiveCase({ ...activeCase, conclusion: e.target.value })} /></label>
            </section>

            <section className="space-y-3">
              {activeCase.items.map((item, index) => (
                <article key={item.id} className="rounded-2xl border border-primary bg-surface-elevated p-4 transition-all duration-200 hover:border-secondary theme-transition">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-white">{caseItemLabel(item, activeCase.items)}</div>
                      <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="flex items-center gap-1">
                          <AppIcon name="FolderOpen" size={11} />
                          {item.study_name || `Study ${item.study_id}`}
                        </span>
                        {item.study_date && (
                          <span className="flex items-center gap-1">
                            <AppIcon name="Calendar" size={11} />
                            {new Date(item.study_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        )}
                        <span className="text-slate-700 font-mono text-[10px] truncate max-w-[120px]" title={item.series_uid}>{item.series_uid.slice(0, 16)}…</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <RenderStatusBadge status={item.render_status} />
                      <button onClick={() => moveItem(index, -1)} disabled={!index} title="Naikan urutan" className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 transition-colors"><AppIcon name="ArrowUp" size={14} /></button>
                      <button onClick={() => moveItem(index, 1)} disabled={index === activeCase.items.length - 1} title="Turunkan urutan" className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 transition-colors"><AppIcon name="ArrowDown" size={14} /></button>
                      <button
                        onClick={() => openItem(item)}
                        disabled={saving}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-1.5 ${item.render_status?.ready
                          ? 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                          : 'bg-cyan-600 hover:bg-cyan-500 text-white'
                          }`}
                      >
                        <AppIcon name={item.render_status?.ready ? 'Eye' : 'Camera'} size={13} />
                        {item.render_status?.ready ? 'Buka viewer' : 'Perbarui gambar'}
                      </button>
                      {activeCase.items.length > 1 && (
                        <button
                          title="Hapus citra ini"
                          onClick={() => setActiveCase({ ...activeCase, items: normalizeOrders(activeCase.items.filter((candidate) => candidate.id !== item.id)) })}
                          className="rounded-lg p-1.5 text-slate-500 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                        >
                          <AppIcon name="Trash2" size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    <label className="text-xs text-slate-400">Jenis<select className={`${inputClass} mt-1`} value={item.radiograph_type} onChange={(e) => patchItem(item.id, { radiograph_type: e.target.value })}>{RADIOGRAPH_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                    <label className="text-xs text-slate-400">Nomor gigi<input className={`${inputClass} mt-1`} placeholder="11, 12" value={(item.tooth_numbers || []).join(', ')} onChange={(e) => patchItem(item.id, { tooth_numbers: e.target.value.split(/[ ,]+/).filter(Boolean) })} /></label>
                    <label className="text-xs text-slate-400">Judul opsional<input className={`${inputClass} mt-1`} value={item.title || ''} onChange={(e) => patchItem(item.id, { title: e.target.value })} /></label>
                    {item.findings && <div className="md:col-span-3 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-xs text-amber-200"><div className="font-semibold">Catatan temuan format lama</div><p className="mt-1 whitespace-pre-wrap">{item.findings}</p><p className="mt-2 text-amber-300/70">Catatan ini dipertahankan untuk kompatibilitas. Tambahkan temuan bernomor dan pilih anotasi lokasinya sebelum memperbarui gambar laporan.</p></div>}
                    <div className="md:col-span-3"><FindingEditor item={item} onChange={(structuredFindings) => patchItem(item.id, { structured_findings: structuredFindings })} /></div>
                  </div>
                </article>
              ))}
            </section>

            {activeCase.status !== 'FINALIZED' && <section className="rounded-2xl border border-dashed border-primary bg-surface p-5 theme-transition"><h4 className="mb-3 font-semibold text-primary">Tambahkan citra pasien ini</h4><SourceFields sources={compatibleSources} selectedSource={selectedSource} setSelectedSource={setSelectedSource} type={newType} setType={setNewType} teeth={newTeeth} setTeeth={setNewTeeth} /><button onClick={addItem} className="mt-4 rounded-lg bg-accent-light border border-accent px-4 py-2 text-sm font-semibold text-accent hover:bg-accent hover:text-accent-text transition-all duration-200">Tambahkan ke kasus</button></section>}

            <section className="rounded-2xl border border-primary bg-surface-elevated p-5 theme-transition"><h4 className="mb-3 font-semibold text-primary">Versi PDF tersimpan</h4>{activeCase.reports.length ? <div className="space-y-2">{activeCase.reports.map((report) => <button key={report.id} onClick={() => openAnalysisReport(activeCase.id, report.id).catch((error) => setMessage(error.message))} className="flex w-full items-center justify-between rounded-xl border border-primary bg-surface px-4 py-3 text-sm hover:border-accent transition-all duration-200"><span className="text-primary">Versi {report.version} • {report.status}</span><span className="text-xs text-muted">{new Date(report.created_at).toLocaleString('id-ID')} • {report.checksum.slice(0, 10)}</span></button>)}</div> : <p className="text-sm text-muted">Belum ada PDF.</p>}</section>
          </div>
        )}
      </main>
    </div>
  );
}

function RenderStatusBadge({ status }) {
  const presentation = reportRenderStatusPresentation(status?.status);
  const dotColor = {
    ready: 'bg-emerald-400',
    stale: 'bg-orange-400',
    missing: 'bg-amber-400',
    legacy: 'bg-violet-400',
    invalid: 'bg-rose-400',
  }[presentation.tone];
  const classes = {
    ready: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25',
    stale: 'bg-orange-500/15 text-orange-300 border border-orange-500/25',
    missing: 'bg-amber-500/15 text-amber-300 border border-amber-500/25',
    legacy: 'bg-violet-500/15 text-violet-300 border border-violet-500/25',
    invalid: 'bg-rose-500/15 text-rose-300 border border-rose-500/25',
  }[presentation.tone];
  return (
    <span title={status?.message} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${classes}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
      {presentation.label}
    </span>
  );
}

function CaseStatusBadge({ status, mini = false }) {
  const normalized = String(status || 'DRAFT').toUpperCase();
  const config = {
    DRAFT: { label: 'Draft', classes: 'bg-surface-hover text-muted border border-primary' },
    FINALIZED: { label: 'Final', classes: 'bg-success-light text-success border border-success' },
  }[normalized] || { label: normalized, classes: 'bg-surface-hover text-muted border border-primary' };
  return (
    <span className={`inline-flex items-center rounded-full font-semibold ${mini ? 'px-1.5 py-0.5 text-[9px]' : 'px-2.5 py-1 text-[10px]'} ${config.classes}`}>
      {config.label}
    </span>
  );
}

function FindingEditor({ item, onChange }) {
  const [annotations, setAnnotations] = useState([]);
  const [loadingAnnotations, setLoadingAnnotations] = useState(false);
  const [error, setError] = useState('');
  const findings = item.structured_findings || [];

  const extractAnnotationDetails = (annotation) => {
    if (!annotation) return { title: '', description: '', region: '' };
    const title = annotation.label ||
      annotation.metadata?.finding_type ||
      annotation.metadata?.label ||
      annotation.metadata?.title ||
      annotation.metadata?.findingType ||
      '';
    const description = annotation.metadata?.clinical_notes ||
      annotation.metadata?.clinicalNotes ||
      annotation.metadata?.description ||
      annotation.metadata?.notes ||
      annotation.metadata?.comment ||
      '';
    let region = '';
    const tooth = annotation.metadata?.tooth_number ||
      annotation.metadata?.toothNumber ||
      annotation.metadata?.tooth ||
      annotation.metadata?.region ||
      '';
    if (tooth) {
      if (/^\d+$/.test(String(tooth))) {
        region = `Gigi ${tooth}`;
      } else {
        region = String(tooth);
      }
    }
    return { title, description, region };
  };

  useEffect(() => {
    let cancelled = false;
    setLoadingAnnotations(true);
    setError('');
    listAnalysisItemAnnotations(item)
      .then((rows) => {
        if (cancelled) return;
        setAnnotations(rows);

        // Auto-populate findings if they are currently empty and annotations exist
        if (rows.length > 0 && (!item.structured_findings || item.structured_findings.length === 0)) {
          const autoFindings = rows.map((annotation, index) => {
            const details = extractAnnotationDetails(annotation);
            return {
              id: newId(),
              marker_number: index + 1,
              annotation_id: annotation.id,
              measurement_id: null,
              region: details.region,
              tooth_numbers: item.tooth_numbers || [],
              title: details.title,
              description: details.description,
              annotation_type: annotation.type || annotation.annotation_type || null,
              display_order: index,
            };
          });
          onChange(autoFindings);
        }
      })
      .catch((loadError) => { if (!cancelled) setError(loadError.message); })
      .finally(() => { if (!cancelled) setLoadingAnnotations(false); });
    return () => { cancelled = true; };
  }, [item.id, item.series_uid, item.study_id, item.viewer_type]);

  const patchFinding = (id, patch) => onChange(findings.map((finding) => (
    finding.id === id ? { ...finding, ...patch } : finding
  )));

  const addFinding = () => {
    if (!annotations.length) {
      setError('Buat dan simpan anotasi lokasi di viewer terlebih dahulu.');
      return;
    }
    const markerNumber = Math.max(0, ...findings.map((finding) => Number(finding.marker_number) || 0)) + 1;
    const annotation = annotations.find((entry) => !findings.some((finding) => finding.annotation_id === entry.id)) || annotations[0];
    const details = extractAnnotationDetails(annotation);

    onChange([...findings, {
      id: newId(),
      marker_number: markerNumber,
      annotation_id: annotation.id,
      measurement_id: null,
      region: details.region,
      tooth_numbers: item.tooth_numbers || [],
      title: details.title,
      description: details.description,
      annotation_type: annotation.type || annotation.annotation_type || null,
      display_order: findings.length,
    }]);
  };

  return <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
    <div className="flex items-center justify-between gap-3">
      <div><div className="text-sm font-semibold text-slate-200">Marker dan temuan</div><p className="text-[11px] text-slate-500">Setiap nomor terhubung ke satu anotasi lokasi pada radiografi ini.</p></div>
      <button type="button" onClick={addFinding} disabled={loadingAnnotations} className="rounded-lg border border-cyan-500/40 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/10 disabled:opacity-50">+ Tambah temuan</button>
    </div>
    {loadingAnnotations && <p className="mt-3 text-xs text-slate-500">Memuat anotasi…</p>}
    {error && <p className="mt-3 text-xs text-rose-300">{error}</p>}
    {!loadingAnnotations && !annotations.length && !error && <p className="mt-3 rounded-lg bg-slate-900 p-3 text-xs text-slate-400">Belum ada anotasi tersimpan. Buka viewer, tandai lokasi, lalu kembali ke workspace.</p>}
    <div className="mt-3 space-y-3">
      {findings.map((finding, index) => <div key={finding.id} className="grid gap-2 rounded-xl border border-slate-800 bg-slate-900 p-3 md:grid-cols-[52px_1.2fr_1fr_auto]">
        <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-cyan-700 text-sm font-black text-white" title="Nomor marker stabil">{finding.marker_number}</div>
        <label className="text-[11px] text-slate-400">Anotasi lokasi<select className={`${inputClass} mt-1`} value={finding.annotation_id || ''} onChange={(event) => {
          const annotation = annotations.find((entry) => entry.id === event.target.value);
          const details = extractAnnotationDetails(annotation);
          patchFinding(finding.id, {
            annotation_id: event.target.value,
            annotation_type: annotation?.type || annotation?.annotation_type || null,
            title: details.title || finding.title || '',
            description: details.description || finding.description || '',
            region: details.region || finding.region || ''
          });
        }}><option value="">Pilih anotasi…</option>{annotations.map((annotation) => <option key={annotation.id} value={annotation.id}>{annotation.label || annotation.metadata?.finding_type || annotation.type || annotation.annotation_type} — {annotation.id.slice(0, 8)}</option>)}</select></label>
        <label className="text-[11px] text-slate-400">Gigi / regio<input className={`${inputClass} mt-1`} placeholder="Gigi 11 / regio anterior" value={finding.region || ''} onChange={(event) => patchFinding(finding.id, { region: event.target.value })} /></label>
        <button type="button" title="Hapus temuan" onClick={() => onChange(findings.filter((entry) => entry.id !== finding.id).map((entry, order) => ({ ...entry, display_order: order })))} className="self-end rounded-lg p-2 text-rose-300 hover:bg-rose-500/10"><AppIcon name="Trash2" size={16} /></button>
        <label className="text-[11px] text-slate-400 md:col-start-2">Judul singkat<input className={`${inputClass} mt-1`} value={finding.title || ''} onChange={(event) => patchFinding(finding.id, { title: event.target.value })} /></label>
        <label className="text-[11px] text-slate-400 md:col-span-2">Uraian temuan<textarea rows={2} className={`${inputClass} mt-1`} value={finding.description || ''} onChange={(event) => patchFinding(finding.id, { description: event.target.value, display_order: index })} /></label>
      </div>)}
    </div>
  </div>;
}

function SourceFields({ sources, selectedSource, setSelectedSource, type, setType, teeth, setTeeth }) {
  return <div className="grid gap-3 md:grid-cols-2">
    <label className="text-xs text-muted md:col-span-2">Studi / series<select className={`${inputClass} mt-1`} value={selectedSource} onChange={(e) => setSelectedSource(e.target.value)}><option value="">Pilih radiografi…</option>{sources.map((source) => <option key={source.key} value={source.key}>{source.label}</option>)}</select></label>
    <label className="text-xs text-muted">Jenis radiografi<select className={`${inputClass} mt-1`} value={type} onChange={(e) => setType(e.target.value)}>{RADIOGRAPH_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    <label className="text-xs text-muted">Nomor gigi (wajib periapikal)<input className={`${inputClass} mt-1`} placeholder="11, 36" value={teeth} onChange={(e) => setTeeth(e.target.value)} /></label>
  </div>;
}
