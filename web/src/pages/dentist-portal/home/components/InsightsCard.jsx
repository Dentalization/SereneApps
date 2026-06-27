import React from 'react';
import Icon from '../../../../components/AppIcon';
import { useLanguage } from '../../../../contexts/LanguageContext';

const InsightsCard = ({
  title,
  risks = [],
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
          <p className="text-xs text-muted">Berdasarkan status appointment tersimpan</p>
        </div>
      </div>

      <div className="space-y-3">
        {risks.length === 0 ? (
          <div className="rounded-lg border border-primary/10 bg-surface p-4 text-sm text-secondary">
            Tidak ada pasien yang perlu ditindaklanjuti.
          </div>
        ) : risks.map((r, idx) => (
          <div key={idx} className="flex items-center justify-between bg-surface-elevated border border-primary/10 rounded-2xl p-3">
            <div>
              <div className="font-semibold text-primary">{r.patient}</div>
              <div className="text-xs text-secondary">{r.reason}</div>
            </div>
            <span className={`rounded-md px-2 py-1 text-xs font-semibold ${
              r.status === 'overdue'
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200'
                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'
            }`}>
              {r.statusLabel || r.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InsightsCard;
