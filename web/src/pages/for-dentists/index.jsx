import React, { useEffect } from 'react';
import Header from '../../components/ui/Header';
import Icon from '../../components/AppIcon';

import HeroSection from './components/HeroSection';
import EfficiencySection from './components/EfficiencySection';
import AISecondOpinionSection from './components/AISecondOpinionSection';
import SmartSchedulingSection from './components/SmartSchedulingSection';
import ClinicalInsightsSection from './components/ClinicalInsightsSection';
import DentistDashboardSection from './components/DentistDashboardSection';
import IntegrationSection from './components/IntegrationSection';
import PricingSection from './components/PricingSection';
import TestimonialsSection from './components/TestimonialsSection';
import CTASection from './components/CTASection';

const ForDentists = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <HeroSection />
      <EfficiencySection />
      <AISecondOpinionSection />
      <SmartSchedulingSection />
      <ClinicalInsightsSection />
      <DentistDashboardSection />
      <IntegrationSection />
      <TestimonialsSection />
      {/* <PricingSection /> */}
      <CTASection />
      
      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <Icon name="Brain" size={20} color="white" />
                </div>
                <span className="text-xl font-bold">Serene AI</span>
              </div>
              <p className="text-gray-400 text-sm">
                AI-powered dental analysis platform transforming healthcare with advanced computer vision and clinical intelligence.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">For Dentists</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Platform Overview</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Integration Guide</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Training Resources</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Support Portal</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Clinical Studies</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Case Studies</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Whitepapers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
            <p>&copy; {new Date()?.getFullYear()} Serene AI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ForDentists;