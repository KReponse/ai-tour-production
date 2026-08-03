// src/components/ReviewForm.jsx
// ✅ COMPLETE FIXED - Added hidePhotoUpload prop to control photo upload visibility

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
  // RENDER STARS
  // ===============================
  const renderStars = () => {
    return [1, 2, 3, 4, 5].map((star) => (
      <button
        key={star}
        type="button"
        onClick={() => handleRatingClick(star)}
        className="focus:outline-none hover:scale-110 transition-transform duration-200"
        aria-label={`Rate ${star} stars`}
      >
        <Star
          className={`w-10 h-10 transition-colors ${
            star <= formData.rating
              ? 'text-[#F59E0B] fill-[#F59E0B]'
              : 'text-gray-300 dark:text-gray-600 hover:text-gray-400'
          }`}
        />
      </button>
    ));
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-6 shadow-xl">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[#374151] dark:text-white">
            {isEditing ? 'Edit Review' : 'Write a Review'}
          </h2>
          {tourTitle && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {tourTitle}
            </p>
          )}
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition"
            type="button"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Rating */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Your Rating *
          </label>
          <div className="flex gap-1">
            {renderStars()}
          </div>
          {errors.rating && (
            <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.rating}
            </p>
          )}
          <p className="mt-2 text-xs text-gray-400">
            Click on the stars to rate
          </p>
        </div>

        {/* Title Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
            className={`w-full px-4 py-3 rounded-2xl border ${
              errors.title ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'
            } bg-white dark:bg-gray-800 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent transition outline-none dark:text-white`}
            maxLength={100}
          />
          <div className="flex justify-between mt-1.5">
            {errors.title && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.title}
              </p>
            )}
            <p className={`text-xs ml-auto ${formData.title.length > 90 ? 'text-[#F59E0B]' : 'text-gray-400'}`}>
              {formData.title.length}/100
            </p>
          </div>
        </div>

        {/* Comment */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Your Review *
          </label>
          <textarea
            rows="5"
            value={formData.comment}
            onChange={(e) => {
              setFormData({ ...formData, comment: e.target.value });
              if (errors.comment) {
                setErrors({ ...errors, comment: '' });
              }
            }}
            placeholder="Share your experience with this tour..."
            className={`w-full px-4 py-3 rounded-2xl border ${
              errors.comment ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'
            } bg-white dark:bg-gray-800 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent transition outline-none resize-none dark:text-white`}
          />
          <div className="flex justify-between mt-1.5">
            {errors.comment && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.comment}
              </p>
            )}
            <p className={`text-xs ml-auto ${formData.comment.length > 1800 ? 'text-[#F59E0B]' : 'text-gray-400'}`}>
              {formData.comment.length}/2000
            </p>
          </div>
        </div>

        {/* ✅ Images - Conditionally rendered based on hidePhotoUpload prop */}
        {!hidePhotoUpload && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Add Photos (Optional)
            </label>
            
            {/* Image Previews */}
            {imagePreviews.length > 0 && (
              <div className="flex flex-wrap gap-3 mb-3">
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={preview}
                      alt={`Review ${index + 1}`}
                      className="w-20 h-20 object-cover rounded-xl border border-gray-200 dark:border-gray-700"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute -top-2 -right-2 p-1 rounded-full bg-red-500 text-white hover:bg-red-600 transition opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload Button */}
            {imagePreviews.length < 5 && (
              <label className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 cursor-pointer hover:border-[#0D9488] transition-all duration-300 bg-gray-50 dark:bg-gray-800/50">
                <Upload className="w-5 h-5 text-[#0D9488]" />
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {isUploading ? 'Uploading...' : imagePreviews.length > 0 ? 'Add more photos' : 'Click to upload photos'}
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
            <p className="text-xs text-gray-400 mt-1.5">
              Max 5 images • JPG, PNG, WebP • Max 5MB each
            </p>
          </div>
        )}

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 h-12 rounded-2xl border-2 border-gray-200 dark:border-gray-700 font-semibold text-[#374151] dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              Cancel
            </button>
          )}
          <Button
            type="submit"
            disabled={isLoading || isUploading}
            className="flex-1 h-12 rounded-2xl bg-gradient-to-r from-[#0D9488] to-[#F59E0B] text-white font-bold shadow-lg shadow-[#0D9488]/30 hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {isEditing ? 'Updating...' : 'Submitting...'}
              </>
            ) : (
              <>
                {isEditing ? (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Update Review
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Submit Review
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