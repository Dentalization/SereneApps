import React, { useState, useMemo, useRef, useCallback } from 'react';
import Button from '../../../../components/ui/Button';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { useToast } from '../../../../contexts/ToastContext';
import { createPatientTreatmentPlan, completeTreatmentItem } from '../../../../services/dentistPortalService';
const API_BASE = import.meta.env.VITE_AUTH_API_BASE_URL?.replace(/\/$/, '') || 'http://localhost:4000';

/** Resolve avatar URL — prefix relative /uploads/... paths with the API base URL */
const resolveAvatar = (url) => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${API_BASE}${url}`;
};
const DENTAL_TREATMENTS = {
  'Preventive & Diagnostic': [
    'General Check-up', 'Scaling & Root Planing', 'Polishing', 'Fluoride Therapy',
    'Pit & Fissure Sealant', 'X-Ray Panoramic', 'X-Ray Periapical', 'CBCT 3D',
  ],
  'Restorative (Konservasi)': [
    'Temporary Filling', 'Composite / Light Cure Filling', 'GIC Filling',
    'Amalgam', 'Inlay & Onlay',
  ],
  'Endodontics (Saraf)': [
    'Root Canal Treatment (RCT)', 'Pulpectomy', 'Apicectomy',
  ],
  'Prosthodontics (Gigi Tiruan)': [
    'Dental Crown (PFM)', 'Dental Crown (Zirconia/E-max)', 'Dental Bridge',
    'Removable Partial Denture', 'Complete Denture',
  ],
  'Periodontics (Gusi & Tulang)': [
    'Deep Scaling', 'Gingivectomy', 'Flap Surgery', 'Bone Grafting', 'Splinting',
  ],
  'Oral Surgery (Bedah Mulut)': [
    'Simple Extraction', 'Deciduous Extraction', 'Odontectomy (Wisdom Tooth)',
    'Dental Implant', 'Abscess Drainage',
  ],
  'Orthodontics (Kawat Gigi)': [
    'Ortho Consultation', 'Metal Braces', 'Ceramic Braces', 'Clear Aligners',
    'Ortho Adjustment', 'Retainer',
  ],
  'Cosmetic Dentistry': [
    'Teeth Whitening', 'Direct Veneer', 'Indirect Veneer', 'Gingival Depigmentation',
  ],
};

const CATEGORY_ICONS = {
  'Preventive & Diagnostic': '🔍',
  'Restorative (Konservasi)': '🦷',
  'Endodontics (Saraf)': '🩺',
  'Prosthodontics (Gigi Tiruan)': '👑',
  'Periodontics (Gusi & Tulang)': '🦴',
  'Oral Surgery (Bedah Mulut)': '🔪',
  'Orthodontics (Kawat Gigi)': '😁',
  'Cosmetic Dentistry': '✨',
};

const PatientTreatmentPlan = ({ patient, onCreatePlan, onUpdatePlan, onCompleteTreatment }) => {
  const toast = useToast();
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState(
    () => Object.keys(DENTAL_TREATMENTS).reduce((acc, cat) => ({ ...acc, [cat]: true }), {})
  );
  const [treatmentSearch, setTreatmentSearch] = useState('');

  // Treatment item completion modal state
  const [editingTreatment, setEditingTreatment] = useState(null); // { planId, treatment }
  const [treatmentForm, setTreatmentForm] = useState({ resultNotes: '', actualCost: '', image: null, imagePreview: null });
  const [isCompletingItem, setIsCompletingItem] = useState(false);
  const fileInputRef = useRef(null);

  const [newPlan, setNewPlan] = useState({
    title: '',
    description: '',
    priority: 'medium',
    estimatedCost: '',
    targetCompletion: '',
    treatments: [],
    notes: '',
  });

  const filteredCategories = useMemo(() => {
    if (!treatmentSearch.trim()) return DENTAL_TREATMENTS;
    const q = treatmentSearch.toLowerCase();
    const result = {};
    for (const [cat, items] of Object.entries(DENTAL_TREATMENTS)) {
      const matched = items.filter(i => i.toLowerCase().includes(q));
      if (matched.length > 0 || cat.toLowerCase().includes(q)) {
        result[cat] = matched.length > 0 ? matched : items;
      }
    }
    return result;
  }, [treatmentSearch]);

  const toggleTreatment = (name) => {
    setNewPlan(prev => {
      const exists = prev.treatments.find(t => t.name === name);
      if (exists) {
        return { ...prev, treatments: prev.treatments.filter(t => t.name !== name) };
      }
      return {
        ...prev,
        treatments: [
          ...prev.treatments,
          { id: Date.now() + Math.random(), name, cost: 0, status: 'pending' },
        ],
      };
    });
  };

  const updateTreatmentCost = (name, cost) => {
    setNewPlan(prev => ({
      ...prev,
      treatments: prev.treatments.map(t =>
        t.name === name ? { ...t, cost: Number(cost) || 0 } : t
      ),
    }));
  };

  const removeTreatment = (name) => {
    setNewPlan(prev => ({ ...prev, treatments: prev.treatments.filter(t => t.name !== name) }));
  };

  const toggleCategory = (cat) => {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const handleCreatePlan = async () => {
    if (!newPlan.title.trim() || newPlan.treatments.length === 0) return;
    setIsSubmitting(true);
    try {
      const totalCost = newPlan.treatments.reduce((s, t) => s + t.cost, 0);
      const payload = {
        title: newPlan.title.trim(),
        description: newPlan.description || newPlan.notes || '',
        priority: newPlan.priority,
        estimatedCost: Number(newPlan.estimatedCost) || totalCost,
        targetCompletion: newPlan.targetCompletion || null,
        treatments: newPlan.treatments.map(t => ({
          name: t.name,
          cost: t.cost,
          status: 'pending',
        })),
      };

      const savedPlan = await createPatientTreatmentPlan(patient.id, payload);

      // Notify parent to update state (optimistic or re-fetch)
      if (onCreatePlan) onCreatePlan(savedPlan);

      toast.success('Treatment plan created successfully!');
      setNewPlan({ title: '', description: '', priority: 'medium', estimatedCost: '', targetCompletion: '', treatments: [], notes: '' });
      setTreatmentSearch('');
      setIsCreatingPlan(false);
    } catch (err) {
      console.error('Failed to create treatment plan:', err);
      const message = err?.response?.data?.error?.message || 'Failed to create treatment plan. Please try again.';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Treatment Item Completion Handlers ──
  const openTreatmentModal = useCallback((planId, treatment) => {
    setEditingTreatment({ planId, treatment });
    setTreatmentForm({
      resultNotes: treatment.resultNotes || '',
      actualCost: treatment.actualCost || treatment.cost || '',
      image: null,
      imagePreview: treatment.imageUrl ? resolveAvatar(treatment.imageUrl) : null,
    });
  }, []);

  const closeTreatmentModal = useCallback(() => {
    setEditingTreatment(null);
    setTreatmentForm({ resultNotes: '', actualCost: '', image: null, imagePreview: null });
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleImageSelect = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be smaller than 10 MB');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setTreatmentForm(prev => ({ ...prev, image: file, imagePreview: reader.result }));
    };
    reader.readAsDataURL(file);
  }, [toast]);

  const handleCompleteTreatment = async () => {
    if (!editingTreatment) return;
    setIsCompletingItem(true);
    try {
      const { planId, treatment } = editingTreatment;
      const payload = {
        resultNotes: treatmentForm.resultNotes || '',
        actualCost: Number(String(treatmentForm.actualCost).replace(/\D/g, '')) || 0,
        status: 'completed',
      };
      if (treatmentForm.image) payload.image = treatmentForm.image;

      const updatedPlan = await completeTreatmentItem(patient.id, planId, treatment.id, payload);

      // Update parent state with the returned plan
      if (onUpdatePlan) onUpdatePlan(updatedPlan);
      toast.success(`"${treatment.name}" marked as completed!`);
      closeTreatmentModal();
    } catch (err) {
      console.error('Failed to complete treatment item:', err);
      toast.error(err?.response?.data?.error?.message || 'Failed to update treatment. Please try again.');
    } finally {
      setIsCompletingItem(false);
    }
  };

  const selectedTreatmentNames = useMemo(
    () => new Set(newPlan.treatments.map(t => t.name)),
    [newPlan.treatments]
  );
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
            {labels.form?.title || 'Create Treatment Plan'}
          </h3>

          {/* ── Plan Details ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
            {/* Title */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-2">Plan Title *</label>
              <input
                type="text"
                value={newPlan.title}
                onChange={e => setNewPlan(p => ({ ...p, title: e.target.value }))}
                placeholder="e.g. Full Mouth Rehabilitation"
                className="w-full bg-surface-elevated border border-primary/10 rounded-xl px-4 py-3 text-primary placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/40 transition-all"
              />
            </div>

            {/* Priority */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-2">Priority</label>
              <select
                value={newPlan.priority}
                onChange={e => setNewPlan(p => ({ ...p, priority: e.target.value }))}
                className="w-full bg-surface-elevated border border-primary/10 rounded-xl px-4 py-3 text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/40 transition-all appearance-none cursor-pointer"
              >
                <option value="low">{labels.priorities?.low || 'Low'}</option>
                <option value="medium">{labels.priorities?.medium || 'Medium'}</option>
                <option value="high">{labels.priorities?.high || 'High'}</option>
              </select>
            </div>

            {/* Estimated Cost */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-2">Estimated Cost (IDR)</label>
              <input
                type="text"
                value={newPlan.estimatedCost ? Number(newPlan.estimatedCost).toLocaleString('id-ID') : ''}
                onChange={e => {
                  const raw = e.target.value.replace(/\D/g, '');
                  setNewPlan(p => ({ ...p, estimatedCost: raw }));
                }}
                placeholder="0"
                className="w-full bg-surface-elevated border border-primary/10 rounded-xl px-4 py-3 text-primary placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/40 transition-all"
              />
            </div>

            {/* Target Completion */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-2">Target Completion Date</label>
              <input
                type="date"
                value={newPlan.targetCompletion}
                onChange={e => setNewPlan(p => ({ ...p, targetCompletion: e.target.value }))}
                className="w-full bg-surface-elevated border border-primary/10 rounded-xl px-4 py-3 text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/40 transition-all"
              />
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-2">Description / Clinical Notes</label>
              <textarea
                value={newPlan.description}
                onChange={e => setNewPlan(p => ({ ...p, description: e.target.value }))}
                rows={3}
                placeholder="Clinical observations, treatment rationale..."
                className="w-full bg-surface-elevated border border-primary/10 rounded-xl px-4 py-3 text-primary placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/40 transition-all resize-none"
              />
            </div>
          </div>

          {/* ── Treatment Selector ── */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h4 className="text-lg font-bold text-primary">Select Treatments *</h4>
                <p className="text-sm text-secondary mt-0.5">
                  {newPlan.treatments.length === 0
                    ? 'Click on treatments below to add them to this plan'
                    : `${newPlan.treatments.length} treatment${newPlan.treatments.length > 1 ? 's' : ''} selected`}
                </p>
              </div>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={treatmentSearch}
                  onChange={e => setTreatmentSearch(e.target.value)}
                  placeholder="Search treatments..."
                  className="bg-surface-elevated border border-primary/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-primary placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/40 transition-all w-full sm:w-64"
                />
              </div>
            </div>

            <div className="space-y-4 max-h-[28rem] overflow-y-auto pr-1 custom-scrollbar">
              {Object.entries(filteredCategories).map(([category, items]) => (
                <div key={category} className="bg-surface-elevated/50 border border-primary/10 rounded-2xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleCategory(category)}
                    className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-surface-elevated transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{CATEGORY_ICONS[category] || '🏥'}</span>
                      <span className="font-bold text-primary text-sm">{category}</span>
                      <span className="text-xs text-muted bg-surface px-2 py-0.5 rounded-full border border-primary/10">
                        {items.filter(i => selectedTreatmentNames.has(i)).length}/{items.length}
                      </span>
                    </div>
                    <svg
                      className={`w-4 h-4 text-muted transition-transform duration-200 ${expandedCategories[category] ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {expandedCategories[category] && (
                    <div className="px-5 pb-4 pt-1 flex flex-wrap gap-2 animate-in slide-in-from-top-1 duration-150">
                      {items.map(name => {
                        const isSelected = selectedTreatmentNames.has(name);
                        return (
                          <button
                            key={name}
                            type="button"
                            onClick={() => toggleTreatment(name)}
                            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium border transition-all duration-150 ${
                              isSelected
                                ? 'bg-accent/10 text-accent border-accent/30 shadow-sm shadow-accent/10 ring-1 ring-accent/20'
                                : 'bg-surface border-primary/10 text-secondary hover:border-primary/20 hover:bg-surface-elevated hover:text-primary'
                            }`}
                          >
                            {isSelected && (
                              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                            {name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
              {Object.keys(filteredCategories).length === 0 && (
                <div className="text-center py-8 text-secondary">
                  <p className="text-sm">No treatments match &ldquo;{treatmentSearch}&rdquo;</p>
                </div>
              )}
            </div>
          </div>

          {/* ── Selected Treatments Summary ── */}
          {newPlan.treatments.length > 0 && (
            <div className="mb-8">
              <h4 className="text-sm font-bold uppercase tracking-wider text-muted mb-3">
                Selected Treatments ({newPlan.treatments.length})
              </h4>
              <div className="space-y-2.5">
                {newPlan.treatments.map(treatment => (
                  <div
                    key={treatment.name}
                    className="group flex flex-col sm:flex-row sm:items-center gap-3 bg-surface-elevated border border-primary/10 rounded-xl px-4 py-3 hover:border-accent/20 transition-all"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-lg flex-shrink-0">{getTreatmentIcon(treatment.name)}</span>
                      <span className="font-semibold text-primary text-sm truncate">{treatment.name}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border text-slate-600 bg-slate-50 border-slate-200 dark:text-slate-400 dark:bg-slate-900/20 dark:border-slate-700/50">pending</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted font-medium">Rp</span>
                        <input
                          type="text"
                          value={treatment.cost ? Number(treatment.cost).toLocaleString('id-ID') : ''}
                          onChange={e => {
                            const raw = e.target.value.replace(/\D/g, '');
                            updateTreatmentCost(treatment.name, raw);
                          }}
                          placeholder="0"
                          className="w-36 bg-surface border border-primary/10 rounded-lg pl-9 pr-3 py-1.5 text-sm text-primary placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/40 transition-all"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeTreatment(treatment.name)}
                        className="p-1.5 text-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Remove"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between mt-4 px-4 py-3 bg-accent/5 border border-accent/10 rounded-xl">
                <span className="text-sm font-bold text-primary">Total Treatment Cost</span>
                <span className="text-lg font-bold text-accent">
                  {formatCurrency(newPlan.treatments.reduce((s, t) => s + t.cost, 0))}
                </span>
              </div>
            </div>
          )}

          {/* ── Form Actions ── */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-6 border-t border-primary/10">
            <Button
              variant="outline"
              onClick={() => {
                setIsCreatingPlan(false);
                setNewPlan({ title: '', description: '', priority: 'medium', estimatedCost: '', targetCompletion: '', treatments: [], notes: '' });
                setTreatmentSearch('');
              }}
              className="bg-surface hover:bg-surface-elevated border-primary/20 text-secondary"
            >
              {labels.actions?.cancel || 'Cancel'}
            </Button>
            <Button
              onClick={handleCreatePlan}
              disabled={isSubmitting || !newPlan.title.trim() || newPlan.treatments.length === 0}
              className={`shadow-lg shadow-accent/20 ${
                (isSubmitting || !newPlan.title.trim() || newPlan.treatments.length === 0)
                  ? 'opacity-50 cursor-not-allowed'
                  : ''
              }`}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  Saving...
                </span>
              ) : (
                <>{labels.actions?.create || 'Create Plan'} {newPlan.treatments.length > 0 && `(${newPlan.treatments.length})`}</>
              )}
            </Button>
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
                  {plan.dentist && (
                    <div className="flex items-center gap-2.5 mb-5">
                      <div className="flex items-center gap-2 bg-surface-elevated border border-primary/10 rounded-lg px-3 py-1.5">
                        {resolveAvatar(plan.dentist.avatar) ? (
                          <img
                            src={resolveAvatar(plan.dentist.avatar)}
                            alt={plan.dentist.name}
                            className="w-5 h-5 rounded-full object-cover"
                            onError={e => { e.currentTarget.style.display = 'none'; }}
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-accent/10 flex items-center justify-center">
                            <svg className="w-3 h-3 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                          </div>
                        )}
                        <span className="text-xs text-secondary">
                          Created by <span className="font-semibold text-primary">{plan.dentist.name}</span>
                        </span>
                      </div>
                      {plan.createdAt && (
                        <span className="text-xs text-muted">
                          on {formatDate(plan.createdAt)}
                        </span>
                      )}
                    </div>
                  )}
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
                          {treatment.status !== 'completed' ? (
                            <button
                              type="button"
                              onClick={() => openTreatmentModal(plan.id, treatment)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/50 dark:hover:bg-emerald-900/40 transition-all"
                              title="Complete treatment"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                              Complete
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openTreatmentModal(plan.id, treatment)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface-elevated text-secondary border border-primary/10 hover:border-primary/20 hover:text-primary transition-all"
                              title="View / edit result"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                              Edit
                            </button>
                          )}
                        </div>
                      </div>
                      {/* Show result notes & image if completed */}
                      {treatment.status === 'completed' && (treatment.resultNotes || treatment.imageUrl) && (
                        <div className="mt-4 pt-4 border-t border-primary/5">
                          {treatment.resultNotes && (
                            <div className="mb-3">
                              <span className="text-xs font-bold uppercase tracking-wider text-muted">Treatment Notes</span>
                              <p className="text-sm text-secondary mt-1 leading-relaxed">{treatment.resultNotes}</p>
                            </div>
                          )}
                          {treatment.imageUrl && (
                            <div>
                              <span className="text-xs font-bold uppercase tracking-wider text-muted">Treatment Photo</span>
                              <img
                                src={resolveAvatar(treatment.imageUrl)}
                                alt="Treatment result"
                                className="mt-1.5 rounded-xl border border-primary/10 max-h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => window.open(resolveAvatar(treatment.imageUrl), '_blank')}
                              />
                            </div>
                          )}
                          {treatment.actualCost > 0 && treatment.actualCost !== treatment.cost && (
                            <div className="mt-3 flex items-center gap-2 text-sm">
                              <span className="text-muted">Actual Cost:</span>
                              <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(treatment.actualCost)}</span>
                              {treatment.actualCost !== treatment.cost && (
                                <span className="text-xs text-muted line-through">{formatCurrency(treatment.cost)}</span>
                              )}
                            </div>
                          )}
                        </div>
                      )}
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
      {/* ── Treatment Completion Modal ── */}
      {editingTreatment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeTreatmentModal} />

          {/* Modal */}
          <div className="relative bg-surface border border-primary/10 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in zoom-in-95 fade-in duration-200">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-primary">Complete Treatment</h3>
                    <p className="text-sm text-secondary">{editingTreatment.treatment.name}</p>
                  </div>
                </div>
                <button onClick={closeTreatmentModal} className="p-1.5 text-muted hover:text-primary hover:bg-surface-elevated rounded-lg transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              {/* Form */}
              <div className="space-y-5">
                {/* Result Notes */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-2">Treatment Notes / Result</label>
                  <textarea
                    value={treatmentForm.resultNotes}
                    onChange={e => setTreatmentForm(prev => ({ ...prev, resultNotes: e.target.value }))}
                    rows={4}
                    placeholder="e.g. Gigi sudah ditambal dengan komposit, pasien tidak ada keluhan..."
                    className="w-full bg-surface-elevated border border-primary/10 rounded-xl px-4 py-3 text-primary placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/40 transition-all resize-none text-sm"
                  />
                </div>

                {/* Image Upload */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-2">Treatment Photo (Optional)</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/heic"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                  {treatmentForm.imagePreview ? (
                    <div className="relative group">
                      <img
                        src={treatmentForm.imagePreview}
                        alt="Treatment preview"
                        className="w-full max-h-52 object-cover rounded-xl border border-primary/10"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 rounded-xl transition-all flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="px-3 py-1.5 bg-white/90 text-slate-700 rounded-lg text-xs font-semibold hover:bg-white transition-colors"
                          >
                            Replace
                          </button>
                          <button
                            type="button"
                            onClick={() => setTreatmentForm(prev => ({ ...prev, image: null, imagePreview: null }))}
                            className="px-3 py-1.5 bg-red-500/90 text-white rounded-lg text-xs font-semibold hover:bg-red-500 transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full border-2 border-dashed border-primary/10 hover:border-accent/30 rounded-xl p-6 flex flex-col items-center gap-2 text-muted hover:text-accent transition-all"
                    >
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-sm font-medium">Click to upload a photo</span>
                      <span className="text-xs">JPG, PNG, WebP, HEIC (max 10 MB)</span>
                    </button>
                  )}
                </div>

                {/* Actual Cost */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-2">Actual Cost (Optional)</label>
                  <p className="text-xs text-secondary mb-2">Estimated: {formatCurrency(editingTreatment.treatment.cost)}. Leave as-is or adjust if the actual cost differs.</p>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted font-medium">Rp</span>
                    <input
                      type="text"
                      value={treatmentForm.actualCost ? Number(String(treatmentForm.actualCost).replace(/\D/g, '') || 0).toLocaleString('id-ID') : ''}
                      onChange={e => {
                        const raw = e.target.value.replace(/\D/g, '');
                        setTreatmentForm(prev => ({ ...prev, actualCost: raw }));
                      }}
                      placeholder="0"
                      className="w-full bg-surface-elevated border border-primary/10 rounded-xl pl-10 pr-4 py-3 text-primary placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/40 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 mt-6 pt-6 border-t border-primary/10">
                <Button
                  variant="outline"
                  onClick={closeTreatmentModal}
                  className="bg-surface hover:bg-surface-elevated border-primary/20 text-secondary"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCompleteTreatment}
                  disabled={isCompletingItem}
                  className={`shadow-lg shadow-emerald-500/20 bg-emerald-600 hover:bg-emerald-700 text-white ${isCompletingItem ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isCompletingItem ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                      Saving...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      {editingTreatment.treatment.status === 'completed' ? 'Update Result' : 'Mark as Completed'}
                    </span>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientTreatmentPlan;