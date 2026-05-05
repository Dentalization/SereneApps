import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

const ToothScanLoader = ({ text }) => {
  const { t } = useLanguage();
  const loadingText = text || t('shared.loader.dentalScan', { defaultValue: 'Analyzing Dental Structure...' });

  // Style untuk menggunakan tooth.png sebagai masker (cetakan)
  const maskStyle = {
    maskImage: 'url(/tooth.png)',
    WebkitMaskImage: 'url(/tooth.png)',
    maskSize: 'contain',
    WebkitMaskSize: 'contain',
    maskRepeat: 'no-repeat',
    WebkitMaskRepeat: 'no-repeat',
    maskPosition: 'center',
    WebkitMaskPosition: 'center',
  };

  return (
    <div className="flex flex-col items-center justify-center p-8">

      {/* 3D Scanning Container */}
      <div className="relative w-32 h-32 flex items-center justify-center">

        {/* --- 1. Orbiting Rings (Efek Sci-Fi) --- */}
        {/* Lingkaran Luar (Lambat) */}
        <div className="absolute inset-0 rounded-full border border-slate-200 dark:border-slate-800 border-t-blue-500 dark:border-t-blue-400 animate-[spin_10s_linear_infinite]" />

        {/* Lingkaran Tengah (Arah berlawanan) */}
        <div className="absolute inset-4 rounded-full border border-slate-100 dark:border-slate-900 border-b-purple-500 dark:border-b-purple-400 animate-[spin_14s_linear_infinite_reverse]" />

        {/* Lingkaran Dalam (Berdenyut) */}
        <div className="absolute inset-8 rounded-full border-2 border-indigo-100 dark:border-indigo-900/30 animate-pulse" />

        {/* --- 2. The Tooth (Menggunakan PNG Anda) --- */}
        <div className="relative z-10 w-16 h-16">

          {/* Layer A: Ghost Tooth (Gigi dasar abu-abu) */}
          <div
            className="absolute inset-0 w-full h-full bg-slate-300 dark:bg-slate-700 opacity-50"
            style={maskStyle}
          />

          {/* Layer B: Scanned Tooth (Gigi berwarna/gradient) */}
          {/* Layer ini akan muncul perlahan sesuai animasi scan */}
          <div className="absolute inset-0 w-full h-full animate-scan-fill overflow-hidden">
            <div
              className="w-full h-full bg-gradient-to-b from-blue-500 to-purple-600 drop-shadow-[0_0_15px_rgba(99,102,241,0.6)]"
              style={maskStyle}
            />
          </div>

          {/* --- 3. Laser Scanner Beam (Garis Laser) --- */}
          <div className="absolute left-[-20%] right-[-20%] h-0.5 bg-blue-400 dark:bg-blue-300 shadow-[0_0_15px_rgba(96,165,250,1)] animate-scan-beam z-20 rounded-full opacity-90" />
        </div>

        {/* Background Grid Effect */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/graphy.png')] opacity-10 dark:opacity-5 rounded-full animate-pulse"></div>
      </div>

      {/* --- 4. Loading Text --- */}
      <div className="mt-8 text-center space-y-2">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight animate-pulse">
          {loadingText}
        </h3>
        <div className="flex items-center justify-center gap-1">
          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
          <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
          <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce" />
        </div>
        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono uppercase tracking-widest">
          {t('shared.loader.modelProcessing', { defaultValue: 'AI Model v2.4 Processing' })}
        </p>
      </div>

      {/* --- 5. Custom Animations CSS --- */}
      <style>{`
        /* Animasi Garis Laser (Naik Turun) */
        @keyframes scan-beam {
          0% { top: 0%; opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        
        /* Animasi Pengisian Warna (Clip Path) */
        @keyframes scan-fill {
          0% { clip-path: inset(0 0 100% 0); }
          50% { clip-path: inset(0 0 0 0); }     /* Penuh di tengah durasi */
          100% { clip-path: inset(0 0 0 0); }    /* Tetap penuh sebentar */
        }
        
        .animate-scan-beam {
          animation: scan-beam 2s ease-in-out infinite;
        }
        
        .animate-scan-fill {
          animation: scan-fill 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default ToothScanLoader;
