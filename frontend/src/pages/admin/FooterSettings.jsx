// src/pages/admin/FooterSettings.jsx
// ✅ COMPLETE FIXED - Mobile Responsive Optimizations
// ✅ Fixed: Header buttons on mobile (wrap, text-size, hidden labels)
// ✅ Fixed: Social media grid on mobile
// ✅ Fixed: Link editing on mobile (flex-col)
// ✅ Fixed: Contact info grid on mobile
// ✅ Fixed: Spacing and padding for mobile
// ✅ Fixed: Touch targets for mobile

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Settings,
  Save,
  Loader2,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Mail,
  Phone,
  MapPin,
  Facebook,
  Instagram,
  Twitter,
  Linkedin,
  Youtube,
  Plus,
  Trash2,
  Edit2,
  X,
  Globe,
  Share2,
  Eye,
} from 'lucide-react';
import { getFooterContent, updateFooterContent, resetFooterContent } from '../../services/footerService';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

// Social media platform config
const SOCIAL_PLATFORMS = [
  { key: 'facebook', label: 'Facebook', icon: Facebook, color: '#1877F2', placeholder: 'https://facebook.com/your-page' },
  { key: 'instagram', label: 'Instagram', icon: Instagram, color: '#E4405F', placeholder: 'https://instagram.com/your-profile' },
  { key: 'twitter', label: 'Twitter / X', icon: Twitter, color: '#1DA1F2', placeholder: 'https://twitter.com/your-handle' },
  { key: 'linkedin', label: 'LinkedIn', icon: Linkedin, color: '#0A66C2', placeholder: 'https://linkedin.com/company/your-page' },
  { key: 'youtube', label: 'YouTube', icon: Youtube, color: '#FF0000', placeholder: 'https://youtube.com/@your-channel' },
  { key: 'tiktok', label: 'TikTok', icon: Globe, color: '#000000', placeholder: 'https://tiktok.com/@your-handle' },
];

const FooterSettings = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [footerData, setFooterData] = useState(null);
  const [editingSection, setEditingSection] = useState(null);
  const [editingLink, setEditingLink] = useState(null);
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    fetchFooterData();
  }, []);

  const fetchFooterData = async () => {
    try {
      setLoading(true);
      const data = await getFooterContent();
      if (data?.success && data?.data) {
        setFooterData(data.data);
      }
    } catch (error) {
      console.error('Error fetching footer data:', error);
      toast.error('Failed to load footer data');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateFooterContent(footerData, token);
      toast.success('Footer updated successfully!');
    } catch (error) {
      console.error('Error saving footer:', error);
      toast.error('Failed to save footer');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (window.confirm('Reset footer content to defaults? This cannot be undone.')) {
      try {
        await resetFooterContent(token);
        await fetchFooterData();
        toast.success('Footer reset to defaults');
      } catch (error) {
        console.error('Error resetting footer:', error);
        toast.error('Failed to reset footer');
      }
    }
  };

  const updateField = (path, value) => {
    setFooterData(prev => {
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

  const addLink = (sectionId) => {
    setFooterData(prev => ({
      ...prev,
      sections: prev.sections.map(section => {
        if (section.sectionId === sectionId) {
          return {
            ...section,
            links: [
              ...section.links,
              { label: 'New Link', path: '/new-link', order: section.links.length, active: true },
            ],
          };
        }
        return section;
      }),
    }));
  };

  const removeLink = (sectionId, linkIndex) => {
    setFooterData(prev => ({
      ...prev,
      sections: prev.sections.map(section => {
        if (section.sectionId === sectionId) {
          return {
            ...section,
            links: section.links.filter((_, i) => i !== linkIndex),
          };
        }
        return section;
      }),
    }));
  };

  const updateLink = (sectionId, linkIndex, field, value) => {
    setFooterData(prev => ({
      ...prev,
      sections: prev.sections.map(section => {
        if (section.sectionId === sectionId) {
          return {
            ...section,
            links: section.links.map((link, i) => {
              if (i === linkIndex) {
                return { ...link, [field]: value };
              }
              return link;
            }),
          };
        }
        return section;
      }),
    }));
  };

  const toggleSocialLink = (key) => {
    setFooterData(prev => ({
      ...prev,
      socialLinks: {
        ...prev.socialLinks,
        [key]: prev.socialLinks?.[key] || '',
      },
    }));
  };

  const updateSocialLink = (key, value) => {
    setFooterData(prev => ({
      ...prev,
      socialLinks: {
        ...prev.socialLinks,
        [key]: value,
      },
    }));
  };

  const clearSocialLink = (key) => {
    setFooterData(prev => ({
      ...prev,
      socialLinks: {
        ...prev.socialLinks,
        [key]: '',
      },
    }));
  };

  const hasAnySocialLinks = () => {
    if (!footerData?.socialLinks) return false;
    return Object.values(footerData.socialLinks).some(value => value && value.trim() !== '');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-[#0D9488]/20" />
          <div className="absolute inset-0 rounded-full border-4 border-[#0D9488] border-t-transparent animate-spin" />
        </div>
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Loading footer settings...</p>
      </div>
    );
  }

  if (!footerData) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 sm:p-12 text-center border border-gray-200 dark:border-gray-800 mx-4 sm:mx-0">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl sm:text-2xl font-bold text-[#374151] dark:text-white">Failed to load footer data</h2>
        <button
          onClick={fetchFooterData}
          className="mt-4 px-6 py-3 rounded-xl bg-[#0D9488] text-white font-bold hover:bg-[#0D9488]/90 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8 px-4 sm:px-0">

      {/* ─── HEADER - Mobile Responsive ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#374151] dark:text-white">
            Footer Settings
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage your website footer content
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            onClick={() => setPreviewMode(!previewMode)}
            className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-[#0D9488] hover:text-[#0D9488] transition font-medium flex items-center gap-1.5 text-xs sm:text-sm"
          >
            <Eye className="w-4 h-4" />
            <span className="hidden xs:inline">{previewMode ? 'Edit' : 'Preview'}</span>
          </button>

          <button
            onClick={handleReset}
            className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border-2 border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition font-medium text-xs sm:text-sm"
          >
            <RefreshCw className="w-4 h-4 inline mr-1 sm:mr-2" />
            <span className="hidden xs:inline">Reset</span>
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-[#0D9488] to-[#F59E0B] text-white font-bold shadow-lg shadow-[#0D9488]/30 hover:scale-[1.02] transition disabled:opacity-50 flex items-center gap-2 text-xs sm:text-sm"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span className="hidden xs:inline">{saving ? 'Saving...' : 'Save Changes'}</span>
            <span className="inline xs:hidden">{saving ? '...' : 'Save'}</span>
          </button>
        </div>
      </div>

      {/* ─── SOCIAL MEDIA SETTINGS ─── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl sm:rounded-3xl border border-gray-200 dark:border-gray-800 p-4 sm:p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-[#0D9488]" />
            <h2 className="text-lg sm:text-xl font-bold text-[#374151] dark:text-white">Social Media</h2>
            {hasAnySocialLinks() && (
              <span className="text-xs bg-[#0D9488]/10 text-[#0D9488] px-2 py-0.5 rounded-full">
                Active
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400">Links appear in footer</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {SOCIAL_PLATFORMS.map((platform) => {
            const Icon = platform.icon;
            const value = footerData.socialLinks?.[platform.key] || '';
            const isActive = value && value.trim() !== '';

            return (
              <div
                key={platform.key}
                className={`p-3 sm:p-4 rounded-xl border transition-all duration-300 ${
                  isActive
                    ? 'border-[#0D9488] bg-[#0D9488]/5 dark:bg-[#0D9488]/10'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: isActive ? platform.color : 'transparent' }}
                  >
                    <Icon
                      className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-400'}`}
                    />
                  </div>
                  <label className="text-sm font-medium text-[#374151] dark:text-white flex-1">
                    {platform.label}
                  </label>
                  {isActive && (
                    <button
                      onClick={() => clearSocialLink(platform.key)}
                      className="text-xs text-red-500 hover:text-red-600 transition"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={value}
                    onChange={(e) => updateSocialLink(platform.key, e.target.value)}
                    placeholder={platform.placeholder}
                    className={`flex-1 h-10 px-3 rounded-lg border text-sm focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition ${
                      isActive
                        ? 'border-[#0D9488] bg-white dark:bg-gray-900'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900'
                    }`}
                  />
                  {isActive && (
                    <a
                      href={value}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[#0D9488]/10 text-[#0D9488] hover:bg-[#0D9488] hover:text-white transition flex items-center justify-center flex-shrink-0"
                    >
                      <Globe className="w-4 h-4" />
                    </a>
                  )}
                </div>

                {isActive && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="text-[10px] text-green-500">✓ Active</span>
                    <span className="text-[10px] text-gray-400 truncate flex-1">
                      {value}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Social Preview */}
        {hasAnySocialLinks() && (
          <div className="mt-4 p-3 sm:p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 mb-2">Preview:</p>
            <div className="flex flex-wrap gap-2">
              {SOCIAL_PLATFORMS.map((platform) => {
                const value = footerData.socialLinks?.[platform.key] || '';
                if (!value || value.trim() === '') return null;
                const Icon = platform.icon;
                return (
                  <a
                    key={platform.key}
                    href={value}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:border-[#0D9488] transition text-xs"
                  >
                    <Icon className="w-3.5 h-3.5" style={{ color: platform.color }} />
                    <span className="text-gray-600 dark:text-gray-300 hidden sm:inline">{platform.label}</span>
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ─── BRAND INFO ─── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl sm:rounded-3xl border border-gray-200 dark:border-gray-800 p-4 sm:p-6 shadow-sm">
        <h2 className="text-lg sm:text-xl font-bold text-[#374151] dark:text-white mb-4">Brand Information</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Brand Name
            </label>
            <input
              type="text"
              value={footerData.brandName || ''}
              onChange={(e) => updateField('brandName', e.target.value)}
              className="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Tagline
            </label>
            <input
              type="text"
              value={footerData.brandTagline || ''}
              onChange={(e) => updateField('brandTagline', e.target.value)}
              className="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition"
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Description
          </label>
          <textarea
            value={footerData.description || ''}
            onChange={(e) => updateField('description', e.target.value)}
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition resize-none"
          />
        </div>
      </div>

      {/* ─── CONTACT INFO ─── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl sm:rounded-3xl border border-gray-200 dark:border-gray-800 p-4 sm:p-6 shadow-sm">
        <h2 className="text-lg sm:text-xl font-bold text-[#374151] dark:text-white mb-4">Contact Information</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              <Mail className="w-4 h-4 inline mr-1 text-[#0D9488]" />
              Email
            </label>
            <input
              type="email"
              value={footerData.contact?.email || ''}
              onChange={(e) => updateField('contact.email', e.target.value)}
              className="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              <Phone className="w-4 h-4 inline mr-1 text-[#F59E0B]" />
              Phone
            </label>
            <input
              type="text"
              value={footerData.contact?.phone || ''}
              onChange={(e) => updateField('contact.phone', e.target.value)}
              className="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              <MapPin className="w-4 h-4 inline mr-1 text-[#0D9488]" />
              Address
            </label>
            <input
              type="text"
              value={footerData.contact?.address || ''}
              onChange={(e) => updateField('contact.address', e.target.value)}
              className="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition"
            />
          </div>
        </div>
      </div>

      {/* ─── FOOTER SECTIONS ─── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl sm:rounded-3xl border border-gray-200 dark:border-gray-800 p-4 sm:p-6 shadow-sm">
        <h2 className="text-lg sm:text-xl font-bold text-[#374151] dark:text-white mb-4">Footer Sections</h2>
        {footerData.sections?.map((section) => (
          <div key={section.sectionId} className="mb-6 last:mb-0 p-3 sm:p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h3 className="font-bold text-[#374151] dark:text-white text-sm sm:text-base">
                {section.title}
              </h3>
              <button
                onClick={() => addLink(section.sectionId)}
                className="px-3 py-1.5 rounded-lg bg-[#0D9488] text-white text-sm hover:bg-[#0D9488]/80 transition flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Add Link
              </button>
            </div>
            <div className="space-y-2">
              {section.links?.map((link, index) => (
                <div key={index} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    type="text"
                    value={link.label || ''}
                    onChange={(e) => updateLink(section.sectionId, index, 'label', e.target.value)}
                    placeholder="Label"
                    className="flex-1 h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition min-w-[80px]"
                  />
                  <input
                    type="text"
                    value={link.path || ''}
                    onChange={(e) => updateLink(section.sectionId, index, 'path', e.target.value)}
                    placeholder="/path"
                    className="flex-1 h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition min-w-[80px]"
                  />
                  <button
                    onClick={() => removeLink(section.sectionId, index)}
                    className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/20 text-red-500 hover:bg-red-200 dark:hover:bg-red-900/40 transition flex items-center justify-center flex-shrink-0 self-end sm:self-auto"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ─── NEWSLETTER SETTINGS ─── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl sm:rounded-3xl border border-gray-200 dark:border-gray-800 p-4 sm:p-6 shadow-sm">
        <h2 className="text-lg sm:text-xl font-bold text-[#374151] dark:text-white mb-4">Newsletter</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Title
            </label>
            <input
              type="text"
              value={footerData.newsletter?.title || ''}
              onChange={(e) => updateField('newsletter.title', e.target.value)}
              className="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Button Text
            </label>
            <input
              type="text"
              value={footerData.newsletter?.buttonText || ''}
              onChange={(e) => updateField('newsletter.buttonText', e.target.value)}
              className="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition"
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Description
          </label>
          <textarea
            value={footerData.newsletter?.description || ''}
            onChange={(e) => updateField('newsletter.description', e.target.value)}
            rows={2}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition resize-none"
          />
        </div>
        <div className="mt-4 flex items-center gap-3">
          <input
            type="checkbox"
            checked={footerData.newsletter?.enabled !== false}
            onChange={(e) => updateField('newsletter.enabled', e.target.checked)}
            className="w-4 h-4 accent-[#0D9488]"
          />
          <span className="text-sm text-[#374151] dark:text-white">Enable Newsletter Section</span>
        </div>
      </div>

      {/* ─── COPYRIGHT ─── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl sm:rounded-3xl border border-gray-200 dark:border-gray-800 p-4 sm:p-6 shadow-sm">
        <h2 className="text-lg sm:text-xl font-bold text-[#374151] dark:text-white mb-4">Copyright</h2>
        <input
          type="text"
          value={footerData.copyrightText || ''}
          onChange={(e) => updateField('copyrightText', e.target.value)}
          className="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition"
          placeholder="AI Tour Rwanda. All rights reserved."
        />
        <p className="text-xs text-gray-400 mt-2">
          © {new Date().getFullYear()} will be automatically added before the copyright text.
        </p>
      </div>
    </div>
  );
};

export default FooterSettings;