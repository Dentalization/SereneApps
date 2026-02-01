import React from 'react';
import Icon from '../../../components/AppIcon';

const EfficiencySection = () => {
  const efficiencyFeatures = [
    {
      icon: 'Zap',
      title: 'Instant Analysis',
      description: 'Comprehensive diagnostic insights generated in real-time.',
      stat: '< 2s',
      statLabel: 'Processing Time',
      color: 'text-yellow-500',
      bg: 'bg-yellow-500/10'
    },
    {
      icon: 'TrendingUp',
      title: 'Workflow Speed',
      description: 'Streamline your diagnostic process with intelligent automation.',
      stat: '30%',
      statLabel: 'Time Saved',
      color: 'text-blue-500',
      bg: 'bg-blue-500/10'
    },
    {
      icon: 'Target',
      title: 'Precision Accuracy',
      description: 'Clinical-grade detection for 15+ dental conditions.',
      stat: '94.7%',
      statLabel: 'Accuracy Rate',
      color: 'text-green-500',
      bg: 'bg-green-500/10'
    },
    {
      icon: 'Users',
      title: 'Patient Volume',
      description: 'See more patients without compromising care quality.',
      stat: '+25%',
      statLabel: 'Throughput',
      color: 'text-purple-500',
      bg: 'bg-purple-500/10'
    }
  ];

  return (
    <section className="py-24 bg-white dark:bg-slate-950 overflow-hidden relative">
      
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/graphy.png')] opacity-[0.03]" />
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500/5 rounded-full blur-[100px]" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <div className="text-center mb-20 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wider mb-6">
            <Icon name="Activity" size={14} />
            <span>Operational Efficiency</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6 tracking-tight">
            Maximize Your Practice <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              Throughput & Precision
            </span>
          </h2>
          
          <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
            Eliminate bottlenecks in your diagnostic workflow. Our AI handles the heavy lifting of image analysis, 
            giving you back valuable chair time for patient interaction.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {efficiencyFeatures.map((feature, index) => (
            <div 
              key={index} 
              className="group bg-slate-50 dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              <div className="flex justify-between items-start mb-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${feature.bg} ${feature.color}`}>
                  <Icon name={feature.icon} size={24} />
                </div>
                <span className={`text-xl font-bold ${feature.color}`}>{feature.stat}</span>
              </div>
              
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{feature.title}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-3">
                {feature.description}
              </p>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                {feature.statLabel}
              </div>
            </div>
          ))}
        </div>

        {/* Efficiency Comparison Section */}
        <div className="bg-slate-900 rounded-[2.5rem] p-10 lg:p-12 text-white shadow-2xl relative overflow-hidden">
          
          {/* Decor */}
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-b from-blue-600/10 to-transparent rounded-full blur-[100px] pointer-events-none" />

          <div className="grid lg:grid-cols-2 gap-16 items-center relative z-10">
            
            {/* Visual Comparison */}
            <div>
              <h3 className="text-2xl font-bold mb-8">The Serene Advantage</h3>
              
              <div className="space-y-6">
                {/* Traditional Method */}
                <div className="relative">
                  <div className="flex justify-between text-sm text-slate-400 mb-2">
                    <span>Traditional Workflow</span>
                    <span>15-20 min</span>
                  </div>
                  <div className="h-12 bg-slate-800 rounded-xl w-full flex items-center px-4 relative overflow-hidden">
                    <div className="absolute inset-y-0 left-0 w-full bg-red-500/10 border-r-2 border-red-500/50" />
                    <span className="relative z-10 text-sm text-slate-300">Manual Inspection & Charting</span>
                  </div>
                </div>

                {/* Serene AI Method */}
                <div className="relative">
                  <div className="flex justify-between text-sm text-blue-300 mb-2 font-medium">
                    <span className="flex items-center gap-2"><Icon name="Zap" size={14}/> Serene AI Workflow</span>
                    <span>&lt; 2 sec</span>
                  </div>
                  <div className="h-12 bg-slate-800 rounded-xl w-full flex items-center px-4 relative overflow-hidden">
                    <div className="absolute inset-y-0 left-0 w-[5%] bg-green-500 shadow-[0_0_20px_rgba(34,197,94,0.6)]" />
                    <span className="relative z-10 text-sm text-white font-semibold pl-2">AI Analysis</span>
                    <span className="relative z-10 text-sm text-slate-500 ml-auto">Immediate Results</span>
                  </div>
                </div>
              </div>

              <p className="mt-8 text-sm text-slate-400 leading-relaxed">
                *Comparison based on average time to analyze a Full Mouth Series (FMX) manually versus automated pre-screening.
              </p>
            </div>
            
            {/* ROI Calculator Widget */}
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-600 rounded-lg">
                  <Icon name="Calculator" size={24} className="text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-lg">Time Savings Calculator</h4>
                  <p className="text-xs text-slate-400">Based on 15 patients/day</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-white/10">
                  <span className="text-slate-300 text-sm">Time saved per patient</span>
                  <span className="font-mono font-bold text-white">18 mins</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-white/10">
                  <span className="text-slate-300 text-sm">Daily hours reclaimed</span>
                  <span className="font-mono font-bold text-blue-300">4.5 hrs</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-slate-300 text-sm">Monthly hours saved</span>
                  <span className="font-mono text-2xl font-bold text-green-400">90 hrs</span>
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-600/20 border border-blue-500/30 rounded-xl text-center">
                <p className="text-xs text-blue-200 mb-1">Potential Additional Revenue</p>
                <p className="text-2xl font-bold text-white">+$12,500 / mo</p>
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
};

export default EfficiencySection;