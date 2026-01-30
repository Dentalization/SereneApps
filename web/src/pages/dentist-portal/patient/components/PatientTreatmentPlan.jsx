import React, { useState } from 'react';
import Button from '../../../../components/ui/Button';
import { useLanguage } from '../../../../contexts/LanguageContext';

const PatientTreatmentPlan = ({ patient, onCreatePlan, onUpdatePlan, onCompleteTreatment }) => {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);
  const [newPlan, setNewPlan] = useState({
    title: '', description: '', priority: 'medium', estimatedCost: '',
    estimatedDuration: '', treatments: [], notes: ''
  });
  const { t, language } = useLanguage();
  const locale = language === 'id' ? 'id-ID' : 'en-US';
  const labels = t('dentistPatient.treatmentPlan') || {};

  if (!patient) {
    return (
      <div className="bg-surface border border-primary/10 rounded-3xl shadow-theme-sm p-12 animate-in fade-in">
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-surface-elevated rounded-full flex items-center justify-center mx-auto mb-4 text-muted/50">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
          </div>
          <p className="text-secondary font-medium">{t('dentistPatient.common.noPatientSelected')}</p>
        </div>
      </div>
    );
  }

  const treatmentPlans = patient.treatmentPlans || [];

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-900/20 dark:border-emerald-800/50';
      case 'in-progress': return 'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-900/20 dark:border-amber-800/50';
      case 'pending': return 'text-slate-600 bg-slate-50 border-slate-200 dark:text-slate-400 dark:bg-slate-900/20 dark:border-slate-700/50';
      case 'cancelled': return 'text-red-700 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-900/20 dark:border-red-800/50';
      default: return 'text-slate-600 bg-slate-50 border-slate-200 dark:text-slate-400 dark:bg-slate-900/20 dark:border-slate-700/50';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'text-red-700 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-900/20 dark:border-red-800/50';
      case 'medium': return 'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-900/20 dark:border-amber-800/50';
      case 'low': return 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-900/20 dark:border-emerald-800/50';
      default: return 'text-slate-600 bg-slate-50 border-slate-200 dark:text-slate-400 dark:bg-slate-900/20 dark:border-slate-700/50';
    }
  };
  
  const getPlanStatusLabel = (status) => (labels.statuses?.[status?.toLowerCase()] || status);
  const getPriorityLabel = (priority) => (labels.priorities?.[priority?.toLowerCase()] || priority);
  const getTaskStatusLabel = (status) => (labels.taskStatuses?.[status?.toLowerCase().replace('-', '')] || status);

  const formatCurrency = (amount) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
  const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' }) : (labels.labels?.notScheduled || 'N/A');

  const getTreatmentIcon = (name = '') => {
    const n = name.toLowerCase();
    if (n.includes('root canal')) return '🦷';
    if (n.includes('crown')) return '👑';
    if (n.includes('cleaning')) return '🧽';
    return '🏥';
  };

  const StatCard = ({ title, value, colorClass, icon, shadowColor }) => (
    <div className="bg-gradient-to-br from-surface-elevated to-surface rounded-2xl p-5 border border-primary/10 shadow-sm relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><span className="text-4xl">{icon}</span></div>
      <div className="flex items-center space-x-2.5 mb-2">
        <span className={`flex h-2.5 w-2.5 rounded-full ${colorClass}`} style={{boxShadow: `0 0 8px ${shadowColor}`}}></span>
        <span className="text-xs font-bold uppercase tracking-wider text-muted">{title}</span>
      </div>
      <p className="text-3xl font-bold text-primary">{value}</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-surface border border-primary/10 rounded-3xl shadow-theme-sm p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-primary tracking-tight">{labels.title}</h2>
            <p className="text-secondary mt-1">Manage and track patient treatment progress</p>
          </div>
          <Button onClick={() => setIsCreatingPlan(true)} className="shadow-lg shadow-accent/20">
            {labels.actions?.createNew}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard title={labels.stats?.total} value={treatmentPlans.length} colorClass="bg-blue-500" shadowColor="rgba(59,130,246,0.5)" icon="🗂️"/>
          <StatCard title={labels.stats?.inProgress} value={treatmentPlans.filter(p => p.status === 'in-progress').length} colorClass="bg-amber-500" shadowColor="rgba(245,158,11,0.5)" icon="⏳"/>
          <StatCard title={labels.stats?.completed} value={treatmentPlans.filter(p => p.status === 'completed').length} colorClass="bg-emerald-500" shadowColor="rgba(16,185,129,0.5)" icon="✅"/>
          <div className="bg-gradient-to-br from-surface-elevated to-surface rounded-2xl p-5 border border-primary/10 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><span className="text-4xl">💰</span></div>
            <div className="flex items-center space-x-2.5 mb-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-indigo-500" style={{boxShadow: '0 0 8px rgba(139, 92, 246, 0.5)'}}></span>
              <span className="text-xs font-bold uppercase tracking-wider text-muted">{labels.stats?.totalCost}</span>
            </div>
            <p className="text-2xl font-bold text-primary tracking-tight">{formatCurrency(treatmentPlans.reduce((s, p) => s + (p.actualCost || 0), 0))}</p>
          </div>
        </div>
      </div>

      {isCreatingPlan && (
        <div className="bg-surface border border-primary/10 rounded-3xl shadow-theme-lg p-8 animate-in zoom-in-95 duration-300">
          <h3 className="text-xl font-bold text-primary mb-6 flex items-center gap-3">
            <span className="bg-accent/10 text-accent w-8 h-8 rounded-lg flex items-center justify-center text-sm">✏️</span>
            {labels.form?.title}
          </h3>
          {/* Form fields here, matching new theme */}
          <div className="flex justify-end gap-3 pt-4 border-t border-primary/10">
            <Button variant="outline" onClick={() => setIsCreatingPlan(false)} className="bg-surface hover:bg-surface-elevated border-primary/20 text-secondary">
              {labels.actions?.cancel}
            </Button>
            <Button onClick={() => {}} className="shadow-lg shadow-accent/20">{labels.actions?.create}</Button>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {treatmentPlans.map((plan) => (
          <div key={plan.id} className="bg-surface border border-primary/10 rounded-3xl shadow-theme-sm hover:shadow-theme-md transition-all duration-300 overflow-hidden">
            <div className="p-8 border-b border-primary/10">
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <h3 className="text-xl font-bold text-primary">{plan.title}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${getStatusColor(plan.status)}`}>{getPlanStatusLabel(plan.status)}</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${getPriorityColor(plan.priority)}`}>{getPriorityLabel(plan.priority)}</span>
                  </div>
                  <p className="text-secondary mb-6 leading-relaxed">{plan.description}</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
                    <div><span className="text-muted font-medium block">{labels.table?.plan?.startDate}</span><p className="font-semibold text-primary">{formatDate(plan.startDate)}</p></div>
                    <div><span className="text-muted font-medium block">{labels.table?.plan?.estimatedCompletion}</span><p className="font-semibold text-primary">{formatDate(plan.estimatedCompletion)}</p></div>
                    <div><span className="text-muted font-medium block">{labels.table?.plan?.estimatedCost}</span><p className="font-semibold text-primary">{formatCurrency(plan.estimatedCost)}</p></div>
                    <div><span className="text-muted font-medium block">{labels.table?.plan?.actualCost}</span><p className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(plan.actualCost)}</p></div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="bg-surface hover:bg-surface-elevated border-primary/20 text-secondary">{labels.actions?.editPlan}</Button>
                  <Button variant="ghost" size="icon" className="w-9 h-9" onClick={() => setSelectedPlan(selectedPlan === plan.id ? null : plan.id)}>
                    <span className={`transform transition-transform duration-200 ${selectedPlan === plan.id ? 'rotate-180' : ''}`}>▼</span>
                  </Button>
                </div>
              </div>
              {plan.progress > 0 && (
                <div className="mt-6"><div className="flex items-center justify-between text-xs font-semibold mb-2"><span className="text-muted uppercase tracking-wider">{labels.table?.plan?.progress}</span><span className="text-accent">{plan.progress}%</span></div><div className="w-full bg-surface-elevated rounded-full h-2.5 overflow-hidden border border-primary/10"><div className="bg-gradient-to-r from-accent to-blue-500 h-full rounded-full" style={{ width: `${plan.progress}%` }}></div></div></div>
              )}
            </div>

            {selectedPlan === plan.id && (
              <div className="p-8 bg-surface-elevated/50 animate-in slide-in-from-top-2 duration-200">
                <h4 className="text-lg font-bold text-primary mb-6">{labels.table?.details?.title}</h4>
                <div className="space-y-4">
                  {plan.treatments.map((treatment) => (
                    <div key={treatment.id} className="group bg-surface border border-primary/10 rounded-xl p-5 hover:border-primary/20 hover:shadow-sm transition-all">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="w-12 h-12 bg-surface-elevated border border-primary/10 rounded-xl flex items-center justify-center text-2xl shadow-inner flex-shrink-0">{getTreatmentIcon(treatment.name)}</div>
                          <div className="flex-1 min-w-0">
                            <h5 className="font-bold text-primary text-base">{treatment.name}</h5>
                            <div className="flex flex-wrap items-center gap-4 text-sm text-secondary mt-1.5">
                              <span className="font-medium text-primary bg-surface-elevated px-2 py-0.5 rounded border border-primary/10">{formatCurrency(treatment.cost)}</span>
                              {treatment.completedDate && <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">✓ {labels.labels?.completedOn} {formatDate(treatment.completedDate)}</span>}
                              {treatment.scheduledDate && !treatment.completedDate && <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">🗓️ {labels.labels?.scheduledOn} {formatDate(treatment.scheduledDate)}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 self-end sm:self-center">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${getStatusColor(treatment.status)}`}>{getTaskStatusLabel(treatment.status)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {treatmentPlans.length === 0 && (
        <div className="bg-surface border-2 border-dashed border-primary/10 rounded-3xl p-16 text-center">
          <div className="w-20 h-20 bg-surface-elevated rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-primary/10">
            <svg className="w-10 h-10 text-muted/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
          </div>
          <h3 className="text-xl font-bold text-primary mb-2">{labels.empty?.title}</h3>
          <p className="text-secondary mb-8 max-w-sm mx-auto leading-relaxed">{labels.empty?.description}</p>
          <Button onClick={() => setIsCreatingPlan(true)} className="shadow-lg shadow-accent/20 px-8 py-3 rounded-full">{labels.empty?.action}</Button>
        </div>
      )}
    </div>
  );
};

export default PatientTreatmentPlan;