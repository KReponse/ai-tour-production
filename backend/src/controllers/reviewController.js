// backend/src/controllers/reviewController.js
// ✅ PRODUCTION READY - Review Controller
// ✅ Immediately published reviews
// ✅ Edit/delete windows
// ✅ Review reporting + moderation workflow
// ✅ Provider replies
// ✅ Provider reviews with ownership fallback
// ✅ Pagination + filters + sorting
// ✅ Compatible response: data + reviews

import Review from "../models/Review.js";
import Booking from "../models/Booking.js";
import Listing from "../models/Listing.js";
import User from "../models/User.js";
import { createNotification } from "../utils/notificationService.js";

// =========================
// CONFIGURABLE CONSTANTS
// =========================
const REVIEW_REPORT_THRESHOLD =
  parseInt(process.env.REVIEW_REPORT_THRESHOLD, 10) || 5;

const REVIEW_EDIT_WINDOW_HOURS =
  parseInt(process.env.REVIEW_EDIT_WINDOW_HOURS, 10) || 168;

const REVIEW_DELETE_WINDOW_HOURS =
  parseInt(process.env.REVIEW_DELETE_WINDOW_HOURS, 10) || 168;

// ============================================================
// CREATE REVIEW
// ============================================================
export const createReview = async (req, res) => {
  try {
    const { bookingId, rating, title, comment, images } = req.body;

    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: "Booking ID is required",
      });
    }

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5",
      });
    }

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Review title is required",
      });
    }

    if (!comment || !comment.trim()) {
      return res.status(400).json({
        success: false,
        message: "Review comment is required",
      });
    }

    const booking = await Booking.findById(bookingId)
      .populate("listing", "title provider")
      .populate("provider", "name email _id")
      .populate("user", "name email _id");

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    const bookingUserId = booking.user?._id || booking.user;
    const currentUserId = req.user?._id || req.user?.id;

    if (!currentUserId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (String(bookingUserId) !== String(currentUserId)) {
      return res.status(403).json({
        success: false,
        message: "You can only review your own bookings",
      });
    }

    const allowedStatuses = ["completed", "review_eligible"];

    if (!allowedStatuses.includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: `Booking must be completed before reviewing. Current status: ${booking.status}`,
      });
    }

    if (booking.paymentStatus !== "paid") {
      return res.status(400).json({
        success: false,
        message: "Payment must be confirmed before reviewing",
      });
    }

    const existingReview = await Review.findOne({
      booking: bookingId,
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: "You already reviewed this booking",
      });
    }

    const reviewDeadline = new Date(booking.updatedAt);
    reviewDeadline.setDate(reviewDeadline.getDate() + 30);

    if (new Date() > reviewDeadline) {
      return res.status(400).json({
        success: false,
        message: "Review window has expired (30 days after completion)",
      });
    }

    const entity = booking.listing;

    if (!entity) {
      return res.status(400).json({
        success: false,
        message: "No experience associated with this booking",
      });
    }

    // Determine provider from booking first,
    // then fallback to listing.provider.
    let providerId = null;

    if (booking.provider) {
      providerId = booking.provider._id || booking.provider;
    } else if (booking.listing?.provider) {
      providerId =
        booking.listing.provider._id || booking.listing.provider;
    }

    if (!providerId) {
      return res.status(400).json({
        success: false,
        message: "Could not determine provider for this booking",
      });
    }

    const review = await Review.create({
      traveler: currentUserId,
      provider: providerId,
      booking: booking._id,
      listing: booking.listing._id || booking.listing,
      rating,
      title: title.trim(),
      comment: comment.trim(),
      images: Array.isArray(images) ? images : [],
      isVerifiedBooking: true,
      reviewDeadline,
      status: "published",
      publishedAt: new Date(),
    });

    booking.canReview = false;
    booking.reviewSubmitted = true;

    await booking.save();

    await updateListingRating(booking.listing._id);

    try {
      await createNotification({
        recipient: providerId,
        sender: currentUserId,
        type: "new_review",
        title: "New Review Received ⭐",
        message: `${req.user?.name || "A traveler"} left a ${rating}-star review on "${entity.title}"`,
        data: {
          reviewId: review._id,
        },
        link: `/provider/reviews`,
      });
    } catch (notifError) {
      console.warn(
        "⚠️ Notification error:",
        notifError.message
      );
    }

    return res.status(201).json({
      success: true,
      message: "Review submitted successfully",
      review,
    });
  } catch (error) {
    console.error("❌ Create review error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create review",
    });
  }
};

// ============================================================
// EDIT REVIEW
// ============================================================
export const editReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, title, comment, images } = req.body;
    const userId = req.user?._id || req.user?.id;

    const review = await Review.findById(id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    if (String(review.traveler) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: "You can only edit your own reviews",
      });
    }

    if (review.status === "deleted") {
      return res.status(400).json({
        success: false,
        message: "Cannot edit a deleted review",
      });
    }

    if (!review.canEdit) {
      return res.status(400).json({
        success: false,
        message: `Review edit window has expired (${REVIEW_EDIT_WINDOW_HOURS} hours after submission)`,
      });
    }

    const oldRating = review.rating;

    const updatedReview = await review.edit({
      rating,
      title,
      comment,
      images,
    });

    // Rating can change after edit.
    if (oldRating !== updatedReview.rating) {
      await updateListingRating(review.listing);
    }

    return res.json({
      success: true,
      message: "Review updated successfully",
      review: updatedReview,
    });
  } catch (error) {
    console.error("❌ Edit review error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to edit review",
    });
  }
};

// ============================================================
// DELETE REVIEW
// ============================================================
export const deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user?._id || req.user?.id;

    const review = await Review.findById(id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    if (String(review.traveler) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own reviews",
      });
    }

    if (review.status === "deleted") {
      return res.status(400).json({
        success: false,
        message: "Review is already deleted",
      });
    }

    if (!review.canDelete) {
      return res.status(400).json({
        success: false,
        message: `Review delete window has expired (${REVIEW_DELETE_WINDOW_HOURS} hours after submission)`,
      });
    }

    await review.softDelete(
      userId,
      reason || "User deleted their review"
    );

    await updateListingRating(review.listing);

    return res.json({
      success: true,
      message: "Review deleted successfully",
    });
  } catch (error) {
    console.error("❌ Delete review error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete review",
    });
  }
};

// ============================================================
// REPORT REVIEW
// ============================================================
export const reportReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user?._id || req.user?.id;

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please provide a reason for reporting",
      });
    }

    const review = await Review.findById(id).populate(
      "traveler",
      "name email"
    );

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    if (String(review.traveler?._id || review.traveler) === String(userId)) {
      return res.status(400).json({
        success: false,
        message: "You cannot report your own review",
      });
    }

    if (review.status === "deleted") {
      return res.status(400).json({
        success: false,
        message: "Cannot report a deleted review",
      });
    }

    const alreadyReported = review.reportedBy.some(
      (r) => String(r.user) === String(userId)
    );

    if (alreadyReported) {
      return res.status(400).json({
        success: false,
        message: "You have already reported this review",
      });
    }

    await review.report(userId, reason.trim());

    if (review.reportThresholdReached) {
      const admins = await User.find({
        role: "admin",
      }).select("_id");

      for (const admin of admins) {
        try {
          await createNotification({
            recipient: admin._id,
            sender: userId,
            type: "review_report_threshold",
            title: "⚠️ Review Report Threshold Reached",
            message: `A review has received ${review.reportedCount} reports and needs moderation`,
            data: {
              reviewId: review._id,
              reportedCount: review.reportedCount,
              threshold: REVIEW_REPORT_THRESHOLD,
            },
            link: `/admin/reviews/${review._id}`,
          });
        } catch (notificationError) {
          console.warn(
            "⚠️ Admin notification error:",
            notificationError.message
          );
        }
      }
    }

    return res.json({
      success: true,
      message: "Review reported successfully",
      reportedCount: review.reportedCount,
      thresholdReached: review.reportThresholdReached,
    });
  } catch (error) {
    console.error("❌ Report review error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to report review",
    });
  }
};

// ============================================================
// ADD PROVIDER REPLY
// ============================================================
export const addProviderReply = async (req, res) => {
  try {
    const { id } = req.params;
    const { reply } = req.body;
    const providerId = req.user?._id || req.user?.id;

    if (!reply || !reply.trim()) {
      return res.status(400).json({
        success: false,
        message: "Reply is required",
      });
    }

    const review = await Review.findById(id)
      .populate("traveler", "name email")
      .populate("provider", "name email")
      .populate("listing", "provider title");

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    let isOwner = false;

    if (review.provider) {
      const reviewProviderId =
        review.provider._id || review.provider;

      if (String(reviewProviderId) === String(providerId)) {
        isOwner = true;
      }
    }

    if (!isOwner && review.listing) {
      const listingProviderId =
        review.listing.provider?._id ||
        review.listing.provider;

      if (
        listingProviderId &&
        String(listingProviderId) === String(providerId)
      ) {
        isOwner = true;
      }
    }

    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message:
          "You can only reply to reviews on your own listings",
      });
    }

    if (review.hasProviderReply) {
      return res.status(400).json({
        success: false,
        message:
          "You already replied to this review. Use edit reply to update.",
      });
    }

    await review.addReply(reply.trim());

    try {
      await createNotification({
        recipient: review.traveler,
        sender: providerId,
        type: "provider_reply",
        title: "Provider Replied to Your Review 💬",
        message: `${req.user?.name || "The provider"} replied to your review`,
        data: {
          reviewId: review._id,
        },
        link: `/my-reviews/${review._id}`,
      });
    } catch (notificationError) {
      console.warn(
        "⚠️ Traveler notification error:",
        notificationError.message
      );
    }

    return res.json({
      success: true,
      message: "Reply added successfully",
      review,
    });
  } catch (error) {
    console.error("❌ Add provider reply error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to add provider reply",
    });
  }
};

// ============================================================
// EDIT PROVIDER REPLY
// ============================================================
export const editProviderReply = async (req, res) => {
  try {
    const { id } = req.params;
    const { reply } = req.body;
    const providerId = req.user?._id || req.user?.id;

    if (!reply || !reply.trim()) {
      return res.status(400).json({
        success: false,
        message: "Reply is required",
      });
    }

    const review = await Review.findById(id).populate(
      "listing",
      "provider title"
    );

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    let isOwner = false;

    if (review.provider) {
      const reviewProviderId =
        review.provider._id || review.provider;

      if (String(reviewProviderId) === String(providerId)) {
        isOwner = true;
      }
    }

    if (!isOwner && review.listing) {
      const listingProviderId =
        review.listing.provider?._id ||
        review.listing.provider;

      if (
        listingProviderId &&
        String(listingProviderId) === String(providerId)
      ) {
        isOwner = true;
      }
    }

    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: "You can only edit your own replies",
      });
    }

    if (!review.hasProviderReply) {
      return res.status(400).json({
        success: false,
        message: "No reply exists to edit",
      });
    }

    await review.updateReply(reply.trim());

    return res.json({
      success: true,
      message: "Reply updated successfully",
      review,
    });
  } catch (error) {
    console.error("❌ Edit provider reply error:", error);

    return res.status(500).json({
      success: false,
      message:
        error.message || "Failed to edit provider reply",
    });
  }
};

// ============================================================
// GET MY REVIEWS
// ============================================================
export const getMyReviews = async (req, res) => {
  try {
    const {
      status,
      search,
      sort = "-createdAt",
      page = 1,
      limit = 20,
      startDate,
      endDate,
      minRating,
      maxRating,
    } = req.query;

    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const filter = {
      traveler: userId,
    };

    if (status && status !== "all") {
      filter.status = status;
    }

    if (search && search.trim()) {
      filter.$or = [
        {
          title: {
            $regex: search.trim(),
            $options: "i",
          },
        },
        {
          comment: {
            $regex: search.trim(),
            $options: "i",
          },
        },
      ];
    }

    if (startDate || endDate) {
      filter.createdAt = {};

      if (startDate) {
        const start = new Date(startDate);

        if (!Number.isNaN(start.getTime())) {
          start.setHours(0, 0, 0, 0);
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

      if (Object.keys(filter.createdAt).length === 0) {
        delete filter.createdAt;
      }
    }

    if (minRating || maxRating) {
      filter.rating = {};

      if (minRating) {
        const value = Number(minRating);

        if (!Number.isNaN(value)) {
          filter.rating.$gte = Math.max(1, Math.min(5, value));
        }
      }

      if (maxRating) {
        const value = Number(maxRating);

        if (!Number.isNaN(value)) {
          filter.rating.$lte = Math.max(1, Math.min(5, value));
        }
      }

      if (Object.keys(filter.rating).length === 0) {
        delete filter.rating;
      }
    }

    const pageNum = Math.max(
      1,
      parseInt(page, 10) || 1
    );

    const limitNum = Math.min(
      100,
      Math.max(1, parseInt(limit, 10) || 20)
    );

    const validSortFields = [
      "createdAt",
      "rating",
      "updatedAt",
    ];

    const requestedSort = String(sort || "-createdAt");

    const sortField = requestedSort.startsWith("-")
      ? requestedSort.substring(1)
      : requestedSort;

    const sortOrder = requestedSort.startsWith("-")
      ? -1
      : 1;

    const finalSortField = validSortFields.includes(sortField)
      ? sortField
      : "createdAt";

    const skip = (pageNum - 1) * limitNum;

    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .populate("listing", "title slug coverMedia")
        .populate(
          "provider",
          "name businessName avatar"
        )
        .populate(
          "booking",
          "bookingCode startDate status"
        )
        .sort({
          [finalSortField]: sortOrder,
        })
        .skip(skip)
        .limit(limitNum)
        .lean(),

      Review.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: reviews,
      reviews,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        hasNext: pageNum * limitNum < total,
        hasPrev: pageNum > 1,
      },
      filters: {
        status: status || "all",
        search: search || "",
        sort: requestedSort,
        startDate: startDate || "",
        endDate: endDate || "",
        minRating: minRating || "",
        maxRating: maxRating || "",
      },
    });
  } catch (error) {
    console.error("❌ Get my reviews error:", error);

    return res.status(500).json({
      success: false,
      message:
        error.message || "Failed to fetch my reviews",
    });
  }
};

// ============================================================
// GET REVIEW BY ID
// ============================================================
export const getReviewById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id || req.user?.id;
    const userRole = req.user?.role;

    const review = await Review.findById(id)
      .populate(
        "traveler",
        "name avatar email profileImage"
      )
      .populate(
        "provider",
        "name businessName avatar"
      )
      .populate(
        "listing",
        "title slug coverMedia"
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
      .populate(
        "reportedBy.user",
        "name email"
      )
      .lean();

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    const travelerId =
      review.traveler?._id || review.traveler;

    const providerId =
      review.provider?._id || review.provider;

    const isOwner =
      String(travelerId) === String(userId);

    const isProvider =
      String(providerId) === String(userId);

    const isAdmin = userRole === "admin";

    if (
      review.status === "deleted" &&
      !isOwner &&
      !isAdmin
    ) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    if (
      review.status === "hidden" &&
      !isAdmin
    ) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    if (
      !isOwner &&
      !isProvider &&
      !isAdmin &&
      review.status !== "published"
    ) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    const permissions = {
      canEdit:
        isOwner &&
        review.canEdit &&
        review.status !== "deleted",

      canDelete:
        isOwner &&
        review.canDelete &&
        review.status !== "deleted",

      canReply:
        isProvider &&
        review.canReply,

      canReport:
        !isOwner &&
        review.status === "published",

      canModerate: isAdmin,
    };

    return res.json({
      success: true,
      review,
      permissions,
    });
  } catch (error) {
    console.error("❌ Get review by id error:", error);

    return res.status(500).json({
      success: false,
      message:
        error.message || "Failed to fetch review",
    });
  }
};

// ============================================================
// GET REVIEW BY BOOKING
// ============================================================
export const getReviewByBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user?._id || req.user?.id;
    const userRole = req.user?.role;

    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: "Booking ID is required",
      });
    }

    const review = await Review.findOne({
      booking: bookingId,
    })
      .populate(
        "traveler",
        "name profileImage avatar"
      )
      .populate(
        "provider",
        "name businessName avatar"
      )
      .populate(
        "listing",
        "title location slug"
      )
      .populate(
        "booking",
        "bookingCode startDate status"
      )
      .lean();

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "No review found for this booking",
      });
    }

    const travelerId =
      review.traveler?._id || review.traveler;

    const providerId =
      review.provider?._id || review.provider;

    const isOwner =
      String(travelerId) === String(userId);

    const isProvider =
      String(providerId) === String(userId);

    const isAdmin = userRole === "admin";

    if (!isOwner && !isProvider && !isAdmin) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to view this review",
      });
    }

    return res.json({
      success: true,
      review,
    });
  } catch (error) {
    console.error(
      "❌ Get review by booking error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to fetch review by booking",
    });
  }
};

// ============================================================
// GET PROVIDER REVIEWS
// ============================================================
export const getProviderReviews = async (req, res) => {
  try {
    const providerId = req.user?._id || req.user?.id;

    if (!providerId) {
      return res.status(401).json({
        success: false,
        message: "Provider authentication required",
      });
    }

    const {
      page = 1,
      limit = 20,
      status = "all",
      search,
      sort = "-createdAt",
      startDate,
      endDate,
      minRating,
      maxRating,
    } = req.query;

    const pageNum = Math.max(
      1,
      parseInt(page, 10) || 1
    );

    const limitNum = Math.min(
      100,
      Math.max(1, parseInt(limit, 10) || 20)
    );

    // --------------------------------------------------------
    // Find all listings owned by this provider
    // --------------------------------------------------------
    const providerListings = await Listing.find({
      provider: providerId,
    })
      .select("_id")
      .lean();

    const providerListingIds = providerListings.map(
      (listing) => listing._id
    );

    // --------------------------------------------------------
    // Support both new and old reviews:
    //
    // New:
    //   Review.provider = providerId
    //
    // Old:
    //   Review.listing belongs to provider
    // --------------------------------------------------------
    const ownershipFilter = [
      {
        provider: providerId,
      },
    ];

    if (providerListingIds.length > 0) {
      ownershipFilter.push({
        listing: {
          $in: providerListingIds,
        },
      });
    }

    const filter = {
      $or: ownershipFilter,
    };

    // --------------------------------------------------------
    // Status
    // --------------------------------------------------------
    if (status && status !== "all") {
      filter.status = status;
    } else {
      filter.status = {
        $in: [
          "published",
          "reported",
          "hidden",
        ],
      };
    }

    // --------------------------------------------------------
    // Date range
    // --------------------------------------------------------
    if (startDate || endDate) {
      filter.createdAt = {};

      if (startDate) {
        const start = new Date(startDate);

        if (!Number.isNaN(start.getTime())) {
          start.setHours(0, 0, 0, 0);
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

      if (Object.keys(filter.createdAt).length === 0) {
        delete filter.createdAt;
      }
    }

    // --------------------------------------------------------
    // Rating range
    // --------------------------------------------------------
    if (minRating || maxRating) {
      filter.rating = {};

      if (minRating) {
        const min = Number(minRating);

        if (!Number.isNaN(min)) {
          filter.rating.$gte = Math.max(
            1,
            Math.min(5, min)
          );
        }
      }

      if (maxRating) {
        const max = Number(maxRating);

        if (!Number.isNaN(max)) {
          filter.rating.$lte = Math.max(
            1,
            Math.min(5, max)
          );
        }
      }

      if (Object.keys(filter.rating).length === 0) {
        delete filter.rating;
      }
    }

    // --------------------------------------------------------
    // Sorting
    // --------------------------------------------------------
    const validSortFields = [
      "createdAt",
      "rating",
      "updatedAt",
    ];

    const requestedSort = String(
      sort || "-createdAt"
    );

    const sortField = requestedSort.startsWith("-")
      ? requestedSort.substring(1)
      : requestedSort;

    const sortOrder = requestedSort.startsWith("-")
      ? -1
      : 1;

    const finalSortField =
      validSortFields.includes(sortField)
        ? sortField
        : "createdAt";

    const skip = (pageNum - 1) * limitNum;

    // --------------------------------------------------------
    // Fetch reviews + count
    // --------------------------------------------------------
    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .populate(
          "traveler",
          "name profileImage avatar"
        )
        .populate(
          "provider",
          "name businessName email avatar"
        )
        .populate(
          "listing",
          "title slug coverMedia provider"
        )
        .populate(
          "booking",
          "bookingCode startDate status"
        )
        .sort({
          [finalSortField]: sortOrder,
        })
        .skip(skip)
        .limit(limitNum)
        .lean(),

      Review.countDocuments(filter),
    ]);

    const stats = await getProviderStats(
      providerId
    );

    return res.status(200).json({
      success: true,

      // Both formats are returned temporarily
      // to prevent frontend response-shape mismatch.
      data: reviews,
      reviews,

      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(
          total / limitNum
        ),
        hasNext:
          pageNum * limitNum < total,
        hasPrev:
          pageNum > 1,
      },

      stats,

      filters: {
        status,
        search: search || "",
        sort: requestedSort,
        startDate: startDate || "",
        endDate: endDate || "",
        minRating: minRating || "",
        maxRating: maxRating || "",
      },
    });
  } catch (error) {
    console.error(
      "❌ Get provider reviews error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to fetch provider reviews",
    });
  }
};

// ============================================================
// GET PROVIDER REVIEW STATS
// ============================================================
export const getProviderReviewStats = async (
  req,
  res
) => {
  try {
    const providerId =
      req.user?._id || req.user?.id;

    if (!providerId) {
      return res.status(401).json({
        success: false,
        message: "Provider authentication required",
      });
    }

    const stats = await getProviderStats(
      providerId
    );

    return res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error(
      "❌ Get provider review stats error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to fetch review stats",
    });
  }
};

// ============================================================
// TOGGLE HELPFUL
// ============================================================
export const toggleHelpful = async (
  req,
  res
) => {
  try {
    const { id } = req.params;
    const userId =
      req.user?._id || req.user?.id;

    const review = await Review.findById(id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    const userIdStr = String(userId);

    const index =
      review.helpfulUsers.findIndex(
        (uid) => String(uid) === userIdStr
      );

    if (index > -1) {
      review.helpfulUsers.splice(index, 1);

      review.helpfulCount = Math.max(
        0,
        (review.helpfulCount || 0) - 1
      );
    } else {
      review.helpfulUsers.push(userId);

      review.helpfulCount =
        (review.helpfulCount || 0) + 1;
    }

    await review.save();

    return res.json({
      success: true,
      helpfulCount: review.helpfulCount,
      isHelpful: index === -1,
    });
  } catch (error) {
    console.error(
      "❌ Toggle helpful error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to toggle helpful",
    });
  }
};

// ============================================================
// HELPER: UPDATE LISTING RATING
// ============================================================
const updateListingRating = async (
  listingId
) => {
  try {
    const result = await Review.aggregate([
      {
        $match: {
          listing: listingId,
          status: "published",
        },
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
        },
      },
    ]);

    const stats = result[0] || {
      averageRating: 0,
      totalReviews: 0,
    };

    await Listing.findByIdAndUpdate(
      listingId,
      {
        averageRating:
          Math.round(
            stats.averageRating * 10
          ) / 10,

        totalReviews:
          stats.totalReviews,
      }
    );
  } catch (error) {
    console.error(
      "❌ Error updating listing rating:",
      error
    );
  }
};

// ============================================================
// HELPER: PROVIDER REVIEW STATISTICS
// ============================================================
const getProviderStats = async (
  providerId
) => {
  const allReviews = await Review.find({
    $or: [
      {
        provider: providerId,
      },
      {
        listing: {
          $in: await Listing.find({
            provider: providerId,
          }).distinct("_id"),
        },
      },
    ],
  }).lean();

  const published = allReviews.filter(
    (review) => review.status === "published"
  );

  const hidden = allReviews.filter(
    (review) => review.status === "hidden"
  );

  const deleted = allReviews.filter(
    (review) => review.status === "deleted"
  );

  const reported = allReviews.filter(
    (review) => review.status === "reported"
  );

  const totalReviews = allReviews.length;

  // Prevent division by zero.
  const averageRating =
    published.length > 0
      ? published.reduce(
          (sum, review) => sum + review.rating,
          0
        ) / published.length
      : 0;

  const ratingCounts = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };

  published.forEach((review) => {
    if (
      ratingCounts[review.rating] !== undefined
    ) {
      ratingCounts[review.rating]++;
    }
  });

  const byListing = {};

  published.forEach((review) => {
    const listingId =
      review.listing?.toString();

    if (!listingId) {
      return;
    }

    if (!byListing[listingId]) {
      byListing[listingId] = {
        count: 0,
        sum: 0,
      };
    }

    byListing[listingId].count++;
    byListing[listingId].sum +=
      review.rating;
  });

  return {
    total: totalReviews,
    published: published.length,
    hidden: hidden.length,
    deleted: deleted.length,
    reported: reported.length,
    averageRating:
      Math.round(averageRating * 10) / 10,
    ratingCounts,
    byListing,
    hasReviews: totalReviews > 0,
  };
};

// ============================================================
// ✅ NEW: GET ADMIN REVIEWS
// ============================================================
// Admin-only paginated list of reviews with filters.
// Supports: status, search, rating range, date range, sort.
// ============================================================
export const getAdminReviews = async (req, res) => {
  try {
    const {
      status = "all",
      search,
      sort = "-createdAt",
      page = 1,
      limit = 20,
      startDate,
      endDate,
      minRating,
      maxRating,
      reportedOnly,
      hiddenOnly,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

    const filter = {};

    // Status
    if (status && status !== "all") {
      filter.status = status;
    }
    if (reportedOnly === "true" || reportedOnly === true) {
      filter.status = "reported";
    }
    if (hiddenOnly === "true" || hiddenOnly === true) {
      filter.status = "hidden";
    }

    // Search
    if (search && search.trim()) {
      filter.$or = [
        { title: { $regex: search.trim(), $options: "i" } },
        { comment: { $regex: search.trim(), $options: "i" } },
      ];
    }

    // Date
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        if (!Number.isNaN(start.getTime())) {
          start.setHours(0, 0, 0, 0);
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
      if (Object.keys(filter.createdAt).length === 0) delete filter.createdAt;
    }

    // Rating range
    if (minRating || maxRating) {
      filter.rating = {};
      if (minRating) {
        const min = Number(minRating);
        if (!Number.isNaN(min)) filter.rating.$gte = Math.max(1, Math.min(5, min));
      }
      if (maxRating) {
        const max = Number(maxRating);
        if (!Number.isNaN(max)) filter.rating.$lte = Math.max(1, Math.min(5, max));
      }
      if (Object.keys(filter.rating).length === 0) delete filter.rating;
    }

    // Sort
    const validSortFields = ["createdAt", "rating", "updatedAt"];
    const requestedSort = String(sort || "-createdAt");
    const sortField = requestedSort.startsWith("-")
      ? requestedSort.substring(1)
      : requestedSort;
    const sortOrder = requestedSort.startsWith("-") ? -1 : 1;
    const finalSortField = validSortFields.includes(sortField)
      ? sortField
      : "createdAt";

    const skip = (pageNum - 1) * limitNum;

    const [reviews, total, stats] = await Promise.all([
      Review.find(filter)
        .populate("traveler", "name email profileImage avatar")
        .populate("provider", "name businessName email avatar")
        .populate("listing", "title slug coverMedia")
        .populate("booking", "bookingCode startDate status")
        .sort({ [finalSortField]: sortOrder })
        .skip(skip)
        .limit(limitNum)
        .lean(),

      Review.countDocuments(filter),

      Review.aggregate([
        { $match: filter },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const statsMap = {};
    stats.forEach((row) => {
      statsMap[row._id || "unknown"] = row.count;
    });

    return res.json({
      success: true,
      data: reviews,
      reviews,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        hasNext: pageNum * limitNum < total,
        hasPrev: pageNum > 1,
      },
      stats: {
        total,
        published: statsMap.published || 0,
        hidden: statsMap.hidden || 0,
        reported: statsMap.reported || 0,
        deleted: statsMap.deleted || 0,
      },
      filters: {
        status,
        search: search || "",
        sort: requestedSort,
        startDate: startDate || "",
        endDate: endDate || "",
        minRating: minRating || "",
        maxRating: maxRating || "",
      },
    });
  } catch (error) {
    console.error("❌ Get admin reviews error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch admin reviews",
    });
  }
};

// ============================================================
// ✅ NEW: UPDATE REVIEW STATUS (ADMIN MODERATION)
// ============================================================
// Allowed transitions:
//   published  → hidden      (hide from public)
//   hidden     → published   (restore)
//   reported   → published   (dismiss reports)
//   reported   → hidden      (uphold reports)
//   *          → deleted     (soft delete)
//
// Updates listing rating when status changes.
// ============================================================
export const updateReviewStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, moderationNote } = req.body;
    const adminId = req.user?._id || req.user?.id;

    const allowedStatuses = [
      "published",
      "hidden",
      "reported",
      "deleted",
    ];

    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${allowedStatuses.join(", ")}`,
      });
    }

    const review = await Review.findById(id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    const previousStatus = review.status;

    if (previousStatus === status) {
      return res.json({
        success: true,
        message: "Status unchanged",
        review,
      });
    }

    review.status = status;
    review.moderatedBy = adminId;
    review.moderatedAt = new Date();

    if (moderationNote && typeof moderationNote === "string") {
      review.moderationNote = moderationNote.trim();
    }

    if (status === "published" && !review.publishedAt) {
      review.publishedAt = new Date();
    }

    if (status === "hidden" || status === "deleted") {
      review.hiddenAt = review.hiddenAt || new Date();
    }

    await review.save();

    // Rating recompute if visibility changed
    const affectsRating =
      previousStatus === "published" || status === "published";

    if (affectsRating && review.listing) {
      await updateListingRating(review.listing);
    }

    return res.json({
      success: true,
      message: `Review status updated to "${status}"`,
      review,
    });
  } catch (error) {
    console.error("❌ Update review status error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update review status",
    });
  }
};