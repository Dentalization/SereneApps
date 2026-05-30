import React, { useState, useEffect } from 'react';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';
import SideBar from '../ui/SideBar';
import { authHttp } from '../../../utils/httpClient';
import ModalPortal from '../../../components/ui/ModalPortal';
import { useLanguage } from '../../../contexts/LanguageContext';

const Earnings = () => {
  const { t } = useLanguage();
  const [summary, setSummary] = useState({
    totalEarnings: 0,
    independentCount: 0,
    clinicAffiliatedCount: 0,
    averageTicketSize: 0
  });
  const [history, setHistory] = useState({
    invoices: [],
    payments: []
  });
  const [loading, setLoading] = useState(true);

  // Invoice Inspector Modal State
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);
  const [invoiceDetail, setInvoiceDetail] = useState(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);

  // Refund Form State
  const [refundMode, setRefundMode] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refundLoading, setRefundLoading] = useState(false);

  const fetchEarningsData = async () => {
    setLoading(true);
    try {
      const [summaryRes, historyRes] = await Promise.all([
        authHttp.get('/financials/dentist/summary'),
        authHttp.get('/financials/dentist/history')
      ]);
      setSummary(summaryRes.data);
      setHistory(historyRes.data);
    } catch (error) {
      console.error('Failed to load dentist earnings data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEarningsData();
  }, []);

  useEffect(() => {
    if (selectedInvoiceId) {
      const fetchInvoiceDetail = async () => {
        setInvoiceLoading(true);
        try {
          const { data } = await authHttp.get(`/payments/invoices/${selectedInvoiceId}`);
          setInvoiceDetail(data.invoice);
        } catch (error) {
          console.error('Error fetching invoice detail:', error);
        } finally {
          setInvoiceLoading(false);
        }
      };
      fetchInvoiceDetail();
    } else {
      setInvoiceDetail(null);
      setRefundMode(false);
      setRefundAmount('');
      setRefundReason('');
    }
  }, [selectedInvoiceId]);

  const downloadPdf = async (invoiceId, invoiceRef) => {
    try {
      const response = await authHttp.get(`/payments/invoices/${invoiceId}/pdf`, {
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Invoice-${invoiceRef || invoiceId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download PDF invoice:', error);
      alert('Failed to download PDF invoice. Please try again.');
    }
  };

  const handleRefundSubmit = async (e) => {
    e.preventDefault();
    if (!refundAmount || isNaN(refundAmount) || parseFloat(refundAmount) <= 0) {
      alert('Please enter a valid refund amount');
      return;
    }
    setRefundLoading(true);
    try {
      await authHttp.post('/payments/refunds', {
        paymentIntentId: invoiceDetail.paymentIntentId,
        refundAmount: parseInt(refundAmount, 10),
        refundReason: refundReason || 'Dentist request'
      });
      alert('Refund processed successfully');
      setSelectedInvoiceId(null);
      fetchEarningsData();
    } catch (error) {
      console.error('Refund failed:', error);
      alert(error.response?.data?.error?.message || error.response?.data?.error || 'Failed to process refund');
    } finally {
      setRefundLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'paid':
      case 'settled':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'pending':
      case 'requires_action':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'refunded':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'failed':
      case 'expired':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const getStatusLabel = (status) => {
    switch (status?.toLowerCase()) {
      case 'paid':
      case 'settled':
        return 'Lunas';
      case 'pending':
      case 'requires_action':
        return 'Belum Bayar';
      case 'refunded':
        return 'Refund';
      case 'failed':
        return 'Gagal';
      case 'expired':
        return 'Kedaluwarsa';
      default:
        return status || 'Pending';
    }
  };

  const isClinicDentist = summary.dentistType === 'clinic';

  const insights = isClinicDentist
    ? [
        {
          label: 'Compensation Earned',
          value: formatCurrency(summary.compensationEarned),
          chip: 'Total accrued earnings',
          icon: 'TrendingUp',
          accent: 'text-brand-primary',
        },
        {
          label: 'Compensation Paid',
          value: formatCurrency(summary.compensationPaid),
          chip: 'Transferred compensation',
          icon: 'CreditCard',
          accent: 'text-brand-secondary',
        },
        {
          label: 'Pending Compensation',
          value: formatCurrency(summary.pendingCompensation),
          chip: 'Unpaid accruals',
          icon: 'Clock',
          accent: 'text-accent',
        },
      ]
    : [
        {
          label: 'Independent Revenue',
          value: formatCurrency(summary.totalEarnings),
          chip: 'Direct practice earnings',
          icon: 'TrendingUp',
          accent: 'text-brand-primary',
        },
        {
          label: 'Average Ticket Size',
          value: formatCurrency(summary.averageTicketSize),
          chip: 'Per independent invoice',
          icon: 'CreditCard',
          accent: 'text-brand-secondary',
        },
        {
          label: 'Consultation Share',
          value: `${summary.independentCount} Private / ${summary.clinicAffiliatedCount} Clinic`,
          chip: 'Hybrid business model',
          icon: 'Camera',
          accent: 'text-accent',
        },
      ];

  return (
    <div className="min-h-screen bg-background flex">
      <SideBar />
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-8">
          <header className="space-y-3">
            <p className="text-xs uppercase tracking-wider text-muted">
              {isClinicDentist ? 'Clinic Compensation' : 'My Practice'}
            </p>
            <h1 className="text-3xl font-bold text-foreground">
              {isClinicDentist ? 'Compensation' : 'Earnings'}
            </h1>
            <p className="text-muted-foreground">
              {isClinicDentist
                ? 'Monitor your accrued consultation compensation, payout statuses, and earnings history.'
                : 'Monitor settlement status, patient billing invoices, and general financial history from your independent practice.'}
            </p>
          </header>

          {loading ? (
            <div className="grid gap-4 md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="rounded-2xl border border-primary/10 bg-surface-elevated p-5 space-y-3 animate-pulse">
                  <div className="h-4 w-24 bg-accent/10 rounded"></div>
                  <div className="h-8 w-40 bg-accent/20 rounded"></div>
                  <div className="h-4 w-32 bg-accent/10 rounded"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {insights.map((card) => (
                <div key={card.label} className="rounded-2xl border border-primary/10 bg-surface-elevated shadow-theme-sm p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs uppercase tracking-wider text-muted">{card.label}</p>
                    <Icon name={card.icon} className={card.accent} />
                  </div>
                  <p className="text-2xl font-bold text-foreground">{card.value}</p>
                  <p className="text-xs font-semibold text-success/80">{card.chip}</p>
                </div>
              ))}
            </div>
          )}

          {/* Detailed Invoices or Compensation Entries list */}
          <div className="bg-surface-elevated border border-primary/10 rounded-2xl shadow-theme-md overflow-hidden">
            <div className="px-6 py-4 border-b border-primary/10 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  {isClinicDentist ? 'Compensation & Payout History' : 'Invoices & Billing History'}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isClinicDentist 
                    ? 'Real-time ledger of your earnings share and payouts from clinic consultations.' 
                    : 'Real-time ledger statements of patient consultations.'}
                </p>
              </div>
              <button 
                onClick={fetchEarningsData}
                className="p-2 text-muted hover:text-primary rounded-lg hover:bg-surface transition-colors"
                title="Refresh history"
              >
                <Icon name="RefreshCw" size={16} />
              </button>
            </div>

            {loading ? (
              <div className="p-6 space-y-4">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div key={idx} className="flex justify-between items-center p-4 border border-primary/5 rounded-xl animate-pulse">
                    <div className="space-y-2">
                      <div className="h-4 w-28 bg-accent/10 rounded"></div>
                      <div className="h-3 w-40 bg-accent/10 rounded"></div>
                    </div>
                    <div className="h-6 w-16 bg-accent/20 rounded-full"></div>
                  </div>
                ))}
              </div>
            ) : isClinicDentist ? (
              (!history.entries || history.entries.length === 0) ? (
                <div className="p-12 text-center space-y-2">
                  <Icon name="FileText" className="mx-auto text-muted/40" size={48} />
                  <p className="font-medium text-foreground">No compensation entries yet</p>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Compensation accruals will appear here automatically as clinic appointments are completed and settled.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-surface text-xs uppercase tracking-wider text-muted">
                      <tr>
                        <th className="px-6 py-3 text-left font-medium">Reference</th>
                        <th className="px-6 py-3 text-left font-medium">Entry Type</th>
                        <th className="px-6 py-3 text-left font-medium">Amount</th>
                        <th className="px-6 py-3 text-left font-medium">Status</th>
                        <th className="px-6 py-3 text-left font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-primary/5">
                      {history.entries.map((entry) => (
                        <tr key={entry.id} className="hover:bg-surface/30 transition-colors text-sm">
                          <td className="px-6 py-4 whitespace-nowrap font-medium text-foreground">
                            {entry.reference}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                            <span className="font-semibold uppercase tracking-wider text-xs">
                              {entry.entryType}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-semibold text-foreground">
                            {formatCurrency(entry.amount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                              entry.status?.toLowerCase() === 'paid' || entry.status?.toLowerCase() === 'completed'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                            }`}>
                              {entry.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                            {new Date(entry.createdAt).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : history.invoices.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <Icon name="FileText" className="mx-auto text-muted/40" size={48} />
                <p className="font-medium text-foreground">No invoices generated yet</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Billing invoices will appear here automatically as soon as patient payment requests are initiated.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-surface text-xs uppercase tracking-wider text-muted">
                    <tr>
                      <th className="px-6 py-3 text-left font-medium">Invoice No.</th>
                      <th className="px-6 py-3 text-left font-medium">Patient</th>
                      <th className="px-6 py-3 text-left font-medium">Consultation Date</th>
                      <th className="px-6 py-3 text-left font-medium">Amount</th>
                      <th className="px-6 py-3 text-left font-medium">Status</th>
                      <th className="px-6 py-3 text-left font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-primary/5">
                    {history.invoices.map((invoice) => (
                      <tr key={invoice.id} className="hover:bg-surface/30 transition-colors text-sm">
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-foreground">
                          {invoice.reference || `INV-${invoice.id.padStart(6, '0')}`}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                          {invoice.patient?.name || 'Patient'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                          {invoice.appointment?.startsAt 
                            ? new Date(invoice.appointment.startsAt).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : new Date(invoice.createdAt).toLocaleDateString('id-ID')
                          }
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-semibold text-foreground">
                          {formatCurrency(invoice.total)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getStatusColor(invoice.status)}`}>
                            {getStatusLabel(invoice.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => setSelectedInvoiceId(invoice.id)}
                            className="text-xs font-medium text-brand-primary hover:underline flex items-center gap-1"
                          >
                            <Icon name="Eye" size={14} />
                            Inspect
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
                  <Icon name="FileText" className="text-brand-primary" />
                  <span className="font-semibold text-foreground">Invoice Inspector</span>
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
                    <Icon name="Loader2" className="animate-spin text-brand-primary mx-auto" size={32} />
                    <p className="text-xs text-muted">Retrieving ledger state details...</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Upper Metadata */}
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-xl font-bold text-foreground">
                          {invoiceDetail.reference || `INV-${invoiceDetail.id.padStart(6, '0')}`}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
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
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted">Bill To</p>
                      <div>
                        <p className="font-semibold text-foreground">{invoiceDetail.patient?.name}</p>
                        <p className="text-xs text-muted-foreground">{invoiceDetail.patient?.email}</p>
                        {invoiceDetail.patient?.phone && (
                          <p className="text-xs text-muted-foreground mt-0.5">{invoiceDetail.patient?.phone}</p>
                        )}
                      </div>
                    </div>

                    {/* Items table */}
                    <div className="space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted">Line Items</p>
                      <div className="border border-primary/5 rounded-2xl overflow-hidden bg-surface">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-primary/5 text-muted text-xs font-semibold">
                              <th className="px-4 py-2 text-left">Description</th>
                              <th className="px-4 py-2 text-center">Qty</th>
                              <th className="px-4 py-2 text-right">Price</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-primary/5">
                            {invoiceDetail.items?.map((item) => (
                              <tr key={item.id}>
                                <td className="px-4 py-3 text-foreground">{item.description}</td>
                                <td className="px-4 py-3 text-center text-muted-foreground">{item.quantity}</td>
                                <td className="px-4 py-3 text-right font-medium text-foreground">
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
                      <div className="flex justify-between w-full max-w-[200px] text-sm text-muted-foreground">
                        <span>Subtotal:</span>
                        <span>{formatCurrency(invoiceDetail.subtotal)}</span>
                      </div>
                      <div className="flex justify-between w-full max-w-[200px] text-base font-bold text-foreground pt-1 border-t border-primary/5">
                        <span>Total:</span>
                        <span className="text-brand-primary">{formatCurrency(invoiceDetail.total)}</span>
                      </div>
                    </div>

                    {/* Midtrans Meta details */}
                    {invoiceDetail.paymentIntent && (
                      <div className="border-t border-primary/10 pt-4 space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted">Midtrans Transaction Metadata</p>
                        <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs text-muted-foreground">
                          <div>
                            <span className="block font-medium text-muted">Order ID</span>
                            <span className="font-mono text-[11px] break-all">{invoiceDetail.paymentIntent.providerOrderId || '-'}</span>
                          </div>
                          <div>
                            <span className="block font-medium text-muted">Payment Channel</span>
                            <span className="capitalize">{invoiceDetail.paymentIntent.providerResponse?.payment_type || 'snap'}</span>
                          </div>
                          {invoiceDetail.paymentIntent.providerPaymentId && (
                            <div className="col-span-2">
                              <span className="block font-medium text-muted">Transaction ID</span>
                              <span className="font-mono text-[11px]">{invoiceDetail.paymentIntent.providerPaymentId}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="border-t border-primary/10 pt-4 flex gap-3">
                      <button
                        onClick={() => downloadPdf(invoiceDetail.id, invoiceDetail.reference)}
                        className="flex-1 py-2.5 px-4 bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
                      >
                        <Icon name="Download" size={14} />
                        Download PDF
                      </button>
                      
                      {!refundMode && ['paid', 'settled'].includes(invoiceDetail.status?.toLowerCase()) && (
                        <button
                          onClick={() => setRefundMode(true)}
                          className="flex-1 py-2.5 px-4 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/20 dark:hover:bg-red-950/40 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors border border-red-200 dark:border-red-900/30"
                        >
                          <Icon name="RotateCcw" size={14} />
                          Refund Payment
                        </button>
                      )}
                    </div>

                    {/* Refund Form Panel */}
                    {refundMode && (
                      <form onSubmit={handleRefundSubmit} className="border-t border-primary/10 pt-4 space-y-3 bg-red-50/50 dark:bg-red-950/10 p-4 rounded-2xl border border-red-200/30">
                        <div className="flex items-center justify-between">
                          <h5 className="text-xs font-bold text-red-600 flex items-center gap-1">
                            <Icon name="RotateCcw" size={12} />
                            REFUND INITIATION
                          </h5>
                          <button
                            type="button"
                            onClick={() => setRefundMode(false)}
                            className="text-xs text-muted hover:text-primary font-medium"
                          >
                            Cancel
                          </button>
                        </div>

                        <div className="space-y-2 text-xs">
                          <div>
                            <label className="block text-muted-foreground font-medium mb-1">Refund Amount (IDR)</label>
                            <input
                              type="number"
                              value={refundAmount}
                              onChange={(e) => setRefundAmount(e.target.value)}
                              placeholder={`Max refundable: ${invoiceDetail.total}`}
                              max={invoiceDetail.total}
                              className="w-full px-3 py-2 rounded-lg border border-primary/20 bg-surface text-foreground focus:outline-none focus:ring-1 focus:ring-red-500"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-muted-foreground font-medium mb-1">Reason for Refund</label>
                            <textarea
                              value={refundReason}
                              onChange={(e) => setRefundReason(e.target.value)}
                              placeholder="Patient cancellation, treatment modification, etc."
                              className="w-full px-3 py-2 rounded-lg border border-primary/20 bg-surface text-foreground focus:outline-none focus:ring-1 focus:ring-red-500 h-16 resize-none"
                              required
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={refundLoading}
                          className="w-full py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm"
                        >
                          {refundLoading ? 'Processing Refund...' : 'Confirm Refund'}
                        </button>
                      </form>
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

export default Earnings;
