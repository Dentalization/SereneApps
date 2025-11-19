import React, { useMemo } from 'react';
import AppIcon from '../../../../components/AppIcon';
import ModalPortal from '../../../../components/ui/ModalPortal';

const StaffProfileDrawer = ({
  open,
  staff,
  onClose,
  labels,
  roleLabels = {},
  statusLabels = {}
}) => {
  if (!open || !staff) {
    return null;
  }

  const locale = labels?.locale || 'en-US';
  const fallbackMissing = labels?.defaults?.missing || '—';
  const fallbackUnknown = labels?.defaults?.unknown || 'Unknown';
  const fallbackNever = labels?.defaults?.never || 'Never';

  const normalizedRole = roleLabels[staff.role] || roleLabels.staff || staff.role || fallbackUnknown;
  const normalizedStatus = statusLabels[staff.status] || statusLabels.default || staff.status || fallbackUnknown;

  const permissions = useMemo(() => normalizePermissions(staff.permissions), [staff.permissions]);

  const infoRows = [
    {
      icon: 'Mail',
      label: labels?.fields?.email || 'Email',
      value: staff.email || fallbackMissing
    },
    {
      icon: 'Phone',
      label: labels?.fields?.phone || 'Phone',
      value: staff.phone || fallbackMissing
    },
    {
      icon: 'IdCard',
      label: labels?.fields?.role || 'Role',
      value: normalizedRole
    },
    {
      icon: 'CheckCircle',
      label: labels?.fields?.status || 'Status',
      value: normalizedStatus
    },
    {
      icon: 'Briefcase',
      label: labels?.fields?.position || 'Position',
      value: staff.position || fallbackMissing
    },
    {
      icon: 'Layers',
      label: labels?.fields?.department || 'Department',
      value: staff.department || fallbackMissing
    },
    {
      icon: 'CalendarDays',
      label: labels?.fields?.joinDate || 'Join Date',
      value: formatDate(staff.joinDate, locale, { dateStyle: 'medium' }, fallbackMissing)
    },
    {
      icon: 'Clock',
      label: labels?.fields?.lastLogin || 'Last Login',
      value: staff.lastLogin
        ? formatDate(staff.lastLogin, locale, { dateStyle: 'medium', timeStyle: 'short' }, fallbackNever)
        : fallbackNever
    }
  ];

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end"
        onClick={onClose}
      >
        <aside
          className="h-full w-full max-w-md overflow-y-auto border-l border-border/40 bg-surface-elevated shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
        <div className="flex items-center justify-between border-b border-border/40 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
              {labels?.badge}
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-primary">{staff.name || fallbackUnknown}</h2>
            {staff.position && (
              <p className="text-sm text-secondary">{staff.position}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-secondary transition hover:bg-surface hover:text-primary"
            aria-label={labels?.actions?.close || 'Close'}
          >
            <AppIcon name="X" size={18} />
          </button>
        </div>

        <section className="space-y-6 px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 text-2xl font-semibold text-accent">
              {staff.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div className="space-y-1">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary">
                <AppIcon name="Shield" size={14} />
                {normalizedRole}
              </span>
              <span className="inline-flex items-center gap-2 text-xs text-secondary">
                <AppIcon name="Activity" size={14} />
                {normalizedStatus}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            {infoRows.map((row) => (
              <div key={row.label} className="flex items-start gap-3 rounded-xl border border-border/30 bg-surface px-4 py-3">
                <div className="mt-1 text-secondary">
                  <AppIcon name={row.icon} size={16} />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-secondary/70">{row.label}</p>
                  <p className="mt-1 text-sm font-medium text-primary">{row.value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-secondary/70">
              {labels?.permissions || 'Permissions'}
            </p>
            {permissions.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {permissions.map((permission) => (
                  <span
                    key={permission}
                    className="inline-flex items-center gap-2 rounded-full border border-border/30 bg-surface px-3 py-1 text-xs text-secondary"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                    {permission === 'all' ? 'All Access' : permission}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-secondary">{fallbackMissing}</p>
            )}
          </div>
        </section>
        </aside>
      </div>
    </ModalPortal>
  );
};

const normalizePermissions = (permissions) => {
  if (!permissions) {
    return [];
  }
  // Accept arrays, keyed objects, or API responses that expose a modules array.
  if (Array.isArray(permissions)) {
    return permissions;
  }
  if (Array.isArray(permissions.modules)) {
    return permissions.modules;
  }
  if (typeof permissions === 'object') {
    return Object.keys(permissions);
  }
  return [];
};

const formatDate = (value, locale, options, fallback) => {
  if (!value) {
    return fallback;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return fallback;
  }
  try {
    return new Intl.DateTimeFormat(locale, options).format(date);
  } catch (error) {
    return fallback;
  }
};

export default StaffProfileDrawer;
