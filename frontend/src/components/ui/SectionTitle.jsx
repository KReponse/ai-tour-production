// src/components/ui/SectionTitle.jsx
// ✅ COMPLETE FIXED - Mobile responsive with proper sizing
// ✅ ADDED: Responsive typography and spacing
// ✅ ADDED: Optional description/CTA
// ✅ ADDED: Center alignment option
// ✅ FIXED: Touch targets for mobile

import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import clsx from 'clsx';

// ===============================
// AI TOUR COLORS
// ===============================
// Teal  : #0D9488
// Gold  : #F59E0B
// Slate : #374151
// White : #FFFFFF
// ===============================

const SectionTitle = ({ 
  title, 
  subtitle, 
  description,
  icon: Icon, 
  iconColor = 'text-[#0D9488]',
  viewAllLink, 
  viewAllText = 'View All',
  className,
  titleClassName,
  subtitleClassName,
  descriptionClassName,
  align = 'left',
  size = 'default',
  withBorder = false,
  borderColor = 'border-[#0D9488]/20',
}) => {
  // ✅ Responsive sizes
  const sizes = {
    small: {
      title: 'text-lg sm:text-xl md:text-2xl',
      subtitle: 'text-xs sm:text-sm',
      description: 'text-xs sm:text-sm',
      icon: 'w-8 h-8 sm:w-10 sm:h-10',
      iconInner: 'w-4 h-4 sm:w-5 sm:h-5',
      spacing: 'mb-4 sm:mb-5',
      gap: 'gap-2 sm:gap-3',
    },
    default: {
      title: 'text-xl sm:text-2xl md:text-3xl',
      subtitle: 'text-sm sm:text-base',
      description: 'text-sm sm:text-base',
      icon: 'w-10 h-10 sm:w-12 sm:h-12',
      iconInner: 'w-5 h-5 sm:w-6 sm:h-6',
      spacing: 'mb-5 sm:mb-6 md:mb-8',
      gap: 'gap-2.5 sm:gap-3',
    },
    large: {
      title: 'text-2xl sm:text-3xl md:text-4xl',
      subtitle: 'text-base sm:text-lg',
      description: 'text-base sm:text-lg',
      icon: 'w-12 h-12 sm:w-14 sm:h-14',
      iconInner: 'w-6 h-6 sm:w-7 sm:h-7',
      spacing: 'mb-6 sm:mb-8 md:mb-10',
      gap: 'gap-3 sm:gap-4',
    },
  };

  const sizeStyles = sizes[size] || sizes.default;

  // ✅ Alignment
  const alignStyles = {
    left: 'items-start text-left',
    center: 'items-center text-center',
    right: 'items-end text-right',
  };

  // ✅ Responsive view all button
  const ViewAllButton = () => {
    if (!viewAllLink) return null;
    
    return (
      <Link 
        to={viewAllLink} 
        className={clsx(
          // Responsive text and spacing
          'text-xs sm:text-sm',
          'font-semibold',
          'text-[#0D9488]',
          'flex items-center gap-0.5 sm:gap-1',
          'hover:underline',
          'group',
          'flex-shrink-0',
          // Better touch target on mobile
          'min-h-[32px] sm:min-h-[36px]',
          'px-1.5 sm:px-2',
          'rounded-lg',
          'hover:bg-[#0D9488]/5',
          'transition-colors'
        )}
      >
        {viewAllText}
        <ArrowRight className={clsx(
          'w-3 h-3 sm:w-4 sm:h-4',
          'group-hover:translate-x-1 transition-transform'
        )} />
      </Link>
    );
  };

  // ✅ Border
  const borderStyles = withBorder ? {
    left: 'border-l-4 pl-3 sm:pl-4',
    bottom: 'border-b pb-3 sm:pb-4',
  } : {};

  return (
    <div className={clsx(
      'w-full',
      sizeStyles.spacing,
      className
    )}>
      {/* Main row with title and view all */}
      <div className={clsx(
        'flex items-center justify-between',
        'gap-2 sm:gap-3 md:gap-4',
        align === 'center' && 'flex-col sm:flex-row',
        align === 'center' && 'justify-center',
        align === 'right' && 'flex-row-reverse'
      )}>
        {/* Left side - Icon + Title + Subtitle */}
        <div className={clsx(
          'flex items-center',
          sizeStyles.gap,
          align === 'center' && 'flex-col sm:flex-row',
          align === 'center' && 'text-center sm:text-left',
          align === 'right' && 'flex-row-reverse',
          align === 'right' && 'text-right',
          'flex-1 min-w-0'
        )}>
          {/* Icon */}
          {Icon && (
            <div className={clsx(
              'rounded-2xl',
              'bg-[#0D9488]/10',
              'flex items-center justify-center',
              'flex-shrink-0',
              sizeStyles.icon
            )}>
              <Icon className={clsx(
                sizeStyles.iconInner,
                iconColor
              )} />
            </div>
          )}

          {/* Title & Subtitle */}
          <div className={clsx(
            'flex-1 min-w-0',
            align === 'center' && 'flex flex-col items-center sm:items-start',
            align === 'right' && 'flex flex-col items-end'
          )}>
            <h2 className={clsx(
              'font-bold',
              'text-[#374151] dark:text-white',
              'break-words',
              sizeStyles.title,
              titleClassName
            )}>
              {title}
            </h2>
            
            {subtitle && (
              <p className={clsx(
                'text-gray-500 dark:text-gray-400',
                'mt-0.5 sm:mt-1',
                sizeStyles.subtitle,
                subtitleClassName
              )}>
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* View All Button - hidden on mobile if align is center and space is tight */}
        {viewAllLink && (
          <div className={clsx(
            'flex-shrink-0',
            align === 'center' && 'mt-2 sm:mt-0'
          )}>
            <ViewAllButton />
          </div>
        )}
      </div>

      {/* Description - Full width below */}
      {description && (
        <div className={clsx(
          'mt-2 sm:mt-3',
          align === 'left' && 'text-left',
          align === 'center' && 'text-center',
          align === 'right' && 'text-right',
          descriptionClassName
        )}>
          <p className={clsx(
            'text-gray-600 dark:text-gray-300',
            sizeStyles.description,
            'max-w-3xl',
            align === 'center' && 'mx-auto',
            align === 'right' && 'ml-auto'
          )}>
            {description}
          </p>
        </div>
      )}

      {/* Border */}
      {withBorder && (
        <div className={clsx(
          'mt-3 sm:mt-4',
          borderColor,
          borderStyles.bottom
        )} />
      )}
    </div>
  );
};

// ===============================
// ✅ SUB-COMPONENTS
// ===============================

// SectionTitle with decorative line
export const SectionTitleWithLine = ({ 
  children,
  className,
  lineColor = 'bg-[#0D9488]',
  ...props 
}) => {
  return (
    <div className={clsx('relative', className)}>
      <SectionTitle {...props}>
        {children}
      </SectionTitle>
      <div className={clsx(
        'w-12 h-1 sm:w-16 sm:h-1.5',
        'rounded-full',
        'mt-2 sm:mt-3',
        lineColor
      )} />
    </div>
  );
};

// Centered SectionTitle
export const CenteredSectionTitle = (props) => {
  return <SectionTitle {...props} align="center" />;
};

// Small SectionTitle
export const SmallSectionTitle = (props) => {
  return <SectionTitle {...props} size="small" />;
};

// Large SectionTitle
export const LargeSectionTitle = (props) => {
  return <SectionTitle {...props} size="large" />;
};

// ===============================
// ✅ DEFAULT EXPORT
// ===============================
export default SectionTitle;