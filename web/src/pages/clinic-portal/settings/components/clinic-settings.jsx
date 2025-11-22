import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import { useLanguage } from '../../../../contexts/LanguageContext';
import Icon from '../../../../components/AppIcon';
import { authHttp } from '../../../../utils/httpClient';

const ClinicSettings = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Check if user can edit clinic settings
  const userRole = user?.roles?.[0] || user?.role || 'staff';
  const canEdit = ['owner', 'clinic_owner', 'manager', 'admin', 'clinic_staff'].includes(userRole);

  const [formData, setFormData] = useState({
    name: 'Klinik Gigi Serene',
    address: 'Jl. Sudirman No. 123, Jakarta Pusat',
    phone: '+62-21-12345678',
    email: 'info@klinikserene.com',
    license: 'KG-001/2024',
    taxId: '12.345.678.9-123.000',
    establishedDate: '2020-01-15',
    description: 'Klinik gigi modern dengan pelayanan terpadu dan teknologi terdepan'
  });

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canEdit) return;

    setIsSaving(true);
    try {
      // This would be the API call to save clinic settings
      // await authHttp.put('/clinic/profile', formData);
      
      // For now, just show success message
            showMessage('success', t('settings.clinicSaveSuccess') || 'Clinic information updated successfully!');
    } catch (error) {
      console.error('Clinic update error:', error);
            showMessage('error', error.response?.data?.message || t('settings.clinicSaveError') || 'Failed to update clinic information');
    } finally {
      setIsSaving(false);
    }
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

      {/* Basic Information */}
      <div className="bg-surface-elevated border border-primary rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-primary flex items-center space-x-2">
            <Icon name="Building" size={20} />
            <span>{t('clinic.settings.basicInfo') || 'Basic Information'}</span>
          </h2>
          {!canEdit && (
            <span className="text-xs bg-amber-100 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 px-3 py-1 rounded-full">
              {t('clinic.settings.readOnly') || 'Read Only'}
            </span>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                {t('clinic.settings.clinicName') || 'Clinic Name'} *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                disabled={!canEdit}
                className="w-full px-4 py-3 rounded-lg border border-primary bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                {t('clinic.settings.licenseNumber') || 'License Number'} *
              </label>
              <input
                type="text"
                name="license"
                value={formData.license}
                onChange={handleInputChange}
                required
                disabled={!canEdit}
                className="w-full px-4 py-3 rounded-lg border border-primary bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                {t('clinic.settings.phone') || 'Phone Number'} *
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                required
                disabled={!canEdit}
                className="w-full px-4 py-3 rounded-lg border border-primary bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                {t('clinic.settings.email') || 'Email Address'} *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                disabled={!canEdit}
                className="w-full px-4 py-3 rounded-lg border border-primary bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                {t('clinic.settings.taxId') || 'Tax ID (NPWP)'}
              </label>
              <input
                type="text"
                name="taxId"
                value={formData.taxId}
                onChange={handleInputChange}
                disabled={!canEdit}
                className="w-full px-4 py-3 rounded-lg border border-primary bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                {t('clinic.settings.establishedDate') || 'Established Date'}
              </label>
              <input
                type="date"
                name="establishedDate"
                value={formData.establishedDate}
                onChange={handleInputChange}
                disabled={!canEdit}
                className="w-full px-4 py-3 rounded-lg border border-primary bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              {t('clinic.settings.address') || 'Address'} *
            </label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              required
              rows={3}
              disabled={!canEdit}
              className="w-full px-4 py-3 rounded-lg border border-primary bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent resize-none disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              {t('clinic.settings.description') || 'Description'}
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={4}
              disabled={!canEdit}
              className="w-full px-4 py-3 rounded-lg border border-primary bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent resize-none disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder={t('clinic.settings.descriptionPlaceholder') || 'Describe your clinic...'}
            />
          </div>

          {canEdit && (
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-3 bg-accent text-white rounded-lg font-medium hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isSaving ? (
                  <>
                    <Icon name="Loader2" size={18} className="animate-spin" />
                    <span>{t('clinic.settings.saving') || 'Saving...'}</span>
                  </>
                ) : (
                  <>
                    <Icon name="Save" size={18} />
                    <span>{t('clinic.settings.saveChanges') || 'Save Changes'}</span>
                  </>
                )}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default ClinicSettings;