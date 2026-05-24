import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import ClinicSideBar from '../ui/SideBar-Clinic';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { useAuth } from '../../../contexts/AuthContext';
import PaymentsView from './components/PaymentsView';
import ClaimsView from './components/ClaimsView';
import PromosView from './components/PromosView';
import { authHttp } from '../../../utils/httpClient';
import ModalPortal from '../../../components/ui/ModalPortal';

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

  // Invoice Inspector Modal State
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);
  const [invoiceDetail, setInvoiceDetail] = useState(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);

  const fetchBillingData = async () => {
    setLoading(true);
    try {
      const { data } = await authHttp.get('/financials/clinic/history');
      setBillingData({
        invoices: data.invoices || [],
        payments: data.payments || [],
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
            validUntil: '2026-12-31',
            used: 12,
            maxUse: 50
          }
        ]
      });
    } catch (error) {
      console.error('Failed to load clinic billing data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingData();
  }, []);

  useEffect(() => {
    if (selectedInvoiceId) {
      const fetchInvoiceDetail = async () => {
        setInvoiceLoading(true);
        try {
          const { data } = await authHttp.get(`/payments/invoices/${selectedInvoiceId}`);
          setInvoiceDetail(data.invoice);
        } catch (error) {
          console.error('Error fetching invoice details:', error);
        } finally {
          setInvoiceLoading(false);
        }
      };
      fetchInvoiceDetail();
    } else {
      setInvoiceDetail(null);
    }
  }, [selectedInvoiceId]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  const tabs = [
    { id: 'invoices', label: t('clinic.billing.tabs.invoices') || 'Invoice', icon: 'FileText' },
    { id: 'payments', label: t('clinic.billing.tabs.payments') || 'Pembayaran', icon: 'CreditCard' },
    { id: 'claims', label: t('clinic.billing.tabs.claims') || 'Klaim Asuransi', icon: 'Shield' },
    { id: 'promos', label: t('clinic.billing.tabs.promos') || 'Promo & Paket', icon: 'Tag' }
  ];

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'paid':
      case 'lunas':
      case 'completed':
      case 'approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'pending':
      case 'belum bayar':
      case 'requires_action':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'overdue':
      case 'rejected':
      case 'failed':
      case 'expired':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'refunded':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const getStatusLabel = (status) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return 'Lunas';
      case 'pending':
        return 'Belum Bayar';
      case 'overdue':
        return 'Jatuh Tempo';
      default:
        return status || 'Pending';
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
        <button 
          onClick={fetchBillingData}
          className="px-4 py-2 border border-primary/20 rounded-lg bg-surface text-primary hover:bg-surface-elevated transition-colors flex items-center gap-2"
        >
          <Icon name="RefreshCw" size={14} />
          Refresh
        </button>
      </div>

      <div className="bg-surface-elevated rounded-xl border border-primary/20 overflow-hidden">
        <div className="px-6 py-4 border-b border-primary/20">
          <h3 className="text-lg font-semibold text-primary">Daftar Invoice</h3>
        </div>
        
        {billingData.invoices.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Icon name="FileText" className="mx-auto text-muted/40" size={48} />
            <p className="font-medium text-foreground">No invoices generated yet</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Clinic appointment invoices will automatically appear here as payments are created.
            </p>
          </div>
        ) : (
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
                        {invoice.services?.join?.(', ') || 'Konsultasi'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-primary">{formatCurrency(invoice.amount)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(invoice.status)}`}>
                        {getStatusLabel(invoice.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                      {new Date(invoice.dueDate).toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => setSelectedInvoiceId(invoice.dbId)}
                          className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                          title="View details"
                        >
                          <Icon name="Eye" size={16} />
                        </button>
                      </div>
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

  const renderPaymentsView = () => <PaymentsView payments={billingData.payments} loading={loading} />;

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
              <button 
                onClick={fetchBillingData}
                className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-accent-hover"
              >
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

      {/* Invoice Detail Inspector Modal */}
      {selectedInvoiceId && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div 
              className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
              onClick={() => setSelectedInvoiceId(null)}
            />
            <div 
              className="relative w-full max-w-lg bg-surface-elevated border border-primary/20 rounded-3xl shadow-theme-xl overflow-hidden animate-slide-up"
              style={{ maxHeight: '90vh' }}
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-primary/10 flex items-center justify-between bg-surface">
                <div className="flex items-center gap-2">
                  <Icon name="FileText" className="text-accent" />
                  <span className="font-semibold text-primary">Invoice Inspector</span>
                </div>
                <button 
                  onClick={() => setSelectedInvoiceId(null)}
                  className="p-1 rounded-lg text-muted hover:text-primary hover:bg-surface-elevated transition-colors"
                >
                  <Icon name="X" size={20} />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto space-y-6" style={{ maxHeight: 'calc(90vh - 120px)' }}>
                {invoiceLoading || !invoiceDetail ? (
                  <div className="space-y-4 py-8 animate-pulse text-center">
                    <Icon name="Loader2" className="animate-spin text-accent mx-auto" size={32} />
                    <p className="text-xs text-secondary">Retrieving ledger state details...</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Upper Metadata */}
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-xl font-bold text-primary">
                          {invoiceDetail.reference || `INV-${invoiceDetail.id.padStart(6, '0')}`}
                        </h4>
                        <p className="text-xs text-secondary mt-0.5">
                          Issued on {new Date(invoiceDetail.issuedAt || invoiceDetail.createdAt).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${getStatusColor(invoiceDetail.status)}`}>
                        {getStatusLabel(invoiceDetail.status)}
                      </span>
                    </div>

                    {/* Patient Card */}
                    <div className="p-4 bg-surface border border-primary/5 rounded-2xl space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-secondary">Bill To</p>
                      <div>
                        <p className="font-semibold text-primary">{invoiceDetail.patient?.name}</p>
                        <p className="text-xs text-secondary">{invoiceDetail.patient?.email}</p>
                        {invoiceDetail.patient?.phone && (
                          <p className="text-xs text-secondary mt-0.5">{invoiceDetail.patient?.phone}</p>
                        )}
                      </div>
                    </div>

                    {/* Clinic & Dentist Info */}
                    <div className="p-4 bg-surface border border-primary/5 rounded-2xl grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-secondary">Clinic Provider</p>
                        <p className="text-sm font-semibold text-primary">Serene Dental Clinic</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-secondary">Dentist</p>
                        <p className="text-sm font-semibold text-primary">
                          {invoiceDetail.appointment?.dentist?.name || 'drg. Sarah'}
                        </p>
                      </div>
                    </div>

                    {/* Items table */}
                    <div className="space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-secondary">Line Items</p>
                      <div className="border border-primary/5 rounded-2xl overflow-hidden bg-surface">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-primary/5 text-secondary text-xs font-semibold">
                              <th className="px-4 py-2 text-left">Description</th>
                              <th className="px-4 py-2 text-center">Qty</th>
                              <th className="px-4 py-2 text-right">Price</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-primary/5">
                            {invoiceDetail.items?.map((item) => (
                              <tr key={item.id}>
                                <td className="px-4 py-3 text-primary">{item.description}</td>
                                <td className="px-4 py-3 text-center text-secondary">{item.quantity}</td>
                                <td className="px-4 py-3 text-right font-medium text-primary">
                                  {formatCurrency(item.unitPrice)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Totals */}
                    <div className="border-t border-primary/10 pt-4 flex flex-col items-end space-y-1">
                      <div className="flex justify-between w-full max-w-[200px] text-sm text-secondary">
                        <span>Subtotal:</span>
                        <span>{formatCurrency(invoiceDetail.subtotal)}</span>
                      </div>
                      <div className="flex justify-between w-full max-w-[200px] text-base font-bold text-primary pt-1 border-t border-primary/5">
                        <span>Total:</span>
                        <span className="text-accent">{formatCurrency(invoiceDetail.total)}</span>
                      </div>
                    </div>

                    {/* Midtrans Meta details */}
                    {invoiceDetail.paymentIntent && (
                      <div className="border-t border-primary/10 pt-4 space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wider text-secondary">Transaction Metadata</p>
                        <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs text-secondary">
                          <div>
                            <span className="block font-medium text-secondary">Order ID</span>
                            <span className="font-mono text-[11px] break-all">{invoiceDetail.paymentIntent.providerOrderId || '-'}</span>
                          </div>
                          <div>
                            <span className="block font-medium text-secondary">Payment Channel</span>
                            <span className="capitalize">{invoiceDetail.paymentIntent.providerResponse?.payment_type || 'snap'}</span>
                          </div>
                          {invoiceDetail.paymentIntent.providerPaymentId && (
                            <div className="col-span-2">
                              <span className="block font-medium text-secondary">Transaction ID</span>
                              <span className="font-mono text-[11px]">{invoiceDetail.paymentIntent.providerPaymentId}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};

export default BillingPage;
