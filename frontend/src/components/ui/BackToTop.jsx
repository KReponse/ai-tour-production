// frontend/src/components/ui/BackToTop.jsx
// ✅ COMPLETE FIXED - Responsive with proper sizing and positioning
// ✅ ADDED: Responsive button sizes for mobile
// ✅ ADDED: Progress indicator
// ✅ ADDED: Customizable position and behavior
// ✅ ADDED: Smooth scroll with easing
// ✅ FIXED: Touch targets for mobile

import React, { useState, useEffect, useCallback } from 'react';
import { ArrowUp, ChevronUp } from 'lucide-react';
import { PAGINATION } from '../../utils/constants';
import clsx from 'clsx';

// ===============================
// AI TOUR COLORS
// ===============================
// Teal  : #0D9488
// Gold  : #F59E0B
// Slate : #374151
// White : #FFFFFF
// ===============================

const BackToTop = ({
  threshold = PAGINATION.BACK_TO_TOP_THRESHOLD || 300,
  className = '',
  position = 'bottom-right', // 'bottom-right', 'bottom-left', 'bottom-center'
  size = 'md',
  variant = 'primary',
  showProgress = false,
  smoothScroll = true,
  duration = 500,
  label = 'Back to top',
  showLabel = false,
  icon: Icon = ArrowUp,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);

  // ✅ Responsive sizes
  const sizes = {
    sm: 'p-2 w-8 h-8 sm:w-9 sm:h-9',
    md: 'p-2.5 w-10 h-10 sm:w-12 sm:h-12',
    lg: 'p-3 w-12 h-12 sm:w-14 sm:h-14',
    xl: 'p-3.5 w-14 h-14 sm:w-16 sm:h-16',
  };

  // ✅ Responsive icon sizes
  const iconSizes = {
    sm: 'w-3.5 h-3.5 sm:w-4 sm:h-4',
    md: 'w-4 h-4 sm:w-5 sm:h-5',
    lg: 'w-5 h-5 sm:w-6 sm:h-6',
    xl: 'w-6 h-6 sm:w-7 sm:h-7',
  };

  // ✅ Variant styles
  const variants = {
    primary: `
      bg-[#0D9488] text-white 
      hover:bg-[#0D9488]/80 
      shadow-lg hover:shadow-xl
    `,
    gold: `
      bg-[#F59E0B] text-white 
      hover:bg-[#F59E0B]/80 
      shadow-lg hover:shadow-xl
    `,
    dark: `
      bg-[#374151] text-white 
      hover:bg-[#374151]/80 
      shadow-lg hover:shadow-xl
    `,
    gradient: `
      bg-gradient-to-r from-[#0D9488] to-[#F59E0B] text-white 
      hover:shadow-xl 
      shadow-lg
    `,
    glass: `
      bg-white/80 dark:bg-gray-800/80 
      backdrop-blur-md 
      text-[#0D9488] dark:text-white 
      border border-white/20 dark:border-gray-700/50
      hover:bg-white dark:hover:bg-gray-800
      shadow-lg hover:shadow-xl
    `,
    outline: `
      bg-white dark:bg-gray-800 
      border-2 border-[#0D9488] 
      text-[#0D9488] dark:text-[#0D9488]
      hover:bg-[#0D9488] hover:text-white
      shadow-lg hover:shadow-xl
      transition-all duration-300
    `,
  };

  // ✅ Position styles
  const positions = {
    'bottom-right': 'bottom-4 sm:bottom-6 right-4 sm:right-6',
    'bottom-left': 'bottom-4 sm:bottom-6 left-4 sm:left-6',
    'bottom-center': 'bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2',
  };

  // ✅ Progress indicator color
  const progressColors = {
    primary: 'stroke-[#0D9488]',
    gold: 'stroke-[#F59E0B]',
    dark: 'stroke-[#374151]',
    gradient: 'stroke-[#0D9488]',
    glass: 'stroke-[#0D9488]',
    outline: 'stroke-[#0D9488]',
  };

  // Calculate scroll progress
  const calculateProgress = useCallback(() => {
    const scrollY = window.scrollY || document.documentElement.scrollTop;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const progress = maxScroll > 0 ? (scrollY / maxScroll) * 100 : 0;
    return Math.min(progress, 100);
  }, []);

  // Handle scroll
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      setIsVisible(scrollY > threshold);
      
      if (showProgress) {
        setScrollProgress(calculateProgress());
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold, showProgress, calculateProgress]);

  // ✅ Smooth scroll with easing
  const scrollToTop = useCallback(() => {
    if (isScrolling) return;
    
    setIsScrolling(true);
    
    const startY = window.scrollY || document.documentElement.scrollTop;
    const startTime = performance.now();

    const easeInOutCubic = (t) => {
      return t < 0.5 
        ? 4 * t * t * t 
        : 1 - Math.pow(-2 * t + 2, 3) / 2;
    };

    const scroll = () => {
      const now = performance.now();
      const elapsed = Math.min((now - startTime) / duration, 1);
      const progress = easeInOutCubic(elapsed);
      
      const currentY = startY * (1 - progress);
      
      window.scrollTo({
        top: currentY,
        behavior: 'auto',
      });

      if (elapsed < 1) {
        requestAnimationFrame(scroll);
      } else {
        window.scrollTo({ top: 0, behavior: 'auto' });
        setIsScrolling(false);
      }
    };

    // Use requestAnimationFrame for smooth animation
    if (smoothScroll) {
      requestAnimationFrame(scroll);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => setIsScrolling(false), 500);
    }
  }, [smoothScroll, duration, isScrolling]);

  if (!isVisible) return null;

  // ✅ Progress circle SVG
  const ProgressCircle = () => {
    const circumference = 2 * Math.PI * 20;
    const offset = circumference - (scrollProgress / 100) * circumference;

    return (
      <svg className="absolute inset-0 w-full h-full -rotate-90">
        <circle
          className="text-gray-200 dark:text-gray-700"
          strokeWidth="2"
          stroke="currentColor"
          fill="none"
          r="20"
          cx="50%"
          cy="50%"
        />
        <circle
          className={clsx(
            'transition-all duration-300',
            progressColors[variant] || progressColors.primary
          )}
          strokeWidth="2"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="none"
          r="20"
          cx="50%"
          cy="50%"
        />
      </svg>
    );
  };

  return (
    <div className={clsx(
      'fixed z-50',
      positions[position] || positions['bottom-right'],
      className
    )}>
      <button
        onClick={scrollToTop}
        disabled={isScrolling}
        className={clsx(
          // Base styles
          'relative',
          'rounded-full',
          'flex items-center justify-center',
          'transition-all duration-300',
          'focus:outline-none focus:ring-2 focus:ring-[#0D9488]/50 focus:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          // Touch target
          'min-h-[44px] min-w-[44px] sm:min-h-[48px] sm:min-w-[48px]',
          // Size
          sizes[size] || sizes.md,
          // Variant
          variants[variant] || variants.primary,
          // Hover effects
          'hover:scale-110',
          // Animation
          'animate-in fade-in slide-in-from-bottom-4 duration-300'
        )}
        aria-label={label}
        title={label}
      >
        {/* Progress indicator */}
        {showProgress && <ProgressCircle />}
        
        {/* Icon */}
        <Icon className={clsx(
          'relative z-10',
          iconSizes[size] || iconSizes.md,
          showProgress && 'scale-90'
        )} />
        
        {/* Label (on hover or always) */}
        {showLabel && (
          <span className={clsx(
            'absolute left-full ml-2 px-2 py-1',
            'text-xs font-medium',
            'bg-gray-900/90 dark:bg-gray-700/90',
            'text-white',
            'rounded-lg',
            'whitespace-nowrap',
            'opacity-0 group-hover:opacity-100',
            'transition-opacity duration-200',
            'pointer-events-none'
          )}>
            {label}
          </span>
        )}
      </button>

      {/* Percentage label for progress */}
      {showProgress && (
        <div className={clsx(
          'absolute -bottom-6 left-1/2 -translate-x-1/2',
          'text-xs font-medium',
          'text-gray-500 dark:text-gray-400',
          'opacity-0 group-hover:opacity-100',
          'transition-opacity duration-200'
        )}>
          {Math.round(scrollProgress)}%
        </div>
      )}
    </div>
  );
};

// ===============================
// ✅ SUB-COMPONENTS
// ===============================

// Floating BackToTop with glass effect
export const FloatingBackToTop = (props) => {
  return <BackToTop {...props} variant="glass" size="lg" />;
};

// Compact BackToTop
export const CompactBackToTop = (props) => {
  return <BackToTop {...props} size="sm" variant="primary" />;
};

// Gold BackToTop
export const GoldBackToTop = (props) => {
  return <BackToTop {...props} variant="gold" />;
};

// BackToTop with progress
export const ProgressBackToTop = (props) => {
  return <BackToTop {...props} showProgress={true} />;
};

// ===============================
// ✅ DEFAULT EXPORT
// ===============================
export default BackToTop;