import React from 'react';
import Icon from '../../../../components/AppIcon';

const QUALITY_COPY = {
  excellent: 'Excellent',
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor'
};

export default function NetworkQualityBadge({ level = 5, compact = false }) {
  const value = Number.isFinite(Number(level)) ? Number(level) : 0;
  const state = value >= 4 ? 'excellent' : value >= 3 ? 'good' : value >= 2 ? 'fair' : 'poor';
  const tone = state === 'poor'
    ? 'bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-900/50'
    : state === 'fair'
      ? 'bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/50'
      : 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50';

  return (
    <div className={`inline-flex items-center gap-2 rounded-md border px-2 py-1 ${tone}`}>
      <Icon name={state === 'poor' ? 'WifiOff' : 'Wifi'} size={compact ? 12 : 14} />
      <div className="flex items-end gap-0.5" aria-label={`Network quality ${value}/5`}>
        {[1, 2, 3, 4, 5].map((bar) => (
          <span
            key={bar}
            className={`w-1 rounded-full ${bar <= value ? 'bg-current' : 'bg-white/20'}`}
            style={{ height: `${bar * 3 + 4}px` }}
          />
        ))}
      </div>
      {!compact && <span className="text-xs font-semibold">{QUALITY_COPY[state]}</span>}
    </div>
  );
}
