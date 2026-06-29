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
  isSameLocalDay
} from '../inventoryUtils.mjs';

const CONDITION_CLASSES = {
  excellent: 'text-emerald-600 dark:text-emerald-400',
  good: 'text-blue-600 dark:text-blue-400',
  fair: 'text-amber-600 dark:text-amber-400',
  poor: 'text-red-600 dark:text-red-400'
};

function isWithinPastDays(value, days, now = new Date()) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const difference = now.getTime() - date.getTime();
  return difference >= 0 && difference <= days * 24 * 60 * 60 * 1000;
}

const EquipmentView = ({ data = [], onRefresh }) => {
  const { t } = useLanguage();
  const [activeSubTab, setActiveSubTab] = useState('sterilization');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const source = Array.isArray(data) ? data : [];
  const sterilizationRecords = useMemo(() => source.filter((item) => (
    item.recordType === 'sterilization'
    || item.record_type === 'sterilization'
    || item.batchNumber
    || item.batch_number
  )), [source]);
  const equipmentList = useMemo(() => source.filter((item) => (
    !sterilizationRecords.includes(item)
  )), [source, sterilizationRecords]);

  const sterilizationStats = useMemo(() => sterilizationRecords.reduce((result, record) => {
    const date = getRecordDate(record);
    if (record.status === 'completed' && isSameLocalDay(date)) result.completedToday += 1;
    if (record.status === 'in-progress') result.inProgress += 1;
    if (record.status === 'failed') result.failed += 1;
    if (isWithinPastDays(date, 7)) result.thisWeek += 1;
    return result;
  }, { completedToday: 0, inProgress: 0, failed: 0, thisWeek: 0 }), [sterilizationRecords]);

  const equipmentStats = useMemo(() => equipmentList.reduce((result, equipment) => {
    result.total += 1;
    if (equipment.status === 'operational') result.operational += 1;
    if (equipment.status === 'in-use') result.inUse += 1;
    if (['maintenance', 'due_maintenance'].includes(equipment.status)) result.maintenance += 1;
    return result;
  }, { operational: 0, inUse: 0, maintenance: 0, total: 0 }), [equipmentList]);

  const filteredSterilization = useMemo(() => {
    const query = search.trim().toLowerCase();
    return sterilizationRecords.filter((record) => {
      const matchesSearch = !query || [
        record.batchNumber,
        record.batch_number,
        record.equipment,
        record.operator,
        record.cycle
      ].some((value) => String(value || '').toLowerCase().includes(query));
      return matchesSearch && (!statusFilter || record.status === statusFilter);
    });
  }, [search, statusFilter, sterilizationRecords]);

  const filteredEquipment = useMemo(() => {
    const query = search.trim().toLowerCase();
    return equipmentList.filter((equipment) => {
      const matchesSearch = !query || [
        equipment.name,
        equipment.type,
        equipment.brand,
        equipment.model,
        equipment.location,
        equipment.serialNumber,
        equipment.serial_number
      ].some((value) => String(value || '').toLowerCase().includes(query));
      return matchesSearch && (!statusFilter || equipment.status === statusFilter);
    });
  }, [equipmentList, search, statusFilter]);

  const statusText = (status) => ({
    completed: 'Selesai',
    'in-progress': 'Sedang Proses',
    failed: 'Gagal',
    operational: 'Operasional',
    'in-use': 'Digunakan',
    maintenance: 'Maintenance',
    due_maintenance: 'Jadwal Maintenance',
    broken: 'Rusak'
  }[status] || status || '—');

  const renderSterilizationView = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <InventoryStatCard icon="CircleCheckBig" iconClass="text-emerald-500" label={t('clinic.inventory.equipment.sterilization.stats.completed') || 'Selesai Hari Ini'} value={sterilizationStats.completedToday} />
        <InventoryStatCard icon="Activity" iconClass="text-blue-500" label={t('clinic.inventory.equipment.sterilization.stats.inProgress') || 'Sedang Proses'} value={sterilizationStats.inProgress} />
        <InventoryStatCard icon="TriangleAlert" iconClass="text-red-500" label={t('clinic.inventory.equipment.sterilization.stats.failed') || 'Gagal'} value={sterilizationStats.failed} />
        <InventoryStatCard icon="CalendarRange" iconClass="text-violet-500" label={t('clinic.inventory.equipment.sterilization.stats.thisWeek') || '7 Hari Terakhir'} value={sterilizationStats.thisWeek} />
      </div>

      <ActionBar
        search={search}
        setSearch={setSearch}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        placeholder={t('clinic.inventory.equipment.sterilization.searchPlaceholder') || 'Cari batch...'}
        statuses={['completed', 'in-progress', 'failed']}
        statusText={statusText}
        onRefresh={onRefresh}
        actionLabel={`${t('clinic.inventory.equipment.sterilization.newCycle') || 'Mulai Sterilisasi'} · Segera hadir`}
      />

      <div className="overflow-hidden rounded-xl border border-primary/20 bg-surface-elevated">
        <div className="border-b border-primary/20 px-6 py-4">
          <h3 className="text-lg font-semibold text-primary">{t('clinic.inventory.equipment.sterilization.title') || 'Riwayat Sterilisasi'}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface">
              <tr>
                {['Batch', 'Alat', 'Siklus', 'Operator', 'Item', 'Status', 'Aksi'].map((heading) => (
                  <th key={heading} className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-secondary">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/10">
              {filteredSterilization.map((record) => {
                const dateValue = getRecordDate(record);
                const date = dateValue ? new Date(dateValue) : null;
                const progress = Math.max(0, Math.min(100, Number(record.progress) || 0));
                return (
                  <tr key={record.id} className="transition-colors hover:bg-surface">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-primary">{record.batchNumber ?? record.batch_number ?? record.id}</p>
                      <p className="text-xs text-secondary">{!date || Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('id-ID')} {record.time || ''}</p>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-primary">{record.equipment || '—'}</td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-primary">{record.cycle || '—'}</p>
                      <p className="text-xs text-secondary">{record.duration || ''}</p>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-primary">{record.operator || '—'}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-primary">{record.totalItems ?? record.total_items ?? record.items?.length ?? 0} tipe</td>
                    <td className="min-w-[150px] px-6 py-4">
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusBadgeClass(record.status)}`}>{statusText(record.status)}</span>
                      {record.status === 'in-progress' && record.progress != null && (
                        <div className="mt-2 space-y-1">
                          <div className="flex justify-between text-[10px] text-secondary">
                            <span>Progress</span>
                            <span>{progress}%</span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-primary/10">
                            <div className="h-full animate-pulse rounded-full bg-blue-500 transition-all" style={{ width: `${progress}%` }} />
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <button type="button" disabled title="Fitur ini segera hadir" className="cursor-not-allowed rounded-lg p-2 text-secondary/40">
                        <AppIcon name="MoreHorizontal" size={17} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredSterilization.length === 0 && <InventoryEmptyRow colSpan={7} message="Belum ada batch sterilisasi dari layanan inventory." />}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderEquipmentListView = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <InventoryStatCard icon="CircleCheckBig" iconClass="text-emerald-500" label={t('clinic.inventory.equipment.list.stats.operational') || 'Operasional'} value={equipmentStats.operational} />
        <InventoryStatCard icon="Activity" iconClass="text-blue-500" label={t('clinic.inventory.equipment.list.stats.inUse') || 'Sedang Digunakan'} value={equipmentStats.inUse} />
        <InventoryStatCard icon="Wrench" iconClass="text-amber-500" label={t('clinic.inventory.equipment.list.stats.maintenance') || 'Maintenance'} value={equipmentStats.maintenance} />
        <InventoryStatCard icon="Package" iconClass="text-violet-500" label={t('clinic.inventory.equipment.list.stats.total') || 'Total Alat'} value={equipmentStats.total} />
      </div>

      <ActionBar
        search={search}
        setSearch={setSearch}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        placeholder={t('clinic.inventory.equipment.list.searchPlaceholder') || 'Cari peralatan...'}
        statuses={['operational', 'in-use', 'maintenance', 'due_maintenance', 'broken']}
        statusText={statusText}
        onRefresh={onRefresh}
        actionLabel={`${t('clinic.inventory.equipment.list.addEquipment') || 'Tambah Alat'} · Segera hadir`}
      />

      <div className="overflow-hidden rounded-xl border border-primary/20 bg-surface-elevated">
        <div className="border-b border-primary/20 px-6 py-4">
          <h3 className="text-lg font-semibold text-primary">{t('clinic.inventory.equipment.list.title') || 'Daftar Peralatan'}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface">
              <tr>
                {['Peralatan', 'Tipe', 'Lokasi', 'Kondisi', 'Maintenance', 'Status', 'Aksi'].map((heading) => (
                  <th key={heading} className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-secondary">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/10">
              {filteredEquipment.map((equipment) => {
                const nextMaintenance = new Date(equipment.nextMaintenance ?? equipment.next_maintenance);
                return (
                  <tr key={equipment.id} className="transition-colors hover:bg-surface">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-primary">{equipment.name || 'Alat tanpa nama'}</p>
                      <p className="text-xs text-secondary">{[equipment.brand, equipment.model].filter(Boolean).join(' · ') || equipment.serialNumber || '—'}</p>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-primary">{equipment.type || '—'}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-primary">{equipment.location || '—'}</td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className={`text-sm font-semibold ${CONDITION_CLASSES[equipment.condition] || 'text-secondary'}`}>{equipment.condition || '—'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs text-secondary">Berikutnya</p>
                      <p className="text-sm text-primary">{Number.isNaN(nextMaintenance.getTime()) ? 'Belum dijadwalkan' : nextMaintenance.toLocaleDateString('id-ID')}</p>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusBadgeClass(equipment.status)}`}>{statusText(equipment.status)}</span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <button type="button" disabled title="Fitur ini segera hadir" className="cursor-not-allowed rounded-lg p-2 text-secondary/40">
                        <AppIcon name="MoreHorizontal" size={17} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredEquipment.length === 0 && <InventoryEmptyRow colSpan={7} message="Belum ada peralatan dari layanan inventory." />}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-primary/20">
        {[
          { id: 'sterilization', icon: 'ShieldCheck', label: t('clinic.inventory.equipment.tabs.sterilization') || 'Sterilisasi' },
          { id: 'equipment', icon: 'Wrench', label: t('clinic.inventory.equipment.tabs.equipment') || 'Peralatan' }
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setActiveSubTab(tab.id);
              setSearch('');
              setStatusFilter('');
            }}
            className={`inline-flex min-h-11 items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              activeSubTab === tab.id ? 'border-accent text-accent' : 'border-transparent text-secondary hover:text-primary'
            }`}
          >
            <AppIcon name={tab.icon} size={16} />
            {tab.label}
          </button>
        ))}
      </div>
      {activeSubTab === 'sterilization' ? renderSterilizationView() : renderEquipmentListView()}
    </div>
  );
};

const ActionBar = ({
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  placeholder,
  statuses,
  statusText,
  onRefresh,
  actionLabel
}) => (
  <div className="flex flex-col gap-4 rounded-2xl border border-primary/15 bg-surface-elevated p-4 lg:flex-row lg:items-center lg:justify-between">
    <div className="flex flex-1 flex-col gap-3 sm:flex-row">
      <label className="relative block w-full sm:max-w-sm flex-shrink-0">
        <AppIcon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={placeholder}
          className="min-h-10 w-full rounded-xl border border-primary/20 bg-surface py-2 pl-10 pr-4 text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
        />
      </label>
      <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="min-h-10 rounded-xl border border-primary/20 bg-surface pl-3 pr-10 py-2 text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20">
        <option value="">Semua Status</option>
        {statuses.map((status) => <option key={status} value={status}>{statusText(status)}</option>)}
      </select>
    </div>
    <div className="flex flex-wrap gap-2">
      <RefreshButton onRefresh={onRefresh} />
      <DisabledPrimaryAction>{actionLabel}</DisabledPrimaryAction>
    </div>
  </div>
);

export default EquipmentView;
