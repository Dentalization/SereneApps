import React, { useMemo, useEffect, useState } from "react";
import PropTypes from "prop-types";
import { useLanguage } from "../../../../contexts/LanguageContext";
import ClinicalIcon from "./ClinicalIcon";

const EnhancedHeader = ({ totalPatients, activePatients, scheduledAppointments, aiAnalyzedPatients, onAddPatient }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const { t, language } = useLanguage();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedDate = useMemo(() => currentTime.toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }), [currentTime, language]);
  const formattedTime = useMemo(() => currentTime.toLocaleTimeString(language === 'id' ? 'id-ID' : 'en-US', { hour: '2-digit', minute: '2-digit', hour12: false }), [currentTime, language]);

  const stats = [
    { label: t('dentistPatient.header.stats.totalPatients'), value: totalPatients, icon: 'patient-directory' },
    { label: t('dentistPatient.header.stats.activePatients'), value: activePatients, icon: 'active-care' },
    { label: t('dentistPatient.header.stats.todaysAppointments'), value: scheduledAppointments, icon: 'appointment-calendar' },
    { label: t('dentistPatient.header.stats.aiAnalyzed'), value: aiAnalyzedPatients, icon: 'ai-diagnostic' }
  ];

  return (
    <div className="bg-surface border border-primary/10 rounded-3xl shadow-theme-sm p-8 mb-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-primary tracking-tight">{t('dentistPatient.header.title')}</h1>
          <p className="text-secondary mt-1 text-lg">{t('dentistPatient.header.subtitle')}</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="text-left sm:text-right">
            <div className="text-2xl font-bold text-primary">{formattedTime}</div>
            <div className="text-sm font-medium text-secondary capitalize">{formattedDate}</div>
          </div>
          
          {onAddPatient && (
            <button
              onClick={onAddPatient}
              className="group relative bg-accent hover:bg-accent/90 text-white px-6 py-3.5 rounded-xl font-semibold text-sm shadow-lg shadow-accent/30 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-3"
            >
              <ClinicalIcon name="add-patient" size="sm" variant="solid" className="border-white/20 bg-white/15 text-white shadow-none" />
              <span>{t('dentistPatient.header.actions.addPatient')}</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-gradient-to-br from-surface-elevated to-surface rounded-2xl p-5 border border-primary/10 shadow-sm relative overflow-hidden group">
            <div className="absolute -right-3 -top-3 opacity-10 group-hover:opacity-20 transition-opacity">
              <ClinicalIcon name={stat.icon} size="xl" className="border-0 shadow-none" />
            </div>
            <div className="relative z-10">
              <ClinicalIcon name={stat.icon} size="lg" className="mb-3" />
              <div className="text-3xl font-bold text-primary tracking-tight">{stat.value}</div>
              <div className="text-sm font-medium text-secondary mt-1">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

EnhancedHeader.propTypes = {
  totalPatients: PropTypes.number,
  activePatients: PropTypes.number,
  scheduledAppointments: PropTypes.number,
  aiAnalyzedPatients: PropTypes.number,
  onAddPatient: PropTypes.func,
};

export default EnhancedHeader;
