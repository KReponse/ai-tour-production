// src/components/ui/ThemeToggle.jsx
// ✅ COMPLETE FIXED - Mobile responsive with proper sizing
// ✅ ADDED: Responsive touch targets for mobile
// ✅ ADDED: Label support for accessibility
// ✅ ADDED: Animation variants
// ✅ ADDED: Dropdown variant with theme options
// ✅ FIXED: Better touch targets on mobile

import React, { useState } from 'react';
import { Sun, Moon, Sparkles, Monitor, ChevronDown } from 'lucide-react';
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

const ThemeToggle = ({ 
  variant = 'default', 
  size = 'md', 
  className,
  showLabel = false,
  labelPosition = 'right',
  labelText = 'Theme',
  animation = 'default',
}) => {
  const { theme, toggleTheme, setTheme } = useTheme();
  const isDark = theme === 'dark';
  const [isOpen, setIsOpen] = useState(false);

  // ✅ Responsive sizes
  const sizes = {
    sm: 'p-1.5 w-7 h-7 sm:w-8 sm:h-8',
    md: 'p-1.5 sm:p-2 w-9 h-9 sm:w-10 sm:h-10',
    lg: 'p-2 sm:p-2.5 w-10 h-10 sm:w-12 sm:h-12',
    xl: 'p-2.5 sm:p-3 w-12 h-12 sm:w-14 sm:h-14',
  };

  // ✅ Responsive icon sizes
  const iconSizes = {
    sm: 'w-3 h-3 sm:w-3.5 sm:h-3.5',
    md: 'w-3.5 h-3.5 sm:w-4.5 sm:h-4.5',
    lg: 'w-4.5 h-4.5 sm:w-5.5 sm:h-5.5',
    xl: 'w-5.5 h-5.5 sm:w-6 sm:h-6',
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
    floating: `
      bg-white dark:bg-gray-800
      shadow-lg hover:shadow-xl
      border border-gray-200 dark:border-gray-700
      text-gray-700 dark:text-gray-300
      hover:text-[#0D9488] dark:hover:text-[#F59E0B]
      hover:scale-105
    `,
  };

  // Animation variants
  const animations = {
    default: 'transition-all duration-300',
    smooth: 'transition-all duration-500 ease-in-out',
    bounce: 'transition-all duration-300 hover:animate-bounce',
    spin: 'transition-all duration-500 hover:rotate-180',
    pulse: 'transition-all duration-300 hover:animate-pulse',
  };

  // ✅ Responsive label styles
  const labelSizes = {
    sm: 'text-xs sm:text-sm',
    md: 'text-sm sm:text-base',
    lg: 'text-base sm:text-lg',
    xl: 'text-lg sm:text-xl',
  };

  // Toggle button
  const ToggleButton = () => (
    <button
      onClick={toggleTheme}
      className={clsx(
        'relative rounded-full',
        'focus:outline-none focus:ring-2 focus:ring-[#0D9488]/50 focus:ring-offset-2 dark:focus:ring-offset-gray-900',
        'min-h-[36px] min-w-[36px] sm:min-h-[40px] sm:min-w-[40px]',
        sizes[size] || sizes.md,
        variants[variant] || variants.default,
        animations[animation] || animations.default,
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

        {/* Sparkle indicator for auto mode */}
        {theme === 'auto' && (
          <Sparkles className={clsx(
            'absolute transition-all duration-300',
            iconSizes[size] || iconSizes.md,
            'text-[#F59E0B] opacity-50'
          )} />
        )}
      </div>

      {/* Glow effect on hover */}
      <span className={clsx(
        'absolute inset-0 rounded-full opacity-0 transition-opacity duration-300 pointer-events-none',
        isDark ? 'bg-[#F59E0B]/10' : 'bg-[#0D9488]/10',
        'group-hover:opacity-100'
      )} />
    </button>
  );

  // Dropdown variant
  const DropdownToggle = () => {
    const themeOptions = [
      { value: 'light', label: 'Light', icon: Sun },
      { value: 'dark', label: 'Dark', icon: Moon },
      { value: 'auto', label: 'Auto', icon: Monitor },
    ];

    const currentTheme = themeOptions.find(opt => opt.value === theme) || themeOptions[0];
    const CurrentIcon = currentTheme.icon;

    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={clsx(
            'flex items-center gap-2 rounded-full',
            'focus:outline-none focus:ring-2 focus:ring-[#0D9488]/50 focus:ring-offset-2',
            'min-h-[36px] min-w-[36px] sm:min-h-[40px] sm:min-w-[40px]',
            'px-3 py-1.5 sm:px-4 sm:py-2',
            'bg-white dark:bg-gray-800',
            'border border-gray-200 dark:border-gray-700',
            'hover:border-[#0D9488] dark:hover:border-[#0D9488]',
            'text-gray-700 dark:text-gray-300',
            'transition-all duration-300',
            className
          )}
          aria-label="Select theme"
        >
          <CurrentIcon className={clsx(
            'w-4 h-4 sm:w-5 sm:h-5',
            theme === 'light' ? 'text-[#F59E0B]' : 
            theme === 'dark' ? 'text-[#0D9488]' : 
            'text-gray-400'
          )} />
          <span className="hidden sm:inline text-sm font-medium">
            {currentTheme.label}
          </span>
          <ChevronDown className={clsx(
            'w-3 h-3 sm:w-4 sm:h-4',
            'transition-transform duration-200',
            isOpen && 'rotate-180'
          )} />
        </button>

        {/* Dropdown menu */}
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <div className={clsx(
              'absolute top-full right-0 mt-2 z-50',
              'min-w-[140px] sm:min-w-[160px]',
              'bg-white dark:bg-gray-800',
              'rounded-xl shadow-lg',
              'border border-gray-200 dark:border-gray-700',
              'overflow-hidden',
              'animate-in slide-in-from-top-2 duration-200'
            )}>
              {themeOptions.map((option) => {
                const Icon = option.icon;
                const isActive = theme === option.value;
                
                return (
                  <button
                    key={option.value}
                    onClick={() => {
                      setTheme(option.value);
                      setIsOpen(false);
                    }}
                    className={clsx(
                      'w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2.5',
                      'text-sm sm:text-base',
                      'transition-colors duration-200',
                      isActive 
                        ? 'bg-[#0D9488]/10 text-[#0D9488] dark:bg-[#0D9488]/20' 
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    )}
                  >
                    <Icon className={clsx(
                      'w-4 h-4 sm:w-5 sm:h-5',
                      isActive ? 'text-[#0D9488]' : 'text-gray-400'
                    )} />
                    <span>{option.label}</span>
                    {isActive && (
                      <span className="ml-auto text-[#0D9488]">✓</span>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    );
  };

  // With label
  if (showLabel) {
    return (
      <div className={clsx(
        'flex items-center gap-2 sm:gap-3',
        labelPosition === 'left' ? 'flex-row-reverse' : 'flex-row'
      )}>
        <span className={clsx(
          'font-medium text-gray-700 dark:text-gray-300',
          labelSizes[size] || labelSizes.md
        )}>
          {labelText}
        </span>
        {variant === 'dropdown' ? <DropdownToggle /> : <ToggleButton />}
      </div>
    );
  }

  // Dropdown variant without label
  if (variant === 'dropdown') {
    return <DropdownToggle />;
  }

  // Default toggle button
  return <ToggleButton />;
};

// ===============================
// ✅ SUB-COMPONENTS
// ===============================

// ThemeToggle with label
export const ThemeToggleWithLabel = (props) => {
  return <ThemeToggle {...props} showLabel={true} />;
};

// Compact ThemeToggle
export const CompactThemeToggle = (props) => {
  return <ThemeToggle {...props} size="sm" variant="default" />;
};

// Floating ThemeToggle
export const FloatingThemeToggle = (props) => {
  return <ThemeToggle {...props} variant="floating" size="lg" />;
};

// Glass ThemeToggle
export const GlassThemeToggle = (props) => {
  return <ThemeToggle {...props} variant="glass" />;
};

// ===============================
// ✅ DEFAULT EXPORT
// ===============================
export default ThemeToggle;