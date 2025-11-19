import React from 'react';
import Icon from '../../../../components/AppIcon';
import { useLanguage } from '../../../../contexts/LanguageContext';

const ClaimsCard = ({
  outstanding = 18,
  avgDays = 21,
  aging = { '0-30': 8, '31-60': 5, '61-90': 3, '90+': 2 },
}) => {
  const { t } = useLanguage();
  
  return (
    <div className="bg-surface rounded-3xl p-6 border border-primary/20 shadow-theme-lg hover:shadow-theme-xl transition-all duration-300 theme-transition">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-3 rounded-2xl bg-accent/10">
          <Icon name="FileStack" size={20} className="text-accent" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-primary">{t('home.claimsOutstanding')}</h3>
          <p className="text-xs text-muted">{t('home.agingSummary')}</p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-3xl font-extrabold text-primary">{outstanding}</div>
          <div className="text-xs text-secondary">{t('home.outstandingClaims')}</div>
        </div>
        <div className="p-3 rounded-xl bg-surface-elevated border border-primary/10 text-sm">
          <span className="text-secondary">{t('home.avgDays')}: </span>
          <span className="font-semibold text-primary">{avgDays}</span>
        </div>
      </div>

      {/* Aging breakdown */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-secondary">{t('home.agingBreakdown')}</span>
          <span className="text-xs text-muted">{t('home.totalClaims')}: {Object.values(aging).reduce((a, b) => a + b, 0)}</span>
        </div>
        <div className="space-y-2">
          {Object.entries(aging).map(([days, count]) => (
            <div key={days} className="flex items-center justify-between text-sm">
              <span className="text-secondary">{days === '90+' ? '90+ ' + t('home.days') : days + ' ' + t('home.days')}</span>
              <div className="flex items-center gap-2">
                <div className="w-16 h-1.5 bg-surface-elevated rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${
                      days === '0-30' ? 'bg-secondary' :
                      days === '31-60' ? 'bg-accent' :
                      days === '61-90' ? 'bg-warning' :
                      'bg-error'
                    }`}
                    style={{ width: `${(count / Object.values(aging).reduce((a, b) => a + b, 0)) * 100}%` }}
                  />
                </div>
                <span className="font-medium text-primary w-6 text-right">{count}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ClaimsCard;

