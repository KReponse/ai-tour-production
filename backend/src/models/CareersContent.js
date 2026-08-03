// backend/src/models/CareersContent.js
// ✅ NEW - Careers Content Model

import mongoose from 'mongoose';

const statisticSchema = new mongoose.Schema({
  value: { type: String, required: true },
  label: { type: String, required: true },
  order: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
});

const benefitSchema = new mongoose.Schema({
  icon: { type: String, default: 'Heart' },
  title: { type: String, required: true },
  description: { type: String, required: true },
  order: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
});

const jobSchema = new mongoose.Schema({
  title: { type: String, required: true },
  department: { type: String, required: true },
  location: { type: String, required: true },
  type: { type: String, enum: ['Full-time', 'Part-time', 'Contract', 'Remote'], default: 'Full-time' },
  salary: { type: String, default: '' },
  description: { type: String, default: '' },
  requirements: { type: String, default: '' },
  applyLink: { type: String, default: 'mailto:careers@aitour.rw' },
  isOpen: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
});

const ctaSchema = new mongoose.Schema({
  title: { type: String, default: 'Don\'t see the right role?' },
  subtitle: { type: String, default: 'Send us your resume and we\'ll keep you in mind for future opportunities.' },
  buttonText: { type: String, default: 'Send Application' },
  buttonLink: { type: String, default: 'mailto:careers@aitour.rw' },
  active: { type: Boolean, default: true },
});

const careersContentSchema = new mongoose.Schema(
  {
    // ─── Hero ──────────────────────────────────────────────────
    hero: {
      title: { type: String, default: 'Careers at AI Tour Rwanda' },
      subtitle: { type: String, default: 'Build the future of tourism in Rwanda with us. Join a passionate team using AI to transform travel experiences.' },
      image: { type: String, default: '' },
    },

    // ─── Statistics ─────────────────────────────────────────────
    statistics: [statisticSchema],

    // ─── Benefits ──────────────────────────────────────────────
    benefits: [benefitSchema],

    // ─── Open Positions ────────────────────────────────────────
    jobs: [jobSchema],

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
careersContentSchema.index({ isActive: 1 });
careersContentSchema.index({ updatedAt: -1 });

// ─── Static Methods ─────────────────────────────────────────────

/**
 * Get active careers content
 */
careersContentSchema.statics.getActiveContent = async function () {
  let content = await this.findOne({ isActive: true });

  if (!content) {
    content = await this.createDefaultContent();
  }

  return content;
};

/**
 * Create default careers content
 */
careersContentSchema.statics.createDefaultContent = async function () {
  const defaultContent = {
    hero: {
      title: 'Careers at AI Tour Rwanda',
      subtitle: 'Build the future of tourism in Rwanda with us. Join a passionate team using AI to transform travel experiences.',
      image: '',
    },
    statistics: [
      { value: '15+', label: 'Team Members', order: 0, active: true },
      { value: '5', label: 'Countries Served', order: 1, active: true },
      { value: '10K+', label: 'Happy Travelers', order: 2, active: true },
      { value: '4.9', label: 'Average Rating', order: 3, active: true },
    ],
    benefits: [
      {
        icon: 'Heart',
        title: 'Health Insurance',
        description: 'Comprehensive medical coverage',
        order: 0,
        active: true,
      },
      {
        icon: 'Coffee',
        title: 'Flexible Work',
        description: 'Remote & hybrid options',
        order: 1,
        active: true,
      },
      {
        icon: 'Laptop',
        title: 'Tech Equipment',
        description: 'Laptop & work setup provided',
        order: 2,
        active: true,
      },
      {
        icon: 'Globe',
        title: 'Travel Perks',
        description: 'Discounted tours & experiences',
        order: 3,
        active: true,
      },
    ],
    jobs: [
      {
        title: 'Senior Full-Stack Developer',
        department: 'Engineering',
        location: 'Kigali, Rwanda',
        type: 'Full-time',
        salary: '$60k - $80k',
        description: 'We are looking for a Senior Full-Stack Developer to join our engineering team. You will be responsible for building and maintaining our AI-powered tourism platform.',
        requirements: '5+ years experience, React, Node.js, MongoDB, AWS',
        applyLink: 'mailto:careers@aitour.rw?subject=Senior Full-Stack Developer',
        isOpen: true,
        order: 0,
        active: true,
      },
      {
        title: 'Tourism Operations Manager',
        department: 'Operations',
        location: 'Kigali, Rwanda',
        type: 'Full-time',
        salary: '$40k - $55k',
        description: 'We are seeking a Tourism Operations Manager to oversee our tour operations and ensure exceptional customer experiences.',
        requirements: '3+ years in tourism operations, strong communication skills, customer service experience',
        applyLink: 'mailto:careers@aitour.rw?subject=Tourism Operations Manager',
        isOpen: true,
        order: 1,
        active: true,
      },
      {
        title: 'AI Engineer - Travel Recommendations',
        department: 'AI/ML',
        location: 'Remote',
        type: 'Full-time',
        salary: '$70k - $90k',
        description: 'We are looking for an AI Engineer to develop and optimize our travel recommendation algorithms.',
        requirements: '3+ years in AI/ML, Python, TensorFlow, experience with recommendation systems',
        applyLink: 'mailto:careers@aitour.rw?subject=AI Engineer',
        isOpen: true,
        order: 2,
        active: true,
      },
    ],
    cta: {
      title: 'Don\'t see the right role?',
      subtitle: 'Send us your resume and we\'ll keep you in mind for future opportunities.',
      buttonText: 'Send Application',
      buttonLink: 'mailto:careers@aitour.rw',
      active: true,
    },
    isActive: true,
  };

  return this.create(defaultContent);
};

const CareersContent = mongoose.model('CareersContent', careersContentSchema);
export default CareersContent;