import React from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const AISecondOpinionSection = () => {
  const features = [
    {
      icon: 'Brain',
      title: 'Clinical Decision Support',
      description: 'AI-powered second opinions backed by thousands of verified cases'
    },
    {
      icon: 'Shield',
      title: 'Risk Assessment',
      description: 'Comprehensive risk analysis for treatment planning confidence'
    },
    {
      icon: 'BookOpen',
      title: 'Evidence-Based Insights',
      description: 'Recommendations based on latest clinical research and guidelines'
    },
    {
      icon: 'AlertTriangle',
      title: 'Early Detection',
      description: 'Identify conditions in early stages for better patient outcomes'
    }
  ];

  const conditions = [
    'Dental Caries',
    'Periodontal Disease',
    'Impacted Teeth',
    'Root Canal Issues',
    'Bone Loss',
    'Oral Pathology',
    'TMJ Disorders',
    'Orthodontic Issues',
    'Endodontic Problems',
    'Restorative Needs',
    'Implant Planning',
    'Surgical Assessment',
    'Pediatric Conditions',
    'Geriatric Concerns',
    'Emergency Cases'
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-primary/5 to-secondary/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center space-x-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Icon name="Brain" size={16} />
            <span>AI Second Opinion</span>
          </div>
          
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
            Your AI Clinical
            <span className="block text-primary">Consultant</span>
          </h2>
          
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Get instant AI-powered second opinions on complex cases. Our clinical decision support 
            system provides evidence-based insights to enhance your diagnostic confidence.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
          <div>
            <div className="grid sm:grid-cols-2 gap-6">
              {features?.map((feature, index) => (
                <div key={index} className="bg-card p-6 rounded-xl border border-border shadow-brand hover-lift transition-gentle">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <Icon name={feature?.icon} size={24} className="text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{feature?.title}</h3>
                  <p className="text-muted-foreground text-sm">{feature?.description}</p>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-card rounded-2xl border border-border p-8 shadow-brand">
            <h3 className="text-2xl font-bold text-foreground mb-6">
              Conditions Analyzed
            </h3>
            
            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="text-foreground font-medium">Detection Accuracy</span>
                <span className="text-primary font-bold">94.7%</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="text-foreground font-medium">Processing Speed</span>
                <span className="text-primary font-bold">&lt; 2 seconds</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="text-foreground font-medium">Conditions Covered</span>
                <span className="text-primary font-bold">15+ Types</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              {conditions?.slice(0, 8)?.map((condition, index) => (
                <div key={index} className="text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded">
                  {condition}
                </div>
              ))}
            </div>
            
            <Button variant="outline" className="w-full mt-4" iconName="Plus">
              View All Conditions
            </Button>
          </div>
        </div>

        {/* Case Study Example */}
        <div className="bg-card rounded-2xl border border-border p-8 shadow-brand">
          <div className="grid lg:grid-cols-3 gap-8">
            <div>
              <h3 className="text-xl font-bold text-foreground mb-4">
                Case Study Example
              </h3>
              <p className="text-muted-foreground mb-6">
                See how our AI second opinion system helps dentists make more confident diagnostic decisions.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center mt-1">
                    <span className="text-xs font-bold text-white">1</span>
                  </div>
                  <div>
                    <div className="font-medium text-foreground">Upload X-Ray</div>
                    <div className="text-sm text-muted-foreground">Patient presents with jaw pain</div>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center mt-1">
                    <span className="text-xs font-bold text-white">2</span>
                  </div>
                  <div>
                    <div className="font-medium text-foreground">AI Analysis</div>
                    <div className="text-sm text-muted-foreground">System detects multiple findings</div>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mt-1">
                    <Icon name="Check" size={12} color="white" />
                  </div>
                  <div>
                    <div className="font-medium text-foreground">Clinical Insights</div>
                    <div className="text-sm text-muted-foreground">Treatment recommendations provided</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="lg:col-span-2">
              <div className="bg-muted rounded-lg p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Icon name="FileX" size={24} className="text-muted-foreground" />
                  <div>
                    <div className="font-medium text-foreground">Patient Case #A47291</div>
                    <div className="text-sm text-muted-foreground">Panoramic X-Ray Analysis</div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-background rounded border border-border">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                      <span className="text-foreground">Impacted Wisdom Tooth (Tooth #32)</span>
                    </div>
                    <span className="text-sm text-muted-foreground">87% confidence</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-background rounded border border-border">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span className="text-foreground">Potential Cyst Formation</span>
                    </div>
                    <span className="text-sm text-muted-foreground">92% confidence</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-background rounded border border-border">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-foreground">Surgical Extraction Recommended</span>
                    </div>
                    <span className="text-sm text-muted-foreground">Treatment Plan</span>
                  </div>
                </div>
                
                <div className="mt-4 p-3 bg-primary/10 rounded border border-primary/20">
                  <div className="flex items-start space-x-2">
                    <Icon name="Lightbulb" size={16} className="text-primary mt-1" />
                    <div className="text-sm text-primary">
                      <strong>AI Recommendation:</strong> Consider referral to oral surgeon for complex extraction. 
                      Monitor adjacent teeth for potential damage.
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

export default AISecondOpinionSection;