import React from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const IntegrationSection = () => {
  const integrations = [
    {
      name: 'Dentrix',
      type: 'PMS',
      description: 'Full sync with patient charts and ledger.',
      color: 'blue'
    },
    {
      name: 'Eaglesoft',
      type: 'PMS',
      description: 'Real-time appointment and clinical data.',
      color: 'purple'
    },
    {
      name: 'Open Dental',
      type: 'Open Source',
      description: 'Native MySQL integration for speed.',
      color: 'green'
    },
    {
      name: 'DEXIS',
      type: 'Imaging',
      description: 'Direct X-ray ingestion from sensor.',
      color: 'amber'
    },
    {
      name: 'Planmeca',
      type: 'Imaging',
      description: '2D and 3D volume analysis support.',
      color: 'teal'
    },
    {
      name: 'Carestream',
      type: 'Imaging',
      description: 'Seamless DICOM transfer protocol.',
      color: 'rose'
    }
  ];

  return (
    <section className="py-24 bg-white dark:bg-slate-950 overflow-hidden relative">
      
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/graphy.png')] opacity-[0.03]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold uppercase tracking-wider mb-6">
            <Icon name="Link" size={14} />
            <span>Universal Compatibility</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6 tracking-tight">
            Plug & Play with <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              Your Current Stack
            </span>
          </h2>
          
          <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
            Don't change how you work. Serene AI runs quietly in the background, 
            connecting with your existing PMS and imaging hardware via secure, local bridges.
          </p>
        </div>

        {/* Integration Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-20">
          {integrations.map((item, index) => (
            <div 
              key={index} 
              className="group bg-slate-50 dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
            >
              <div className="flex justify-between items-start mb-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-${item.color}-50 dark:bg-${item.color}-900/20 text-${item.color}-600`}>
                  <Icon name={item.type === 'PMS' ? 'Database' : 'Image'} size={24} />
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-${item.color}-100 dark:bg-${item.color}-900/30 text-${item.color}-700 dark:text-${item.color}-300`}>
                  {item.type}
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{item.name}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {item.description}
              </p>
            </div>
          ))}
        </div>

        {/* Setup Pipeline */}
        <div className="bg-slate-900 rounded-[2.5rem] p-10 lg:p-12 shadow-2xl relative overflow-hidden border border-slate-800">
          
          {/* Decorative Line */}
          <div className="absolute top-1/2 left-0 w-full h-px bg-slate-800 -z-0 hidden lg:block" />

          <div className="grid lg:grid-cols-3 gap-8 relative z-10">
            {[
              { step: "1", title: "Install The Bridge", desc: "Lightweight local service installs in < 5 mins." },
              { step: "2", title: "Map Data Fields", desc: "Auto-detects your schema and aligns patient IDs." },
              { step: "3", title: "Live Sync", desc: "Images analyze instantly as they are captured." }
            ].map((s, i) => (
              <div key={i} className="bg-slate-950 p-6 rounded-2xl border border-slate-800 flex flex-col items-center text-center hover:border-blue-500/50 transition-colors group">
                <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xl font-bold text-white mb-4 group-hover:bg-blue-600 group-hover:border-blue-500 transition-colors">
                  {s.step}
                </div>
                <h4 className="text-lg font-bold text-white mb-2">{s.title}</h4>
                <p className="text-sm text-slate-400">{s.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 flex flex-col md:flex-row items-center justify-center gap-6">
            <div className="flex items-center gap-2 px-4 py-2 bg-green-900/30 border border-green-500/30 rounded-full">
              <Icon name="Shield" size={16} className="text-green-400" />
              <span className="text-xs font-bold text-green-300 uppercase tracking-wide">HIPAA Compliant & Encrypted</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-900/30 border border-blue-500/30 rounded-full">
              <Icon name="Server" size={16} className="text-blue-400" />
              <span className="text-xs font-bold text-blue-300 uppercase tracking-wide">Local + Cloud Hybrid</span>
            </div>
          </div>

        </div>

        {/* Support CTA */}
        <div className="mt-20 text-center">
          <p className="text-slate-500 mb-6">Using a custom or legacy system?</p>
          <div className="flex justify-center gap-4">
             <Button variant="outline" iconName="MessageSquare" iconPosition="left">
               Chat with Integration Engineer
             </Button>
             <Button variant="ghost" iconName="FileText" iconPosition="left">
               Read Technical Docs
             </Button>
          </div>
        </div>

      </div>
    </section>
  );
};

export default IntegrationSection;