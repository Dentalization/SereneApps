import React from 'react';
import Icon from '../../../components/AppIcon';

const ComparisonMatrix = () => {
  const comparisonData = [
    {
      feature: "Analysis Speed",
      traditional: "15-30 mins",
      competitors: "5-10 mins",
      serene: "< 2 seconds",
      icon: "Zap",
      highlight: true
    },
    {
      feature: "Diagnostic Accuracy",
      traditional: "85%",
      competitors: "90%",
      serene: "94.7%",
      icon: "Target",
      highlight: true
    },
    {
      feature: "Conditions Detected",
      traditional: "5-8",
      competitors: "8-12",
      serene: "15+",
      icon: "Search",
      highlight: true
    },
    {
      feature: "Report Generation",
      traditional: "Manual",
      competitors: "Basic Template",
      serene: "AI Personalized",
      icon: "FileText",
      highlight: true
    },
    {
      feature: "Data Encryption",
      traditional: "Varied",
      competitors: "Standard",
      serene: "E2E (AES-256)",
      icon: "Shield",
      highlight: true
    },
    {
      feature: "Cost per Scan",
      traditional: "$25+",
      competitors: "$8 - $15",
      serene: "$3 - $7",
      icon: "DollarSign",
      highlight: true
    }
  ];

  return (
    <section className="py-24 bg-slate-50 dark:bg-slate-950 overflow-hidden">
      
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold uppercase tracking-wider mb-6">
            <Icon name="BarChart2" size={14} />
            <span>Competitive Analysis</span>
          </div>
          
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-6 tracking-tight">
            Why <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Serene AI</span> Wins
          </h2>
          
          <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
            See how our deep learning architecture outperforms legacy methods and current market competitors.
          </p>
        </div>

        {/* Matrix Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden mb-20">
          
          {/* Table Header */}
          <div className="grid grid-cols-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 p-6">
            <div className="col-span-1 font-bold text-slate-500 dark:text-slate-400 uppercase text-xs tracking-wider flex items-center">Feature</div>
            <div className="col-span-1 text-center font-bold text-slate-500 dark:text-slate-400 uppercase text-xs tracking-wider">Traditional</div>
            <div className="col-span-1 text-center font-bold text-slate-500 dark:text-slate-400 uppercase text-xs tracking-wider">Competitors</div>
            <div className="col-span-1 text-center font-bold text-blue-600 dark:text-blue-400 uppercase text-xs tracking-wider flex justify-center items-center gap-2">
              <Icon name="Zap" size={14} /> Serene AI
            </div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {comparisonData.map((row, idx) => (
              <div key={idx} className="grid grid-cols-4 p-6 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors items-center group">
                
                {/* Feature Name */}
                <div className="col-span-1 flex items-center gap-3 font-semibold text-slate-700 dark:text-slate-200">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                    <Icon name={row.icon} size={16} />
                  </div>
                  <span className="hidden sm:inline">{row.feature}</span>
                </div>

                {/* Traditional */}
                <div className="col-span-1 text-center text-slate-500 dark:text-slate-400 text-sm">
                  {row.traditional}
                </div>

                {/* Competitors */}
                <div className="col-span-1 text-center text-slate-500 dark:text-slate-400 text-sm">
                  {row.competitors}
                </div>

                {/* Serene AI */}
                <div className="col-span-1 text-center relative">
                  {/* Highlight Background */}
                  <div className="absolute inset-y-[-24px] inset-x-2 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl -z-10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  <div className="font-bold text-blue-600 dark:text-blue-400 flex items-center justify-center gap-2">
                    {row.serene}
                    <Icon name="CheckCircle" size={16} className="text-blue-500 fill-current" />
                  </div>
                </div>

              </div>
            ))}
          </div>
        </div>

        {/* ROI Calculator Section */}
        <div className="relative rounded-[2.5rem] bg-slate-900 overflow-hidden text-white p-10 lg:p-16 shadow-2xl">
          {/* Decor */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-green-500/10 rounded-full blur-[100px]" />
          
          <div className="relative z-10 grid lg:grid-cols-2 gap-12 items-center">
            
            {/* Text Content */}
            <div>
              <h3 className="text-3xl font-bold mb-4">Calculate Your ROI</h3>
              <p className="text-slate-400 mb-8 leading-relaxed">
                See exactly how much time and operational cost you can save by switching to an automated workflow.
                Based on an average clinic processing 500 scans/month.
              </p>
              
              <div className="flex gap-4">
                <div className="p-4 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
                  <div className="text-3xl font-bold text-green-400 mb-1">85%</div>
                  <div className="text-xs text-slate-400 uppercase tracking-wider">Cost Reduction</div>
                </div>
                <div className="p-4 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
                  <div className="text-3xl font-bold text-blue-400 mb-1">10x</div>
                  <div className="text-xs text-slate-400 uppercase tracking-wider">Faster Output</div>
                </div>
              </div>
            </div>

            {/* Simulated Calculator Card */}
            <div className="bg-white text-slate-900 rounded-2xl p-8 shadow-2xl">
              <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
                <span className="font-bold text-lg">Monthly Savings Estimate</span>
                <Icon name="Calculator" className="text-slate-400" />
              </div>
              
              <div className="space-y-4 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Manual Analysis Cost</span>
                  <span className="font-mono text-red-500 line-through">$12,500</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Serene AI Cost</span>
                  <span className="font-mono text-green-600 font-bold">$2,500</span>
                </div>
              </div>

              <div className="bg-green-50 rounded-xl p-4 flex justify-between items-center">
                <span className="text-green-800 font-medium">Net Savings</span>
                <span className="text-2xl font-bold text-green-600">$10,000</span>
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
};

export default ComparisonMatrix;