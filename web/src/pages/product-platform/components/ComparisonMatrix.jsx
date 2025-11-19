import React from 'react';
import Icon from '../../../components/AppIcon';

const ComparisonMatrix = () => {
  const comparisonData = [
    {
      feature: "Analysis Speed",
      traditional: "15-30 minutes",
      competitors: "5-10 minutes",
      serene: "< 2 seconds",
      advantage: true
    },
    {
      feature: "Accuracy Rate",
      traditional: "85-90%",
      competitors: "88-92%",
      serene: "94.7%",
      advantage: true
    },
    {
      feature: "Conditions Detected",
      traditional: "5-8 conditions",
      competitors: "8-12 conditions",
      serene: "15+ conditions",
      advantage: true
    },
    {
      feature: "Integration Options",
      traditional: "Limited",
      competitors: "Basic API",
      serene: "Full EMR/PMS Integration",
      advantage: true
    },
    {
      feature: "Patient Education",
      traditional: "Manual creation",
      competitors: "Template-based",
      serene: "AI-Generated & Personalized",
      advantage: true
    },
    {
      feature: "HIPAA Compliance",
      traditional: "Manual processes",
      competitors: "Basic compliance",
      serene: "End-to-end encryption",
      advantage: true
    },
    {
      feature: "Cost per Analysis",
      traditional: "$25-50",
      competitors: "$8-15",
      serene: "$3-7",
      advantage: true
    },
    {
      feature: "Learning Capability",
      traditional: "Static",
      competitors: "Limited updates",
      serene: "Continuous learning",
      advantage: true
    }
  ];

  const benefits = [
    {
      icon: "Clock",
      title: "10x Faster Analysis",
      description: "Complete dental analysis in under 2 seconds compared to traditional 15-30 minute evaluations"
    },
    {
      icon: "Target",
      title: "Superior Accuracy",
      description: "94.7% accuracy rate exceeds both traditional methods and competitor solutions"
    },
    {
      icon: "DollarSign",
      title: "Cost Effective",
      description: "Up to 85% cost reduction per analysis while maintaining clinical-grade quality"
    },
    {
      icon: "Zap",
      title: "Real-time Results",
      description: "Instant analysis enables immediate patient consultation and treatment planning"
    }
  ];

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Why Choose Serene AI?
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            See how our AI-powered platform outperforms traditional diagnostic methods and competitor solutions across key metrics.
          </p>
        </div>

        {/* Comparison Table */}
        <div className="bg-white rounded-2xl shadow-brand border border-gray-200 overflow-hidden mb-12">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="grid grid-cols-4 gap-4">
              <div className="font-semibold text-gray-900">Feature</div>
              <div className="font-semibold text-gray-700 text-center">Traditional Methods</div>
              <div className="font-semibold text-gray-700 text-center">Competitors</div>
              <div className="font-semibold text-primary text-center">Serene AI</div>
            </div>
          </div>
          
          <div className="divide-y divide-gray-200">
            {comparisonData?.map((row, index) => (
              <div key={index} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="grid grid-cols-4 gap-4 items-center">
                  <div className="font-medium text-gray-900">{row?.feature}</div>
                  <div className="text-center text-gray-600 text-sm">{row?.traditional}</div>
                  <div className="text-center text-gray-600 text-sm">{row?.competitors}</div>
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <span className="font-semibold text-primary text-sm">{row?.serene}</span>
                      {row?.advantage && (
                        <Icon name="CheckCircle" size={16} className="text-green-600" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Key Benefits */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {benefits?.map((benefit, index) => (
            <div key={index} className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 text-center hover:shadow-md transition-shadow">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon name={benefit?.icon} size={32} className="text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">{benefit?.title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{benefit?.description}</p>
            </div>
          ))}
        </div>

        {/* ROI Calculator Teaser */}
        <div className="mt-16 bg-gradient-to-br from-primary to-secondary rounded-2xl p-8 text-white">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="text-2xl font-bold mb-4">Calculate Your ROI</h3>
              <p className="text-primary-foreground/90 mb-6">
                See how much time and money you can save by switching to Serene AI. Our ROI calculator shows potential savings based on your practice size and current workflow.
              </p>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white/20 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold">85%</div>
                  <div className="text-sm text-primary-foreground/80">Cost Reduction</div>
                </div>
                <div className="bg-white/20 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold">10x</div>
                  <div className="text-sm text-primary-foreground/80">Faster Analysis</div>
                </div>
              </div>
            </div>
            
            <div className="bg-white/10 rounded-lg p-6 backdrop-blur-sm">
              <h4 className="font-semibold mb-4">Quick ROI Estimate</h4>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Monthly Analyses:</span>
                  <span className="font-semibold">500 cases</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Current Cost:</span>
                  <span className="font-semibold">$12,500</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Serene AI Cost:</span>
                  <span className="font-semibold">$2,500</span>
                </div>
                <div className="border-t border-white/20 pt-4">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Monthly Savings:</span>
                    <span className="font-bold text-xl text-green-300">$10,000</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ComparisonMatrix;