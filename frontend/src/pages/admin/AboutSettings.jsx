// src/pages/admin/AboutSettings.jsx
// ✅ NEW - About Settings Admin Page

import React, { useState, useEffect } from 'react';
import {
  Save,
  Loader2,
  RefreshCw,
  AlertCircle,
  Plus,
  Trash2,
  Users,
  Sparkles,
  Heart,
  Shield,
  Globe,
  TrendingUp,
  MapPin,
  Star,
} from 'lucide-react';
import { getAboutContent, updateAboutContent, resetAboutContent } from '../../services/aboutService';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const ICON_OPTIONS = [
  { value: 'Sparkles', label: 'Sparkles' },
  { value: 'Users', label: 'Users' },
  { value: 'Heart', label: 'Heart' },
  { value: 'Shield', label: 'Shield' },
  { value: 'Globe', label: 'Globe' },
  { value: 'TrendingUp', label: 'Trending Up' },
  { value: 'MapPin', label: 'Map Pin' },
  { value: 'Star', label: 'Star' },
];

const AboutSettings = () => {
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
      const response = await getAboutContent();
      if (response?.success && response?.data) {
        setData(response.data);
      }
    } catch (error) {
      console.error('Error fetching about data:', error);
      toast.error('Failed to load about content');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateAboutContent(data, token);
      toast.success('About content updated successfully!');
    } catch (error) {
      console.error('Error saving about:', error);
      toast.error('Failed to save about content');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (window.confirm('Reset about content to defaults? This cannot be undone.')) {
      try {
        await resetAboutContent(token);
        await fetchData();
        toast.success('About content reset to defaults');
      } catch (error) {
        console.error('Error resetting about:', error);
        toast.error('Failed to reset about content');
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

  const addStatistic = () => {
    setData(prev => ({
      ...prev,
      statistics: [
        ...(prev.statistics || []),
        { value: '', label: '', icon: 'Users', order: prev.statistics?.length || 0, active: true },
      ],
    }));
  };

  const removeStatistic = (index) => {
    setData(prev => ({
      ...prev,
      statistics: prev.statistics.filter((_, i) => i !== index),
    }));
  };

  const updateStatistic = (index, field, value) => {
    setData(prev => ({
      ...prev,
      statistics: prev.statistics.map((stat, i) => {
        if (i === index) return { ...stat, [field]: value };
        return stat;
      }),
    }));
  };

  const addValue = () => {
    setData(prev => ({
      ...prev,
      values: [
        ...(prev.values || []),
        { title: '', description: '', icon: 'Sparkles', order: prev.values?.length || 0, active: true },
      ],
    }));
  };

  const removeValue = (index) => {
    setData(prev => ({
      ...prev,
      values: prev.values.filter((_, i) => i !== index),
    }));
  };

  const updateValue = (index, field, value) => {
    setData(prev => ({
      ...prev,
      values: prev.values.map((val, i) => {
        if (i === index) return { ...val, [field]: value };
        return val;
      }),
    }));
  };

  const addTeamMember = () => {
    setData(prev => ({
      ...prev,
      team: [
        ...(prev.team || []),
        { name: '', role: '', image: '', bio: '', order: prev.team?.length || 0, active: true },
      ],
    }));
  };

  const removeTeamMember = (index) => {
    setData(prev => ({
      ...prev,
      team: prev.team.filter((_, i) => i !== index),
    }));
  };

  const updateTeamMember = (index, field, value) => {
    setData(prev => ({
      ...prev,
      team: prev.team.map((member, i) => {
        if (i === index) return { ...member, [field]: value };
        return member;
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
        <p className="mt-4 text-gray-500 dark:text-gray-400">Loading about settings...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-3xl p-12 text-center border border-gray-200 dark:border-gray-800">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-[#374151] dark:text-white">Failed to load about data</h2>
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
          <h1 className="text-3xl font-black text-[#374151] dark:text-white">About Settings</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your About page content</p>
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
            <textarea
              value={data.hero?.description || ''}
              onChange={(e) => updateField('hero.description', e.target.value)}
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition resize-none"
            />
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-[#374151] dark:text-white">Statistics</h2>
          <button
            onClick={addStatistic}
            className="px-3 py-1.5 rounded-lg bg-[#0D9488] text-white text-sm hover:bg-[#0D9488]/80 transition flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            Add Statistic
          </button>
        </div>
        <div className="space-y-3">
          {data.statistics?.map((stat, index) => (
            <div key={index} className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <input
                type="text"
                value={stat.value || ''}
                onChange={(e) => updateStatistic(index, 'value', e.target.value)}
                placeholder="Value (e.g., 10K+)"
                className="w-28 h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition"
              />
              <input
                type="text"
                value={stat.label || ''}
                onChange={(e) => updateStatistic(index, 'label', e.target.value)}
                placeholder="Label"
                className="flex-1 h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition"
              />
              <select
                value={stat.icon || 'Users'}
                onChange={(e) => updateStatistic(index, 'icon', e.target.value)}
                className="h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition"
              >
                {ICON_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <button
                onClick={() => removeStatistic(index)}
                className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/20 text-red-500 hover:bg-red-200 dark:hover:bg-red-900/40 transition flex items-center justify-center flex-shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Values */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-[#374151] dark:text-white">Values</h2>
          <button
            onClick={addValue}
            className="px-3 py-1.5 rounded-lg bg-[#0D9488] text-white text-sm hover:bg-[#0D9488]/80 transition flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            Add Value
          </button>
        </div>
        <div className="space-y-3">
          {data.values?.map((val, index) => (
            <div key={index} className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-2">
                <input
                  type="text"
                  value={val.title || ''}
                  onChange={(e) => updateValue(index, 'title', e.target.value)}
                  placeholder="Title"
                  className="flex-1 h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition"
                />
                <select
                  value={val.icon || 'Sparkles'}
                  onChange={(e) => updateValue(index, 'icon', e.target.value)}
                  className="h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition"
                >
                  {ICON_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <button
                  onClick={() => removeValue(index)}
                  className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/20 text-red-500 hover:bg-red-200 dark:hover:bg-red-900/40 transition flex items-center justify-center flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <textarea
                value={val.description || ''}
                onChange={(e) => updateValue(index, 'description', e.target.value)}
                placeholder="Description"
                rows={2}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition resize-none"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Team */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-[#374151] dark:text-white">Team</h2>
          <button
            onClick={addTeamMember}
            className="px-3 py-1.5 rounded-lg bg-[#0D9488] text-white text-sm hover:bg-[#0D9488]/80 transition flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            Add Member
          </button>
        </div>
        <div className="space-y-3">
          {data.team?.map((member, index) => (
            <div key={index} className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-2">
                <input
                  type="text"
                  value={member.name || ''}
                  onChange={(e) => updateTeamMember(index, 'name', e.target.value)}
                  placeholder="Name"
                  className="flex-1 h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition"
                />
                <input
                  type="text"
                  value={member.role || ''}
                  onChange={(e) => updateTeamMember(index, 'role', e.target.value)}
                  placeholder="Role"
                  className="flex-1 h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition"
                />
                <button
                  onClick={() => removeTeamMember(index)}
                  className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/20 text-red-500 hover:bg-red-200 dark:hover:bg-red-900/40 transition flex items-center justify-center flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <input
                type="text"
                value={member.image || ''}
                onChange={(e) => updateTeamMember(index, 'image', e.target.value)}
                placeholder="Image URL (optional)"
                className="w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition"
              />
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
        <h2 className="text-xl font-bold text-[#374151] dark:text-white mb-4">Call to Action</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Title</label>
            <input
              type="text"
              value={data.cta?.title || ''}
              onChange={(e) => updateField('cta.title', e.target.value)}
              className="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Subtitle</label>
            <input
              type="text"
              value={data.cta?.subtitle || ''}
              onChange={(e) => updateField('cta.subtitle', e.target.value)}
              className="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Button Text</label>
              <input
                type="text"
                value={data.cta?.buttonText || ''}
                onChange={(e) => updateField('cta.buttonText', e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Button Link</label>
              <input
                type="text"
                value={data.cta?.buttonLink || ''}
                onChange={(e) => updateField('cta.buttonLink', e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutSettings;