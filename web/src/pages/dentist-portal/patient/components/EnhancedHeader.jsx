import React, { useMemo, useEffect, useState } from "react";
import PropTypes from "prop-types";
import { useLanguage } from "../../../../contexts/LanguageContext";

const Icon = ({ name, size = 20, className = "" }) => {
  const props = { width: size, height: size, className, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" };
  switch (name) {
    case "Calendar": return <svg {...props}><path d="M8 2v4M16 2v4M3 10h18" /><path d="M5 6h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" /></svg>;
    case "BarChart3": return <svg {...props}><path d="M3 3v18h18" /><path d="M7 13v5" /><path d="M12 8v10" /><path d="M17 11v7" /></svg>;
    case "Users": return <svg {...props}><circle cx="9" cy="7" r="3" /><circle cx="17" cy="9" r="3" /><path d="M7 21v-2a4 4 0 0 1 4-4h2" /><path d="M17 21v-2a4 4 0 0 0-3-3.9" /></svg>;
    case "TrendingUp": return <svg {...props}><polyline points="23 7 13.5 16.5 8.5 11.5 1 19" /><polyline points="17 7 23 7 23 13" /></svg>;
    case "UserPlus": return <svg {...props}><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" /></svg>;
    default: return <span style={{ width: size, height: size }} className={className} />;
  }
};
Icon.propTypes = { name: PropTypes.string, size: PropTypes.number, className: PropTypes.string };

const EnhancedHeader = ({ totalPatients, activePatients, scheduledAppointments, aiAnalyzedPatients, onAddPatient }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const { t, language } = useLanguage();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedDate = useMemo(() => new Date().toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }), [language]);
  const formattedTime = useMemo(() => new Date().toLocaleTimeString(language === 'id' ? 'id-ID' : 'en-US', { hour: '2-digit', minute: '2-digit', hour12: false }), []);

  const stats = [
    { label: t('dentistPatient.header.stats.totalPatients'), value: totalPatients, icon: 'Users', colorClass: 'bg-blue-500', shadowColor: 'rgba(59,130,246,0.5)' },
    { label: t('dentistPatient.header.stats.activePatients'), value: activePatients, icon: 'TrendingUp', colorClass: 'bg-emerald-500', shadowColor: 'rgba(16,185,129,0.5)' },
    { label: t('dentistPatient.header.stats.todaysAppointments'), value: scheduledAppointments, icon: 'Calendar', colorClass: 'bg-amber-500', shadowColor: 'rgba(245,158,11,0.5)' },
    { label: t('dentistPatient.header.stats.aiAnalyzed'), value: aiAnalyzedPatients, icon: 'BarChart3', colorClass: 'bg-purple-500', shadowColor: 'rgba(168,85,247,0.5)' }
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
              <Icon name="UserPlus" size={20} />
              <span>{t('dentistPatient.header.actions.addPatient')}</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-gradient-to-br from-surface-elevated to-surface rounded-2xl p-5 border border-primary/10 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Icon name={stat.icon} size={48} className="text-primary"/>
            </div>
            <div className="relative z-10">
              <div className={`p-2.5 rounded-xl inline-block mb-3 bg-surface border border-primary/10 shadow-sm`}>
                <Icon name={stat.icon} size={22} className="text-primary"/>
              </div>
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