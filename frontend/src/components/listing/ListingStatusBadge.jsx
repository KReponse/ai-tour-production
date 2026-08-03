// src/components/listing/ListingStatusBadge.jsx

import React from 'react';
import { Clock, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';

const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    icon: Clock,
    bg: 'bg-[#F59E0B]/10',
    text: 'text-[#F59E0B]',
    border: 'border-[#F59E0B]/20',
    animation: 'animate-pulse',
    description: 'Waiting for review',
  },
  approved: {
    label: 'Approved',
    icon: CheckCircle,
    bg: 'bg-[#0D9488]/10',
    text: 'text-[#0D9488]',
    border: 'border-[#0D9488]/20',
    animation: 'animate-bounce',
    description: 'Active and visible',
  },
  rejected: {
    label: 'Rejected',
    icon: XCircle,
    bg: 'bg-red-100',
    text: 'text-red-600',
    border: 'border-red-500/20',
    animation: '',
    description: 'Not approved',
  },
  needs_information: {
    label: 'Needs Info',
    icon: AlertCircle,
    bg: 'bg-[#F59E0B]/10',
    text: 'text-[#F59E0B]',
    border: 'border-[#F59E0B]/20',
    animation: 'animate-pulse',
    description: 'Additional information required',
  },
  // ✅ NEW: Draft status
  draft: {
    label: 'Draft',
    icon: Loader2,
    bg: 'bg-gray-100',
    text: 'text-gray-600',
    border: 'border-gray-300',
    animation: 'animate-spin',
    description: 'Not yet submitted',
  },
};

const ListingStatusBadge = ({ 
  status, 
  size = 'md', 
  className = '',
  showDescription = false,
  animated = true,
}) => {
  const config = STATUS_CONFIG[status?.toLowerCase()] || STATUS_CONFIG.pending;
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-3 py-1 text-xs gap-1.5',
    lg: 'px-4 py-1.5 text-sm gap-2',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  const animationClass = animated ? config.animation || '' : '';

  return (
    <div className="flex items-center gap-2">
      <span
        className={`
          inline-flex items-center font-semibold rounded-full
          transition-all duration-300 hover:scale-105
          ${sizeClasses[size]}
          ${config.bg} ${config.text} ${config.border}
          ${className}
        `}
      >
        <Icon 
          className={`
            ${iconSizes[size]} 
            ${animationClass}
            ${status === 'pending' ? 'animate-pulse' : ''}
            ${status === 'needs_information' ? 'animate-pulse' : ''}
          `} 
        />
        {config.label}
      </span>
      
      {/* ✅ Optional description tooltip */}
      {showDescription && (
        <span className="text-xs text-gray-400 hidden md:inline">
          {config.description}
        </span>
      )}
    </div>
  );
};

export default ListingStatusBadge;