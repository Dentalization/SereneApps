import React, { useState, useRef, useEffect } from 'react';
import AppIcon from '../AppIcon';

export default function Dropdown({ label, icon, children, className = '', labelClassName = '' }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) && !buttonRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-slate-700 hover:text-white ${className}`}
        title={label}
      >
        {icon && <AppIcon name={icon} size={16} />}
        <span className={labelClassName}>{label}</span>
        <AppIcon name={isOpen ? 'ChevronUp' : 'ChevronDown'} size={14} />
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute right-0 z-50 mt-2 min-w-48 rounded-lg border border-slate-700 bg-slate-800 shadow-lg backdrop-blur-sm"
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function DropdownItem({ label, icon, onClick, disabled = false, className = '' }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full px-4 py-2 text-left text-sm text-slate-300 transition first:rounded-t-lg last:rounded-b-lg hover:bg-slate-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent ${className}`}
    >
      <div className="flex items-center gap-3">
        {icon && <AppIcon name={icon} size={16} />}
        <span>{label}</span>
      </div>
    </button>
  );
}

export function DropdownDivider() {
  return <div className="my-1 border-t border-slate-700" />;
}
