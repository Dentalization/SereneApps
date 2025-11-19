import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';

const MethodologySection = () => {
  const [activeTab, setActiveTab] = useState('training');

  const tabs = [
    { id: 'training', name: 'Training Data', icon: 'Database' },
    { id: 'validation', name: 'Validation Protocol', icon: 'CheckCircle' },
    { id: 'learning', name: 'Continuous Learning', icon: 'TrendingUp' },
    { id: 'ethics', name: 'Ethics & Privacy', icon: 'Shield' }
  ];

  const trainingData = {
    datasets: [
      {
        name: "Radiographic Caries Dataset",
        size: "125,000 images",
        source: "Multi-center clinical collection",
        annotation: "Board-certified endodontists",
        quality: "High-resolution digital radiographs",
        diversity: "Global patient demographics"
      },
      {
        name: "Periodontal Assessment Dataset",
        size: "89,000 clinical images",
        source: "Periodontal specialty practices",
        annotation: "Periodontists with 10+ years experience",
        quality: "Standardized intraoral photography",
        diversity: "Age range 18-85, all ethnicities"
      },
      {
        name: "Oral Pathology Dataset",
        size: "67,000 lesion images",
        source: "Oral pathology referral centers",
        annotation: "Oral pathologists and oncologists",
        quality: "Clinical and histopathological correlation",
        diversity: "Comprehensive lesion type coverage"
      }
    ],
    preprocessing: [
      "Image standardization and normalization",
      "Data augmentation for improved generalization",
      "Quality control and artifact removal",
      "Anonymization and privacy protection",
      "Cross-validation dataset splitting"
    ]
  };

  const validationProtocol = {
    phases: [
      {
        phase: "Phase I: Algorithm Development",
        duration: "6 months",
        participants: "Development team + 3 dental schools",
        objectives: [
          "Initial model training and optimization",
          "Feature engineering and selection",
          "Preliminary accuracy assessment",
          "Algorithm refinement based on expert feedback"
        ]
      },
      {
        phase: "Phase II: Clinical Validation",
        duration: "12 months",
        participants: "12 dental practices, 2,847 patients",
        objectives: [
          "Real-world clinical performance evaluation",
          "Inter-observer agreement assessment",
          "Diagnostic accuracy measurement",
          "Clinical workflow integration testing"
        ]
      },
      {
        phase: "Phase III: Comparative Analysis",
        duration: "6 months",
        participants: "Specialists vs AI comparison",
        objectives: [
          "Head-to-head diagnostic comparison",
          "Time efficiency measurement",
          "Cost-effectiveness analysis",
          "Patient outcome tracking"
        ]
      }
    ],
    metrics: [
      "Sensitivity (True Positive Rate)",
      "Specificity (True Negative Rate)",
      "Positive Predictive Value",
      "Negative Predictive Value",
      "Area Under ROC Curve (AUC)",
      "Inter-observer Agreement (Kappa)"
    ]
  };

  const continuousLearning = {
    framework: [
      {
        component: "Real-time Feedback Loop",
        description: "Continuous collection of diagnostic outcomes and expert corrections to improve model accuracy",
        frequency: "Daily updates"
      },
      {
        component: "Federated Learning Network",
        description: "Collaborative learning across multiple dental practices while maintaining data privacy",
        frequency: "Weekly model updates"
      },
      {
        component: "Expert Review System",
        description: "Regular review of challenging cases by specialist panels to refine diagnostic criteria",
        frequency: "Monthly expert sessions"
      },
      {
        component: "Performance Monitoring",
        description: "Continuous tracking of diagnostic accuracy and identification of performance degradation",
        frequency: "Real-time monitoring"
      }
    ],
    improvements: [
      "15% accuracy improvement over 12 months",
      "Reduced false positive rate by 23%",
      "Enhanced rare condition detection by 31%",
      "Improved consistency across different imaging systems"
    ]
  };

  const ethicsPrivacy = {
    principles: [
      {
        title: "Patient Privacy Protection",
        description: "All patient data is anonymized and encrypted using industry-standard protocols",
        compliance: ["HIPAA", "GDPR", "PDP Act"]
      },
      {
        title: "Informed Consent",
        description: "Comprehensive consent process for all research participants with clear explanation of AI involvement",
        compliance: ["IRB Approved", "ICH-GCP"]
      },
      {
        title: "Algorithmic Transparency",
        description: "Open documentation of AI decision-making processes and limitations",
        compliance: ["FDA Guidelines", "Medical Device Regulations"]
      },
      {
        title: "Bias Mitigation",
        description: "Active measures to identify and reduce algorithmic bias across demographic groups",
        compliance: ["Ethical AI Standards", "Fairness Metrics"]
      }
    ],
    safeguards: [
      "Independent ethics review board oversight",
      "Regular bias auditing and correction",
      "Patient data retention limits",
      "Secure data transmission protocols",
      "Right to data deletion compliance"
    ]
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'training':
        return (
          <div className="space-y-8">
            <div>
              <h3 className="text-2xl font-bold text-text-primary mb-6">Training Dataset Composition</h3>
              <div className="grid md:grid-cols-3 gap-6">
                {trainingData?.datasets?.map((dataset, index) => (
                  <div key={index} className="bg-white rounded-xl p-6 border border-border hover-lift shadow-brand">
                    <h4 className="font-semibold text-text-primary mb-4">{dataset?.name}</h4>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Size:</span>
                        <span className="font-medium text-primary">{dataset?.size}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Source:</span>
                        <span className="text-text-primary">{dataset?.source}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Annotation:</span>
                        <span className="text-text-primary">{dataset?.annotation}</span>
                      </div>
                      <div className="pt-2 border-t border-border">
                        <div className="text-text-secondary mb-1">Quality & Diversity:</div>
                        <div className="text-xs text-text-secondary">{dataset?.quality}</div>
                        <div className="text-xs text-text-secondary">{dataset?.diversity}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-muted rounded-xl p-6">
              <h4 className="font-semibold text-text-primary mb-4 flex items-center">
                <Icon name="Settings" size={18} className="mr-2" />
                Data Preprocessing Pipeline
              </h4>
              <div className="grid md:grid-cols-2 gap-4">
                {trainingData?.preprocessing?.map((step, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white text-xs font-bold">
                      {index + 1}
                    </div>
                    <span className="text-text-secondary">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'validation':
        return (
          <div className="space-y-8">
            <div>
              <h3 className="text-2xl font-bold text-text-primary mb-6">Clinical Validation Phases</h3>
              <div className="space-y-6">
                {validationProtocol?.phases?.map((phase, index) => (
                  <div key={index} className="bg-white rounded-xl p-6 border border-border">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-text-primary mb-2">{phase?.phase}</h4>
                        <div className="grid md:grid-cols-2 gap-4 mb-4 text-sm">
                          <div>
                            <span className="text-text-secondary">Duration: </span>
                            <span className="text-text-primary">{phase?.duration}</span>
                          </div>
                          <div>
                            <span className="text-text-secondary">Participants: </span>
                            <span className="text-text-primary">{phase?.participants}</span>
                          </div>
                        </div>
                        <div>
                          <div className="text-text-secondary mb-2">Objectives:</div>
                          <ul className="space-y-1">
                            {phase?.objectives?.map((objective, objIndex) => (
                              <li key={objIndex} className="flex items-start space-x-2 text-sm">
                                <Icon name="CheckCircle" size={14} className="text-success mt-0.5 flex-shrink-0" />
                                <span className="text-text-secondary">{objective}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-muted rounded-xl p-6">
              <h4 className="font-semibold text-text-primary mb-4">Validation Metrics</h4>
              <div className="grid md:grid-cols-3 gap-4">
                {validationProtocol?.metrics?.map((metric, index) => (
                  <div key={index} className="flex items-center space-x-2 text-sm">
                    <Icon name="BarChart3" size={14} className="text-primary" />
                    <span className="text-text-secondary">{metric}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'learning':
        return (
          <div className="space-y-8">
            <div>
              <h3 className="text-2xl font-bold text-text-primary mb-6">Continuous Learning Framework</h3>
              <div className="space-y-6">
                {continuousLearning?.framework?.map((component, index) => (
                  <div key={index} className="bg-white rounded-xl p-6 border border-border hover-lift">
                    <div className="flex items-start space-x-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Icon name="RefreshCw" size={18} className="text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-text-primary">{component?.component}</h4>
                          <span className="text-xs bg-success/10 text-success px-2 py-1 rounded-full">
                            {component?.frequency}
                          </span>
                        </div>
                        <p className="text-text-secondary text-sm">{component?.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-muted rounded-xl p-6">
              <h4 className="font-semibold text-text-primary mb-4 flex items-center">
                <Icon name="TrendingUp" size={18} className="mr-2" />
                Performance Improvements
              </h4>
              <div className="grid md:grid-cols-2 gap-4">
                {continuousLearning?.improvements?.map((improvement, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <Icon name="ArrowUp" size={16} className="text-success" />
                    <span className="text-text-secondary text-sm">{improvement}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'ethics':
        return (
          <div className="space-y-8">
            <div>
              <h3 className="text-2xl font-bold text-text-primary mb-6">Ethical Principles & Privacy</h3>
              <div className="space-y-6">
                {ethicsPrivacy?.principles?.map((principle, index) => (
                  <div key={index} className="bg-white rounded-xl p-6 border border-border">
                    <h4 className="font-semibold text-text-primary mb-3">{principle?.title}</h4>
                    <p className="text-text-secondary text-sm mb-4">{principle?.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {principle?.compliance?.map((comp, compIndex) => (
                        <span key={compIndex} className="bg-primary/10 text-primary px-2 py-1 rounded text-xs font-medium">
                          {comp}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-muted rounded-xl p-6">
              <h4 className="font-semibold text-text-primary mb-4 flex items-center">
                <Icon name="Shield" size={18} className="mr-2" />
                Data Protection Safeguards
              </h4>
              <div className="grid md:grid-cols-2 gap-4">
                {ethicsPrivacy?.safeguards?.map((safeguard, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <Icon name="CheckCircle" size={16} className="text-success" />
                    <span className="text-text-secondary text-sm">{safeguard}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <section className="py-20 bg-muted">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center space-x-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Icon name="Microscope" size={16} />
            <span>Research Methodology</span>
          </div>
          <h2 className="text-4xl font-bold text-text-primary mb-4">
            Scientific Approach
          </h2>
          <p className="text-xl text-text-secondary max-w-3xl mx-auto">
            Our rigorous methodology ensures reliable, ethical, and continuously improving AI diagnostic capabilities through comprehensive validation and ongoing research.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {tabs?.map((tab) => (
            <button
              key={tab?.id}
              onClick={() => setActiveTab(tab?.id)}
              className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                activeTab === tab?.id
                  ? 'bg-primary text-primary-foreground shadow-brand'
                  : 'bg-white text-text-secondary hover:bg-primary/10 hover:text-primary border border-border'
              }`}
            >
              <Icon name={tab?.icon} size={18} />
              <span>{tab?.name}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="min-h-[600px]">
          {renderTabContent()}
        </div>
      </div>
    </section>
  );
};

export default MethodologySection;