import React from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const CDSSSection = () => {
  const accuracyMetrics = [
    { condition: "Dental Caries", accuracy: 94.7, samples: "12,450", trend: "+2.1%" },
    { condition: "Gingivitis", accuracy: 91.2, samples: "8,320", trend: "+1.5%" },
    { condition: "Periodontal Disease", accuracy: 89.8, samples: "6,180", trend: "+3.2%" },
    { condition: "Oral Lesions", accuracy: 87.3, samples: "4,290", trend: "+0.8%" },
    { condition: "Tooth Fractures", accuracy: 92.1, samples: "3,670", trend: "+1.9%" }
  ];

  const integrationFeatures = [
    {
      icon: "Database",
      title: "EMR / EHR",
      description: "Epic, Cerner, & Meditech",
      color: "blue"
    },
    {
      icon: "LayoutGrid",
      title: "PMS Systems",
      description: "Dentrix, Eaglesoft, Open Dental",
      color: "purple"
    },
    {
      icon: "Webhook",
      title: "Custom API",
      description: "RESTful endpoints & Webhooks",
      color: "green"
    },
    {
      icon: "Lock",
      title: "Security",
      description: "HIPAA & SOC 2 Compliant",
      color: "red"
    }
  ];

  return (
    <section className="py-24 bg-slate-50 dark:bg-slate-950 overflow-hidden">
      
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-teal-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold uppercase tracking-wider mb-6">
            <Icon name="Activity" size={14} />
            <span>Clinical Decision Support</span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-6 tracking-tight">
            Evidence-Based <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-500">Precision</span>
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-3xl mx-auto leading-relaxed">
            Our AI doesn't just guess; it validates. Backed by the largest annotated dental dataset 
            and verified by peer-reviewed clinical trials.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 mb-20">
          
          {/* LEFT: Accuracy Dashboard (7 cols) */}
          <div className="lg:col-span-7">
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Icon name="Target" size={20} className="text-blue-500" />
                  Model Performance
                </h3>
                <span className="text-xs font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                  v2.4 (Stable)
                </span>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-12 text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 px-2">
                  <div className="col-span-4">Condition</div>
                  <div className="col-span-5">Accuracy Score</div>
                  <div className="col-span-3 text-right">Samples</div>
                </div>
                
                <div className="space-y-4">
                  {accuracyMetrics.map((metric, index) => (
                    <div key={index} className="group flex items-center p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-700">
                      
                      {/* Name */}
                      <div className="w-[33%] font-semibold text-slate-900 dark:text-white">
                        {metric.condition}
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="w-[42%] pr-6">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-bold text-slate-700 dark:text-slate-300">{metric.accuracy}%</span>
                          <span className="text-green-500 font-medium text-[10px]">{metric.trend}</span>
                        </div>
                        <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-blue-500 to-teal-400 rounded-full" 
                            style={{ width: `${metric.accuracy}%` }} 
                          />
                        </div>
                      </div>
                      
                      {/* Samples */}
                      <div className="w-[25%] text-right text-sm text-slate-500 font-mono">
                        {metric.samples}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/10 p-4 border-t border-blue-100 dark:border-blue-900/20 flex gap-3">
                <Icon name="Info" size={20} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed">
                  <strong>Validation Note:</strong> Results based on double-blind studies comparing AI output against consensus from 3 board-certified radiologists.
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT: Integration Hub (5 cols) */}
          <div className="lg:col-span-5 flex flex-col justify-center">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
              Connects with your <br/>
              <span className="text-blue-600 dark:text-blue-400">Entire Ecosystem</span>
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {integrationFeatures.map((feature, index) => (
                <div 
                  key={index} 
                  className={`p-5 rounded-2xl border transition-all duration-300 hover:shadow-lg hover:-translate-y-1 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 bg-${feature.color}-50 dark:bg-${feature.color}-900/20 text-${feature.color}-600 dark:text-${feature.color}-400`}>
                    <Icon name={feature.icon} size={20} />
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white mb-1">{feature.title}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{feature.description}</p>
                </div>
              ))}
            </div>

            <div className="mt-8">
              <Button variant="outline" fullWidth iconName="ArrowRight" iconPosition="right">
                View API Documentation
              </Button>
            </div>
          </div>
        </div>

        {/* Validation Banner */}
        <div className="relative overflow-hidden rounded-[2rem] bg-slate-900 text-white p-10 lg:p-12 shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px]" />
          
          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-10">
            <div className="max-w-xl">
              <div className="flex items-center gap-3 mb-4 text-green-400">
                <Icon name="ShieldCheck" size={24} />
                <span className="font-bold text-sm uppercase tracking-widest">Clinically Validated</span>
              </div>
              <h3 className="text-3xl font-bold mb-4">Proven in Multi-Center Trials</h3>
              <p className="text-slate-400 leading-relaxed mb-8">
                Our algorithms have been rigorously tested across 15 clinical sites globally, 
                analyzing over 35,000 unique patient cases to ensure zero bias and maximum reliability.
              </p>
              <div className="flex flex-wrap gap-6">
                {[
                  { label: "Clinical Sites", val: "15" },
                  { label: "Patient Cases", val: "35k+" },
                  { label: "Study Duration", val: "18mo" }
                ].map((stat, i) => (
                  <div key={i}>
                    <div className="text-2xl font-bold text-white">{stat.val}</div>
                    <div className="text-xs text-slate-500 uppercase tracking-wider">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-shrink-0">
              <Button className="bg-white text-slate-900 hover:bg-slate-100 border-none px-8 py-4 shadow-lg" iconName="Download" iconPosition="left">
                Read the Study
              </Button>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};

export default CDSSSection;