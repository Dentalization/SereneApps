import React from 'react';

const ToothScanLoader = ({ text = "Analyzing Dental Structure..." }) => {
  // Styles to apply the tooth image as a mask for color/gradient filling
  const toothMaskStyle = {
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
        
        {/* --- 1. The Orbiting Rings (SUPER SLOW = SERENE) --- */}
        {/* Outer Ring: 12s duration */}
        <div className="absolute inset-0 rounded-full border border-slate-200 dark:border-slate-800 border-t-blue-500 dark:border-t-blue-400 animate-[spin_12s_linear_infinite]" />
        
        {/* Middle Ring: 16s duration (Reverse) */}
        <div className="absolute inset-4 rounded-full border border-slate-100 dark:border-slate-900 border-b-purple-500 dark:border-b-purple-400 animate-[spin_16s_linear_infinite_reverse]" />
        
        {/* Inner Ring (Pulse) */}
        <div className="absolute inset-8 rounded-full border-2 border-indigo-100 dark:border-indigo-900/30 animate-pulse" />

        {/* --- 2. The Tooth Image (Using Masking) --- */}
        <div className="relative z-10 w-14 h-14">
          
          {/* Layer A: The "Ghost" Tooth (Base Layer) */}
          <div 
            className="w-full h-full bg-slate-300 dark:bg-slate-700 absolute top-0 left-0"
            style={toothMaskStyle}
          />

          {/* Layer B: The "Scanned" Tooth (Active Layer) */}
          <div className="absolute inset-0 overflow-hidden animate-scan-reveal">
             <div 
               className="w-full h-full bg-gradient-to-b from-blue-500 to-purple-600 drop-shadow-[0_0_15px_rgba(99,102,241,0.6)]"
               style={toothMaskStyle}
             />
          </div>

          {/* --- 3. The Laser Scanner Beam (FAST = ACTIVE SCANNING) --- */}
          <div className="absolute left-[-10%] right-[-10%] h-0.5 bg-blue-400 dark:bg-blue-300 shadow-[0_0_15px_rgba(96,165,250,1)] animate-scan-beam z-20 rounded-full opacity-90" />
        </div>

        {/* Grid Background Effect */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/graphy.png')] opacity-10 dark:opacity-5 rounded-full animate-pulse"></div>
      </div>

      {/* --- 4. Loading Text --- */}
      <div className="mt-6 text-center space-y-2">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight animate-pulse">
          {text}
        </h3>
        <div className="flex items-center justify-center gap-1">
          {/* Dots animation */}
          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
          <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
          <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce" />
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500 font-mono uppercase tracking-widest">
          AI Model v2.4 Processing
        </p>
      </div>

      {/* --- 5. Inline CSS for Animations --- */}
      <style>{`
        @keyframes scan-beam {
          0% { top: 5%; opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { top: 95%; opacity: 0; }
        }
        @keyframes scan-reveal {
          0% { clip-path: inset(0 0 100% 0); }
          50% { clip-path: inset(0 0 0 0); }
          100% { clip-path: inset(0 0 100% 0); }
        }
        
        /* SCANNER SPEED CONTROLS:
           - Beam: 0.7s (Fast scanning motion)
           - Reveal: 3s (Fills up moderately fast)
        */
        .animate-scan-beam {
          animation: scan-beam 0.7s ease-in-out infinite;
        }
        
        .animate-scan-reveal {
          animation: scan-reveal 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default ToothScanLoader;