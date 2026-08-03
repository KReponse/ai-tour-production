// src/pages/PrivacyPolicy.jsx
// ✅ UPDATED - Connected to Privacy Policy CMS API

import React, { useState, useEffect } from 'react';
import { Shield, Calendar, Loader2 } from 'lucide-react';
import { getPrivacyContent } from '../services/privacyService';

const PrivacyPolicy = () => {
  const [privacyData, setPrivacyData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPrivacyContent();
  }, []);

  const fetchPrivacyContent = async () => {
    try {
      const response = await getPrivacyContent();
      if (response?.success && response?.data) {
        setPrivacyData(response.data);
      }
    } catch (error) {
      console.error('Error loading privacy content:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-[#0D9488]/20" />
          <div className="absolute inset-0 rounded-full border-4 border-[#0D9488] border-t-transparent animate-spin" />
        </div>
        <p className="mt-4 text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  const data = privacyData || {};
  const hero = data.hero || {};
  const sections = data.sections || [];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in">
      {/* Hero */}
      <div className="bg-gradient-to-r from-[#0D9488] to-[#F59E0B] rounded-3xl p-12 text-white text-center mb-8">
        <Shield className="w-16 h-16 mx-auto mb-4" />
        <h1 className="text-4xl md:text-5xl font-black">{hero.title || 'Privacy Policy'}</h1>
        <p className="text-lg text-white/90 mt-2">
          {hero.subtitle || 'Your privacy matters to us. Learn how we protect your data.'}
        </p>
      </div>

      {/* Last Updated */}
      {data.lastUpdated && (
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-8">
          <Calendar className="w-4 h-4" />
          <span>Last Updated: {new Date(data.lastUpdated).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}</span>
        </div>
      )}

      {/* Sections */}
      <div className="space-y-8">
        {sections.filter(s => s.active !== false).map((section, idx) => (
          <div key={idx} className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
            <h2 className="text-2xl font-bold text-[#374151] dark:text-white mb-4">
              {section.title}
            </h2>
            <div className="text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
              {section.content}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PrivacyPolicy;