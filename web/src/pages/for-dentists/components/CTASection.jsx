import React from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const CTASection = () => {
  const benefits = [
    {
      icon: 'Clock',
      text: '30-day free trial'
    },
    {
      icon: 'CreditCard',
      text: 'No setup fees'
    },
    {
      icon: 'Shield',
      text: 'HIPAA compliant'
    },
    {
      icon: 'Phone',
      text: 'Dedicated support'
    }
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-primary to-secondary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center text-white">
          <div className="inline-flex items-center space-x-2 bg-white/10 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Icon name="Sparkles" size={16} />
            <span>Ready to Transform Your Practice?</span>
          </div>
          
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Start Your AI Journey
            <span className="block">Today</span>
          </h2>
          
          <p className="text-xl text-white/90 max-w-3xl mx-auto mb-8">
            Join thousands of dentists who have already transformed their practice with AI. 
            Experience the future of dental diagnostics with our risk-free trial.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button 
              size="xl" 
              variant="secondary"
              className="bg-white text-primary hover:bg-white/90 shadow-brand-hover"
              iconName="Sparkles"
              iconPosition="left"
            >
              Start Free Trial
            </Button>
            <Button 
              size="xl" 
              variant="outline"
              className="border-white text-white hover:bg-white hover:text-primary"
              iconName="Calendar"
              iconPosition="left"
            >
              Schedule Demo
            </Button>
          </div>
          
          {/* Benefits */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
            {benefits?.map((benefit, index) => (
              <div key={index} className="flex items-center justify-center space-x-2 text-white/90">
                <Icon name={benefit?.icon} size={20} />
                <span className="text-sm font-medium">{benefit?.text}</span>
              </div>
            ))}
          </div>
          
          {/* Contact Info */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 max-w-4xl mx-auto">
            <h3 className="text-2xl font-bold text-white mb-6">
              Questions? We're Here to Help
            </h3>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Icon name="Phone" size={24} />
                </div>
                <div className="font-semibold text-white mb-1">Call Us</div>
                <div className="text-white/80 text-sm">1-800-SERENE-AI</div>
                <div className="text-white/80 text-sm">Mon-Fri 8AM-6PM PST</div>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Icon name="Mail" size={24} />
                </div>
                <div className="font-semibold text-white mb-1">Email Support</div>
                <div className="text-white/80 text-sm">dentists@sereneai.com</div>
                <div className="text-white/80 text-sm">Response within 2 hours</div>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Icon name="MessageCircle" size={24} />
                </div>
                <div className="font-semibold text-white mb-1">Live Chat</div>
                <div className="text-white/80 text-sm">Available 24/7</div>
                <div className="text-white/80 text-sm">Instant technical support</div>
              </div>
            </div>
            
            <div className="mt-8 pt-8 border-t border-white/20 text-center">
              <p className="text-white/80 text-sm max-w-2xl mx-auto">
                Ready to see Serene AI in action? Our team of dental technology specialists 
                will show you exactly how our platform can benefit your specific practice.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;