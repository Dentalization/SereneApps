import React from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const DentistDashboardSection = () => {
  const dashboardFeatures = [
    {
      icon: 'Layout',
      title: 'Unified View',
      description: 'Aggregate patient data, schedules, and AI insights in one screen.',
      color: 'blue'
    },
    {
      icon: 'FileText',
      title: 'Smart Charts',
      description: 'Auto-populating clinical notes powered by NLP.',
      color: 'green'
    },
    {
      icon: 'Bell',
      title: 'Active Alerts',
      description: 'Real-time notifications for critical patient follow-ups.',
      color: 'amber'
    }
  ];

  return (
    <section className="py-24 bg-slate-50 dark:bg-slate-950 overflow-hidden relative">
      
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-teal-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold uppercase tracking-wider mb-6">
            <Icon name="LayoutDashboard" size={14} />
            <span>Practice Command Center</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6 tracking-tight">
            Your Entire Practice <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-500">
              At a Glance
            </span>
          </h2>
          
          <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
            No more tab switching. Our intuitive dashboard unifies clinical data, operational metrics, 
            and patient communications into a single, powerful interface.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-20">
          {dashboardFeatures.map((feature, index) => (
            <div key={index} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 hover:shadow-lg transition-all duration-300">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-${feature.color}-50 dark:bg-${feature.color}-900/20 text-${feature.color}-600`}>
                <Icon name={feature.icon} size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{feature.title}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Interactive Dashboard UI */}
        <div className="bg-slate-900 rounded-[2rem] border border-slate-800 shadow-2xl overflow-hidden mb-24">
          
          {/* Dashboard Toolbar */}
          <div className="bg-slate-800/80 backdrop-blur px-6 py-4 border-b border-slate-700 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
              </div>
              <div className="h-6 w-px bg-slate-700 mx-2" />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
                  DR
                </div>
                <div className="text-sm font-medium text-white">Dr. Sarah Mitchell</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
               <div className="relative">
                 <Icon name="Bell" className="text-slate-400" />
                 <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
               </div>
               <Icon name="Settings" className="text-slate-400" />
            </div>
          </div>

          <div className="grid lg:grid-cols-12 min-h-[500px]">
            
            {/* Sidebar (2 cols) */}
            <div className="hidden lg:flex lg:col-span-2 bg-slate-900 border-r border-slate-800 flex-col items-center py-6 gap-6">
               {['Home', 'Users', 'Calendar', 'FileText', 'BarChart2', 'MessageSquare'].map((icon, i) => (
                 <div key={i} className={`p-3 rounded-xl transition-colors ${i === 0 ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-800 hover:text-slate-300'}`}>
                   <Icon name={icon} size={20} />
                 </div>
               ))}
            </div>

            {/* Main Content (7 cols) */}
            <div className="lg:col-span-7 bg-slate-950 p-8">
              <h3 className="text-xl font-bold text-white mb-6">Today's Overview</h3>
              
              {/* Stats Row */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                {[
                  { label: "Appointments", val: "14", color: "text-white" },
                  { label: "Completed", val: "8", color: "text-green-400" },
                  { label: "Pending", val: "6", color: "text-amber-400" },
                ].map((stat, i) => (
                  <div key={i} className="bg-slate-900 rounded-xl p-4 border border-slate-800">
                    <div className={`text-2xl font-bold ${stat.color} mb-1`}>{stat.val}</div>
                    <div className="text-xs text-slate-500 uppercase tracking-wide">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Activity Feed */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Recent Activity</h4>
                {[
                  { icon: "CheckCircle", color: "text-green-500", title: "Analysis Completed", desc: "John Doe • Root Canal Assessment", time: "2m ago" },
                  { icon: "Calendar", color: "text-blue-500", title: "New Appointment", desc: "Emma Wilson • Initial Consult", time: "15m ago" },
                  { icon: "AlertTriangle", color: "text-amber-500", title: "Risk Alert", desc: "Patient #492 requires review", time: "1h ago" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 bg-slate-900 rounded-xl border border-slate-800 hover:bg-slate-800 transition-colors cursor-pointer">
                    <div className={`p-2 rounded-lg bg-slate-950 ${item.color}`}>
                      <Icon name={item.icon} size={20} />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <span className="font-bold text-slate-200 text-sm">{item.title}</span>
                        <span className="text-xs text-slate-600">{item.time}</span>
                      </div>
                      <div className="text-xs text-slate-500">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Panel (3 cols) */}
            <div className="lg:col-span-3 bg-slate-900 border-l border-slate-800 p-6 space-y-6">
               
               {/* Quick Actions */}
               <div>
                 <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Quick Actions</h4>
                 <div className="space-y-3">
                   {['Upload X-Ray', 'New Patient', 'Add Appointment', 'Create Report'].map((action, i) => (
                     <button key={i} className="w-full text-left px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors flex items-center gap-3">
                       <Icon name={i === 0 ? 'UploadCloud' : i === 1 ? 'UserPlus' : i === 2 ? 'Calendar' : 'FileText'} size={16} />
                       {action}
                     </button>
                   ))}
                 </div>
               </div>

               {/* AI Assistant */}
               <div className="bg-blue-600/10 border border-blue-500/20 rounded-xl p-4">
                 <div className="flex items-center gap-2 mb-2 text-blue-400">
                   <Icon name="Sparkles" size={16} />
                   <span className="text-xs font-bold uppercase">AI Assistant</span>
                 </div>
                 <p className="text-xs text-blue-200/80 leading-relaxed mb-3">
                   Reminder: Mrs. Johnson is due for her 6-month recall. 
                   Her last scan showed early signs of gingivitis.
                 </p>
                 <button className="text-xs font-bold text-blue-400 hover:text-white">Send Reminder</button>
               </div>

            </div>

          </div>
        </div>

        {/* Bottom Benefits Grid */}
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Why Dentists Love It</h3>
            
            {[
              { icon: 'Smartphone', title: 'Mobile Optimized', desc: 'Access your practice data securely from any device, anywhere.' },
              { icon: 'Zap', title: 'Zero Latency', desc: 'Built on edge computing for instant load times and real-time updates.' },
              { icon: 'Palette', title: 'Fully Customizable', desc: 'Drag-and-drop widgets to match your specific workflow needs.' }
            ].map((item, i) => (
              <div key={i} className="flex gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0 text-blue-600">
                  <Icon name={item.icon} size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white mb-1">{item.title}</h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
          
          <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-8 border border-slate-100 dark:border-slate-800">
             <h4 className="font-bold text-slate-900 dark:text-white mb-6">User Satisfaction Metrics</h4>
             <div className="space-y-6">
               {[
                 { label: "Ease of Use", val: "98%", color: "bg-green-500" },
                 { label: "Task Speed", val: "65% Faster", color: "bg-blue-500", width: "65%" },
                 { label: "Onboarding Time", val: "< 2 Hours", color: "bg-purple-500", width: "85%" },
               ].map((metric, i) => (
                 <div key={i}>
                   <div className="flex justify-between text-sm mb-2 text-slate-600 dark:text-slate-300">
                     <span>{metric.label}</span>
                     <span className="font-bold">{metric.val}</span>
                   </div>
                   <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                     <div className={`h-full ${metric.color}`} style={{ width: metric.width || metric.val }} />
                   </div>
                 </div>
               ))}
             </div>
          </div>
        </div>

      </div>
    </section>
  );
};

export default DentistDashboardSection;