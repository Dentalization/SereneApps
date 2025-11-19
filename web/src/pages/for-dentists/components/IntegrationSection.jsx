import React from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const IntegrationSection = () => {
  const integrations = [
    {
      name: 'Dentrix',
      icon: 'Database',
      description: 'Seamless integration with Dentrix practice management',
      status: 'Available'
    },
    {
      name: 'Eaglesoft',
      icon: 'Layers',
      description: 'Full compatibility with Eaglesoft systems',
      status: 'Available'
    },
    {
      name: 'Open Dental',
      icon: 'Link',
      description: 'Native integration with Open Dental platform',
      status: 'Available'
    },
    {
      name: 'Curve Hero',
      icon: 'Zap',
      description: 'Connect with Curve Hero imaging systems',
      status: 'Available'
    },
    {
      name: 'DEXIS',
      icon: 'Camera',
      description: 'Direct integration with DEXIS imaging',
      status: 'Available'
    },
    {
      name: 'Planmeca',
      icon: 'Monitor',
      description: 'Compatible with Planmeca equipment',
      status: 'Available'
    }
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-secondary/5 to-primary/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center space-x-2 bg-secondary/10 text-secondary px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Icon name="Plug" size={16} />
            <span>System Integration</span>
          </div>
          
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
            Seamless Integration with
            <span className="block text-primary">Your Existing Systems</span>
          </h2>
          
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Connect Serene AI with your current practice management software and imaging systems. 
            No disruption to your workflow - just enhanced capabilities.
          </p>
        </div>

        {/* Integration Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {integrations?.map((integration, index) => (
            <div key={index} className="bg-card p-6 rounded-xl border border-border shadow-brand hover-lift transition-gentle">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center">
                  <Icon name={integration?.icon} size={24} className="text-secondary" />
                </div>
                <div className="inline-flex items-center space-x-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 px-3 py-1 rounded-full text-xs font-medium">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>{integration?.status}</span>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{integration?.name}</h3>
              <p className="text-muted-foreground text-sm">{integration?.description}</p>
            </div>
          ))}
        </div>

        {/* Integration Process */}
        <div className="bg-card rounded-2xl border border-border p-8 shadow-brand">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-2xl font-bold text-foreground mb-6">
                Quick & Easy Setup Process
              </h3>
              
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-white">1</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">Connect Your Systems</h4>
                    <p className="text-muted-foreground text-sm">
                      Simple API connection to your existing practice management software
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-white">2</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">Configure Settings</h4>
                    <p className="text-muted-foreground text-sm">
                      Customize data sync preferences and AI analysis parameters
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <Icon name="Check" size={16} color="white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">Start Analyzing</h4>
                    <p className="text-muted-foreground text-sm">
                      Begin getting AI-powered insights within minutes
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mt-8">
                <Button className="mr-4" iconName="Play">
                  Watch Setup Demo
                </Button>
                <Button variant="outline" iconName="Download">
                  Download Guide
                </Button>
              </div>
            </div>
            
            <div>
              <div className="bg-muted rounded-lg p-6">
                <h4 className="text-lg font-semibold text-foreground mb-4">
                  Integration Benefits
                </h4>
                
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Icon name="CheckCircle" size={20} className="text-green-500" />
                    <span className="text-foreground">No workflow disruption</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Icon name="CheckCircle" size={20} className="text-green-500" />
                    <span className="text-foreground">Automatic data synchronization</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Icon name="CheckCircle" size={20} className="text-green-500" />
                    <span className="text-foreground">Enhanced patient records</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Icon name="CheckCircle" size={20} className="text-green-500" />
                    <span className="text-foreground">Real-time AI insights</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Icon name="CheckCircle" size={20} className="text-green-500" />
                    <span className="text-foreground">Unified reporting dashboard</span>
                  </div>
                </div>
                
                <div className="mt-6 p-4 bg-primary/10 rounded-lg border border-primary/20">
                  <div className="flex items-start space-x-2">
                    <Icon name="Shield" size={16} className="text-primary mt-1" />
                    <div className="text-sm text-primary">
                      <strong>HIPAA Compliant:</strong> All integrations maintain the highest 
                      standards of patient data security and privacy.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Support Section */}
        <div className="mt-16 text-center">
          <h3 className="text-2xl font-bold text-foreground mb-4">
            Need Help with Integration?
          </h3>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Our technical support team is here to help you every step of the way. 
            From initial setup to ongoing maintenance, we ensure seamless operation.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="outline" iconName="MessageCircle">
              Live Chat Support
            </Button>
            <Button variant="outline" iconName="Phone">
              Schedule Call
            </Button>
            <Button variant="outline" iconName="Mail">
              Email Support
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default IntegrationSection;