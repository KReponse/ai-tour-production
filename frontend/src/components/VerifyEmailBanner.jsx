// frontend/src/components/VerifyEmailBanner.jsx
// ✅ NEW - Verification banner for unverified users

import React, { useState } from 'react';
import { Mail, RefreshCw, X, Loader2 } from 'lucide-react';
import { resendVerificationEmail } from '../services/authService';
import toast from 'react-hot-toast';

const VerifyEmailBanner = ({ email, onDismiss }) => {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleResend = async () => {
    if (!email) return;
    
    try {
      setLoading(true);
      const response = await resendVerificationEmail({ email });
      if (response.success) {
        toast.success('Verification email resent successfully!');
        setSent(true);
        setTimeout(() => setSent(false), 5000);
      } else {
        toast.error(response.message || 'Failed to resend verification email.');
      }
    } catch (error) {
      console.error('Resend error:', error);
      toast.error(error.response?.data?.message || 'Failed to resend verification email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative bg-gradient-to-r from-[#0D9488]/10 to-[#F59E0B]/10 border border-[#0D9488]/20 rounded-2xl p-4 md:p-6 mb-6">
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition"
          aria-label="Dismiss"
        >
          <X className="w-5 h-5" />
        </button>
      )}
      
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[#0D9488]/20 flex items-center justify-center flex-shrink-0">
            <Mail className="w-6 h-6 text-[#0D9488]" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[#374151] dark:text-white">
              Verify Your Email
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Please verify your email address to access all features.
              {email && <span className="font-medium text-[#0D9488]"> ({email})</span>}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 ml-auto">
          <button
            onClick={handleResend}
            disabled={loading || sent}
            className="px-4 py-2 rounded-xl bg-[#0D9488] text-white font-semibold hover:bg-[#0D9488]/90 transition disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : sent ? (
              '✓ Sent'
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Resend Email
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailBanner;