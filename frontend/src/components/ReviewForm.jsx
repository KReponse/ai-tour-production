// src/components/ReviewForm.jsx
// ✅ COMPLETE FIXED - Added hidePhotoUpload prop to control photo upload visibility
// ✅ RESPONSIVE - Mobile-optimized layout with proper touch targets
// ✅ RESPONSIVE - Responsive star sizes and form inputs
// ✅ RESPONSIVE - Stacked buttons on mobile, row on desktop

import React, { useState, useEffect } from 'react';
import {
  Star,
  X,
  Send,
  Loader2,
  AlertCircle,
  CheckCircle,
  Image,
  Upload,
  Trash2,
} from 'lucide-react';
import Button from './ui/Button';
import Input from './ui/Input';

// ===============================
// AI TOUR COLORS
// ===============================
// Teal  : #0D9488
// Gold  : #F59E0B
// Slate : #374151
// White : #FFFFFF
// ===============================

const ReviewForm = ({
  initialData = null,
  tourId,
  tourTitle,
  bookingId,
  onSubmit,
  onCancel,
  isLoading = false,
  isEditing = false,
  hidePhotoUpload = false, // ✅ NEW PROP - hides photo upload section
}) => {
  const [formData, setFormData] = useState({
    rating: 5,
    title: '',
    comment: '',
    images: [],
  });
  const [errors, setErrors] = useState({});
  const [imagePreviews, setImagePreviews] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  // Load initial data for editing
  useEffect(() => {
    if (initialData) {
      setFormData({
        rating: initialData.rating || 5,
        title: initialData.title || '',
        comment: initialData.comment || '',
        images: initialData.images || [],
      });
      if (initialData.images) {
        setImagePreviews(initialData.images);
      }
    }
  }, [initialData]);

  // ===============================
  // VALIDATE FORM
  // ===============================
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Please enter a review title';
    } else if (formData.title.length < 3) {
      newErrors.title = 'Title must be at least 3 characters';
    } else if (formData.title.length > 100) {
      newErrors.title = 'Title must be less than 100 characters';
    }
    
    if (!formData.comment.trim()) {
      newErrors.comment = 'Please write a review';
    } else if (formData.comment.length < 10) {
      newErrors.comment = 'Review must be at least 10 characters';
    } else if (formData.comment.length > 2000) {
      newErrors.comment = 'Review must be less than 2000 characters';
    }
    
    if (formData.rating < 1 || formData.rating > 5) {
      newErrors.rating = 'Please select a rating';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ===============================
  // HANDLE RATING CLICK
  // ===============================
  const handleRatingClick = (rating) => {
    setFormData({ ...formData, rating });
    if (errors.rating) {
      setErrors({ ...errors, rating: '' });
    }
  };

  // ===============================
  // HANDLE IMAGE UPLOAD
  // ===============================
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const validFiles = files.filter(file => file.size <= 5 * 1024 * 1024);
    if (validFiles.length !== files.length) {
      alert('Some images exceed 5MB. Please use smaller images.');
      return;
    }

    const imageFiles = validFiles.filter(file => file.type.startsWith('image/'));
    if (imageFiles.length !== validFiles.length) {
      alert('Please upload only image files.');
      return;
    }

    const totalImages = formData.images.length + imageFiles.length;
    if (totalImages > 5) {
      alert('Maximum 5 images allowed');
      return;
    }

    setIsUploading(true);
    
    const newImages = [...formData.images];
    const newPreviews = [...imagePreviews];

    imageFiles.forEach((file) => {
      newImages.push(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        newPreviews.push(reader.result);
        if (newPreviews.length === newImages.length) {
          setImagePreviews(newPreviews);
          setFormData({ ...formData, images: newImages });
          setIsUploading(false);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // ===============================
  // REMOVE IMAGE
  // ===============================
  const removeImage = (index) => {
    const newImages = [...formData.images];
    const newPreviews = [...imagePreviews];
    
    newImages.splice(index, 1);
    newPreviews.splice(index, 1);
    
    setFormData({ ...formData, images: newImages });
    setImagePreviews(newPreviews);
  };

  // ===============================
  // HANDLE SUBMIT
  // ===============================
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      const firstError = document.querySelector('.text-red-500');
      if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    const submitData = {
      rating: formData.rating,
      title: formData.title.trim(),
      comment: formData.comment.trim(),
    };

    console.log('📤 Submitting form data:', submitData);
    
    await onSubmit(submitData);
  };

  // ===============================
  // RENDER STARS - Responsive
  // ===============================
  const renderStars = () => {
    return [1, 2, 3, 4, 5].map((star) => (
      <button
        key={star}
        type="button"
        onClick={() => handleRatingClick(star)}
        className="focus:outline-none hover:scale-110 transition-transform duration-200 touch-manipulation"
        aria-label={`Rate ${star} stars`}
      >
        <Star
          className={`
            w-8 h-8 sm:w-10 sm:h-10 
            transition-colors duration-200
            ${star <= formData.rating
              ? 'text-[#F59E0B] fill-[#F59E0B]'
              : 'text-gray-300 dark:text-gray-600 hover:text-gray-400'
            }
          `}
        />
      </button>
    ));
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl sm:rounded-3xl border border-gray-100 dark:border-gray-800 p-4 sm:p-6 shadow-xl">
      
      {/* Header - Responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#374151] dark:text-white">
            {isEditing ? 'Edit Review' : 'Write a Review'}
          </h2>
          {tourTitle && (
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5 sm:mt-1 break-words">
              {tourTitle}
            </p>
          )}
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="self-start sm:self-center p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition touch-manipulation"
            type="button"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6 text-gray-500" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        
        {/* Rating */}
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 sm:mb-3">
            Your Rating *
          </label>
          <div className="flex gap-0.5 sm:gap-1 flex-wrap">
            {renderStars()}
          </div>
          {errors.rating && (
            <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-red-500 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              {errors.rating}
            </p>
          )}
          <p className="mt-1 sm:mt-2 text-[10px] sm:text-xs text-gray-400">
            Tap or click on the stars to rate
          </p>
        </div>

        {/* Title Input - Responsive */}
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
            Review Title *
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => {
              setFormData({ ...formData, title: e.target.value });
              if (errors.title) {
                setErrors({ ...errors, title: '' });
              }
            }}
            placeholder="Summarize your experience (e.g., 'Amazing Adventure!')"
            className={`
              w-full px-3 sm:px-4 py-2.5 sm:py-3 
              rounded-xl sm:rounded-2xl 
              border ${errors.title ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}
              bg-white dark:bg-gray-800 
              focus:ring-2 focus:ring-[#0D9488] focus:border-transparent 
              transition outline-none 
              dark:text-white text-sm sm:text-base
              min-h-[44px] sm:min-h-[48px]
            `}
            maxLength={100}
          />
          <div className="flex flex-col sm:flex-row sm:justify-between mt-1 sm:mt-1.5 gap-1">
            {errors.title && (
              <p className="text-xs sm:text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                {errors.title}
              </p>
            )}
            <p className={`text-[10px] sm:text-xs ml-auto ${formData.title.length > 90 ? 'text-[#F59E0B]' : 'text-gray-400'}`}>
              {formData.title.length}/100
            </p>
          </div>
        </div>

        {/* Comment - Responsive */}
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
            Your Review *
          </label>
          <textarea
            rows={4}
            value={formData.comment}
            onChange={(e) => {
              setFormData({ ...formData, comment: e.target.value });
              if (errors.comment) {
                setErrors({ ...errors, comment: '' });
              }
            }}
            placeholder="Share your experience with this tour..."
            className={`
              w-full px-3 sm:px-4 py-2.5 sm:py-3 
              rounded-xl sm:rounded-2xl 
              border ${errors.comment ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}
              bg-white dark:bg-gray-800 
              focus:ring-2 focus:ring-[#0D9488] focus:border-transparent 
              transition outline-none resize-none 
              dark:text-white text-sm sm:text-base
              min-h-[120px] sm:min-h-[150px]
            `}
          />
          <div className="flex flex-col sm:flex-row sm:justify-between mt-1 sm:mt-1.5 gap-1">
            {errors.comment && (
              <p className="text-xs sm:text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                {errors.comment}
              </p>
            )}
            <p className={`text-[10px] sm:text-xs ml-auto ${formData.comment.length > 1800 ? 'text-[#F59E0B]' : 'text-gray-400'}`}>
              {formData.comment.length}/2000
            </p>
          </div>
        </div>

        {/* ✅ Images - Conditionally rendered & Responsive */}
        {!hidePhotoUpload && (
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
              Add Photos (Optional)
            </label>
            
            {/* Image Previews - Responsive */}
            {imagePreviews.length > 0 && (
              <div className="flex flex-wrap gap-2 sm:gap-3 mb-2 sm:mb-3">
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={preview}
                      alt={`Review ${index + 1}`}
                      className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-700"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 p-0.5 sm:p-1 rounded-full bg-red-500 text-white hover:bg-red-600 transition opacity-0 group-hover:opacity-100 touch-manipulation"
                    >
                      <Trash2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload Button - Responsive */}
            {imagePreviews.length < 5 && (
              <label className={`
                flex items-center gap-2 sm:gap-3 
                px-3 sm:px-4 py-2.5 sm:py-3 
                rounded-xl sm:rounded-2xl 
                border-2 border-dashed border-gray-300 dark:border-gray-600 
                cursor-pointer hover:border-[#0D9488] 
                transition-all duration-300 
                bg-gray-50 dark:bg-gray-800/50
                min-h-[44px] sm:min-h-[48px]
              `}>
                <Upload className="w-4 h-4 sm:w-5 sm:h-5 text-[#0D9488] flex-shrink-0" />
                <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 break-words">
                  {isUploading ? 'Uploading...' : imagePreviews.length > 0 ? 'Add more photos' : 'Tap to upload photos'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={isUploading}
                />
              </label>
            )}
            <p className="text-[10px] sm:text-xs text-gray-400 mt-1 sm:mt-1.5">
              Max 5 images • JPG, PNG, WebP • Max 5MB each
            </p>
          </div>
        )}

        {/* Submit - Responsive */}
        <div className="flex flex-col xs:flex-row gap-2 sm:gap-3 pt-1 sm:pt-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className={`
                flex-1 min-h-[44px] sm:min-h-[48px]
                px-4 sm:px-6 py-2.5 sm:py-3
                rounded-xl sm:rounded-2xl
                border-2 border-gray-200 dark:border-gray-700
                font-semibold text-sm sm:text-base
                text-[#374151] dark:text-white
                hover:bg-gray-50 dark:hover:bg-gray-800
                transition
                touch-manipulation
              `}
            >
              Cancel
            </button>
          )}
          <Button
            type="submit"
            disabled={isLoading || isUploading}
            fullWidth
            className={`
              flex-1 min-h-[44px] sm:min-h-[48px]
              rounded-xl sm:rounded-2xl
              bg-gradient-to-r from-[#0D9488] to-[#F59E0B] 
              text-white font-bold text-sm sm:text-base
              shadow-lg shadow-[#0D9488]/30 
              hover:scale-[1.02] transition-all duration-300 
              disabled:opacity-50 disabled:hover:scale-100
              flex items-center justify-center gap-2
              touch-manipulation
            `}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                {isEditing ? 'Updating...' : 'Submitting...'}
              </>
            ) : (
              <>
                {isEditing ? (
                  <>
                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>Update Review</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>Submit Review</span>
                  </>
                )}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ReviewForm;