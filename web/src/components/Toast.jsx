import React, { useEffect, useState } from 'react';
import { shouldSuppressToastMessage } from '../contexts/ToastContext';
import { createPortal } from 'react-dom';

const STATUS_CONFIG = {
  success: {
    icon: '✓',
    label: 'Berhasil',
    bgGradient: 'from-emerald-500 to-teal-400',
    iconBg: 'bg-white/20',
    iconColor: 'text-white',
    textColor: 'text-white',
    labelColor: 'text-white/85',
  },
  error: {
    icon: '⚠',
    label: 'Butuh perhatian',
    bgGradient: 'from-red-500 to-red-400',
    iconBg: 'bg-white/20',
    iconColor: 'text-white',
    textColor: 'text-white',
    labelColor: 'text-white/85',
  },
  warning: {
    icon: '⚡',
    label: 'Perlu dicek',
    bgGradient: 'from-amber-500 to-yellow-400',
    iconBg: 'bg-black/10',
    iconColor: 'text-amber-900',
    textColor: 'text-white',
    labelColor: 'text-white/85',
  },
  info: {
    icon: 'ℹ',
    label: 'Informasi',
    bgGradient: 'from-indigo-600 to-purple-600',
    iconBg: 'bg-white/20',
    iconColor: 'text-white',
    textColor: 'text-white',
    labelColor: 'text-white/85',
  },
};

const Toast = ({ visible, message, onDismiss, status = 'info', duration = 5000 }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);

  const config = STATUS_CONFIG[status] || STATUS_CONFIG.info;

  useEffect(() => {
    if (visible) {
      setIsVisible(true);
      setIsDismissing(false);
    } else {
      setIsDismissing(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible || !onDismiss || !duration) return undefined;
    const timer = setTimeout(() => {
      onDismiss();
    }, duration);
    return () => clearTimeout(timer);
  }, [visible, onDismiss, duration]);

  if (!isVisible || shouldSuppressToastMessage(message)) return null;

  const toastContent = (
    <div className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 pt-4">
        <div
          className={`
            pointer-events-auto
            transition-all duration-300 ease-out
            ${isDismissing ? 'opacity-0 -translate-y-4 scale-95' : 'opacity-100 translate-y-0 scale-100'}
          `}
        >
          <div
            className={`
              bg-gradient-to-r ${config.bgGradient}
              rounded-2xl shadow-xl
              flex flex-col sm:flex-row sm:items-center items-start
              gap-3
              px-4 sm:px-5 py-3.5
              w-full
              max-w-sm sm:max-w-md md:max-w-xl lg:max-w-2xl
              mx-auto
            `}
          >
            {/* Icon */}
            <div
              className={`
                ${config.iconBg}
                rounded-full
                w-10 h-10
                flex items-center justify-center
                flex-shrink-0
              `}
            >
              <span className={`${config.iconColor} text-xl font-bold`}>{config.icon}</span>
            </div>

            {/* Text Content */}
            <div className="flex-1 min-w-0">
              <p className={`${config.labelColor} text-xs font-semibold uppercase tracking-wider mb-0.5`}>
                {config.label}
              </p>
              <p className={`${config.textColor} text-sm sm:text-[15px] font-medium leading-snug break-words`}>
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
                  self-start sm:self-center
                `}
                aria-label="Tutup"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(toastContent, document.body);
};

export default Toast;
