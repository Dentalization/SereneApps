import { useMemo, useState } from 'react';
import { useLanguage } from '../../../../contexts/LanguageContext';
import AppIcon from '../../../../components/AppIcon';
import {
  DisabledPrimaryAction,
  InventoryEmptyRow,
  InventoryStatCard,
  RefreshButton
} from './InventoryUi';
import {
  getRecordDate,
  getStatusBadgeClass,
  isWithinCurrentMonth
} from '../inventoryUtils.mjs';

const ReceiptsView = ({ data = [], onRefresh }) => {
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const receipts = Array.isArray(data) ? data : [];

  const stats = useMemo(() => receipts.reduce((result, receipt) => {
    if (receipt.status === 'pending') result.pending += 1;
    if (receipt.status === 'verified' || receipt.status === 'completed') result.verified += 1;
    if (receipt.status === 'partial') result.partial += 1;
    if (isWithinCurrentMonth(getRecordDate(receipt))) result.thisMonth += 1;
    return result;
  }, { pending: 0, verified: 0, partial: 0, thisMonth: 0 }), [receipts]);

  const filteredReceipts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return receipts.filter((receipt) => {
      const matchesSearch = !query || [
        receipt.receiptNumber,
        receipt.receipt_number,
        receipt.purchaseOrderNumber,
        receipt.purchase_order_number,
        receipt.supplier,
        receipt.receivedBy,
        receipt.received_by
      ].some((value) => String(value || '').toLowerCase().includes(query));
      return matchesSearch && (!statusFilter || receipt.status === statusFilter);
    });
  }, [receipts, search, statusFilter]);

  const getStatusText = (status) => ({
    pending: t('clinic.inventory.receipts.status.pending') || 'Menunggu Verifikasi',
    verified: t('clinic.inventory.receipts.status.verified') || 'Terverifikasi',
    completed: t('clinic.inventory.receipts.status.verified') || 'Terverifikasi',
    partial: t('clinic.inventory.receipts.status.partial') || 'Sebagian',
    rejected: t('clinic.inventory.receipts.status.rejected') || 'Ditolak'
  }[status] || status || '—');

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <InventoryStatCard icon="Clock3" iconClass="text-amber-500" label={t('clinic.inventory.receipts.stats.pending') || 'Menunggu Verifikasi'} value={stats.pending} />
        <InventoryStatCard icon="CircleCheckBig" iconClass="text-emerald-500" label={t('clinic.inventory.receipts.stats.verified') || 'Terverifikasi'} value={stats.verified} />
        <InventoryStatCard icon="PackageCheck" iconClass="text-orange-500" label={t('clinic.inventory.receipts.stats.partial') || 'Penerimaan Sebagian'} value={stats.partial} />
        <InventoryStatCard icon="CalendarDays" iconClass="text-blue-500" label={t('clinic.inventory.receipts.stats.thisMonth') || 'Bulan Ini'} value={stats.thisMonth} />
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-primary/15 bg-surface-elevated p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <label className="relative block w-full sm:max-w-sm">
            <AppIcon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('clinic.inventory.receipts.searchPlaceholder') || 'Cari penerimaan...'}
              className="min-h-10 w-full rounded-xl border border-primary/20 bg-surface py-2 pl-10 pr-4 text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </label>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="min-h-10 rounded-xl border border-primary/20 bg-surface px-3 py-2 text-primary"
          >
            <option value="">{t('clinic.inventory.receipts.allStatus') || 'Semua Status'}</option>
            <option value="pending">{getStatusText('pending')}</option>
            <option value="verified">{getStatusText('verified')}</option>
            <option value="partial">{getStatusText('partial')}</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          <RefreshButton onRefresh={onRefresh} />
          <DisabledPrimaryAction>{t('clinic.inventory.receipts.newReceipt') || 'Terima Barang'} · Segera hadir</DisabledPrimaryAction>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-primary/20 bg-surface-elevated">
        <div className="border-b border-primary/20 px-6 py-4">
          <h3 className="text-lg font-semibold text-primary">{t('clinic.inventory.receipts.title') || 'Daftar Penerimaan Barang'}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface">
              <tr>
                {['No. Penerimaan', 'No. PO', 'Supplier', 'Diterima Oleh', 'Item', 'Status', 'Aksi'].map((heading) => (
                  <th key={heading} className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-secondary">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/10">
              {filteredReceipts.map((receipt) => {
                const receivedValue = getRecordDate(receipt);
                const receivedDate = receivedValue ? new Date(receivedValue) : null;
                const totalItems = receipt.totalItems ?? receipt.total_items ?? receipt.items?.length ?? 0;
                return (
                  <tr key={receipt.id} className="transition-colors hover:bg-surface">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-primary">{receipt.receiptNumber ?? receipt.receipt_number ?? receipt.id}</p>
                      <p className="text-xs text-secondary">{!receivedDate || Number.isNaN(receivedDate.getTime()) ? '—' : receivedDate.toLocaleDateString('id-ID')}</p>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-primary">{receipt.purchaseOrderNumber ?? receipt.purchase_order_number ?? '—'}</td>
                    <td className="px-6 py-4 text-sm text-primary">{receipt.supplier || '—'}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-primary">{receipt.receivedBy ?? receipt.received_by ?? '—'}</td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-primary">{totalItems} item</p>
                      {receipt.notes && <p className="mt-1 max-w-xs text-xs text-secondary">{receipt.notes}</p>}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusBadgeClass(receipt.status)}`}>{getStatusText(receipt.status)}</span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <button type="button" disabled title="Fitur ini segera hadir" className="cursor-not-allowed rounded-lg p-2 text-secondary/40">
                        <AppIcon name="MoreHorizontal" size={17} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredReceipts.length === 0 && <InventoryEmptyRow colSpan={7} message="Belum ada penerimaan barang dari layanan inventory." />}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReceiptsView;
