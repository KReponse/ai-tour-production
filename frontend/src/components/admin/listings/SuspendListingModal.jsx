// src/components/admin/listings/SuspendListingModal.jsx

import React, { useState } from 'react';
import { X, Ban, Loader2 } from 'lucide-react';

const SuspendListingModal = ({ isOpen, onClose, listing, onConfirm, loading }) => {
  const [reason, setReason] = useState('');

  if (!isOpen || !listing) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      alert('Please provide a reason for suspension');
      return;
    }
    onConfirm(listing._id, reason);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#F59E0B]/10 flex items-center justify-center">
                <Ban className="w-5 h-5 text-[#F59E0B]" />
              </div>
              <h2 className="text-xl font-bold text-[#374151] dark:text-white">Suspend Listing</h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Suspend <strong className="text-[#374151] dark:text-white">{listing.title}</strong> from {listing.provider?.name || 'Unknown Provider'}?
          </p>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Reason for Suspension *
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                placeholder="Please explain why this listing is being suspended..."
                className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent outline-none transition resize-none dark:text-white"
                required
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 text-[#374151] dark:text-white font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 rounded-xl bg-[#F59E0B] text-white font-medium hover:bg-[#F59E0B]/80 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Ban className="w-5 h-5" />}
                Suspend Listing
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default SuspendListingModal;