import React from 'react';
import AppIcon from '../../../../components/AppIcon';
import { boundedPercent } from '../reportUtils.mjs';

const money = value => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value) || 0);
const number = value => new Intl.NumberFormat('id-ID').format(Number(value) || 0);

const TrendBadge = ({ value }) => {
  if (value == null) return null;
  const up = Number(value) >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${up ? 'text-emerald-600' : 'text-red-500'}`}>
      <AppIcon name={up ? 'TrendingUp' : 'TrendingDown'} size={11} />
      {up ? '+' : ''}{value}%
    </span>
  );
};

const MetricCard = ({ label, value, icon, trend, children }) => (
  <div className="rounded-2xl border border-primary/15 bg-surface-elevated p-5">
    <AppIcon name={icon} size={20} className="text-accent" />
    <p className="mt-4 text-xs uppercase tracking-wider text-secondary">{label}</p>
    <p className="mt-2 text-2xl font-bold text-primary">{value}</p>
    <div className="mt-1">
      <TrendBadge value={trend} />
      {children}
    </div>
  </div>
);

const FinancialView = ({ report }) => {
  const summary = report?.summary || {};
  const earners = (report?.people || []).filter(person => Number(person.revenue) > 0);
  const totalRevenue = earners.reduce((sum, person) => sum + (Number(person.revenue) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Pendapatan diterima" value={money(summary.revenue)} icon="WalletCards" trend={summary.revenueTrend} />
        <MetricCard label="Transaksi lunas" value={number(summary.transactions)} icon="ReceiptText" trend={summary.transactionsTrend} />
        <MetricCard label="Rata-rata transaksi" value={money(summary.averageTransaction)} icon="Calculator" trend={summary.averageTransactionTrend}>
          {Number(summary.averageTransaction) > 0 && (
            <p className="text-xs text-secondary">dari {number(summary.transactions)} transaksi lunas</p>
          )}
        </MetricCard>
      </div>

      <section className="overflow-hidden rounded-2xl border border-primary/15 bg-surface-elevated">
        <div className="border-b border-primary/10 p-5">
          <h2 className="font-semibold text-primary">Kontribusi Revenue Dokter</h2>
          <p className="text-sm text-secondary">Hanya invoice berstatus paid/settled dalam periode terpilih.</p>
        </div>
        {earners.length ? (
          <div className="divide-y divide-primary/10">
            {earners.map(person => {
              const share = totalRevenue > 0 ? (Number(person.revenue) || 0) / totalRevenue * 100 : 0;
              return (
                <div key={person.id} className="relative overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-accent/5"
                    style={{ width: `${boundedPercent(person.revenue, totalRevenue)}%` }}
                  />
                  <div className="relative flex items-center justify-between gap-4 px-5 py-4">
                    <div>
                      <p className="font-medium text-primary">{person.name || 'Tanpa nama'}</p>
                      <p className="text-xs text-secondary">
                        {person.branchName || 'Tanpa cabang'} · {number(person.completed)} appointment
                        <span className="ml-2 text-accent">
                          {totalRevenue > 0 ? `${share.toFixed(1)}%` : '—'}
                        </span>
                      </p>
                    </div>
                    <p className="whitespace-nowrap font-semibold text-primary">{money(person.revenue)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 p-12 text-center">
            <AppIcon name="Banknote" size={28} className="text-secondary/40" />
            <p className="text-sm text-secondary">Belum ada transaksi lunas pada periode ini.</p>
          </div>
        )}
      </section>
    </div>
  );
};

export default FinancialView;
