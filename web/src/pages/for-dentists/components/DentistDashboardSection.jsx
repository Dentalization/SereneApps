import React from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const DentistDashboardSection = () => {
  const dashboardFeatures = [
    {
      icon: 'LayoutDashboard',
      title: 'Unified Dashboard',
      description: 'All your practice data in one comprehensive view'
    },
    {
      icon: 'FileText',
      title: 'Patient Records',
      description: 'Digital patient files with AI-enhanced documentation'
    },
    {
      icon: 'Calendar',
      title: 'Schedule Management',
      description: 'Intelligent booking and appointment optimization'
    },
    {
      icon: 'BarChart3',
      title: 'Analytics Suite',
      description: 'Advanced reporting and performance insights'
    },
    {
      icon: 'Bell',
      title: 'Smart Alerts',
      description: 'Proactive notifications for important events'
    },
    {
      icon: 'Settings',
      title: 'Custom Workflows',
      description: 'Personalized workflows for your practice style'
    }
  ];

  return (
    <section className="py-20 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center space-x-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Icon name="LayoutDashboard" size={16} />
            <span>Dentist Dashboard</span>
          </div>
          
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
            Your Command Center for
            <span className="block text-primary">Modern Dentistry</span>
          </h2>
          
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Experience the ultimate dental practice management platform. Our intuitive dashboard 
            brings together AI diagnostics, patient management, and practice analytics in one place.
          </p>
        </div>

        {/* Dashboard Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {dashboardFeatures?.map((feature, index) => (
            <div key={index} className="bg-card p-6 rounded-xl border border-border shadow-brand hover-lift transition-gentle">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Icon name={feature?.icon} size={24} className="text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{feature?.title}</h3>
              <p className="text-muted-foreground text-sm">{feature?.description}</p>
            </div>
          ))}
        </div>

        {/* Dashboard Illustration */}
        <div className="bg-gradient-to-br from-primary/5 to-secondary/5 rounded-2xl p-8 mb-16">
          <div className="max-w-4xl mx-auto">
            <h3 className="text-2xl font-bold text-foreground text-center mb-8">
              Interactive Dashboard Preview
            </h3>
            
            <div className="bg-card rounded-xl border border-border shadow-brand overflow-hidden">
              {/* Dashboard Header */}
              <div className="bg-muted px-6 py-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                        <Icon name="Brain" size={20} color="white" />
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">Dr. Sarah Mitchell</div>
                        <div className="text-sm text-muted-foreground">Dental Practice Dashboard</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Button variant="ghost" size="sm" iconName="Bell">
                      3
                    </Button>
                    <Button variant="ghost" size="sm" iconName="Settings" />
                  </div>
                </div>
              </div>
              
              {/* Dashboard Content */}
              <div className="p-6">
                <div className="grid lg:grid-cols-3 gap-6">
                  {/* Today's Overview */}
                  <div className="lg:col-span-2">
                    <h4 className="text-lg font-semibold text-foreground mb-4">Today's Overview</h4>
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="bg-muted p-4 rounded-lg text-center">
                        <div className="text-2xl font-bold text-primary mb-1">14</div>
                        <div className="text-sm text-muted-foreground">Appointments</div>
                      </div>
                      <div className="bg-muted p-4 rounded-lg text-center">
                        <div className="text-2xl font-bold text-green-500 mb-1">12</div>
                        <div className="text-sm text-muted-foreground">Completed</div>
                      </div>
                      <div className="bg-muted p-4 rounded-lg text-center">
                        <div className="text-2xl font-bold text-amber-500 mb-1">2</div>
                        <div className="text-sm text-muted-foreground">Pending</div>
                      </div>
                    </div>
                    
                    {/* Recent Activity */}
                    <div>
                      <h5 className="font-medium text-foreground mb-3">Recent Activity</h5>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
                          <Icon name="FileCheck" size={20} className="text-green-500" />
                          <div className="flex-1">
                            <div className="font-medium text-foreground">Analysis completed for John Doe</div>
                            <div className="text-sm text-muted-foreground">Root canal assessment • 2 minutes ago</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
                          <Icon name="Calendar" size={20} className="text-primary" />
                          <div className="flex-1">
                            <div className="font-medium text-foreground">Appointment scheduled</div>
                            <div className="text-sm text-muted-foreground">Emma Wilson • Follow-up in 2 weeks</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
                          <Icon name="AlertTriangle" size={20} className="text-amber-500" />
                          <div className="flex-1">
                            <div className="font-medium text-foreground">Risk alert generated</div>
                            <div className="text-sm text-muted-foreground">Patient requires immediate attention</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Quick Actions */}
                  <div>
                    <h4 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h4>
                    <div className="space-y-3">
                      <Button variant="outline" fullWidth iconName="Upload" className="justify-start">
                        Upload X-Ray
                      </Button>
                      <Button variant="outline" fullWidth iconName="UserPlus" className="justify-start">
                        New Patient
                      </Button>
                      <Button variant="outline" fullWidth iconName="Calendar" className="justify-start">
                        Schedule Appointment
                      </Button>
                      <Button variant="outline" fullWidth iconName="FileText" className="justify-start">
                        Generate Report
                      </Button>
                    </div>
                    
                    {/* AI Insights */}
                    <div className="mt-6">
                      <h5 className="font-medium text-foreground mb-3">AI Insights</h5>
                      <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                        <div className="flex items-start space-x-2">
                          <Icon name="Brain" size={16} className="text-primary mt-1" />
                          <div className="text-sm">
                            <div className="font-medium text-primary mb-1">Today's Recommendation</div>
                            <div className="text-primary/80">
                              Consider scheduling Mrs. Johnson's crown placement during her next visit 
                              based on her X-ray analysis.
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Benefits */}
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h3 className="text-2xl font-bold text-foreground mb-6">
              Why Dentists Love Our Dashboard
            </h3>
            
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon name="Zap" size={24} className="text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-foreground mb-2">Instant Overview</h4>
                  <p className="text-muted-foreground">
                    Get a complete picture of your practice at a glance. Critical information is always 
                    just one click away.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon name="Smartphone" size={24} className="text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-foreground mb-2">Mobile Responsive</h4>
                  <p className="text-muted-foreground">
                    Access your dashboard anywhere, anytime. Fully optimized for desktop, tablet, 
                    and mobile devices.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon name="Palette" size={24} className="text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-foreground mb-2">Customizable</h4>
                  <p className="text-muted-foreground">
                    Tailor your dashboard to match your workflow. Drag-and-drop widgets, 
                    custom themes, and personalized layouts.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-card rounded-xl border border-border p-6 shadow-brand">
            <h4 className="text-lg font-semibold text-foreground mb-4">
              Dashboard Performance Metrics
            </h4>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-muted-foreground">User Satisfaction</span>
                  <span className="font-bold text-green-500">98%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: '98%' }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-muted-foreground">Task Completion Speed</span>
                  <span className="font-bold text-primary">65% Faster</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full" style={{ width: '65%' }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-muted-foreground">Learning Curve</span>
                  <span className="font-bold text-amber-500">2 Hours</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-amber-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                </div>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary mb-1">2,847</div>
                <div className="text-sm text-muted-foreground">Active Dental Practices</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DentistDashboardSection;