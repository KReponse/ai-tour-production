// src/components/ui/Button.jsx
// ============================================================
// AI TOUR — BUTTON COMPONENT
// ============================================================
// ✅ Single default export
// ✅ Supports: variant, size, disabled, loading, fullWidth,
//    type, onClick, className, children, ...rest props
// ✅ Brand colors: Teal #0D9488, Gold #F59E0B, Slate #374151
// ✅ Responsive, accessible, dark mode
// ============================================================

import React from 'react';
import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

const Button = React.forwardRef(function Button(
  {
    children,
    className,
    variant = 'primary',
    size = 'md',
    type = 'button',
    disabled = false,
    loading = false,
    fullWidth = false,
    onClick,
    ...rest
  },
  ref
) {
  const isDisabled = disabled || loading;

  // ----- Variants -----
  const variants = {
    primary:
      'bg-gradient-to-r from-[#0D9488] to-[#0D9488] text-white shadow-lg shadow-[#0D9488]/30 hover:from-[#0b7f74] hover:to-[#0b7f74] focus-visible:ring-[#0D9488]',
    secondary:
      'bg-[#F59E0B] text-white shadow-lg shadow-[#F59E0B]/30 hover:bg-[#d97706] focus-visible:ring-[#F59E0B]',
    outline:
      'bg-transparent border-2 border-[#0D9488] text-[#0D9488] hover:bg-[#0D9488]/10 focus-visible:ring-[#0D9488]',
    ghost:
      'bg-transparent text-[#374151] hover:bg-gray-100 dark:text-white dark:hover:bg-gray-800 focus-visible:ring-[#0D9488]',
    danger:
      'bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/30 focus-visible:ring-red-500',
  };

  // ----- Sizes -----
  const sizes = {
    sm: 'h-9 px-3 text-xs sm:text-sm rounded-lg',
    md: 'h-11 px-5 text-sm sm:text-base rounded-xl',
    lg: 'h-13 px-7 text-base sm:text-lg rounded-2xl',
  };

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      onClick={onClick}
      className={clsx(
        // Base
        'inline-flex items-center justify-center gap-2',
        'font-bold',
        'transition-all duration-200',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100',
        // Prevent hover scale when disabled
        !isDisabled && 'hover:scale-[1.02] active:scale-[0.98]',
        // Variant + size
        variants[variant] || variants.primary,
        sizes[size] || sizes.md,
        // Optional full width
        fullWidth && 'w-full',
        // Caller overrides
        className
      )}
      {...rest}
    >
      {loading && (
        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
      )}
      {children}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;