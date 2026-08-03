// src/pages/admin/BlogSettings.jsx
// ✅ NEW - Blog Settings Admin Page

import React, { useState, useEffect } from 'react';
import {
  Save,
  Loader2,
  RefreshCw,
  AlertCircle,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Image,
  Video,
} from 'lucide-react';
import { getBlogContent, updateBlogContent, resetBlogContent } from '../../services/blogService';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const BlogSettings = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState(null);
  const [expandedPosts, setExpandedPosts] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await getBlogContent();
      if (response?.success && response?.data) {
        setData(response.data);
      }
    } catch (error) {
      console.error('Error fetching blog data:', error);
      toast.error('Failed to load blog content');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateBlogContent(data, token);
      toast.success('Blog content updated successfully!');
    } catch (error) {
      console.error('Error saving blog:', error);
      toast.error('Failed to save blog content');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (window.confirm('Reset blog content to defaults? This cannot be undone.')) {
      try {
        await resetBlogContent(token);
        await fetchData();
        toast.success('Blog content reset to defaults');
      } catch (error) {
        console.error('Error resetting blog:', error);
        toast.error('Failed to reset blog content');
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

  const addCategory = () => {
    setData(prev => ({
      ...prev,
      categories: [...(prev.categories || []), ''],
    }));
  };

  const removeCategory = (index) => {
    setData(prev => ({
      ...prev,
      categories: prev.categories.filter((_, i) => i !== index),
    }));
  };

  const updateCategory = (index, value) => {
    setData(prev => ({
      ...prev,
      categories: prev.categories.map((cat, i) => {
        if (i === index) return value;
        return cat;
      }),
    }));
  };

  const addPost = () => {
    setData(prev => ({
      ...prev,
      posts: [
        ...(prev.posts || []),
        { title: '', slug: `post-${Date.now()}`, category: prev.categories?.[0] || '', tags: [], content: '', excerpt: '', coverImage: '', coverVideo: '', author: '', authorImage: '', published: false, featured: false, publishedAt: new Date(), seoTitle: '', seoDescription: '', seoKeywords: '', order: prev.posts?.length || 0, active: true },
      ],
    }));
  };

  const removePost = (index) => {
    setData(prev => ({
      ...prev,
      posts: prev.posts.filter((_, i) => i !== index),
    }));
  };

  const updatePost = (index, field, value) => {
    setData(prev => ({
      ...prev,
      posts: prev.posts.map((post, i) => {
        if (i === index) return { ...post, [field]: value };
        return post;
      }),
    }));
  };

  const togglePostExpand = (index) => {
    setExpandedPosts(prev =>
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const toggleFeatured = (slug) => {
    setData(prev => {
      const featured = prev.featuredPosts || [];
      if (featured.includes(slug)) {
        return { ...prev, featuredPosts: featured.filter(s => s !== slug) };
      } else {
        return { ...prev, featuredPosts: [...featured, slug] };
      }
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-[#0D9488]/20" />
          <div className="absolute inset-0 rounded-full border-4 border-[#0D9488] border-t-transparent animate-spin" />
        </div>
        <p className="mt-4 text-gray-500 dark:text-gray-400">Loading blog settings...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-3xl p-12 text-center border border-gray-200 dark:border-gray-800">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-[#374151] dark:text-white">Failed to load blog data</h2>
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
          <h1 className="text-3xl font-black text-[#374151] dark:text-white">Blog Settings</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your Blog content</p>
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

      {/* Categories */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-[#374151] dark:text-white">Categories</h2>
          <button
            onClick={addCategory}
            className="px-3 py-1.5 rounded-lg bg-[#0D9488] text-white text-sm hover:bg-[#0D9488]/80 transition flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            Add Category
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {data.categories?.map((cat, index) => (
            <div key={index} className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-1.5">
              <input
                type="text"
                value={cat || ''}
                onChange={(e) => updateCategory(index, e.target.value)}
                className="bg-transparent outline-none text-sm text-[#374151] dark:text-white w-32"
                placeholder="Category name"
              />
              <button
                onClick={() => removeCategory(index)}
                className="text-red-500 hover:text-red-700 transition"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        {data.categories?.length === 0 && (
          <p className="text-gray-500 dark:text-gray-400 text-sm">No categories added yet.</p>
        )}
      </div>

      {/* Blog Posts */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-[#374151] dark:text-white">Blog Posts</h2>
          <button
            onClick={addPost}
            className="px-3 py-1.5 rounded-lg bg-[#0D9488] text-white text-sm hover:bg-[#0D9488]/80 transition flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            Add Post
          </button>
        </div>
        <div className="space-y-3">
          {data.posts?.map((post, index) => {
            const isExpanded = expandedPosts.includes(index);
            const isFeatured = data.featuredPosts?.includes(post.slug);
            return (
              <div key={index} className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => togglePostExpand(index)}
                    className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  <input
                    type="text"
                    value={post.title || ''}
                    onChange={(e) => updatePost(index, 'title', e.target.value)}
                    placeholder="Post Title"
                    className="flex-1 h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition"
                  />
                  <input
                    type="text"
                    value={post.slug || ''}
                    onChange={(e) => updatePost(index, 'slug', e.target.value)}
                    placeholder="Slug"
                    className="w-32 h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition"
                  />
                  <select
                    value={post.category || ''}
                    onChange={(e) => updatePost(index, 'category', e.target.value)}
                    className="w-32 h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition"
                  >
                    {data.categories?.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => toggleFeatured(post.slug)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                      isFeatured
                        ? 'bg-[#0D9488] text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {isFeatured ? '★ Featured' : '☆ Feature'}
                  </button>
                  <label className="flex items-center gap-1 text-sm">
                    <input
                      type="checkbox"
                      checked={post.published || false}
                      onChange={(e) => updatePost(index, 'published', e.target.checked)}
                      className="w-4 h-4 accent-[#0D9488]"
                    />
                    Published
                  </label>
                  <button
                    onClick={() => removePost(index)}
                    className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/20 text-red-500 hover:bg-red-200 dark:hover:bg-red-900/40 transition flex items-center justify-center flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {isExpanded && (
                  <div className="mt-3 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cover Image URL</label>
                        <div className="flex items-center gap-2">
                          <Image className="w-4 h-4 text-gray-400" />
                          <input
                            type="text"
                            value={post.coverImage || ''}
                            onChange={(e) => updatePost(index, 'coverImage', e.target.value)}
                            placeholder="https://example.com/image.jpg"
                            className="flex-1 h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cover Video URL</label>
                        <div className="flex items-center gap-2">
                          <Video className="w-4 h-4 text-gray-400" />
                          <input
                            type="text"
                            value={post.coverVideo || ''}
                            onChange={(e) => updatePost(index, 'coverVideo', e.target.value)}
                            placeholder="https://example.com/video.mp4"
                            className="flex-1 h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Author</label>
                        <input
                          type="text"
                          value={post.author || ''}
                          onChange={(e) => updatePost(index, 'author', e.target.value)}
                          placeholder="Author name"
                          className="w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Author Image URL</label>
                        <input
                          type="text"
                          value={post.authorImage || ''}
                          onChange={(e) => updatePost(index, 'authorImage', e.target.value)}
                          placeholder="https://example.com/avatar.jpg"
                          className="w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tags (comma separated)</label>
                      <input
                        type="text"
                        value={post.tags?.join(', ') || ''}
                        onChange={(e) => updatePost(index, 'tags', e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
                        placeholder="Travel, Rwanda, Adventure"
                        className="w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Excerpt</label>
                      <input
                        type="text"
                        value={post.excerpt || ''}
                        onChange={(e) => updatePost(index, 'excerpt', e.target.value)}
                        placeholder="Brief summary of the post"
                        className="w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Content</label>
                      <textarea
                        value={post.content || ''}
                        onChange={(e) => updatePost(index, 'content', e.target.value)}
                        placeholder="Full post content..."
                        rows={6}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition resize-none"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">SEO Title</label>
                        <input
                          type="text"
                          value={post.seoTitle || ''}
                          onChange={(e) => updatePost(index, 'seoTitle', e.target.value)}
                          placeholder="SEO Title"
                          className="w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">SEO Description</label>
                        <input
                          type="text"
                          value={post.seoDescription || ''}
                          onChange={(e) => updatePost(index, 'seoDescription', e.target.value)}
                          placeholder="SEO Description (meta description)"
                          className="w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {data.posts?.length === 0 && (
          <p className="text-center text-gray-500 dark:text-gray-400 py-8">No blog posts added yet. Click "Add Post" to get started.</p>
        )}
      </div>
    </div>
  );
};

export default BlogSettings;