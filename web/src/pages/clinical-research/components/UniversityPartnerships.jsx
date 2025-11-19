import React from 'react';
import Icon from '../../../components/AppIcon';
import Image from '../../../components/AppImage';

const UniversityPartnerships = () => {
  const partnerships = [
    {
      id: 1,
      name: "Harvard School of Dental Medicine",
      location: "Boston, MA",
      partnership: "Research Collaboration",
      duration: "2021 - Present",
      focus: "AI-powered caries detection and treatment planning optimization",
      logo: "https://images.unsplash.com/photo-1562774053-701939374585?w=100&h=100&fit=crop&crop=center",
      principalInvestigator: "Dr. Sarah Chen, DMD, PhD",
      studySize: "1,200 patients",
      status: "active",
      publications: 4,
      description: "Collaborative research on deep learning applications in restorative dentistry, focusing on early caries detection and minimally invasive treatment protocols."
    },
    {
      id: 2,
      name: "University of California, San Francisco",
      location: "San Francisco, CA",
      partnership: "Clinical Validation Study",
      duration: "2022 - Present",
      focus: "Periodontal disease progression monitoring using AI analysis",
      logo: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=100&h=100&fit=crop&crop=center",
      principalInvestigator: "Dr. Michael Rodriguez, DDS, MS",
      studySize: "850 patients",
      status: "active",
      publications: 3,
      description: "Multi-year longitudinal study tracking periodontal disease progression and treatment outcomes with AI-assisted diagnosis and monitoring."
    },
    {
      id: 3,
      name: "University of Pennsylvania",
      location: "Philadelphia, PA",
      partnership: "Technology Development",
      duration: "2020 - 2023",
      focus: "Oral pathology screening and cancer detection algorithms",
      logo: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=100&h=100&fit=crop&crop=center",
      principalInvestigator: "Dr. Lisa Wang, DMD, PhD",
      studySize: "2,100 patients",
      status: "completed",
      publications: 5,
      description: "Comprehensive development and validation of machine learning models for oral cancer and precancer detection in clinical settings."
    },
    {
      id: 4,
      name: "Stanford University School of Medicine",
      location: "Stanford, CA",
      partnership: "Innovation Lab",
      duration: "2023 - Present",
      focus: "Next-generation AI models for comprehensive oral health assessment",
      logo: "https://images.unsplash.com/photo-1607237138185-eedd9c632b0b?w=100&h=100&fit=crop&crop=center",
      principalInvestigator: "Dr. James Thompson, MD, DDS",
      studySize: "In planning",
      status: "planning",
      publications: 0,
      description: "Cutting-edge research into multimodal AI systems combining visual, clinical, and patient history data for holistic oral health assessment."
    },
    {
      id: 5,
      name: "University of Michigan School of Dentistry",
      location: "Ann Arbor, MI",
      partnership: "Educational Initiative",
      duration: "2022 - Present",
      focus: "AI integration in dental education and clinical training",
      logo: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=100&h=100&fit=crop&crop=center",
      principalInvestigator: "Dr. Maria Garcia, DDS, EdD",
      studySize: "300 students",
      status: "active",
      publications: 2,
      description: "Pioneering curriculum development for AI-assisted dentistry education, training the next generation of tech-savvy dental professionals."
    },
    {
      id: 6,
      name: "Johns Hopkins University",
      location: "Baltimore, MD",
      partnership: "Regulatory Science",
      duration: "2023 - Present",
      focus: "FDA approval pathways and regulatory compliance for dental AI",
      logo: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=100&h=100&fit=crop&crop=center",
      principalInvestigator: "Dr. David Kim, MD, JD",
      studySize: "Regulatory focus",
      status: "active",
      publications: 1,
      description: "Strategic research on regulatory pathways for AI medical devices in dentistry, ensuring compliance and accelerating market access."
    }
  ];

  const ongoingStudies = [
    {
      title: "Multi-Modal AI for Comprehensive Oral Health Assessment",
      institution: "Stanford University",
      phase: "Phase II Clinical Trial",
      participants: "500 patients",
      timeline: "2024-2026",
      description: "Evaluating integrated AI system combining intraoral imaging, radiographs, and clinical data for comprehensive oral health assessment."
    },
    {
      title: "AI-Assisted Orthodontic Treatment Planning",
      institution: "Harvard School of Dental Medicine",
      phase: "Validation Study",
      participants: "300 patients",
      timeline: "2024-2025",
      description: "Validating AI algorithms for automated orthodontic analysis and treatment planning in diverse patient populations."
    },
    {
      title: "Pediatric Dental AI Adaptation Study",
      institution: "University of Michigan",
      phase: "Pilot Study",
      participants: "150 children",
      timeline: "2024-2025",
      description: "Adapting AI diagnostic tools for pediatric dentistry with age-specific algorithms and child-friendly interfaces."
    }
  ];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center space-x-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Icon name="GraduationCap" size={16} />
            <span>Academic Partnerships</span>
          </div>
          <h2 className="text-4xl font-bold text-text-primary mb-4">
            University Collaborations
          </h2>
          <p className="text-xl text-text-secondary max-w-3xl mx-auto">
            Partnering with leading academic institutions to advance dental AI research, validate clinical applications, and train the next generation of dental professionals.
          </p>
        </div>

        {/* Partnership Grid */}
        <div className="grid lg:grid-cols-2 gap-8 mb-16">
          {partnerships?.map((partnership) => (
            <div key={partnership?.id} className="bg-card rounded-xl p-8 border border-border hover-lift shadow-brand">
              <div className="flex items-start space-x-4 mb-6">
                <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                  <Image 
                    src={partnership?.logo} 
                    alt={`${partnership?.name} logo`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-text-primary mb-1">
                    {partnership?.name}
                  </h3>
                  <p className="text-text-secondary text-sm mb-2">
                    {partnership?.location}
                  </p>
                  <div className="flex items-center space-x-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      partnership?.status === 'active' ?'bg-success/10 text-success' 
                        : partnership?.status === 'completed' ?'bg-primary/10 text-primary' :'bg-warning/10 text-warning'
                    }`}>
                      {partnership?.status?.charAt(0)?.toUpperCase() + partnership?.status?.slice(1)}
                    </span>
                    <span className="text-xs text-text-secondary">
                      {partnership?.duration}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-text-primary mb-2">
                    {partnership?.partnership}
                  </h4>
                  <p className="text-text-secondary text-sm leading-relaxed">
                    {partnership?.description}
                  </p>
                </div>

                <div className="bg-muted rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-text-secondary">Principal Investigator</div>
                      <div className="font-medium text-text-primary">
                        {partnership?.principalInvestigator}
                      </div>
                    </div>
                    <div>
                      <div className="text-text-secondary">Study Size</div>
                      <div className="font-medium text-text-primary">
                        {partnership?.studySize}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-sm text-text-secondary">
                    Focus: {partnership?.focus}
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <Icon name="FileText" size={14} className="text-primary" />
                    <span className="text-text-secondary">
                      {partnership?.publications} publications
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Ongoing Studies */}
        <div className="bg-muted rounded-2xl p-8">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-text-primary mb-2">
              Ongoing Research Studies
            </h3>
            <p className="text-text-secondary">
              Current clinical trials and validation studies advancing dental AI
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {ongoingStudies?.map((study, index) => (
              <div key={index} className="bg-white rounded-xl p-6 hover-lift shadow-brand">
                <div className="flex items-center space-x-2 mb-3">
                  <div className="w-3 h-3 bg-success rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-success">Active Study</span>
                </div>
                
                <h4 className="font-semibold text-text-primary mb-2 leading-tight">
                  {study?.title}
                </h4>
                
                <div className="space-y-2 text-sm text-text-secondary mb-4">
                  <div className="flex items-center space-x-2">
                    <Icon name="Building" size={14} />
                    <span>{study?.institution}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Icon name="Users" size={14} />
                    <span>{study?.participants}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Icon name="Calendar" size={14} />
                    <span>{study?.timeline}</span>
                  </div>
                </div>
                
                <p className="text-sm text-text-secondary leading-relaxed">
                  {study?.description}
                </p>
                
                <div className="mt-4 pt-4 border-t border-border">
                  <span className="inline-block bg-primary/10 text-primary px-2 py-1 rounded text-xs font-medium">
                    {study?.phase}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Partnership Stats */}
        <div className="mt-16 text-center">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="text-3xl font-bold text-primary mb-2">8</div>
              <div className="text-text-secondary">University Partners</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-2">5,000+</div>
              <div className="text-text-secondary">Study Participants</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-2">15</div>
              <div className="text-text-secondary">Joint Publications</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-2">$2.3M</div>
              <div className="text-text-secondary">Research Funding</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default UniversityPartnerships;