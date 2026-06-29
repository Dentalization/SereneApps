import AppIcon from '../../../../components/AppIcon';

export const InventoryStatCard = ({ icon, iconClass, label, value }) => (
  <div className="rounded-xl border border-primary/15 bg-surface-elevated p-4">
    <div className="flex items-center gap-3">
      <div className="rounded-lg bg-primary/5 p-2">
        <AppIcon name={icon} size={18} className={iconClass} />
      </div>
      <div>
        <p className="text-xs text-secondary">{label}</p>
        <p className="text-xl font-bold text-primary">{value}</p>
      </div>
    </div>
  </div>
);

export const DisabledPrimaryAction = ({ icon = 'Plus', children }) => (
  <button
    type="button"
    disabled
    title="Fitur ini segera hadir"
    className="inline-flex min-h-10 cursor-not-allowed items-center gap-2 rounded-xl bg-accent/50 px-4 py-2 text-sm font-medium text-white opacity-60"
  >
    <AppIcon name={icon} size={16} />
    {children}
  </button>
);

export const InventoryEmptyRow = ({ colSpan, message = 'Belum ada data.' }) => (
  <tr>
    <td colSpan={colSpan} className="px-6 py-12 text-center">
      <AppIcon name="Inbox" size={32} className="mx-auto mb-2 text-secondary/30" />
      <p className="text-sm text-secondary">{message}</p>
    </td>
  </tr>
);

export const RefreshButton = ({ onRefresh }) => (
  <button
    type="button"
    onClick={onRefresh}
    className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-primary/20 bg-surface px-3 py-2 text-sm font-medium text-secondary transition hover:border-accent/40 hover:text-accent"
  >
    <AppIcon name="RefreshCw" size={15} />
    Segarkan
  </button>
);

