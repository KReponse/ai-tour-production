// src/components/ui/Button.jsx

import React from 'react';
import clsx from 'clsx';

// ===============================
// AI TOUR COLORS
// ===============================
// Teal  : #0D9488
// Gold  : #F59E0B
// Slate : #374151
// White : #FFFFFF
// ===============================

const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className, 
  ...props 
}) => {
  const variants = {
    // Primary: Teal to Gold gradient
    primary: 'bg-gradient-to-r from-[#0D9488] to-[#F59E0B] text-white hover:scale-105 hover:shadow-xl shadow-md shadow-[#0D9488]/25',
    
    // Secondary: Gray
    secondary: 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600',
    
    // Outline: Teal border
    outline: 'border-2 border-[#0D9488] text-[#0D9488] dark:text-[#0D9488] hover:bg-[#0D9488]/10 dark:hover:bg-[#0D9488]/20 transition',
    
    // Ghost: No background, Teal text
    ghost: 'text-[#0D9488] hover:bg-[#0D9488]/10 dark:hover:bg-[#0D9488]/20 transition',
    
    // Danger: Red
    danger: 'bg-red-500 text-white hover:bg-red-600 hover:shadow-lg shadow-md shadow-red-500/25 transition',
    
    // Success: Teal
    success: 'bg-[#0D9488] text-white hover:bg-[#0D9488]/80 hover:shadow-lg shadow-md shadow-[#0D9488]/25 transition',
    
    // Gold: Gold background
    gold: 'bg-[#F59E0B] text-white hover:bg-[#F59E0B]/80 hover:shadow-lg shadow-md shadow-[#F59E0B]/25 transition',
    
    // Dark: Slate
    dark: 'bg-[#374151] text-white hover:bg-[#374151]/80 hover:shadow-lg transition',
  };

  const sizes = {
    xs: 'px-2 py-1 text-xs',
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-2.5 text-base',
    lg: 'px-8 py-3.5 text-lg',
    xl: 'px-10 py-4 text-xl',
  };

  return (
    <button
      className={clsx(
        'rounded-full font-semibold transition-all duration-300',
        'focus:outline-none focus:ring-2 focus:ring-[#0D9488]/50 focus:ring-offset-2 dark:focus:ring-offset-gray-900',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100',
        variants[variant] || variants.primary,
        sizes[size] || sizes.md,
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;