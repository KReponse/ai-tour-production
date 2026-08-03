// backend/src/models/HelpContent.js
// ✅ FIXED - Removed duplicate index on articles.slug

import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  icon: { type: String, default: 'BookOpen' },
  description: { type: String, default: '' },
  order: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
});

const articleSchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  category: { type: String, required: true },
  content: { type: String, required: true },
  excerpt: { type: String, default: '' },
  featured: { type: Boolean, default: false },
  order: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
});

const helpContentSchema = new mongoose.Schema(
  {
    // ─── Hero ──────────────────────────────────────────────────
    hero: {
      title: { type: String, default: 'How Can We Help You?' },
      subtitle: { type: String, default: 'Find guides, tutorials, and answers to common questions.' },
      image: { type: String, default: '' },
    },

    // ─── Categories ─────────────────────────────────────────────
    categories: [categorySchema],

    // ─── Articles ──────────────────────────────────────────────
    articles: [articleSchema],

    // ─── Featured Articles ─────────────────────────────────────
    featuredArticles: [{ type: String }], // Article slugs

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
// ✅ Removed duplicate index on 'articles.slug' - unique: true already creates it
helpContentSchema.index({ isActive: 1 });
helpContentSchema.index({ updatedAt: -1 });

// ─── Static Methods ─────────────────────────────────────────────

/**
 * Get active help content
 */
helpContentSchema.statics.getActiveContent = async function () {
  let content = await this.findOne({ isActive: true });

  if (!content) {
    content = await this.createDefaultContent();
  }

  return content;
};

/**
 * Create default help content
 */
helpContentSchema.statics.createDefaultContent = async function () {
  const defaultContent = {
    hero: {
      title: 'How Can We Help You?',
      subtitle: 'Find guides, tutorials, and answers to common questions about AI Tour Rwanda.',
      image: '',
    },
    categories: [
      {
        name: 'Getting Started',
        slug: 'getting-started',
        icon: 'BookOpen',
        description: 'Learn how to use AI Tour Rwanda',
        order: 0,
        active: true,
      },
      {
        name: 'Bookings',
        slug: 'bookings',
        icon: 'Calendar',
        description: 'Everything about bookings and reservations',
        order: 1,
        active: true,
      },
      {
        name: 'Payments',
        slug: 'payments',
        icon: 'DollarSign',
        description: 'Payment methods, refunds, and billing',
        order: 2,
        active: true,
      },
      {
        name: 'Account',
        slug: 'account',
        icon: 'Users',
        description: 'Account management and settings',
        order: 3,
        active: true,
      },
      {
        name: 'Tours & Experiences',
        slug: 'tours',
        icon: 'MapPin',
        description: 'Tour information and experiences',
        order: 4,
        active: true,
      },
    ],
    articles: [
      {
        title: 'How to Create an Account',
        slug: 'how-to-create-an-account',
        category: 'account',
        content: 'Creating an account on AI Tour Rwanda is quick and easy. Click the "Register" button on the top right corner of our website. Fill in your name, email address, and create a secure password. Verify your email address by clicking the link we send you. Once verified, you can start exploring and booking tours immediately.',
        excerpt: 'Learn how to create your AI Tour Rwanda account in just a few simple steps.',
        featured: true,
        order: 0,
        active: true,
      },
      {
        title: 'How to Book a Tour',
        slug: 'how-to-book-a-tour',
        category: 'bookings',
        content: 'Browse our Explore page to find tours that interest you. Click on any tour to view details. Select your preferred date and number of travelers. Click "Book Now" and follow the checkout process. Complete your payment securely. You will receive a confirmation email with all the details.',
        excerpt: 'Step-by-step guide to booking your perfect tour.',
        featured: true,
        order: 1,
        active: true,
      },
      {
        title: 'Payment Methods Accepted',
        slug: 'payment-methods',
        category: 'payments',
        content: 'We accept Visa, Mastercard, MTN MoMo, Airtel Money, and PayPal. All payments are processed through secure, encrypted channels. Your payment information is never stored on our servers.',
        excerpt: 'Learn about the payment methods we accept.',
        featured: false,
        order: 2,
        active: true,
      },
      {
        title: 'How to Become a Provider',
        slug: 'become-a-provider',
        category: 'tours',
        content: 'Go to your profile and click "Become a Provider". Fill in the application form with your business details, including your business name, registration number, and contact information. Submit your application for review. Our admin team will review your application and get back to you within 48 hours.',
        excerpt: 'Learn how to list your tours and experiences on AI Tour Rwanda.',
        featured: false,
        order: 3,
        active: true,
      },
      {
        title: 'Cancellation and Refund Policy',
        slug: 'cancellation-policy',
        category: 'bookings',
        content: 'You can cancel your booking up to 24 hours before the tour for a full refund. Cancellations within 24 hours may incur a 50% fee. Refunds are processed within 5-7 business days and will be credited to your original payment method.',
        excerpt: 'Understand our cancellation and refund policies.',
        featured: false,
        order: 4,
        active: true,
      },
    ],
    featuredArticles: ['how-to-create-an-account', 'how-to-book-a-tour'],
    isActive: true,
  };

  return this.create(defaultContent);
};

const HelpContent = mongoose.model('HelpContent', helpContentSchema);
export default HelpContent;