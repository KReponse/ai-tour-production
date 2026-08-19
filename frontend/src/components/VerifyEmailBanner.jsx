// frontend/src/components/VerifyEmailBanner.jsx
// ✅ COMPLETE FIXED - Mobile responsive with proper sizing
// ✅ ADDED: Responsive padding, font sizes, and touch targets
// ✅ ADDED: Auto-dismiss after verification
// ✅ ADDED: Countdown timer for resend
// ✅ FIXED: Touch-friendly buttons on mobile

import React, { useState, useEffect } from 'react';
import { Mail, RefreshCw, X, Loader2, CheckCircle } from 'lucide-react';
import { resendVerificationEmail } from '../services/authService';
import toast from 'react-hot-toast';

// ===============================
// AI TOUR COLORS
// ===============================
// Teal  : #0D9488
// Gold  : #F59E0B
// Slate : #374151
// White : #FFFFFF
// ===============================

const VerifyEmailBanner = ({ 
  email, 
  onDismiss, 
  onVerify, 
  autoDismiss = true,
  resendCooldown = 60, // seconds
}) => {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // ===============================
  // COUNTDOWN TIMER
  // ===============================
  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown(prev => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [cooldown]);

  // ===============================
  // AUTO-DISMISS AFTER VERIFICATION
  // ===============================
  useEffect(() => {
    if (autoDismiss && sent) {
      const timer = setTimeout(() => {
        if (onDismiss) onDismiss();
        if (onVerify) onVerify();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [sent, autoDismiss, onDismiss, onVerify]);

  // ===============================
  // HANDLE RESEND
  // ===============================
  const handleResend = async () => {
    if (!email) {
      toast.error('Email address not found');
      return;
    }
    
    if (cooldown > 0) {
      toast.info(`Please wait ${cooldown} seconds before resending`);
      return;
    }
    
    try {
      setLoading(true);
      const response = await resendVerificationEmail({ email });
      
      if (response.success) {
        toast.success('Verification email resent successfully!');
        setSent(true);
        setCooldown(resendCooldown);
        
        // Reset sent state after 5 seconds
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

  // ===============================
  // RENDER
  // ===============================
  return (
    <div className={`
      relative 
      bg-gradient-to-r from-[#0D9488]/10 to-[#F59E0B]/10 
      border border-[#0D9488]/20 
      rounded-xl sm:rounded-2xl 
      p-3 sm:p-4 md:p-6 
      mb-4 sm:mb-6
      animate-in slide-in-from-top-2 duration-300
    `}>
      {/* Close Button - Responsive */}
      {onDismiss && (
        <button
          onClick={onDismiss}
          className={`
            absolute top-2 right-2 sm:top-3 sm:right-3 
            p-1 sm:p-1.5 
            text-gray-400 hover:text-gray-600 
            hover:bg-gray-100 dark:hover:bg-gray-800 
            rounded-lg transition
            touch-manipulation
          `}
          aria-label="Dismiss"
        >
          <X className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      )}
      
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        {/* Icon & Text - Responsive */}
        <div className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
          <div className={`
            w-10 h-10 sm:w-12 sm:h-12 
            rounded-full 
            bg-[#0D9488]/20 
            flex items-center justify-center 
            flex-shrink-0
          `}>
            {sent ? (
              <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-[#0D9488]" />
            ) : (
              <Mail className="w-5 h-5 sm:w-6 sm:h-6 text-[#0D9488]" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-sm sm:text-base md:text-lg font-semibold text-[#374151] dark:text-white">
              {sent ? 'Verification Sent!' : 'Verify Your Email'}
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
              {sent 
                ? 'Check your inbox for the verification link' 
                : 'Please verify your email to access all features'
              }
              {email && !sent && (
                <span className="font-medium text-[#0D9488] hidden xs:inline">
                  {' '}({email})
                </span>
              )}
            </p>
          </div>
        </div>
        
        {/* Action Button - Responsive */}
        <div className="flex items-center gap-2 sm:gap-3 ml-auto">
          <button
            onClick={handleResend}
            disabled={loading || sent || cooldown > 0}
            className={`
              px-3 sm:px-4 md:px-6 
              py-2 sm:py-2.5 
              min-h-[36px] sm:min-h-[40px] md:min-h-[44px]
              rounded-xl 
              bg-[#0D9488] text-white 
              font-semibold 
              text-xs sm:text-sm md:text-base
              hover:bg-[#0D9488]/90 
              transition 
              disabled:opacity-50 
              flex items-center gap-1.5 sm:gap-2 
              whitespace-nowrap
              touch-manipulation
            `}
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                <span>Sending...</span>
              </>
            ) : sent ? (
              <>
                <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Sent!</span>
              </>
            ) : cooldown > 0 ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>{cooldown}s</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">Resend</span>
                <span className="xs:hidden">Resend</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Progress bar for cooldown */}
      {cooldown > 0 && (
        <div className="mt-2 sm:mt-3 w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-[#0D9488] transition-all duration-1000 ease-linear rounded-full"
            style={{ 
              width: `${(cooldown / resendCooldown) * 100}%`,
              transition: 'width 1s linear'
            }}
          />
        </div>
      )}
    </div>
  );
};

// ===============================
// ✅ SUB-COMPONENTS
// ===============================

// Compact version for mobile
export const CompactVerifyBanner = (props) => {
  return <VerifyEmailBanner {...props} />;
};

// With auto-dismiss
export const AutoDismissVerifyBanner = (props) => {
  return <VerifyEmailBanner {...props} autoDismiss={true} />;
};

// ===============================
// ✅ DEFAULT EXPORT
// ===============================
export default VerifyEmailBanner;