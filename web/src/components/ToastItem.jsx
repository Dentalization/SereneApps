import React, { useEffect, useState } from 'react';

const STATUS_CONFIG = {
  success: {
    icon: '✓',
    label: 'Success',
    bgGradient: 'from-emerald-500 to-teal-400',
    iconBg: 'bg-white/20',
    iconColor: 'text-white',
    textColor: 'text-white',
    labelColor: 'text-white/85',
  },
  error: {
    icon: '⚠',
    label: 'Error',
    bgGradient: 'from-red-500 to-red-400',
    iconBg: 'bg-white/20',
    iconColor: 'text-white',
    textColor: 'text-white',
    labelColor: 'text-white/85',
  },
  warning: {
    icon: '⚡',
    label: 'Warning',
    bgGradient: 'from-amber-500 to-yellow-400',
    iconBg: 'bg-black/10',
    iconColor: 'text-amber-900',
    textColor: 'text-white',
    labelColor: 'text-white/85',
  },
  info: {
    icon: 'ℹ',
    label: 'Info',
    bgGradient: 'from-indigo-600 to-purple-600',
    iconBg: 'bg-white/20',
    iconColor: 'text-white',
    textColor: 'text-white',
    labelColor: 'text-white/85',
  },
};

const ToastItem = ({ id, message, status = 'info', dismissing, onDismiss }) => {
  const [mounted, setMounted] = useState(false);
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.info;

  // Trigger enter animation on mount
  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const isVisible = mounted && !dismissing;

  return (
    <div
      role="alert"
      aria-live="polite"
      className="pointer-events-auto transition-all duration-300 ease-out"
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible
          ? 'translateX(0) scale(1)'
          : dismissing
            ? 'translateX(100%) scale(0.95)'
            : 'translateY(1rem) scale(0.95)',
      }}
    >
      <div
        className={`
          bg-gradient-to-r ${config.bgGradient}
          rounded-2xl shadow-xl
          flex items-center
          gap-3
          px-4 py-3.5
          w-full
          min-w-[18rem]
        `}
      >
        {/* Icon */}
        <div
          className={`
            ${config.iconBg}
            rounded-full
            w-9 h-9
            flex items-center justify-center
            flex-shrink-0
          `}
        >
          <span className={`${config.iconColor} text-lg font-bold`}>{config.icon}</span>
        </div>

        {/* Text Content */}
        <div className="flex-1 min-w-0">
          <p className={`${config.labelColor} text-xs font-semibold uppercase tracking-wider mb-0.5`}>
            {config.label}
          </p>
          <p className={`${config.textColor} text-sm font-medium leading-snug break-words`}>
            {message}
          </p>
        </div>

        {/* Close Button */}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className={`
              ${config.iconColor}
              hover:bg-white/10
              rounded-lg
              p-1.5
              transition-colors
              flex-shrink-0
            `}
            aria-label="Dismiss notification"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export default ToastItem;
