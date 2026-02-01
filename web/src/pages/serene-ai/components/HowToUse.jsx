import React, { useEffect, useMemo, useState, useCallback } from 'react';
import Icon from '../../../components/AppIcon';

const HowToUse = ({ onContinue }) => {
  const steps = useMemo(
    () => [
      {
        title: 'Upload Dental Images',
        description:
          'Click the camera icon or drag & drop your dental X-rays, intraoral photos, or scans directly into the chat.',
        icon: 'Camera',
        details: [
          'Supports JPG, PNG, and DICOM formats.',
          'Ensure images are well-lit and in focus.',
          'Upload multiple angles for better accuracy.',
        ],
        hint: 'Tip: Crop the image to focus on the specific tooth of interest.',
      },
      {
        title: 'Ask Naturally',
        description:
          'Interact with Serene AI just like you would with a colleague. Ask for second opinions, differential diagnoses, or treatment plans.',
        icon: 'MessageCircle',
        details: [
          'Use clinical terminology for precise results.',
          'Ask specific questions like "Is there periapical pathology?"',
          'Request patient-friendly explanations to share.',
        ],
        hint: 'Try: "Analyze the lower left quadrant for potential caries."',
      },
      {
        title: 'AI Analysis & Insights',
        description:
          'Get instant, clinical-grade analysis powered by our neural networks. Review confidence scores and detected anomalies.',
        icon: 'Brain',
        details: [
          'Diagnostic summaries generated in seconds.',
          'Visual bounding boxes on pathologies.',
          'Risk assessment levels (Low/Medium/High).',
        ],
        hint: 'Findings are highlighted with color-coded confidence levels.',
      },
      {
        title: 'Interactive Viewer',
        description:
          'Deep dive into the results with our interactive visualizer. Toggle layers, zoom in on details, and export reports.',
        icon: 'Eye',
        details: [
          'Click annotations to see detailed findings.',
          'Export PDF reports for patient records.',
          'Securely share findings with specialists.',
        ],
        hint: 'Use the toolbar to toggle between original and annotated views.',
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

  // Keyboard navigation
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
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center bg-slate-50 dark:bg-slate-950">
      
      {/* Background Decor */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03]" />
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[100px]" />

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-10">
        
        {/* Header */}
        <div className="text-center mb-10 animate-in fade-in slide-in-from-top-4 duration-700">
          <h1 className="text-3xl sm:text-5xl font-bold text-slate-900 dark:text-white tracking-tight">
            How to Use <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Serene AI</span>
          </h1>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Master the platform in 4 simple steps to enhance your dental workflow.
          </p>
        </div>

        {/* The Card */}
        <div className="rounded-3xl border border-white/20 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col lg:flex-row min-h-[500px]">
          
          {/* Progress Bar (Mobile Only - Top) */}
          <div className="lg:hidden h-1 w-full bg-slate-200 dark:bg-slate-800">
            <div className="h-full bg-blue-600 transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
          </div>

          {/* LEFT: Navigation & Titles */}
          <aside className="lg:w-2/5 p-8 lg:p-10 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between bg-white/50 dark:bg-black/20">
            <div>
              {/* Icon Container - Fixed duplicate className here */}
              <div 
                key={currentStep} // Key helps React trigger animation on change
                className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white shadow-lg mb-8 transition-transform animate-in zoom-in-50 duration-300"
              >
                <Icon name={steps[currentStep].icon} size={32} />
              </div>

              {/* Title & Desc */}
              <div key={`text-${currentStep}`} className="animate-in fade-in slide-in-from-left-4 duration-500">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
                  {steps[currentStep].title}
                </h2>
                <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
                  {steps[currentStep].description}
                </p>
              </div>
            </div>

            {/* Step Indicators (Desktop) */}
            <div className="hidden lg:flex gap-2 mt-12">
              {steps.map((_, i) => (
                <div 
                  key={i} 
                  className={`h-1.5 rounded-full transition-all duration-500 ${i <= currentStep ? 'w-8 bg-blue-600' : 'w-2 bg-slate-300 dark:bg-slate-700'}`} 
                />
              ))}
            </div>
          </aside>

          {/* RIGHT: Details & Actions */}
          <section className="lg:w-3/5 p-8 lg:p-10 flex flex-col justify-between">
            
            {/* Dynamic Content */}
            <div key={`details-${currentStep}`} className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
              
              {/* Detail List */}
              <div className="space-y-3">
                {steps[currentStep].details.map((detail, idx) => (
                  <div key={idx} className="flex items-start gap-4 p-4 rounded-xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="mt-1 w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                      <Icon name="Check" size={12} />
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 text-sm font-medium">{detail}</p>
                  </div>
                ))}
              </div>

              {/* Pro Tip */}
              <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-800/30">
                <div className="flex gap-3">
                  <Icon name="Sparkles" size={20} className="text-purple-600 dark:text-purple-400 shrink-0" />
                  <p className="text-sm text-purple-900 dark:text-purple-200 font-medium">
                    <span className="font-bold">Pro Tip:</span> {steps[currentStep].hint}
                  </p>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="mt-10 flex flex-col-reverse sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-200 dark:border-slate-800">
              
              <button
                onClick={skipToChat}
                className="text-sm font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors"
              >
                Skip Tutorial
              </button>

              <div className="flex gap-3 w-full sm:w-auto">
                <button
                  onClick={prevStep}
                  disabled={currentStep === 0}
                  className={`flex-1 sm:flex-none px-6 py-3 rounded-full font-medium text-sm border transition-all ${
                    currentStep === 0
                      ? 'border-transparent text-slate-300 dark:text-slate-700 cursor-not-allowed'
                      : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  Back
                </button>

                <button
                  onClick={nextStep}
                  className="flex-1 sm:flex-none px-8 py-3 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-sm hover:opacity-90 transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  {currentStep === total - 1 ? 'Get Started' : 'Next'}
                  <Icon name="ArrowRight" size={16} />
                </button>
              </div>
            </div>

          </section>
        </div>

        {/* Keyboard Hint */}
        <div className="mt-6 text-center text-xs text-slate-400 dark:text-slate-600 font-medium hidden sm:block">
          Press <kbd className="font-sans px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 mx-1">Enter</kbd> to continue
        </div>

      </div>
    </div>
  );
};

export default HowToUse;