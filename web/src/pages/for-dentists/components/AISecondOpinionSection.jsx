import React from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const AISecondOpinionSection = () => {
  const features = [
    {
      icon: 'Brain',
      title: 'Clinical Decision Support',
      description: 'AI-powered second opinions backed by thousands of verified cases.',
      color: 'blue'
    },
    {
      icon: 'ShieldCheck',
      title: 'Risk Stratification',
      description: 'Automatically flags high-risk pathologies for prioritization.',
      color: 'green'
    },
    {
      icon: 'BookOpen',
      title: 'Evidence-Based',
      description: 'Recommendations aligned with latest ADA clinical guidelines.',
      color: 'purple'
    },
    {
      icon: 'Microscope',
      title: 'Early Detection',
      description: 'Identify lesions invisible to the naked eye.',
      color: 'orange'
    }
  ];

  const conditions = [
    'Dental Caries', 'Periodontal Disease', 'Impacted Teeth',
    'Root Canal Issues', 'Bone Loss', 'Oral Pathology',
    'TMJ Disorders', 'Orthodontic Issues', 'Endodontic Problems',
    'Restorative Needs', 'Implant Planning', 'Surgical Assessment'
  ];

  return (
    <section className="py-24 bg-slate-50 dark:bg-slate-950 overflow-hidden relative">
      
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 text-xs font-bold uppercase tracking-wider mb-6">
            <Icon name="Brain" size={14} />
            <span>AI Clinical Assistant</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6 tracking-tight">
            Your Always-On <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">
              Second Opinion
            </span>
          </h2>
          
          <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
            Reduce diagnostic uncertainty with an AI partner that never gets tired. 
            Validate your findings against millions of data points instantly.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-16 items-center mb-24">
          
          {/* LEFT: Feature Grid */}
          <div className="grid sm:grid-cols-2 gap-6">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className="group bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-${feature.color}-50 dark:bg-${feature.color}-900/20 text-${feature.color}-600`}>
                  <Icon name={feature.icon} size={24} />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
          
          {/* RIGHT: Capabilities Card */}
          <div className="relative bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 p-8 lg:p-10 shadow-2xl overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03]" />
            
            <div className="relative z-10">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
                Comprehensive Detection
              </h3>
              
              {/* Stats Row */}
              <div className="flex gap-4 mb-8 overflow-x-auto pb-2">
                {[
                  { label: "Accuracy", val: "94.7%", color: "text-green-500" },
                  { label: "Speed", val: "< 2s", color: "text-blue-500" },
                  { label: "Classes", val: "15+", color: "text-purple-500" }
                ].map((stat, i) => (
                  <div key={i} className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 min-w-[100px]">
                    <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">{stat.label}</div>
                    <div className={`text-xl font-bold ${stat.color}`}>{stat.val}</div>
                  </div>
                ))}
              </div>
              
              {/* Tag Cloud */}
              <div className="flex flex-wrap gap-2 mb-8">
                {conditions.map((condition, index) => (
                  <span 
                    key={index} 
                    className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                  >
                    {condition}
                  </span>
                ))}
              </div>
              
              <Button className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90" iconName="Plus">
                View All Capabilities
              </Button>
            </div>
          </div>
        </div>

        {/* Bottom: Interactive Case Study */}
        <div className="bg-slate-900 rounded-[2.5rem] p-1 border border-slate-800 shadow-2xl overflow-hidden">
          <div className="bg-slate-950 rounded-[2.3rem] p-8 lg:p-12 relative overflow-hidden">
            
            {/* Glow Effect */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[300px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />

            <div className="grid lg:grid-cols-12 gap-12 relative z-10">
              
              {/* Left: Context */}
              <div className="lg:col-span-4 space-y-6">
                <div className="inline-flex items-center gap-2 text-blue-400 font-bold uppercase tracking-wider text-xs mb-2">
                  <Icon name="Activity" size={14} /> Case Study #A47291
                </div>
                <h3 className="text-3xl font-bold text-white">From Confusion to Clarity</h3>
                <p className="text-slate-400 leading-relaxed">
                  A patient presented with vague jaw pain. Traditional X-rays were inconclusive. 
                  Serene AI analyzed the scan and highlighted a hidden pathology in seconds.
                </p>

                <div className="space-y-4 pt-4">
                  {[
                    { step: "1", title: "Scan Uploaded", desc: "Panoramic X-Ray ingestion" },
                    { step: "2", title: "AI Inference", desc: "YOLOv8 analysis in 1.8s" },
                    { step: "3", title: "Diagnosis Confirmed", desc: "Treatment plan generated" }
                  ].map((item, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-sm font-bold text-white shrink-0">
                        {item.step}
                      </div>
                      <div>
                        <div className="text-white font-medium">{item.title}</div>
                        <div className="text-sm text-slate-500">{item.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: AI Analysis UI */}
              <div className="lg:col-span-8">
                <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
                  {/* Toolbar */}
                  <div className="bg-slate-800/50 px-4 py-3 border-b border-slate-800 flex justify-between items-center">
                    <span className="text-xs font-mono text-slate-400">ANALYSIS_MODE: ACTIVE</span>
                    <div className="flex gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-xs font-bold text-red-400">CRITICAL FINDING</span>
                    </div>
                  </div>

                  {/* Findings List */}
                  <div className="p-6 space-y-4">
                    
                    {/* Finding 1 */}
                    <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/50 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                      <div className="w-10 h-10 rounded-lg bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                        <Icon name="AlertTriangle" size={20} />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between mb-1">
                          <span className="font-bold text-white">Impacted Wisdom Tooth (#32)</span>
                          <span className="text-amber-400 font-mono text-sm">87% CONFIDENCE</span>
                        </div>
                        <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-500 w-[87%]" />
                        </div>
                      </div>
                    </div>

                    {/* Finding 2 */}
                    <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/50 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                      <div className="w-10 h-10 rounded-lg bg-red-500/20 text-red-500 flex items-center justify-center shrink-0">
                        <Icon name="Target" size={20} />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between mb-1">
                          <span className="font-bold text-white">Cystic Lesion Detected</span>
                          <span className="text-red-400 font-mono text-sm">92% CONFIDENCE</span>
                        </div>
                        <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                          <div className="h-full bg-red-500 w-[92%]" />
                        </div>
                      </div>
                    </div>

                    {/* Recommendation Box */}
                    <div className="bg-blue-600/10 border border-blue-500/20 rounded-lg p-4 flex gap-3">
                      <Icon name="Lightbulb" size={20} className="text-blue-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-blue-200 text-sm font-bold mb-1">AI Recommendation Engine</div>
                        <p className="text-blue-300/80 text-xs leading-relaxed">
                          High probability of nerve impingement. Suggest CBCT scan for 3D verification 
                          prior to surgical extraction. Referral to OMFS recommended.
                        </p>
                      </div>
                    </div>

                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>
    </section>
  );
};

export default AISecondOpinionSection;