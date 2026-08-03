// backend/src/models/FaqContent.js
// ✅ NEW - FAQ Content Model

import mongoose from 'mongoose';

const faqItemSchema = new mongoose.Schema({
  question: { type: String, required: true },
  answer: { type: String, required: true },
  category: { type: String, required: true },
  order: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
});

const categorySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  label: { type: String, required: true },
  icon: { type: String, default: 'HelpCircle' },
  order: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
});

const faqContentSchema = new mongoose.Schema(
  {
    // ─── Hero ──────────────────────────────────────────────────
    hero: {
      title: { type: String, default: 'Got Questions? We\'ve Got Answers' },
      subtitle: { type: String, default: 'Find quick answers to the most common questions about AI Tour Rwanda.' },
      image: { type: String, default: '' },
    },

    // ─── Categories ─────────────────────────────────────────────
    categories: [categorySchema],

    // ─── FAQs ──────────────────────────────────────────────────
    faqs: [faqItemSchema],

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
faqContentSchema.index({ isActive: 1 });
faqContentSchema.index({ updatedAt: -1 });

// ─── Static Methods ─────────────────────────────────────────────

/**
 * Get active FAQ content
 */
faqContentSchema.statics.getActiveContent = async function () {
  let content = await this.findOne({ isActive: true });

  if (!content) {
    content = await this.createDefaultContent();
  }

  return content;
};

/**
 * Create default FAQ content
 */
faqContentSchema.statics.createDefaultContent = async function () {
  const defaultContent = {
    hero: {
      title: 'Got Questions? We\'ve Got Answers',
      subtitle: 'Find quick answers to the most common questions about AI Tour Rwanda.',
      image: '',
    },
    categories: [
      { id: 'booking', label: 'Booking', icon: 'Calendar', order: 0, active: true },
      { id: 'payments', label: 'Payments', icon: 'DollarSign', order: 1, active: true },
      { id: 'account', label: 'Account', icon: 'Users', order: 2, active: true },
      { id: 'tours', label: 'Tours', icon: 'MapPin', order: 3, active: true },
      { id: 'safety', label: 'Safety', icon: 'Shield', order: 4, active: true },
    ],
    faqs: [
      // Booking
      {
        question: 'How do I book a tour?',
        answer: 'Browse tours on our Explore page, select your preferred tour, and click "Book Now". Follow the steps to complete your booking. You\'ll receive a confirmation email once your booking is confirmed.',
        category: 'booking',
        order: 0,
        active: true,
      },
      {
        question: 'Can I modify my booking after confirmation?',
        answer: 'Yes, you can modify your booking up to 48 hours before the tour date. Contact our support team or the provider directly to request changes.',
        category: 'booking',
        order: 1,
        active: true,
      },
      {
        question: 'What if the provider cancels my tour?',
        answer: 'If a provider cancels your tour, you will receive a full refund. We will also help you find alternative tours or experiences.',
        category: 'booking',
        order: 2,
        active: true,
      },
      // Payments
      {
        question: 'What payment methods do you accept?',
        answer: 'We accept Visa, Mastercard, MTN MoMo, Airtel Money, and PayPal. All payments are processed through secure, encrypted channels.',
        category: 'payments',
        order: 0,
        active: true,
      },
      {
        question: 'Is my payment information secure?',
        answer: 'Yes, all payment information is encrypted and processed through PCI-compliant payment gateways. We never store your full card details.',
        category: 'payments',
        order: 1,
        active: true,
      },
      {
        question: 'What is your refund policy?',
        answer: 'You can cancel up to 24 hours before the tour for a full refund. Cancellations within 24 hours may incur a 50% fee. Refunds are processed within 5-7 business days.',
        category: 'payments',
        order: 2,
        active: true,
      },
      // Account
      {
        question: 'How do I create an account?',
        answer: 'Click "Register" on the top right corner of our website. Fill in your details, verify your email, and you\'re ready to start booking tours.',
        category: 'account',
        order: 0,
        active: true,
      },
      {
        question: 'How do I reset my password?',
        answer: 'Click "Forgot Password" on the login page. Enter your email address and we\'ll send you a password reset link.',
        category: 'account',
        order: 1,
        active: true,
      },
      {
        question: 'Can I delete my account?',
        answer: 'Yes, you can delete your account by going to Settings > Account > Delete Account. This action is permanent and cannot be undone.',
        category: 'account',
        order: 2,
        active: true,
      },
      // Tours
      {
        question: 'How do I become a provider?',
        answer: 'Go to your profile and click "Become a Provider". Fill in the application form with your business details. Your application will be reviewed by our admin team.',
        category: 'tours',
        order: 0,
        active: true,
      },
      {
        question: 'What tours are available in Rwanda?',
        answer: 'We offer a wide variety of tours including gorilla trekking, safari adventures, cultural experiences, city tours, hiking, and luxury retreats.',
        category: 'tours',
        order: 1,
        active: true,
      },
      {
        question: 'Are the tours suitable for families?',
        answer: 'Yes, many of our tours are family-friendly. Look for the "Family-friendly" tag when browsing tours, or contact us for recommendations.',
        category: 'tours',
        order: 2,
        active: true,
      },
      // Safety
      {
        question: 'Is it safe to travel in Rwanda?',
        answer: 'Rwanda is one of the safest countries in Africa. We work with verified providers who maintain high safety standards. Always follow local guidelines and travel insurance is recommended.',
        category: 'safety',
        order: 0,
        active: true,
      },
      {
        question: 'How are providers verified?',
        answer: 'All providers undergo a thorough verification process including business registration, background checks, and quality reviews by our team.',
        category: 'safety',
        order: 1,
        active: true,
      },
      {
        question: 'What should I do in case of an emergency?',
        answer: 'Contact our 24/7 support team immediately. We will help coordinate with local authorities and ensure your safety.',
        category: 'safety',
        order: 2,
        active: true,
      },
    ],
    isActive: true,
  };

  return this.create(defaultContent);
};

const FaqContent = mongoose.model('FaqContent', faqContentSchema);
export default FaqContent;