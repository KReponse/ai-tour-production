// frontend/src/pages/Review.jsx
// ✅ COMPLETE FIXED - Better error handling, auth checks, and media support

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, Loader2, ArrowLeft, CheckCircle, AlertCircle, MapPin, Calendar, Users, DollarSign } from 'lucide-react';
import { getBookingById } from '../services/bookingService';
import { createReview, getReviewByBooking } from '../services/reviewService';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

// ✅ FIXED: Import mediaHelpers for consistent image handling
import { getImageUrl, getCoverMedia, getCoverMediaType } from '../utils/mediaHelpers';

const Review = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // ✅ Debug: Log the bookingId from URL
  console.log('🔍 Review page - bookingId from URL:', bookingId);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [booking, setBooking] = useState(null);
  const [existingReview, setExistingReview] = useState(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');

  // ✅ Check if user is logged in
  const isLoggedIn = user !== null && user !== undefined;

  useEffect(() => {
    // ✅ Check if bookingId exists and is valid
    if (!bookingId || bookingId === 'undefined' || bookingId === 'null' || bookingId === ':bookingId') {
      setError('Invalid booking ID. Please go back and try again.');
      setLoading(false);
      return;
    }
    
    // ✅ Check if bookingId is a valid MongoDB ObjectId (24 hex characters)
    if (!/^[0-9a-fA-F]{24}$/.test(bookingId)) {
      setError('Invalid booking ID format. Please go back and try again.');
      setLoading(false);
      return;
    }
    
    // ✅ Check if user is logged in
    if (!isLoggedIn) {
      setError('Please login to leave a review');
      setLoading(false);
      setTimeout(() => navigate('/login'), 2000);
      return;
    }
    
    fetchData();
  }, [bookingId, isLoggedIn]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please login to leave a review');
        setTimeout(() => navigate('/login'), 2000);
        return;
      }

      console.log('📤 Fetching booking with ID:', bookingId);
      
      const bookingData = await getBookingById(bookingId, token);
      console.log('✅ Booking data:', bookingData);
      
      if (!bookingData || !bookingData.booking) {
        setError('Booking not found');
        setLoading(false);
        return;
      }
      
      // ✅ Check if user owns this booking
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const bookingUserId = bookingData.booking.user?._id || bookingData.booking.user;
      
      console.log('👤 Current user ID:', currentUser._id);
      console.log('📋 Booking user ID:', bookingUserId);
      
      if (bookingUserId && currentUser._id && bookingUserId.toString() !== currentUser._id.toString()) {
        setError('You can only review your own bookings');
        setLoading(false);
        setTimeout(() => navigate('/my-bookings'), 2000);
        return;
      }
      
      setBooking(bookingData.booking);

      // ✅ Check if review already exists - handle 404 gracefully
      try {
        const reviewData = await getReviewByBooking(bookingId);
        if (reviewData && reviewData.review) {
          setExistingReview(reviewData.review);
          setRating(reviewData.review.rating);
          setTitle(reviewData.review.title || '');
          setComment(reviewData.review.comment);
          console.log('✅ Existing review found');
        }
      } catch (error) {
        if (error.response?.status === 404) {
          console.log('ℹ️ No existing review found - user can create one');
        } else if (error.response?.status === 401) {
          console.log('ℹ️ User not authenticated - skipping review check');
        } else {
          console.error('Error checking for existing review:', error);
          setError(error.response?.data?.message || 'Failed to check existing review');
        }
      }

    } catch (error) {
      console.error('❌ Error fetching data:', error);
      
      if (error.response?.status === 401) {
        setError('Your session has expired. Please login again.');
        setTimeout(() => navigate('/login'), 2000);
      } else if (error.response?.status === 403) {
        setError('You can only review your own bookings');
        setTimeout(() => navigate('/my-bookings'), 2000);
      } else {
        setError(error.response?.data?.message || 'Failed to load review data');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    if (!title.trim()) {
      toast.error('Please enter a review title');
      return;
    }

    if (!comment.trim()) {
      toast.error('Please write a review comment');
      return;
    }

    try {
      setSubmitting(true);
      
      const reviewData = {
        bookingId: bookingId,
        rating: rating,
        title: title.trim(),
        comment: comment.trim()
      };

      console.log('📤 Submitting review:', reviewData);
      
      const response = await createReview(reviewData);
      console.log('✅ Review submitted:', response);
      
      toast.success('Review submitted successfully! 🎉');
      navigate(`/booking-details/${bookingId}`);
    } catch (error) {
      console.error('❌ Error submitting review:', error);
      
      if (error.message?.includes('can only review your own bookings')) {
        toast.error('You can only review your own bookings');
        setTimeout(() => navigate('/my-bookings'), 2000);
      } else if (error.message?.includes('session has expired')) {
        toast.error('Your session has expired. Please login again.');
        setTimeout(() => navigate('/login'), 2000);
      } else {
        toast.error(error.message || 'Failed to submit review');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ✅ Get entity (listing or tour) from booking
  const getEntity = () => {
    return booking?.listing || booking?.tour || null;
  };

  const getEntityTitle = () => {
    const entity = getEntity();
    return entity?.title || 'Experience';
  };

  const getEntityLocation = () => {
    const entity = getEntity();
    return entity?.location || 'Location not specified';
  };

  const getEntityPrice = () => {
    const entity = getEntity();
    return entity?.price || 0;
  };

  const getTravelDate = () => {
    return booking?.startDate || booking?.travelDate || null;
  };

  // ✅ Get entity media using mediaHelpers
  const getEntityMedia = (entity) => {
    const defaultImage = 'https://images.unsplash.com/photo-1533106418989-88406c7cc8ca?w=500';
    
    if (!entity) {
      return { 
        url: defaultImage, 
        type: 'image',
        isVideo: false,
        videoUrl: null,
        poster: defaultImage,
      };
    }

    const coverType = getCoverMediaType(entity);
    const coverUrl = getCoverMedia(entity);
    
    console.log('📊 Media result:', {
      coverType,
      coverUrl,
      entityId: entity._id,
      entityTitle: entity.title,
    });

    return {
      url: coverUrl || defaultImage,
      type: coverType || 'image',
      isVideo: coverType === 'video',
      videoUrl: coverType === 'video' ? coverUrl : null,
      poster: coverUrl || defaultImage,
    };
  };

  const canReview = booking?.status === 'completed' || booking?.status === 'review_eligible';
  const alreadyReviewed = existingReview && existingReview._id;

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader2 className="w-10 h-10 animate-spin text-[#0D9488]" />
        <p className="mt-4 text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
        <div className="max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-[#374151] dark:text-white mb-2">
            Something Went Wrong
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-3 rounded-2xl bg-[#0D9488] text-white font-bold hover:bg-[#0D9488]/80 transition"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-[#374151] dark:text-white">Booking Not Found</h2>
          <button
            onClick={() => navigate('/my-bookings')}
            className="mt-4 px-6 py-3 rounded-2xl bg-[#0D9488] text-white font-bold hover:bg-[#0D9488]/80 transition"
          >
            View My Bookings
          </button>
        </div>
      </div>
    );
  }

  if (!canReview) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
        <div className="max-w-md w-full text-center bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-lg border border-gray-200 dark:border-gray-800">
          <AlertCircle className="w-16 h-16 text-[#F59E0B] mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-[#374151] dark:text-white mb-2">
            Not Yet Reviewable
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            This booking must be completed before you can leave a review.
            Current status: <span className="font-medium">{booking.status}</span>
          </p>
          <button
            onClick={() => navigate(`/booking-details/${bookingId}`)}
            className="px-6 py-3 rounded-2xl bg-[#0D9488] text-white font-bold hover:bg-[#0D9488]/80 transition"
          >
            View Booking Details
          </button>
        </div>
      </div>
    );
  }

  if (alreadyReviewed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
        <div className="max-w-md w-full text-center bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-lg border border-gray-200 dark:border-gray-800">
          <CheckCircle className="w-16 h-16 text-[#0D9488] mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-[#374151] dark:text-white mb-2">
            Review Already Submitted
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            You have already reviewed this experience.
          </p>
          <button
            onClick={() => navigate(`/booking-details/${bookingId}`)}
            className="px-6 py-3 rounded-2xl bg-[#0D9488] text-white font-bold hover:bg-[#0D9488]/80 transition"
          >
            View Booking Details
          </button>
        </div>
      </div>
    );
  }

  // ✅ Get entity and media
  const entity = getEntity();
  const media = getEntityMedia(entity);
  const entityTitle = getEntityTitle();
  const entityLocation = getEntityLocation();
  const travelDate = getTravelDate();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-500 hover:text-[#0D9488] transition mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>

        {/* ✅ Booking Summary Card with Media */}
        {booking && (
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-lg border border-gray-200 dark:border-gray-800 p-6 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Media - Small thumbnail */}
              <div className="w-full md:w-32 h-32 rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                {media.isVideo && media.videoUrl ? (
                  <video
                    src={media.videoUrl}
                    className="w-full h-full object-cover"
                    muted
                    loop
                    playsInline
                    poster={media.poster}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      const parent = e.target.parentElement;
                      if (parent) {
                        const img = document.createElement('img');
                        img.src = 'https://images.unsplash.com/photo-1533106418989-88406c7cc8ca?w=500';
                        img.className = 'w-full h-full object-cover';
                        parent.appendChild(img);
                      }
                    }}
                  />
                ) : (
                  <img
                    src={media.url}
                    alt={entityTitle}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = 'https://images.unsplash.com/photo-1533106418989-88406c7cc8ca?w=500';
                    }}
                  />
                )}
              </div>
              
              {/* Booking Info */}
              <div className="flex-1">
                <h3 className="text-lg font-bold text-[#374151] dark:text-white">
                  {entityTitle}
                </h3>
                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mt-1">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4 text-[#0D9488]" />
                    {entityLocation}
                  </span>
                  {travelDate && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4 text-[#0D9488]" />
                      {new Date(travelDate).toLocaleDateString()}
                    </span>
                  )}
                  {booking.numberOfPeople && (
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4 text-[#0D9488]" />
                      {booking.numberOfPeople} travelers
                    </span>
                  )}
                  {booking.totalPrice && (
                    <span className="flex items-center gap-1 font-semibold text-[#0D9488]">
                      <DollarSign className="w-4 h-4" />
                      ${booking.totalPrice}
                    </span>
                  )}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    booking.status === 'completed' ? 'bg-green-100 text-green-600' :
                    booking.status === 'review_eligible' ? 'bg-[#F59E0B]/10 text-[#F59E0B]' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    {booking.status === 'review_eligible' ? 'Ready for Review' : booking.status}
                  </span>
                  {booking.paymentStatus === 'paid' && (
                    <span className="text-xs bg-[#0D9488]/10 text-[#0D9488] px-2 py-0.5 rounded-full">
                      ✓ Verified Booking
                    </span>
                  )}
                  {media.isVideo && (
                    <span className="text-xs bg-[#0D9488]/10 text-[#0D9488] px-2 py-0.5 rounded-full flex items-center gap-1">
                      <span>🎬</span> Video Cover
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-lg border border-gray-200 dark:border-gray-800 p-6 md:p-8">
          <h1 className="text-2xl font-bold text-[#374151] dark:text-white mb-2">
            Leave a Review
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Share your experience with "{getEntityTitle()}"
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Rating Stars */}
            <div>
              <label className="block text-sm font-semibold text-[#374151] dark:text-white mb-3">
                Your Rating
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(star)}
                    className="focus:outline-none transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-10 h-10 ${
                        star <= (hoverRating || rating)
                          ? 'text-[#F59E0B] fill-[#F59E0B]'
                          : 'text-gray-300 dark:text-gray-600'
                      } transition-colors duration-200`}
                    />
                  </button>
                ))}
                <span className="ml-3 text-sm text-gray-500 flex items-center">
                  {rating > 0 ? `${rating} / 5` : 'Select a rating'}
                </span>
              </div>
            </div>

            {/* Title Input */}
            <div>
              <label className="block text-sm font-semibold text-[#374151] dark:text-white mb-3">
                Review Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Summarize your experience (e.g., 'Amazing Adventure!')"
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-[#374151] dark:text-white focus:ring-2 focus:ring-[#0D9488] focus:border-transparent transition outline-none"
                maxLength={100}
                required
              />
              <p className="mt-1 text-xs text-gray-400">
                {title.length} / 100 characters
              </p>
            </div>

            {/* Comment */}
            <div>
              <label className="block text-sm font-semibold text-[#374151] dark:text-white mb-3">
                Your Review
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows="6"
                placeholder="Tell us about your experience..."
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-[#374151] dark:text-white focus:ring-2 focus:ring-[#0D9488] focus:border-transparent transition outline-none resize-none"
                maxLength={2000}
                required
              />
              <p className="mt-2 text-sm text-gray-400">
                {comment.length} / 2000 characters
              </p>
            </div>

            {booking && booking.paymentStatus === 'paid' && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-[#0D9488]/5 border border-[#0D9488]/20">
                <CheckCircle className="w-5 h-5 text-[#0D9488]" />
                <span className="text-sm text-[#0D9488] font-medium">
                  Verified Booking ✓
                </span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || rating === 0 || !title.trim() || !comment.trim()}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#0D9488] to-[#F59E0B] text-white font-bold text-lg shadow-lg shadow-[#0D9488]/30 hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Review'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Review;