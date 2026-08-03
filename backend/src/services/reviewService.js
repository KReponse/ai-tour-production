// backend/src/services/reviewService.js
// ✅ PRODUCTION READY - Review Service Layer
// Optional: Business logic extraction from controllers

import Review from "../models/Review.js";
import Booking from "../models/Booking.js";
import Listing from "../models/Listing.js";

class ReviewService {
  /**
   * Create a new review (immediately published)
   */
  async createReview(data) {
    const { travelerId, bookingId, rating, title, comment, images } = data;

    // Validate booking
    const booking = await Booking.findById(bookingId)
      .populate("listing", "title provider")
      .populate("provider", "name email");

    if (!booking) {
      throw new Error("Booking not found");
    }

    if (booking.paymentStatus !== "paid") {
      throw new Error("Payment must be confirmed before reviewing");
    }

    // Check if review exists
    const existing = await Review.findOne({ booking: bookingId });
    if (existing) {
      throw new Error("Review already exists for this booking");
    }

    // Create review
    const review = await Review.create({
      traveler: travelerId,
      provider: booking.provider._id,
      booking: booking._id,
      listing: booking.listing._id,
      rating,
      title: title.trim(),
      comment: comment.trim(),
      images: images || [],
      status: "published",
      publishedAt: new Date(),
      isVerifiedBooking: true,
    });

    // Update booking
    booking.canReview = false;
    booking.reviewSubmitted = true;
    await booking.save();

    // Update listing rating
    await this.updateListingRating(booking.listing._id);

    return review;
  }

  /**
   * Update listing average rating
   */
  async updateListingRating(listingId) {
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
  }

  /**
   * Get published reviews for a listing
   */
  async getPublishedReviews(listingId, options = {}) {
    return Review.getPublishedByListing(listingId, options);
  }

  /**
   * Check if user can review a booking
   */
  async canReview(bookingId, userId) {
    const booking = await Booking.findById(bookingId)
      .populate("user", "_id");

    if (!booking) return { canReview: false, reason: "Booking not found" };
    if (String(booking.user._id) !== String(userId)) {
      return { canReview: false, reason: "You can only review your own bookings" };
    }
    if (booking.paymentStatus !== "paid") {
      return { canReview: false, reason: "Payment must be confirmed" };
    }
    if (!["completed", "review_eligible"].includes(booking.status)) {
      return { canReview: false, reason: `Booking must be completed (status: ${booking.status})` };
    }

    const existing = await Review.findOne({ booking: bookingId });
    if (existing) {
      return { canReview: false, reason: "You already reviewed this booking" };
    }

    return { canReview: true };
  }

  /**
   * Get review for moderation (admin)
   */
  async getReviewForModeration(reviewId) {
    return Review.findById(reviewId)
      .populate("traveler", "name email")
      .populate("provider", "name email businessName")
      .populate("listing", "title slug")
      .populate("booking", "bookingCode")
      .populate("reportedBy.user", "name email");
  }
}

export default new ReviewService();