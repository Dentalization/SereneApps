import React from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const TestimonialsSection = () => {
  const testimonials = [
    {
      name: 'Dr. Elena Rostova, DDS',
      title: 'Cosmetic Dentist',
      practice: 'Aesthetics & Co.',
      location: 'New York, NY',
      verified: true,
      quote: "Patients used to look at 2D X-rays and just nod confusedly. Showing them the AI overlay changes everything—they actually see the decay. My case acceptance for preventative restorative work has jumped significantly because patients finally understand the urgency.",
      metrics: [
        { label: 'Case Acceptance', value: '+22%' },
        { label: 'Patient Consult Time', value: '-10m' }
      ],
      color: 'indigo'
    },
    {
      name: 'Dr. Marcus Thorne, DMD',
      title: 'Owner & Lead Dentist',
      practice: 'Thorne Family Dentistry',
      location: 'Austin, TX',
      verified: true,
      quote: "I run a practice with three associates. Calibrating diagnosis across four doctors is a nightmare. Serene AI acts as our objective baseline. It ensures Dr. A and Dr. B aren't diagnosing the same tooth differently. It’s a standardization tool as much as a diagnostic one.",
      metrics: [
        { label: 'Diagnostic Consistency', value: '100%' },
        { label: 'Monthly Revenue', value: '+15%' }
      ],
      color: 'blue'
    },
    {
      name: 'Dr. Sarah Jenkins, BDS',
      title: 'Endodontist',
      practice: 'Brighton Endo Center',
      location: 'London, UK',
      verified: true,
      quote: "I was skeptical. I didn't think I needed AI to read a PA. But it picks up early apical radiolucencies that—I admit—I might gloss over during a busy afternoon rush. It’s a safety net I didn't know I needed until it saved me from a missed diagnosis.",
      metrics: [
        { label: 'Early Detection', value: 'High' },
        { label: 'Risk Reduction', value: 'Significant' }
      ],
      color: 'teal'
    }
  ];

  const stats = [
    { value: '2,800+', label: 'Partner Clinics', icon: 'Building', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { value: '3M+', label: 'Images Analyzed', icon: 'Database', color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
    { value: '99.9%', label: 'Uptime SLA', icon: 'Server', color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
    { value: '4.9/5', label: 'Capterra Rating', icon: 'Star', color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' }
  ];

  return (
    <section className="py-24 bg-slate-50 dark:bg-slate-950 overflow-hidden relative">
      
      {/* Background Decor */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/clean-gray-paper.png')] opacity-[0.4] mix-blend-multiply dark:opacity-[0.05]" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <div className="text-center mb-20 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-bold uppercase tracking-wider mb-6">
            <Icon name="MessageSquare" size={14} />
            <span>Peer Reviews</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6 tracking-tight">
            Not Just Hype. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              Real Clinical Impact.
            </span>
          </h2>
          
          <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
            From solo practitioners to multi-location DSOs, dental professionals rely on Serene AI 
            to standardize care and boost patient confidence.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid lg:grid-cols-3 gap-8 mb-24">
          {testimonials.map((testimonial, index) => (
            <div 
              key={index} 
              className="flex flex-col bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative group"
            >
              {/* Decorative Quote Icon */}
              <div className="absolute top-6 right-8 text-slate-100 dark:text-slate-800 pointer-events-none">
                <Icon name="Quote" size={64} className="opacity-50" />
              </div>

              {/* Profile Header */}
              <div className="flex items-center gap-4 mb-6 relative z-10">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold bg-gradient-to-br from-${testimonial.color}-500 to-${testimonial.color}-700 shadow-md`}>
                  {testimonial.name.charAt(4)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">{testimonial.name}</h4>
                    {testimonial.verified && (
                      <Icon name="CheckCircle" size={14} className="text-blue-500" />
                    )}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">{testimonial.title}</div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wide">{testimonial.practice}</div>
                </div>
              </div>

              {/* Quote */}
              <blockquote className="flex-1 text-slate-600 dark:text-slate-300 text-sm leading-relaxed italic mb-8 relative z-10">
                "{testimonial.quote}"
              </blockquote>

              {/* Divider */}
              <div className="h-px bg-slate-100 dark:bg-slate-800 mb-6" />

              {/* Metrics Row */}
              <div className="grid grid-cols-2 gap-4">
                {testimonial.metrics.map((metric, i) => (
                  <div key={i}>
                    <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">{metric.label}</div>
                    <div className={`text-lg font-bold text-${testimonial.color}-600 dark:text-${testimonial.color}-400`}>
                      {metric.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Stats Section */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 shadow-lg">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:divide-x dark:divide-slate-800">
            {stats.map((stat, index) => (
              <div key={index} className="flex flex-col items-center text-center p-2">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${stat.bg} ${stat.color} transition-transform hover:scale-110`}>
                  <Icon name={stat.icon} size={28} />
                </div>
                <div className="text-3xl font-extrabold text-slate-900 dark:text-white mb-1">{stat.value}</div>
                <div className="text-sm text-slate-500 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-20 text-center">
          <p className="text-slate-500 mb-6">Want to see the difference in your own practice?</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 px-8 py-3 shadow-lg"
              iconName="ArrowRight"
              iconPosition="right"
            >
              Read Full Case Studies
            </Button>
          </div>
        </div>

      </div>
    </section>
  );
};

export default TestimonialsSection;