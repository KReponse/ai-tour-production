// src/pages/Booking.jsx
// ✅ FIXED - Added video support and proper media handling

import React, { useState, useEffect } from 'react';
import {
  Plane,
  Hotel,
  Car,
  Users,
  CreditCard,
  ShieldCheck,
  Sparkles,
  MapPin,
  Star,
  Smartphone,
  Wallet,
  BadgeDollarSign,
  Loader2,
  Calendar,
  User,
  Mail,
  Phone,
  Play,
  Video,
} from 'lucide-react';

import Card, {
  CardContent,
  CardImage,
} from '../components/ui/Card';

import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getTourById } from '../services/tourService';
import { getListingById } from '../services/listingService';
import { createBooking } from '../services/bookingService';

// ✅ Import mediaHelpers
import { getImageUrl, getCoverMedia, getCoverMediaType, getCoverVideo, hasVideo } from '../utils/mediaHelpers';

// ===============================
// AI TOUR COLORS
// ===============================
// Teal  : #0D9488
// Gold  : #F59E0B
// Slate : #374151
// White : #FFFFFF
// ===============================

const Booking = () => {
  const { listingId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [entity, setEntity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Booking form data
  const [formData, setFormData] = useState({
    fullName: user?.name || '',
    email: user?.email || '',
    phone: '',
    travelers: 1,
    travelDate: '',
    specialRequests: '',
  });

  // Fetch entity (listing) from backend
  useEffect(() => {
    if (listingId) {
      fetchEntity();
    }
  }, [listingId]);

  const fetchEntity = async () => {
    try {
      setLoading(true);
      setError('');
      
      const data = await getListingById(listingId);
      setEntity(data.listing);
    } catch (error) {
      console.error('Error fetching listing:', error);
      setError('Failed to load experience details');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Get entity media
  const getEntityMedia = (entity) => {
    const defaultImage = 'https://images.unsplash.com/photo-1533106418989-88406c7cc8ca?w=500';
    
    if (!entity) {
      return {
        url: defaultImage,
        isVideo: false,
        videoUrl: null,
        poster: defaultImage,
      };
    }

    const coverType = getCoverMediaType(entity);
    const coverUrl = getCoverMedia(entity);
    const videoUrl = getCoverVideo(entity);
    const hasVideoContent = hasVideo(entity);

    let poster = coverUrl || defaultImage;
    
    if (entity.coverImage) {
      poster = getImageUrl(entity.coverImage) || defaultImage;
    } else if (entity.galleryImages && entity.galleryImages.length > 0) {
      poster = getImageUrl(entity.galleryImages[0]) || defaultImage;
    }

    console.log('📊 [Booking] Media result:', {
      coverType,
      coverUrl,
      videoUrl,
      hasVideoContent,
      poster,
      entityId: entity._id,
      entityTitle: entity.title,
    });

    if ((coverType === 'video' || hasVideoContent) && videoUrl) {
      return {
        url: videoUrl,
        isVideo: true,
        videoUrl: videoUrl,
        poster: poster,
        imageUrl: coverUrl || defaultImage,
      };
    }

    return {
      url: coverUrl || defaultImage,
      isVideo: false,
      videoUrl: null,
      poster: poster,
      imageUrl: coverUrl || defaultImage,
    };
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user) {
      alert('Please login to book this experience');
      navigate('/login');
      return;
    }

    if (!entity) {
      alert('Experience not found');
      return;
    }

    // Validation
    if (!formData.fullName.trim()) {
      alert('Please enter your full name');
      return;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      alert('Please enter a valid email');
      return;
    }
    if (!formData.phone.trim()) {
      alert('Please enter your phone number');
      return;
    }
    if (!formData.travelDate) {
      alert('Please select a travel date');
      return;
    }

    try {
      setSubmitting(true);

      const bookingData = {
        listing: entity._id,
        startDate: formData.travelDate,
        endDate: formData.travelDate,
        numberOfPeople: formData.travelers,
        specialRequests: formData.specialRequests,
      };

      const token = localStorage.getItem('token');
      const response = await createBooking(bookingData, token);
      
      console.log('✅ Booking created:', response);
      
      const bookingId = response.booking._id;
      navigate(`/payment/${bookingId}`);

    } catch (error) {
      console.error('❌ Booking error:', error);
      alert(error.response?.data?.message || 'Failed to create booking. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-[#0D9488]/20" />
          <div className="absolute inset-0 rounded-full border-4 border-[#0D9488] border-t-transparent animate-spin" />
        </div>
        <p className="mt-4 text-gray-500 dark:text-gray-400">Loading experience details...</p>
      </div>
    );
  }

  // Error state
  if (error || !entity) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
        <div className="max-w-md">
          <h1 className="text-4xl font-bold mb-4 text-[#374151] dark:text-white">
            Experience Not Available
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            {error || 'The experience you are looking for is not available for booking.'}
          </p>
          <Link to="/explore">
            <Button className="bg-gradient-to-r from-[#0D9488] to-[#F59E0B]">
              Explore Experiences
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const totalPrice = entity.price * formData.travelers;
  const isPending = entity.status === 'pending';
  const entityTitle = entity.title || 'Experience';
  const entityLocation = entity.location || 'Location not specified';
  const entityDuration = entity.duration || 'N/A';
  
  // ✅ Get media using mediaHelpers
  const media = getEntityMedia(entity);

  return (
    <div className="max-w-7xl mx-auto px-3 md:px-5 space-y-8 pb-32 md:pb-10 animate-fade-in">

      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0D9488] via-[#0D9488] to-[#F59E0B] p-8 md:p-12 text-white">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10">
          <div className="flex flex-wrap items-center gap-3 mb-6">
            {['Booking', 'Details', 'Payment', 'Confirmation'].map((step, index) => (
              <div
                key={index}
                className={`px-4 py-2 rounded-full text-sm font-medium ${
                  index === 0
                    ? 'bg-white text-[#0D9488]'
                    : 'bg-white/20 text-white'
                }`}
              >
                {step}
              </div>
            ))}
          </div>
          <h1 className="text-3xl md:text-5xl font-bold mb-4">
            Book Your Experience
          </h1>
          <p className="text-white/90 text-lg max-w-2xl">
            Complete your booking for {entityTitle} in {entityLocation}.
          </p>
        </div>
      </section>

      {/* MAIN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* LEFT */}
        <div className="lg:col-span-2 space-y-8">

          {/* ENTITY DETAILS - WITH VIDEO SUPPORT */}
          <Card className="overflow-hidden rounded-3xl border border-gray-100 dark:border-gray-800">
            <div className="grid md:grid-cols-2">
              {/* Media Section - Supports Video */}
              <div className="relative h-64 md:h-full min-h-[220px] bg-gray-100 dark:bg-gray-800">
                {media.isVideo && media.videoUrl ? (
                  <div className="relative w-full h-full min-h-[220px] bg-black">
                    <video
                      key={media.videoUrl}
                      src={media.videoUrl}
                      className="w-full h-full object-cover"
                      autoPlay
                      muted
                      loop
                      playsInline
                      poster={media.poster}
                      preload="metadata"
                      onError={(e) => {
                        console.error('❌ [Booking] Video error:', media.videoUrl);
                        e.target.style.display = 'none';
                        const parent = e.target.parentElement;
                        if (parent) {
                          const img = document.createElement('img');
                          img.src = media.poster || 'https://images.unsplash.com/photo-1533106418989-88406c7cc8ca?w=500';
                          img.className = 'w-full h-full object-cover';
                          img.alt = entityTitle;
                          parent.appendChild(img);
                        }
                      }}
                    />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                      <div className="w-12 h-12 rounded-full bg-[#0D9488]/80 backdrop-blur flex items-center justify-center">
                        <Play className="w-5 h-5 text-white ml-0.5" />
                      </div>
                    </div>
                    <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Video className="w-3 h-3" />
                      Video
                    </div>
                    <div className="absolute top-3 left-3 bg-[#0D9488]/80 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Play className="w-3 h-3" />
                      Cover Video
                    </div>
                  </div>
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
              
              <CardContent className="p-6 flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-3 py-1 rounded-full bg-[#0D9488]/10 text-[#0D9488] text-xs font-semibold">
                    {entity.category || 'Popular Experience'}
                  </span>
                  <div className="flex items-center text-sm font-semibold">
                    <Star className="w-4 h-4 text-[#F59E0B] fill-current mr-1" />
                    {entity.averageRating || entity.rating || 4.8}
                  </div>
                  {media.isVideo && (
                    <span className="px-2 py-0.5 rounded-full bg-[#0D9488]/10 text-[#0D9488] text-xs font-semibold flex items-center gap-1">
                      <Play className="w-3 h-3" />
                      Video
                    </span>
                  )}
                </div>
                <h2 className="text-3xl font-bold mb-3 dark:text-white">
                  {entityTitle}
                </h2>
                <div className="flex items-center text-gray-500 dark:text-gray-400 mb-4">
                  <MapPin className="w-4 h-4 mr-1 text-[#0D9488]" />
                  {entityLocation}
                </div>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-5 line-clamp-3">
                  {entity.description}
                </p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Starting from</p>
                    <div className="text-3xl font-bold text-[#0D9488]">
                      ${entity.price}
                    </div>
                  </div>
                  <Link to={`/listing/${entity._id}`}>
                    <Button variant="outline" className="border-[#0D9488] text-[#0D9488]">
                      View Details
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </div>
          </Card>

          {/* BOOKING FORM */}
          <Card className="p-6 md:p-8 rounded-3xl">
            <h2 className="text-2xl font-bold mb-6 text-[#374151] dark:text-white">
              Your Details
            </h2>

            {isPending && (
              <div className="mb-4 p-4 rounded-2xl bg-[#F59E0B]/10 border border-[#F59E0B]/20 text-[#F59E0B]">
                ⏳ This experience is pending approval and cannot be booked yet.
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium mb-2 text-[#374151] dark:text-white">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    name="fullName"
                    placeholder="Enter your full name"
                    value={formData.fullName}
                    onChange={handleChange}
                    className="pl-12 focus:ring-[#0D9488]"
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium mb-2 text-[#374151] dark:text-white">
                  Email *
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    name="email"
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={handleChange}
                    className="pl-12 focus:ring-[#0D9488]"
                    required
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium mb-2 text-[#374151] dark:text-white">
                  Phone *
                </label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    name="phone"
                    placeholder="+250 7XX XXX XXX"
                    value={formData.phone}
                    onChange={handleChange}
                    className="pl-12 focus:ring-[#0D9488]"
                    required
                  />
                </div>
              </div>

              {/* Travelers + Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium mb-2 text-[#374151] dark:text-white">
                    Travelers *
                  </label>
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, travelers: Math.max(1, formData.travelers - 1) })}
                      className="w-11 h-11 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-[#0D9488]/10 transition text-xl font-bold"
                    >
                      -
                    </button>
                    <div className="flex items-center gap-2 text-lg font-bold text-[#374151] dark:text-white">
                      <Users className="w-5 h-5 text-[#0D9488]" />
                      {formData.travelers}
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, travelers: formData.travelers + 1 })}
                      className="w-11 h-11 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-[#0D9488]/10 transition text-xl font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-[#374151] dark:text-white">
                    Travel Date *
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      name="travelDate"
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      value={formData.travelDate}
                      onChange={handleChange}
                      className="pl-12 focus:ring-[#0D9488]"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Special Requests */}
              <div>
                <label className="block text-sm font-medium mb-2 text-[#374151] dark:text-white">
                  Special Requests
                </label>
                <textarea
                  name="specialRequests"
                  rows="3"
                  placeholder="Any special requirements or requests..."
                  value={formData.specialRequests}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent transition outline-none resize-none"
                />
              </div>

              {/* Submit */}
              <Button
                type="submit"
                disabled={submitting || isPending}
                className="w-full h-14 rounded-2xl text-lg bg-gradient-to-r from-[#0D9488] to-[#F59E0B] shadow-lg shadow-[#0D9488]/30 hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:hover:scale-100"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Booking...
                  </>
                ) : isPending ? (
                  'Experience Pending Approval'
                ) : (
                  `Book Now - $${totalPrice}`
                )}
              </Button>
            </form>
          </Card>
        </div>

        {/* RIGHT SIDEBAR - Booking Summary */}
        <div className="lg:sticky lg:top-24 h-fit">
          <Card className="p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-xl space-y-6">
            
            <h2 className="text-2xl font-bold text-[#374151] dark:text-white">
              Booking Summary
            </h2>

            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Experience</span>
                <span className="font-semibold dark:text-white text-right max-w-[55%]">
                  {entityTitle}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Location</span>
                <span className="font-semibold dark:text-white">
                  {entityLocation}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Travelers</span>
                <span className="font-semibold dark:text-white">
                  {formData.travelers}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Duration</span>
                <span className="font-semibold dark:text-white">
                  {entityDuration}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Travel Date</span>
                <span className="font-semibold dark:text-white">
                  {formData.travelDate || '--'}
                </span>
              </div>

              {media.isVideo && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Cover Media</span>
                  <span className="font-semibold text-[#0D9488] flex items-center gap-1">
                    <Play className="w-3 h-3" />
                    Video
                  </span>
                </div>
              )}

              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-xl font-bold text-[#374151] dark:text-white">
                    Total
                  </span>
                  <span className="text-3xl font-bold text-[#0D9488]">
                    ${totalPrice}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  ${entity.price} × {formData.travelers} traveler{formData.travelers > 1 ? 's' : ''}
                </p>
              </div>
            </div>

            {/* Trust Badges */}
            <div className="space-y-3">
              {['Secure Payment', 'Free Cancellation', '24/7 Support'].map((item, index) => (
                <div key={index} className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 dark:bg-gray-800">
                  <ShieldCheck className="w-5 h-5 text-[#0D9488]" />
                  <span className="text-sm font-medium dark:text-white">{item}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Booking;