import { useState } from 'react';
import { useLanguage } from '../../../../contexts/LanguageContext';
import AppIcon from '../../../../components/AppIcon';

const PromosView = () => {
  const { t } = useLanguage();
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [activeTab, setActiveTab] = useState('promos'); // 'promos' or 'packages'

  // Mock data - Promos
  const promos = [
    {
      id: 'PROMO-001',
      code: 'DENTAL2024',
      name: 'Diskon Akhir Tahun',
      description: 'Diskon 20% untuk semua treatment',
      type: 'percentage',
      value: 20,
      minPurchase: 500000,
      maxDiscount: 200000,
      validFrom: '2024-01-01',
      validUntil: '2024-01-31',
      usageLimit: 100,
      usageCount: 45,
      status: 'active',
      treatments: ['All']
    },
    {
      id: 'PROMO-002',
      code: 'SCALING50',
      name: 'Promo Scaling',
      description: 'Diskon Rp 50.000 untuk scaling',
      type: 'fixed',
      value: 50000,
      minPurchase: 0,
      maxDiscount: 50000,
      validFrom: '2024-01-01',
      validUntil: '2024-02-29',
      usageLimit: 50,
      usageCount: 50,
      status: 'inactive',
      treatments: ['Scaling & Polishing']
    },
    {
      id: 'PROMO-003',
      code: 'FIRSTVISIT',
      name: 'Diskon Pasien Baru',
      description: 'Diskon 15% untuk kunjungan pertama',
      type: 'percentage',
      value: 15,
      minPurchase: 300000,
      maxDiscount: 100000,
      validFrom: '2024-01-15',
      validUntil: '2024-12-31',
      usageLimit: 200,
      usageCount: 23,
      status: 'active',
      treatments: ['All']
    }
  ];

  // Mock data - Packages
  const packages = [
    {
      id: 'PKG-001',
      name: 'Paket Pemutihan Gigi',
      description: 'Scaling + Bleaching + Konsultasi',
      price: 2500000,
      originalPrice: 3500000,
      discount: 1000000,
      discountPercentage: 28.57,
      validFrom: '2024-01-01',
      validUntil: '2024-12-31',
      treatments: [
        { name: 'Scaling & Polishing', qty: 1 },
        { name: 'Teeth Whitening', qty: 1 },
        { name: 'Konsultasi', qty: 1 }
      ],
      soldCount: 15,
      status: 'active'
    },
    {
      id: 'PKG-002',
      name: 'Paket Perawatan Lengkap',
      description: 'Scaling + Filling + X-Ray',
      price: 1800000,
      originalPrice: 2300000,
      discount: 500000,
      discountPercentage: 21.74,
      validFrom: '2024-01-01',
      validUntil: '2024-06-30',
      treatments: [
        { name: 'Scaling & Polishing', qty: 1 },
        { name: 'Composite Filling', qty: 2 },
        { name: 'Panoramic X-Ray', qty: 1 }
      ],
      soldCount: 8,
      status: 'active'
    },
    {
      id: 'PKG-003',
      name: 'Paket Kawat Gigi',
      description: 'Bracket + Konsultasi + Kontrol 6 bulan',
      price: 8500000,
      originalPrice: 10000000,
      discount: 1500000,
      discountPercentage: 15,
      validFrom: '2023-12-01',
      validUntil: '2024-03-31',
      treatments: [
        { name: 'Bracket Installation', qty: 1 },
        { name: 'Konsultasi Orthodonti', qty: 1 },
        { name: 'Kontrol Bulanan', qty: 6 }
      ],
      soldCount: 3,
      status: 'expiring'
    }
  ];

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'inactive': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      case 'expiring': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'expired': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getStatusText = (status) => {
    const statusMap = {
      active: t('clinic.billing.promos.status.active') || 'Aktif',
      inactive: t('clinic.billing.promos.status.inactive') || 'Nonaktif',
      expiring: t('clinic.billing.promos.status.expiring') || 'Akan Berakhir',
      expired: t('clinic.billing.promos.status.expired') || 'Kadaluarsa'
    };
    return statusMap[status] || status;
  };

  const getTypeText = (type) => {
    return type === 'percentage' 
      ? (t('clinic.billing.promos.type.percentage') || 'Persentase')
      : (t('clinic.billing.promos.type.fixed') || 'Nominal');
  };

  // Calculate statistics
  const activePromos = promos.filter(p => p.status === 'active').length;
  const totalPackages = packages.length;
  const activePackages = packages.filter(p => p.status === 'active').length;
  const totalUsage = promos.reduce((sum, p) => sum + p.usageCount, 0);
  const packagesSold = packages.reduce((sum, p) => sum + p.soldCount, 0);

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
          <div className="flex items-center space-x-3">
            <AppIcon name="Tag" size={20} className="text-purple-600" />
            <div>
              <p className="text-sm text-purple-800 dark:text-purple-400">
                {t('clinic.billing.promos.stats.activePromos') || 'Promo Aktif'}
              </p>
              <p className="text-xl font-bold text-purple-900 dark:text-purple-300">{activePromos}</p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
          <div className="flex items-center space-x-3">
            <AppIcon name="Package" size={20} className="text-blue-600" />
            <div>
              <p className="text-sm text-blue-800 dark:text-blue-400">
                {t('clinic.billing.promos.stats.activePackages') || 'Paket Aktif'}
              </p>
              <p className="text-xl font-bold text-blue-900 dark:text-blue-300">{activePackages}</p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
          <div className="flex items-center space-x-3">
            <AppIcon name="TrendingUp" size={20} className="text-green-600" />
            <div>
              <p className="text-sm text-green-800 dark:text-green-400">
                {t('clinic.billing.promos.stats.totalUsage') || 'Total Penggunaan'}
              </p>
              <p className="text-xl font-bold text-green-900 dark:text-green-300">{totalUsage}</p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
          <div className="flex items-center space-x-3">
            <AppIcon name="ShoppingCart" size={20} className="text-orange-600" />
            <div>
              <p className="text-sm text-orange-800 dark:text-orange-400">
                {t('clinic.billing.promos.stats.packagesSold') || 'Paket Terjual'}
              </p>
              <p className="text-xl font-bold text-orange-900 dark:text-orange-300">{packagesSold}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-surface-elevated p-1 rounded-lg border border-primary/20 w-fit">
        <button
          onClick={() => setActiveTab('promos')}
          className={`px-4 py-2 rounded-md transition-colors ${
            activeTab === 'promos'
              ? 'bg-accent text-white'
              : 'text-secondary hover:bg-surface'
          }`}
        >
          <div className="flex items-center gap-2">
            <AppIcon name="Tag" size={16} />
            {t('clinic.billing.promos.tabs.promos') || 'Promo'}
          </div>
        </button>
        <button
          onClick={() => setActiveTab('packages')}
          className={`px-4 py-2 rounded-md transition-colors ${
            activeTab === 'packages'
              ? 'bg-accent text-white'
              : 'text-secondary hover:bg-surface'
          }`}
        >
          <div className="flex items-center gap-2">
            <AppIcon name="Package" size={16} />
            {t('clinic.billing.promos.tabs.packages') || 'Paket'}
          </div>
        </button>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <AppIcon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder={
                activeTab === 'promos'
                  ? (t('clinic.billing.promos.searchPromos') || 'Cari promo...')
                  : (t('clinic.billing.promos.searchPackages') || 'Cari paket...')
              }
              className="pl-10 pr-4 py-2 w-80 rounded-lg border border-primary/20 bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
            />
          </div>
          <select className="px-3 py-2 border border-primary/20 rounded-lg bg-surface text-primary">
            <option value="">{t('clinic.billing.promos.allStatus') || 'Semua Status'}</option>
            <option value="active">{t('clinic.billing.promos.status.active') || 'Aktif'}</option>
            <option value="inactive">{t('clinic.billing.promos.status.inactive') || 'Nonaktif'}</option>
            <option value="expiring">{t('clinic.billing.promos.status.expiring') || 'Akan Berakhir'}</option>
            <option value="expired">{t('clinic.billing.promos.status.expired') || 'Kadaluarsa'}</option>
          </select>
        </div>
        <button 
          onClick={() => setShowPromoModal(true)}
          className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors flex items-center gap-2"
        >
          <AppIcon name="Plus" size={16} />
          {activeTab === 'promos'
            ? (t('clinic.billing.promos.createPromo') || 'Buat Promo')
            : (t('clinic.billing.promos.createPackage') || 'Buat Paket')
          }
        </button>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'promos' ? (
        /* Promos List */
        <div className="bg-surface-elevated rounded-xl border border-primary/20 overflow-hidden">
          <div className="px-6 py-4 border-b border-primary/20">
            <h3 className="text-lg font-semibold text-primary">
              {t('clinic.billing.promos.promosList') || 'Daftar Promo'}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                    {t('clinic.billing.promos.table.code') || 'Kode'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                    {t('clinic.billing.promos.table.name') || 'Nama'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                    {t('clinic.billing.promos.table.type') || 'Tipe'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                    {t('clinic.billing.promos.table.value') || 'Nilai'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                    {t('clinic.billing.promos.table.validity') || 'Berlaku'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                    {t('clinic.billing.promos.table.usage') || 'Penggunaan'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                    {t('clinic.billing.promos.table.status') || 'Status'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                    {t('clinic.billing.promos.table.actions') || 'Aksi'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/10">
                {promos.map((promo) => (
                  <tr key={promo.id} className="hover:bg-surface transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-accent">{promo.code}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-primary">{promo.name}</div>
                        <div className="text-xs text-secondary">{promo.description}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-primary">{getTypeText(promo.type)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-primary">
                        {promo.type === 'percentage' ? `${promo.value}%` : formatCurrency(promo.value)}
                      </div>
                      {promo.type === 'percentage' && (
                        <div className="text-xs text-secondary">
                          Max: {formatCurrency(promo.maxDiscount)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-primary">
                        {new Date(promo.validFrom).toLocaleDateString('id-ID')}
                      </div>
                      <div className="text-xs text-secondary">
                        s/d {new Date(promo.validUntil).toLocaleDateString('id-ID')}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-surface rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-accent h-full transition-all"
                              style={{ width: `${(promo.usageCount / promo.usageLimit) * 100}%` }}
                            />
                          </div>
                        </div>
                        <div className="text-xs text-secondary">
                          {promo.usageCount} / {promo.usageLimit}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(promo.status)}`}>
                        {getStatusText(promo.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-2">
                        <button className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded">
                          <AppIcon name="Edit" size={16} />
                        </button>
                        <button className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded">
                          <AppIcon name="Copy" size={16} />
                        </button>
                        <button className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded">
                          <AppIcon name="Trash2" size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Packages List */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {packages.map((pkg) => (
            <div key={pkg.id} className="bg-surface-elevated rounded-xl border border-primary/20 overflow-hidden hover:shadow-lg transition-shadow">
              <div className="p-6 space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-primary">{pkg.name}</h4>
                    <p className="text-sm text-secondary mt-1">{pkg.description}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(pkg.status)}`}>
                    {getStatusText(pkg.status)}
                  </span>
                </div>

                {/* Price */}
                <div className="space-y-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-accent">{formatCurrency(pkg.price)}</span>
                    <span className="text-sm text-secondary line-through">{formatCurrency(pkg.originalPrice)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 text-xs font-semibold rounded">
                      Hemat {pkg.discountPercentage.toFixed(0)}%
                    </span>
                    <span className="text-sm text-secondary">
                      ({formatCurrency(pkg.discount)})
                    </span>
                  </div>
                </div>

                {/* Treatments */}
                <div className="space-y-2">
                  <div className="text-xs font-medium text-secondary uppercase">
                    {t('clinic.billing.promos.package.includes') || 'Termasuk'}
                  </div>
                  <ul className="space-y-1">
                    {pkg.treatments.map((treatment, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm text-primary">
                        <AppIcon name="Check" size={14} className="text-green-600" />
                        <span>{treatment.qty}x {treatment.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Validity & Stats */}
                <div className="pt-4 border-t border-primary/10 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-secondary">
                      {t('clinic.billing.promos.package.validity') || 'Berlaku hingga'}
                    </span>
                    <span className="text-primary font-medium">
                      {new Date(pkg.validUntil).toLocaleDateString('id-ID')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-secondary">
                      {t('clinic.billing.promos.package.sold') || 'Terjual'}
                    </span>
                    <span className="text-accent font-semibold">{pkg.soldCount} paket</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2 flex gap-2">
                  <button className="flex-1 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors flex items-center justify-center gap-2">
                    <AppIcon name="Edit" size={16} />
                    {t('clinic.billing.promos.package.edit') || 'Edit'}
                  </button>
                  <button className="px-4 py-2 border border-primary/20 text-secondary rounded-lg hover:bg-surface transition-colors">
                    <AppIcon name="MoreVertical" size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PromosView;
