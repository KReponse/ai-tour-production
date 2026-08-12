// backend/src/controllers/providerReviewController.js
// ✅ COMPLETE FIXED - Removed problematic imports

import Review from '../models/Review.js';
import Booking from '../models/Booking.js';
import Listing from '../models/Listing.js';
import { createNotification } from '../utils/notificationService.js';

// =========================
// ✅ GET PROVIDER REVIEWS
// =========================
export const getProviderReviews = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const filter = { provider: req.user.id };
    if (status) filter.status = status;

    const reviews = await Review.find(filter)
      .populate('traveler', 'name avatar')
      .populate('listing', 'title slug')
      .populate('tour', 'title slug')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    const total = await Review.countDocuments(filter);
    const stats = await Review.getProviderStats(req.user.id);

    res.json({
      success: true,
      reviews,
      stats: stats[0] || null,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('❌ Get provider reviews error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// =========================
// ✅ GET PROVIDER REVIEW STATS
// =========================
export const getProviderReviewStats = async (req, res) => {
  try {
    const providerId = req.user.id;

    const reviews = await Review.find({ 
      provider: providerId,
      status: { $in: ['published', 'pending'] }
    });

    const totalReviews = reviews.length;
    const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = totalReviews > 0 ? totalRating / totalReviews : 0;

    const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach(r => {
      if (ratingCounts[r.rating] !== undefined) {
        ratingCounts[r.rating]++;
      }
    });

    const pendingCount = reviews.filter(r => r.status === 'pending').length;
    const publishedCount = reviews.filter(r => r.status === 'published').length;
    const hiddenCount = reviews.filter(r => r.status === 'hidden').length;

    const byListing = {};
    reviews.forEach(r => {
      const listingId = r.listing?._id || r.listing;
      const listingTitle = r.listing?.title || r.tour?.title || 'Unknown';
      if (listingId) {
        if (!byListing[listingId]) {
          byListing[listingId] = { 
            title: listingTitle, 
            count: 0, 
            sum: 0,
            average: 0
          };
        }
        byListing[listingId].count++;
        byListing[listingId].sum += r.rating;
        byListing[listingId].average = byListing[listingId].sum / byListing[listingId].count;
      }
    });

    const recentReviews = await Review.find({ 
      provider: providerId,
      status: 'published'
    })
    .populate('traveler', 'name avatar')
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

    res.json({
      success: true,
      stats: {
        totalReviews,
        averageRating: Math.round(averageRating * 10) / 10,
        ratingCounts,
        pendingCount,
        publishedCount,
        hiddenCount,
        byListing: Object.values(byListing),
        recentReviews
      }
    });
  } catch (error) {
    console.error('❌ Get provider review stats error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch review stats'
    });
  }
};

// =========================
// ✅ ADD/SUBMIT REVIEW
// =========================
export const addReview = async (req, res) => {
  try {
    const { 
      listingId, 
      tourId, 
      bookingId, 
      rating, 
      comment, 
      title,
      photos = [] 
    } = req.body;

    const travelerId = req.user.id;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid rating (1-5)'
      });
    }

    if (!comment || comment.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Review comment must be at least 10 characters'
      });
    }

    const entityId = listingId || tourId;
    if (!entityId) {
      return res.status(400).json({
        success: false,
        message: 'Listing ID or Tour ID is required'
      });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    if (booking.user.toString() !== travelerId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only review your own bookings'
      });
    }

    if (!['completed', 'review_eligible'].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: 'You can only review completed bookings'
      });
    }

    const existingReview = await Review.findOne({ 
      booking: bookingId,
      traveler: travelerId 
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this booking'
      });
    }

    const review = new Review({
      traveler: travelerId,
      provider: booking.provider,
      listing: listingId || null,
      tour: tourId || null,
      booking: bookingId,
      rating: parseInt(rating),
      title: title || `Review for ${booking.listing?.title || 'Booking'}`,
      comment: comment.trim(),
      photos: photos || [],
      status: 'published'
    });

    await review.save();

    booking.reviewSubmitted = true;
    booking.canReview = false;
    await booking.save();

    await createNotification({
      recipient: booking.provider,
      sender: travelerId,
      type: 'new_review',
      title: 'New Review Received',
      message: `${req.user.name || 'A traveler'} has left a ${rating}-star review`,
      data: { 
        reviewId: review._id,
        bookingId: booking._id,
        rating: rating
      },
      link: `/provider/reviews/${review._id}`
    });

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully',
      review
    });

  } catch (error) {
    console.error('❌ Add review error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to submit review'
    });
  }
};

// =========================
// ✅ UPDATE REVIEW
// =========================
export const updateReview = async (req, res) => {
  try {
    const { rating, comment, title, photos } = req.body;
    const reviewId = req.params.id;
    const travelerId = req.user.id;

    const review = await Review.findOne({
      _id: reviewId,
      traveler: travelerId
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    const daysSinceCreation = (Date.now() - review.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceCreation > 30) {
      return res.status(400).json({
        success: false,
        message: 'Reviews can only be updated within 30 days of creation'
      });
    }

    if (rating) review.rating = parseInt(rating);
    if (comment) review.comment = comment.trim();
    if (title) review.title = title.trim();
    if (photos) review.photos = photos;

    review.updatedAt = new Date();
    await review.save();

    res.json({
      success: true,
      message: 'Review updated successfully',
      review
    });

  } catch (error) {
    console.error('❌ Update review error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update review'
    });
  }
};

// =========================
// ✅ DELETE REVIEW
// =========================
export const deleteReview = async (req, res) => {
  try {
    const reviewId = req.params.id;
    const travelerId = req.user.id;

    const review = await Review.findOne({
      _id: reviewId,
      traveler: travelerId
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    review.isDeleted = true;
    review.deletedAt = new Date();
    await review.save();

    await Booking.findByIdAndUpdate(review.booking, {
      reviewSubmitted: false,
      canReview: true
    });

    res.json({
      success: true,
      message: 'Review deleted successfully'
    });

  } catch (error) {
    console.error('❌ Delete review error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete review'
    });
  }
};

// =========================
// ✅ RESPOND TO REVIEW
// =========================
export const respondToReview = async (req, res) => {
  try {
    const { comment } = req.body;
    const review = await Review.findById(req.params.id)
      .populate('traveler', 'name email');

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    if (review.status !== 'published') {
      return res.status(400).json({
        success: false,
        message: 'Can only respond to published reviews'
      });
    }

    if (review.providerResponse && review.providerResponse.comment) {
      return res.status(400).json({
        success: false,
        message: 'You already responded to this review'
      });
    }

    await review.addResponse(comment, req.user.id);

    await createNotification({
      recipient: review.traveler._id,
      sender: req.user.id,
      type: 'review_response',
      title: 'Provider Responded to Your Review',
      message: `The provider has responded to your review`,
      data: { reviewId: review._id },
      link: `/reviews/${review._id}`
    });

    res.json({
      success: true,
      message: 'Response added successfully',
      response: review.providerResponse
    });
  } catch (error) {
    console.error('❌ Respond to review error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// =========================
// ✅ EDIT RESPONSE
// =========================
export const editResponse = async (req, res) => {
  try {
    const { comment } = req.body;
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    if (!review.providerResponse) {
      return res.status(400).json({
        success: false,
        message: 'No response to edit'
      });
    }

    await review.editResponse(comment);

    res.json({
      success: true,
      message: 'Response updated successfully',
      response: review.providerResponse
    });
  } catch (error) {
    console.error('❌ Edit response error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// =========================
// ✅ DELETE RESPONSE
// =========================
export const deleteResponse = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    if (!review.providerResponse) {
      return res.status(400).json({
        success: false,
        message: 'No response to delete'
      });
    }

    review.providerResponse = null;
    await review.save();

    res.json({
      success: true,
      message: 'Response deleted successfully'
    });

  } catch (error) {
    console.error('❌ Delete response error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete response'
    });
  }
};

// =========================
// ✅ GET REVIEW BY ID
// =========================
export const getReviewById = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id)
      .populate('traveler', 'name email avatar phone')
      .populate('provider', 'name email businessName avatar')
      .populate('listing', 'title location coverImage')
      .populate('tour', 'title location coverImage')
      .populate('booking', 'bookingNumber startDate endDate totalPrice status');

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    res.json({
      success: true,
      review
    });

  } catch (error) {
    console.error('❌ Get review by ID error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch review'
    });
  }
};

