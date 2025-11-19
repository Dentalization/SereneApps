import React from 'react';
import Icon from '../../../components/AppIcon';

const ClinicalInsightsSection = () => {
  const insightTypes = [
    {
      icon: 'BarChart3',
      title: 'Practice Analytics',
      description: 'Comprehensive insights into your practice performance and patient trends',
      metrics: ['Patient Demographics', 'Treatment Success Rates', 'Revenue Trends']
    },
    {
      icon: 'Activity',
      title: 'Clinical Patterns',
      description: 'AI identifies patterns in your diagnostic and treatment decisions',
      metrics: ['Diagnostic Accuracy', 'Treatment Outcomes', 'Case Complexity']
    },
    {
      icon: 'TrendingUp',
      title: 'Predictive Analytics',
      description: 'Forecast patient needs and practice growth opportunities',
      metrics: ['Risk Assessments', 'Treatment Planning', 'Resource Optimization']
    },
    {
      icon: 'Shield',
      title: 'Quality Assurance',
      description: 'Continuous monitoring of clinical quality and compliance',
      metrics: ['Standards Compliance', 'Peer Comparisons', 'Best Practices']
    }
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-accent/5 to-primary/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center space-x-2 bg-accent/10 text-accent px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Icon name="BarChart3" size={16} />
            <span>Clinical Insights</span>
          </div>
          
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
            Data-Driven Clinical
            <span className="block text-primary">Intelligence</span>
          </h2>
          
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Transform your practice data into actionable insights. Our AI analytics platform 
            provides deep clinical intelligence to improve patient outcomes and practice performance.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {insightTypes?.map((insight, index) => (
            <div key={index} className="bg-card p-8 rounded-xl border border-border shadow-brand hover-lift transition-gentle">
              <div className="flex items-start space-x-4">
                <div className="w-14 h-14 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon name={insight?.icon} size={28} className="text-accent" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-foreground mb-3">{insight?.title}</h3>
                  <p className="text-muted-foreground mb-4">{insight?.description}</p>
                  <div className="space-y-2">
                    {insight?.metrics?.map((metric, idx) => (
                      <div key={idx} className="flex items-center space-x-2">
                        <Icon name="CheckCircle" size={16} className="text-green-500" />
                        <span className="text-sm text-muted-foreground">{metric}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Analytics Dashboard Preview */}
        <div className="bg-card rounded-2xl border border-border p-8 shadow-brand">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-bold text-foreground">Clinical Insights Dashboard</h3>
            <div className="flex items-center space-x-2 text-sm text-green-600 dark:text-green-400">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Live Data</span>
            </div>
          </div>
          
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Key Metrics */}
            <div>
              <h4 className="text-lg font-semibold text-foreground mb-4">Key Metrics</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Icon name="Users" size={20} className="text-primary" />
                    <span className="text-foreground">Active Patients</span>
                  </div>
                  <span className="font-bold text-primary">2,847</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Icon name="Target" size={20} className="text-green-500" />
                    <span className="text-foreground">Success Rate</span>
                  </div>
                  <span className="font-bold text-green-500">96.3%</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Icon name="Clock" size={20} className="text-amber-500" />
                    <span className="text-foreground">Avg. Treatment Time</span>
                  </div>
                  <span className="font-bold text-amber-500">47 min</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Icon name="DollarSign" size={20} className="text-secondary" />
                    <span className="text-foreground">Monthly Revenue</span>
                  </div>
                  <span className="font-bold text-secondary">$124K</span>
                </div>
              </div>
            </div>
            
            {/* Treatment Analysis */}
            <div>
              <h4 className="text-lg font-semibold text-foreground mb-4">Treatment Analysis</h4>
              <div className="bg-muted rounded-lg p-4">
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-muted-foreground">Preventive Care</span>
                      <span className="text-sm font-medium text-foreground">45%</span>
                    </div>
                    <div className="w-full bg-background rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: '45%' }}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-muted-foreground">Restorative</span>
                      <span className="text-sm font-medium text-foreground">30%</span>
                    </div>
                    <div className="w-full bg-background rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full" style={{ width: '30%' }}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-muted-foreground">Surgical</span>
                      <span className="text-sm font-medium text-foreground">15%</span>
                    </div>
                    <div className="w-full bg-background rounded-full h-2">
                      <div className="bg-amber-500 h-2 rounded-full" style={{ width: '15%' }}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-muted-foreground">Orthodontic</span>
                      <span className="text-sm font-medium text-foreground">10%</span>
                    </div>
                    <div className="w-full bg-background rounded-full h-2">
                      <div className="bg-secondary h-2 rounded-full" style={{ width: '10%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* AI Recommendations */}
            <div>
              <h4 className="text-lg font-semibold text-foreground mb-4">AI Recommendations</h4>
              <div className="space-y-3">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-start space-x-2">
                    <Icon name="Lightbulb" size={16} className="text-blue-600 dark:text-blue-400 mt-1" />
                    <div className="text-sm">
                      <div className="font-medium text-blue-900 dark:text-blue-100 mb-1">Schedule Optimization</div>
                      <div className="text-blue-600 dark:text-blue-300">
                        Consider scheduling complex procedures earlier in the day for better outcomes.
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-start space-x-2">
                    <Icon name="TrendingUp" size={16} className="text-green-600 dark:text-green-400 mt-1" />
                    <div className="text-sm">
                      <div className="font-medium text-green-900 dark:text-green-100 mb-1">Revenue Opportunity</div>
                      <div className="text-green-600 dark:text-green-300">
                        15% increase in preventive care bookings would boost monthly revenue by $18K.
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <div className="flex items-start space-x-2">
                    <Icon name="AlertTriangle" size={16} className="text-amber-600 dark:text-amber-400 mt-1" />
                    <div className="text-sm">
                      <div className="font-medium text-amber-900 dark:text-amber-100 mb-1">Patient Risk Alert</div>
                      <div className="text-amber-600 dark:text-amber-300">
                        3 patients showing early signs of periodontal disease - schedule follow-ups.
                      </div>
                    </div>
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

export default ClinicalInsightsSection;