import React from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const HeroSection = () => {
  return (
    <section className="relative pt-32 pb-24 lg:pt-40 lg:pb-32 overflow-hidden bg-slate-50 dark:bg-slate-950">
      
      {/* Background Decor */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/graphy.png')] opacity-[0.03]" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-teal-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
          <Icon name="Stethoscope" size={16} />
          <span>For Dental Professionals</span>
        </div>
        
        {/* Heading */}
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-slate-900 dark:text-white mb-6 tracking-tight leading-tight animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-100">
          Supercharge Your Practice <br />
          with <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-500">Intelligent AI</span>
        </h1>
        
        <p className="text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto mb-10 leading-relaxed animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-200">
          Streamline workflows, reduce diagnostic errors, and increase case acceptance with the world's most advanced dental AI assistant.
        </p>
        
        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
          <Button 
            size="lg" 
            className="bg-blue-600 hover:bg-blue-500 text-white border-none shadow-lg shadow-blue-500/30 px-8 py-4 text-lg"
            iconName="Calendar"
            iconPosition="left"
          >
            Schedule Demo
          </Button>
          <Button 
            variant="outline" 
            size="lg"
            className="border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 px-8 py-4 text-lg"
            iconName="Play"
            iconPosition="left"
          >
            Watch Overview
          </Button>
        </div>

        {/* 3D Dashboard Preview */}
        <div className="relative mx-auto max-w-6xl perspective-[2000px] group">
          
          {/* Main Interface Card */}
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden transform rotate-x-[10deg] group-hover:rotate-x-0 transition-transform duration-700 ease-out">
            
            {/* Toolbar */}
            <div className="bg-slate-50 dark:bg-slate-950 px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
                  <div className="w-3 h-3 rounded-full bg-green-400/80" />
                </div>
              </div>
              <div className="flex items-center gap-2 bg-slate-200 dark:bg-slate-800 px-3 py-1 rounded text-xs text-slate-500 font-mono">
                <Icon name="Lock" size={10} /> secure-portal.serene.ai
              </div>
              <div className="w-16" /> {/* Spacer */}
            </div>
            
            {/* Dashboard Content */}
            <div className="p-6 lg:p-8 bg-slate-50/50 dark:bg-slate-900/50 grid lg:grid-cols-3 gap-6 text-left">
              
              {/* Left Column: Patient List */}
              <div className="hidden lg:block space-y-3">
                <div className="flex items-center justify-between text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                  <span>Today's Schedule</span>
                  <Icon name="MoreHorizontal" size={16} />
                </div>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                      <Icon name="User" size={16} />
                    </div>
                    <div>
                      <div className="h-2 w-24 bg-slate-200 dark:bg-slate-700 rounded mb-1.5" />
                      <div className="h-1.5 w-16 bg-slate-100 dark:bg-slate-800 rounded" />
                    </div>
                  </div>
                ))}
              </div>

              {/* Middle & Right: Active Analysis */}
              <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-1 shadow-sm">
                <div className="relative aspect-video bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center group-hover:shadow-inner transition-shadow">
                  {/* Simulated X-Ray */}
                  <div className="absolute inset-0 bg-[url('/assets/imagesTesting/test3.png')] bg-cover bg-center opacity-80" />
                  
                  {/* Scanning Overlay */}
                  <div className="absolute top-0 left-0 w-full h-[2px] bg-teal-400 shadow-[0_0_15px_rgba(45,212,191,1)] animate-[scan_2.5s_ease-in-out_infinite]" />
                  
                  {/* AI Detection Box */}
                  <div className="absolute top-1/3 left-1/3 w-24 h-24 border-2 border-red-500 rounded animate-pulse bg-red-500/10 flex items-start justify-end p-1">
                    <span className="text-[10px] font-bold bg-red-500 text-white px-1.5 rounded">Caries (98%)</span>
                  </div>
                </div>

                <div className="p-4 grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600">
                      <Icon name="CheckCircle" size={20} />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">Analysis Complete</div>
                      <div className="text-xs text-slate-500">2.1 seconds</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600">
                      <Icon name="FileText" size={20} />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">Report Generated</div>
                      <div className="text-xs text-slate-500">Ready to review</div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Floating Stats Bar */}
          <div className="absolute -bottom-8 left-4 right-4 lg:left-20 lg:right-20">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-6 lg:p-8 flex flex-wrap justify-around gap-6 items-center transform translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
              {[
                { label: 'Analyses Processed', value: '50K+', color: 'text-blue-600' },
                { label: 'Practices Onboarded', value: '2,500+', color: 'text-purple-600' },
                { label: 'Diagnostic Accuracy', value: '94.7%', color: 'text-green-600' },
                { label: 'Avg. Time Saved', value: '30%', color: 'text-teal-600' },
              ].map((stat, idx) => (
                <div key={idx} className="text-center min-w-[120px]">
                  <div className={`text-3xl font-extrabold mb-1 ${stat.color}`}>{stat.value}</div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
      
      {/* Animation Style */}
      <style>{`
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </section>
  );
};

export default HeroSection;