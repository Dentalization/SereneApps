import { useState } from 'react';
import { useLanguage } from '../../../../contexts/LanguageContext';
import AppIcon from '../../../../components/AppIcon';

const PaymentsView = ({ payments = [], loading = false }) => {
  const { t } = useLanguage();
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getMethodIcon = (method) => {
    switch (method) {
      case 'cash': return 'Wallet';
      case 'transfer': return 'ArrowRightLeft';
      case 'qris': return 'QrCode';
      case 'debit': return 'CreditCard';
      case 'credit': return 'CreditCard';
      default: return 'DollarSign';
    }
  };

  const getMethodColor = (method) => {
    switch (method) {
      case 'cash': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'transfer': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'qris': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      case 'debit': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      case 'credit': return 'bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'failed': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'refunded': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getMethodText = (method) => {
    const methodMap = {
      cash: t('clinic.billing.payments.methods.cash') || 'Tunai',
      transfer: t('clinic.billing.payments.methods.transfer') || 'Transfer Bank',
      qris: t('clinic.billing.payments.methods.qris') || 'QRIS',
      debit: t('clinic.billing.payments.methods.debit') || 'Kartu Debit',
      credit: t('clinic.billing.payments.methods.credit') || 'Kartu Kredit'
    };
    return methodMap[method] || method;
  };

  const getStatusText = (status) => {
    const statusMap = {
      completed: t('clinic.billing.payments.status.completed') || 'Selesai',
      pending: t('clinic.billing.payments.status.pending') || 'Menunggu',
      failed: t('clinic.billing.payments.status.failed') || 'Gagal',
      refunded: t('clinic.billing.payments.status.refunded') || 'Dikembalikan'
    };
    return statusMap[status] || status;
  };

  // Calculate statistics dynamically
  const totalPayments = payments.reduce((sum, payment) => sum + (payment.status === 'completed' ? payment.amount : 0), 0);
  const completedPayments = payments.filter(p => p.status === 'completed').length;
  const pendingPayments = payments.filter(p => p.status === 'pending').length;
  const todayPayments = payments.filter(p => 
    p.status === 'completed' && new Date(p.receivedAt).toDateString() === new Date().toDateString()
  ).length;

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
          <div className="flex items-center space-x-3">
            <AppIcon name="DollarSign" size={20} className="text-green-600" />
            <div>
              <p className="text-sm text-green-800 dark:text-green-400">
                {t('clinic.billing.payments.stats.total') || 'Total Pembayaran'}
              </p>
              <p className="text-xl font-bold text-green-900 dark:text-green-300">
                {formatCurrency(totalPayments)}
              </p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
          <div className="flex items-center space-x-3">
            <AppIcon name="CheckCircle" size={20} className="text-blue-600" />
            <div>
              <p className="text-sm text-blue-800 dark:text-blue-400">
                {t('clinic.billing.payments.stats.completed') || 'Selesai'}
              </p>
              <p className="text-xl font-bold text-blue-900 dark:text-blue-300">{completedPayments}</p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl">
          <div className="flex items-center space-x-3">
            <AppIcon name="Clock" size={20} className="text-yellow-600" />
            <div>
              <p className="text-sm text-yellow-800 dark:text-yellow-400">
                {t('clinic.billing.payments.stats.pending') || 'Menunggu'}
              </p>
              <p className="text-xl font-bold text-yellow-900 dark:text-yellow-300">{pendingPayments}</p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
          <div className="flex items-center space-x-3">
            <AppIcon name="TrendingUp" size={20} className="text-purple-600" />
            <div>
              <p className="text-sm text-purple-800 dark:text-purple-400">
                {t('clinic.billing.payments.stats.today') || 'Hari Ini'}
              </p>
              <p className="text-xl font-bold text-purple-900 dark:text-purple-300">{todayPayments}</p>
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
              placeholder={t('clinic.billing.payments.searchPlaceholder') || 'Cari pembayaran...'}
              className="pl-10 pr-4 py-2 w-80 rounded-lg border border-primary/20 bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
            />
          </div>
          <select className="px-3 py-2 border border-primary/20 rounded-lg bg-surface text-primary">
            <option value="">{t('clinic.billing.payments.allMethods') || 'Semua Metode'}</option>
            <option value="cash">{t('clinic.billing.payments.methods.cash') || 'Tunai'}</option>
            <option value="transfer">{t('clinic.billing.payments.methods.transfer') || 'Transfer'}</option>
            <option value="qris">{t('clinic.billing.payments.methods.qris') || 'QRIS'}</option>
            <option value="debit">{t('clinic.billing.payments.methods.debit') || 'Debit'}</option>
          </select>
        </div>
      </div>

      {/* Payments List */}
      <div className="bg-surface-elevated rounded-xl border border-primary/20 overflow-hidden">
        <div className="px-6 py-4 border-b border-primary/20">
          <h3 className="text-lg font-semibold text-primary">
            {t('clinic.billing.payments.title') || 'Riwayat Pembayaran'}
          </h3>
        </div>

        {payments.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <AppIcon name="CreditCard" className="mx-auto text-muted/40" size={48} />
            <p className="font-medium text-foreground">No payments received yet</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Payments processed online via Midtrans will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                    {t('clinic.billing.payments.table.paymentId') || 'ID Pembayaran'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                    {t('clinic.billing.payments.table.invoice') || 'Invoice'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                    {t('clinic.billing.payments.table.patient') || 'Pasien'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                    {t('clinic.billing.payments.table.amount') || 'Jumlah'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                    {t('clinic.billing.payments.table.method') || 'Metode'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                    {t('clinic.billing.payments.table.receivedBy') || 'Diterima Oleh'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                    {t('clinic.billing.payments.table.status') || 'Status'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/10">
                {payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-surface transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-primary">{payment.id}</div>
                        <div className="text-xs text-secondary">
                          {new Date(payment.receivedAt).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-primary">{payment.invoice}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-primary">{payment.patient}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-primary">
                        {formatCurrency(payment.amount)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <AppIcon name={getMethodIcon(payment.method)} size={14} />
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getMethodColor(payment.method)}`}>
                          {getMethodText(payment.method)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-primary">{payment.receivedBy}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(payment.status)}`}>
                        {getStatusText(payment.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentsView;
