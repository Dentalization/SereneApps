import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../../components/AppIcon';
import { useLanguage } from '../../../contexts/LanguageContext';
import ClinicSideBar from './SideBar-Clinic';
import { useAuth } from '../../../contexts/AuthContext';
import { getClinicNotificationsForRoles } from './clinicNotificationsData';

const CATEGORY_META = {
  schedule: {
    label: 'Schedule & Queue',
    icon: 'CalendarClock',
    accent: 'text-sky-600 dark:text-sky-300',
    badge: 'bg-sky-500/10 text-sky-600 dark:text-sky-200',
    border: 'border-sky-200/70 dark:border-sky-500/30 bg-sky-500/5',
  },
  patient: {
    label: 'Patients',
    icon: 'UserRound',
    accent: 'text-emerald-600 dark:text-emerald-300',
    badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-200',
    border: 'border-emerald-200/70 dark:border-emerald-500/30 bg-emerald-500/5',
  },
  billing: {
    label: 'Billing & Insurance',
    icon: 'Receipt',
    accent: 'text-amber-600 dark:text-amber-300',
    badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-200',
    border: 'border-amber-200/70 dark:border-amber-500/30 bg-amber-500/5',
  },
  operations: {
    label: 'Operations',
    icon: 'Boxes',
    accent: 'text-indigo-600 dark:text-indigo-300',
    badge: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-200',
    border: 'border-indigo-200/70 dark:border-indigo-500/30 bg-indigo-500/5',
  },
  marketing: {
    label: 'Experience',
    icon: 'Megaphone',
    accent: 'text-fuchsia-600 dark:text-fuchsia-300',
    badge: 'bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-200',
    border: 'border-fuchsia-200/70 dark:border-fuchsia-500/30 bg-fuchsia-500/5',
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
  { id: 'schedule', labelKey: 'notifications.filters.schedule' },
  { id: 'patient', labelKey: 'notifications.filters.patient' },
  { id: 'billing', labelKey: 'notifications.filters.billing' },
  { id: 'operations', labelKey: 'notifications.filters.operations' },
  { id: 'marketing', labelKey: 'notifications.filters.marketing' },
];

const CLINIC_INSIGHTS = [
  {
    id: 'queue',
    title: 'Current queue load',
    value: '12 waiting',
    trend: 'Avg wait 18m',
    icon: 'Activity',
    tone: 'text-sky-500',
  },
  {
    id: 'billing',
    title: 'Billing follow-ups',
    value: '5 claims',
    trend: 'Rp 22.4M pending',
    icon: 'FileText',
    tone: 'text-amber-500',
  },
  {
    id: 'inventory',
    title: 'Inventory low stock',
    value: '3 items',
    trend: 'Sterilization packs lead time 2d',
    icon: 'Layers',
    tone: 'text-indigo-500',
  },
];

const CLINIC_ALERTS = [
  {
    id: 'alert-1',
    title: 'Sterilization cassette B idle',
    detail: 'Overdue 34 minutes • 6 kits pending',
    owner: 'Nurse Kevin',
    impact: 'Ops & Compliance',
  },
  {
    id: 'alert-2',
    title: 'Front office understaffed at 17.00 slot',
    detail: '2 staff absent • 24 patients scheduled',
    owner: 'Clinic Admin',
    impact: 'Queue Experience',
  },
];

const CLINIC_ACTIONS = [
  {
    id: 'ca-1',
    title: 'Broadcast wait-time SMS',
    description: 'Inform afternoon patients about queue stretch to reduce lobby crowding.',
    icon: 'MessageSquare',
    href: '/clinic-portal/patients',
    actionLabel: 'Kirim SMS',
  },
  {
    id: 'ca-2',
    title: 'Approve insurance batch',
    description: 'Review BPJS batch 14 & attach requested radiographs in one click.',
    icon: 'ClipboardCheck',
    href: '/clinic-portal/billing',
    actionLabel: 'Buka Klaim',
  },
  {
    id: 'ca-3',
    title: 'Assign floater nurse',
    description: 'Move spare nurse to sterilization to clear backlog before noon.',
    icon: 'UserCog',
    href: '/clinic-portal/staff',
    actionLabel: 'Atur Staff',
  },
];

const NotificationScreenClinic = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();

  const userRoles = useMemo(() => {
    const roles = new Set(user?.roles || []);
    if (roles.has('clinic_owner')) roles.add('owner');
    if (roles.has('clinic_admin')) roles.add('manager');
    if (!roles.size && user?.role) roles.add(user.role);
    if (!roles.size) roles.add('staff');
    return roles;
  }, [user?.roles, user?.role]);

  const resolvedRoles = useMemo(() => Array.from(userRoles), [userRoles]);
  const isManagerial = useMemo(
    () => resolvedRoles.includes('owner') || resolvedRoles.includes('manager'),
    [resolvedRoles]
  );
  const roleNotifications = useMemo(
    () => getClinicNotificationsForRoles(resolvedRoles, { includeAll: isManagerial }),
    [resolvedRoles, isManagerial]
  );

  const [filter, setFilter] = useState('all');
  const [items, setItems] = useState(roleNotifications);

  useEffect(() => {
    setItems(roleNotifications);
  }, [roleNotifications]);

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

  const unreadCount = useMemo(() => items.filter((item) => !item.read).length, [items]);

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

  const handleMarkRead = (id) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, read: true } : item)));
  };

  const handleMarkAllRead = () => {
    setItems((prev) => prev.map((item) => ({ ...item, read: true })));
  };

  return (
    <div className="flex min-h-screen bg-background theme-transition">
      <div className="flex-shrink-0" style={{ width: 'var(--sidebar-width, 20rem)' }}>
        <ClinicSideBar />
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
                  {t('notifications.clinic.title')}
                </h1>
                <p className="text-sm text-secondary max-w-2xl">
                  {t('notifications.clinic.subtitle')}
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
                  {t('notifications.common.preferences')}
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
                      className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
                        isActive
                          ? 'bg-accent text-white shadow-sm'
                          : 'border border-transparent text-secondary hover:text-primary hover:border-border/70'
                      }`}
                    >
                      <span>{label}</span>
                      <span
                        className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full text-xs ${
                          isActive ? 'bg-white/25 text-white' : 'bg-primary/10 text-secondary'
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
            <p className="text-xs text-secondary/70">
              {t('notifications.clinic.stats.totalLabel')}
            </p>
            <div className="flex items-end justify-between mt-2">
              <span className="text-3xl font-semibold text-primary">{items.length}</span>
              <span className="text-xs text-secondary">
                {t('notifications.common.asOf', { time: new Date().toLocaleTimeString() })}
              </span>
            </div>
            <p className="mt-2 text-sm text-secondary">
              {t('notifications.clinic.stats.totalDescription')}
            </p>
          </div>
          <div className="rounded-2xl border border-border/40 bg-surface p-5 shadow-sm">
            <p className="text-xs text-secondary/70">
              {t('notifications.clinic.stats.unreadLabel')}
            </p>
            <div className="flex items-end justify-between mt-2">
              <span className="text-3xl font-semibold text-rose-500">{unreadCount}</span>
              <span className="text-xs text-secondary">
                {t('notifications.clinic.stats.unreadMeta')}
              </span>
            </div>
            <p className="mt-2 text-sm text-secondary">
              {t('notifications.clinic.stats.unreadDescription')}
            </p>
          </div>
          <div className="rounded-2xl border border-border/40 bg-surface p-5 shadow-sm">
            <p className="text-xs text-secondary/70">{t('notifications.clinic.stats.opsLabel')}</p>
            <div className="flex items-end justify-between mt-2">
              <span className="text-3xl font-semibold text-amber-500">
                {items.filter((item) => item.category === 'operations').length}
              </span>
              <span className="text-xs text-secondary">{t('notifications.clinic.stats.opsMeta')}</span>
            </div>
            <p className="mt-2 text-sm text-secondary">
              {t('notifications.clinic.stats.opsDescription')}
            </p>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            {Object.entries(grouped).map(([timeframe, entries]) => (
              <section key={timeframe} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.3em] text-secondary/70">{timeframe}</p>
                    <p className="text-xs text-secondary/80">
                      {t('notifications.common.updatesCount', { count: entries.length })}
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
                        className={`rounded-3xl border bg-surface p-5 transition ${
                          item.read ? 'border-border/40' : 'border-accent/40 shadow-theme'
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
                                <Icon name="Clock8" size={14} />
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
                              {item.actions?.map((action) => (
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
                  {t('notifications.clinic.emptyTitle')}
                </p>
                <p className="text-secondary">{t('notifications.clinic.emptyDescription')}</p>
              </div>
            )}
          </div>

          <aside className="space-y-5">
            <section className="rounded-3xl border border-border/30 bg-surface p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold tracking-[0.3em] text-secondary">
                  {t('notifications.clinic.sections.insights')}
                </h3>
                <Icon name="LineChart" size={16} className="text-secondary" />
              </div>
              <div className="mt-4 space-y-4">
                {CLINIC_INSIGHTS.map((insight) => (
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
                  {t('notifications.clinic.sections.alerts')}
                </h3>
                <Icon name="AlarmClock" size={16} className="text-rose-500" />
              </div>
              <div className="mt-4 space-y-4">
                {CLINIC_ALERTS.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-rose-200/40 bg-background/50 p-4 dark:bg-surface/60">
                    <p className="text-sm font-semibold text-primary">{item.title}</p>
                    <p className="text-xs text-secondary mt-1">{item.detail}</p>
                    <div className="mt-2 flex items-center justify-between text-xs text-secondary">
                      <span className="inline-flex items-center gap-1">
                        <Icon name="UserCircle2" size={12} />
                        {item.owner}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Icon name="ArrowRight" size={12} />
                        {item.impact}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-border/30 bg-surface p-5 shadow-sm">
              <h3 className="text-sm font-semibold tracking-[0.3em] text-secondary">
                {t('notifications.clinic.sections.playbooks')}
              </h3>
              <div className="mt-4 space-y-4">
                {CLINIC_ACTIONS.map((action) => (
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

export default NotificationScreenClinic;
