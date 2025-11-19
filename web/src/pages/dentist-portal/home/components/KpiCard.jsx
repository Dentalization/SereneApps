import React from 'react';
import Icon from '../../../../components/AppIcon'; // sesuaikan jika path berbeda

const KpiCard = ({
  title,
  value,
  subtitle,
  icon = 'Activity',
  trend, // { type: 'up' | 'down' | 'flat', value: number }
  color = 'emerald',
  gradient = 'from-emerald-500/10 to-emerald-600/5',
  onClick, // opsional: jadikan kartu bisa diklik
}) => {
  // Tailwind: gunakan daftar kelas eksplisit agar tree-shake aman
  const palette = {
    emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-500' },
    blue: { bg: 'bg-blue-500/10', text: 'text-blue-500' },
    purple: { bg: 'bg-purple-500/10', text: 'text-purple-500' },
    amber: { bg: 'bg-amber-500/10', text: 'text-amber-500' },
    red: { bg: 'bg-red-500/10', text: 'text-red-500' },
    indigo: { bg: 'bg-indigo-500/10', text: 'text-indigo-500' },
    pink: { bg: 'bg-pink-500/10', text: 'text-pink-500' },
    cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-500' },
    slate: { bg: 'bg-slate-500/10', text: 'text-slate-500' },
  };
  const colorSet = palette[color] || palette.emerald;

  const trendIcon =
    trend?.type === 'down' ? 'ArrowDownRight' : trend?.type === 'flat' ? 'Minus' : 'ArrowUpRight';

  const trendTextClass =
    trend?.type === 'down'
      ? 'text-red-500'
      : trend?.type === 'flat'
      ? 'text-muted'
      : 'text-emerald-500';

  return (
    <div
      className={`group relative w-full rounded-3xl transition-all duration-300 ease-out my-1 md:my-2 ${onClick ? 'cursor-pointer hover:-translate-y-0.5 md:hover:-translate-y-1' : 'cursor-default'}`}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : -1}
      onClick={onClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label={title}
    >
      {/* Card body */}
      <div
        className="relative bg-surface-elevated rounded-3xl p-6 border border-primary/30 shadow-theme-lg
                   hover:shadow-theme-xl hover:border-accent/30 theme-transition overflow-hidden
                   transition-all duration-300 dark:border-primary/40 dark:bg-surface-elevated/80"
      >
        {/* Soft gradient wash */}
        <div
          className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${gradient} opacity-50 group-hover:opacity-70 transition-opacity duration-300`}
          aria-hidden="true"
        />

        {/* Subtle glow effect */}
        <div
          className="pointer-events-none absolute -top-10 -right-10 w-32 h-32 bg-white/5 rounded-full blur-2xl opacity-0
                     group-hover:opacity-100 transition-opacity duration-300"
          aria-hidden="true"
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full">
          {/* Top row */}
          <div className="flex items-start justify-between mb-6">
            <div className={`p-3 rounded-2xl ${colorSet.bg} ring-1 ring-white/5 transition-all duration-300 group-hover:ring-white/10`}>
              <Icon name={icon} size={28} className={colorSet.text} />
            </div>

            {trend?.value !== undefined && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface/60 backdrop-blur-sm border border-primary/10 transition-all duration-300 group-hover:bg-surface/80">
                <Icon name={trendIcon} size={16} className={trendTextClass} />
                <span className={`text-sm font-semibold ${trendTextClass}`}>
                  {trend.type === 'flat' ? '0%' : `${trend.value}%`}
                </span>
              </div>
            )}
          </div>

          {/* Metric */}
          <div className="mb-2">
            <div className="text-sm text-muted theme-transition">{title}</div>
            <div className="text-3xl font-extrabold tracking-tight text-primary theme-transition">
              {value}
            </div>
          </div>

          {/* Subtitle */}
          {subtitle && <div className="text-sm text-secondary theme-transition">{subtitle}</div>}

        </div>

        {/* Focus ring for a11y */}
        {onClick && (
          <span className="pointer-events-none absolute inset-0 rounded-3xl ring-0 ring-accent/0 group-focus-visible:ring-2 group-focus-visible:ring-accent/50 transition-all duration-200" />
        )}
      </div>
    </div>
  );
};

export default KpiCard;
