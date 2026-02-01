import React from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const ResearchHero = () => {
  return (
    <section className="relative min-h-[100dvh] flex items-center justify-center bg-slate-900 overflow-hidden">
      
      {/* --- 1. Dynamic Background (Mesh Gradient) --- */}
      <div className="absolute inset-0 z-0">
        {/* Deep dark base */}
        <div className="absolute inset-0 bg-slate-950" />
        
        {/* Animated Orbs/Glows */}
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-primary/30 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[100px]" />
        
        {/* Grid Overlay for Tech Feel */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
      </div>

      {/* --- 2. Main Content --- */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-0">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          
          {/* LEFT: Copy & CTA */}
          <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-700 fade-in">
            <div className="inline-flex items-center space-x-2.5 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
              </span>
              <span className="text-sm font-medium text-white/90 tracking-wide">Scientific Validation</span>
            </div>
            
            <h1 className="text-5xl lg:text-7xl font-bold text-white leading-tight tracking-tight">
              Evidence-Based <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-accent">
                Dental Intelligence
              </span>
            </h1>
            
            <p className="text-lg lg:text-xl text-slate-300 leading-relaxed max-w-xl">
              We don't just build algorithms; we validate them. Explore the peer-reviewed studies and clinical trials that power Serene AI's diagnostic engine.
            </p>

            {/* Key Metrics Row */}
            <div className="grid grid-cols-3 gap-6 py-4 border-y border-white/10">
              <div>
                <div className="text-3xl font-bold text-white mb-1">96.2%</div>
                <div className="text-xs text-slate-400 uppercase tracking-wider">Caries Accuracy</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-white mb-1">15+</div>
                <div className="text-xs text-slate-400 uppercase tracking-wider">Published Papers</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-white mb-1">10k+</div>
                <div className="text-xs text-slate-400 uppercase tracking-wider">Cases Validated</div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Button 
                className="bg-white text-slate-900 hover:bg-slate-100 shadow-[0_0_20px_rgba(255,255,255,0.3)] border-none"
                iconName="Download"
                iconPosition="left"
              >
                Download Research Brief
              </Button>
              <Button 
                variant="outline" 
                className="border-white/30 text-white hover:bg-white/10 hover:border-white"
                iconName="ExternalLink"
                iconPosition="right"
              >
                Explore Publications
              </Button>
            </div>
          </div>

          {/* RIGHT: Glassmorphic Visualization Card */}
          <div className="relative animate-in slide-in-from-right-8 duration-1000 fade-in delay-200 hidden lg:block">
            {/* Decorative Elements around card */}
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-accent/30 rounded-full blur-2xl"></div>
            
            <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl ring-1 ring-white/10">
              
              {/* Card Header */}
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-bold text-white">Clinical Performance</h3>
                  <p className="text-sm text-slate-400">Multi-center Validation Study (n=2,847)</p>
                </div>
                <div className="h-10 w-10 bg-slate-800 rounded-full flex items-center justify-center border border-white/10">
                  <Icon name="Activity" size={20} className="text-accent" />
                </div>
              </div>

              {/* Progress Bars */}
              <div className="space-y-6">
                {/* Metric 1 */}
                <div className="group">
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-slate-300 text-sm font-medium">Caries Detection (Sensitivity)</span>
                    <span className="text-white font-bold text-lg">96.2%</span>
                  </div>
                  <div className="w-full bg-slate-700/50 rounded-full h-2.5 overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-500 to-accent h-2.5 rounded-full w-[96.2%] shadow-[0_0_10px_rgba(139,92,246,0.5)]"></div>
                  </div>
                </div>

                {/* Metric 2 */}
                <div className="group">
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-slate-300 text-sm font-medium">Periodontal Staging</span>
                    <span className="text-white font-bold text-lg">94.0%</span>
                  </div>
                  <div className="w-full bg-slate-700/50 rounded-full h-2.5 overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-500 to-accent h-2.5 rounded-full w-[94%]"></div>
                  </div>
                </div>

                {/* Metric 3 */}
                <div className="group">
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-slate-300 text-sm font-medium">Pathology Screening</span>
                    <span className="text-white font-bold text-lg">91.5%</span>
                  </div>
                  <div className="w-full bg-slate-700/50 rounded-full h-2.5 overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-500 to-accent h-2.5 rounded-full w-[91.5%]"></div>
                  </div>
                </div>
              </div>

              {/* Source Footer */}
              <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-slate-400">Peer-Reviewed • J. Dent. Res 2023</span>
                </div>
                <span className="text-xs font-mono text-accent/80">p &lt; 0.001</span>
              </div>
            </div>

            {/* Floating Badge */}
            <div className="absolute -bottom-6 -left-6 bg-slate-800 border border-white/10 p-4 rounded-xl shadow-xl flex items-center gap-3 backdrop-blur-md">
              <div className="bg-green-500/20 p-2 rounded-lg">
                <Icon name="CheckCircle" size={24} className="text-green-400" />
              </div>
              <div>
                <p className="text-white font-bold text-sm">FDA Cleared</p>
                <p className="text-slate-400 text-xs">Class II Software</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default ResearchHero;