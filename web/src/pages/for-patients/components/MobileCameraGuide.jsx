import React, { useState } from 'react';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';

const MobileCameraGuide = () => {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      id: 1,
      title: 'Lighting & Environment',
      desc: 'Find a spot with bright, natural light. Avoid harsh shadows or yellow lamps for the most accurate detection.',
      icon: 'Sun',
      img: 'https://images.unsplash.com/photo-1598256989800-fe5f95da9787?auto=format&fit=crop&w=400&q=80' 
    },
    {
      id: 2,
      title: 'Angle & Distance',
      desc: 'Hold your phone about 6 inches away. Ensure the camera is level with your mouth, not looking up or down.',
      icon: 'Maximize',
      img: 'https://images.unsplash.com/photo-1616391182219-e080b4d1043a?auto=format&fit=crop&w=400&q=80'
    },
    {
      id: 3,
      title: 'Smile Wide',
      desc: 'Retract your lips gently to show your gums. The AI needs to see the gumline to check for gingivitis.',
      icon: 'Smile',
      img: 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=400&q=80'
    }
  ];

  const mistakes = [
    { text: 'Blurry / Out of Focus', icon: 'AlertTriangle', color: 'red' },
    { text: 'Too Dark / Shadows', icon: 'Moon', color: 'amber' },
    { text: 'Mouth Not Open Enough', icon: 'XCircle', color: 'orange' }
  ];

  return (
    <section className="py-24 bg-slate-50 dark:bg-slate-950 overflow-hidden relative">
      
      {/* Background Decor */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/graphy.png')] opacity-[0.03]" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-bold uppercase tracking-wider mb-6">
            <Icon name="Camera" size={14} />
            <span>Scan Tutorial</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6">
            How to Take the <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              Perfect Scan
            </span>
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            High-quality photos lead to high-accuracy results. Follow these 3 simple steps 
            to get a clinical-grade analysis from home.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center mb-20">
          
          {/* Left: Interactive Stepper */}
          <div className="space-y-8">
             {steps.map((step, index) => (
               <div 
                 key={index}
                 onClick={() => setActiveStep(index)}
                 className={`relative pl-8 border-l-2 cursor-pointer transition-all duration-300 ${
                   activeStep === index 
                     ? 'border-blue-600 opacity-100' 
                     : 'border-slate-200 dark:border-slate-800 opacity-50 hover:opacity-80'
                 }`}
               >
                 <span className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 ${
                   activeStep === index ? 'bg-blue-600 border-blue-600' : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700'
                 }`} />
                 
                 <h3 className={`text-xl font-bold mb-2 ${activeStep === index ? 'text-blue-600 dark:text-blue-400' : 'text-slate-900 dark:text-white'}`}>
                   Step {index + 1}: {step.title}
                 </h3>
                 <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">
                   {step.desc}
                 </p>
               </div>
             ))}

             <div className="pt-8">
               <Button size="lg" iconName="Camera" className="w-full sm:w-auto shadow-xl">
                 Launch Camera
               </Button>
             </div>
          </div>

          {/* Right: Phone Simulation */}
          <div className="relative flex justify-center">
            
            {/* Phone Frame */}
            <div className="relative w-[300px] h-[600px] bg-slate-900 rounded-[3rem] p-3 shadow-2xl border-[4px] border-slate-800">
              <div className="w-full h-full bg-slate-950 rounded-[2.5rem] overflow-hidden relative">
                
                {/* Image Display */}
                <div className="absolute inset-0 transition-opacity duration-500">
                   <img 
                     src={steps[activeStep].img} 
                     alt="Step Guide" 
                     className="w-full h-full object-cover opacity-80"
                   />
                </div>

                {/* Overlay UI */}
                <div className="absolute inset-0 flex flex-col justify-between p-6">
                  <div className="text-center pt-8">
                    <span className="bg-black/50 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-bold">
                      {steps[activeStep].title}
                    </span>
                  </div>
                  
                  {/* Focus Frame Animation */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-white/50 rounded-2xl flex items-center justify-center">
                    <div className="w-4 h-4 bg-white/80 rounded-full animate-ping" />
                  </div>

                  <div className="text-center pb-8">
                    <div className="w-16 h-16 rounded-full border-4 border-white mx-auto flex items-center justify-center">
                      <div className="w-12 h-12 bg-white rounded-full" />
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Floating Mistake Cards */}
            <div className="absolute -right-4 top-20 space-y-3 hidden lg:block">
              <div className="bg-white dark:bg-slate-800 p-3 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 w-48">
                <div className="text-[10px] font-bold text-slate-400 uppercase mb-2">Avoid This</div>
                {mistakes.map((m, i) => (
                  <div key={i} className="flex items-center gap-2 mb-1 last:mb-0">
                    <Icon name={m.icon} size={12} className={`text-${m.color}-500`} />
                    <span className="text-xs text-slate-600 dark:text-slate-300">{m.text}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
};

export default MobileCameraGuide;