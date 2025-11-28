import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppIcon from '../../../components/AppIcon';
import { useLanguage } from '../../../contexts/LanguageContext';
import AdminSideBar from './sidebar-admin';
import { useAuth } from '../../../contexts/AuthContext';
import { getAdminNotificationsForRoles } from './adminNotificationsData';

const CATEGORY_META = {
  network: {
    label: 'Network',
    icon: 'Building2',
    accent: 'text-sky-600 dark:text-sky-300',
    badge: 'bg-sky-500/10 text-sky-600 dark:text-sky-200',
    border: 'border-sky-200/70 dark:border-sky-500/30 bg-sky-500/5',
  },
  billing: {
    label: 'Revenue & Billing',
    icon: 'Wallet',
    accent: 'text-emerald-600 dark:text-emerald-300',
    badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-200',
    border: 'border-emerald-200/70 dark:border-emerald-500/30 bg-emerald-500/5',
  },
  ai: {
    label: 'AI Platform',
    icon: 'Brain',
    accent: 'text-purple-600 dark:text-purple-300',
    badge: 'bg-purple-500/10 text-purple-600 dark:text-purple-200',
    border: 'border-purple-200/70 dark:border-purple-500/30 bg-purple-500/5',
  },
  support: {
    label: 'Support',
    icon: 'HeadphonesIcon',
    accent: 'text-amber-600 dark:text-amber-300',
    badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-200',
    border: 'border-amber-200/70 dark:border-amber-500/30 bg-amber-500/5',
  },
  compliance: {
    label: 'Compliance',
    icon: 'ShieldCheck',
    accent: 'text-rose-600 dark:text-rose-300',
    badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-200',
    border: 'border-rose-200/70 dark:border-rose-500/30 bg-rose-500/5',
  },
  analytics: {
    label: 'Analytics',
    icon: 'BarChart3',
    accent: 'text-indigo-600 dark:text-indigo-300',
    badge: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-200',
    border: 'border-indigo-200/70 dark:border-indigo-500/30 bg-indigo-500/5',
  },
  partnership: {
    label: 'Partnership',
    icon: 'Handshake',
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
  { id: 'network', labelKey: 'notifications.filters.network' },
  { id: 'billing', labelKey: 'notifications.filters.billing' },
  { id: 'ai', labelKey: 'notifications.filters.ai' },
  { id: 'support', labelKey: 'notifications.filters.support' },
  { id: 'compliance', labelKey: 'notifications.filters.compliance' },
  { id: 'analytics', labelKey: 'notifications.filters.analytics' },
  { id: 'partnership', labelKey: 'notifications.filters.partnership' },
];

const ADMIN_INSIGHTS = [
  {
    id: 'queue',
    title: 'Verification queue aging',
    value: '18 pending',
    trend: '+4 vs yesterday',
    icon: 'TimerReset',
    tone: 'text-amber-500',
  },
  {
    id: 'payouts',
    title: 'Payout issues',
    value: '3 batches',
    trend: 'Rp 47.5M at risk',
    icon: 'Banknote',
    tone: 'text-rose-500',
  },
  {
    id: 'ai-usage',
    title: 'AI usage peaks',
    value: '+38%',
    trend: 'Segmentation model',
    icon: 'Activity',
    tone: 'text-purple-500',
  },
];

const ADMIN_ESCALATIONS = [
  {
    id: 'esc-1',
    title: 'Teleconsult routing outage',
    detail: '3 clinics affected · 142 sessions queued',
    owner: 'Support Squad A',
    impact: 'Customer Success',
  },
  {
    id: 'esc-2',
    title: 'Finance escalation: payout mismatch',
    detail: 'Multi-branch payout batch 15 Jan',
    owner: 'Finance Ops',
    impact: 'Revenue & Billing',
  },
];

const ADMIN_QUICK_ACTIONS = [
  {
    id: 'action-1',
    title: 'Trigger Compliance Playbook',
    description: 'Share DPA renewal checklist with all impacted clinics.',
    icon: 'ShieldAlert',
    href: '/admin/compliance-security/regulatory',
    actionLabel: 'Open Playbook',
  },
  {
    id: 'action-2',
    title: 'Reassign Support Queue',
    description: 'Balance SLA-heavy tickets among regional CS pods.',
    icon: 'ArrowLeftRight',
    href: '/admin/support-helpdesk',
    actionLabel: 'Rebalance',
  },
  {
    id: 'action-3',
    title: 'Inspect AI Model Usage',
    description: 'Validate segmentation runbooks & GPU autoscaling rules.',
    icon: 'Cpu',
    href: '/admin/ai-platform/models',
    actionLabel: 'Inspect',
  },
];

const NotificationScreenAdmin = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [filter, setFilter] = useState('all');

  const resolvedRoles = useMemo(() => {
    const roles = user?.roles && user.roles.length ? [...user.roles] : [];
    if (!roles.length && user?.role) roles.push(user.role);
    if (!roles.length) roles.push('admin');
    return roles;
  }, [user?.roles, user?.role]);

  const isSuperAdmin = useMemo(() => resolvedRoles.includes('super_admin'), [resolvedRoles]);
  const roleNotifications = useMemo(
    () => getAdminNotificationsForRoles(resolvedRoles, { includeAll: isSuperAdmin }),
    [resolvedRoles, isSuperAdmin]
  );
  const [items, setItems] = useState(roleNotifications);

  useEffect(() => {
    setItems(roleNotifications);
  }, [roleNotifications]);

  const filteredItems = useMemo(() => {
    if (filter === 'all') return items;
    return items.filter((item) => item.category === filter);
  }, [filter, items]);

  const grouped = useMemo(() => {
    return filteredItems.reduce((acc, item) => {
      if (!acc[item.timeframe]) acc[item.timeframe] = [];
      acc[item.timeframe].push(item);
      return acc;
    }, {});
  }, [filteredItems]);

  const unreadCount = useMemo(() => items.filter((item) => !item.read).length, [items]);
  const actionRequired = useMemo(
    () => items.filter((item) => item.severity === 'high' && !item.read).length,
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

  const handleMarkRead = (id) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, read: true } : item)));
  };

  const handleMarkAllRead = () => {
    setItems((prev) => prev.map((item) => ({ ...item, read: true })));
  };

  return (
    <div className="flex min-h-screen bg-background theme-transition">
      <div className="flex-shrink-0" style={{ width: 'var(--sidebar-width, 20rem)' }}>
        <AdminSideBar />
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
                  {t('notifications.admin.title')}
                </h1>
                <p className="text-sm text-secondary max-w-2xl">
                  {t('notifications.admin.subtitle')}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <button
                  onClick={handleMarkAllRead}
                  className="inline-flex items-center gap-2 rounded-xl border border-border/40 px-4 py-2 text-sm font-medium text-primary hover:border-accent hover:text-accent transition"
                >
                  <AppIcon name="CheckCheck" size={16} />
                  {t('notifications.common.markAllRead')}
                </button>
                <button className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-hover">
                  <AppIcon name="Settings2" size={16} />
                  {t('notifications.common.settings')}
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
            <p className="text-xs text-secondary/70">{t('notifications.admin.stats.totalLabel')}</p>
            <div className="flex items-end justify-between mt-2">
              <span className="text-3xl font-semibold text-primary">{items.length}</span>
              <span className="text-xs text-secondary">
                {t('notifications.common.updatedAt', { time: new Date().toDateString() })}
              </span>
            </div>
            <p className="mt-2 text-sm text-secondary">
              {t('notifications.admin.stats.totalDescription')}
            </p>
          </div>
          <div className="rounded-2xl border border-border/40 bg-surface p-5 shadow-sm">
            <p className="text-xs text-secondary/70">{t('notifications.admin.stats.unreadLabel')}</p>
            <div className="flex items-end justify-between mt-2">
              <span className="text-3xl font-semibold text-rose-500">{unreadCount}</span>
              <span className="text-xs text-secondary">{t('notifications.admin.stats.unreadMeta')}</span>
            </div>
            <p className="mt-2 text-sm text-secondary">
              {t('notifications.admin.stats.unreadDescription', { count: actionRequired })}
            </p>
          </div>
          <div className="rounded-2xl border border-border/40 bg-surface p-5 shadow-sm">
            <p className="text-xs text-secondary/70">{t('notifications.admin.stats.criticalLabel')}</p>
            <div className="flex items-end justify-between mt-2">
              <span className="text-3xl font-semibold text-amber-500">{actionRequired}</span>
              <span className="text-xs text-secondary">{t('notifications.admin.stats.criticalMeta')}</span>
            </div>
            <p className="mt-2 text-sm text-secondary">
              {t('notifications.admin.stats.criticalDescription')}
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
                  <span className="text-xs text-secondary">
                    {t('notifications.common.updatedAt', {
                      time: entries[0]?.timestamp?.split('·')?.[0]?.trim() || '',
                    })}
                  </span>
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
                            <AppIcon name={meta.icon} size={22} className={meta.accent} />
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
                                <AppIcon name="Clock8" size={14} />
                                <span>{item.timestamp}</span>
                              </div>
                              {item.meta && (
                                <div className="flex items-center gap-1.5">
                                  <AppIcon name="Info" size={14} />
                                  <span>{item.meta}</span>
                                </div>
                              )}
                              {item.severity === 'high' && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-rose-500">
                                  <AppIcon name="AlertTriangle" size={14} />
                                  {t('notifications.admin.labels.escalated')}
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
                                  <AppIcon name="ArrowUpRight" size={14} />
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
            {!filteredItems.length && (
              <div className="rounded-3xl border border-dashed border-border/40 bg-surface p-10 text-center">
                <AppIcon name="Inbox" size={32} className="mx-auto text-secondary/60" />
                <p className="mt-3 text-lg font-semibold text-primary">
                  {t('notifications.common.emptyTitle')}
                </p>
                <p className="text-secondary">{t('notifications.common.emptyDescription')}</p>
              </div>
            )}
          </div>

          <aside className="space-y-5">
            <section className="rounded-3xl border border-border/30 bg-surface p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold tracking-[0.3em] text-secondary">
                  {t('notifications.admin.sections.insights')}
                </h3>
                <AppIcon name="LineChart" size={16} className="text-secondary" />
              </div>
              <div className="mt-4 space-y-4">
                {ADMIN_INSIGHTS.map((insight) => (
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
                        <AppIcon name={insight.icon} size={18} className={insight.tone} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-rose-200/40 bg-surface p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-rose-500">
                  {t('notifications.admin.sections.escalations')}
                </h3>
                <AppIcon name="AlarmClock" size={16} className="text-rose-500" />
              </div>
              <div className="mt-4 space-y-4">
                {ADMIN_ESCALATIONS.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-rose-200/40 bg-background/50 p-4 dark:bg-surface/60">
                    <p className="text-sm font-semibold text-primary">{item.title}</p>
                    <p className="text-xs text-secondary mt-1">{item.detail}</p>
                    <div className="mt-2 flex items-center justify-between text-xs text-secondary">
                      <span className="inline-flex items-center gap-1">
                        <AppIcon name="Users" size={12} />
                        {item.owner}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <AppIcon name="ArrowRight" size={12} />
                        {item.impact}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-border/30 bg-surface p-5 shadow-sm">
              <h3 className="text-sm font-semibold tracking-[0.3em] text-secondary">
                {t('notifications.admin.sections.playbooks')}
              </h3>
              <div className="mt-4 space-y-4">
                {ADMIN_QUICK_ACTIONS.map((action) => (
                  <div key={action.id} className="rounded-2xl border border-primary/10 p-4">
                    <div className="flex items-start gap-3">
                      <div className="rounded-2xl bg-primary/5 p-3">
                        <AppIcon name={action.icon} size={18} className="text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-primary">{action.title}</p>
                        <p className="text-sm text-secondary mt-1">{action.description}</p>
                        <button
                          onClick={() => handleAction({ href: action.href })}
                          className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-accent"
                        >
                          {action.actionLabel}
                          <AppIcon name="ArrowUpRight" size={14} />
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

export default NotificationScreenAdmin;
