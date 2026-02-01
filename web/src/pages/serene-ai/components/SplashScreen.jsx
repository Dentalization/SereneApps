import React, { useEffect, useState, useCallback } from 'react';
import Icon from '../../../components/AppIcon';
import ToothScanLoader from '../../../components/ui/ToothScanLoader'; // Assuming you saved the loader here

const SplashScreen = ({
  onContinue,
  title = 'Welcome to',
  subtitle = 'AI-powered dental analysis with conversational intelligence.',
  ctaLabel = 'Launch Platform',
}) => {
  const [mounted, setMounted] = useState(false);
  const [exit, setExit] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(t);
  }, []);

  const handleContinue = useCallback(() => {
    setExit(true);
    setTimeout(() => onContinue && onContinue(), 400); // Allow exit animation to finish
  }, [onContinue]);

  // Handle keyboard shortcuts
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
      className={`fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden transition-all duration-500 ${
        mounted && !exit ? 'opacity-100 bg-slate-950' : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* --- 1. Dynamic Background --- */}
      <div className="absolute inset-0 z-0">
        {/* Deep base */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-black" />
        
        {/* Animated Glow Orbs */}
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[120px]" />
        
        {/* Grid Texture */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03]" />
      </div>

      {/* --- 2. Main Glass Card --- */}
      <div
        className={`relative z-10 w-full max-w-2xl p-1 rounded-3xl bg-gradient-to-b from-white/10 to-white/5 shadow-2xl transition-all duration-500 ${
          mounted && !exit ? 'scale-100 translate-y-0 opacity-100' : 'scale-95 translate-y-4 opacity-0'
        }`}
      >
        <div className="relative rounded-[22px] bg-slate-900/40 backdrop-blur-xl border border-white/10 p-8 sm:p-12 overflow-hidden">
          
          {/* Noise overlay for texture */}
          <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]" />

          {/* Content Wrapper */}
          <div className="relative z-10 flex flex-col items-center text-center">
            
            {/* 3D Animation Section */}
            <div className="mb-8 scale-90 sm:scale-100">
              <ToothScanLoader text="" /> 
              {/* Passing empty text because we use custom text below */}
            </div>

            {/* Brand Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-6 backdrop-blur-md">
              <img src="/icon.png" alt="Logo" className="w-4 h-4 object-contain" />
              <span className="text-[10px] font-bold tracking-widest uppercase text-white/70">Serene AI Platform v2.0</span>
            </div>

            {/* Typography */}
            <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight mb-2">
              {title} <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Future</span>
            </h1>
            
            <p className="text-lg text-slate-300 max-w-md mx-auto leading-relaxed mb-8">
              {subtitle}
            </p>

            {/* Interactive Feature Pills */}
            <div className="flex flex-wrap justify-center gap-3 mb-10">
              {[
                { icon: 'Brain', label: 'Neural Analysis' },
                { icon: 'ShieldCheck', label: 'Clinical Grade' },
                { icon: 'Zap', label: 'Real-time' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                  <Icon name={item.icon} size={14} className="text-blue-400" />
                  <span className="text-xs font-medium text-slate-300">{item.label}</span>
                </div>
              ))}
            </div>

            {/* Primary Action Button */}
            <button
              onClick={handleContinue}
              className="group relative inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-slate-900 rounded-full font-bold text-sm transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)]"
            >
              <span>{ctaLabel}</span>
              <Icon name="ArrowRight" size={16} className="transition-transform group-hover:translate-x-1" />
            </button>

            <div className="mt-6 text-[10px] text-slate-500 uppercase tracking-widest">
              Press Enter to Start
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;