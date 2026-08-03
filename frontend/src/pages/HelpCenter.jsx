// src/pages/HelpCenter.jsx
// ✅ UPDATED - Connected to Help Center CMS API

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  BookOpen, 
  Calendar, 
  DollarSign, 
  Users, 
  MapPin, 
  Shield,
  Sparkles,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { getHelpContent } from '../services/helpService';

// ─── Icon Mapper ──────────────────────────────────────────────
const iconMap = {
  'BookOpen': BookOpen,
  'Calendar': Calendar,
  'DollarSign': DollarSign,
  'Users': Users,
  'MapPin': MapPin,
  'Shield': Shield,
  'HelpCircle': BookOpen,
};

const HelpCenter = () => {
  const [helpData, setHelpData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    fetchHelpContent();
  }, []);

  const fetchHelpContent = async () => {
    try {
      const response = await getHelpContent();
      if (response?.success && response?.data) {
        setHelpData(response.data);
      }
    } catch (error) {
      console.error('Error loading help content:', error);
    } finally {
      setLoading(false);
    }
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

  const data = helpData || {};
  const hero = data.hero || {};
  const categories = data.categories || [];
  const articles = data.articles || [];
  const featuredArticles = data.featuredArticles || [];

  const filteredArticles = articles.filter(article => {
    const matchesSearch = article.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          article.content?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || article.category === selectedCategory;
    return matchesSearch && matchesCategory && article.active !== false;
  });

  const featured = articles.filter(a => featuredArticles.includes(a.slug) && a.active !== false);

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl mx-auto px-4 py-8">

      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0D9488] to-[#F59E0B] p-12 text-white text-center">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur mb-6">
            <BookOpen className="w-5 h-5" />
            <span className="font-medium">Help Center</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black mb-6">
            {hero.title || 'How Can We Help You?'}
          </h1>
          <p className="text-xl text-white/90 max-w-2xl mx-auto">
            {hero.subtitle || 'Find guides, tutorials, and answers to common questions.'}
          </p>
        </div>
      </section>

      {/* SEARCH */}
      <div className="relative max-w-2xl mx-auto">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Search for help articles..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 h-14 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent transition outline-none text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
        />
      </div>

      {/* FEATURED ARTICLES */}
      {featured.length > 0 && (
        <section>
          <h2 className="text-2xl font-black text-[#374151] dark:text-white mb-4">Featured Articles</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {featured.map((article, idx) => (
              <Link
                key={idx}
                to={`/help/${article.slug}`}
                className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 hover:shadow-lg transition group"
              >
                <h3 className="text-lg font-bold text-[#374151] dark:text-white group-hover:text-[#0D9488] transition">
                  {article.title}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{article.excerpt}</p>
                <div className="mt-4 flex items-center gap-2 text-[#0D9488] font-medium text-sm">
                  Read More <ChevronRight className="w-4 h-4" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* CATEGORIES */}
      {categories.filter(c => c.active !== false).length > 0 && (
        <section>
          <h2 className="text-2xl font-black text-[#374151] dark:text-white mb-4">Browse by Category</h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                selectedCategory === 'all'
                  ? 'bg-[#0D9488] text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              All
            </button>
            {categories.filter(c => c.active !== false).map((cat) => {
              const Icon = iconMap[cat.icon] || BookOpen;
              const isActive = selectedCategory === cat.slug;
              return (
                <button
                  key={cat.slug}
                  onClick={() => setSelectedCategory(cat.slug)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
                    isActive
                      ? 'bg-[#0D9488] text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {cat.name}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* ARTICLES LIST */}
      <section>
        <h2 className="text-2xl font-black text-[#374151] dark:text-white mb-4">
          {searchTerm ? 'Search Results' : 'All Articles'}
        </h2>
        {filteredArticles.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-12 text-center border border-gray-100 dark:border-gray-800">
            <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-[#374151] dark:text-white">No articles found</h3>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              Try adjusting your search or category filter
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {filteredArticles.map((article, idx) => (
              <Link
                key={idx}
                to={`/help/${article.slug}`}
                className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 hover:shadow-lg transition group"
              >
                <h3 className="text-lg font-bold text-[#374151] dark:text-white group-hover:text-[#0D9488] transition">
                  {article.title}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{article.excerpt || article.content?.slice(0, 120) + '...'}</p>
                <div className="mt-4 flex items-center gap-2 text-[#0D9488] font-medium text-sm">
                  Read More <ChevronRight className="w-4 h-4" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default HelpCenter;