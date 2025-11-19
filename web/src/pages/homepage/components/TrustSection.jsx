import React from 'react'
import Icon from '../../../components/AppIcon'
import LogoLoop from '../../homepage/components/LogoLoop'

/* ---------- helpers: fallback sources tanpa mengubah tampilan ---------- */
const normalizeDomain = (d = '') => d.replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim()
const slug = (s = '') => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

const clearbitURL = (domain, size = 512) =>
  `https://logo.clearbit.com/${domain}?size=${size}`

const googleFavicon = (domain, sz = 256) =>
  `https://www.google.com/s2/favicons?domain=${domain}&sz=${sz}`

const logoCandidates = (rawDomain) => {
  const d = normalizeDomain(rawDomain)
  if (!d) return []
  const list = new Set([
    // 1) Pertahankan Clearbit dulu (visual tetap konsisten)
    clearbitURL(d, 512),

    // 2) Aset lokal kurasi (kalau ada)
    `/logos/${slug(d)}.svg`,
    `/logos/${slug(d)}.png`,

    // 3) Ikon standar di domain
    `https://${d}/apple-touch-icon.png`,
    `https://${d}/apple-touch-icon-precomposed.png`,
    `https://${d}/favicon-32x32.png`,
    `https://${d}/favicon.ico`,

    // 4) Resolver umum & tajam
    `https://icon.horse/icon/${d}`,                          // Icon Horse
    googleFavicon(d, 256),                                   // Google S2 (hi-dpi)
    `https://icons.duckduckgo.com/ip3/${d}.ico`,             // DuckDuckGo
  ])
  return Array.from(list)
}

// srcSet untuk layar retina agar tidak blur (hanya utk provider yg support ukuran)
const buildSrcSet = (url, domain) => {
  try {
    const u = new URL(url)
    if (u.hostname === 'logo.clearbit.com') {
      return `${clearbitURL(domain, 256)} 1x, ${clearbitURL(domain, 512)} 2x`
    }
    if (u.hostname === 'www.google.com' && u.pathname.startsWith('/s2/favicons')) {
      return `${googleFavicon(domain, 128)} 1x, ${googleFavicon(domain, 256)} 2x`
    }
  } catch {}
  return undefined
}

/* --------------------------- komponen aslinya --------------------------- */

const logoFromDomain = (domain, size = 256) => `https://logo.clearbit.com/${domain}?size=${size}`

const LogoWithCaption = ({ name, domain, type }) => {
  // ganti boolean error → index kandidat (tanpa ubah tampilan <img>)
  const [idx, setIdx] = React.useState(0)
  const candidates = React.useMemo(() => logoCandidates(domain), [domain])
  const currentSrc = candidates[idx]
  const isExhausted = !currentSrc || idx >= candidates.length

  const initials = name?.split(/\s+/).map(w => w[0]).join('').slice(0,3).toUpperCase()

  return (
    <div className="w-64 md:w-72 lg:w-80 flex flex-col items-center justify-start text-center">
      <div className="h-20 md:h-24 lg:h-28 w-full flex items-center justify-center">
        {isExhausted || !domain ? (
          <div className="h-full w-56 flex items-center justify-center rounded bg-muted text-text-secondary text-sm font-semibold">{initials}</div>
        ) : (
          // ⬇️ TAMPILAN TETAP SAMA: className/attr identik dengan versi kamu
          <img
            src={currentSrc}
            srcSet={buildSrcSet(currentSrc, normalizeDomain(domain))}
            alt={`${name} logo`}
            onError={() => setIdx(i => i + 1)}
            className="max-h-full w-auto object-contain dark:opacity-95"
            loading="lazy"
            referrerPolicy="no-referrer"
            decoding="async"
            crossOrigin="anonymous"
          />
        )}
      </div>
      <div className="mt-4 text-base md:text-lg font-semibold text-text-primary leading-normal">{name}</div>
      <div className="text-xs md:text-sm text-text-secondary leading-normal">{type}</div>
    </div>
  )
}

const TrustSection = () => {
  const trustMetrics = [
    { icon: 'Users', value: '100,000+', label: 'Analyses Performed', description: 'Trusted by patients worldwide' },
    { icon: 'Award', value: '98.7%', label: 'Accuracy Rate', description: 'Clinically validated results' },
    { icon: 'Clock', value: '<2s', label: 'Analysis Time', description: 'Instant professional insights' },
    { icon: 'Shield', value: '100%', label: 'HIPAA Compliant', description: 'Your data is secure' },
  ]

  const certifications = [
    { name: 'FDA Registered', icon: 'Award', description: 'Medical Device Registration' },
    { name: 'HIPAA Compliant', icon: 'Shield', description: 'Healthcare Data Protection' },
    { name: 'ISO 27001', icon: 'Lock', description: 'Information Security Management' },
    { name: 'SOC 2 Type II', icon: 'CheckCircle', description: 'Security & Availability Controls' },
  ]

  const researchPartners = [
    { name: 'Persatuan Dokter Gigi Indonesia (PDGI)', domain: 'pdgi.or.id', type: 'Specialty Association', href: 'https://pdgi.or.id' },
    { name: 'SATUSEHAT (Ministry of Health RI)', domain: 'satusehat.kemkes.go.id', type: 'Government Health Platform', href: 'https://satusehat.kemkes.go.id' },
    { name: 'Trisakti University', domain: 'trisakti.ac.id', type: 'Research Partner', href: 'https://trisakti.ac.id' },
    { name: 'Ikatan Prostodonsia Indonesia (IPROSI)', domain: 'prosthodontics.or.id', type: 'Specialty Association', href: 'https://prosthodontics.or.id' },
    
  ]

  return (
    <section className="py-20 bg-white dark:bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center space-x-2 bg-trust-green/10 rounded-full px-4 py-2 mb-4"><Icon name="Shield" size={16} className="text-trust-green [fill:none] stroke-current [&_*]:[fill:none]" /><span className="text-sm font-medium text-trust-green">Clinically Validated</span></div>
          <h2 className="text-3xl lg:text-4xl font-bold text-text-primary mb-4">Trusted by Healthcare Professionals</h2>
          <p className="text-lg text-text-secondary max-w-3xl mx-auto">Our AI technology is backed by peer-reviewed research, clinical validation studies, and partnerships with leading healthcare institutions worldwide.</p>
        </div>

        {/* Trust Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {trustMetrics.map((m, i) => (
            <div key={i} className="text-center p-6 bg-muted rounded-xl hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto mb-4"><Icon name={m.icon} size={24} className="text-primary-foreground [fill:none] stroke-current [&_*]:[fill:none]" /></div>
              <div className="text-3xl font-bold text-primary mb-2">{m.value}</div>
              <div className="text-sm font-semibold text-text-primary mb-1">{m.label}</div>
              <div className="text-xs text-text-secondary">{m.description}</div>
            </div>
          ))}
        </div>

        {/* Certifications */}
        <div className="mb-16">
          <h3 className="text-2xl font-bold text-text-primary text-center mb-8">Security & Compliance Certifications</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {certifications.map((c, i) => (
              <div key={i} className="bg-white dark:bg-card border border-border rounded-lg p-6 text-center hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                <div className="w-16 h-16 bg-trust-green/10 rounded-full flex items-center justify-center mx-auto mb-4"><Icon name={c.icon} size={32} className="text-trust-green [fill:none] stroke-current [&_*]:[fill:none]" /></div>
                <h4 className="text-lg font-semibold text-text-primary mb-2">{c.name}</h4>
                <p className="text-sm text-text-secondary">{c.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Research & Clinical Partners — LOOP with centered captions */}
        <div className="mb-16">
          <h3 className="text-2xl font-bold text-text-primary text-center mb-8">Research & Clinical Partners</h3>
          <LogoLoop
            logos={researchPartners.map((p) => ({
              node: <LogoWithCaption name={p.name} domain={p.domain} type={p.type} />,
              href: p.href,
              title: p.name
            }))}
            logoHeight={84}
            gap={72}
            speed={120}
            direction="left"
            pauseOnHover={true}
            scaleOnHover={true}
            fadeOut={false}
            className="mt-4"
          />
        </div>

        {/* Clinical Validation */}
        <div className="bg-muted rounded-2xl p-8 lg:p-12">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <div className="inline-flex items-center space-x-2 bg-white rounded-full px-4 py-2 mb-4"><Icon name="FileText" size={16} className="text-primary [fill:none] stroke-current [&_*]:[fill:none]" /><span className="text-sm font-medium text-primary">Peer-Reviewed Research</span></div>
              <h3 className="text-2xl lg:text-3xl font-bold text-text-primary mb-4">Clinically Validated Technology</h3>
              <p className="text-text-secondary mb-6">Our AI models have been rigorously tested in clinical settings with over 50,000 dental images, achieving 98.7% accuracy in detecting common dental conditions. Published results are available in leading dental journals.</p>
              <div className="space-y-4">
                <div className="flex items-center space-x-3"><Icon name="CheckCircle" size={20} className="text-trust-green [fill:none] stroke-current [&_*]:[fill:none]" /><span className="text-sm text-text-primary">Multi-center clinical trials completed</span></div>
                <div className="flex items-center space-x-3"><Icon name="CheckCircle" size={20} className="text-trust-green [fill:none] stroke-current [&_*]:[fill:none]" /><span className="text-sm text-text-primary">IRB-approved research protocols</span></div>
                <div className="flex items-center space-x-3"><Icon name="CheckCircle" size={20} className="text-trust-green [fill:none] stroke-current [&_*]:[fill:none]" /><span className="text-sm text-text-primary">Peer-reviewed publications in progress</span></div>
              </div>
            </div>
            <div className="relative">
              <div className="bg-white dark:bg-card rounded-xl p-6 shadow-brand">
                <div className="flex items-center space-x-3 mb-4"><Icon name="BarChart3" size={24} className="text-primary [fill:none] stroke-current [&_*]:[fill:none]" /><h4 className="text-lg font-semibold text-text-primary">Clinical Study Results</h4></div>
                <div className="space-y-4">
                  <div><div className="flex justify-between items-center mb-2"><span className="text-sm text-text-secondary">Cavity Detection</span><span className="text-sm font-semibold text-text-primary">98.7%</span></div><div className="w-full bg-muted rounded-full h-2"><div className="bg-trust-green h-2 rounded-full" style={{ width: '98.7%' }} /></div></div>
                  <div><div className="flex justify-between items-center mb-2"><span className="text-sm text-text-secondary">Gum Disease</span><span className="text-sm font-semibold text-text-primary">96.3%</span></div><div className="w-full bg-muted rounded-full h-2"><div className="bg-trust-green h-2 rounded-full" style={{ width: '96.3%' }} /></div></div>
                  <div><div className="flex justify-between items-center mb-2"><span className="text-sm text-text-secondary">Tooth Alignment</span><span className="text-sm font-semibold text-text-primary">94.8%</span></div><div className="w-full bg-muted rounded-full h-2"><div className="bg-trust-green h-2 rounded-full" style={{ width: '94.8%' }} /></div></div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  )
}

export default TrustSection
