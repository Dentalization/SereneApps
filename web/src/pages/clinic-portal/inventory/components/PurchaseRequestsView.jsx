import { useState } from 'react';
import { useLanguage } from '../../../../contexts/LanguageContext';
import AppIcon from '../../../../components/AppIcon';

const PurchaseRequestsView = () => {
  const { t } = useLanguage();
  const [showAddModal, setShowAddModal] = useState(false);

  // Mock data
  const purchaseRequests = [
    {
      id: 1,
      requestNumber: 'PR-2024-001',
      requestedBy: 'Dr. Sarah Clinic',
      department: 'Treatment Room',
      items: [
        { name: 'Composite Resin A2', qty: 10, unit: 'box' },
        { name: 'Local Anesthetic', qty: 20, unit: 'ampul' }
      ],
      totalItems: 2,
      estimatedCost: 5000000,
      status: 'pending',
      priority: 'high',
      requestDate: '2024-01-15',
      notes: 'Urgent - Stock running low'
    },
    {
      id: 2,
      requestNumber: 'PR-2024-002',
      requestedBy: 'Dr. John Dentist',
      department: 'Surgery Room',
      items: [
        { name: 'Surgical Gloves', qty: 50, unit: 'box' }
      ],
      totalItems: 1,
      estimatedCost: 2500000,
      status: 'approved',
      priority: 'medium',
      requestDate: '2024-01-14',
      approvedBy: 'Manager',
      approvedDate: '2024-01-15'
    },
    {
      id: 3,
      requestNumber: 'PR-2024-003',
      requestedBy: 'Nurse Maya',
      department: 'Sterilization',
      items: [
        { name: 'Autoclave Indicator Tape', qty: 5, unit: 'roll' },
        { name: 'Sterilization Pouches', qty: 100, unit: 'pack' }
      ],
      totalItems: 2,
      estimatedCost: 1500000,
      status: 'ordered',
      priority: 'low',
      requestDate: '2024-01-13',
      orderDate: '2024-01-15'
    }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'ordered':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getStatusText = (status) => {
    const statusMap = {
      pending: t('clinic.inventory.purchase.status.pending') || 'Menunggu Approval',
      approved: t('clinic.inventory.purchase.status.approved') || 'Disetujui',
      rejected: t('clinic.inventory.purchase.status.rejected') || 'Ditolak',
      ordered: t('clinic.inventory.purchase.status.ordered') || 'Sudah Dipesan'
    };
    return statusMap[status] || status;
  };

  const getPriorityText = (priority) => {
    const priorityMap = {
      high: t('clinic.inventory.purchase.priority.high') || 'Tinggi',
      medium: t('clinic.inventory.purchase.priority.medium') || 'Sedang',
      low: t('clinic.inventory.purchase.priority.low') || 'Rendah'
    };
    return priorityMap[priority] || priority;
  };

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl">
          <div className="flex items-center space-x-3">
            <AppIcon name="Clock" size={20} className="text-yellow-600" />
            <div>
              <p className="text-sm text-yellow-800 dark:text-yellow-400">
                {t('clinic.inventory.purchase.stats.pending') || 'Menunggu Approval'}
              </p>
              <p className="text-xl font-bold text-yellow-900 dark:text-yellow-300">1</p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
          <div className="flex items-center space-x-3">
            <AppIcon name="CheckCircle" size={20} className="text-green-600" />
            <div>
              <p className="text-sm text-green-800 dark:text-green-400">
                {t('clinic.inventory.purchase.stats.approved') || 'Disetujui'}
              </p>
              <p className="text-xl font-bold text-green-900 dark:text-green-300">1</p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
          <div className="flex items-center space-x-3">
            <AppIcon name="ShoppingCart" size={20} className="text-blue-600" />
            <div>
              <p className="text-sm text-blue-800 dark:text-blue-400">
                {t('clinic.inventory.purchase.stats.ordered') || 'Sudah Dipesan'}
              </p>
              <p className="text-xl font-bold text-blue-900 dark:text-blue-300">1</p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
          <div className="flex items-center space-x-3">
            <AppIcon name="DollarSign" size={20} className="text-purple-600" />
            <div>
              <p className="text-sm text-purple-800 dark:text-purple-400">
                {t('clinic.inventory.purchase.stats.totalValue') || 'Total Nilai'}
              </p>
              <p className="text-xl font-bold text-purple-900 dark:text-purple-300">Rp 9M</p>
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
              placeholder={t('clinic.inventory.purchase.searchPlaceholder') || 'Cari permintaan...'}
              className="pl-10 pr-4 py-2 w-80 rounded-lg border border-primary/20 bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
            />
          </div>
          <select className="px-3 py-2 border border-primary/20 rounded-lg bg-surface text-primary">
            <option value="">{t('clinic.inventory.purchase.allStatus') || 'Semua Status'}</option>
            <option value="pending">{t('clinic.inventory.purchase.status.pending') || 'Menunggu'}</option>
            <option value="approved">{t('clinic.inventory.purchase.status.approved') || 'Disetujui'}</option>
            <option value="ordered">{t('clinic.inventory.purchase.status.ordered') || 'Dipesan'}</option>
          </select>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors flex items-center gap-2"
        >
          <AppIcon name="Plus" size={16} />
          {t('clinic.inventory.purchase.newRequest') || 'Buat Permintaan'}
        </button>
      </div>

      {/* Purchase Requests List */}
      <div className="bg-surface-elevated rounded-xl border border-primary/20 overflow-hidden">
        <div className="px-6 py-4 border-b border-primary/20">
          <h3 className="text-lg font-semibold text-primary">
            {t('clinic.inventory.purchase.title') || 'Daftar Permintaan Pembelian'}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  {t('clinic.inventory.purchase.table.requestNumber') || 'No. Permintaan'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  {t('clinic.inventory.purchase.table.requestedBy') || 'Diminta Oleh'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  {t('clinic.inventory.purchase.table.items') || 'Item'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  {t('clinic.inventory.purchase.table.estimatedCost') || 'Est. Biaya'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  {t('clinic.inventory.purchase.table.priority') || 'Prioritas'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  {t('clinic.inventory.purchase.table.status') || 'Status'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  {t('clinic.inventory.purchase.table.actions') || 'Aksi'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/10">
              {purchaseRequests.map((request) => (
                <tr key={request.id} className="hover:bg-surface transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-primary">{request.requestNumber}</div>
                      <div className="text-xs text-secondary">
                        {new Date(request.requestDate).toLocaleDateString('id-ID')}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-primary">{request.requestedBy}</div>
                      <div className="text-xs text-secondary">{request.department}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-primary">
                      {request.totalItems} item(s)
                      {request.notes && (
                        <div className="text-xs text-secondary mt-1">{request.notes}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-primary">
                      Rp {(request.estimatedCost / 1000000).toFixed(1)}M
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(request.priority)}`}>
                      {getPriorityText(request.priority)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(request.status)}`}>
                      {getStatusText(request.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex space-x-2">
                      <button className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded">
                        <AppIcon name="Eye" size={16} />
                      </button>
                      {request.status === 'pending' && (
                        <>
                          <button className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded">
                            <AppIcon name="Check" size={16} />
                          </button>
                          <button className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded">
                            <AppIcon name="X" size={16} />
                          </button>
                        </>
                      )}
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
};

export default PurchaseRequestsView;
