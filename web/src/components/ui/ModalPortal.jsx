import { createPortal } from 'react-dom';
import { useEffect, useRef } from 'react';

const MODAL_ROOT_ID = 'serene-modal-root';

function getModalRoot() {
  let root = document.getElementById('serene-modal-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'serene-modal-root';
    document.body.appendChild(root);
  }
  return root;
}

const getLockState = () => {
  if (typeof window === 'undefined') return null;
  if (!window.__sereneModalLockState) {
    window.__sereneModalLockState = {
      count: 0,
      previousOverflow: null
    };
  }
  return window.__sereneModalLockState;
};

const ModalPortal = ({ children, disableScroll = true }) => {
  const elRef = useRef(
    typeof document !== 'undefined' ? document.createElement('div') : null
  );

  useEffect(() => {
    const modalRoot = getModalRoot();
    const el = elRef.current;

    if (!modalRoot || !el) return undefined;

    modalRoot.appendChild(el);

    const lockState = disableScroll ? getLockState() : null;

    if (disableScroll && lockState) {
      if (lockState.count === 0) {
        lockState.previousOverflow = document.body.style.overflow;
        lockState.previousPosition = document.body.style.position;
        lockState.previousTop = document.body.style.top;
        lockState.scrollY = window.scrollY;
        
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.top = `-${lockState.scrollY}px`;
        document.body.style.width = '100%';
      }
      lockState.count += 1;
    }

    return () => {
      if (disableScroll && lockState) {
        lockState.count = Math.max(0, lockState.count - 1);
        if (lockState.count === 0) {
          document.body.style.overflow = lockState.previousOverflow ?? '';
          document.body.style.position = lockState.previousPosition ?? '';
          document.body.style.top = lockState.previousTop ?? '';
          document.body.style.width = '';
          window.scrollTo(0, lockState.scrollY || 0);
          lockState.previousOverflow = null;
          lockState.previousPosition = null;
          lockState.previousTop = null;
          lockState.scrollY = 0;
        }
      }
      if (modalRoot.contains(el)) {
        modalRoot.removeChild(el);
      }
    };
  }, [disableScroll]);

  if (!elRef.current) {
    return null;
  }

  return createPortal(children, elRef.current);
};

export default ModalPortal;
