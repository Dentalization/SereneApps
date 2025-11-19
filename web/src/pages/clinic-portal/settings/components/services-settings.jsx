import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import { useLanguage } from '../../../../contexts/LanguageContext';
import Icon from '../../../../components/AppIcon';
import { authHttp } from '../../../../utils/httpClient';

const ServicesSettings = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Check if user can edit services
  const userRole = user?.roles?.[0] || user?.role || 'staff';
  const canEdit = ['owner', 'manager', 'admin'].includes(userRole);

  const [services, setServices] = useState([
    {
      id: 1,
      name: 'Consultation',
      category: 'general',
      price: 150000,
      duration: 30,
      description: 'General dental consultation',
      active: true
    },
    {
      id: 2,
      name: 'Teeth Cleaning',
      category: 'cleaning',
      price: 250000,
      duration: 45,
      description: 'Professional teeth cleaning',
      active: true
    }
  ]);

  const [newService, setNewService] = useState({
    name: '',
    category: 'general',
    price: '',
    duration: '',
    description: '',
    active: true
  });

  const [editingService, setEditingService] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const categories = [
    { value: 'general', label: t('clinic.services.categories.general') || 'General' },
    { value: 'cleaning', label: t('clinic.services.categories.cleaning') || 'Cleaning' },
    { value: 'filling', label: t('clinic.services.categories.filling') || 'Filling' },
    { value: 'extraction', label: t('clinic.services.categories.extraction') || 'Extraction' },
    { value: 'surgery', label: t('clinic.services.categories.surgery') || 'Surgery' },
    { value: 'cosmetic', label: t('clinic.services.categories.cosmetic') || 'Cosmetic' },
    { value: 'orthodontic', label: t('clinic.services.categories.orthodontic') || 'Orthodontic' },
    { value: 'other', label: t('clinic.services.categories.other') || 'Other' }
  ];

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const handleAddService = async () => {
    if (!canEdit || !newService.name || !newService.price) return;

    try {
      setIsSaving(true);
      // API call would be here
      // const response = await authHttp.post('/clinic/services', newService);
      
      const serviceToAdd = {
        id: Date.now(),
        ...newService,
        price: parseInt(newService.price)
      };
      
      setServices(prev => [...prev, serviceToAdd]);
      setNewService({
        name: '',
        category: 'general',
        price: '',
        duration: '',
        description: '',
        active: true
      });
      setShowAddForm(false);
      showMessage('success', t('clinic.services.addSuccess') || 'Service added successfully!');
    } catch (error) {
      console.error('Add service error:', error);
      showMessage('error', error.response?.data?.message || t('clinic.services.addError') || 'Failed to add service');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateService = async (serviceId, updatedData) => {
    if (!canEdit) return;

    try {
      setIsSaving(true);
      // API call would be here
      // await authHttp.put(`/clinic/services/${serviceId}`, updatedData);
      
      setServices(prev => prev.map(service => 
        service.id === serviceId 
          ? { ...service, ...updatedData, price: parseInt(updatedData.price) }
          : service
      ));
      setEditingService(null);
      showMessage('success', t('clinic.services.updateSuccess') || 'Service updated successfully!');
    } catch (error) {
      console.error('Update service error:', error);
      showMessage('error', error.response?.data?.message || t('clinic.services.updateError') || 'Failed to update service');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteService = async (serviceId) => {
    if (!canEdit || !confirm(t('clinic.services.deleteConfirm') || 'Are you sure you want to delete this service?')) return;

    try {
      setIsSaving(true);
      // API call would be here
      // await authHttp.delete(`/clinic/services/${serviceId}`);
      
      setServices(prev => prev.filter(service => service.id !== serviceId));
      showMessage('success', t('clinic.services.deleteSuccess') || 'Service deleted successfully!');
    } catch (error) {
      console.error('Delete service error:', error);
      showMessage('error', error.response?.data?.message || t('clinic.services.deleteError') || 'Failed to delete service');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (serviceId, active) => {
    if (!canEdit) return;
    
    try {
      // API call would be here
      // await authHttp.patch(`/clinic/services/${serviceId}`, { active });
      
      setServices(prev => prev.map(service => 
        service.id === serviceId ? { ...service, active } : service
      ));
    } catch (error) {
      console.error('Toggle active error:', error);
      showMessage('error', t('clinic.services.toggleError') || 'Failed to update service status');
    }
  };

  const ServiceForm = ({ service, onSubmit, onCancel, isEditing = false }) => {
    const [formData, setFormData] = useState(service);

    const handleSubmit = (e) => {
      e.preventDefault();
      onSubmit(formData);
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-surface rounded-lg border border-primary/10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              {t('clinic.services.name') || 'Service Name'} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder={t('clinic.services.namePlaceholder') || 'Enter service name'}
              className="w-full px-3 py-2 border border-primary/20 rounded-lg bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              {t('clinic.services.category') || 'Category'}
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              className="w-full px-3 py-2 border border-primary/20 rounded-lg bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
            >
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              {t('clinic.services.price') || 'Price (IDR)'} <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={formData.price}
              onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
              placeholder="0"
              min="0"
              className="w-full px-3 py-2 border border-primary/20 rounded-lg bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              {t('clinic.services.duration') || 'Duration (minutes)'}
            </label>
            <input
              type="number"
              value={formData.duration}
              onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
              placeholder="30"
              min="1"
              className="w-full px-3 py-2 border border-primary/20 rounded-lg bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-primary mb-2">
            {t('clinic.services.description') || 'Description'}
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder={t('clinic.services.descriptionPlaceholder') || 'Enter service description'}
            rows="3"
            className="w-full px-3 py-2 border border-primary/20 rounded-lg bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent resize-none"
          />
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.active}
              onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
              className="rounded border-primary/20 text-accent focus:ring-accent"
            />
            <span className="text-sm text-primary">{t('clinic.services.active') || 'Active'}</span>
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-secondary hover:text-primary transition-colors"
          >
            {t('common.cancel') || 'Cancel'}
          </button>
          <button
            type="submit"
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
                <span>{isEditing ? (t('common.update') || 'Update') : (t('common.add') || 'Add')}</span>
              </>
            )}
          </button>
        </div>
      </form>
    );
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

      {/* Services List */}
      <div className="bg-surface-elevated border border-primary rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-primary flex items-center space-x-2">
            <Icon name="Wrench" size={20} />
            <span>{t('clinic.services.title') || 'Services & Pricing'}</span>
          </h2>
          {canEdit && (
            <button
              onClick={() => setShowAddForm(true)}
              className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors flex items-center space-x-2"
            >
              <Icon name="Plus" size={16} />
              <span>{t('clinic.services.addService') || 'Add Service'}</span>
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

        {/* Add Service Form */}
        {showAddForm && canEdit && (
          <div className="mb-6">
            <ServiceForm
              service={newService}
              onSubmit={handleAddService}
              onCancel={() => setShowAddForm(false)}
              isEditing={false}
            />
          </div>
        )}

        {/* Services List */}
        <div className="space-y-4">
          {services.length === 0 ? (
            <div className="text-center py-8 text-secondary">
              <Icon name="Wrench" size={32} className="mx-auto mb-2 opacity-50" />
              <p>{t('clinic.services.noServices') || 'No services configured'}</p>
            </div>
          ) : (
            services.map((service) => (
              <div key={service.id} className="border border-primary/10 rounded-lg p-4 bg-surface">
                {editingService === service.id ? (
                  <ServiceForm
                    service={service}
                    onSubmit={(data) => handleUpdateService(service.id, data)}
                    onCancel={() => setEditingService(null)}
                    isEditing={true}
                  />
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-medium text-primary">{service.name}</h3>
                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                          {categories.find(cat => cat.value === service.category)?.label || service.category}
                        </span>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={service.active}
                            onChange={(e) => handleToggleActive(service.id, e.target.checked)}
                            disabled={!canEdit}
                            className="rounded border-primary/20 text-accent focus:ring-accent disabled:opacity-50"
                          />
                          <span className={`text-xs ${service.active ? 'text-green-600' : 'text-red-600'}`}>
                            {service.active ? (t('clinic.services.active') || 'Active') : (t('clinic.services.inactive') || 'Inactive')}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-secondary">
                        <span className="font-medium text-accent">{formatCurrency(service.price)}</span>
                        {service.duration && (
                          <span>{service.duration} {t('clinic.services.minutes') || 'min'}</span>
                        )}
                      </div>
                      
                      {service.description && (
                        <p className="text-sm text-secondary mt-2">{service.description}</p>
                      )}
                    </div>

                    {canEdit && (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setEditingService(service.id)}
                          className="p-2 text-secondary hover:text-primary hover:bg-surface-elevated rounded-lg transition-colors"
                        >
                          <Icon name="Edit2" size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteService(service.id)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <Icon name="Trash2" size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ServicesSettings;