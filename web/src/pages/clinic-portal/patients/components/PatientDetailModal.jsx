import React from 'react';
import { useLanguage } from '../../../../contexts/LanguageContext';
import Icon from '../../../../components/AppIcon';
import ModalPortal from '../../../../components/ui/ModalPortal';

const PatientDetailModal = ({ patient, isOpen, onClose }) => {
  const { t, language } = useLanguage();
  const locale = language === 'id' ? 'id-ID' : 'en-US';

  if (!isOpen || !patient) return null;

  const InfoSection = ({ title, children }) => (
    <div className="mb-6">
      <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center">
        {title}
      </h3>
      <div className="bg-surface rounded-lg p-4 space-y-3">
        {children}
      </div>
    </div>
  );

  const InfoItem = ({ label, value, icon }) => (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center text-text-secondary">
        {icon && <Icon name={icon} className="w-4 h-4 mr-2" />}
        {label}
      </div>
      <div className="text-text-primary font-medium">{value || t('patients.details.notSpecified')}</div>
    </div>
  );

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          className="relative w-full max-w-4xl max-h-[90vh] bg-surface-elevated rounded-xl shadow-2xl overflow-y-auto flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border/50">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mr-4">
              <span className="text-primary font-bold text-lg">
                {patient.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-text-primary">{patient.name}</h2>
              <p className="text-text-secondary">{t('patients.details.patientId', { id: patient.id })}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface rounded-lg transition-colors duration-200"
          >
            <Icon name="x" className="w-6 h-6 text-text-secondary" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Personal Information */}
            <div>
              <InfoSection title={t('patients.details.personalInfo')}>
                <InfoItem 
                  label={t('patients.details.basicInfo.fullName')} 
                  value={patient.name}
                  icon="user"
                />
                <InfoItem 
                  label={t('patients.details.basicInfo.age')} 
                  value={t('patients.details.basicInfo.ageValue', { count: patient.age })}
                  icon="calendar"
                />
                <InfoItem 
                  label={t('patients.details.basicInfo.gender')} 
                  value={patient.gender === 'M' ? t('patients.common.gender.male') : t('patients.common.gender.female')}
                  icon="user"
                />
                <InfoItem 
                  label={t('patients.details.basicInfo.phone')} 
                  value={patient.phone}
                  icon="phone"
                />
                <InfoItem 
                  label={t('patients.details.basicInfo.email')} 
                  value={patient.email}
                  icon="mail"
                />
                <InfoItem 
                  label={t('patients.details.basicInfo.address')} 
                  value={patient.address}
                  icon="map-pin"
                />
              </InfoSection>

              {/* Visit Statistics */}
              <InfoSection title={t('patients.details.visitStats.title')}>
                <InfoItem 
                  label={t('patients.details.visitStats.totalVisits')} 
                  value={patient.totalVisits}
                  icon="activity"
                />
                <InfoItem 
                  label={t('patients.details.visitStats.lastVisit')} 
                  value={new Date(patient.lastVisit).toLocaleDateString(locale)}
                  icon="clock"
                />
                <InfoItem 
                  label={t('patients.details.visitStats.patientSince')} 
                  value={new Date(patient.createdAt || patient.lastVisit).getFullYear()}
                  icon="calendar"
                />
              </InfoSection>
            </div>

            {/* Medical Information */}
            <div>
              <InfoSection title={t('patients.details.medicalHistory')}>
                <InfoItem 
                  label={t('patients.details.medical.allergies')} 
                  value={patient.medicalRecord?.allergies?.join(', ')}
                  icon="alert-triangle"
                />
                <InfoItem 
                  label={t('patients.details.medical.conditions')} 
                  value={patient.medicalRecord?.conditions?.join(', ')}
                  icon="heart"
                />
                <InfoItem 
                  label={t('patients.details.medical.bloodType')} 
                  value={patient.medicalRecord?.bloodType}
                  icon="droplet"
                />
                <InfoItem 
                  label={t('patients.details.medical.lastTreatment')} 
                  value={patient.medicalRecord?.lastTreatment}
                  icon="stethoscope"
                />
              </InfoSection>

              {/* Recent Appointments */}
              <InfoSection title={t('patients.details.appointments')}>
                <div className="space-y-3">
                  {patient.recentAppointments?.length > 0 ? (
                    patient.recentAppointments.map((appointment, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-surface-elevated rounded-lg">
                        <div>
                          <div className="font-medium text-text-primary">{appointment.treatment}</div>
                          <div className="text-sm text-text-secondary">{appointment.doctor}</div>
                        </div>
                        <div className="text-sm text-text-secondary">
                          {new Date(appointment.date).toLocaleDateString(locale)}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-text-secondary">
                      {t('patients.appointments.noAppointments')}
                    </div>
                  )}
                </div>
              </InfoSection>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 mt-8 pt-6 border-t border-border/50">
            <button className="flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors duration-200">
              <Icon name="edit" className="w-4 h-4 mr-2" />
              {t('patients.registry.actions.edit')}
            </button>
            <button className="flex items-center px-4 py-2 bg-surface border border-border/50 text-text-secondary hover:text-text-primary rounded-lg hover:bg-surface-elevated transition-colors duration-200">
              <Icon name="calendar" className="w-4 h-4 mr-2" />
              {t('patients.registry.actions.schedule')}
            </button>
            <button className="flex items-center px-4 py-2 bg-surface border border-border/50 text-text-secondary hover:text-text-primary rounded-lg hover:bg-surface-elevated transition-colors duration-200">
              <Icon name="clock" className="w-4 h-4 mr-2" />
              {t('patients.registry.actions.history')}
            </button>
          </div>
        </div>
        </div>
      </div>
    </ModalPortal>
  );
};

export default PatientDetailModal;
