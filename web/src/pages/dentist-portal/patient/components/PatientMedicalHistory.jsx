import React, { useState } from 'react';
import Button from '../../../../components/ui/Button';
import { useLanguage } from '../../../../contexts/LanguageContext';

const PatientMedicalHistory = ({ patient, onUpdateHistory }) => {
  const [editingSection, setEditingSection] = useState(null);
  const [newItem, setNewItem] = useState('');
  const { t } = useLanguage();

  if (!patient) {
    return (
      <div className="bg-surface border border-primary/10 rounded-3xl shadow-theme-sm p-12 animate-in fade-in">
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-surface-elevated rounded-full flex items-center justify-center mx-auto mb-4 text-muted/50">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          </div>
          <p className="text-secondary font-medium">{t('dentistPatient.common.noPatientSelected')}</p>
        </div>
      </div>
    );
  }

  const labels = t('dentistPatient.medicalHistory') || {};
  const medicalHistory = patient.medicalHistory || {};

  const handleAddItem = (section) => {
    if (!newItem.trim()) return;
    const updatedHistory = {
      ...medicalHistory,
      [section]: [...(medicalHistory[section] || []), newItem.trim()]
    };
    if (onUpdateHistory) onUpdateHistory(updatedHistory);
    setNewItem('');
    setEditingSection(null);
  };

  const handleRemoveItem = (section, index) => {
    const updatedHistory = {
      ...medicalHistory,
      [section]: medicalHistory[section].filter((_, i) => i !== index)
    };
    if (onUpdateHistory) onUpdateHistory(updatedHistory);
  };

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'high': case 'severe': return 'text-red-700 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-900/20 dark:border-red-800/50';
      case 'medium': case 'moderate': return 'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-900/20 dark:border-amber-800/50';
      case 'low': case 'mild': return 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-900/20 dark:border-emerald-800/50';
      default: return 'text-slate-600 bg-slate-50 border-slate-200 dark:text-slate-400 dark:bg-slate-900/20 dark:border-slate-700/50';
    }
  };

  const getSeverityLabel = (severity) => {
    const key = (severity || '').toLowerCase();
    const label = t(`dentistPatient.medicalHistory.severity.${key}`);
    return label.startsWith('dentistPatient') ? severity : label;
  };

  const getMedicalSectionIcon = (section) => ({
    allergies: '⚠️', conditions: '🏥', medications: '💊', surgeries: '🔬',
    familyHistory: '👥', emergencyContact: '🚨'
  }[section] || '📋');

  const StatCard = ({ title, value, colorClass, icon, shadowColor }) => (
    <div className="bg-gradient-to-br from-surface-elevated to-surface rounded-2xl p-5 border border-primary/10 shadow-sm relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <span className="text-4xl">{icon}</span>
      </div>
      <div className="flex items-center space-x-2.5 mb-2">
        <span className={`flex h-2.5 w-2.5 rounded-full ${colorClass}`} style={{boxShadow: `0 0 8px ${shadowColor}`}}></span>
        <span className="text-xs font-bold uppercase tracking-wider text-muted">{title}</span>
      </div>
      <p className="text-3xl font-bold text-primary">{value}</p>
    </div>
  );

  const renderMedicalSection = (section, items) => {
    const sectionLabels = labels.sections?.[section] || {};
    const title = sectionLabels.title || section;
    const placeholder = sectionLabels.placeholder || labels.placeholders?.default || '';
    const emptyLabel = sectionLabels.empty || labels.empty || '';

    return (
      <div className="bg-surface border border-primary/10 rounded-3xl shadow-theme-lg overflow-hidden">
        <div className="p-6 border-b border-primary/10 flex items-center justify-between bg-surface-elevated/50">
          <h3 className="font-bold text-lg flex items-center gap-3 text-primary">
            <span className="w-8 h-8 rounded-lg flex items-center justify-center text-lg bg-surface shadow-inner border border-primary/10">
              {getMedicalSectionIcon(section)}
            </span>
            {title}
          </h3>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setEditingSection(editingSection === section ? null : section)}
            className="text-xs bg-surface hover:bg-surface-elevated border-primary/20"
          >
            {editingSection === section ? t('dentistPatient.common.cancel') : t('dentistPatient.common.add')}
          </Button>
        </div>
        
        <div className="p-6 space-y-3">
          {editingSection === section && (
            <div className="mb-4 flex gap-2 animate-in fade-in slide-in-from-top-2">
              <input
                type="text"
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                placeholder={placeholder}
                className="flex-1 px-4 py-2 border border-primary/20 rounded-xl bg-surface-elevated text-primary focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none text-sm shadow-sm"
                onKeyPress={(e) => e.key === 'Enter' && handleAddItem(section)}
                autoFocus
              />
              <Button size="sm" onClick={() => handleAddItem(section)}>
                {t('dentistPatient.common.add')}
              </Button>
            </div>
          )}
          
          {items && items.length > 0 ? (
            items.map((item, index) => (
              <div key={index} className="group flex items-center justify-between p-3 bg-surface-elevated rounded-xl border border-primary/10 shadow-sm hover:border-primary/20 hover:shadow-md transition-all">
                <div className="flex-1">
                  {typeof item === 'string' ? (
                    <span className="text-secondary font-medium text-sm">{item}</span>
                  ) : (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-primary font-bold text-sm">{item.name || item.condition || item.medication}</span>
                      {item.severity && <span className={`px-2 py-0.5 rounded-md text-xs font-bold uppercase tracking-wide border ${getSeverityColor(item.severity)}`}>{getSeverityLabel(item.severity)}</span>}
                      {(item.dosage || item.date) && <span className="text-xs text-muted bg-surface px-2 py-0.5 rounded border border-primary/10">{item.dosage || item.date}</span>}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleRemoveItem(section, index)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-muted hover:text-red-500 hover:bg-red-500/10 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            ))
          ) : (
            <div className="py-6 text-center border border-dashed border-primary/10 rounded-xl bg-surface">
              <p className="text-muted text-sm font-medium">{emptyLabel}</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-surface border border-primary/10 rounded-3xl shadow-theme-sm p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-primary tracking-tight">{labels.title}</h2>
            <p className="text-secondary mt-1">Comprehensive medical background</p>
          </div>
          <Button variant="outline" className="shadow-sm bg-surface hover:bg-surface-elevated border-primary/20 text-secondary">
            {labels.actions?.export || t('dentistPatient.common.export')}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard title={labels.summary?.allergies} value={medicalHistory.allergies?.length || 0} colorClass="bg-red-500" shadowColor="rgba(239,68,68,0.5)" icon="⚠️" />
          <StatCard title={labels.summary?.conditions} value={medicalHistory.conditions?.length || 0} colorClass="bg-amber-500" shadowColor="rgba(245,158,11,0.5)" icon="❤️‍🩹" />
          <StatCard title={labels.summary?.medications} value={medicalHistory.medications?.length || 0} colorClass="bg-blue-500" shadowColor="rgba(59,130,246,0.5)" icon="💊" />
          <StatCard title={labels.summary?.surgeries} value={medicalHistory.surgeries?.length || 0} colorClass="bg-emerald-500" shadowColor="rgba(16,185,129,0.5)" icon="🔬" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {renderMedicalSection('allergies', medicalHistory.allergies)}
        {renderMedicalSection('conditions', medicalHistory.conditions)}
        {renderMedicalSection('medications', medicalHistory.medications)}
        {renderMedicalSection('surgeries', medicalHistory.surgeries)}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-surface border border-primary/10 rounded-3xl shadow-theme-lg p-8 h-full">
          <h3 className="text-lg font-bold text-primary mb-6 flex items-center gap-3">
            <span className="text-xl">🚨</span>
            <span>{labels.emergency?.title}</span>
          </h3>

          {medicalHistory.emergencyContact && Object.keys(medicalHistory.emergencyContact).length > 0 ? (
            <div className="bg-surface-elevated rounded-2xl p-6 border border-primary/10 space-y-4">
              <div className="flex items-center justify-between border-b border-primary/10 pb-3">
                <span className="text-xs font-bold text-muted uppercase tracking-wider">{labels.emergency?.name}</span>
                <span className="text-primary font-semibold">{medicalHistory.emergencyContact.name || t('dentistPatient.common.notProvided')}</span>
              </div>
              <div className="flex items-center justify-between border-b border-primary/10 pb-3">
                <span className="text-xs font-bold text-muted uppercase tracking-wider">{labels.emergency?.relationship}</span>
                <span className="text-primary font-medium">{medicalHistory.emergencyContact.relationship || t('dentistPatient.common.notProvided')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted uppercase tracking-wider">{labels.emergency?.phone}</span>
                <span className="text-accent font-bold font-mono">{medicalHistory.emergencyContact.phone || t('dentistPatient.common.notProvided')}</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 border-2 border-dashed border-primary/10 rounded-2xl">
              <p className="text-muted mb-4">{labels.emergency?.empty}</p>
              <Button variant="outline" size="sm">{labels.emergency?.add}</Button>
            </div>
          )}
        </div>

        <div className="bg-surface border border-primary/10 rounded-3xl shadow-theme-lg p-8 h-full">
          <h3 className="text-lg font-bold text-primary mb-6 flex items-center gap-3">
            <span className="text-xl">👥</span>
            <span>{labels.family?.title}</span>
          </h3>
          <p className="text-center py-12 text-secondary">Family history not available.</p>
        </div>
      </div>
    </div>
  );
};

export default PatientMedicalHistory;