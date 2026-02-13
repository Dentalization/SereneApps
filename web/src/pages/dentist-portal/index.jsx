import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from 'contexts/AuthContext';
import Icon from 'components/AppIcon';

const DentistPortalLanding = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleGetStarted = () => {
    navigate('/dentist-portal/home');
  };

  const features = [
    {
      icon: 'Monitor',
      title: 'Teledentistry',
      description: 'Conduct remote consultations with patients through secure, high-quality video calls. Perform diagnosis and treatment planning from anywhere.'
    },
    {
      icon: 'Brain',
      title: 'AI Clinical Decision Support System (CDSS)',
      description: 'Advanced AI system that assists diagnosis with automated X-ray analysis, detects dental anomalies, and recommends evidence-based treatments.'
    },
    {
      icon: 'FileText',
      title: 'Digital Patient Records',
      description: 'Integrated, secure, and easy-to-access digital medical record management. Keep the full treatment history in one platform.'
    },
    {
      icon: 'Calendar',
      title: 'Smart Scheduling',
      description: 'Intelligent scheduling system with automatic reminders, queue management, and calendar integration for maximum efficiency.'
    },
    {
      icon: 'Camera',
      title: 'X-Ray Analysis',
      description: 'Upload and analyze X-rays with AI to detect caries, periodontal disease, and other abnormalities in real time.'
    },
    {
      icon: 'Users',
      title: 'Patient Management',
      description: 'Comprehensive patient management with treatment progress tracking, medication history, and follow-up scheduling.'
    }
  ];

  const benefits = [
    {
      icon: 'Clock',
      title: 'Time Efficiency',
      description: 'Save time with AI-assisted diagnosis and remote consultations.'
    },
    {
      icon: 'Target',
      title: 'High Accuracy',
      description: 'AI CDSS increases diagnostic accuracy by up to 95%.'
    },
    {
      icon: 'Shield',
      title: 'Data Security',
      description: 'End-to-end encryption keeps every patient record secure.'
    },
    {
      icon: 'TrendingUp',
      title: 'Revenue Growth',
      description: 'Serve more patients through teledentistry and boost revenue.'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-green-600 rounded-lg flex items-center justify-center">
                <Icon name="Activity" size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">SereneAI Dental</h1>
                <p className="text-sm text-gray-600">Dentist Portal</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, {user?.name || 'Doctor'}</span>
              <button
                onClick={handleGetStarted}
                className="bg-gradient-to-r from-blue-600 to-green-600 text-white px-6 py-2 rounded-lg hover:from-blue-700 hover:to-green-700 transition-all duration-200 flex items-center space-x-2"
              >
                <Icon name="ArrowRight" size={16} />
                <span>Enter Dashboard</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="mb-8">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Revolutionize <span className="bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">Dental Care</span>
              <br />with AI & Teledentistry
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              An integrated platform that combines the power of artificial intelligence with teledentistry
              to deliver dental care that is more efficient, accurate, and accessible.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <button
              onClick={handleGetStarted}
              className="bg-gradient-to-r from-brand-primary to-brand-accent text-white px-8 py-4 rounded-xl hover:from-brand-primary/90 hover:to-brand-accent/90 transition-all duration-200 flex items-center space-x-3 text-lg font-semibold shadow-lg hover:shadow-xl"
            >
              <Icon name="Play" size={20} />
              <span>Get Started</span>
            </button>
            <button className="border-2 border-brand-primary text-brand-primary px-8 py-4 rounded-xl hover:bg-brand-primary hover:text-white transition-all duration-200 flex items-center space-x-3 text-lg font-semibold">
              <Icon name="BookOpen" size={20} />
              <span>Learn More</span>
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">95%</div>
              <div className="text-gray-600">AI Diagnosis Accuracy</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">50%</div>
              <div className="text-gray-600">Time Saved</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">24/7</div>
              <div className="text-gray-600">Platform Access</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600 mb-2">1000+</div>
              <div className="text-gray-600">Registered Dentists</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Key Features</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Cutting-edge technology that supports modern dental practices.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-gradient-to-br from-gray-50 to-white p-8 rounded-2xl border border-gray-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-green-600 rounded-xl flex items-center justify-center mb-6">
                  <Icon name={feature.icon} size={24} className="text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-green-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Why Choose SereneAI?</h2>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto">
              Advantages that will transform how you practice.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Icon name={benefit.icon} size={28} className="text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">{benefit.title}</h3>
                <p className="text-blue-100 leading-relaxed">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gray-900">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Start Your Digital Practice?
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Join thousands of dentists who already experience the benefits of AI and teledentistry.
          </p>
          <button
            onClick={handleGetStarted}
            className="bg-gradient-to-r from-blue-600 to-green-600 text-white px-10 py-4 rounded-xl hover:from-blue-700 hover:to-green-700 transition-all duration-200 text-lg font-semibold shadow-lg hover:shadow-xl inline-flex items-center space-x-3"
          >
            <Icon name="Rocket" size={20} />
            <span>Launch Dashboard</span>
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-green-600 rounded-lg flex items-center justify-center">
                <Icon name="Activity" size={20} className="text-white" />
              </div>
              <span className="text-white font-semibold">SereneAI Dental</span>
            </div>
            <div className="text-gray-400 text-sm">
              © 2024 SereneAI. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default DentistPortalLanding;
