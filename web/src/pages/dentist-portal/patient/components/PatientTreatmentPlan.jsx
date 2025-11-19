import React, { useMemo, useState } from 'react';
import Button from '../../../../components/ui/Button';
import { useLanguage } from '../../../../contexts/LanguageContext';

const PatientTreatmentPlan = ({ patient, onCreatePlan, onUpdatePlan, onCompleteTreatment }) => {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);
  const [newPlan, setNewPlan] = useState({
    title: '',
    description: '',
    priority: 'medium',
    estimatedCost: '',
    estimatedDuration: '',
    treatments: [],
    notes: ''
  });
  const { t, language } = useLanguage();
  const locale = language === 'id' ? 'id-ID' : 'en-US';
  const labels = t('dentistPatient.treatmentPlan') || {};
  const statsLabels = labels.stats || {};
  const formLabels = labels.form || {};
  const actions = labels.actions || {};
  const tableLabels = labels.table || {};
  const emptyLabels = labels.empty || {};

  if (!patient) {
    return (
      <div className="bg-surface-elevated border border-primary/10 rounded-xl shadow-theme-md theme-transition p-6">
        <div className="text-center py-8">
          <p className="text-secondary">{t('dentistPatient.common.noPatientSelected')}</p>
        </div>
      </div>
    );
  }

  // Mock treatment plans - in real app, this would come from props or API
  const treatmentPlans = patient.treatmentPlans || [
    {
      id: 1,
      title: 'Comprehensive Oral Rehabilitation',
      description: 'Complete dental restoration including root canal therapy, crown placement, and preventive care',
      status: 'in-progress',
      priority: 'high',
      startDate: '2024-03-01',
      estimatedCompletion: '2024-06-01',
      estimatedCost: 2500000,
      actualCost: 1200000,
      progress: 60,
      treatments: [
        { 
          id: 1, 
          name: 'Root Canal Therapy - Tooth #14', 
          status: 'completed', 
          cost: 800000, 
          completedDate: '2024-03-15',
          notes: 'Successful endodontic treatment. No complications.'
        },
        { 
          id: 2, 
          name: 'Crown Preparation - Tooth #14', 
          status: 'in-progress', 
          cost: 600000, 
          scheduledDate: '2024-03-25',
          notes: 'Awaiting permanent crown fabrication.'
        },
        { 
          id: 3, 
          name: 'Dental Cleaning & Scaling', 
          status: 'pending', 
          cost: 300000, 
          scheduledDate: '2024-04-10',
          notes: 'Preventive maintenance.'
        }
      ]
    },
    {
      id: 2,
      title: 'Orthodontic Consultation',
      description: 'Assessment for potential braces or clear aligners',
      status: 'pending',
      priority: 'low',
      startDate: null,
      estimatedCompletion: null,
      estimatedCost: 500000,
      actualCost: 0,
      progress: 0,
      treatments: [
        { 
          id: 4, 
          name: 'Orthodontic Examination', 
          status: 'pending', 
          cost: 200000, 
          scheduledDate: '2024-04-01',
          notes: 'Initial assessment required.'
        },
        { 
          id: 5, 
          name: 'Dental X-rays & Models', 
          status: 'pending', 
          cost: 300000, 
          scheduledDate: '2024-04-01',
          notes: 'For treatment planning.'
        }
      ]
    }
  ];

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'text-success bg-success/10 border-success/30';
      case 'in-progress': return 'text-warning bg-warning/10 border-warning/30';
      case 'pending': return 'text-secondary bg-muted border-primary/10';
      case 'cancelled': return 'text-error bg-error/10 border-error/30';
      default: return 'text-secondary bg-muted border-primary/10';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'text-error bg-error/10 border-error/30';
      case 'medium': return 'text-warning bg-warning/10 border-warning/30';
      case 'low': return 'text-success bg-success/10 border-success/30';
      default: return 'text-secondary bg-muted border-primary/10';
    }
  };

  const getPlanStatusLabel = (status) => {
    const key = (status || '').toLowerCase();
    const label = t(`dentistPatient.treatmentPlan.statuses.${key}`);
    return typeof label === 'string' && !label.startsWith('dentistPatient') ? label : status;
  };

  const getPriorityLabel = (priority) => {
    const key = (priority || '').toLowerCase();
    const label = t(`dentistPatient.treatmentPlan.priorities.${key}`);
    return typeof label === 'string' && !label.startsWith('dentistPatient') ? label : priority;
  };

  const getTaskStatusLabel = (status) => {
    const key = (status || '').toLowerCase().replace('-', '');
    const label = t(`dentistPatient.treatmentPlan.taskStatuses.${key}`);
    return typeof label === 'string' && !label.startsWith('dentistPatient') ? label : status;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return labels.labels?.notScheduled || t('dentistPatient.treatmentPlan.labels.notScheduled');
    return new Date(dateString).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleCreatePlan = () => {
    if (onCreatePlan) {
      onCreatePlan(newPlan);
    }
    setIsCreatingPlan(false);
    setNewPlan({
      title: '',
      description: '',
      priority: 'medium',
      estimatedCost: '',
      estimatedDuration: '',
      treatments: [],
      notes: ''
    });
  };

  const getTreatmentIcon = (name) => {
    if (name.toLowerCase().includes('root canal')) return '🦷';
    if (name.toLowerCase().includes('crown')) return '👑';
    if (name.toLowerCase().includes('cleaning')) return '🧽';
    if (name.toLowerCase().includes('filling')) return '🔧';
    if (name.toLowerCase().includes('extraction')) return '🔬';
    if (name.toLowerCase().includes('orthodontic')) return '⚙️';
    if (name.toLowerCase().includes('x-ray')) return '📸';
    return '🏥';
  };

  return (
    <div className="space-y-6">
      {/* Treatment Plans Header */}
      <div className="bg-surface-elevated border border-primary/10 rounded-xl shadow-theme-md theme-transition p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-primary">{labels.title}</h2>
          <Button onClick={() => setIsCreatingPlan(true)}>
            {actions.createNew || t('dentistPatient.treatmentPlan.actions.createNew')}
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-surface rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-2 h-2 bg-brand-primary rounded-full"></div>
              <span className="text-sm font-medium text-text-primary">{statsLabels.total}</span>
            </div>
            <p className="text-2xl font-bold text-primary">{treatmentPlans.length}</p>
          </div>

          <div className="bg-surface rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-2 h-2 bg-warning rounded-full"></div>
              <span className="text-sm font-medium text-text-primary">{statsLabels.inProgress}</span>
            </div>
            <p className="text-2xl font-bold text-primary">
              {treatmentPlans.filter(plan => plan.status === 'in-progress').length}
            </p>
          </div>

          <div className="bg-surface rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-2 h-2 bg-success rounded-full"></div>
              <span className="text-sm font-medium text-text-primary">{statsLabels.completed}</span>
            </div>
            <p className="text-2xl font-bold text-primary">
              {treatmentPlans.filter(plan => plan.status === 'completed').length}
            </p>
          </div>

          <div className="bg-surface rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-2 h-2 bg-trust-green rounded-full"></div>
              <span className="text-sm font-medium text-text-primary">{statsLabels.totalCost}</span>
            </div>
            <p className="text-lg font-bold text-primary">
              {formatCurrency(treatmentPlans.reduce((sum, plan) => sum + (plan.actualCost || 0), 0))}
            </p>
          </div>
        </div>
      </div>

      {/* Create New Plan Modal */}
      {isCreatingPlan && (
        <div className="bg-surface-elevated border border-primary/10 rounded-xl shadow-theme-md theme-transition p-6">
          <h3 className="text-lg font-semibold text-primary mb-4">{formLabels.title}</h3>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">{formLabels.fields?.title}</label>
                <input
                  type="text"
                  value={newPlan.title}
                  onChange={(e) => setNewPlan(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-primary/10 rounded-md bg-background text-primary focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                  placeholder={formLabels.placeholders?.title}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">{formLabels.fields?.priority}</label>
                <select
                  value={newPlan.priority}
                  onChange={(e) => setNewPlan(prev => ({ ...prev, priority: e.target.value }))}
                  className="w-full px-3 py-2 border border-primary/10 rounded-md bg-background text-primary focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                >
                  <option value="low">{formLabels.priorityOptions?.low}</option>
                  <option value="medium">{formLabels.priorityOptions?.medium}</option>
                  <option value="high">{formLabels.priorityOptions?.high}</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">{formLabels.fields?.description}</label>
              <textarea
                value={newPlan.description}
                onChange={(e) => setNewPlan(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-primary/10 rounded-md bg-background text-primary focus:ring-2 focus:ring-brand-primary focus:border-transparent resize-none"
                placeholder={formLabels.placeholders?.description}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">{formLabels.fields?.estimatedCost}</label>
                <input
                  type="number"
                  value={newPlan.estimatedCost}
                  onChange={(e) => setNewPlan(prev => ({ ...prev, estimatedCost: e.target.value }))}
                  className="w-full px-3 py-2 border border-primary/10 rounded-md bg-background text-primary focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">{formLabels.fields?.estimatedDuration}</label>
                <input
                  type="number"
                  value={newPlan.estimatedDuration}
                  onChange={(e) => setNewPlan(prev => ({ ...prev, estimatedDuration: e.target.value }))}
                  className="w-full px-3 py-2 border border-primary/10 rounded-md bg-background text-primary focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                  placeholder="0"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">{formLabels.fields?.notes}</label>
              <textarea
                value={newPlan.notes}
                onChange={(e) => setNewPlan(prev => ({ ...prev, notes: e.target.value }))}
                rows={2}
                className="w-full px-3 py-2 border border-primary/10 rounded-md bg-background text-primary focus:ring-2 focus:ring-brand-primary focus:border-transparent resize-none"
                placeholder={formLabels.placeholders?.notes}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsCreatingPlan(false)}>
                {actions.cancel || t('dentistPatient.common.cancel')}
              </Button>
              <Button onClick={handleCreatePlan}>
                {actions.create || t('dentistPatient.treatmentPlan.actions.create')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Treatment Plans List */}
      <div className="space-y-4">
        {treatmentPlans.map((plan) => (
          <div key={plan.id} className="bg-surface-elevated border border-primary/10 rounded-xl shadow-theme-md theme-transition">
            {/* Plan Header */}
            <div className="p-6 border-b border-primary/10">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-primary">{plan.title}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(plan.status)}`}>
                      {getPlanStatusLabel(plan.status)}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(plan.priority)}`}>
                      {t('dentistPatient.treatmentPlan.priorityLabel', { priority: getPriorityLabel(plan.priority) })}
                    </span>
                  </div>
                  
                  <p className="text-secondary mb-4">{plan.description}</p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-secondary">{tableLabels.plan?.startDate}</span>
                      <p className="font-medium text-primary">{formatDate(plan.startDate)}</p>
                    </div>
                    <div>
                      <span className="text-secondary">{tableLabels.plan?.estimatedCompletion}</span>
                      <p className="font-medium text-primary">{formatDate(plan.estimatedCompletion)}</p>
                    </div>
                    <div>
                      <span className="text-secondary">{tableLabels.plan?.estimatedCost}</span>
                      <p className="font-medium text-primary">{formatCurrency(plan.estimatedCost)}</p>
                    </div>
                    <div>
                      <span className="text-secondary">{tableLabels.plan?.actualCost}</span>
                      <p className="font-medium text-primary">{formatCurrency(plan.actualCost)}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <Button variant="outline" size="sm">
                    {actions.editPlan || t('dentistPatient.treatmentPlan.actions.editPlan')}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setSelectedPlan(selectedPlan === plan.id ? null : plan.id)}
                  >
                    {selectedPlan === plan.id ? '▲' : '▼'}
                  </Button>
                </div>
              </div>

              {/* Progress Bar */}
              {plan.progress > 0 && (
                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-secondary">{tableLabels.plan?.progress}</span>
                    <span className="font-medium text-primary">{plan.progress}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-brand-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${plan.progress}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>

            {/* Treatment Details */}
            {selectedPlan === plan.id && (
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-medium text-primary">{tableLabels.details?.title}</h4>
                  <Button size="sm">
                    {actions.addTreatment || t('dentistPatient.treatmentPlan.actions.addTreatment')}
                  </Button>
                </div>

                <div className="space-y-3">
                  {plan.treatments.map((treatment) => (
                    <div key={treatment.id} className="border border-primary/10 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 flex-1">
                          <div className="w-10 h-10 bg-surface rounded-lg flex items-center justify-center text-lg">
                            {getTreatmentIcon(treatment.name)}
                          </div>
                          
                          <div className="flex-1">
                            <h5 className="font-medium text-primary">{treatment.name}</h5>
                            <div className="flex items-center space-x-4 text-sm text-secondary mt-1">
                              <span>{tableLabels.details?.costLabel || '💰'} {formatCurrency(treatment.cost)}</span>
                              {treatment.completedDate && (
                                <span>{t('dentistPatient.treatmentPlan.labels.completedOn', { date: formatDate(treatment.completedDate) })}</span>
                              )}
                              {treatment.scheduledDate && !treatment.completedDate && (
                                <span>{t('dentistPatient.treatmentPlan.labels.scheduledOn', { date: formatDate(treatment.scheduledDate) })}</span>
                              )}
                            </div>
                            {treatment.notes && (
                              <p className="text-sm text-secondary mt-1 italic">
                                "{treatment.notes}"
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(treatment.status)}`}>
                            {getTaskStatusLabel(treatment.status)}
                          </span>
                          
                          {treatment.status === 'in-progress' && (
                            <Button 
                              size="sm"
                              onClick={() => onCompleteTreatment && onCompleteTreatment(treatment.id)}
                            >
                              {actions.complete || t('dentistPatient.treatmentPlan.actions.complete')}
                            </Button>
                          )}
                          
                          {treatment.status === 'pending' && (
                            <Button 
                              variant="outline" 
                              size="sm"
                            >
                              {actions.start || t('dentistPatient.treatmentPlan.actions.start')}
                            </Button>
                          )}
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

      {/* Empty State */}
      {treatmentPlans.length === 0 && (
        <div className="bg-surface-elevated border border-primary/10 rounded-xl shadow-theme-md theme-transition p-12 text-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-primary mb-2">{emptyLabels.title}</h3>
          <p className="text-secondary mb-4">
            {emptyLabels.description}
          </p>
          <Button onClick={() => setIsCreatingPlan(true)}>
            {emptyLabels.action}
          </Button>
        </div>
      )}
    </div>
  );
};

export default PatientTreatmentPlan;
