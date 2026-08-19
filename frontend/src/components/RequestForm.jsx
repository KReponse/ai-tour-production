// frontend/src/components/RequestForm.jsx
// ✅ COMPLETE FIXED - Mobile responsive with proper sizing
// ✅ ADDED: Responsive padding, font sizes, and touch targets
// ✅ ADDED: Form validation with real-time feedback
// ✅ ADDED: Field-level error messages
// ✅ FIXED: Touch-friendly inputs and buttons

import React, { useState } from 'react';
import {
  Send,
  MapPin,
  Calendar,
  Users,
  DollarSign,
  Bed,
  Sparkles,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { createRequest } from '../services/requestService';
import { useAuth } from '../contexts/AuthContext';

// ===============================
// AI TOUR COLORS
// ===============================
// Teal  : #0D9488
// Gold  : #F59E0B
// Slate : #374151
// White : #FFFFFF
// ===============================

const RequestForm = ({ onSuccess }) => {
  const { user, token } = useAuth();
  const [formData, setFormData] = useState({
    type: 'planning',
    destination: '',
    startDate: '',
    endDate: '',
    travelers: 1,
    budget: '',
    accommodation: 'mid-range',
    preferences: [],
    specialRequests: '',
    subject: '',
    message: '',
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  // ===============================
  // VALIDATE FORM
  // ===============================
  const validateForm = () => {
    const errors = {};

    if (formData.type === 'planning') {
      if (!formData.destination.trim()) {
        errors.destination = 'Destination is required';
      }
      if (!formData.startDate) {
        errors.startDate = 'Start date is required';
      }
      if (!formData.endDate) {
        errors.endDate = 'End date is required';
      }
      if (formData.startDate && formData.endDate && formData.endDate < formData.startDate) {
        errors.endDate = 'End date must be after start date';
      }
      if (formData.travelers < 1) {
        errors.travelers = 'At least 1 traveler required';
      }
    } else {
      if (!formData.subject.trim()) {
        errors.subject = 'Subject is required';
      }
      if (!formData.message.trim()) {
        errors.message = 'Message is required';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ===============================
  // HANDLE SUBMIT
  // ===============================
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      // Scroll to first error
      const firstError = document.querySelector('.text-red-500');
      if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Prepare data for backend
      const requestData = {
        type: formData.type,
        destination: formData.destination,
        startDate: formData.startDate,
        endDate: formData.endDate,
        travelers: Number(formData.travelers),
        budget: formData.budget,
        accommodation: formData.accommodation,
        preferences: formData.preferences.join(', '),
        specialRequests: formData.specialRequests,
        subject: formData.subject,
        message: formData.message,
      };

      const response = await createRequest(requestData, token);
      
      console.log('✅ Request created:', response);
      setSuccess(true);
      
      // Reset form
      setFormData({
        type: 'planning',
        destination: '',
        startDate: '',
        endDate: '',
        travelers: 1,
        budget: '',
        accommodation: 'mid-range',
        preferences: [],
        specialRequests: '',
        subject: '',
        message: '',
      });
      setFieldErrors({});
      
      onSuccess?.(response);
      
      // Auto hide success after 5 seconds
      setTimeout(() => setSuccess(false), 5000);

    } catch (err) {
      console.error('❌ Request error:', err);
      setError(err.response?.data?.message || 'Failed to create request');
    } finally {
      setLoading(false);
    }
  };

  // ===============================
  // HANDLE CHANGE
  // ===============================
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear field error when user types
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handlePreferencesChange = (e) => {
    const values = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
    setFormData(prev => ({ ...prev, preferences: values }));
  };

  // ===============================
  // INPUT CLASSES - Responsive
  // ===============================
  const getInputClasses = (fieldName) => {
    const base = `
      w-full px-3 sm:px-4 py-2.5 sm:py-3.5 
      rounded-xl sm:rounded-2xl 
      border ${fieldErrors[fieldName] ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}
      bg-white dark:bg-gray-800 
      text-gray-900 dark:text-white 
      focus:ring-2 focus:ring-[#0D9488] focus:border-transparent 
      transition outline-none 
      text-sm sm:text-base
      min-h-[44px] sm:min-h-[48px]
    `;
    return base;
  };

  const labelClasses = `
    block text-xs sm:text-sm font-medium 
    text-[#374151] dark:text-white 
    mb-1 sm:mb-2
  `;

  const errorClasses = `
    mt-1 text-xs sm:text-sm text-red-500 
    flex items-center gap-1
  `;

  // ===============================
  // RENDER
  // ===============================
  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
      {/* Header - Responsive */}
      <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#0D9488] to-[#F59E0B] flex items-center justify-center shadow-md">
          <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-[#374151] dark:text-white">
          Request a Trip
        </h2>
      </div>

      {/* SUCCESS */}
      {success && (
        <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-[#0D9488]/10 dark:bg-[#0D9488]/20 border border-[#0D9488]/20 flex items-center gap-2 sm:gap-3 animate-fade-in">
          <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-[#0D9488] flex-shrink-0" />
          <span className="text-sm sm:text-base text-[#0D9488] font-medium">
            Request submitted successfully! ✅
          </span>
        </div>
      )}

      {/* ERROR */}
      {error && (
        <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-center gap-2 sm:gap-3">
          <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 flex-shrink-0" />
          <span className="text-sm sm:text-base text-red-600 dark:text-red-400">{error}</span>
        </div>
      )}

      {/* TYPE */}
      <div>
        <label className={labelClasses}>Request Type</label>
        <select
          name="type"
          value={formData.type}
          onChange={handleChange}
          className={getInputClasses('type')}
        >
          <option value="planning">Trip Planning</option>
          <option value="support">Support</option>
          <option value="feedback">Feedback</option>
          <option value="feature">Feature Request</option>
          <option value="bug">Bug Report</option>
          <option value="other">Other</option>
        </select>
      </div>

      {formData.type === 'planning' ? (
        <>
          {/* DESTINATION */}
          <div>
            <label className={labelClasses}>
              <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 inline mr-1 text-[#0D9488]" />
              Destination *
            </label>
            <input
              type="text"
              name="destination"
              value={formData.destination}
              onChange={handleChange}
              placeholder="e.g., Kigali, Rwanda"
              className={getInputClasses('destination')}
            />
            {fieldErrors.destination && (
              <p className={errorClasses}>
                <AlertCircle className="w-3.5 h-3.5" />
                {fieldErrors.destination}
              </p>
            )}
          </div>

          {/* DATES - Responsive grid */}
          <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className={labelClasses}>
                <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 inline mr-1 text-[#0D9488]" />
                Start Date *
              </label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                className={getInputClasses('startDate')}
                min={new Date().toISOString().split('T')[0]}
              />
              {fieldErrors.startDate && (
                <p className={errorClasses}>
                  <AlertCircle className="w-3.5 h-3.5" />
                  {fieldErrors.startDate}
                </p>
              )}
            </div>
            <div>
              <label className={labelClasses}>
                <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 inline mr-1 text-[#F59E0B]" />
                End Date *
              </label>
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                className={getInputClasses('endDate')}
                min={new Date().toISOString().split('T')[0]}
              />
              {fieldErrors.endDate && (
                <p className={errorClasses}>
                  <AlertCircle className="w-3.5 h-3.5" />
                  {fieldErrors.endDate}
                </p>
              )}
            </div>
          </div>

          {/* TRAVELERS & BUDGET - Responsive grid */}
          <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className={labelClasses}>
                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 inline mr-1 text-[#0D9488]" />
                Travelers
              </label>
              <input
                type="number"
                name="travelers"
                value={formData.travelers}
                onChange={handleChange}
                min="1"
                className={getInputClasses('travelers')}
              />
              {fieldErrors.travelers && (
                <p className={errorClasses}>
                  <AlertCircle className="w-3.5 h-3.5" />
                  {fieldErrors.travelers}
                </p>
              )}
            </div>
            <div>
              <label className={labelClasses}>
                <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4 inline mr-1 text-[#F59E0B]" />
                Budget (USD)
              </label>
              <input
                type="text"
                name="budget"
                value={formData.budget}
                onChange={handleChange}
                placeholder="e.g., 500-1000"
                className={getInputClasses('budget')}
              />
            </div>
          </div>

          {/* ACCOMMODATION */}
          <div>
            <label className={labelClasses}>
              <Bed className="w-3.5 h-3.5 sm:w-4 sm:h-4 inline mr-1 text-[#0D9488]" />
              Accommodation
            </label>
            <select
              name="accommodation"
              value={formData.accommodation}
              onChange={handleChange}
              className={getInputClasses('accommodation')}
            >
              <option value="budget">Budget</option>
              <option value="mid-range">Mid-Range</option>
              <option value="luxury">Luxury</option>
              <option value="not-specified">Not Specified</option>
            </select>
          </div>

          {/* PREFERENCES */}
          <div>
            <label className={labelClasses}>
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 inline mr-1 text-[#F59E0B]" />
              Preferences
            </label>
            <input
              type="text"
              name="preferences"
              value={formData.preferences.join(', ')}
              onChange={handlePreferencesChange}
              placeholder="e.g., Culture, Nature, Adventure (comma separated)"
              className={getInputClasses('preferences')}
            />
            <p className="text-[10px] sm:text-xs text-gray-400 mt-1">
              Separate preferences with commas
            </p>
          </div>

          {/* SPECIAL REQUESTS */}
          <div>
            <label className={labelClasses}>
              Special Requests
            </label>
            <textarea
              name="specialRequests"
              value={formData.specialRequests}
              onChange={handleChange}
              rows="3"
              placeholder="Any special requirements..."
              className={`${getInputClasses('specialRequests')} resize-none min-h-[80px] sm:min-h-[100px]`}
            />
          </div>
        </>
      ) : (
        <>
          {/* SUBJECT */}
          <div>
            <label className={labelClasses}>
              Subject *
            </label>
            <input
              type="text"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              placeholder="Subject of your request"
              className={getInputClasses('subject')}
            />
            {fieldErrors.subject && (
              <p className={errorClasses}>
                <AlertCircle className="w-3.5 h-3.5" />
                {fieldErrors.subject}
              </p>
            )}
          </div>

          {/* MESSAGE */}
          <div>
            <label className={labelClasses}>
              Message *
            </label>
            <textarea
              name="message"
              value={formData.message}
              onChange={handleChange}
              rows="4"
              placeholder="Describe your request..."
              className={`${getInputClasses('message')} resize-none min-h-[100px] sm:min-h-[120px]`}
            />
            {fieldErrors.message && (
              <p className={errorClasses}>
                <AlertCircle className="w-3.5 h-3.5" />
                {fieldErrors.message}
              </p>
            )}
          </div>
        </>
      )}

      {/* SUBMIT - Responsive */}
      <button
        type="submit"
        disabled={loading}
        className={`
          w-full min-h-[50px] sm:min-h-[56px]
          px-4 sm:px-6 py-3 sm:py-4
          rounded-xl sm:rounded-2xl 
          bg-gradient-to-r from-[#0D9488] to-[#F59E0B] 
          text-white font-bold 
          text-sm sm:text-base md:text-lg
          shadow-lg shadow-[#0D9488]/30 
          hover:scale-[1.02] transition-all duration-300 
          disabled:opacity-50 disabled:hover:scale-100 
          flex items-center justify-center gap-2
          touch-manipulation
        `}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
            Submitting...
          </>
        ) : (
          <>
            <Send className="w-4 h-4 sm:w-5 sm:h-5" />
            Submit Request
          </>
        )}
      </button>

      <p className="text-center text-[10px] sm:text-xs text-gray-400">
        We'll respond within 24 hours
      </p>
    </form>
  );
};

export default RequestForm;