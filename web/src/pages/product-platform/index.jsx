import React, { useEffect } from 'react';
import Header from '../../components/ui/Header';
import TechOverviewSection from './components/TechOverviewSection';
import InteractiveDemo from './components/InteractiveDemo';
import CDSSSection from './components/CDSSSection';
import FeatureCards from './components/FeatureCards';
import ComparisonMatrix from './components/ComparisonMatrix';
import ResourcesSection from './components/ResourcesSection';
import CTASection from './components/CTASection';
import Icon from '../../components/AppIcon';
import LightRays from '../../components/backgrounds/LightRays'; // ← add this

const ProductPlatform = () => {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero Section (WITH LightRays) */}
      <section className="relative isolate overflow-hidden pt-24 pb-16 bg-gradient-to-br from-primary/5 to-secondary/5">
        {/* Background LightRays for the whole hero */}
        <div className="pointer-events-none absolute inset-0 z-0">
          <LightRays
            className="absolute inset-0"
            raysOrigin="top-center"
            raysColor="#8b5cf6"
            raysSpeed={1.15}
            lightSpread={100}
            rayLength={1.1}
            fadeDistance={1.1}
            saturation={1}
            followMouse
            mouseInfluence={0.08}
            noiseAmount={0.04}
            distortion={0.03}
          />
        </div>

        {/* Hero content sits above the rays */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center space-x-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Icon name="Cpu" size={16} />
              <span>AI-Powered by Serene</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Advanced Dental AI
              <span className="block text-primary">Analysis Platform</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              Experience the future of dental diagnostics with our comprehensive AI platform. Powered by YOLOv8 computer vision and GPT-4 reasoning, delivering clinical-grade analysis in under 10 seconds.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="inline-flex items-center justify-center px-8 py-4 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors shadow-brand">
                <Icon name="Play" size={20} className="mr-2" />
                Watch Platform Demo
              </button>
              <button className="inline-flex items-center justify-center px-8 py-4 border-2 border-primary text-primary font-semibold rounded-lg hover:bg-primary hover:text-white transition-colors">
                <Icon name="Sparkles" size={20} className="mr-2" />
                Try Free Analysis
              </button>
            </div>
          </div>

          {/* Platform Preview (LightRays only inside the video area) */}
          <div className="relative max-w-5xl mx-auto">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full" />
                  <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                  <div className="w-3 h-3 bg-green-500 rounded-full" />
                  <div className="ml-4 text-sm text-gray-600">Serene AI Platform - Live Demo</div>
                </div>
              </div>

              {/* Video area with its own LightRays */}
              <div className="relative aspect-video bg-gradient-to-br from-primary/10 to-secondary/10 overflow-hidden">
                <div className="pointer-events-none absolute inset-0 z-0 opacity-90">
                  {/* <LightRays
                    className="absolute inset-0"
                    raysOrigin="top-center"
                    raysColor="#7c3aed"
                    raysSpeed={1.0}
                    lightSpread={0.8}
                    rayLength={0.9}
                    fadeDistance={0.9}
                    saturation={1}
                    followMouse={false}
                    mouseInfluence={0}
                    noiseAmount={0.03}
                    distortion={0.02}
                  /> */}
                </div>

                <div className="relative z-10 flex items-center justify-center h-full text-center">
                  <div>
                    <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Icon name="Play" size={48} className="text-primary" />
                    </div>
                    <p className="text-gray-600">Interactive Platform Demo</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Stats (card has its own LightRays) */}
            <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 w-full max-w-2xl">
              <div className="relative overflow-hidden bg-white/85 backdrop-blur-md rounded-lg shadow-brand border border-gray-200 p-6">
                {/* LightRays inside the stats card */}

                {/* Stats content */}
                <div className="relative z-10 grid grid-cols-3 gap-6 text-center">
                  <div>
                    <div className="text-2xl font-bold text-primary mb-1">94.7%</div>
                    <div className="text-sm text-gray-600">Accuracy Rate</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-primary mb-1">&lt; 2s</div>
                    <div className="text-sm text-gray-600">Analysis Time</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-primary mb-1">15+</div>
                    <div className="text-sm text-gray-600">Conditions Detected</div>
                  </div>
                </div>
              </div>
            </div>
            {/* /Floating Stats */}
          </div>
          {/* /Platform Preview */}
        </div>
      </section>

      {/* Main Content Sections */}
      <TechOverviewSection />
      <InteractiveDemo />
      <CDSSSection />
      <FeatureCards />
      <ComparisonMatrix />
      <ResourcesSection />
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
              <h4 className="font-semibold mb-4">Platform</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API Documentation</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Integrations</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Security</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Clinical Studies</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Case Studies</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Whitepapers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Support</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
            <p>&copy; {new Date().getFullYear()} Serene AI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ProductPlatform;
