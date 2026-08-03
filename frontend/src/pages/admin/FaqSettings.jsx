// src/pages/admin/FaqSettings.jsx
// ✅ NEW - FAQ Settings Admin Page

import React, { useState, useEffect } from 'react';
import {
  Save,
  Loader2,
  RefreshCw,
  AlertCircle,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { getFaqContent, updateFaqContent, resetFaqContent } from '../../services/faqService';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const CATEGORY_ICONS = ['HelpCircle', 'Calendar', 'DollarSign', 'Users', 'MapPin', 'Shield', 'BookOpen', 'CreditCard'];

const FaqSettings = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState(null);
  const [expandedFaqs, setExpandedFaqs] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await getFaqContent();
      if (response?.success && response?.data) {
        setData(response.data);
      }
    } catch (error) {
      console.error('Error fetching FAQ data:', error);
      toast.error('Failed to load FAQ content');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateFaqContent(data, token);
      toast.success('FAQ content updated successfully!');
    } catch (error) {
      console.error('Error saving FAQ:', error);
      toast.error('Failed to save FAQ content');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (window.confirm('Reset FAQ content to defaults? This cannot be undone.')) {
      try {
        await resetFaqContent(token);
        await fetchData();
        toast.success('FAQ content reset to defaults');
      } catch (error) {
        console.error('Error resetting FAQ:', error);
        toast.error('Failed to reset FAQ content');
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

  const addCategory = () => {
    setData(prev => ({
      ...prev,
      categories: [
        ...(prev.categories || []),
        { id: `category-${Date.now()}`, label: '', icon: 'HelpCircle', order: prev.categories?.length || 0, active: true },
      ],
    }));
  };

  const removeCategory = (index) => {
    setData(prev => ({
      ...prev,
      categories: prev.categories.filter((_, i) => i !== index),
    }));
  };

  const updateCategory = (index, field, value) => {
    setData(prev => ({
      ...prev,
      categories: prev.categories.map((cat, i) => {
        if (i === index) return { ...cat, [field]: value };
        return cat;
      }),
    }));
  };

  const addFaq = () => {
    setData(prev => ({
      ...prev,
      faqs: [
        ...(prev.faqs || []),
        { question: '', answer: '', category: prev.categories?.[0]?.id || 'general', order: prev.faqs?.length || 0, active: true },
      ],
    }));
  };

  const removeFaq = (index) => {
    setData(prev => ({
      ...prev,
      faqs: prev.faqs.filter((_, i) => i !== index),
    }));
  };

  const updateFaq = (index, field, value) => {
    setData(prev => ({
      ...prev,
      faqs: prev.faqs.map((faq, i) => {
        if (i === index) return { ...faq, [field]: value };
        return faq;
      }),
    }));
  };

  const toggleFaqExpand = (index) => {
    setExpandedFaqs(prev =>
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-[#0D9488]/20" />
          <div className="absolute inset-0 rounded-full border-4 border-[#0D9488] border-t-transparent animate-spin" />
        </div>
        <p className="mt-4 text-gray-500 dark:text-gray-400">Loading FAQ settings...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-3xl p-12 text-center border border-gray-200 dark:border-gray-800">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-[#374151] dark:text-white">Failed to load FAQ data</h2>
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
          <h1 className="text-3xl font-black text-[#374151] dark:text-white">FAQ Settings</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your FAQ page content</p>
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
        </div>
      </div>

      {/* Categories */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-[#374151] dark:text-white">Categories</h2>
          <button
            onClick={addCategory}
            className="px-3 py-1.5 rounded-lg bg-[#0D9488] text-white text-sm hover:bg-[#0D9488]/80 transition flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            Add Category
          </button>
        </div>
        <div className="space-y-3">
          {data.categories?.map((cat, index) => (
            <div key={index} className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <input
                type="text"
                value={cat.id || ''}
                onChange={(e) => updateCategory(index, 'id', e.target.value)}
                placeholder="ID (e.g., booking)"
                className="w-40 h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition"
              />
              <input
                type="text"
                value={cat.label || ''}
                onChange={(e) => updateCategory(index, 'label', e.target.value)}
                placeholder="Label (e.g., Booking)"
                className="flex-1 h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition"
              />
              <select
                value={cat.icon || 'HelpCircle'}
                onChange={(e) => updateCategory(index, 'icon', e.target.value)}
                className="h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition"
              >
                {CATEGORY_ICONS.map(icon => (
                  <option key={icon} value={icon}>{icon}</option>
                ))}
              </select>
              <button
                onClick={() => removeCategory(index)}
                className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/20 text-red-500 hover:bg-red-200 dark:hover:bg-red-900/40 transition flex items-center justify-center flex-shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* FAQs */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-[#374151] dark:text-white">FAQs</h2>
          <button
            onClick={addFaq}
            className="px-3 py-1.5 rounded-lg bg-[#0D9488] text-white text-sm hover:bg-[#0D9488]/80 transition flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            Add FAQ
          </button>
        </div>
        <div className="space-y-3">
          {data.faqs?.map((faq, index) => {
            const isExpanded = expandedFaqs.includes(index);
            return (
              <div key={index} className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleFaqExpand(index)}
                    className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  <input
                    type="text"
                    value={faq.question || ''}
                    onChange={(e) => updateFaq(index, 'question', e.target.value)}
                    placeholder="Question"
                    className="flex-1 h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition"
                  />
                  <select
                    value={faq.category || ''}
                    onChange={(e) => updateFaq(index, 'category', e.target.value)}
                    className="h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition"
                  >
                    {data.categories?.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.label}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => removeFaq(index)}
                    className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/20 text-red-500 hover:bg-red-200 dark:hover:bg-red-900/40 transition flex items-center justify-center flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {isExpanded && (
                  <div className="mt-3 pl-8">
                    <textarea
                      value={faq.answer || ''}
                      onChange={(e) => updateFaq(index, 'answer', e.target.value)}
                      placeholder="Answer"
                      rows={3}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition resize-none"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {data.faqs?.length === 0 && (
          <p className="text-center text-gray-500 dark:text-gray-400 py-8">No FAQs added yet. Click "Add FAQ" to get started.</p>
        )}
      </div>
    </div>
  );
};

export default FaqSettings;