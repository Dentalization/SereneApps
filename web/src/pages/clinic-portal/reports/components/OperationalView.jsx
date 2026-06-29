import React, { useMemo, useState } from 'react';
import AppIcon from '../../../../components/AppIcon';
import { boundedPercent, sparklineHeightPercent } from '../reportUtils.mjs';

const number = value => new Intl.NumberFormat('id-ID').format(Number(value) || 0);
const percent = value => value == null ? '—' : `${value}%`;

const MiniSparkline = ({ data = [], color = 'bg-accent' }) => {
  const values = data.map(value => Math.max(0, Number(value) || 0));
  const max = Math.max(...values, 1);

  return (
    <div className="flex h-8 items-end gap-0.5">
      {values.slice(-7).map((value, index) => (
        <div
          key={`${value}-${index}`}
          className={`flex-1 rounded-sm ${color} opacity-80`}
          style={{ height: `${sparklineHeightPercent(value, max)}%` }}
        />
      ))}
    </div>
  );
};

const Card = ({ label, value, detail, icon, sparkData, sparkColor, trend }) => (
  <div className="space-y-3 rounded-2xl border border-primary/15 bg-surface-elevated p-5">
    <div className="flex items-start justify-between">
      <p className="text-xs uppercase tracking-wider text-secondary">{label}</p>
      <AppIcon name={icon} size={18} className="text-accent" />
    </div>
    <div>
      <p className="text-2xl font-bold text-primary">{value}</p>
      {trend != null && (
        <span className={`mt-0.5 inline-flex items-center gap-0.5 text-xs font-medium ${trend >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
          <AppIcon name={trend >= 0 ? 'TrendingUp' : 'TrendingDown'} size={12} />
          {Math.abs(trend)}%
        </span>
      )}
    </div>
    {sparkData?.length > 0 && <MiniSparkline data={sparkData} color={sparkColor} />}
    <p className="text-xs text-secondary">{detail}</p>
  </div>
);

const Empty = ({ text, icon = 'Inbox' }) => (
  <div className="flex flex-col items-center gap-2 p-12 text-center">
    <AppIcon name={icon} size={28} className="text-secondary/40" />
    <p className="text-sm text-secondary">{text}</p>
  </div>
);

const RankBadge = ({ index }) => {
  if (index > 2) return null;
  const classes = [
    'bg-amber-100 text-amber-700',
    'bg-slate-100 text-slate-600',
    'bg-orange-50 text-orange-600'
  ];
  return (
    <span className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${classes[index]}`}>
      {index + 1}
    </span>
  );
};

const OperationalView = ({ report }) => {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('completed');
  const summary = report?.summary || {};
  const daily = report?.daily || [];

  const completedSpark = daily.map(row => row.completed);
  const scheduledSpark = daily.map(row => row.scheduled);
  const cancelledSpark = daily.map(row => row.cancelled);
  const activeStaffSpark = daily.map(() => summary.activeStaff || 0);
  const maxScheduled = Math.max(...daily.map(row => Number(row.scheduled) || 0), 1);

  const people = useMemo(() => [...(report?.people || [])]
    .filter(person => String(person.name || '').toLowerCase().includes(query.toLowerCase()))
    .sort((left, right) => (Number(right[sort]) || 0) - (Number(left[sort]) || 0)), [report, query, sort]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card
          label="Appointment"
          value={number(summary.appointments)}
          detail={`${number(summary.uniquePatients)} pasien unik`}
          icon="CalendarDays"
          sparkData={scheduledSpark}
          sparkColor="bg-blue-500"
        />
        <Card
          label="Completion rate"
          value={percent(summary.completionRate)}
          detail={`${number(summary.completed)} selesai`}
          icon="CircleCheck"
          sparkData={completedSpark}
          sparkColor="bg-emerald-500"
          trend={summary.completionTrend}
        />
        <Card
          label="Pembatalan"
          value={number(summary.cancelled)}
          detail={`${number(summary.noShow)} no-show`}
          icon="CalendarX"
          sparkData={cancelledSpark}
          sparkColor="bg-amber-500"
          trend={summary.cancelledTrend}
        />
        <Card
          label="Staf aktif"
          value={number(summary.activeStaff)}
          detail="Dalam cabang terpilih"
          icon="UsersRound"
          sparkData={activeStaffSpark}
          sparkColor="bg-violet-500"
        />
      </div>

      <section className="overflow-hidden rounded-2xl border border-primary/15 bg-surface-elevated">
        <div className="border-b border-primary/10 p-5">
          <h2 className="font-semibold text-primary">Tren Appointment Harian</h2>
          <p className="text-sm text-secondary">Status aktual berdasarkan jadwal pada periode terpilih</p>
        </div>
        {daily.length ? (
          <div className="p-5">
            <div className="mb-2 flex gap-4 text-xs text-secondary">
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />Selesai</span>
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-amber-500" />Batal</span>
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-red-500" />No-show</span>
            </div>
            <div className="-mx-5">
              {daily.map(row => (
                <div key={row.date} className="border-b border-primary/10 px-5 py-3 last:border-0">
                  <div className="mb-1.5 flex items-center gap-4">
                    <span className="w-24 flex-shrink-0 text-xs text-secondary">
                      {new Date(`${row.date}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                    </span>
                    <div className="relative h-5 flex-1 overflow-hidden rounded-full bg-surface">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full bg-emerald-500/20"
                        style={{ width: `${boundedPercent(row.scheduled, maxScheduled)}%` }}
                      />
                      <div
                        className="absolute inset-y-0 left-0 rounded-full bg-emerald-500"
                        style={{ width: `${boundedPercent(row.completed, maxScheduled)}%` }}
                      />
                    </div>
                    <div className="flex w-32 flex-shrink-0 justify-end gap-3 text-right text-xs">
                      <span className="font-medium text-emerald-600">{number(row.completed)}</span>
                      <span className="text-amber-600">{number(row.cancelled)}</span>
                      <span className="text-red-500">{number(row.noShow)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : <Empty text="Belum ada appointment pada periode ini." icon="CalendarOff" />}
      </section>

      <section className="overflow-hidden rounded-2xl border border-primary/15 bg-surface-elevated">
        <div className="flex flex-col gap-3 border-b border-primary/10 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-semibold text-primary">KPI Dokter & Staf</h2>
            <p className="text-sm text-secondary">Tidak ada skor atau rating sintetis.</p>
          </div>
          <div className="flex gap-2">
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Cari nama…"
              className="rounded-xl border border-primary/20 bg-surface px-3 py-2 text-sm"
            />
            <select value={sort} onChange={event => setSort(event.target.value)} className="rounded-xl border border-primary/20 bg-surface px-3 py-2 text-sm">
              <option value="completed">Selesai terbanyak</option>
              <option value="appointments">Appointment</option>
              <option value="revenue">Revenue</option>
              <option value="completionRate">Completion rate</option>
            </select>
          </div>
        </div>
        {people.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface text-xs uppercase text-secondary">
                <tr>{['Nama', 'Role / Cabang', 'Appointment', 'Selesai', 'Completion', 'Pasien', 'Durasi rata-rata'].map(heading => <th key={heading} className="px-5 py-3 text-left">{heading}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-primary/10">
                {people.map((person, index) => (
                  <tr key={person.id}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <RankBadge index={index} />
                        <span className="font-medium text-primary">{person.name || 'Tanpa nama'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-secondary">{person.role || '—'}{person.branchName ? ` · ${person.branchName}` : ''}</td>
                    <td className="px-5 py-4">{number(person.appointments)}</td>
                    <td className="px-5 py-4">{number(person.completed)}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 min-w-[60px] flex-1 overflow-hidden rounded-full bg-surface">
                          <div
                            className="h-full rounded-full bg-accent"
                            style={{ width: `${boundedPercent(person.completionRate, 100)}%` }}
                          />
                        </div>
                        <span className="w-10 text-xs text-secondary">{percent(person.completionRate)}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">{number(person.uniquePatients)}</td>
                    <td className="px-5 py-4">{person.averageDurationMinutes == null ? '—' : `${number(person.averageDurationMinutes)} menit`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Empty text="Tidak ada staf atau dokter yang cocok." icon="UserSearch" />}
      </section>
    </div>
  );
};

export default OperationalView;
