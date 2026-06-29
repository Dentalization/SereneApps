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
  formatRupiah,
  getPriorityBadgeClass,
  getStatusBadgeClass
} from '../inventoryUtils.mjs';

const PurchaseRequestsView = ({ data = [], onRefresh }) => {
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const purchaseRequests = Array.isArray(data) ? data : [];

  const stats = useMemo(() => purchaseRequests.reduce((result, request) => {
    result.totalValue += Number(request.estimatedCost ?? request.estimated_cost ?? request.totalAmount ?? 0) || 0;
    if (request.status === 'pending') result.pending += 1;
    if (request.status === 'approved') result.approved += 1;
    if (request.status === 'ordered') result.ordered += 1;
    return result;
  }, { pending: 0, approved: 0, ordered: 0, totalValue: 0 }), [purchaseRequests]);

  const filteredRequests = useMemo(() => {
    const query = search.trim().toLowerCase();
    return purchaseRequests.filter((request) => {
      const matchesSearch = !query || [
        request.requestNumber,
        request.request_number,
        request.requestedBy,
        request.requested_by,
        request.department,
        request.notes
      ].some((value) => String(value || '').toLowerCase().includes(query));
      return matchesSearch && (!statusFilter || request.status === statusFilter);
    });
  }, [purchaseRequests, search, statusFilter]);

  const getStatusText = (status) => ({
    pending: t('clinic.inventory.purchase.status.pending') || 'Menunggu Approval',
    approved: t('clinic.inventory.purchase.status.approved') || 'Disetujui',
    rejected: t('clinic.inventory.purchase.status.rejected') || 'Ditolak',
    ordered: t('clinic.inventory.purchase.status.ordered') || 'Sudah Dipesan'
  }[status] || status || '—');

  const getPriorityText = (priority) => ({
    high: t('clinic.inventory.purchase.priority.high') || 'Tinggi',
    medium: t('clinic.inventory.purchase.priority.medium') || 'Sedang',
    low: t('clinic.inventory.purchase.priority.low') || 'Rendah'
  }[priority] || priority || '—');

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <InventoryStatCard icon="Clock3" iconClass="text-amber-500" label={t('clinic.inventory.purchase.stats.pending') || 'Menunggu Approval'} value={stats.pending} />
        <InventoryStatCard icon="CircleCheckBig" iconClass="text-emerald-500" label={t('clinic.inventory.purchase.stats.approved') || 'Disetujui'} value={stats.approved} />
        <InventoryStatCard icon="ShoppingCart" iconClass="text-blue-500" label={t('clinic.inventory.purchase.stats.ordered') || 'Sudah Dipesan'} value={stats.ordered} />
        <InventoryStatCard icon="WalletCards" iconClass="text-violet-500" label={t('clinic.inventory.purchase.stats.totalValue') || 'Total Nilai'} value={formatRupiah(stats.totalValue)} />
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-primary/15 bg-surface-elevated p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <label className="relative block w-full sm:max-w-sm flex-shrink-0">
            <AppIcon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('clinic.inventory.purchase.searchPlaceholder') || 'Cari permintaan...'}
              className="min-h-10 w-full rounded-xl border border-primary/20 bg-surface py-2 pl-10 pr-4 text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </label>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="min-h-10 rounded-xl border border-primary/20 bg-surface pl-3 pr-10 py-2 text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          >
            <option value="">{t('clinic.inventory.purchase.allStatus') || 'Semua Status'}</option>
            <option value="pending">{getStatusText('pending')}</option>
            <option value="approved">{getStatusText('approved')}</option>
            <option value="ordered">{getStatusText('ordered')}</option>
            <option value="rejected">{getStatusText('rejected')}</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          <RefreshButton onRefresh={onRefresh} />
          <DisabledPrimaryAction>{t('clinic.inventory.purchase.newRequest') || 'Buat Permintaan'} · Segera hadir</DisabledPrimaryAction>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-primary/20 bg-surface-elevated">
        <div className="border-b border-primary/20 px-6 py-4">
          <h3 className="text-lg font-semibold text-primary">{t('clinic.inventory.purchase.title') || 'Daftar Permintaan Pembelian'}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface">
              <tr>
                {['No. Permintaan', 'Diminta Oleh', 'Item', 'Est. Biaya', 'Prioritas', 'Status', 'Aksi'].map((heading) => (
                  <th key={heading} className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-secondary">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/10">
              {filteredRequests.map((request) => {
                const requestDate = new Date(request.requestDate ?? request.request_date ?? request.createdAt);
                const totalItems = request.totalItems ?? request.total_items ?? request.items?.length ?? 0;
                const estimatedCost = request.estimatedCost ?? request.estimated_cost ?? request.totalAmount ?? 0;
                return (
                  <tr key={request.id} className="transition-colors hover:bg-surface">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-primary">{request.requestNumber ?? request.request_number ?? request.id}</p>
                      <p className="text-xs text-secondary">{Number.isNaN(requestDate.getTime()) ? '—' : requestDate.toLocaleDateString('id-ID')}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-primary">{request.requestedBy ?? request.requested_by ?? '—'}</p>
                      <p className="text-xs text-secondary">{request.department || '—'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-primary">{totalItems} item</p>
                      {request.notes && <p className="mt-1 max-w-xs text-xs text-secondary">{request.notes}</p>}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-primary">{formatRupiah(estimatedCost)}</td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${getPriorityBadgeClass(request.priority)}`}>{getPriorityText(request.priority)}</span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusBadgeClass(request.status)}`}>{getStatusText(request.status)}</span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <button type="button" disabled title="Fitur ini segera hadir" className="cursor-not-allowed rounded-lg p-2 text-secondary/40">
                        <AppIcon name="MoreHorizontal" size={17} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredRequests.length === 0 && <InventoryEmptyRow colSpan={7} message="Belum ada permintaan pembelian dari layanan inventory." />}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PurchaseRequestsView;
