import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';

// Fungsi untuk memastikan root element selalu ada
function getModalRoot() {
  let root = document.getElementById('serene-modal-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'serene-modal-root';
    // CRITICAL: NO position style! Let children use position: fixed relative to viewport
    // Adding position: relative here breaks fixed positioning for all modals
    document.body.appendChild(root);
  }
  return root;
}

const ModalPortal = ({ children, disableScroll = true }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const modalRoot = getModalRoot();
    
    // LOGIC SCROLL LOCK YANG AMAN (Hanya Mainkan Overflow)
    if (disableScroll) {
      // Simpan overflow asli untuk dikembalikan nanti
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden'; // Kunci scroll
      
      return () => {
        document.body.style.overflow = originalStyle; // Lepas kunci
      };
    }
  }, [disableScroll]);

  // Jangan render apa-apa sampai client-side siap (Hydration fix)
  if (!mounted) return null;

  const modalRoot = getModalRoot();
  return createPortal(children, modalRoot);
};

export default ModalPortal;