import { useState } from 'react';
import { useLanguage } from '../../../../contexts/LanguageContext';
import AppIcon from '../../../../components/AppIcon';

const EquipmentView = () => {
  const { t } = useLanguage();
  const [activeSubTab, setActiveSubTab] = useState('sterilization');

  // Mock data for sterilization
  const sterilizationRecords = [
    {
      id: 1,
      batchNumber: 'ST-2024-001',
      date: '2024-01-16',
      time: '08:00',
      operator: 'Nurse Maya',
      equipment: 'Autoclave A1',
      cycle: 'Steam - 134°C',
      duration: '15 min',
      items: [
        { name: 'Dental Mirrors', qty: 20 },
        { name: 'Extraction Forceps', qty: 10 },
        { name: 'Scalers', qty: 15 }
      ],
      totalItems: 3,
      status: 'completed',
      biologicalIndicator: 'Pass',
      chemicalIndicator: 'Pass'
    },
    {
      id: 2,
      batchNumber: 'ST-2024-002',
      date: '2024-01-16',
      time: '10:30',
      operator: 'Staff Admin',
      equipment: 'Autoclave A2',
      cycle: 'Steam - 121°C',
      duration: '20 min',
      items: [
        { name: 'Surgical Instruments', qty: 25 }
      ],
      totalItems: 1,
      status: 'in-progress',
      progress: 65
    },
    {
      id: 3,
      batchNumber: 'ST-2024-003',
      date: '2024-01-15',
      time: '14:00',
      operator: 'Nurse Maya',
      equipment: 'Autoclave A1',
      cycle: 'Dry Heat - 160°C',
      duration: '60 min',
      items: [
        { name: 'Metal Instruments', qty: 30 }
      ],
      totalItems: 1,
      status: 'failed',
      biologicalIndicator: 'Fail',
      notes: 'Temperature tidak mencapai target'
    }
  ];

  // Mock data for equipment
  const equipmentList = [
    {
      id: 1,
      name: 'Autoclave A1',
      type: 'Steam Sterilizer',
      brand: 'Tuttnauer',
      model: '2340M',
      serialNumber: 'TUT-2023-001',
      location: 'Sterilization Room',
      status: 'operational',
      lastMaintenance: '2024-01-01',
      nextMaintenance: '2024-04-01',
      totalCycles: 1250,
      condition: 'good'
    },
    {
      id: 2,
      name: 'Autoclave A2',
      type: 'Steam Sterilizer',
      brand: 'Melag',
      model: 'Premium Class',
      serialNumber: 'MEL-2023-002',
      location: 'Sterilization Room',
      status: 'in-use',
      lastMaintenance: '2024-01-10',
      nextMaintenance: '2024-04-10',
      totalCycles: 850,
      condition: 'good'
    },
    {
      id: 3,
      name: 'Dental Unit 1',
      type: 'Dental Chair',
      brand: 'Sirona',
      model: 'C4+',
      serialNumber: 'SIR-2022-001',
      location: 'Treatment Room 1',
      status: 'operational',
      lastMaintenance: '2023-12-15',
      nextMaintenance: '2024-03-15',
      condition: 'excellent'
    },
    {
      id: 4,
      name: 'Compressor Unit',
      type: 'Air Compressor',
      brand: 'Atlas Copco',
      model: 'GA-15',
      serialNumber: 'ATL-2022-001',
      location: 'Utility Room',
      status: 'maintenance',
      lastMaintenance: '2024-01-16',
      nextMaintenance: '2024-07-16',
      condition: 'fair',
      maintenanceNotes: 'Scheduled preventive maintenance'
    }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'operational':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'in-use':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'broken':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getConditionColor = (condition) => {
    switch (condition) {
      case 'excellent':
        return 'text-green-600 dark:text-green-400';
      case 'good':
        return 'text-blue-600 dark:text-blue-400';
      case 'fair':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'poor':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const renderSterilizationView = () => (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
          <div className="flex items-center space-x-3">
            <AppIcon name="CheckCircle" size={20} className="text-green-600" />
            <div>
              <p className="text-sm text-green-800 dark:text-green-400">
                {t('clinic.inventory.equipment.sterilization.stats.completed') || 'Selesai Hari Ini'}
              </p>
              <p className="text-xl font-bold text-green-900 dark:text-green-300">1</p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
          <div className="flex items-center space-x-3">
            <AppIcon name="Activity" size={20} className="text-blue-600" />
            <div>
              <p className="text-sm text-blue-800 dark:text-blue-400">
                {t('clinic.inventory.equipment.sterilization.stats.inProgress') || 'Sedang Proses'}
              </p>
              <p className="text-xl font-bold text-blue-900 dark:text-blue-300">1</p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">
          <div className="flex items-center space-x-3">
            <AppIcon name="AlertTriangle" size={20} className="text-red-600" />
            <div>
              <p className="text-sm text-red-800 dark:text-red-400">
                {t('clinic.inventory.equipment.sterilization.stats.failed') || 'Gagal'}
              </p>
              <p className="text-xl font-bold text-red-900 dark:text-red-300">1</p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
          <div className="flex items-center space-x-3">
            <AppIcon name="Package" size={20} className="text-purple-600" />
            <div>
              <p className="text-sm text-purple-800 dark:text-purple-400">
                {t('clinic.inventory.equipment.sterilization.stats.thisWeek') || 'Minggu Ini'}
              </p>
              <p className="text-xl font-bold text-purple-900 dark:text-purple-300">15</p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <AppIcon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder={t('clinic.inventory.equipment.sterilization.searchPlaceholder') || 'Cari batch...'}
              className="pl-10 pr-4 py-2 w-80 rounded-lg border border-primary/20 bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
            />
          </div>
          <select className="px-3 py-2 border border-primary/20 rounded-lg bg-surface text-primary">
            <option value="">{t('clinic.inventory.equipment.sterilization.allStatus') || 'Semua Status'}</option>
            <option value="completed">Selesai</option>
            <option value="in-progress">Proses</option>
            <option value="failed">Gagal</option>
          </select>
        </div>
        <button className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors flex items-center gap-2">
          <AppIcon name="Plus" size={16} />
          {t('clinic.inventory.equipment.sterilization.newCycle') || 'Mulai Sterilisasi'}
        </button>
      </div>

      {/* Sterilization Records */}
      <div className="bg-surface-elevated rounded-xl border border-primary/20 overflow-hidden">
        <div className="px-6 py-4 border-b border-primary/20">
          <h3 className="text-lg font-semibold text-primary">
            {t('clinic.inventory.equipment.sterilization.title') || 'Riwayat Sterilisasi'}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  {t('clinic.inventory.equipment.sterilization.table.batch') || 'Batch'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  {t('clinic.inventory.equipment.sterilization.table.equipment') || 'Alat'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  {t('clinic.inventory.equipment.sterilization.table.cycle') || 'Siklus'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  {t('clinic.inventory.equipment.sterilization.table.operator') || 'Operator'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  {t('clinic.inventory.equipment.sterilization.table.items') || 'Item'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  {t('clinic.inventory.equipment.sterilization.table.status') || 'Status'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  {t('clinic.inventory.equipment.sterilization.table.actions') || 'Aksi'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/10">
              {sterilizationRecords.map((record) => (
                <tr key={record.id} className="hover:bg-surface transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-primary">{record.batchNumber}</div>
                      <div className="text-xs text-secondary">
                        {new Date(record.date).toLocaleDateString('id-ID')} {record.time}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-primary">{record.equipment}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm text-primary">{record.cycle}</div>
                      <div className="text-xs text-secondary">{record.duration}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-primary">{record.operator}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-primary">{record.totalItems} type(s)</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {record.status === 'in-progress' ? (
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${record.progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-secondary">{record.progress}%</span>
                      </div>
                    ) : (
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(record.status)}`}>
                        {record.status === 'completed' ? 'Selesai' : record.status === 'failed' ? 'Gagal' : record.status}
                      </span>
                    )}
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
  );

  const renderEquipmentListView = () => (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
          <div className="flex items-center space-x-3">
            <AppIcon name="CheckCircle" size={20} className="text-green-600" />
            <div>
              <p className="text-sm text-green-800 dark:text-green-400">
                {t('clinic.inventory.equipment.list.stats.operational') || 'Operasional'}
              </p>
              <p className="text-xl font-bold text-green-900 dark:text-green-300">2</p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
          <div className="flex items-center space-x-3">
            <AppIcon name="Activity" size={20} className="text-blue-600" />
            <div>
              <p className="text-sm text-blue-800 dark:text-blue-400">
                {t('clinic.inventory.equipment.list.stats.inUse') || 'Sedang Digunakan'}
              </p>
              <p className="text-xl font-bold text-blue-900 dark:text-blue-300">1</p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl">
          <div className="flex items-center space-x-3">
            <AppIcon name="Wrench" size={20} className="text-yellow-600" />
            <div>
              <p className="text-sm text-yellow-800 dark:text-yellow-400">
                {t('clinic.inventory.equipment.list.stats.maintenance') || 'Maintenance'}
              </p>
              <p className="text-xl font-bold text-yellow-900 dark:text-yellow-300">1</p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
          <div className="flex items-center space-x-3">
            <AppIcon name="Package" size={20} className="text-purple-600" />
            <div>
              <p className="text-sm text-purple-800 dark:text-purple-400">
                {t('clinic.inventory.equipment.list.stats.total') || 'Total Alat'}
              </p>
              <p className="text-xl font-bold text-purple-900 dark:text-purple-300">4</p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <AppIcon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder={t('clinic.inventory.equipment.list.searchPlaceholder') || 'Cari peralatan...'}
              className="pl-10 pr-4 py-2 w-80 rounded-lg border border-primary/20 bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
            />
          </div>
          <select className="px-3 py-2 border border-primary/20 rounded-lg bg-surface text-primary">
            <option value="">{t('clinic.inventory.equipment.list.allTypes') || 'Semua Tipe'}</option>
            <option value="sterilizer">Sterilizer</option>
            <option value="dental-chair">Dental Chair</option>
            <option value="compressor">Compressor</option>
          </select>
        </div>
        <button className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors flex items-center gap-2">
          <AppIcon name="Plus" size={16} />
          {t('clinic.inventory.equipment.list.addEquipment') || 'Tambah Alat'}
        </button>
      </div>

      {/* Equipment List */}
      <div className="bg-surface-elevated rounded-xl border border-primary/20 overflow-hidden">
        <div className="px-6 py-4 border-b border-primary/20">
          <h3 className="text-lg font-semibold text-primary">
            {t('clinic.inventory.equipment.list.title') || 'Daftar Peralatan'}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  {t('clinic.inventory.equipment.list.table.equipment') || 'Peralatan'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  {t('clinic.inventory.equipment.list.table.type') || 'Tipe'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  {t('clinic.inventory.equipment.list.table.location') || 'Lokasi'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  {t('clinic.inventory.equipment.list.table.condition') || 'Kondisi'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  {t('clinic.inventory.equipment.list.table.maintenance') || 'Maintenance'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  {t('clinic.inventory.equipment.list.table.status') || 'Status'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  {t('clinic.inventory.equipment.list.table.actions') || 'Aksi'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/10">
              {equipmentList.map((equipment) => (
                <tr key={equipment.id} className="hover:bg-surface transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-primary">{equipment.name}</div>
                      <div className="text-xs text-secondary">
                        {equipment.brand} - {equipment.model}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-primary">{equipment.type}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-primary">{equipment.location}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm font-semibold ${getConditionColor(equipment.condition)}`}>
                      {equipment.condition.charAt(0).toUpperCase() + equipment.condition.slice(1)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-xs text-secondary">Next:</div>
                      <div className="text-sm text-primary">
                        {new Date(equipment.nextMaintenance).toLocaleDateString('id-ID')}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(equipment.status)}`}>
                      {equipment.status === 'operational' ? 'Operasional' : 
                       equipment.status === 'in-use' ? 'Digunakan' :
                       equipment.status === 'maintenance' ? 'Maintenance' : equipment.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex space-x-2">
                      <button className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded">
                        <AppIcon name="Eye" size={16} />
                      </button>
                      <button className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded">
                        <AppIcon name="Wrench" size={16} />
                      </button>
                      <button className="p-1 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded">
                        <AppIcon name="FileText" size={16} />
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

  return (
    <div className="space-y-6">
      {/* Sub Tabs */}
      <div className="flex gap-2 border-b border-primary/20">
        <button
          onClick={() => setActiveSubTab('sterilization')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            activeSubTab === 'sterilization'
              ? 'border-accent text-accent'
              : 'border-transparent text-secondary hover:text-primary'
          }`}
        >
          <div className="flex items-center gap-2">
            <AppIcon name="Shield" size={16} />
            {t('clinic.inventory.equipment.tabs.sterilization') || 'Sterilisasi'}
          </div>
        </button>
        <button
          onClick={() => setActiveSubTab('equipment')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            activeSubTab === 'equipment'
              ? 'border-accent text-accent'
              : 'border-transparent text-secondary hover:text-primary'
          }`}
        >
          <div className="flex items-center gap-2">
            <AppIcon name="Wrench" size={16} />
            {t('clinic.inventory.equipment.tabs.equipment') || 'Peralatan'}
          </div>
        </button>
      </div>

      {/* Content */}
      {activeSubTab === 'sterilization' ? renderSterilizationView() : renderEquipmentListView()}
    </div>
  );
};

export default EquipmentView;
