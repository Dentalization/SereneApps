import React from 'react';

const ToothScanLoader = ({ text = "Analyzing Dental Structure..." }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8">
      
      {/* 3D Scanning Container */}
      <div className="relative w-32 h-32 flex items-center justify-center">
        
        {/* --- 1. The Orbiting Rings (3D Effect) --- */}
        <div className="absolute inset-0 rounded-full border border-slate-200 dark:border-slate-700 border-t-blue-500 dark:border-t-blue-400 animate-[spin_3s_linear_infinite]" />
        <div className="absolute inset-4 rounded-full border border-slate-100 dark:border-slate-800 border-b-purple-500 dark:border-b-purple-400 animate-[spin_4s_linear_infinite_reverse]" />
        <div className="absolute inset-8 rounded-full border-2 border-indigo-100 dark:border-indigo-900/30 animate-pulse" />

        {/* --- 2. The Realistic Molar Icon --- */}
        <div className="relative z-10 w-14 h-14">
          
          {/* Base Tooth (Ghost/Wireframe) */}
          <svg 
            viewBox="0 0 24 24" 
            fill="currentColor" 
            className="w-full h-full text-slate-200 dark:text-slate-700 absolute top-0 left-0"
          >
            {/* Anatomically Accurate Molar Path */}
            <path d="M19.31 7.5c-.77-2.3-2.92-3.5-5.31-3.5-1.5 0-2.8.6-3.8 1.6-.3.3-.8.3-1.1 0-1-1-2.3-1.6-3.8-1.6-2.39 0-4.54 1.2-5.31 3.5-.2.6-.2 1.3 0 1.9l1.5 6.8c.5 2.2 2.4 3.7 4.7 3.3 1.6-.3 2.9-1.5 3.3-3.1.2-.8 1.3-.8 1.5 0 .4 1.6 1.7 2.8 3.3 3.1 2.3.4 4.2-1.1 4.7-3.3l1.5-6.8c.2-.6.2-1.3 0-1.9z" />
          </svg>

          {/* Masked Scanned Tooth (Gradient Filled) */}
          <div className="absolute inset-0 overflow-hidden animate-scan-reveal">
             <svg 
              viewBox="0 0 24 24" 
              fill="url(#scanGradient)" 
              className="w-full h-full drop-shadow-[0_0_15px_rgba(99,102,241,0.6)]"
            >
              <defs>
                <linearGradient id="scanGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#60a5fa" /> {/* Blue-400 */}
                  <stop offset="100%" stopColor="#818cf8" /> {/* Indigo-400 */}
                </linearGradient>
              </defs>
              {/* Same Path for the fill layer */}
              <path d="M19.31 7.5c-.77-2.3-2.92-3.5-5.31-3.5-1.5 0-2.8.6-3.8 1.6-.3.3-.8.3-1.1 0-1-1-2.3-1.6-3.8-1.6-2.39 0-4.54 1.2-5.31 3.5-.2.6-.2 1.3 0 1.9l1.5 6.8c.5 2.2 2.4 3.7 4.7 3.3 1.6-.3 2.9-1.5 3.3-3.1.2-.8 1.3-.8 1.5 0 .4 1.6 1.7 2.8 3.3 3.1 2.3.4 4.2-1.1 4.7-3.3l1.5-6.8c.2-.6.2-1.3 0-1.9z" />
            </svg>
          </div>

          {/* --- 3. The Laser Scanner Beam --- */}
          <div className="absolute left-[-20%] right-[-20%] h-0.5 bg-blue-400 dark:bg-blue-300 shadow-[0_0_15px_rgba(96,165,250,1)] animate-scan-beam z-20 rounded-full opacity-90" />
        </div>

        {/* Grid Background Effect */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/graphy.png')] opacity-10 rounded-full animate-pulse"></div>
      </div>

      {/* --- 4. Loading Text --- */}
      <div className="mt-6 text-center space-y-2">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight animate-pulse">
          {text}
        </h3>
        <div className="flex items-center justify-center gap-1">
          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
          <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
          <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce" />
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500 font-mono uppercase tracking-widest">
          AI Model v2.4 Processing
        </p>
      </div>

      {/* --- 5. Inline CSS for the Scanner Animations --- */}
      <style>{`
        @keyframes scan-beam {
          0% { top: 15%; opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { top: 85%; opacity: 0; }
        }
        @keyframes scan-reveal {
          0% { clip-path: inset(0 0 100% 0); }
          50% { clip-path: inset(0 0 0 0); }
          100% { clip-path: inset(0 0 100% 0); }
        }
        .animate-scan-beam {
          animation: scan-beam 2.5s ease-in-out infinite;
        }
        .animate-scan-reveal {
          animation: scan-reveal 5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default ToothScanLoader;