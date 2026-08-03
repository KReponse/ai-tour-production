// src/pages/admin/HelpSettings.jsx
// ✅ NEW - Help Center Settings Admin Page

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
import { getHelpContent, updateHelpContent, resetHelpContent } from '../../services/helpService';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const CATEGORY_ICONS = ['BookOpen', 'Calendar', 'DollarSign', 'Users', 'MapPin', 'Shield', 'HelpCircle', 'CreditCard'];

const HelpSettings = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState(null);
  const [expandedArticles, setExpandedArticles] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await getHelpContent();
      if (response?.success && response?.data) {
        setData(response.data);
      }
    } catch (error) {
      console.error('Error fetching help data:', error);
      toast.error('Failed to load help content');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateHelpContent(data, token);
      toast.success('Help content updated successfully!');
    } catch (error) {
      console.error('Error saving help:', error);
      toast.error('Failed to save help content');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (window.confirm('Reset help content to defaults? This cannot be undone.')) {
      try {
        await resetHelpContent(token);
        await fetchData();
        toast.success('Help content reset to defaults');
      } catch (error) {
        console.error('Error resetting help:', error);
        toast.error('Failed to reset help content');
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
        { name: '', slug: `category-${Date.now()}`, icon: 'BookOpen', description: '', order: prev.categories?.length || 0, active: true },
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

  const addArticle = () => {
    setData(prev => ({
      ...prev,
      articles: [
        ...(prev.articles || []),
        { title: '', slug: `article-${Date.now()}`, category: prev.categories?.[0]?.slug || '', content: '', excerpt: '', featured: false, order: prev.articles?.length || 0, active: true },
      ],
    }));
  };

  const removeArticle = (index) => {
    setData(prev => ({
      ...prev,
      articles: prev.articles.filter((_, i) => i !== index),
    }));
  };

  const updateArticle = (index, field, value) => {
    setData(prev => ({
      ...prev,
      articles: prev.articles.map((article, i) => {
        if (i === index) return { ...article, [field]: value };
        return article;
      }),
    }));
  };

  const toggleArticleExpand = (index) => {
    setExpandedArticles(prev =>
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const toggleFeatured = (slug) => {
    setData(prev => {
      const featured = prev.featuredArticles || [];
      if (featured.includes(slug)) {
        return { ...prev, featuredArticles: featured.filter(s => s !== slug) };
      } else {
        return { ...prev, featuredArticles: [...featured, slug] };
      }
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-[#0D9488]/20" />
          <div className="absolute inset-0 rounded-full border-4 border-[#0D9488] border-t-transparent animate-spin" />
        </div>
        <p className="mt-4 text-gray-500 dark:text-gray-400">Loading help settings...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-3xl p-12 text-center border border-gray-200 dark:border-gray-800">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-[#374151] dark:text-white">Failed to load help data</h2>
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
          <h1 className="text-3xl font-black text-[#374151] dark:text-white">Help Center Settings</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your Help Center content</p>
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
                value={cat.name || ''}
                onChange={(e) => updateCategory(index, 'name', e.target.value)}
                placeholder="Name"
                className="flex-1 h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition"
              />
              <input
                type="text"
                value={cat.slug || ''}
                onChange={(e) => updateCategory(index, 'slug', e.target.value)}
                placeholder="Slug"
                className="w-40 h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition"
              />
              <select
                value={cat.icon || 'BookOpen'}
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

      {/* Articles */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-[#374151] dark:text-white">Articles</h2>
          <button
            onClick={addArticle}
            className="px-3 py-1.5 rounded-lg bg-[#0D9488] text-white text-sm hover:bg-[#0D9488]/80 transition flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            Add Article
          </button>
        </div>
        <div className="space-y-3">
          {data.articles?.map((article, index) => {
            const isExpanded = expandedArticles.includes(index);
            const isFeatured = data.featuredArticles?.includes(article.slug);
            return (
              <div key={index} className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleArticleExpand(index)}
                    className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  <input
                    type="text"
                    value={article.title || ''}
                    onChange={(e) => updateArticle(index, 'title', e.target.value)}
                    placeholder="Title"
                    className="flex-1 h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition"
                  />
                  <input
                    type="text"
                    value={article.slug || ''}
                    onChange={(e) => updateArticle(index, 'slug', e.target.value)}
                    placeholder="Slug"
                    className="w-32 h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition"
                  />
                  <select
                    value={article.category || ''}
                    onChange={(e) => updateArticle(index, 'category', e.target.value)}
                    className="w-32 h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition"
                  >
                    {data.categories?.map(cat => (
                      <option key={cat.slug} value={cat.slug}>{cat.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => toggleFeatured(article.slug)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                      isFeatured
                        ? 'bg-[#0D9488] text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {isFeatured ? '★ Featured' : '☆ Feature'}
                  </button>
                  <button
                    onClick={() => removeArticle(index)}
                    className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/20 text-red-500 hover:bg-red-200 dark:hover:bg-red-900/40 transition flex items-center justify-center flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {isExpanded && (
                  <div className="mt-3 space-y-3 pl-8">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Excerpt</label>
                      <input
                        type="text"
                        value={article.excerpt || ''}
                        onChange={(e) => updateArticle(index, 'excerpt', e.target.value)}
                        placeholder="Brief summary"
                        className="w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Content</label>
                      <textarea
                        value={article.content || ''}
                        onChange={(e) => updateArticle(index, 'content', e.target.value)}
                        placeholder="Full article content"
                        rows={5}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition resize-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {data.articles?.length === 0 && (
          <p className="text-center text-gray-500 dark:text-gray-400 py-8">No articles added yet. Click "Add Article" to get started.</p>
        )}
      </div>
    </div>
  );
};

export default HelpSettings;