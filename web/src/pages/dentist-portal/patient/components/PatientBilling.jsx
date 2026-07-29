import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import Button from '../../../../components/ui/Button';
import { useLanguage } from '../../../../contexts/LanguageContext';
import ClinicalIcon from './ClinicalIcon';

// ==== Pure helpers (no hooks) ====
const getStatusColor = (status) => {
  switch ((status || '').toLowerCase()) {
    case 'paid':
    case 'completed':
    case 'settled':
      return 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50';
    case 'pending':
    case 'issued':
    case 'approved':
    case 'draft':
      return 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/50';
    case 'overdue':
      return 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/50';
    case 'cancelled':
      return 'bg-slate-50 dark:bg-slate-900/20 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700/50';
    default:
      return 'bg-slate-50 dark:bg-slate-900/20 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700/50';
  }
};

const formatCurrency = (amount) => {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
};

const DEFAULT_BILLING = Object.freeze({
  totalBalance: 0,
  paidAmount: 0,
  pendingAmount: 0,
  invoices: [],
  paymentHistory: [],
  insuranceInfo: null,
});

// ==== Component ====
const PatientBilling = ({ patient, onCreateInvoice, onSendStatement }) => {
  const { t } = useLanguage();
  const [selectedTab, setSelectedTab] = useState('overview');
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [invoiceFilterStatus, setInvoiceFilterStatus] = useState('all');
  const billingData = useMemo(() => {
    const billing = patient?.billing || {};
    return {
      ...DEFAULT_BILLING,
      ...billing,
      invoices: Array.isArray(billing.invoices) ? billing.invoices : DEFAULT_BILLING.invoices,
      paymentHistory: Array.isArray(billing.paymentHistory) ? billing.paymentHistory : DEFAULT_BILLING.paymentHistory,
      insuranceInfo: billing.insuranceInfo ?? DEFAULT_BILLING.insuranceInfo,
    };
  }, [patient]);
  const filteredInvoices = useMemo(() => {
    return billingData.invoices.filter((invoice) => {
      const matchesSearch =
        String(invoice.id || '').toLowerCase().includes(invoiceSearch.toLowerCase()) ||
        String(invoice.description || '').toLowerCase().includes(invoiceSearch.toLowerCase());
      const matchesStatus = invoiceFilterStatus === 'all' ||
        String(invoice.status || '').toLowerCase() === invoiceFilterStatus.toLowerCase();
      return matchesSearch && matchesStatus;
    });
  }, [billingData.invoices, invoiceFilterStatus, invoiceSearch]);

  // Hooks must be called unconditionally (OK)
  if (!t || typeof t !== 'function') {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-12 transition-colors">
        <div className="text-center py-8">
          <div className="animate-pulse w-8 h-8 bg-slate-200 dark:bg-slate-800 rounded-full mx-auto mb-4"></div>
          <p className="text-slate-400 dark:text-slate-500 font-medium">Loading translations...</p>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-12 animate-in fade-in transition-colors">
        <div className="text-center py-8">
          <ClinicalIcon name="billing-ledger" size="xl" className="mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400 font-medium">{t('dentistPatient.common.noPatientSelected')}</p>
        </div>
      </div>
    );
  }

  // Helpers that use t (OK to define inside component)
  const getInvoiceStatusLabel = (status) => {
    const key = (status || 'unknown').toLowerCase() || 'unknown';
    const label = t(`dentistPatient.billing.invoiceStatuses.${key}`);
    return String(label).startsWith('dentistPatient') ? (status || 'Unknown') : label;
  };

  const getPaymentStatusLabel = (status) => {
    const key = (status || 'unknown').toLowerCase() || 'unknown';
    const label = t(`dentistPatient.billing.paymentStatuses.${key}`);
    return String(label).startsWith('dentistPatient') ? (status || 'Unknown') : label;
  };

  const paymentRate =
    billingData.totalBalance > 0
      ? Math.min(100, Math.max(0, Math.round((billingData.paidAmount / billingData.totalBalance) * 100)))
      : 0;

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      {/* Billing source notice */}
      <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-2xl p-4 flex items-start gap-3">
        <ClinicalIcon name="insurance-shield" size="sm" />
        <div>
          <h4 className="text-xs font-bold text-blue-800 dark:text-blue-400 uppercase tracking-wider mb-0.5">Tagihan Terintegrasi</h4>
          <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
            Invoice dibuat saat treatment plan dikirim. Status pembayaran di bawah berasal dari billing dan payment gateway, bukan perubahan lokal.
          </p>
        </div>
      </div>

      {/* Billing Overview */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] p-8 transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{t('dentistPatient.billing.title')}</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Financial overview and history</p>
          </div>
          <Button onClick={() => onCreateInvoice?.()} className="shadow-lg shadow-blue-500/20">
            Buat dari Treatment Plan
          </Button>
        </div>

        {/* Financial Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-100 dark:border-slate-700/50 hover:border-slate-200 dark:hover:border-slate-600 transition-colors group">
            <div className="flex items-center space-x-2.5 mb-2">
              <span className="w-2.5 h-2.5 bg-blue-600 rounded-full shadow-sm group-hover:scale-110 transition-transform"></span>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {t('dentistPatient.billing.summary.totalBalance')}
              </span>
            </div>
            <p className="text-3xl font-bold text-slate-800 dark:text-white tracking-tight">{formatCurrency(billingData.totalBalance)}</p>
          </div>

          <div className="bg-emerald-50/50 dark:bg-emerald-900/10 rounded-2xl p-5 border border-emerald-100 dark:border-emerald-800/30 hover:border-emerald-200 dark:hover:border-emerald-800/50 transition-colors group">
            <div className="flex items-center space-x-2.5 mb-2">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-sm group-hover:scale-110 transition-transform"></span>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700/60 dark:text-emerald-400/60">
                {t('dentistPatient.billing.summary.paidAmount')}
              </span>
            </div>
            <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-400 tracking-tight">{formatCurrency(billingData.paidAmount)}</p>
          </div>

          <div className="bg-amber-50/50 dark:bg-amber-900/10 rounded-2xl p-5 border border-amber-100 dark:border-amber-800/30 hover:border-amber-200 dark:hover:border-amber-800/50 transition-colors group">
            <div className="flex items-center space-x-2.5 mb-2">
              <span className="w-2.5 h-2.5 bg-amber-500 rounded-full shadow-sm group-hover:scale-110 transition-transform"></span>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700/60 dark:text-amber-400/60">
                {t('dentistPatient.billing.summary.pending')}
              </span>
            </div>
            <p className="text-3xl font-bold text-amber-700 dark:text-amber-400 tracking-tight">{formatCurrency(billingData.pendingAmount)}</p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-100 dark:border-slate-700/50 hover:border-slate-200 dark:hover:border-slate-600 transition-colors group relative overflow-hidden">
            <div className="absolute right-0 top-0 p-4 opacity-5 text-slate-900 dark:text-white">
              <ClinicalIcon name="payment-rate" size="xl" className="border-0 shadow-none" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center space-x-2.5 mb-2">
                <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full shadow-sm group-hover:scale-110 transition-transform"></span>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {t('dentistPatient.billing.summary.paymentRate')}
                </span>
              </div>
              <div className="flex items-end gap-2">
                <p className="text-3xl font-bold text-slate-800 dark:text-white tracking-tight">{paymentRate}%</p>
                <div className="h-1.5 flex-1 bg-slate-200 dark:bg-slate-700 rounded-full mb-2 ml-2 overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full transition-all duration-1000" style={{ width: `${paymentRate}%` }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Insurance Information */}
        {billingData.insuranceInfo && (
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-100 dark:border-emerald-800/50 rounded-2xl p-6 relative overflow-hidden transition-colors">
            <div className="absolute top-0 right-0 p-6 opacity-5 text-emerald-900 dark:text-emerald-300">
              <ClinicalIcon name="insurance-shield" size="xl" className="border-0 shadow-none" />
            </div>
            <h3 className="font-bold text-emerald-900 dark:text-emerald-200 mb-4 flex items-center gap-2 relative z-10">
              <ClinicalIcon name="insurance-shield" size="sm" /> {t('dentistPatient.billing.insurance.title')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-sm relative z-10">
              <div>
                <span className="block text-emerald-700/60 dark:text-emerald-400/70 text-xs font-bold uppercase tracking-wider mb-1">{t('dentistPatient.billing.insurance.provider')}</span>
                <p className="font-bold text-emerald-900 dark:text-emerald-200 text-lg">{billingData.insuranceInfo.provider || '—'}</p>
              </div>
              <div>
                <span className="block text-emerald-700/60 dark:text-emerald-400/60 text-xs font-bold uppercase tracking-wider mb-1">{t('dentistPatient.billing.insurance.policy')}</span>
                <p className="font-medium text-emerald-900 dark:text-emerald-300 font-mono bg-white/50 dark:bg-black/20 inline-block px-2 py-0.5 rounded">{billingData.insuranceInfo.policyNumber || '—'}</p>
              </div>
              <div>
                <span className="block text-emerald-700/60 dark:text-emerald-400/60 text-xs font-bold uppercase tracking-wider mb-1">{t('dentistPatient.billing.insurance.coverage')}</span>
                <p className="font-medium text-emerald-900 dark:text-emerald-300">{billingData.insuranceInfo.coverage || '—'}</p>
              </div>
              <div>
                <span className="block text-emerald-700/60 dark:text-emerald-400/70 text-xs font-bold uppercase tracking-wider mb-1">{t('dentistPatient.billing.insurance.deductible')}</span>
                <p className="font-medium text-emerald-900 dark:text-emerald-300">
                  <span className="font-bold">{formatCurrency(billingData.insuranceInfo.deductibleMet)}</span> 
                  <span className="opacity-60 mx-1">/</span> 
                  {formatCurrency(billingData.insuranceInfo.deductible)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tabs & Content */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.08)] overflow-hidden transition-colors">
        <div className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex overflow-x-auto no-scrollbar px-2">
            {[
              { id: 'overview', label: t('dentistPatient.billing.tabs.overview'), icon: 'billing-ledger' },
              { id: 'invoices', label: t('dentistPatient.billing.tabs.invoices'), icon: 'invoice-document' },
              { id: 'payments', label: t('dentistPatient.billing.tabs.payments'), icon: 'payment-card' },
              { id: 'insurance', label: t('dentistPatient.billing.tabs.insurance'), icon: 'insurance-shield' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id)}
                className={`relative px-6 py-5 text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-2.5 outline-none ${
                  selectedTab === tab.id
                    ? 'text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)] dark:shadow-none rounded-t-2xl z-10'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 rounded-t-2xl'
                }`}
                type="button"
              >
                {selectedTab === tab.id && (
                  <span className="absolute top-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-500 rounded-full mx-6" />
                )}
                <ClinicalIcon name={tab.icon} size="sm" className={selectedTab === tab.id ? 'h-7 w-7' : 'h-7 w-7 opacity-80'} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-8 min-h-[400px]">
          {selectedTab === 'overview' && (
            <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center gap-3">
                <ClinicalIcon name="billing-ledger" size="md" />
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{t('dentistPatient.billing.overview.accountSummary')}</h3>
              </div>

              {/* Outstanding Balance Alert */}
              {Number(billingData.pendingAmount) > 0 && (
                <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <ClinicalIcon name="appointment-overdue" size="md" />
                    <div>
                      <h4 className="font-bold text-amber-900 dark:text-amber-200 text-lg">{t('dentistPatient.billing.overview.outstandingTitle')}</h4>
                      <p className="text-amber-800/80 dark:text-amber-300/80 text-sm mt-1 max-w-xl">{t('dentistPatient.billing.overview.outstandingDescription')}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-3 min-w-[200px]">
                    <p className="text-3xl font-bold text-amber-700 dark:text-amber-300">{formatCurrency(billingData.pendingAmount)}</p>
                    <Button size="sm" onClick={() => onSendStatement?.()} className="w-full bg-amber-600 hover:bg-amber-700 border-transparent text-white shadow-amber-500/20">
                      Download Statement
                    </Button>
                  </div>
                </div>
              )}

              {/* Recent Activity */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{t('dentistPatient.billing.overview.recentActivity')}</h4>
                <div className="space-y-3">
                  {(billingData.paymentHistory || []).slice(0, 3).map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
                      <div className="flex items-center space-x-4">
                        <ClinicalIcon name="payment-card" size="md" />
                        <div>
                          <p className="font-bold text-slate-800 dark:text-white">{t('dentistPatient.billing.overview.paymentReceived')}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">{payment.date}</span>
                            <span className="text-xs text-slate-400 dark:text-slate-600">•</span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">{payment.method}</span>
                          </div>
                        </div>
                      </div>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 text-lg">+{formatCurrency(payment.amount)}</span>
                    </div>
                  ))}
                  {(!billingData.paymentHistory || billingData.paymentHistory.length === 0) && (
                    <div className="text-center py-8 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-xl">
                      <p className="text-slate-400 dark:text-slate-500 text-sm">{t('dentistPatient.billing.payments.empty')}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {selectedTab === 'invoices' && (
            <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <ClinicalIcon name="invoice-document" size="md" />
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">{t('dentistPatient.billing.invoices.title')}</h3>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                  {/* Search Input */}
                  <div className="relative flex-1 md:w-60">
                    <input
                      type="text"
                      placeholder="Search description/ID..."
                      value={invoiceSearch}
                      onChange={(e) => setInvoiceSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                    <svg className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  </div>

                  {/* Status Dropdown */}
                  <select
                    value={invoiceFilterStatus}
                    onChange={(e) => setInvoiceFilterStatus(e.target.value)}
                    className="pl-3 pr-8 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                  >
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                    <option value="cancelled">Cancelled</option>
                  </select>

                  <Button onClick={() => setShowCreateModal(true)} className="bg-blue-600 hover:bg-blue-700 shadow-blue-500/20">
                    <span className="mr-2">+</span> {t('dentistPatient.billing.actions.createNewInvoice')}
                  </Button>
                </div>
              </div>

              <div className="grid gap-4">
                {filteredInvoices.map((invoice) => (
                  <div key={invoice.id} className="group bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800 transition-all duration-200">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-bold text-slate-800 dark:text-white text-lg">{invoice.id}</h4>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${getStatusColor(invoice.status)}`}>
                            {getInvoiceStatusLabel(invoice.status)}
                          </span>
                        </div>

                        <p className="text-slate-600 dark:text-slate-300 text-sm mb-3">{invoice.description}</p>

                        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 rounded-md border border-slate-100 dark:border-slate-700">
                            <ClinicalIcon name="invoice-document" size="xs" className="h-4 w-4 border-0 bg-transparent shadow-none" />
                            <span>Issued: <span className="font-medium text-slate-700 dark:text-slate-200">{invoice.date}</span></span>
                          </div>
                          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 rounded-md border border-slate-100 dark:border-slate-700">
                            <ClinicalIcon name="appointment-calendar" size="xs" className="h-4 w-4 border-0 bg-transparent shadow-none" />
                            <span>Due: <span className="font-medium text-slate-700 dark:text-slate-200">{invoice.dueDate}</span></span>
                          </div>
                          {invoice.paymentDate && (
                            <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1 rounded-md border border-emerald-100 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-400">
                              <ClinicalIcon name="appointment-completed" size="xs" className="h-4 w-4 border-0 bg-transparent shadow-none" />
                              <span className="font-bold">Paid on {invoice.paymentDate}</span>
                            </div>
                          )}
                        </div>

                        {Array.isArray(invoice.treatments) && invoice.treatments.length > 0 && (
                          <div className="mt-4 pt-3 border-t border-slate-50 dark:border-slate-800 flex flex-wrap gap-2">
                            {invoice.treatments.map((treatment, index) => (
                              <span key={`${invoice.id}-treat-${index}`} className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium rounded-md border border-slate-200/60 dark:border-slate-700">
                                {treatment}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-3 lg:border-l lg:border-slate-50 dark:lg:border-slate-800 lg:pl-6">
                        <p className="text-2xl font-bold text-slate-800 dark:text-white">{formatCurrency(invoice.amount)}</p>
                        <p className="max-w-[220px] text-right text-xs leading-relaxed text-slate-400 dark:text-slate-500">
                          Status pembayaran diperbarui otomatis dari billing flow.
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {filteredInvoices.length === 0 && (
                  <div className="text-center py-12 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                    <ClinicalIcon name="invoice-document" size="xl" className="mx-auto mb-4" />
                    <p className="text-slate-500 dark:text-slate-400 font-medium">No matching invoices found.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {selectedTab === 'payments' && (
            <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center gap-3 mb-6">
                <ClinicalIcon name="payment-card" size="md" />
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{t('dentistPatient.billing.payments.title')}</h3>
              </div>

              {billingData.paymentHistory && billingData.paymentHistory.length > 0 ? (
                <div className="space-y-3">
                  {billingData.paymentHistory.map((payment) => (
                    <div key={payment.id} className="group flex items-center justify-between p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md hover:border-emerald-100/50 dark:hover:border-emerald-800/50 transition-all duration-200">
                      <div className="flex items-center space-x-5">
                        <ClinicalIcon name="appointment-completed" size="lg" />

                        <div>
                          <p className="font-bold text-slate-800 dark:text-white text-lg">
                            {t('dentistPatient.billing.payments.paymentFor', { invoice: payment.invoiceId })}
                          </p>
                          <div className="flex items-center gap-3 mt-1 text-sm text-slate-500 dark:text-slate-400">
                            <span className="flex items-center gap-1.5">
                              <ClinicalIcon name="invoice-document" size="xs" className="h-4 w-4 border-0 bg-transparent shadow-none" />
                              {payment.date}
                            </span>
                            <span className="w-1 h-1 bg-slate-300 dark:bg-slate-600 rounded-full"></span>
                            <span className="font-medium bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-100 dark:border-slate-700">{payment.method}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase border ${getStatusColor(payment.status)}`}>
                              {getPaymentStatusLabel(payment.status)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400 mb-2">+{formatCurrency(payment.amount)}</p>
                        <Button variant="ghost" size="sm" className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 h-8 px-2">
                          {t('dentistPatient.billing.actions.receipt')} <span className="ml-1">↗</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                  <ClinicalIcon name="payment-card" size="xl" className="mx-auto mb-4" />
                  <p className="text-slate-500 dark:text-slate-400 font-medium">{t('dentistPatient.billing.payments.empty')}</p>
                </div>
              )}
            </div>
          )}

          {selectedTab === 'insurance' && (
            <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center gap-3 mb-6">
                <ClinicalIcon name="insurance-shield" size="md" />
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{t('dentistPatient.billing.insuranceClaims.title')}</h3>
              </div>

              <div className="text-center py-20 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700">
                <div className="w-20 h-20 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-slate-100 dark:border-slate-700">
                  <ClinicalIcon name="insurance-shield" size="xl" />
                </div>
                <h4 className="text-lg font-bold text-slate-800 dark:text-white mb-2">No Claims Found</h4>
                <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">{t('dentistPatient.billing.insuranceClaims.empty')}</p>
                <div className="mt-6">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Pengajuan klaim dilakukan melalui sistem provider asuransi yang terverifikasi.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

PatientBilling.propTypes = {
  patient: PropTypes.shape({
    billing: PropTypes.shape({
      totalBalance: PropTypes.number,
      paidAmount: PropTypes.number,
      pendingAmount: PropTypes.number,
      invoices: PropTypes.arrayOf(
        PropTypes.shape({
          id: PropTypes.string,
          date: PropTypes.string,
          dueDate: PropTypes.string,
          amount: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
          status: PropTypes.string,
          description: PropTypes.string,
          treatments: PropTypes.arrayOf(PropTypes.string),
          paymentDate: PropTypes.string,
        })
      ),
      paymentHistory: PropTypes.arrayOf(
        PropTypes.shape({
          id: PropTypes.string,
          date: PropTypes.string,
          amount: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
          method: PropTypes.string,
          invoiceId: PropTypes.string,
          status: PropTypes.string,
        })
      ),
      insuranceInfo: PropTypes.shape({
        provider: PropTypes.string,
        policyNumber: PropTypes.string,
        coverage: PropTypes.string,
        deductible: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
        deductibleMet: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
      }),
    }),
  }),
  onCreateInvoice: PropTypes.func,
  onSendStatement: PropTypes.func,
};

export default PatientBilling;
