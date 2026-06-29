import React, { useMemo } from 'react';
import AppIcon from '../../../../components/AppIcon';

const formatCurrency = (amount) => new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
}).format(Number(amount) || 0);

const formatNumber = (value) => new Intl.NumberFormat('id-ID').format(Number(value) || 0);

const MetricCard = ({ label, value, detail, icon, iconClass }) => (
  <div className="rounded-xl border border-primary/15 bg-surface-elevated p-5">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-secondary">{label}</p>
        <p className="mt-2 text-2xl font-bold text-primary">{value}</p>
        <p className="mt-1 text-xs text-secondary/70">{detail}</p>
      </div>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/10 bg-primary/5">
        <AppIcon name={icon} size={19} className={iconClass} />
      </div>
    </div>
  </div>
);

const Growth = ({ value }) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return <span className="text-xs text-secondary">Tren belum tersedia</span>;
  const positive = numeric > 0;
  const negative = numeric < 0;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${
      positive ? 'text-emerald-600' : negative ? 'text-red-600' : 'text-secondary'
    }`}>
      <AppIcon name={positive ? 'TrendingUp' : negative ? 'TrendingDown' : 'Minus'} size={13} />
      {numeric > 0 ? '+' : ''}{numeric}%
    </span>
  );
};

const BranchOverview = ({ stats, branches = [], revenueData = [], loading }) => {
  const operational = useMemo(() => branches.reduce((result, branch) => {
    result.rooms += Number(branch.treatmentRoomsCount ?? branch.treatment_rooms_count ?? 0) || 0;
    result.staff += Number(branch.staffCount ?? branch.staff_count ?? 0) || 0;
    if (branch.isMainBranch) result.main += 1;
    return result;
  }, { rooms: 0, staff: 0, main: 0 }), [branches]);

  const maxRevenue = Math.max(0, ...revenueData.map((branch) => Number(branch.monthlyRevenue) || 0));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total Cabang"
          value={stats.totalBranches}
          detail={`${stats.activeBranches} cabang aktif`}
          icon="Hospital"
          iconClass="text-blue-500"
        />
        <MetricCard
          label="Ruang Perawatan"
          value={formatNumber(operational.rooms)}
          detail="Berdasarkan data cabang"
          icon="DoorOpen"
          iconClass="text-violet-500"
        />
        <MetricCard
          label="Staf Terdaftar"
          value={formatNumber(operational.staff)}
          detail="Akumulasi seluruh cabang"
          icon="UsersRound"
          iconClass="text-emerald-500"
        />
        <MetricCard
          label="Cabang Utama"
          value={operational.main}
          detail="Lokasi pusat operasional"
          icon="Landmark"
          iconClass="text-amber-500"
        />
      </div>

      <section className="overflow-hidden rounded-2xl border border-primary/15 bg-surface-elevated">
        <div className="flex items-center justify-between gap-4 border-b border-primary/10 px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold text-primary">Performa Pendapatan Cabang</h2>
            <p className="mt-0.5 text-sm text-secondary">Data bulanan dari layanan analytics klinik</p>
          </div>
          {loading && (
            <div className="flex items-center gap-2 text-sm text-secondary">
              <AppIcon name="LoaderCircle" size={16} className="animate-spin" />
              Memuat
            </div>
          )}
        </div>

        {!loading && revenueData.length > 0 ? (
          <div className="divide-y divide-primary/10">
            {revenueData.map((branch) => {
              const revenue = Number(branch.monthlyRevenue) || 0;
              const progress = maxRevenue > 0 ? (revenue / maxRevenue) * 100 : 0;
              return (
                <div key={branch.branchId} className="grid gap-4 px-6 py-4 md:grid-cols-[minmax(0,1fr)_minmax(180px,0.8fr)_auto] md:items-center">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/10 bg-primary/5 text-secondary">
                      <AppIcon name="MapPinned" size={19} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-primary">{branch.branchName || 'Cabang tanpa nama'}</p>
                      <p className="text-xs text-secondary">{formatNumber(branch.transactions)} transaksi bulan ini</p>
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between text-[11px] text-secondary">
                      <span>Kontribusi relatif</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-primary/10">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                  <div className="text-left md:text-right">
                    <p className="font-semibold text-primary">{formatCurrency(revenue)}</p>
                    <Growth value={branch.growth} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : !loading ? (
          <div className="px-6 py-12 text-center">
            <AppIcon name="ChartNoAxesColumn" size={34} className="mx-auto mb-3 text-secondary/35" />
            <p className="font-medium text-primary">Data pendapatan belum tersedia</p>
            <p className="mt-1 text-sm text-secondary">Tidak ada estimasi atau angka sintetis yang ditampilkan.</p>
          </div>
        ) : (
          <div className="space-y-3 p-6">
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="h-16 animate-pulse rounded-xl bg-primary/5" />
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-primary/15 bg-surface-elevated p-6">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-primary">Cakupan Operasional</h2>
            <p className="mt-0.5 text-sm text-secondary">Status lokasi berdasarkan konfigurasi cabang</p>
          </div>
          <span className="text-sm font-medium text-secondary">{branches.length} lokasi</span>
        </div>
        {branches.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {branches.map((branch) => {
              const active = branch.status === 'active' || branch.isActive === true;
              return (
                <div key={branch.id} className="flex items-center justify-between gap-4 rounded-xl border border-primary/10 bg-surface px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-primary">{branch.branchName || 'Cabang tanpa nama'}</p>
                    <p className="truncate text-xs text-secondary">{[branch.city, branch.province].filter(Boolean).join(', ') || 'Lokasi belum dilengkapi'}</p>
                  </div>
                  <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                    active
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                      : 'bg-slate-500/10 text-slate-600 dark:text-slate-400'
                  }`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                    {active ? 'Aktif' : 'Tidak aktif'}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-secondary">Belum ada cabang untuk ditampilkan.</p>
        )}
      </section>
    </div>
  );
};

export default BranchOverview;
