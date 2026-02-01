import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';

const HeroSection = () => {
  return (
    <section className="relative -mt-4 pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden bg-slate-50 dark:bg-slate-950">
      
      {/* Dynamic Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-pink-500/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          
          {/* Content Column */}
          <div className="text-center lg:text-left space-y-8 animate-in slide-in-from-bottom-8 duration-1000">
            
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400 text-xs font-bold uppercase tracking-wider mx-auto lg:mx-0">
              <Icon name="Smartphone" size={14} />
              <span>Personal Dental Assistant</span>
            </div>

            {/* Headline */}
            <h1 className="text-5xl lg:text-7xl font-extrabold text-slate-900 dark:text-white leading-[1.1] tracking-tight">
              Take Control of Your <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-rose-600">
                Dental Health
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              No appointments. No waiting rooms. Just instant, AI-powered insights about your teeth from the comfort of your home.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link to="/serene-ai">
                <Button 
                  size="xl" 
                  className="bg-pink-600 hover:bg-pink-500 text-white border-none shadow-lg shadow-pink-500/30 px-8"
                  iconName="Camera"
                  iconPosition="left"
                >
                  Start Free Analysis
                </Button>
              </Link>
              <Link to="#how-it-works">
                <Button 
                  variant="outline" 
                  size="xl"
                  className="border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  iconName="Play"
                  iconPosition="left"
                >
                  Watch Demo
                </Button>
              </Link>
            </div>

            {/* Trust Badges */}
            <div className="pt-6 flex flex-wrap justify-center lg:justify-start gap-6 text-sm font-medium text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <Icon name="ShieldCheck" size={18} className="text-green-500" />
                <span>HIPAA Compliant</span>
              </div>
              <div className="flex items-center gap-2">
                <Icon name="Lock" size={18} className="text-blue-500" />
                <span>100% Private</span>
              </div>
              <div className="flex items-center gap-2">
                <Icon name="Activity" size={18} className="text-pink-500" />
                <span>Clinically Validated</span>
              </div>
            </div>
          </div>

          {/* Visual Column */}
          <div className="relative mx-auto w-full max-w-[500px] lg:max-w-none perspective-[1000px]">
            
            {/* Phone Mockup Container */}
            <div className="relative z-10 bg-white dark:bg-slate-900 rounded-[2.5rem] border-8 border-slate-900 dark:border-slate-800 shadow-2xl overflow-hidden transform rotate-y-[-5deg] hover:rotate-y-0 transition-transform duration-700">
              
              {/* Fake Phone UI Header */}
              <div className="bg-slate-50 dark:bg-slate-800 px-6 py-4 flex justify-between items-center border-b border-slate-100 dark:border-slate-700">
                <div className="w-16 h-1 bg-slate-300 dark:bg-slate-600 rounded-full" />
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-slate-400" />
                  <div className="w-2 h-2 rounded-full bg-slate-400" />
                </div>
              </div>

              {/* Phone Content (Simulated App) */}
              <div className="aspect-[9/16] bg-slate-100 dark:bg-slate-950 relative overflow-hidden group">
                {/* Background Image (Smiling Person / Selfie) */}
                <img 
                  src="https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=800&q=80" 
                  alt="App Scan Interface" 
                  className="absolute inset-0 w-full h-full object-cover opacity-90"
                />
                
                {/* Overlay UI: Scanning Frame */}
                <div className="absolute inset-8 border-2 border-white/50 rounded-xl flex flex-col justify-between p-4">
                  <div className="bg-black/40 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-full self-center">
                    Align teeth in frame
                  </div>
                  <div className="w-full h-1 bg-white/30 rounded-full overflow-hidden">
                    <div className="h-full bg-green-400 w-[70%] animate-[width_2s_ease-in-out_infinite]" />
                  </div>
                </div>

                {/* Pop-up Card */}
                <div className="absolute bottom-6 left-6 right-6 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-4 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 animate-in slide-in-from-bottom-4 delay-500 duration-700">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600">
                      <Icon name="Check" size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">Scan Complete</h4>
                      <p className="text-xs text-slate-500">No cavities detected.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Decorative Floating Elements */}
            <div className="absolute -top-12 -right-12 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-xl animate-bounce-slow hidden lg:block">
              <div className="flex items-center gap-2 text-pink-600 font-bold">
                <Icon name="Heart" size={20} className="fill-current" />
                <span>Gum Health: 98%</span>
              </div>
            </div>

            <div className="absolute top-1/3 -left-16 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-xl animate-pulse hidden lg:block">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">AI Analysis Active</span>
              </div>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
};

export default HeroSection;