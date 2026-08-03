// backend/src/controllers/providerReviewController.js

import Review from '../models/Review.js';
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
// ✅ GET PROVIDER REVIEW STATS (NEW)
// =========================
export const getProviderReviewStats = async (req, res) => {
  try {
    const providerId = req.user.id;

    // Get all reviews for this provider
    const reviews = await Review.find({ 
      provider: providerId,
      status: { $in: ['published', 'pending'] }
    });

    const totalReviews = reviews.length;
    
    // Calculate average rating
    const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = totalReviews > 0 ? totalRating / totalReviews : 0;

    // Count by rating
    const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach(r => {
      if (ratingCounts[r.rating] !== undefined) {
        ratingCounts[r.rating]++;
      }
    });

    // Count by status
    const pendingCount = reviews.filter(r => r.status === 'pending').length;
    const publishedCount = reviews.filter(r => r.status === 'published').length;
    const hiddenCount = reviews.filter(r => r.status === 'hidden').length;

    // Get reviews by listing
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

    // Get recent reviews (last 5)
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

    // Check if review is published
    if (review.status !== 'published') {
      return res.status(400).json({
        success: false,
        message: 'Can only respond to published reviews'
      });
    }

    // Check if already responded
    if (review.providerResponse && review.providerResponse.comment) {
      return res.status(400).json({
        success: false,
        message: 'You already responded to this review'
      });
    }

    await review.addResponse(comment, req.user.id);

    // Notify traveler
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