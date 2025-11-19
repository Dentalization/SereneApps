import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';

const ResearchParticipation = () => {
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    practice: '',
    specialty: '',
    experience: '',
    interest: ''
  });

  const researchPrograms = [
    {
      id: 1,
      title: "Early Access Research Program",
      type: "Clinical Validation",
      duration: "6-12 months",
      commitment: "Low",
      participants: "50 practices",
      benefits: [
        "Free access to advanced AI features",
        "Priority technical support",
        "Co-authorship opportunities",
        "CME credit eligibility",
        "Research publication recognition"
      ],
      requirements: [
        "Licensed dental practice",
        "Minimum 100 patients/month",
        "Digital radiography capability",
        "Data sharing agreement",
        "Monthly progress reporting"
      ],
      description: "Join our early access program to validate cutting-edge AI diagnostic features while contributing to peer-reviewed research. Perfect for practices wanting to stay at the forefront of dental technology.",
      icon: "Zap",
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      id: 2,
      title: "Longitudinal Outcomes Study",
      type: "Long-term Research",
      duration: "24 months",
      commitment: "Medium",
      participants: "25 practices",
      benefits: [
        "Comprehensive practice analytics",
        "Patient outcome tracking",
        "Research grant opportunities",
        "Conference presentation slots",
        "Professional recognition awards"
      ],
      requirements: [
        "Established patient base (2+ years)",
        "Electronic health records",
        "Commitment to follow-up",
        "IRB approval assistance",
        "Quarterly data submission"
      ],
      description: "Participate in groundbreaking longitudinal research tracking patient outcomes and treatment effectiveness with AI-assisted diagnosis over 24 months.",
      icon: "TrendingUp",
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      id: 3,
      title: "Specialty Focus Research",
      type: "Specialized Studies",
      duration: "12-18 months",
      commitment: "High",
      participants: "15 specialists",
      benefits: [
        "Specialized AI model development",
        "Direct researcher collaboration",
        "Patent co-invention opportunities",
        "Speaking engagement invitations",
        "Advisory board consideration"
      ],
      requirements: [
        "Board certification in specialty",
        "Research experience preferred",
        "High-volume specialty practice",
        "Advanced imaging capabilities",
        "Dedicated research coordinator"
      ],
      description: "Collaborate directly with our research team to develop specialized AI models for your area of expertise, from orthodontics to oral surgery.",
      icon: "Microscope",
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    },
    {
      id: 4,
      title: "Educational Research Initiative",
      type: "Academic Partnership",
      duration: "Ongoing",
      commitment: "Variable",
      participants: "10 institutions",
      benefits: [
        "Curriculum development support",
        "Student research opportunities",
        "Faculty development programs",
        "Educational grant funding",
        "Technology integration training"
      ],
      requirements: [
        "Accredited dental education program",
        "Faculty research interest",
        "Student participation approval",
        "Institutional review board",
        "Educational outcome measurement"
      ],
      description: "Partner with us to integrate AI education into dental curricula and train the next generation of tech-savvy dental professionals.",
      icon: "GraduationCap",
      color: "text-orange-600",
      bgColor: "bg-orange-50"
    }
  ];

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e?.target?.name]: e?.target?.value
    });
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    // Handle form submission
    console.log('Research participation application:', formData);
  };

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center space-x-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Icon name="UserPlus" size={16} />
            <span>Research Participation</span>
          </div>
          <h2 className="text-4xl font-bold text-text-primary mb-4">
            Join Our Research Community
          </h2>
          <p className="text-xl text-text-secondary max-w-3xl mx-auto">
            Contribute to advancing dental AI while accessing cutting-edge features and earning recognition in the dental research community.
          </p>
        </div>

        {/* Research Programs */}
        <div className="grid lg:grid-cols-2 gap-8 mb-16">
          {researchPrograms?.map((program) => (
            <div key={program?.id} className="bg-card rounded-xl p-8 border border-border hover-lift shadow-brand">
              <div className="flex items-start space-x-4 mb-6">
                <div className={`w-12 h-12 ${program?.bgColor} rounded-lg flex items-center justify-center`}>
                  <Icon name={program?.icon} size={24} className={program?.color} />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-text-primary mb-2">
                    {program?.title}
                  </h3>
                  <div className="flex items-center space-x-4 text-sm text-text-secondary mb-3">
                    <span className="bg-primary/10 text-primary px-2 py-1 rounded-full">
                      {program?.type}
                    </span>
                    <span>{program?.duration}</span>
                    <span>Commitment: {program?.commitment}</span>
                  </div>
                  <p className="text-text-secondary leading-relaxed">
                    {program?.description}
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                {/* Benefits */}
                <div>
                  <h4 className="font-semibold text-text-primary mb-3 flex items-center">
                    <Icon name="Gift" size={16} className="mr-2 text-success" />
                    Benefits
                  </h4>
                  <ul className="space-y-2">
                    {program?.benefits?.map((benefit, index) => (
                      <li key={index} className="flex items-start space-x-2 text-sm">
                        <Icon name="Check" size={14} className="text-success mt-0.5 flex-shrink-0" />
                        <span className="text-text-secondary">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Requirements */}
                <div>
                  <h4 className="font-semibold text-text-primary mb-3 flex items-center">
                    <Icon name="ClipboardList" size={16} className="mr-2 text-primary" />
                    Requirements
                  </h4>
                  <ul className="space-y-2">
                    {program?.requirements?.map((requirement, index) => (
                      <li key={index} className="flex items-start space-x-2 text-sm">
                        <Icon name="Circle" size={14} className="text-text-secondary mt-0.5 flex-shrink-0" />
                        <span className="text-text-secondary">{requirement}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border">
                <div className="text-sm text-text-secondary">
                  <Icon name="Users" size={14} className="inline mr-1" />
                  {program?.participants} available
                </div>
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedProgram(program?.id)}
                  iconName="ArrowRight"
                  iconPosition="right"
                >
                  Apply Now
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Application Form */}
        {selectedProgram && (
          <div className="bg-muted rounded-2xl p-8 mb-16">
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-text-primary mb-2">
                  Research Participation Application
                </h3>
                <p className="text-text-secondary">
                  Apply for: {researchPrograms?.find(p => p?.id === selectedProgram)?.title}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <Input
                    label="Full Name"
                    type="text"
                    name="name"
                    value={formData?.name}
                    onChange={handleInputChange}
                    required
                    placeholder="Dr. John Smith"
                  />
                  <Input
                    label="Email Address"
                    type="email"
                    name="email"
                    value={formData?.email}
                    onChange={handleInputChange}
                    required
                    placeholder="john.smith@example.com"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <Input
                    label="Practice/Institution Name"
                    type="text"
                    name="practice"
                    value={formData?.practice}
                    onChange={handleInputChange}
                    required
                    placeholder="Smith Dental Associates"
                  />
                  <Input
                    label="Specialty"
                    type="text"
                    name="specialty"
                    value={formData?.specialty}
                    onChange={handleInputChange}
                    required
                    placeholder="General Dentistry"
                  />
                </div>

                <Input
                  label="Years of Experience"
                  type="number"
                  name="experience"
                  value={formData?.experience}
                  onChange={handleInputChange}
                  required
                  placeholder="10"
                />

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Research Interest & Motivation
                  </label>
                  <textarea
                    name="interest"
                    value={formData?.interest}
                    onChange={handleInputChange}
                    required
                    rows={4}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                    placeholder="Please describe your interest in dental AI research and what you hope to contribute..."
                  />
                </div>

                <div className="flex items-center space-x-4">
                  <Button 
                    type="submit"
                    variant="default"
                    iconName="Send"
                    iconPosition="left"
                  >
                    Submit Application
                  </Button>
                  <Button 
                    type="button"
                    variant="ghost"
                    onClick={() => setSelectedProgram(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Research Impact */}
        <div className="bg-white rounded-2xl p-8 border border-border">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-text-primary mb-2">
              Research Impact & Recognition
            </h3>
            <p className="text-text-secondary">
              Our research participants contribute to advancing dental care globally
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">150+</div>
              <div className="text-text-secondary">Research Participants</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">25</div>
              <div className="text-text-secondary">Published Papers</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">12</div>
              <div className="text-text-secondary">Conference Presentations</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">5</div>
              <div className="text-text-secondary">Research Awards</div>
            </div>
          </div>

          <div className="bg-muted rounded-xl p-6">
            <h4 className="font-semibold text-text-primary mb-4 text-center">
              Participant Testimonials
            </h4>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg p-4">
                <p className="text-text-secondary text-sm mb-3 italic">
                  "Participating in Serene's research program has transformed my practice. The early access to AI features and the collaborative research environment have been invaluable."
                </p>
                <div className="text-xs text-text-secondary">
                  <strong>Dr. Sarah Johnson</strong> - General Dentistry, Seattle
                </div>
              </div>
              <div className="bg-white rounded-lg p-4">
                <p className="text-text-secondary text-sm mb-3 italic">
                  "The longitudinal study provided incredible insights into patient outcomes. Being co-author on three publications has significantly advanced my academic career."
                </p>
                <div className="text-xs text-text-secondary">
                  <strong>Dr. Michael Chen</strong> - Periodontist, Boston
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ResearchParticipation;