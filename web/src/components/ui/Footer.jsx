import React from 'react';
import { Link } from 'react-router-dom';
// FIX: Adjusted path to point to src/components/AppIcon
import Icon from '../AppIcon'; 
import { useLanguage } from '../../contexts/LanguageContext';

const Footer = () => {
  const { t } = useLanguage();
  const currentYear = new Date().getFullYear();
  const brandLogoUrl = "/icon.png"; 

  const footerSections = [
    {
      titleKey: "public.footer.sections.platform",
      titleFallback: "Platform",
      links: [
        { labelKey: "public.footer.links.howItWorks", fallback: "How it Works", path: "/product-platform" },
        { labelKey: "public.footer.links.forPatients", fallback: "For Patients", path: "/for-patients" },
        { labelKey: "public.footer.links.forDentists", fallback: "For Dentists", path: "/for-dentists" },
        { labelKey: "public.footer.links.pricingPlans", fallback: "Pricing & Plans", path: "/pricing" }
      ]
    },
    {
      titleKey: "public.footer.sections.company",
      titleFallback: "Company",
      links: [
        { labelKey: "public.footer.links.ourStory", fallback: "Our Story", path: "/about" },
        { labelKey: "public.footer.links.careers", fallback: "Careers", path: "/careers" },
        { labelKey: "public.footer.links.pressKit", fallback: "Press Kit", path: "/press" },
        { labelKey: "public.footer.links.contactUs", fallback: "Contact Us", path: "/contact" }
      ]
    },
    {
      titleKey: "public.footer.sections.resources",
      titleFallback: "Resources",
      links: [
        { labelKey: "public.footer.links.clinicalResearch", fallback: "Clinical Research", path: "/clinical-research" },
        { labelKey: "public.footer.links.developerApi", fallback: "Developer API", path: "/api-docs" },
        { labelKey: "public.footer.links.helpCenter", fallback: "Help Center", path: "/help" },
        { labelKey: "public.footer.links.systemStatus", fallback: "System Status", path: "/status" }
      ]
    },
    {
      titleKey: "public.footer.sections.legal",
      titleFallback: "Legal",
      links: [
        { labelKey: "public.footer.links.privacyPolicy", fallback: "Privacy Policy", path: "/privacy" },
        { labelKey: "public.footer.links.termsOfService", fallback: "Terms of Service", path: "/terms" },
        { labelKey: "public.footer.links.hipaaCompliance", fallback: "HIPAA Compliance", path: "/hipaa" },
        { labelKey: "public.footer.links.medicalDisclaimer", fallback: "Medical Disclaimer", path: "/disclaimer" }
      ]
    }
  ];

  const socialLinks = [
    { labelKey: "public.footer.socials.email", fallback: "Email", icon: "Mail", url: "mailto:sereneai.management@gmail.com" },
    { labelKey: "public.footer.socials.instagram", fallback: "Instagram", icon: "Instagram", url: "https://instagram.com/sereneai" },
    { labelKey: "public.footer.socials.twitter", fallback: "Twitter", icon: "Twitter", url: "https://twitter.com/sereneai" },
    { labelKey: "public.footer.socials.linkedin", fallback: "LinkedIn", icon: "Linkedin", url: "https://linkedin.com/company/sereneai" },
  ];

  const certifications = [
    { labelKey: "public.footer.certifications.hipaa", fallback: "HIPAA Compliant", icon: "Shield" },
    { labelKey: "public.footer.certifications.fda", fallback: "FDA Registered", icon: "Award" },
    { labelKey: "public.footer.certifications.iso", fallback: "ISO 27001", icon: "Lock" },
    { labelKey: "public.footer.certifications.soc", fallback: "SOC 2 Type II", icon: "CheckCircle" }
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
              <img 
                src={brandLogoUrl} 
                alt={t('public.footer.brandAlt', { defaultValue: 'Serene AI Logo' })}
                className="w-12 h-12 object-contain group-hover:opacity-80 transition-opacity" 
              />
              <div>
                <span className="block text-2xl font-bold text-white tracking-tight">{t('public.footer.brand', { defaultValue: 'Serene AI' })}</span>
                <span className="text-xs text-blue-400 font-medium tracking-widest uppercase">{t('public.footer.dentalIntelligence', { defaultValue: 'Dental Intelligence' })}</span>
              </div>
            </Link>
            <p className="text-slate-400 leading-relaxed mb-6">
              {t('public.footer.description', { defaultValue: 'Pioneering the future of dental diagnostics with advanced computer vision and generative AI. Bridging the gap between patients and practitioners.' })}
            </p>
            
            {/* Certifications Badges */}
            <div className="flex flex-wrap gap-3">
              {certifications.map((cert, i) => (
                <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300">
                  <Icon name={cert.icon} size={12} className="text-green-500" />
                  {t(cert.labelKey, { defaultValue: cert.fallback })}
                </div>
              ))}
            </div>
          </div>

          {/* Newsletter (Visual Only) */}
          <div className="lg:w-1/3">
            <h3 className="text-white font-semibold mb-2">{t('public.footer.newsletterTitle', { defaultValue: 'Stay ahead of the curve' })}</h3>
            <p className="text-sm text-slate-500 mb-4">{t('public.footer.newsletterDescription', { defaultValue: 'Join our newsletter for the latest AI research and product updates.' })}</p>
            <form className="flex gap-2" onSubmit={(e) => e.preventDefault()}>
              <input 
                type="email" 
                placeholder={t('public.footer.emailPlaceholder', { defaultValue: 'Enter your email' })}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
              />
              <button className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors">
                {t('public.footer.subscribe', { defaultValue: 'Subscribe' })}
              </button>
            </form>
          </div>
        </div>

        {/* Middle Section: Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12 mb-16">
          {footerSections.map((section, idx) => (
            <div key={idx}>
              <h4 className="font-bold text-white mb-6">{t(section.titleKey, { defaultValue: section.titleFallback })}</h4>
              <ul className="space-y-4">
                {section.links.map((link, lIdx) => (
                  <li key={lIdx}>
                    <Link 
                      to={link.path} 
                      className="text-sm text-slate-400 hover:text-blue-400 transition-colors"
                    >
                      {t(link.labelKey, { defaultValue: link.fallback })}
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
              <strong>{t('public.footer.medicalDisclaimerTitle', { defaultValue: 'Medical Disclaimer:' })}</strong> {t('public.footer.medicalDisclaimerBody', { defaultValue: 'Serene AI is a clinical decision support tool designed for educational and informational purposes. It does not provide medical diagnoses or treatment advice. Always consult a qualified healthcare professional for dental concerns. This software is designed to assist, not replace, human judgment.' })}
            </p>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            
            {/* Copyright & Location */}
            <div className="flex flex-col md:flex-row items-center gap-4 text-xs text-slate-500">
              <span>&copy; {currentYear} Serene AI Technologies, Inc.</span>
              <span className="hidden md:inline text-slate-700">|</span>
              <span className="flex items-center gap-1.5">
                <Icon name="MapPin" size={12} /> {t('public.footer.location', { defaultValue: 'Jakarta, Indonesia' })}
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
                    aria-label={t(social.labelKey, { defaultValue: social.fallback })}
                  >
                    <Icon name={social.icon} size={18} />
                  </a>
                ))}
              </div>

              <div className="hidden md:block w-px h-4 bg-slate-800" />
              
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-bold text-green-500 uppercase tracking-wide">{t('public.footer.systemOperational', { defaultValue: 'System Operational' })}</span>
              </div>
              
            </div>
          </div>
        </div>

      </div>
    </footer>
  );
};

export default Footer;
