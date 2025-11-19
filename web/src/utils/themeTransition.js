/**
 * Premium Theme Transition Utility
 * Healthcare SaaS Dashboard - Serene, Clinical, High Trust
 */

class ThemeTransition {
  constructor() {
    this.isTransitioning = false;
    this.veilElement = null;
    this.appShell = null;
    this.transitionDuration = 240; // ms
    this.veilDuration = 120; // ms
    
    this.init();
  }
  
  init() {
    // Create glass veil element
    this.createVeil();
    
    // Get app shell element
    this.appShell = document.getElementById('root') || document.body;
    this.appShell.classList.add('app-shell');
    
    // Add theme transition class to body
    document.body.classList.add('theme-transition');
    
    // Respect prefers-reduced-motion
    this.respectsReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  
  createVeil() {
    this.veilElement = document.createElement('div');
    this.veilElement.className = 'theme-veil';
    this.veilElement.setAttribute('aria-hidden', 'true');
    document.body.appendChild(this.veilElement);
  }
  
  async transitionTheme(isDark) {
    if (this.isTransitioning) return;
    
    this.isTransitioning = true;
    
    try {
      if (this.respectsReducedMotion) {
        // Instant transition for reduced motion
        this.applyTheme(isDark);
        return;
      }
      
      // Step 1: Show glass veil and scale app shell
      await this.showVeil();
      
      // Step 2: Apply theme change
      this.applyTheme(isDark);
      
      // Step 3: Hide veil and restore scale
      await this.hideVeil();
      
    } finally {
      this.isTransitioning = false;
    }
  }
  
  async showVeil() {
    return new Promise((resolve) => {
      // Add transitioning class to app shell
      this.appShell.classList.add('theme-transitioning');
      
      // Show veil with backdrop blur
      this.veilElement.classList.add('active');
      
      // Wait for veil animation to complete
      setTimeout(resolve, this.veilDuration);
    });
  }
  
  async hideVeil() {
    return new Promise((resolve) => {
      // Remove transitioning class from app shell
      this.appShell.classList.remove('theme-transitioning');
      
      // Hide veil
      this.veilElement.classList.remove('active');
      
      // Wait for full transition to complete
      setTimeout(resolve, this.transitionDuration);
    });
  }
  
  applyTheme(isDark) {
    const htmlElement = document.documentElement;
    
    if (isDark) {
      htmlElement.classList.add('dark');
    } else {
      htmlElement.classList.remove('dark');
    }
    
    // Store preference
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    
    // Dispatch custom event for other components
    window.dispatchEvent(new CustomEvent('themeChanged', {
      detail: { isDark }
    }));
  }
  
  getCurrentTheme() {
    return document.documentElement.classList.contains('dark');
  }
  
  initializeTheme() {
    // Get saved theme or system preference
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    let isDark;
    if (savedTheme) {
      isDark = savedTheme === 'dark';
    } else {
      isDark = systemPrefersDark;
    }
    
    // Apply theme without animation on initial load
    this.applyTheme(isDark);
    
    return isDark;
  }
  
  // Method to add theme transition class to elements
  addThemeTransition(element) {
    if (element) {
      element.classList.add('theme-transition');
    }
  }
  
  // Method to remove theme transition class from elements
  removeThemeTransition(element) {
    if (element) {
      element.classList.remove('theme-transition');
    }
  }
  
  // Cleanup method
  destroy() {
    if (this.veilElement) {
      this.veilElement.remove();
    }
    
    if (this.appShell) {
      this.appShell.classList.remove('app-shell', 'theme-transitioning');
    }
    
    document.body.classList.remove('theme-transition');
  }
}

// Create singleton instance
const themeTransition = new ThemeTransition();

// Enhanced Theme Hook for React Components
export const useThemeTransition = () => {
  const [isDark, setIsDark] = React.useState(() => {
    return themeTransition.getCurrentTheme();
  });
  
  const toggleTheme = React.useCallback(async () => {
    const newTheme = !isDark;
    await themeTransition.transitionTheme(newTheme);
    setIsDark(newTheme);
  }, [isDark]);
  
  // Listen for theme changes from other sources
  React.useEffect(() => {
    const handleThemeChange = (event) => {
      setIsDark(event.detail.isDark);
    };
    
    window.addEventListener('themeChanged', handleThemeChange);
    return () => window.removeEventListener('themeChanged', handleThemeChange);
  }, []);
  
  return {
    isDark,
    toggleTheme,
    isTransitioning: themeTransition.isTransitioning
  };
};

// Initialize theme on app start
export const initializeAppTheme = () => {
  return themeTransition.initializeTheme();
};

// Export utilities
export {
  themeTransition,
  ThemeTransition
};

export default themeTransition;