// frontend/src/components/modals/LoginRequiredModal.jsx

import React from 'react';
import { X, Lock, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

const LoginRequiredModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl max-w-md w-full p-8 text-center animate-fade-in">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>

        <div className="w-20 h-20 rounded-full bg-[#0D9488]/10 flex items-center justify-center mx-auto mb-6">
          <Lock className="w-10 h-10 text-[#0D9488]" />
        </div>

        <h2 className="text-2xl font-bold text-[#374151] dark:text-white mb-3">
          Login to Write a Review
        </h2>

        <p className="text-gray-500 dark:text-gray-400 mb-6">
          Please login after completing a booking to leave a review.
        </p>

        <div className="space-y-3">
          <Link
            to="/login"
            className="block w-full py-3 rounded-2xl bg-gradient-to-r from-[#0D9488] to-[#F59E0B] text-white font-bold shadow-lg shadow-[#0D9488]/30 hover:scale-[1.02] transition-all duration-300"
            onClick={onClose}
          >
            Login
          </Link>

          <Link
            to="/register"
            className="block w-full py-3 rounded-2xl border-2 border-gray-200 dark:border-gray-700 text-[#374151] dark:text-white font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            onClick={onClose}
          >
            Create Account
          </Link>
        </div>

        <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
          <Sparkles className="w-3 h-3 inline mr-1 text-[#0D9488]" />
          Only verified travelers can write reviews
        </p>
      </div>
    </div>
  );
};

export default LoginRequiredModal;