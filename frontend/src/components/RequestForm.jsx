// frontend/src/components/RequestForm.jsx

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (formData.type === 'planning') {
      if (!formData.destination.trim()) {
        setError('Destination is required');
        return;
      }
      if (!formData.startDate || !formData.endDate) {
        setError('Please select travel dates');
        return;
      }
    } else {
      if (!formData.subject.trim()) {
        setError('Subject is required');
        return;
      }
      if (!formData.message.trim()) {
        setError('Message is required');
        return;
      }
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

      const response = await createRequest(requestData);
      
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePreferencesChange = (e) => {
    const values = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
    setFormData(prev => ({ ...prev, preferences: values }));
  };

  // Input classes with AI Tour colors
  const inputClasses = "w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#0D9488] focus:border-transparent transition outline-none";
  const labelClasses = "block text-sm font-medium text-[#374151] dark:text-white mb-2";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#0D9488] to-[#F59E0B] flex items-center justify-center shadow-md">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <h2 className="text-2xl font-black text-[#374151] dark:text-white">
          Request a Trip
        </h2>
      </div>

      {/* SUCCESS */}
      {success && (
        <div className="p-4 rounded-2xl bg-[#0D9488]/10 dark:bg-[#0D9488]/20 border border-[#0D9488]/20 flex items-center gap-3 animate-fade-in">
          <CheckCircle className="w-5 h-5 text-[#0D9488]" />
          <span className="text-[#0D9488] font-medium">Request submitted successfully! ✅</span>
        </div>
      )}

      {/* ERROR */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <span className="text-red-600 dark:text-red-400">{error}</span>
        </div>
      )}

      {/* TYPE */}
      <div>
        <label className={labelClasses}>Request Type</label>
        <select
          name="type"
          value={formData.type}
          onChange={handleChange}
          className={inputClasses}
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
              <MapPin className="w-4 h-4 inline mr-1 text-[#0D9488]" />
              Destination *
            </label>
            <input
              type="text"
              name="destination"
              value={formData.destination}
              onChange={handleChange}
              required
              placeholder="e.g., Kigali, Rwanda"
              className={inputClasses}
            />
          </div>

          {/* DATES */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClasses}>
                <Calendar className="w-4 h-4 inline mr-1 text-[#0D9488]" />
                Start Date *
              </label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                required
                className={inputClasses}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div>
              <label className={labelClasses}>
                <Calendar className="w-4 h-4 inline mr-1 text-[#F59E0B]" />
                End Date *
              </label>
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                required
                className={inputClasses}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>

          {/* TRAVELERS & BUDGET */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClasses}>
                <Users className="w-4 h-4 inline mr-1 text-[#0D9488]" />
                Travelers
              </label>
              <input
                type="number"
                name="travelers"
                value={formData.travelers}
                onChange={handleChange}
                min="1"
                className={inputClasses}
              />
            </div>
            <div>
              <label className={labelClasses}>
                <DollarSign className="w-4 h-4 inline mr-1 text-[#F59E0B]" />
                Budget (USD)
              </label>
              <input
                type="text"
                name="budget"
                value={formData.budget}
                onChange={handleChange}
                placeholder="e.g., 500-1000"
                className={inputClasses}
              />
            </div>
          </div>

          {/* ACCOMMODATION */}
          <div>
            <label className={labelClasses}>
              <Bed className="w-4 h-4 inline mr-1 text-[#0D9488]" />
              Accommodation
            </label>
            <select
              name="accommodation"
              value={formData.accommodation}
              onChange={handleChange}
              className={inputClasses}
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
              <Sparkles className="w-4 h-4 inline mr-1 text-[#F59E0B]" />
              Preferences
            </label>
            <input
              type="text"
              name="preferences"
              value={formData.preferences.join(', ')}
              onChange={handlePreferencesChange}
              placeholder="e.g., Culture, Nature, Adventure (comma separated)"
              className={inputClasses}
            />
            <p className="text-xs text-gray-400 mt-1">
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
              className={`${inputClasses} resize-none`}
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
              required
              placeholder="Subject of your request"
              className={inputClasses}
            />
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
              required
              placeholder="Describe your request..."
              className={`${inputClasses} resize-none`}
            />
          </div>
        </>
      )}

      {/* SUBMIT */}
      <button
        type="submit"
        disabled={loading}
        className="w-full h-14 rounded-2xl bg-gradient-to-r from-[#0D9488] to-[#F59E0B] text-white font-bold shadow-lg shadow-[#0D9488]/30 hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2 text-lg"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Submitting...
          </>
        ) : (
          <>
            <Send className="w-5 h-5" />
            Submit Request
          </>
        )}
      </button>

      <p className="text-center text-xs text-gray-400">
        We'll respond within 24 hours
      </p>
    </form>
  );
};

export default RequestForm;