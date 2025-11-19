import React from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const CDSSSection = () => {
  const accuracyMetrics = [
    { condition: "Dental Caries", accuracy: "94.7%", samples: "12,450" },
    { condition: "Gingivitis", accuracy: "91.2%", samples: "8,320" },
    { condition: "Periodontal Disease", accuracy: "89.8%", samples: "6,180" },
    { condition: "Oral Lesions", accuracy: "87.3%", samples: "4,290" },
    { condition: "Tooth Fractures", accuracy: "92.1%", samples: "3,670" }
  ];

  const integrationFeatures = [
    {
      icon: "Database",
      title: "EMR Integration",
      description: "Seamlessly connects with Epic, Cerner, and other major electronic medical record systems"
    },
    {
      icon: "Workflow",
      title: "Practice Management",
      description: "Direct integration with Dentrix, Eaglesoft, and Open Dental for streamlined workflows"
    },
    {
      icon: "Api",
      title: "RESTful API",
      description: "Comprehensive API documentation with SDKs for custom integrations and third-party apps"
    },
    {
      icon: "Shield",
      title: "HIPAA Compliance",
      description: "End-to-end encryption and audit trails ensure complete patient data protection"
    }
  ];

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center space-x-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Icon name="Stethoscope" size={16} />
            <span>For Healthcare Professionals</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Clinical Decision Support System
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Evidence-based AI assistance that enhances diagnostic accuracy and supports clinical decision-making with peer-reviewed validation.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 mb-16">
          {/* Accuracy Metrics */}
          <div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-6">Validated Accuracy Metrics</h3>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <div className="grid grid-cols-3 gap-4 text-sm font-medium text-gray-700">
                  <span>Condition</span>
                  <span>Accuracy</span>
                  <span>Sample Size</span>
                </div>
              </div>
              <div className="divide-y divide-gray-200">
                {accuracyMetrics?.map((metric, index) => (
                  <div key={index} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                    <div className="grid grid-cols-3 gap-4 items-center">
                      <span className="text-gray-900 font-medium">{metric?.condition}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-green-600 font-semibold">{metric?.accuracy}</span>
                        <Icon name="TrendingUp" size={14} className="text-green-600" />
                      </div>
                      <span className="text-gray-500 text-sm">{metric?.samples} cases</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start space-x-3">
                <Icon name="Info" size={20} className="text-blue-600 mt-0.5" />
                <div>
                  <p className="text-blue-900 font-medium">Peer-Reviewed Validation</p>
                  <p className="text-blue-700 text-sm mt-1">
                    Results published in Journal of Dental Research (2024) and validated across 15 clinical sites with 35,000+ patient cases.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Integration Capabilities */}
          <div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-6">Integration Capabilities</h3>
            <div className="space-y-4">
              {integrationFeatures?.map((feature, index) => (
                <div key={index} className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Icon name={feature?.icon} size={24} className="text-primary" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">{feature?.title}</h4>
                      <p className="text-gray-600">{feature?.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Clinical Studies */}
        <div className="bg-white rounded-2xl shadow-brand p-8 border border-gray-200">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">Clinical Validation Studies</h3>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Our AI models have been rigorously tested and validated through multiple peer-reviewed studies and clinical trials.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon name="FileCheck" size={32} className="text-green-600" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Multi-Center Trial</h4>
              <p className="text-gray-600 text-sm">
                15 clinical sites across North America validated diagnostic accuracy with 35,000+ patient cases over 18 months.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon name="Award" size={32} className="text-blue-600" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Peer Review</h4>
              <p className="text-gray-600 text-sm">
                Published findings in Journal of Dental Research with independent validation by leading dental schools.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon name="Users" size={32} className="text-purple-600" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Expert Panel</h4>
              <p className="text-gray-600 text-sm">
                Advisory board of 12 leading dental professionals guides development and validates clinical relevance.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <Button variant="outline" iconName="Download" iconPosition="left">
              Download Clinical Study
            </Button>
            <Button variant="default" iconName="Calendar" iconPosition="left">
              Schedule Demo
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CDSSSection;