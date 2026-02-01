import React from 'react';
import Icon from '../../../components/AppIcon';

const ClinicalInsightsSection = () => {
  const insightTypes = [
    {
      icon: 'BarChart2',
      title: 'Practice Pulse',
      description: 'Real-time analytics on patient flow, revenue, and chair utilization.',
      color: 'blue'
    },
    {
      icon: 'Activity',
      title: 'Clinical Quality',
      description: 'AI-monitored treatment outcomes and diagnostic consistency.',
      color: 'green'
    },
    {
      icon: 'TrendingUp',
      title: 'Growth Forecast',
      description: 'Predictive modeling for future resource needs and revenue.',
      color: 'purple'
    },
    {
      icon: 'Shield',
      title: 'Risk & Compliance',
      description: 'Automated auditing to ensure standard-of-care compliance.',
      color: 'orange'
    }
  ];

  return (
    <section className="py-24 bg-slate-50 dark:bg-slate-950 overflow-hidden relative">
      
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider mb-6">
            <Icon name="PieChart" size={14} />
            <span>Business Intelligence</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6 tracking-tight">
            Data-Driven <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-600">
              Clinical Mastery
            </span>
          </h2>
          
          <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
            Stop guessing. Start knowing. Our platform aggregates millions of data points 
            to give you a crystal-clear view of your practice's health and clinical performance.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {insightTypes.map((insight, index) => (
            <div 
              key={index} 
              className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-${insight.color}-50 dark:bg-${insight.color}-900/20 text-${insight.color}-600 group-hover:scale-110 transition-transform`}>
                <Icon name={insight.icon} size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{insight.title}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                {insight.description}
              </p>
            </div>
          ))}
        </div>

        {/* Analytics Dashboard Visualization */}
        <div className="bg-slate-900 rounded-[2.5rem] p-8 lg:p-12 shadow-2xl relative overflow-hidden border border-slate-800">
          
          {/* Header Bar */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 pb-6 border-b border-slate-800 gap-4">
            <div>
              <h3 className="text-2xl font-bold text-white mb-1">Performance Overview</h3>
              <p className="text-slate-400 text-sm">Last 30 Days • Multi-Location Aggregate</p>
            </div>
            <div className="flex gap-3">
              <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2">
                <Icon name="Download" size={16} /> Export Report
              </button>
              <button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-blue-900/20">
                View Full Dashboard
              </button>
            </div>
          </div>
          
          <div className="grid lg:grid-cols-12 gap-10">
            
            {/* Left: Key Metrics (4 cols) */}
            <div className="lg:col-span-4 space-y-4">
              <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Vital Signs</h4>
              
              {[
                { label: "Active Patients", val: "2,847", trend: "+12%", icon: "Users", color: "blue" },
                { label: "Treatment Acceptance", val: "78%", trend: "+5%", icon: "CheckCircle", color: "green" },
                { label: "Chair Utilization", val: "92%", trend: "+3%", icon: "Layout", color: "purple" },
                { label: "Monthly Revenue", val: "$124k", trend: "+15%", icon: "DollarSign", color: "emerald" },
              ].map((metric, i) => (
                <div key={i} className="bg-slate-800/50 rounded-xl p-4 flex items-center justify-between border border-slate-700/50 hover:bg-slate-800 transition-colors cursor-pointer group">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg bg-${metric.color}-500/10 text-${metric.color}-500`}>
                      <Icon name={metric.icon} size={20} />
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 uppercase font-medium">{metric.label}</div>
                      <div className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">{metric.val}</div>
                    </div>
                  </div>
                  <div className="text-xs font-bold text-green-500 bg-green-500/10 px-2 py-1 rounded-full">
                    {metric.trend}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Middle: Treatment Mix (4 cols) */}
            <div className="lg:col-span-4">
               <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Procedure Mix</h4>
               
               <div className="bg-slate-800/30 rounded-2xl p-6 border border-slate-700/50 h-full flex flex-col justify-center">
                 {/* Simulated Donut Chart */}
                 <div className="relative w-48 h-48 mx-auto mb-6">
                   <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                     <circle cx="50" cy="50" r="40" stroke="#1e293b" strokeWidth="10" fill="none" />
                     {/* Segments - Simplified representation */}
                     <circle cx="50" cy="50" r="40" stroke="#3b82f6" strokeWidth="10" fill="none" strokeDasharray="100 250" strokeDashoffset="0" className="opacity-80" /> 
                     <circle cx="50" cy="50" r="40" stroke="#10b981" strokeWidth="10" fill="none" strokeDasharray="70 250" strokeDashoffset="-100" className="opacity-80" />
                     <circle cx="50" cy="50" r="40" stroke="#f59e0b" strokeWidth="10" fill="none" strokeDasharray="40 250" strokeDashoffset="-170" className="opacity-80" />
                   </svg>
                   <div className="absolute inset-0 flex flex-col items-center justify-center">
                     <span className="text-2xl font-bold text-white">458</span>
                     <span className="text-xs text-slate-500">Procedures</span>
                   </div>
                 </div>

                 <div className="space-y-3 text-sm">
                   {[
                     { label: "Restorative", pct: "40%", color: "bg-blue-500" },
                     { label: "Preventive", pct: "35%", color: "bg-green-500" },
                     { label: "Surgical", pct: "25%", color: "bg-amber-500" },
                   ].map((item, i) => (
                     <div key={i} className="flex items-center justify-between">
                       <div className="flex items-center gap-2">
                         <div className={`w-3 h-3 rounded-full ${item.color}`} />
                         <span className="text-slate-300">{item.label}</span>
                       </div>
                       <span className="font-mono font-bold text-white">{item.pct}</span>
                     </div>
                   ))}
                 </div>
               </div>
            </div>
            
            {/* Right: AI Insights (4 cols) */}
            <div className="lg:col-span-4 space-y-4">
              <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">AI Insights</h4>
              
              <div className="p-4 bg-blue-500/10 rounded-xl border border-blue-500/20 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Icon name="Lightbulb" size={40} />
                </div>
                <div className="flex gap-3 mb-2">
                  <Icon name="Zap" size={18} className="text-blue-400 mt-0.5" />
                  <span className="text-sm font-bold text-blue-200">Revenue Opportunity</span>
                </div>
                <p className="text-xs text-blue-100/70 leading-relaxed mb-3">
                  Increasing hygiene re-booking by 5% could generate an additional <strong>$18k/month</strong>.
                </p>
                <button className="text-xs font-bold text-blue-400 hover:text-white transition-colors flex items-center gap-1">
                  View Strategy <Icon name="ArrowRight" size={12} />
                </button>
              </div>

              <div className="p-4 bg-amber-500/10 rounded-xl border border-amber-500/20 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Icon name="AlertTriangle" size={40} />
                </div>
                <div className="flex gap-3 mb-2">
                  <Icon name="ShieldAlert" size={18} className="text-amber-400 mt-0.5" />
                  <span className="text-sm font-bold text-amber-200">Retention Risk</span>
                </div>
                <p className="text-xs text-amber-100/70 leading-relaxed mb-3">
                  12 active patients have not scheduled a recall in 6+ months.
                </p>
                <button className="text-xs font-bold text-amber-400 hover:text-white transition-colors flex items-center gap-1">
                  Start Recall Campaign <Icon name="ArrowRight" size={12} />
                </button>
              </div>

            </div>

          </div>
        </div>

      </div>
    </section>
  );
};

export default ClinicalInsightsSection;