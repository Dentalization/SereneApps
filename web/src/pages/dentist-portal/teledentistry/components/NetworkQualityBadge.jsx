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
    ? 'bg-red-500/20 text-red-100 border-red-300/30'
    : state === 'fair'
      ? 'bg-amber-500/20 text-amber-100 border-amber-300/30'
      : 'bg-emerald-500/20 text-emerald-100 border-emerald-300/30';

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
