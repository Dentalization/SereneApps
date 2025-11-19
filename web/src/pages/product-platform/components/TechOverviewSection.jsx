import React from 'react';
import Icon from '../../../components/AppIcon';

const TechOverviewSection = () => {
  return (
    <section className="py-16 bg-gradient-to-br from-purple-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Advanced AI Technology Stack
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Powered by YOLOv8 computer vision and GPT-4 reasoning, delivering clinical-grade dental analysis with unprecedented accuracy and speed.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                <Icon name="Eye" size={24} color="white" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">YOLOv8 Computer Vision</h3>
                <p className="text-gray-600">
                  State-of-the-art object detection identifies dental conditions with 94.7% accuracy, processing images in under 2 seconds for real-time analysis.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-12 h-12 bg-secondary rounded-lg flex items-center justify-center">
                <Icon name="Brain" size={24} color="white" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">GPT-4 Clinical Reasoning</h3>
                <p className="text-gray-600">
                  Advanced language model provides detailed explanations, treatment recommendations, and patient-friendly summaries based on visual findings.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-12 h-12 bg-accent rounded-lg flex items-center justify-center">
                <Icon name="Shield" size={24} color="white" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">HIPAA-Compliant Processing</h3>
                <p className="text-gray-600">
                  End-to-end encryption and secure cloud infrastructure ensure patient data protection while maintaining lightning-fast analysis speeds.
                </p>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="bg-white rounded-2xl shadow-brand p-8 border border-gray-200">
              <div className="text-center mb-6">
                <div className="inline-flex items-center space-x-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
                  <Icon name="Zap" size={16} />
                  <span>Live Processing</span>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">Image Analysis</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-green-600">1.8s</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">Condition Detection</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-green-600">94.7%</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">Report Generation</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-green-600">0.3s</span>
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

export default TechOverviewSection;