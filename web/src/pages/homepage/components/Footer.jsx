import React from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../../components/AppIcon';

const Footer = () => {
  const currentYear = new Date()?.getFullYear();

  const footerSections = [
    {
      title: "Product",
      links: [
        { name: "Platform Overview", path: "/product-platform" },
        { name: "For Patients", path: "/for-patients" },
        { name: "For Dentists", path: "/for-dentists" },
        { name: "Pricing", path: "/pricing" }
      ]
    },
    {
      title: "Resources",
      links: [
        { name: "Clinical Research", path: "/clinical-research" },
        { name: "API Documentation", path: "/api-docs" },
        { name: "Help Center", path: "/help" },
        { name: "Blog", path: "/blog" }
      ]
    },
    {
      title: "Company",
      links: [
        { name: "About Us", path: "/about" },
        { name: "Careers", path: "/careers" },
        { name: "Press", path: "/press" },
        { name: "Contact", path: "/contact" }
      ]
    },
    {
      title: "Legal",
      links: [
        { name: "Privacy Policy", path: "/privacy" },
        { name: "Terms of Service", path: "/terms" },
        { name: "HIPAA Compliance", path: "/hipaa" },
        { name: "Medical Disclaimers", path: "/disclaimers" }
      ]
    }
  ];

  const socialLinks = [
    { name: "Twitter", icon: "Twitter", url: "https://twitter.com/sereneai" },
    { name: "LinkedIn", icon: "Linkedin", url: "https://linkedin.com/company/sereneai" },
    { name: "Facebook", icon: "Facebook", url: "https://facebook.com/sereneai" },
    { name: "YouTube", icon: "Youtube", url: "https://youtube.com/sereneai" }
  ];

  const certifications = [
    { name: "HIPAA", icon: "Shield" },
    { name: "FDA", icon: "Award" },
    { name: "ISO 27001", icon: "Lock" },
    { name: "SOC 2", icon: "CheckCircle" }
  ];

  return (
    <footer className="bg-text-primary text-white">
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid lg:grid-cols-5 gap-8">
          {/* Brand Section */}
          <div className="lg:col-span-2">
            <Link to="/homepage" className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-brand-gradient rounded-lg flex items-center justify-center">
                <Icon name="Brain" size={24} color="white" strokeWidth={2.5} />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold text-white tracking-tight">Serene AI</span>
                <span className="text-xs text-gray-400 font-medium -mt-1">Dental Platform</span>
              </div>
            </Link>
            
            <p className="text-gray-300 text-sm leading-relaxed mb-6 max-w-md">
              Transforming dental care with AI-powered insights. Professional-grade analysis 
              accessible to everyone, helping patients and dentists make better decisions together.
            </p>

            {/* Certifications */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-white mb-3">Certifications & Compliance</h4>
              <div className="flex flex-wrap gap-3">
                {certifications?.map((cert, index) => (
                  <div
                    key={index}
                    className="flex items-center space-x-2 bg-white/10 rounded-lg px-3 py-2"
                  >
                    <Icon name={cert?.icon} size={16} className="text-trust-green" />
                    <span className="text-xs font-medium text-white">{cert?.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Social Links */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-3">Follow Us</h4>
              <div className="flex space-x-3">
                {socialLinks?.map((social, index) => (
                  <a
                    key={index}
                    href={social?.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center hover:bg-white/20 transition-colors"
                    aria-label={`Follow us on ${social?.name}`}
                  >
                    <Icon name={social?.icon} size={18} />
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Footer Links */}
          {footerSections?.map((section, index) => (
            <div key={index}>
              <h4 className="text-sm font-semibold text-white mb-4">{section?.title}</h4>
              <ul className="space-y-3">
                {section?.links?.map((link, linkIndex) => (
                  <li key={linkIndex}>
                    <Link
                      to={link?.path}
                      className="text-sm text-gray-300 hover:text-white transition-colors"
                    >
                      {link?.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      {/* Medical Disclaimer */}
      <div className="border-t border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <Icon name="AlertTriangle" size={20} className="text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <h5 className="text-sm font-semibold text-yellow-400 mb-1">Medical Disclaimer</h5>
                <p className="text-xs text-gray-300 leading-relaxed">
                  Serene AI is designed to provide educational information and support clinical decision-making. 
                  It is not intended to replace professional medical advice, diagnosis, or treatment. 
                  Always consult with qualified healthcare professionals for medical concerns. 
                  This technology is FDA-registered as a Class II medical device software.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Bottom Bar */}
      <div className="border-t border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-6">
              <p className="text-sm text-gray-400">
                © {currentYear} Serene AI Technologies, Inc. All rights reserved.
              </p>
              <div className="flex items-center space-x-4 text-xs text-gray-400">
                <span className="flex items-center space-x-1">
                  <Icon name="MapPin" size={12} />
                  <span>Jakarta, Indonesia</span>
                </span>
                <span className="flex items-center space-x-1">
                  <Icon name="Mail" size={12} />
                  <span>serene@gmail.com</span>
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-xs text-gray-400">
                <div className="w-2 h-2 bg-trust-green rounded-full animate-pulse"></div>
                <span>All systems operational</span>
              </div>
              <div className="text-xs text-gray-400">
                Version 2.1.0
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;