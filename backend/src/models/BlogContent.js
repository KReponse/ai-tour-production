// backend/src/models/BlogContent.js
// ✅ FIXED - Removed duplicate index on posts.slug

import mongoose from 'mongoose';

const blogPostSchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  category: { type: String, required: true },
  tags: { type: [String], default: [] },
  content: { type: String, required: true },
  excerpt: { type: String, default: '' },
  coverImage: { type: String, default: '' },
  coverVideo: { type: String, default: '' },
  author: { type: String, required: true },
  authorImage: { type: String, default: '' },
  published: { type: Boolean, default: false },
  featured: { type: Boolean, default: false },
  publishedAt: { type: Date, default: Date.now },
  seoTitle: { type: String, default: '' },
  seoDescription: { type: String, default: '' },
  seoKeywords: { type: String, default: '' },
  order: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
});

const blogContentSchema = new mongoose.Schema(
  {
    // ─── Hero ──────────────────────────────────────────────────
    hero: {
      title: { type: String, default: 'Travel Stories & Insights' },
      subtitle: { type: String, default: 'Discover Rwanda through the eyes of travelers, locals, and experts.' },
      image: { type: String, default: '' },
    },

    // ─── Categories ─────────────────────────────────────────────
    categories: [{ type: String }],

    // ─── Blog Posts ─────────────────────────────────────────────
    posts: [blogPostSchema],

    // ─── Featured Posts ─────────────────────────────────────────
    featuredPosts: [{ type: String }], // Post slugs

    // ─── Status ────────────────────────────────────────────────
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ─────────────────────────────────────────────────────
// ✅ Removed duplicate index on 'posts.slug' - unique: true already creates it
blogContentSchema.index({ isActive: 1 });
blogContentSchema.index({ updatedAt: -1 });
blogContentSchema.index({ 'posts.published': 1 });
blogContentSchema.index({ 'posts.publishedAt': -1 });

// ─── Static Methods ─────────────────────────────────────────────

/**
 * Get active blog content
 */
blogContentSchema.statics.getActiveContent = async function () {
  let content = await this.findOne({ isActive: true });

  if (!content) {
    content = await this.createDefaultContent();
  }

  return content;
};

/**
 * Get published posts
 */
blogContentSchema.statics.getPublishedPosts = async function () {
  const content = await this.getActiveContent();
  return content.posts.filter(post => post.published === true && post.active !== false);
};

/**
 * Get post by slug
 */
blogContentSchema.statics.getPostBySlug = async function (slug) {
  const content = await this.getActiveContent();
  return content.posts.find(post => post.slug === slug);
};

/**
 * Create default blog content
 */
blogContentSchema.statics.createDefaultContent = async function () {
  const defaultContent = {
    hero: {
      title: 'Travel Stories & Insights',
      subtitle: 'Discover Rwanda through the eyes of travelers, locals, and experts.',
      image: '',
    },
    categories: ['Travel Tips', 'Destinations', 'Culture', 'Adventure', 'Food & Drink'],
    posts: [
      {
        title: '10 Reasons to Visit Rwanda This Year',
        slug: '10-reasons-to-visit-rwanda',
        category: 'Destinations',
        tags: ['Rwanda', 'Travel', 'Africa'],
        content: 'Rwanda is one of the most beautiful and welcoming countries in Africa...',
        excerpt: 'Discover why Rwanda should be at the top of your travel list this year.',
        coverImage: '',
        coverVideo: '',
        author: 'AI Tour Rwanda',
        authorImage: '',
        published: true,
        featured: true,
        publishedAt: new Date(),
        seoTitle: '10 Reasons to Visit Rwanda',
        seoDescription: 'Discover why Rwanda should be at the top of your travel list.',
        seoKeywords: 'Rwanda, travel, Africa, tourism',
        order: 0,
        active: true,
      },
      {
        title: 'Gorilla Trekking: A Once-in-a-Lifetime Experience',
        slug: 'gorilla-trekking-experience',
        category: 'Adventure',
        tags: ['Gorillas', 'Trekking', 'Wildlife'],
        content: 'Encountering mountain gorillas in their natural habitat is breathtaking...',
        excerpt: 'Everything you need to know about gorilla trekking in Rwanda.',
        coverImage: '',
        coverVideo: '',
        author: 'AI Tour Rwanda',
        authorImage: '',
        published: true,
        featured: true,
        publishedAt: new Date(),
        seoTitle: 'Gorilla Trekking in Rwanda',
        seoDescription: 'Everything you need to know about gorilla trekking.',
        seoKeywords: 'gorilla, trekking, Rwanda, wildlife',
        order: 1,
        active: true,
      },
      {
        title: 'Exploring Kigali: A City of Culture and Innovation',
        slug: 'exploring-kigali',
        category: 'Destinations',
        tags: ['Kigali', 'City', 'Culture'],
        content: 'Kigali is a vibrant city that blends modernity with rich culture...',
        excerpt: 'Discover the best things to do in Kigali, Rwanda\'s capital city.',
        coverImage: '',
        coverVideo: '',
        author: 'AI Tour Rwanda',
        authorImage: '',
        published: true,
        featured: false,
        publishedAt: new Date(),
        seoTitle: 'Exploring Kigali, Rwanda',
        seoDescription: 'Discover the best things to do in Kigali.',
        seoKeywords: 'Kigali, Rwanda, city, culture',
        order: 2,
        active: true,
      },
    ],
    featuredPosts: ['10-reasons-to-visit-rwanda', 'gorilla-trekking-experience'],
    isActive: true,
  };

  return this.create(defaultContent);
};

const BlogContent = mongoose.model('BlogContent', blogContentSchema);
export default BlogContent;