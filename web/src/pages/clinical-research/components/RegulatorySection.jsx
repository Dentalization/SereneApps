import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const RegulatorySection = () => {
  const [activeRegion, setActiveRegion] = useState('usa');

  const regions = [
    { id: 'usa', name: 'United States', flag: '🇺🇸', agency: 'FDA' },
    { id: 'eu', name: 'European Union', flag: '🇪🇺', agency: 'CE/MDR' },
    { id: 'canada', name: 'Canada', flag: '🇨🇦', agency: 'Health Canada' },
    { id: 'asia', name: 'Asia Pacific', flag: '🌏', agency: 'Various' }
  ];

  const regulatoryStatus = {
    usa: {
      currentStatus: "Pre-Submission Phase",
      classification: "Class II Medical Device Software",
      pathway: "510(k) Premarket Notification",
      timeline: "Q2 2024 - Q4 2024",
      progress: 65,
      milestones: [
        { phase: "Pre-Submission Meeting", status: "completed", date: "Jan 2024" },
        { phase: "Clinical Data Collection", status: "completed", date: "Mar 2024" },
        { phase: "510(k) Submission", status: "in-progress", date: "Jun 2024" },
        { phase: "FDA Review Process", status: "pending", date: "Aug 2024" },
        { phase: "Market Authorization", status: "pending", date: "Nov 2024" }
      ],
      requirements: [
        "Clinical validation with 2,500+ patients",
        "Software lifecycle documentation",
        "Cybersecurity risk assessment",
        "Predicate device comparison study",
        "Quality management system compliance"
      ]
    },
    eu: {
      currentStatus: "MDR Compliance Assessment",
      classification: "Class IIa Medical Device",
      pathway: "CE Marking under MDR",
      timeline: "Q3 2024 - Q1 2025",
      progress: 45,
      milestones: [
        { phase: "Technical Documentation", status: "completed", date: "Feb 2024" },
        { phase: "Clinical Evaluation", status: "in-progress", date: "May 2024" },
        { phase: "Notified Body Review", status: "pending", date: "Sep 2024" },
        { phase: "CE Marking", status: "pending", date: "Dec 2024" },
        { phase: "Market Access", status: "pending", date: "Jan 2025" }
      ],
      requirements: [
        "MDR compliance documentation",
        "Clinical evaluation report",
        "Post-market surveillance plan",
        "Unique device identification (UDI)",
        "Authorized representative appointment"
      ]
    },
    canada: {
      currentStatus: "Pre-Market Review",
      classification: "Class II Medical Device",
      pathway: "Medical Device License",
      timeline: "Q4 2024 - Q2 2025",
      progress: 30,
      milestones: [
        { phase: "Quality System Certification", status: "completed", date: "Mar 2024" },
        { phase: "Clinical Data Review", status: "in-progress", date: "Jul 2024" },
        { phase: "License Application", status: "pending", date: "Oct 2024" },
        { phase: "Health Canada Review", status: "pending", date: "Jan 2025" },
        { phase: "Market Authorization", status: "pending", date: "Apr 2025" }
      ],
      requirements: [
        "Canadian Medical Device License",
        "Quality system certification",
        "Clinical evidence documentation",
        "Risk management file",
        "Canadian agent appointment"
      ]
    },
    asia: {
      currentStatus: "Multi-Regional Strategy",
      classification: "Various Classifications",
      pathway: "Country-Specific Pathways",
      timeline: "2024 - 2026",
      progress: 20,
      milestones: [
        { phase: "Regulatory Strategy", status: "completed", date: "Jan 2024" },
        { phase: "Japan PMDA Consultation", status: "in-progress", date: "Jun 2024" },
        { phase: "Singapore HSA Application", status: "pending", date: "Sep 2024" },
        { phase: "Australia TGA Submission", status: "pending", date: "Dec 2024" },
        { phase: "Regional Market Access", status: "pending", date: "2025-2026" }
      ],
      requirements: [
        "Country-specific clinical data",
        "Local regulatory partnerships",
        "Translation and localization",
        "Regional quality standards",
        "Post-market surveillance systems"
      ]
    }
  };

  const complianceFrameworks = [
    {
      name: "ISO 13485",
      description: "Quality Management Systems for Medical Devices",
      status: "Certified",
      icon: "Award",
      details: "Comprehensive quality management system ensuring consistent design, development, and production of medical devices."
    },
    {
      name: "ISO 14971",
      description: "Risk Management for Medical Devices",
      status: "Implemented",
      icon: "Shield",
      details: "Systematic approach to risk management throughout the medical device lifecycle, from concept to disposal."
    },
    {
      name: "IEC 62304",
      description: "Medical Device Software Lifecycle",
      status: "Compliant",
      icon: "Code",
      details: "Software lifecycle processes for medical device software, ensuring safety and effectiveness of software components."
    },
    {
      name: "HIPAA",
      description: "Health Insurance Portability and Accountability Act",
      status: "Compliant",
      icon: "Lock",
      details: "Comprehensive data protection and privacy compliance for handling protected health information."
    }
  ];

  const currentRegion = regulatoryStatus?.[activeRegion];

  return (
    <section className="py-20 bg-muted">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center space-x-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Icon name="Scale" size={16} />
            <span>Regulatory Compliance</span>
          </div>
          <h2 className="text-4xl font-bold text-text-primary mb-4">
            Global Regulatory Approval
          </h2>
          <p className="text-xl text-text-secondary max-w-3xl mx-auto">
            Serene is pursuing comprehensive regulatory approval across major markets, ensuring compliance with medical device regulations and healthcare standards worldwide.
          </p>
        </div>

        {/* Region Selector */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {regions?.map((region) => (
            <button
              key={region?.id}
              onClick={() => setActiveRegion(region?.id)}
              className={`flex items-center space-x-3 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                activeRegion === region?.id
                  ? 'bg-primary text-primary-foreground shadow-brand'
                  : 'bg-white text-text-secondary hover:bg-primary/10 hover:text-primary border border-border'
              }`}
            >
              <span className="text-xl">{region?.flag}</span>
              <div className="text-left">
                <div className="font-medium">{region?.name}</div>
                <div className="text-xs opacity-75">{region?.agency}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Regulatory Status */}
        <div className="bg-white rounded-2xl p-8 border border-border mb-12">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Status Overview */}
            <div className="lg:col-span-1">
              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-bold text-text-primary mb-2">
                    {regions?.find(r => r?.id === activeRegion)?.name}
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Current Status:</span>
                      <span className="font-medium text-primary">{currentRegion?.currentStatus}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Classification:</span>
                      <span className="font-medium text-text-primary">{currentRegion?.classification}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Pathway:</span>
                      <span className="font-medium text-text-primary">{currentRegion?.pathway}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Timeline:</span>
                      <span className="font-medium text-text-primary">{currentRegion?.timeline}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-text-secondary">Progress</span>
                    <span className="text-sm font-bold text-primary">{currentRegion?.progress}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-3">
                    <div 
                      className="bg-primary h-3 rounded-full transition-all duration-1000"
                      style={{width: `${currentRegion?.progress}%`}}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Milestones */}
            <div className="lg:col-span-2">
              <h4 className="font-semibold text-text-primary mb-4">Regulatory Milestones</h4>
              <div className="space-y-4">
                {currentRegion?.milestones?.map((milestone, index) => (
                  <div key={index} className="flex items-center space-x-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      milestone?.status === 'completed' 
                        ? 'bg-success text-white' 
                        : milestone?.status === 'in-progress' ?'bg-warning text-white' :'bg-muted text-text-secondary'
                    }`}>
                      {milestone?.status === 'completed' ? (
                        <Icon name="Check" size={16} />
                      ) : milestone?.status === 'in-progress' ? (
                        <Icon name="Clock" size={16} />
                      ) : (
                        index + 1
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <span className={`font-medium ${
                          milestone?.status === 'completed' ? 'text-success' : 'text-text-primary'
                        }`}>
                          {milestone?.phase}
                        </span>
                        <span className="text-sm text-text-secondary">{milestone?.date}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Requirements */}
          <div className="mt-8 pt-8 border-t border-border">
            <h4 className="font-semibold text-text-primary mb-4">Key Requirements</h4>
            <div className="grid md:grid-cols-2 gap-4">
              {currentRegion?.requirements?.map((requirement, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <Icon name="CheckCircle" size={16} className="text-success flex-shrink-0" />
                  <span className="text-text-secondary text-sm">{requirement}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Compliance Frameworks */}
        <div className="mb-12">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-text-primary mb-2">
              Compliance Frameworks
            </h3>
            <p className="text-text-secondary">
              Adherence to international standards and regulatory requirements
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {complianceFrameworks?.map((framework, index) => (
              <div key={index} className="bg-white rounded-xl p-6 border border-border hover-lift shadow-brand">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Icon name={framework?.icon} size={20} className="text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-text-primary text-sm">{framework?.name}</h4>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      framework?.status === 'Certified' 
                        ? 'bg-success/10 text-success' :'bg-primary/10 text-primary'
                    }`}>
                      {framework?.status}
                    </span>
                  </div>
                </div>
                <p className="text-text-secondary text-sm mb-3">{framework?.description}</p>
                <p className="text-xs text-text-secondary leading-relaxed">{framework?.details}</p>
              </div>
            ))}
          </div>
        </div>

        {/* FDA Considerations */}
        <div className="bg-white rounded-2xl p-8 border border-border">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="text-2xl font-bold text-text-primary mb-4">
                FDA Pathway Strategy
              </h3>
              <p className="text-text-secondary mb-6 leading-relaxed">
                Serene is pursuing FDA approval through the 510(k) premarket notification pathway as a Class II medical device software. Our comprehensive clinical validation and regulatory strategy ensures compliance with FDA requirements for AI/ML-based medical devices.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Icon name="CheckCircle" size={18} className="text-success mt-0.5" />
                  <div>
                    <div className="font-medium text-text-primary">Pre-Submission Guidance</div>
                    <div className="text-sm text-text-secondary">Completed FDA pre-submission meeting with positive feedback</div>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Icon name="CheckCircle" size={18} className="text-success mt-0.5" />
                  <div>
                    <div className="font-medium text-text-primary">Clinical Validation</div>
                    <div className="text-sm text-text-secondary">Multi-center clinical study with 2,847 patients completed</div>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Icon name="Clock" size={18} className="text-warning mt-0.5" />
                  <div>
                    <div className="font-medium text-text-primary">510(k) Submission</div>
                    <div className="text-sm text-text-secondary">Preparing comprehensive submission package for Q2 2024</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-muted rounded-xl p-6">
              <h4 className="font-semibold text-text-primary mb-4 flex items-center">
                <Icon name="FileText" size={18} className="mr-2" />
                Regulatory Documentation
              </h4>
              <div className="space-y-3">
                <Button 
                  variant="outline" 
                  fullWidth 
                  className="justify-start"
                  iconName="Download"
                  iconPosition="left"
                >
                  FDA Pre-Submission Summary
                </Button>
                <Button 
                  variant="outline" 
                  fullWidth 
                  className="justify-start"
                  iconName="Download"
                  iconPosition="left"
                >
                  Clinical Validation Report
                </Button>
                <Button 
                  variant="outline" 
                  fullWidth 
                  className="justify-start"
                  iconName="Download"
                  iconPosition="left"
                >
                  Risk Management File
                </Button>
                <Button 
                  variant="outline" 
                  fullWidth 
                  className="justify-start"
                  iconName="Download"
                  iconPosition="left"
                >
                  Quality Management System
                </Button>
              </div>
              
              <div className="mt-6 pt-4 border-t border-border text-center">
                <p className="text-xs text-text-secondary mb-3">
                  For healthcare professionals and regulatory partners
                </p>
                <Button 
                  variant="default" 
                  size="sm"
                  iconName="Mail"
                  iconPosition="left"
                >
                  Request Access
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default RegulatorySection;