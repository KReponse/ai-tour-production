// frontend/src/components/ui/BackToTop.jsx
// ✅ Back to top button

import React, { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';
import { PAGINATION } from '../../utils/constants';

const BackToTop = ({
  threshold = PAGINATION.BACK_TO_TOP_THRESHOLD,
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      setIsVisible(scrollY > threshold);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold]);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  if (!isVisible) return null;

  return (
    <button
      onClick={scrollToTop}
      className={`fixed bottom-6 right-6 z-50 p-3 rounded-full bg-[#0D9488] text-white shadow-lg hover:bg-[#0D9488]/80 transition-all duration-300 hover:scale-110 hover:shadow-xl ${className}`}
      aria-label="Back to top"
    >
      <ArrowUp className="w-5 h-5" />
    </button>
  );
};

export default BackToTop;