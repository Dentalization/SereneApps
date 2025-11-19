import React from 'react';
import Icon from '../../../components/AppIcon';
import Image from '../../../components/AppImage';

const AdvisoryBoard = () => {
  const boardMembers = [
    {
      id: 1,
      name: "Dr. Sarah Chen",
      title: "Chief Clinical Advisor",
      credentials: "DMD, PhD, FAGD",
      institution: "Harvard School of Dental Medicine",
      specialization: "Restorative Dentistry & AI Applications",
      experience: "20+ years",
      photo: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=300&h=300&fit=crop&crop=face",
      bio: `Dr. Chen is a renowned expert in restorative dentistry and AI applications in dental practice. She has published over 85 peer-reviewed articles and leads the AI integration program at Harvard School of Dental Medicine.`,
      contributions: [
        "Led clinical validation studies for caries detection algorithms",
        "Developed training protocols for AI-assisted diagnosis",
        "Published 15+ papers on dental AI applications",
        "Mentored 50+ dental professionals in AI adoption"
      ],
      achievements: [
        "ADA Innovation Award 2023",
        "IADR Distinguished Scientist Award",
        "Top 40 Under 40 in Dentistry"
      ]
    },
    {
      id: 2,
      name: "Dr. Michael Rodriguez",
      title: "Periodontal Research Director",
      credentials: "DDS, MS, Diplomate ABP",
      institution: "University of California, San Francisco",
      specialization: "Periodontology & Digital Diagnostics",
      experience: "18+ years",
      photo: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=300&h=300&fit=crop&crop=face",
      bio: `Dr. Rodriguez specializes in periodontal disease diagnosis and treatment, with extensive research in digital diagnostic tools. He has been instrumental in validating AI algorithms for periodontal assessment.`,
      contributions: [
        "Pioneered AI-based periodontal staging protocols",
        "Conducted multi-center validation studies",
        "Developed clinical guidelines for AI integration",
        "Trained over 200 periodontists in AI applications"
      ],
      achievements: [
        "AAP Clinical Research Award",
        "IADR Periodontal Research Group Award",
        "Editor, Journal of Periodontology"
      ]
    },
    {
      id: 3,
      name: "Dr. Lisa Wang",
      title: "Oral Pathology Consultant",
      credentials: "DMD, PhD, Diplomate ABOP",
      institution: "University of Pennsylvania",
      specialization: "Oral Pathology & Cancer Detection",
      experience: "22+ years",
      photo: "https://images.unsplash.com/photo-1594824475317-d6b8b0b6e5d1?w=300&h=300&fit=crop&crop=face",
      bio: `Dr. Wang is a board-certified oral pathologist with expertise in oral cancer detection and diagnosis. Her research focuses on early detection methods and AI-assisted pathology screening.`,
      contributions: [
        "Developed oral cancer detection algorithms",
        "Established pathology annotation standards",
        "Led multi-institutional screening studies",
        "Created AI training datasets for rare conditions"
      ],
      achievements: [
        "AAOP Excellence in Research Award",
        "NIH Career Development Award",
        "International Association of Oral Pathologists Fellow"
      ]
    },
    {
      id: 4,
      name: "Dr. James Thompson",
      title: "Technology Integration Advisor",
      credentials: "MD, DDS, MS",
      institution: "Stanford University School of Medicine",
      specialization: "Medical Informatics & Healthcare AI",
      experience: "15+ years",
      photo: "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=300&h=300&fit=crop&crop=face",
      bio: `Dr. Thompson bridges medicine and dentistry with expertise in healthcare AI and medical informatics. He leads Stanford's digital health initiatives and has extensive experience in AI implementation.`,
      contributions: [
        "Designed clinical workflow integration protocols",
        "Developed AI safety and monitoring systems",
        "Led healthcare AI ethics committees",
        "Published extensively on medical AI applications"
      ],
      achievements: [
        "HIMSS Healthcare AI Leadership Award",
        "Stanford Medicine Innovation Award",
        "AMIA Fellow"
      ]
    },
    {
      id: 5,
      name: "Dr. Maria Garcia",
      title: "Education & Training Director",
      credentials: "DDS, EdD, FACD",
      institution: "University of Michigan School of Dentistry",
      specialization: "Dental Education & Professional Development",
      experience: "25+ years",
      photo: "https://images.unsplash.com/photo-1551836022-deb4988cc6c0?w=300&h=300&fit=crop&crop=face",
      bio: `Dr. Garcia is a leader in dental education with expertise in curriculum development and professional training. She has pioneered AI education programs for dental professionals.`,
      contributions: [
        "Developed AI curriculum for dental schools",
        "Created professional training certification programs",
        "Led faculty development initiatives",
        "Established continuing education standards"
      ],
      achievements: [
        "ADEA Gies Award for Innovation",
        "Distinguished Teaching Award",
        "American College of Dentists Fellow"
      ]
    },
    {
      id: 6,
      name: "Dr. David Kim",
      title: "Regulatory Affairs Advisor",
      credentials: "MD, JD, MBA",
      institution: "Johns Hopkins University",
      specialization: "Healthcare Regulation & Medical Device Law",
      experience: "12+ years",
      photo: "https://images.unsplash.com/photo-1607990281513-2c110a25bd8c?w=300&h=300&fit=crop&crop=face",
      bio: `Dr. Kim combines medical expertise with legal and business acumen, specializing in healthcare regulation and medical device approval processes. He guides regulatory strategy for medical AI devices.`,
      contributions: [
        "Led FDA approval strategy development",
        "Established regulatory compliance frameworks",
        "Navigated international regulatory pathways",
        "Developed risk management protocols"
      ],
      achievements: [
        "FDA Recognition Award",
        "Healthcare Law Institute Fellow",
        "Medical Device Innovation Consortium Board"
      ]
    }
  ];

  const advisoryStats = [
    { label: "Combined Experience", value: "110+ Years", icon: "Clock" },
    { label: "Published Papers", value: "300+", icon: "FileText" },
    { label: "Patents Filed", value: "25", icon: "Award" },
    { label: "Students Mentored", value: "500+", icon: "Users" }
  ];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center space-x-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Icon name="Users" size={16} />
            <span>Clinical Advisory Board</span>
          </div>
          <h2 className="text-4xl font-bold text-text-primary mb-4">
            World-Class Expertise
          </h2>
          <p className="text-xl text-text-secondary max-w-3xl mx-auto">
            Our clinical advisory board comprises leading dental professionals, researchers, and healthcare technology experts who guide Serene's development and ensure clinical excellence.
          </p>
        </div>

        {/* Advisory Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-16">
          {advisoryStats?.map((stat, index) => (
            <div key={index} className="text-center bg-muted rounded-xl p-6">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Icon name={stat?.icon} size={24} className="text-primary" />
              </div>
              <div className="text-2xl font-bold text-primary mb-1">{stat?.value}</div>
              <div className="text-text-secondary text-sm">{stat?.label}</div>
            </div>
          ))}
        </div>

        {/* Board Members Grid */}
        <div className="grid lg:grid-cols-2 gap-8">
          {boardMembers?.map((member) => (
            <div key={member?.id} className="bg-card rounded-xl p-8 border border-border hover-lift shadow-brand">
              <div className="flex items-start space-x-6 mb-6">
                <div className="w-20 h-20 rounded-full overflow-hidden flex-shrink-0 bg-muted">
                  <Image 
                    src={member?.photo} 
                    alt={`${member?.name} portrait`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-text-primary mb-1">
                    {member?.name}
                  </h3>
                  <p className="text-primary font-medium mb-1">
                    {member?.title}
                  </p>
                  <p className="text-text-secondary text-sm mb-2">
                    {member?.credentials}
                  </p>
                  <div className="flex items-center space-x-4 text-sm text-text-secondary">
                    <div className="flex items-center space-x-1">
                      <Icon name="Building" size={14} />
                      <span>{member?.institution}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Icon name="Clock" size={14} />
                      <span>{member?.experience}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-text-primary mb-2">Specialization</h4>
                  <p className="text-text-secondary text-sm">{member?.specialization}</p>
                </div>

                <div>
                  <h4 className="font-semibold text-text-primary mb-2">Biography</h4>
                  <p className="text-text-secondary text-sm leading-relaxed">{member?.bio}</p>
                </div>

                <div>
                  <h4 className="font-semibold text-text-primary mb-3">Key Contributions</h4>
                  <ul className="space-y-2">
                    {member?.contributions?.map((contribution, index) => (
                      <li key={index} className="flex items-start space-x-2 text-sm">
                        <Icon name="CheckCircle" size={14} className="text-success mt-0.5 flex-shrink-0" />
                        <span className="text-text-secondary">{contribution}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-4 border-t border-border">
                  <h4 className="font-semibold text-text-primary mb-2">Notable Achievements</h4>
                  <div className="flex flex-wrap gap-2">
                    {member?.achievements?.map((achievement, index) => (
                      <span key={index} className="bg-primary/10 text-primary px-2 py-1 rounded text-xs font-medium">
                        {achievement}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Call to Action */}
        <div className="mt-16 text-center bg-muted rounded-2xl p-8">
          <div className="max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold text-text-primary mb-4">
              Join Our Research Community
            </h3>
            <p className="text-text-secondary mb-6">
              Interested in contributing to dental AI research? Connect with our advisory board and explore collaboration opportunities.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="inline-flex items-center space-x-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors">
                <Icon name="Mail" size={18} />
                <span>Contact Advisory Board</span>
              </button>
              <button className="inline-flex items-center space-x-2 bg-white text-text-primary px-6 py-3 rounded-lg font-medium border border-border hover:bg-muted transition-colors">
                <Icon name="Users" size={18} />
                <span>Research Partnerships</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AdvisoryBoard;