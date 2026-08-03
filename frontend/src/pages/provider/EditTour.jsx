// src/pages/provider/EditTour.jsx

import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

/**
 * ⚠️ LEGACY COMPATIBILITY WRAPPER
 * 
 * This page redirects to the new EditListing page.
 * Kept for backward compatibility with existing links and bookmarks.
 * 
 * @deprecated Use /provider/listings/edit/:id instead
 */
const EditTour = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  useEffect(() => {
    if (id) {
      // Redirect to the new listing edit page
      navigate(`/provider/listings/edit/${id}`, { replace: true });
    } else {
      // If no ID, go to listings
      navigate('/provider/listings', { replace: true });
    }
  }, [navigate, id]);

  // Show loading state while redirecting
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-4 border-[#0D9488]/20" />
        <div className="absolute inset-0 rounded-full border-4 border-[#0D9488] border-t-transparent animate-spin" />
      </div>
      <p className="mt-4 text-gray-500 dark:text-gray-400 text-sm">
        Redirecting to Edit Listing...
      </p>
    </div>
  );
};

export default EditTour;