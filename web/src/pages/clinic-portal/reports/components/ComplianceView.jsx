import React from 'react';
import AppIcon from '../../../../components/AppIcon';

const pct = value => (value == null ? '—' : `${Number(value).toFixed(1)}%`);
const num = value => new Intl.NumberFormat('id-ID').format(Number(value) || 0);

const fmtDate = iso => {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};

const clampPercent = value => Math.min(Math.max(Number(value) || 0, 0), 100);

const MetricCard = ({ label, value, detail, icon, iconClass = 'text-accent' }) => (
  <div className="space-y-3 rounded-2xl border border-primary/15 bg-surface-elevated p-5">
    <div className="flex items-start justify-between">
      <p className="text-xs uppercase tracking-wider text-secondary">{label}</p>
      <AppIcon name={icon} size={18} className={iconClass} />
    </div>
    <p className="text-2xl font-bold text-primary">{value}</p>
    {detail && <p className="text-xs text-secondary">{detail}</p>}
  </div>
);

const BackupChip = ({ status }) => {
  const map = {
    healthy: { label: 'Sehat', bg: 'bg-emerald-500/10 text-emerald-700', icon: 'CheckCircle2' },
    warning: { label: 'Peringatan', bg: 'bg-amber-500/10 text-amber-700', icon: 'AlertTriangle' },
    critical: { label: 'Kritis', bg: 'bg-red-500/10 text-red-600', icon: 'XCircle' },
  };
  const cfg = map[status] || map.warning;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${cfg.bg}`}>
      <AppIcon name={cfg.icon} size={13} />
      {cfg.label}
    </span>
  );
};

const ProgressBar = ({ value, colorClass = 'bg-accent', height = 'h-2' }) => (
  <div className={`w-full overflow-hidden rounded-full bg-surface ${height}`}>
    <div
      className={`${height} rounded-full ${colorClass} transition-all duration-500`}
      style={{ width: `${clampPercent(value)}%` }}
    />
  </div>
);

const SourceNotice = ({ availability }) => {
  const missingSources = availability?.missingSources || [];
  const notes = availability?.notes || [];
  if (!missingSources.length && !notes.length) return null;
  return (
    <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
      <AppIcon name="Info" size={17} className="mt-0.5 flex-shrink-0 text-amber-600" />
      <div>
        <p className="text-sm font-medium text-amber-700">Sebagian sumber data kepatuhan belum tersedia</p>
        {missingSources.length > 0 && (
          <p className="mt-0.5 text-xs text-amber-700/80">Belum aktif: {missingSources.join(', ')}</p>
        )}
        {notes.slice(0, 2).map(note => (
          <p key={note} className="mt-0.5 text-xs text-secondary">{note}</p>
        ))}
      </div>
    </div>
  );
};

const ChecklistItem = ({ item }) => (
  <div className="flex items-center gap-3 border-b border-primary/10 px-5 py-3.5 last:border-0">
    <div className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full ${
      item.done ? 'bg-emerald-500/15 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
    }`}>
      <AppIcon name={item.done ? 'Check' : 'Clock'} size={12} />
    </div>
    <span className={`flex-1 text-sm ${item.done ? 'text-primary' : 'text-secondary'}`}>
      {item.label || 'Kontrol tanpa nama'}
    </span>
    {item.dueDate && (
      <span className="flex-shrink-0 text-xs text-secondary">
        Tenggat {fmtDate(item.dueDate)}
      </span>
    )}
    <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${
      item.done
        ? 'bg-emerald-500/10 text-emerald-700'
        : 'bg-amber-500/10 text-amber-700'
    }`}>
      {item.done ? 'Selesai' : 'Pending'}
    </span>
  </div>
);

export default function ComplianceView({ report }) {
  const compliance = report?.compliance || {};
  const availability = report?.dataAvailability?.compliance || {};
  const checklistItems = Array.isArray(compliance.checklistItems) ? compliance.checklistItems : [];
  const doneCount = checklistItems.filter(item => item?.done).length;
  const checklistPct = checklistItems.length ? Math.round((doneCount / checklistItems.length) * 100) : 0;
  const backupStatus = compliance.backupStatus || 'warning';
  const healthFormRate = Number(compliance.healthFormRate ?? compliance.consentRate ?? 0) || 0;
  const submittedHealthForms = Number(compliance.submittedHealthForms ?? compliance.totalConsents ?? 0) || 0;
  const missingHealthForms = Number(compliance.missingHealthForms ?? compliance.missingConsents ?? 0) || 0;
  const incidents = Number(compliance.securityIncidents ?? 0) || 0;

  const incidentConfig = incidents === 0
    ? { iconClass: 'text-emerald-500', detail: 'Tidak ada insiden dalam periode ini' }
    : { iconClass: 'text-red-500', detail: `${num(incidents)} insiden tercatat` };

  return (
    <div className="space-y-6">
      <SourceNotice availability={availability} />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Kelengkapan formulir kesehatan"
          value={pct(healthFormRate)}
          detail={`${num(submittedHealthForms)} formulir · ${num(missingHealthForms)} belum lengkap`}
          icon="FileBadge"
          iconClass={healthFormRate >= 95 ? 'text-emerald-500' : healthFormRate >= 80 ? 'text-amber-500' : 'text-red-500'}
        />
        <MetricCard
          label="Status backup"
          value={<BackupChip status={backupStatus} />}
          detail={`Backup terakhir: ${fmtDate(compliance.lastBackupAt)} · ${pct(compliance.backupSuccessRate ?? 0)} berhasil`}
          icon="DatabaseBackup"
          iconClass={backupStatus === 'healthy' ? 'text-emerald-500' : backupStatus === 'critical' ? 'text-red-500' : 'text-amber-500'}
        />
        <MetricCard
          label="Insiden keamanan"
          value={num(incidents)}
          detail={incidentConfig.detail}
          icon="ShieldAlert"
          iconClass={incidentConfig.iconClass}
        />
      </div>

      <section className="overflow-hidden rounded-2xl border border-primary/15 bg-surface-elevated">
        <div className="border-b border-primary/10 p-5">
          <h2 className="font-semibold text-primary">Kelengkapan Formulir Kesehatan</h2>
          <p className="mt-0.5 text-sm text-secondary">
            Persentase appointment dengan pre-session health form yang telah diisi dalam periode terpilih.
          </p>
        </div>
        <div className="space-y-4 p-5">
          <div className="flex items-end justify-between gap-4">
            <span className="text-3xl font-bold text-primary">{pct(healthFormRate)}</span>
            <span className="text-sm text-secondary">{num(submittedHealthForms)} dari {num(submittedHealthForms + missingHealthForms)} appointment</span>
          </div>
          <ProgressBar
            value={healthFormRate}
            colorClass={healthFormRate >= 95 ? 'bg-emerald-500' : healthFormRate >= 80 ? 'bg-amber-500' : 'bg-red-500'}
            height="h-3"
          />
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-4">
              <div className="mb-1 flex items-center gap-2">
                <AppIcon name="CheckCircle2" size={15} className="text-emerald-600" />
                <span className="text-xs uppercase tracking-wider text-emerald-700">Sudah diisi</span>
              </div>
              <p className="text-2xl font-bold text-emerald-700">{num(submittedHealthForms)}</p>
            </div>
            <div className="rounded-xl border border-amber-500/15 bg-amber-500/5 p-4">
              <div className="mb-1 flex items-center gap-2">
                <AppIcon name="AlertCircle" size={15} className="text-amber-600" />
                <span className="text-xs uppercase tracking-wider text-amber-700">Belum lengkap</span>
              </div>
              <p className="text-2xl font-bold text-amber-700">{num(missingHealthForms)}</p>
            </div>
          </div>
          {missingHealthForms > 0 && (
            <p className="flex items-center gap-1.5 text-xs text-amber-600">
              <AppIcon name="AlertTriangle" size={13} />
              {num(missingHealthForms)} appointment memerlukan tindak lanjut pengisian formulir kesehatan.
            </p>
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-primary/15 bg-surface-elevated">
        <div className="flex items-center justify-between gap-4 border-b border-primary/10 p-5">
          <div>
            <h2 className="font-semibold text-primary">Kontrol Kepatuhan</h2>
            <p className="mt-0.5 text-sm text-secondary">Checklist regulasi BPJS dan internal klinik.</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary">{checklistPct}%</p>
            <p className="text-xs text-secondary">{doneCount}/{checklistItems.length} selesai</p>
          </div>
        </div>
        <div className="px-5 py-3">
          <ProgressBar value={checklistPct} colorClass="bg-accent" height="h-1.5" />
        </div>
        {checklistItems.length > 0
          ? checklistItems.map(item => <ChecklistItem key={item.id || item.label} item={item} />)
          : <div className="p-10 text-center text-sm text-secondary">Belum ada item checklist.</div>
        }
      </section>

      <section className="overflow-hidden rounded-2xl border border-primary/15 bg-surface-elevated">
        <div className="border-b border-primary/10 p-5">
          <h2 className="font-semibold text-primary">Keamanan Akses</h2>
          <p className="mt-0.5 text-sm text-secondary">Aktivitas login dan hak akses staf aktif.</p>
        </div>
        <div className="grid grid-cols-1 divide-y divide-primary/10 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
          <div className="flex items-center gap-4 p-5">
            <div className={`flex-shrink-0 rounded-xl p-3 ${
              Number(compliance.failedLogins ?? 0) === 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'
            }`}>
              <AppIcon
                name="LogIn"
                size={20}
                className={Number(compliance.failedLogins ?? 0) === 0 ? 'text-emerald-600' : 'text-red-500'}
              />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-secondary">Gagal login</p>
              <p className="mt-1 text-2xl font-bold text-primary">{num(compliance.failedLogins ?? 0)}</p>
              <p className="mt-0.5 text-xs text-secondary">percobaan tidak sah dalam periode ini</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-5">
            <div className="flex-shrink-0 rounded-xl bg-accent/10 p-3">
              <AppIcon name="Users" size={20} className="text-accent" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-secondary">Staf dengan akses aktif</p>
              <p className="mt-1 text-2xl font-bold text-primary">{num(compliance.activeStaffWithAccess ?? 0)}</p>
              <p className="mt-0.5 text-xs text-secondary">akun aktif di sistem dalam cabang terpilih</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
