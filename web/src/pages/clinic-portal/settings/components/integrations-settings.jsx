import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import { useLanguage } from '../../../../contexts/LanguageContext';
import Icon from '../../../../components/AppIcon';
import { authHttp } from '../../../../utils/httpClient';

const IntegrationsSettings = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Check if user can edit integrations
  const userRole = user?.roles?.[0] || user?.role || 'staff';
  const canEdit = ['owner', 'manager', 'admin'].includes(userRole);

  const [integrations, setIntegrations] = useState({
    whatsapp: {
      enabled: false,
      businessNumber: '',
      accessToken: '',
      webhookUrl: '',
      verifyToken: '',
      status: 'disconnected'
    },
    bpjs: {
      enabled: false,
      consId: '',
      secretKey: '',
      userKey: '',
      baseUrl: 'https://apijkn-dev.bpjs-kesehatan.go.id',
      status: 'disconnected'
    },
    payment: {
      midtrans: {
        enabled: false,
        serverKey: '',
        clientKey: '',
        isProduction: false,
        status: 'disconnected'
      },
      xendit: {
        enabled: false,
        secretKey: '',
        publicKey: '',
        webhookToken: '',
        status: 'disconnected'
      }
    },
    sms: {
      enabled: false,
      provider: 'twilio',
      accountSid: '',
      authToken: '',
      fromNumber: '',
      status: 'disconnected'
    }
  });

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleIntegrationToggle = async (type, subType = null) => {
    if (!canEdit) return;

    try {
      const path = subType ? `${type}.${subType}.enabled` : `${type}.enabled`;
      const newValue = subType 
        ? !integrations[type][subType].enabled 
        : !integrations[type].enabled;

      // Update local state
      setIntegrations(prev => {
        const updated = { ...prev };
        if (subType) {
          updated[type] = {
            ...updated[type],
            [subType]: {
              ...updated[type][subType],
              enabled: newValue
            }
          };
        } else {
          updated[type] = {
            ...updated[type],
            enabled: newValue
          };
        }
        return updated;
      });

      // API call would be here
      // await authHttp.patch('/clinic/integrations', { [path]: newValue });

    } catch (error) {
      console.error('Integration toggle error:', error);
      showMessage('error', t('clinic.integrations.toggleError') || 'Failed to update integration');
    }
  };

  const handleConfigSave = async (type, config, subType = null) => {
    if (!canEdit) return;

    setIsSaving(true);
    try {
      // API call would be here
      // await authHttp.put(`/clinic/integrations/${type}${subType ? `/${subType}` : ''}`, config);

      // Update local state
      setIntegrations(prev => {
        const updated = { ...prev };
        if (subType) {
          updated[type] = {
            ...updated[type],
            [subType]: {
              ...updated[type][subType],
              ...config
            }
          };
        } else {
          updated[type] = {
            ...updated[type],
            ...config
          };
        }
        return updated;
      });

      showMessage('success', t('clinic.integrations.saveSuccess') || 'Integration settings saved successfully!');
    } catch (error) {
      console.error('Config save error:', error);
      showMessage('error', error.response?.data?.message || t('clinic.integrations.saveError') || 'Failed to save integration settings');
    } finally {
      setIsSaving(false);
    }
  };

  const testConnection = async (type, subType = null) => {
    if (!canEdit) return;

    try {
      setIsLoading(true);
      // API call would be here
      // const response = await authHttp.post(`/clinic/integrations/${type}${subType ? `/${subType}` : ''}/test`);
      
      // Mock successful connection test
      const path = subType ? `${type}.${subType}.status` : `${type}.status`;
      setIntegrations(prev => {
        const updated = { ...prev };
        if (subType) {
          updated[type][subType].status = 'connected';
        } else {
          updated[type].status = 'connected';
        }
        return updated;
      });

      showMessage('success', t('clinic.integrations.testSuccess') || 'Connection test successful!');
    } catch (error) {
      console.error('Connection test error:', error);
      showMessage('error', t('clinic.integrations.testError') || 'Connection test failed');
    } finally {
      setIsLoading(false);
    }
  };

  const IntegrationCard = ({ title, description, icon, enabled, status, children, onToggle }) => (
    <div className="bg-surface-elevated border border-primary rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
            <Icon name={icon} size={20} className="text-accent" />
          </div>
          <div>
            <h3 className="font-semibold text-primary">{title}</h3>
            <p className="text-sm text-secondary">{description}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs ${
            status === 'connected' 
              ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300'
              : status === 'error'
              ? 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300'
              : 'bg-gray-100 dark:bg-gray-900/20 text-gray-800 dark:text-gray-300'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              status === 'connected' ? 'bg-green-500' 
              : status === 'error' ? 'bg-red-500' 
              : 'bg-gray-500'
            }`} />
            <span className="capitalize">{status}</span>
          </div>
          
          {canEdit && (
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={enabled}
                onChange={onToggle}
                className="rounded border-primary/20 text-accent focus:ring-accent"
              />
              <span className="text-sm text-primary">
                {t('clinic.integrations.enabled') || 'Enabled'}
              </span>
            </div>
          )}
        </div>
      </div>

      {enabled && children}
    </div>
  );

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

      {!canEdit && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Icon name="Lock" size={16} className="text-amber-600" />
            <span className="text-sm text-amber-800 dark:text-amber-300">
              {t('clinic.settings.readOnlyIntegrations') || 'You can only view integration settings'}
            </span>
          </div>
        </div>
      )}

      {/* WhatsApp Business */}
      <IntegrationCard
        title={t('clinic.integrations.whatsapp.title') || 'WhatsApp Business'}
        description={t('clinic.integrations.whatsapp.description') || 'Send appointment reminders and notifications'}
        icon="MessageCircle"
        enabled={integrations.whatsapp.enabled}
        status={integrations.whatsapp.status}
        onToggle={() => handleIntegrationToggle('whatsapp')}
      >
        <div className="space-y-4 pt-4 border-t border-primary/10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                {t('clinic.integrations.whatsapp.businessNumber') || 'Business Phone Number'}
              </label>
              <input
                type="text"
                value={integrations.whatsapp.businessNumber}
                onChange={(e) => setIntegrations(prev => ({
                  ...prev,
                  whatsapp: { ...prev.whatsapp, businessNumber: e.target.value }
                }))}
                placeholder="+62812345678"
                disabled={!canEdit}
                className="w-full px-3 py-2 border border-primary/20 rounded-lg bg-surface text-primary disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                {t('clinic.integrations.whatsapp.accessToken') || 'Access Token'}
              </label>
              <input
                type="password"
                value={integrations.whatsapp.accessToken}
                onChange={(e) => setIntegrations(prev => ({
                  ...prev,
                  whatsapp: { ...prev.whatsapp, accessToken: e.target.value }
                }))}
                placeholder="Enter access token"
                disabled={!canEdit}
                className="w-full px-3 py-2 border border-primary/20 rounded-lg bg-surface text-primary disabled:opacity-50"
              />
            </div>
          </div>
          
          {canEdit && (
            <div className="flex space-x-3">
              <button
                onClick={() => handleConfigSave('whatsapp', integrations.whatsapp)}
                disabled={isSaving}
                className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover disabled:opacity-50 flex items-center space-x-2"
              >
                <Icon name="Save" size={16} />
                <span>{t('common.save') || 'Save'}</span>
              </button>
              <button
                onClick={() => testConnection('whatsapp')}
                disabled={isLoading}
                className="px-4 py-2 border border-primary/20 text-primary rounded-lg hover:bg-surface-elevated disabled:opacity-50 flex items-center space-x-2"
              >
                <Icon name="Zap" size={16} />
                <span>{t('clinic.integrations.testConnection') || 'Test Connection'}</span>
              </button>
            </div>
          )}
        </div>
      </IntegrationCard>

      {/* BPJS Integration */}
      <IntegrationCard
        title={t('clinic.integrations.bpjs.title') || 'BPJS Kesehatan'}
        description={t('clinic.integrations.bpjs.description') || 'Integrate with BPJS insurance system'}
        icon="Shield"
        enabled={integrations.bpjs.enabled}
        status={integrations.bpjs.status}
        onToggle={() => handleIntegrationToggle('bpjs')}
      >
        <div className="space-y-4 pt-4 border-t border-primary/10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                {t('clinic.integrations.bpjs.consId') || 'Consumer ID'}
              </label>
              <input
                type="text"
                value={integrations.bpjs.consId}
                onChange={(e) => setIntegrations(prev => ({
                  ...prev,
                  bpjs: { ...prev.bpjs, consId: e.target.value }
                }))}
                disabled={!canEdit}
                className="w-full px-3 py-2 border border-primary/20 rounded-lg bg-surface text-primary disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                {t('clinic.integrations.bpjs.secretKey') || 'Secret Key'}
              </label>
              <input
                type="password"
                value={integrations.bpjs.secretKey}
                onChange={(e) => setIntegrations(prev => ({
                  ...prev,
                  bpjs: { ...prev.bpjs, secretKey: e.target.value }
                }))}
                disabled={!canEdit}
                className="w-full px-3 py-2 border border-primary/20 rounded-lg bg-surface text-primary disabled:opacity-50"
              />
            </div>
          </div>
          
          {canEdit && (
            <div className="flex space-x-3">
              <button
                onClick={() => handleConfigSave('bpjs', integrations.bpjs)}
                disabled={isSaving}
                className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover disabled:opacity-50 flex items-center space-x-2"
              >
                <Icon name="Save" size={16} />
                <span>{t('common.save') || 'Save'}</span>
              </button>
              <button
                onClick={() => testConnection('bpjs')}
                disabled={isLoading}
                className="px-4 py-2 border border-primary/20 text-primary rounded-lg hover:bg-surface-elevated disabled:opacity-50 flex items-center space-x-2"
              >
                <Icon name="Zap" size={16} />
                <span>{t('clinic.integrations.testConnection') || 'Test Connection'}</span>
              </button>
            </div>
          )}
        </div>
      </IntegrationCard>

      {/* Payment Gateways */}
      <div className="bg-surface-elevated border border-primary rounded-2xl p-6">
        <h2 className="text-xl font-semibold text-primary mb-6 flex items-center space-x-2">
          <Icon name="CreditCard" size={20} />
          <span>{t('clinic.integrations.payment.title') || 'Payment Gateways'}</span>
        </h2>

        <div className="space-y-6">
          {/* Midtrans */}
          <IntegrationCard
            title="Midtrans"
            description={t('clinic.integrations.payment.midtrans.description') || 'Accept payments via Midtrans'}
            icon="CreditCard"
            enabled={integrations.payment.midtrans.enabled}
            status={integrations.payment.midtrans.status}
            onToggle={() => handleIntegrationToggle('payment', 'midtrans')}
          >
            <div className="space-y-4 pt-4 border-t border-primary/10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-primary mb-2">
                    {t('clinic.integrations.payment.serverKey') || 'Server Key'}
                  </label>
                  <input
                    type="password"
                    value={integrations.payment.midtrans.serverKey}
                    onChange={(e) => setIntegrations(prev => ({
                      ...prev,
                      payment: {
                        ...prev.payment,
                        midtrans: { ...prev.payment.midtrans, serverKey: e.target.value }
                      }
                    }))}
                    disabled={!canEdit}
                    className="w-full px-3 py-2 border border-primary/20 rounded-lg bg-surface text-primary disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary mb-2">
                    {t('clinic.integrations.payment.clientKey') || 'Client Key'}
                  </label>
                  <input
                    type="text"
                    value={integrations.payment.midtrans.clientKey}
                    onChange={(e) => setIntegrations(prev => ({
                      ...prev,
                      payment: {
                        ...prev.payment,
                        midtrans: { ...prev.payment.midtrans, clientKey: e.target.value }
                      }
                    }))}
                    disabled={!canEdit}
                    className="w-full px-3 py-2 border border-primary/20 rounded-lg bg-surface text-primary disabled:opacity-50"
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={integrations.payment.midtrans.isProduction}
                  onChange={(e) => setIntegrations(prev => ({
                    ...prev,
                    payment: {
                      ...prev.payment,
                      midtrans: { ...prev.payment.midtrans, isProduction: e.target.checked }
                    }
                  }))}
                  disabled={!canEdit}
                  className="rounded border-primary/20 text-accent focus:ring-accent disabled:opacity-50"
                />
                <span className="text-sm text-primary">
                  {t('clinic.integrations.payment.production') || 'Production Mode'}
                </span>
              </div>
              
              {canEdit && (
                <div className="flex space-x-3">
                  <button
                    onClick={() => handleConfigSave('payment', integrations.payment.midtrans, 'midtrans')}
                    disabled={isSaving}
                    className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover disabled:opacity-50 flex items-center space-x-2"
                  >
                    <Icon name="Save" size={16} />
                    <span>{t('common.save') || 'Save'}</span>
                  </button>
                  <button
                    onClick={() => testConnection('payment', 'midtrans')}
                    disabled={isLoading}
                    className="px-4 py-2 border border-primary/20 text-primary rounded-lg hover:bg-surface-elevated disabled:opacity-50 flex items-center space-x-2"
                  >
                    <Icon name="Zap" size={16} />
                    <span>{t('clinic.integrations.testConnection') || 'Test Connection'}</span>
                  </button>
                </div>
              )}
            </div>
          </IntegrationCard>

          {/* Xendit */}
          <IntegrationCard
            title="Xendit"
            description={t('clinic.integrations.payment.xendit.description') || 'Accept payments via Xendit'}
            icon="CreditCard"
            enabled={integrations.payment.xendit.enabled}
            status={integrations.payment.xendit.status}
            onToggle={() => handleIntegrationToggle('payment', 'xendit')}
          >
            <div className="space-y-4 pt-4 border-t border-primary/10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-primary mb-2">
                    {t('clinic.integrations.payment.secretKey') || 'Secret Key'}
                  </label>
                  <input
                    type="password"
                    value={integrations.payment.xendit.secretKey}
                    onChange={(e) => setIntegrations(prev => ({
                      ...prev,
                      payment: {
                        ...prev.payment,
                        xendit: { ...prev.payment.xendit, secretKey: e.target.value }
                      }
                    }))}
                    disabled={!canEdit}
                    className="w-full px-3 py-2 border border-primary/20 rounded-lg bg-surface text-primary disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary mb-2">
                    {t('clinic.integrations.payment.publicKey') || 'Public Key'}
                  </label>
                  <input
                    type="text"
                    value={integrations.payment.xendit.publicKey}
                    onChange={(e) => setIntegrations(prev => ({
                      ...prev,
                      payment: {
                        ...prev.payment,
                        xendit: { ...prev.payment.xendit, publicKey: e.target.value }
                      }
                    }))}
                    disabled={!canEdit}
                    className="w-full px-3 py-2 border border-primary/20 rounded-lg bg-surface text-primary disabled:opacity-50"
                  />
                </div>
              </div>
              
              {canEdit && (
                <div className="flex space-x-3">
                  <button
                    onClick={() => handleConfigSave('payment', integrations.payment.xendit, 'xendit')}
                    disabled={isSaving}
                    className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover disabled:opacity-50 flex items-center space-x-2"
                  >
                    <Icon name="Save" size={16} />
                    <span>{t('common.save') || 'Save'}</span>
                  </button>
                  <button
                    onClick={() => testConnection('payment', 'xendit')}
                    disabled={isLoading}
                    className="px-4 py-2 border border-primary/20 text-primary rounded-lg hover:bg-surface-elevated disabled:opacity-50 flex items-center space-x-2"
                  >
                    <Icon name="Zap" size={16} />
                    <span>{t('clinic.integrations.testConnection') || 'Test Connection'}</span>
                  </button>
                </div>
              )}
            </div>
          </IntegrationCard>
        </div>
      </div>

      {/* SMS Notifications */}
      <IntegrationCard
        title={t('clinic.integrations.sms.title') || 'SMS Notifications'}
        description={t('clinic.integrations.sms.description') || 'Send appointment reminders via SMS'}
        icon="MessageSquare"
        enabled={integrations.sms.enabled}
        status={integrations.sms.status}
        onToggle={() => handleIntegrationToggle('sms')}
      >
        <div className="space-y-4 pt-4 border-t border-primary/10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                {t('clinic.integrations.sms.accountSid') || 'Account SID'}
              </label>
              <input
                type="text"
                value={integrations.sms.accountSid}
                onChange={(e) => setIntegrations(prev => ({
                  ...prev,
                  sms: { ...prev.sms, accountSid: e.target.value }
                }))}
                disabled={!canEdit}
                className="w-full px-3 py-2 border border-primary/20 rounded-lg bg-surface text-primary disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                {t('clinic.integrations.sms.authToken') || 'Auth Token'}
              </label>
              <input
                type="password"
                value={integrations.sms.authToken}
                onChange={(e) => setIntegrations(prev => ({
                  ...prev,
                  sms: { ...prev.sms, authToken: e.target.value }
                }))}
                disabled={!canEdit}
                className="w-full px-3 py-2 border border-primary/20 rounded-lg bg-surface text-primary disabled:opacity-50"
              />
            </div>
          </div>
          
          {canEdit && (
            <div className="flex space-x-3">
              <button
                onClick={() => handleConfigSave('sms', integrations.sms)}
                disabled={isSaving}
                className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover disabled:opacity-50 flex items-center space-x-2"
              >
                <Icon name="Save" size={16} />
                <span>{t('common.save') || 'Save'}</span>
              </button>
              <button
                onClick={() => testConnection('sms')}
                disabled={isLoading}
                className="px-4 py-2 border border-primary/20 text-primary rounded-lg hover:bg-surface-elevated disabled:opacity-50 flex items-center space-x-2"
              >
                <Icon name="Zap" size={16} />
                <span>{t('clinic.integrations.testConnection') || 'Test Connection'}</span>
              </button>
            </div>
          )}
        </div>
      </IntegrationCard>
    </div>
  );
};

export default IntegrationsSettings;