// src/components/provider/DeleteTourModal.jsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  AlertTriangle,
  Loader2,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import { deleteTour } from '../../services/tourService';
import { deleteListing } from '../../services/listingService'; // ✅ Added for Listing support
import { useAuth } from '../../contexts/AuthContext';

// ===============================
// AI TOUR COLORS
// ===============================
// Teal  : #0D9488
// Gold  : #F59E0B
// Slate : #374151
// White : #FFFFFF
// ===============================

const DeleteTourModal = ({ 
  tour, 
  listing, // ✅ Added for Listing support
  isOpen, 
  onClose, 
  onSuccess,
  entityType = 'tour', // ✅ 'tour' or 'listing'
}) => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  // Determine which entity to delete
  const entity = listing || tour;
  const isListing = entityType === 'listing' || !!listing;
  
  // Get entity data
  const entityId = entity?._id;
  const entityTitle = entity?.title || 'Untitled';
  const entityLocation = entity?.location || '';
  const entityPrice = entity?.price || 0;
  const displayType = isListing ? 'Listing' : 'Tour';

  if (!entity) return null;

  const handleDelete = async () => {
    try {
      setLoading(true);
      setError(null);

      if (isListing) {
        // ✅ Delete using Listing service
        await deleteListing(entityId, token);
      } else {
        // ⚠️ Legacy: Delete using Tour service (backward compatibility)
        await deleteTour(entityId, token);
      }
      
      // Close modal
      onClose();
      
      // Call success callback (refresh listings/tours)
      if (onSuccess) {
        onSuccess();
      }
      
      // Show success message
      alert(`✅ "${entityTitle}" deleted successfully`);

    } catch (error) {
      console.error('❌ Delete error:', error);
      setError(error.response?.data?.message || `Failed to delete ${displayType.toLowerCase()}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      
      <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 dark:border-gray-800 animate-slide-up">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <h2 className="text-2xl font-black text-[#374151] dark:text-white">
              Delete {displayType}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-300">
            Are you sure you want to delete this {displayType.toLowerCase()}:
          </p>
          
          <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#0D9488] to-[#F59E0B] flex items-center justify-center text-white font-bold text-lg">
                {entityTitle?.charAt(0) || 'L'}
              </div>
              <div>
                <h3 className="font-bold text-[#374151] dark:text-white">
                  {entityTitle}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {entityLocation} • ${entityPrice}
                </p>
              </div>
            </div>
          </div>

          {/* Warning */}
          <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-600 dark:text-red-400">
                This action cannot be undone!
              </p>
              <p className="text-sm text-red-500 dark:text-red-300">
                All bookings and data associated with this {displayType.toLowerCase()} will be permanently removed.
              </p>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 h-12 rounded-2xl border-2 border-gray-200 dark:border-gray-700 text-[#374151] dark:text-white font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              Cancel
            </button>

            <button
              onClick={handleDelete}
              disabled={loading}
              className="flex-1 h-12 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-semibold shadow-lg shadow-red-600/30 hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-5 h-5" />
                  Delete Permanently
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteTourModal;