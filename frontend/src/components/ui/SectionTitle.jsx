// src/components/ui/SectionTitle.jsx

import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import clsx from 'clsx';

const SectionTitle = ({ 
  title, 
  subtitle, 
  icon: Icon, 
  iconColor = 'text-[#0D9488]',
  viewAllLink, 
  viewAllText = 'View All',
  className,
}) => {
  return (
    <div className={clsx('flex items-center justify-between mb-6', className)}>
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="w-10 h-10 rounded-2xl bg-[#0D9488]/10 flex items-center justify-center">
            <Icon className={clsx('w-5 h-5', iconColor)} />
          </div>
        )}
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-[#374151] dark:text-white">
            {title}
          </h2>
          {subtitle && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {viewAllLink && (
        <Link 
          to={viewAllLink} 
          className="text-sm text-[#0D9488] font-semibold flex items-center gap-1 hover:underline group flex-shrink-0"
        >
          {viewAllText}
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      )}
    </div>
  );
};

export default SectionTitle;