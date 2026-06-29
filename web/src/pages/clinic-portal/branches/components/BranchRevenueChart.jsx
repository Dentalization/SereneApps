import React, { useMemo, useState } from 'react';
import AppIcon from '../../../../components/AppIcon';

const formatCurrency = (amount) => new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
}).format(Number(amount) || 0);

const growthClass = (growth) => {
  const value = Number(growth);
  if (value > 0) return 'text-emerald-600';
  if (value < 0) return 'text-red-600';
  return 'text-secondary';
};

const BranchRevenueChart = ({ revenueData = [], loading }) => {
  const [selectedBranch, setSelectedBranch] = useState('all');
  const safeRevenueData = Array.isArray(revenueData) ? revenueData : [];

  const filteredData = useMemo(() => (
    selectedBranch === 'all'
      ? safeRevenueData
      : safeRevenueData.filter((branch) => String(branch.branchId) === selectedBranch)
  ), [safeRevenueData, selectedBranch]);

  const totals = useMemo(() => filteredData.reduce((result, branch) => {
    result.revenue += Number(branch.monthlyRevenue) || 0;
    result.transactions += Number(branch.transactions) || 0;
    const growth = Number(branch.growth);
    if (Number.isFinite(growth)) {
      result.growthTotal += growth;
      result.growthSamples += 1;
    }
    return result;
  }, { revenue: 0, transactions: 0, growthTotal: 0, growthSamples: 0 }), [filteredData]);

  const averageGrowth = totals.growthSamples ? totals.growthTotal / totals.growthSamples : null;
  const averageTransaction = totals.transactions ? totals.revenue / totals.transactions : 0;
  const maxRevenue = Math.max(0, ...filteredData.map((branch) => Number(branch.monthlyRevenue) || 0));
  const branchesWithServices = filteredData.filter((branch) => Array.isArray(branch.topServices) && branch.topServices.length > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-primary/15 bg-surface-elevated p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">Pendapatan per Cabang</p>
          <p className="mt-0.5 text-xs text-secondary">Periode bulanan dari layanan analytics</p>
        </div>
        <label className="flex items-center gap-3 text-sm text-secondary">
          <span>Cabang</span>
          <span className="relative">
            <select
              value={selectedBranch}
              onChange={(event) => setSelectedBranch(event.target.value)}
              className="min-h-10 min-w-[220px] appearance-none rounded-xl border border-primary/20 bg-surface py-2 pl-3 pr-9 text-sm text-primary focus:border-accent focus:outline-none"
            >
              <option value="all">Semua cabang</option>
              {safeRevenueData.map((branch) => (
                <option key={branch.branchId} value={String(branch.branchId)}>{branch.branchName}</option>
              ))}
            </select>
            <AppIcon name="ChevronDown" size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-secondary" />
          </span>
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SummaryMetric
          label="Pendapatan Tercatat"
          value={safeRevenueData.length ? formatCurrency(totals.revenue) : '—'}
          detail={averageGrowth == null ? 'Tren belum tersedia' : `${averageGrowth > 0 ? '+' : ''}${averageGrowth.toFixed(1)}% dari periode sebelumnya`}
          icon="WalletCards"
          iconClass="text-emerald-500"
        />
        <SummaryMetric
          label="Transaksi"
          value={safeRevenueData.length ? totals.transactions.toLocaleString('id-ID') : '—'}
          detail="Pada periode bulanan"
          icon="ReceiptText"
          iconClass="text-blue-500"
        />
        <SummaryMetric
          label="Rata-rata Transaksi"
          value={safeRevenueData.length ? formatCurrency(averageTransaction) : '—'}
          detail={`${filteredData.length} cabang dipilih`}
          icon="Calculator"
          iconClass="text-violet-500"
        />
      </div>

      <section className="overflow-hidden rounded-2xl border border-primary/15 bg-surface-elevated">
        <div className="border-b border-primary/10 px-6 py-5">
          <h2 className="text-lg font-semibold text-primary">Perbandingan Pendapatan</h2>
          <p className="mt-0.5 text-sm text-secondary">Nilai aktual per cabang pada periode yang tersedia</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-secondary">
            <AppIcon name="LoaderCircle" size={20} className="animate-spin" />
            Memuat data pendapatan
          </div>
        ) : filteredData.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <AppIcon name="ChartNoAxesColumn" size={34} className="mx-auto mb-3 text-secondary/35" />
            <p className="font-medium text-primary">Data pendapatan belum tersedia</p>
            <p className="mt-1 text-sm text-secondary">Dashboard tidak membuat proyeksi ketika sumber data kosong.</p>
          </div>
        ) : (
          <>
            <div className="grid min-h-[280px] grid-cols-[repeat(auto-fit,minmax(88px,1fr))] items-end gap-4 px-6 pb-6 pt-10">
              {filteredData.map((branch) => {
                const revenue = Number(branch.monthlyRevenue) || 0;
                const height = maxRevenue > 0 ? (revenue / maxRevenue) * 100 : 0;
                return (
                  <div key={branch.branchId} className="flex h-56 min-w-0 flex-col justify-end">
                    <div className="mb-2 text-center">
                      <p className="truncate text-[11px] font-medium text-primary">{formatCurrency(revenue)}</p>
                    </div>
                    <div className="flex h-40 items-end rounded-lg bg-primary/5 px-2 pt-2">
                      <div className="w-full rounded-t-md bg-accent/80 transition-[height]" style={{ height: `${Math.max(4, height)}%` }} />
                    </div>
                    <p className="mt-2 truncate text-center text-xs font-medium text-primary" title={branch.branchName}>{branch.branchName}</p>
                    <p className={`text-center text-[11px] ${growthClass(branch.growth)}`}>
                      {Number.isFinite(Number(branch.growth)) ? `${Number(branch.growth) > 0 ? '+' : ''}${branch.growth}%` : '—'}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="overflow-x-auto border-t border-primary/10">
              <table className="w-full">
                <thead className="bg-surface">
                  <tr>
                    {['Cabang', 'Pendapatan', 'Transaksi', 'Rata-rata', 'Pertumbuhan'].map((heading, index) => (
                      <th key={heading} className={`px-6 py-3 text-xs font-semibold uppercase tracking-wider text-secondary ${index === 0 ? 'text-left' : 'text-right'}`}>{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary/10">
                  {filteredData.map((branch) => {
                    const revenue = Number(branch.monthlyRevenue) || 0;
                    const transactions = Number(branch.transactions) || 0;
                    const average = Number(branch.avgTransaction) || (transactions ? revenue / transactions : 0);
                    const growth = Number(branch.growth);
                    return (
                      <tr key={branch.branchId} className="transition-colors hover:bg-surface">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/10 bg-primary/5 text-secondary">
                              <AppIcon name="MapPinned" size={17} />
                            </div>
                            <p className="font-medium text-primary">{branch.branchName}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right font-semibold text-primary">{formatCurrency(revenue)}</td>
                        <td className="px-6 py-4 text-right text-primary">{transactions.toLocaleString('id-ID')}</td>
                        <td className="px-6 py-4 text-right text-primary">{formatCurrency(average)}</td>
                        <td className={`px-6 py-4 text-right font-medium ${growthClass(growth)}`}>
                          {Number.isFinite(growth) ? `${growth > 0 ? '+' : ''}${growth}%` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {branchesWithServices.length > 0 && (
        <section className="rounded-2xl border border-primary/15 bg-surface-elevated p-6">
          <h2 className="text-lg font-semibold text-primary">Layanan Unggulan Tercatat</h2>
          <p className="mt-0.5 text-sm text-secondary">Urutan mengikuti data analytics tanpa persentase buatan.</p>
          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
            {branchesWithServices.slice(0, 3).map((branch) => (
              <div key={branch.branchId} className="rounded-xl border border-primary/10 bg-surface p-4">
                <p className="font-medium text-primary">{branch.branchName}</p>
                <ol className="mt-3 space-y-2">
                  {branch.topServices.slice(0, 4).map((service, index) => (
                    <li key={service} className="flex items-center gap-2 text-sm text-secondary">
                      <span className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/5 text-[10px] font-semibold">{index + 1}</span>
                      <span className="truncate">{service}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

const SummaryMetric = ({ label, value, detail, icon, iconClass }) => (
  <div className="rounded-xl border border-primary/15 bg-surface-elevated p-5">
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-secondary">{label}</p>
        <p className="mt-2 text-2xl font-bold text-primary">{value}</p>
        <p className="mt-1 text-xs text-secondary/70">{detail}</p>
      </div>
      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/10 bg-primary/5">
        <AppIcon name={icon} size={19} className={iconClass} />
      </div>
    </div>
  </div>
);

export default BranchRevenueChart;
