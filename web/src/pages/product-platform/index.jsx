import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

// Layout & UI Components
import Header from '../../components/ui/Header';
import Footer from '../../components/ui/Footer'; 
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import LightRays from '../../components/backgrounds/LightRays';

// Page Sections
import TechOverviewSection from './components/TechOverviewSection';
import InteractiveDemo from './components/InteractiveDemo';
import CDSSSection from './components/CDSSSection';
import FeatureCards from './components/FeatureCards';
import ComparisonMatrix from './components/ComparisonMatrix';
import ResourcesSection from './components/ResourcesSection';
import CTASection from './components/CTASection';

const ProductPlatform = () => {
  // Scroll to top on mount
  useEffect(() => { 
    window.scrollTo(0, 0); 
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans selection:bg-blue-500/30">
      <Header />

      {/* --- HERO SECTION --- */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-28 overflow-hidden bg-slate-900">
        
        {/* Dynamic Background */}
        <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
          <LightRays
            className="absolute inset-0"
            raysOrigin="top-center"
            raysColor="#60a5fa" // Blue-400
            raysSpeed={1.5}
            lightSpread={120}
            rayLength={1.2}
            fadeDistance={1}
            saturation={1}
            followMouse
            mouseInfluence={0.1}
          />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-300 text-sm font-medium mb-8 backdrop-blur-sm animate-in fade-in slide-in-from-top-4 duration-700">
            <Icon name="Cpu" size={14} className="text-blue-400" />
            <span>AI-Powered Dental Intelligence v2.4</span>
          </div>

          {/* Heading */}
          <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight mb-6 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-100">
            Precision Diagnostics <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-teal-400">
              at the Speed of Sight
            </span>
          </h1>

          <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-200">
            The world's first YOLOv8-powered dental analysis platform. 
            Detect pathologies, generate reports, and educate patients in under 2 seconds.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
            <Link to="/serene-ai">
              <Button 
                className="bg-blue-600 hover:bg-blue-500 text-white border-none px-8 py-4 text-lg shadow-[0_0_30px_rgba(37,99,235,0.4)] hover:shadow-[0_0_50px_rgba(37,99,235,0.6)]"
                iconName="Camera"
                iconPosition="left"
              >
                Start Free Analysis
              </Button>
            </Link>
            <Link to="/for-dentists">
              <Button 
                variant="outline" 
                className="text-white border-white/20 hover:bg-white/10 px-8 py-4 text-lg backdrop-blur-md"
                iconName="Play"
                iconPosition="left"
              >
                Watch Demo
              </Button>
            </Link>
          </div>

          {/* 3D Dashboard Mockup Effect */}
          <div className="relative mx-auto max-w-5xl mt-12 animate-in fade-in zoom-in-50 duration-1000 delay-500 perspective-[2000px]">
            {/* The Floating Interface */}
            <div className="relative rounded-2xl bg-slate-900 border border-slate-700/50 shadow-2xl overflow-hidden transform rotate-x-[15deg] hover:rotate-x-0 transition-transform duration-700 ease-out group">
              
              {/* Fake Browser Toolbar */}
              <div className="bg-slate-800/80 backdrop-blur-md px-4 py-3 border-b border-slate-700 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>
                <div className="mx-auto text-xs text-slate-500 font-mono flex items-center gap-1">
                  <Icon name="Lock" size={10} /> serene-platform.app
                </div>
              </div>

              {/* Interface Content Placeholder */}
              <div className="relative aspect-video bg-slate-900">
                {/* Simulated App UI */}
                <div className="absolute inset-0 flex">
                  {/* Sidebar */}
                  <div className="w-16 border-r border-slate-800 bg-slate-900/50 hidden sm:flex flex-col items-center py-6 gap-6">
                    <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-500 flex items-center justify-center"><Icon name="LayoutGrid" size={18} /></div>
                    <div className="w-8 h-8 rounded-lg hover:bg-slate-800 text-slate-500 flex items-center justify-center"><Icon name="Users" size={18} /></div>
                    <div className="w-8 h-8 rounded-lg hover:bg-slate-800 text-slate-500 flex items-center justify-center"><Icon name="Settings" size={18} /></div>
                  </div>
                  {/* Main Area */}
                  <div className="flex-1 p-6 flex items-center justify-center relative overflow-hidden group">
                    {/* Background Image simulating app content */}
                    <img 
                      src="/assets/imagesTesting/test1.png" 
                      alt="Platform Interface" 
                      className="absolute inset-0 w-full h-full object-cover opacity-50 grayscale group-hover:grayscale-0 group-hover:opacity-80 transition-all duration-700"
                    />
                    
                    <div className="relative z-10 bg-slate-900/80 backdrop-blur-xl border border-slate-700 p-6 rounded-2xl text-center">
                      <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-600/30">
                        <Icon name="Play" size={32} className="text-white ml-1" />
                      </div>
                      <h3 className="text-white font-bold">Interactive Platform Tour</h3>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating Overlay Card */}
              <div className="absolute -bottom-6 -right-6 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 hidden md:block animate-bounce-slow">
                <div className="flex gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-blue-500">98.7%</div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider">Accuracy</div>
                  </div>
                  <div className="w-px bg-slate-200 dark:bg-slate-700" />
                  <div>
                    <div className="text-2xl font-bold text-green-500">&lt; 2s</div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider">Speed</div>
                  </div>
                </div>
              </div>

            </div>
            
            {/* Glow Underneath */}
            <div className="absolute -inset-4 bg-blue-600/20 blur-[100px] -z-10" />
          </div>

        </div>
      </section>

      {/* --- MAIN CONTENT STACK --- */}
      <div className="relative z-10 bg-white dark:bg-slate-950">
        <TechOverviewSection />
        <InteractiveDemo />
        <CDSSSection />
        <FeatureCards />
        <ComparisonMatrix />
        <ResourcesSection />
        <CTASection />
      </div>

      {/* --- FOOTER --- */}
      <Footer />
      
    </div>
  );
};

export default ProductPlatform;