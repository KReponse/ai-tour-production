// frontend/src/pages/VerifyEmail.jsx
// ✅ PRODUCTION-READY - Email Verification Page

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, Mail, RefreshCw } from 'lucide-react';
import { verifyEmail, resendVerificationEmail } from '../services/authService';
import toast from 'react-hot-toast';

const VerifyEmail = () => {
  const { token } = useParams();
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [resending, setResending] = useState(false);

  useEffect(() => {
    const verify = async () => {
      try {
        const response = await verifyEmail(token);
        if (response.success) {
          setStatus('success');
          setMessage(response.message || 'Email verified successfully! You can now log in.');
        } else {
          setStatus('error');
          setMessage(response.message || 'Invalid or expired verification link.');
          setEmail(localStorage.getItem('pendingVerificationEmail') || '');
        }
      } catch (error) {
        console.error('Verification error:', error);
        setStatus('error');
        setMessage(error.response?.data?.message || 'Failed to verify email. Please try again.');
        setEmail(error.response?.data?.email || localStorage.getItem('pendingVerificationEmail') || '');
      }
    };

    if (token) {
      verify();
    } else {
      setStatus('error');
      setMessage('No verification token provided.');
    }
  }, [token]);

  const handleResend = async () => {
    if (!email) {
      toast.error('Email address not found. Please contact support.');
      return;
    }

    try {
      setResending(true);
      const response = await resendVerificationEmail({ email });
      if (response.success) {
        toast.success('Verification email resent successfully!');
        setMessage('A new verification link has been sent to your email. Please check your inbox.');
      } else {
        toast.error(response.message || 'Failed to resend verification email.');
      }
    } catch (error) {
      console.error('Resend error:', error);
      toast.error(error.response?.data?.message || 'Failed to resend verification email.');
    } finally {
      setResending(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-[#0D9488] mb-4" />
        <h2 className="text-xl font-semibold text-[#374151] dark:text-white">Verifying your email...</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-2">Please wait while we confirm your email address.</p>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center max-w-md mx-auto text-center px-4">
        <div className="w-20 h-20 rounded-full bg-[#0D9488]/10 flex items-center justify-center mb-6">
          <CheckCircle className="w-10 h-10 text-[#0D9488]" />
        </div>
        <h2 className="text-2xl font-bold text-[#374151] dark:text-white">Email Verified! ✅</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-2">{message}</p>
        <div className="mt-6 flex flex-col sm:flex-row gap-4">
          <Link
            to="/login"
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[#0D9488] to-[#F59E0B] text-white font-semibold hover:scale-[1.02] transition"
          >
            Log In Now
          </Link>
          <Link
            to="/"
            className="px-6 py-3 rounded-2xl border-2 border-gray-200 dark:border-gray-700 text-[#374151] dark:text-white font-semibold hover:border-[#0D9488] hover:text-[#0D9488] transition"
          >
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center max-w-md mx-auto text-center px-4">
      <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
        <XCircle className="w-10 h-10 text-red-500" />
      </div>
      <h2 className="text-2xl font-bold text-[#374151] dark:text-white">Verification Failed</h2>
      <p className="text-gray-500 dark:text-gray-400 mt-2">{message}</p>
      
      {email && (
        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl w-full">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            We'll send a new verification link to:
          </p>
          <p className="text-sm font-medium text-[#0D9488] mt-1">{email}</p>
        </div>
      )}

      <div className="mt-6 flex flex-col sm:flex-row gap-4 w-full">
        <button
          onClick={handleResend}
          disabled={resending}
          className="flex-1 px-6 py-3 rounded-2xl bg-[#0D9488] text-white font-semibold hover:bg-[#0D9488]/90 transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {resending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          {resending ? 'Sending...' : 'Resend Verification Email'}
        </button>
        <Link
          to="/login"
          className="flex-1 px-6 py-3 rounded-2xl border-2 border-gray-200 dark:border-gray-700 text-[#374151] dark:text-white font-semibold hover:border-[#0D9488] hover:text-[#0D9488] transition text-center"
        >
          Go to Login
        </Link>
      </div>
    </div>
  );
};

export default VerifyEmail;