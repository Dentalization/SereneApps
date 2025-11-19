import { useState } from 'react';
import { useLanguage } from '../../../../contexts/LanguageContext';
import AppIcon from '../../../../components/AppIcon';

const FinancialView = () => {
  const { t } = useLanguage();

  // Mock data
  const revenueData = {
    total: 185000000,
    growth: 12,
    target: 200000000,
    cash: 45,
    insurance: 35,
    credit: 20
  };

  const monthlyRevenue = [
    { month: 'Jan', revenue: 145000000, expenses: 95000000, profit: 50000000 },
    { month: 'Feb', revenue: 152000000, expenses: 98000000, profit: 54000000 },
    { month: 'Mar', revenue: 168000000, expenses: 105000000, profit: 63000000 },
    { month: 'Apr', revenue: 175000000, expenses: 110000000, profit: 65000000 },
    { month: 'Mei', revenue: 182000000, expenses: 115000000, profit: 67000000 },
    { month: 'Jun', revenue: 185000000, expenses: 118000000, profit: 67000000 }
  ];

  const treatmentRevenue = [
    { treatment: 'Scaling & Polishing', revenue: 42500000, count: 85, avgPrice: 500000, percentage: 23 },
    { treatment: 'Filling', revenue: 36000000, count: 72, avgPrice: 500000, percentage: 19 },
    { treatment: 'Root Canal', revenue: 28500000, count: 38, avgPrice: 750000, percentage: 15 },
    { treatment: 'Crown/Bridge', revenue: 38400000, count: 32, avgPrice: 1200000, percentage: 21 },
    { treatment: 'Extraction', revenue: 22500000, count: 45, avgPrice: 500000, percentage: 12 },
    { treatment: 'Lainnya', revenue: 17100000, count: 28, avgPrice: 600000, percentage: 10 }
  ];

  const paymentMethods = [
    { method: 'Tunai', amount: 83250000, percentage: 45, transactions: 145 },
    { method: 'Transfer Bank', amount: 64750000, percentage: 35, transactions: 98 },
    { method: 'Kartu Kredit/Debit', amount: 37000000, percentage: 20, transactions: 57 }
  ];

  const outstandingInvoices = [
    { invoiceNo: 'INV-2024-045', patient: 'Ahmad Yani', amount: 2500000, dueDate: '2024-01-25', overdue: 5 },
    { invoiceNo: 'INV-2024-052', patient: 'Siti Nurhaliza', amount: 1800000, dueDate: '2024-01-28', overdue: 2 },
    { invoiceNo: 'INV-2024-058', patient: 'Budi Santoso', amount: 3200000, dueDate: '2024-01-30', overdue: 0 },
    { invoiceNo: 'INV-2024-061', patient: 'Linda Wijaya', amount: 1500000, dueDate: '2024-02-02', overdue: 0 }
  ];

  const expenses = [
    { category: 'Gaji Staff', amount: 65000000, percentage: 55, trend: 0 },
    { category: 'Material & Supplies', amount: 25000000, percentage: 21, trend: +5 },
    { category: 'Utilitas & Sewa', amount: 15000000, percentage: 13, trend: 0 },
    { category: 'Marketing', amount: 8000000, percentage: 7, trend: +10 },
    { category: 'Lainnya', amount: 5000000, percentage: 4, trend: -2 }
  ];

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const profitMargin = ((revenueData.total - 118000000) / revenueData.total * 100).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Revenue Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <AppIcon name="TrendingUp" size={20} className="text-green-600" />
            <div className="flex items-center gap-1">
              <AppIcon name="TrendingUp" size={14} className="text-green-600" />
              <span className="text-xs text-green-600">+{revenueData.growth}%</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-xl font-bold text-green-900 dark:text-green-300">
              {formatCurrency(revenueData.total)}
            </div>
            <h3 className="text-sm font-medium text-green-800 dark:text-green-400">
              {t('clinic.reports.financial.totalRevenue') || 'Total Pendapatan'}
            </h3>
            <p className="text-xs text-green-600">Target: {formatCurrency(revenueData.target)}</p>
          </div>
        </div>

        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <AppIcon name="Wallet" size={20} className="text-blue-600" />
            <span className="text-xs text-blue-600">{revenueData.cash}%</span>
          </div>
          <div className="space-y-2">
            <div className="text-xl font-bold text-blue-900 dark:text-blue-300">
              {formatCurrency(revenueData.total * revenueData.cash / 100)}
            </div>
            <h3 className="text-sm font-medium text-blue-800 dark:text-blue-400">
              {t('clinic.reports.financial.cashPayments') || 'Pembayaran Tunai'}
            </h3>
            <div className="flex gap-2 text-xs text-blue-600">
              <span>Transfer: {revenueData.insurance}%</span>
              <span>•</span>
              <span>Kredit: {revenueData.credit}%</span>
            </div>
          </div>
        </div>

        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <AppIcon name="FileText" size={20} className="text-yellow-600" />
            <AppIcon name="AlertCircle" size={14} className="text-yellow-600" />
          </div>
          <div className="space-y-2">
            <div className="text-xl font-bold text-yellow-900 dark:text-yellow-300">
              {outstandingInvoices.length}
            </div>
            <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-400">
              {t('clinic.reports.financial.outstandingInvoices') || 'Invoice Tertunggak'}
            </h3>
            <p className="text-xs text-yellow-600">
              Total: {formatCurrency(outstandingInvoices.reduce((sum, inv) => sum + inv.amount, 0))}
            </p>
          </div>
        </div>

        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <AppIcon name="Percent" size={20} className="text-purple-600" />
            <div className="flex items-center gap-1">
              <AppIcon name="TrendingUp" size={14} className="text-purple-600" />
              <span className="text-xs text-purple-600">+2%</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-xl font-bold text-purple-900 dark:text-purple-300">
              {profitMargin}%
            </div>
            <h3 className="text-sm font-medium text-purple-800 dark:text-purple-400">
              {t('clinic.reports.financial.profitMargin') || 'Profit Margin'}
            </h3>
            <p className="text-xs text-purple-600">Target: 30%</p>
          </div>
        </div>
      </div>

      {/* Monthly Revenue Trend */}
      <div className="bg-surface-elevated rounded-xl border border-primary/20 overflow-hidden">
        <div className="px-6 py-4 border-b border-primary/20">
          <h3 className="text-lg font-semibold text-primary">
            {t('clinic.reports.financial.monthlyTrend') || 'Tren Pendapatan Bulanan'}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Bulan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Pendapatan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Pengeluaran</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Profit</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/10">
              {monthlyRevenue.map((data, idx) => (
                <tr key={idx} className="hover:bg-surface transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary">{data.month}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                      {formatCurrency(data.revenue)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-red-600 dark:text-red-400">
                      {formatCurrency(data.expenses)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-semibold text-accent">
                      {formatCurrency(data.profit)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-primary">
                      {((data.profit / data.revenue) * 100).toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Treatment Revenue & Payment Methods */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Treatment Revenue */}
        <div className="bg-surface-elevated rounded-xl border border-primary/20 overflow-hidden">
          <div className="px-6 py-4 border-b border-primary/20">
            <h3 className="text-lg font-semibold text-primary">
              {t('clinic.reports.financial.treatmentRevenue') || 'Pendapatan per Tindakan'}
            </h3>
          </div>
          <div className="p-6 space-y-4">
            {treatmentRevenue.map((treatment, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-primary">{treatment.treatment}</div>
                    <div className="text-xs text-secondary">{treatment.count}x • Avg: {formatCurrency(treatment.avgPrice)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-accent">{formatCurrency(treatment.revenue)}</div>
                    <div className="text-xs text-secondary">{treatment.percentage}%</div>
                  </div>
                </div>
                <div className="w-full bg-surface rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-accent h-full transition-all"
                    style={{ width: `${treatment.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Methods */}
        <div className="bg-surface-elevated rounded-xl border border-primary/20 overflow-hidden">
          <div className="px-6 py-4 border-b border-primary/20">
            <h3 className="text-lg font-semibold text-primary">
              {t('clinic.reports.financial.paymentMethods') || 'Metode Pembayaran'}
            </h3>
          </div>
          <div className="p-6 space-y-6">
            {paymentMethods.map((method, idx) => (
              <div key={idx} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AppIcon 
                      name={method.method === 'Tunai' ? 'Wallet' : method.method === 'Transfer Bank' ? 'ArrowRightLeft' : 'CreditCard'} 
                      size={20} 
                      className="text-accent" 
                    />
                    <div>
                      <div className="text-sm font-medium text-primary">{method.method}</div>
                      <div className="text-xs text-secondary">{method.transactions} transaksi</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-accent">{formatCurrency(method.amount)}</div>
                    <div className="text-xs text-secondary">{method.percentage}%</div>
                  </div>
                </div>
                <div className="w-full bg-surface rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      idx === 0 ? 'bg-green-600' : idx === 1 ? 'bg-blue-600' : 'bg-purple-600'
                    }`}
                    style={{ width: `${method.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Outstanding Invoices & Expenses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Outstanding Invoices */}
        <div className="bg-surface-elevated rounded-xl border border-primary/20 overflow-hidden">
          <div className="px-6 py-4 border-b border-primary/20 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-primary">
              {t('clinic.reports.financial.outstandingList') || 'Invoice Tertunggak'}
            </h3>
            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400 text-xs font-medium rounded-full">
              {outstandingInvoices.length} invoice
            </span>
          </div>
          <div className="divide-y divide-primary/10">
            {outstandingInvoices.map((invoice, idx) => (
              <div key={idx} className="px-6 py-4 hover:bg-surface transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="text-sm font-medium text-primary">{invoice.invoiceNo}</div>
                    <div className="text-xs text-secondary">{invoice.patient}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-accent">{formatCurrency(invoice.amount)}</div>
                    {invoice.overdue > 0 && (
                      <div className="text-xs text-red-600">Overdue {invoice.overdue} hari</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-secondary">Jatuh tempo: {invoice.dueDate}</span>
                  <button className="text-accent hover:underline">Follow up</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Expenses Breakdown */}
        <div className="bg-surface-elevated rounded-xl border border-primary/20 overflow-hidden">
          <div className="px-6 py-4 border-b border-primary/20">
            <h3 className="text-lg font-semibold text-primary">
              {t('clinic.reports.financial.expenses') || 'Pengeluaran'}
            </h3>
          </div>
          <div className="p-6 space-y-4">
            {expenses.map((expense, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-primary">{expense.category}</span>
                      {expense.trend !== 0 && (
                        <div className="flex items-center gap-1">
                          <AppIcon 
                            name={expense.trend > 0 ? "TrendingUp" : "TrendingDown"} 
                            size={12} 
                            className={expense.trend > 0 ? "text-red-600" : "text-green-600"} 
                          />
                          <span className={`text-xs ${expense.trend > 0 ? "text-red-600" : "text-green-600"}`}>
                            {Math.abs(expense.trend)}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-primary">{formatCurrency(expense.amount)}</div>
                    <div className="text-xs text-secondary">{expense.percentage}%</div>
                  </div>
                </div>
                <div className="w-full bg-surface rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-red-600 h-full transition-all"
                    style={{ width: `${expense.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinancialView;
