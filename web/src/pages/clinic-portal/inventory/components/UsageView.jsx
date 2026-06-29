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
  getRecordDate,
  isSameLocalDay,
  isWithinCurrentMonth
} from '../inventoryUtils.mjs';

function recordQuantity(record) {
  if (Array.isArray(record.items)) {
    return record.items.reduce((total, item) => total + (Number(item.qty ?? item.quantity ?? 0) || 0), 0);
  }
  return Number(record.quantity ?? record.totalQuantity ?? record.total_quantity ?? record.totalItems ?? 0) || 0;
}

function isWithinPastDays(value, days, now = new Date()) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const difference = now.getTime() - date.getTime();
  return difference >= 0 && difference <= days * 24 * 60 * 60 * 1000;
}

const UsageView = ({ data = [], onRefresh }) => {
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [treatmentFilter, setTreatmentFilter] = useState('');
  const usageRecords = Array.isArray(data) ? data : [];

  const stats = useMemo(() => usageRecords.reduce((result, record) => {
    const quantity = recordQuantity(record);
    const date = getRecordDate(record);
    if (isSameLocalDay(date)) result.today += quantity;
    if (isWithinPastDays(date, 7)) result.thisWeek += quantity;
    if (isWithinCurrentMonth(date)) {
      result.thisMonth += quantity;
      result.totalCost += Number(record.totalCost ?? record.total_cost ?? 0) || 0;
    }
    return result;
  }, { today: 0, thisWeek: 0, thisMonth: 0, totalCost: 0 }), [usageRecords]);

  const topUsedItems = useMemo(() => {
    const totals = new Map();
    usageRecords.forEach((record) => {
      (Array.isArray(record.items) ? record.items : []).forEach((item) => {
        const name = item.name || item.itemName || item.item_name;
        if (!name) return;
        const current = totals.get(name) || { name, usage: 0, unit: item.unit || '' };
        current.usage += Number(item.qty ?? item.quantity ?? 0) || 0;
        totals.set(name, current);
      });
    });
    return [...totals.values()].sort((left, right) => right.usage - left.usage).slice(0, 6);
  }, [usageRecords]);

  const treatments = useMemo(() => (
    [...new Set(usageRecords.map((record) => record.treatmentType ?? record.treatment_type).filter(Boolean))].sort()
  ), [usageRecords]);

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    return usageRecords.filter((record) => {
      const treatment = record.treatmentType ?? record.treatment_type ?? '';
      const matchesSearch = !query || [
        record.recordNumber,
        record.record_number,
        treatment,
        record.patient,
        record.patientName,
        record.dentist,
        record.dentistName
      ].some((value) => String(value || '').toLowerCase().includes(query));
      return matchesSearch && (!treatmentFilter || treatment === treatmentFilter);
    });
  }, [search, treatmentFilter, usageRecords]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <InventoryStatCard icon="Activity" iconClass="text-blue-500" label={t('clinic.inventory.usage.stats.today') || 'Pemakaian Hari Ini'} value={`${stats.today} item`} />
        <InventoryStatCard icon="CalendarRange" iconClass="text-emerald-500" label={t('clinic.inventory.usage.stats.thisWeek') || '7 Hari Terakhir'} value={`${stats.thisWeek} item`} />
        <InventoryStatCard icon="Package" iconClass="text-violet-500" label={t('clinic.inventory.usage.stats.thisMonth') || 'Bulan Ini'} value={`${stats.thisMonth} item`} />
        <InventoryStatCard icon="WalletCards" iconClass="text-orange-500" label={t('clinic.inventory.usage.stats.totalCost') || 'Biaya Bulan Ini'} value={formatRupiah(stats.totalCost)} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="flex flex-col gap-4 rounded-2xl border border-primary/15 bg-surface-elevated p-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-1 flex-col gap-3 sm:flex-row">
              <label className="relative block w-full sm:max-w-sm flex-shrink-0">
                <AppIcon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t('clinic.inventory.usage.searchPlaceholder') || 'Cari pemakaian...'}
                  className="min-h-10 w-full rounded-xl border border-primary/20 bg-surface py-2 pl-10 pr-4 text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
              </label>
              <select
                value={treatmentFilter}
                onChange={(event) => setTreatmentFilter(event.target.value)}
                className="min-h-10 rounded-xl border border-primary/20 bg-surface pl-3 pr-10 py-2 text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              >
                <option value="">{t('clinic.inventory.usage.allTreatments') || 'Semua Tindakan'}</option>
                {treatments.map((treatment) => <option key={treatment} value={treatment}>{treatment}</option>)}
              </select>
            </div>
            <div className="flex flex-wrap gap-2">
              <RefreshButton onRefresh={onRefresh} />
              <DisabledPrimaryAction>{t('clinic.inventory.usage.recordUsage') || 'Catat Pemakaian'} · Segera hadir</DisabledPrimaryAction>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-primary/20 bg-surface-elevated">
            <div className="border-b border-primary/20 px-6 py-4">
              <h3 className="text-lg font-semibold text-primary">{t('clinic.inventory.usage.title') || 'Riwayat Pemakaian'}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface">
                  <tr>
                    {['Tanggal', 'Tindakan', 'Pasien', 'Item', 'Biaya', 'Aksi'].map((heading) => (
                      <th key={heading} className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-secondary">{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary/10">
                  {filteredRecords.map((record) => {
                    const dateValue = getRecordDate(record);
                    const date = dateValue ? new Date(dateValue) : null;
                    return (
                      <tr key={record.id} className="transition-colors hover:bg-surface">
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-primary">{!date || Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('id-ID')}</td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-medium text-primary">{record.treatmentType ?? record.treatment_type ?? '—'}</p>
                          <p className="text-xs text-secondary">{record.dentist ?? record.dentistName ?? '—'}</p>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-primary">{record.patient ?? record.patientName ?? '—'}</td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-primary">{recordQuantity(record)} item</td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-primary">{formatRupiah(record.totalCost ?? record.total_cost ?? 0)}</td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <button type="button" disabled title="Fitur ini segera hadir" className="cursor-not-allowed rounded-lg p-2 text-secondary/40">
                            <AppIcon name="MoreHorizontal" size={17} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredRecords.length === 0 && <InventoryEmptyRow colSpan={6} message="Belum ada catatan pemakaian dari layanan inventory." />}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-primary/20 bg-surface-elevated lg:col-span-1">
          <div className="border-b border-primary/20 px-6 py-4">
            <h3 className="text-lg font-semibold text-primary">{t('clinic.inventory.usage.topUsed') || 'Item Paling Banyak Digunakan'}</h3>
            <p className="mt-0.5 text-xs text-secondary">Dihitung dari record yang tersedia</p>
          </div>
          <div className="space-y-3 p-6">
            {topUsedItems.map((item, index) => (
              <div key={item.name} className="flex items-center gap-3 rounded-xl bg-surface p-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-xs font-bold text-accent">{index + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-primary">{item.name}</p>
                  <p className="text-xs text-secondary">{item.usage} {item.unit}</p>
                </div>
              </div>
            ))}
            {topUsedItems.length === 0 && (
              <div className="py-8 text-center">
                <AppIcon name="PackageSearch" size={30} className="mx-auto mb-2 text-secondary/30" />
                <p className="text-sm text-secondary">Belum ada rincian item pemakaian.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UsageView;
