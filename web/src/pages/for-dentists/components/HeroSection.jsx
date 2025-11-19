import React from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const HeroSection = () => {
  return (
    <section className="pt-24 pb-16 bg-gradient-to-br from-primary/5 to-secondary/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center space-x-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Icon name="Stethoscope" size={16} />
            <span>For Dental Professionals</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
            AI-Powered Tools for
            <span className="block text-primary">Modern Dentistry</span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Transform your practice with clinical-grade AI analysis, intelligent scheduling, and comprehensive insights. 
            Enhance patient care while streamlining your workflow with proven accuracy and reliability.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button 
              size="lg" 
              iconName="Calendar"
              iconPosition="left"
            >
              Schedule Demo
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              iconName="Play"
              iconPosition="left"
            >
              Watch Overview
            </Button>
          </div>
        </div>

        {/* Hero Dashboard Preview */}
        <div className="relative max-w-6xl mx-auto">
          <div className="bg-card rounded-2xl shadow-2xl border border-border overflow-hidden">
            <div className="bg-muted px-6 py-4 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  </div>
                  <div className="text-sm text-muted-foreground">Serene AI Dashboard</div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span>Live Analysis</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-8 bg-gradient-to-br from-background to-muted">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <h3 className="text-2xl font-bold text-foreground mb-4">
                    Real-Time Analysis Dashboard
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3 p-3 bg-card rounded-lg border border-border">
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                        <Icon name="Check" size={16} color="white" />
                      </div>
                      <div>
                        <div className="font-medium text-foreground">X-Ray Analysis Complete</div>
                        <div className="text-sm text-muted-foreground">15 conditions checked • 2.1s processing time</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3 p-3 bg-card rounded-lg border border-border">
                      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                        <Icon name="Brain" size={16} color="white" />
                      </div>
                      <div>
                        <div className="font-medium text-foreground">AI Second Opinion Ready</div>
                        <div className="text-sm text-muted-foreground">Clinical insights generated • 94.7% confidence</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3 p-3 bg-card rounded-lg border border-border">
                      <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
                        <Icon name="Clock" size={16} color="white" />
                      </div>
                      <div>
                        <div className="font-medium text-foreground">Next Appointment Optimized</div>
                        <div className="text-sm text-muted-foreground">Smart scheduling recommendation available</div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-card rounded-xl border border-border p-6">
                  <div className="aspect-square bg-gradient-to-br from-primary/10 to-secondary/10 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Icon name="Activity" size={32} className="text-primary" />
                      </div>
                      <p className="text-muted-foreground text-sm">Live Dashboard Preview</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Floating Stats */}
          <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 w-full max-w-4xl">
            <div className="bg-card rounded-lg shadow-brand border border-border p-6">
              <div className="grid grid-cols-4 gap-6 text-center">
                <div>
                  <div className="text-2xl font-bold text-primary mb-1">50K+</div>
                  <div className="text-sm text-muted-foreground">Analyses Processed</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary mb-1">2,500+</div>
                  <div className="text-sm text-muted-foreground">Dental Practices</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary mb-1">94.7%</div>
                  <div className="text-sm text-muted-foreground">Diagnostic Accuracy</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary mb-1">30%</div>
                  <div className="text-sm text-muted-foreground">Time Savings</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;