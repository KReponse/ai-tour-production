// src/pages/admin/TermsSettings.jsx
// ✅ NEW - Terms & Conditions Settings Admin Page

import React, { useState, useEffect } from 'react';
import {
  Save,
  Loader2,
  RefreshCw,
  AlertCircle,
  Plus,
  Trash2,
} from 'lucide-react';
import { getTermsContent, updateTermsContent, resetTermsContent } from '../../services/termsService';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const TermsSettings = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await getTermsContent();
      if (response?.success && response?.data) {
        setData(response.data);
      }
    } catch (error) {
      console.error('Error fetching terms data:', error);
      toast.error('Failed to load terms content');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateTermsContent(data, token);
      toast.success('Terms content updated successfully!');
    } catch (error) {
      console.error('Error saving terms:', error);
      toast.error('Failed to save terms content');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (window.confirm('Reset terms content to defaults? This cannot be undone.')) {
      try {
        await resetTermsContent(token);
        await fetchData();
        toast.success('Terms content reset to defaults');
      } catch (error) {
        console.error('Error resetting terms:', error);
        toast.error('Failed to reset terms content');
      }
    }
  };

  const updateField = (path, value) => {
    setData(prev => {
      const newData = { ...prev };
      let current = newData;
      const parts = path.split('.');
      for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) current[parts[i]] = {};
        current = current[parts[i]];
      }
      current[parts[parts.length - 1]] = value;
      return newData;
    });
  };

  const addSection = () => {
    setData(prev => ({
      ...prev,
      sections: [
        ...(prev.sections || []),
        { title: '', content: '', order: prev.sections?.length || 0, active: true },
      ],
    }));
  };

  const removeSection = (index) => {
    setData(prev => ({
      ...prev,
      sections: prev.sections.filter((_, i) => i !== index),
    }));
  };

  const updateSection = (index, field, value) => {
    setData(prev => ({
      ...prev,
      sections: prev.sections.map((section, i) => {
        if (i === index) return { ...section, [field]: value };
        return section;
      }),
    }));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-[#0D9488]/20" />
          <div className="absolute inset-0 rounded-full border-4 border-[#0D9488] border-t-transparent animate-spin" />
        </div>
        <p className="mt-4 text-gray-500 dark:text-gray-400">Loading terms settings...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-3xl p-12 text-center border border-gray-200 dark:border-gray-800">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-[#374151] dark:text-white">Failed to load terms data</h2>
        <button
          onClick={fetchData}
          className="mt-4 px-6 py-3 rounded-xl bg-[#0D9488] text-white font-bold hover:bg-[#0D9488]/90 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-[#374151] dark:text-white">Terms & Conditions Settings</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your Terms & Conditions content</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleReset}
            className="px-4 py-2.5 rounded-xl border-2 border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition font-medium"
          >
            <RefreshCw className="w-4 h-4 inline mr-2" />
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#0D9488] to-[#F59E0B] text-white font-bold shadow-lg shadow-[#0D9488]/30 hover:scale-[1.02] transition disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Hero Section */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
        <h2 className="text-xl font-bold text-[#374151] dark:text-white mb-4">Hero Section</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Title</label>
            <input
              type="text"
              value={data.hero?.title || ''}
              onChange={(e) => updateField('hero.title', e.target.value)}
              className="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Subtitle</label>
            <input
              type="text"
              value={data.hero?.subtitle || ''}
              onChange={(e) => updateField('hero.subtitle', e.target.value)}
              className="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Last Updated</label>
            <input
              type="date"
              value={data.lastUpdated ? new Date(data.lastUpdated).toISOString().split('T')[0] : ''}
              onChange={(e) => updateField('lastUpdated', new Date(e.target.value))}
              className="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition"
            />
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-[#374151] dark:text-white">Sections</h2>
          <button
            onClick={addSection}
            className="px-3 py-1.5 rounded-lg bg-[#0D9488] text-white text-sm hover:bg-[#0D9488]/80 transition flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            Add Section
          </button>
        </div>
        <div className="space-y-4">
          {data.sections?.map((section, index) => (
            <div key={index} className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-2">
                <input
                  type="text"
                  value={section.title || ''}
                  onChange={(e) => updateSection(index, 'title', e.target.value)}
                  placeholder="Section Title"
                  className="flex-1 h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition"
                />
                <button
                  onClick={() => removeSection(index)}
                  className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/20 text-red-500 hover:bg-red-200 dark:hover:bg-red-900/40 transition flex items-center justify-center flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <textarea
                value={section.content || ''}
                onChange={(e) => updateSection(index, 'content', e.target.value)}
                placeholder="Section content..."
                rows={5}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition resize-none"
              />
            </div>
          ))}
        </div>
        {data.sections?.length === 0 && (
          <p className="text-center text-gray-500 dark:text-gray-400 py-8">No sections added yet. Click "Add Section" to get started.</p>
        )}
      </div>
    </div>
  );
};

export default TermsSettings;