// src/pages/RequestTrip.jsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Send, 
  Calendar, 
  Users, 
  MapPin, 
  DollarSign, 
  FileText, 
  Star,
  Sparkles,
  CheckCircle,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import Card, { CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
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

const RequestTrip = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    destination: '',
    startDate: '',
    endDate: '',
    travelers: 2,
    budget: '',
    accommodation: 'standard',
    specialRequests: '',
    preferences: []
  });

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const preferences = [
    'Adventure', 
    'Relaxation', 
    'Culture', 
    'Food', 
    'Shopping', 
    'Nature', 
    'Nightlife', 
    'Family-friendly'
  ];

  // ===============================
  // ✅ SUBMIT TO BACKEND
  // ===============================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.destination.trim()) {
      setError('Please enter a destination');
      return;
    }
    if (!formData.startDate || !formData.endDate) {
      setError('Please select travel dates');
      return;
    }
    if (!formData.budget) {
      setError('Please enter your budget');
      return;
    }

    try {
      setLoading(true);

      // Prepare data for backend
      const requestData = {
        destination: formData.destination,
        startDate: formData.startDate,
        endDate: formData.endDate,
        travelers: formData.travelers,
        budget: formData.budget,
        accommodation: formData.accommodation,
        specialRequests: formData.specialRequests,
        preferences: formData.preferences.join(', '),
      };

      // ✅ Call backend API
      const response = await createRequest(requestData);
      
      console.log('✅ Request created:', response);
      
      setSubmitted(true);
      
      // Redirect after 3 seconds
      setTimeout(() => {
        navigate('/trips');
      }, 3000);

    } catch (error) {
      console.error('❌ Request error:', error);
      setError(error.response?.data?.message || 'Failed to submit request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center animate-fade-in max-w-md w-full">
          <div className="relative">
            <div className="w-20 h-20 bg-[#0D9488]/10 dark:bg-[#0D9488]/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <div className="absolute inset-0 rounded-full border-4 border-[#0D9488]/20 animate-ping" />
              <Send className="w-10 h-10 text-[#0D9488]" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-[#374151] dark:text-white mb-2">
            Request Sent! 🎉
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Our travel experts will review your request and get back to you within 24 hours.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button 
              variant="primary" 
              onClick={() => navigate('/')}
              className="bg-gradient-to-r from-[#0D9488] to-[#F59E0B] shadow-lg shadow-[#0D9488]/30"
            >
              Return to Home
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate('/explore')}
              className="border-[#0D9488] text-[#0D9488]"
            >
              Explore Tours
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in px-4 pb-32 md:pb-10">
      {/* HEADER */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#0D9488]/10 dark:bg-[#0D9488]/20 text-[#0D9488] text-sm font-semibold mb-4">
          <Sparkles className="w-4 h-4" />
          Custom Travel Planning
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-[#374151] dark:text-white mb-2">
          Request a Custom Trip
        </h1>
        <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Tell us your preferences and we'll create the perfect itinerary for you
        </p>
      </div>

      {/* ERROR */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      <Card className="border border-gray-100 dark:border-gray-800 shadow-xl rounded-3xl">
        <CardContent className="p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* DESTINATION */}
            <div>
              <label className="block text-sm font-medium text-[#374151] dark:text-white mb-2">
                Dream Destination *
              </label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  placeholder="Where do you want to go?"
                  className="pl-12 focus:ring-[#0D9488]"
                  value={formData.destination}
                  onChange={(e) => setFormData({...formData, destination: e.target.value})}
                  required
                />
              </div>
            </div>

            {/* DATES */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#374151] dark:text-white mb-2">
                  Start Date *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    type="date"
                    className="pl-12 focus:ring-[#0D9488]"
                    value={formData.startDate}
                    onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#374151] dark:text-white mb-2">
                  End Date *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    type="date"
                    className="pl-12 focus:ring-[#0D9488]"
                    value={formData.endDate}
                    onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                    required
                  />
                </div>
              </div>
            </div>

            {/* TRAVELERS & BUDGET */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#374151] dark:text-white mb-2">
                  Number of Travelers
                </label>
                <div className="relative">
                  <Users className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    type="number"
                    min="1"
                    className="pl-12 focus:ring-[#0D9488]"
                    value={formData.travelers}
                    onChange={(e) => setFormData({...formData, travelers: parseInt(e.target.value)})}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#374151] dark:text-white mb-2">
                  Budget (USD) *
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="e.g., 1000"
                    className="pl-12 focus:ring-[#0D9488]"
                    value={formData.budget}
                    onChange={(e) => setFormData({...formData, budget: e.target.value})}
                    required
                  />
                </div>
              </div>
            </div>

            {/* ACCOMMODATION */}
            <div>
              <label className="block text-sm font-medium text-[#374151] dark:text-white mb-2">
                Accommodation Preference
              </label>
              <select
                value={formData.accommodation}
                onChange={(e) => setFormData({...formData, accommodation: e.target.value})}
                className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition"
              >
                <option value="budget">Budget / Hostel</option>
                <option value="standard">Standard Hotel (3-4 star)</option>
                <option value="luxury">Luxury Hotel (5 star)</option>
                <option value="resort">Resort / Villa</option>
                <option value="boutique">Boutique Hotel</option>
              </select>
            </div>

            {/* PREFERENCES */}
            <div>
              <label className="block text-sm font-medium text-[#374151] dark:text-white mb-2">
                Travel Preferences
              </label>
              <div className="flex flex-wrap gap-2">
                {preferences.map((pref) => (
                  <button
                    key={pref}
                    type="button"
                    onClick={() => {
                      const newPrefs = formData.preferences.includes(pref)
                        ? formData.preferences.filter(p => p !== pref)
                        : [...formData.preferences, pref];
                      setFormData({...formData, preferences: newPrefs});
                    }}
                    className={`px-4 py-2 rounded-full text-sm transition-all duration-300 ${
                      formData.preferences.includes(pref)
                        ? 'bg-gradient-to-r from-[#0D9488] to-[#F59E0B] text-white shadow-lg shadow-[#0D9488]/30'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {pref}
                  </button>
                ))}
              </div>
            </div>

            {/* SPECIAL REQUESTS */}
            <div>
              <label className="block text-sm font-medium text-[#374151] dark:text-white mb-2">
                Special Requests
              </label>
              <div className="relative">
                <FileText className="absolute left-4 top-4 w-5 h-5 text-gray-400" />
                <textarea
                  rows="4"
                  placeholder="Any specific requirements or preferences?"
                  className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition resize-none"
                  value={formData.specialRequests}
                  onChange={(e) => setFormData({...formData, specialRequests: e.target.value})}
                />
              </div>
            </div>

            {/* SUBMIT */}
            <Button 
              type="submit" 
              variant="primary" 
              disabled={loading}
              className="w-full h-14 rounded-2xl text-lg bg-gradient-to-r from-[#0D9488] to-[#F59E0B] shadow-lg shadow-[#0D9488]/30 hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:hover:scale-100"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5 mr-2" />
                  Submit Request
                </>
              )}
            </Button>

            {/* Note */}
            <p className="text-center text-xs text-gray-400">
              We'll respond within 24 hours with a custom itinerary
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default RequestTrip;