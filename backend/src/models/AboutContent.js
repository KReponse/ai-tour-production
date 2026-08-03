// backend/src/models/AboutContent.js
// ✅ NEW - About Content Model

import mongoose from 'mongoose';

const statisticSchema = new mongoose.Schema({
  value: { type: String, required: true },
  label: { type: String, required: true },
  icon: { type: String, default: 'Users' },
  order: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
});

const valueSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  icon: { type: String, default: 'Sparkles' },
  order: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
});

const teamMemberSchema = new mongoose.Schema({
  name: { type: String, required: true },
  role: { type: String, required: true },
  image: { type: String, default: '' },
  bio: { type: String, default: '' },
  order: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
});

const ctaSchema = new mongoose.Schema({
  title: { type: String, default: 'Ready to Explore Rwanda?' },
  subtitle: { type: String, default: 'Join thousands of travelers discovering Rwanda with AI Tour.' },
  buttonText: { type: String, default: 'Start Exploring' },
  buttonLink: { type: String, default: '/explore' },
  active: { type: Boolean, default: true },
});

const aboutContentSchema = new mongoose.Schema(
  {
    // ─── Hero ──────────────────────────────────────────────────
    hero: {
      title: { type: String, default: 'Smart Travel for Smart People' },
      subtitle: { type: String, default: 'AI Tour Rwanda is revolutionizing the way travelers discover and experience Rwanda.' },
      description: { type: String, default: 'We combine artificial intelligence with local expertise to create unforgettable travel experiences in Rwanda.' },
      image: { type: String, default: '' },
    },

    // ─── Story ──────────────────────────────────────────────────
    story: {
      title: { type: String, default: 'Our Story' },
      content: { type: String, default: 'AI Tour Rwanda was born from a vision to make travel in Rwanda smarter, more accessible, and more memorable.' },
      image: { type: String, default: '' },
    },

    // ─── Mission ────────────────────────────────────────────────
    mission: {
      title: { type: String, default: 'Our Mission' },
      content: { type: String, default: 'To revolutionize tourism in Rwanda through AI-powered technology, creating seamless and personalized travel experiences.' },
    },

    // ─── Vision ────────────────────────────────────────────────
    vision: {
      title: { type: String, default: 'Our Vision' },
      content: { type: String, default: 'To become Africa\'s leading AI-powered tourism platform, showcasing the beauty and culture of Rwanda to the world.' },
    },

    // ─── Statistics ────────────────────────────────────────────
    statistics: [statisticSchema],

    // ─── Values ────────────────────────────────────────────────
    values: [valueSchema],

    // ─── Team ──────────────────────────────────────────────────
    team: [teamMemberSchema],

    // ─── CTA ──────────────────────────────────────────────────
    cta: ctaSchema,

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
aboutContentSchema.index({ isActive: 1 });
aboutContentSchema.index({ updatedAt: -1 });

// ─── Static Methods ─────────────────────────────────────────────

/**
 * Get active about content
 */
aboutContentSchema.statics.getActiveContent = async function () {
  let content = await this.findOne({ isActive: true });

  if (!content) {
    content = await this.createDefaultContent();
  }

  return content;
};

/**
 * Create default about content
 */
aboutContentSchema.statics.createDefaultContent = async function () {
  const defaultContent = {
    hero: {
      title: 'Smart Travel for Smart People',
      subtitle: 'AI Tour Rwanda is revolutionizing the way travelers discover and experience Rwanda.',
      description: 'We combine artificial intelligence with local expertise to create unforgettable travel experiences in Rwanda.',
      image: '',
    },
    story: {
      title: 'Our Story',
      content: 'AI Tour Rwanda was born from a vision to make travel in Rwanda smarter, more accessible, and more memorable. Founded by a team of tech enthusiasts and tourism experts, we\'ve created a platform that connects travelers with the best experiences Rwanda has to offer.',
      image: '',
    },
    mission: {
      title: 'Our Mission',
      content: 'To revolutionize tourism in Rwanda through AI-powered technology, creating seamless and personalized travel experiences that showcase the beauty, culture, and hospitality of Rwanda.',
    },
    vision: {
      title: 'Our Vision',
      content: 'To become Africa\'s leading AI-powered tourism platform, making Rwanda the premier travel destination on the continent through innovation and excellence.',
    },
    statistics: [
      { value: '10K+', label: 'Happy Travelers', icon: 'Users', order: 0, active: true },
      { value: '500+', label: 'Tours Available', icon: 'MapPin', order: 1, active: true },
      { value: '4.9', label: 'Average Rating', icon: 'Star', order: 2, active: true },
      { value: '98%', label: 'Satisfaction Rate', icon: 'TrendingUp', order: 3, active: true },
    ],
    values: [
      {
        title: 'Innovation',
        description: 'Using AI to revolutionize travel planning and experiences.',
        icon: 'Sparkles',
        order: 0,
        active: true,
      },
      {
        title: 'Trust',
        description: 'Verified providers and secure bookings you can rely on.',
        icon: 'Shield',
        order: 1,
        active: true,
      },
      {
        title: 'Passion',
        description: 'Showcasing the beauty of Rwanda with love and care.',
        icon: 'Heart',
        order: 2,
        active: true,
      },
      {
        title: 'Sustainability',
        description: 'Promoting responsible and eco-friendly tourism.',
        icon: 'Globe',
        order: 3,
        active: true,
      },
    ],
    team: [
      { name: 'Alex M.', role: 'CEO & Founder', image: '', bio: '', order: 0, active: true },
      { name: 'Grace K.', role: 'Head of Tourism', image: '', bio: '', order: 1, active: true },
      { name: 'David R.', role: 'AI Engineer', image: '', bio: '', order: 2, active: true },
      { name: 'Sarah M.', role: 'Customer Experience', image: '', bio: '', order: 3, active: true },
    ],
    cta: {
      title: 'Ready to Explore Rwanda?',
      subtitle: 'Join thousands of travelers discovering Rwanda with AI Tour.',
      buttonText: 'Start Exploring',
      buttonLink: '/explore',
      active: true,
    },
    isActive: true,
  };

  return this.create(defaultContent);
};

const AboutContent = mongoose.model('AboutContent', aboutContentSchema);
export default AboutContent;