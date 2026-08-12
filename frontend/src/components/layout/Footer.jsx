// src/components/layout/Footer.jsx
// ✅ COMPLETE FIXED - Removed heart icon, kept text heart
// ✅ ADDED: Developer portfolio attribution with Reponse Dev link
// ✅ ADDED: Minor polish for text heart

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Facebook,
  Instagram,
  Twitter,
  Linkedin,
  Youtube,
  Mail,
  Phone,
  MapPin,
  Globe,
  Send,
  Heart,
  Sparkles,
  Loader2,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { getFooterContent } from '../../services/footerService';
import { subscribeToNewsletter } from '../../services/newsletterService';
import logo from '../../assets/images/logo.png';
import toast from 'react-hot-toast';

// ===============================
// AI TOUR COLORS
// ===============================
// Teal  : #0D9488
// Gold  : #F59E0B
// Slate : #374151
// White : #FFFFFF
// ===============================

// ─── Static Quick Links (Always visible) ──────────────────────
const QUICK_LINKS = [
  { name: 'Home', path: '/' },
  { name: 'Explore', path: '/explore' },
  { name: 'AI Planner', path: '/ai-planner' },
  { name: 'Trips', path: '/trips' },
  { name: 'Reviews', path: '/reviews' },
];

// ─── Social Links (including TikTok) ──────────────────────────
const SOCIAL_ITEMS = [
  { key: 'facebook', Icon: Facebook, color: '#1877F2', label: 'Facebook' },
  { key: 'instagram', Icon: Instagram, color: '#E4405F', label: 'Instagram' },
  { key: 'twitter', Icon: Twitter, color: '#1DA1F2', label: 'Twitter' },
  { key: 'linkedin', Icon: Linkedin, color: '#0A66C2', label: 'LinkedIn' },
  { key: 'youtube', Icon: Youtube, color: '#FF0000', label: 'YouTube' },
  { key: 'tiktok', Icon: Globe, color: '#000000', label: 'TikTok' },
];

// ─── Fallback Data ──────────────────────────────────────────────
const getFallbackData = () => ({
  brandName: 'AI Tour Rwanda',
  brandTagline: 'Smart Tourism Platform',
  description: 'Discover Rwanda with AI-powered travel planning, smart recommendations, bookings, and unforgettable experiences.',
  contact: {
    email: 'aitourrwanda@gmail.com',
    phone: '+250 791 468 299',
    address: 'Kigali, Rwanda',
  },
  socialLinks: {
    facebook: '',
    instagram: '',
    twitter: '',
    linkedin: '',
    youtube: '',
    tiktok: '',
  },
  sections: [
    {
      sectionId: 'company',
      title: 'Company',
      links: [
        { label: 'About Us', path: '/about' },
        { label: 'Careers', path: '/careers' },
        { label: 'Blog', path: '/blog' },
        { label: 'Contact', path: '/contact' },
      ],
    },
    {
      sectionId: 'support',
      title: 'Support',
      links: [
        { label: 'Help Center', path: '/help' },
        { label: 'FAQs', path: '/faqs' },
      ],
    },
    {
      sectionId: 'legal',
      title: 'Legal',
      links: [
        { label: 'Privacy Policy', path: '/privacy' },
        { label: 'Terms & Conditions', path: '/terms' },
      ],
    },
  ],
  newsletter: {
    enabled: true,
    title: 'Travel Smarter with AI',
    description: 'Subscribe for AI travel tips, destination updates, and exclusive Rwanda experiences.',
    placeholder: 'Enter your email',
    buttonText: 'Subscribe',
  },
  copyrightText: 'AI Tour Rwanda. All rights reserved.',
});

const Footer = () => {
  const [footerData, setFooterData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);
  const [newsletterLoading, setNewsletterLoading] = useState(false);
  const [newsletterError, setNewsletterError] = useState('');

  const hasFetchedRef = React.useRef(false);

  const fallbackData = useMemo(() => getFallbackData(), []);
  const currentYear = useMemo(() => new Date().getFullYear(), []);

  const fetchFooterContent = useCallback(async () => {
    try {
      const data = await getFooterContent();
      if (data?.success && data?.data) {
        setFooterData(data.data);
      } else {
        setFooterData(fallbackData);
      }
    } catch (error) {
      console.error('Error loading footer:', error);
      setFooterData(fallbackData);
    } finally {
      setLoading(false);
    }
  }, [fallbackData]);

  useEffect(() => {
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchFooterContent();
    }
  }, [fetchFooterContent]);

  const handleNewsletterSubmit = useCallback(async (e) => {
    e.preventDefault();
    const email = newsletterEmail.trim();
    
    if (!email) {
      setNewsletterError('Please enter your email address');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setNewsletterError('Please enter a valid email address');
      return;
    }

    setNewsletterError('');
    setNewsletterLoading(true);

    try {
      await subscribeToNewsletter(email);
      setNewsletterSubscribed(true);
      setNewsletterEmail('');
      toast.success('Successfully subscribed to our newsletter! 🎉');
      
      setTimeout(() => setNewsletterSubscribed(false), 5000);
    } catch (error) {
      console.error('Newsletter subscription error:', error);
      
      if (error.response?.status === 409) {
        toast.error('This email is already subscribed!');
      } else {
        toast.error('Failed to subscribe. Please try again later.');
      }
      
      setNewsletterError(error.response?.data?.message || 'Subscription failed. Please try again.');
    } finally {
      setNewsletterLoading(false);
    }
  }, [newsletterEmail]);

  const handleNewsletterChange = useCallback((e) => {
    setNewsletterEmail(e.target.value);
    setNewsletterError('');
  }, []);

  const data = useMemo(() => footerData || fallbackData, [footerData, fallbackData]);
  const sections = useMemo(() => data.sections || [], [data.sections]);

  const hasSocialLinks = useMemo(() => 
    data.socialLinks && 
    Object.values(data.socialLinks).some(url => url && url.trim() !== ''),
    [data.socialLinks]
  );

  if (loading) {
    return (
      <footer className="relative mt-24 bg-gradient-to-br from-[#374151]/95 via-[#1a1a2e] to-[#0D9488]/10 text-white overflow-hidden">
        <div className="relative z-10 max-w-7xl mx-auto px-4 lg:px-8 py-16">
          <div className="flex justify-center items-center h-40">
            <Loader2 className="w-8 h-8 animate-spin text-[#0D9488]" />
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="relative mt-24 bg-gradient-to-br from-[#374151]/95 via-[#1a1a2e] to-[#0D9488]/10 text-white overflow-hidden">

      {/* BACKGROUND EFFECT */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-72 h-72 bg-[#0D9488] rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-72 h-72 bg-[#F59E0B] rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#0D9488] rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 lg:px-8 py-16">

        {/* TOP GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-10">

          {/* BRAND */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-5">
              <img src={logo} alt={data.brandName} className="w-12 h-12 object-contain" />
              <div>
                <h2 className="text-2xl font-black bg-gradient-to-r from-[#0D9488] to-[#F59E0B] bg-clip-text text-transparent">
                  {data.brandName}
                </h2>
                <p className="text-sm text-gray-400">{data.brandTagline}</p>
              </div>
            </div>

            <p className="text-gray-400 leading-relaxed mb-6 max-w-md">
              {data.description}
            </p>

            {/* CONTACT */}
            <div className="space-y-3 text-sm text-gray-400">
              {data.contact?.email && (
                <div className="flex items-center gap-3">
                  <Mail size={16} className="text-[#0D9488]" />
                  <a href={`mailto:${data.contact.email}`} className="hover:text-white transition">
                    {data.contact.email}
                  </a>
                </div>
              )}
              {data.contact?.phone && (
                <div className="flex items-center gap-3">
                  <Phone size={16} className="text-[#F59E0B]" />
                  <a href={`tel:${data.contact.phone}`} className="hover:text-white transition">
                    {data.contact.phone}
                  </a>
                </div>
              )}
              {data.contact?.address && (
                <div className="flex items-center gap-3">
                  <MapPin size={16} className="text-[#0D9488]" />
                  <span>{data.contact.address}</span>
                </div>
              )}
            </div>

            {/* SOCIALS - Dynamic from backend */}
            {hasSocialLinks && (
              <div className="flex items-center gap-4 mt-6 flex-wrap">
                {SOCIAL_ITEMS.map(({ key, Icon, color, label }) => {
                  const url = data.socialLinks?.[key];
                  if (!url || url.trim() === '') return null;
                  return (
                    <motion.a
                      key={key}
                      whileHover={{ scale: 1.15, y: -3 }}
                      whileTap={{ scale: 0.95 }}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 rounded-full bg-white/10 border border-white/10 flex items-center justify-center hover:bg-[#0D9488] transition-all duration-300"
                      style={{ color: 'white' }}
                      aria-label={label}
                    >
                      <Icon size={18} />
                    </motion.a>
                  );
                })}
              </div>
            )}
          </div>

          {/* QUICK LINKS (Static) */}
          <div>
            <h3 className="text-lg font-bold mb-5 text-white">Quick Links</h3>
            <div className="space-y-3">
              {QUICK_LINKS.map((link, index) => (
                <Link
                  key={index}
                  to={link.path}
                  className="block text-gray-400 hover:text-[#0D9488] transition duration-300"
                >
                  {link.name}
                </Link>
              ))}
            </div>
          </div>

          {/* DYNAMIC SECTIONS */}
          {sections.map((section) => (
            <div key={section.sectionId}>
              <h3 className="text-lg font-bold mb-5 text-white">{section.title}</h3>
              <div className="space-y-3">
                {section.links?.filter(link => link.active !== false).map((link, index) => (
                  <Link
                    key={index}
                    to={link.path}
                    className="block text-gray-400 hover:text-[#0D9488] transition duration-300"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* NEWSLETTER */}
        {data.newsletter?.enabled !== false && (
          <div className="mt-16 rounded-3xl bg-white/5 border border-white/10 p-8 flex flex-col lg:flex-row items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Sparkles className="text-[#F59E0B]" />
                <h3 className="text-2xl font-bold text-white">
                  {data.newsletter?.title || 'Travel Smarter with AI'}
                </h3>
              </div>
              <p className="text-gray-400">
                {data.newsletter?.description || 'Subscribe for AI travel tips, destination updates, and exclusive Rwanda experiences.'}
              </p>
            </div>

            <form onSubmit={handleNewsletterSubmit} className="flex flex-col w-full lg:w-auto gap-2">
              <div className="flex w-full lg:w-auto items-center gap-3">
                <input
                  type="email"
                  placeholder={data.newsletter?.placeholder || 'Enter your email'}
                  value={newsletterEmail}
                  onChange={handleNewsletterChange}
                  className={`w-full lg:w-80 h-14 px-5 rounded-2xl bg-white/10 border ${
                    newsletterError ? 'border-red-500' : 'border-white/10'
                  } outline-none text-white placeholder:text-gray-400 focus:border-[#0D9488] transition focus:ring-2 focus:ring-[#0D9488]/30`}
                  required
                  disabled={newsletterLoading || newsletterSubscribed}
                />
                <button
                  type="submit"
                  disabled={newsletterLoading || newsletterSubscribed}
                  className="h-14 px-6 rounded-2xl bg-gradient-to-r from-[#0D9488] to-[#F59E0B] font-semibold hover:scale-105 transition duration-300 flex items-center gap-2 shadow-lg shadow-[#0D9488]/30 whitespace-nowrap disabled:opacity-50 disabled:hover:scale-100"
                >
                  {newsletterLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : newsletterSubscribed ? (
                    <>
                      <CheckCircle size={18} />
                      <span>Subscribed</span>
                    </>
                  ) : (
                    <>
                      <Send size={18} />
                      {data.newsletter?.buttonText || 'Subscribe'}
                    </>
                  )}
                </button>
              </div>
              {newsletterError && (
                <p className="text-red-400 text-sm flex items-center gap-1">
                  <AlertCircle size={14} />
                  {newsletterError}
                </p>
              )}
              {newsletterSubscribed && (
                <p className="text-green-400 text-sm flex items-center gap-1">
                  <CheckCircle size={14} />
                  Thank you for subscribing! Check your email for updates.
                </p>
              )}
            </form>
          </div>
        )}

        {/* ✅ BOTTOM - Text heart (no icon), developer attribution */}
        <div className="mt-12 pt-6 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500 text-center md:text-left">
            © {currentYear} {data.brandName}. {data.copyrightText || 'All rights reserved.'}
          </p>

          <div className="flex items-center gap-2 text-sm text-gray-500 flex-wrap justify-center">
            <span>Built with <span className="text-red-500 inline-block">❤️</span> in Rwanda 🇷🇼</span>
            <span className="text-[#0D9488] ml-1">✦</span>
            <span className="text-gray-500 ml-1">by</span>
            <a
              href="https://reponse-dev.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#0D9488] font-medium hover:text-[#F59E0B] transition-colors duration-300 hover:underline hover:underline-offset-2 group"
              aria-label="Reponse Dev - Developer Portfolio"
            >
              <span className="group-hover:opacity-80 transition-opacity">Reponse Dev</span>
              <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">✨</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;