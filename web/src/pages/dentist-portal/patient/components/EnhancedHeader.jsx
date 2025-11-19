// /src/pages/dentist-portal/patient/components/EnhancedHeader.jsx
import React, { useMemo, useEffect, useState } from "react";
import PropTypes from "prop-types";
import { useLanguage } from "../../../../contexts/LanguageContext";

/** Minimal inline Icon set used by the header */
const Icon = ({ name, size = 16, className = "" }) => {
  const props = {
    width: size,
    height: size,
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };
  switch (name) {
    case "ChevronRight":
      return (
        <svg {...props}>
          <path d="M9 5l7 7-7 7" />
        </svg>
      );
    case "Calendar":
      return (
        <svg {...props}>
          <path d="M8 2v4M16 2v4M3 10h18" />
          <path d="M5 6h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" />
        </svg>
      );
    case "Plus":
      return (
        <svg {...props}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case "BarChart3":
      return (
        <svg {...props}>
          <path d="M3 3v18h18" />
          <path d="M7 13v5" />
          <path d="M12 8v10" />
          <path d="M17 11v7" />
        </svg>
      );
    case "Users":
      return (
        <svg {...props}>
          <circle cx="9" cy="7" r="3" />
          <circle cx="17" cy="9" r="3" />
          <path d="M7 21v-2a4 4 0 0 1 4-4h2" />
          <path d="M17 21v-2a4 4 0 0 0-3-3.9" />
        </svg>
      );
    case "TrendingUp":
      return (
        <svg {...props}>
          <polyline points="23 7 13.5 16.5 8.5 11.5 1 19" />
          <polyline points="17 7 23 7 23 13" />
        </svg>
      );
    case "UserPlus":
      return (
        <svg {...props}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="8.5" cy="7" r="4" />
          <line x1="20" y1="8" x2="20" y2="14" />
          <line x1="23" y1="11" x2="17" y2="11" />
        </svg>
      );
    default:
      return <span style={{ width: size, height: size }} className={className} />;
  }
};
Icon.propTypes = {
  name: PropTypes.string,
  size: PropTypes.number,
  className: PropTypes.string,
};

const EnhancedHeader = ({ 
  totalPatients = 0, 
  activePatients = 0, 
  scheduledAppointments = 0, 
  aiAnalyzedPatients = 0,
  onAddPatient
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const { t, language } = useLanguage();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formattedDate = useMemo(() => {
    const options = { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    const locale = language === 'id' ? 'id-ID' : 'en-US';
    return currentTime.toLocaleDateString(locale, options);
  }, [currentTime, language]);

  const formattedTime = useMemo(() => {
    const locale = language === 'id' ? 'id-ID' : 'en-US';
    return currentTime.toLocaleTimeString(locale, { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  }, [currentTime, language]);

  const stats = [
    {
      label: t('dentistPatient.header.stats.totalPatients'),
      value: totalPatients,
      icon: 'Users',
      color: 'blue'
    },
    {
      label: t('dentistPatient.header.stats.activePatients'),
      value: activePatients,
      icon: 'TrendingUp',
      color: 'emerald'
    },
    {
      label: t('dentistPatient.header.stats.todaysAppointments'),
      value: scheduledAppointments,
      icon: 'Calendar',
      color: 'amber'
    },
    {
      label: t('dentistPatient.header.stats.aiAnalyzed'),
      value: aiAnalyzedPatients,
      icon: 'BarChart3',
      color: 'purple'
    }
  ];

  const getColorClasses = (color) => {
    const colorMap = {
      blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
      emerald: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
      amber: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
      purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400'
    };
    return colorMap[color] || colorMap.blue;
  };

  return (
    <div className="bg-surface border border-primary/20 rounded-2xl shadow-theme-lg p-6 mb-6 theme-transition">
      {/* Header Info */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center space-x-2 text-sm text-secondary theme-transition">
            <span>{t('dentistPatient.header.tagline')}</span>
          </div>
          <h1 className="text-2xl font-bold text-primary theme-transition mt-1">
            {t('dentistPatient.header.title')}
          </h1>
          <p className="text-secondary theme-transition mt-1">
            {t('dentistPatient.header.subtitle')}
          </p>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-2xl font-bold text-primary theme-transition">
              {formattedDate}
            </div>
            <div className="text-lg text-secondary theme-transition">
              {formattedTime}
            </div>
          </div>
          
          {/* Add Patient Button */}
          {onAddPatient && (
            <button
              onClick={onAddPatient}
              className="bg-accent text-white hover:bg-accent/90 px-6 py-3 rounded-xl font-semibold text-sm shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2 hover:transform hover:scale-105"
            >
              <Icon name="UserPlus" size={18} />
              <span>{t('dentistPatient.header.actions.addPatient')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="bg-surface-elevated border border-primary/10 rounded-xl p-4 hover:shadow-theme-md transition-all duration-300 theme-transition"
          >
            <div className="flex items-center justify-between">
              <div className={`p-2 rounded-lg ${getColorClasses(stat.color)}`}>
                <Icon name={stat.icon} size={20} />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-primary theme-transition">
                {stat.value}
              </div>
              <div className="text-sm text-secondary theme-transition">
                {stat.label}
              </div>
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
