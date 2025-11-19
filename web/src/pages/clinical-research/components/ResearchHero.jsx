import React from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const ResearchHero = () => {
  return (
    <section className="relative bg-gradient-to-br from-primary via-secondary to-primary/90 text-white overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-20 w-32 h-32 border border-white/20 rounded-full"></div>
        <div className="absolute top-40 right-32 w-24 h-24 border border-white/20 rounded-full"></div>
        <div className="absolute bottom-32 left-1/3 w-16 h-16 border border-white/20 rounded-full"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                  <Icon name="FileText" size={24} color="white" />
                </div>
                <span className="text-lg font-semibold text-white/90">Clinical Research</span>
              </div>
              
              <h1 className="text-hero font-bold leading-tight">
                Evidence-Based AI
                <span className="block text-accent">Dental Diagnostics</span>
              </h1>
              
              <p className="text-xl text-white/90 leading-relaxed max-w-xl">
                Peer-reviewed studies and clinical validation data establishing Serene's scientific credibility in AI-powered dental diagnostics.
              </p>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-accent">94.7%</div>
                <div className="text-sm text-white/80">Diagnostic Accuracy</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-accent">15+</div>
                <div className="text-sm text-white/80">Published Studies</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-accent">8</div>
                <div className="text-sm text-white/80">University Partners</div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                variant="secondary" 
                className="bg-white text-primary hover:bg-white/90"
                iconName="Download"
                iconPosition="left"
              >
                Download Research Summary
              </Button>
              <Button 
                variant="outline" 
                className="border-white text-white hover:bg-white/10"
                iconName="ExternalLink"
                iconPosition="right"
              >
                View Publications
              </Button>
            </div>
          </div>

          {/* Visual */}
          <div className="relative">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Latest Clinical Trial</h3>
                  <div className="w-3 h-3 bg-success rounded-full animate-pulse"></div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-white/80">Caries Detection</span>
                    <span className="font-semibold">96.2%</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-2">
                    <div className="bg-accent h-2 rounded-full" style={{width: '96.2%'}}></div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-white/80">Periodontal Assessment</span>
                    <span className="font-semibold">93.8%</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-2">
                    <div className="bg-accent h-2 rounded-full" style={{width: '93.8%'}}></div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-white/80">Oral Pathology</span>
                    <span className="font-semibold">91.5%</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-2">
                    <div className="bg-accent h-2 rounded-full" style={{width: '91.5%'}}></div>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-white/20">
                  <p className="text-sm text-white/70">
                    Multi-center study with 2,847 patients across 12 dental practices
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ResearchHero;