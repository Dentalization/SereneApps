import React, { useState } from 'react';
import Button from '../../../components/ui/Button';
import Image from '../../../components/AppImage';
import Icon from '../../../components/AppIcon';

const PatientSuccessStories = () => {
  const [activeStory, setActiveStory] = useState(0);

  const successStories = [
    {
      id: 1,
      name: 'Jessica M.',
      age: 29,
      location: 'Portland, OR',
      avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
      diagnosis: 'Interproximal Caries (Early Stage)',
      story: "I had zero pain, so I skipped the dentist for 2 years. I scanned my teeth with Serene AI just out of curiosity. It flagged a shadow between my molars. My dentist confirmed it was a 'hidden' cavity that would have needed a root canal if I waited another 6 months.",
      outcome: 'Simple filling performed. No root canal needed.',
      savings: '$1,800',
      timeSaved: '3 Dental Visits',
      rating: 5,
      images: {
        before: 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=400&q=80',
        after: 'https://images.unsplash.com/photo-1609840114035-3c981b782dfe?auto=format&fit=crop&w=400&q=80'
      },
      color: 'blue'
    },
    {
      id: 2,
      name: 'David K.',
      age: 45,
      location: 'Chicago, IL',
      avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
      diagnosis: 'Gingivitis & Recession',
      story: "My gums bleed sometimes, but I thought it was normal brushing pressure. The AI analysis showed my gum recession score was deteriorating. It gave me a wake-up call to start flossing daily and book a deep cleaning before it turned into periodontal disease.",
      outcome: 'Reversed gingivitis symptoms in 4 weeks.',
      savings: '$4,500 (Potential Surgery)',
      timeSaved: 'Years of Maintenance',
      rating: 5,
      images: {
        before: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=400&q=80',
        after: 'https://images.unsplash.com/photo-1598256989800-fe5f95da9787?auto=format&fit=crop&w=400&q=80'
      },
      color: 'green'
    },
    {
      id: 3,
      name: 'Sophie T.',
      age: 22,
      location: 'Boston, MA',
      avatar: 'https://randomuser.me/api/portraits/women/68.jpg',
      diagnosis: 'Impacted Wisdom Tooth',
      story: "I had a dull ache in my jaw. The app's preliminary scan suggested potential crowding from my wisdom tooth. I took the report to an oral surgeon who said the early warning allowed us to extract it before it damaged the adjacent molar.",
      outcome: 'Preventative extraction. Adjacent tooth saved.',
      savings: '$2,200',
      timeSaved: 'Emergency ER Trip',
      rating: 5,
      images: {
        before: 'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?auto=format&fit=crop&w=400&q=80',
        after: 'https://images.pexels.com/photos/3845810/pexels-photo-3845810.jpeg?auto=format&fit=crop&w=400&q=80'
      },
      color: 'purple'
    }
  ];

  const nextStory = () => setActiveStory((prev) => (prev + 1) % successStories.length);
  const prevStory = () => setActiveStory((prev) => (prev - 1 + successStories.length) % successStories.length);
  const current = successStories[activeStory];

  return (
    <section className="py-24 bg-white dark:bg-slate-950 overflow-hidden relative">
      
      {/* Decor */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/graphy.png')] opacity-[0.03]" />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold uppercase tracking-wider mb-6">
            <Icon name="Heart" size={14} />
            <span>Patient Impact</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6">
            Stories of <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Prevention</span>
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            See how catching issues early changed the trajectory of these patients' oral health (and bank accounts).
          </p>
        </div>

        {/* Main Story Card */}
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden relative">
          
          <div className="grid lg:grid-cols-2">
            
            {/* Left: Content */}
            <div className="p-8 lg:p-12 flex flex-col justify-center">
              
              {/* Header */}
              <div className="flex items-center gap-4 mb-8">
                <Image src={current.avatar} alt={current.name} className="w-16 h-16 rounded-full border-4 border-slate-50 dark:border-slate-800 shadow-md" />
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">{current.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Icon name="MapPin" size={14} /> {current.location}
                  </div>
                </div>
                <div className="ml-auto flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Icon key={i} name="Star" size={16} className="text-amber-400 fill-current" />
                  ))}
                </div>
              </div>

              {/* Diagnosis Badge */}
              <div className="mb-6">
                 <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-${current.color}-50 dark:bg-${current.color}-900/20 text-${current.color}-700 dark:text-${current.color}-300 text-sm font-bold border border-${current.color}-200 dark:border-${current.color}-800`}>
                   <Icon name="Activity" size={16} />
                   Diagnosis: {current.diagnosis}
                 </span>
              </div>

              <blockquote className="text-xl text-slate-700 dark:text-slate-300 italic mb-8 leading-relaxed">
                "{current.story}"
              </blockquote>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-950 rounded-2xl p-6 border border-slate-100 dark:border-slate-800">
                <div>
                  <div className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Estimated Savings</div>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">{current.savings}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Avoided</div>
                  <div className="text-lg font-bold text-slate-700 dark:text-slate-300">{current.timeSaved}</div>
                </div>
              </div>

            </div>

            {/* Right: Before/After Visuals */}
            <div className="bg-slate-100 dark:bg-slate-950 p-8 lg:p-12 flex flex-col justify-center border-l border-slate-200 dark:border-slate-800">
              <h4 className="text-center text-sm font-bold text-slate-500 uppercase tracking-wider mb-6">Visual Progression</h4>
              
              <div className="flex gap-4 h-64">
                <div className="flex-1 relative rounded-2xl overflow-hidden group">
                  <Image src={current.images.before} alt="Before" className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm text-white text-xs font-bold px-3 py-1 rounded-full">
                    Initial Scan
                  </div>
                </div>
                <div className="flex-1 relative rounded-2xl overflow-hidden group">
                  <Image src={current.images.after} alt="After" className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute top-3 left-3 bg-green-600/90 backdrop-blur-sm text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                    <Icon name="Check" size={12} /> Post-Treatment
                  </div>
                </div>
              </div>

              <div className="mt-8 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start gap-3">
                <Icon name="CheckCircle" size={20} className="text-green-500 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase">Clinical Outcome</div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {current.outcome}
                  </p>
                </div>
              </div>
            </div>

          </div>

          {/* Controls */}
          <div className="absolute bottom-0 left-0 w-full p-4 flex justify-between pointer-events-none">
             <button onClick={prevStory} className="pointer-events-auto w-10 h-10 rounded-full bg-white dark:bg-slate-800 shadow-lg flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
               <Icon name="ChevronLeft" size={20} className="text-slate-600 dark:text-slate-300" />
             </button>
             <button onClick={nextStory} className="pointer-events-auto w-10 h-10 rounded-full bg-white dark:bg-slate-800 shadow-lg flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
               <Icon name="ChevronRight" size={20} className="text-slate-600 dark:text-slate-300" />
             </button>
          </div>

        </div>

        {/* Global Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-16 text-center">
           {[
             { val: "94%", label: "Early Detection Rate" },
             { val: "$1,200", label: "Avg. Patient Savings" },
             { val: "15k+", label: "Issues Resolved" },
             { val: "24/7", label: "Peace of Mind" }
           ].map((stat, i) => (
             <div key={i}>
               <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">{stat.val}</div>
               <div className="text-sm text-slate-500">{stat.label}</div>
             </div>
           ))}
        </div>

      </div>
    </section>
  );
};

export default PatientSuccessStories;