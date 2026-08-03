// backend/src/models/ContactContent.js
// ✅ NEW - Contact Content Model

import mongoose from 'mongoose';

const contactInfoSchema = new mongoose.Schema({
  icon: { type: String, default: 'Mail' },
  label: { type: String, required: true },
  value: { type: String, required: true },
  href: { type: String, default: '#' },
  order: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
});

const contactContentSchema = new mongoose.Schema(
  {
    // ─── Hero ──────────────────────────────────────────────────
    hero: {
      title: { type: String, default: 'Get in Touch' },
      subtitle: { type: String, default: 'Have questions? We\'re here to help you plan your perfect Rwanda adventure.' },
      image: { type: String, default: '' },
    },

    // ─── Contact Information ──────────────────────────────────
    contactInfo: [contactInfoSchema],

    // ─── Social Links ──────────────────────────────────────────
    socialLinks: {
      facebook: { type: String, default: '', trim: true },
      instagram: { type: String, default: '', trim: true },
      twitter: { type: String, default: '', trim: true },
      linkedin: { type: String, default: '', trim: true },
      youtube: { type: String, default: '', trim: true },
    },

    // ─── Google Map ────────────────────────────────────────────
    map: {
      enabled: { type: Boolean, default: false },
      embedUrl: { type: String, default: '' },
      address: { type: String, default: '' },
    },

    // ─── Working Hours ─────────────────────────────────────────
    workingHours: {
      enabled: { type: Boolean, default: true },
      weekdays: { type: String, default: 'Mon-Fri: 8AM - 6PM' },
      weekends: { type: String, default: 'Sat-Sun: 9AM - 4PM' },
      holidays: { type: String, default: 'Closed on Public Holidays' },
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
contactContentSchema.index({ isActive: 1 });
contactContentSchema.index({ updatedAt: -1 });

// ─── Static Methods ─────────────────────────────────────────────

/**
 * Get active contact content
 */
contactContentSchema.statics.getActiveContent = async function () {
  let content = await this.findOne({ isActive: true });

  if (!content) {
    content = await this.createDefaultContent();
  }

  return content;
};

/**
 * Create default contact content
 */
contactContentSchema.statics.createDefaultContent = async function () {
  const defaultContent = {
    hero: {
      title: 'Get in Touch',
      subtitle: 'Have questions? We\'re here to help you plan your perfect Rwanda adventure.',
      image: '',
    },
    contactInfo: [
      {
        icon: 'Mail',
        label: 'Email',
        value: 'info@aitour.rw',
        href: 'mailto:info@aitour.rw',
        order: 0,
        active: true,
      },
      {
        icon: 'Phone',
        label: 'Phone',
        value: '+250 791 468 299',
        href: 'tel:+250791468299',
        order: 1,
        active: true,
      },
      {
        icon: 'MapPin',
        label: 'Address',
        value: 'Kigali, Rwanda',
        href: '#',
        order: 2,
        active: true,
      },
      {
        icon: 'Clock',
        label: 'Working Hours',
        value: 'Mon-Fri: 8AM - 6PM',
        href: '#',
        order: 3,
        active: true,
      },
    ],
    socialLinks: {
      facebook: '',
      instagram: '',
      twitter: '',
      linkedin: '',
      youtube: '',
    },
    map: {
      enabled: false,
      embedUrl: '',
      address: 'Kigali, Rwanda',
    },
    workingHours: {
      enabled: true,
      weekdays: 'Mon-Fri: 8AM - 6PM',
      weekends: 'Sat-Sun: 9AM - 4PM',
      holidays: 'Closed on Public Holidays',
    },
    isActive: true,
  };

  return this.create(defaultContent);
};

const ContactContent = mongoose.model('ContactContent', contactContentSchema);
export default ContactContent;