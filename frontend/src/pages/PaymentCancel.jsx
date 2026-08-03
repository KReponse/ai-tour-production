// src/pages/PaymentCancel.jsx

import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { XCircle, ArrowLeft, Home } from 'lucide-react';

// ===============================
// AI TOUR COLORS
// ===============================
// Teal  : #0D9488
// Gold  : #F59E0B
// Slate : #374151
// White : #FFFFFF
// ===============================

const PaymentCancel = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 px-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-8 text-center border border-gray-200 dark:border-gray-800">
        
        <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-12 h-12 text-red-600" />
        </div>

        <h1 className="text-2xl font-black text-[#374151] dark:text-white mb-3">
          Payment Cancelled
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-2">
          Your payment was not completed.
        </p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mb-8">
          You can try again or contact support if you need help.
        </p>

        {sessionId && (
          <div className="mb-6 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-left">
            <p className="text-xs text-gray-400">Session ID</p>
            <p className="text-sm font-mono text-gray-600 dark:text-gray-300 truncate">
              {sessionId}
            </p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <button
            onClick={() => navigate('/explore')}
            className="w-full py-4 rounded-2xl bg-[#0D9488] text-white font-bold hover:bg-[#0D9488]/80 transition flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Try Another Experience
          </button>
          <button
            onClick={() => navigate('/')}
            className="w-full py-4 rounded-2xl border-2 border-gray-200 dark:border-gray-700 text-[#374151] dark:text-white font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition flex items-center justify-center gap-2"
          >
            <Home className="w-5 h-5" />
            Go Home
          </button>
        </div>

        <p className="mt-6 text-xs text-gray-400 dark:text-gray-500">
          If you were charged but didn't receive confirmation,{' '}
          <a
            href="mailto:support@aitour.rw"
            className="text-[#0D9488] hover:underline font-medium"
          >
            contact support
          </a>
        </p>
      </div>
    </div>
  );
};

export default PaymentCancel;