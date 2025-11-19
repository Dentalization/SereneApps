import React from 'react';
import { cn } from '../../utils/cn';

const GlassSurface = ({ 
  children, 
  className = '', 
  blur = 'sm',
  opacity = 20,
  ...props 
}) => {
  const blurMap = {
    sm: 'backdrop-blur-sm',
    md: 'backdrop-blur-md',
    lg: 'backdrop-blur-lg',
    xl: 'backdrop-blur-xl'
  };

  return (
    <div 
      className={cn(
        'relative rounded-2xl border border-primary shadow-theme-lg theme-transition',
        `bg-surface-elevated/80 ${blurMap[blur]}`,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export default GlassSurface;