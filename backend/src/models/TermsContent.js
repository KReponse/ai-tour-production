// backend/src/models/TermsContent.js
// ✅ NEW - Terms & Conditions Content Model

import mongoose from 'mongoose';

const sectionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  order: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
});

const termsContentSchema = new mongoose.Schema(
  {
    // ─── Hero ──────────────────────────────────────────────────
    hero: {
      title: { type: String, default: 'Terms & Conditions' },
      subtitle: { type: String, default: 'Please read these terms carefully before using our platform.' },
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
termsContentSchema.index({ isActive: 1 });
termsContentSchema.index({ updatedAt: -1 });

// ─── Static Methods ─────────────────────────────────────────────

/**
 * Get active terms content
 */
termsContentSchema.statics.getActiveContent = async function () {
  let content = await this.findOne({ isActive: true });

  if (!content) {
    content = await this.createDefaultContent();
  }

  return content;
};

/**
 * Create default terms content
 */
termsContentSchema.statics.createDefaultContent = async function () {
  const defaultContent = {
    hero: {
      title: 'Terms & Conditions',
      subtitle: 'Please read these terms carefully before using our platform.',
      image: '',
    },
    sections: [
      {
        title: 'Acceptance of Terms',
        content: 'By using AI Tour Rwanda, you agree to these Terms & Conditions. If you do not agree, please do not use our platform. We reserve the right to update these terms at any time.',
        order: 0,
        active: true,
      },
      {
        title: 'User Accounts',
        content: 'You must create an account to access certain features. You are responsible for maintaining your account security. You agree to provide accurate information and keep it updated. You are solely responsible for all activities under your account.',
        order: 1,
        active: true,
      },
      {
        title: 'Bookings and Payments',
        content: 'All bookings are subject to availability. Payment is required at the time of booking. We use secure payment processors to handle transactions. You agree to pay all charges associated with your bookings.',
        order: 2,
        active: true,
      },
      {
        title: 'Cancellation Policy',
        content: 'You may cancel bookings up to 24 hours before the scheduled tour for a full refund. Cancellations within 24 hours may incur a fee. Refunds are processed within 5-7 business days.',
        order: 3,
        active: true,
      },
      {
        title: 'User Responsibilities',
        content: 'You agree to use our platform responsibly. You will not engage in fraudulent activities, harass other users, or misuse our services. You are responsible for complying with all applicable laws and regulations.',
        order: 4,
        active: true,
      },
      {
        title: 'Content and Intellectual Property',
        content: 'All content on our platform is owned by AI Tour Rwanda or its licensors. You may not copy, reproduce, or distribute our content without permission. User-generated content remains the property of the user but grants us a license to use it.',
        order: 5,
        active: true,
      },
      {
        title: 'Limitation of Liability',
        content: 'AI Tour Rwanda is not liable for any damages resulting from your use of our platform. We act as a booking platform and are not responsible for the services provided by third-party tour operators.',
        order: 6,
        active: true,
      },
      {
        title: 'Governing Law',
        content: 'These terms are governed by the laws of Rwanda. Any disputes shall be resolved in the courts of Rwanda.',
        order: 7,
        active: true,
      },
      {
        title: 'Contact Us',
        content: 'For questions about these Terms & Conditions, please contact us at: legal@aitour.rw or +250 791 468 299.',
        order: 8,
        active: true,
      },
    ],
    lastUpdated: new Date(),
    isActive: true,
  };

  return this.create(defaultContent);
};

const TermsContent = mongoose.model('TermsContent', termsContentSchema);
export default TermsContent;