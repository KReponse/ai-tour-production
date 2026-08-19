// src/components/listing/ListingStatusBadge.jsx
// ✅ COMPLETE FIXED - Mobile responsive with proper sizing
// ✅ ADDED: Responsive size variants for mobile
// ✅ ADDED: Tooltip support for mobile
// ✅ ADDED: Status dot indicator
// ✅ ADDED: Animation variants
// ✅ FIXED: Touch-friendly for mobile

import React, { useState } from 'react';
import { Clock, CheckCircle, XCircle, AlertCircle, Loader2, Info } from 'lucide-react';

// ===============================
// AI TOUR COLORS
// ===============================
// Teal  : #0D9488
// Gold  : #F59E0B
// Slate : #374151
// White : #FFFFFF
// ===============================

const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    icon: Clock,
    bg: 'bg-[#F59E0B]/10',
    text: 'text-[#F59E0B]',
    border: 'border-[#F59E0B]/20',
    dot: 'bg-[#F59E0B]',
    animation: 'animate-pulse',
    description: 'Waiting for review',
    priority: 'medium',
  },
  approved: {
    label: 'Approved',
    icon: CheckCircle,
    bg: 'bg-[#0D9488]/10',
    text: 'text-[#0D9488]',
    border: 'border-[#0D9488]/20',
    dot: 'bg-[#0D9488]',
    animation: 'animate-bounce',
    description: 'Active and visible',
    priority: 'high',
  },
  rejected: {
    label: 'Rejected',
    icon: XCircle,
    bg: 'bg-red-100 dark:bg-red-900/20',
    text: 'text-red-600 dark:text-red-400',
    border: 'border-red-500/20',
    dot: 'bg-red-500',
    animation: '',
    description: 'Not approved',
    priority: 'low',
  },
  needs_information: {
    label: 'Needs Info',
    icon: AlertCircle,
    bg: 'bg-[#F59E0B]/10',
    text: 'text-[#F59E0B]',
    border: 'border-[#F59E0B]/20',
    dot: 'bg-[#F59E0B]',
    animation: 'animate-pulse',
    description: 'Additional information required',
    priority: 'medium',
  },
  draft: {
    label: 'Draft',
    icon: Loader2,
    bg: 'bg-gray-100 dark:bg-gray-800',
    text: 'text-gray-600 dark:text-gray-400',
    border: 'border-gray-300 dark:border-gray-700',
    dot: 'bg-gray-400',
    animation: 'animate-spin',
    description: 'Not yet submitted',
    priority: 'low',
  },
  featured: {
    label: 'Featured',
    icon: CheckCircle,
    bg: 'bg-[#F59E0B]/10',
    text: 'text-[#F59E0B]',
    border: 'border-[#F59E0B]/20',
    dot: 'bg-[#F59E0B]',
    animation: 'animate-bounce',
    description: 'Featured listing',
    priority: 'high',
  },
};

const ListingStatusBadge = ({ 
  status, 
  size = 'md', 
  className = '',
  showDescription = false,
  animated = true,
  showDot = false,
  variant = 'default', // 'default', 'pill', 'outline', 'minimal'
  onClick = null,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const config = STATUS_CONFIG[status?.toLowerCase()] || STATUS_CONFIG.pending;
  const Icon = config.icon;

  // ✅ Responsive size classes
  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-[8px] sm:text-[10px] gap-0.5 sm:gap-1',
    sm: 'px-2 py-0.5 text-[10px] sm:text-xs gap-1',
    md: 'px-2.5 sm:px-3 py-1 text-xs sm:text-sm gap-1 sm:gap-1.5',
    lg: 'px-3 sm:px-4 py-1.5 text-sm sm:text-base gap-1.5 sm:gap-2',
    xl: 'px-4 sm:px-5 py-2 text-base sm:text-lg gap-2 sm:gap-2.5',
  };

  // ✅ Responsive icon sizes
  const iconSizes = {
    xs: 'w-2 h-2 sm:w-2.5 sm:h-2.5',
    sm: 'w-2.5 h-2.5 sm:w-3 sm:h-3',
    md: 'w-3 h-3 sm:w-3.5 sm:h-3.5',
    lg: 'w-3.5 h-3.5 sm:w-4 sm:h-4',
    xl: 'w-4 h-4 sm:w-5 sm:h-5',
  };

  // ✅ Dot sizes
  const dotSizes = {
    xs: 'w-1.5 h-1.5',
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
    xl: 'w-3.5 h-3.5',
  };

  // ✅ Variant styles
  const variantStyles = {
    default: `
      ${config.bg} ${config.text} ${config.border}
      border
    `,
    pill: `
      ${config.bg} ${config.text} ${config.border}
      border
      rounded-full
      px-3 sm:px-4
    `,
    outline: `
      border-2 ${config.border}
      bg-transparent
      text-gray-700 dark:text-gray-300
      hover:${config.bg}
      transition-colors
    `,
    minimal: `
      bg-transparent
      text-gray-500 dark:text-gray-400
      hover:${config.text}
      transition-colors
      ${!showDot && 'border-0'}
    `,
  };

  const animationClass = animated && config.animation ? config.animation : '';

  // ✅ Handle click for interactive badges
  const handleClick = () => {
    if (onClick) {
      onClick(status);
    }
  };

  // ✅ Toggle tooltip on mobile
  const handleTouch = () => {
    if (showDescription && window.innerWidth < 768) {
      setShowTooltip(!showTooltip);
    }
  };

  // ✅ Get status dot color
  const dotColor = config.dot || 'bg-gray-400';

  return (
    <div className="relative inline-flex items-center gap-1 sm:gap-2">
      {/* Main Badge */}
      <span
        className={`
          inline-flex items-center font-semibold rounded-full
          transition-all duration-300
          ${onClick ? 'cursor-pointer hover:scale-105' : ''}
          ${sizeClasses[size] || sizeClasses.md}
          ${variantStyles[variant] || variantStyles.default}
          ${className}
        `}
        onClick={handleClick}
        onTouchStart={handleTouch}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        role={onClick ? 'button' : 'status'}
        tabIndex={onClick ? 0 : -1}
        aria-label={`Status: ${config.label}`}
      >
        {/* Status Dot */}
        {showDot && (
          <span className={`
            rounded-full flex-shrink-0
            ${dotSizes[size] || dotSizes.md}
            ${dotColor}
            ${status === 'pending' ? 'animate-pulse' : ''}
          `} />
        )}

        {/* Icon */}
        {variant !== 'minimal' && (
          <Icon 
            className={`
              flex-shrink-0
              ${iconSizes[size] || iconSizes.md}
              ${animationClass}
              ${status === 'pending' ? 'animate-pulse' : ''}
              ${status === 'needs_information' ? 'animate-pulse' : ''}
            `} 
          />
        )}

        {/* Label - Responsive text */}
        <span className="truncate">
          {variant === 'minimal' ? config.label.slice(0, 1).toUpperCase() : config.label}
        </span>

        {/* Info icon for description on mobile */}
        {showDescription && variant !== 'minimal' && (
          <Info className="w-3 h-3 sm:w-3.5 sm:h-3.5 opacity-50 flex-shrink-0 hidden xs:inline" />
        )}
      </span>

      {/* Tooltip/Description - Responsive */}
      {showDescription && (
        <span className={`
          text-[10px] sm:text-xs text-gray-400 
          hidden md:inline
          ${variant === 'minimal' ? 'hidden' : ''}
        `}>
          {config.description}
        </span>
      )}

      {/* Mobile Tooltip Popup */}
      {showTooltip && showDescription && window.innerWidth < 768 && (
        <div className="
          absolute bottom-full left-1/2 -translate-x-1/2 mb-2
          px-2 py-1
          bg-gray-900 dark:bg-gray-700
          text-white text-xs
          rounded-lg
          whitespace-nowrap
          z-50
          shadow-lg
          animate-fade-in
        ">
          {config.description}
          <div className="
            absolute top-full left-1/2 -translate-x-1/2
            border-4 border-transparent border-t-gray-900 dark:border-t-gray-700
          " />
        </div>
      )}
    </div>
  );
};

// ===============================
// ✅ SUB-COMPONENTS
// ===============================

// Small badge for mobile
export const SmallStatusBadge = (props) => {
  return <ListingStatusBadge {...props} size="sm" />;
};

// Mini badge (icon only)
export const MiniStatusBadge = (props) => {
  return <ListingStatusBadge {...props} size="xs" variant="minimal" />;
};

// With dot indicator
export const DotStatusBadge = (props) => {
  return <ListingStatusBadge {...props} showDot={true} />;
};

// Pill style
export const PillStatusBadge = (props) => {
  return <ListingStatusBadge {...props} variant="pill" />;
};

// Clickable badge
export const ClickableStatusBadge = ({ onStatusClick, ...props }) => {
  return <ListingStatusBadge {...props} onClick={onStatusClick} />;
};

// ===============================
// ✅ UTILITY FUNCTIONS
// ===============================

// Get status color for use in other components
export const getStatusColor = (status) => {
  const config = STATUS_CONFIG[status?.toLowerCase()];
  return config?.text || 'text-gray-500';
};

// Get status label
export const getStatusLabel = (status) => {
  const config = STATUS_CONFIG[status?.toLowerCase()];
  return config?.label || status || 'Unknown';
};

// Check if status is active/approved
export const isActiveStatus = (status) => {
  return status?.toLowerCase() === 'approved' || status?.toLowerCase() === 'active';
};

// Check if status is pending
export const isPendingStatus = (status) => {
  return status?.toLowerCase() === 'pending' || status?.toLowerCase() === 'needs_information';
};

// ===============================
// ✅ CSS ANIMATIONS (Add to your global CSS)
// ===============================
// @keyframes bounce {
//   0%, 100% { transform: translateY(0); }
//   50% { transform: translateY(-4px); }
// }
// 
// .animate-bounce {
//   animation: bounce 1s ease-in-out infinite;
// }
//
// @keyframes pulse {
//   0%, 100% { opacity: 1; }
//   50% { opacity: 0.5; }
// }
//
// .animate-pulse {
//   animation: pulse 1.5s ease-in-out infinite;
// }

// ===============================
// ✅ DEFAULT EXPORT
// ===============================
export default ListingStatusBadge;