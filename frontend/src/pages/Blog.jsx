// src/pages/Blog.jsx
// ✅ UPDATED - Connected to Blog CMS API

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, 
  Calendar, 
  User, 
  Tag, 
  Sparkles,
  Loader2,
  PlayCircle,
  Image,
} from 'lucide-react';
import { getBlogContent } from '../services/blogService';

const Blog = () => {
  const [blogData, setBlogData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    fetchBlogContent();
  }, []);

  const fetchBlogContent = async () => {
    try {
      const response = await getBlogContent();
      if (response?.success && response?.data) {
        setBlogData(response.data);
      }
    } catch (error) {
      console.error('Error loading blog content:', error);
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

  const data = blogData || {};
  const hero = data.hero || {};
  const categories = data.categories || [];
  const posts = data.posts || [];
  const featuredPosts = data.featuredPosts || [];

  const publishedPosts = posts.filter(p => p.published === true && p.active !== false);
  
  const filteredPosts = publishedPosts.filter(post => {
    const matchesSearch = post.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          post.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          post.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || post.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const featured = publishedPosts.filter(p => featuredPosts.includes(p.slug));

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl mx-auto px-4 py-8">

      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0D9488] to-[#F59E0B] p-12 text-white text-center">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur mb-6">
            <Sparkles className="w-5 h-5" />
            <span className="font-medium">Travel Stories & Insights</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black mb-6">
            {hero.title || 'Travel Stories & Insights'}
          </h1>
          <p className="text-xl text-white/90 max-w-2xl mx-auto">
            {hero.subtitle || 'Discover Rwanda through the eyes of travelers, locals, and experts.'}
          </p>
        </div>
      </section>

      {/* SEARCH */}
      <div className="relative max-w-2xl mx-auto">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Search articles..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 h-14 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent transition outline-none text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
        />
      </div>

      {/* CATEGORIES */}
      {categories.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2">
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
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                selectedCategory === cat
                  ? 'bg-[#0D9488] text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* FEATURED POSTS */}
      {featured.length > 0 && (
        <section>
          <h2 className="text-2xl font-black text-[#374151] dark:text-white mb-4">Featured Stories</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {featured.slice(0, 2).map((post, idx) => (
              <Link
                key={idx}
                to={`/blog/${post.slug}`}
                className="group bg-white dark:bg-gray-900 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 hover:shadow-xl transition"
              >
                <div className="relative h-48 bg-gray-200 dark:bg-gray-700">
                  {post.coverVideo ? (
                    <video
                      src={post.coverVideo}
                      className="w-full h-full object-cover"
                      muted
                      playsInline
                    />
                  ) : post.coverImage ? (
                    <img
                      src={post.coverImage}
                      alt={post.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#0D9488]/20 to-[#F59E0B]/20">
                      <Sparkles className="w-12 h-12 text-[#0D9488]" />
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-2 text-sm text-[#0D9488] mb-2">
                    <span className="px-2 py-0.5 rounded-full bg-[#0D9488]/10 text-xs">{post.category}</span>
                    <span>•</span>
                    <span className="text-gray-400">{new Date(post.publishedAt).toLocaleDateString()}</span>
                  </div>
                  <h3 className="text-xl font-bold text-[#374151] dark:text-white group-hover:text-[#0D9488] transition">
                    {post.title}
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">{post.excerpt}</p>
                  <div className="mt-4 flex items-center gap-2 text-sm text-gray-400">
                    <User className="w-4 h-4" />
                    <span>{post.author}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ALL POSTS */}
      <section>
        <h2 className="text-2xl font-black text-[#374151] dark:text-white mb-4">
          {searchTerm ? 'Search Results' : 'Latest Articles'}
        </h2>
        {filteredPosts.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-12 text-center border border-gray-100 dark:border-gray-800">
            <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-[#374151] dark:text-white">No posts found</h3>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              Try adjusting your search or category filter
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPosts.map((post, idx) => (
              <Link
                key={idx}
                to={`/blog/${post.slug}`}
                className="group bg-white dark:bg-gray-900 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 hover:shadow-xl transition"
              >
                <div className="relative h-40 bg-gray-200 dark:bg-gray-700">
                  {post.coverVideo ? (
                    <video
                      src={post.coverVideo}
                      className="w-full h-full object-cover"
                      muted
                      playsInline
                    />
                  ) : post.coverImage ? (
                    <img
                      src={post.coverImage}
                      alt={post.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#0D9488]/10 to-[#F59E0B]/10">
                      <Sparkles className="w-8 h-8 text-[#0D9488]" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-2 text-sm text-[#0D9488] mb-1">
                    <span className="px-2 py-0.5 rounded-full bg-[#0D9488]/10 text-xs">{post.category}</span>
                  </div>
                  <h3 className="font-bold text-[#374151] dark:text-white group-hover:text-[#0D9488] transition line-clamp-2">
                    {post.title}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{post.excerpt}</p>
                  <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
                    <span>{new Date(post.publishedAt).toLocaleDateString()}</span>
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {post.author}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Blog;