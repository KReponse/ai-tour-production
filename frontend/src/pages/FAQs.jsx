// src/pages/FAQs.jsx
// ✅ UPDATED - Connected to FAQ CMS API

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  ChevronDown, 
  ChevronUp,
  Sparkles,
  HelpCircle,
  BookOpen,
  Users,
  Shield,
  CreditCard,
  MapPin,
  Calendar,
  DollarSign,
  MessageCircle,
  Mail,
  Phone,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { getFaqContent } from '../services/faqService';

// ===============================
// AI TOUR COLORS
// ===============================
// Teal  : #0D9488
// Gold  : #F59E0B
// Slate : #374151
// White : #FFFFFF
// ===============================

// ─── Icon Mapper ──────────────────────────────────────────────
const iconMap = {
  'HelpCircle': HelpCircle,
  'Calendar': Calendar,
  'DollarSign': DollarSign,
  'Users': Users,
  'MapPin': MapPin,
  'Shield': Shield,
  'BookOpen': BookOpen,
  'CreditCard': CreditCard,
  'Sparkles': Sparkles,
};

const FAQs = () => {
  const [faqData, setFaqData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    fetchFaqContent();
  }, []);

  const fetchFaqContent = async () => {
    try {
      const response = await getFaqContent();
      if (response?.success && response?.data) {
        setFaqData(response.data);
      }
    } catch (error) {
      console.error('Error loading FAQ content:', error);
    } finally {
      setLoading(false);
    }
  };

  const data = faqData || {};
  const hero = data.hero || {};
  const categories = data.categories || [];
  const faqs = data.faqs || [];

  const filteredFaqs = faqs.filter(faq => {
    const matchesSearch = faq.question?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          faq.answer?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === 'all' || faq.category === activeCategory;
    return matchesSearch && matchesCategory && faq.active !== false;
  });

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-[#0D9488]/20" />
          <div className="absolute inset-0 rounded-full border-4 border-[#0D9488] border-t-transparent animate-spin" />
        </div>
        <p className="mt-4 text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl mx-auto px-4 py-8">

      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0D9488] to-[#F59E0B] p-12 text-white text-center">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur mb-6">
            <HelpCircle className="w-5 h-5" />
            <span className="font-medium">Frequently Asked Questions</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black mb-6">
            {hero.title || 'Got Questions?'}
            <span className="block text-white/90">{hero.subtitle || "We've Got Answers"}</span>
          </h1>
          <p className="text-xl text-white/90 max-w-2xl mx-auto">
            {hero.description || 'Find quick answers to the most common questions about AI Tour Rwanda.'}
          </p>
        </div>
      </section>

      {/* SEARCH */}
      <div className="relative max-w-2xl mx-auto">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Search for answers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 h-14 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent transition outline-none text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
        />
      </div>

      {/* CATEGORIES */}
      {categories.filter(c => c.active !== false).length > 0 && (
        <div className="flex flex-wrap justify-center gap-2">
          {/* All category */}
          <button
            onClick={() => setActiveCategory('all')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
              activeCategory === 'all'
                ? 'bg-[#0D9488] text-white shadow-lg shadow-[#0D9488]/30'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            All
          </button>
          {categories.filter(c => c.active !== false).map((cat) => {
            const Icon = iconMap[cat.icon] || HelpCircle;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                  isActive
                    ? 'bg-[#0D9488] text-white shadow-lg shadow-[#0D9488]/30'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {cat.label}
              </button>
            );
          })}
        </div>
      )}

      {/* FAQ LIST */}
      {filteredFaqs.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-16 text-center border border-gray-100 dark:border-gray-800 shadow-sm">
          <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-[#374151] dark:text-white">No results found</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Try adjusting your search or category filter
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-w-4xl mx-auto">
          {filteredFaqs.map((faq) => {
            const isExpanded = expandedId === faq.id;
            return (
              <div
                key={faq.id}
                className={`bg-white dark:bg-gray-900 rounded-2xl border transition-all duration-300 ${
                  isExpanded
                    ? 'border-[#0D9488] shadow-lg shadow-[#0D9488]/10'
                    : 'border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700'
                }`}
              >
                <button
                  onClick={() => toggleExpand(faq.id)}
                  className="w-full flex items-center justify-between p-5 text-left group"
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                      isExpanded ? 'bg-[#0D9488]' : 'bg-gray-300 dark:bg-gray-600'
                    }`} />
                    <span className={`font-semibold ${
                      isExpanded ? 'text-[#0D9488]' : 'text-[#374151] dark:text-white'
                    }`}>
                      {faq.question}
                    </span>
                  </div>
                  <div className={`p-1 rounded-lg transition-colors flex-shrink-0 ml-4 ${
                    isExpanded ? 'bg-[#0D9488]/10 text-[#0D9488]' : 'text-gray-400 group-hover:text-[#0D9488]'
                  }`}>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </div>
                </button>
                {isExpanded && (
                  <div className="px-5 pb-5 pl-12">
                    <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                      <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
                      <CheckCircle className="w-3 h-3 text-[#0D9488]" />
                      <span>Category: {faq.category}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* STILL HAVE QUESTIONS */}
      <section className="bg-white dark:bg-gray-900 rounded-3xl p-8 border border-gray-100 dark:border-gray-800 text-center shadow-sm">
        <div className="flex items-center justify-center gap-2 mb-4">
          <MessageCircle className="w-8 h-8 text-[#0D9488]" />
          <h2 className="text-2xl font-black text-[#374151] dark:text-white">
            Still Have Questions?
          </h2>
        </div>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          Our support team is here to help you 24/7.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <a
            href="/contact"
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-[#0D9488] to-[#F59E0B] text-white font-semibold shadow-lg shadow-[#0D9488]/30 hover:scale-[1.02] transition-all duration-300"
          >
            <Mail className="w-5 h-5" />
            Contact Us
          </a>
          <a
            href="/help"
            className="flex items-center gap-2 px-6 py-3 rounded-2xl border-2 border-gray-200 dark:border-gray-700 text-[#374151] dark:text-white font-semibold hover:border-[#0D9488] hover:text-[#0D9488] transition-all duration-300"
          >
            <BookOpen className="w-5 h-5" />
            Help Center
          </a>
        </div>
        <div className="mt-4 flex justify-center items-center gap-4 text-sm text-gray-400">
          <a href="mailto:support@aitour.rw" className="hover:text-[#0D9488] transition">
            support@aitour.rw
          </a>
          <span>•</span>
          <a href="tel:+250791468299" className="hover:text-[#0D9488] transition">
            +250 791 468 299
          </a>
        </div>
      </section>
    </div>
  );
};

export default FAQs;