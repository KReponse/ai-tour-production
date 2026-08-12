// backend/src/models/Review.js
// ✅ PRODUCTION READY - Review Model with Moderation Workflow
// ✅ COMPLETE FIXED - Removed index: true from status field
// ✅ All indexes defined ONLY in schema.index() section
// ✅ Supports: published, hidden, deleted, reported statuses
// ✅ Provider replies, report system, edit tracking, soft delete
// ✅ FIXED: Added getListingStats static method

import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    // =========================
    // RELATIONSHIPS
    // =========================
    traveler: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Traveler is required"],
    },

    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Provider is required"],
    },

    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: [true, "Booking is required"],
      unique: true, // One review per booking
    },

    listing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Listing",
      required: [true, "Listing is required"],
    },

    // =========================
    // REVIEW CONTENT
    // =========================
    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating must be at most 5"],
    },

    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      minlength: [3, "Title must be at least 3 characters"],
      maxlength: [100, "Title cannot exceed 100 characters"],
    },

    comment: {
      type: String,
      required: [true, "Comment is required"],
      trim: true,
      minlength: [10, "Comment must be at least 10 characters"],
      maxlength: [5000, "Comment cannot exceed 5000 characters"],
    },

    images: {
      type: [String],
      default: [],
      validate: {
        validator: function (v) {
          return v.length <= 10;
        },
        message: "Maximum 10 images allowed",
      },
    },

    // =========================
    // STATUS (Production Workflow)
    // =========================
    status: {
      type: String,
      enum: ["published", "hidden", "deleted", "reported"],
      default: "published",
      // ✅ REMOVED: index: true - defined in schema.index() below
    },

    // =========================
    // MODERATION
    // =========================
    hiddenBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    hiddenReason: {
      type: String,
      trim: true,
      maxlength: [500, "Hidden reason cannot exceed 500 characters"],
    },

    hiddenAt: {
      type: Date,
    },

    moderatedAt: {
      type: Date,
    },

    moderatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    moderationNotes: {
      type: String,
      trim: true,
      maxlength: [1000, "Moderation notes cannot exceed 1000 characters"],
    },

    // =========================
    // SOFT DELETE
    // =========================
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    deletedReason: {
      type: String,
      trim: true,
      maxlength: [500, "Delete reason cannot exceed 500 characters"],
    },

    deletedAt: {
      type: Date,
    },

    // =========================
    // REPORT SYSTEM
    // =========================
    reportedCount: {
      type: Number,
      default: 0,
      min: [0, "Reported count cannot be negative"],
    },

    reportedBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        reason: {
          type: String,
          required: true,
          trim: true,
          maxlength: [500, "Report reason cannot exceed 500 characters"],
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    reportThresholdReached: {
      type: Boolean,
      default: false,
    },

    // =========================
    // PROVIDER REPLY
    // =========================
    providerReply: {
      type: String,
      trim: true,
      maxlength: [2000, "Reply cannot exceed 2000 characters"],
    },

    providerReplyAt: {
      type: Date,
    },

    providerReplyUpdatedAt: {
      type: Date,
    },

    // =========================
    // EDIT TRACKING
    // =========================
    isEdited: {
      type: Boolean,
      default: false,
    },

    editedAt: {
      type: Date,
    },

    editCount: {
      type: Number,
      default: 0,
      min: [0, "Edit count cannot be negative"],
    },

    editHistory: [
      {
        title: { type: String },
        comment: { type: String },
        rating: { type: Number },
        editedAt: { type: Date, default: Date.now },
      },
    ],

    // =========================
    // VERIFICATION
    // =========================
    isVerifiedBooking: {
      type: Boolean,
      default: true,
    },

    reviewDeadline: {
      type: Date,
    },

    // =========================
    // HELPFUL SYSTEM
    // =========================
    helpfulCount: {
      type: Number,
      default: 0,
      min: [0, "Helpful count cannot be negative"],
    },

    helpfulUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // =========================
    // PUBLISHING
    // =========================
    publishedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// =========================
// ✅ ALL INDEXES DEFINED IN ONE PLACE
// =========================
// NO index:true in field definitions above
// All indexes defined ONLY here

// Single field indexes
reviewSchema.index({ traveler: 1 });
reviewSchema.index({ provider: 1 });
reviewSchema.index({ listing: 1 });
reviewSchema.index({ booking: 1 }, { unique: true });
reviewSchema.index({ status: 1 });
reviewSchema.index({ rating: 1 });
reviewSchema.index({ createdAt: -1 });
reviewSchema.index({ reportedCount: -1 });

// Compound indexes for common queries
reviewSchema.index({ traveler: 1, createdAt: -1 });
reviewSchema.index({ provider: 1, createdAt: -1 });
reviewSchema.index({ listing: 1, createdAt: -1 });
reviewSchema.index({ status: 1, createdAt: -1 });
reviewSchema.index({ provider: 1, status: 1 });
reviewSchema.index({ listing: 1, status: 1 });
reviewSchema.index({ listing: 1, status: 1, rating: 1 });
reviewSchema.index({ provider: 1, status: 1, createdAt: -1 });
reviewSchema.index({ status: 1, reportedCount: 1 });

// =========================
// ✅ IMPORTANT NOTES ON INDEXES:
// =========================
// 1. booking has unique:true - this automatically creates an index
// 2. No field has both index:true AND a schema.index() call
// 3. All indexes are defined ONLY in this section

// =========================
// ✅ VIRTUALS
// =========================

reviewSchema.virtual("canEdit").get(function () {
  if (this.status === "deleted") return false;
  if (this.status === "hidden") return false;
  
  const editWindowHours = parseInt(process.env.REVIEW_EDIT_WINDOW_HOURS) || 168; // 7 days
  const now = new Date();
  const diff = (now - this.createdAt) / (1000 * 60 * 60);
  return diff < editWindowHours;
});

reviewSchema.virtual("canDelete").get(function () {
  if (this.status === "deleted") return false;
  
  const deleteWindowHours = parseInt(process.env.REVIEW_DELETE_WINDOW_HOURS) || 168; // 7 days
  const now = new Date();
  const diff = (now - this.createdAt) / (1000 * 60 * 60);
  return diff < deleteWindowHours;
});

reviewSchema.virtual("canReply").get(function () {
  return this.status === "published" || this.status === "reported";
});

reviewSchema.virtual("isDeleted").get(function () {
  return this.status === "deleted";
});

reviewSchema.virtual("isPublished").get(function () {
  return this.status === "published";
});

reviewSchema.virtual("isHidden").get(function () {
  return this.status === "hidden";
});

reviewSchema.virtual("isReported").get(function () {
  return this.status === "reported" || this.reportedCount > 0;
});

reviewSchema.virtual("hasProviderReply").get(function () {
  return !!(this.providerReply && this.providerReply.trim());
});

reviewSchema.virtual("hasReports").get(function () {
  return this.reportedCount > 0;
});

reviewSchema.virtual("shouldFlag").get(function () {
  const threshold = parseInt(process.env.REVIEW_REPORT_THRESHOLD) || 5;
  return this.reportedCount >= threshold;
});

// =========================
// ✅ INSTANCE METHODS
// =========================

reviewSchema.methods.publish = async function () {
  this.status = "published";
  this.publishedAt = new Date();
  this.moderatedAt = new Date();
  await this.save();
  return this;
};

reviewSchema.methods.hide = async function (adminId, reason = "No reason provided") {
  this.status = "hidden";
  this.hiddenBy = adminId;
  this.hiddenReason = reason;
  this.hiddenAt = new Date();
  this.moderatedAt = new Date();
  this.moderatedBy = adminId;
  await this.save();
  return this;
};

reviewSchema.methods.restore = async function (adminId) {
  this.status = "published";
  this.hiddenBy = null;
  this.hiddenReason = null;
  this.hiddenAt = null;
  this.moderatedAt = new Date();
  this.moderatedBy = adminId;
  this.publishedAt = new Date();
  await this.save();
  return this;
};

reviewSchema.methods.softDelete = async function (userId, reason = "No reason provided") {
  this.status = "deleted";
  this.deletedBy = userId;
  this.deletedReason = reason;
  this.deletedAt = new Date();
  this.moderatedAt = new Date();
  this.moderatedBy = userId;
  await this.save();
  return this;
};

reviewSchema.methods.report = async function (userId, reason) {
  const alreadyReported = this.reportedBy.some(
    (r) => r.user.toString() === userId.toString()
  );
  
  if (alreadyReported) {
    throw new Error("You have already reported this review");
  }

  this.reportedBy.push({ user: userId, reason });
  this.reportedCount = this.reportedBy.length;
  
  const threshold = parseInt(process.env.REVIEW_REPORT_THRESHOLD) || 5;
  if (this.reportedCount >= threshold) {
    this.reportThresholdReached = true;
    this.status = "reported";
  }
  
  await this.save();
  return this;
};

reviewSchema.methods.addReply = async function (reply) {
  if (!this.canReply) {
    throw new Error("Cannot reply to this review in its current state");
  }
  
  this.providerReply = reply.trim();
  this.providerReplyAt = new Date();
  await this.save();
  return this;
};

reviewSchema.methods.updateReply = async function (reply) {
  if (!this.hasProviderReply) {
    throw new Error("No reply exists to update");
  }
  
  this.providerReply = reply.trim();
  this.providerReplyUpdatedAt = new Date();
  await this.save();
  return this;
};

reviewSchema.methods.edit = async function (data) {
  if (!this.canEdit) {
    throw new Error("Review edit window has expired");
  }
  
  this.editHistory.push({
    title: this.title,
    comment: this.comment,
    rating: this.rating,
    editedAt: new Date(),
  });
  
  if (data.rating) this.rating = data.rating;
  if (data.title) this.title = data.title.trim();
  if (data.comment) this.comment = data.comment.trim();
  if (data.images) this.images = data.images;
  
  this.isEdited = true;
  this.editedAt = new Date();
  this.editCount += 1;
  
  await this.save();
  return this;
};

// =========================
// ✅ STATIC METHODS
// =========================

reviewSchema.statics.getPublishedByListing = async function (listingId, options = {}) {
  const { page = 1, limit = 20, sort = "-createdAt" } = options;
  
  const filter = { listing: listingId, status: "published" };
  
  const [reviews, total] = await Promise.all([
    this.find(filter)
      .populate("traveler", "name profileImage avatar")
      .populate("provider", "name businessName")
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    this.countDocuments(filter),
  ]);
  
  return { reviews, total, page, limit, totalPages: Math.ceil(total / limit) };
};

reviewSchema.statics.getByProvider = async function (providerId, options = {}) {
  const { page = 1, limit = 20, status = null } = options;
  
  const filter = { provider: providerId };
  
  if (status) {
    filter.status = status;
  } else {
    filter.status = { $in: ["published", "reported", "hidden"] };
  }
  
  const [reviews, total] = await Promise.all([
    this.find(filter)
      .populate("traveler", "name profileImage avatar")
      .populate("listing", "title slug coverMedia")
      .populate("booking", "bookingCode")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    this.countDocuments(filter),
  ]);
  
  return { reviews, total, page, limit, totalPages: Math.ceil(total / limit) };
};

reviewSchema.statics.getForAdmin = async function (options = {}) {
  const {
    page = 1,
    limit = 20,
    status = null,
    search = null,
    rating = null,
    startDate = null,
    endDate = null,
    sort = "-createdAt",
  } = options;
  
  const filter = {};
  
  if (status && status !== "all") {
    filter.status = status;
  }
  
  if (rating) {
    filter.rating = parseInt(rating);
  }
  
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: "i" } },
      { comment: { $regex: search, $options: "i" } },
      { "traveler.name": { $regex: search, $options: "i" } },
      { "provider.name": { $regex: search, $options: "i" } },
      { "listing.title": { $regex: search, $options: "i" } },
    ];
  }
  
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }
  
  const [reviews, total] = await Promise.all([
    this.find(filter)
      .populate("traveler", "name email profileImage avatar")
      .populate("provider", "name email businessName avatar")
      .populate("listing", "title slug coverMedia")
      .populate("booking", "bookingCode")
      .populate("hiddenBy", "name email")
      .populate("deletedBy", "name email")
      .populate("moderatedBy", "name email")
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    this.countDocuments(filter),
  ]);
  
  return { reviews, total, page, limit, totalPages: Math.ceil(total / limit) };
};

reviewSchema.statics.getStats = async function () {
  const [total, published, hidden, deleted, reported, reportedCount, avgRating] = await Promise.all([
    this.countDocuments({}),
    this.countDocuments({ status: "published" }),
    this.countDocuments({ status: "hidden" }),
    this.countDocuments({ status: "deleted" }),
    this.countDocuments({ status: "reported" }),
    this.countDocuments({ reportedCount: { $gte: 5 } }),
    this.aggregate([
      { $match: { status: "published" } },
      { $group: { _id: null, avg: { $avg: "$rating" } } },
    ]),
  ]);
  
  const ratingDistribution = await this.aggregate([
    { $match: { status: "published" } },
    {
      $group: {
        _id: "$rating",
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);
  
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  ratingDistribution.forEach((r) => {
    distribution[r._id] = r.count;
  });
  
  return {
    total,
    published,
    hidden,
    deleted,
    reported,
    needsAttention: reportedCount,
    averageRating: avgRating[0]?.avg || 0,
    ratingDistribution: distribution,
  };
};

// =========================
// ✅ getListingStats
// =========================

reviewSchema.statics.getListingStats = async function (listingId, status = "published") {
  try {
    if (!listingId || typeof listingId !== 'string') {
      throw new Error('Invalid listing ID');
    }

    const listingObjectId = new mongoose.Types.ObjectId(listingId);

    const matchFilter = { 
      listing: listingObjectId,
    };
    
    if (status) {
      matchFilter.status = status;
    } else {
      matchFilter.status = { $in: ["published"] };
    }

    const stats = await this.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
          rating1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
          rating2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
          rating3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
          rating4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
          rating5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
        },
      },
    ]);

    if (!stats || stats.length === 0) {
      return {
        averageRating: 0,
        totalReviews: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        ratingCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      };
    }

    const result = stats[0];
    const totalReviews = result.totalReviews || 0;

    return {
      averageRating: totalReviews > 0 ? Math.round((result.averageRating || 0) * 10) / 10 : 0,
      totalReviews: totalReviews,
      distribution: {
        1: result.rating1 || 0,
        2: result.rating2 || 0,
        3: result.rating3 || 0,
        4: result.rating4 || 0,
        5: result.rating5 || 0,
      },
      ratingCounts: {
        1: result.rating1 || 0,
        2: result.rating2 || 0,
        3: result.rating3 || 0,
        4: result.rating4 || 0,
        5: result.rating5 || 0,
      },
      percentages: {
        1: totalReviews > 0 ? ((result.rating1 || 0) / totalReviews) * 100 : 0,
        2: totalReviews > 0 ? ((result.rating2 || 0) / totalReviews) * 100 : 0,
        3: totalReviews > 0 ? ((result.rating3 || 0) / totalReviews) * 100 : 0,
        4: totalReviews > 0 ? ((result.rating4 || 0) / totalReviews) * 100 : 0,
        5: totalReviews > 0 ? ((result.rating5 || 0) / totalReviews) * 100 : 0,
      },
    };
  } catch (error) {
    console.error('❌ Error in getListingStats:', error.message);
    return {
      averageRating: 0,
      totalReviews: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      ratingCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      percentages: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };
  }
};

// =========================
// ✅ PRE-SAVE MIDDLEWARE
// =========================

reviewSchema.pre("save", function (next) {
  if (this.isModified("status") && this.status === "published" && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  
  if (this.isModified("status") && this.status === "hidden" && !this.hiddenAt) {
    this.hiddenAt = new Date();
  }
  
  if (this.isModified("status") && this.status === "deleted" && !this.deletedAt) {
    this.deletedAt = new Date();
  }
  
  if (this.images && this.images.length > 10) {
    this.images = this.images.slice(0, 10);
  }
  
  next();
});

// =========================
// ✅ CREATE AND EXPORT MODEL
// =========================

const Review = mongoose.model("Review", reviewSchema);
export default Review;