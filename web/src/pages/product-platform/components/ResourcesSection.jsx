import React from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const ResourcesSection = () => {
  // DATA: Based on real-world Dental AI research trends
  const whitepapers = [
    {
      id: 1,
      title: "Benchmarking YOLOv8 for Interproximal Caries Detection",
      description: "A comparative study analyzing the sensitivity and specificity of single-stage object detectors versus traditional CNNs on panoramic radiographs.",
      type: "Technical Report",
      meta: "Published Q3 2025 • 42 Pages",
      icon: "FileText",
      color: "blue"
    },
    {
      id: 2,
      title: "AI-Assisted Teledentistry: Economic Impact Analysis",
      description: "Quantifying the ROI of deploying AI diagnostic tools in rural clinics. Analysis of patient throughput and referral accuracy over 12 months.",
      type: "Business Case",
      meta: "Case Study • 18 Pages",
      icon: "TrendingUp",
      color: "green"
    },
    {
      id: 3,
      title: "Clinical Implementation Guide: The Hybrid Workflow",
      description: "Best practices for integrating AI 'Second Opinions' into patient consultations without disrupting chair-side efficiency.",
      type: "Clinical Guide",
      meta: "Updated Jan 2026 • 24 Pages",
      icon: "BookOpen",
      color: "purple"
    }
  ];

  const caseStudies = [
    {
      id: 1,
      title: "High-Volume Clinic Optimization",
      clinic: "Metro Dental Group",
      location: "Jakarta, ID",
      metric: "+40%",
      label: "Detection Rate",
      description: "How AI screening caught early-stage pathologies missed during rush hours.",
      image: "/assets/imagesTesting/test1.png" // Local Image
    },
    {
      id: 2,
      title: "Remote Screening Pilot",
      clinic: "Nusantara Health Initiative",
      location: "Kalimantan, ID",
      metric: "15min",
      label: "Time Saved/Patient",
      description: "Enabling remote triage for specialists using AI-annotated X-rays.",
      image: "/assets/imagesTesting/test3.png" // Local Image
    },
    {
      id: 3,
      title: "Orthodontic Pre-Assessment",
      clinic: "SmileAlign Center",
      location: "Singapore",
      metric: "98%",
      label: "Measurement Accuracy",
      description: "Automating cephalometric tracing and landmark detection.",
      image: "/assets/imagesTesting/test2.png" // Local Image
    }
  ];

  return (
    <section className="relative py-24 bg-slate-50 dark:bg-slate-950 overflow-hidden">
      
      {/* Background Decor */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03]" />
      <div className="absolute bottom-0 left-0 w-full h-[500px] bg-gradient-to-t from-blue-50 dark:from-blue-900/10 to-transparent" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold uppercase tracking-wider mb-6">
            <Icon name="Book" size={14} />
            <span>Knowledge Hub</span>
          </div>
          
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-6 tracking-tight">
            Research & <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Evidence</span>
          </h2>
          
          <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
            Explore our library of peer-reviewed papers, clinical validation studies, and success stories 
            that define the new standard in dental diagnostics.
          </p>
        </div>

        {/* Whitepapers Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-20">
          {whitepapers.map((paper) => (
            <div 
              key={paper.id} 
              className="group relative bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col"
            >
              <div className="flex items-center justify-between mb-6">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-${paper.color}-50 dark:bg-${paper.color}-900/20 text-${paper.color}-600 dark:text-${paper.color}-400`}>
                  <Icon name={paper.icon} size={24} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                  {paper.type}
                </span>
              </div>
              
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3 group-hover:text-blue-600 transition-colors">
                {paper.title}
              </h3>
              
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-6 flex-grow">
                {paper.description}
              </p>
              
              <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">{paper.meta}</span>
                <button className="text-blue-600 dark:text-blue-400 hover:text-blue-700 font-semibold text-sm flex items-center gap-1">
                  Access <Icon name="ArrowRight" size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Case Studies Section */}
        <div className="mb-20">
          <div className="flex flex-col md:flex-row justify-between items-end mb-10 gap-4">
            <div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Impact Stories</h3>
              <p className="text-slate-500">Real clinics achieving real results.</p>
            </div>
            <Button variant="outline" iconName="ExternalLink" iconPosition="right">
              View All Stories
            </Button>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {caseStudies.map((study) => (
              <div key={study.id} className="group relative overflow-hidden rounded-2xl bg-slate-900 shadow-lg">
                
                {/* Image Background with Overlay */}
                <div className="absolute inset-0">
                  <img 
                    src={study.image} 
                    alt={study.title} 
                    className="w-full h-full object-cover opacity-60 group-hover:opacity-40 group-hover:scale-105 transition-all duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />
                </div>

                <div className="relative p-8 h-full flex flex-col justify-end min-h-[320px]">
                  {/* Floating Metric */}
                  <div className="absolute top-6 right-6 bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2 rounded-lg text-center">
                    <div className="text-2xl font-bold text-white">{study.metric}</div>
                    <div className="text-[10px] text-slate-300 uppercase tracking-wider">{study.label}</div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-blue-300 uppercase tracking-wider">
                      <Icon name="MapPin" size={12} /> {study.location}
                    </div>
                    <h4 className="text-xl font-bold text-white">{study.title}</h4>
                    <p className="text-slate-300 text-sm leading-relaxed line-clamp-2">
                      {study.description}
                    </p>
                  </div>
                  
                  <div className="mt-6 pt-4 border-t border-white/10 flex items-center gap-2 text-white/60 text-xs">
                    <Icon name="Stethoscope" size={14} />
                    <span>{study.clinic}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Scientific Validation Banner */}
        <div className="relative rounded-[2rem] bg-gradient-to-br from-blue-900 to-slate-900 p-10 lg:p-16 text-white overflow-hidden shadow-2xl">
          {/* Abstract Pattern */}
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-white/5 rounded-full blur-[120px] pointer-events-none" />
          
          <div className="relative z-10 grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 text-blue-300 mb-6">
                <Icon name="Award" size={24} />
                <span className="text-sm font-bold uppercase tracking-widest">Scientific Rigor</span>
              </div>
              <h3 className="text-3xl lg:text-4xl font-bold mb-6 leading-tight">
                Peer-Reviewed & <br />Clinically Validated
              </h3>
              <p className="text-slate-300 text-lg mb-8 leading-relaxed">
                Our YOLOv8 architecture isn't just fast; it's proven. Validated against a dataset of 35,000+ labeled radiographs with ground truth established by a consensus of 3 senior radiologists.
              </p>
              
              <div className="flex flex-wrap gap-4">
                <Button className="bg-white text-blue-900 hover:bg-blue-50 border-none shadow-lg">
                  Read Validation Study
                </Button>
                <Button variant="outline" className="text-white border-white/30 hover:bg-white/10">
                  Download Whitepaper
                </Button>
              </div>
            </div>

            {/* Validation Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { val: "35k+", label: "Training Dataset", sub: "Annotated Images" },
                { val: "94.7%", label: "Sensitivity", sub: "Caries Detection" },
                { val: "96.2%", label: "Specificity", sub: "False Positive Rate <4%" },
                { val: "15", label: "Partner Sites", sub: "Multi-center Trial" }
              ].map((stat, i) => (
                <div key={i} className="bg-white/5 backdrop-blur-sm border border-white/10 p-6 rounded-2xl hover:bg-white/10 transition-colors">
                  <div className="text-3xl font-bold text-white mb-1">{stat.val}</div>
                  <div className="text-sm font-bold text-blue-300">{stat.label}</div>
                  <div className="text-xs text-slate-400 mt-1">{stat.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};

export default ResourcesSection;