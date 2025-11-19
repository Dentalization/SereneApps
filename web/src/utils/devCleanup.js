// src/utils/devCleanup.js
// Utility untuk membersihkan element nyasar saat development

export const cleanStrayElements = () => {
  if (!import.meta.env.DEV) return;

  // 1. Bersihkan text node nyasar di body
  const bodyChildren = Array.from(document.body.childNodes);
  bodyChildren.forEach(node => {
    if (node.nodeType === Node.TEXT_NODE && 
        node.textContent.trim() !== '' && 
        node.parentNode === document.body &&
        node !== document.getElementById('root')) {
      console.log('🧹 Menghapus text node nyasar:', JSON.stringify(node.textContent));
      node.remove();
    }
  });

  // 2. Bersihkan element dengan z-index sangat tinggi yang mungkin overlay
  const allElements = document.querySelectorAll('*');
  allElements.forEach(el => {
    const zIndex = window.getComputedStyle(el).zIndex;
    const position = window.getComputedStyle(el).position;
    
    // Jika element punya z-index > 9999 dan position fixed/absolute
    if (parseInt(zIndex) > 9999 && 
        (position === 'fixed' || position === 'absolute') &&
        !el.closest('#root') && // Bukan bagian dari aplikasi kita
        el.textContent.trim().length <= 3) { // Text pendek seperti "S"
      
      console.log('🧹 Menghapus overlay suspicious:', el, 'text:', el.textContent);
      el.remove();
    }
  });

  // 3. Bersihkan element yang mungkin overlay keystroke
  const suspiciousOverlays = document.querySelectorAll('[class*="keystroke"], [class*="overlay"], [id*="keystroke"], [id*="overlay"]');
  suspiciousOverlays.forEach(el => {
    if (!el.closest('#root') && el.textContent.trim().length <= 3) {
      console.log('🧹 Menghapus keystroke overlay:', el);
      el.remove();
    }
  });
};

export const initDevCleanup = () => {
  if (!import.meta.env.DEV) return;

  // Jalankan pembersihan secara berkala
  setInterval(cleanStrayElements, 3000);

  // Jalankan saat DOM content loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', cleanStrayElements);
  } else {
    cleanStrayElements();
  }

  // Observer untuk mendeteksi penambahan element baru
  const observer = new MutationObserver((mutations) => {
    let shouldClean = false;
    
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          // Jika ada text node atau element suspicious ditambahkan
          if (node.nodeType === Node.TEXT_NODE || 
              (node.nodeType === Node.ELEMENT_NODE && !node.closest('#root'))) {
            shouldClean = true;
          }
        });
      }
    });

    if (shouldClean) {
      setTimeout(cleanStrayElements, 100); // Delay sedikit
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  console.log('🧹 Dev cleanup initialized - akan membersihkan overlay/text node nyasar');
};
