import React from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const CTASection = () => {
  const features = [
    "Free 30-day trial with full platform access",
    "Dedicated onboarding and training support", 
    "Integration assistance with existing systems",
    "24/7 technical support during trial period"
  ];

  const stats = [
    { value: "2,500+", label: "Healthcare Providers" },
    { value: "500K+", label: "Analyses Completed" },
    { value: "94.7%", label: "Diagnostic Accuracy" },
    { value: "< 2s", label: "Analysis Time" }
  ];

  return (
    <section className="py-16 bg-gradient-to-br from-primary to-secondary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Transform Your Practice?
          </h2>
          <p className="text-xl text-primary-foreground/90 max-w-3xl mx-auto">
            Join thousands of dental professionals who are already using Serene AI to enhance diagnostic accuracy, improve patient outcomes, and streamline their workflows.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {stats?.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-white mb-2">{stat?.value}</div>
              <div className="text-primary-foreground/80 text-sm">{stat?.label}</div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Features */}
          <div>
            <h3 className="text-2xl font-bold text-white mb-6">What's Included in Your Trial</h3>
            <div className="space-y-4">
              {features?.map((feature, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-white/20 rounded-full flex items-center justify-center mt-0.5">
                    <Icon name="Check" size={14} color="white" />
                  </div>
                  <span className="text-primary-foreground/90">{feature}</span>
                </div>
              ))}
            </div>

            <div className="mt-8 p-6 bg-white/10 rounded-lg backdrop-blur-sm">
              <div className="flex items-start space-x-3">
                <Icon name="Info" size={20} color="white" className="mt-0.5" />
                <div>
                  <h4 className="font-semibold text-white mb-2">No Credit Card Required</h4>
                  <p className="text-primary-foreground/80 text-sm">
                    Start your free trial immediately with no upfront costs or commitments. Cancel anytime during the trial period.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - CTA Form */}
          <div className="bg-white rounded-2xl p-8 shadow-2xl">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Start Your Free Trial</h3>
              <p className="text-gray-600">Get instant access to the full Serene AI platform</p>
            </div>

            <form className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Smith"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <input
                  type="email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="john.smith@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Practice Name</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Your Dental Practice"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="(555) 123-4567"
                />
              </div>

              <div className="flex items-start space-x-3 pt-2">
                <input
                  type="checkbox"
                  id="terms"
                  className="mt-1 h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <label htmlFor="terms" className="text-sm text-gray-600">
                  I agree to the <a href="#" className="text-primary hover:underline">Terms of Service</a> and <a href="#" className="text-primary hover:underline">Privacy Policy</a>
                </label>
              </div>

              <Button variant="default" fullWidth className="mt-6" iconName="Sparkles" iconPosition="left">
                Start Free Trial
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                Already have an account? <a href="#" className="text-primary hover:underline font-medium">Sign in here</a>
              </p>
            </div>
          </div>
        </div>

        {/* Bottom CTA Options */}
        <div className="mt-12 text-center">
          <p className="text-primary-foreground/80 mb-6">
            Prefer to speak with our team first?
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20" iconName="Calendar" iconPosition="left">
              Schedule Demo
            </Button>
            <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20" iconName="Phone" iconPosition="left">
              Call Adrian: (+62) 812-8792-8805
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;