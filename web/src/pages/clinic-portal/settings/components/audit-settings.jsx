import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import { useLanguage } from '../../../../contexts/LanguageContext';
import Icon from '../../../../components/AppIcon';
import { authHttp } from '../../../../utils/httpClient';

const AuditSettings = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Check if user can edit audit settings
  const userRole = user?.roles?.[0] || user?.role || 'staff';
  const canEdit = ['owner', 'clinic_owner', 'manager', 'admin', 'clinic_staff'].includes(userRole);
  const canViewFullAudit = ['owner', 'manager'].includes(userRole);

  const [auditSettings, setAuditSettings] = useState({
    dataRetention: {
      enabled: true,
      patientRecords: 7, // years
      appointmentLogs: 3,
      paymentRecords: 5,
      auditLogs: 2,
      backupFrequency: 'daily' // daily, weekly, monthly
    },
    logging: {
      userActions: true,
      systemEvents: true,
      dataChanges: true,
      loginAttempts: true,
      paymentTransactions: true,
      fileAccess: true
    },
    compliance: {
      gdprCompliant: true,
      hipaaCompliant: false,
      dataEncryption: true,
      accessLogging: true,
      regularBackups: true,
      staffTraining: false
    },
    notifications: {
      securityAlerts: true,
      complianceReminders: true,
      dataRetentionWarnings: true,
      backupFailures: true,
      unusualActivity: true
    }
  });

  const [auditLogs, setAuditLogs] = useState([
    {
      id: 1,
      timestamp: '2024-01-15T10:30:00Z',
      user: 'Dr. John Doe',
      action: 'Updated patient record',
      resource: 'Patient #12345',
      ipAddress: '192.168.1.100',
      status: 'success',
      details: 'Updated patient contact information'
    },
    {
      id: 2,
      timestamp: '2024-01-15T09:15:00Z',
      user: 'Jane Smith',
      action: 'Deleted appointment',
      resource: 'Appointment #67890',
      ipAddress: '192.168.1.101',
      status: 'success',
      details: 'Cancelled patient appointment'
    },
    {
      id: 3,
      timestamp: '2024-01-15T08:45:00Z',
      user: 'System',
      action: 'Backup completed',
      resource: 'Database backup',
      ipAddress: 'localhost',
      status: 'success',
      details: 'Automated daily backup completed successfully'
    }
  ]);

  const [filterPeriod, setFilterPeriod] = useState('7days');
  const [searchQuery, setSearchQuery] = useState('');

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString(t('common.locale') || 'id-ID', {
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleSettingsSave = async () => {
    if (!canEdit) return;

    setIsSaving(true);
    try {
      // API call would be here
      // await authHttp.put('/clinic/audit-settings', auditSettings);
      
      showMessage('success', t('clinic.audit.settingsSaveSuccess') || 'Audit settings saved successfully!');
    } catch (error) {
      console.error('Save audit settings error:', error);
      showMessage('error', error.response?.data?.message || t('clinic.audit.settingsSaveError') || 'Failed to save audit settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportLogs = async () => {
    if (!canViewFullAudit) return;

    try {
      setIsLoading(true);
      // API call would be here
      // const response = await authHttp.get('/clinic/audit-logs/export', { 
      //   params: { period: filterPeriod, query: searchQuery }
      // });
      
      // Mock export
      const csvContent = "data:text/csv;charset=utf-8," + 
        "Timestamp,User,Action,Resource,IP Address,Status,Details\n" +
        auditLogs.map(log => 
          `${log.timestamp},${log.user},${log.action},${log.resource},${log.ipAddress},${log.status},"${log.details}"`
        ).join("\n");
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `audit-logs-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showMessage('success', t('clinic.audit.exportSuccess') || 'Audit logs exported successfully!');
    } catch (error) {
      console.error('Export logs error:', error);
      showMessage('error', t('clinic.audit.exportError') || 'Failed to export audit logs');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'success': return 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300';
      case 'warning': return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300';
      case 'error': return 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300';
      default: return 'bg-gray-100 dark:bg-gray-900/20 text-gray-800 dark:text-gray-300';
    }
  };

  const filteredLogs = auditLogs.filter(log => 
    searchQuery === '' || 
    log.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.resource.toLowerCase().includes(searchQuery.toLowerCase())
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
              {t('clinic.audit.readOnlySettings') || 'You can only view audit settings'}
            </span>
          </div>
        </div>
      )}

      {/* Data Retention Settings */}
      <div className="bg-surface-elevated border border-primary rounded-2xl p-6">
        <h2 className="text-xl font-semibold text-primary mb-6 flex items-center space-x-2">
          <Icon name="Archive" size={20} />
          <span>{t('clinic.audit.dataRetention.title') || 'Data Retention'}</span>
        </h2>

        <div className="space-y-4">
          <div className="flex items-center space-x-2 mb-4">
            <input
              type="checkbox"
              checked={auditSettings.dataRetention.enabled}
              onChange={(e) => setAuditSettings(prev => ({
                ...prev,
                dataRetention: { ...prev.dataRetention, enabled: e.target.checked }
              }))}
              disabled={!canEdit}
              className="rounded border-primary/20 text-accent focus:ring-accent disabled:opacity-50"
            />
            <span className="text-sm font-medium text-primary">
              {t('clinic.audit.dataRetention.enabled') || 'Enable automatic data retention'}
            </span>
          </div>

          {auditSettings.dataRetention.enabled && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ml-6">
              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  {t('clinic.audit.dataRetention.patientRecords') || 'Patient Records (years)'}
                </label>
                <input
                  type="number"
                  value={auditSettings.dataRetention.patientRecords}
                  onChange={(e) => setAuditSettings(prev => ({
                    ...prev,
                    dataRetention: { ...prev.dataRetention, patientRecords: parseInt(e.target.value) }
                  }))}
                  min="1"
                  max="50"
                  disabled={!canEdit}
                  className="w-full px-3 py-2 border border-primary/20 rounded-lg bg-surface text-primary disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  {t('clinic.audit.dataRetention.appointmentLogs') || 'Appointment Logs (years)'}
                </label>
                <input
                  type="number"
                  value={auditSettings.dataRetention.appointmentLogs}
                  onChange={(e) => setAuditSettings(prev => ({
                    ...prev,
                    dataRetention: { ...prev.dataRetention, appointmentLogs: parseInt(e.target.value) }
                  }))}
                  min="1"
                  max="20"
                  disabled={!canEdit}
                  className="w-full px-3 py-2 border border-primary/20 rounded-lg bg-surface text-primary disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  {t('clinic.audit.dataRetention.auditLogs') || 'Audit Logs (years)'}
                </label>
                <input
                  type="number"
                  value={auditSettings.dataRetention.auditLogs}
                  onChange={(e) => setAuditSettings(prev => ({
                    ...prev,
                    dataRetention: { ...prev.dataRetention, auditLogs: parseInt(e.target.value) }
                  }))}
                  min="1"
                  max="10"
                  disabled={!canEdit}
                  className="w-full px-3 py-2 border border-primary/20 rounded-lg bg-surface text-primary disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  {t('clinic.audit.dataRetention.backupFrequency') || 'Backup Frequency'}
                </label>
                <select
                  value={auditSettings.dataRetention.backupFrequency}
                  onChange={(e) => setAuditSettings(prev => ({
                    ...prev,
                    dataRetention: { ...prev.dataRetention, backupFrequency: e.target.value }
                  }))}
                  disabled={!canEdit}
                  className="w-full px-3 py-2 border border-primary/20 rounded-lg bg-surface text-primary disabled:opacity-50"
                >
                  <option value="daily">{t('clinic.audit.frequency.daily') || 'Daily'}</option>
                  <option value="weekly">{t('clinic.audit.frequency.weekly') || 'Weekly'}</option>
                  <option value="monthly">{t('clinic.audit.frequency.monthly') || 'Monthly'}</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Logging Settings */}
      <div className="bg-surface-elevated border border-primary rounded-2xl p-6">
        <h2 className="text-xl font-semibold text-primary mb-6 flex items-center space-x-2">
          <Icon name="FileText" size={20} />
          <span>{t('clinic.audit.logging.title') || 'Activity Logging'}</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(auditSettings.logging).map(([key, value]) => (
            <div key={key} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={value}
                onChange={(e) => setAuditSettings(prev => ({
                  ...prev,
                  logging: { ...prev.logging, [key]: e.target.checked }
                }))}
                disabled={!canEdit}
                className="rounded border-primary/20 text-accent focus:ring-accent disabled:opacity-50"
              />
              <span className="text-sm text-primary">
                {t(`clinic.audit.logging.${key}`) || key.replace(/([A-Z])/g, ' $1').toLowerCase()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Compliance Settings */}
      <div className="bg-surface-elevated border border-primary rounded-2xl p-6">
        <h2 className="text-xl font-semibold text-primary mb-6 flex items-center space-x-2">
          <Icon name="Shield" size={20} />
          <span>{t('clinic.audit.compliance.title') || 'Compliance & Security'}</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(auditSettings.compliance).map(([key, value]) => (
            <div key={key} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={value}
                onChange={(e) => setAuditSettings(prev => ({
                  ...prev,
                  compliance: { ...prev.compliance, [key]: e.target.checked }
                }))}
                disabled={!canEdit}
                className="rounded border-primary/20 text-accent focus:ring-accent disabled:opacity-50"
              />
              <span className="text-sm text-primary">
                {t(`clinic.audit.compliance.${key}`) || key.replace(/([A-Z])/g, ' $1').toLowerCase()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Save Settings Button */}
      {canEdit && (
        <div className="flex justify-end">
          <button
            onClick={handleSettingsSave}
            disabled={isSaving}
            className="px-6 py-3 bg-accent text-white rounded-lg font-medium hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isSaving ? (
              <>
                <Icon name="Loader2" size={18} className="animate-spin" />
                <span>{t('clinic.audit.saving') || 'Saving...'}</span>
              </>
            ) : (
              <>
                <Icon name="Save" size={18} />
                <span>{t('clinic.audit.saveSettings') || 'Save Settings'}</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Audit Logs */}
      <div className="bg-surface-elevated border border-primary rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-primary flex items-center space-x-2">
            <Icon name="List" size={20} />
            <span>{t('clinic.audit.logs.title') || 'Audit Logs'}</span>
          </h2>
          {canViewFullAudit && (
            <button
              onClick={handleExportLogs}
              disabled={isLoading}
              className="px-4 py-2 border border-primary/20 text-primary rounded-lg hover:bg-surface-elevated transition-colors disabled:opacity-50 flex items-center space-x-2"
            >
              {isLoading ? (
                <>
                  <Icon name="Loader2" size={16} className="animate-spin" />
                  <span>{t('clinic.audit.exporting') || 'Exporting...'}</span>
                </>
              ) : (
                <>
                  <Icon name="Download" size={16} />
                  <span>{t('clinic.audit.exportLogs') || 'Export Logs'}</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('clinic.audit.searchPlaceholder') || 'Search logs...'}
              className="w-full px-3 py-2 border border-primary/20 rounded-lg bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
            />
          </div>
          <div>
            <select
              value={filterPeriod}
              onChange={(e) => setFilterPeriod(e.target.value)}
              className="w-40 px-3 py-2 border border-primary/20 rounded-lg bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
            >
              <option value="7days">{t('audit.periods.7days') || 'Last 7 days'}</option>
              <option value="30days">{t('audit.periods.30days') || 'Last 30 days'}</option>
              <option value="90days">{t('audit.periods.90days') || 'Last 90 days'}</option>
              <option value="1year">{t('audit.periods.1year') || 'Last year'}</option>
            </select>
          </div>
        </div>

        {/* Logs Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface border-b border-primary/10">
              <tr>
                <th className="text-left p-3 font-medium text-primary">{t('clinic.audit.columns.timestamp') || 'Timestamp'}</th>
                <th className="text-left p-3 font-medium text-primary">{t('clinic.audit.columns.user') || 'User'}</th>
                <th className="text-left p-3 font-medium text-primary">{t('clinic.audit.columns.action') || 'Action'}</th>
                <th className="text-left p-3 font-medium text-primary">{t('clinic.audit.columns.resource') || 'Resource'}</th>
                <th className="text-left p-3 font-medium text-primary">{t('clinic.audit.columns.status') || 'Status'}</th>
                <th className="text-left p-3 font-medium text-primary">{t('clinic.audit.columns.details') || 'Details'}</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-secondary">
                    <Icon name="Search" size={32} className="mx-auto mb-2 opacity-50" />
                    <p>{t('clinic.audit.noLogs') || 'No audit logs found'}</p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="border-b border-primary/5 hover:bg-surface-elevated">
                    <td className="p-3 text-secondary">{formatDate(log.timestamp)}</td>
                    <td className="p-3 text-primary">{log.user}</td>
                    <td className="p-3 text-primary">{log.action}</td>
                    <td className="p-3 text-secondary">{log.resource}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadgeColor(log.status)}`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="p-3 text-secondary max-w-xs truncate" title={log.details}>
                      {log.details}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AuditSettings;