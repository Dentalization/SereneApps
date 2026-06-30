import React, { useEffect, useMemo, useState } from 'react';
import { authHttp } from '../../../utils/httpClient';
import AppIcon from '../../../components/AppIcon';
import { AdminEmptyState, AdminErrorState } from '../ui/AdminPagePrimitives';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
};

const daysSince = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));
};

const clinicName = (clinic) => clinic?.brandName || clinic?.legalName || 'Unnamed clinic';

const ownerEmail = (clinic) => clinic?.ownerEmail || clinic?.user?.email || '';

const ownerName = (clinic) => clinic?.ownerName || clinic?.user?.name || '—';

const issueChipClasses = {
  critical: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300',
  warning: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300',
  info: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-300'
};

function buildComplianceFlags(clinics) {
  return clinics.flatMap((clinic) => {
    const flags = [];
    const age = daysSince(clinic.createdAt);
    const missingDocs = [
      ['KTP', clinic.ktpFilePath],
      ['NIB', clinic.nibFilePath],
      ['NPWP', clinic.npwpFilePath],
      ['Operational License', clinic.operationalLicenseFilePath]
    ].filter(([, value]) => !value).map(([label]) => label);

    if (String(clinic.status || '').toLowerCase() === 'rejected') {
      flags.push({
        severity: 'critical',
        label: 'Rejected clinic',
        description: clinic.verificationNotes || 'Rejected without visible verification notes.'
      });
    }

    if (String(clinic.status || '').toLowerCase() === 'pending' && age != null && age > 14) {
      flags.push({
        severity: 'warning',
        label: 'Pending over SLA',
        description: `Pending verification for ${age} days.`
      });
    }

    if (!ownerEmail(clinic)) {
      flags.push({
        severity: 'critical',
        label: 'Owner email missing',
        description: 'Owner account recovery and compliance contact cannot be verified.'
      });
    }

    if (!clinic.ownerWhatsapp) {
      flags.push({
        severity: 'warning',
        label: 'Owner WhatsApp missing',
        description: 'Escalation contact is incomplete.'
      });
    }

    if (!clinic.branches?.length) {
      flags.push({
        severity: 'warning',
        label: 'No branch registered',
        description: 'Clinic has no branch record for operational mapping.'
      });
    }

    if (missingDocs.length) {
      flags.push({
        severity: 'warning',
        label: 'Document source incomplete',
        description: `Missing source fields: ${missingDocs.join(', ')}.`
      });
    }

    if (clinic.termsAccepted === false || clinic.privacyAccepted === false) {
      flags.push({
        severity: 'critical',
        label: 'Agreement not accepted',
        description: 'Terms or privacy consent is not marked accepted.'
      });
    }

    return flags.map((flag) => ({
      ...flag,
      clinicId: clinic.id,
      clinicName: clinicName(clinic),
      owner: ownerName(clinic),
      status: clinic.status || 'unknown',
      createdAt: clinic.createdAt
    }));
  });
}

function buildAuditRows(clinics) {
  return clinics.flatMap((clinic) => {
    const rows = [
      {
        id: `${clinic.id}-created`,
        at: clinic.createdAt,
        actor: ownerName(clinic),
        event: 'Clinic registered',
        detail: `${clinicName(clinic)} entered platform directory.`,
        source: 'clinic_profiles.created_at'
      }
    ];

    if (clinic.verificationDate) {
      rows.push({
        id: `${clinic.id}-verified`,
        at: clinic.verificationDate,
        actor: 'Admin verification',
        event: clinic.status === 'verified' ? 'Clinic verified' : 'Verification updated',
        detail: clinic.verificationNotes || 'Verification status changed.',
        source: 'clinic_profiles.verification_date'
      });
    }

    if (clinic.updatedAt && clinic.updatedAt !== clinic.createdAt) {
      rows.push({
        id: `${clinic.id}-updated`,
        at: clinic.updatedAt,
        actor: 'System/Admin',
        event: 'Clinic profile updated',
        detail: `${clinicName(clinic)} profile has a newer updated_at timestamp.`,
        source: 'clinic_profiles.updated_at'
      });
    }

    return rows;
  }).sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0)).slice(0, 30);
}

const MetricCard = ({ icon, label, value, note, tone = 'blue' }) => {
  const tones = {
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300',
    amber: 'bg-amber-100 text-amber-600 dark:bg-amber-900/20 dark:text-amber-300',
    rose: 'bg-rose-100 text-rose-600 dark:bg-rose-900/20 dark:text-rose-300',
    emerald: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-300'
  };

  return (
    <div className="rounded-2xl border border-border/40 bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-secondary">{label}</p>
          <p className="mt-2 text-2xl font-bold text-primary">{value}</p>
        </div>
        <div className={`rounded-xl p-2 ${tones[tone] || tones.blue}`}>
          <AppIcon name={icon} size={18} />
        </div>
      </div>
      {note && <p className="mt-2 text-xs text-secondary">{note}</p>}
    </div>
  );
};

const DisabledActionButton = ({ icon, children, title }) => (
  <button
    disabled
    title={title}
    className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg border border-border/50 px-3 py-2 text-xs font-semibold text-secondary opacity-60"
  >
    <AppIcon name={icon} size={13} />
    {children}
  </button>
);

const ClinicPlatformOversight = ({ section = 'owners', onViewClinic }) => {
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isActive = true;

    const loadClinics = async () => {
      try {
        setLoading(true);
        setError('');
        const { data } = await authHttp.get('/clinic/admin/list', { params: { page: 1, limit: 1000 } });
        if (!isActive) return;
        setClinics(Array.isArray(data?.clinics) ? data.clinics : []);
      } catch (err) {
        if (!isActive) return;
        setError(err?.response?.data?.error || err.message || 'Failed to load clinic oversight data');
      } finally {
        if (isActive) setLoading(false);
      }
    };

    loadClinics();

    return () => {
      isActive = false;
    };
  }, []);

  const derived = useMemo(() => {
    const flags = buildComplianceFlags(clinics);
    const auditRows = buildAuditRows(clinics);
    const statusCounts = clinics.reduce((acc, clinic) => {
      const key = clinic.status || 'unknown';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const cityCounts = clinics.reduce((acc, clinic) => {
      const key = clinic.city || clinic.province || 'Unknown';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const totalBranches = clinics.reduce((sum, clinic) => sum + (clinic.branches?.length || 0), 0);
    const ownerGaps = clinics.filter((clinic) => !ownerEmail(clinic) || !clinic.ownerWhatsapp).length;

    // Derive status pie/donut chart data
    const STATUS_COLORS = {
      verified: '#10b981', // Emerald
      approved: '#3b82f6', // Blue
      pending: '#f59e0b', // Amber
      rejected: '#ef4444', // Red
      unknown: '#94a3b8' // Slate
    };

    const statusPieData = Object.entries(statusCounts).map(([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: count,
      color: STATUS_COLORS[status.toLowerCase()] || STATUS_COLORS.unknown
    }));

    // Derive chronological clinic registration trend data
    const monthlyCounts = clinics.reduce((acc, clinic) => {
      if (!clinic.createdAt) return acc;
      const date = new Date(clinic.createdAt);
      const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

      if (!acc[yearMonth]) {
        acc[yearMonth] = { label: monthLabel, count: 0, sortKey: yearMonth };
      }
      acc[yearMonth].count++;
      return acc;
    }, {});

    const registrationTrendData = Object.values(monthlyCounts)
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .map(({ label, count }) => ({ label, count }));

    return {
      flags,
      auditRows,
      statusCounts,
      statusPieData,
      registrationTrendData,
      cityRows: Object.entries(cityCounts)
        .map(([city, count]) => ({ city, count }))
        .sort((a, b) => b.count - a.count),
      totalBranches,
      ownerGaps
    };
  }, [clinics]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-28 rounded-2xl border border-border/40 bg-accent/5 animate-pulse" />
          ))}
        </div>
        <div className="h-80 rounded-2xl border border-border/40 bg-accent/5 animate-pulse" />
      </div>
    );
  }

  if (error) {
    return <AdminErrorState title="Clinic oversight gagal dimuat" message={error} />;
  }

  const renderOwners = () => (
    <div className="rounded-2xl border border-border/40 bg-surface overflow-hidden">
      <div className="border-b border-border/40 p-5">
        <h3 className="text-lg font-semibold text-primary">Owner Account Management</h3>
        <p className="mt-1 text-sm text-secondary">Platform-wide owner contact, role, and transfer readiness from real clinic records.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-surface-elevated text-left text-xs uppercase tracking-wide text-secondary">
            <tr>
              <th className="px-5 py-3">Clinic</th>
              <th className="px-5 py-3">Owner</th>
              <th className="px-5 py-3">Account</th>
              <th className="px-5 py-3">Transfer readiness</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {clinics.map((clinic) => {
              const ready = Boolean(ownerEmail(clinic) && clinic.ownerNik && clinic.ownerWhatsapp);
              return (
                <tr key={clinic.id} className="hover:bg-surface-elevated/40">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-primary">{clinicName(clinic)}</p>
                    <p className="text-xs text-secondary">{clinic.email || 'No clinic email'} · {clinic.status || 'unknown'}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-medium text-primary">{ownerName(clinic)}</p>
                    <p className="text-xs text-secondary">{ownerEmail(clinic) || 'Missing owner email'}</p>
                    <p className="text-xs text-secondary">{clinic.ownerWhatsapp || 'Missing WhatsApp'}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-sm text-primary">{clinic.user?.email || 'No linked user'}</p>
                    <p className="text-xs text-secondary">{clinic.user?.roles?.join(', ') || 'No roles returned'}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${ready ? issueChipClasses.info : issueChipClasses.warning}`}>
                      {ready ? 'Ready for transfer review' : 'Missing owner identity/contact'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => onViewClinic?.(clinic)} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white">View</button>
                      <DisabledActionButton icon="ArrowRightLeft" title="Ownership transfer endpoint belum tersedia">Transfer</DisabledActionButton>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderCompliance = () => (
    <div className="rounded-2xl border border-border/40 bg-surface overflow-hidden">
      <div className="border-b border-border/40 p-5">
        <h3 className="text-lg font-semibold text-primary">Cross-clinic Compliance Flags</h3>
        <p className="mt-1 text-sm text-secondary">Flags are derived from real profile fields: status, documents, owner contact, branch presence, and accepted agreements.</p>
      </div>
      {derived.flags.length ? (
        <div className="divide-y divide-border/40">
          {derived.flags.map((flag, index) => (
            <div key={`${flag.clinicId}-${flag.label}-${index}`} className="flex flex-col gap-3 p-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${issueChipClasses[flag.severity]}`}>
                    {flag.severity}
                  </span>
                  <p className="font-semibold text-primary">{flag.label}</p>
                </div>
                <p className="mt-1 text-sm text-secondary">{flag.clinicName} · owner {flag.owner}</p>
                <p className="mt-1 text-xs text-secondary">{flag.description}</p>
              </div>
              <button onClick={() => onViewClinic?.({ id: flag.clinicId })} className="self-start rounded-lg border border-border/50 px-3 py-2 text-xs font-semibold text-secondary hover:text-primary lg:self-center">
                Open clinic
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-6">
          <AdminEmptyState icon="ShieldCheck" title="No compliance flags" description="No cross-clinic compliance issues were derived from the available clinic list." />
        </div>
      )}
    </div>
  );

  const renderActions = () => (
    <div className="rounded-2xl border border-border/40 bg-surface overflow-hidden">
      <div className="border-b border-border/40 p-5">
        <h3 className="text-lg font-semibold text-primary">Suspend / Reinstate / Transfer Control Plane</h3>
        <p className="mt-1 text-sm text-secondary">High-risk platform actions are visible for workflow planning, but disabled until backend audit-safe endpoints exist.</p>
      </div>
      <div className="divide-y divide-border/40">
        {clinics.slice(0, 20).map((clinic) => (
          <div key={clinic.id} className="flex flex-col gap-4 p-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="font-semibold text-primary">{clinicName(clinic)}</p>
              <p className="text-xs text-secondary">{ownerName(clinic)} · {ownerEmail(clinic) || 'missing owner email'} · status {clinic.status || 'unknown'}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <DisabledActionButton icon="Ban" title="Suspend endpoint belum tersedia">Suspend</DisabledActionButton>
              <DisabledActionButton icon="RotateCcw" title="Reinstate endpoint belum tersedia">Reinstate</DisabledActionButton>
              <DisabledActionButton icon="ArrowRightLeft" title="Ownership transfer endpoint belum tersedia">Transfer Owner</DisabledActionButton>
              <button onClick={() => onViewClinic?.(clinic)} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white">
                <AppIcon name="Eye" size={13} />
                View detail
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderAudit = () => (
    <div className="rounded-2xl border border-border/40 bg-surface overflow-hidden">
      <div className="border-b border-border/40 p-5">
        <h3 className="text-lg font-semibold text-primary">Activity Audit</h3>
        <p className="mt-1 text-sm text-secondary">Current audit timeline is reconstructed from real clinic timestamps. Dedicated audit log source is not available yet.</p>
      </div>
      <div className="divide-y divide-border/40">
        {derived.auditRows.map((row) => (
          <div key={row.id} className="grid gap-3 p-5 md:grid-cols-[160px_1fr_180px] md:items-start">
            <div className="text-sm font-medium text-primary">{formatDate(row.at)}</div>
            <div>
              <p className="font-semibold text-primary">{row.event}</p>
              <p className="mt-1 text-sm text-secondary">{row.detail}</p>
            </div>
            <div className="text-xs text-secondary">
              <p>{row.actor}</p>
              <p className="mt-1">{row.source}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderAnalytics = () => {
    const totalClinics = clinics.length || 1;

    return (
      <div className="space-y-6">
        {/* Onboarding Trend Card */}
        <div className="rounded-2xl border border-border/40 bg-surface p-6 shadow-sm">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
              <AppIcon name="TrendingUp" size={18} className="text-accent" />
              Registration Timeline
            </h3>
            <p className="text-sm text-secondary">Monthly clinic registration growth trends</p>
          </div>
          <div className="h-72 w-full">
            {derived.registrationTrendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={derived.registrationTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRegistrations" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-accent, #6366f1)" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="var(--color-accent, #6366f1)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-secondary, #64748b)' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-secondary, #64748b)' }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid rgba(0,0,0,0.1)',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      backgroundColor: 'var(--bg-surface, #ffffff)',
                      color: 'var(--text-primary, #0f172a)'
                    }}
                  />
                  <Area type="monotone" dataKey="count" stroke="var(--color-accent, #6366f1)" strokeWidth={3} fillOpacity={1} fill="url(#colorRegistrations)" name="Registered Clinics" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-secondary">No registration trend data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Grid for Status and Cities */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {/* Status breakdown donut card */}
          <div className="rounded-2xl border border-border/40 bg-surface p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
                  <AppIcon name="PieChart" size={18} className="text-blue-500" />
                  Verification Breakdown
                </h3>
                <p className="text-sm text-secondary">Distribution of clinic registration states</p>
              </div>
              <div className="flex flex-col md:flex-row items-center justify-around gap-6 py-4">
                {/* Donut Chart container */}
                <div className="relative w-48 h-48 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={derived.statusPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {derived.statusPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          borderRadius: '8px',
                          border: 'none',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center Text Overlay */}
                  <div className="absolute text-center pointer-events-none">
                    <span className="block text-3xl font-bold text-primary">{clinics.length}</span>
                    <span className="text-[10px] uppercase tracking-wider text-secondary font-semibold">Clinics Total</span>
                  </div>
                </div>

                {/* Custom Legend */}
                <div className="space-y-3 w-full md:w-auto min-w-[180px]">
                  {derived.statusPieData.map((item, idx) => {
                    const percentage = totalClinics > 0 ? ((item.value / totalClinics) * 100).toFixed(0) : 0;
                    return (
                      <div key={idx} className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2.5">
                          <span className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                          <span className="text-sm font-semibold text-primary">{item.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold text-primary">{item.value}</span>
                          <span className="text-xs text-secondary ml-1.5">({percentage}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Cities breakdown card */}
          <div className="rounded-2xl border border-border/40 bg-surface p-6 shadow-sm">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
                <AppIcon name="Map" size={18} className="text-emerald-500" />
                Geographic Distribution
              </h3>
              <p className="text-sm text-secondary">Locations derived from registered branches</p>
            </div>
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
              {derived.cityRows.slice(0, 6).map((row) => {
                const percentage = Math.max(0, Math.min(100, Math.round((row.count / totalClinics) * 100)));
                return (
                  <div key={row.city} className="space-y-2">
                    <div className="flex items-center justify-between text-sm font-medium">
                      <span className="text-primary truncate max-w-[200px]">{row.city}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-primary">{row.count}</span>
                        <span className="text-xs text-secondary">({percentage}%)</span>
                      </div>
                    </div>
                    <div className="w-full bg-surface-elevated rounded-full h-2 overflow-hidden border border-border/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-accent/80 to-accent transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {derived.cityRows.length === 0 && (
                <div className="flex items-center justify-center py-12">
                  <p className="text-sm text-secondary">No geographic distribution data available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const sectionRenderer = {
    owners: renderOwners,
    compliance: renderCompliance,
    actions: renderActions,
    audit: renderAudit,
    analytics: renderAnalytics
  }[section] || renderOwners;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon="Building2" label="Clinics in scope" value={clinics.length} note="Loaded from /clinic/admin/list" tone="blue" />
        <MetricCard icon="Flag" label="Compliance flags" value={derived.flags.length} note="Derived from profile fields" tone={derived.flags.length ? 'amber' : 'emerald'} />
        <MetricCard icon="UserCog" label="Owner account gaps" value={derived.ownerGaps} note="Missing email or WhatsApp" tone={derived.ownerGaps ? 'amber' : 'emerald'} />
        <MetricCard icon="Network" label="Registered branches" value={derived.totalBranches} note="Across returned clinics" tone="blue" />
      </div>
      {sectionRenderer()}
    </div>
  );
};

export default ClinicPlatformOversight;
