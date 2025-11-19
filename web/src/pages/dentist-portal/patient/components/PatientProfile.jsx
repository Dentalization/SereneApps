import React, { useMemo } from 'react';
import { useLanguage } from '../../../../contexts/LanguageContext';

// Helper function moved outside component to avoid re-creation
const calculateAge = (birthDate, fallbackAge, unknownLabel) => {
  if (!birthDate) return fallbackAge || unknownLabel;
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

const PatientProfile = ({ patient, onClose }) => {
  const { t, language } = useLanguage();
  const locale = language === 'id' ? 'id-ID' : 'en-US';
  
  // Early return BEFORE any hooks
  if (!patient) {
    return (
      <div className="bg-surface border border-primary/20 rounded-2xl shadow-theme-lg p-6 theme-transition">
        <div className="text-center py-8">
          <p className="text-secondary">{t('dentistPatient.common.noPatientSelected')}</p>
        </div>
      </div>
    );
  }

  // All hooks AFTER early return check
  const labels = t('dentistPatient.profile') || {};
  const personalLabels = labels.personal || {};
  const contactLabels = labels.contact || {};
  const medicalLabels = labels.medical || {};
  const visitLabels = labels.visits || {};
  
  const ageValue = useMemo(
    () => calculateAge(patient.birthDate, patient.age, t('dentistPatient.profile.labels.unknownAge')),
    [patient.birthDate, patient.age, t]
  );

  const formatDate = (dateString) => {
    if (!dateString) return t('dentistPatient.common.notProvided');
    return new Date(dateString).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'text-success bg-success/10 border-success/30';
      case 'inactive': return 'text-secondary bg-muted border-primary/10';
      case 'new': return 'text-brand-primary bg-brand-primary/10 border-brand-primary/30';
      default: return 'text-secondary bg-muted border-primary/10';
    }
  };

  const getStatusLabel = (status) => {
    const key = (status || '').toLowerCase();
    const label = t(`dentistPatient.profile.statuses.${key}`);
    return typeof label === 'string' && !label.startsWith('dentistPatient') ? label : status;
  };

  return (
    <div className="space-y-6">
      {/* Profile Header CARD */}
      <div className="relative bg-surface-elevated border border-primary/10 rounded-xl shadow-theme-md p-6 theme-transition">
        {/* X button: absolute top-right */}
        <button
          type="button"
          aria-label={labels.actions?.close || t('dentistPatient.profile.actions.close')}
          onClick={() => onClose?.()}
          className="absolute top-4 right-4 z-10 p-2 rounded-lg bg-surface-elevated border border-border/40 hover:bg-surface-elevated/80 focus:outline-none focus:ring-2 focus:ring-accent/40 text-secondary hover:text-primary theme-transition"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="flex items-center justify-between mb-6 pr-12">
          <h2 className="text-xl font-semibold text-primary">{labels.title}</h2>
        </div>

        {/* Patient Avatar and Basic Info */}
        <div className="flex items-center gap-6 mb-6 pr-12">
          <div className="w-24 h-24 bg-gradient-to-br from-brand-primary to-brand-accent rounded-full flex items-center justify-center text-white text-2xl font-bold">
            {patient.name ? patient.name.split(' ').map(n => n[0]).join('').slice(0, 2) : 'N/A'}
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-primary mb-2 truncate">{patient.name}</h1>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-secondary">
              <span>ID: {patient.patientId}</span>
              <span>•</span>
              <span>{ageValue} years old</span>
              <span>•</span>
              <span className="capitalize">{patient.gender}</span>
              <span>•</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(patient.status)}`}>
                {patient.status}
              </span>
            </div>

            {patient.nextAppointment && (
              <div className="mt-2 flex items-center gap-2 text-sm text-warning">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 4h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>{t('dentistPatient.profile.header.nextAppointment', { date: formatDate(patient.nextAppointment) })}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Personal Information */}
      <div className="bg-surface-elevated border border-primary/10 rounded-xl shadow-theme-md p-6 theme-transition">
        <h3 className="text-lg font-semibold text-primary mb-4">{personalLabels.title}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">{personalLabels.fields?.name}</label>
            <p className="text-primary">{patient.name}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">{personalLabels.fields?.patientId}</label>
            <p className="text-primary">{patient.patientId}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">{personalLabels.fields?.dob}</label>
            <p className="text-primary">{formatDate(patient.birthDate)}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">{personalLabels.fields?.age}</label>
            <p className="text-primary">
              {typeof ageValue === 'number'
                ? t('dentistPatient.profile.labels.ageDisplay', { age: ageValue })
                : ageValue}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">{personalLabels.fields?.gender}</label>
            <p className="text-primary capitalize">
              {patient.gender
                ? t(`dentistPatient.profile.gender.${patient.gender.toLowerCase()}`)
                : t('dentistPatient.profile.gender.unknown')}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">{personalLabels.fields?.maritalStatus}</label>
            <p className="text-primary capitalize">{patient.maritalStatus || t('dentistPatient.common.notProvided')}</p>
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="bg-surface-elevated border border-primary/10 rounded-xl shadow-theme-md p-6 theme-transition">
        <h3 className="text-lg font-semibold text-primary mb-4">{contactLabels.title}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">{contactLabels.fields?.phone}</label>
            <p className="text-primary">{patient.phone}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">{contactLabels.fields?.email}</label>
            <p className="text-primary">{patient.email}</p>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-text-primary mb-2">{contactLabels.fields?.address}</label>
            <p className="text-primary">{patient.address || t('dentistPatient.common.notProvided')}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">{contactLabels.fields?.preferredContact}</label>
            <p className="text-primary capitalize">
              {patient.preferredContact || contactLabels.defaults?.preferredContact || t('dentistPatient.profile.contact.defaultPreferred')}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">{contactLabels.fields?.occupation}</label>
            <p className="text-primary">{patient.occupation || t('dentistPatient.common.notProvided')}</p>
          </div>
        </div>
      </div>

      {/* Medical Summary */}
      <div className="bg-surface-elevated border border-primary/10 rounded-xl shadow-theme-md p-6 theme-transition">
        <h3 className="text-lg font-semibold text-primary mb-4">{medicalLabels.title}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-error/5 border border-error/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-error rounded-full"></div>
              <span className="text-sm font-medium text-text-primary">{medicalLabels.summary?.allergies}</span>
            </div>
            <p className="text-lg font-semibold text-primary">
              {patient.medicalHistory?.allergies?.length || 0}
            </p>
            <p className="text-xs text-secondary">
              {patient.medicalHistory?.allergies?.slice(0, 2).join(', ') || medicalLabels.summary?.none}
            </p>
          </div>

          <div className="bg-warning/5 border border-warning/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-warning rounded-full"></div>
              <span className="text-sm font-medium text-text-primary">{medicalLabels.summary?.conditions}</span>
            </div>
            <p className="text-lg font-semibold text-primary">
              {patient.medicalHistory?.conditions?.length || 0}
            </p>
            <p className="text-xs text-secondary">
              {patient.medicalHistory?.conditions?.slice(0, 2).join(', ') || medicalLabels.summary?.none}
            </p>
          </div>

          <div className="bg-brand-primary/5 border border-brand-primary/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-brand-primary rounded-full"></div>
              <span className="text-sm font-medium text-text-primary">{medicalLabels.summary?.medications}</span>
            </div>
            <p className="text-lg font-semibold text-primary">
              {patient.medicalHistory?.medications?.length || 0}
            </p>
            <p className="text-xs text-secondary">
              {patient.medicalHistory?.medications?.slice(0, 2).join(', ') || medicalLabels.summary?.none}
            </p>
          </div>
        </div>
      </div>

      {/* Visit History Summary */}
      <div className="bg-surface-elevated border border-primary/10 rounded-xl shadow-theme-md p-6 theme-transition">
        <h3 className="text-lg font-semibold text-primary mb-4">{visitLabels.title}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">{patient.appointments?.length || 0}</p>
            <p className="text-sm text-secondary">{visitLabels.totalVisits}</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">
              {patient.lastVisit ? formatDate(patient.lastVisit) : visitLabels.none}
            </p>
            <p className="text-sm text-secondary">{visitLabels.lastVisit}</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">
              {patient.nextAppointment ? formatDate(patient.nextAppointment) : visitLabels.none}
            </p>
            <p className="text-sm text-secondary">{visitLabels.nextAppointment}</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">
              {patient.registrationDate
                ? t('dentistPatient.profile.labels.patientSince', {
                    years: Math.floor((new Date().getTime() - new Date(patient.registrationDate).getTime()) / (1000 * 60 * 60 * 24 * 365))
                  })
                : visitLabels.notAvailable || t('dentistPatient.profile.labels.notAvailable')}
            </p>
            <p className="text-sm text-secondary">{visitLabels.patientSince}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientProfile;
