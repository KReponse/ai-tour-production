// src/pages/CustomRequest.jsx

import React, { useState } from 'react';
import {
  Sparkles,
  MapPin,
  CalendarDays,
  Users,
  Wallet,
  Plane,
  ArrowLeft,
  Wand2,
  CheckCircle2,
} from 'lucide-react';

import {
  Link,
  useNavigate,
  useLocation,
} from 'react-router-dom';

import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

// ===============================
// AI TOUR COLORS
// ===============================
// Teal  : #0D9488
// Gold  : #F59E0B
// Slate : #374151
// White : #FFFFFF
// ===============================

const CustomRequest = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const prefilledDestination = location.state?.destination || '';

  const [formData, setFormData] = useState({
    destination: prefilledDestination,
    duration: '',
    travelers: 1,
    budget: '',
    interests: '',
    notes: '',
  });

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    navigate('/trip-results', {
      state: formData,
    });
  };

  const features = [
    'AI-generated travel plans',
    'Smart hotel recommendations',
    'Budget optimization',
    'Personalized experiences',
  ];

  return (
    <div className="max-w-7xl mx-auto px-3 md:px-5 py-6 md:py-10 space-y-8 animate-fade-in">

      {/* TOP NAV */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-all duration-300"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="font-medium text-sm">Back</span>
        </button>

        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 gap-2">
          <Link to="/" className="hover:text-[#0D9488] transition">
            Home
          </Link>
          <span>/</span>
          <span className="text-gray-900 dark:text-white font-medium">AI Planner</span>
        </div>
      </div>

      {/* HERO - Updated with AI Tour colors */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0D9488] via-[#0D9488] to-[#F59E0B] p-8 md:p-12 text-white">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-md mb-5">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">AI Powered Trip Planning</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-5">
            Create Your Perfect
            <span className="block">Rwanda Adventure</span>
          </h1>
          <p className="text-white/90 text-lg md:text-xl leading-relaxed">
            Tell AI Tour what you want, and our intelligent planner
            will design a personalized travel experience for you.
          </p>
        </div>
      </section>

      {/* MAIN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* LEFT */}
        <div className="lg:col-span-2">
          <Card className="p-6 md:p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-xl">
            <div className="mb-8">
              <h2 className="text-2xl md:text-3xl font-bold mb-3 dark:text-white">
                Plan Your Trip
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                Fill in your preferences and let AI generate your ideal travel plan.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">

              {/* DESTINATION */}
              <div>
                <label className="block text-sm font-medium mb-2 dark:text-white">
                  Destination
                </label>
                <div className="relative">
                  <MapPin className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="e.g Volcanoes National Park"
                    value={formData.destination}
                    onChange={(e) => handleChange('destination', e.target.value)}
                    className="pl-12 focus:ring-[#0D9488]"
                    required
                  />
                </div>
              </div>

              {/* GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium mb-2 dark:text-white">
                    Duration
                  </label>
                  <div className="relative">
                    <CalendarDays className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <Input
                      placeholder="e.g 5 Days"
                      value={formData.duration}
                      onChange={(e) => handleChange('duration', e.target.value)}
                      className="pl-12 focus:ring-[#0D9488]"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 dark:text-white">
                    Travelers
                  </label>
                  <div className="relative">
                    <Users className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <Input
                      type="number"
                      min="1"
                      value={formData.travelers}
                      onChange={(e) => handleChange('travelers', e.target.value)}
                      className="pl-12 focus:ring-[#0D9488]"
                    />
                  </div>
                </div>
              </div>

              {/* BUDGET */}
              <div>
                <label className="block text-sm font-medium mb-2 dark:text-white">
                  Budget Range
                </label>
                <div className="relative">
                  <Wallet className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="e.g $1000 - $3000"
                    value={formData.budget}
                    onChange={(e) => handleChange('budget', e.target.value)}
                    className="pl-12 focus:ring-[#0D9488]"
                    required
                  />
                </div>
              </div>

              {/* INTERESTS */}
              <div>
                <label className="block text-sm font-medium mb-2 dark:text-white">
                  Interests
                </label>
                <textarea
                  rows={4}
                  placeholder="Safari, luxury hotels, hiking, local culture, nightlife..."
                  value={formData.interests}
                  onChange={(e) => handleChange('interests', e.target.value)}
                  className="w-full p-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#0D9488] focus:border-transparent"
                />
              </div>

              {/* NOTES */}
              <div>
                <label className="block text-sm font-medium mb-2 dark:text-white">
                  Extra Notes
                </label>
                <textarea
                  rows={4}
                  placeholder="Tell AI anything important about your trip..."
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  className="w-full p-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#0D9488] focus:border-transparent"
                />
              </div>

              {/* AI BOX - Updated colors */}
              <div className="rounded-2xl bg-gradient-to-r from-[#0D9488]/10 to-[#F59E0B]/10 dark:from-gray-800 dark:to-gray-900 p-5 border border-[#0D9488]/20 dark:border-gray-700">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-[#0D9488] to-[#F59E0B] flex items-center justify-center shadow-lg flex-shrink-0">
                    <Wand2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-1 dark:text-white">
                      AI Smart Planning
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                      AI will analyze your budget, travel style, and interests
                      to create a smart travel experience.
                    </p>
                  </div>
                </div>
              </div>

              {/* BUTTON - Updated colors */}
              <Button
                type="submit"
                className="w-full h-14 rounded-2xl text-lg bg-gradient-to-r from-[#0D9488] to-[#F59E0B] shadow-lg shadow-[#0D9488]/30 hover:scale-[1.02] transition-all duration-300"
              >
                Generate AI Trip Plan
              </Button>
            </form>
          </Card>
        </div>

        {/* RIGHT - Updated colors */}
        <div className="lg:sticky lg:top-24 h-fit">
          <Card className="p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-xl space-y-6">

            <div>
              <h2 className="text-2xl font-bold mb-5 dark:text-white">
                Why Use AI Planner?
              </h2>
              <div className="space-y-4">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 dark:bg-gray-800">
                    <CheckCircle2 className="w-5 h-5 text-[#0D9488] flex-shrink-0" />
                    <span className="text-sm font-medium dark:text-white">
                      {feature}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* AI CARD - Updated colors */}
            <div className="rounded-3xl overflow-hidden bg-gradient-to-br from-[#0D9488] to-[#0f766e] p-6 text-white relative">
              <Plane className="absolute top-4 right-4 w-16 h-16 text-white/10" />
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 mb-4">
                  <Sparkles className="w-4 h-4" />
                  <span className="text-sm">AI Assistant</span>
                </div>
                <h3 className="text-2xl font-bold mb-3">
                  Smart Travel Planning
                </h3>
                <p className="text-white/90 leading-relaxed text-sm">
                  Get personalized itineraries, hotel suggestions, activities,
                  and transport recommendations instantly.
                </p>
              </div>
            </div>

            {/* QUICK STATS - Updated colors */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 text-center">
                <div className="text-2xl font-bold text-[#0D9488]">10K+</div>
                <div className="text-xs text-gray-500">Trips Planned</div>
              </div>
              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 text-center">
                <div className="text-2xl font-bold text-[#F59E0B]">98%</div>
                <div className="text-xs text-gray-500">Happy Travelers</div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CustomRequest;