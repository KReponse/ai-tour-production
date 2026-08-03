// src/components/ui/Input.jsx

import React, { forwardRef } from 'react';
import clsx from 'clsx';

// ===============================
// AI TOUR COLORS
// ===============================
// Teal  : #0D9488
// Gold  : #F59E0B
// Slate : #374151
// White : #FFFFFF
// ===============================

const Input = forwardRef(({ 
  className, 
  variant = 'default',
  size = 'md',
  error,
  icon: Icon,
  iconPosition = 'left',
  ...props 
}, ref) => {
  // Size variants
  const sizes = {
    sm: 'px-3 py-1.5 text-sm h-10',
    md: 'px-4 py-2.5 text-base h-12',
    lg: 'px-5 py-3 text-lg h-14',
  };

  // Variant styles
  const variants = {
    default: `
      border-gray-300 dark:border-gray-600 
      bg-white dark:bg-gray-800 
      text-gray-900 dark:text-white
      focus:ring-2 focus:ring-[#0D9488] focus:border-transparent
    `,
    filled: `
      border-transparent
      bg-gray-100 dark:bg-gray-700 
      text-gray-900 dark:text-white
      focus:ring-2 focus:ring-[#0D9488] focus:bg-white dark:focus:bg-gray-800
    `,
    outline: `
      border-2 border-[#0D9488] 
      bg-transparent 
      text-gray-900 dark:text-white
      focus:ring-2 focus:ring-[#0D9488]/50
    `,
    ghost: `
      border-transparent
      bg-transparent 
      text-gray-900 dark:text-white
      focus:ring-2 focus:ring-[#0D9488]
    `,
  };

  // Error state
  const errorStyles = error ? `
    border-red-500 dark:border-red-500
    focus:ring-red-500 focus:border-red-500
    bg-red-50 dark:bg-red-900/10
  ` : '';

  // Icon spacing
  const iconSpacing = {
    left: Icon ? 'pl-10' : '',
    right: Icon ? 'pr-10' : '',
  };

  return (
    <div className="relative w-full">
      {Icon && iconPosition === 'left' && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none">
          <Icon className="w-5 h-5" />
        </div>
      )}

      <input
        ref={ref}
        className={clsx(
          'w-full rounded-xl transition-all duration-200',
          'placeholder:text-gray-400 dark:placeholder:text-gray-500',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'focus:outline-none',
          sizes[size] || sizes.md,
          variants[variant] || variants.default,
          errorStyles,
          iconSpacing[iconPosition],
          className
        )}
        {...props}
      />

      {Icon && iconPosition === 'right' && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none">
          <Icon className="w-5 h-5" />
        </div>
      )}

      {error && typeof error === 'string' && (
        <p className="mt-1.5 text-sm text-red-500 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block"></span>
          {error}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;