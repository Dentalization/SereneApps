import React, { useEffect } from 'react';
import Header from '../../components/ui/Header';
import Footer from '../../components/ui/Footer'; // Import the shared Footer

// Page Sections
import HeroSection from './components/HeroSection';
import EfficiencySection from './components/EfficiencySection';
import AISecondOpinionSection from './components/AISecondOpinionSection';
import SmartSchedulingSection from './components/SmartSchedulingSection';
import ClinicalInsightsSection from './components/ClinicalInsightsSection';
import DentistDashboardSection from './components/DentistDashboardSection';
import IntegrationSection from './components/IntegrationSection';
import TestimonialsSection from './components/TestimonialsSection';
import CTASection from './components/CTASection';

const ForDentists = () => {
  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans selection:bg-blue-500/30">
      
      {/* Navigation */}
      <Header />
      
      {/* Main Content */}
      <main>
        <HeroSection />
        <EfficiencySection />
        <AISecondOpinionSection />
        <SmartSchedulingSection />
        <ClinicalInsightsSection />
        <DentistDashboardSection />
        <IntegrationSection />
        <TestimonialsSection />
        {/* <PricingSection /> -- Commented out as in your original code */}
        <CTASection />
      </main>
      
      {/* Footer */}
      <Footer />
      
    </div>
  );
};

export default ForDentists;