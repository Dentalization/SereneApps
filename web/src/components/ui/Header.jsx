// src/components/ui/Header.jsx
import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation } from 'react-router-dom'
import Icon from '../AppIcon'
import Button from './Button'
import { useTheme } from '../../contexts/ThemeContext'
import { useLanguage } from '../../contexts/LanguageContext'

const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMoreOpen, setIsMoreOpen] = useState(false)

  const openHoverTimer = useRef(null)
  const closeHoverTimer = useRef(null)
  const moreRef = useRef(null)

  const location = useLocation()
  const { toggleTheme, isDark } = useTheme()
  const { t } = useLanguage()

  const isOnSereneAI = location?.pathname === '/serene-agentic'

  const navigationItems = [
    { labelKey: 'public.header.platform', fallback: 'Platform', path: '/product-platform', icon: 'Cpu' },
    { labelKey: 'public.header.forPatients', fallback: 'For Patients', path: '/for-patients', icon: 'Heart' },
    { labelKey: 'public.header.forDentists', fallback: 'For Dentists', path: '/for-dentists', icon: 'Stethoscope' },
    { labelKey: 'public.header.pricing', fallback: 'Pricing', path: '/pricing', icon: 'CreditCard' }
  ]
  const moreItems = [{ labelKey: 'public.header.clinicalResearch', fallback: 'Clinical Research', path: '/clinical-research', icon: 'FileText' }]

  // --- SCROLL LISTENER (Optimized) ---
  useEffect(() => {
    const handleScroll = () => {
      // Toggle "Scrolled" state after 20px
      if (window.scrollY > 20) {
        setIsScrolled(true)
      } else {
        setIsScrolled(false)
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Handle Outside Click & Escape Key
  useEffect(() => {
    const onDocClick = (e) => {
      if (!moreRef.current?.contains(e.target)) setIsMoreOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setIsMoreOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  const onMoreMouseEnter = () => {
    clearTimeout(closeHoverTimer.current)
    openHoverTimer.current = setTimeout(() => setIsMoreOpen(true), 80)
  }
  const onMoreMouseLeave = () => {
    clearTimeout(openHoverTimer.current)
    closeHoverTimer.current = setTimeout(() => setIsMoreOpen(false), 160)
  }

  const toggleMobileMenu = () => setIsMobileMenuOpen((v) => !v)
  const closeMobileMenu = () => setIsMobileMenuOpen(false)
  const isActivePath = (p) => location?.pathname === p

  return createPortal(
    <>
      <header
        id="site-header"
        role="banner"
        tabIndex={-1}
        className={`fixed inset-x-10 top-4 z-[999] transition-all duration-300 ease-in-out border-b rounded-[25px] backdrop-saturate-100
        ${
          isScrolled
            ? 'bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-slate-200/50 dark:border-slate-800/50 shadow-md py-2'
            : 'bg-transparent border-transparent py-4'
        }`}
      >
      
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            
            {/* --- LOGO --- */}
            <Link
              to="/"
              onClick={closeMobileMenu}
              className="group flex items-center gap-3 select-none focus:outline-none"
            >
              <img
                src="./icon.png"
                alt={t('public.header.brand', { defaultValue: 'Serene AI' })}
                className="h-20 w-20 object-contain transition-transform duration-300 group-hover:scale-110"
              />
              <div className="flex flex-col">
                <span className="text-xl font-bold text-slate-900 dark:text-white leading-none tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {t('public.header.brand', { defaultValue: 'Serene AI' })}
                </span>
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mt-0.5">
                  {t('public.header.dentalPlatform', { defaultValue: 'Dental Platform' })}
                </span>
              </div>
            </Link>

            {/* --- DESKTOP NAVIGATION --- */}
            <nav className="hidden lg:flex items-center gap-1 bg-slate-100/50 dark:bg-slate-800/50 rounded-full px-2 py-1 border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-md">
              {navigationItems.map((item) => {
                const active = isActivePath(item.path)
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`relative px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 group flex items-center gap-2
                      ${
                        active
                          ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
                      }
                    `}
                  >
                    <Icon 
                      name={item.icon} 
                      size={16} 
                      className={`transition-colors duration-300 ${active ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`} 
                    />
                    <span>{t(item.labelKey, { defaultValue: item.fallback })}</span>
                  </Link>
                )
              })}

              {/* MORE DROPDOWN */}
              <div
                ref={moreRef}
                className="relative"
                onMouseEnter={onMoreMouseEnter}
                onMouseLeave={onMoreMouseLeave}
              >
                <button
                  className={`px-3 py-2 rounded-full text-sm font-medium transition-all duration-300 flex items-center gap-1.5
                    ${
                      isMoreOpen
                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
                    }
                  `}
                >
                  <span>{t('public.header.more', { defaultValue: 'More' })}</span>
                  <Icon
                    name="ChevronDown"
                    size={14}
                    className={`transition-transform duration-300 ${isMoreOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {/* Dropdown Menu */}
                <div
                  className={`absolute top-full right-0 mt-3 w-56 p-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl shadow-slate-200/20 dark:shadow-black/40 transform transition-all duration-200 origin-top-right
                  ${
                    isMoreOpen
                      ? 'opacity-100 scale-100 translate-y-0 visible'
                      : 'opacity-0 scale-95 -translate-y-2 invisible'
                  }`}
                >
                  {moreItems.map((item) => {
                    const active = isActivePath(item.path)
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setIsMoreOpen(false)}
                        className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors
                          ${
                            active
                              ? 'bg-blue-5 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'
                          }
                        `}
                      >
                        <div className={`p-1.5 rounded-lg transition-colors ${active ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 group-hover:bg-white dark:group-hover:bg-slate-600'}`}>
                           <Icon name={item.icon} size={16} />
                        </div>
                        {t(item.labelKey, { defaultValue: item.fallback })}
                      </Link>
                    )
                  })}
                </div>
              </div>
            </nav>

            {/* --- DESKTOP ACTIONS --- */}
            <div className="hidden lg:flex items-center gap-3">
              <button
                onClick={toggleTheme}
                aria-label={t('public.header.toggleTheme', { defaultValue: 'Toggle theme' })}
                className="p-2.5 rounded-full text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                <Icon name={isDark ? 'Sun' : 'Moon'} size={20} />
              </button>

              <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />

              <Link to="/login">
                <button className="px-5 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">
                  {t('public.header.signIn', { defaultValue: 'Sign In' })}
                </button>
              </Link>

              {isOnSereneAI ? (
                <Link to="/serene-agentic">
                   <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-105 transition-all">
                      <Icon name="Sparkles" size={18} />
                   </div>
                </Link>
              ) : (
                <Link to="/serene-agentic">
                  <Button
                    variant="default"
                    iconName="Sparkles"
                    iconPosition="left"
                    iconSize={16}
                    className="rounded-full shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40"
                  >
                    {t('public.header.tryFreeAnalysis', { defaultValue: 'Try Free Analysis' })}
                  </Button>
                </Link>
              )}
            </div>

            {/* --- MOBILE TOGGLE --- */}
            <button
              onClick={toggleMobileMenu}
              className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Icon name={isMobileMenuOpen ? 'X' : 'Menu'} size={24} />
            </button>
          </div>
        </div>
      </header>

      {/* --- MOBILE MENU OVERLAY --- */}
      <div
        className={`fixed inset-0 z-[90] lg:hidden bg-white/95 dark:bg-slate-950/95 backdrop-blur-2xl transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]
        ${isMobileMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}
      >
        <div className="flex flex-col h-full pt-24 px-6 pb-8 overflow-y-auto">
          <nav className="flex-1 space-y-2">
            {[...navigationItems, ...moreItems].map((item, idx) => {
              const active = isActivePath(item.path)
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={closeMobileMenu}
                  className={`flex items-center gap-4 p-4 rounded-2xl text-lg font-medium transition-all duration-200
                    ${
                      active
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900'
                    }
                  `}
                  style={{
                    opacity: isMobileMenuOpen ? 1 : 0,
                    transform: isMobileMenuOpen ? 'translateY(0)' : 'translateY(20px)',
                    transitionDelay: `${idx * 50}ms`
                  }}
                >
                  <div className={`p-2 rounded-xl ${active ? 'bg-blue-100 dark:bg-blue-900/40' : 'bg-slate-100 dark:bg-slate-800'}`}>
                    <Icon name={item.icon} size={24} />
                  </div>
                  {t(item.labelKey, { defaultValue: item.fallback })}
                </Link>
              )
            })}
          </nav>

          <div className="space-y-4 pt-8 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={toggleTheme}
              className="w-full flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
            >
              <span className="flex items-center gap-3">
                 <Icon name={isDark ? 'Moon' : 'Sun'} size={20} className={isDark ? 'text-purple-400' : 'text-amber-500'} />
                 {isDark
                   ? t('public.header.darkMode', { defaultValue: 'Dark Mode' })
                   : t('public.header.lightMode', { defaultValue: 'Light Mode' })}
              </span>
              <div className={`w-12 h-7 rounded-full p-1 transition-colors ${isDark ? 'bg-blue-600' : 'bg-slate-300'}`}>
                <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${isDark ? 'translate-x-5' : 'translate-x-0'}`} />
              </div>
            </button>

            <div className="grid grid-cols-2 gap-4">
              <Link to="/login" onClick={closeMobileMenu} className="w-full">
                <Button variant="outline" fullWidth className="h-12 rounded-xl border-slate-200 dark:border-slate-700">{t('public.header.signIn', { defaultValue: 'Sign In' })}</Button>
              </Link>
              {!isOnSereneAI && (
                <Link to="/serene-ai" onClick={closeMobileMenu} className="w-full">
                  <Button variant="default" fullWidth className="h-12 rounded-xl shadow-lg shadow-blue-500/20">{t('public.header.tryAI', { defaultValue: 'Try AI' })}</Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  )
}

export default Header
