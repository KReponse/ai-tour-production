// backend/src/models/HeroVideo.js
// ✅ NEW - Dedicated Hero Video Model
// ✅ Simple, focused on hero video management only
// ✅ FIXED: Increased fileSize limit to 100MB for hero videos

import mongoose from "mongoose";

const heroVideoSchema = new mongoose.Schema(
  {
    // ─── Core Information ──────────────────────────────────────
    title: {
      type: String,
      trim: true,
      default: "",
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    // ─── Video File ──────────────────────────────────────────────
    videoUrl: {
      type: String,
      required: [true, "Video URL is required"],
    },

    thumbnail: {
      type: String,
      default: null,
    },

    duration: {
      type: Number,
      default: 0,
      min: 0,
      max: 600, // Max 10 minutes (600 seconds)
    },

    mimeType: {
      type: String,
      enum: ["video/mp4", "video/webm", "video/quicktime", null],
      default: null,
    },

    // ✅ FIXED: Increased from 20MB to 100MB
    fileSize: {
      type: Number,
      default: 0,
      max: 100 * 1024 * 1024, // 100MB max
    },

    // ─── Display Settings ──────────────────────────────────────
    priority: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    // ─── Related Listing (Optional) ────────────────────────────
    listingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Listing",
      default: null,
    },

    // ─── Audit ──────────────────────────────────────────────────
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// =========================
// ✅ INDEXES
// =========================
heroVideoSchema.index({ isActive: 1, priority: -1 });
heroVideoSchema.index({ createdAt: -1 });
heroVideoSchema.index({ listingId: 1 });

// =========================
// ✅ VIRTUALS
// =========================
heroVideoSchema.virtual("hasThumbnail").get(function () {
  return !!this.thumbnail;
});

heroVideoSchema.virtual("isValid").get(function () {
  return !!(this.videoUrl && this.duration > 0);
});

// =========================
// ✅ INSTANCE METHODS
// =========================

/**
 * Toggle active status
 */
heroVideoSchema.methods.toggleActive = async function () {
  this.isActive = !this.isActive;
  await this.save();
  return this;
};

/**
 * Update priority
 */
heroVideoSchema.methods.updatePriority = async function (priority) {
  this.priority = priority;
  await this.save();
  return this;
};

// =========================
// ✅ STATIC METHODS
// =========================

/**
 * Get active hero videos for homepage
 */
heroVideoSchema.statics.getActiveHeroVideos = async function (limit = 10) {
  return this.find({
    isActive: true,
    videoUrl: { $ne: null },
  })
    .populate("listingId", "title slug price location coverImage")
    .sort({ priority: -1, createdAt: -1 })
    .limit(limit)
    .lean();
};

/**
 * Get admin list with pagination
 */
heroVideoSchema.statics.getAdminList = async function (options = {}) {
  const { page = 1, limit = 20, search = "" } = options;
  const skip = (page - 1) * limit;

  const filter = {};
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
    ];
  }

  const [items, total] = await Promise.all([
    this.find(filter)
      .populate("listingId", "title slug")
      .populate("createdBy", "name email")
      .sort({ priority: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    this.countDocuments(filter),
  ]);

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

/**
 * Check if video exists for listing
 */
heroVideoSchema.statics.existsForListing = async function (listingId) {
  const count = await this.countDocuments({ listingId });
  return count > 0;
};

// =========================
// ✅ TO JSON / TO OBJECT
// =========================
heroVideoSchema.set("toJSON", {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

heroVideoSchema.set("toObject", {
  virtuals: true,
});

// =========================
// ✅ CREATE AND EXPORT MODEL
// =========================
const HeroVideo = mongoose.model("HeroVideo", heroVideoSchema);
export default HeroVideo;