import React, { useState } from 'react';
import { useLanguage } from '../../../../contexts/LanguageContext';
import Icon from '../../../../components/AppIcon';

const StatusBadge = ({ status }) => {
  const { t } = useLanguage();
  
  const getStatusStyles = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'vip':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusStyles(status)}`}>
      {t(`patients.registry.status.${status}`)}
    </span>
  );
};

const ActionDropdown = ({ patient, onAction }) => {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const actions = [
    { key: 'view', label: t('patients.registry.actions.view'), icon: 'eye' },
    { key: 'edit', label: t('patients.registry.actions.edit'), icon: 'edit' },
    { key: 'schedule', label: t('patients.registry.actions.schedule'), icon: 'calendar' },
    { key: 'history', label: t('patients.registry.actions.history'), icon: 'clock' }
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 hover:bg-surface-elevated rounded-lg transition-colors duration-200"
      >
        <Icon name="more-vertical" className="w-4 h-4 text-text-secondary" />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-1 w-48 bg-surface-elevated rounded-lg shadow-lg border border-border/50 z-20">
            {actions.map((action) => (
              <button
                key={action.key}
                onClick={() => {
                  onAction(action.key, patient);
                  setIsOpen(false);
                }}
                className="w-full flex items-center px-4 py-3 text-left text-text-secondary hover:text-text-primary hover:bg-surface transition-colors duration-200 first:rounded-t-lg last:rounded-b-lg"
              >
                <Icon name={action.icon} className="w-4 h-4 mr-3" />
                {action.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const PatientTable = ({ patients, onPatientAction, loading }) => {
  const { t, language } = useLanguage();
  const locale = language === 'id' ? 'id-ID' : 'en-US';

  if (loading) {
    return (
      <div className="bg-surface-elevated rounded-xl border border-border/50">
        <div className="p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-4 text-text-secondary">{t('patients.registry.loading')}</p>
        </div>
      </div>
    );
  }

  if (patients.length === 0) {
    return (
      <div className="bg-surface-elevated rounded-xl border border-border/50">
        <div className="p-8 text-center">
          <Icon name="users" className="w-16 h-16 text-text-secondary mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-text-primary mb-2">{t('patients.registry.empty.title')}</h3>
          <p className="text-text-secondary">{t('patients.registry.empty.description')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-elevated rounded-xl border border-border/50 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-surface border-b border-border/50">
            <tr>
              <th className="text-left py-4 px-6 font-semibold text-text-primary">
                {t('patients.registry.table.name')}
              </th>
              <th className="text-left py-4 px-6 font-semibold text-text-primary">
                {t('patients.registry.table.age')}
              </th>
              <th className="text-left py-4 px-6 font-semibold text-text-primary">
                {t('patients.registry.table.gender')}
              </th>
              <th className="text-left py-4 px-6 font-semibold text-text-primary">
                {t('patients.registry.table.phone')}
              </th>
              <th className="text-left py-4 px-6 font-semibold text-text-primary">
                {t('patients.registry.table.lastVisit')}
              </th>
              <th className="text-left py-4 px-6 font-semibold text-text-primary">
                {t('patients.registry.table.totalVisits')}
              </th>
              <th className="text-left py-4 px-6 font-semibold text-text-primary">
                {t('patients.registry.table.status')}
              </th>
              <th className="text-right py-4 px-6 font-semibold text-text-primary">
                {t('patients.registry.table.actions')}
              </th>
            </tr>
          </thead>
          <tbody>
            {patients.map((patient, index) => (
              <tr 
                key={patient.id}
                className="border-b border-border/30 hover:bg-surface/50 transition-colors duration-200"
              >
                <td className="py-4 px-6">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mr-3">
                      <span className="text-primary font-semibold">
                        {patient.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="font-semibold text-text-primary">{patient.name}</div>
                      <div className="text-sm text-text-secondary">{patient.email || t('patients.registry.table.noEmail')}</div>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-6 text-text-secondary">{patient.age}</td>
                <td className="py-4 px-6">
                  <span className="text-text-secondary">
                    {patient.gender === 'M' ? t('patients.common.gender.male') : t('patients.common.gender.female')}
                  </span>
                </td>
                <td className="py-4 px-6 text-text-secondary">{patient.phone}</td>
                <td className="py-4 px-6 text-text-secondary">
                  {new Date(patient.lastVisit).toLocaleDateString(locale)}
                </td>
                <td className="py-4 px-6">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {t('patients.registry.table.visitsBadge', { count: patient.totalVisits })}
                  </span>
                </td>
                <td className="py-4 px-6">
                  <StatusBadge status={patient.status} />
                </td>
                <td className="py-4 px-6 text-right">
                  <ActionDropdown patient={patient} onAction={onPatientAction} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PatientTable;
