// backend/src/middleware/reviewPermission.js
// ✅ COMPLETE FIXED - Enhanced debugging, proper ownership check, and all validations

import Booking from '../models/Booking.js';
import Review from '../models/Review.js';

// ============================================================
// ✅ CAN CREATE REVIEW - FULLY FIXED WITH DEBUG LOGGING
// ============================================================
export const canCreateReview = async (req, res, next) => {
  try {
    const { bookingId } = req.body;

    console.log('========== 🔍 REVIEW PERMISSION DEBUG ==========');
    console.log('📋 Booking ID from body:', bookingId);
    console.log('👤 Authenticated user (req.user):', {
      id: req.user._id || req.user.id,
      email: req.user.email,
      name: req.user.name,
      role: req.user.role
    });

    // ============================================================
    // STEP 1: Validate bookingId
    // ============================================================
    if (!bookingId) {
      console.log('❌ Booking ID is missing from request body');
      return res.status(400).json({
        success: false,
        message: 'Booking ID is required'
      });
    }

    // ============================================================
    // STEP 2: Get booking with user populated
    // ============================================================
    const booking = await Booking.findById(bookingId)
      .populate('user', '_id name email');

    if (!booking) {
      console.log('❌ Booking not found:', bookingId);
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    console.log('📦 Booking found:', {
      _id: booking._id,
      user: booking.user,
      status: booking.status,
      paymentStatus: booking.paymentStatus
    });

    // ============================================================
    // STEP 3: Check if booking has user
    // ============================================================
    if (!booking.user) {
      console.log('❌ Booking has no user field:', bookingId);
      return res.status(400).json({
        success: false,
        message: 'Booking has no associated user'
      });
    }

    // ============================================================
    // STEP 4: OWNERSHIP CHECK - Handle both populated and unpopulated
    // ============================================================
    const bookingUserId = booking.user._id || booking.user;
    const currentUserId = req.user._id || req.user.id;

    console.log('🔐 Comparing ownership:');
    console.log(`   Booking user ID: ${String(bookingUserId)}`);
    console.log(`   Current user ID: ${String(currentUserId)}`);

    // ✅ FIXED: Use String() for reliable comparison
    const isOwner = String(bookingUserId) === String(currentUserId);
    
    if (!isOwner) {
      console.log('❌ Ownership check FAILED: User does not own this booking');
      console.log(`   Booking user: ${bookingUserId}`);
      console.log(`   Current user: ${currentUserId}`);
      return res.status(403).json({
        success: false,
        message: 'You can only review your own bookings'
      });
    }

    console.log('✅ Ownership check PASSED');

    // ============================================================
    // STEP 5: Check booking status
    // ============================================================
    const allowedStatuses = ['completed', 'review_eligible'];
    if (!allowedStatuses.includes(booking.status)) {
      console.log(`❌ Booking not reviewable: ${booking.status}`);
      return res.status(400).json({
        success: false,
        message: `Booking must be completed before reviewing. Current status: ${booking.status}`
      });
    }

    // ============================================================
    // STEP 6: Check payment status
    // ============================================================
    if (booking.paymentStatus !== 'paid') {
      console.log(`❌ Payment not confirmed: ${booking.paymentStatus}`);
      return res.status(400).json({
        success: false,
        message: 'Payment must be confirmed before reviewing'
      });
    }

    // ============================================================
    // STEP 7: Check if review already exists
    // ============================================================
    const existingReview = await Review.findOne({ booking: bookingId });
    if (existingReview) {
      console.log('❌ Review already exists for this booking');
      return res.status(400).json({
        success: false,
        message: 'You already reviewed this booking'
      });
    }

    // ============================================================
    // STEP 8: Check review deadline (30 days after completion)
    // ============================================================
    const reviewDeadline = new Date(booking.updatedAt);
    reviewDeadline.setDate(reviewDeadline.getDate() + 30);

    if (new Date() > reviewDeadline) {
      console.log('❌ Review window expired');
      return res.status(400).json({
        success: false,
        message: 'Review window has expired (30 days after completion)'
      });
    }

    console.log('✅ All validations passed - User can create review');
    console.log('==========================================');

    // Store booking in request for controller to use
    req.booking = booking;
    next();
  } catch (error) {
    console.error('❌ canCreateReview error:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to validate review creation'
    });
  }
};

// ============================================================
// ✅ CAN MODIFY REVIEW - FULLY FIXED
// ============================================================
export const canModifyReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id)
      .populate('traveler', '_id name email');

    console.log('========== 🔍 MODIFY REVIEW PERMISSION DEBUG ==========');
    console.log('📋 Review ID:', req.params.id);
    console.log('👤 Authenticated user (req.user):', {
      id: req.user._id || req.user.id,
      email: req.user.email,
      role: req.user.role
    });

    if (!review) {
      console.log('❌ Review not found:', req.params.id);
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    console.log('📦 Review found:', {
      _id: review._id,
      traveler: review.traveler,
      status: review.status,
      canEdit: review.canEdit,
      canDelete: review.canDelete
    });

    // ============================================================
    // STEP 1: OWNERSHIP CHECK
    // ============================================================
    const travelerId = review.traveler?._id || review.traveler;
    const currentUserId = req.user._id || req.user.id;

    console.log('🔐 Comparing ownership:');
    console.log(`   Review traveler ID: ${String(travelerId)}`);
    console.log(`   Current user ID: ${String(currentUserId)}`);

    const isOwner = String(travelerId) === String(currentUserId);
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      console.log('❌ Ownership check FAILED: User does not own this review');
      return res.status(403).json({
        success: false,
        message: 'You can only modify your own reviews'
      });
    }

    console.log('✅ Ownership check PASSED');

    // ============================================================
    // STEP 2: Check if can edit/delete (7 day window)
    // ============================================================
    const method = req.method || 'GET';
    console.log(`📌 Request method: ${method}`);

    if (method === 'PUT' || method === 'PATCH') {
      if (!review.canEdit) {
        console.log('❌ Review cannot be edited - window expired');
        return res.status(400).json({
          success: false,
          message: 'Review can only be edited within 7 days of submission'
        });
      }
      console.log('✅ Review can be edited');
    }

    if (method === 'DELETE') {
      if (!review.canDelete) {
        console.log('❌ Review cannot be deleted - window expired');
        return res.status(400).json({
          success: false,
          message: 'Review can only be deleted within 7 days of submission'
        });
      }
      console.log('✅ Review can be deleted');
    }

    console.log('✅ All validations passed - User can modify review');
    console.log('==========================================');

    // Store review in request for controller to use
    req.review = review;
    next();
  } catch (error) {
    console.error('❌ canModifyReview error:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to validate review modification'
    });
  }
};

// ============================================================
// ✅ CAN RESPOND TO REVIEW - FULLY FIXED
// ============================================================
export const canRespondToReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id)
      .populate('provider', '_id name email');

    console.log('========== 🔍 RESPOND REVIEW PERMISSION DEBUG ==========');
    console.log('📋 Review ID:', req.params.id);
    console.log('👤 Authenticated user (req.user):', {
      id: req.user._id || req.user.id,
      email: req.user.email,
      role: req.user.role
    });

    if (!review) {
      console.log('❌ Review not found:', req.params.id);
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    console.log('📦 Review found:', {
      _id: review._id,
      provider: review.provider,
      status: review.status
    });

    // ============================================================
    // STEP 1: OWNERSHIP CHECK - Provider owns the review
    // ============================================================
    const providerId = review.provider?._id || review.provider;
    const currentUserId = req.user._id || req.user.id;

    console.log('🔐 Comparing provider ownership:');
    console.log(`   Review provider ID: ${String(providerId)}`);
    console.log(`   Current user ID: ${String(currentUserId)}`);

    const isProvider = String(providerId) === String(currentUserId);
    const isAdmin = req.user.role === 'admin';

    if (!isProvider && !isAdmin) {
      console.log('❌ Provider check FAILED: User does not own this review');
      return res.status(403).json({
        success: false,
        message: 'You can only respond to reviews for your own listings'
      });
    }

    console.log('✅ Provider check PASSED');

    // ============================================================
    // STEP 2: Check if review is published
    // ============================================================
    if (review.status !== 'published' && review.status !== 'pending') {
      console.log(`❌ Review not publishable: ${review.status}`);
      return res.status(400).json({
        success: false,
        message: `Can only respond to published or pending reviews. Current status: ${review.status}`
      });
    }

    console.log('✅ All validations passed - Provider can respond to review');
    console.log('==========================================');

    // Store review in request for controller to use
    req.review = review;
    next();
  } catch (error) {
    console.error('❌ canRespondToReview error:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to validate review response'
    });
  }
};

// ============================================================
// ✅ CAN VIEW REVIEW - For admins and owners
// ============================================================
export const canViewReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id)
      .populate('traveler', '_id name email')
      .populate('provider', '_id name email');

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    const travelerId = review.traveler?._id || review.traveler;
    const providerId = review.provider?._id || review.provider;
    const currentUserId = req.user._id || req.user.id;

    const isOwner = String(travelerId) === String(currentUserId);
    const isProvider = String(providerId) === String(currentUserId);
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isProvider && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this review'
      });
    }

    req.review = review;
    next();
  } catch (error) {
    console.error('❌ canViewReview error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};