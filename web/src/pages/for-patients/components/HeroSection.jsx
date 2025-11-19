import React from 'react';
import Button from '../../../components/ui/Button';
import Image from '../../../components/AppImage';

const HeroSection = () => {
  return (
    <section className="relative bg-gradient-to-br from-surface via-white to-brand-canvas min-h-screen flex items-center">
      <div className="absolute inset-0 bg-white/60"></div>
      
      <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="space-y-8 fade-in-up">
            <div className="space-y-4">
              <div className="inline-flex items-center px-4 py-2 bg-primary/10 rounded-full">
                <span className="text-sm font-medium text-primary">AI-Powered Dental Care</span>
              </div>
              
              <h1 className="text-hero text-text-primary leading-tight">
                Take control of your 
                <span className="text-brand-primary"> dental health</span> from home
              </h1>
              
              <p className="text-value-prop text-text-secondary max-w-xl">
                Get instant AI-powered insights about your dental health. Upload a photo, receive professional-grade analysis, and know when to seek care—all from the comfort of your home.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                variant="default" 
                size="lg"
                iconName="Camera"
                iconPosition="left"
                iconSize={20}
              >
                Start Free Analysis
              </Button>
              
              <Button 
                variant="outline" 
                size="lg"
                iconName="Play"
                iconPosition="left"
                iconSize={20}
              >
                Watch How It Works
              </Button>
            </div>

            {/* Trust Indicators */}
            <div className="flex items-center space-x-6 pt-4">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-trust-green rounded-full"></div>
                <span className="text-sm text-text-secondary">HIPAA Compliant</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-trust-green rounded-full"></div>
                <span className="text-sm text-text-secondary">Clinically Validated</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-trust-green rounded-full"></div>
                <span className="text-sm text-text-secondary">100% Private</span>
              </div>
            </div>
          </div>

          {/* Hero Image */}
          <div className="relative">
            <div className="relative bg-white rounded-2xl shadow-brand-hover p-8 hover-lift">
              <Image 
                src="https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=600&h=400&fit=crop&crop=center"
                alt="Happy patient using dental health app"
                className="w-full h-80 object-cover rounded-lg"
              />
              
              {/* Floating Analysis Card */}
              <div className="absolute -bottom-4 -right-4 bg-white rounded-lg shadow-brand p-4 border border-border">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-trust-green rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">✓</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">Analysis Complete</p>
                    <p className="text-xs text-text-secondary">Healthy gums detected</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Background Decoration */}
            <div className="absolute -top-4 -left-4 w-24 h-24 bg-brand-gradient rounded-full opacity-20 blur-xl"></div>
            <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-accent/20 rounded-full blur-xl"></div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;