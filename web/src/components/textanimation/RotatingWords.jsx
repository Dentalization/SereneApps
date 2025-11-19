// components/RotatingWords.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';

export default function RotatingWords({ words, interval = 3000 }) {
  const [i, setI] = useState(0);
  const [phase, setPhase] = useState('in');
  const timeoutRef = useRef(null);
  const intervalRef = useRef(null);

  const longest = useMemo(
    () => words.reduce((a, b) => (a.length >= b.length ? a : b), ''),
    [words]
  );

  useEffect(() => {
    const tick = () => {
      setPhase('out');
      timeoutRef.current = setTimeout(() => {
        setI((x) => (x + 1) % words.length);
        setPhase('in');
      }, 220); // match CSS duration
    };
    intervalRef.current = setInterval(tick, interval);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [interval, words.length]);

  return (
    <span className="relative inline-flex">
      {/* spacer locks layout size to the longest phrase */}
      <span aria-hidden="true" className="invisible whitespace-nowrap">
        {longest}
      </span>

      <span
        className={`absolute inset-0 transition-all duration-200 ease-out whitespace-nowrap
          ${phase === 'in' ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}
      >
        <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent dark:from-purple-400 dark:to-pink-400">
          {words[i]}
        </span>
      </span>
    </span>
  );
}
