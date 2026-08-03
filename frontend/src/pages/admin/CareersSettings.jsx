// src/pages/admin/CareersSettings.jsx
// ✅ NEW - Careers Settings Admin Page

import React, { useState, useEffect } from 'react';
import {
  Save,
  Loader2,
  RefreshCw,
  AlertCircle,
  Plus,
  Trash2,
} from 'lucide-react';
import { getCareersContent, updateCareersContent, resetCareersContent } from '../../services/careersService';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const ICON_OPTIONS = ['Heart', 'Coffee', 'Laptop', 'Globe', 'Briefcase', 'Users', 'Award', 'Clock', 'MapPin', 'DollarSign'];

const JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Remote'];

const CareersSettings = () => {
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
      const response = await getCareersContent();
      if (response?.success && response?.data) {
        setData(response.data);
      }
    } catch (error) {
      console.error('Error fetching careers data:', error);
      toast.error('Failed to load careers content');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateCareersContent(data, token);
      toast.success('Careers content updated successfully!');
    } catch (error) {
      console.error('Error saving careers:', error);
      toast.error('Failed to save careers content');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (window.confirm('Reset careers content to defaults? This cannot be undone.')) {
      try {
        await resetCareersContent(token);
        await fetchData();
        toast.success('Careers content reset to defaults');
      } catch (error) {
        console.error('Error resetting careers:', error);
        toast.error('Failed to reset careers content');
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
        { value: '', label: '', order: prev.statistics?.length || 0, active: true },
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

  const addBenefit = () => {
    setData(prev => ({
      ...prev,
      benefits: [
        ...(prev.benefits || []),
        { icon: 'Heart', title: '', description: '', order: prev.benefits?.length || 0, active: true },
      ],
    }));
  };

  const removeBenefit = (index) => {
    setData(prev => ({
      ...prev,
      benefits: prev.benefits.filter((_, i) => i !== index),
    }));
  };

  const updateBenefit = (index, field, value) => {
    setData(prev => ({
      ...prev,
      benefits: prev.benefits.map((benefit, i) => {
        if (i === index) return { ...benefit, [field]: value };
        return benefit;
      }),
    }));
  };

  const addJob = () => {
    setData(prev => ({
      ...prev,
      jobs: [
        ...(prev.jobs || []),
        { title: '', department: '', location: '', type: 'Full-time', salary: '', description: '', requirements: '', applyLink: 'mailto:careers@aitour.rw', isOpen: true, order: prev.jobs?.length || 0, active: true },
      ],
    }));
  };

  const removeJob = (index) => {
    setData(prev => ({
      ...prev,
      jobs: prev.jobs.filter((_, i) => i !== index),
    }));
  };

  const updateJob = (index, field, value) => {
    setData(prev => ({
      ...prev,
      jobs: prev.jobs.map((job, i) => {
        if (i === index) return { ...job, [field]: value };
        return job;
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
        <p className="mt-4 text-gray-500 dark:text-gray-400">Loading careers settings...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-3xl p-12 text-center border border-gray-200 dark:border-gray-800">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-[#374151] dark:text-white">Failed to load careers data</h2>
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
          <h1 className="text-3xl font-black text-[#374151] dark:text-white">Careers Settings</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your Careers page content</p>
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
                placeholder="Value (e.g., 15+)"
                className="w-28 h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition"
              />
              <input
                type="text"
                value={stat.label || ''}
                onChange={(e) => updateStatistic(index, 'label', e.target.value)}
                placeholder="Label"
                className="flex-1 h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition"
              />
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

      {/* Benefits */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-[#374151] dark:text-white">Benefits</h2>
          <button
            onClick={addBenefit}
            className="px-3 py-1.5 rounded-lg bg-[#0D9488] text-white text-sm hover:bg-[#0D9488]/80 transition flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            Add Benefit
          </button>
        </div>
        <div className="space-y-3">
          {data.benefits?.map((benefit, index) => (
            <div key={index} className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <select
                value={benefit.icon || 'Heart'}
                onChange={(e) => updateBenefit(index, 'icon', e.target.value)}
                className="h-10 w-28 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition"
              >
                {ICON_OPTIONS.map(icon => (
                  <option key={icon} value={icon}>{icon}</option>
                ))}
              </select>
              <input
                type="text"
                value={benefit.title || ''}
                onChange={(e) => updateBenefit(index, 'title', e.target.value)}
                placeholder="Title"
                className="flex-1 h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition"
              />
              <input
                type="text"
                value={benefit.description || ''}
                onChange={(e) => updateBenefit(index, 'description', e.target.value)}
                placeholder="Description"
                className="flex-1 h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition"
              />
              <button
                onClick={() => removeBenefit(index)}
                className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/20 text-red-500 hover:bg-red-200 dark:hover:bg-red-900/40 transition flex items-center justify-center flex-shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Jobs */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-[#374151] dark:text-white">Open Positions</h2>
          <button
            onClick={addJob}
            className="px-3 py-1.5 rounded-lg bg-[#0D9488] text-white text-sm hover:bg-[#0D9488]/80 transition flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            Add Job
          </button>
        </div>
        <div className="space-y-4">
          {data.jobs?.map((job, index) => (
            <div key={index} className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-2 gap-3 mb-2">
                <input
                  type="text"
                  value={job.title || ''}
                  onChange={(e) => updateJob(index, 'title', e.target.value)}
                  placeholder="Job Title"
                  className="h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition"
                />
                <input
                  type="text"
                  value={job.department || ''}
                  onChange={(e) => updateJob(index, 'department', e.target.value)}
                  placeholder="Department"
                  className="h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition"
                />
              </div>
              <div className="grid grid-cols-2 gap-3 mb-2">
                <input
                  type="text"
                  value={job.location || ''}
                  onChange={(e) => updateJob(index, 'location', e.target.value)}
                  placeholder="Location"
                  className="h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition"
                />
                <select
                  value={job.type || 'Full-time'}
                  onChange={(e) => updateJob(index, 'type', e.target.value)}
                  className="h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition"
                >
                  {JOB_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-2">
                <input
                  type="text"
                  value={job.salary || ''}
                  onChange={(e) => updateJob(index, 'salary', e.target.value)}
                  placeholder="Salary (e.g., $60k - $80k)"
                  className="h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition"
                />
                <input
                  type="text"
                  value={job.applyLink || ''}
                  onChange={(e) => updateJob(index, 'applyLink', e.target.value)}
                  placeholder="Apply Link (URL or mailto:)"
                  className="h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition"
                />
              </div>
              <div className="mb-2">
                <textarea
                  value={job.description || ''}
                  onChange={(e) => updateJob(index, 'description', e.target.value)}
                  placeholder="Job Description"
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition resize-none"
                />
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <input
                    type="checkbox"
                    checked={job.isOpen !== false}
                    onChange={(e) => updateJob(index, 'isOpen', e.target.checked)}
                    className="w-4 h-4 accent-[#0D9488]"
                  />
                  Position is Open
                </label>
                <button
                  onClick={() => removeJob(index)}
                  className="ml-auto px-3 py-1.5 rounded-lg bg-red-100 dark:bg-red-900/20 text-red-500 hover:bg-red-200 dark:hover:bg-red-900/40 transition text-sm"
                >
                  <Trash2 className="w-4 h-4 inline mr-1" />
                  Remove Job
                </button>
              </div>
            </div>
          ))}
        </div>
        {data.jobs?.length === 0 && (
          <p className="text-center text-gray-500 dark:text-gray-400 py-8">No jobs added yet. Click "Add Job" to get started.</p>
        )}
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

export default CareersSettings;