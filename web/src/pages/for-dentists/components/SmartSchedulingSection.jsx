import React from 'react';
import Icon from '../../../components/AppIcon';

const SmartSchedulingSection = () => {
  const schedulingFeatures = [
    {
      icon: 'Calendar',
      title: 'Intelligent Booking',
      description: 'AI optimizes appointment slots based on treatment complexity and duration',
      benefit: 'Reduces gaps by 35%'
    },
    {
      icon: 'Clock',
      title: 'Treatment Time Prediction',
      description: 'Accurate time estimates based on AI analysis and historical data',
      benefit: 'Improves punctuality'
    },
    {
      icon: 'Users',
      title: 'Patient Prioritization',
      description: 'Smart scheduling based on urgency, treatment needs, and preferences',
      benefit: 'Better patient care'
    },
    {
      icon: 'Repeat',
      title: 'Follow-up Automation',
      description: 'Automated scheduling for check-ups and treatment continuations',
      benefit: 'Increases retention'
    }
  ];

  return (
    <section className="py-20 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center space-x-2 bg-secondary/10 text-secondary px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Icon name="Calendar" size={16} />
            <span>Smart Scheduling</span>
          </div>
          
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
            Intelligent Appointment
            <span className="block text-primary">Management</span>
          </h2>
          
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Optimize your practice schedule with AI-powered booking that considers treatment complexity, 
            patient needs, and practice efficiency to maximize your daily productivity.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {schedulingFeatures?.map((feature, index) => (
            <div key={index} className="bg-card p-6 rounded-xl border border-border shadow-brand hover-lift transition-gentle">
              <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center mb-4">
                <Icon name={feature?.icon} size={24} className="text-secondary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{feature?.title}</h3>
              <p className="text-muted-foreground text-sm mb-3">{feature?.description}</p>
              <div className="inline-flex items-center space-x-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 px-3 py-1 rounded-full text-xs font-medium">
                <Icon name="TrendingUp" size={12} />
                <span>{feature?.benefit}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h3 className="text-2xl font-bold text-foreground mb-6">
              Schedule Optimization Dashboard
            </h3>
            
            <div className="bg-card rounded-xl border border-border p-6 shadow-brand">
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-lg font-semibold text-foreground">Today's Schedule</h4>
                <div className="flex items-center space-x-2 text-sm text-green-600 dark:text-green-400">
                  <Icon name="CheckCircle" size={16} />
                  <span>95% Optimized</span>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <div>
                      <div className="font-medium text-foreground">9:00 AM - Routine Cleaning</div>
                      <div className="text-sm text-muted-foreground">Patient: Sarah Johnson</div>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">45 min</div>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                    <div>
                      <div className="font-medium text-foreground">10:00 AM - Root Canal</div>
                      <div className="text-sm text-muted-foreground">Patient: Mike Davis</div>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">90 min</div>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <div>
                      <div className="font-medium text-foreground">12:00 PM - Consultation</div>
                      <div className="text-sm text-muted-foreground">Patient: Emma Wilson</div>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">30 min</div>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-primary/10 rounded border border-primary/20">
                <div className="flex items-start space-x-2">
                  <Icon name="Lightbulb" size={16} className="text-primary mt-1" />
                  <div className="text-sm text-primary">
                    <strong>AI Suggestion:</strong> Consider scheduling complex procedures in the morning 
                    when both you and patients are most alert.
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-8">
            <div className="bg-gradient-to-br from-secondary/5 to-primary/5 p-6 rounded-xl">
              <h4 className="text-lg font-semibold text-foreground mb-4">
                Scheduling Intelligence Metrics
              </h4>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Schedule Efficiency</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 bg-muted rounded-full h-2">
                      <div className="w-20 bg-primary h-2 rounded-full"></div>
                    </div>
                    <span className="text-foreground font-medium">85%</span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Patient Satisfaction</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 bg-muted rounded-full h-2">
                      <div className="w-22 bg-green-500 h-2 rounded-full"></div>
                    </div>
                    <span className="text-foreground font-medium">92%</span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">On-Time Performance</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 bg-muted rounded-full h-2">
                      <div className="w-20 bg-blue-500 h-2 rounded-full"></div>
                    </div>
                    <span className="text-foreground font-medium">88%</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-card rounded-xl border border-border p-6 shadow-brand">
              <h4 className="text-lg font-semibold text-foreground mb-4">
                Weekly Schedule Insights
              </h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-primary mb-1">127</div>
                  <div className="text-sm text-muted-foreground">Appointments</div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-green-500 mb-1">94%</div>
                  <div className="text-sm text-muted-foreground">Attendance Rate</div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-amber-500 mb-1">12</div>
                  <div className="text-sm text-muted-foreground">Rescheduled</div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-secondary mb-1">3.2h</div>
                  <div className="text-sm text-muted-foreground">Time Saved</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SmartSchedulingSection;