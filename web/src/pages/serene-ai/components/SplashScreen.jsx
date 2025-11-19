import React, { useEffect, useState, useCallback } from 'react';
import Icon from '../../../components/AppIcon';

// (Optional) lightweight Stat chip — pure JS, no TS types
const Stat = ({ value, label }) => (
  <div className="rounded-2xl bg-white/70 dark:bg-gray-900/60 ring-1 ring-black/5 dark:ring-white/10 px-5 py-4 backdrop-blur">
    <div className="text-2xl font-bold text-text-primary">{value}</div>
    <div className="text-sm text-text-secondary">{label}</div>
  </div>
);

const SplashScreen = ({
  onContinue,
  title = 'Welcome to',
  subtitle = 'AI-powered dental analysis with conversational intelligence.',
  ctaLabel = 'Get Started',
  showProgress = false,
}) => {
  const [mounted, setMounted] = useState(false);
  const [exit, setExit] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  const handleContinue = useCallback(() => {
    setExit(true);
    setTimeout(() => onContinue && onContinue(), 260);
  }, [onContinue]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleContinue();
      }
      if (e.key === 'Escape') handleContinue();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleContinue]);

  return (
    <div
      className={[
        'fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden',
        'transition-opacity duration-300',
        mounted && !exit ? 'opacity-100' : 'opacity-0',
      ].join(' ')}
      role="dialog"
      aria-modal="true"
      aria-labelledby="splash-title"
    >
      {/* Background layers */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary to-secondary" />
      <div className="absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_30%,rgba(255,255,255,0.18),transparent_60%)]" />
      <svg className="absolute inset-0 w-full h-full opacity-10 mix-blend-overlay" aria-hidden="true">
        <defs>
          <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M 32 0 L 0 0 0 32" fill="none" stroke="white" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
      <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-black/10 blur-3xl" />

      {/* Card */}
      <div
        className={[
          'relative mx-4 w-full max-w-3xl',
          'rounded-3xl border border-white/15',
          'bg-white/10 dark:bg-black/20 backdrop-blur-xl',
          'shadow-[0_20px_80px_-20px_rgba(0,0,0,0.45)]',
          'px-6 sm:px-10 py-10 sm:py-14',
          'transition-all duration-300',
          mounted && !exit ? 'scale-100 translate-y-0' : 'scale-[0.98] translate-y-2',
        ].join(' ')}
      >
        {/* Brand row */}
        <div className="flex items-center justify-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center ring-1 ring-white/25 overflow-hidden">
            {/* Use custom icon PNG */}
            <img
              src="/icon.png"
                  alt="Serene AI Logo" 
                />
              </div>
              <div className="text-left">
                <div className="text-xs uppercase tracking-[0.2em] text-white/70">Dentalization</div>
                <div className="text-sm text-white/80">Serene Platform</div>
              </div>
            </div>

            {/* Title */}
        <div className="mt-8 text-center space-y-3">
          <h1 id="splash-title" className="text-4xl sm:text-5xl font-bold text-white">
            {title}
          </h1>
          <h2 className="text-5xl sm:text-6xl font-extrabold bg-gradient-to-r from-white via-white to-white/70 bg-clip-text text-transparent tracking-tight">
            Serene AI Agentic
          </h2>
          <p className="mt-4 text-lg sm:text-xl text-white/85 max-w-2xl mx-auto leading-relaxed">
            {subtitle}
          </p>
        </div>

        {/* Feature chips */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          {[
            { icon: 'Activity', label: 'Real-time Analysis' },
            { icon: 'MessageCircle', label: 'Conversational AI' },
            { icon: 'ShieldCheck', label: 'Clinical-grade' },
          ].map((f) => (
            <span
              key={f.label}
              className="inline-flex items-center gap-2 text-sm text-white/90 px-3 py-1.5 rounded-full bg-white/10 ring-1 ring-white/15"
            >
              <Icon name={f.icon} size={14} />
              {f.label}
            </span>
          ))}
        </div>

        {/* Optional progress */}
        {showProgress && (
          <div className="mt-8 mx-auto h-1.5 w-56 rounded-full bg-white/15 overflow-hidden">
            <div className="h-full w-2/3 bg-white/70 animate-pulse" />
          </div>
        )}

        {/* Stats row (optional) */}
        {/* <div className="mt-10 grid grid-cols-3 gap-3">
          <Stat value="85%+" label="Detection Accuracy (target)" />
          <Stat value="30–40%" label="Consultation time saved" />
          <Stat value="E2E" label="Encrypted, PDP-compliant" />
        </div> */}

        {/* Actions */}
        <div className="mt-10 flex flex-col items-center gap-3">
          <button
            onClick={handleContinue}
            className="inline-flex items-center gap-2 rounded-full px-7 py-3.5 font-semibold
                       text-primary bg-white hover:bg-white/95 active:scale-[0.99]
                       transition-all shadow-lg focus:outline-none focus:ring-2 focus:ring-white/50"
            aria-label={ctaLabel}
          >
            {ctaLabel}
            <Icon name="ArrowRight" size={18} />
          </button>

          <div className="mt-1 text-xs text-white/60">Press Enter to continue • Esc to skip</div>
        </div>

        <div className="pointer-events-none absolute -inset-px rounded-3xl ring-1 ring-white/10" />
      </div>
    </div>
  );
};

export default SplashScreen;
