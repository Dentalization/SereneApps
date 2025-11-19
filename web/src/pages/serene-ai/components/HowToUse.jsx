import React, { useEffect, useMemo, useState, useCallback } from 'react';
import Icon from '../../../components/AppIcon';

const HowToUse = ({ onContinue }) => {
  const steps = useMemo(
    () => [
      {
        title: 'Upload Your Dental Images',
        description:
          'Click the camera icon or drag & drop your dental X-rays, photos, or scans into the chat interface.',
        icon: 'Camera',
        details: [
          'Supports JPG, PNG, and other common image formats.',
          'Ensure images are clear and well-lit.',
          'Multiple images can be uploaded for comprehensive analysis.',
        ],
        hint: 'Tip: crop or rotate before uploading for best detection quality.',
      },
      {
        title: 'Ask Questions Naturally',
        description:
          'Type your questions in natural language. Ask about diagnoses, treatment options, or request detailed analysis.',
        icon: 'MessageCircle',
        details: [
          'Use technical dentist language — For good result.',
          'Ask specific questions for targeted analysis.',
          'Request comparisons or second opinions.',
        ],
        hint: 'Try: “Is there decay on the lower left molar? What should I do next?”',
      },
      {
        title: 'Get AI-Powered Insights',
        description:
          'Receive detailed analysis, visualizations, and professional-grade insights powered by advanced AI technology.',
        icon: 'Brain',
        details: [
          'Comprehensive diagnostic summaries.',
          'Visual annotations and overlays.',
          'Treatment recommendations and next steps.',
        ],
        hint: 'All findings include confidence levels and action items.',
      },
      {
        title: 'Interactive Visualizations',
        description:
          'View and interact with AI-generated visualizations that highlight areas of interest in your dental images.',
        icon: 'Eye',
        details: [
          'Click to enlarge visualizations.',
          'Download reports for your records.',
          'Share findings with your dental team.',
        ],
        hint: 'Use full-screen mode to inspect micro-details comfortably.',
      },
    ],
    []
  );

  const [currentStep, setCurrentStep] = useState(0);
  const total = steps.length;

  const nextStep = useCallback(() => {
    setCurrentStep((s) => {
      if (s < total - 1) return s + 1;
      onContinue && onContinue();
      return s;
    });
  }, [total, onContinue]);

  const prevStep = useCallback(() => {
    setCurrentStep((s) => (s > 0 ? s - 1 : s));
  }, []);

  const skipToChat = useCallback(() => onContinue && onContinue(), [onContinue]);

  // Keyboard navigation: ← / →, Enter to advance, Esc to skip
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        nextStep();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevStep();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        skipToChat();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [nextStep, prevStep, skipToChat]);

  const progress = Math.round(((currentStep + 1) / total) * 100);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background layers */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10" />
      <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_20%,rgba(255,255,255,0.6),transparent_60%)] pointer-events-none" />
      {/* Subtle grid */}
      <svg className="absolute inset-0 w-full h-full opacity-10 mix-blend-overlay pointer-events-none" aria-hidden="true">
        <defs>
          <pattern id="ht-grid" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M 32 0 L 0 0 0 32" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-black/40" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#ht-grid)" />
      </svg>

      {/* Container */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl sm:text-5xl font-bold text-text-primary">
            How to Use{' '}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Serene AI</span>
          </h1>
          <p className="mt-3 text-lg sm:text-xl text-text-secondary">
            Learn how to get the most out of your AI dental assistant
          </p>
        </div>

        {/* Glass card */}
        <div className="rounded-3xl border border-black/5 dark:border-white/10 bg-white/80 dark:bg-gray-900/70 backdrop-blur-xl shadow-[0_20px_80px_-20px_rgba(0,0,0,0.35)] overflow-hidden">
          {/* Progress bar */}
          <div className="h-1 w-full bg-black/5 dark:bg-white/10 relative">
            <div
              className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Content: two-column on desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-12">
            {/* Left column — step overview */}
            <aside className="lg:col-span-5 p-6 sm:p-8 lg:p-10 border-b lg:border-b-0 lg:border-r border-black/5 dark:border-white/10">
              {/* Icon pill */}
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-primary to-secondary flex items-center justify-center text-white shadow-md">
                <Icon name={steps[currentStep].icon} size={28} />
              </div>

              <h2 className="mt-6 text-2xl sm:text-3xl font-bold text-text-primary">
                {steps[currentStep].title}
              </h2>
              <p className="mt-3 text-gray-700 dark:text-gray-300">{steps[currentStep].description}</p>

              {/* Hint — higher contrast */}
              <div className="mt-6 rounded-xl border border-primary/30 bg-white dark:bg-gray-900 p-4 text-sm">
                <div className="flex items-start gap-2">
                  <span className="mt-1 inline-flex h-2 w-2 rounded-full bg-primary" />
                  <p className="flex-1 text-gray-800 dark:text-gray-200">{steps[currentStep].hint}</p>
                </div>
              </div>

              {/* Step list (vertical) */}
              <div className="mt-8 space-y-3">
                {steps.map((s, i) => {
                  const active = i === currentStep;
                  return (
                    <button
                      key={s.title}
                      onClick={() => setCurrentStep(i)}
                      className={[
                        'w-full text-left rounded-xl px-3 py-2 transition-all',
                        active
                          ? 'bg-primary/10 ring-1 ring-primary/30'
                          : 'hover:bg-primary/5 dark:hover:bg-primary/10',
                      ].join(' ')}
                    >
                      <div className="flex items-center gap-3">
                        <div className={['h-2 w-2 rounded-full', active ? 'bg-primary' : 'bg-black/20 dark:bg-white/20'].join(' ')} />
                        <span className={['text-sm', active ? 'text-text-primary font-medium' : 'text-text-secondary'].join(' ')}>
                          Step {i + 1}: {s.title}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </aside>

            {/* Right column — details (CONTRAST SAFE) */}
            <section className="lg:col-span-7 p-6 sm:p-8 lg:p-10">
              <div className="grid gap-4">
                {steps[currentStep].details.map((detail, idx) => (
                  <div
                    key={idx}
                    className="group flex items-start gap-3 rounded-xl border border-brand-primary/30 bg-brand-primary/5 p-4 shadow-sm hover:border-brand-primary/50 hover:bg-brand-primary/10 transition-all"
                  >
                    <div className="mt-1 h-2 w-2 rounded-full bg-primary group-hover:scale-110 transition-transform" />
                    <p className="text-[15px] leading-relaxed text-gray-900 dark:text-gray-100">
                      {detail}
                    </p>
                  </div>
                ))}
              </div>

              {/* Mini tips row — IMPROVED CONTRAST */}
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border border-brand-primary/30 bg-brand-primary/5 p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                    <Icon name="ShieldCheck" size={16} />
                    Privacy
                  </div>
                  <p className="mt-1 text-xs text-text-secondary">
                    Your uploads are encrypted and processed securely.
                  </p>
                </div>

                <div className="rounded-xl border border-brand-primary/30 bg-brand-primary/5 p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                    <Icon name="Zap" size={16} />
                    Speed
                  </div>
                  <p className="mt-1 text-xs text-text-secondary">
                    Get results in seconds with optimized inference.
                  </p>
                </div>

                <div className="rounded-xl border border-brand-primary/30 bg-brand-primary/5 p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                    <Icon name="Info" size={16} />
                    Guidance
                  </div>
                  <p className="mt-1 text-xs text-text-secondary">
                    AI suggestions complement, not replace, clinical judgment.
                  </p>
                </div>
              </div>

              {/* Navigation bar */}
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-4">
                <button
                  onClick={prevStep}
                  disabled={currentStep === 0}
                  className={[
                    'inline-flex items-center gap-2 px-5 py-2.5 rounded-full transition-all',
                    currentStep === 0
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/5',
                  ].join(' ')}
                >
                  <Icon name="ArrowLeft" size={18} />
                  <span>Previous</span>
                </button>

                <button
                  onClick={skipToChat}
                  className="text-text-secondary hover:text-text-primary transition-colors text-sm"
                >
                  Skip Tutorial
                </button>

                <button
                  onClick={nextStep}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-primary to-secondary text-white px-6 py-2.5 rounded-full hover:opacity-90 active:scale-[0.99] transition-all shadow-sm"
                >
                  <span>{currentStep === total - 1 ? 'Start Chatting' : 'Next'}</span>
                  <Icon name="ArrowRight" size={18} />
                </button>
              </div>

              {/* Step counter */}
              <div className="mt-4 text-center text-xs text-text-secondary">
                Step {currentStep + 1} of {total} • Use ← / → or Enter
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HowToUse;
