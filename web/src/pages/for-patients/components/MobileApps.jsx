import React from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const MobileApps = () => {
  const features = [
    {
      icon: 'Camera',
      title: ' AI-Powered Scan',
      description: 'Snap a photo of your teeth. Our computer vision analyzes it for caries and gum health in seconds.',
      color: 'blue'
    },
    {
      icon: 'MessageSquare',
      title: 'Instant Diagnosis',
      description: 'Receive an immediate preliminary report and severity score before visiting a clinic.',
      color: 'purple'
    },
    {
      icon: 'Calendar',
      title: 'One-Tap Booking',
      description: 'Find nearby partner dentists and schedule emergency or routine visits instantly.',
      color: 'green'
    },
    {
      icon: 'FileText',
      title: 'Digital Health Passport',
      description: 'Your entire dental history, X-rays, and treatment plans in one secure place.',
      color: 'orange'
    }
  ];

  return (
    <section className="py-24 bg-white dark:bg-slate-950 overflow-hidden relative">
      
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          
          {/* Left: Content */}
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold uppercase tracking-wider mb-6">
              <Icon name="Smartphone" size={14} />
              <span>Mobile Ecosystem</span>
            </div>
            
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6 tracking-tight leading-tight">
              Professional Dental Care <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                In Your Pocket
              </span>
            </h2>
            
            <p className="text-lg text-slate-600 dark:text-slate-400 mb-10 leading-relaxed max-w-lg mx-auto lg:mx-0">
              Don't wait for your next appointment to know your status. Download the Serene AI app to track your oral hygiene score and get instant advice 24/7.
            </p>

            <div className="grid sm:grid-cols-2 gap-6 mb-10 text-left">
              {features.map((feature, index) => (
                <div key={index} className="flex gap-4 group">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-${feature.color}-50 dark:bg-${feature.color}-900/20 text-${feature.color}-600 group-hover:scale-110 transition-transform`}>
                    <Icon name={feature.icon} size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-1">{feature.title}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button 
                className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 px-6 py-3 h-auto rounded-xl flex items-center gap-3 shadow-xl"
              >
                <Icon name="Smartphone" size={24} />
                <div className="text-left leading-none">
                  <div className="text-[10px] uppercase font-medium opacity-80">Download on the</div>
                  <div className="text-base font-bold">App Store</div>
                </div>
              </Button>
              <Button 
                className="bg-slate-800 dark:bg-slate-800 text-white hover:bg-slate-700 px-6 py-3 h-auto rounded-xl flex items-center gap-3 shadow-xl"
              >
                <Icon name="Play" size={24} />
                <div className="text-left leading-none">
                  <div className="text-[10px] uppercase font-medium opacity-80">Get it on</div>
                  <div className="text-base font-bold">Google Play</div>
                </div>
              </Button>
            </div>
            
            <div className="mt-8 flex items-center justify-center lg:justify-start gap-6 text-xs font-medium text-slate-500">
              <div className="flex items-center gap-1">
                <Icon name="Star" size={12} className="text-yellow-400 fill-current" />
                <span className="text-slate-900 dark:text-white font-bold">4.9/5</span> Rating
              </div>
              <div className="w-1 h-1 bg-slate-300 rounded-full" />
              <div>50k+ Downloads</div>
            </div>
          </div>

          {/* Right: 3D Phone Mockup */}
          <div className="relative perspective-[1000px] flex justify-center lg:justify-end">
            
            {/* Phone Container */}
            <div className="relative z-10 w-[300px] h-[600px] bg-slate-900 rounded-[3rem] p-2 shadow-2xl transform rotate-y-[-12deg] rotate-x-[5deg] hover:rotate-y-0 hover:rotate-x-0 transition-transform duration-700 ease-out border-[6px] border-slate-800">
              
              {/* Screen Area */}
              <div className="w-full h-full bg-slate-50 dark:bg-slate-950 rounded-[2.5rem] overflow-hidden relative">
                
                {/* Status Bar */}
                <div className="absolute top-0 w-full h-8 px-6 flex justify-between items-end text-[10px] font-bold text-slate-900 dark:text-white z-20">
                  <span>9:41</span>
                  <div className="flex gap-1">
                    <Icon name="Wifi" size={10} />
                    <Icon name="Battery" size={10} />
                  </div>
                </div>

                {/* App UI: Home */}
                <div className="pt-10 px-5 pb-6 h-full flex flex-col">
                  
                  {/* Header */}
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <div className="text-xs text-slate-500">Good Morning,</div>
                      <div className="text-lg font-bold text-slate-900 dark:text-white">Sarah</div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 p-0.5">
                      <div className="w-full h-full bg-white dark:bg-slate-900 rounded-full flex items-center justify-center">
                        <Icon name="User" size={14} className="text-slate-500" />
                      </div>
                    </div>
                  </div>

                  {/* Health Card */}
                  <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl p-5 text-white shadow-lg shadow-blue-500/30 mb-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                      <Icon name="Activity" size={80} />
                    </div>
                    <div className="relative z-10">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <div className="text-xs text-blue-100 opacity-80 mb-1">Oral Health Score</div>
                          <div className="text-4xl font-bold">92<span className="text-lg opacity-60">/100</span></div>
                        </div>
                        <div className="bg-white/20 backdrop-blur-sm p-1.5 rounded-lg">
                          <Icon name="TrendingUp" size={16} />
                        </div>
                      </div>
                      <div className="text-xs bg-white/10 inline-block px-2 py-1 rounded">
                        +4% since last week
                      </div>
                    </div>
                  </div>

                  {/* Action Grid */}
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center gap-2 group cursor-pointer hover:border-blue-500 transition-colors">
                      <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 flex items-center justify-center">
                        <Icon name="Camera" size={20} />
                      </div>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Scan Now</span>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center gap-2 group cursor-pointer hover:border-purple-500 transition-colors">
                      <div className="w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-900/20 text-purple-600 flex items-center justify-center">
                        <Icon name="MessageCircle" size={20} />
                      </div>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Ask AI</span>
                    </div>
                  </div>

                  {/* Recent Activity List */}
                  <div className="flex-1">
                    <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Recent</h5>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm">
                        <div className="w-8 h-8 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
                          <Icon name="Check" size={14} />
                        </div>
                        <div className="flex-1">
                          <div className="text-xs font-bold text-slate-800 dark:text-white">Analysis Complete</div>
                          <div className="text-[10px] text-slate-400">2 hours ago</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm">
                        <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                          <Icon name="Bell" size={14} />
                        </div>
                        <div className="flex-1">
                          <div className="text-xs font-bold text-slate-800 dark:text-white">Check-up Due</div>
                          <div className="text-[10px] text-slate-400">Tomorrow, 10:00 AM</div>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>

            {/* Floating Notification Card */}
            <div className="absolute top-20 -left-12 z-20 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 animate-bounce-slow">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white shadow-lg shadow-green-500/30">
                  <Icon name="CheckCircle" size={20} />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase">Analysis Result</div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">Gums Healthy</div>
                </div>
              </div>
            </div>

            {/* Floating Chat Bubble */}
            <div className="absolute bottom-40 -right-8 z-20 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white">
                  <Icon name="Brain" size={16} />
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-300 max-w-[120px]">
                  "I detected mild staining on the lower incisor..."
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
};

export default MobileApps;