import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import ClinicSideBar from '../ui/SideBar-Clinic';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { useAuth } from '../../../contexts/AuthContext';
import PaymentsView from './components/PaymentsView';
import ClaimsView from './components/ClaimsView';
import PromosView from './components/PromosView';

const BillingPage = () => {
  const { t } = useLanguage();
  const { isDark } = useTheme();
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState('invoices');
  const [billingData, setBillingData] = useState({
    invoices: [],
    payments: [],
    claims: [],
    promos: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBillingData = async () => {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setBillingData({
        invoices: [
          {
            id: 'INV-2024-001',
            patient: 'Ahmad Sutrisno',
            amount: 750000,
            status: 'paid',
            dueDate: '2024-01-20',
            services: ['Konsultasi', 'Scaling'],
            createdAt: '2024-01-15'
          },
          {
            id: 'INV-2024-002',
            patient: 'Siti Nurhaliza',
            amount: 1200000,
            status: 'pending',
            dueDate: '2024-01-25',
            services: ['Root Canal', 'Crown'],
            createdAt: '2024-01-18'
          }
        ],
        payments: [
          {
            id: 'PAY-001',
            invoice: 'INV-2024-001',
            patient: 'Ahmad Sutrisno',
            amount: 750000,
            method: 'cash',
            receivedAt: '2024-01-15'
          }
        ],
        claims: [
          {
            id: 'CLM-001',
            patient: 'Budi Santoso',
            insurance: 'BPJS',
            amount: 500000,
            status: 'approved',
            submittedAt: '2024-01-10'
          }
        ],
        promos: [
          {
            id: 'PROMO-001',
            name: 'Paket Scaling + Konsultasi',
            discount: 20,
            validUntil: '2024-03-31',
            used: 12,
            maxUse: 50
          }
        ]
      });
      
      setLoading(false);
    };

    fetchBillingData();
  }, []);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const tabs = [
    { id: 'invoices', label: t('clinic.billing.tabs.invoices') || 'Invoice', icon: 'FileText' },
    { id: 'payments', label: t('clinic.billing.tabs.payments') || 'Pembayaran', icon: 'CreditCard' },
    { id: 'claims', label: t('clinic.billing.tabs.claims') || 'Klaim Asuransi', icon: 'Shield' },
    { id: 'promos', label: t('clinic.billing.tabs.promos') || 'Promo & Paket', icon: 'Tag' }
  ];

  if (loading) {
    const tableSkeletons = Array.from({ length: 5 });

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
                  <div className="h-4 w-72 rounded bg-accent/10 animate-pulse"></div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <div className="h-10 w-40 rounded-xl bg-accent/10 animate-pulse"></div>
                  <div className="h-10 w-44 rounded-xl bg-accent/20 animate-pulse"></div>
                </div>
              </div>
              <div className="border-t border-primary/15 pt-4 flex flex-wrap gap-2">
                {tabs.map((tab) => (
                  <div key={tab.id} className="h-9 w-28 rounded-lg bg-accent/10 animate-pulse"></div>
                ))}
              </div>
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
                <div className="h-5 w-40 rounded bg-accent/10 animate-pulse"></div>
              </div>
              <div className="p-6 space-y-4">
                {tableSkeletons.map((_, idx) => (
                  <div key={idx} className="flex items-center justify-between border border-primary/10 bg-surface rounded-xl p-4 animate-pulse">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-accent/10"></div>
                      <div className="space-y-2">
                        <div className="h-3 w-32 rounded bg-accent/10"></div>
                        <div className="h-3 w-24 rounded bg-accent/10"></div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="h-3 w-20 rounded bg-accent/10"></div>
                      <div className="h-3 w-16 rounded bg-accent/10"></div>
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-accent/10"></div>
                        <div className="h-8 w-8 rounded-full bg-accent/10"></div>
                        <div className="h-8 w-8 rounded-full bg-accent/10"></div>
                      </div>
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'overdue': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'approved': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'processing': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const renderInvoicesView = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Cari invoice..."
              className="pl-10 pr-4 py-2 w-80 rounded-lg border border-primary/20 bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
            />
          </div>
          <select className="px-3 py-2 border border-primary/20 rounded-lg bg-surface text-primary">
            <option value="">Semua Status</option>
            <option value="paid">Lunas</option>
            <option value="pending">Belum Bayar</option>
            <option value="overdue">Jatuh Tempo</option>
          </select>
        </div>
        <button className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors">
          <Icon name="Plus" size={16} className="mr-2" />
          Invoice Baru
        </button>
      </div>

      <div className="bg-surface-elevated rounded-xl border border-primary/20 overflow-hidden">
        <div className="px-6 py-4 border-b border-primary/20">
          <h3 className="text-lg font-semibold text-primary">Daftar Invoice</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">No. Invoice</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Pasien</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Layanan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Jumlah</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Jatuh Tempo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/10">
              {billingData.invoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-surface transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-primary">{invoice.id}</div>
                    <div className="text-xs text-secondary">{new Date(invoice.createdAt).toLocaleDateString('id-ID')}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-primary">{invoice.patient}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-primary">
                      {invoice.services.join(', ')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-primary">{formatCurrency(invoice.amount)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(invoice.status)}`}>
                      {invoice.status === 'paid' ? 'Lunas' : invoice.status === 'pending' ? 'Belum Bayar' : 'Jatuh Tempo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                    {new Date(invoice.dueDate).toLocaleDateString('id-ID')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex space-x-2">
                      <button className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded">
                        <Icon name="Eye" size={16} />
                      </button>
                      <button className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded">
                        <Icon name="Download" size={16} />
                      </button>
                      <button className="p-1 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded">
                        <Icon name="Send" size={16} />
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

  const renderPaymentsView = () => <PaymentsView />;

  const renderClaimsView = () => <ClaimsView />;

  const renderPromosView = () => <PromosView />;

  const renderContent = () => {
    switch (activeTab) {
      case 'invoices': return renderInvoicesView();
      case 'payments': return renderPaymentsView();
      case 'claims': return renderClaimsView();
      case 'promos': return renderPromosView();
      default: return renderInvoicesView();
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
            <p className="text-secondary">Loading billing data...</p>
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
                  {t('clinic.billing.title') || 'Billing & Asuransi'}
                </h1>
                <p className="text-sm text-secondary max-w-2xl">
                  {t('clinic.billing.subtitle') || 'Kelola invoice, pembayaran, dan klaim asuransi'}
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
                    className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                      activeTab === tab.id
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

export default BillingPage;
