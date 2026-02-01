import React from 'react';
import Icon from '../../../components/AppIcon';

const TechOverviewSection = () => {
  const features = [
    {
      id: 'vision',
      title: 'YOLOv8 Computer Vision',
      description: 'State-of-the-art object detection identifies dental conditions with 94.7% accuracy in real-time.',
      icon: 'Eye',
      color: 'text-blue-500',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'group-hover:border-blue-500'
    },
    {
      id: 'brain',
      title: 'Clinical Reasoning',
      description: 'Advanced LLM provides detailed explanations, treatment recommendations, and patient-friendly summaries.',
      icon: 'Brain',
      color: 'text-purple-500',
      bg: 'bg-purple-50 dark:bg-purple-900/20',
      border: 'group-hover:border-purple-500'
    },
    {
      id: 'security',
      title: 'HIPAA-Compliant Core',
      description: 'End-to-end encryption (AES-256) and secure cloud infrastructure ensure total patient data protection.',
      icon: 'ShieldCheck',
      color: 'text-green-500',
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'group-hover:border-green-500'
    }
  ];

  return (
    <section className="relative py-24 bg-slate-50 dark:bg-slate-950 overflow-hidden">
      
      {/* Background Tech Grid */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/graphy.png')] opacity-[0.05] dark:opacity-[0.02]" />
      
      {/* Decorative Orbs */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold uppercase tracking-wider mb-6">
            <Icon name="Cpu" size={14} />
            <span>Architecture</span>
          </div>
          
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-6 tracking-tight">
            The <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Intelligence</span> Inside
          </h2>
          
          <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
            We combine the speed of computer vision with the reasoning of large language models to deliver 
            a diagnostic engine that rivals human experts.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          
          {/* LEFT: Feature Stack */}
          <div className="space-y-6">
            {features.map((feature) => (
              <div 
                key={feature.id} 
                className={`group relative p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 ${feature.border}`}
              >
                <div className="flex items-start gap-5">
                  <div className={`flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center ${feature.bg} ${feature.color}`}>
                    <Icon name={feature.icon} size={28} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* RIGHT: "System Monitor" Visualization */}
          <div className="relative">
            {/* Abstract Connections */}
            <div className="absolute -inset-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-[2rem] opacity-20 blur-xl animate-pulse" />
            
            <div className="relative bg-slate-900 dark:bg-black rounded-[2rem] border border-slate-800 p-8 shadow-2xl overflow-hidden">
              
              {/* Header of "Monitor" */}
              <div className="flex items-center justify-between mb-8 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500" />
                  </div>
                  <span className="text-xs font-mono text-slate-500 ml-2">system_status.log</span>
                </div>
                <div className="flex items-center gap-2 px-2 py-1 rounded bg-green-500/10 border border-green-500/20">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-[10px] font-bold text-green-400 uppercase tracking-wider">Online</span>
                </div>
              </div>

              {/* Metrics Visualization */}
              <div className="space-y-6">
                
                {/* Metric 1: Vision */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400 font-mono">Module: YOLOv8_Inference</span>
                    <span className="text-blue-400 font-mono">1.8ms</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 w-[95%] rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)] animate-[width_2s_ease-in-out_infinite]" />
                  </div>
                </div>

                {/* Metric 2: Detection */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400 font-mono">Condition_Confidence</span>
                    <span className="text-purple-400 font-mono">94.7%</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 w-[94.7%] rounded-full shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
                  </div>
                </div>

                {/* Metric 3: Encryption */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400 font-mono">Encryption_Protocol</span>
                    <span className="text-green-400 font-mono">AES-256</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 w-full rounded-full shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                  </div>
                </div>

              </div>

              {/* Pseudo-Code / Logs */}
              <div className="mt-8 p-4 bg-black/50 rounded-xl border border-slate-800 font-mono text-xs overflow-hidden">
                <div className="flex flex-col gap-1">
                  <div className="text-slate-500"><span className="text-blue-400">INFO</span> [14:02:21] Image received</div>
                  <div className="text-slate-500"><span className="text-blue-400">INFO</span> [14:02:22] Preprocessing... <span className="text-green-400">Done</span></div>
                  <div className="text-slate-500"><span className="text-purple-400">AI</span>   [14:02:22] Analyzing (YOLOv8)...</div>
                  <div className="text-slate-300"><span className="text-green-400">SUCCESS</span> [14:02:23] 3 pathologies detected</div>
                </div>
              </div>

            </div>
          </div>
          
        </div>
      </div>
    </section>
  );
};

export default TechOverviewSection;