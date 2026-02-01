import React from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const CTASection = () => {
  const benefits = [
    { icon: 'Clock', text: '30-Day Free Trial' },
    { icon: 'CreditCard', text: 'No Credit Card Required' },
    { icon: 'Shield', text: 'HIPAA Compliant' },
    { icon: 'Headphones', text: '24/7 Priority Support' }
  ];

  return (
    <section className="relative py-24 overflow-hidden">
      
      {/* Dynamic Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-slate-900 to-purple-900 z-0" />
      <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 z-0" />
      
      {/* Glowing Orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-500/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-purple-500/20 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center text-white mb-16">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 px-4 py-1.5 rounded-full text-sm font-medium text-blue-100 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Icon name="Sparkles" size={14} className="text-yellow-400" />
            <span>Limited Time Offer: Get 1 Month Free</span>
          </div>
          
          {/* Heading */}
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 tracking-tight leading-tight">
            Ready to Modernize <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-purple-200">
              Your Dental Practice?
            </span>
          </h2>
          
          <p className="text-xl text-blue-100/80 max-w-2xl mx-auto mb-10 leading-relaxed">
            Join 2,500+ dental professionals using Serene AI to detect pathologies faster, 
            increase case acceptance, and streamline their workflow.
          </p>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-5 justify-center mb-12">
            <Link to="/serene-ai">
              <Button 
                size="xl" 
                className="bg-white text-blue-900 hover:bg-blue-50 border-none shadow-[0_0_20px_rgba(255,255,255,0.3)] font-bold px-8 py-4 h-auto text-lg"
                iconName="Zap"
                iconPosition="left"
              >
                Start Free Trial
              </Button>
            </Link>
            <Link to="/contact">
              <Button 
                size="xl" 
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10 px-8 py-4 h-auto text-lg backdrop-blur-sm"
                iconName="Calendar"
                iconPosition="left"
              >
                Book a Demo
              </Button>
            </Link>
          </div>
          
          {/* Trust Indicators */}
          <div className="flex flex-wrap justify-center gap-4 md:gap-8 opacity-80">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-center gap-2 text-sm font-medium text-blue-100">
                <div className="p-1 rounded-full bg-blue-500/20 text-blue-300">
                  <Icon name={benefit.icon} size={14} />
                </div>
                <span>{benefit.text}</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Contact / Support Card */}
        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-3xl p-8 lg:p-10 max-w-5xl mx-auto transform hover:-translate-y-1 transition-transform duration-300">
          <div className="grid md:grid-cols-4 gap-8 divide-y md:divide-y-0 md:divide-x divide-white/10">
            
            {/* Title Column */}
            <div className="md:col-span-1 text-center md:text-left">
              <h3 className="text-xl font-bold text-white mb-2">Still have questions?</h3>
              <p className="text-sm text-blue-200/70">
                Our specialized dental support team is ready to help.
              </p>
            </div>
            
            {/* Contact Columns */}
            <div className="md:col-span-3 grid sm:grid-cols-3 gap-8 pt-8 md:pt-0 pl-0 md:pl-8">
              
              <a href="tel:+6281287928805" className="group text-center">
                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-blue-500 transition-colors">
                  <Icon name="Phone" size={20} className="text-white" />
                </div>
                <div className="text-sm font-semibold text-white">Call Us</div>
                <div className="text-xs text-blue-200 mt-1">+62 812 8792 8805</div>
              </a>
              
              <a href="mailto:sereneai.management@gmail.com" className="group text-center">
                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-purple-500 transition-colors">
                  <Icon name="Mail" size={20} className="text-white" />
                </div>
                <div className="text-sm font-semibold text-white">Email</div>
                <div className="text-xs text-blue-200 mt-1">sereneai.management@gmail.com</div>
              </a>
              
              <div className="group text-center cursor-pointer">
                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-green-500 transition-colors">
                  <Icon name="MessageCircle" size={20} className="text-white" />
                </div>
                <div className="text-sm font-semibold text-white">Live Chat</div>
                <div className="text-xs text-blue-200 mt-1">Available 24/7</div>
              </div>

            </div>
          </div>
        </div>

      </div>
    </section>
  );
};

export default CTASection;