import { useEffect, useState } from 'react';

export default function useDevicePixelRatio() {
  const [dpr, setDpr] = useState(() => (
    typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
  ));

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    let mediaQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
    const handleChange = () => {
      setDpr(window.devicePixelRatio || 1);
      mediaQuery.removeEventListener('change', handleChange);
      mediaQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
      mediaQuery.addEventListener('change', handleChange);
    };

    mediaQuery.addEventListener('change', handleChange);
    window.addEventListener('resize', handleChange);
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
      window.removeEventListener('resize', handleChange);
    };
  }, []);

  return dpr;
}
