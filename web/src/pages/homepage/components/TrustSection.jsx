import React from 'react';
import Icon from '../../../components/AppIcon';
import LogoLoop from '../../homepage/components/LogoLoop';

/* ---------- Helpers: Robust Logo Resolvers ---------- */
const normalizeDomain = (d = '') => d.replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();

// Google S2 (Best for Indonesian/Academic domains)
const googleFavicon = (domain, sz = 256) =>
  `https://www.google.com/s2/favicons?domain=${domain}&sz=${sz}`;

// DuckDuckGo (Good fallback)
const duckIcon = (domain) => 
  `https://icons.duckduckgo.com/ip3/${domain}.ico`;

// Clearbit (Good for tech companies)
const clearbitURL = (domain, size = 512) =>
  `https://logo.clearbit.com/${domain}?size=${size}`;

const logoCandidates = (rawDomain) => {
  const d = normalizeDomain(rawDomain);
  if (!d) return [];
  
  return [
    googleFavicon(d, 256),
    duckIcon(d),
    clearbitURL(d, 512),
    `https://${d}/favicon.ico`,
    `https://icon.horse/icon/${d}`,
  ];
};

/* --------------------------- Enhanced Logo Component --------------------------- */

const LogoWithCaption = ({ name, domain, type, localSrc }) => {
  const [idx, setIdx] = React.useState(0);
  
  // Logic: Try local source first, then fallbacks
  const candidates = React.useMemo(() => {
    if (localSrc) return [localSrc]; 
    return logoCandidates(domain);
  }, [domain, localSrc]);

  const currentSrc = candidates[idx];
  const isExhausted = !currentSrc || idx >= candidates.length;
  const initials = name?.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="w-60 md:w-72 flex flex-col items-center group">
      {/* Logo Container: White bg + Shadow ensures visibility in Dark Mode */}
      <div className="relative w-24 h-24 md:w-28 md:h-28 bg-white rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-center p-4 mb-4 transition-all duration-300 group-hover:-translate-y-2 group-hover:shadow-md">
        {isExhausted ? (
          <div className="w-full h-full bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 font-bold text-xl">
            {initials}
          </div>
        ) : (
          <img
            src={currentSrc}
            alt={`${name} logo`}
            onError={() => setIdx(i => i + 1)}
            className="max-w-full max-h-full object-contain filter grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-300"
            loading="lazy"
            decoding="async"
          />
        )}
      </div>
      
      {/* Caption */}
      <div className="text-center px-2">
        <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight mb-1 line-clamp-2 group-hover:text-blue-600 transition-colors">
          {name}
        </h4>
        <span className="inline-block px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
          {type}
        </span>
      </div>
    </div>
  );
};

const TrustSection = () => {
  const trustMetrics = [
    { icon: 'Users', value: '50k+', label: 'Analyses Performed', description: 'Patient trust globally' },
    { icon: 'Award', value: '98.7%', label: 'Accuracy Rate', description: 'Clinically validated' },
    { icon: 'Zap', value: '<2s', label: 'Analysis Time', description: 'Real-time inference' },
    { icon: 'ShieldCheck', value: '100%', label: 'HIPAA Compliant', description: 'Enterprise security' },
  ];

  const certifications = [
    { name: 'FDA Registered', icon: 'Award', description: 'Class II Software' },
    { name: 'HIPAA Compliant', icon: 'Shield', description: 'Data Protection' },
    { name: 'ISO 27001', icon: 'Lock', description: 'Info Security' },
    { name: 'SOC 2 Type II', icon: 'CheckCircle', description: 'System Controls' },
  ];

  // PARTNERS DATA (Updated with Local Images)
  const researchPartners = [
    { 
      name: 'RSGM FKG Trisakti', 
      domain: 'rsgmfkg.trisakti.ac.id', 
      type: 'Teaching Hospital', 
      href: 'https://rsgmfkg.trisakti.ac.id',
      localSrc: '/logo-rsgmusakti.png' 
    },
    { 
      name: 'Trisakti University', 
      domain: 'trisakti.ac.id', 
      type: 'University Partner', 
      href: 'https://trisakti.ac.id',
      localSrc: '/logo-universitastrisakti.png'
    },
    { 
      name: 'SATUSEHAT (Kemenkes)', 
      domain: 'satusehat.kemkes.go.id', 
      type: 'Gov Platform', 
      href: 'https://satusehat.kemkes.go.id' 
    },
    { 
      name: 'Ikatan Prostodonsia (IPROSI)', 
      domain: 'prosthodontics.or.id', 
      type: 'Specialty Association', 
      href: 'https://prosthodontics.or.id' 
    },
    // Fallback/Extra to ensure loop isn't empty if needed
    { 
      name: 'Persatuan Dokter Gigi Indonesia', 
      domain: 'pdgi.or.id', 
      type: 'Association', 
      href: 'https://pdgi.or.id' 
    },
  ];

  return (
    <section className="relative py-24 bg-slate-50 dark:bg-slate-950 overflow-hidden">
      
      {/* Background Texture */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03]" />
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm font-semibold mb-6 border border-green-200 dark:border-green-800">
            <Icon name="Shield" size={14} />
            <span>Clinically Validated Technology</span>
          </div>
          
          <h2 className="text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-6">
            Trusted by the <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-500">
              Healthcare Ecosystem
            </span>
          </h2>
          
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Our AI is backed by peer-reviewed research and validated by leading teaching hospitals and associations.
          </p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 mb-20">
          {trustMetrics.map((m, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-lg transition-shadow text-center group">
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Icon name={m.icon} size={24} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">{m.value}</div>
              <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">{m.label}</div>
              <div className="text-xs text-slate-500">{m.description}</div>
            </div>
          ))}
        </div>

        {/* Certifications (Small Grid) */}
        <div className="flex flex-wrap justify-center gap-4 mb-20">
            {certifications.map((c, i) => (
              <div key={i} className="flex items-center gap-3 bg-white dark:bg-slate-900 px-6 py-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-full">
                  <Icon name={c.icon} size={20} className="text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 dark:text-white text-sm">{c.name}</div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wide">{c.description}</div>
                </div>
              </div>
            ))}
        </div>

        {/* Partners Loop */}
        <div className="mb-20">
          <div className="text-center mb-8">
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Research & Clinical Partners</h3>
          </div>
          
          <div className="relative w-full overflow-hidden py-4">
            {/* Fade Edges */}
            <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-slate-50 dark:from-slate-950 to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-slate-50 dark:from-slate-950 to-transparent z-10 pointer-events-none" />
            
            <LogoLoop
              logos={researchPartners.map((p) => ({
                node: <LogoWithCaption 
                        name={p.name} 
                        domain={p.domain} 
                        type={p.type} 
                        localSrc={p.localSrc} 
                      />,
                href: p.href,
                title: p.name
              }))}
              logoHeight={160}
              gap={48}
              speed={35}
              direction="left"
              pauseOnHover={true}
              scaleOnHover={false}
              fadeOut={false}
              className="py-2"
            />
          </div>
        </div>

        {/* Clinical Validation Card */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2rem] p-8 lg:p-12 text-white shadow-2xl relative overflow-hidden">
          {/* Decor */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px]" />

          <div className="grid lg:grid-cols-2 gap-12 items-center relative z-10">
            <div>
              <div className="inline-flex items-center gap-2 mb-6 text-blue-300">
                <Icon name="FileText" size={20} />
                <span className="font-semibold uppercase tracking-widest text-sm">Peer-Reviewed</span>
              </div>
              <h3 className="text-3xl lg:text-4xl font-bold mb-6 leading-tight">
                98.7% Diagnostic Accuracy
              </h3>
              <p className="text-slate-300 mb-8 text-lg leading-relaxed">
                Our models have been rigorously tested in multi-center clinical trials involving over 50,000 diverse dental images. We consistently outperform traditional screening methods.
              </p>
              
              <div className="flex flex-col gap-3">
                {['Multi-center trials completed', 'IRB-approved protocols', 'Published in J. Dental Research'].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Icon name="CheckCircle" size={20} className="text-green-400" />
                    <span className="text-slate-200">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Stats Card */}
            <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-500 rounded-lg">
                  <Icon name="BarChart2" size={24} className="text-white" />
                </div>
                <h4 className="font-bold text-lg">Performance Metrics </h4>
              </div>

              <div className="space-y-6">
                {[
                  { label: 'Caries Detection', val: '98.7%' },
                  { label: 'Periodontal Disease', val: '96.3%' },
                  { label: 'Pathology Screening', val: '94.8%' }
                ].map((stat, i) => (
                  <div key={i}>
                    <div className="flex justify-between mb-2 text-sm font-medium">
                      <span className="text-slate-300">{stat.label}</span>
                      <span className="text-white">{stat.val}</span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-teal-400 rounded-full" 
                        style={{ width: stat.val }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};

export default TrustSection;