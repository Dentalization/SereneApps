import React from 'react';
import Icon from '../../../../components/AppIcon';
import { useLanguage } from '../../../../contexts/LanguageContext';

const InsightsCard = ({
  title,
  risks = [
    { patient: 'Nadia Putri', risk: 0.82, reason: 'No-show history + morning slot' },
    { patient: 'Joko Prabowo', risk: 0.74, reason: 'New patient + long travel distance' },
    { patient: 'Siti Aminah', risk: 0.68, reason: 'Rainy day + traffic pattern' },
  ],
}) => {
  const { t } = useLanguage();
  
  const cardTitle = title || t('home.aiInsights');
  
  return (
    <div className="bg-surface-elevated rounded-3xl p-6 border border-primary/30 shadow-theme-lg hover:shadow-theme-xl transition-all duration-300 theme-transition dark:border-primary/40 dark:bg-surface-elevated/80">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-3 rounded-2xl bg-accent/10">
          <Icon name="Brain" size={20} className="text-accent" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-primary">{cardTitle}</h3>
          <p className="text-xs text-muted">{t('home.topNoShowRisksToday')}</p>
        </div>
      </div>

      <div className="space-y-3">
        {risks.map((r, idx) => (
          <div key={idx} className="flex items-center justify-between bg-surface-elevated border border-primary/10 rounded-2xl p-3">
            <div>
              <div className="font-semibold text-primary">{r.patient}</div>
              <div className="text-xs text-secondary">{r.reason}</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-20 h-2 bg-surface rounded-full">
                <div className="h-full bg-red-500 rounded-full" style={{ width: `${Math.round(r.risk * 100)}%` }}></div>
              </div>
              <div className="text-sm font-bold text-primary">{Math.round(r.risk * 100)}%</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InsightsCard;

