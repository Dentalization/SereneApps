import React, { useMemo } from 'react';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { resolvePatientAvatar } from '../../../../utils/mediaHelpers';
import ClinicalIcon from './ClinicalIcon';

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

const formatAddress = (address) => {
  if (!address) return '—';
  if (typeof address === 'string') return address || '—';
  return [
    address.street || address.streetAddress || address.line1,
    address.line2,
    address.city,
    address.province,
    address.postalCode
  ].filter(Boolean).join(', ') || '—';
};

const displayValue = (value) => value === null || value === undefined || value === '' ? '—' : value;

const PatientProfile = ({ patient, onClose }) => {
  const { t, language } = useLanguage();
  const locale = language === 'id' ? 'id-ID' : 'en-US';
  
  const initials = (name = '') =>
    name.trim().split(/\s+/).map((segment) => segment[0]).join('').slice(0, 2).toUpperCase() || 'N/A';

  const patientAvatar = resolvePatientAvatar(patient);
  const hasAvatar = Boolean(patientAvatar);
  
  // Early return BEFORE any hooks
  if (!patient) {
    return (
      <div className="bg-surface border border-primary/10 rounded-3xl shadow-theme-lg p-12 animate-in fade-in">
        <div className="text-center py-8">
          <ClinicalIcon name="patient-profile" size="xl" className="mx-auto mb-4" />
          <p className="text-secondary font-medium">{t('dentistPatient.common.noPatientSelected')}</p>
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
      case 'active': return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/50';
      case 'inactive': return 'text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/20 border-slate-200 dark:border-slate-700/50';
      case 'new': return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50';
      default: return 'text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/20 border-slate-200 dark:border-slate-700/50';
    }
  };

  const getStatusLabel = (status) => {
    const key = (status || '').toLowerCase();
    const label = t(`dentistPatient.profile.statuses.${key}`);
    return typeof label === 'string' && !label.startsWith('dentistPatient') ? label : status;
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      
      {/* Profile Header CARD */}
      <div className="relative bg-surface border border-primary/10 rounded-3xl shadow-theme-sm p-8 overflow-hidden">
        
        {/* Background Decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-blue-50/50 to-transparent rounded-bl-full -z-0 dark:from-blue-900/20" />

        {/* X button */}
        <button
          type="button"
          aria-label={labels.actions?.close || t('dentistPatient.profile.actions.close')}
          onClick={() => onClose?.()}
          className="absolute top-6 right-6 z-10 p-2.5 rounded-full bg-surface-elevated border border-primary/10 shadow-sm hover:bg-surface-elevated hover:shadow-md hover:rotate-90 transition-all duration-300 text-muted hover:text-primary"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="flex flex-col md:flex-row items-start md:items-center gap-8 relative z-0">
          {/* Avatar */}
          <div className="relative group">
            <div className="w-28 h-28 rounded-full p-1 bg-surface border border-primary/10 shadow-lg flex items-center justify-center overflow-hidden">
              <div className="w-full h-full rounded-full overflow-hidden bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center">
                {hasAvatar ? (
                  <img
                    src={patientAvatar}
                    alt={patient.name || 'Patient avatar'}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                ) : (
                  <span className="text-white text-3xl font-bold tracking-widest">
                    {initials(patient.name)}
                  </span>
                )}
              </div>
            </div>
            <div className="absolute bottom-2 right-2 w-6 h-6 bg-green-500 border-4 border-surface rounded-full"></div>
          </div>

          <div className="flex-1 min-w-0 space-y-3">
            <div>
              <h1 className="text-3xl font-bold text-primary tracking-tight leading-tight">{patient.name}</h1>
              <p className="text-secondary font-medium flex items-center gap-2 mt-1">
                <span className="bg-surface-elevated text-secondary px-2 py-0.5 rounded text-xs font-mono">ID: {patient.patientId}</span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${getStatusColor(patient.status)}`}>
                {getStatusLabel(patient.status)}
              </span>
              <div className="h-4 w-px bg-primary/20"></div>
              <span className="text-secondary font-medium">{ageValue} Years Old</span>
              <div className="h-4 w-px bg-primary/20"></div>
              <span className="text-secondary capitalize font-medium">{patient.gender}</span>
            </div>

            {patient.nextAppointment && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 rounded-lg text-xs font-medium mt-2">
                <ClinicalIcon name="appointment-upcoming" size="xs" className="border-0 shadow-none" />
                <span>{t('dentistPatient.profile.header.nextAppointment', { date: formatDate(patient.nextAppointment) })}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Personal Information */}
        <div className="bg-surface border border-primary/10 rounded-2xl shadow-sm p-8 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-primary/5">
            <ClinicalIcon name="patient-profile" size="sm" />
            <h3 className="text-lg font-bold text-primary">{personalLabels.title}</h3>
          </div>
          
          <div className="space-y-5">
            {[
              { label: personalLabels.fields?.name, value: patient.name },
              { label: personalLabels.fields?.patientId, value: patient.patientId },
              { label: personalLabels.fields?.dob, value: formatDate(patient.birthDate) },
              { label: personalLabels.fields?.age, value: typeof ageValue === 'number' ? t('dentistPatient.profile.labels.ageDisplay', { age: ageValue }) : ageValue },
              { label: personalLabels.fields?.gender, value: patient.gender ? t(`dentistPatient.profile.gender.${patient.gender.toLowerCase()}`) : t('dentistPatient.profile.gender.unknown') },
              { label: personalLabels.fields?.maritalStatus, value: patient.maritalStatus || t('dentistPatient.common.notProvided') }
            ].map((item, idx) => (
              <div key={idx} className="flex justify-between items-center group">
                <span className="text-sm font-medium text-muted group-hover:text-secondary transition-colors">{item.label}</span>
                <span className="text-sm font-semibold text-primary text-right">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-surface border border-primary/10 rounded-2xl shadow-sm p-8 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-primary/5">
            <ClinicalIcon name="communication" size="sm" />
            <h3 className="text-lg font-bold text-primary">{contactLabels.title}</h3>
          </div>

          <div className="space-y-5">
            {[
              { label: contactLabels.fields?.phone, value: displayValue(patient.phone) },
              { label: contactLabels.fields?.email, value: displayValue(patient.email) },
              { label: contactLabels.fields?.address, value: formatAddress(patient.address), fullWidth: true },
              { label: contactLabels.fields?.preferredContact, value: patient.preferredContact || contactLabels.defaults?.preferredContact || t('dentistPatient.profile.contact.defaultPreferred') },
              { label: contactLabels.fields?.occupation, value: patient.occupation || t('dentistPatient.common.notProvided') }
            ].map((item, idx) => (
              <div key={idx} className={`flex ${item.fullWidth ? 'flex-col gap-1' : 'justify-between items-center'} group`}>
                <span className="text-sm font-medium text-muted group-hover:text-secondary transition-colors">{item.label}</span>
                <span className={`text-sm font-semibold text-primary ${item.fullWidth ? '' : 'text-right'}`}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <section className="rounded-2xl border border-primary/10 bg-surface p-8 shadow-sm">
          <h3 className="mb-6 flex items-center gap-2 text-lg font-bold text-primary">
            <ClinicalIcon name="billing-ledger" size="sm" />
            Profil Administratif Pasien
          </h3>
          <div className="space-y-4">
            {[
              ['Penyedia asuransi', patient.insurance?.provider || patient.insuranceProvider],
              ['Nomor polis', patient.insurance?.number || patient.insuranceNumber],
              ['ID anggota', patient.insurance?.memberId || patient.insuranceMemberId],
              ['Bahasa pilihan', patient.preferredLanguage],
              ['Kontak darurat', patient.emergencyContact?.name],
              ['Telepon darurat', patient.emergencyContact?.phone || patient.emergencyContact?.number],
              ['Hubungan', patient.emergencyContact?.relationship]
            ].map(([label, value]) => (
              <div key={label} className="flex items-start justify-between gap-4">
                <span className="text-sm font-medium text-muted">{label}</span>
                <span className="text-right text-sm font-semibold text-primary">{displayValue(value)}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-blue-200 bg-blue-50/70 p-8 shadow-sm dark:border-blue-900/50 dark:bg-blue-950/20">
          <h3 className="mb-6 flex items-center gap-2 text-lg font-bold text-blue-950 dark:text-blue-100">
            <ClinicalIcon name="emr-record" size="sm" />
            Pre-Session Health Form
          </h3>
          {patient.latestHealthForm ? (
            <div className="space-y-4">
              {[
                ['Gejala', patient.latestHealthForm.symptoms],
                ['Skala nyeri', patient.latestHealthForm.painLevel],
                ['Alergi', patient.latestHealthForm.allergies],
                ['Obat', patient.latestHealthForm.medications],
                ['Catatan', patient.latestHealthForm.notes],
                ['Dikirim', patient.latestHealthForm.submittedAt ? formatDate(patient.latestHealthForm.submittedAt) : null]
              ].map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-4">
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">{label}</span>
                  <span className="text-right text-sm font-semibold text-blue-950 dark:text-blue-100">{displayValue(value)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-blue-300 p-6 text-center text-sm text-blue-700 dark:border-blue-800 dark:text-blue-300">
              Belum ada formulir kesehatan yang dikirim.
            </div>
          )}
        </section>
      </div>

      {/* Medical Summary */}
      <div className="bg-surface border border-primary/10 rounded-2xl shadow-sm p-8">
        <h3 className="text-lg font-bold text-primary mb-6 flex items-center gap-2">
          <ClinicalIcon name="emr-record" size="sm" />
          {medicalLabels.title}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Allergies */}
          <div className="bg-red-50/50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-xl p-5 hover:-translate-y-1 transition-transform duration-300">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full shadow-[0_0_6px_rgba(239,68,68,0.6)]"></div>
              <span className="text-xs font-bold uppercase tracking-wider text-red-800/70 dark:text-red-400/80">{medicalLabels.summary?.allergies}</span>
            </div>
            <p className="text-3xl font-bold text-primary mb-1">
              {patient.medicalHistory?.allergies?.length || 0}
            </p>
            <p className="text-sm text-secondary truncate">
              {patient.medicalHistory?.allergies?.slice(0, 2).join(', ') || medicalLabels.summary?.none}
            </p>
          </div>

          {/* Conditions */}
          <div className="bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-xl p-5 hover:-translate-y-1 transition-transform duration-300">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-1.5 h-1.5 bg-amber-500 rounded-full shadow-[0_0_6px_rgba(245,158,11,0.6)]"></div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-800/70 dark:text-amber-400/80">{medicalLabels.summary?.conditions}</span>
            </div>
            <p className="text-3xl font-bold text-primary mb-1">
              {patient.medicalHistory?.conditions?.length || 0}
            </p>
            <p className="text-sm text-secondary truncate">
              {patient.medicalHistory?.conditions?.slice(0, 2).join(', ') || medicalLabels.summary?.none}
            </p>
          </div>

          {/* Medications */}
          <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl p-5 hover:-translate-y-1 transition-transform duration-300">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full shadow-[0_0_6px_rgba(59,130,246,0.6)]"></div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-800/70 dark:text-blue-400/80">{medicalLabels.summary?.medications}</span>
            </div>
            <p className="text-3xl font-bold text-primary mb-1">
              {patient.medicalHistory?.medications?.length || 0}
            </p>
            <p className="text-sm text-secondary truncate">
              {patient.medicalHistory?.medications?.slice(0, 2).join(', ') || medicalLabels.summary?.none}
            </p>
          </div>
        </div>
      </div>

      {/* Visit History Summary */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl shadow-lg p-8 relative overflow-hidden">
        <div className="absolute top-8 right-8 opacity-10">
          <ClinicalIcon name="appointment-calendar" size="xl" className="border-white/10 bg-white/10 text-white shadow-none" />
        </div>
        
        <h3 className="text-lg font-bold mb-8 relative z-10 flex items-center gap-2">
          <ClinicalIcon name="session-history" size="sm" className="border-white/10 bg-white/10 text-white shadow-none" />
          {visitLabels.title}
        </h3>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
          <div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">{visitLabels.totalVisits}</p>
            <p className="text-3xl font-bold">{patient.appointments?.length || 0}</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">{visitLabels.lastVisit}</p>
            <p className="text-xl font-semibold text-slate-200">
              {patient.lastVisit ? formatDate(patient.lastVisit) : visitLabels.none}
            </p>
          </div>
          <div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">{visitLabels.nextAppointment}</p>
            <p className="text-xl font-semibold text-amber-300">
              {patient.nextAppointment ? formatDate(patient.nextAppointment) : visitLabels.none}
            </p>
          </div>
          <div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">{visitLabels.patientSince}</p>
            <p className="text-xl font-semibold text-slate-200">
              {patient.registrationDate
                ? t('dentistPatient.profile.labels.patientSince', {
                    years: Math.floor((new Date().getTime() - new Date(patient.registrationDate).getTime()) / (1000 * 60 * 60 * 24 * 365))
                  })
                : visitLabels.notAvailable || t('dentistPatient.profile.labels.notAvailable')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientProfile;
