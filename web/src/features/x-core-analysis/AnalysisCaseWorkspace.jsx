import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AppIcon from '../../components/AppIcon';
import { getAccessToken } from '../../utils/auth/tokenStorage';
import {
  createAnalysisCase,
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
const inputClass = 'w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500';

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
    return series.map((entry) => ({
      key: `${study.id}:${resolveSeriesUid(entry)}`,
      study,
      series: entry,
      label: `${study.patient?.name || study.patientName || 'Tanpa pasien'} — ${study.originalName || study.original_name || study.description || `Studi ${study.id}`} / ${entry.series_description || entry.description || `Series ${entry.seriesNumber || entry.id || ''}`}`,
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

  const compatibleSources = sources.filter((entry) => !activeCase || String(entry.study.patientId || entry.study.patient_id || '') === String(activeCase.patient_id));

  return (
    <div className="fixed inset-0 z-[200] flex bg-slate-950/95 text-slate-100 backdrop-blur">
      <aside className="w-80 shrink-0 border-r border-slate-800 bg-slate-900 p-4">
        <div className="mb-5 flex items-center justify-between">
          <div><h2 className="font-semibold">X-Core Analysis Cases</h2><p className="text-xs text-slate-400">Paket analisis multi-citra</p></div>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-slate-800"><AppIcon name="X" size={18} /></button>
        </div>
        <button onClick={() => setActiveCase(null)} className="mb-4 w-full rounded-xl bg-cyan-600 px-3 py-2 text-sm font-semibold hover:bg-cyan-500">+ Kasus baru</button>
        <div className="space-y-2 overflow-y-auto">
          {cases.map((entry) => (
            <button key={entry.id} onClick={() => loadCase(entry.id)} className={`w-full rounded-xl border p-3 text-left ${activeCase?.id === entry.id ? 'border-cyan-500 bg-cyan-500/10' : 'border-slate-800 bg-slate-950 hover:border-slate-700'}`}>
              <div className="truncate text-sm font-medium">{entry.title}</div>
              <div className="mt-1 text-xs text-slate-400">{entry.patient_name} • {entry.item_count} citra • {entry.report_count} PDF</div>
            </button>
          ))}
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-y-auto p-6">
        {loading ? <div className="flex h-full items-center justify-center"><AppIcon name="Loader2" className="animate-spin text-cyan-400" size={30} /></div> : !activeCase ? (
          <div className="mx-auto max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h3 className="text-lg font-semibold">Buat kasus analisis</h3>
            <p className="mb-5 mt-1 text-sm text-slate-400">Pilih radiografi pertama. Citra berikutnya harus milik pasien yang sama.</p>
            <SourceFields sources={sources} selectedSource={selectedSource} setSelectedSource={setSelectedSource} type={newType} setType={setNewType} teeth={newTeeth} setTeeth={setNewTeeth} />
            <button disabled={saving} onClick={createCase} className="mt-5 rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-semibold disabled:opacity-50">Buat kasus</button>
            {message && <p className="mt-4 text-sm text-amber-300">{message}</p>}
          </div>
        ) : (
          <div className="mx-auto max-w-6xl space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><h3 className="text-xl font-semibold">{activeCase.title}</h3><p className="text-xs text-slate-400">{activeCase.patient?.name} • {activeCase.items.length} citra • diperbarui {new Date(activeCase.updated_at).toLocaleString('id-ID')}</p></div>
              <div className="flex gap-2">
                <button onClick={save} disabled={saving} className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold hover:bg-slate-800">Simpan analisis</button>
                <button onClick={generate} disabled={saving} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold hover:bg-emerald-500 disabled:opacity-50">Buat PDF laporan</button>
              </div>
            </div>
            {message && <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">{message}</div>}
            {preflightIssues.length > 0 && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100"><div className="font-semibold">Laporan belum siap</div><ul className="mt-2 list-disc space-y-1 pl-5">{preflightIssues.map((issue) => <li key={`${issue.item_id}-${issue.code}`}>Citra {issue.display_order + 1}: {issue.message}</li>)}</ul></div>}

            <section className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 md:grid-cols-2">
              <label className="text-xs text-slate-400">Judul kasus<input className={`${inputClass} mt-1`} value={activeCase.title} onChange={(e) => setActiveCase({ ...activeCase, title: e.target.value })} /></label>
              <label className="text-xs text-slate-400">Keluhan utama<input className={`${inputClass} mt-1`} value={activeCase.clinical_data?.chief_complaint || ''} onChange={(e) => setActiveCase({ ...activeCase, clinical_data: { ...activeCase.clinical_data, chief_complaint: e.target.value } })} /></label>
              <label className="text-xs text-slate-400 md:col-span-2">Indikasi klinis<textarea rows={2} className={`${inputClass} mt-1`} value={activeCase.clinical_data?.clinical_indication || ''} onChange={(e) => setActiveCase({ ...activeCase, clinical_data: { ...activeCase.clinical_data, clinical_indication: e.target.value } })} /></label>
              <label className="text-xs text-slate-400 md:col-span-2">Data klinis / riwayat<textarea rows={3} className={`${inputClass} mt-1`} value={activeCase.clinical_data?.clinical_notes || ''} onChange={(e) => setActiveCase({ ...activeCase, clinical_data: { ...activeCase.clinical_data, clinical_notes: e.target.value } })} /></label>
              <label className="text-xs text-slate-400 md:col-span-2">Kesimpulan<textarea rows={3} className={`${inputClass} mt-1`} value={activeCase.conclusion || ''} onChange={(e) => setActiveCase({ ...activeCase, conclusion: e.target.value })} /></label>
            </section>

            <section className="space-y-3">
              {activeCase.items.map((item, index) => (
                <article key={item.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div><div className="font-semibold">{caseItemLabel(item, activeCase.items)}</div><div className="text-xs text-slate-500">{item.study_name || `Study ${item.study_id}`} • Series {item.series_uid}</div></div>
                    <div className="flex items-center gap-1">
                      <RenderStatusBadge status={item.render_status} />
                      <button onClick={() => moveItem(index, -1)} disabled={!index} className="rounded-lg p-2 hover:bg-slate-800 disabled:opacity-30"><AppIcon name="ArrowUp" size={15} /></button>
                      <button onClick={() => moveItem(index, 1)} disabled={index === activeCase.items.length - 1} className="rounded-lg p-2 hover:bg-slate-800 disabled:opacity-30"><AppIcon name="ArrowDown" size={15} /></button>
                      <button onClick={() => openItem(item)} disabled={saving} className="rounded-lg bg-cyan-600 px-3 py-2 text-xs font-semibold disabled:opacity-50">{item.render_status?.ready ? 'Buka viewer' : 'Perbarui Gambar Laporan'}</button>
                      {activeCase.items.length > 1 && <button onClick={() => setActiveCase({ ...activeCase, items: normalizeOrders(activeCase.items.filter((candidate) => candidate.id !== item.id)) })} className="rounded-lg p-2 text-rose-300 hover:bg-rose-500/10"><AppIcon name="Trash2" size={15} /></button>}
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    <label className="text-xs text-slate-400">Jenis<select className={`${inputClass} mt-1`} value={item.radiograph_type} onChange={(e) => patchItem(item.id, { radiograph_type: e.target.value })}>{RADIOGRAPH_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                    <label className="text-xs text-slate-400">Nomor gigi<input className={`${inputClass} mt-1`} placeholder="11, 12" value={(item.tooth_numbers || []).join(', ')} onChange={(e) => patchItem(item.id, { tooth_numbers: e.target.value.split(/[ ,]+/).filter(Boolean) })} /></label>
                    <label className="text-xs text-slate-400">Judul opsional<input className={`${inputClass} mt-1`} value={item.title || ''} onChange={(e) => patchItem(item.id, { title: e.target.value })} /></label>
                    {item.findings && <div className="md:col-span-3 rounded-xl border border-amber-500/25 bg-amber-500/5 p-3 text-xs text-amber-200"><div className="font-semibold">Catatan temuan format lama</div><p className="mt-1 whitespace-pre-wrap">{item.findings}</p><p className="mt-2 text-amber-300/70">Catatan ini dipertahankan untuk kompatibilitas. Tambahkan temuan bernomor dan pilih anotasi lokasinya sebelum memperbarui gambar laporan.</p></div>}
                    <div className="md:col-span-3"><FindingEditor item={item} onChange={(structuredFindings) => patchItem(item.id, { structured_findings: structuredFindings })} /></div>
                  </div>
                </article>
              ))}
            </section>

            {activeCase.status !== 'FINALIZED' && <section className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 p-5"><h4 className="mb-3 font-semibold">Tambahkan citra pasien ini</h4><SourceFields sources={compatibleSources} selectedSource={selectedSource} setSelectedSource={setSelectedSource} type={newType} setType={setNewType} teeth={newTeeth} setTeeth={setNewTeeth} /><button onClick={addItem} className="mt-4 rounded-xl bg-slate-700 px-4 py-2 text-sm font-semibold">Tambahkan ke kasus</button></section>}

            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><h4 className="mb-3 font-semibold">Versi PDF tersimpan</h4>{activeCase.reports.length ? <div className="space-y-2">{activeCase.reports.map((report) => <button key={report.id} onClick={() => openAnalysisReport(activeCase.id, report.id).catch((error) => setMessage(error.message))} className="flex w-full items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm hover:border-cyan-600"><span>Versi {report.version} • {report.status}</span><span className="text-xs text-slate-400">{new Date(report.created_at).toLocaleString('id-ID')} • {report.checksum.slice(0, 10)}</span></button>)}</div> : <p className="text-sm text-slate-500">Belum ada PDF.</p>}</section>
          </div>
        )}
      </main>
    </div>
  );
}

function RenderStatusBadge({ status }) {
  const presentation = reportRenderStatusPresentation(status?.status);
  const classes = {
    ready: 'bg-emerald-500/15 text-emerald-300',
    stale: 'bg-orange-500/15 text-orange-300',
    missing: 'bg-amber-500/15 text-amber-300',
    legacy: 'bg-violet-500/15 text-violet-300',
    invalid: 'bg-rose-500/15 text-rose-300',
  }[presentation.tone];
  return <span title={status?.message} className={`mr-2 rounded-full px-2.5 py-1 text-[10px] font-semibold ${classes}`}>{presentation.label}</span>;
}

function FindingEditor({ item, onChange }) {
  const [annotations, setAnnotations] = useState([]);
  const [loadingAnnotations, setLoadingAnnotations] = useState(false);
  const [error, setError] = useState('');
  const findings = item.structured_findings || [];

  useEffect(() => {
    let cancelled = false;
    setLoadingAnnotations(true);
    setError('');
    listAnalysisItemAnnotations(item)
      .then((rows) => { if (!cancelled) setAnnotations(rows); })
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
    onChange([...findings, {
      id: newId(),
      marker_number: markerNumber,
      annotation_id: annotation.id,
      measurement_id: null,
      region: '',
      tooth_numbers: item.tooth_numbers || [],
      title: '',
      description: '',
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
          patchFinding(finding.id, { annotation_id: event.target.value, annotation_type: annotation?.type || annotation?.annotation_type || null });
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
    <label className="text-xs text-slate-400 md:col-span-2">Studi / series<select className={`${inputClass} mt-1`} value={selectedSource} onChange={(e) => setSelectedSource(e.target.value)}><option value="">Pilih radiografi…</option>{sources.map((source) => <option key={source.key} value={source.key}>{source.label}</option>)}</select></label>
    <label className="text-xs text-slate-400">Jenis radiografi<select className={`${inputClass} mt-1`} value={type} onChange={(e) => setType(e.target.value)}>{RADIOGRAPH_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    <label className="text-xs text-slate-400">Nomor gigi (wajib periapikal)<input className={`${inputClass} mt-1`} placeholder="11, 36" value={teeth} onChange={(e) => setTeeth(e.target.value)} /></label>
  </div>;
}
