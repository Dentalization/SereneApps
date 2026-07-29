import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../../components/AppIcon';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useNotifications } from '../../../contexts/NotificationContext';
import SideBar from './SideBar';

const CATEGORY_META = {
  appointments: {
    label: 'Appointments',
    icon: 'CalendarDays',
    accent: 'text-sky-600 dark:text-sky-300',
    badge: 'bg-sky-500/10 text-sky-600 dark:text-sky-200',
    border: 'border-sky-200/70 dark:border-sky-500/30 bg-sky-500/5',
  },
  teledentistry: {
    label: 'Virtual Care',
    icon: 'Video',
    accent: 'text-indigo-600 dark:text-indigo-300',
    badge: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-200',
    border: 'border-indigo-200/70 dark:border-indigo-500/40 bg-indigo-500/5',
  },
  clinical: {
    label: 'Clinical Work',
    icon: 'ClipboardPulse',
    accent: 'text-emerald-600 dark:text-emerald-300',
    badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-200',
    border: 'border-emerald-200/70 dark:border-emerald-500/40 bg-emerald-500/5',
  },
  business: {
    label: 'Business',
    icon: 'Wallet',
    accent: 'text-amber-600 dark:text-amber-300',
    badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-200',
    border: 'border-amber-200/70 dark:border-amber-500/30 bg-amber-500/5',
  },
  compliance: {
    label: 'Security',
    icon: 'Shield',
    accent: 'text-rose-600 dark:text-rose-300',
    badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-200',
    border: 'border-rose-200/70 dark:border-rose-500/30 bg-rose-500/5',
  },
  default: {
    label: 'System',
    icon: 'Bell',
    accent: 'text-slate-600 dark:text-slate-200',
    badge: 'bg-slate-500/10 text-slate-600 dark:text-slate-200',
    border: 'border-slate-200/70 dark:border-slate-500/30 bg-slate-500/5',
  },
};

const FILTERS = [
  { id: 'all', labelKey: 'notifications.filters.all' },
  { id: 'appointments', labelKey: 'notifications.filters.appointments' },
  { id: 'teledentistry', labelKey: 'notifications.filters.teledentistry' },
  { id: 'clinical', labelKey: 'notifications.filters.clinical' },
  { id: 'business', labelKey: 'notifications.filters.business' },
  { id: 'compliance', labelKey: 'notifications.filters.security' },
];

const DENTIST_NOTIFICATIONS = [
  {
    id: 'DEN-001',
    category: 'appointments',
    title: 'Patient rescheduled to evening slot',
    description: 'Husein F. memindahkan perawatan ortho ke 19:30. Auto reminder perlu dikirim ulang.',
    timeframe: 'Today',
    timestamp: '09:05 WIB',
    tag: 'Schedule',
    meta: 'Chair 3 • Duration 60m',
    severity: 'low',
    actions: [{ label: 'Review Jadwal', href: '/dentist-portal/appointments' }],
    read: false,
  },
  {
    id: 'DEN-002',
    category: 'teledentistry',
    title: 'Teledentistry consult request with new photos',
    description: 'Patient Vania F. uploaded 3 intraoral photos for AI pre-screen. Response SLA 30m.',
    timeframe: 'Today',
    timestamp: '08:44 WIB',
    tag: 'Virtual Care',
    meta: 'Queue #7 • Priority medium',
    severity: 'medium',
    actions: [{ label: 'Buka Konsultasi', href: '/dentist-portal/teledentistry' }],
    read: false,
  },
  {
    id: 'DEN-003',
    category: 'clinical',
    title: 'Lab case ready for delivery',
    description: 'Zirconia crown for patient Rika D. arrived at clinic. Check shade & schedule seat.',
    timeframe: 'Today',
    timestamp: '08:10 WIB',
    tag: 'Lab Case',
    meta: 'Lab: SmileLab • SLA 2d',
    severity: 'medium',
    actions: [{ label: 'Lihat Detail', href: '/dentist-portal/practice/services' }],
    read: false,
  },
  {
    id: 'DEN-004',
    category: 'business',
    title: 'Payout released for January 15 services',
    description: 'Rp 12.4M ditransfer ke rekening utama. Invoice #INV-221 diproses.',
    timeframe: 'Last 7 Days',
    timestamp: '13 Jan · 20:14 WIB',
    tag: 'Finance',
    meta: 'Earnings dashboard',
    severity: 'low',
    actions: [{ label: 'Lihat Payout', href: '/dentist-portal/practice/earnings' }],
    read: true,
  },
  {
    id: 'DEN-005',
    category: 'clinical',
    title: 'AI segmentation flagged anomaly',
    description: 'Periapical lesion detected for patient Rendi K. on AI scan #AI-791.',
    timeframe: 'Last 7 Days',
    timestamp: '12 Jan · 10:55 WIB',
    tag: 'AI Insight',
    meta: 'Confidence 82% • Suggest review',
    severity: 'high',
    actions: [{ label: 'Tinjau AI Scan', href: '/dentist-portal/ai-analysis' }],
    read: false,
  },
  {
    id: 'DEN-006',
    category: 'compliance',
    title: 'Login from new device detected',
    description: 'Account accessed from Chrome MacOS · Bandung. Confirm if this was you.',
    timeframe: 'Earlier',
    timestamp: '09 Jan · 22:05 WIB',
    tag: 'Security',
    meta: 'IP 36.79.199.22',
    severity: 'medium',
    actions: [{ label: 'Kelola Perangkat', href: '/dentist-portal/dentist-settings/security' }],
    read: true,
  },
  {
    id: 'DEN-007',
    category: 'appointments',
    title: 'Patient missed remote follow-up',
    description: 'Rizky S. belum menjadwalkan ulang teledentistry follow-up setelah AI triage.',
    timeframe: 'Earlier',
    timestamp: '08 Jan · 14:40 WIB',
    tag: 'Reminder',
    meta: 'Auto remind > 2 hari',
    severity: 'medium',
    actions: [{ label: 'Hubungi Pasien', href: '/dentist-portal/patient' }],
    read: true,
  },
];

const DENTIST_ACTIONS = [
  {
    id: 'da-1',
    title: 'Atur ketersediaan minggu depan',
    description: 'Blok jadwal untuk prosedur panjang & sesi teledentistry.',
    icon: 'CalendarPlus',
    href: '/dentist-portal/practice/availability',
    actionLabel: 'Kelola Jadwal',
  },
  {
    id: 'da-2',
    title: 'Bagikan temuan AI ke klinik',
    description: 'Sincronkan catatan AI ke EMR klinik agar tim aware.',
    icon: 'Share2',
    href: '/dentist-portal/ai-analysis',
    actionLabel: 'Bagikan',
  },
  {
    id: 'da-3',
    title: 'Review pemasukan terbaru',
    description: 'Pantau payout, komisi klinik, dan tagihan terbuka.',
    icon: 'TrendingUp',
    href: '/dentist-portal/practice/earnings',
    actionLabel: 'Buka Earnings',
  },
];

function parseNotificationTime(createdAtStr) {
  const date = new Date(createdAtStr);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  let timeframe = 'Earlier';
  if (date.toDateString() === now.toDateString()) {
    timeframe = 'Today';
  } else if (diffDays <= 7) {
    timeframe = 'Last 7 Days';
  }

  const hourMin = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) + ' WIB';
  let timestamp = hourMin;
  if (timeframe !== 'Today') {
    const day = date.getDate();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[date.getMonth()];
    timestamp = `${day} ${month} · ${hourMin}`;
  }

  return { timeframe, timestamp };
}

function getCategory(type) {
  if (!type) return 'default';
  const t = type.toLowerCase();
  if (t.startsWith('appointment_')) return 'appointments';
  if (t === 'chat_invite') return 'teledentistry';
  if (t.startsWith('treatment_plan_')) return 'clinical';
  if (t.startsWith('ai_')) return 'clinical';
  return 'default';
}

function getTag(type) {
  switch (type) {
    case 'appointment_confirmed': return 'Schedule';
    case 'appointment_cancelled': return 'Cancelled';
    case 'appointment_rescheduled': return 'Reschedule';
    case 'appointment_reminder': return 'Reminder';
    case 'chat_invite': return 'Virtual Care';
    case 'treatment_plan_sent': return 'Treatment Plan';
    case 'treatment_plan_approved': return 'Approved';
    case 'treatment_plan_rejected': return 'Rejected';
    default: return 'System';
  }
}

function getSeverity(type) {
  switch (type) {
    case 'appointment_cancelled':
    case 'appointment_payment_failed':
      return 'high';
    case 'appointment_reminder':
    case 'chat_invite':
      return 'medium';
    default:
      return 'low';
  }
}

function getActions(type, data) {
  switch (type) {
    case 'appointment_confirmed':
    case 'appointment_rescheduled':
    case 'appointment_reminder':
      return [{ label: 'Review Jadwal', href: `/dentist-portal/schedule` }];
    case 'chat_invite':
      return [{ label: 'Buka Konsultasi', href: `/dentist-portal/teledentistry` }];
    case 'treatment_plan_sent':
    case 'treatment_plan_approved':
    case 'treatment_plan_rejected':
      if (data?.patient?.id) {
        return [{ label: 'Tinjau Treatment', href: `/dentist-portal/patient-emr/${data.patient.id}` }];
      }
      return [{ label: 'Tinjau Treatment', href: `/dentist-portal/patient` }];
    default:
      return [];
  }
}

const NotificationScreenDentist = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [filter, setFilter] = useState('all');
  const {
    notifications: items,
    unreadCount,
    loading,
    markAsRead: handleMarkRead,
    markAllAsRead: handleMarkAllRead
  } = useNotifications();

  const filtered = useMemo(() => {
    if (filter === 'all') return items;
    return items.filter((item) => item.category === filter);
  }, [filter, items]);

  const grouped = useMemo(() => {
    return filtered.reduce((acc, item) => {
      if (!acc[item.timeframe]) acc[item.timeframe] = [];
      acc[item.timeframe].push(item);
      return acc;
    }, {});
  }, [filtered]);

  const dentistInsights = useMemo(() => [
    {
      id: 'today-schedule',
      title: 'Schedule updates',
      value: `${items.filter((item) => item.category === 'appointments').length} updates`,
      trend: `${items.filter((item) => item.category === 'appointments' && !item.read).length} unread`,
      icon: 'CalendarClock',
      tone: 'text-sky-500'
    },
    {
      id: 'clinical-work',
      title: 'Clinical updates',
      value: `${items.filter((item) => item.category === 'clinical').length} updates`,
      trend: `${items.filter((item) => item.category === 'clinical' && !item.read).length} unread`,
      icon: 'ClipboardPulse',
      tone: 'text-emerald-500'
    },
    {
      id: 'business-work',
      title: 'Business updates',
      value: `${items.filter((item) => item.category === 'business').length} updates`,
      trend: `${items.filter((item) => item.category === 'business' && !item.read).length} unread`,
      icon: 'Wallet',
      tone: 'text-amber-500'
    }
  ], [items]);

  const priorityAlerts = useMemo(
    () => items.filter((item) => item.severity === 'high' && !item.read).slice(0, 5),
    [items]
  );

  const getFilterCount = (filterId) => {
    if (filterId === 'all') return items.length;
    return items.filter((item) => item.category === filterId).length;
  };

  const handleAction = (action) => {
    if (!action?.href) return;
    if (action.href.startsWith('http')) {
      window.open(action.href, '_blank', 'noopener');
      return;
    }
    navigate(action.href);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-background theme-transition">
        <div className="flex-shrink-0" style={{ width: 'var(--sidebar-width, 20rem)' }}>
          <SideBar />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background theme-transition">
      <div className="flex-shrink-0" style={{ width: 'var(--sidebar-width, 20rem)' }}>
        <SideBar />
      </div>
      <div className="flex-1 min-w-0">
        <div className="p-6 md:p-8 space-y-8">
          <section className="clinic-page-header space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.4em] text-secondary">
                  {t('common.notifications') || 'Notifications'}
                </p>
                <h1 className="text-3xl font-semibold text-primary">
                  {t('notifications.dentist.title')}
                </h1>
                <p className="text-sm text-secondary max-w-2xl">
                  {t('notifications.dentist.subtitle')}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <button
                  onClick={handleMarkAllRead}
                  className="inline-flex items-center gap-2 rounded-xl border border-border/40 px-4 py-2 text-sm font-medium text-primary hover:border-accent hover:text-accent transition"
                >
                  <Icon name="CheckCheck" size={16} />
                  {t('notifications.common.markAllRead')}
                </button>
                <button className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-hover">
                  <Icon name="BellRing" size={16} />
                  {t('notifications.common.focusMode')}
                </button>
              </div>
            </div>
            <div className="border-t border-border/40 pt-4">
              <div className="flex flex-wrap gap-2">
                {FILTERS.map((option) => {
                  const label = t(option.labelKey) || option.id;
                  const isActive = filter === option.id;
                  return (
                    <button
                      key={option.id}
                      onClick={() => setFilter(option.id)}
                      className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${isActive
                        ? 'bg-accent text-white shadow-sm'
                        : 'border border-transparent text-secondary hover:text-primary hover:border-border/70'
                        }`}
                    >
                      <span>{label}</span>
                      <span
                        className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full text-xs ${isActive ? 'bg-white/25 text-white' : 'bg-primary/10 text-secondary'
                          }`}
                      >
                        {getFilterCount(option.id)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-border/40 bg-surface p-5 shadow-sm">
              <p className="text-xs text-secondary/70">{t('notifications.dentist.stats.totalLabel')}</p>
              <div className="flex items-end justify-between mt-2">
                <span className="text-3xl font-semibold text-primary">{items.length}</span>
                <span className="text-xs text-secondary">{t('notifications.dentist.stats.totalMeta')}</span>
              </div>
              <p className="mt-2 text-sm text-secondary">
                {t('notifications.dentist.stats.totalDescription')}
              </p>
            </div>
            <div className="rounded-2xl border border-border/40 bg-surface p-5 shadow-sm">
              <p className="text-xs text-secondary/70">{t('notifications.dentist.stats.unreadLabel')}</p>
              <div className="flex items-end justify-between mt-2">
                <span className="text-3xl font-semibold text-rose-500">{unreadCount}</span>
                <span className="text-xs text-secondary">{t('notifications.dentist.stats.unreadMeta')}</span>
              </div>
              <p className="mt-2 text-sm text-secondary">
                {t('notifications.dentist.stats.unreadDescription')}
              </p>
            </div>
            <div className="rounded-2xl border border-border/40 bg-surface p-5 shadow-sm">
              <p className="text-xs text-secondary/70">
                {t('notifications.dentist.stats.clinicalLabel')}
              </p>
              <div className="flex items-end justify-between mt-2">
                <span className="text-3xl font-semibold text-emerald-500">
                  {items.filter((item) => item.category === 'clinical').length}
                </span>
                <span className="text-xs text-secondary">
                  {t('notifications.dentist.stats.clinicalMeta')}
                </span>
              </div>
              <p className="mt-2 text-sm text-secondary">
                {t('notifications.dentist.stats.clinicalDescription')}
              </p>
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="space-y-6">
              {Object.entries(grouped).map(([timeframe, entries]) => (
                <section key={timeframe} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm uppercase tracking-[0.3em] text-secondary/70">{timeframe}</p>
                      <p className="text-xs text-secondary/80">
                        {t('notifications.common.notificationsCount', { count: entries.length })}
                      </p>
                    </div>
                    <span className="text-xs text-secondary">{entries[0]?.timestamp}</span>
                  </div>
                  <div className="space-y-4">
                    {entries.map((item) => {
                      const meta = CATEGORY_META[item.category] || CATEGORY_META.default;
                      return (
                        <article
                          key={item.id}
                          className={`rounded-3xl border bg-surface p-5 transition ${item.read ? 'border-border/40' : 'border-accent/40 shadow-theme'
                            }`}
                        >
                          <div className="flex items-start gap-4">
                            <div
                              className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${meta.border}`}
                            >
                              <Icon name={meta.icon} size={22} className={meta.accent} />
                            </div>
                            <div className="flex-1 space-y-2">
                              <div className="flex flex-wrap items-center gap-2 text-xs">
                                <span className={`rounded-full px-2 py-0.5 ${meta.badge}`}>
                                  {meta.label}
                                </span>
                                {item.tag && (
                                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">
                                    {item.tag}
                                  </span>
                                )}
                                {!item.read && (
                                  <span className="flex items-center gap-1 text-amber-500">
                                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                                    {t('notifications.common.new')}
                                  </span>
                                )}
                              </div>
                              <div>
                                <h3 className="text-lg font-semibold text-primary">{item.title}</h3>
                                <p className="text-sm text-secondary mt-1">{item.description}</p>
                              </div>
                              <div className="flex flex-wrap items-center gap-3 text-xs text-secondary/80">
                                <div className="flex items-center gap-1.5">
                                  <Icon name="Clock" size={14} />
                                  <span>{item.timestamp}</span>
                                </div>
                                {item.meta && (
                                  <div className="flex items-center gap-1.5">
                                    <Icon name="Info" size={14} />
                                    <span>{item.meta}</span>
                                  </div>
                                )}
                                {item.severity === 'high' && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-rose-500">
                                    <Icon name="AlertTriangle" size={14} />
                                    {t('notifications.common.priority')}
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-3 pt-1">
                              {(item.actionsByPortal?.dentist || item.actions)?.map((action) => (
                                  <button
                                    key={action.label}
                                    onClick={() => handleAction(action)}
                                    className="inline-flex items-center gap-2 rounded-full border border-primary/30 px-3 py-1.5 text-sm font-medium text-primary hover:border-accent hover:text-accent"
                                  >
                                    <Icon name="ArrowUpRight" size={14} />
                                    {action.label}
                                  </button>
                                ))}
                                {!item.read && (
                                  <button
                                    onClick={() => handleMarkRead(item.id)}
                                    className="text-sm text-secondary hover:text-primary"
                                  >
                                    {t('notifications.common.markAsRead')}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              ))}
              {!filtered.length && (
                <div className="rounded-3xl border border-dashed border-border/40 bg-surface p-10 text-center">
                  <Icon name="Inbox" size={32} className="mx-auto text-secondary/60" />
                  <p className="mt-3 text-lg font-semibold text-primary">
                    {t('notifications.dentist.emptyTitle')}
                  </p>
                  <p className="text-secondary">{t('notifications.dentist.emptyDescription')}</p>
                </div>
              )}
            </div>

            <aside className="space-y-5">
              <section className="rounded-3xl border border-border/30 bg-surface p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold tracking-[0.3em] text-secondary">
                    {t('notifications.dentist.sections.insights')}
                  </h3>
                  <Icon name="LineChart" size={16} className="text-secondary" />
                </div>
                <div className="mt-4 space-y-4">
                  {dentistInsights.map((insight) => (
                    <div key={insight.id} className="rounded-2xl border border-border/30 bg-background/40 p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs uppercase tracking-widest text-secondary/70">
                            {insight.title}
                          </p>
                          <p className="text-2xl font-semibold text-primary mt-1">{insight.value}</p>
                          <p className={`text-xs mt-1 ${insight.tone}`}>{insight.trend}</p>
                        </div>
                        <div className="rounded-2xl bg-primary/5 p-3">
                          <Icon name={insight.icon} size={18} className={insight.tone} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-3xl border border-rose-200/40 bg-surface p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-rose-500">
                    {t('notifications.dentist.sections.alerts')}
                  </h3>
                  <Icon name="Target" size={16} className="text-rose-500" />
                </div>
                <div className="mt-4 space-y-4">
                  {priorityAlerts.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-rose-200/40 bg-background/50 p-4 dark:bg-surface/60">
                      <p className="text-sm font-semibold text-primary">{item.title}</p>
                      <p className="text-xs text-secondary mt-1">{item.description}</p>
                      <p className="mt-2 text-xs text-secondary">{item.timestamp}</p>
                    </div>
                  ))}
                  {!priorityAlerts.length && (
                    <p className="rounded-2xl border border-dashed border-border/40 p-4 text-sm text-secondary">
                      Tidak ada alert prioritas yang belum dibaca.
                    </p>
                  )}
                </div>
              </section>

              <section className="rounded-3xl border border-border/30 bg-surface p-5 shadow-sm">
                <h3 className="text-sm font-semibold tracking-[0.3em] text-secondary">
                  {t('notifications.dentist.sections.playbooks')}
                </h3>
                <div className="mt-4 space-y-4">
                  {DENTIST_ACTIONS.map((action) => (
                    <div key={action.id} className="rounded-2xl border border-primary/10 p-4">
                      <div className="flex items-start gap-3">
                        <div className="rounded-2xl bg-primary/5 p-3">
                          <Icon name={action.icon} size={18} className="text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-primary">{action.title}</p>
                          <p className="text-sm text-secondary mt-1">{action.description}</p>
                          <button
                            onClick={() => handleAction({ href: action.href })}
                            className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-accent"
                          >
                            {action.actionLabel}
                            <Icon name="ArrowUpRight" size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationScreenDentist;
