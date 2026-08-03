// src/pages/MyProviderProfile.jsx
// ✅ REDIRECT - This file is deprecated. Use /provider/profile instead.

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const MyProviderProfile = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to the correct provider profile page
    navigate('/provider/profile', { replace: true });
  }, [navigate]);

  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-4 border-[#0D9488]/20" />
        <div className="absolute inset-0 rounded-full border-4 border-[#0D9488] border-t-transparent animate-spin" />
      </div>
      <p className="mt-4 text-gray-500 dark:text-gray-400">Redirecting to profile...</p>
    </div>
  );
};

export default MyProviderProfile;