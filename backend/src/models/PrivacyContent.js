// backend/src/models/PrivacyContent.js
// ✅ NEW - Privacy Policy Content Model

import mongoose from 'mongoose';

const sectionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  order: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
});

const privacyContentSchema = new mongoose.Schema(
  {
    // ─── Hero ──────────────────────────────────────────────────
    hero: {
      title: { type: String, default: 'Privacy Policy' },
      subtitle: { type: String, default: 'Your privacy matters to us. Learn how we protect your data.' },
      image: { type: String, default: '' },
    },

    // ─── Sections ─────────────────────────────────────────────
    sections: [sectionSchema],

    // ─── Last Updated ──────────────────────────────────────────
    lastUpdated: {
      type: Date,
      default: Date.now,
    },

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
privacyContentSchema.index({ isActive: 1 });
privacyContentSchema.index({ updatedAt: -1 });

// ─── Static Methods ─────────────────────────────────────────────

/**
 * Get active privacy content
 */
privacyContentSchema.statics.getActiveContent = async function () {
  let content = await this.findOne({ isActive: true });

  if (!content) {
    content = await this.createDefaultContent();
  }

  return content;
};

/**
 * Create default privacy content
 */
privacyContentSchema.statics.createDefaultContent = async function () {
  const defaultContent = {
    hero: {
      title: 'Privacy Policy',
      subtitle: 'Your privacy matters to us. Learn how we protect your data.',
      image: '',
    },
    sections: [
      {
        title: 'Information We Collect',
        content: 'We collect information you provide directly, such as when you create an account, make a booking, or contact our support team. This may include your name, email address, phone number, payment information, and travel preferences. We also collect information automatically through cookies and analytics tools when you visit our website.',
        order: 0,
        active: true,
      },
      {
        title: 'How We Use Your Information',
        content: 'We use your information to process bookings, provide customer support, personalize your experience, send you relevant updates and offers, and improve our platform. We never sell your personal data to third parties.',
        order: 1,
        active: true,
      },
      {
        title: 'Information Sharing',
        content: 'We share your information with tour providers only to facilitate your bookings. We may also share with payment processors for secure payment processing. We do not share your information with third parties for marketing purposes without your explicit consent.',
        order: 2,
        active: true,
      },
      {
        title: 'Data Security',
        content: 'We implement industry-standard security measures to protect your data, including encryption, secure servers, and regular security audits. While we strive to protect your information, no method of transmission over the internet is 100% secure.',
        order: 3,
        active: true,
      },
      {
        title: 'Your Rights',
        content: 'You have the right to access, modify, or delete your personal data at any time. You can also withdraw consent for marketing communications. Contact our support team to exercise these rights.',
        order: 4,
        active: true,
      },
      {
        title: 'Cookies',
        content: 'We use cookies to enhance your experience, analyze site traffic, and personalize content. You can control cookie preferences through your browser settings.',
        order: 5,
        active: true,
      },
      {
        title: 'Contact Us',
        content: 'If you have questions about this Privacy Policy, please contact us at: privacy@aitour.rw or +250 791 468 299.',
        order: 6,
        active: true,
      },
    ],
    lastUpdated: new Date(),
    isActive: true,
  };

  return this.create(defaultContent);
};

const PrivacyContent = mongoose.model('PrivacyContent', privacyContentSchema);
export default PrivacyContent;