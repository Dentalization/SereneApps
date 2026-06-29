import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Icon from '../../../components/AppIcon';
import ClinicSideBar from '../ui/SideBar-Clinic';
import { useLanguage } from '../../../contexts/LanguageContext';
import { authHttp } from '../../../utils/httpClient.js';
import PurchaseRequestsView from './components/PurchaseRequestsView';
import ReceiptsView from './components/ReceiptsView';
import UsageView from './components/UsageView';
import EquipmentView from './components/EquipmentView';
import {
  DisabledPrimaryAction,
  InventoryEmptyRow,
  InventoryStatCard,
  RefreshButton
} from './components/InventoryUi';
import {
  formatRupiah,
  getStatusBadgeClass,
  isWithinDays
} from './inventoryUtils.mjs';

const EMPTY_INVENTORY = {
  stock: [],
  purchaseRequests: [],
  receipts: [],
  usage: [],
  equipment: []
};

const INVENTORY_REQUESTS = [
  { key: 'stock', path: '/clinic/inventory/stock', responseKeys: ['items', 'stock'] },
  { key: 'purchaseRequests', path: '/clinic/inventory/purchase-requests', responseKeys: ['requests', 'purchaseRequests'] },
  { key: 'receipts', path: '/clinic/inventory/receipts', responseKeys: ['receipts', 'items'] },
  { key: 'usage', path: '/clinic/inventory/usage', responseKeys: ['records', 'usage'] },
  { key: 'equipment', path: '/clinic/inventory/equipment', responseKeys: ['equipment', 'items'] }
];

function extractCollection(result, responseKeys) {
  if (result.status !== 'fulfilled') return [];
  const payload = result.value?.data;
  if (Array.isArray(payload)) return payload;
  if (responseKeys.includes('equipment')) {
    const equipment = Array.isArray(payload?.equipment) ? payload.equipment : [];
    const sterilization = [
      ...(Array.isArray(payload?.sterilizationRecords) ? payload.sterilizationRecords : []),
      ...(Array.isArray(payload?.sterilization_records) ? payload.sterilization_records : []),
      ...(Array.isArray(payload?.sterilization) ? payload.sterilization : [])
    ].map((record) => ({ ...record, recordType: record.recordType || 'sterilization' }));
    if (equipment.length || sterilization.length) return [...equipment, ...sterilization];
  }
  for (const key of responseKeys) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return [];
}

function quantityOf(item) {
  return Number(item.currentStock ?? item.current_stock ?? item.quantity ?? 0) || 0;
}

function minimumOf(item) {
  return Number(item.minLevel ?? item.minimumLevel ?? item.minimum_stock ?? item.min_stock ?? 0) || 0;
}

function expiryOf(item) {
  return item.expiryDate ?? item.expiry_date ?? item.expiresAt ?? item.expires_at ?? null;
}

function stockStatus(item) {
  const expiry = expiryOf(item);
  const expiryDate = expiry ? new Date(expiry) : null;
  if (expiryDate && !Number.isNaN(expiryDate.getTime()) && expiryDate < new Date()) return 'expired';
  if (expiry && isWithinDays(expiry, 30)) return 'expiring';
  if (quantityOf(item) <= minimumOf(item)) return 'low';
  return item.status || 'normal';
}

function InventorySkeleton({ tabs }) {
  return (
    <div className="flex min-h-screen bg-background theme-transition clinic-skeleton">
      <div className="flex-shrink-0" style={{ width: 'var(--sidebar-width, 20rem)' }}>
        <ClinicSideBar />
      </div>
      <div className="min-w-0 flex-1">
        <div className="space-y-8 p-6 md:p-8">
          <section className="space-y-6 rounded-3xl border border-primary/15 bg-surface-elevated p-6 skeleton-surface">
            <div className="h-7 w-56 animate-pulse rounded bg-accent/10" />
            <div className="flex flex-wrap gap-2 border-t border-primary/15 pt-4">
              {tabs.map((tab) => (
                <div key={tab.id} className="h-9 w-32 animate-pulse rounded-lg bg-accent/10" />
              ))}
            </div>
          </section>
          <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="h-24 animate-pulse rounded-xl border border-primary/15 bg-surface-elevated" />
            ))}
          </section>
          <section className="h-80 animate-pulse rounded-2xl border border-primary/15 bg-surface-elevated" />
        </div>
      </div>
    </div>
  );
}

const InventoryPage = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('stock');
  const [inventoryData, setInventoryData] = useState(EMPTY_INVENTORY);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [failedSections, setFailedSections] = useState([]);
  const [stockSearch, setStockSearch] = useState('');
  const [stockCategory, setStockCategory] = useState('');

  const tabs = useMemo(() => [
    { id: 'stock', label: t('clinic.inventory.tabs.stock') || 'Stok Barang', icon: 'Package' },
    { id: 'purchase', label: t('clinic.inventory.tabs.purchase') || 'Permintaan Beli', icon: 'ShoppingCart' },
    { id: 'receipts', label: t('clinic.inventory.tabs.receipts') || 'Penerimaan', icon: 'Truck' },
    { id: 'usage', label: t('clinic.inventory.tabs.usage') || 'Pemakaian', icon: 'Activity' },
    { id: 'equipment', label: t('clinic.inventory.tabs.equipment') || 'Sterilisasi & Alat', icon: 'Wrench' }
  ], [t]);

  const fetchInventoryData = useCallback(async () => {
    setRefreshing(true);
    try {
      const results = await Promise.allSettled(
        INVENTORY_REQUESTS.map(({ path }) => authHttp.get(path))
      );
      const nextData = {};
      const failures = [];

      INVENTORY_REQUESTS.forEach((request, index) => {
        nextData[request.key] = extractCollection(results[index], request.responseKeys);
        if (results[index].status === 'rejected') failures.push(request.key);
      });

      setInventoryData(nextData);
      setFailedSections(failures);
    } catch (error) {
      console.error('Inventory fetch error:', error);
      setInventoryData(EMPTY_INVENTORY);
      setFailedSections(INVENTORY_REQUESTS.map(({ key }) => key));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchInventoryData();
  }, [fetchInventoryData]);

  const stockMetrics = useMemo(() => {
    const now = new Date();
    return inventoryData.stock.reduce((metrics, item) => {
      const quantity = quantityOf(item);
      const minimum = minimumOf(item);
      const expiry = expiryOf(item);
      const unitCost = Number(item.unitCost ?? item.unit_cost ?? item.cost ?? 0) || 0;
      const explicitValue = Number(item.totalValue ?? item.total_value);
      metrics.total += 1;
      if (quantity <= minimum) metrics.critical += 1;
      if (expiry && isWithinDays(expiry, 30, now)) metrics.expiring += 1;
      metrics.value += Number.isFinite(explicitValue) ? explicitValue : quantity * unitCost;
      return metrics;
    }, { total: 0, critical: 0, expiring: 0, value: 0 });
  }, [inventoryData.stock]);

  const categories = useMemo(() => (
    [...new Set(inventoryData.stock.map((item) => item.category).filter(Boolean))].sort()
  ), [inventoryData.stock]);

  const filteredStock = useMemo(() => {
    const query = stockSearch.trim().toLowerCase();
    return inventoryData.stock.filter((item) => {
      const matchesSearch = !query || [
        item.name,
        item.supplier,
        item.category,
        item.sku
      ].some((value) => String(value || '').toLowerCase().includes(query));
      const matchesCategory = !stockCategory || item.category === stockCategory;
      return matchesSearch && matchesCategory;
    });
  }, [inventoryData.stock, stockCategory, stockSearch]);

  const renderStockView = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <InventoryStatCard icon="AlertTriangle" iconClass="text-red-500" label="Stok Kritis" value={stockMetrics.critical} />
        <InventoryStatCard icon="Clock3" iconClass="text-amber-500" label="Akan Expired ≤30 Hari" value={stockMetrics.expiring} />
        <InventoryStatCard icon="Package" iconClass="text-blue-500" label="Total Item" value={stockMetrics.total} />
        <InventoryStatCard icon="WalletCards" iconClass="text-emerald-500" label="Nilai Stok Tercatat" value={formatRupiah(stockMetrics.value)} />
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-primary/15 bg-surface-elevated p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <label className="relative block w-full sm:max-w-sm">
            <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={stockSearch}
              onChange={(event) => setStockSearch(event.target.value)}
              placeholder="Cari item, supplier, atau SKU..."
              className="min-h-10 w-full rounded-xl border border-primary/20 bg-surface py-2 pl-10 pr-4 text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </label>
          <select
            value={stockCategory}
            onChange={(event) => setStockCategory(event.target.value)}
            className="min-h-10 rounded-xl border border-primary/20 bg-surface px-3 py-2 text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          >
            <option value="">Semua Kategori</option>
            {categories.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <RefreshButton onRefresh={fetchInventoryData} />
          <DisabledPrimaryAction>Tambah Item · Segera hadir</DisabledPrimaryAction>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-primary/20 bg-surface-elevated">
        <div className="border-b border-primary/20 px-6 py-4">
          <h3 className="text-lg font-semibold text-primary">Daftar Stok</h3>
          <p className="mt-0.5 text-xs text-secondary">{filteredStock.length} item ditampilkan</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface">
              <tr>
                {['Item', 'Kategori', 'Stok', 'Min Level', 'Expired', 'Status', 'Aksi'].map((heading) => (
                  <th key={heading} className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-secondary">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/10">
              {filteredStock.map((item) => {
                const quantity = quantityOf(item);
                const minimum = minimumOf(item);
                const expiry = expiryOf(item);
                const expiryDate = expiry ? new Date(expiry) : null;
                const daysLeft = expiryDate && !Number.isNaN(expiryDate.getTime())
                  ? Math.ceil((expiryDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
                  : null;
                const status = stockStatus(item);
                const progress = minimum > 0 ? Math.min(100, (quantity / (minimum * 3)) * 100) : 100;
                return (
                  <tr key={item.id} className="transition-colors hover:bg-surface">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-primary">{item.name || 'Item tanpa nama'}</p>
                      <p className="text-xs text-secondary">{item.supplier || item.sku || 'Supplier belum tersedia'}</p>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-secondary">{item.category || '—'}</td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="min-w-[110px] space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-sm font-semibold ${quantity <= minimum ? 'text-red-600' : 'text-primary'}`}>
                            {quantity} {item.unit || ''}
                          </span>
                          <span className="text-[10px] text-secondary">/{minimum} min</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-primary/10">
                          <div
                            className={`h-full rounded-full transition-all ${
                              quantity <= minimum
                                ? 'bg-red-500'
                                : quantity <= minimum * 1.5
                                  ? 'bg-amber-400'
                                  : 'bg-emerald-500'
                            }`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-secondary">{minimum} {item.unit || ''}</td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <p className={`text-sm ${
                        daysLeft != null && daysLeft < 0
                          ? 'font-semibold text-red-600'
                          : daysLeft != null && daysLeft <= 30
                            ? 'font-semibold text-amber-600'
                            : 'text-secondary'
                      }`}>
                        {expiryDate && !Number.isNaN(expiryDate.getTime()) ? expiryDate.toLocaleDateString('id-ID') : '—'}
                      </p>
                      {daysLeft != null && daysLeft < 0 && <p className="text-[10px] font-semibold text-red-500">Sudah expired</p>}
                      {daysLeft != null && daysLeft >= 0 && daysLeft <= 30 && <p className="text-[10px] text-amber-500">{daysLeft} hari lagi</p>}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusBadgeClass(status)}`}>
                        {status === 'normal' ? 'Normal' : status === 'low' ? 'Stok Rendah' : status === 'expiring' ? 'Akan Expired' : status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <button type="button" disabled title="Fitur ini segera hadir" className="cursor-not-allowed rounded-lg p-2 text-secondary/40">
                        <Icon name="MoreHorizontal" size={17} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredStock.length === 0 && <InventoryEmptyRow colSpan={7} message="Belum ada data stok dari layanan inventory." />}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'purchase':
        return <PurchaseRequestsView data={inventoryData.purchaseRequests} onRefresh={fetchInventoryData} />;
      case 'receipts':
        return <ReceiptsView data={inventoryData.receipts} onRefresh={fetchInventoryData} />;
      case 'usage':
        return <UsageView data={inventoryData.usage} onRefresh={fetchInventoryData} />;
      case 'equipment':
        return <EquipmentView data={inventoryData.equipment} onRefresh={fetchInventoryData} />;
      default:
        return renderStockView();
    }
  };

  if (loading) return <InventorySkeleton tabs={tabs} />;

  return (
    <div className="flex min-h-screen bg-background theme-transition">
      <div className="flex-shrink-0" style={{ width: 'var(--sidebar-width, 20rem)' }}>
        <ClinicSideBar />
      </div>
      <div className="min-w-0 flex-1">
        <div className="space-y-8 p-6 md:p-8">
          <section className="clinic-page-header space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold text-primary">{t('clinic.inventory.title') || 'Inventori & Sterilisasi'}</h1>
                <p className="max-w-2xl text-sm text-secondary">{t('clinic.inventory.subtitle') || 'Kelola stok, pembelian, dan sterilisasi peralatan'}</p>
              </div>
              <button type="button" disabled title="Fitur ini segera hadir" className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl bg-accent/50 px-4 py-2 text-sm font-medium text-white opacity-60">
                <Icon name="Download" size={16} />
                Export · Segera hadir
              </button>
            </div>
            <div className="border-t border-border/40 pt-4">
              <div className="flex flex-wrap gap-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                      activeTab === tab.id ? 'bg-accent text-white shadow-sm' : 'text-secondary hover:bg-surface hover:text-primary'
                    }`}
                  >
                    <Icon name={tab.icon} size={16} />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>

          {failedSections.length > 0 && (
            <div className="flex flex-col gap-3 rounded-2xl border border-amber-300/60 bg-amber-50/80 p-4 text-amber-900 dark:border-amber-700/50 dark:bg-amber-950/20 dark:text-amber-100 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <Icon name="CloudAlert" size={20} className="mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold">Sebagian data inventory belum tersedia</p>
                  <p className="mt-0.5 text-xs opacity-80">Layanan gagal: {failedSections.join(', ')}. Data dari layanan lain tetap ditampilkan.</p>
                </div>
              </div>
              <button type="button" onClick={fetchInventoryData} disabled={refreshing} className="min-h-10 rounded-xl border border-current/25 px-4 text-sm font-semibold disabled:opacity-60">
                {refreshing ? 'Menyegarkan…' : 'Coba lagi'}
              </button>
            </div>
          )}

          <div className="min-h-[500px]">{renderContent()}</div>
        </div>
      </div>
    </div>
  );
};

export default InventoryPage;
