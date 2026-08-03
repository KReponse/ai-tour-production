// backend/src/controllers/reviewController.js
// ✅ PRODUCTION READY - Review Controller with Moderation Workflow
// ✅ Immediately published reviews, edit/delete windows, reporting, provider replies
// ✅ Added toggleHelpful export
// ✅ FIXED: addProviderReply checks both review.provider and listing.provider
// ✅ ENHANCED PAGINATION - Added search, filters, sorting, date ranges, rating ranges
// ✅ Proper pagination metadata (hasNext, hasPrev, totalPages)
// ✅ Added filters object in response

import Review from "../models/Review.js";
import Booking from "../models/Booking.js";
import Listing from "../models/Listing.js";
import User from "../models/User.js";
import { createNotification } from "../utils/notificationService.js";

// =========================
// ✅ CONFIGURABLE CONSTANTS
// =========================
const REVIEW_REPORT_THRESHOLD = parseInt(process.env.REVIEW_REPORT_THRESHOLD) || 5;
const REVIEW_EDIT_WINDOW_HOURS = parseInt(process.env.REVIEW_EDIT_WINDOW_HOURS) || 168; // 7 days
const REVIEW_DELETE_WINDOW_HOURS = parseInt(process.env.REVIEW_DELETE_WINDOW_HOURS) || 168; // 7 days

// ============================================================
// ✅ CREATE REVIEW - Immediately Published
// ============================================================
export const createReview = async (req, res) => {
  try {
    const { bookingId, rating, title, comment, images } = req.body;

    // Validate required fields
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

    // Get booking with populations
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

    // Ownership check
    const bookingUserId = booking.user._id || booking.user;
    const currentUserId = req.user._id || req.user.id;

    if (String(bookingUserId) !== String(currentUserId)) {
      return res.status(403).json({
        success: false,
        message: "You can only review your own bookings",
      });
    }

    // Check booking status - must be completed or review_eligible
    const allowedStatuses = ["completed", "review_eligible"];
    if (!allowedStatuses.includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: `Booking must be completed before reviewing. Current status: ${booking.status}`,
      });
    }

    // Check payment status
    if (booking.paymentStatus !== "paid") {
      return res.status(400).json({
        success: false,
        message: "Payment must be confirmed before reviewing",
      });
    }

    // Check if review already exists
    const existingReview = await Review.findOne({ booking: bookingId });
    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: "You already reviewed this booking",
      });
    }

    // Check review deadline (30 days after completion)
    const reviewDeadline = new Date(booking.updatedAt);
    reviewDeadline.setDate(reviewDeadline.getDate() + 30);

    if (new Date() > reviewDeadline) {
      return res.status(400).json({
        success: false,
        message: "Review window has expired (30 days after completion)",
      });
    }

    // Get entity
    const entity = booking.listing;
    if (!entity) {
      return res.status(400).json({
        success: false,
        message: "No experience associated with this booking",
      });
    }

    // Determine provider ID
    let providerId = null;
    if (booking.provider) {
      providerId = booking.provider._id || booking.provider;
    } else if (booking.listing && booking.listing.provider) {
      providerId = booking.listing.provider._id || booking.listing.provider;
    }

    if (!providerId) {
      return res.status(400).json({
        success: false,
        message: "Could not determine provider for this booking",
      });
    }

    // ✅ Create review - IMMEDIATELY PUBLISHED
    const review = await Review.create({
      traveler: currentUserId,
      provider: providerId,
      booking: booking._id,
      listing: booking.listing._id || booking.listing,
      rating,
      title: title.trim(),
      comment: comment.trim(),
      images: images || [],
      isVerifiedBooking: true,
      reviewDeadline,
      status: "published", // ✅ Immediately published
      publishedAt: new Date(),
    });

    // Update booking review status
    booking.canReview = false;
    booking.reviewSubmitted = true;
    await booking.save();

    // Update listing average rating
    await updateListingRating(booking.listing._id);

    // Send notification to provider
    try {
      await createNotification({
        recipient: providerId,
        sender: currentUserId,
        type: "new_review",
        title: "New Review Received ⭐",
        message: `${req.user.name} left a ${rating}-star review on "${entity.title}"`,
        data: { reviewId: review._id },
        link: `/provider/reviews`,
      });
    } catch (notifError) {
      console.warn("⚠️ Notification error:", notifError.message);
    }

    res.status(201).json({
      success: true,
      message: "Review submitted successfully",
      review,
    });
  } catch (error) {
    console.error("❌ Create review error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create review",
    });
  }
};

// ============================================================
// ✅ EDIT REVIEW - Within Edit Window
// ============================================================
export const editReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, title, comment, images } = req.body;
    const userId = req.user._id || req.user.id;

    const review = await Review.findById(id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    // Ownership check
    if (String(review.traveler) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: "You can only edit your own reviews",
      });
    }

    // Check if review is deleted
    if (review.status === "deleted") {
      return res.status(400).json({
        success: false,
        message: "Cannot edit a deleted review",
      });
    }

    // Check edit window
    if (!review.canEdit) {
      return res.status(400).json({
        success: false,
        message: `Review edit window has expired (${REVIEW_EDIT_WINDOW_HOURS} hours after submission)`,
      });
    }

    // Perform edit
    const updatedReview = await review.edit({
      rating,
      title,
      comment,
      images,
    });

    res.json({
      success: true,
      message: "Review updated successfully",
      review: updatedReview,
    });
  } catch (error) {
    console.error("❌ Edit review error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to edit review",
    });
  }
};

// ============================================================
// ✅ DELETE REVIEW - Soft Delete
// ============================================================
export const deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user._id || req.user.id;

    const review = await Review.findById(id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    // Ownership check
    if (String(review.traveler) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own reviews",
      });
    }

    // Check if already deleted
    if (review.status === "deleted") {
      return res.status(400).json({
        success: false,
        message: "Review is already deleted",
      });
    }

    // Check delete window
    if (!review.canDelete) {
      return res.status(400).json({
        success: false,
        message: `Review delete window has expired (${REVIEW_DELETE_WINDOW_HOURS} hours after submission)`,
      });
    }

    // Soft delete
    await review.softDelete(userId, reason || "User deleted their review");

    // Update listing rating
    await updateListingRating(review.listing);

    res.json({
      success: true,
      message: "Review deleted successfully",
    });
  } catch (error) {
    console.error("❌ Delete review error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete review",
    });
  }
};

// ============================================================
// ✅ REPORT REVIEW
// ============================================================
export const reportReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user._id || req.user.id;

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please provide a reason for reporting",
      });
    }

    const review = await Review.findById(id).populate("traveler", "name email");

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    // Can't report your own review
    if (String(review.traveler) === String(userId)) {
      return res.status(400).json({
        success: false,
        message: "You cannot report your own review",
      });
    }

    // Can't report deleted reviews
    if (review.status === "deleted") {
      return res.status(400).json({
        success: false,
        message: "Cannot report a deleted review",
      });
    }

    // Check if user already reported
    const alreadyReported = review.reportedBy.some(
      (r) => String(r.user) === String(userId)
    );

    if (alreadyReported) {
      return res.status(400).json({
        success: false,
        message: "You have already reported this review",
      });
    }

    // Add report
    await review.report(userId, reason.trim());

    // If threshold reached, notify admin
    if (review.reportThresholdReached) {
      const admins = await User.find({ role: "admin" }).select("_id");
      
      for (const admin of admins) {
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
      }
    }

    res.json({
      success: true,
      message: "Review reported successfully",
      reportedCount: review.reportedCount,
      thresholdReached: review.reportThresholdReached,
    });
  } catch (error) {
    console.error("❌ Report review error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to report review",
    });
  }
};

// ============================================================
// ✅ PROVIDER REPLY TO REVIEW - FIXED with fallback
// ============================================================
export const addProviderReply = async (req, res) => {
  try {
    const { id } = req.params;
    const { reply } = req.body;
    const providerId = req.user._id || req.user.id;

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

    // ✅ Check provider ownership - try multiple sources
    let isOwner = false;
    
    // Check 1: Direct provider on review
    if (review.provider) {
      const reviewProviderId = review.provider._id || review.provider;
      if (String(reviewProviderId) === String(providerId)) {
        isOwner = true;
        console.log('✅ Provider ownership verified via review.provider');
      }
    }
    
    // Check 2: Check listing's provider (fallback)
    if (!isOwner && review.listing) {
      const listingProviderId = review.listing.provider?._id || review.listing.provider;
      if (listingProviderId && String(listingProviderId) === String(providerId)) {
        isOwner = true;
        console.log('✅ Provider ownership verified via listing.provider');
      }
    }

    if (!isOwner) {
      console.log('❌ Provider ownership check failed:', {
        reviewProvider: review.provider?._id || review.provider,
        listingProvider: review.listing?.provider?._id || review.listing?.provider,
        currentProvider: providerId,
        reviewId: review._id
      });
      return res.status(403).json({
        success: false,
        message: "You can only reply to reviews on your own listings",
      });
    }

    // Check if already has reply
    if (review.hasProviderReply) {
      return res.status(400).json({
        success: false,
        message: "You already replied to this review. Use edit reply to update.",
      });
    }

    // Add reply
    await review.addReply(reply);

    // Notify traveler
    await createNotification({
      recipient: review.traveler,
      sender: providerId,
      type: "provider_reply",
      title: "Provider Replied to Your Review 💬",
      message: `${req.user.name} replied to your review`,
      data: { reviewId: review._id },
      link: `/my-reviews/${review._id}`,
    });

    res.json({
      success: true,
      message: "Reply added successfully",
      review,
    });
  } catch (error) {
    console.error("❌ Add provider reply error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to add reply",
    });
  }
};

// ============================================================
// ✅ EDIT PROVIDER REPLY
// ============================================================
export const editProviderReply = async (req, res) => {
  try {
    const { id } = req.params;
    const { reply } = req.body;
    const providerId = req.user._id || req.user.id;

    if (!reply || !reply.trim()) {
      return res.status(400).json({
        success: false,
        message: "Reply is required",
      });
    }

    const review = await Review.findById(id)
      .populate("listing", "provider title");

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    // ✅ Check provider ownership - try multiple sources
    let isOwner = false;
    
    // Check 1: Direct provider on review
    if (review.provider) {
      const reviewProviderId = review.provider._id || review.provider;
      if (String(reviewProviderId) === String(providerId)) {
        isOwner = true;
      }
    }
    
    // Check 2: Check listing's provider (fallback)
    if (!isOwner && review.listing) {
      const listingProviderId = review.listing.provider?._id || review.listing.provider;
      if (listingProviderId && String(listingProviderId) === String(providerId)) {
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

    // Update reply
    await review.updateReply(reply);

    res.json({
      success: true,
      message: "Reply updated successfully",
      review,
    });
  } catch (error) {
    console.error("❌ Edit provider reply error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to edit reply",
    });
  }
};

// ============================================================
// ✅ GET MY REVIEWS (Traveler) - ENHANCED
// ============================================================
export const getMyReviews = async (req, res) => {
  try {
    const {
      status,
      search,
      sort = '-createdAt',
      page = 1,
      limit = 20,
      startDate,
      endDate,
      minRating,
      maxRating,
    } = req.query;

    const userId = req.user._id || req.user.id;
    const filter = { traveler: userId };

    // Status filter
    if (status && status !== "all") {
      filter.status = status;
    }

    // Search
    if (search && search.trim()) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { comment: { $regex: search, $options: 'i' } },
        { 'listing.title': { $regex: search, $options: 'i' } },
      ];
    }

    // Date range
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    // Rating range
    if (minRating || maxRating) {
      filter.rating = {};
      if (minRating) filter.rating.$gte = Number(minRating);
      if (maxRating) filter.rating.$lte = Number(maxRating);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    // Validate sort field
    const validSortFields = ['createdAt', 'rating', 'updatedAt'];
    const sortField = sort.startsWith('-') ? sort.substring(1) : sort;
    const sortOrder = sort.startsWith('-') ? -1 : 1;
    const finalSortField = validSortFields.includes(sortField) ? sortField : 'createdAt';

    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .populate("listing", "title slug coverMedia")
        .populate("provider", "name businessName avatar")
        .populate("booking", "bookingCode startDate")
        .sort({ [finalSortField]: sortOrder })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Review.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: reviews,
      pagination: {
        total,
        page: parseInt(page),
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        hasNext: parseInt(page) * limitNum < total,
        hasPrev: parseInt(page) > 1,
      },
      filters: {
        status,
        search,
        sort,
        startDate,
        endDate,
        minRating,
        maxRating,
      },
    });
  } catch (error) {
    console.error("❌ Get my reviews error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================
// ✅ GET REVIEW BY ID
// ============================================================
export const getReviewById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id || req.user.id;
    const userRole = req.user.role;

    const review = await Review.findById(id)
      .populate("traveler", "name avatar email")
      .populate("provider", "name businessName avatar")
      .populate("listing", "title slug coverMedia")
      .populate("booking", "bookingCode startDate")
      .populate("hiddenBy", "name email")
      .populate("deletedBy", "name email")
      .populate("moderatedBy", "name email")
      .populate("reportedBy.user", "name email")
      .lean();

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    // Access control based on status and role
    const travelerId = review.traveler?._id || review.traveler;
    const providerId = review.provider?._id || review.provider;
    const isOwner = String(travelerId) === String(userId);
    const isProvider = String(providerId) === String(userId);
    const isAdmin = userRole === "admin";

    // If review is deleted, only owner or admin can view
    if (review.status === "deleted" && !isOwner && !isAdmin) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    // If review is hidden, only admin can view
    if (review.status === "hidden" && !isAdmin) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    // If review is published, anyone can view
    // If reported, owner, provider, and admin can view

    if (!isOwner && !isProvider && !isAdmin && review.status !== "published") {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    // Add permissions info
    const permissions = {
      canEdit: isOwner && review.canEdit && review.status !== "deleted",
      canDelete: isOwner && review.canDelete && review.status !== "deleted",
      canReply: isProvider && review.canReply,
      canReport: !isOwner && review.status === "published",
      canModerate: isAdmin,
    };

    res.json({
      success: true,
      review,
      permissions,
    });
  } catch (error) {
    console.error("❌ Get review by id error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================
// ✅ GET REVIEW BY BOOKING
// ============================================================
export const getReviewByBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user._id || req.user.id;
    const userRole = req.user.role;

    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: "Booking ID is required",
      });
    }

    const review = await Review.findOne({ booking: bookingId })
      .populate("traveler", "name profileImage avatar")
      .populate("provider", "name businessName avatar")
      .populate("listing", "title location slug")
      .populate("booking", "bookingCode startDate")
      .lean();

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "No review found for this booking",
      });
    }

    const travelerId = review.traveler?._id || review.traveler;
    const providerId = review.provider?._id || review.provider;
    const isOwner = String(travelerId) === String(userId);
    const isProvider = String(providerId) === String(userId);
    const isAdmin = userRole === "admin";

    if (!isOwner && !isProvider && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to view this review",
      });
    }

    res.json({
      success: true,
      review,
    });
  } catch (error) {
    console.error("❌ Get review by booking error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================
// ✅ GET PROVIDER REVIEWS - ENHANCED
// ============================================================
export const getProviderReviews = async (req, res) => {
  try {
    const providerId = req.user._id || req.user.id;
    const {
      page = 1,
      limit = 20,
      status = null,
      search,
      sort = '-createdAt',
      startDate,
      endDate,
      minRating,
      maxRating,
    } = req.query;

    const filter = { provider: providerId };

    if (status && status !== 'all') {
      filter.status = status;
    }

    // Search
    if (search && search.trim()) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { comment: { $regex: search, $options: 'i' } },
        { 'traveler.name': { $regex: search, $options: 'i' } },
        { 'listing.title': { $regex: search, $options: 'i' } },
      ];
    }

    // Date range
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    // Rating range
    if (minRating || maxRating) {
      filter.rating = {};
      if (minRating) filter.rating.$gte = Number(minRating);
      if (maxRating) filter.rating.$lte = Number(maxRating);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    // Validate sort field
    const validSortFields = ['createdAt', 'rating', 'updatedAt'];
    const sortField = sort.startsWith('-') ? sort.substring(1) : sort;
    const sortOrder = sort.startsWith('-') ? -1 : 1;
    const finalSortField = validSortFields.includes(sortField) ? sortField : 'createdAt';

    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .populate('traveler', 'name profileImage avatar')
        .populate('provider', 'name businessName email')
        .populate('listing', 'title slug coverMedia provider')
        .populate('booking', 'bookingCode startDate')
        .sort({ [finalSortField]: sortOrder })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Review.countDocuments(filter),
    ]);

    const stats = await getProviderStats(providerId);

    res.json({
      success: true,
      data: reviews,
      pagination: {
        total,
        page: parseInt(page),
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        hasNext: parseInt(page) * limitNum < total,
        hasPrev: parseInt(page) > 1,
      },
      stats,
      filters: {
        status,
        search,
        sort,
        startDate,
        endDate,
        minRating,
        maxRating,
      },
    });
  } catch (error) {
    console.error("❌ Get provider reviews error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch provider reviews",
    });
  }
};

// ============================================================
// ✅ GET PROVIDER REVIEW STATS
// ============================================================
export const getProviderReviewStats = async (req, res) => {
  try {
    const providerId = req.user._id || req.user.id;
    const stats = await getProviderStats(providerId);

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("❌ Get provider review stats error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch review stats",
    });
  }
};

// ============================================================
// ✅ TOGGLE HELPFUL
// ============================================================
export const toggleHelpful = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id || req.user.id;

    const review = await Review.findById(id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    const userIdStr = String(userId);
    
    const index = review.helpfulUsers.findIndex(
      (uid) => String(uid) === userIdStr
    );

    if (index > -1) {
      review.helpfulUsers.splice(index, 1);
      review.helpfulCount = Math.max(0, (review.helpfulCount || 0) - 1);
    } else {
      review.helpfulUsers.push(userId);
      review.helpfulCount = (review.helpfulCount || 0) + 1;
    }

    await review.save();

    res.json({
      success: true,
      helpfulCount: review.helpfulCount,
      isHelpful: index === -1,
    });
  } catch (error) {
    console.error("❌ Toggle helpful error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
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

/**
 * Get provider review statistics
 */
const getProviderStats = async (providerId) => {
  const allReviews = await Review.find({ provider: providerId });
  
  const published = allReviews.filter((r) => r.status === "published");
  const hidden = allReviews.filter((r) => r.status === "hidden");
  const deleted = allReviews.filter((r) => r.status === "deleted");
  const reported = allReviews.filter((r) => r.status === "reported");
  
  const totalReviews = allReviews.length;
  const averageRating =
    totalReviews > 0
      ? published.reduce((sum, r) => sum + r.rating, 0) / published.length
      : 0;

  const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  published.forEach((r) => {
    if (ratingCounts[r.rating] !== undefined) ratingCounts[r.rating]++;
  });

  // Per-listing stats
  const byListing = {};
  published.forEach((r) => {
    const listingId = r.listing?.toString();
    if (listingId) {
      if (!byListing[listingId]) {
        byListing[listingId] = { count: 0, sum: 0 };
      }
      byListing[listingId].count++;
      byListing[listingId].sum += r.rating;
    }
  });

  return {
    total: totalReviews,
    published: published.length,
    hidden: hidden.length,
    deleted: deleted.length,
    reported: reported.length,
    averageRating: Math.round(averageRating * 10) / 10,
    ratingCounts,
    byListing,
    hasReviews: totalReviews > 0,
  };
};