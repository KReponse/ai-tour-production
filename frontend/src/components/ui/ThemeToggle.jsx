// src/components/ui/ThemeToggle.jsx

import React from 'react';
import { Sun, Moon, Sparkles } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import clsx from 'clsx';

// ===============================
// AI TOUR COLORS
// ===============================
// Teal  : #0D9488
// Gold  : #F59E0B
// Slate : #374151
// White : #FFFFFF
// ===============================

const ThemeToggle = ({ variant = 'default', size = 'md', className }) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  // Size variants
  const sizes = {
    sm: 'p-1.5 w-8 h-8',
    md: 'p-2 w-10 h-10',
    lg: 'p-2.5 w-12 h-12',
  };

  // Variant styles
  const variants = {
    default: `
      bg-gray-200 dark:bg-gray-700 
      hover:bg-gray-300 dark:hover:bg-gray-600
      text-gray-700 dark:text-gray-300
      hover:text-[#0D9488] dark:hover:text-[#F59E0B]
    `,
    teal: `
      bg-[#0D9488]/10 dark:bg-[#0D9488]/20
      hover:bg-[#0D9488]/20 dark:hover:bg-[#0D9488]/30
      text-[#0D9488]
      hover:scale-110
    `,
    gold: `
      bg-[#F59E0B]/10 dark:bg-[#F59E0B]/20
      hover:bg-[#F59E0B]/20 dark:hover:bg-[#F59E0B]/30
      text-[#F59E0B]
      hover:scale-110
    `,
    glass: `
      bg-white/20 dark:bg-gray-800/50
      backdrop-blur-md
      hover:bg-white/30 dark:hover:bg-gray-800/70
      text-white dark:text-gray-200
      hover:text-[#F59E0B] dark:hover:text-[#F59E0B]
      border border-white/20 dark:border-gray-700/50
    `,
    outline: `
      border-2 border-gray-300 dark:border-gray-600
      hover:border-[#0D9488] dark:hover:border-[#0D9488]
      bg-transparent
      text-gray-700 dark:text-gray-300
      hover:text-[#0D9488] dark:hover:text-[#0D9488]
    `,
  };

  // Icon size
  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <button
      onClick={toggleTheme}
      className={clsx(
        'relative rounded-full transition-all duration-300',
        'focus:outline-none focus:ring-2 focus:ring-[#0D9488]/50 focus:ring-offset-2 dark:focus:ring-offset-gray-900',
        sizes[size] || sizes.md,
        variants[variant] || variants.default,
        className
      )}
      aria-label="Toggle theme"
    >
      <div className="relative flex items-center justify-center w-full h-full">
        {/* Sun icon (Light mode) */}
        <Sun className={clsx(
          'absolute transition-all duration-300',
          iconSizes[size] || iconSizes.md,
          isDark ? 'opacity-0 rotate-90 scale-0' : 'opacity-100 rotate-0 scale-100'
        )} />
        
        {/* Moon icon (Dark mode) */}
        <Moon className={clsx(
          'absolute transition-all duration-300',
          iconSizes[size] || iconSizes.md,
          isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-0'
        )} />
      </div>

      {/* Glow effect on hover */}
      <span className={clsx(
        'absolute inset-0 rounded-full opacity-0 transition-opacity duration-300 pointer-events-none',
        isDark ? 'bg-[#F59E0B]/10' : 'bg-[#0D9488]/10',
        'group-hover:opacity-100'
      )} />
    </button>
  );
};

export default ThemeToggle;