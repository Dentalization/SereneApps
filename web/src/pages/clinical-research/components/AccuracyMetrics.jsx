import React from 'react';
import Icon from '../../../components/AppIcon';

const AccuracyMetrics = () => {
  const metrics = [
    {
      category: "Caries Detection",
      accuracy: 96.2,
      sensitivity: 94.8,
      specificity: 97.1,
      icon: "Zap",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      description: "Early-stage cavity identification with superior precision"
    },
    {
      category: "Periodontal Assessment",
      accuracy: 93.8,
      sensitivity: 92.4,
      specificity: 94.9,
      icon: "Activity",
      color: "text-green-600",
      bgColor: "bg-green-50",
      description: "Gum disease staging and progression monitoring"
    },
    {
      category: "Oral Pathology Screening",
      accuracy: 91.5,
      sensitivity: 89.7,
      specificity: 93.2,
      icon: "Search",
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      description: "Suspicious lesion detection and risk assessment"
    },
    {
      category: "Orthodontic Analysis",
      accuracy: 88.9,
      sensitivity: 87.3,
      specificity: 90.1,
      icon: "Layers",
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      description: "Malocclusion classification and treatment planning"
    }
  ];

  const comparisonData = [
    {
      method: "Serene AI",
      accuracy: 90.7,
      timeMinutes: 2.3,
      consistency: 99.2,
      icon: "Brain",
      color: "text-primary"
    },
    {
      method: "General Dentist",
      accuracy: 96.9,
      timeMinutes: 15.7,
      consistency: 82.4,
      icon: "User",
      color: "text-gray-600"
    },
    {
      method: "Specialist Referral",
      accuracy: 99.8,
      timeMinutes: 45.2,
      consistency: 88.9,
      icon: "UserCheck",
      color: "text-blue-600"
    }
  ];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center space-x-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Icon name="BarChart3" size={16} />
            <span>Clinical Performance Metrics</span>
          </div>
          <h2 className="text-4xl font-bold text-text-primary mb-4">
            Validated Diagnostic Accuracy
          </h2>
          <p className="text-xl text-text-secondary max-w-3xl mx-auto">
            Comprehensive clinical trials demonstrate Serene's superior performance across multiple diagnostic categories, validated against specialist diagnoses.
          </p>
        </div>

        {/* Accuracy by Category */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {metrics?.map((metric, index) => (
            <div key={index} className="bg-card rounded-xl p-6 border border-border hover-lift shadow-brand">
              <div className={`w-12 h-12 ${metric?.bgColor} rounded-lg flex items-center justify-center mb-4`}>
                <Icon name={metric?.icon} size={24} className={metric?.color} />
              </div>
              
              <h3 className="text-lg font-semibold text-text-primary mb-2">
                {metric?.category}
              </h3>
              
              <div className="space-y-3 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-text-secondary">Accuracy</span>
                  <span className="font-semibold text-text-primary">{metric?.accuracy}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-1000"
                    style={{width: `${metric?.accuracy}%`}}
                  ></div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-text-secondary">Sensitivity</div>
                    <div className="font-medium text-text-primary">{metric?.sensitivity}%</div>
                  </div>
                  <div>
                    <div className="text-text-secondary">Specificity</div>
                    <div className="font-medium text-text-primary">{metric?.specificity}%</div>
                  </div>
                </div>
              </div>
              
              <p className="text-sm text-text-secondary">
                {metric?.description}
              </p>
            </div>
          ))}
        </div>

        {/* Comparison Chart */}
        <div className="bg-muted rounded-2xl p-8">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-text-primary mb-2">
              Performance Comparison
            </h3>
            <p className="text-text-secondary">
              Serene AI vs Traditional Diagnostic Methods
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {comparisonData?.map((method, index) => (
              <div key={index} className="bg-white rounded-xl p-6 text-center hover-lift shadow-brand">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon name={method?.icon} size={24} className={method?.color} />
                </div>
                
                <h4 className="text-lg font-semibold text-text-primary mb-4">
                  {method?.method}
                </h4>
                
                <div className="space-y-4">
                  <div>
                    <div className="text-3xl font-bold text-primary mb-1">
                      {method?.accuracy}%
                    </div>
                    <div className="text-sm text-text-secondary">Overall Accuracy</div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="font-medium text-text-primary">{method?.timeMinutes} min</div>
                      <div className="text-text-secondary">Avg. Time</div>
                    </div>
                    <div>
                      <div className="font-medium text-text-primary">{method?.consistency}%</div>
                      <div className="text-text-secondary">Consistency</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Study Details */}
        <div className="mt-12 text-center">
          <div className="bg-white rounded-xl p-6 border border-border inline-block">
            <div className="flex items-center space-x-6 text-sm text-text-secondary">
              <div className="flex items-center space-x-2">
                <Icon name="Users" size={16} />
                <span>2,847 patients</span>
              </div>
              <div className="flex items-center space-x-2">
                <Icon name="Building" size={16} />
                <span>12 dental practices</span>
              </div>
              <div className="flex items-center space-x-2">
                <Icon name="Calendar" size={16} />
                <span>18-month study period</span>
              </div>
              <div className="flex items-center space-x-2">
                <Icon name="Award" size={16} />
                <span>IRB approved</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AccuracyMetrics;