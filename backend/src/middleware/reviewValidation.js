// backend/src/middleware/reviewValidation.js
// ✅ COMPLETE FIXED - Split validation for create and update

import mongoose from 'mongoose';
import Booking from '../models/Booking.js';
import Review from '../models/Review.js';

// ============================================================
// ✅ CREATE REVIEW VALIDATION - Requires bookingId
// ============================================================
export const validateCreateReview = (req, res, next) => {
  const { rating, title, comment, bookingId, images } = req.body;

  // Validate rating
  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({
      success: false,
      message: 'Rating must be between 1 and 5'
    });
  }

  // Validate title
  if (!title || title.length < 3 || title.length > 100) {
    return res.status(400).json({
      success: false,
      message: 'Title must be between 3 and 100 characters'
    });
  }

  // Validate comment
  if (!comment || comment.length < 10 || comment.length > 2000) {
    return res.status(400).json({
      success: false,
      message: 'Comment must be between 10 and 2000 characters'
    });
  }

  // ✅ Validate bookingId - REQUIRED for creation
  if (!bookingId || !mongoose.Types.ObjectId.isValid(bookingId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid booking ID'
    });
  }

  // Validate images (if provided)
  if (images && !Array.isArray(images)) {
    return res.status(400).json({
      success: false,
      message: 'Images must be an array'
    });
  }

  next();
};

// ============================================================
// ✅ UPDATE REVIEW VALIDATION - NO bookingId required
// ============================================================
export const validateUpdateReview = (req, res, next) => {
  const { rating, title, comment, images } = req.body;

  // ✅ All fields are optional during update
  // Only validate if provided

  if (rating !== undefined && (rating < 1 || rating > 5)) {
    return res.status(400).json({
      success: false,
      message: 'Rating must be between 1 and 5'
    });
  }

  if (title !== undefined) {
    if (title.length < 3 || title.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Title must be between 3 and 100 characters'
      });
    }
  }

  if (comment !== undefined) {
    if (comment.length < 10 || comment.length > 2000) {
      return res.status(400).json({
        success: false,
        message: 'Comment must be between 10 and 2000 characters'
      });
    }
  }

  // Validate images (if provided)
  if (images !== undefined && !Array.isArray(images)) {
    return res.status(400).json({
      success: false,
      message: 'Images must be an array'
    });
  }

  // ✅ NO bookingId validation here!

  next();
};

// ============================================================
// ✅ PROVIDER RESPONSE VALIDATION
// ============================================================
export const validateResponse = (req, res, next) => {
  const { comment } = req.body;

  if (!comment || comment.length < 3 || comment.length > 1000) {
    return res.status(400).json({
      success: false,
      message: 'Response must be between 3 and 1000 characters'
    });
  }

  next();
};

// ============================================================
// ✅ PERMISSION MIDDLEWARE
// ============================================================

export const canCreateReview = async (req, res, next) => {
  try {
    const { bookingId } = req.body;

    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: 'Booking ID is required'
      });
    }

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if booking belongs to traveler
    if (booking.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only review your own bookings'
      });
    }

    // Check booking status
    if (booking.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Booking must be completed before reviewing'
      });
    }

    // Check payment status
    if (booking.paymentStatus !== 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Payment must be confirmed before reviewing'
      });
    }

    // Check if review already exists
    const existingReview = await Review.findOne({ booking: bookingId });
    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You already reviewed this booking'
      });
    }

    // Check review deadline (30 days after completion)
    const reviewDeadline = new Date(booking.updatedAt);
    reviewDeadline.setDate(reviewDeadline.getDate() + 30);

    if (new Date() > reviewDeadline) {
      return res.status(400).json({
        success: false,
        message: 'Review window has expired (30 days after completion)'
      });
    }

    next();
  } catch (error) {
    console.error('❌ canCreateReview error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const canModifyReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Check if review belongs to traveler
    if (review.traveler.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only modify your own reviews'
      });
    }

    // Check if can edit/delete (7 day window)
    const editWindow = 7 * 24 * 60 * 60 * 1000; // 7 days
    const canEdit = review.status === 'published' && 
                    (Date.now() - new Date(review.createdAt).getTime()) < editWindow;

    if (req.method === 'PUT' && !canEdit) {
      return res.status(400).json({
        success: false,
        message: 'Review can only be edited within 7 days of submission'
      });
    }

    if (req.method === 'DELETE' && !canEdit) {
      return res.status(400).json({
        success: false,
        message: 'Review can only be deleted within 7 days of submission'
      });
    }

    next();
  } catch (error) {
    console.error('❌ canModifyReview error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const canRespondToReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Check if provider owns this review
    if (review.provider.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only respond to reviews for your own listings'
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

    next();
  } catch (error) {
    console.error('❌ canRespondToReview error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const canEditResponse = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Check if provider owns this review
    if (review.provider.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only edit responses for your own listings'
      });
    }

    // Check if response exists
    if (!review.providerResponse || !review.providerResponse.comment) {
      return res.status(400).json({
        success: false,
        message: 'No response to edit'
      });
    }

    next();
  } catch (error) {
    console.error('❌ canEditResponse error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};