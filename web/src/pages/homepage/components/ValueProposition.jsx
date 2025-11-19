import React from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const ValueProposition = () => {
  const patientBenefits = [
    {
      icon: "Heart",
      title: "Reduce Dental Anxiety",
      description: "Get clear, understandable insights about your oral health before visiting the dentist, helping you feel more prepared and confident.",
      highlight: "87% less anxiety reported"
    },
    {
      icon: "Eye",
      title: "Early Detection",
      description: "Catch potential issues before they become painful or expensive problems. Our AI spots concerns that might be missed during routine checks.",
      highlight: "3x earlier detection"
    },
    {
      icon: "Clock",
      title: "Instant Results",
      description: "No waiting for appointments or lab results. Get professional-grade analysis of your dental images in under 2 seconds.",
      highlight: "Available 24/7"
    },
    {
      icon: "DollarSign",
      title: "Save Money",
      description: "Prevent costly emergency treatments by identifying issues early. Many users save thousands on preventable dental procedures.",
      highlight: "Average $2,400 saved"
    }
  ];

  const professionalBenefits = [
    {
      icon: "Stethoscope",
      title: "Enhanced Diagnostics",
      description: "AI-powered second opinion helps confirm diagnoses and catch details that might be overlooked, improving patient outcomes.",
      highlight: "15% more accurate diagnoses"
    },
    {
      icon: "TrendingUp",
      title: "Practice Efficiency",
      description: "Streamline patient consultations with pre-analyzed images and detailed AI reports, reducing appointment times by 30%.",
      highlight: "30% faster consultations"
    },
    {
      icon: "Users",
      title: "Patient Education",
      description: "Use AI-generated visual explanations to help patients understand their conditions, leading to better treatment acceptance.",
      highlight: "85% treatment acceptance"
    },
    {
      icon: "BarChart3",
      title: "Practice Growth",
      description: "Offer cutting-edge technology that differentiates your practice and attracts tech-savvy patients seeking modern care.",
      highlight: "40% new patient growth"
    }
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-muted via-white to-brand-canvas">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-text-primary mb-4">
            Transforming Dental Care for Everyone
          </h2>
          <p className="text-lg text-text-secondary max-w-3xl mx-auto">
            Whether you're a patient seeking peace of mind or a dental professional looking to enhance your practice, 
            Serene AI delivers value that matters to you.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Patient Benefits */}
          <div className="bg-white rounded-2xl p-8 lg:p-10 shadow-brand border border-border">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon name="Heart" size={32} color="white" />
              </div>
              <h3 className="text-2xl font-bold text-text-primary mb-2">For Patients</h3>
              <p className="text-text-secondary">Take control of your oral health with confidence</p>
            </div>

            <div className="space-y-6 mb-8">
              {patientBenefits?.map((benefit, index) => (
                <div key={index} className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon name={benefit?.icon} size={20} className="text-pink-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-lg font-semibold text-text-primary">{benefit?.title}</h4>
                      <span className="text-xs font-medium text-pink-600 bg-pink-100 px-2 py-1 rounded-full">
                        {benefit?.highlight}
                      </span>
                    </div>
                    <p className="text-text-secondary text-sm">{benefit?.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <Link to="/for-patients" className="block">
              <Button
                variant="default"
                fullWidth
                className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600"
                iconName="ArrowRight"
                iconPosition="right"
                iconSize={18}
              >
                Explore Patient Benefits
              </Button>
            </Link>
          </div>

          {/* Professional Benefits */}
          <div className="bg-white rounded-2xl p-8 lg:p-10 shadow-brand border border-border">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon name="Stethoscope" size={32} color="white" />
              </div>
              <h3 className="text-2xl font-bold text-text-primary mb-2">For Dentists</h3>
              <p className="text-text-secondary">Enhance your practice with AI-powered insights</p>
            </div>

            <div className="space-y-6 mb-8">
              {professionalBenefits?.map((benefit, index) => (
                <div key={index} className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon name={benefit?.icon} size={20} className="text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-lg font-semibold text-text-primary">{benefit?.title}</h4>
                      <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">
                        {benefit?.highlight}
                      </span>
                    </div>
                    <p className="text-text-secondary text-sm">{benefit?.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <Link to="/for-dentists" className="block">
              <Button
                variant="default"
                fullWidth
                iconName="ArrowRight"
                iconPosition="right"
                iconSize={18}
              >
                Explore Professional Benefits
              </Button>
            </Link>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <div className="bg-white rounded-2xl p-8 lg:p-12 shadow-brand border border-border max-w-4xl mx-auto">
            <h3 className="text-2xl lg:text-3xl font-bold text-text-primary mb-4">
              Ready to Experience the Future of Dental Care?
            </h3>
            <p className="text-text-secondary mb-8 max-w-2xl mx-auto">
              Join thousands of patients and hundreds of dental professionals who trust Serene AI 
              for accurate, instant dental insights.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                variant="default"
                size="lg"
                iconName="Camera"
                iconPosition="left"
                iconSize={20}
              >
                Start Free Analysis
              </Button>
              
              <Link to="/pricing">
                <Button
                  variant="outline"
                  size="lg"
                  iconName="CreditCard"
                  iconPosition="left"
                  iconSize={20}
                >
                  View Pricing Plans
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ValueProposition;