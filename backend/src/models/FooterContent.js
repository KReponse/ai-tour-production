  // backend/src/models/FooterContent.js
  // ✅ NEW - Footer Content Model

  import mongoose from "mongoose";

  const footerLinkSchema = new mongoose.Schema({
    label: {
      type: String,
      required: true,
      trim: true,
    },
    path: {
      type: String,
      required: true,
      trim: true,
    },
    isExternal: {
      type: Boolean,
      default: false,
    },
    order: {
      type: Number,
      default: 0,
    },
    active: {
      type: Boolean,
      default: true,
    },
  });

  const footerSectionSchema = new mongoose.Schema({
    title: {
      type: String,
      required: true,
      trim: true,
    },
    sectionId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    links: [footerLinkSchema],
    order: {
      type: Number,
      default: 0,
    },
    active: {
      type: Boolean,
      default: true,
    },
  });

  const footerContentSchema = new mongoose.Schema(
    {
      // ─── Branding ──────────────────────────────────────────────
      brandName: {
        type: String,
        default: "AI Tour Rwanda",
        trim: true,
      },
      brandTagline: {
        type: String,
        default: "Smart Tourism Platform",
        trim: true,
      },
      description: {
        type: String,
        default: "Discover Rwanda with AI-powered travel planning, smart recommendations, bookings, and unforgettable experiences.",
        trim: true,
      },
      logo: {
        type: String,
        default: "",
        trim: true,
      },

      // ─── Contact Information ──────────────────────────────────
      contact: {
        email: { type: String, default: "aitourrwanda@gmail.com", trim: true },
        phone: { type: String, default: "+250 791 468 299", trim: true },
        address: { type: String, default: "Kigali, Rwanda", trim: true },
      },

      // ─── Social Media ─────────────────────────────────────────
      socialLinks: {
        facebook: { type: String, default: "", trim: true },
        instagram: { type: String, default: "", trim: true },
        twitter: { type: String, default: "", trim: true },
        linkedin: { type: String, default: "", trim: true },
        youtube: { type: String, default: "", trim: true },
        tiktok: { type: String, default: "", trim: true },
      },

      // ─── Footer Sections ──────────────────────────────────────
      sections: [footerSectionSchema],

      // ─── Newsletter ────────────────────────────────────────────
      newsletter: {
        enabled: { type: Boolean, default: true },
        title: { type: String, default: "Travel Smarter with AI" },
        description: { type: String, default: "Subscribe for AI travel tips, destination updates, and exclusive Rwanda experiences." },
        placeholder: { type: String, default: "Enter your email" },
        buttonText: { type: String, default: "Subscribe" },
      },

      // ─── Copyright ────────────────────────────────────────────
      copyrightText: {
        type: String,
        default: "AI Tour Rwanda. All rights reserved.",
        trim: true,
      },

      // ─── Status ───────────────────────────────────────────────
      isActive: {
        type: Boolean,
        default: true,
      },
    },
    {
      timestamps: true,
    }
  );

  // =========================
  // ✅ INDEXES
  // =========================
  footerContentSchema.index({ isActive: 1 });
  footerContentSchema.index({ updatedAt: -1 });

  // =========================
  // ✅ STATIC METHODS
  // =========================

  /**
   * Get active footer content
   */
  footerContentSchema.statics.getActiveContent = async function() {
    let content = await this.findOne({ isActive: true });
    
    if (!content) {
      // Create default footer content
      content = await this.createDefaultContent();
    }
    
    return content;
  };

  /**
   * Create default footer content
   */
  footerContentSchema.statics.createDefaultContent = async function() {
    const defaultSections = [
      {
        sectionId: "company",
        title: "Company",
        order: 0,
        active: true,
        links: [
          { label: "About Us", path: "/about", order: 0, active: true },
          { label: "Careers", path: "/careers", order: 1, active: true },
          { label: "Blog", path: "/blog", order: 2, active: true },
          { label: "Contact", path: "/contact", order: 3, active: true },
        ],
      },
      {
        sectionId: "support",
        title: "Support",
        order: 1,
        active: true,
        links: [
          { label: "Help Center", path: "/help", order: 0, active: true },
          { label: "FAQs", path: "/faqs", order: 1, active: true },
        ],
      },
      {
        sectionId: "legal",
        title: "Legal",
        order: 2,
        active: true,
        links: [
          { label: "Privacy Policy", path: "/privacy", order: 0, active: true },
          { label: "Terms & Conditions", path: "/terms", order: 1, active: true },
        ],
      },
    ];

    const defaultContent = {
      brandName: "AI Tour Rwanda",
      brandTagline: "Smart Tourism Platform",
      description: "Discover Rwanda with AI-powered travel planning, smart recommendations, bookings, and unforgettable experiences.",
      contact: {
        email: "aitourrwanda@gmail.com",
        phone: "+250 791 468 299",
        address: "Kigali, Rwanda",
      },
      socialLinks: {
        facebook: "",
        instagram: "",
        twitter: "",
        linkedin: "",
        youtube: "",
        tiktok: "",
      },
      sections: defaultSections,
      newsletter: {
        enabled: true,
        title: "Travel Smarter with AI",
        description: "Subscribe for AI travel tips, destination updates, and exclusive Rwanda experiences.",
        placeholder: "Enter your email",
        buttonText: "Subscribe",
      },
      copyrightText: "AI Tour Rwanda. All rights reserved.",
      isActive: true,
    };

    return this.create(defaultContent);
  };

  const FooterContent = mongoose.model("FooterContent", footerContentSchema);
  export default FooterContent;