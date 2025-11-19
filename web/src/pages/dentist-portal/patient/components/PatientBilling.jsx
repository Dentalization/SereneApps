import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import Button from '../../../../components/ui/Button';
import { useLanguage } from '../../../../contexts/LanguageContext';

// ==== Pure helpers (no hooks) ====
const getStatusColor = (status) => {
  switch ((status || '').toLowerCase()) {
    case 'paid':
    case 'completed':
      return 'text-success bg-success/10 border-success/30';
    case 'pending':
      return 'text-warning bg-warning/10 border-warning/30';
    case 'overdue':
      return 'text-error bg-error/10 border-error/30';
    case 'cancelled':
      return 'text-secondary bg-muted border-primary/10';
    default:
      return 'text-secondary bg-muted border-primary/10';
  }
};

const formatCurrency = (amount) => {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(n);
};

// ==== Component ====
const PatientBilling = ({ patient, onCreateInvoice, onPaymentReceived, onSendStatement }) => {
  const { t } = useLanguage();
  const [selectedTab, setSelectedTab] = useState('overview');

  // Hooks must be called unconditionally (OK)
  if (!t || typeof t !== 'function') {
    return (
      <div className="bg-surface-elevated border border-primary/10 rounded-xl shadow-theme-md theme-transition p-6">
        <div className="text-center py-8">
          <p className="text-secondary">Loading translations...</p>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="bg-surface-elevated border border-primary/10 rounded-xl shadow-theme-md theme-transition p-6">
        <div className="text-center py-8">
          <p className="text-secondary">{t('dentistPatient.common.noPatientSelected')}</p>
        </div>
      </div>
    );
  }

  // Default, then merge with patient.billing (defensive)
  const defaultBilling = {
    totalBalance: 0,
    paidAmount: 0,
    pendingAmount: 0,
    invoices: [],
    paymentHistory: [],
    insuranceInfo: null,
  };

  const billingData = useMemo(() => {
    const b = patient?.billing || {};
    return {
      ...defaultBilling,
      ...b,
      invoices: Array.isArray(b.invoices) ? b.invoices : defaultBilling.invoices,
      paymentHistory: Array.isArray(b.paymentHistory) ? b.paymentHistory : defaultBilling.paymentHistory,
      insuranceInfo: b.insuranceInfo ?? defaultBilling.insuranceInfo,
    };
  }, [patient]);

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
    <div className="space-y-6">
      {/* Billing Overview */}
      <div className="bg-surface-elevated border border-primary/10 rounded-xl shadow-theme-md theme-transition p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-primary">{t('dentistPatient.billing.title')}</h2>
          <Button onClick={() => onCreateInvoice?.()}>
            {t('dentistPatient.billing.actions.createInvoice')}
          </Button>
        </div>

        {/* Financial Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-surface rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-2 h-2 bg-brand-primary rounded-full"></div>
              <span className="text-sm font-medium text-text-primary">
                {t('dentistPatient.billing.summary.totalBalance')}
              </span>
            </div>
            <p className="text-2xl font-bold text-primary">{formatCurrency(billingData.totalBalance)}</p>
          </div>

          <div className="bg-surface rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-2 h-2 bg-success rounded-full"></div>
              <span className="text-sm font-medium text-text-primary">
                {t('dentistPatient.billing.summary.paidAmount')}
              </span>
            </div>
            <p className="text-2xl font-bold text-success">{formatCurrency(billingData.paidAmount)}</p>
          </div>

          <div className="bg-surface rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-2 h-2 bg-warning rounded-full"></div>
              <span className="text-sm font-medium text-text-primary">
                {t('dentistPatient.billing.summary.pending')}
              </span>
            </div>
            <p className="text-2xl font-bold text-warning">{formatCurrency(billingData.pendingAmount)}</p>
          </div>

          <div className="bg-surface rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-2 h-2 bg-trust-green rounded-full"></div>
              <span className="text-sm font-medium text-text-primary">
                {t('dentistPatient.billing.summary.paymentRate')}
              </span>
            </div>
            <p className="text-2xl font-bold text-primary">{paymentRate}%</p>
          </div>
        </div>

        {/* Insurance Information */}
        {billingData.insuranceInfo && (
          <div className="bg-trust-green/5 border border-trust-green/20 rounded-lg p-4">
            <h3 className="font-semibold text-primary mb-3">{t('dentistPatient.billing.insurance.title')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-secondary">{t('dentistPatient.billing.insurance.provider')}</span>
                <p className="font-medium text-primary">{billingData.insuranceInfo.provider || '—'}</p>
              </div>
              <div>
                <span className="text-secondary">{t('dentistPatient.billing.insurance.policy')}</span>
                <p className="font-medium text-primary">{billingData.insuranceInfo.policyNumber || '—'}</p>
              </div>
              <div>
                <span className="text-secondary">{t('dentistPatient.billing.insurance.coverage')}</span>
                <p className="font-medium text-primary">{billingData.insuranceInfo.coverage || '—'}</p>
              </div>
              <div>
                <span className="text-secondary">{t('dentistPatient.billing.insurance.deductible')}</span>
                <p className="font-medium text-primary">
                  {formatCurrency(billingData.insuranceInfo.deductibleMet)} / {formatCurrency(billingData.insuranceInfo.deductible)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-surface-elevated border border-primary/10 rounded-xl shadow-theme-md theme-transition">
        <div className="border-b border-primary/10">
          <div className="flex">
            {[
              { id: 'overview', label: t('dentistPatient.billing.tabs.overview') },
              { id: 'invoices', label: t('dentistPatient.billing.tabs.invoices') },
              { id: 'payments', label: t('dentistPatient.billing.tabs.payments') },
              { id: 'insurance', label: t('dentistPatient.billing.tabs.insurance') }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id)}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  selectedTab === tab.id
                    ? 'border-brand-primary text-brand-primary bg-brand-primary/5'
                    : 'border-transparent text-secondary hover:text-primary hover:bg-muted/50'
                }`}
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {selectedTab === 'overview' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-primary">{t('dentistPatient.billing.overview.accountSummary')}</h3>

              {/* Recent Activity */}
              <div className="space-y-3">
                <h4 className="font-medium text-primary">{t('dentistPatient.billing.overview.recentActivity')}</h4>
                <div className="space-y-2">
                  {(billingData.paymentHistory || []).slice(0, 3).map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-3 bg-surface rounded-lg border border-primary/10">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-success/20 text-success rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-primary">{t('dentistPatient.billing.overview.paymentReceived')}</p>
                          <p className="text-sm text-secondary">{payment.date} • {payment.method}</p>
                        </div>
                      </div>
                      <span className="font-semibold text-success">{formatCurrency(payment.amount)}</span>
                    </div>
                  ))}
                  {(!billingData.paymentHistory || billingData.paymentHistory.length === 0) && (
                    <p className="text-sm text-secondary">{t('dentistPatient.billing.payments.empty')}</p>
                  )}
                </div>
              </div>

              {/* Outstanding Balance */}
              {Number(billingData.pendingAmount) > 0 && (
                <div className="bg-warning/5 border border-warning/20 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-primary">{t('dentistPatient.billing.overview.outstandingTitle')}</h4>
                      <p className="text-sm text-secondary">{t('dentistPatient.billing.overview.outstandingDescription')}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-warning">{formatCurrency(billingData.pendingAmount)}</p>
                      <Button size="sm" onClick={() => onSendStatement?.()}>
                        {t('dentistPatient.billing.actions.sendStatement')}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {selectedTab === 'invoices' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-primary">{t('dentistPatient.billing.invoices.title')}</h3>
                <Button onClick={() => onCreateInvoice?.()}>
                  {t('dentistPatient.billing.actions.createNewInvoice')}
                </Button>
              </div>

              <div className="space-y-3">
                {(billingData.invoices || []).map((invoice) => (
                  <div key={invoice.id} className="border border-primary/10 rounded-lg p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="font-semibold text-primary">{invoice.id}</h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(invoice.status)}`}>
                            {getInvoiceStatusLabel(invoice.status)}
                          </span>
                        </div>

                        <p className="text-sm text-secondary mb-2">{invoice.description}</p>

                        <div className="flex items-center space-x-4 text-sm text-secondary">
                          <span>📅 {t('dentistPatient.billing.invoices.issued', { date: invoice.date })}</span>
                          <span>⏰ {t('dentistPatient.billing.invoices.due', { date: invoice.dueDate })}</span>
                          {invoice.paymentDate && <span>✅ {t('dentistPatient.billing.invoices.paid', { date: invoice.paymentDate })}</span>}
                        </div>

                        {Array.isArray(invoice.treatments) && invoice.treatments.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs text-secondary">{t('dentistPatient.billing.invoices.treatments')}</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {invoice.treatments.map((treatment, index) => (
                                <span key={`${invoice.id}-treat-${index}`} className="px-2 py-1 bg-surface text-xs rounded border border-primary/10">
                                  {treatment}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="text-right ml-4">
                        <p className="text-xl font-bold text-primary">{formatCurrency(invoice.amount)}</p>
                        <div className="flex space-x-2 mt-2">
                          <Button variant="outline" size="sm">
                            {t('dentistPatient.billing.actions.view')}
                          </Button>
                          {(invoice.status || '').toLowerCase() === 'pending' && (
                            <Button
                              size="sm"
                              onClick={() => onPaymentReceived?.(invoice.id)}
                            >
                              {t('dentistPatient.billing.actions.markPaid')}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {(!billingData.invoices || billingData.invoices.length === 0) && (
                  <p className="text-sm text-secondary">{t('dentistPatient.billing.invoices.empty')}</p>
                )}
              </div>
            </div>
          )}

          {selectedTab === 'payments' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-primary">{t('dentistPatient.billing.payments.title')}</h3>

              {billingData.paymentHistory && billingData.paymentHistory.length > 0 ? (
                <div className="space-y-3">
                  {billingData.paymentHistory.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-4 border border-primary/10 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-success/20 text-success rounded-full flex items-center justify-center">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                          </svg>
                        </div>

                        <div>
                          <p className="font-medium text-primary">
                            {t('dentistPatient.billing.payments.paymentFor', { invoice: payment.invoiceId })}
                          </p>
                          <div className="flex items-center space-x-3 text-sm text-secondary">
                            <span>📅 {payment.date}</span>
                            <span>💳 {payment.method}</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(payment.status)}`}>
                              {getPaymentStatusLabel(payment.status)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-lg font-bold text-success">{formatCurrency(payment.amount)}</p>
                        <Button variant="outline" size="sm">
                          {t('dentistPatient.billing.actions.receipt')}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <p className="text-secondary">{t('dentistPatient.billing.payments.empty')}</p>
                </div>
              )}
            </div>
          )}

          {selectedTab === 'insurance' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-primary">{t('dentistPatient.billing.insuranceClaims.title')}</h3>

              <div className="text-center py-8">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-secondary">{t('dentistPatient.billing.insuranceClaims.empty')}</p>
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
  onPaymentReceived: PropTypes.func,
  onSendStatement: PropTypes.func,
};

export default PatientBilling;
