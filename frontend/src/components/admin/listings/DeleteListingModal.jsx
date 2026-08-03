// src/components/admin/listings/DeleteListingModal.jsx

import React from 'react';
import { X, Trash2, AlertCircle, Loader2 } from 'lucide-react';

const DeleteListingModal = ({ isOpen, onClose, listing, onConfirm, loading }) => {
  if (!isOpen || !listing) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-[#374151] dark:text-white">Delete Listing</h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 mb-4">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-700 dark:text-red-400">This action cannot be undone!</p>
              <p className="text-sm text-red-600 dark:text-red-300 mt-1">
                This will permanently delete <strong>{listing.title}</strong> and all associated data.
              </p>
            </div>
          </div>

          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Are you sure you want to delete <strong className="text-[#374151] dark:text-white">{listing.title}</strong> from <strong>{listing.provider?.name || 'Unknown Provider'}</strong>?
          </p>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 text-[#374151] dark:text-white font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm(listing._id)}
              disabled={loading}
              className="flex-1 py-3 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
              Delete Permanently
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default DeleteListingModal;