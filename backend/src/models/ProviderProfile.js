// backend/src/models/ProviderProfile.js
// ✅ UPDATED - Added WhatsApp field

import mongoose from "mongoose";

const providerProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    // =========================
    // BUSINESS INFORMATION
    // =========================
    businessName: {
      type: String,
      required: true,
      trim: true,
    },

    businessType: {
      type: String,
      enum: [
        "tour_operator",
        "hotel",
        "lodge",
        "restaurant",
        "transport",
        "guide",
        "events",
        "cafe",
        "shop",
        "other",
      ],
      default: "other",
    },

    description: {
      type: String,
      trim: true,
      maxlength: 1000,
    },

    // =========================
    // LOCATION
    // =========================
    country: {
      type: String,
      default: "Rwanda",
      trim: true,
    },

    city: {
      type: String,
      trim: true,
    },

    // =========================
    // BUSINESS PROFILE
    // =========================
    languages: [
      {
        type: String,
      },
    ],

    specializations: [
      {
        type: String,
      },
    ],

    yearsOfExperience: {
      type: String,
      trim: true,
    },

    // =========================
    // BRANDING
    // =========================
    logo: {
      type: String,
      trim: true,
    },

    coverImage: {
      type: String,
      trim: true,
    },

    // =========================
    // SOCIAL LINKS
    // =========================
    socialLinks: {
      facebook: { type: String, trim: true },
      instagram: { type: String, trim: true },
      twitter: { type: String, trim: true },
      linkedin: { type: String, trim: true },
      youtube: { type: String, trim: true },
      tiktok: { type: String, trim: true },
    },

    // =========================
    // BUSINESS HOURS
    // =========================
    businessHours: {
      monday: { open: String, close: String, closed: Boolean },
      tuesday: { open: String, close: String, closed: Boolean },
      wednesday: { open: String, close: String, closed: Boolean },
      thursday: { open: String, close: String, closed: Boolean },
      friday: { open: String, close: String, closed: Boolean },
      saturday: { open: String, close: String, closed: Boolean },
      sunday: { open: String, close: String, closed: Boolean },
    },

    // =========================
    // CONTACT
    // =========================
    phone: {
      type: String,
      trim: true,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
    },

    // ✅ NEW: WhatsApp Number (separate from phone)
    whatsapp: {
      type: String,
      trim: true,
    },

    // =========================
    // STATS (calculated)
    // =========================
    averageRating: {
      type: Number,
      default: 0,
    },

    totalReviews: {
      type: Number,
      default: 0,
    },

    totalTours: {
      type: Number,
      default: 0,
    },

    totalBookings: {
      type: Number,
      default: 0,
    },

    // =========================
    // STATUS
    // =========================
    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
    },

    verified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// =========================
// ✅ INDEXES
// =========================
providerProfileSchema.index({ businessName: "text" });
providerProfileSchema.index({ averageRating: -1 });
providerProfileSchema.index({ status: 1, createdAt: -1 });

// =========================
// VIRTUAL: Full address
// =========================
providerProfileSchema.virtual("fullAddress").get(function () {
  return [this.city, this.country].filter(Boolean).join(", ");
});

// =========================
// VIRTUAL: Is verified
// =========================
providerProfileSchema.virtual("isVerified").get(function () {
  return this.verified && this.status === "active";
});

// ✅ NEW: Virtual to get WhatsApp number (fallback to phone if not set)
providerProfileSchema.virtual("whatsappNumber").get(function () {
  return this.whatsapp || this.phone || null;
});

// =========================
// TO JSON
// =========================
providerProfileSchema.set("toJSON", {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

const ProviderProfile = mongoose.model("ProviderProfile", providerProfileSchema);
export default ProviderProfile;