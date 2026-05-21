import React, { useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../../../../components/AppIcon';
import {
  fetchClinicalSummary,
  finalizeClinicalSummary,
  saveClinicalSummaryDraft
} from '../../../../services/chatService';

const EMPTY_FORM = {
  chiefComplaint: '',
  subjectiveNotes: '',
  objectiveFindings: '',
  assessment: '',
  plan: '',
  recommendationsText: '',
  followUpNeeded: false,
  followUpAt: ''
};

function toForm(summary) {
  if (!summary) return EMPTY_FORM;
  return {
    chiefComplaint: summary.chiefComplaint || '',
    subjectiveNotes: summary.subjectiveNotes || '',
    objectiveFindings: summary.objectiveFindings || '',
    assessment: summary.assessment || '',
    plan: summary.plan || '',
    recommendationsText: Array.isArray(summary.recommendations)
      ? summary.recommendations.join('\n')
      : '',
    followUpNeeded: Boolean(summary.followUpNeeded),
    followUpAt: summary.followUpAt ? new Date(summary.followUpAt).toISOString().slice(0, 16) : ''
  };
}

function toPayload(form) {
  return {
    chiefComplaint: form.chiefComplaint,
    subjectiveNotes: form.subjectiveNotes,
    objectiveFindings: form.objectiveFindings,
    assessment: form.assessment,
    plan: form.plan,
    recommendations: form.recommendationsText
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean),
    followUpNeeded: form.followUpNeeded,
    followUpAt: form.followUpNeeded && form.followUpAt ? new Date(form.followUpAt).toISOString() : null
  };
}

const requiredFields = [
  ['chiefComplaint', 'Keluhan utama'],
  ['objectiveFindings', 'Temuan objektif'],
  ['assessment', 'Assessment'],
  ['plan', 'Rencana tindakan']
];

const SUMMARY_TEMPLATES = [
  {
    label: 'Karies',
    values: {
      assessment: 'Suspek karies gigi. Perlu evaluasi klinis langsung untuk menentukan kedalaman lesi.',
      plan: 'Edukasi kebersihan mulut, evaluasi restorasi, dan jadwalkan kontrol di klinik.',
      recommendationsText: 'Sikat gigi 2x sehari dengan pasta gigi fluoride\nBatasi makanan/minuman manis\nKontrol ke klinik untuk pemeriksaan lanjutan'
    }
  },
  {
    label: 'Gusi berdarah',
    values: {
      assessment: 'Keluhan mengarah ke inflamasi gingiva. Perlu evaluasi plak/kalkulus dan faktor risiko.',
      plan: 'Instruksi oral hygiene, pertimbangkan scaling, dan kontrol ulang sesuai kondisi klinis.',
      recommendationsText: 'Gunakan sikat gigi berbulu lembut\nBersihkan sela gigi\nKontrol jika perdarahan berlanjut'
    }
  },
  {
    label: 'Nyeri gigi',
    values: {
      assessment: 'Nyeri gigi membutuhkan pemeriksaan klinis/radiografis untuk memastikan sumber nyeri.',
      plan: 'Berikan edukasi tanda bahaya, rencanakan kunjungan klinik, dan evaluasi kebutuhan terapi definitif.',
      recommendationsText: 'Hindari mengunyah di sisi yang nyeri\nSegera ke klinik bila bengkak/demam/nyeri berat\nIkuti instruksi obat sesuai resep dokter'
    }
  },
  {
    label: 'Ortodonti',
    values: {
      assessment: 'Konsultasi ortodonti awal. Perlu pemeriksaan oklusi dan dokumentasi klinis.',
      plan: 'Rujuk untuk evaluasi ortodonti lengkap dan pencatatan foto/radiograf bila diperlukan.',
      recommendationsText: 'Jaga kebersihan gigi dan bracket/retainer\nCatat keluhan gigitan atau nyeri\nJadwalkan konsultasi lanjutan'
    }
  },
  {
    label: 'Edukasi OH',
    values: {
      assessment: 'Kebutuhan edukasi kebersihan gigi dan mulut.',
      plan: 'Edukasi teknik sikat gigi, kebiasaan makan, dan jadwal kontrol preventif.',
      recommendationsText: 'Sikat gigi pagi setelah sarapan dan malam sebelum tidur\nGunakan pasta gigi fluoride\nKontrol rutin setiap 6 bulan'
    }
  },
  {
    label: 'Rujukan klinik',
    values: {
      assessment: 'Membutuhkan pemeriksaan/tindakan langsung di klinik.',
      plan: 'Buat follow-up klinik untuk pemeriksaan lanjutan dan rencana perawatan.',
      followUpNeeded: true,
      recommendationsText: 'Datang ke klinik sesuai jadwal follow-up\nBawa riwayat obat/alergi bila ada\nHubungi klinik bila keluhan memburuk'
    }
  }
];

export default function PostCallSummaryPanel({ appointmentId, conversation, open, onClose }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [status, setStatus] = useState('idle');
  const [summaryStatus, setSummaryStatus] = useState('pending');
  const [followUpTasks, setFollowUpTasks] = useState([]);
  const [summaryMeta, setSummaryMeta] = useState({ patientAcknowledgedAt: null, finalizedAt: null });
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);
  const autosaveRef = useRef(null);
  const loadedRef = useRef(false);

  const isFinalized = summaryStatus === 'finalized' || summaryStatus === 'amended';
  const missing = useMemo(
    () => requiredFields.filter(([key]) => !form[key]?.trim()).map(([, label]) => label),
    [form]
  );

  useEffect(() => {
    if (!open || !appointmentId) return;
    loadedRef.current = false;
    setStatus('loading');
    setError('');
    setSummaryMeta({ patientAcknowledgedAt: null, finalizedAt: null });
    fetchClinicalSummary(appointmentId)
      .then((result) => {
        setSummaryStatus(result.status || 'pending');
        setForm(toForm(result.summary));
        setFollowUpTasks(result.summary?.followUpTasks || []);
        setSummaryMeta({
          patientAcknowledgedAt: result.summary?.patientAcknowledgedAt || null,
          finalizedAt: result.summary?.finalizedAt || null
        });
        setDirty(false);
      })
      .catch((err) => setError(err?.response?.data?.error?.code || 'Gagal memuat ringkasan.'))
      .finally(() => {
        loadedRef.current = true;
        setStatus('idle');
      });
  }, [appointmentId, open]);

  useEffect(() => {
    if (!open || !dirty || isFinalized || !loadedRef.current) return undefined;
    if (autosaveRef.current) clearTimeout(autosaveRef.current);
    autosaveRef.current = setTimeout(() => {
      setStatus('saving');
      saveClinicalSummaryDraft(appointmentId, toPayload(form))
        .then((result) => {
          setSummaryStatus(result.status || 'draft');
          setFollowUpTasks(result.summary?.followUpTasks || []);
          setSummaryMeta({
            patientAcknowledgedAt: result.summary?.patientAcknowledgedAt || null,
            finalizedAt: result.summary?.finalizedAt || null
          });
          setDirty(false);
          setError('');
        })
        .catch((err) => setError(err?.response?.data?.error?.code || 'Autosave gagal.'))
        .finally(() => setStatus('idle'));
    }, 1200);
    return () => clearTimeout(autosaveRef.current);
  }, [appointmentId, dirty, form, isFinalized, open]);

  useEffect(() => {
    if (!dirty || isFinalized) return undefined;
    const onBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty, isFinalized]);

  if (!open) return null;

  const updateField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setDirty(true);
  };

  const handleSave = async () => {
    setStatus('saving');
    try {
      const result = await saveClinicalSummaryDraft(appointmentId, toPayload(form));
      setSummaryStatus(result.status || 'draft');
      setFollowUpTasks(result.summary?.followUpTasks || []);
      setSummaryMeta({
        patientAcknowledgedAt: result.summary?.patientAcknowledgedAt || null,
        finalizedAt: result.summary?.finalizedAt || null
      });
      setDirty(false);
      setError('');
    } catch (err) {
      setError(err?.response?.data?.error?.code || 'Gagal menyimpan draft.');
    } finally {
      setStatus('idle');
    }
  };

  const handleFinalize = async () => {
    if (missing.length > 0) {
      setError(`Lengkapi field wajib: ${missing.join(', ')}`);
      return;
    }
    if (!window.confirm('Finalize ringkasan klinis? Setelah final, pasien dapat membacanya.')) return;
    setStatus('saving');
    try {
      const result = await finalizeClinicalSummary(appointmentId, toPayload(form));
      setSummaryStatus(result.status || 'finalized');
      setFollowUpTasks(result.summary?.followUpTasks || []);
      setSummaryMeta({
        patientAcknowledgedAt: result.summary?.patientAcknowledgedAt || null,
        finalizedAt: result.summary?.finalizedAt || null
      });
      setDirty(false);
      setError('');
    } catch (err) {
      setError(err?.response?.data?.error?.code || 'Gagal finalize ringkasan.');
    } finally {
      setStatus('idle');
    }
  };

  const handleClose = () => {
    if (dirty && !isFinalized && !window.confirm('Draft belum tersimpan. Tutup panel?')) return;
    onClose?.();
  };

  const applyTemplate = (template) => {
    if (isFinalized) return;
    setForm((current) => ({
      ...current,
      ...template.values
    }));
    setDirty(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" style={{ background: 'rgba(15,13,26,0.62)', backdropFilter: 'blur(10px)' }}>
      <aside
        className="flex h-full w-full max-w-2xl flex-col shadow-2xl"
        style={{
          background: 'rgba(26,21,40,0.96)',
          borderLeft: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 25px 50px rgba(0,0,0,0.7)',
        }}
      >
        <header className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--td-text-main)' }}>Ringkasan Pasca Konsultasi</h2>
            <p className="text-sm" style={{ color: 'var(--td-text-muted)' }}>
              {conversation?.patient?.name || 'Pasien'} • Appointment #{appointmentId}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-2 transition-all duration-150 hover:scale-105"
            style={{ color: 'var(--td-text-muted)', background: 'rgba(255,255,255,0.04)' }}
            aria-label="Close summary"
          >
            <Icon name="X" size={18} />
          </button>
        </header>

        {error && (
          <div className="mx-5 mt-4 rounded-lg px-3 py-2 text-sm" style={{ background: 'rgba(239,68,68,0.12)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.22)' }}>
            {error}
          </div>
        )}

        {isFinalized && (
          <div className="mx-5 mt-4 rounded-lg px-3 py-2 text-sm" style={{ background: 'rgba(34,197,94,0.1)', color: '#86efac', border: '1px solid rgba(34,197,94,0.2)' }}>
            <div>Ringkasan sudah final dan tampil sebagai read-only.</div>
            <div className="mt-1 text-xs">
              {summaryMeta.patientAcknowledgedAt
                ? `Pasien sudah mengakui ringkasan pada ${new Date(summaryMeta.patientAcknowledgedAt).toLocaleString('id-ID')}.`
                : 'Pasien belum mengakui ringkasan klinis ini.'}
            </div>
          </div>
        )}

        {followUpTasks.length > 0 && (
          <div className="mx-5 mt-4 rounded-lg px-3 py-2 text-sm" style={{ background: 'rgba(124,58,237,0.12)', color: 'var(--td-text-sub)', border: '1px solid rgba(124,58,237,0.22)' }}>
            Follow-up task dibuat: {followUpTasks[0].title} {followUpTasks[0].dueAt ? `• ${new Date(followUpTasks[0].dueAt).toLocaleString()}` : ''}
          </div>
        )}

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4 scrollbar-minimal">
          {!isFinalized && (
            <section className="rounded-lg px-3 py-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="mb-2 text-sm font-medium" style={{ color: 'var(--td-text-main)' }}>Template cepat</div>
              <div className="flex flex-wrap gap-2">
                {SUMMARY_TEMPLATES.map((template) => (
                  <button
                    key={template.label}
                    type="button"
                    onClick={() => applyTemplate(template)}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150"
                    style={{ color: 'var(--td-text-sub)', background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.16)' }}
                  >
                    {template.label}
                  </button>
                ))}
              </div>
            </section>
          )}
          <Field label="Keluhan utama / Chief complaint" required value={form.chiefComplaint} disabled={isFinalized} onChange={(value) => updateField('chiefComplaint', value)} />
          <Field label="Catatan subjektif" value={form.subjectiveNotes} disabled={isFinalized} onChange={(value) => updateField('subjectiveNotes', value)} />
          <Field label="Temuan objektif" required value={form.objectiveFindings} disabled={isFinalized} onChange={(value) => updateField('objectiveFindings', value)} />
          <Field label="Assessment / diagnosis notes" required value={form.assessment} disabled={isFinalized} onChange={(value) => updateField('assessment', value)} />
          <Field label="Rencana tindakan" required value={form.plan} disabled={isFinalized} onChange={(value) => updateField('plan', value)} />
          <Field label="Rekomendasi lanjutan" value={form.recommendationsText} disabled={isFinalized} onChange={(value) => updateField('recommendationsText', value)} />

          <label className="flex items-center gap-3 rounded-lg px-3 py-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <input
              type="checkbox"
              checked={form.followUpNeeded}
              disabled={isFinalized}
              onChange={(event) => updateField('followUpNeeded', event.target.checked)}
            />
            <span className="text-sm font-medium" style={{ color: 'var(--td-text-main)' }}>Follow-up diperlukan</span>
          </label>

          {form.followUpNeeded && (
            <label className="block">
              <span className="text-sm font-medium" style={{ color: 'var(--td-text-main)' }}>Jadwal follow-up</span>
              <input
                type="datetime-local"
                value={form.followUpAt}
                disabled={isFinalized}
                onChange={(event) => updateField('followUpAt', event.target.value)}
                className="mt-1 w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--td-text-main)' }}
              />
            </label>
          )}
        </div>

        <footer className="flex items-center justify-between px-5 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="text-xs" style={{ color: 'var(--td-text-muted)' }}>
            {status === 'saving' ? 'Menyimpan...' : dirty ? 'Belum tersimpan' : 'Tersimpan'}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleSave} disabled={isFinalized || status === 'saving'} className="rounded-lg px-4 py-2 disabled:opacity-50" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--td-text-sub)' }}>
              Save draft
            </button>
            <button onClick={handleFinalize} disabled={isFinalized || status === 'saving'} className="rounded-lg px-4 py-2 text-white disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #7C3AED, #6D28D9)', boxShadow: '0 4px 12px rgba(124,58,237,0.35)' }}>
              Finalize
            </button>
          </div>
        </footer>
      </aside>
    </div>
  );
}

function Field({ label, value, onChange, disabled = false, required = false }) {
  return (
    <label className="block">
      <span className="text-sm font-medium" style={{ color: 'var(--td-text-main)' }}>
        {label}{required ? <span className="text-red-500"> *</span> : null}
      </span>
      <textarea
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
        className="mt-1 w-full resize-y rounded-lg px-3 py-2 text-sm focus:outline-none disabled:opacity-80"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--td-text-main)' }}
      />
    </label>
  );
}
