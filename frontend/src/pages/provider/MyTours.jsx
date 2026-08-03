// src/pages/provider/MyTours.jsx

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * ⚠️ LEGACY COMPATIBILITY WRAPPER
 * 
 * This page redirects to the new MyListings page.
 * Kept for backward compatibility with existing links and bookmarks.
 * 
 * @deprecated Use /provider/listings instead
 */
const MyTours = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to the new listings page
    // The MyListings component will handle filtering by businessType if needed
    navigate('/provider/listings', { replace: true });
  }, [navigate]);

  // Show loading state while redirecting
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-4 border-[#0D9488]/20" />
        <div className="absolute inset-0 rounded-full border-4 border-[#0D9488] border-t-transparent animate-spin" />
      </div>
      <p className="mt-4 text-gray-500 dark:text-gray-400 text-sm">
        Redirecting to My Listings...
      </p>
    </div>
  );
};

export default MyTours;