import { useState } from 'react';
import { useLanguage } from '../../../../contexts/LanguageContext';
import AppIcon from '../../../../components/AppIcon';

const UsageView = () => {
  const { t } = useLanguage();
  const [showRecordModal, setShowRecordModal] = useState(false);

  // Mock data
  const usageRecords = [
    {
      id: 1,
      recordNumber: 'USG-2024-001',
      treatmentType: 'Scaling & Polishing',
      patient: 'John Doe',
      dentist: 'Dr. Sarah Clinic',
      date: '2024-01-16',
      items: [
        { name: 'Scaling Tips', qty: 2, unit: 'pcs', cost: 50000 },
        { name: 'Polishing Paste', qty: 1, unit: 'pack', cost: 25000 },
        { name: 'Disposable Gloves', qty: 2, unit: 'pair', cost: 10000 }
      ],
      totalItems: 3,
      totalCost: 85000,
      status: 'recorded'
    },
    {
      id: 2,
      recordNumber: 'USG-2024-002',
      treatmentType: 'Composite Filling',
      patient: 'Jane Smith',
      dentist: 'Dr. John Dentist',
      date: '2024-01-16',
      items: [
        { name: 'Composite Resin A2', qty: 1, unit: 'syringe', cost: 150000 },
        { name: 'Bonding Agent', qty: 1, unit: 'bottle', cost: 75000 },
        { name: 'Local Anesthetic', qty: 1, unit: 'ampul', cost: 25000 }
      ],
      totalItems: 3,
      totalCost: 250000,
      status: 'recorded'
    },
    {
      id: 3,
      recordNumber: 'USG-2024-003',
      treatmentType: 'Tooth Extraction',
      patient: 'Robert Johnson',
      dentist: 'Dr. Sarah Clinic',
      date: '2024-01-15',
      items: [
        { name: 'Surgical Gloves', qty: 2, unit: 'pair', cost: 20000 },
        { name: 'Local Anesthetic', qty: 2, unit: 'ampul', cost: 50000 },
        { name: 'Gauze Pads', qty: 5, unit: 'pcs', cost: 15000 }
      ],
      totalItems: 3,
      totalCost: 85000,
      status: 'recorded'
    }
  ];

  // Top used items
  const topUsedItems = [
    { name: 'Disposable Gloves', usage: 150, unit: 'pair', trend: '+12%' },
    { name: 'Local Anesthetic', usage: 45, unit: 'ampul', trend: '+8%' },
    { name: 'Composite Resin', usage: 32, unit: 'syringe', trend: '+15%' },
    { name: 'Scaling Tips', usage: 28, unit: 'pcs', trend: '+5%' }
  ];

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
          <div className="flex items-center space-x-3">
            <AppIcon name="Activity" size={20} className="text-blue-600" />
            <div>
              <p className="text-sm text-blue-800 dark:text-blue-400">
                {t('clinic.inventory.usage.stats.today') || 'Pemakaian Hari Ini'}
              </p>
              <p className="text-xl font-bold text-blue-900 dark:text-blue-300">24 items</p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
          <div className="flex items-center space-x-3">
            <AppIcon name="TrendingUp" size={20} className="text-green-600" />
            <div>
              <p className="text-sm text-green-800 dark:text-green-400">
                {t('clinic.inventory.usage.stats.thisWeek') || 'Minggu Ini'}
              </p>
              <p className="text-xl font-bold text-green-900 dark:text-green-300">156 items</p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
          <div className="flex items-center space-x-3">
            <AppIcon name="Package" size={20} className="text-purple-600" />
            <div>
              <p className="text-sm text-purple-800 dark:text-purple-400">
                {t('clinic.inventory.usage.stats.thisMonth') || 'Bulan Ini'}
              </p>
              <p className="text-xl font-bold text-purple-900 dark:text-purple-300">642 items</p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
          <div className="flex items-center space-x-3">
            <AppIcon name="DollarSign" size={20} className="text-orange-600" />
            <div>
              <p className="text-sm text-orange-800 dark:text-orange-400">
                {t('clinic.inventory.usage.stats.totalCost') || 'Total Biaya'}
              </p>
              <p className="text-xl font-bold text-orange-900 dark:text-orange-300">Rp 12M</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Usage Records */}
        <div className="lg:col-span-2 space-y-6">
          {/* Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <AppIcon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="text"
                  placeholder={t('clinic.inventory.usage.searchPlaceholder') || 'Cari pemakaian...'}
                  className="pl-10 pr-4 py-2 w-64 rounded-lg border border-primary/20 bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
                />
              </div>
              <select className="px-3 py-2 border border-primary/20 rounded-lg bg-surface text-primary">
                <option value="">{t('clinic.inventory.usage.allTreatments') || 'Semua Tindakan'}</option>
                <option value="scaling">Scaling</option>
                <option value="filling">Filling</option>
                <option value="extraction">Extraction</option>
              </select>
            </div>
            <button 
              onClick={() => setShowRecordModal(true)}
              className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors flex items-center gap-2"
            >
              <AppIcon name="Plus" size={16} />
              {t('clinic.inventory.usage.recordUsage') || 'Catat Pemakaian'}
            </button>
          </div>

          {/* Usage Records Table */}
          <div className="bg-surface-elevated rounded-xl border border-primary/20 overflow-hidden">
            <div className="px-6 py-4 border-b border-primary/20">
              <h3 className="text-lg font-semibold text-primary">
                {t('clinic.inventory.usage.title') || 'Riwayat Pemakaian'}
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                      {t('clinic.inventory.usage.table.date') || 'Tanggal'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                      {t('clinic.inventory.usage.table.treatment') || 'Tindakan'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                      {t('clinic.inventory.usage.table.patient') || 'Pasien'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                      {t('clinic.inventory.usage.table.items') || 'Item'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                      {t('clinic.inventory.usage.table.cost') || 'Biaya'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                      {t('clinic.inventory.usage.table.actions') || 'Aksi'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary/10">
                  {usageRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-surface transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-primary">
                          {new Date(record.date).toLocaleDateString('id-ID')}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-primary">{record.treatmentType}</div>
                          <div className="text-xs text-secondary">{record.dentist}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-primary">{record.patient}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-primary">{record.totalItems} item(s)</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-primary">
                          Rp {record.totalCost.toLocaleString('id-ID')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex space-x-2">
                          <button className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded">
                            <AppIcon name="Eye" size={16} />
                          </button>
                          <button className="p-1 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded">
                            <AppIcon name="Printer" size={16} />
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

        {/* Top Used Items */}
        <div className="lg:col-span-1">
          <div className="bg-surface-elevated rounded-xl border border-primary/20 overflow-hidden">
            <div className="px-6 py-4 border-b border-primary/20">
              <h3 className="text-lg font-semibold text-primary">
                {t('clinic.inventory.usage.topUsed') || 'Item Paling Banyak Digunakan'}
              </h3>
            </div>
            <div className="p-6 space-y-4">
              {topUsedItems.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-surface rounded-lg">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-primary">{item.name}</div>
                    <div className="text-xs text-secondary mt-1">
                      {item.usage} {item.unit}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-green-600 dark:text-green-400">
                      {item.trend}
                    </span>
                    <AppIcon name="TrendingUp" size={14} className="text-green-600" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UsageView;
