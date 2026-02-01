import React from 'react';
import Icon from '../../../components/AppIcon';

const SmartSchedulingSection = () => {
  const schedulingFeatures = [
    {
      icon: 'Calendar',
      title: 'Dynamic Booking',
      description: 'AI re-arranges slots in real-time to eliminate dead gaps.',
      benefit: '35% Fewer Gaps',
      color: 'blue'
    },
    {
      icon: 'Clock',
      title: 'Precision Timing',
      description: 'Predicts exact procedure duration based on patient history.',
      benefit: '98% On-Time',
      color: 'green'
    },
    {
      icon: 'Users',
      title: 'Smart Triage',
      description: 'Prioritizes emergency cases without disrupting the flow.',
      benefit: 'Better Care',
      color: 'purple'
    },
    {
      icon: 'RefreshCw',
      title: 'Auto-Recalls',
      description: 'Automates follow-up booking for hygiene and treatment phases.',
      benefit: 'Higher Retention',
      color: 'orange'
    }
  ];

  const timelineEvents = [
    { time: '09:00 AM', title: 'Deep Cleaning (Perio)', patient: 'Sarah Johnson', duration: '45m', type: 'hygiene' },
    { time: '10:00 AM', title: 'Root Canal Therapy', patient: 'Mike Davis', duration: '90m', type: 'treatment' },
    { time: '12:00 PM', title: 'Invisalign Consult', patient: 'Emma Wilson', duration: '30m', type: 'consult', ai: 'Smart Fill' },
  ];

  return (
    <section className="py-24 bg-white dark:bg-slate-950 overflow-hidden relative">
      
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/graphy.png')] opacity-[0.03]" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-teal-500/5 rounded-full blur-[120px]" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <div className="text-center mb-20 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 text-xs font-bold uppercase tracking-wider mb-6">
            <Icon name="Calendar" size={14} />
            <span>Smart Scheduling</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6 tracking-tight">
            An Appointment Book That <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-blue-600">
              Thinks Like You Do
            </span>
          </h2>
          
          <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
            Stop playing Tetris with your calendar. Our AI predicts procedure times, fills last-minute cancellations, 
            and optimizes your day for maximum productivity and minimum stress.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-24">
          {schedulingFeatures.map((feature, index) => (
            <div 
              key={index} 
              className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 hover:shadow-lg transition-all duration-300 group"
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-${feature.color}-50 dark:bg-${feature.color}-900/20 text-${feature.color}-600 group-hover:scale-110 transition-transform`}>
                <Icon name={feature.icon} size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{feature.title}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 h-10">{feature.description}</p>
              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide bg-${feature.color}-100 dark:bg-${feature.color}-900/30 text-${feature.color}-700 dark:text-${feature.color}-300`}>
                <Icon name="TrendingUp" size={12} />
                {feature.benefit}
              </div>
            </div>
          ))}
        </div>

        {/* Dashboard Visualization */}
        <div className="grid lg:grid-cols-12 gap-12 items-start">
          
          {/* Left: Schedule UI */}
          <div className="lg:col-span-7">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
              <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-700 dark:text-slate-200">Today, Feb 24</span>
                  <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full font-bold">98% Utilization</span>
                </div>
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-red-400" />
                  <div className="w-2 h-2 rounded-full bg-yellow-400" />
                  <div className="w-2 h-2 rounded-full bg-green-400" />
                </div>
              </div>
              
              <div className="p-6 space-y-4">
                {timelineEvents.map((event, i) => (
                  <div key={i} className="flex gap-4 relative">
                    {/* Time Column */}
                    <div className="w-20 text-right text-xs font-mono text-slate-400 pt-2 shrink-0">
                      {event.time}
                    </div>
                    
                    {/* Event Card */}
                    <div className={`flex-1 rounded-xl p-4 border relative ${
                      event.type === 'treatment' ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/30' :
                      event.type === 'hygiene' ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30' :
                      'bg-purple-50 dark:bg-purple-900/10 border-purple-100 dark:border-purple-900/30'
                    }`}>
                      {event.ai && (
                        <div className="absolute -top-2 -right-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg flex items-center gap-1">
                          <Icon name="Sparkles" size={10} /> {event.ai}
                        </div>
                      )}
                      
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-bold text-slate-900 dark:text-white text-sm">{event.title}</span>
                        <span className="text-xs font-mono text-slate-500">{event.duration}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <Icon name="User" size={12} /> {event.patient}
                      </div>
                    </div>
                  </div>
                ))}

                {/* AI Insight Box */}
                <div className="ml-24 mt-4 p-3 bg-blue-600/5 border border-blue-500/20 rounded-lg flex gap-3">
                  <Icon name="Lightbulb" size={18} className="text-blue-500 shrink-0 mt-0.5" />
                  <div className="text-xs text-blue-900 dark:text-blue-200">
                    <strong>Optimization Tip:</strong> You have a 45m gap at 2:00 PM. 
                    AI has identified 3 waitlisted patients who fit this slot perfectly. 
                    <span className="underline cursor-pointer ml-1 font-bold text-blue-600 dark:text-blue-400">View Candidates</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Metrics */}
          <div className="lg:col-span-5 space-y-8">
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/20 rounded-full blur-[50px]" />
              
              <h3 className="text-xl font-bold mb-6">Efficiency Pulse</h3>
              
              <div className="space-y-6">
                {[
                  { label: "Schedule Efficiency", val: "85%", color: "bg-teal-500" },
                  { label: "Patient Satisfaction", val: "92%", color: "bg-blue-500" },
                  { label: "On-Time Starts", val: "98%", color: "bg-purple-500" }
                ].map((stat, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-300">{stat.label}</span>
                      <span className="font-bold">{stat.val}</span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div className={`h-full ${stat.color} rounded-full`} style={{ width: stat.val }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Weekly Appts", val: "127", trend: "+12%" },
                { label: "No-Show Rate", val: "2.1%", trend: "-5%" },
                { label: "Revenue / Hr", val: "$480", trend: "+8%" },
                { label: "Admin Time", val: "-4h", trend: "Saved" }
              ].map((stat, i) => (
                <div key={i} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                  <div className="text-2xl font-bold text-slate-900 dark:text-white mb-1">{stat.val}</div>
                  <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">{stat.label}</div>
                  <div className="text-[10px] font-bold text-green-500 bg-green-50 dark:bg-green-900/20 py-0.5 px-2 rounded-full inline-block">
                    {stat.trend}
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

export default SmartSchedulingSection;