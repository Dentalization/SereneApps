import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import { useLanguage } from '../../../../contexts/LanguageContext';
import Icon from '../../../../components/AppIcon';
import { authHttp } from '../../../../utils/httpClient';
import ModalPortal from '../../../../components/ui/ModalPortal';

const TemplatesSettings = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Check if user can edit templates
  const userRole = user?.roles?.[0] || user?.role || 'staff';
  const canEdit = ['owner', 'clinic_owner', 'manager', 'admin', 'clinic_staff'].includes(userRole);

  const [templates, setTemplates] = useState([
    {
      id: 1,
      name: 'Appointment Reminder',
      type: 'notification',
      subject: 'Appointment Reminder - {{clinic_name}}',
      content: 'Dear {{patient_name}}, this is a reminder for your appointment on {{appointment_date}} at {{appointment_time}}.',
      variables: ['clinic_name', 'patient_name', 'appointment_date', 'appointment_time'],
      isActive: true,
      lastModified: '2024-01-15T10:30:00Z'
    },
    {
      id: 2,
      name: 'Treatment Plan',
      type: 'document',
      subject: 'Treatment Plan - {{patient_name}}',
      content: 'Treatment plan for {{patient_name}} - DOB: {{patient_dob}}\\n\\nDiagnosis: {{diagnosis}}\\nRecommended Treatment: {{treatment}}\\nEstimated Cost: {{cost}}',
      variables: ['patient_name', 'patient_dob', 'diagnosis', 'treatment', 'cost'],
      isActive: true,
      lastModified: '2024-01-14T14:20:00Z'
    }
  ]);

  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [previewContent, setPreviewContent] = useState(null);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    type: 'notification',
    subject: '',
    content: '',
    isActive: true
  });

  const templateTypes = [
    { 
      value: 'notification', 
      label: t('templates.types.notification') || 'Notification',
      description: t('templates.types.notificationDesc') || 'Email/SMS notifications'
    },
    { 
      value: 'document', 
      label: t('templates.types.document') || 'Document',
      description: t('templates.types.documentDesc') || 'Printable documents'
    },
    { 
      value: 'report', 
      label: t('templates.types.report') || 'Report',
      description: t('templates.types.reportDesc') || 'Medical reports'
    },
    { 
      value: 'receipt', 
      label: t('templates.types.receipt') || 'Receipt',
      description: t('templates.types.receiptDesc') || 'Payment receipts'
    }
  ];

  const availableVariables = [
    { key: 'clinic_name', label: t('templates.variables.clinicName') || 'Clinic Name' },
    { key: 'patient_name', label: t('templates.variables.patientName') || 'Patient Name' },
    { key: 'patient_email', label: t('templates.variables.patientEmail') || 'Patient Email' },
    { key: 'patient_phone', label: t('templates.variables.patientPhone') || 'Patient Phone' },
    { key: 'patient_dob', label: t('templates.variables.patientDob') || 'Patient Date of Birth' },
    { key: 'appointment_date', label: t('templates.variables.appointmentDate') || 'Appointment Date' },
    { key: 'appointment_time', label: t('templates.variables.appointmentTime') || 'Appointment Time' },
    { key: 'doctor_name', label: t('templates.variables.doctorName') || 'Doctor Name' },
    { key: 'diagnosis', label: t('templates.variables.diagnosis') || 'Diagnosis' },
    { key: 'treatment', label: t('templates.variables.treatment') || 'Treatment' },
    { key: 'cost', label: t('templates.variables.cost') || 'Cost' },
    { key: 'total_amount', label: t('templates.variables.totalAmount') || 'Total Amount' },
    { key: 'payment_method', label: t('templates.variables.paymentMethod') || 'Payment Method' },
    { key: 'today_date', label: t('templates.variables.todayDate') || 'Today Date' }
  ];

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString(t('common.locale') || 'id-ID', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const insertVariable = (variable, isEditing = false) => {
    const placeholder = `{{${variable}}}`;
    if (isEditing && selectedTemplate) {
      const template = templates.find(t => t.id === selectedTemplate);
      if (template) {
        setTemplates(prev => prev.map(t => 
          t.id === selectedTemplate 
            ? { ...t, content: t.content + ' ' + placeholder }
            : t
        ));
      }
    } else {
      setNewTemplate(prev => ({
        ...prev,
        content: prev.content + ' ' + placeholder
      }));
    }
  };

  const handleCreateTemplate = async () => {
    if (!canEdit || !newTemplate.name || !newTemplate.content) return;

    setIsSaving(true);
    try {
      // Extract variables from content
      const variables = [...newTemplate.content.matchAll(/{{(.*?)}}/g)].map(match => match[1]);
      
      const templateToAdd = {
        id: Date.now(),
        ...newTemplate,
        variables,
        lastModified: new Date().toISOString()
      };
      
      // API call would be here
      // await authHttp.post('/clinic/templates', templateToAdd);
      
      setTemplates(prev => [...prev, templateToAdd]);
      setNewTemplate({
        name: '',
        type: 'notification',
        subject: '',
        content: '',
        isActive: true
      });
      setShowCreateModal(false);
      showMessage('success', t('clinic.templates.createSuccess') || 'Template created successfully!');
    } catch (error) {
      console.error('Create template error:', error);
      showMessage('error', error.response?.data?.message || t('clinic.templates.createError') || 'Failed to create template');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateTemplate = async (templateId, updatedData) => {
    if (!canEdit) return;

    setIsSaving(true);
    try {
      // Extract variables from content
      const variables = [...updatedData.content.matchAll(/{{(.*?)}}/g)].map(match => match[1]);
      
      const finalData = {
        ...updatedData,
        variables,
        lastModified: new Date().toISOString()
      };
      
      // API call would be here
      // await authHttp.put(`/clinic/templates/${templateId}`, finalData);
      
      setTemplates(prev => prev.map(template => 
        template.id === templateId ? { ...template, ...finalData } : template
      ));
      setSelectedTemplate(null);
      showMessage('success', t('clinic.templates.updateSuccess') || 'Template updated successfully!');
    } catch (error) {
      console.error('Update template error:', error);
      showMessage('error', error.response?.data?.message || t('clinic.templates.updateError') || 'Failed to update template');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!canEdit || !confirm(t('clinic.templates.deleteConfirm') || 'Are you sure you want to delete this template?')) return;

    try {
      // API call would be here
      // await authHttp.delete(`/clinic/templates/${templateId}`);
      
      setTemplates(prev => prev.filter(template => template.id !== templateId));
      showMessage('success', t('clinic.templates.deleteSuccess') || 'Template deleted successfully!');
    } catch (error) {
      console.error('Delete template error:', error);
      showMessage('error', t('clinic.templates.deleteError') || 'Failed to delete template');
    }
  };

  const handleToggleActive = async (templateId, isActive) => {
    if (!canEdit) return;
    
    try {
      // API call would be here
      // await authHttp.patch(`/clinic/templates/${templateId}`, { isActive });
      
      setTemplates(prev => prev.map(template => 
        template.id === templateId ? { ...template, isActive } : template
      ));
    } catch (error) {
      console.error('Toggle active error:', error);
      showMessage('error', t('clinic.templates.toggleError') || 'Failed to update template status');
    }
  };

  const previewTemplate = (template) => {
    // Mock preview with sample data
    let preview = template.content;
    const sampleData = {
      clinic_name: 'SereneAI Dental Clinic',
      patient_name: 'John Doe',
      patient_email: 'john@example.com',
      patient_phone: '+62812345678',
      patient_dob: '1985-03-15',
      appointment_date: '2024-01-20',
      appointment_time: '10:00 AM',
      doctor_name: 'Dr. Smith',
      diagnosis: 'Tooth decay',
      treatment: 'Dental filling',
      cost: 'Rp 500,000',
      total_amount: 'Rp 500,000',
      payment_method: 'Cash',
      today_date: new Date().toLocaleDateString('id-ID')
    };

    Object.keys(sampleData).forEach(key => {
      preview = preview.replace(new RegExp(`{{${key}}}`, 'g'), sampleData[key]);
    });

    return preview;
  };

  return (
    <div className="space-y-8">
      {/* Message Display */}
      {message.text && (
        <div className={`p-4 rounded-lg border ${
          message.type === 'success' 
            ? 'bg-green-50 border-green-200 text-green-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="flex items-center space-x-2">
            <Icon 
              name={message.type === 'success' ? 'CheckCircle' : 'AlertCircle'} 
              size={16} 
            />
            <span className="text-sm font-medium">{message.text}</span>
          </div>
        </div>
      )}

      {/* Templates Management */}
      <div className="bg-surface-elevated border border-primary rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-primary flex items-center space-x-2">
            <Icon name="FileText" size={20} />
            <span>{t('clinic.templates.title') || 'Document Templates'}</span>
          </h2>
          {canEdit && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors flex items-center space-x-2"
            >
              <Icon name="Plus" size={16} />
              <span>{t('clinic.templates.createTemplate') || 'Create Template'}</span>
            </button>
          )}
        </div>

        {!canEdit && (
          <div className="mb-4">
            <span className="text-xs bg-amber-100 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 px-3 py-1 rounded-full">
              {t('clinic.settings.readOnly') || 'Read Only'}
            </span>
          </div>
        )}

        {/* Templates List */}
        <div className="space-y-4">
          {templates.length === 0 ? (
            <div className="text-center py-8 text-secondary">
              <Icon name="FileText" size={32} className="mx-auto mb-2 opacity-50" />
              <p>{t('clinic.templates.noTemplates') || 'No templates configured'}</p>
            </div>
          ) : (
            templates.map((template) => (
              <div key={template.id} className="border border-primary/10 rounded-lg p-4 bg-surface">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="font-medium text-primary">{template.name}</h3>
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                        {templateTypes.find(type => type.value === template.type)?.label || template.type}
                      </span>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={template.isActive}
                          onChange={(e) => handleToggleActive(template.id, e.target.checked)}
                          disabled={!canEdit}
                          className="rounded border-primary/20 text-accent focus:ring-accent disabled:opacity-50"
                        />
                        <span className={`text-xs ${template.isActive ? 'text-green-600' : 'text-red-600'}`}>
                          {template.isActive ? (t('clinic.templates.active') || 'Active') : (t('clinic.templates.inactive') || 'Inactive')}
                        </span>
                      </div>
                    </div>
                    
                    {template.subject && (
                      <p className="text-sm text-secondary mb-2">
                        <strong>{t('clinic.templates.subject') || 'Subject'}:</strong> {template.subject}
                      </p>
                    )}
                    
                    <p className="text-sm text-secondary mb-2 line-clamp-2">{template.content}</p>
                    
                    <div className="flex items-center justify-between text-xs text-secondary">
                      <span>
                        {t('clinic.templates.variables') || 'Variables'}: {template.variables?.length || 0}
                      </span>
                      <span>
                        {t('clinic.templates.lastModified') || 'Modified'}: {formatDate(template.lastModified)}
                      </span>
                    </div>
                  </div>

                  {canEdit && (
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => {
                          const preview = previewTemplate(template);
                          setPreviewContent(preview);
                        }}
                        className="p-2 text-secondary hover:text-primary hover:bg-surface-elevated rounded-lg transition-colors"
                        title={t('clinic.templates.preview') || 'Preview'}
                      >
                        <Icon name="Eye" size={16} />
                      </button>
                      <button
                        onClick={() => setSelectedTemplate(selectedTemplate === template.id ? null : template.id)}
                        className="p-2 text-secondary hover:text-primary hover:bg-surface-elevated rounded-lg transition-colors"
                        title={t('clinic.templates.edit') || 'Edit'}
                      >
                        <Icon name="Edit2" size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title={t('clinic.templates.delete') || 'Delete'}
                      >
                        <Icon name="Trash2" size={16} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Edit Template Form */}
                {selectedTemplate === template.id && canEdit && (
                  <div className="mt-4 pt-4 border-t border-primary/10 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">
                        {t('clinic.templates.name') || 'Template Name'}
                      </label>
                      <input
                        type="text"
                        value={template.name}
                        onChange={(e) => setTemplates(prev => prev.map(t => 
                          t.id === template.id ? { ...t, name: e.target.value } : t
                        ))}
                        className="w-full px-3 py-2 border border-primary/20 rounded-lg bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
                      />
                    </div>

                    {template.type !== 'document' && (
                      <div>
                        <label className="block text-sm font-medium text-primary mb-2">
                          {t('clinic.templates.subject') || 'Subject'}
                        </label>
                        <input
                          type="text"
                          value={template.subject}
                          onChange={(e) => setTemplates(prev => prev.map(t => 
                            t.id === template.id ? { ...t, subject: e.target.value } : t
                          ))}
                          className="w-full px-3 py-2 border border-primary/20 rounded-lg bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">
                        {t('clinic.templates.content') || 'Content'}
                      </label>
                      <textarea
                        value={template.content}
                        onChange={(e) => setTemplates(prev => prev.map(t => 
                          t.id === template.id ? { ...t, content: e.target.value } : t
                        ))}
                        rows="6"
                        className="w-full px-3 py-2 border border-primary/20 rounded-lg bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent resize-none"
                      />
                    </div>

                    {/* Variables Helper */}
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">
                        {t('clinic.templates.availableVariables') || 'Available Variables'}
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {availableVariables.map(variable => (
                          <button
                            key={variable.key}
                            onClick={() => insertVariable(variable.key, true)}
                            className="px-2 py-1 text-xs bg-accent/10 text-accent rounded hover:bg-accent/20 transition-colors"
                            title={variable.label}
                          >
                            {variable.key}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={() => setSelectedTemplate(null)}
                        className="px-4 py-2 text-secondary hover:text-primary transition-colors"
                      >
                        {t('common.cancel') || 'Cancel'}
                      </button>
                      <button
                        onClick={() => handleUpdateTemplate(template.id, template)}
                        disabled={isSaving}
                        className="px-6 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                      >
                        {isSaving ? (
                          <>
                            <Icon name="Loader2" size={16} className="animate-spin" />
                            <span>{t('common.saving') || 'Saving...'}</span>
                          </>
                        ) : (
                          <>
                            <Icon name="Save" size={16} />
                            <span>{t('common.save') || 'Save'}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create Template Modal */}
      {showCreateModal && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowCreateModal(false)}
          >
          <div
            className="relative w-full max-w-2xl max-h-[90vh] bg-surface-elevated rounded-2xl shadow-2xl p-6 overflow-y-auto flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-primary">
                {t('clinic.templates.createTemplate') || 'Create Template'}
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 text-secondary hover:text-primary rounded-lg transition-colors"
              >
                <Icon name="X" size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-primary mb-2">
                    {t('clinic.templates.name') || 'Template Name'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                    placeholder={t('clinic.templates.namePlaceholder') || 'Enter template name'}
                    className="w-full px-3 py-2 border border-primary/20 rounded-lg bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary mb-2">
                    {t('clinic.templates.type') || 'Type'}
                  </label>
                  <select
                    value={newTemplate.type}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full px-3 py-2 border border-primary/20 rounded-lg bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
                  >
                    {templateTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {newTemplate.type !== 'document' && (
                <div>
                  <label className="block text-sm font-medium text-primary mb-2">
                    {t('clinic.templates.subject') || 'Subject'}
                  </label>
                  <input
                    type="text"
                    value={newTemplate.subject}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder={t('clinic.templates.subjectPlaceholder') || 'Enter subject line'}
                    className="w-full px-3 py-2 border border-primary/20 rounded-lg bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  {t('clinic.templates.content') || 'Content'} <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={newTemplate.content}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, content: e.target.value }))}
                  placeholder={t('clinic.templates.contentPlaceholder') || 'Enter template content...'}
                  rows="6"
                  className="w-full px-3 py-2 border border-primary/20 rounded-lg bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent resize-none"
                  required
                />
              </div>

              {/* Variables Helper */}
              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  {t('clinic.templates.availableVariables') || 'Available Variables'}
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableVariables.map(variable => (
                    <button
                      key={variable.key}
                      onClick={() => insertVariable(variable.key)}
                      className="px-2 py-1 text-xs bg-accent/10 text-accent rounded hover:bg-accent/20 transition-colors"
                      title={variable.label}
                    >
                      {variable.key}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-secondary mt-2">
                  {t('clinic.templates.variablesHelp') || 'Click on variables to insert them into your template'}
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-secondary hover:text-primary transition-colors"
              >
                {t('common.cancel') || 'Cancel'}
              </button>
              <button
                onClick={handleCreateTemplate}
                disabled={isSaving || !newTemplate.name || !newTemplate.content}
                className="px-6 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isSaving ? (
                  <>
                    <Icon name="Loader2" size={16} className="animate-spin" />
                    <span>{t('common.creating') || 'Creating...'}</span>
                  </>
                ) : (
                  <>
                    <Icon name="Plus" size={16} />
                    <span>{t('common.create') || 'Create'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}

      {/* Preview Modal */}
      {previewContent && (
        <ModalPortal>
          <div 
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setPreviewContent(null)}
          >
            <div 
              className="relative w-full max-w-lg bg-surface-elevated rounded-2xl shadow-2xl p-6 flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-primary">
                  {t('clinic.templates.preview') || 'Template Preview'}
                </h3>
                <button
                  onClick={() => setPreviewContent(null)}
                  className="p-2 text-secondary hover:text-primary rounded-lg transition-colors"
                >
                  <Icon name="X" size={20} />
                </button>
              </div>
              <div className="bg-surface p-4 rounded-xl border border-primary/10 text-primary text-sm whitespace-pre-wrap min-h-[120px] max-h-[60vh] overflow-y-auto">
                {previewContent}
              </div>
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setPreviewContent(null)}
                  className="px-6 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors font-medium text-sm"
                >
                  {t('common.close') || 'Close'}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};

export default TemplatesSettings;
