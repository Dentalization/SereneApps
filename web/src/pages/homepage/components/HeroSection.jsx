import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

/** Zero-dependency rotating words component */
function RotatingWords({ words, interval = 3000 }) {
  const [i, setI] = useState(0);
  const [phase, setPhase] = useState('in');
  const timeoutRef = useRef(null);
  const intervalRef = useRef(null);

  const longest = useMemo(
    () => words.reduce((a, b) => (a.length >= b.length ? a : b), ''),
    [words]
  );

  useEffect(() => {
    const tick = () => {
      setPhase('out');
      timeoutRef.current = setTimeout(() => {
        setI((x) => (x + 1) % words.length);
        setPhase('in');
      }, 220);
    };
    intervalRef.current = setInterval(tick, interval);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [interval, words.length]);

  return (
    <span className="relative inline-flex align-baseline">
      <span aria-hidden="true" className="invisible whitespace-nowrap">
        {longest}
      </span>
      <span
        className={`absolute inset-0 transition-all duration-200 ease-out whitespace-nowrap
          ${phase === 'in' ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}
      >
        <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent dark:from-purple-400 dark:to-pink-400">
          {words[i]}
        </span>
      </span>
    </span>
  );
}

const HeroSection = () => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const rotatingTexts = [
    'you can trust',
    'will assist you',
  ];

  // Using Local Images from /public/assets/imagesTesting/
  const demoImages = [
    {
      id: 1,
      src: '/assets/imagesTesting/test1.png', 
      alt: 'Dental Analysis Case 1',
      analysis: 'Healthy dental structure. No bone loss detected.',
    },
    {
      id: 2,
      src: '/assets/imagesTesting/test2.png', 
      alt: 'Dental Analysis Case 2',
      analysis: 'Enamel looks intact. Minor staining observed on lower incisors.',
    },
    {
      id: 3,
      src: '/assets/imagesTesting/test3.png', 
      alt: 'Dental Analysis Case 3',
      analysis: 'Potential cavity detected in upper right molar (Sector 3).',
    },
    {
      id: 4,
      src: '/assets/imagesTesting/test4.png', 
      alt: 'Dental Analysis Case 4',
      analysis: 'Gum inflammation detected. Periodontal assessment recommended.',
    },
  ];

  useEffect(() => {
    // Auto-rotate images every 5 seconds
    const id = setInterval(
      () => setCurrentImageIndex((i) => (i + 1) % demoImages.length),
      5000 
    );
    return () => clearInterval(id);
  }, [demoImages.length]);

  const handleAnalysisDemo = () => {
    setIsAnalyzing(true);
    setTimeout(() => setIsAnalyzing(false), 2500);
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-white dark:bg-slate-900">
      
      {/* Background Decor */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.03]">
        <div className="absolute top-20 left-20 w-32 h-32 bg-blue-500 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-40 h-40 bg-purple-500 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          
          {/* LEFT CONTENT */}
          <div className="text-center lg:text-left space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center space-x-2 bg-blue-50 dark:bg-blue-900/20 backdrop-blur-sm rounded-full px-4 py-2 border border-blue-100 dark:border-blue-800">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-slate-600 dark:text-blue-200">
                  Trusted by 50,000+ patients
                </span>
              </div>

              <h1 className="text-5xl lg:text-6xl font-bold text-slate-900 dark:text-white leading-tight">
                AI-powered dental insights{' '}
                <RotatingWords words={rotatingTexts} interval={3000} />
              </h1>

              <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto lg:mx-0">
                Get professional-grade dental analysis in seconds. Our YOLOv8
                computer vision technology provides accurate insights to help you make informed decisions.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              {/* Primary CTA - Goes to App */}
              <Link to="/serene-ai">
                <Button
                  variant="default"
                  size="lg"
                  iconName="Camera"
                  iconPosition="left"
                  className="shadow-lg shadow-blue-500/30 w-full sm:w-auto"
                >
                  Try Free Analysis
                </Button>
              </Link>
              
              {/* Secondary CTA */}
              <Link to="/for-dentists">
                <Button
                  variant="outline"
                  size="lg"
                  iconName="Stethoscope"
                  iconPosition="left"
                  className="w-full sm:w-auto"
                >
                  See Clinical Demo
                </Button>
              </Link>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6 pt-4 text-sm font-medium text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <Icon name="Shield" size={18} className="text-green-500" />
                HIPAA Compliant
              </div>
              <div className="flex items-center gap-2">
                <Icon name="Award" size={18} className="text-purple-500" />
                FDA Registered
              </div>
              <div className="flex items-center gap-2">
                <Icon name="Users" size={18} className="text-blue-500" />
                100k+ Analyses
              </div>
            </div>
          </div>

          {/* RIGHT CONTENT (DEMO VISUAL) */}
          <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-6 border border-slate-200 dark:border-slate-700">
              <div className="text-center mb-6">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Live AI Analysis</h3>
                <p className="text-xs text-slate-500">Real-time pathology detection</p>
              </div>

              {/* IMAGE CONTAINER */}
              <div className="relative aspect-video bg-slate-100 dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 group">
                
                {/* 1. IMAGE DISPLAY */}
                <img
                  key={currentImageIndex} // Key forces re-render for transition
                  src={demoImages[currentImageIndex].src}
                  alt={demoImages[currentImageIndex].alt}
                  className="w-full h-full object-cover transition-opacity duration-500"
                  onError={(e) => {
                    // Fallback in case local path is wrong
                    e.target.onerror = null; 
                    e.target.src = "https://via.placeholder.com/800x450/e2e8f0/475569?text=Image+Unavailable";
                  }}
                />

                {/* 2. SCANNING EFFECT */}
                {!isAnalyzing && (
                  <div className="absolute inset-0 bg-gradient-to-b from-blue-500/10 to-transparent pointer-events-none animate-[scan_3s_ease-in-out_infinite]" />
                )}

                {/* 3. LOADING OVERLAY */}
                {isAnalyzing && (
                  <div className="absolute inset-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center z-10 animate-in fade-in">
                    <div className="animate-spin mb-3 text-blue-600">
                      <Icon name="Loader" size={40} />
                    </div>
                    <span className="text-sm font-semibold text-blue-600 animate-pulse">
                      Processing Image...
                    </span>
                  </div>
                )}
              </div>

              {/* RESULT BOX */}
              <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-100 dark:border-slate-600 flex gap-3 items-start">
                <div className="mt-1">
                  <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center">
                    <Icon name="Brain" size={14} className="text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Diagnosis</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {demoImages[currentImageIndex].analysis}
                  </p>
                </div>
              </div>

              {/* CONTROLS */}
              <div className="flex items-center justify-between mt-6">
                <div className="flex gap-2">
                  {demoImages.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentImageIndex(idx)}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        idx === currentImageIndex ? 'w-8 bg-blue-600' : 'w-2 bg-slate-300 dark:bg-slate-600 hover:bg-blue-400'
                      }`}
                      aria-label={`View image ${idx + 1}`}
                    />
                  ))}
                </div>
                {/* Re-Analyze Button (Interactive Demo) */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleAnalysisDemo}
                  iconName="RotateCcw"
                  className="text-slate-500 hover:text-blue-600"
                >
                  Re-Analyze
                </Button>
              </div>
            </div>

            {/* FLOATING STATS */}
            <div className="absolute -top-4 -right-4 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 animate-bounce-slow hidden lg:block">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">98.7%</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Accuracy</div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* INLINE STYLE FOR SCAN ANIMATION */}
      <style>{`
        @keyframes scan {
          0% { transform: translateY(-100%); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateY(100%); opacity: 0; }
        }
      `}</style>
    </section>
  );
};

export default HeroSection;