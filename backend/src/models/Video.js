// backend/src/models/Video.js
// ✅ UPDATED - Uses listing instead of tour

import mongoose from "mongoose";

const videoSchema = new mongoose.Schema(
  {
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    listing: { // ✅ Changed from 'tour' to 'listing'
      type: mongoose.Schema.Types.ObjectId,
      ref: "Listing",
      default: null,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    videoUrl: {
      type: String,
      required: true,
    },

    thumbnail: {
      type: String,
      default: "",
    },

    duration: {
      type: Number,
      default: 0, // seconds
    },

    location: {
      type: String,
      default: "",
    },

    category: {
      type: String,
      enum: [
        "Tour",
        "Hotel",
        "Restaurant",
        "Adventure",
        "Wildlife",
        "Culture",
        "Transport",
        "Other",
      ],
      default: "Tour",
    },

    views: {
      type: Number,
      default: 0,
    },

    likes: {
      type: Number,
      default: 0,
    },

    featured: {
      type: Boolean,
      default: false,
    },

    status: {
      type: String,
      enum: [
        "pending",
        "approved",
        "rejected",
      ],
      default: "approved",
    },

    isPublic: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// ===============================
// INDEXES
// ===============================

videoSchema.index({ provider: 1 });
videoSchema.index({ listing: 1 }); // ✅ Changed from tour to listing
videoSchema.index({ featured: 1 });
videoSchema.index({ createdAt: -1 });
videoSchema.index({ views: -1 });
videoSchema.index({ likes: -1 });

export default mongoose.model("Video", videoSchema);