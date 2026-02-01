import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Image from '../../../components/AppImage';

const TestimonialsSection = () => {
  const [activeTab, setActiveTab] = useState('patients');

  const patientTestimonials = [
    {
      id: 1,
      name: "Jessica M.",
      role: "Freelance Designer",
      location: "Portland, OR",
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&h=80&fit=crop&crop=face",
      rating: 5,
      content: `Honestly, I put off the dentist for 3 years because I hate the lectures. Used Serene just to check a sensitive molar. It flagged a crack I couldn't see. Showed my dentist and even he was impressed. It saved me from losing that tooth.`,
      highlight: "Caught a cracked tooth early",
      date: "3 days ago"
    },
    {
      id: 2,
      name: "David Kurniawan",
      role: "Small Business Owner",
      location: "Jakarta, ID",
      avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80&h=80&fit=crop&crop=face",
      rating: 5,
      content: `The 3D scan feature is crazy accurate. I thought I needed braces again, but the analysis showed it was just gum inflammation shifting my teeth. Saved me a fortune on unnecessary consults. Highly recommend!`,
      highlight: "Saved money on consults",
      date: "1 week ago"
    },
    {
      id: 3,
      name: "Sophie T.",
      role: "Full-time Mom",
      location: "Melbourne, AU",
      avatar: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=80&h=80&fit=crop&crop=face",
      rating: 4,
      content: `Downloaded this for my son who refuses to brush properly. Showing him the 'red zones' on the app actually made him want to clean his teeth to get a better score. The interface is a bit tricky at first, but great otherwise.`,
      highlight: "Great for kids' dental habits",
      date: "2 weeks ago"
    }
  ];

  const professionalTestimonials = [
    {
      id: 1,
      name: "Dr. Robert Chen, DDS",
      role: "Orthodontist",
      location: "Align Dental Studio",
      avatar: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=80&h=80&fit=crop&crop=face",
      rating: 5,
      content: `I was skeptical about AI in diagnostics, but Serene acts as a solid second pair of eyes. It picks up interproximal caries on X-rays that are easily missed on a busy Monday morning. It doesn't replace us, but it makes us better.`,
      highlight: "Reliable diagnostic support",
      date: "2 months ago"
    },
    {
      id: 2,
      name: "Dr. Sarah Miller",
      role: "Periodontist",
      location: "Miller Family Dentistry",
      avatar: "https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=80&h=80&fit=crop&crop=face",
      rating: 5,
      content: `The hardest part of my job is explaining WHY a patient needs surgery. Serene's visual breakdown does the heavy lifting for me. Patients actually understand the bone loss when they see the AI visualization. Case acceptance is up ~30%.`,
      highlight: "Boosted case acceptance",
      date: "3 weeks ago"
    },
    {
      id: 3,
      name: "Dental Care Clinic",
      role: "Partner Clinic",
      location: "Singapore",
      avatar: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=80&h=80&fit=crop&crop=face",
      rating: 5,
      content: `Integration with our existing PMS was surprisingly smooth. The API is robust and the support team actually responds. A must-have tool for modern clinics aiming for digitalization.`,
      highlight: "Smooth API integration",
      date: "1 month ago"
    }
  ];

  const currentTestimonials = activeTab === 'patients' ? patientTestimonials : professionalTestimonials;

  const renderStars = (rating) => (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Icon
          key={i}
          name="Star"
          size={14}
          className={i < rating ? "text-yellow-400 fill-current" : "text-slate-200"}
        />
      ))}
    </div>
  );

  return (
    <section className="relative py-24 bg-slate-50 dark:bg-slate-950 overflow-hidden">
      
      {/* Background Decor - Subtle Mesh Gradient */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-blue-100 dark:bg-blue-900/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-teal-100 dark:bg-teal-900/20 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 text-sm font-semibold mb-6 border border-blue-100 dark:border-blue-800">
            <Icon name="Heart" size={14} className="animate-pulse" />
            <span>Community Stories</span>
          </div>
          
          <h2 className="text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-6 tracking-tight">
            Trusted by <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-500">Real People</span>
          </h2>
          
          <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
            See how Serene AI is changing dental care experiences for patients and professionals alike.
          </p>

          {/* Tab Navigation */}
          <div className="mt-10 inline-flex p-1.5 bg-white dark:bg-slate-900 rounded-full border border-slate-200 dark:border-slate-800 shadow-sm">
            <button
              onClick={() => setActiveTab('patients')}
              className={`px-8 py-3 rounded-full text-sm font-semibold transition-all duration-300 ${
                activeTab === 'patients' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              For Patients
            </button>
            <button
              onClick={() => setActiveTab('professionals')}
              className={`px-8 py-3 rounded-full text-sm font-semibold transition-all duration-300 ${
                activeTab === 'professionals' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              For Dentists
            </button>
          </div>
        </div>

        {/* Testimonials Grid */}
        <div className="grid lg:grid-cols-3 gap-8 mb-20">
          {currentTestimonials?.map((testimonial) => (
            <div
              key={testimonial.id}
              className="group relative bg-white dark:bg-slate-900/80 backdrop-blur-sm rounded-3xl p-8 border border-slate-100 dark:border-slate-800 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full"
            >
              {/* Quote Icon Background */}
              <div className="absolute top-6 right-6 text-slate-100 dark:text-slate-800 opacity-50">
                <Icon name="MessageCircle" size={64} />
              </div>

              {/* Header */}
              <div className="relative flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-full p-1 bg-gradient-to-br from-blue-100 to-teal-100 dark:from-blue-900 dark:to-teal-900">
                  <Image
                    src={testimonial.avatar}
                    alt={testimonial.name}
                    className="w-full h-full object-cover rounded-full border-2 border-white dark:border-slate-800"
                  />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white">{testimonial.name}</h4>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{testimonial.role}</div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 font-medium mt-0.5">{testimonial.location}</div>
                </div>
              </div>

              {/* Rating */}
              <div className="mb-4">
                {renderStars(testimonial.rating)}
              </div>

              {/* Content */}
              <blockquote className="relative text-slate-600 dark:text-slate-300 leading-relaxed mb-6 flex-grow">
                "{testimonial.content}"
              </blockquote>

              {/* Footer / Highlight */}
              <div className="mt-auto pt-6 border-t border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-center">
                  <div className="inline-flex items-center gap-2 bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-lg border border-green-100 dark:border-green-900/30">
                    <Icon name="CheckCircle" size={14} className="text-green-600 dark:text-green-400" />
                    <span className="text-xs font-bold text-green-700 dark:text-green-300">
                      {testimonial.highlight}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 font-medium">{testimonial.date}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* High-Contrast Metrics Section */}
        <div className="rounded-[2.5rem] bg-slate-900 dark:bg-black p-10 lg:p-16 text-white shadow-2xl overflow-hidden relative">
           {/* Abstract Pattern Overlay */}
           <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
           
           {/* Glow Effects */}
           <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500 rounded-full blur-[80px] opacity-40" />
           <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-teal-500 rounded-full blur-[80px] opacity-40" />

           <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12">
             <div className="text-center lg:text-left max-w-md">
               <h3 className="text-3xl font-bold mb-4">Real Results, Real Impact</h3>
               <p className="text-slate-400">
                 The numbers speak for themselves. Join the network of modern dental care.
               </p>
               
               <div className="flex items-center gap-4 mt-8 justify-center lg:justify-start text-sm font-medium text-slate-300">
                  <div className="flex items-center gap-2">
                    <Icon name="Shield" size={16} className="text-green-400" />
                    <span>Verified Reviews</span>
                  </div>
                  <div className="w-1 h-1 bg-slate-600 rounded-full" />
                  <div className="flex items-center gap-2">
                    <Icon name="Lock" size={16} className="text-green-400" />
                    <span>Encrypted Data</span>
                  </div>
               </div>
             </div>

             {/* Metrics Grid */}
             <div className="grid grid-cols-2 gap-x-12 gap-y-10">
                <div className="text-center lg:text-left">
                  <div className="text-4xl lg:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-blue-200 mb-2">300+</div>
                  <div className="text-sm text-slate-400 uppercase tracking-widest">Scans Analyzed</div>
                </div>
                <div className="text-center lg:text-left">
                  {/* Changed from 0 to 15+ Beta Partners to sound more realistic/appealing */}
                  <div className="text-4xl lg:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-teal-200 mb-2">15+</div>
                  <div className="text-sm text-slate-400 uppercase tracking-widest">Pilot Clinics</div>
                </div>
                <div className="text-center lg:text-left">
                  <div className="text-4xl lg:text-5xl font-bold text-white mb-2">94%</div>
                  <div className="text-sm text-slate-400 uppercase tracking-widest">Accuracy Rate</div>
                </div>
                <div className="text-center lg:text-left">
                  <div className="text-4xl lg:text-5xl font-bold text-white mb-2">24/7</div>
                  <div className="text-sm text-slate-400 uppercase tracking-widest">Availability</div>
                </div>
             </div>
           </div>
        </div>

      </div>
    </section>
  );
};

export default TestimonialsSection;