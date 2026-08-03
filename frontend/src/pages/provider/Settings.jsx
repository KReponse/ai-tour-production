// src/pages/provider/Settings.jsx

import React, { useState } from 'react';
import {
  Bell,
  Lock,
  Globe,
  Moon,
  ShieldCheck,
  Save,
  Sparkles,
  User,
  Mail,
  Phone,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

// ===============================
// AI TOUR COLORS
// ===============================
// Teal  : #0D9488
// Gold  : #F59E0B
// Slate : #374151
// White : #FFFFFF
// ===============================

const Settings = () => {
  const { darkMode: themeDark, toggleTheme } = useTheme();
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(themeDark);
  const [language, setLanguage] = useState('English');
  const [loading, setLoading] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: '',
  });

  const handlePasswordChange = (e) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    // Simulate save
    setTimeout(() => {
      setLoading(false);
      alert('Settings saved successfully! ✅');
    }, 1500);
  };

  // Toggle dark mode with theme context
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    toggleTheme();
  };

  // Toggle switch component
  const ToggleSwitch = ({ enabled, onChange }) => (
    <button
      onClick={onChange}
      className={`
        w-14 h-8 rounded-full transition-all duration-300 relative
        ${enabled ? 'bg-[#0D9488]' : 'bg-gray-300 dark:bg-gray-600'}
        shadow-inner
      `}
    >
      <div
        className={`
          absolute top-1 w-6 h-6 rounded-full bg-white transition-all duration-300 shadow-md
          ${enabled ? 'left-7' : 'left-1'}
        `}
      />
    </button>
  );

  // Settings card component
  const SettingsCard = ({ icon: Icon, iconGradient, title, description, children, className = '' }) => (
    <div className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 ${className}`}>
      <div className="flex items-center gap-4 mb-5">
        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${iconGradient} text-white flex items-center justify-center shadow-lg`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-black text-[#374151] dark:text-white">
            {title}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {description}
          </p>
        </div>
      </div>
      {children}
    </div>
  );

  return (
    <div className="space-y-8 animate-fade-in">

      {/* HEADER - Updated with AI Tour colors */}
      <div>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0D9488] to-[#F59E0B] flex items-center justify-center shadow-lg">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-[#374151] dark:text-white">
              Provider Settings
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Manage account preferences and security
            </p>
          </div>
        </div>
      </div>

      {/* SETTINGS GRID */}
      <div className="grid xl:grid-cols-2 gap-8">

        {/* LEFT COLUMN */}
        <div className="space-y-6">

          {/* NOTIFICATIONS - Updated with AI Tour colors */}
          <SettingsCard
            icon={Bell}
            iconGradient="from-[#0D9488] to-[#0f766e]"
            title="Notifications"
            description="Receive booking and traveler alerts"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-300">
                {notifications ? 'Enabled' : 'Disabled'}
              </span>
              <ToggleSwitch enabled={notifications} onChange={() => setNotifications(!notifications)} />
            </div>
          </SettingsCard>

          {/* DARK MODE - Updated with AI Tour colors */}
          <SettingsCard
            icon={Moon}
            iconGradient="from-[#F59E0B] to-[#d97706]"
            title="Dark Mode"
            description="Switch dashboard appearance"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-300">
                {darkMode ? 'Dark' : 'Light'}
              </span>
              <ToggleSwitch enabled={darkMode} onChange={toggleDarkMode} />
            </div>
          </SettingsCard>

          {/* LANGUAGE - Updated with AI Tour colors */}
          <SettingsCard
            icon={Globe}
            iconGradient="from-[#0D9488] to-[#0f766e]"
            title="Language"
            description="Select preferred language"
          >
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full h-14 rounded-2xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 outline-none focus:ring-2 focus:ring-[#0D9488] focus:border-transparent transition dark:text-white"
            >
              <option>English</option>
              <option>French</option>
              <option>Kinyarwanda</option>
              <option>Swahili</option>
            </select>
          </SettingsCard>

        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">

          {/* CHANGE PASSWORD - Updated with AI Tour colors */}
          <SettingsCard
            icon={Lock}
            iconGradient="from-[#F59E0B] to-[#d97706]"
            title="Change Password"
            description="Update your security credentials"
          >
            <div className="space-y-4">
              <input
                type="password"
                name="current"
                placeholder="Current Password"
                value={passwordData.current}
                onChange={handlePasswordChange}
                className="w-full h-14 rounded-2xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 outline-none focus:ring-2 focus:ring-[#0D9488] focus:border-transparent transition dark:text-white"
              />
              <input
                type="password"
                name="new"
                placeholder="New Password"
                value={passwordData.new}
                onChange={handlePasswordChange}
                className="w-full h-14 rounded-2xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 outline-none focus:ring-2 focus:ring-[#0D9488] focus:border-transparent transition dark:text-white"
              />
              <input
                type="password"
                name="confirm"
                placeholder="Confirm Password"
                value={passwordData.confirm}
                onChange={handlePasswordChange}
                className="w-full h-14 rounded-2xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 outline-none focus:ring-2 focus:ring-[#0D9488] focus:border-transparent transition dark:text-white"
              />
              {passwordData.new && passwordData.confirm && passwordData.new !== passwordData.confirm && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  Passwords do not match
                </p>
              )}
            </div>
          </SettingsCard>

          {/* SECURITY - Updated with AI Tour colors */}
          <SettingsCard
            icon={ShieldCheck}
            iconGradient="from-[#0D9488] to-[#0f766e]"
            title="Security Status"
            description="Your account is protected"
          >
            <div className="p-4 rounded-2xl bg-[#0D9488]/10 dark:bg-[#0D9488]/20 border border-[#0D9488]/20 flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-[#0D9488]" />
              <span className="font-semibold text-[#0D9488]">
                2-Step Verification Enabled
              </span>
            </div>
            <div className="mt-3 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Last login</span>
                <span className="font-medium text-[#374151] dark:text-white">
                  {new Date().toLocaleString()}
                </span>
              </div>
            </div>
          </SettingsCard>

          {/* SAVE BUTTON - Updated with AI Tour colors */}
          <button
            onClick={handleSaveSettings}
            disabled={loading}
            className="w-full h-14 rounded-2xl bg-gradient-to-r from-[#0D9488] to-[#F59E0B] text-white font-bold shadow-xl shadow-[#0D9488]/30 hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-3"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Save Settings
              </>
            )}
          </button>

        </div>

      </div>
    </div>
  );
};

export default Settings;