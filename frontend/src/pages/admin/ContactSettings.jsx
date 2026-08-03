// src/pages/admin/ContactSettings.jsx
// ✅ NEW - Contact Settings Admin Page

import React, { useState, useEffect } from 'react';
import {
  Save,
  Loader2,
  RefreshCw,
  AlertCircle,
  Plus,
  Trash2,
  Mail,
  Phone,
  MapPin,
  Clock,
  Globe,
} from 'lucide-react';
import { getContactContent, updateContactContent, resetContactContent } from '../../services/contactService';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const ICON_OPTIONS = [
  { value: 'Mail', label: 'Mail' },
  { value: 'Phone', label: 'Phone' },
  { value: 'MapPin', label: 'Map Pin' },
  { value: 'Clock', label: 'Clock' },
  { value: 'Globe', label: 'Globe' },
];

const ContactSettings = () => {
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
      const response = await getContactContent();
      if (response?.success && response?.data) {
        setData(response.data);
      }
    } catch (error) {
      console.error('Error fetching contact data:', error);
      toast.error('Failed to load contact content');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateContactContent(data, token);
      toast.success('Contact content updated successfully!');
    } catch (error) {
      console.error('Error saving contact:', error);
      toast.error('Failed to save contact content');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (window.confirm('Reset contact content to defaults? This cannot be undone.')) {
      try {
        await resetContactContent(token);
        await fetchData();
        toast.success('Contact content reset to defaults');
      } catch (error) {
        console.error('Error resetting contact:', error);
        toast.error('Failed to reset contact content');
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

  const addContactInfo = () => {
    setData(prev => ({
      ...prev,
      contactInfo: [
        ...(prev.contactInfo || []),
        { icon: 'Mail', label: '', value: '', href: '#', order: prev.contactInfo?.length || 0, active: true },
      ],
    }));
  };

  const removeContactInfo = (index) => {
    setData(prev => ({
      ...prev,
      contactInfo: prev.contactInfo.filter((_, i) => i !== index),
    }));
  };

  const updateContactInfo = (index, field, value) => {
    setData(prev => ({
      ...prev,
      contactInfo: prev.contactInfo.map((info, i) => {
        if (i === index) return { ...info, [field]: value };
        return info;
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
        <p className="mt-4 text-gray-500 dark:text-gray-400">Loading contact settings...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-3xl p-12 text-center border border-gray-200 dark:border-gray-800">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-[#374151] dark:text-white">Failed to load contact data</h2>
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
          <h1 className="text-3xl font-black text-[#374151] dark:text-white">Contact Settings</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your Contact page content</p>
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

      {/* Contact Info */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-[#374151] dark:text-white">Contact Information</h2>
          <button
            onClick={addContactInfo}
            className="px-3 py-1.5 rounded-lg bg-[#0D9488] text-white text-sm hover:bg-[#0D9488]/80 transition flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            Add Contact
          </button>
        </div>
        <div className="space-y-3">
          {data.contactInfo?.map((info, index) => (
            <div key={index} className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <select
                value={info.icon || 'Mail'}
                onChange={(e) => updateContactInfo(index, 'icon', e.target.value)}
                className="h-10 w-28 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition"
              >
                {ICON_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <input
                type="text"
                value={info.label || ''}
                onChange={(e) => updateContactInfo(index, 'label', e.target.value)}
                placeholder="Label"
                className="w-32 h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition"
              />
              <input
                type="text"
                value={info.value || ''}
                onChange={(e) => updateContactInfo(index, 'value', e.target.value)}
                placeholder="Value"
                className="flex-1 h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition"
              />
              <input
                type="text"
                value={info.href || '#'}
                onChange={(e) => updateContactInfo(index, 'href', e.target.value)}
                placeholder="Link"
                className="w-40 h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition"
              />
              <button
                onClick={() => removeContactInfo(index)}
                className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/20 text-red-500 hover:bg-red-200 dark:hover:bg-red-900/40 transition flex items-center justify-center flex-shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Social Links */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
        <h2 className="text-xl font-bold text-[#374151] dark:text-white mb-4">Social Media Links</h2>
        <div className="grid grid-cols-2 gap-4">
          {['facebook', 'instagram', 'twitter', 'linkedin', 'youtube'].map((platform) => (
            <div key={platform}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 capitalize">{platform}</label>
              <input
                type="url"
                value={data.socialLinks?.[platform] || ''}
                onChange={(e) => updateField(`socialLinks.${platform}`, e.target.value)}
                placeholder={`https://${platform}.com/your-page`}
                className="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Working Hours */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
        <h2 className="text-xl font-bold text-[#374151] dark:text-white mb-4">Working Hours</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={data.workingHours?.enabled !== false}
              onChange={(e) => updateField('workingHours.enabled', e.target.checked)}
              className="w-4 h-4 accent-[#0D9488]"
            />
            <span className="text-sm text-[#374151] dark:text-white">Show Working Hours</span>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Weekdays</label>
            <input
              type="text"
              value={data.workingHours?.weekdays || ''}
              onChange={(e) => updateField('workingHours.weekdays', e.target.value)}
              className="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Weekends</label>
            <input
              type="text"
              value={data.workingHours?.weekends || ''}
              onChange={(e) => updateField('workingHours.weekends', e.target.value)}
              className="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Holidays</label>
            <input
              type="text"
              value={data.workingHours?.holidays || ''}
              onChange={(e) => updateField('workingHours.holidays', e.target.value)}
              className="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactSettings;