import React from 'react';
import Icon from '../../../../components/AppIcon';

const QuickActionCard = ({ title, subtitle, icon, color = "accent", onClick }) => {
  return (
    <button
      onClick={onClick}
      className="w-full bg-surface-elevated rounded-3xl border border-primary/30 shadow-theme-lg hover:shadow-theme-xl p-6 transition-all duration-300 hover:scale-[1.02] theme-transition text-left group relative dark:border-primary/40 dark:bg-surface-elevated/80"
    >
      {/* Icon container */}
      <div className="mb-4 p-3 rounded-2xl bg-accent/10 group-hover:bg-accent/20 transition-all duration-300 inline-flex">
        <Icon name={icon} size={24} className="text-accent group-hover:scale-110 transition-transform duration-300" />
      </div>

      {/* Content */}
      <div className="space-y-2">
        <h3 className="font-semibold text-primary group-hover:text-accent transition-colors duration-300 theme-transition">
          {title}
        </h3>
        {subtitle && (
          <p className="text-sm text-secondary theme-transition">
            {subtitle}
          </p>
        )}
      </div>

      {/* Arrow indicator */}
      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
        <Icon name="ArrowRight" size={16} className="text-accent" />
      </div>
    </button>
  );
};

export default QuickActionCard;
