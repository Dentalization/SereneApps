import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import ClinicSideBar from '../ui/SideBar-Clinic';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { useAuth } from '../../../contexts/AuthContext';
import PurchaseRequestsView from './components/PurchaseRequestsView';
import ReceiptsView from './components/ReceiptsView';
import UsageView from './components/UsageView';
import EquipmentView from './components/EquipmentView';

const InventoryPage = () => {
  const { t } = useLanguage();
  const { isDark } = useTheme();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('stock');
  const [inventoryData, setInventoryData] = useState({
    stock: [],
    purchaseRequests: [],
    receipts: [],
    usage: [],
    equipment: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInventoryData = async () => {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 800));

      setInventoryData({
        stock: [
          {
            id: 1,
            name: 'Dental Composite A2',
            category: 'Filling Material',
            currentStock: 12,
            minLevel: 5,
            unit: 'Tube',
            expiryDate: '2024-12-31',
            supplier: 'PT. Dental Supply',
            status: 'normal'
          },
          {
            id: 2,
            name: 'Anestesi Lidocaine 2%',
            category: 'Anesthetic',
            currentStock: 3,
            minLevel: 10,
            unit: 'Vial',
            expiryDate: '2024-06-30',
            supplier: 'PT. Medical Care',
            status: 'low'
          },
          {
            id: 3,
            name: 'Disposable Gloves',
            category: 'PPE',
            currentStock: 850,
            minLevel: 200,
            unit: 'Pcs',
            expiryDate: '2025-03-15',
            supplier: 'PT. Safety First',
            status: 'normal'
          }
        ],
        purchaseRequests: [
          {
            id: 'PR-001',
            items: ['Anestesi Lidocaine 2%', 'Dental Bur Set'],
            requestedBy: 'Dr. Sarah',
            status: 'pending',
            createdAt: '2024-01-15',
            totalAmount: 2500000
          }
        ],
        receipts: [
          {
            id: 'GR-001',
            supplier: 'PT. Dental Supply',
            items: 5,
            receivedAt: '2024-01-10',
            totalAmount: 3200000,
            status: 'completed'
          }
        ],
        usage: [
          {
            id: 1,
            item: 'Dental Composite A2',
            quantity: 2,
            procedure: 'Composite Filling',
            patient: 'Ahmad Sutrisno',
            usedAt: '2024-01-15'
          }
        ],
        equipment: [
          {
            id: 1,
            name: 'Dental Unit Chair 1',
            type: 'Treatment Equipment',
            location: 'Room 1',
            lastMaintenance: '2023-12-01',
            nextMaintenance: '2024-03-01',
            status: 'operational'
          },
          {
            id: 2,
            name: 'Autoclave Sterilizer',
            type: 'Sterilization',
            location: 'Sterilization Room',
            lastMaintenance: '2024-01-01',
            nextMaintenance: '2024-04-01',
            status: 'due_maintenance'
          }
        ]
      });

      setLoading(false);
    };

    fetchInventoryData();
  }, []);

  const tabs = [
    { id: 'stock', label: t('clinic.inventory.tabs.stock') || 'Stok Barang', icon: 'Package' },
    { id: 'purchase', label: t('clinic.inventory.tabs.purchase') || 'Permintaan Beli', icon: 'ShoppingCart' },
    { id: 'receipts', label: t('clinic.inventory.tabs.receipts') || 'Penerimaan', icon: 'Truck' },
    { id: 'usage', label: t('clinic.inventory.tabs.usage') || 'Pemakaian', icon: 'Activity' },
    { id: 'equipment', label: t('clinic.inventory.tabs.equipment') || 'Sterilisasi & Alat', icon: 'Wrench' }
  ];

  if (loading) {
    const statSkeletons = Array.from({ length: 4 });
    const tableRows = Array.from({ length: 5 });

    return (
      <div className="flex min-h-screen bg-background theme-transition clinic-skeleton">
        <div className="flex-shrink-0" style={{ width: 'var(--sidebar-width, 20rem)' }}>
          <ClinicSideBar />
        </div>

        <div className="flex-1 min-w-0">
          <div className="p-6 md:p-8 space-y-8">
            <section className="space-y-6 rounded-3xl border border-primary/15 bg-surface-elevated skeleton-surface p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-3">
                  <div className="h-6 w-56 rounded bg-accent/10 animate-pulse"></div>
                  <div className="h-4 w-80 rounded bg-accent/10 animate-pulse"></div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <div className="h-10 w-40 rounded-xl bg-accent/10 animate-pulse"></div>
                  <div className="h-10 w-44 rounded-xl bg-accent/20 animate-pulse"></div>
                </div>
              </div>
              <div className="border-t border-primary/15 pt-4 flex flex-wrap gap-2">
                {tabs.map((tab) => (
                  <div key={tab.id} className="h-9 w-32 rounded-lg bg-accent/10 animate-pulse"></div>
                ))}
              </div>
            </section>

            <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {statSkeletons.map((_, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-primary/15 bg-surface-elevated skeleton-surface space-y-3">
                  <div className="h-4 w-24 rounded bg-accent/10 animate-pulse"></div>
                  <div className="h-6 w-16 rounded bg-accent/20 animate-pulse"></div>
                </div>
              ))}
            </section>

            <section className="rounded-2xl border border-primary/15 bg-surface-elevated skeleton-surface p-6 space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-1">
                  <div className="h-10 w-full sm:w-80 rounded-lg bg-accent/10 animate-pulse"></div>
                  <div className="h-10 w-40 rounded-lg bg-accent/10 animate-pulse"></div>
                </div>
                <div className="h-10 w-36 rounded-lg bg-accent/20 animate-pulse"></div>
              </div>
            </section>

            <section className="rounded-2xl border border-primary/15 bg-surface-elevated skeleton-surface overflow-hidden">
              <div className="px-6 py-4 border-b border-primary/15">
                <div className="h-5 w-48 rounded bg-accent/10 animate-pulse"></div>
              </div>
              <div className="p-6 space-y-4">
                {tableRows.map((_, idx) => (
                  <div key={idx} className="flex items-center justify-between border border-primary/10 bg-surface rounded-xl p-4 animate-pulse">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-accent/10"></div>
                      <div className="space-y-2">
                        <div className="h-3 w-32 rounded bg-accent/10"></div>
                        <div className="h-3 w-24 rounded bg-accent/10"></div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="h-3 w-16 rounded bg-accent/10"></div>
                      <div className="h-3 w-12 rounded bg-accent/10"></div>
                      <div className="h-3 w-20 rounded bg-accent/10"></div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    );
  }
  const getStockStatusColor = (status) => {
    switch (status) {
      case 'normal': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'low': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'expired': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
      case 'expiring': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      default: return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    }
  };

  const renderStockView = () => (
    <div className="space-y-6">
      {/* Stock Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">
          <div className="flex items-center space-x-3">
            <Icon name="AlertTriangle" size={20} className="text-red-600" />
            <div>
              <p className="text-sm text-red-800 dark:text-red-400">Stok Kritis</p>
              <p className="text-xl font-bold text-red-900 dark:text-red-300">5</p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl">
          <div className="flex items-center space-x-3">
            <Icon name="Clock" size={20} className="text-yellow-600" />
            <div>
              <p className="text-sm text-yellow-800 dark:text-yellow-400">Akan Expired</p>
              <p className="text-xl font-bold text-yellow-900 dark:text-yellow-300">3</p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
          <div className="flex items-center space-x-3">
            <Icon name="Package" size={20} className="text-blue-600" />
            <div>
              <p className="text-sm text-blue-800 dark:text-blue-400">Total Item</p>
              <p className="text-xl font-bold text-blue-900 dark:text-blue-300">156</p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
          <div className="flex items-center space-x-3">
            <Icon name="TrendingUp" size={20} className="text-green-600" />
            <div>
              <p className="text-sm text-green-800 dark:text-green-400">Nilai Stok</p>
              <p className="text-xl font-bold text-green-900 dark:text-green-300">Rp 45M</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Cari item..."
              className="pl-10 pr-4 py-2 w-80 rounded-lg border border-primary/20 bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
            />
          </div>
          <select className="px-3 py-2 pr-8 border border-primary/20 rounded-lg bg-surface text-primary appearance-none focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
            style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em' }}>
            <option value="">Semua Kategori</option>
            <option value="filling">Filling Material</option>
            <option value="anesthetic">Anesthetic</option>
            <option value="ppe">PPE</option>
          </select>
        </div>
        <button className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors">
          <Icon name="Plus" size={16} className="mr-2" />
          Tambah Item
        </button>
      </div>

      {/* Stock Table */}
      <div className="bg-surface-elevated rounded-xl border border-primary/20 overflow-hidden">
        <div className="px-6 py-4 border-b border-primary/20">
          <h3 className="text-lg font-semibold text-primary">Daftar Stok</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Item</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Kategori</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Stok</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Min Level</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Expired</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/10">
              {inventoryData.stock.map((item) => (
                <tr key={item.id} className="hover:bg-surface transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-primary">{item.name}</div>
                      <div className="text-xs text-secondary">{item.supplier}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                    {item.category}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm font-semibold ${item.currentStock <= item.minLevel ? 'text-red-600' : 'text-primary'}`}>
                      {item.currentStock} {item.unit}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                    {item.minLevel} {item.unit}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                    {new Date(item.expiryDate).toLocaleDateString('id-ID')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStockStatusColor(item.status)}`}>
                      {item.status === 'normal' ? 'Normal' : item.status === 'low' ? 'Stok Rendah' : 'Expired'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex space-x-2">
                      <button className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded">
                        <Icon name="Edit" size={16} />
                      </button>
                      <button className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded">
                        <Icon name="Plus" size={16} />
                      </button>
                      <button className="p-1 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded">
                        <Icon name="ShoppingCart" size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderPurchaseView = () => <PurchaseRequestsView />;

  const renderReceiptsView = () => <ReceiptsView />;

  const renderUsageView = () => <UsageView />;

  const renderEquipmentView = () => <EquipmentView />;

  const renderContent = () => {
    switch (activeTab) {
      case 'stock': return renderStockView();
      case 'purchase': return renderPurchaseView();
      case 'receipts': return renderReceiptsView();
      case 'usage': return renderUsageView();
      case 'equipment': return renderEquipmentView();
      default: return renderStockView();
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-background theme-transition">
        <div className="flex-shrink-0" style={{ width: 'var(--sidebar-width, 20rem)' }}>
          <ClinicSideBar />
        </div>
        <div className="flex-1 min-w-0 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin mb-4">
              <Icon name="Loader2" size={48} className="text-accent mx-auto" />
            </div>
            <p className="text-secondary">Loading inventory data...</p>
          </div>
        </div>
      </div>
    );
  }

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
                <h1 className="text-3xl font-bold text-primary">
                  {t('clinic.inventory.title') || 'Inventori & Sterilisasi'}
                </h1>
                <p className="text-sm text-secondary max-w-2xl">
                  {t('clinic.inventory.subtitle') || 'Kelola stok, pembelian, dan sterilisasi peralatan'}
                </p>
              </div>
              <button className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-accent-hover">
                <Icon name="Download" size={16} />
                Export
              </button>
            </div>
            <div className="border-t border-border/40 pt-4">
              <div className="flex flex-wrap gap-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${activeTab === tab.id
                      ? 'bg-accent text-white shadow-sm'
                      : 'text-secondary hover:text-primary hover:bg-surface'
                      }`}
                  >
                    <Icon name={tab.icon} size={16} />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>

          <div className="min-h-[500px]">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryPage;
