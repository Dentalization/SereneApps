import React, { useMemo } from 'react';
import Icon from '../../../../components/AppIcon';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { buildScheduleAnalytics } from '../scheduleAnalytics.mjs';

const STATUS_ITEMS = [
  { key: 'confirmed', label: 'Confirmed', color: 'bg-blue-500' },
  { key: 'pending', label: 'Pending', color: 'bg-amber-500' },
  { key: 'inProgress', label: 'In Progress', color: 'bg-orange-500' },
  { key: 'completed', label: 'Completed', color: 'bg-emerald-500' },
  { key: 'cancelled', label: 'Cancelled', color: 'bg-rose-500' },
  { key: 'noShow', label: 'No-show', color: 'bg-fuchsia-500' },
  { key: 'overdue', label: 'Overdue', color: 'bg-slate-500' }
];

const RECOMMENDATION_TONES = {
  amber: 'border-amber-200/70 bg-amber-50/70 text-amber-900 dark:border-amber-700/40 dark:bg-amber-950/20 dark:text-amber-100',
  cyan: 'border-cyan-200/70 bg-cyan-50/70 text-cyan-900 dark:border-cyan-700/40 dark:bg-cyan-950/20 dark:text-cyan-100',
  violet: 'border-violet-200/70 bg-violet-50/70 text-violet-900 dark:border-violet-700/40 dark:bg-violet-950/20 dark:text-violet-100',
  rose: 'border-rose-200/70 bg-rose-50/70 text-rose-900 dark:border-rose-700/40 dark:bg-rose-950/20 dark:text-rose-100',
  blue: 'border-blue-200/70 bg-blue-50/70 text-blue-900 dark:border-blue-700/40 dark:bg-blue-950/20 dark:text-blue-100',
  slate: 'border-primary/15 bg-primary/5 text-primary'
};

function formatDuration(minutes) {
  if (minutes == null) return 'Belum tersedia';
  if (minutes < 60) return `${minutes} menit`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}j ${remainder}m` : `${hours} jam`;
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(amount || 0);
}

const StatCard = ({ title, value, subtitle, icon, iconClass, trend }) => (
  <div className="rounded-3xl border border-primary/20 bg-surface-elevated p-6 shadow-theme-lg theme-transition">
    <div className="mb-3 flex items-center justify-between gap-3">
      <p className="text-sm font-medium text-secondary">{title}</p>
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/5">
        <Icon name={icon} size={20} className={iconClass} />
      </div>
    </div>
    <p className="text-3xl font-bold text-primary">{value}</p>
    <p className="mt-1 text-sm text-secondary/70">{subtitle}</p>
    {trend != null && (
      <div className="mt-4 flex items-center gap-2 border-t border-primary/10 pt-3 text-xs text-secondary">
        <Icon
          name={trend >= 0 ? 'TrendingUp' : 'TrendingDown'}
          size={14}
          className={trend >= 0 ? 'text-emerald-500' : 'text-rose-500'}
        />
        <span className={trend >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
          {trend > 0 ? '+' : ''}{trend}%
        </span>
        <span>dibanding hari sebelumnya</span>
      </div>
    )}
  </div>
);

const MetricRow = ({ icon, iconClass, title, description, value, detail }) => (
  <div className="flex items-center justify-between gap-4">
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/5">
        <Icon name={icon} size={17} className={iconClass} />
      </div>
      <div className="min-w-0">
        <p className="font-medium text-primary">{title}</p>
        <p className="text-sm text-secondary/70">{description}</p>
      </div>
    </div>
    <div className="shrink-0 text-right">
      <p className="text-lg font-bold text-primary">{value}</p>
      {detail && <p className="text-xs text-secondary/60">{detail}</p>}
    </div>
  </div>
);

const InsightCard = ({ icon, iconClass, title, value, description }) => (
  <div className="rounded-2xl border border-primary/15 bg-surface p-5 text-center">
    <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/5">
      <Icon name={icon} size={22} className={iconClass} />
    </div>
    <p className="text-sm font-medium text-secondary">{title}</p>
    <p className="mt-1 text-xl font-bold text-primary">{value}</p>
    <p className="mt-1 text-xs leading-relaxed text-secondary/60">{description}</p>
  </div>
);

const ClinicScheduleStats = ({ appointments, doctors, selectedDate }) => {
  const { tSafe } = useLanguage();
  const analytics = useMemo(
    () => buildScheduleAnalytics({ appointments, doctors, selectedDate }),
    [appointments, doctors, selectedDate]
  );
  const {
    stats,
    previousDayTotal,
    dayChange,
    doctorStats,
    hourlyDistribution,
    bookedMinutes,
    averageDuration,
    historicalPeak,
    attendanceRate,
    attendanceSampleSize,
    cancellationRate,
    resolvedSampleSize,
    averageWait,
    waitSampleSize,
    selectedRevenue,
    revenueChange,
    recommendations
  } = analytics;

  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : null;
  const maxHourlyCount = Math.max(0, ...hourlyDistribution.map((item) => item.count));
  const historicalPeakLabel = historicalPeak.hour == null
    ? 'Belum cukup data'
    : `${String(historicalPeak.hour).padStart(2, '0')}:00–${String((historicalPeak.hour + 1) % 24).padStart(2, '0')}:00`;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={tSafe('clinic.schedule.stats.totalAppointments', 'Total Appointment')}
          value={stats.total}
          subtitle={`${previousDayTotal} pada hari sebelumnya`}
          icon="Calendar"
          iconClass="text-blue-500"
          trend={dayChange}
        />
        <StatCard
          title={tSafe('clinic.schedule.confirmed', 'Confirmed')}
          value={stats.confirmed}
          subtitle={`${stats.total ? Math.round((stats.confirmed / stats.total) * 100) : 0}% dari jadwal tanggal ini`}
          icon="BadgeCheck"
          iconClass="text-emerald-500"
        />
        <StatCard
          title={tSafe('clinic.schedule.stats.inProgress', 'Sedang Berlangsung')}
          value={stats.inProgress}
          subtitle="Status check-in atau in-chair"
          icon="Activity"
          iconClass="text-amber-500"
        />
        <StatCard
          title={tSafe('clinic.schedule.completed', 'Completed')}
          value={stats.completed}
          subtitle={`${completionRate ?? 0}% dari jadwal tanggal ini`}
          icon="CircleCheckBig"
          iconClass="text-violet-500"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-primary/20 bg-surface-elevated p-6 shadow-theme-lg">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-primary">
                {tSafe('clinic.schedule.stats.doctorWorkload', 'Beban Jadwal Dokter')}
              </h3>
              <p className="text-sm text-secondary/70">Berdasarkan appointment pada tanggal terpilih</p>
            </div>
            <Icon name="Users" size={20} className="text-secondary/60" />
          </div>
          <div className="space-y-4">
            {doctorStats.slice(0, 8).map((doctor) => (
              <div key={doctor.id} className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/10 text-sm font-semibold text-accent">
                    {(doctor.name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-primary">{doctor.name}</p>
                    <p className="truncate text-sm text-secondary/70">
                      {doctor.specialization || 'Dokter Gigi Umum'}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-semibold text-primary">{doctor.appointmentCount} appointment</p>
                  <p className="text-xs text-secondary/60">{formatDuration(doctor.bookedMinutes)} terjadwal</p>
                </div>
              </div>
            ))}
            {doctorStats.length === 0 && (
              <div className="py-8 text-center">
                <Icon name="UserRoundX" size={38} className="mx-auto mb-2 text-secondary/30" />
                <p className="text-sm text-secondary/70">Belum ada dokter klinik yang dapat ditampilkan.</p>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-primary/20 bg-surface-elevated p-6 shadow-theme-lg">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-primary">
                {tSafe('clinic.schedule.stats.appointmentStatus', 'Status Appointment')}
              </h3>
              <p className="text-sm text-secondary/70">Seluruh status pada tanggal terpilih</p>
            </div>
            <Icon name="ChartNoAxesColumnIncreasing" size={20} className="text-secondary/60" />
          </div>
          <div className="space-y-3">
            {STATUS_ITEMS.map((item) => {
              const count = stats[item.key] || 0;
              const percentage = stats.total ? Math.round((count / stats.total) * 100) : 0;
              return (
                <div key={item.key} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
                    <span className="text-sm text-secondary">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-primary">{count}</span>
                    <span className="w-10 text-right text-xs text-secondary/60">{percentage}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-primary/20 bg-surface-elevated p-6 shadow-theme-lg">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-primary">Distribusi Waktu Aktual</h3>
              <p className="text-sm text-secondary/70">Dihitung dari jam mulai appointment tanggal ini</p>
            </div>
            <Icon name="ChartColumn" size={20} className="text-secondary/60" />
          </div>
          {hourlyDistribution.length > 0 ? (
            <>
              <div className="flex h-36 items-end gap-2">
                {hourlyDistribution.map(({ hour, count }) => (
                  <div key={hour} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                    <span className="text-xs font-medium text-primary">{count}</span>
                    <div className="flex h-20 w-full items-end rounded-lg bg-primary/5">
                      <div
                        className="w-full rounded-lg bg-accent/75"
                        style={{ height: `${Math.max(12, (count / maxHourlyCount) * 100)}%` }}
                        title={`${String(hour).padStart(2, '0')}:00 · ${count} appointment`}
                      />
                    </div>
                    <span className="text-[11px] text-secondary/60">{String(hour).padStart(2, '0')}:00</span>
                  </div>
                ))}
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 border-t border-primary/10 pt-4">
                <div>
                  <p className="text-xs text-secondary/60">Waktu terjadwal</p>
                  <p className="font-semibold text-primary">{formatDuration(bookedMinutes)}</p>
                </div>
                <div>
                  <p className="text-xs text-secondary/60">Rata-rata durasi</p>
                  <p className="font-semibold text-primary">{formatDuration(averageDuration)}</p>
                </div>
              </div>
            </>
          ) : (
            <div className="py-10 text-center">
              <Icon name="CalendarClock" size={38} className="mx-auto mb-2 text-secondary/30" />
              <p className="text-sm text-secondary/70">Belum ada waktu appointment untuk dianalisis.</p>
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-primary/20 bg-surface-elevated p-6 shadow-theme-lg">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-primary">Indikator Operasional</h3>
              <p className="text-sm text-secondary/70">Tanpa target atau estimasi buatan</p>
            </div>
            <Icon name="Gauge" size={20} className="text-secondary/60" />
          </div>
          <div className="space-y-5">
            <MetricRow
              icon="CircleCheck"
              iconClass="text-emerald-500"
              title="Completion tanggal ini"
              description="Completed dibanding seluruh jadwal"
              value={completionRate == null ? '—' : `${completionRate}%`}
              detail={`${stats.completed} dari ${stats.total}`}
            />
            <MetricRow
              icon="UserCheck"
              iconClass="text-blue-500"
              title="Attendance historis"
              description="Completed dibanding completed + no-show"
              value={attendanceRate == null ? '—' : `${attendanceRate}%`}
              detail={attendanceSampleSize ? `${attendanceSampleSize} kunjungan` : 'Belum ada sampel'}
            />
            <MetricRow
              icon="Ban"
              iconClass="text-rose-500"
              title="Cancelled / no-show historis"
              description="Dari appointment historis yang sudah resolved"
              value={cancellationRate == null ? '—' : `${cancellationRate}%`}
              detail={resolvedSampleSize ? `${resolvedSampleSize} appointment` : 'Belum ada sampel'}
            />
            <MetricRow
              icon="Clock4"
              iconClass="text-violet-500"
              title="Waktu terjadwal"
              description="Total durasi appointment aktif tanggal ini"
              value={formatDuration(bookedMinutes)}
            />
          </div>
        </section>
      </div>

      <section className="rounded-3xl border border-primary/20 bg-surface-elevated p-6 shadow-theme-lg">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-primary">Insight dari Data Jadwal</h3>
            <p className="text-sm text-secondary/70">Semua nilai berasal dari appointment dan status history yang tersedia</p>
          </div>
          <Icon name="DatabaseZap" size={20} className="text-secondary/60" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <InsightCard
            icon="Clock3"
            iconClass="text-blue-500"
            title="Jam historis terpadat"
            value={historicalPeakLabel}
            description={historicalPeak.sampleSize >= 5
              ? `${historicalPeak.count} appointment pada jam tersebut · ${historicalPeak.sampleSize} sampel`
              : `Memerlukan minimal 5 sampel · tersedia ${historicalPeak.sampleSize}`}
          />
          <InsightCard
            icon="Timer"
            iconClass="text-amber-500"
            title="Rata-rata durasi"
            value={formatDuration(averageDuration)}
            description="Berdasarkan durasi appointment aktif tanggal terpilih"
          />
          <InsightCard
            icon="Hourglass"
            iconClass="text-violet-500"
            title="Rata-rata waktu tunggu"
            value={averageWait == null ? 'Belum tersedia' : `${averageWait} menit`}
            description={waitSampleSize
              ? `Check-in hingga in-chair · ${waitSampleSize} sampel historis`
              : 'Memerlukan riwayat status check-in dan in-chair'}
          />
          <InsightCard
            icon="WalletCards"
            iconClass="text-emerald-500"
            title="Pembayaran berhasil"
            value={formatCurrency(selectedRevenue)}
            description={revenueChange == null
              ? 'Total pada tanggal terpilih · tren belum tersedia'
              : `${revenueChange > 0 ? '+' : ''}${revenueChange}% pada 7 hari terakhir vs periode sebelumnya`}
          />
        </div>

        <div className="mt-6 border-t border-primary/10 pt-6">
          <h4 className="mb-4 font-medium text-primary">Rekomendasi Berbasis Kondisi Aktual</h4>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {recommendations.map((recommendation) => (
              <div
                key={`${recommendation.title}-${recommendation.description}`}
                className={`flex items-start gap-3 rounded-2xl border p-4 ${RECOMMENDATION_TONES[recommendation.tone] || RECOMMENDATION_TONES.slate}`}
              >
                <Icon name={recommendation.icon} size={17} className="mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold">{recommendation.title}</p>
                  <p className="mt-1 text-xs leading-relaxed opacity-75">{recommendation.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default ClinicScheduleStats;
