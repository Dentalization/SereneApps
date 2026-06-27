import React from 'react';
import Icon from '../../../../components/AppIcon';
import { useLanguage } from '../../../../contexts/LanguageContext';

// Simple inline SVG mini chart with two series (production vs collections)
const FinanceMiniChart = ({
  title,
  rangeLabel,
  production = [],
  collections = [],
  currency = 'Rp',
}) => {
  const { t } = useLanguage();
  
  const chartTitle = title || t('home.productionVsCollections');
  const chartRangeLabel = rangeLabel || t('home.lastSevenDays');
  
  const max = Math.max(...production, ...collections, 1);
  const pts = (arr) => arr.map((v, i) => {
    const x = arr.length > 1 ? (i / (arr.length - 1)) * 100 : 50;
    return `${x},${100 - (v / max) * 100}`;
  }).join(' ');

  const totalProd = production.reduce((a, b) => a + b, 0);
  const totalColl = collections.reduce((a, b) => a + b, 0);

  return (
    <div className="bg-surface rounded-3xl p-6 border border-primary/20 shadow-theme-lg hover:shadow-theme-xl transition-all duration-300 theme-transition">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-accent/10">
            <Icon name="BarChart3" size={20} className="text-accent" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-primary theme-transition">{chartTitle}</h3>
            <p className="text-xs text-muted theme-transition">{chartRangeLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500"></span><span className="text-secondary">{t('home.production')}</span></div>
          <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-sky-500"></span><span className="text-secondary">{t('home.collections')}</span></div>
        </div>
      </div>

      <div className="h-32 relative">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
          {production.length > 0 && <polyline fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-500" points={pts(production)} />}
          {collections.length > 0 && <polyline fill="none" stroke="currentColor" strokeWidth="2" className="text-sky-500" points={pts(collections)} />}
        </svg>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="p-3 rounded-xl bg-surface-elevated border border-primary/10">
          <div className="text-xs text-muted">{t('home.totalProduction')}</div>
          <div className="text-lg font-bold text-primary">{currency} {Intl.NumberFormat('id-ID').format(totalProd)}</div>
        </div>
        <div className="p-3 rounded-xl bg-surface-elevated border border-primary/10">
          <div className="text-xs text-muted">{t('home.totalCollections')}</div>
          <div className="text-lg font-bold text-primary">{currency} {Intl.NumberFormat('id-ID').format(totalColl)}</div>
        </div>
      </div>
    </div>
  );
};

export default FinanceMiniChart;
