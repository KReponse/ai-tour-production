
// backend/src/models/Review.js
// ✅ PRODUCTION READY - Review Model
// ✅ Provider reviews supported
// ✅ Provider stored directly on every review
// ✅ Backward-compatible provider fallback through listing
// ✅ Moderation workflow
// ✅ Soft delete
// ✅ Reports
// ✅ Provider replies
// ✅ Edit history
// ✅ Helpful system
// ✅ Pagination helpers
// ✅ Listing statistics
// ✅ Centralized indexes

import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    // ============================================================
    // RELATIONSHIPS
    // ============================================================

    traveler: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Traveler is required"],
      index: false,
    },

    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Provider is required"],
      index: false,
    },

    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: [true, "Booking is required"],
      index: false,
    },

    listing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Listing",
      required: [true, "Listing is required"],
      index: false,
    },

    // ============================================================
    // REVIEW CONTENT
    // ============================================================

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
        validator: function (value) {
          return Array.isArray(value) && value.length <= 10;
        },
        message: "Maximum 10 images allowed",
      },
    },

    // ============================================================
    // STATUS
    // ============================================================

    status: {
      type: String,
      enum: {
        values: ["published", "hidden", "deleted", "reported"],
        message: "Invalid review status: {VALUE}",
      },
      default: "published",
    },

    // ============================================================
    // MODERATION
    // ============================================================

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

    // ============================================================
    // SOFT DELETE
    // ============================================================

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

    // ============================================================
    // REPORT SYSTEM
    // ============================================================

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

    // ============================================================
    // PROVIDER REPLY
    // ============================================================

    providerReply: {
      type: String,
      trim: true,
      maxlength: [2000, "Provider reply cannot exceed 2000 characters"],
    },

    providerReplyAt: {
      type: Date,
    },

    providerReplyUpdatedAt: {
      type: Date,
    },

    // ============================================================
    // EDIT TRACKING
    // ============================================================

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
        title: {
          type: String,
        },

        comment: {
          type: String,
        },

        rating: {
          type: Number,
          min: 1,
          max: 5,
        },

        editedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // ============================================================
    // VERIFICATION
    // ============================================================

    isVerifiedBooking: {
      type: Boolean,
      default: true,
    },

    reviewDeadline: {
      type: Date,
    },

    // ============================================================
    // HELPFUL SYSTEM
    // ============================================================

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

    // ============================================================
    // PUBLISHING
    // ============================================================

    publishedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,

    toJSON: {
      virtuals: true,
    },

    toObject: {
      virtuals: true,
    },
  }
);

// ============================================================
// INDEXES
// ============================================================

// Basic indexes
reviewSchema.index({ traveler: 1 });
reviewSchema.index({ provider: 1 });
reviewSchema.index({ listing: 1 });
reviewSchema.index({ booking: 1 }, { unique: true });
reviewSchema.index({ status: 1 });
reviewSchema.index({ rating: 1 });
reviewSchema.index({ createdAt: -1 });
reviewSchema.index({ reportedCount: -1 });

// Traveler queries
reviewSchema.index({
  traveler: 1,
  createdAt: -1,
});

// Provider queries
reviewSchema.index({
  provider: 1,
  createdAt: -1,
});

reviewSchema.index({
  provider: 1,
  status: 1,
  createdAt: -1,
});

// Listing queries
reviewSchema.index({
  listing: 1,
  createdAt: -1,
});

reviewSchema.index({
  listing: 1,
  status: 1,
  createdAt: -1,
});

// Status queries
reviewSchema.index({
  status: 1,
  createdAt: -1,
});

// Rating filtering
reviewSchema.index({
  provider: 1,
  status: 1,
  rating: 1,
});

reviewSchema.index({
  listing: 1,
  status: 1,
  rating: 1,
});

// Moderation
reviewSchema.index({
  status: 1,
  reportedCount: -1,
});

// ============================================================
// VIRTUALS
// ============================================================

reviewSchema.virtual("canEdit").get(function () {
  if (this.status === "deleted") return false;
  if (this.status === "hidden") return false;

  if (!this.createdAt) return false;

  const editWindowHours =
    parseInt(process.env.REVIEW_EDIT_WINDOW_HOURS, 10) || 168;

  const diffHours =
    (Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60);

  return diffHours >= 0 && diffHours < editWindowHours;
});

// ------------------------------------------------------------

reviewSchema.virtual("canDelete").get(function () {
  if (this.status === "deleted") return false;

  if (!this.createdAt) return false;

  const deleteWindowHours =
    parseInt(process.env.REVIEW_DELETE_WINDOW_HOURS, 10) || 168;

  const diffHours =
    (Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60);

  return diffHours >= 0 && diffHours < deleteWindowHours;
});

// ------------------------------------------------------------

reviewSchema.virtual("canReply").get(function () {
  return this.status === "published" || this.status === "reported";
});

// ------------------------------------------------------------

reviewSchema.virtual("isDeleted").get(function () {
  return this.status === "deleted";
});

// ------------------------------------------------------------

reviewSchema.virtual("isPublished").get(function () {
  return this.status === "published";
});

// ------------------------------------------------------------

reviewSchema.virtual("isHidden").get(function () {
  return this.status === "hidden";
});

// ------------------------------------------------------------

reviewSchema.virtual("isReported").get(function () {
  return (
    this.status === "reported" ||
    Number(this.reportedCount || 0) > 0
  );
});

// ------------------------------------------------------------

reviewSchema.virtual("hasProviderReply").get(function () {
  return Boolean(
    this.providerReply &&
      typeof this.providerReply === "string" &&
      this.providerReply.trim()
  );
});

// ------------------------------------------------------------

reviewSchema.virtual("hasReports").get(function () {
  return Number(this.reportedCount || 0) > 0;
});

// ------------------------------------------------------------

reviewSchema.virtual("shouldFlag").get(function () {
  const threshold =
    parseInt(process.env.REVIEW_REPORT_THRESHOLD, 10) || 5;

  return Number(this.reportedCount || 0) >= threshold;
});

// ============================================================
// INSTANCE METHODS
// ============================================================

// ------------------------------------------------------------
// Publish
// ------------------------------------------------------------

reviewSchema.methods.publish = async function () {
  this.status = "published";
  this.publishedAt = new Date();

  this.moderatedAt = new Date();

  await this.save();

  return this;
};

// ------------------------------------------------------------
// Hide
// ------------------------------------------------------------

reviewSchema.methods.hide = async function (
  adminId,
  reason = "No reason provided"
) {
  this.status = "hidden";

  this.hiddenBy = adminId;
  this.hiddenReason = reason;

  this.hiddenAt = new Date();

  this.moderatedAt = new Date();
  this.moderatedBy = adminId;

  await this.save();

  return this;
};

// ------------------------------------------------------------
// Restore
// ------------------------------------------------------------

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

// ------------------------------------------------------------
// Soft Delete
// ------------------------------------------------------------

reviewSchema.methods.softDelete = async function (
  userId,
  reason = "No reason provided"
) {
  this.status = "deleted";

  this.deletedBy = userId;
  this.deletedReason = reason;
  this.deletedAt = new Date();

  this.moderatedAt = new Date();
  this.moderatedBy = userId;

  await this.save();

  return this;
};

// ------------------------------------------------------------
// Report
// ------------------------------------------------------------

reviewSchema.methods.report = async function (userId, reason) {
  if (!userId) {
    throw new Error("User ID is required to report a review");
  }

  if (!reason || !reason.trim()) {
    throw new Error("Report reason is required");
  }

  const alreadyReported = this.reportedBy.some(
    (report) =>
      report.user &&
      String(report.user) === String(userId)
  );

  if (alreadyReported) {
    throw new Error("You have already reported this review");
  }

  this.reportedBy.push({
    user: userId,
    reason: reason.trim(),
    createdAt: new Date(),
  });

  this.reportedCount = this.reportedBy.length;

  const threshold =
    parseInt(process.env.REVIEW_REPORT_THRESHOLD, 10) || 5;

  if (this.reportedCount >= threshold) {
    this.reportThresholdReached = true;

    if (this.status !== "deleted") {
      this.status = "reported";
    }
  }

  await this.save();

  return this;
};

// ------------------------------------------------------------
// Add provider reply
// ------------------------------------------------------------

reviewSchema.methods.addReply = async function (reply) {
  if (!reply || !reply.trim()) {
    throw new Error("Reply is required");
  }

  if (!this.canReply) {
    throw new Error(
      "Cannot reply to this review in its current state"
    );
  }

  if (this.hasProviderReply) {
    throw new Error(
      "A provider reply already exists for this review"
    );
  }

  this.providerReply = reply.trim();
  this.providerReplyAt = new Date();
  this.providerReplyUpdatedAt = null;

  await this.save();

  return this;
};

// ------------------------------------------------------------
// Update provider reply
// ------------------------------------------------------------

reviewSchema.methods.updateReply = async function (reply) {
  if (!reply || !reply.trim()) {
    throw new Error("Reply is required");
  }

  if (!this.hasProviderReply) {
    throw new Error("No reply exists to update");
  }

  this.providerReply = reply.trim();
  this.providerReplyUpdatedAt = new Date();

  await this.save();

  return this;
};

// ------------------------------------------------------------
// Edit review
// ------------------------------------------------------------

reviewSchema.methods.edit = async function (data = {}) {
  if (!this.canEdit) {
    throw new Error("Review edit window has expired");
  }

  const hasRating =
    data.rating !== undefined &&
    data.rating !== null &&
    data.rating !== "";

  const hasTitle =
    data.title !== undefined &&
    data.title !== null;

  const hasComment =
    data.comment !== undefined &&
    data.comment !== null;

  const hasImages =
    data.images !== undefined &&
    data.images !== null;

  // Validate rating
  if (hasRating) {
    const numericRating = Number(data.rating);

    if (
      !Number.isFinite(numericRating) ||
      numericRating < 1 ||
      numericRating > 5
    ) {
      throw new Error(
        "Rating must be a number between 1 and 5"
      );
    }
  }

  // Validate title
  if (hasTitle) {
    const cleanTitle = String(data.title).trim();

    if (cleanTitle.length < 3) {
      throw new Error(
        "Review title must be at least 3 characters"
      );
    }

    if (cleanTitle.length > 100) {
      throw new Error(
        "Review title cannot exceed 100 characters"
      );
    }
  }

  // Validate comment
  if (hasComment) {
    const cleanComment = String(data.comment).trim();

    if (cleanComment.length < 10) {
      throw new Error(
        "Review comment must be at least 10 characters"
      );
    }

    if (cleanComment.length > 5000) {
      throw new Error(
        "Review comment cannot exceed 5000 characters"
      );
    }
  }

  // Validate images
  if (hasImages) {
    if (!Array.isArray(data.images)) {
      throw new Error("Images must be an array");
    }

    if (data.images.length > 10) {
      throw new Error("Maximum 10 images allowed");
    }
  }

  // Save previous version
  this.editHistory.push({
    title: this.title,
    comment: this.comment,
    rating: this.rating,
    editedAt: new Date(),
  });

  // Apply changes
  if (hasRating) {
    this.rating = Number(data.rating);
  }

  if (hasTitle) {
    this.title = String(data.title).trim();
  }

  if (hasComment) {
    this.comment = String(data.comment).trim();
  }

  if (hasImages) {
    this.images = data.images;
  }

  this.isEdited = true;
  this.editedAt = new Date();
  this.editCount = Number(this.editCount || 0) + 1;

  await this.save();

  return this;
};

// ============================================================
// STATIC METHODS
// ============================================================

// ------------------------------------------------------------
// Get published reviews by listing
// ------------------------------------------------------------

reviewSchema.statics.getPublishedByListing = async function (
  listingId,
  options = {}
) {
  if (!listingId) {
    throw new Error("Listing ID is required");
  }

  const page = Math.max(
    1,
    parseInt(options.page, 10) || 1
  );

  const limit = Math.min(
    100,
    Math.max(1, parseInt(options.limit, 10) || 20)
  );

  const sort =
    options.sort === "rating"
      ? { rating: -1, createdAt: -1 }
      : { createdAt: -1 };

  const filter = {
    listing: listingId,
    status: "published",
  };

  const [reviews, total] = await Promise.all([
    this.find(filter)
      .populate(
        "traveler",
        "name profileImage avatar"
      )
      .populate(
        "provider",
        "name businessName avatar"
      )
      .populate(
        "booking",
        "bookingCode startDate status"
      )
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),

    this.countDocuments(filter),
  ]);

  return {
    reviews,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasNext: page * limit < total,
    hasPrev: page > 1,
  };
};

// ------------------------------------------------------------
// Get reviews by provider
// ------------------------------------------------------------

reviewSchema.statics.getByProvider = async function (
  providerId,
  options = {}
) {
  if (!providerId) {
    throw new Error("Provider ID is required");
  }

  const page = Math.max(
    1,
    parseInt(options.page, 10) || 1
  );

  const limit = Math.min(
    100,
    Math.max(1, parseInt(options.limit, 10) || 20)
  );

  const status =
    options.status &&
    options.status !== "all"
      ? options.status
      : null;

  const filter = {
    provider: providerId,
  };

  if (status) {
    filter.status = status;
  } else {
    filter.status = {
      $in: ["published", "reported", "hidden"],
    };
  }

  const [reviews, total] = await Promise.all([
    this.find(filter)
      .populate(
        "traveler",
        "name profileImage avatar"
      )
      .populate(
        "provider",
        "name businessName avatar email"
      )
      .populate(
        "listing",
        "title slug coverMedia provider"
      )
      .populate(
        "booking",
        "bookingCode startDate status"
      )
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),

    this.countDocuments(filter),
  ]);

  return {
    reviews,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasNext: page * limit < total,
    hasPrev: page > 1,
  };
};

// ------------------------------------------------------------
// Get admin reviews
// ------------------------------------------------------------

reviewSchema.statics.getForAdmin = async function (
  options = {}
) {
  const {
    page = 1,
    limit = 20,
    status = null,
    rating = null,
    startDate = null,
    endDate = null,
    sort = "-createdAt",
  } = options;

  const safePage = Math.max(
    1,
    parseInt(page, 10) || 1
  );

  const safeLimit = Math.min(
    100,
    Math.max(1, parseInt(limit, 10) || 20)
  );

  const filter = {};

  if (status && status !== "all") {
    filter.status = status;
  }

  if (rating !== null && rating !== undefined && rating !== "") {
    const numericRating = Number(rating);

    if (
      Number.isFinite(numericRating) &&
      numericRating >= 1 &&
      numericRating <= 5
    ) {
      filter.rating = numericRating;
    }
  }

  if (startDate || endDate) {
    filter.createdAt = {};

    if (startDate) {
      const start = new Date(startDate);

      if (!Number.isNaN(start.getTime())) {
        filter.createdAt.$gte = start;
      }
    }

    if (endDate) {
      const end = new Date(endDate);

      if (!Number.isNaN(end.getTime())) {
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }
  }

  const safeSort =
    sort === "rating"
      ? { rating: 1 }
      : sort === "-rating"
      ? { rating: -1 }
      : { createdAt: -1 };

  const [reviews, total] = await Promise.all([
    this.find(filter)
      .populate(
        "traveler",
        "name email profileImage avatar"
      )
      .populate(
        "provider",
        "name email businessName avatar"
      )
      .populate(
        "listing",
        "title slug coverMedia provider"
      )
      .populate(
        "booking",
        "bookingCode startDate status"
      )
      .populate(
        "hiddenBy",
        "name email"
      )
      .populate(
        "deletedBy",
        "name email"
      )
      .populate(
        "moderatedBy",
        "name email"
      )
      .sort(safeSort)
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit)
      .lean(),

    this.countDocuments(filter),
  ]);

  return {
    reviews,
    total,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.ceil(total / safeLimit),
    hasNext: safePage * safeLimit < total,
    hasPrev: safePage > 1,
  };
};

// ------------------------------------------------------------
// Global review stats
// ------------------------------------------------------------

reviewSchema.statics.getStats = async function () {
  const threshold =
    parseInt(
      process.env.REVIEW_REPORT_THRESHOLD,
      10
    ) || 5;

  const [
    total,
    published,
    hidden,
    deleted,
    reported,
    needsAttention,
    avgRating,
  ] = await Promise.all([
    this.countDocuments({}),

    this.countDocuments({
      status: "published",
    }),

    this.countDocuments({
      status: "hidden",
    }),

    this.countDocuments({
      status: "deleted",
    }),

    this.countDocuments({
      status: "reported",
    }),

    this.countDocuments({
      reportedCount: {
        $gte: threshold,
      },
    }),

    this.aggregate([
      {
        $match: {
          status: "published",
        },
      },

      {
        $group: {
          _id: null,
          avg: {
            $avg: "$rating",
          },
        },
      },
    ]),
  ]);

  const ratingDistribution = await this.aggregate([
    {
      $match: {
        status: "published",
      },
    },

    {
      $group: {
        _id: "$rating",
        count: {
          $sum: 1,
        },
      },
    },

    {
      $sort: {
        _id: 1,
      },
    },
  ]);

  const distribution = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };

  ratingDistribution.forEach((item) => {
    if (
      Object.prototype.hasOwnProperty.call(
        distribution,
        item._id
      )
    ) {
      distribution[item._id] = item.count;
    }
  });

  return {
    total,
    published,
    hidden,
    deleted,
    reported,
    needsAttention,
    averageRating: avgRating[0]?.avg || 0,
    ratingDistribution: distribution,
  };
};

// ------------------------------------------------------------
// Listing statistics
// ------------------------------------------------------------

reviewSchema.statics.getListingStats = async function (
  listingId,
  status = "published"
) {
  try {
    if (!listingId) {
      throw new Error("Listing ID is required");
    }

    let listingObjectId;

    if (
      listingId instanceof mongoose.Types.ObjectId
    ) {
      listingObjectId = listingId;
    } else if (
      mongoose.Types.ObjectId.isValid(listingId)
    ) {
      listingObjectId =
        new mongoose.Types.ObjectId(listingId);
    } else {
      throw new Error("Invalid listing ID");
    }

    const matchFilter = {
      listing: listingObjectId,
    };

    if (status === "all" || status === null) {
      matchFilter.status = {
        $in: ["published"],
      };
    } else {
      matchFilter.status = status;
    }

    const stats = await this.aggregate([
      {
        $match: matchFilter,
      },

      {
        $group: {
          _id: null,

          averageRating: {
            $avg: "$rating",
          },

          totalReviews: {
            $sum: 1,
          },

          rating1: {
            $sum: {
              $cond: [
                {
                  $eq: ["$rating", 1],
                },
                1,
                0,
              ],
            },
          },

          rating2: {
            $sum: {
              $cond: [
                {
                  $eq: ["$rating", 2],
                },
                1,
                0,
              ],
            },
          },

          rating3: {
            $sum: {
              $cond: [
                {
                  $eq: ["$rating", 3],
                },
                1,
                0,
              ],
            },
          },

          rating4: {
            $sum: {
              $cond: [
                {
                  $eq: ["$rating", 4],
                },
                1,
                0,
              ],
            },
          },

          rating5: {
            $sum: {
              $cond: [
                {
                  $eq: ["$rating", 5],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    if (!stats.length) {
      return {
        averageRating: 0,
        totalReviews: 0,

        distribution: {
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
        },

        ratingCounts: {
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
        },

        percentages: {
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
        },
      };
    }

    const result = stats[0];

    const totalReviews =
      result.totalReviews || 0;

    const distribution = {
      1: result.rating1 || 0,
      2: result.rating2 || 0,
      3: result.rating3 || 0,
      4: result.rating4 || 0,
      5: result.rating5 || 0,
    };

    return {
      averageRating:
        totalReviews > 0
          ? Math.round(
              (result.averageRating || 0) * 10
            ) / 10
          : 0,

      totalReviews,

      distribution,

      ratingCounts: distribution,

      percentages: {
        1:
          totalReviews > 0
            ? (distribution[1] / totalReviews) * 100
            : 0,

        2:
          totalReviews > 0
            ? (distribution[2] / totalReviews) * 100
            : 0,

        3:
          totalReviews > 0
            ? (distribution[3] / totalReviews) * 100
            : 0,

        4:
          totalReviews > 0
            ? (distribution[4] / totalReviews) * 100
            : 0,

        5:
          totalReviews > 0
            ? (distribution[5] / totalReviews) * 100
            : 0,
      },
    };
  } catch (error) {
    console.error(
      "❌ Error in Review.getListingStats:",
      error.message
    );

    return {
      averageRating: 0,
      totalReviews: 0,

      distribution: {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
      },

      ratingCounts: {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
      },

      percentages: {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
      },
    };
  }
};

// ============================================================
// PRE-SAVE MIDDLEWARE
// ============================================================

reviewSchema.pre("save", function (next) {
  // Published review gets publishedAt
  if (
    this.isModified("status") &&
    this.status === "published" &&
    !this.publishedAt
  ) {
    this.publishedAt = new Date();
  }

  // Hidden review gets hiddenAt
  if (
    this.isModified("status") &&
    this.status === "hidden" &&
    !this.hiddenAt
  ) {
    this.hiddenAt = new Date();
  }

  // Deleted review gets deletedAt
  if (
    this.isModified("status") &&
    this.status === "deleted" &&
    !this.deletedAt
  ) {
    this.deletedAt = new Date();
  }

  // Reported status
  if (
    this.isModified("reportedBy") ||
    this.isModified("reportedCount")
  ) {
    this.reportedCount = Array.isArray(this.reportedBy)
      ? this.reportedBy.length
      : Number(this.reportedCount || 0);

    const threshold =
      parseInt(
        process.env.REVIEW_REPORT_THRESHOLD,
        10
      ) || 5;

    if (this.reportedCount >= threshold) {
      this.reportThresholdReached = true;

      if (this.status !== "deleted") {
        this.status = "reported";
      }
    }
  }

  // Maximum images
  if (
    Array.isArray(this.images) &&
    this.images.length > 10
  ) {
    this.images = this.images.slice(0, 10);
  }

  next();
});

// ============================================================
// MODEL
// ============================================================

const Review =
  mongoose.models.Review ||
  mongoose.model("Review", reviewSchema);

export default Review;

