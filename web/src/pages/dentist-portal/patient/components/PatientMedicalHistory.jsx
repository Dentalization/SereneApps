import React, { useState } from 'react';
import Button from '../../../../components/ui/Button';
import { useLanguage } from '../../../../contexts/LanguageContext';

const PatientMedicalHistory = ({ patient, onUpdateHistory, onAddAllergy, onAddCondition, onAddMedication }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [newItem, setNewItem] = useState('');
  const { t } = useLanguage();

  if (!patient) {
    return (
      <div className="bg-surface-elevated border border-primary/10 rounded-xl shadow-theme-md theme-transition p-6">
        <div className="text-center py-8">
          <p className="text-secondary">{t('dentistPatient.common.noPatientSelected')}</p>
        </div>
      </div>
    );
  }

  const labels = t('dentistPatient.medicalHistory') || {};

  const medicalHistory = patient.medicalHistory || {
    allergies: [],
    conditions: [],
    medications: [],
    surgeries: [],
    familyHistory: {},
    emergencyContact: {}
  };

  const handleAddItem = (section, callback) => {
    if (!newItem.trim()) return;
    
    const updatedHistory = {
      ...medicalHistory,
      [section]: [...(medicalHistory[section] || []), newItem.trim()]
    };
    
    if (callback) {
      callback(newItem.trim());
    }
    
    if (onUpdateHistory) {
      onUpdateHistory(updatedHistory);
    }
    
    setNewItem('');
    setEditingSection(null);
  };

  const handleRemoveItem = (section, index) => {
    const updatedHistory = {
      ...medicalHistory,
      [section]: medicalHistory[section].filter((_, i) => i !== index)
    };
    
    if (onUpdateHistory) {
      onUpdateHistory(updatedHistory);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'high': case 'severe': return 'text-error bg-error/10 border-error/30';
      case 'medium': case 'moderate': return 'text-warning bg-warning/10 border-warning/30';
      case 'low': case 'mild': return 'text-success bg-success/10 border-success/30';
      default: return 'text-secondary bg-muted border-primary/10';
    }
  };

  const getSeverityLabel = (severity) => {
    const key = (severity || '').toLowerCase();
    const label = t(`dentistPatient.medicalHistory.severity.${key}`);
    return typeof label === 'string' && !label.startsWith('dentistPatient')
      ? label
      : severity;
  };

  const getMedicalSectionIcon = (section) => {
    switch (section) {
      case 'allergies': return '⚠️';
      case 'conditions': return '🏥';
      case 'medications': return '💊';
      case 'surgeries': return '🔬';
      case 'familyHistory': return '👥';
      case 'emergencyContact': return '🚨';
      default: return '📋';
    }
  };

  const renderMedicalSection = (section, items, color = 'blue') => {
    const sectionLabels = labels.sections?.[section] || {};
    const cancelLabel = labels.actions?.cancel || t('dentistPatient.common.cancel');
    const toggleLabel = editingSection === section
      ? cancelLabel
      : sectionLabels.toggle || labels.actions?.add || t('dentistPatient.common.add');
    const addButtonLabel = labels.actions?.submit || t('dentistPatient.common.add');
    const placeholder = sectionLabels.placeholder || labels.placeholders?.default || '';
    const emptyLabel = sectionLabels.empty || labels.empty || '';
    const title = sectionLabels.title || section;

    return (
      <div className={`bg-${color}-50 dark:bg-${color}-900/10 rounded-lg p-4 border border-${color}-200 dark:border-${color}-800`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className={`font-semibold text-${color}-800 dark:text-${color}-200 flex items-center space-x-2`}>
            <span>{getMedicalSectionIcon(section)}</span>
            <span>{title}</span>
          </h3>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setEditingSection(editingSection === section ? null : section)}
            className="text-xs"
          >
            {toggleLabel}
          </Button>
        </div>
        
        {editingSection === section && (
          <div className="mb-3 flex space-x-2">
            <input
              type="text"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              placeholder={placeholder}
              className="flex-1 px-3 py-2 border border-primary/10 rounded-md bg-background text-primary focus:ring-2 focus:ring-brand-primary focus:border-transparent text-sm"
              onKeyPress={(e) => e.key === 'Enter' && handleAddItem(section)}
            />
            <Button size="sm" onClick={() => handleAddItem(section)}>
              {addButtonLabel}
            </Button>
          </div>
        )}
        
        {items && items.length > 0 ? (
          <div className="space-y-2">
            {items.map((item, index) => (
              <div key={index} className={`flex items-center justify-between p-2 bg-white dark:bg-surface rounded border border-${color}-100 dark:border-${color}-800`}>
                <div className="flex-1">
                  {typeof item === 'string' ? (
                    <span className={`text-${color}-700 dark:text-${color}-300 text-sm`}>{item}</span>
                  ) : (
                    <div>
                      <span className={`text-${color}-700 dark:text-${color}-300 text-sm font-medium`}>
                        {item.name || item.condition || item.medication}
                      </span>
                      {item.severity && (
                        <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium border ${getSeverityColor(item.severity)}`}>
                          {getSeverityLabel(item.severity)}
                        </span>
                      )}
                      {item.dosage && (
                        <span className="ml-2 text-xs text-secondary">
                          {item.dosage}
                        </span>
                      )}
                      {item.date && (
                        <span className="ml-2 text-xs text-secondary">
                          {item.date}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleRemoveItem(section, index)}
                  className="text-error hover:text-error hover:bg-error/10"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className={`text-${color}-600 dark:text-${color}-400 text-sm`}>
            {emptyLabel}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Medical History Header */}
      <div className="bg-surface-elevated border border-primary/10 rounded-xl shadow-theme-md theme-transition p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-primary">{labels.title}</h2>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => setIsEditing(!isEditing)}>
              {isEditing ? labels.actions?.view || t('dentistPatient.common.viewMode') : labels.actions?.edit || t('dentistPatient.common.editMode')}
            </Button>
            <Button>
              {labels.actions?.export || t('dentistPatient.common.export')}
            </Button>
          </div>
        </div>

        {/* Quick Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-surface rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-2 h-2 bg-error rounded-full"></div>
              <span className="text-sm font-medium text-text-primary">{labels.summary?.allergies}</span>
            </div>
            <p className="text-2xl font-bold text-primary">
              {medicalHistory.allergies?.length || 0}
            </p>
          </div>

          <div className="bg-surface rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-2 h-2 bg-warning rounded-full"></div>
              <span className="text-sm font-medium text-text-primary">{labels.summary?.conditions}</span>
            </div>
            <p className="text-2xl font-bold text-primary">
              {medicalHistory.conditions?.length || 0}
            </p>
          </div>

          <div className="bg-surface rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-2 h-2 bg-brand-primary rounded-full"></div>
              <span className="text-sm font-medium text-text-primary">{labels.summary?.medications}</span>
            </div>
            <p className="text-2xl font-bold text-primary">
              {medicalHistory.medications?.length || 0}
            </p>
          </div>

          <div className="bg-surface rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-2 h-2 bg-success rounded-full"></div>
              <span className="text-sm font-medium text-text-primary">{labels.summary?.surgeries}</span>
            </div>
            <p className="text-2xl font-bold text-primary">
              {medicalHistory.surgeries?.length || 0}
            </p>
          </div>
        </div>
      </div>

      {/* Medical History Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {renderMedicalSection('allergies', medicalHistory.allergies, 'red')}
        {renderMedicalSection('conditions', medicalHistory.conditions, 'yellow')}
        {renderMedicalSection('medications', medicalHistory.medications, 'blue')}
        {renderMedicalSection('surgeries', medicalHistory.surgeries, 'green')}
      </div>

      {/* Emergency Contact */}
      <div className="bg-surface-elevated border border-primary/10 rounded-xl shadow-theme-md theme-transition p-6">
        <h3 className="text-lg font-semibold text-primary mb-4 flex items-center space-x-2">
          <span>🚨</span>
          <span>{labels.emergency?.title}</span>
        </h3>

        {medicalHistory.emergencyContact && Object.keys(medicalHistory.emergencyContact).length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-text-primary">{labels.emergency?.name}</label>
              <p className="text-primary">{medicalHistory.emergencyContact.name || t('dentistPatient.common.notProvided')}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-text-primary">{labels.emergency?.relationship}</label>
              <p className="text-primary">{medicalHistory.emergencyContact.relationship || t('dentistPatient.common.notProvided')}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-text-primary">{labels.emergency?.phone}</label>
              <p className="text-primary">{medicalHistory.emergencyContact.phone || t('dentistPatient.common.notProvided')}</p>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-secondary">{labels.emergency?.empty}</p>
            <Button variant="outline" size="sm" className="mt-2">
              {labels.emergency?.add}
            </Button>
          </div>
        )}
      </div>

      {/* Family History */}
      <div className="bg-surface-elevated border border-primary/10 rounded-xl shadow-theme-md theme-transition p-6">
        <h3 className="text-lg font-semibold text-primary mb-4 flex items-center space-x-2">
          <span>👥</span>
          <span>{labels.family?.title}</span>
        </h3>

        {medicalHistory.familyHistory && Object.keys(medicalHistory.familyHistory).length > 0 ? (
          <div className="space-y-4">
            {Object.entries(medicalHistory.familyHistory).map(([relation, conditions]) => (
              <div key={relation} className="border border-primary/10 rounded-lg p-4">
                <h4 className="font-medium text-primary mb-2 capitalize">{relation}</h4>
                <div className="flex flex-wrap gap-2">
                  {conditions.map((condition, index) => (
                    <span key={index} className="px-2 py-1 bg-surface text-sm rounded border border-primary/10">
                      {condition}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-secondary">{labels.family?.empty}</p>
            <Button variant="outline" size="sm" className="mt-2">
              {labels.family?.add}
            </Button>
          </div>
        )}
      </div>

      {/* Medical History Timeline */}
      <div className="bg-surface-elevated border border-primary/10 rounded-xl shadow-theme-md theme-transition p-6">
        <h3 className="text-lg font-semibold text-primary mb-4 flex items-center space-x-2">
          <span>📋</span>
          <span>{labels.timeline?.title}</span>
        </h3>

        <div className="text-center py-8">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-secondary">{labels.timeline?.empty}</p>
        </div>
      </div>
    </div>
  );
};

export default PatientMedicalHistory;
