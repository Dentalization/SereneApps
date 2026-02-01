import React from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../../components/AppIcon';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const brandLogoUrl = "/icon.png"; // Assumes icon.png is in /public

  const footerSections = [
    {
      title: "Platform",
      links: [
        { name: "How it Works", path: "/product-platform" },
        { name: "For Patients", path: "/for-patients" },
        { name: "For Dentists", path: "/for-dentists" },
        { name: "Pricing & Plans", path: "/pricing" }
      ]
    },
    {
      title: "Company",
      links: [
        { name: "Our Story", path: "/about" },
        { name: "Careers", path: "/careers" },
        { name: "Press Kit", path: "/press" },
        { name: "Contact Us", path: "/contact" }
      ]
    },
    {
      title: "Resources",
      links: [
        { name: "Clinical Research", path: "/clinical-research" },
        { name: "Developer API", path: "/api-docs" },
        { name: "Help Center", path: "/help" },
        { name: "System Status", path: "/status" }
      ]
    },
    {
      title: "Legal",
      links: [
        { name: "Privacy Policy", path: "/privacy" },
        { name: "Terms of Service", path: "/terms" },
        { name: "HIPAA Compliance", path: "/hipaa" },
        { name: "Medical Disclaimer", path: "/disclaimer" }
      ]
    }
  ];

  const socialLinks = [
    { name: "Email", icon: "Mail", url: "mailto:sereneai.management@gmail.com" },
    { name: "Instagram", icon: "Instagram", url: "https://instagram.com/sereneai" },
    { name: "Twitter", icon: "Twitter", url: "https://twitter.com/sereneai" },
    { name: "LinkedIn", icon: "Linkedin", url: "https://linkedin.com/company/sereneai" },
  ];

  const certifications = [
    { name: "HIPAA Compliant", icon: "Shield" },
    { name: "FDA Registered", icon: "Award" },
    { name: "ISO 27001", icon: "Lock" },
    { name: "SOC 2 Type II", icon: "CheckCircle" }
  ];

  return (
    <footer className="relative bg-slate-950 text-slate-300 overflow-hidden border-t border-slate-900">
      
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-blue-900/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-purple-900/10 rounded-full blur-[120px]" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.02]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-10">
        
        {/* Top Section: Brand & Newsletter */}
        <div className="flex flex-col lg:flex-row justify-between gap-12 mb-16 border-b border-slate-800/50 pb-12">
          
          {/* Brand */}
          <div className="max-w-md">
            <Link to="/" className="flex items-center space-x-3 mb-6 group">
              {/* UPDATED: Clean Logo Image without background container */}
              <img 
                src={brandLogoUrl} 
                alt="Serene AI Logo" 
                className="w-20 h-20 object-contain group-hover:opacity-80 transition-opacity" 
              />
              <div>
                <span className="block text-2xl font-bold text-white tracking-tight">Serene AI</span>
                <span className="text-xs text-blue-400 font-medium tracking-widest uppercase">Dental Intelligence</span>
              </div>
            </Link>
            <p className="text-slate-400 leading-relaxed mb-6">
              Pioneering the future of dental diagnostics with advanced computer vision and generative AI. 
              Bridging the gap between patients and practitioners.
            </p>
            
            {/* Certifications Badges */}
            <div className="flex flex-wrap gap-3">
              {certifications.map((cert, i) => (
                <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300">
                  <Icon name={cert.icon} size={12} className="text-green-500" />
                  {cert.name}
                </div>
              ))}
            </div>
          </div>

          {/* Newsletter (Visual Only) */}
          <div className="lg:w-1/3">
            <h3 className="text-white font-semibold mb-2">Stay ahead of the curve</h3>
            <p className="text-sm text-slate-500 mb-4">Join our newsletter for the latest AI research and product updates.</p>
            <form className="flex gap-2" onSubmit={(e) => e.preventDefault()}>
              <input 
                type="email" 
                placeholder="Enter your email" 
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
              />
              <button className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors">
                Subscribe
              </button>
            </form>
          </div>
        </div>

        {/* Middle Section: Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12 mb-16">
          {footerSections.map((section, idx) => (
            <div key={idx}>
              <h4 className="font-bold text-white mb-6">{section.title}</h4>
              <ul className="space-y-4">
                {section.links.map((link, lIdx) => (
                  <li key={lIdx}>
                    <Link 
                      to={link.path} 
                      className="text-sm text-slate-400 hover:text-blue-400 transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Section: Disclaimer & Copyright */}
        <div className="pt-8 border-t border-slate-800/50">
          
          {/* Medical Disclaimer */}
          <div className="bg-yellow-900/10 border border-yellow-700/20 rounded-xl p-4 mb-8 flex gap-4 items-start">
            <Icon name="AlertTriangle" size={20} className="text-yellow-600 shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-600/80 leading-relaxed">
              <strong>Medical Disclaimer:</strong> Serene AI is a clinical decision support tool designed for educational and informational purposes. 
              It does not provide medical diagnoses or treatment advice. Always consult a qualified healthcare professional for dental concerns. 
              This software is designed to assist, not replace, human judgment.
            </p>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            
            {/* Copyright & Location */}
            <div className="flex flex-col md:flex-row items-center gap-4 text-xs text-slate-500">
              <span>&copy; {currentYear} Serene AI Technologies, Inc.</span>
              <span className="hidden md:inline text-slate-700">|</span>
              <span className="flex items-center gap-1.5">
                <Icon name="MapPin" size={12} /> Jakarta, Indonesia
              </span>
            </div>

            {/* Socials & Status */}
            <div className="flex flex-col md:flex-row items-center gap-6">
              
              <div className="flex items-center gap-4">
                {socialLinks.map((social, i) => (
                  <a 
                    key={i} 
                    href={social.url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-slate-500 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-lg"
                    aria-label={social.name}
                  >
                    <Icon name={social.icon} size={18} />
                  </a>
                ))}
              </div>

              <div className="hidden md:block w-px h-4 bg-slate-800" />
              
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-bold text-green-500 uppercase tracking-wide">System Operational</span>
              </div>
              
            </div>
          </div>
        </div>

      </div>
    </footer>
  );
};

export default Footer;