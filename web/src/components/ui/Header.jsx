// src/components/ui/Header.jsx
import React, { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import Icon from '../AppIcon'
import Button from './Button'
import { useTheme } from '../../contexts/ThemeContext'

const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMoreOpen, setIsMoreOpen] = useState(false)

  const openHoverTimer = useRef(null)
  const closeHoverTimer = useRef(null)
  const moreRef = useRef(null)

  const location = useLocation()
  const { toggleTheme, isDark } = useTheme()

  // Check if we're on the SereneAI page
  const isOnSereneAI = location?.pathname === '/serene-agentic'

  const navigationItems = [
    { name: 'Platform', path: '/product-platform', icon: 'Cpu' },
    { name: 'For Patients', path: '/for-patients', icon: 'Heart' },
    { name: 'For Dentists', path: '/for-dentists', icon: 'Stethoscope' },
    { name: 'Pricing', path: '/pricing', icon: 'CreditCard' }
  ]
  const moreItems = [{ name: 'Clinical Research', path: '/clinical-research', icon: 'FileText' }]

  useEffect(() => { const onScroll = () => setIsScrolled(window.scrollY > 10); onScroll(); window.addEventListener('scroll', onScroll, { passive: true }); return () => window.removeEventListener('scroll', onScroll) }, [])
  useEffect(() => { const onDocClick = (e) => { if (!moreRef.current?.contains(e.target)) setIsMoreOpen(false) }; const onKey = (e) => { if (e.key === 'Escape') setIsMoreOpen(false) }; document.addEventListener('mousedown', onDocClick); window.addEventListener('keydown', onKey); return () => { document.removeEventListener('mousedown', onDocClick); window.removeEventListener('keydown', onKey) } }, [])

  const onMoreMouseEnter = () => { clearTimeout(closeHoverTimer.current); openHoverTimer.current = setTimeout(() => setIsMoreOpen(true), 80) }
  const onMoreMouseLeave = () => { clearTimeout(openHoverTimer.current); closeHoverTimer.current = setTimeout(() => setIsMoreOpen(false), 160) }
  const toggleMobileMenu = () => setIsMobileMenuOpen((v) => !v)
  const closeMobileMenu = () => setIsMobileMenuOpen(false)
  const isActivePath = (p) => location?.pathname === p

  return (
    <header
    className={`header-glass fixed inset-x-0 top-0 z-50
      transition-[background-color,backdrop-filter,border-color,box-shadow] duration-300 theme-transition
      ${
        isScrolled
          // ➜ use theme variables instead of hardcoded colors
          ? 'bg-surface-elevated/80 backdrop-blur-md backdrop-saturate-150 border-b border-primary/10 shadow-theme-lg'
          : 'bg-transparent border-b border-transparent shadow-none backdrop-blur-0'
      }`}
  >
      <div className="w-full">
        <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
          <Link to="/" onClick={closeMobileMenu} className="group flex items-center space-x-4 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 rounded-lg">
            <div className="relative"><img src="./icon.png" alt="Serene AI" className="h-16 w-16 object-contain shrink-0 transform-gpu will-change-transform transition-transform duration-300 [transition-timing-function:cubic-bezier(.2,.8,.2,1)] group-hover:scale-[1.04] group-hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:transform-none" /></div>
            <div className="flex flex-col transform-gpu will-change-transform transition-transform duration-300 [transition-timing-function:cubic-bezier(.2,.8,.2,1)] group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:transform-none"><span className="text-xl font-bold text-primary tracking-tight">Serene AI</span><span className="text-xs text-text-secondary font-medium -mt-1">Dental Platform</span></div>
          </Link>

          {/* DESKTOP NAV — transparent links (no chip backgrounds) */}
          <nav className="hidden lg:flex items-center space-x-1 !bg-transparent !shadow-none !border-0 p-0 m-0">
            {navigationItems.map((item) => {
              const active = isActivePath(item.path)
              return (
                <Link key={item.path} to={item.path} className={`group flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transform-gpu will-change-[transform] transition-[transform,color] duration-200 [transition-timing-function:cubic-bezier(.2,.8,.2,1)] !bg-transparent hover:!bg-transparent active:!bg-transparent !shadow-none !ring-0 !outline-none ${active ? 'text-primary' : 'text-text-primary hover:text-primary'} hover:-translate-y-0.5 active:translate-y-0 active:scale-[.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:transform-none`}>
                  <span className="transform-gpu transition-transform duration-200 ease-out group-hover:-translate-y-0.5 motion-reduce:transform-none"><Icon name={item.icon} size={16} className="[fill:none] stroke-current [&_*]:[fill:none]" /></span><span>{item.name}</span>
                </Link>
              )
            })}

            {/* MORE (desktop) */}
            <div ref={moreRef} className="relative" onMouseEnter={onMoreMouseEnter} onMouseLeave={onMoreMouseLeave}>
              <button type="button" onClick={() => setIsMoreOpen((v) => !v)} aria-haspopup="menu" aria-expanded={isMoreOpen} aria-controls="more-menu" className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transform-gpu will-change-[transform] transition-[transform,color] duration-200 [transition-timing-function:cubic-bezier(.2,.8,.2,1)] !bg-transparent hover:!bg-transparent active:!bg-transparent !shadow-none ${isMoreOpen ? 'text-primary -translate-y-0.5' : 'text-text-primary hover:text-primary hover:-translate-y-0.5'} active:translate-y-0 active:scale-[.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:transform-none`}>
                <Icon name="MoreHorizontal" size={16} className="[fill:none] stroke-current [&_*]:[fill:none]" /><span>More</span><span className={`transform-gpu transition-transform duration-200 ease-out ${isMoreOpen ? 'rotate-180' : ''} motion-reduce:transform-none`}><Icon name="ChevronDown" size={14} className="[fill:none] stroke-current [&_*]:[fill:none]" /></span>
              </button>

              {/* Improved dropdown with better contrast */}
              <div id="more-menu" role="menu" className={`absolute top-full right-0 mt-2 z-[60] w-56 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 backdrop-blur-xl shadow-xl transform-gpu will-change-[transform,opacity] transition-[opacity,transform] duration-200 [transition-timing-function:cubic-bezier(.2,.8,.2,1)] ${isMoreOpen ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto' : 'opacity-0 scale-95 translate-y-1 pointer-events-none'}`}>
                <div className="py-2">
                  {moreItems.map((item) => {
                    const active = isActivePath(item.path)
                    return (
                      <Link key={item.path} to={item.path} onClick={() => setIsMoreOpen(false)} role="menuitem" className={`group/item flex items-center space-x-3 px-4 py-2 text-sm font-medium rounded-md !bg-transparent !shadow-none text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transform-gpu transition-[transform,background-color,color] duration-150 [transition-timing-function:cubic-bezier(.2,.8,.2,1)] ${active ? 'text-primary' : ''} hover:-translate-y-0.5 active:translate-y-0 motion-reduce:transition-none motion-reduce:transform-none`}>
                        <span className="transform-gpu transition-transform duration-150 ease-out group-hover/item:-translate-y-0.5 motion-reduce:transform-none"><Icon name={item.icon} size={16} className="[fill:none] stroke-current [&_*]:[fill:none]" /></span><span>{item.name}</span>
                      </Link>
                    )
                  })}
                </div>
              </div>
            </div>
          </nav>

          {/* DESKTOP CTAs */}
          <div className="hidden lg:flex items-center space-x-3">
            <button onClick={toggleTheme} aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`} className="group p-2 rounded-lg text-text-primary hover:text-primary transform-gpu will-change-transform transition-[transform,color] duration-200 [transition-timing-function:cubic-bezier(.2,.8,.2,1)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:transform-none"><span className="block transform-gpu transition-transform duration-300 [transition-timing-function:cubic-bezier(.2,.8,.2,1)] group-hover:rotate-12 motion-reduce:transform-none"><Icon name={isDark ? 'Sun' : 'Moon'} size={20} className="[fill:none] stroke-current [&_*]:[fill:none]" /></span></button>
            <Link to="/login">
              <Button variant="glass" glassActive={isScrolled} iconName="LogIn" iconPosition="left" iconSize={16}>Sign In</Button>
            </Link>
            {isOnSereneAI ? (
              // Show only icon when on SereneAI page
              <Link to="/serene-agentic" className="group p-2 rounded-lg text-primary hover:text-primary/80 transform-gpu will-change-transform transition-[transform,color] duration-200 [transition-timing-function:cubic-bezier(.2,.8,.2,1)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:transform-none" title="AI Analysis Active">
                <span className="block transform-gpu transition-transform duration-300 [transition-timing-function:cubic-bezier(.2,.8,.2,1)] group-hover:scale-110 motion-reduce:transform-none">
                  <Icon name="Sparkles" size={20} className="[fill:none] stroke-current [&_*]:[fill:none]" />
                </span>
              </Link>
            ) : (
              // Show full button when not on SereneAI page
              <Link to="/serene-agentic">
                <Button variant="default" iconName="Sparkles" iconPosition="left" iconSize={16}>Try Free Analysis</Button>
              </Link>
            )}
          </div>

          {/* MOBILE TOGGLE */}
          <button onClick={toggleMobileMenu} aria-label="Toggle mobile menu" className="lg:hidden p-2 rounded-lg text-text-primary hover:text-primary transform-gpu will-change-transform transition-[transform,color] duration-200 [transition-timing-function:cubic-bezier(.2,.8,.2,1)] hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:transform-none"><Icon name={isMobileMenuOpen ? 'X' : 'Menu'} size={24} className="[fill:none] stroke-current [&_*]:[fill:none]" /></button>
        </div>

        {/* MOBILE MENU */}
        <div className={`lg:hidden will-change-[max-height,opacity] overflow-hidden transition-[max-height,opacity] duration-300 [transition-timing-function:cubic-bezier(.2,.8,.2,1)] ${isMobileMenuOpen ? 'max-h-screen opacity-100 visible' : 'max-h-0 opacity-0 invisible'} motion-reduce:transition-none`}>
          <div className="px-4 py-4 border-t border-black/10 dark:border-white/10 bg-white/70 dark:bg-neutral-900/60 backdrop-blur-md">
            <nav className="space-y-2">
              {navigationItems.map((item) => {
                const active = isActivePath(item.path)
                return (
                  <Link key={item.path} to={item.path} onClick={closeMobileMenu} className={`group flex items-center space-x-3 px-4 py-3 rounded-lg text-base font-medium bg-transparent text-text-primary transform-gpu will-change-transform transition-[transform,color] duration-200 [transition-timing-function:cubic-bezier(.2,.8,.2,1)] ${active ? 'text-primary' : 'hover:text-primary'} hover:-translate-y-0.5 active:translate-y-0 active:scale-[.99] motion-reduce:transition-none motion-reduce:transform-none`}>
                    <span className="transform-gpu transition-transform duration-200 ease-out group-hover:-translate-y-0.5 motion-reduce:transform-none"><Icon name={item.icon} size={20} className="[fill:none] stroke-current [&_*]:[fill:none]" /></span><span>{item.name}</span>
                  </Link>
                )
              })}
              {moreItems.map((item) => {
                const active = isActivePath(item.path)
                return (
                  <Link key={item.path} to={item.path} onClick={closeMobileMenu} className={`group flex items-center space-x-3 px-4 py-3 rounded-lg text-base font-medium bg-transparent text-text-primary transform-gpu will-change-transform transition-[transform,color] duration-200 [transition-timing-function:cubic-bezier(.2,.8,.2,1)] ${active ? 'text-primary' : 'hover:text-primary'} hover:-translate-y-0.5 active:translate-y-0 active:scale-[.99] motion-reduce:transition-none motion-reduce:transform-none`}>
                    <span className="transform-gpu transition-transform duration-200 ease-out group-hover:-translate-y-0.5 motion-reduce:transform-none"><Icon name={item.icon} size={20} className="[fill:none] stroke-current [&_*]:[fill:none]" /></span><span>{item.name}</span>
                  </Link>
                )
              })}
            </nav>

            <div className="mt-6 pt-4 border-t border-black/10 dark:border-white/10 space-y-3">
              <button onClick={toggleTheme} className="group flex items-center space-x-3 px-4 py-3 w-full rounded-lg text-base font-medium text-text-primary hover:text-primary transform-gpu will-change-transform transition-[transform,color] duration-200 [transition-timing-function:cubic-bezier(.2,.8,.2,1)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:transform-none"><span className="transform-gpu transition-transform duration-300 [transition-timing-function:cubic-bezier(.2,.8,.2,1)] group-hover:rotate-12 motion-reduce:transform-none"><Icon name={isDark ? 'Sun' : 'Moon'} size={20} className="[fill:none] stroke-current [&_*]:[fill:none]" /></span><span>{isDark ? 'Light Mode' : 'Dark Mode'}</span></button>
              <Link to="/login" onClick={closeMobileMenu}>
                <Button variant="glass" glassActive={isScrolled} fullWidth iconName="LogIn" iconPosition="left" iconSize={18}>Sign In</Button>
              </Link>
              {!isOnSereneAI && (
                <Link to="/serene-agentic" onClick={closeMobileMenu}>
                  <Button variant="default" fullWidth iconName="Sparkles" iconPosition="left" iconSize={18}>Try Free Analysis</Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
