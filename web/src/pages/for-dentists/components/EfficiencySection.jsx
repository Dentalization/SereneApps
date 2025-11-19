import React from 'react';
import Icon from '../../../components/AppIcon';

const EfficiencySection = () => {
  const efficiencyFeatures = [
    {
      icon: 'Zap',
      title: 'Instant Analysis',
      description: 'Get comprehensive diagnostic insights in under 2 seconds',
      stat: '< 2s',
      statLabel: 'Processing Time'
    },
    {
      icon: 'TrendingUp',
      title: 'Workflow Optimization',
      description: 'Streamline your diagnostic process with intelligent automation',
      stat: '30%',
      statLabel: 'Time Savings'
    },
    {
      icon: 'Target',
      title: 'Precision Diagnostics',
      description: 'Clinical-grade accuracy with 15+ condition detection',
      stat: '94.7%',
      statLabel: 'Accuracy Rate'
    },
    {
      icon: 'Users',
      title: 'Patient Throughput',
      description: 'See more patients with faster, more accurate diagnostics',
      stat: '25%',
      statLabel: 'More Patients'
    }
  ];

  return (
    <section className="py-20 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center space-x-2 bg-accent/10 text-accent px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Icon name="Zap" size={16} />
            <span>Practice Efficiency</span>
          </div>
          
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
            Maximize Your Practice
            <span className="block text-primary">Efficiency</span>
          </h2>
          
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Transform your diagnostic workflow with AI-powered tools that save time, increase accuracy, 
            and help you deliver better patient care while growing your practice.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {efficiencyFeatures?.map((feature, index) => (
            <div key={index} className="text-center">
              <div className="relative mb-6">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 hover-lift transition-gentle">
                  <Icon name={feature?.icon} size={32} className="text-primary" />
                </div>
                <div className="absolute -top-2 -right-2 bg-accent text-accent-foreground text-xs px-2 py-1 rounded-full font-bold">
                  {feature?.stat}
                </div>
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">{feature?.title}</h3>
              <p className="text-muted-foreground mb-3">{feature?.description}</p>
              <div className="text-sm text-accent font-medium">{feature?.statLabel}</div>
            </div>
          ))}
        </div>

        {/* Efficiency Comparison */}
        <div className="bg-card rounded-2xl border border-border p-8 shadow-brand">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-2xl font-bold text-foreground mb-6">
                Before vs After Serene AI
              </h3>
              
              <div className="space-y-6">
                <div className="flex justify-between items-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <div>
                    <div className="font-medium text-red-900 dark:text-red-100">Manual Analysis</div>
                    <div className="text-sm text-red-600 dark:text-red-300">Traditional diagnostic process</div>
                  </div>
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">15-20 min</div>
                </div>
                
                <div className="flex justify-center">
                  <Icon name="ArrowDown" size={24} className="text-muted-foreground" />
                </div>
                
                <div className="flex justify-between items-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div>
                    <div className="font-medium text-green-900 dark:text-green-100">AI-Powered Analysis</div>
                    <div className="text-sm text-green-600 dark:text-green-300">With Serene AI platform</div>
                  </div>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">&lt; 2 sec</div>
                </div>
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-primary/5 to-secondary/5 p-6 rounded-xl">
                <div className="flex items-center space-x-3 mb-4">
                  <Icon name="Calculator" size={24} className="text-primary" />
                  <h4 className="text-lg font-semibold text-foreground">Time Savings Calculator</h4>
                </div>
                
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Time saved per analysis:</span>
                    <span className="font-bold text-foreground">18 minutes</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Analyses per day:</span>
                    <span className="font-bold text-foreground">15 patients</span>
                  </div>
                  <div className="border-t border-border pt-2 flex justify-between">
                    <span className="text-muted-foreground">Daily time savings:</span>
                    <span className="font-bold text-primary">4.5 hours</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Monthly time savings:</span>
                    <span className="font-bold text-primary">90 hours</span>
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

export default EfficiencySection;