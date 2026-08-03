// backend/src/controllers/adminReviewController.js
// ✅ PRODUCTION READY - Admin Review Moderation Controller

import Review from "../models/Review.js";
import Listing from "../models/Listing.js";
import User from "../models/User.js";
import { createNotification } from "../utils/notificationService.js";

// ============================================================
// ✅ GET ALL REVIEWS (Admin)
// ============================================================
export const getAllReviews = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status = null,
      search = null,
      rating = null,
      startDate = null,
      endDate = null,
      sort = "-createdAt",
    } = req.query;

    const result = await Review.getForAdmin({
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      search,
      rating,
      startDate,
      endDate,
      sort,
    });

    // Get stats
    const stats = await Review.getStats();

    res.json({
      success: true,
      reviews: result.reviews,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
      stats,
    });
  } catch (error) {
    console.error("❌ Get all reviews error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch reviews",
    });
  }
};

// ============================================================
// ✅ GET REVIEW STATS (Admin)
// ============================================================
export const getReviewStats = async (req, res) => {
  try {
    const stats = await Review.getStats();

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("❌ Get review stats error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch review stats",
    });
  }
};

// ============================================================
// ✅ HIDE REVIEW (Admin)
// ============================================================
export const hideReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminId = req.user._id || req.user.id;

    const review = await Review.findById(id)
      .populate("traveler", "name email")
      .populate("provider", "name email");

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    if (review.status === "deleted") {
      return res.status(400).json({
        success: false,
        message: "Cannot hide a deleted review",
      });
    }

    if (review.status === "hidden") {
      return res.status(400).json({
        success: false,
        message: "Review is already hidden",
      });
    }

    await review.hide(adminId, reason || "Hidden by admin");

    // Notify traveler
    await createNotification({
      recipient: review.traveler,
      sender: adminId,
      type: "review_hidden",
      title: "Review Hidden by Admin",
      message: `Your review on "${review.title}" has been hidden by an admin. Reason: ${reason || "Not provided"}`,
      data: { reviewId: review._id },
      link: `/my-reviews/${review._id}`,
    });

    res.json({
      success: true,
      message: "Review hidden successfully",
      review,
    });
  } catch (error) {
    console.error("❌ Hide review error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to hide review",
    });
  }
};

// ============================================================
// ✅ RESTORE REVIEW (Admin)
// ============================================================
export const restoreReview = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user._id || req.user.id;

    const review = await Review.findById(id)
      .populate("traveler", "name email");

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    if (review.status === "deleted") {
      return res.status(400).json({
        success: false,
        message: "Cannot restore a deleted review",
      });
    }

    if (review.status === "published") {
      return res.status(400).json({
        success: false,
        message: "Review is already published",
      });
    }

    await review.restore(adminId);

    // Update listing rating
    await updateListingRating(review.listing);

    // Notify traveler
    await createNotification({
      recipient: review.traveler,
      sender: adminId,
      type: "review_restored",
      title: "Review Restored ✅",
      message: `Your review on "${review.title}" has been restored by an admin`,
      data: { reviewId: review._id },
      link: `/my-reviews/${review._id}`,
    });

    res.json({
      success: true,
      message: "Review restored successfully",
      review,
    });
  } catch (error) {
    console.error("❌ Restore review error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to restore review",
    });
  }
};

// ============================================================
// ✅ PERMANENT DELETE REVIEW (Admin)
// ============================================================
export const permanentDeleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminId = req.user._id || req.user.id;

    const review = await Review.findById(id)
      .populate("traveler", "name email");

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    // Notify traveler before deletion
    await createNotification({
      recipient: review.traveler,
      sender: adminId,
      type: "review_permanently_deleted",
      title: "Review Permanently Deleted 🗑️",
      message: `Your review "${review.title}" has been permanently deleted by an admin. Reason: ${reason || "Not provided"}`,
      data: { reviewId: review._id },
    });

    // Update listing rating before deleting
    await updateListingRating(review.listing);

    // Permanently delete
    await Review.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Review permanently deleted successfully",
    });
  } catch (error) {
    console.error("❌ Permanent delete review error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to permanently delete review",
    });
  }
};

// ============================================================
// ✅ UPDATE REVIEW STATUS (Admin)
// ============================================================
export const updateReviewStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;
    const adminId = req.user._id || req.user.id;

    const validStatuses = ["published", "hidden", "deleted", "reported"];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const review = await Review.findById(id)
      .populate("traveler", "name email");

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    // Handle based on status
    let result;
    switch (status) {
      case "published":
        result = await review.restore(adminId);
        break;
      case "hidden":
        result = await review.hide(adminId, reason || "Hidden by admin");
        break;
      case "deleted":
        result = await review.softDelete(adminId, reason || "Deleted by admin");
        break;
      case "reported":
        review.status = "reported";
        review.moderatedAt = new Date();
        review.moderatedBy = adminId;
        await review.save();
        result = review;
        break;
      default:
        return res.status(400).json({
          success: false,
          message: "Invalid status",
        });
    }

    // Update listing rating if status changed to/from published
    if (["published", "hidden", "deleted"].includes(status)) {
      await updateListingRating(review.listing);
    }

    res.json({
      success: true,
      message: `Review status updated to ${status}`,
      review: result,
    });
  } catch (error) {
    console.error("❌ Update review status error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update review status",
    });
  }
};

// ============================================================
// ✅ GET REVIEW BY ID (Admin)
// ============================================================
export const getReviewByIdAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    const review = await Review.findById(id)
      .populate("traveler", "name email profileImage avatar")
      .populate("provider", "name email businessName avatar")
      .populate("listing", "title slug coverMedia")
      .populate("booking", "bookingCode startDate totalPrice")
      .populate("hiddenBy", "name email")
      .populate("deletedBy", "name email")
      .populate("moderatedBy", "name email")
      .populate("reportedBy.user", "name email")
      .populate("editHistory.editedAt");

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    res.json({
      success: true,
      review,
    });
  } catch (error) {
    console.error("❌ Get review by id admin error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch review",
    });
  }
};

// ============================================================
// ✅ HELPER FUNCTIONS
// ============================================================

/**
 * Update listing average rating and total reviews
 */
const updateListingRating = async (listingId) => {
  try {
    const result = await Review.aggregate([
      { $match: { listing: listingId, status: "published" } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
        },
      },
    ]);

    const stats = result[0] || { averageRating: 0, totalReviews: 0 };

    await Listing.findByIdAndUpdate(listingId, {
      averageRating: Math.round(stats.averageRating * 10) / 10,
      totalReviews: stats.totalReviews,
    });
  } catch (error) {
    console.error("❌ Error updating listing rating:", error);
  }
};