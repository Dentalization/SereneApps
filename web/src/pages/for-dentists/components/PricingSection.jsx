import React from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const PricingSection = () => {
  const plans = [
    {
      name: 'Starter',
      price: '$199',
      period: '/month',
      description: 'Perfect for small practices getting started with AI diagnostics',
      features: [
        'Up to 100 analyses per month',
        'Basic AI second opinions',
        'Email support',
        'Standard dashboard',
        'Mobile app access',
        'Basic integrations'
      ],
      limitations: [
        'Limited to 2 users',
        'Standard accuracy (92%)',
        'Basic reporting'
      ],
      popular: false,
      buttonText: 'Start Free Trial',
      buttonVariant: 'outline'
    },
    {
      name: 'Professional',
      price: '$499',
      period: '/month',
      description: 'Comprehensive AI tools for growing dental practices',
      features: [
        'Up to 500 analyses per month',
        'Advanced AI second opinions',
        'Priority support & training',
        'Advanced dashboard & analytics',
        'All integrations included',
        'Custom workflows',
        'Team collaboration tools',
        'Advanced reporting suite'
      ],
      limitations: [
        'Up to 10 users'
      ],
      popular: true,
      buttonText: 'Start Free Trial',
      buttonVariant: 'default'
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: '',
      description: 'Full-scale AI platform for large practices and dental groups',
      features: [
        'Unlimited analyses',
        'Premium AI diagnostics (99% accuracy)',
        'Dedicated account manager',
        'Custom dashboard & white-label',
        'API access & custom integrations',
        'Advanced analytics & insights',
        'Multi-location management',
        'Staff training & certification',
        'SLA guarantees'
      ],
      limitations: [],
      popular: false,
      buttonText: 'Contact Sales',
      buttonVariant: 'outline'
    }
  ];

  const additionalServices = [
    {
      name: 'Training & Certification',
      icon: 'GraduationCap',
      description: 'Comprehensive training program for your team',
      price: '$299/person'
    },
    {
      name: 'Custom Integration',
      icon: 'Plug',
      description: 'Connect any practice management system',
      price: 'Starting at $1,999'
    },
    {
      name: 'Data Migration',
      icon: 'Database',
      description: 'Seamless transfer of existing patient data',
      price: 'Starting at $499'
    },
    {
      name: 'White-Label Solution',
      icon: 'Palette',
      description: 'Branded platform for dental groups',
      price: 'Contact for pricing'
    }
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-primary/5 to-secondary/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center space-x-2 bg-accent/10 text-accent px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Icon name="CreditCard" size={16} />
            <span>Transparent Pricing</span>
          </div>
          
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
            Choose Your Perfect
            <span className="block text-primary">AI Solution</span>
          </h2>
          
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Flexible pricing plans designed to grow with your practice. All plans include 
            a 30-day free trial with no setup fees or long-term commitments.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid lg:grid-cols-3 gap-8 mb-16">
          {plans?.map((plan, index) => (
            <div 
              key={index} 
              className={`relative bg-card rounded-2xl border shadow-brand p-8 hover-lift transition-gentle ${
                plan?.popular 
                  ? 'border-primary ring-2 ring-primary/20' :'border-border'
              }`}
            >
              {plan?.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <div className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
                    Most Popular
                  </div>
                </div>
              )}
              
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-foreground mb-2">{plan?.name}</h3>
                <div className="flex items-baseline justify-center mb-4">
                  <span className="text-4xl font-bold text-primary">{plan?.price}</span>
                  {plan?.period && <span className="text-muted-foreground ml-1">{plan?.period}</span>}
                </div>
                <p className="text-muted-foreground text-sm">{plan?.description}</p>
              </div>
              
              <div className="space-y-4 mb-8">
                {plan?.features?.map((feature, idx) => (
                  <div key={idx} className="flex items-start space-x-3">
                    <Icon name="Check" size={16} className="text-green-500 mt-1 flex-shrink-0" />
                    <span className="text-foreground text-sm">{feature}</span>
                  </div>
                ))}
                
                {plan?.limitations?.length > 0 && (
                  <>
                    <div className="border-t border-border pt-4 mt-4">
                      <div className="text-sm text-muted-foreground mb-2 font-medium">Limitations:</div>
                      {plan?.limitations?.map((limitation, idx) => (
                        <div key={idx} className="flex items-start space-x-3">
                          <Icon name="Minus" size={16} className="text-muted-foreground mt-1 flex-shrink-0" />
                          <span className="text-muted-foreground text-sm">{limitation}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
              
              <Button 
                variant={plan?.buttonVariant} 
                fullWidth 
                size="lg"
                className={plan?.popular ? "pulse-heartbeat shadow-brand" : ""}
              >
                {plan?.buttonText}
              </Button>
            </div>
          ))}
        </div>

        {/* Additional Services */}
        <div className="bg-card rounded-2xl border border-border p-8 shadow-brand">
          <h3 className="text-2xl font-bold text-foreground text-center mb-8">
            Additional Services & Add-ons
          </h3>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {additionalServices?.map((service, index) => (
              <div key={index} className="text-center p-6 bg-muted rounded-lg">
                <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Icon name={service?.icon} size={24} className="text-secondary" />
                </div>
                <h4 className="font-semibold text-foreground mb-2">{service?.name}</h4>
                <p className="text-muted-foreground text-sm mb-3">{service?.description}</p>
                <div className="text-primary font-medium text-sm">{service?.price}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ROI Calculator */}
        <div className="mt-16 bg-gradient-to-br from-green-50 dark:from-green-900/20 to-blue-50 dark:to-blue-900/20 rounded-2xl p-8 border border-green-200 dark:border-green-800">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-2xl font-bold text-foreground mb-6">
                Calculate Your ROI
              </h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-card rounded-lg border border-border">
                  <span className="text-muted-foreground">Time saved per day</span>
                  <span className="font-bold text-green-600 dark:text-green-400">4 hours</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-card rounded-lg border border-border">
                  <span className="text-muted-foreground">Additional patients per month</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">25 patients</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-card rounded-lg border border-border">
                  <span className="text-muted-foreground">Average treatment value</span>
                  <span className="font-bold text-primary">$450</span>
                </div>
                <div className="border-t border-border pt-4">
                  <div className="flex justify-between items-center p-4 bg-primary/10 rounded-lg border border-primary/20">
                    <span className="text-primary font-medium">Monthly additional revenue</span>
                    <span className="font-bold text-primary text-xl">$11,250</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="text-center">
              <div className="bg-card rounded-xl p-8 border border-border shadow-brand">
                <h4 className="text-lg font-semibold text-foreground mb-4">
                  Typical ROI Timeline
                </h4>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Month 1:</span>
                    <span className="text-green-500 font-medium">Break even</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Month 3:</span>
                    <span className="text-green-500 font-medium">225% ROI</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Year 1:</span>
                    <span className="text-green-500 font-bold text-lg">2,158% ROI</span>
                  </div>
                </div>
                
                <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-green-600 dark:text-green-400 font-medium text-sm">
                    Average practice sees full ROI within 30 days
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-16 text-center">
          <h3 className="text-2xl font-bold text-foreground mb-6">
            Frequently Asked Questions
          </h3>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="text-left">
              <h4 className="font-semibold text-foreground mb-2">Is there a setup fee?</h4>
              <p className="text-muted-foreground text-sm">
                No setup fees or hidden costs. Start your free trial immediately.
              </p>
            </div>
            
            <div className="text-left">
              <h4 className="font-semibold text-foreground mb-2">Can I cancel anytime?</h4>
              <p className="text-muted-foreground text-sm">
                Yes, cancel anytime with 30 days notice. No long-term contracts required.
              </p>
            </div>
            
            <div className="text-left">
              <h4 className="font-semibold text-foreground mb-2">What's included in support?</h4>
              <p className="text-muted-foreground text-sm">
                Training, technical support, and ongoing assistance with integrations.
              </p>
            </div>
            
            <div className="text-left">
              <h4 className="font-semibold text-foreground mb-2">How accurate is the AI?</h4>
              <p className="text-muted-foreground text-sm">
                94.7% accuracy across all condition types, with 99% accuracy on Enterprise plans.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;