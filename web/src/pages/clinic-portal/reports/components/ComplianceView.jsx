import { useState } from 'react';
import { useLanguage } from '../../../../contexts/LanguageContext';
import AppIcon from '../../../../components/AppIcon';

const ComplianceView = () => {
  const { t } = useLanguage();

  // Mock data
  const complianceScore = {
    overall: 96,
    dataPrivacy: 98,
    consentForms: 95,
    recordKeeping: 97,
    securityProtocols: 94
  };

  const consentForms = [
    { type: 'Informed Consent Perawatan', completed: 245, total: 250, percentage: 98, status: 'excellent' },
    { type: 'Consent Foto Klinis', completed: 238, total: 250, percentage: 95, status: 'good' },
    { type: 'Consent Data Medis', completed: 250, total: 250, percentage: 100, status: 'excellent' },
    { type: 'Consent BPJS/Asuransi', completed: 82, total: 88, percentage: 93, status: 'good' }
  ];

  const auditLogs = [
    { timestamp: '2024-01-15 14:23:15', user: 'drg. Sarah Ahmad', action: 'Akses Rekam Medis', patient: 'Ahmad Yani', ip: '192.168.1.45', status: 'success' },
    { timestamp: '2024-01-15 14:18:32', user: 'Admin Klinik', action: 'Update Data Pasien', patient: 'Siti Nurhaliza', ip: '192.168.1.10', status: 'success' },
    { timestamp: '2024-01-15 14:12:08', user: 'drg. Budi Santoso', action: 'Download Foto Rontgen', patient: 'Budi Santoso', ip: '192.168.1.52', status: 'success' },
    { timestamp: '2024-01-15 13:55:41', user: 'Staff Resepsionis', action: 'Lihat Jadwal Dokter', patient: '-', ip: '192.168.1.15', status: 'success' },
    { timestamp: '2024-01-15 13:42:19', user: 'Unknown User', action: 'Login Gagal', patient: '-', ip: '103.45.67.89', status: 'failed' }
  ];

  const dataBackups = [
    { date: '2024-01-15 02:00:00', type: 'Full Backup', size: '2.4 GB', duration: '12 min', status: 'success', location: 'Cloud Storage' },
    { date: '2024-01-14 02:00:00', type: 'Full Backup', size: '2.3 GB', duration: '11 min', status: 'success', location: 'Cloud Storage' },
    { date: '2024-01-13 02:00:00', type: 'Full Backup', size: '2.3 GB', duration: '13 min', status: 'success', location: 'Cloud Storage' },
    { date: '2024-01-12 02:00:00', type: 'Full Backup', size: '2.2 GB', duration: '10 min', status: 'warning', location: 'Cloud Storage' }
  ];

  const securityIncidents = [
    { date: '2024-01-15', type: 'Multiple Failed Logins', severity: 'low', description: '5 failed login attempts from IP 103.45.67.89', action: 'IP Blocked', status: 'resolved' },
    { date: '2024-01-12', type: 'Unauthorized Access Attempt', severity: 'medium', description: 'Attempt to access admin panel without credentials', action: 'Under Investigation', status: 'investigating' },
    { date: '2024-01-08', type: 'Password Policy Violation', severity: 'low', description: 'Staff member using weak password', action: 'Password Reset Required', status: 'resolved' }
  ];

  const privacyCompliance = [
    { requirement: 'Enkripsi Data Pasien', status: 'compliant', lastCheck: '2024-01-15', score: 100 },
    { requirement: 'Akses Control & Role Management', status: 'compliant', lastCheck: '2024-01-15', score: 98 },
    { requirement: 'Data Retention Policy', status: 'compliant', lastCheck: '2024-01-14', score: 95 },
    { requirement: 'Patient Consent Management', status: 'warning', lastCheck: '2024-01-15', score: 92 },
    { requirement: 'Audit Trail Logging', status: 'compliant', lastCheck: '2024-01-15', score: 100 },
    { requirement: 'Regular Security Training', status: 'compliant', lastCheck: '2024-01-10', score: 88 }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'excellent': case 'compliant': case 'success': case 'resolved':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'good': case 'warning': case 'investigating':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'failed': case 'critical':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'low': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'high': return 'text-orange-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Compliance Score Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/10 rounded-xl border-2 border-green-200 dark:border-green-800">
          <div className="flex items-center justify-between mb-3">
            <AppIcon name="ShieldCheck" size={20} className="text-green-600" />
            <span className="text-xs font-semibold text-green-600">OVERALL</span>
          </div>
          <div className="space-y-2">
            <div className="text-3xl font-bold text-green-900 dark:text-green-300">{complianceScore.overall}%</div>
            <h3 className="text-sm font-medium text-green-800 dark:text-green-400">
              {t('clinic.reports.compliance.overallScore') || 'Compliance Score'}
            </h3>
          </div>
        </div>

        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <AppIcon name="Lock" size={20} className="text-blue-600" />
            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
              <span className="text-sm font-bold text-blue-900 dark:text-blue-300">{complianceScore.dataPrivacy}</span>
            </div>
          </div>
          <h3 className="text-sm font-medium text-blue-800 dark:text-blue-400">
            {t('clinic.reports.compliance.dataPrivacy') || 'Data Privacy'}
          </h3>
        </div>

        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <AppIcon name="FileCheck" size={20} className="text-purple-600" />
            <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
              <span className="text-sm font-bold text-purple-900 dark:text-purple-300">{complianceScore.consentForms}</span>
            </div>
          </div>
          <h3 className="text-sm font-medium text-purple-800 dark:text-purple-400">
            {t('clinic.reports.compliance.consentForms') || 'Consent Forms'}
          </h3>
        </div>

        <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <AppIcon name="Database" size={20} className="text-orange-600" />
            <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center">
              <span className="text-sm font-bold text-orange-900 dark:text-orange-300">{complianceScore.recordKeeping}</span>
            </div>
          </div>
          <h3 className="text-sm font-medium text-orange-800 dark:text-orange-400">
            {t('clinic.reports.compliance.recordKeeping') || 'Record Keeping'}
          </h3>
        </div>

        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <AppIcon name="Shield" size={20} className="text-red-600" />
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
              <span className="text-sm font-bold text-red-900 dark:text-red-300">{complianceScore.securityProtocols}</span>
            </div>
          </div>
          <h3 className="text-sm font-medium text-red-800 dark:text-red-400">
            {t('clinic.reports.compliance.security') || 'Security'}
          </h3>
        </div>
      </div>

      {/* Consent Forms Compliance */}
      <div className="bg-surface-elevated rounded-xl border border-primary/20 overflow-hidden">
        <div className="px-6 py-4 border-b border-primary/20">
          <h3 className="text-lg font-semibold text-primary">
            {t('clinic.reports.compliance.consentStatus') || 'Status Consent Forms'}
          </h3>
        </div>
        <div className="p-6 space-y-4">
          {consentForms.map((form, idx) => (
            <div key={idx} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-primary">{form.type}</span>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(form.status)}`}>
                      {form.percentage}%
                    </span>
                  </div>
                  <div className="text-xs text-secondary mt-1">
                    {form.completed} dari {form.total} formulir terisi
                  </div>
                </div>
              </div>
              <div className="w-full bg-surface rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    form.percentage >= 95 ? 'bg-green-600' : form.percentage >= 90 ? 'bg-yellow-600' : 'bg-red-600'
                  }`}
                  style={{ width: `${form.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Privacy Compliance & Security Incidents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Privacy Compliance Requirements */}
        <div className="bg-surface-elevated rounded-xl border border-primary/20 overflow-hidden">
          <div className="px-6 py-4 border-b border-primary/20">
            <h3 className="text-lg font-semibold text-primary">
              {t('clinic.reports.compliance.privacyRequirements') || 'Persyaratan Privasi Data'}
            </h3>
          </div>
          <div className="divide-y divide-primary/10">
            {privacyCompliance.map((req, idx) => (
              <div key={idx} className="px-6 py-4 hover:bg-surface transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-primary">{req.requirement}</span>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(req.status)}`}>
                        {req.status === 'compliant' ? 'Compliant' : 'Warning'}
                      </span>
                    </div>
                    <div className="text-xs text-secondary mt-1">
                      Last checked: {new Date(req.lastCheck).toLocaleDateString('id-ID')}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-accent">{req.score}%</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Security Incidents */}
        <div className="bg-surface-elevated rounded-xl border border-primary/20 overflow-hidden">
          <div className="px-6 py-4 border-b border-primary/20 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-primary">
              {t('clinic.reports.compliance.securityIncidents') || 'Insiden Keamanan'}
            </h3>
            <span className="px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 text-xs font-medium rounded-full">
              {securityIncidents.filter(i => i.status !== 'resolved').length} aktif
            </span>
          </div>
          <div className="divide-y divide-primary/10">
            {securityIncidents.map((incident, idx) => (
              <div key={idx} className="px-6 py-4 hover:bg-surface transition-colors">
                <div className="flex items-start gap-3">
                  <AppIcon 
                    name="AlertTriangle" 
                    size={16} 
                    className={getSeverityColor(incident.severity)} 
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-primary">{incident.type}</span>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(incident.status)}`}>
                        {incident.status}
                      </span>
                    </div>
                    <p className="text-xs text-secondary mb-2">{incident.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-secondary">{incident.date}</span>
                      <span className="text-xs font-medium text-accent">{incident.action}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Audit Logs & Data Backups */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Audit Logs */}
        <div className="bg-surface-elevated rounded-xl border border-primary/20 overflow-hidden">
          <div className="px-6 py-4 border-b border-primary/20 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-primary">
              {t('clinic.reports.compliance.auditLogs') || 'Audit Logs Terbaru'}
            </h3>
            <button className="text-sm text-accent hover:underline">View All</button>
          </div>
          <div className="divide-y divide-primary/10">
            {auditLogs.map((log, idx) => (
              <div key={idx} className="px-6 py-3 hover:bg-surface transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <AppIcon 
                        name={log.status === 'success' ? 'CheckCircle' : 'XCircle'} 
                        size={14} 
                        className={log.status === 'success' ? 'text-green-600' : 'text-red-600'} 
                      />
                      <span className="text-sm font-medium text-primary">{log.action}</span>
                    </div>
                    <div className="text-xs text-secondary space-y-0.5">
                      <div>User: {log.user}</div>
                      {log.patient !== '-' && <div>Patient: {log.patient}</div>}
                      <div className="flex items-center gap-2">
                        <span>IP: {log.ip}</span>
                        <span>•</span>
                        <span>{log.timestamp}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Data Backups */}
        <div className="bg-surface-elevated rounded-xl border border-primary/20 overflow-hidden">
          <div className="px-6 py-4 border-b border-primary/20">
            <h3 className="text-lg font-semibold text-primary">
              {t('clinic.reports.compliance.dataBackups') || 'Backup Data'}
            </h3>
          </div>
          <div className="divide-y divide-primary/10">
            {dataBackups.map((backup, idx) => (
              <div key={idx} className="px-6 py-4 hover:bg-surface transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <AppIcon 
                      name={backup.status === 'success' ? 'Database' : 'AlertCircle'} 
                      size={16} 
                      className={backup.status === 'success' ? 'text-green-600' : 'text-yellow-600'} 
                    />
                    <div>
                      <div className="text-sm font-medium text-primary">{backup.type}</div>
                      <div className="text-xs text-secondary">{backup.date}</div>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(backup.status)}`}>
                    {backup.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-secondary">
                  <span>Size: {backup.size}</span>
                  <span>•</span>
                  <span>Duration: {backup.duration}</span>
                  <span>•</span>
                  <span>{backup.location}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComplianceView;
