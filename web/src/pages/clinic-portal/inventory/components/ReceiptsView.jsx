import { useState } from 'react';
import { useLanguage } from '../../../../contexts/LanguageContext';
import AppIcon from '../../../../components/AppIcon';

const ReceiptsView = () => {
  const { t } = useLanguage();
  const [showReceiveModal, setShowReceiveModal] = useState(false);

  // Mock data
  const receipts = [
    {
      id: 1,
      receiptNumber: 'GR-2024-001',
      purchaseOrderNumber: 'PO-2024-001',
      supplier: 'Dental Supply Co.',
      receivedBy: 'Staff Admin',
      receivedDate: '2024-01-16',
      items: [
        { name: 'Composite Resin A2', ordered: 10, received: 10, unit: 'box', condition: 'good' },
        { name: 'Local Anesthetic', ordered: 20, received: 18, unit: 'ampul', condition: 'good' }
      ],
      totalItems: 2,
      status: 'verified',
      notes: 'Semua barang dalam kondisi baik',
      invoiceNumber: 'INV-2024-001',
      totalCost: 5000000
    },
    {
      id: 2,
      receiptNumber: 'GR-2024-002',
      purchaseOrderNumber: 'PO-2024-002',
      supplier: 'Medical Equipment Ltd.',
      receivedBy: 'Dr. Sarah',
      receivedDate: '2024-01-15',
      items: [
        { name: 'Surgical Gloves', ordered: 50, received: 50, unit: 'box', condition: 'good' }
      ],
      totalItems: 1,
      status: 'pending',
      notes: 'Menunggu verifikasi kualitas',
      totalCost: 2500000
    },
    {
      id: 3,
      receiptNumber: 'GR-2024-003',
      purchaseOrderNumber: 'PO-2024-003',
      supplier: 'Sterilization Supplies',
      receivedBy: 'Nurse Maya',
      receivedDate: '2024-01-14',
      items: [
        { name: 'Autoclave Indicator Tape', ordered: 5, received: 4, unit: 'roll', condition: 'damaged' }
      ],
      totalItems: 1,
      status: 'partial',
      notes: '1 roll rusak, akan diklaim',
      totalCost: 1500000
    }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'verified':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'partial':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getStatusText = (status) => {
    const statusMap = {
      pending: t('clinic.inventory.receipts.status.pending') || 'Menunggu Verifikasi',
      verified: t('clinic.inventory.receipts.status.verified') || 'Terverifikasi',
      partial: t('clinic.inventory.receipts.status.partial') || 'Sebagian',
      rejected: t('clinic.inventory.receipts.status.rejected') || 'Ditolak'
    };
    return statusMap[status] || status;
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
                {t('clinic.inventory.receipts.stats.pending') || 'Menunggu Verifikasi'}
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
                {t('clinic.inventory.receipts.stats.verified') || 'Terverifikasi'}
              </p>
              <p className="text-xl font-bold text-green-900 dark:text-green-300">1</p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
          <div className="flex items-center space-x-3">
            <AppIcon name="AlertTriangle" size={20} className="text-orange-600" />
            <div>
              <p className="text-sm text-orange-800 dark:text-orange-400">
                {t('clinic.inventory.receipts.stats.partial') || 'Penerimaan Sebagian'}
              </p>
              <p className="text-xl font-bold text-orange-900 dark:text-orange-300">1</p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
          <div className="flex items-center space-x-3">
            <AppIcon name="Package" size={20} className="text-blue-600" />
            <div>
              <p className="text-sm text-blue-800 dark:text-blue-400">
                {t('clinic.inventory.receipts.stats.thisMonth') || 'Bulan Ini'}
              </p>
              <p className="text-xl font-bold text-blue-900 dark:text-blue-300">3</p>
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
              placeholder={t('clinic.inventory.receipts.searchPlaceholder') || 'Cari penerimaan...'}
              className="pl-10 pr-4 py-2 w-80 rounded-lg border border-primary/20 bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
            />
          </div>
          <select className="px-3 py-2 border border-primary/20 rounded-lg bg-surface text-primary">
            <option value="">{t('clinic.inventory.receipts.allStatus') || 'Semua Status'}</option>
            <option value="pending">{t('clinic.inventory.receipts.status.pending') || 'Menunggu'}</option>
            <option value="verified">{t('clinic.inventory.receipts.status.verified') || 'Terverifikasi'}</option>
            <option value="partial">{t('clinic.inventory.receipts.status.partial') || 'Sebagian'}</option>
          </select>
        </div>
        <button 
          onClick={() => setShowReceiveModal(true)}
          className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors flex items-center gap-2"
        >
          <AppIcon name="Plus" size={16} />
          {t('clinic.inventory.receipts.newReceipt') || 'Terima Barang'}
        </button>
      </div>

      {/* Receipts List */}
      <div className="bg-surface-elevated rounded-xl border border-primary/20 overflow-hidden">
        <div className="px-6 py-4 border-b border-primary/20">
          <h3 className="text-lg font-semibold text-primary">
            {t('clinic.inventory.receipts.title') || 'Daftar Penerimaan Barang'}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  {t('clinic.inventory.receipts.table.receiptNumber') || 'No. Penerimaan'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  {t('clinic.inventory.receipts.table.poNumber') || 'No. PO'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  {t('clinic.inventory.receipts.table.supplier') || 'Supplier'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  {t('clinic.inventory.receipts.table.receivedBy') || 'Diterima Oleh'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  {t('clinic.inventory.receipts.table.items') || 'Item'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  {t('clinic.inventory.receipts.table.status') || 'Status'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  {t('clinic.inventory.receipts.table.actions') || 'Aksi'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/10">
              {receipts.map((receipt) => (
                <tr key={receipt.id} className="hover:bg-surface transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-primary">{receipt.receiptNumber}</div>
                      <div className="text-xs text-secondary">
                        {new Date(receipt.receivedDate).toLocaleDateString('id-ID')}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-primary">{receipt.purchaseOrderNumber}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-primary">{receipt.supplier}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-primary">{receipt.receivedBy}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-primary">
                      {receipt.totalItems} item(s)
                      {receipt.notes && (
                        <div className="text-xs text-secondary mt-1">{receipt.notes}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(receipt.status)}`}>
                      {getStatusText(receipt.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex space-x-2">
                      <button className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded">
                        <AppIcon name="Eye" size={16} />
                      </button>
                      {receipt.status === 'pending' && (
                        <button className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded">
                          <AppIcon name="Check" size={16} />
                        </button>
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

export default ReceiptsView;
