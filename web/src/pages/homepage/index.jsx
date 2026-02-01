import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet';
import Header from '../../components/ui/Header';
import HeroSection from './components/HeroSection';
import TrustSection from './components/TrustSection';
import ValueProposition from './components/ValueProposition';
import TestimonialsSection from './components/TestimonialsSection';
import Footer from './components/Footer';

const Homepage = () => {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <>
      <Helmet>
        <title>Serene AI - AI-Powered Dental Insights You Can Trust</title>
        {/* ... meta tags ... */}
      </Helmet>

      {/* 1. Header is OUTSIDE the scrollable/overflow sections.
         This ensures 'fixed' or 'sticky' works relative to the viewport.
      */}
      <Header />

      <div className="min-h-screen bg-surface-elevated theme-transition pt-16"> 
        {/* Added pt-16 (padding-top) so content doesn't hide behind the fixed header */}

        {/* HERO SECTION */}
        {/* We keep overflow-hidden ONLY on this specific section if needed for background effects */}
        <section className="relative isolate overflow-hidden bg-gradient-to-br from-accent/5 to-accent/10">
          
          {/* Aurora Background (if you uncomment it later) */}
          {/* <div className="absolute top-0 left-0 right-0 h-[15vh] z-0 pointer-events-none">
             <Aurora ... />
          </div> */}

          <div className="relative z-10">
             <HeroSection />
          </div>
        </section>

        {/* MAIN CONTENT */}
        <main>
          <TrustSection />
          <ValueProposition />
          <TestimonialsSection />
        </main>

        <Footer />
      </div>
    </>
  );
};

export default Homepage;