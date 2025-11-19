import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet';
import Header from '../../components/ui/Header';
import HeroSection from './components/HeroSection';
import TrustSection from './components/TrustSection';
import ValueProposition from './components/ValueProposition';
import TestimonialsSection from './components/TestimonialsSection';
import Footer from './components/Footer';

import Aurora from '../../components/backgrounds/Aurora';

const Homepage = () => {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <>
      <Helmet>
        <title>Serene AI - AI-Powered Dental Insights You Can Trust</title>
        <meta
          name="description"
          content="Transform your dental care with AI-powered insights. Get professional-grade dental analysis in seconds, reduce anxiety, and catch issues early. Trusted by 50,000+ patients and 1,200+ dental professionals."
        />
        <meta name="keywords" content="AI dental analysis, dental health, oral care, dental anxiety, early detection, dental technology, YOLOv8, GPT-4, HIPAA compliant" />
        <meta property="og:title" content="Serene AI - AI-Powered Dental Insights You Can Trust" />
        <meta property="og:description" content="Professional-grade dental analysis accessible to everyone. Reduce anxiety, detect issues early, and make informed decisions about your oral health." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://sereneai.com/" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Serene AI - AI-Powered Dental Insights" />
        <meta name="twitter:description" content="Transform dental care with AI. Get instant, professional-grade analysis of your dental health." />
        <link rel="canonical" href="https://sereneai.com/" />
      </Helmet>

      <div className="min-h-screen bg-surface-elevated theme-transition">
        {/* HERO + AURORA (subtle top coverage only) */}
        <section className="relative isolate overflow-hidden min-h-screen bg-gradient-to-br from-accent/5 to-accent/10">
          {/* Aurora hanya menutupi bagian atas (15% dari hero section) */}
          {/* <div className="absolute top-0 left-0 right-0 h-[15vh] z-0 pointer-events-none">
            <Aurora
              className="absolute inset-0 opacity-60 dark:opacity-30"
              colorStops={['#6366F1', '#A855F7', '#EC4899']}
              blend={0.4}
              amplitude={1.5}
              speed={0.8}
              angle={-0.65}
            />
          </div> */}

          {/* Konten hero di atasnya */}
          <div className="relative z-10">
            <Header />
            <main>
              <HeroSection />
            </main>
          </div>
        </section>

        {/* Sections berikutnya */}
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
