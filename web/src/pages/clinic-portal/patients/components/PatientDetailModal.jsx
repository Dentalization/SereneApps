import React, { useState, useMemo } from 'react';
import Icon from '../../../../components/AppIcon';
import ModalPortal from '../../../../components/ui/ModalPortal';
import { useAuth } from '../../../../contexts/AuthContext';
import { fetchClinicTeledentistrySummary } from '../../../../services/clinicTeledentistryService';
import { canViewSummaries, getClinicRole } from '../../../../utils/clinicRoles';
import { resolveMediaUrl } from '../../../../utils/media';

if (typeof document !== 'undefined' && !document.getElementById('modal-animations')) {
  const style = document.createElement('style');
  style.id = 'modal-animations';
  style.textContent = `
    @keyframes modalSlideUp {
      from {
        opacity: 0;
        transform: translateY(20px) scale(0.98);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
    @keyframes backdropFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `;
  document.head.appendChild(style);
}


/* ─── helpers ──────────────────────────────────────────────────────────── */
const fmt = (d, locale = 'id-ID') => {
  if (!d) return '-';
  try { return new Date(d).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return '-'; }
};

const fmtCurrency = (v) => {
  if (v == null) return '-';
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v);
};

const formatAddress = (addr) => {
  if (!addr) return null;
  if (typeof addr === 'string') return addr;
  if (typeof addr === 'object') {
    return [
      addr.street || addr.streetAddress || addr.line1,
      addr.line2,
      addr.city,
      addr.province,
      addr.postalCode
    ].filter(Boolean).join(', ') || null;
  }
  return null;
};

const statusConfig = {
  scheduled: { bg: 'bg-blue-500/10', text: 'text-blue-400', dot: 'bg-blue-400', label: 'Dijadwalkan' },
  confirmed: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400', label: 'Dikonfirmasi' },
  completed: { bg: 'bg-green-500/10', text: 'text-green-400', dot: 'bg-green-400', label: 'Selesai' },
  cancelled: { bg: 'bg-red-500/10', text: 'text-red-400', dot: 'bg-red-400', label: 'Dibatalkan' },
  'no-show': { bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-400', label: 'No Show' },
  rescheduled: { bg: 'bg-purple-500/10', text: 'text-purple-400', dot: 'bg-purple-400', label: 'Dijadwal Ulang' },
};

const getStatusConfig = (s) => statusConfig[s] || { bg: 'bg-gray-500/10', text: 'text-gray-400', dot: 'bg-gray-400', label: s };

/* ─── Stat pill ─────────────────────────────────────────────────────── */
const StatPill = ({ icon, label, value, accent = 'accent' }) => (
  <div className="flex flex-col items-center p-3 rounded-xl bg-surface/80 border border-primary/10 min-w-0">
    <div className={`w-9 h-9 rounded-full flex items-center justify-center mb-1.5`} style={{ background: `var(--${accent}, #6366f1)15` }}>
      <Icon name={icon} size={16} className="text-accent" />
    </div>
    <span className="text-lg font-bold text-primary leading-none">{value}</span>
    <span className="text-[10px] text-secondary mt-0.5 uppercase tracking-wider">{label}</span>
  </div>
);

/* ─── Tab button ──────────────────────────────────────────────────── */
const Tab = ({ active, icon, label, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200
      ${active
        ? 'bg-accent text-white shadow-lg shadow-accent/25'
        : 'text-secondary hover:text-primary hover:bg-surface/80'
      }`}
  >
    <Icon name={icon} size={15} />
    {label}
  </button>
);

/* ─── Info row ───────────────────────────────────────────────────── */
const InfoRow = ({ icon, label, value }) => (
  <div className="flex items-start gap-3 py-2.5">
    <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
      <Icon name={icon} size={14} className="text-accent" />
    </div>
    <div className="min-w-0 flex-1">
      <div className="text-xs text-secondary">{label}</div>
      <div className="text-sm font-medium text-primary truncate">
        {value === null || value === undefined || value === '' ? '—' : value}
      </div>
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════════════════ */
const PatientDetailModal = ({ patient, isOpen, onClose, allAppointments = [], initialTab = 'overview' }) => {
  const { user } = useAuth();
  const [tab, setTab] = useState(initialTab);
  const [summaryState, setSummaryState] = useState({ open: false, loading: false, error: '', data: null });
  const clinicRole = getClinicRole(user);
  const canViewTeleSummaries = canViewSummaries(clinicRole);

  // Sync tab when initialTab changes (e.g. opening from different action buttons)
  React.useEffect(() => {
    if (isOpen) setTab(initialTab);
  }, [isOpen, initialTab]);

  if (!isOpen || !patient) return null;

  // Patient-specific appointments sorted newest first
  const patientAppointments = (patient.appointments || [])
    .filter(Boolean)
    .sort((a, b) => {
      const dateB = new Date(b.startsAt || b.date);
      const dateA = new Date(a.startsAt || a.date);
      return (isNaN(dateB.getTime()) ? 0 : dateB) - (isNaN(dateA.getTime()) ? 0 : dateA);
    });

  const upcomingApts = patientAppointments.filter(a => a && (a.status === 'scheduled' || a.status === 'confirmed'));
  const completedApts = patientAppointments.filter(a => a && a.status === 'completed');
  const totalRevenue = patientAppointments.filter(a => a && a.isPaid).reduce((s, a) => s + (a.fee || 0), 0);

  const handleViewTeleSummary = async (appointmentId) => {
    setSummaryState({ open: true, loading: true, error: '', data: null });
    try {
      const data = await fetchClinicTeledentistrySummary(appointmentId);
      setSummaryState({ open: true, loading: false, error: '', data });
    } catch (err) {
      setSummaryState({
        open: true,
        loading: false,
        error: err?.response?.data?.error?.code || 'Gagal memuat summary.',
        data: null
      });
    }
  };

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4"
        onClick={onClose}
        style={{ animation: 'backdropFadeIn 0.2s ease-out' }}
      >
        <div
          className="relative w-full max-w-5xl max-h-[92vh] rounded-2xl overflow-hidden flex flex-col"
          style={{
            background: 'linear-gradient(135deg, var(--surface-elevated) 0%, var(--surface) 100%)',
            boxShadow: '0 25px 60px -12px rgba(0,0,0,.4), 0 0 0 1px rgba(255,255,255,.05)',
            animation: 'modalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* ─── Top card: avatar + quick stats ─── */}
          <div className="relative overflow-hidden">
            {/* Gradient background accent */}
            <div className="absolute inset-0 opacity-40" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 50%, #10b981 100%)' }} />
            <div className="absolute inset-0 bg-surface-elevated/80 backdrop-blur-sm" />

            <div className="relative p-6">
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute right-4 top-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
              >
                <Icon name="X" size={16} className="text-primary" />
              </button>

              <div className="flex items-start gap-5">
                {/* Avatar */}
                {patient.avatar ? (
                  <img
                    src={resolveMediaUrl(patient.avatar)}
                    alt={patient.name}
                    className="w-16 h-16 rounded-2xl object-cover flex-shrink-0"
                    style={{ boxShadow: '0 8px 24px -4px rgba(99,102,241,.4)' }}
                    onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                  />
                ) : null}
                <div
                  className="w-16 h-16 rounded-2xl items-center justify-center flex-shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
                    boxShadow: '0 8px 24px -4px rgba(99,102,241,.4)',
                    display: patient.avatar ? 'none' : 'flex'
                  }}
                >
                  <span className="text-xl font-bold text-white">
                    {(patient.name || '').split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold text-primary">{patient.name}</h2>
                  <div className="flex flex-wrap items-center gap-3 mt-1">
                    {patient.gender && (
                      <span className="inline-flex items-center gap-1 text-xs text-secondary">
                        <Icon name="User" size={12} />
                        {patient.gender === 'M' ? 'Laki-laki' : 'Perempuan'}
                      </span>
                    )}
                    {patient.age && (
                      <span className="inline-flex items-center gap-1 text-xs text-secondary">
                        <Icon name="Calendar" size={12} />
                        {patient.age} tahun
                      </span>
                    )}
                    {patient.phone && (
                      <span className="inline-flex items-center gap-1 text-xs text-secondary">
                        <Icon name="Phone" size={12} />
                        {patient.phone}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick stats row */}
              <div className="grid grid-cols-4 gap-3 mt-5">
                <StatPill icon="Activity" label="Kunjungan" value={patient.totalVisits || 0} />
                <StatPill icon="CalendarCheck" label="Mendatang" value={upcomingApts.length} />
                <StatPill icon="CheckCircle" label="Selesai" value={completedApts.length} />
                <StatPill icon="Wallet" label="Revenue" value={fmtCurrency(totalRevenue)} />
              </div>
            </div>
          </div>

          {/* ─── Tab bar ─── */}
          <div className="flex gap-2 px-6 py-3 border-b border-primary/10 bg-surface/40">
            <Tab active={tab === 'overview'} icon="User" label="Profil" onClick={() => setTab('overview')} />
            <Tab active={tab === 'history'} icon="Clock" label="Riwayat" onClick={() => setTab('history')} />
            <Tab active={tab === 'schedule'} icon="Calendar" label="Jadwal" onClick={() => setTab('schedule')} />
          </div>

          {/* ─── Tab content ─── */}
          <div className="flex-1 overflow-y-auto p-6">
            {tab === 'overview' && <OverviewTab patient={patient} />}
            {tab === 'history' && (
              <HistoryTab
                appointments={patientAppointments}
                canViewTeleSummaries={canViewTeleSummaries}
                onViewTeleSummary={handleViewTeleSummary}
              />
            )}
            {tab === 'schedule' && <ScheduleTab upcoming={upcomingApts} onViewHistory={() => setTab('history')} />}
          </div>
        </div>
        <ClinicTeleSummaryModal
          state={summaryState}
          onClose={() => setSummaryState({ open: false, loading: false, error: '', data: null })}
        />
      </div>
    </ModalPortal>
  );
};

/* ═══ OVERVIEW TAB ═══════════════════════════════════════════════════ */
const OverviewTab = ({ patient }) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    {/* Personal info card */}
    <div className="rounded-xl border border-primary/10 bg-surface/50 p-5">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-primary mb-4">
        <div className="w-6 h-6 rounded-lg bg-blue-500/10 flex items-center justify-center">
          <Icon name="UserCheck" size={13} className="text-blue-400" />
        </div>
        Informasi Pribadi
      </h3>
      <div className="space-y-0.5">
        <InfoRow icon="User" label="Nama Lengkap" value={patient.name} />
        <InfoRow icon="Mail" label="Email" value={patient.email} />
        <InfoRow icon="Phone" label="Telepon" value={patient.phone} />
        <InfoRow icon="MapPin" label="Alamat" value={formatAddress(patient.address)} />
        <InfoRow icon="Calendar" label="Tanggal Lahir" value={fmt(patient.dateOfBirth)} />
        <InfoRow icon="Shield" label="Penyedia Asuransi" value={patient.insuranceProvider} />
        <InfoRow icon="FileKey" label="Nomor Polis" value={patient.insuranceNumber} />
        <InfoRow icon="BadgeCheck" label="ID Anggota" value={patient.insuranceMemberId} />
        <InfoRow icon="Languages" label="Bahasa Pilihan" value={patient.preferredLanguage} />
      </div>
    </div>

    {/* Medical info card */}
    <div className="rounded-xl border border-primary/10 bg-surface/50 p-5">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-primary mb-4">
        <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center">
          <Icon name="Heart" size={13} className="text-emerald-400" />
        </div>
        Riwayat Medis
      </h3>
      <div className="space-y-0.5">
         <InfoRow icon="AlertTriangle" label="Alergi" value={
          Array.isArray(patient.medicalRecord?.allergies) && patient.medicalRecord.allergies.length > 0
            ? patient.medicalRecord.allergies.join(', ')
            : null
        } />
        <InfoRow icon="FileText" label="Kondisi" value={
          Array.isArray(patient.medicalRecord?.conditions) && patient.medicalRecord.conditions.length > 0
            ? patient.medicalRecord.conditions.join(', ')
            : null
        } />
        <InfoRow icon="Droplet" label="Golongan Darah" value={patient.medicalRecord?.bloodType} />
        <InfoRow icon="Stethoscope" label="Perawatan Terakhir" value={patient.medicalRecord?.lastTreatment} />
      </div>

      <div className="mt-4 border-t border-primary/10 pt-4">
        <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-secondary">Kontak Darurat</h4>
        <InfoRow icon="UserRound" label="Nama" value={patient.emergencyContact?.name} />
        <InfoRow
          icon="Phone"
          label="Telepon"
          value={patient.emergencyContact?.phone || patient.emergencyContact?.number}
        />
        <InfoRow icon="UsersRound" label="Hubungan" value={patient.emergencyContact?.relationship} />
      </div>
    </div>

    <div className="lg:col-span-2 rounded-xl border border-primary/10 bg-surface/50 p-5">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-primary">
        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-500/10">
          <Icon name="ClipboardHeart" size={13} className="text-blue-500" />
        </div>
        Pre-Session Health Form Terbaru
      </h3>
      {patient.latestHealthForm ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <InfoRow icon="Activity" label="Gejala" value={patient.latestHealthForm.symptoms} />
          <InfoRow icon="Gauge" label="Skala Nyeri" value={patient.latestHealthForm.painLevel ?? '—'} />
          <InfoRow icon="ShieldAlert" label="Alergi" value={patient.latestHealthForm.allergies} />
          <InfoRow icon="Pill" label="Obat" value={patient.latestHealthForm.medications} />
          <InfoRow icon="Notebook" label="Catatan" value={patient.latestHealthForm.notes} />
          <InfoRow icon="Clock" label="Dikirim" value={fmt(patient.latestHealthForm.submittedAt)} />
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-primary/15 p-5 text-center text-sm text-secondary">
          Belum ada formulir kesehatan yang dikirim.
        </div>
      )}
    </div>

    {/* Visit timeline summary card */}
    <div className="lg:col-span-2 rounded-xl border border-primary/10 bg-surface/50 p-5">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-primary mb-4">
        <div className="w-6 h-6 rounded-lg bg-purple-500/10 flex items-center justify-center">
          <Icon name="TrendingUp" size={13} className="text-purple-400" />
        </div>
        Ringkasan Kunjungan
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <InfoRow icon="Calendar" label="Kunjungan Pertama" value={fmt(patient.createdAt)} />
        <InfoRow icon="Clock" label="Kunjungan Terakhir" value={fmt(patient.lastVisit)} />
        <InfoRow icon="Stethoscope" label="Dokter Terakhir" value={patient.doctorName} />
        <InfoRow icon="Activity" label="Total Kunjungan" value={patient.totalVisits || 0} />
      </div>
    </div>
  </div>
);

/* ═══ HISTORY TAB ═══════════════════════════════════════════════════ */
const isVirtualAppointment = (appointment) => ['virtual', 'tele', 'teledentistry'].includes(String(appointment.consultationType || '').toLowerCase());

const HistoryTab = ({ appointments = [], canViewTeleSummaries = false, onViewTeleSummary }) => {
  const [filter, setFilter] = useState('all');

  const validAppointments = (appointments || []).filter(Boolean);
  const filtered = filter === 'all' ? validAppointments : validAppointments.filter(a => a.status === filter);

  const uniqueStatuses = [...new Set(validAppointments.map(a => a.status).filter(Boolean))];

  return (
    <div>
      {/* Filter chips */}
      <div className="flex flex-wrap gap-2 mb-5">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === 'all' ? 'bg-accent text-white shadow-md shadow-accent/20' : 'bg-surface/80 text-secondary hover:text-primary border border-primary/10'
            }`}
        >
          Semua ({appointments.length})
        </button>
        {uniqueStatuses.map(s => {
          const cfg = getStatusConfig(s);
          const count = appointments.filter(a => a.status === s).length;
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === s ? `${cfg.bg} ${cfg.text} shadow-md` : 'bg-surface/80 text-secondary hover:text-primary border border-primary/10'
                }`}
            >
              {cfg.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Appointments timeline */}
      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <Icon name="CalendarX" size={40} className="text-secondary/30 mx-auto mb-3" />
          <p className="text-secondary text-sm">Tidak ada riwayat appointment</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((apt, i) => {
            const cfg = getStatusConfig(apt.status);
            return (
              <div key={apt.id || i} className="group relative flex gap-4 p-4 rounded-xl border border-primary/8 bg-surface/50 hover:bg-surface/80 transition-all duration-200">
                {/* Timeline dot */}
                <div className="flex flex-col items-center">
                  <div className={`w-3 h-3 rounded-full ${cfg.dot} ring-4 ring-surface-elevated`} />
                  {i < filtered.length - 1 && <div className="w-px flex-1 bg-primary/10 mt-1" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-primary">{apt.treatment || apt.reason || 'Appointment'}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-secondary">
                    <span className="inline-flex items-center gap-1">
                      <Icon name="Calendar" size={11} /> {fmt(apt.date || apt.startsAt)}
                    </span>
                    {apt.time && (
                      <span className="inline-flex items-center gap-1">
                        <Icon name="Clock" size={11} /> {apt.time}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <Icon name="Stethoscope" size={11} /> {apt.dentistName || '-'}
                    </span>
                    {apt.fee != null && (
                      <span className="inline-flex items-center gap-1">
                        <Icon name="Wallet" size={11} /> {fmtCurrency(apt.fee)}
                        {apt.isPaid && <Icon name="CheckCircle" size={11} className="text-emerald-400" />}
                      </span>
                    )}
                    {apt.consultationType && (
                      <span className="inline-flex items-center gap-1 capitalize">
                        <Icon name="Monitor" size={11} /> {apt.consultationType}
                      </span>
                    )}
                  </div>
                  {apt.notes && (
                    <p className="mt-1.5 text-xs text-secondary/70 italic">"{apt.notes}"</p>
                  )}
                  {apt.healthForm && (
                    <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50/80 p-3 text-xs text-blue-900">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <span className="inline-flex items-center gap-1.5 font-semibold">
                          <Icon name="ClipboardHeart" size={13} />
                          Pre-session health form
                        </span>
                        <span>{fmt(apt.healthForm.submittedAt)}</span>
                      </div>
                      <div className="grid gap-1 sm:grid-cols-2">
                        <span>Gejala: {apt.healthForm.symptoms || '-'}</span>
                        <span>Skala nyeri: {apt.healthForm.painLevel ?? '-'}</span>
                        <span>Alergi: {apt.healthForm.allergies || '-'}</span>
                        <span>Obat: {apt.healthForm.medications || '-'}</span>
                      </div>
                      {apt.healthForm.notes && <p className="mt-2">Catatan: {apt.healthForm.notes}</p>}
                    </div>
                  )}
                  {canViewTeleSummaries && isVirtualAppointment(apt) && (
                    <button
                      onClick={() => onViewTeleSummary?.(apt.id)}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-xs font-medium text-cyan-700 hover:bg-cyan-100"
                    >
                      <Icon name="FileText" size={12} />
                      View Summary
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const ClinicTeleSummaryModal = ({ state, onClose }) => {
  if (!state.open) return null;
  const summary = state.data?.summary;
  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-primary/15 bg-surface-elevated p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-primary">Ringkasan Teledentistry</h3>
            <p className="text-sm text-secondary">
              Appointment #{state.data?.appointment?.id || '-'}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-muted hover:bg-primary/10">
            <Icon name="X" size={18} />
          </button>
        </div>
        {state.loading && <p className="text-sm text-secondary">Memuat summary...</p>}
        {state.error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</div>}
        {!state.loading && !state.error && !summary && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            Summary belum final atau belum tersedia.
          </div>
        )}
        {summary && (
          <div className="space-y-3">
            <SummaryLine label="Keluhan utama" value={summary.chiefComplaint} />
            <SummaryLine label="Temuan objektif" value={summary.objectiveFindings} />
            <SummaryLine label="Assessment" value={summary.assessment} />
            <SummaryLine label="Rencana tindakan" value={summary.plan} />
            <SummaryLine label="Rekomendasi" value={(summary.recommendations || []).join('\n')} />
          </div>
        )}
      </div>
    </div>
  );
};

const SummaryLine = ({ label, value }) => (
  <section className="rounded-xl border border-primary/10 bg-surface p-3">
    <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
    <p className="mt-1 whitespace-pre-wrap text-sm text-primary">{value || '-'}</p>
  </section>
);

/* ═══ SCHEDULE TAB ══════════════════════════════════════════════════ */
const ScheduleTab = ({ upcoming, onViewHistory }) => (
  <div>
    <h3 className="text-sm font-semibold text-primary mb-4 flex items-center gap-2">
      <Icon name="CalendarClock" size={16} className="text-accent" />
      Jadwal Mendatang
    </h3>

    {upcoming.length === 0 ? (
      <div className="text-center py-16 rounded-xl border border-dashed border-primary/15 bg-surface/30">
        <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
          <Icon name="CalendarPlus" size={28} className="text-accent" />
        </div>
        <p className="text-primary font-medium mb-1">Belum Ada Jadwal</p>
        <p className="text-secondary text-sm mx-auto max-w-xs mb-4">
          Pasien ini belum memiliki appointment yang dijadwalkan.
        </p>
        {onViewHistory && (
          <button
            onClick={onViewHistory}
            className="px-4 py-2 bg-accent/10 text-accent hover:bg-accent/20 rounded-xl transition-all duration-200 font-semibold text-xs flex items-center justify-center mx-auto space-x-1.5"
          >
            <Icon name="Clock" size={13} />
            <span>Lihat Riwayat Kunjungan</span>
          </button>
        )}
      </div>
    ) : (
      <div className="space-y-3">
        {upcoming.map((apt, i) => {
          const cfg = getStatusConfig(apt.status);
          return (
            <div key={apt.id || i} className="relative p-5 rounded-xl border border-primary/10 bg-surface/50 hover:shadow-lg transition-all duration-200">
              {/* Left accent bar */}
              <div className={`absolute left-0 top-3 bottom-3 w-1 rounded-full ${cfg.dot}`} />

              <div className="pl-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="text-sm font-semibold text-primary">{apt.treatment || apt.reason || 'Appointment'}</div>
                    <div className="text-xs text-secondary mt-0.5">Dengan {apt.dentistName || '-'}</div>
                  </div>
                  <span className={`text-[10px] px-2.5 py-1 rounded-full font-medium ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                </div>

                <div className="flex items-center gap-4 text-xs text-secondary mt-3">
                  <span className="inline-flex items-center gap-1.5 bg-surface rounded-lg px-3 py-1.5">
                    <Icon name="Calendar" size={13} className="text-accent" />
                    {fmt(apt.date || apt.startsAt)}
                  </span>
                  {apt.time && (
                    <span className="inline-flex items-center gap-1.5 bg-surface rounded-lg px-3 py-1.5">
                      <Icon name="Clock" size={13} className="text-accent" />
                      {apt.time}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 bg-surface rounded-lg px-3 py-1.5 capitalize">
                    <Icon name="Monitor" size={13} className="text-accent" />
                    {apt.consultationType || 'onsite'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    )}
  </div>
);

export default PatientDetailModal;
