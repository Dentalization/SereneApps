import React from 'react';
import Icon from '../../../components/AppIcon';

const FeatureCards = () => {
  const features = [
    {
      icon: "Search",
      title: "Automated Condition Detection",
      description: "Advanced computer vision identifies 15+ dental conditions including caries, gingivitis, periodontal disease, and oral lesions with clinical-grade accuracy.",
      metrics: ["94.7% Accuracy", "2s Processing", "15+ Conditions"],
      color: "bg-blue-500"
    },
    {
      icon: "BarChart3",
      title: "Risk Assessment Scoring",
      description: "Comprehensive risk stratification provides actionable insights for treatment prioritization and preventive care planning based on patient history and current findings.",
      metrics: ["5-Point Scale", "Predictive Analytics", "Treatment Priority"],
      color: "bg-green-500"
    },
    {
      icon: "Clipboard",
      title: "Treatment Recommendations",
      description: "Evidence-based treatment suggestions aligned with clinical guidelines, helping practitioners make informed decisions and improve patient outcomes.",
      metrics: ["Clinical Guidelines", "Evidence-Based", "Outcome Tracking"],
      color: "bg-purple-500"
    },
    {
      icon: "BookOpen",
      title: "Patient Education Materials",
      description: "Automatically generated, personalized educational content helps patients understand their conditions and treatment options, improving compliance and satisfaction.",
      metrics: ["Auto-Generated", "Personalized", "Multi-Language"],
      color: "bg-orange-500"
    },
    {
      icon: "Activity",
      title: "Progress Monitoring",
      description: "Track treatment progress over time with comparative analysis, helping practitioners adjust treatment plans and demonstrate outcomes to patients.",
      metrics: ["Timeline Tracking", "Comparative Analysis", "Outcome Metrics"],
      color: "bg-red-500"
    },
    {
      icon: "Shield",
      title: "Quality Assurance",
      description: "Built-in quality checks and confidence scoring ensure reliable results, with flagging of uncertain cases for human review and validation.",
      metrics: ["Confidence Scoring", "Quality Flags", "Human Review"],
      color: "bg-indigo-500"
    }
  ];

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Comprehensive AI Capabilities
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Our platform combines multiple AI technologies to provide a complete dental analysis solution that enhances clinical decision-making and patient care.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features?.map((feature, index) => (
            <div key={index} className="bg-white rounded-xl shadow-brand border border-gray-200 p-6 hover:shadow-brand-hover transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-center space-x-4 mb-4">
                <div className={`w-12 h-12 ${feature?.color} rounded-lg flex items-center justify-center`}>
                  <Icon name={feature?.icon} size={24} color="white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">{feature?.title}</h3>
              </div>
              
              <p className="text-gray-600 mb-6 leading-relaxed">
                {feature?.description}
              </p>
              
              <div className="space-y-2">
                {feature?.metrics?.map((metric, metricIndex) => (
                  <div key={metricIndex} className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span className="text-sm font-medium text-gray-700">{metric}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Integration Showcase */}
        <div className="mt-16 bg-gradient-to-r from-primary to-secondary rounded-2xl p-8 text-white">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold mb-4">Seamless Workflow Integration</h3>
            <p className="text-primary-foreground/90 max-w-2xl mx-auto">
              All features work together in a unified platform that integrates with your existing practice management systems and clinical workflows.
            </p>
          </div>
          
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <Icon name="Upload" size={24} color="white" />
              </div>
              <h4 className="font-semibold mb-2">Image Capture</h4>
              <p className="text-sm text-primary-foreground/80">Upload or capture dental images directly in your workflow</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <Icon name="Cpu" size={24} color="white" />
              </div>
              <h4 className="font-semibold mb-2">AI Analysis</h4>
              <p className="text-sm text-primary-foreground/80">Automated processing with real-time results and insights</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <Icon name="FileText" size={24} color="white" />
              </div>
              <h4 className="font-semibold mb-2">Report Generation</h4>
              <p className="text-sm text-primary-foreground/80">Comprehensive reports with treatment recommendations</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <Icon name="Users" size={24} color="white" />
              </div>
              <h4 className="font-semibold mb-2">Patient Communication</h4>
              <p className="text-sm text-primary-foreground/80">Share results and educational materials with patients</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeatureCards;