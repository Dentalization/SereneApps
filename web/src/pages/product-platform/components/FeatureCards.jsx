import React from 'react';
import Icon from '../../../components/AppIcon';

const FeatureCards = () => {
  const features = [
    {
      icon: "ScanFace",
      title: "Automated Detection",
      description: "Computer vision identifies 15+ conditions including caries, periodontal bone loss, and periapical lesions with pixel-perfect precision.",
      metrics: ["94.7% Accuracy", "15+ Classes", "Real-time"],
      color: "blue"
    },
    {
      icon: "Activity",
      title: "Risk Scoring Engine",
      description: "Dynamic risk stratification based on radiographic findings and patient history to prioritize high-risk cases effectively.",
      metrics: ["Predictive", "5-Point Scale", "Triage Ready"],
      color: "emerald"
    },
    {
      icon: "ClipboardCheck",
      title: "Smart Treatment Plans",
      description: "Generates evidence-based treatment options aligned with ADA clinical guidelines, reducing administrative planning time.",
      metrics: ["ADA Aligned", "Auto-Draft", "Editable"],
      color: "violet"
    },
    {
      icon: "MessageCircle",
      title: "Patient Education",
      description: "Instantly converts complex X-ray findings into visual, patient-friendly explainers to boost treatment acceptance.",
      metrics: ["Visual Aids", "Simplified", "Multi-lingual"],
      color: "orange"
    },
    {
      icon: "TrendingUp",
      title: "Longitudinal Tracking",
      description: "Overlays past and present scans to visualize disease progression or healing over months and years.",
      metrics: ["Time-Travel View", "Progression UI", "Comparative"],
      color: "rose"
    },
    {
      icon: "ShieldCheck",
      title: "Quality Assurance",
      description: "Real-time image quality assessment flags blurry or poorly angulated scans before you even leave the chair.",
      metrics: ["Blur Detection", "Angle Check", "Auto-Flag"],
      color: "cyan"
    }
  ];

  const getColorClasses = (color) => {
    const colors = {
      blue: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 group-hover:border-blue-500/50",
      emerald: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 group-hover:border-emerald-500/50",
      violet: "text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 group-hover:border-violet-500/50",
      orange: "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 group-hover:border-orange-500/50",
      rose: "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 group-hover:border-rose-500/50",
      cyan: "text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/20 group-hover:border-cyan-500/50",
    };
    return colors[color];
  };

  return (
    <section className="relative py-24 bg-slate-50 dark:bg-slate-950 overflow-hidden">
      
      {/* Background Decor */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03]" />
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold uppercase tracking-wider mb-6">
            <Icon name="Layers" size={14} />
            <span>Platform Capabilities</span>
          </div>
          
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-6 tracking-tight">
            Comprehensive <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-violet-600">Dental Intelligence</span>
          </h2>
          
          <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
            From image capture to patient acceptance, our platform combines multiple AI models 
            to enhance every step of the clinical workflow.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-24">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className={`group relative bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 ${getColorClasses(feature.color).split(' ').pop()}`}
            >
              {/* Icon */}
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${getColorClasses(feature.color).replace(/group-hover:[^ ]+/g, '')}`}>
                <Icon name={feature.icon} size={28} />
              </div>
              
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                {feature.title}
              </h3>
              
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-6">
                {feature.description}
              </p>
              
              {/* Metric Pills */}
              <div className="flex flex-wrap gap-2 mt-auto">
                {feature.metrics.map((metric, i) => (
                  <span 
                    key={i} 
                    className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                  >
                    {metric}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Integration Pipeline Visualization */}
        <div className="relative rounded-3xl bg-slate-900 border border-slate-800 p-10 lg:p-16 overflow-hidden text-center lg:text-left">
          {/* Glowing Background Line */}
          <div className="absolute top-1/2 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-20 hidden lg:block" />
          
          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12">
            
            {/* Intro Text */}
            <div className="max-w-sm">
              <h3 className="text-2xl font-bold text-white mb-3">Seamless Integration</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Designed to fit into your existing practice management software without disrupting your routine.
              </p>
            </div>

            {/* Pipeline Steps */}
            <div className="flex-1 w-full grid grid-cols-2 md:grid-cols-4 gap-6 relative">
              {[
                { icon: "UploadCloud", title: "Capture", sub: "X-Ray / Intraoral" },
                { icon: "Cpu", title: "Analyze", sub: "Our Engine" },
                { icon: "FileText", title: "Report", sub: "Auto-Generated" },
                { icon: "UserCheck", title: "Consult", sub: "Patient View" }
              ].map((step, i) => (
                <div key={i} className="relative group flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mb-4 group-hover:border-blue-500 group-hover:bg-blue-500/10 transition-all duration-300 z-10 relative">
                    <Icon name={step.icon} size={24} className="text-slate-400 group-hover:text-blue-400" />
                    
                    {/* Connector Line (Mobile/Tablet) */}
                    {i < 3 && <div className="absolute top-full h-8 w-[2px] bg-slate-800 lg:hidden" />}
                  </div>
                  <h4 className="text-white font-bold text-sm mb-1">{step.title}</h4>
                  <span className="text-xs text-slate-500">{step.sub}</span>
                </div>
              ))}
            </div>

          </div>
        </div>

      </div>
    </section>
  );
};

export default FeatureCards;