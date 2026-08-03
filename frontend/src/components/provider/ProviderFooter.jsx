// src/components/provider/ProviderFooter.jsx
// ✅ FIXED - Added developer attribution with Reponse Dev link
// ✅ Consistent with main footer design

import React from 'react';
import {
  Facebook,
  Instagram,
  Twitter,
  Linkedin,
  Youtube,
  Sparkles,
  Shield,
  Heart,
} from 'lucide-react';
import { Link } from 'react-router-dom';

// ===============================
// AI TOUR COLORS
// ===============================
// Teal  : #0D9488
// Gold  : #F59E0B
// Slate : #374151
// White : #FFFFFF
// ===============================

const ProviderFooter = () => {
  const currentYear = new Date().getFullYear();

  const socialLinks = [
    { icon: Facebook, label: 'Facebook', color: '#1877F2' },
    { icon: Instagram, label: 'Instagram', color: '#E4405F' },
    { icon: Twitter, label: 'Twitter', color: '#1DA1F2' },
    { icon: Linkedin, label: 'LinkedIn', color: '#0A66C2' },
    { icon: Youtube, label: 'YouTube', color: '#FF0000' },
  ];

  // ✅ Fixed: Support -> Help Center
  const quickLinks = [
    { label: 'Privacy Policy', path: '/privacy' },
    { label: 'Terms of Service', path: '/terms' },
    { label: 'Help Center', path: '/help' },
    { label: 'Contact', path: '/contact' },
  ];

  return (
    <footer className="mt-10 border-t border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl">
      
      {/* MAIN FOOTER */}
      <div className="px-6 py-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 max-w-7xl mx-auto">
        
        {/* LEFT - Brand */}
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#0D9488] to-[#F59E0B] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-black bg-gradient-to-r from-[#0D9488] to-[#F59E0B] bg-clip-text text-transparent">
              AI Tour Rwanda
            </h2>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Provider Dashboard Management System
          </p>
          <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
            <Shield className="w-3 h-3 text-[#0D9488]" />
            <span>Secure Provider Platform</span>
          </div>
        </div>

        {/* CENTER - Quick Links */}
        <div className="flex flex-wrap items-center gap-5 text-sm font-medium text-gray-600 dark:text-gray-300">
          {quickLinks.map((link) => (
            <Link
              key={link.label}
              to={link.path}
              className="hover:text-[#0D9488] transition-all duration-300 hover:scale-105"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* RIGHT - Social Links */}
        <div className="flex items-center gap-2">
          {socialLinks.map((social, index) => {
            const Icon = social.icon;
            return (
              <button
                key={index}
                className="w-10 h-10 rounded-2xl bg-gray-100 dark:bg-gray-800 hover:bg-[#0D9488] hover:text-white transition-all duration-300 flex items-center justify-center group hover:scale-110 hover:shadow-lg hover:shadow-[#0D9488]/30"
                aria-label={social.label}
              >
                <Icon className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
              </button>
            );
          })}
        </div>
      </div>

      {/* BOTTOM BAR - Updated with developer attribution */}
      <div className="border-t border-gray-200 dark:border-gray-800 py-4 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-500 dark:text-gray-400">
          <p>
            © {currentYear} AI Tour Rwanda — All rights reserved.
          </p>
          
          <div className="flex items-center gap-4 text-xs flex-wrap justify-center">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#0D9488]" />
              Provider
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              Made with in Rwanda 🇷🇼
            </span>
            <span>•</span>
            <span>✦</span>
            <span className="text-gray-500">by</span>
            <a
              href="https://reponse-dev.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#0D9488] font-medium hover:text-[#0D9488]/80 transition-colors duration-300 hover:underline hover:underline-offset-2 hover:opacity-80"
              aria-label="Reponse Dev - Developer Portfolio"
            >
              Reponse Dev
            </a>
            <span>•</span>
            <span className="text-[#0D9488]">v2.0</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default ProviderFooter;