/** @type {import('tailwindcss').Config} */
import typography from '@tailwindcss/typography';
import forms from '@tailwindcss/forms';
import animate from 'tailwindcss-animate';

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'selector', // Enable dark mode with selector strategy
  theme: {
    extend: {
      colors: {
        border: 'var(--color-border)',
        input: 'var(--color-input)',
        ring: 'var(--color-ring)',
        background: 'var(--color-background)',
        foreground: 'var(--color-foreground)',
        primary: {
          DEFAULT: 'var(--color-primary)',
          foreground: 'var(--color-primary-foreground)'
        },
        secondary: {
          DEFAULT: 'var(--color-secondary)',
          foreground: 'var(--color-secondary-foreground)'
        },
        destructive: {
          DEFAULT: 'var(--color-destructive)',
          foreground: 'var(--color-destructive-foreground)'
        },
        muted: {
          DEFAULT: 'var(--color-muted)',
          foreground: 'var(--color-muted-foreground)'
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          foreground: 'var(--color-accent-foreground)'
        },
        popover: {
          DEFAULT: 'var(--color-popover)',
          foreground: 'var(--color-popover-foreground)'
        },
        card: {
          DEFAULT: 'var(--color-card)',
          foreground: 'var(--color-card-foreground)'
        },
        success: {
          DEFAULT: 'var(--color-success)',
          foreground: 'var(--color-success-foreground)'
        },
        warning: {
          DEFAULT: 'var(--color-warning)',
          foreground: 'var(--color-warning-foreground)'
        },
        error: {
          DEFAULT: 'var(--color-error)',
          foreground: 'var(--color-error-foreground)'
        },
        // Brand specific colors
        'brand-primary': 'var(--primary)',
        'brand-accent': 'var(--accent)',
        'violet-1': 'var(--violet-1)',
        'blue-1': 'var(--blue-1)',
        // Theme-aware surface colors
        surface: {
          DEFAULT: 'var(--color-surface)',
          elevated: 'var(--color-card)'
        },
        // Theme-aware text colors  
        'text-primary': 'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        // Brand colors
        'brand-canvas': 'var(--color-brand-canvas)',
        'trust-green': {
          DEFAULT: 'var(--color-trust-green)',
          foreground: 'var(--color-trust-green-foreground)'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        'hero': 'clamp(1.5rem, 4vw, 3rem)',
        'value-prop': 'clamp(1.125rem, 2.5vw, 1.5rem)',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      borderRadius: {
        'medical': '8px',
      },
      boxShadow: {
        'brand': '0 4px 8px rgba(72, 58, 160, 0.08), 0 1px 3px rgba(72, 58, 160, 0.12)',
        'brand-hover': '0 8px 24px rgba(72, 58, 160, 0.2)',
        'gentle': '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        // Theme-aware shadows
        'theme-sm': 'var(--shadow-sm)',
        'theme-md': 'var(--shadow-md)', 
        'theme-lg': 'var(--shadow-lg)',
        'theme-xl': 'var(--shadow-xl)',
        'theme-2xl': 'var(--shadow-2xl)'
      },
      animation: {
        'heartbeat': 'heartbeat 2s infinite ease-in-out',
        'shimmer': 'shimmer 1.5s infinite',
        'fade-in-up': 'fadeInUp 600ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'spin-slow': 'spin 8s linear infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        heartbeat: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.02)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        fadeInUp: {
          'to': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      transitionTimingFunction: {
        'gentle': 'cubic-bezier(0.4, 0.0, 0.2, 1)',
        'empathetic': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      backdropBlur: {
        'medical': '8px',
      },
      gradientColorStops: {
        'brand-start': '#483AA0',
        'brand-middle': '#6B5ACD',
        'brand-end': '#8A7FD8',
      },
    },
  },
  plugins: [
    typography,
    forms,
    animate,
    // Custom plugin untuk hide scrollbar
    function({ addUtilities }) {
      addUtilities({
        '.scrollbar-hide': {
          /* IE and Edge */
          '-ms-overflow-style': 'none',
          /* Firefox */
          'scrollbar-width': 'none',
          /* Safari and Chrome */
          '&::-webkit-scrollbar': {
            display: 'none'
          }
        }
      })
    }
  ],
}