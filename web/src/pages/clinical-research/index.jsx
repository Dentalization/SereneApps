import React from 'react';
import Header from '../../components/ui/Header';
import ResearchHero from './components/ResearchHero';
import AccuracyMetrics from './components/AccuracyMetrics';
import PublishedResearch from './components/PublishedResearch';
import UniversityPartnerships from './components/UniversityPartnerships';
import MethodologySection from './components/MethodologySection';
import AdvisoryBoard from './components/AdvisoryBoard';
import RegulatorySection from './components/RegulatorySection';
import ResearchParticipation from './components/ResearchParticipation';

const ClinicalResearch = () => {
  console.log('CLINICAL RESEARCH COMPONENT LOADED - THIS IS THE WRONG PAGE FOR HOMEPAGE');
  
  return (
    <div className="min-h-screen bg-background">
      <Header />
      {/* Main Content */}
      <main className="pt-16">
        <ResearchHero />
        <AccuracyMetrics />
        <PublishedResearch />
        <UniversityPartnerships />
        <MethodologySection />
        <AdvisoryBoard />
        <RegulatorySection />
        <ResearchParticipation />
      </main>
      {/* Footer */}
      <footer className="bg-text-primary text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">S</span>
                </div>
                <span className="text-lg font-bold">Serene AI</span>
              </div>
              <p className="text-gray-400 text-sm">
                Evidence-based AI dental diagnostics advancing healthcare through rigorous research and clinical validation.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Research</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Published Studies</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Clinical Trials</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Methodology</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Advisory Board</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Participation</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Research Programs</a></li>
                <li><a href="#" className="hover:text-white transition-colors">University Partners</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Apply to Join</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Collaboration</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Compliance</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Regulatory Status</a></li>
                <li><a href="#" className="hover:text-white transition-colors">FDA Pathway</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Ethics</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-700 mt-8 pt-8 text-center text-sm text-gray-400">
            <p>&copy; {new Date()?.getFullYear()} Serene AI. All rights reserved. | Advancing dental care through evidence-based AI research.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ClinicalResearch;