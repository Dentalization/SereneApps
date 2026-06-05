import React from 'react';
import Icon from '../../../../components/AppIcon';

const TreatmentPlanCard = ({ treatmentPlans = [], metrics = null }) => {
  const rows = treatmentPlans.map((plan) => {
    const invoice = plan.invoice || plan.invoices?.[0];
    const invoicePaid = invoice && ['paid', 'settled'].includes(invoice.paymentStatus || invoice.status);
    return {
      id: plan.id,
      patient: plan.patient?.name || 'Patient',
      plan: plan.title || 'Treatment plan',
      phase: plan.items?.[0]?.phase || plan.status,
      progress: plan.progress || 0,
      nextAppointment: plan.appointmentId ? `Appointment #${String(plan.appointmentId).slice(-6)}` : 'Not scheduled',
      totalCost: Number(plan.estimatedTotal || plan.estimatedCost || 0),
      paidAmount: invoicePaid ? Number(invoice.grandTotal || invoice.total || 0) : 0,
      status: plan.status
    };
  });

  const getStatusInfo = (status) => {
    switch (String(status || '').toUpperCase()) {
      case 'APPROVED':
      case 'IN_PROGRESS':
        return { color: 'bg-blue-500', textColor: 'text-blue-500', bgColor: 'bg-blue-500/10', label: 'Active' };
      case 'SENT':
      case 'PATIENT_REVIEW':
        return { color: 'bg-amber-500', textColor: 'text-amber-500', bgColor: 'bg-amber-500/10', label: 'Waiting' };
      case 'COMPLETED':
        return { color: 'bg-emerald-500', textColor: 'text-emerald-500', bgColor: 'bg-emerald-500/10', label: 'Completed' };
      case 'REJECTED':
      case 'CANCELLED':
        return { color: 'bg-red-500', textColor: 'text-red-500', bgColor: 'bg-red-500/10', label: 'Closed' };
      default:
        return { color: 'bg-gray-500', textColor: 'text-gray-500', bgColor: 'bg-gray-500/10', label: 'Draft' };
    }
  };

  const getPaymentPercentage = (paid, total) => {
    const paidNum = Number(paid || 0);
    const totalNum = Number(total || 0);
    if (!totalNum) return 0;
    return Math.round((paidNum / totalNum) * 100);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(Number(amount || 0));
  };

  return (
    <div className="bg-surface-elevated rounded-3xl p-6 border border-primary/30 shadow-theme-lg hover:shadow-theme-xl transition-all duration-300 theme-transition dark:border-primary/40 dark:bg-surface-elevated/80">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-2xl bg-teal-500/10">
            <Icon name="Clipboard" size={24} className="text-teal-500" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-primary theme-transition">Treatment Plans</h3>
            <p className="text-sm text-muted theme-transition">Active patient treatments</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted theme-transition">Success Rate</p>
          <p className="text-2xl font-bold text-emerald-500">{metrics?.successRate || 0}%</p>
        </div>
      </div>

      <div className="space-y-4 mb-6">
        {rows.length === 0 && (
          <div className="p-5 bg-surface-elevated rounded-xl border border-primary/5 text-center theme-transition">
            <p className="font-semibold text-primary theme-transition">No treatment plans yet</p>
            <p className="text-sm text-secondary theme-transition mt-1">Plans created in the patient portal will appear here.</p>
          </div>
        )}
        {rows.map((plan) => {
          const statusInfo = getStatusInfo(plan.status);
          const paymentProgress = getPaymentPercentage(plan.paidAmount, plan.totalCost);
          
          return (
            <div key={plan.id} className="p-4 bg-surface-elevated rounded-xl border border-primary/5 hover:border-accent/20 transition-all duration-200 theme-transition">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-semibold text-primary theme-transition">{plan.patient}</p>
                  <p className="text-sm text-secondary theme-transition">{plan.plan}</p>
                </div>
                <div className={`px-2 py-1 rounded-md text-xs font-medium ${statusInfo.bgColor} ${statusInfo.textColor}`}>
                  {statusInfo.label}
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-secondary theme-transition">{plan.phase}</span>
                    <span className="text-sm font-medium text-primary theme-transition">{plan.progress}%</span>
                  </div>
                  <div className="w-full bg-surface rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-teal-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${plan.progress}%` }}
                    ></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-secondary theme-transition">Payment Progress</span>
                    <span className="text-sm font-medium text-primary theme-transition">{paymentProgress}%</span>
                  </div>
                  <div className="w-full bg-surface rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-emerald-500 to-teal-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${paymentProgress}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="flex justify-between items-center text-sm pt-2 border-t border-primary/5">
                  <span className="text-muted theme-transition">Next: {plan.nextAppointment}</span>
                  <span className="font-medium text-primary theme-transition">
                    {formatCurrency(plan.paidAmount)} / {formatCurrency(plan.totalCost)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-3 bg-surface-elevated rounded-xl theme-transition">
          <p className="text-2xl font-bold text-teal-500">{metrics?.activePlans || 0}</p>
          <p className="text-xs text-muted theme-transition">Active Plans</p>
        </div>
        <div className="text-center p-3 bg-surface-elevated rounded-xl theme-transition">
          <p className="text-2xl font-bold text-blue-500">{formatCurrency(metrics?.totalValue || 0)}</p>
          <p className="text-xs text-muted theme-transition">Total Value</p>
        </div>
        <div className="text-center p-3 bg-surface-elevated rounded-xl theme-transition">
          <p className="text-2xl font-bold text-emerald-500">{metrics?.averageProgress || 0}%</p>
          <p className="text-xs text-muted theme-transition">Avg Progress</p>
        </div>
      </div>

      <div className="flex justify-between items-center pt-4 border-t border-primary/10">
        <button className="px-4 py-2 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-500 text-sm font-medium transition-colors flex items-center space-x-2">
          <Icon name="Plus" size={14} />
          <span>New Plan</span>
        </button>
        <button className="px-4 py-2 rounded-lg bg-accent/10 hover:bg-accent/20 text-accent text-sm font-medium transition-colors">
          View All Plans
        </button>
      </div>
    </div>
  );
};

export default TreatmentPlanCard;
