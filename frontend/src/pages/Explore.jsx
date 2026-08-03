// src/pages/Explore.jsx
// ✅ COMPLETE FIXED - Stable rendering with proper keys and memoization
// ✅ ENHANCED: Infinite scroll with useInfiniteScroll hook (Strategy A)
// ✅ FIXED: All cards have stable keys (_id)
// ✅ FIXED: Uses MediaCard for consistent video rendering
// ✅ FIXED: Added provider filter from URL query params

import React, { useEffect, useState, useMemo, useRef, useCallback, memo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Search,
  Filter,
  MapPin,
  Star,
  X,
  Heart,
  Clock,
  Users,
  ChevronDown,
  Grid3x3,
  List,
  Sparkles,
  Compass,
  Play,
  RefreshCw,
  Image as ImageIcon,
  Video,
  Hotel,
  Utensils,
  Car,
  Mountain,
  Calendar,
  Map,
  Coffee,
  Tent,
  Ship,
  Bike,
  Camera,
  Music,
  Building,
  Home,
  Waves,
  Bus,
  Plane,
  UtensilsCrossed,
  Bed,
  CarTaxiFront,
  Bike as BikeIcon,
  Landmark,
  TreePine,
  PartyPopper,
  Briefcase,
  Activity,
  HeartPulse,
  Palette,
} from 'lucide-react';
import { getListings } from '../services/listingService';
import { getImageUrl, getCoverMedia, getCoverMediaType } from '../utils/mediaHelpers';
import useInfiniteScroll from '../hooks/useInfiniteScroll';
import useScrollPosition from '../hooks/useScrollPosition';
import LoadingSkeleton from '../components/ui/LoadingSkeleton';
import BackToTop from '../components/ui/BackToTop';
import MediaCard from '../components/ui/MediaCard';
import { PAGINATION } from '../utils/constants';

// ===============================
// CATEGORY CHIPS
// ===============================

const CATEGORY_CHIPS = [
  { id: 'all', label: 'All', icon: Compass },
  { id: 'tour', label: 'Tours', icon: Map },
  { id: 'experience', label: 'Experiences', icon: Sparkles },
  { id: 'accommodation', label: 'Hotels', icon: Hotel },
  { id: 'transport', label: 'Transport', icon: Car },
  { id: 'restaurant', label: 'Food', icon: UtensilsCrossed },
  { id: 'activity', label: 'Adventure', icon: Mountain },
  { id: 'guide', label: 'Guides', icon: Map },
  { id: 'event', label: 'Events', icon: Calendar },
];

const DYNAMIC_CATEGORIES = {
  tour: [
    { value: 'wildlife_safari', label: 'Wildlife Safari', icon: TreePine },
    { value: 'city_tour', label: 'City Tour', icon: Building },
    { value: 'cultural_tour', label: 'Cultural Tour', icon: Landmark },
    { value: 'nature_tour', label: 'Nature Tour', icon: TreePine },
    { value: 'adventure_tour', label: 'Adventure Tour', icon: Mountain },
    { value: 'photography_tour', label: 'Photography Tour', icon: Camera },
  ],
  experience: [
    { value: 'cultural', label: 'Cultural Experience', icon: Landmark },
    { value: 'culinary', label: 'Culinary Experience', icon: UtensilsCrossed },
    { value: 'artistic', label: 'Artistic Experience', icon: Palette },
    { value: 'wellness', label: 'Wellness Experience', icon: HeartPulse },
    { value: 'nightlife', label: 'Nightlife Experience', icon: Music },
  ],
  accommodation: [
    { value: 'hotel', label: 'Hotel', icon: Hotel },
    { value: 'resort', label: 'Resort', icon: Building },
    { value: 'lodge', label: 'Lodge', icon: Tent },
    { value: 'apartment', label: 'Apartment', icon: Building },
    { value: 'guesthouse', label: 'Guesthouse', icon: Home },
    { value: 'camping', label: 'Camping', icon: Tent },
  ],
  transport: [
    { value: 'car_rental', label: 'Car Rental', icon: CarTaxiFront },
    { value: 'airport_transfer', label: 'Airport Transfer', icon: Plane },
    { value: 'shuttle', label: 'Shuttle Service', icon: Bus },
    { value: 'bike_rental', label: 'Bike Rental', icon: BikeIcon },
    { value: 'boat_transfer', label: 'Boat Transfer', icon: Ship },
  ],
  restaurant: [
    { value: 'fine_dining', label: 'Fine Dining', icon: UtensilsCrossed },
    { value: 'casual', label: 'Casual Dining', icon: Utensils },
    { value: 'cafe', label: 'Café', icon: Coffee },
    { value: 'street_food', label: 'Street Food', icon: UtensilsCrossed },
    { value: 'traditional', label: 'Traditional Cuisine', icon: Landmark },
  ],
  activity: [
    { value: 'hiking', label: 'Hiking', icon: Mountain },
    { value: 'biking', label: 'Biking', icon: BikeIcon },
    { value: 'water_sports', label: 'Water Sports', icon: Waves },
    { value: 'fishing', label: 'Fishing', icon: Waves },
    { value: 'skiing', label: 'Skiing', icon: Mountain },
  ],
  guide: [
    { value: 'city_guide', label: 'City Guide', icon: Building },
    { value: 'nature_guide', label: 'Nature Guide', icon: TreePine },
    { value: 'cultural_guide', label: 'Cultural Guide', icon: Landmark },
    { value: 'adventure_guide', label: 'Adventure Guide', icon: Mountain },
  ],
  event: [
    { value: 'festival', label: 'Festival', icon: PartyPopper },
    { value: 'concert', label: 'Concert', icon: Music },
    { value: 'workshop', label: 'Workshop', icon: Briefcase },
    { value: 'sports_event', label: 'Sports Event', icon: Activity },
    { value: 'cultural_event', label: 'Cultural Event', icon: Landmark },
  ],
};

const SORT_OPTIONS = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'newest', label: 'Newest' },
  { value: 'trending', label: 'Trending' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'price-low', label: 'Lowest Price' },
  { value: 'price-high', label: 'Highest Price' },
];

const LISTING_TYPES = [
  { value: 'all', label: 'All Types' },
  { value: 'tour', label: 'Tour' },
  { value: 'experience', label: 'Experience' },
  { value: 'accommodation', label: 'Accommodation' },
  { value: 'transport', label: 'Transport' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'activity', label: 'Activity' },
  { value: 'guide', label: 'Guide' },
  { value: 'event', label: 'Event' },
];

const MEDIA_TYPES = [
  { value: 'all', label: 'All Media', icon: ImageIcon },
  { value: 'image', label: 'Images', icon: ImageIcon },
  { value: 'video', label: 'Videos', icon: Video },
];

// ===============================
// HELPERS
// ===============================

const getExperienceImage = (experience) => {
  if (experience.coverMedia) return getImageUrl(experience.coverMedia);
  if (experience.coverImage) return getImageUrl(experience.coverImage);
  if (experience.galleryImages && experience.galleryImages.length > 0) {
    return getImageUrl(experience.galleryImages[0]);
  }
  if (experience.images && experience.images.length > 0) {
    return getImageUrl(experience.images[0]);
  }
  return null;
};

// ===============================
// MAIN COMPONENT
// ===============================

const Explore = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchRef = useRef(null);
  const [favorites, setFavorites] = useState([]);
  const [imageErrors, setImageErrors] = useState({});
  
  // Filter states
  const [selectedChip, setSelectedChip] = useState('all');
  const [listingTypeFilter, setListingTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [mediaTypeFilter, setMediaTypeFilter] = useState('all');
  const [priceRange, setPriceRange] = useState({ min: 0, max: 5000 });
  const [ratingFilter, setRatingFilter] = useState(0);
  const [sortBy, setSortBy] = useState('recommended');
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [isSticky, setIsSticky] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [searchTerm, setSearchTerm] = useState('');
  
  // ✅ NEW: Provider filter from URL
  const [providerFilter, setProviderFilter] = useState(null);

  // Scroll position hook
  const { scrollToTop, restoreScrollPosition } = useScrollPosition('explore-scroll');

  // ✅ Read provider from URL query params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const provider = params.get('provider');
    if (provider) {
      console.log('📌 Filtering by provider:', provider);
      setProviderFilter(provider);
    } else {
      setProviderFilter(null);
    }
  }, [location.search]);

  // ✅ Build initial params with provider filter
  const initialParams = useMemo(() => {
    const params = { limit: PAGINATION.DEFAULT_LIMIT };
    if (providerFilter) {
      params.provider = providerFilter;
    }
    return params;
  }, [providerFilter]);

  // ✅ Infinite scroll hook with provider filter
  const {
    items: experiences,
    loading,
    loadingMore,
    error,
    hasMore,
    showLoadMore,
    loadMore,
    refresh,
    sentinelRef,
    isEmpty,
  } = useInfiniteScroll({
    fetchFn: getListings,
    initialParams: initialParams,
    dataKey: 'listings',
    loadMoreAfterPages: PAGINATION.LOAD_MORE_PAGES_BEFORE_BUTTON,
  });

  // Load favorites from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('favoriteTours');
    if (saved) {
      setFavorites(JSON.parse(saved));
    }
  }, []);

  // Restore scroll position
  useEffect(() => {
    restoreScrollPosition();
  }, [restoreScrollPosition]);

  // Sticky search
  useEffect(() => {
    const handleScroll = () => {
      const searchElement = searchRef.current;
      if (searchElement) {
        const rect = searchElement.getBoundingClientRect();
        setIsSticky(rect.top <= 0);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // ================= HANDLERS (memoized) =================
  const toggleFavorite = useCallback((experienceId) => {
    setFavorites(prev => {
      const updated = prev.includes(experienceId)
        ? prev.filter(id => id !== experienceId)
        : [...prev, experienceId];
      localStorage.setItem('favoriteTours', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const handleNavigate = useCallback((id, coverType) => {
    navigate(`/listing/${id}`, { state: { coverMediaType: coverType } });
  }, [navigate]);

  const handleChipClick = useCallback((chipId) => {
    setSelectedChip(chipId);
    setListingTypeFilter(chipId === 'all' ? 'all' : chipId);
    setCategoryFilter('all');
  }, []);

  const resetFilters = useCallback(() => {
    setSearchTerm('');
    setSelectedChip('all');
    setListingTypeFilter('all');
    setCategoryFilter('all');
    setMediaTypeFilter('all');
    setPriceRange({ min: 0, max: 5000 });
    setRatingFilter(0);
    setSortBy('recommended');
    // ✅ Clear provider filter when resetting
    setProviderFilter(null);
    // ✅ Navigate to explore without provider param
    navigate('/explore', { replace: true });
    refresh();
  }, [navigate, refresh]);

  // ================= FILTERING LOGIC (memoized) =================
  const filteredItems = useMemo(() => {
    let result = [...experiences];

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter((exp) =>
        exp.title?.toLowerCase().includes(term) ||
        exp.description?.toLowerCase().includes(term) ||
        exp.location?.toLowerCase().includes(term) ||
        exp.listingType?.toLowerCase().includes(term) ||
        exp.category?.toLowerCase().includes(term)
      );
    }

    if (selectedChip !== 'all') {
      result = result.filter((exp) => exp.listingType === selectedChip);
    }

    if (listingTypeFilter !== 'all' && listingTypeFilter !== selectedChip) {
      result = result.filter((exp) => exp.listingType === listingTypeFilter);
    }

    if (categoryFilter !== 'all') {
      result = result.filter((exp) => exp.category === categoryFilter);
    }

    result = result.filter((exp) =>
      exp.price >= priceRange.min && exp.price <= priceRange.max
    );

    if (ratingFilter > 0) {
      result = result.filter((exp) => (exp.averageRating || 0) >= ratingFilter);
    }

    if (mediaTypeFilter === 'image') {
      result = result.filter((exp) => getCoverMediaType(exp) === 'image');
    } else if (mediaTypeFilter === 'video') {
      result = result.filter((exp) => getCoverMediaType(exp) === 'video');
    }

    switch (sortBy) {
      case 'recommended':
        result.sort((a, b) => {
          const scoreA = (a.views || 0) + (a.averageRating || 0) * 10 + (a.totalBookings || 0) * 5;
          const scoreB = (b.views || 0) + (b.averageRating || 0) * 10 + (b.totalBookings || 0) * 5;
          return scoreB - scoreA;
        });
        break;
      case 'newest':
        result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      case 'trending':
        result.sort((a, b) => (b.views || 0) - (a.views || 0));
        break;
      case 'popular':
        result.sort((a, b) => (b.totalBookings || 0) - (a.totalBookings || 0));
        break;
      case 'rating':
        result.sort((a, b) => (b.averageRating || 0) - (b.averageRating || 0));
        break;
      case 'price-low':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        result.sort((a, b) => b.price - a.price);
        break;
      default:
        break;
    }

    return result;
  }, [experiences, searchTerm, selectedChip, listingTypeFilter, categoryFilter, priceRange, ratingFilter, mediaTypeFilter, sortBy]);

  const currentDynamicCategories = useMemo(() => {
    const type = listingTypeFilter !== 'all' ? listingTypeFilter : selectedChip;
    if (type === 'all') return [];
    return DYNAMIC_CATEGORIES[type] || [];
  }, [listingTypeFilter, selectedChip]);

  // ✅ Show provider filter info in results header
  const filterDescription = useMemo(() => {
    const parts = [];
    if (searchTerm) parts.push(`Search: "${searchTerm}"`);
    if (selectedChip !== 'all') parts.push(`Category: ${CATEGORY_CHIPS.find(c => c.id === selectedChip)?.label}`);
    if (mediaTypeFilter !== 'all') parts.push(`Media: ${mediaTypeFilter === 'video' ? 'Videos' : 'Images'}`);
    if (providerFilter) parts.push(`Provider: ${providerFilter}`);
    return parts.join(' • ');
  }, [searchTerm, selectedChip, mediaTypeFilter, providerFilter]);

  // ================= LOADING =================
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        {/* Hero Section - Visible */}
        <div className="relative overflow-hidden bg-gradient-to-r from-[#0D9488] via-[#F59E0B] to-[#374151] py-6 sm:py-12 lg:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center text-white">
              <div className="inline-flex items-center gap-2 bg-white/20 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full mb-4 sm:mb-6 backdrop-blur-md">
                <Sparkles className="w-4 h-4" />
                <span className="text-xs sm:text-sm font-semibold">AI Powered Tourism</span>
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-5xl font-black mb-2 sm:mb-4">Explore Rwanda</h1>
              <p className="text-sm sm:text-base md:text-lg text-white/90 max-w-2xl mx-auto px-2">
                Discover unforgettable experiences, adventures and hidden gems with AI Tour Rwanda.
              </p>
            </div>
          </div>
        </div>

        {/* Filters Bar - Visible but disabled */}
        <div className="sticky top-0 z-20 bg-white/95 dark:bg-gray-950/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 py-2 sm:py-3">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse flex-shrink-0" />
              ))}
            </div>
          </div>
        </div>

        {/* Skeleton Grid */}
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6">
          <LoadingSkeleton count={8} type="grid" />
        </div>
      </div>
    );
  }

  // ================= RENDER =================
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* HERO / SEARCH SECTION */}
      <div 
        ref={searchRef}
        className={`relative overflow-hidden bg-gradient-to-r from-[#0D9488] via-[#F59E0B] to-[#374151] transition-all duration-300 ${
          isSticky ? 'pb-4 pt-4' : 'py-6 sm:py-12 lg:py-20'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {!isSticky && (
            <div className="text-center text-white mb-6 sm:mb-8">
              <div className="inline-flex items-center gap-2 bg-white/20 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full mb-4 sm:mb-6 backdrop-blur-md">
                <Sparkles className="w-4 h-4" />
                <span className="text-xs sm:text-sm font-semibold">AI Powered Tourism</span>
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-5xl font-black mb-2 sm:mb-4">Explore Rwanda</h1>
              <p className="text-sm sm:text-base md:text-lg text-white/90 max-w-2xl mx-auto px-2">
                Discover unforgettable experiences, adventures and hidden gems with AI Tour Rwanda.
              </p>
            </div>
          )}

          <div className={`max-w-3xl mx-auto ${isSticky ? 'w-full' : 'mt-4 sm:mt-6'}`}>
            <div className="relative bg-white rounded-2xl shadow-2xl">
              <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 sm:w-5 h-4 sm:h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search tours, hotels, experiences..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-9 sm:pl-12 pr-3 sm:pr-4 rounded-2xl outline-none text-gray-900 font-medium focus:ring-2 focus:ring-[#0D9488] transition ${
                  isSticky ? 'h-10 sm:h-12 text-sm' : 'h-12 sm:h-16 text-sm sm:text-base'
                }`}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                >
                  <X className="w-4 sm:w-5 h-4 sm:h-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* FILTERS BAR */}
      <div className={`sticky top-0 z-20 bg-white/95 dark:bg-gray-950/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 transition-shadow duration-300 ${
        isSticky ? 'shadow-md' : ''
      }`}>
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-2 sm:py-3">
          {/* Category Chips */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {CATEGORY_CHIPS.map((chip) => {
              const isActive = selectedChip === chip.id;
              const Icon = chip.icon;
              return (
                <button
                  key={chip.id}
                  onClick={() => handleChipClick(chip.id)}
                  className={`flex-shrink-0 flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                    isActive
                      ? 'bg-[#0D9488] text-white shadow-lg shadow-[#0D9488]/25'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  <Icon className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                  <span className="hidden xs:inline">{chip.label}</span>
                </button>
              );
            })}
          </div>

          {/* Filter Bar */}
          <div className="flex items-center gap-2 sm:gap-3 mt-1.5 sm:mt-2 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="lg:hidden flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-[#0D9488]/10 text-[#0D9488] font-medium text-xs sm:text-sm whitespace-nowrap"
            >
              <Filter className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
              <span>Filters</span>
            </button>

            <div className="hidden lg:flex items-center gap-2 xl:gap-3 flex-wrap">
              <select
                value={listingTypeFilter}
                onChange={(e) => {
                  setListingTypeFilter(e.target.value);
                  setCategoryFilter('all');
                }}
                className="h-8 xl:h-10 px-2 xl:px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs xl:text-sm focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none"
              >
                {LISTING_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>

              {currentDynamicCategories.length > 0 && (
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="h-8 xl:h-10 px-2 xl:px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs xl:text-sm focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none"
                >
                  <option value="all">All Categories</option>
                  {currentDynamicCategories.map((cat) => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              )}

              <select
                value={mediaTypeFilter}
                onChange={(e) => setMediaTypeFilter(e.target.value)}
                className="h-8 xl:h-10 px-2 xl:px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs xl:text-sm focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none"
              >
                {MEDIA_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>

              <div className="flex items-center gap-1 xl:gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={priceRange.min || ''}
                  onChange={(e) => setPriceRange({ ...priceRange, min: Number(e.target.value) || 0 })}
                  className="w-14 xl:w-20 h-8 xl:h-10 px-1.5 xl:px-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs xl:text-sm focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none"
                />
                <span className="text-gray-400 text-xs">-</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={priceRange.max || ''}
                  onChange={(e) => setPriceRange({ ...priceRange, max: Number(e.target.value) || 5000 })}
                  className="w-14 xl:w-20 h-8 xl:h-10 px-1.5 xl:px-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs xl:text-sm focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none"
                />
              </div>

              <select
                value={ratingFilter}
                onChange={(e) => setRatingFilter(Number(e.target.value))}
                className="h-8 xl:h-10 px-2 xl:px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs xl:text-sm focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none"
              >
                <option value={0}>All Ratings</option>
                <option value={4.5}>4.5+ ★</option>
                <option value={4}>4.0+ ★</option>
                <option value={3.5}>3.5+ ★</option>
                <option value={3}>3.0+ ★</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="h-8 xl:h-10 px-2 xl:px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs xl:text-sm focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>

              {(searchTerm || selectedChip !== 'all' || listingTypeFilter !== 'all' || categoryFilter !== 'all' || mediaTypeFilter !== 'all' || priceRange.min > 0 || priceRange.max < 5000 || ratingFilter > 0 || providerFilter) && (
                <button
                  onClick={resetFilters}
                  className="flex items-center gap-1 px-2 xl:px-3 py-1.5 xl:py-2 rounded-xl text-xs xl:text-sm text-[#0D9488] hover:bg-[#0D9488]/10 transition whitespace-nowrap"
                >
                  <RefreshCw className="w-3.5 xl:w-4 h-3.5 xl:h-4" />
                  <span className="hidden xl:inline">Reset</span>
                </button>
              )}
            </div>

            <div className="hidden lg:flex items-center gap-1 ml-auto bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 xl:p-2 rounded-lg transition ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-gray-900 text-[#0D9488] shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <Grid3x3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 xl:p-2 rounded-lg transition ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-gray-900 text-[#0D9488] shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE FILTERS PANEL */}
      {showMobileFilters && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={() => setShowMobileFilters(false)}>
          <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-900 rounded-t-3xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white dark:bg-gray-900 p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <h3 className="font-bold text-[#374151] dark:text-white">Filters</h3>
              <button onClick={() => setShowMobileFilters(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#374151] dark:text-white mb-1.5">Listing Type</label>
                <select
                  value={listingTypeFilter}
                  onChange={(e) => {
                    setListingTypeFilter(e.target.value);
                    setCategoryFilter('all');
                  }}
                  className="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none"
                >
                  {LISTING_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              {currentDynamicCategories.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-[#374151] dark:text-white mb-1.5">Category</label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none"
                  >
                    <option value="all">All Categories</option>
                    {currentDynamicCategories.map((cat) => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-[#374151] dark:text-white mb-1.5">Media Type</label>
                <select
                  value={mediaTypeFilter}
                  onChange={(e) => setMediaTypeFilter(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none"
                >
                  {MEDIA_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#374151] dark:text-white mb-1.5">Price Range</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    placeholder="Min"
                    value={priceRange.min || ''}
                    onChange={(e) => setPriceRange({ ...priceRange, min: Number(e.target.value) || 0 })}
                    className="flex-1 h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none"
                  />
                  <span className="text-gray-400">to</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={priceRange.max || ''}
                    onChange={(e) => setPriceRange({ ...priceRange, max: Number(e.target.value) || 5000 })}
                    className="flex-1 h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#374151] dark:text-white mb-1.5">Minimum Rating</label>
                <select
                  value={ratingFilter}
                  onChange={(e) => setRatingFilter(Number(e.target.value))}
                  className="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none"
                >
                  <option value={0}>All Ratings</option>
                  <option value={4.5}>4.5+ ★</option>
                  <option value={4}>4.0+ ★</option>
                  <option value={3.5}>3.5+ ★</option>
                  <option value={3}>3.0+ ★</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#374151] dark:text-white mb-1.5">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
                <button
                  onClick={resetFilters}
                  className="flex-1 h-12 rounded-xl border-2 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                >
                  Reset All
                </button>
                <button
                  onClick={() => setShowMobileFilters(false)}
                  className="flex-1 h-12 rounded-xl bg-gradient-to-r from-[#0D9488] to-[#F59E0B] text-white font-bold shadow-lg shadow-[#0D9488]/30 hover:scale-[1.02] transition"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RESULTS */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6">
        {/* Results Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 mb-4 sm:mb-6">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-[#374151] dark:text-white">
              {filteredItems.length === 0 ? 'No experiences found' : `Showing ${filteredItems.length} experiences`}
            </h2>
            {filteredItems.length > 0 && filterDescription && (
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                {filterDescription} • {filteredItems.length} results
              </p>
            )}
            {providerFilter && filteredItems.length > 0 && (
              <p className="text-xs text-[#0D9488] mt-1">
                🔍 Showing experiences from this provider
              </p>
            )}
          </div>

          <div className="flex lg:hidden items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-gray-900 text-[#0D9488] shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <Grid3x3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-gray-900 text-[#0D9488] shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Results Grid */}
        {filteredItems.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 sm:p-16 text-center shadow-lg border border-gray-100 dark:border-gray-800">
            <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-full bg-[#0D9488]/10 flex items-center justify-center mb-4">
              <Compass className="w-10 h-10 sm:w-12 sm:h-12 text-[#0D9488]" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#374151] dark:text-white mb-2">
              {providerFilter ? 'No Experiences from this Provider' : 'No Experiences Found'}
            </h2>
            <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mb-6">
              {providerFilter 
                ? 'This provider hasn\'t created any experiences yet. Check back later!'
                : searchTerm || selectedChip !== 'all' || listingTypeFilter !== 'all' || categoryFilter !== 'all' || mediaTypeFilter !== 'all' || priceRange.min > 0 || priceRange.max < 5000 || ratingFilter > 0
                  ? 'Try adjusting your search or filters'
                  : 'No experiences available at the moment. Check back soon!'}
            </p>
            {(searchTerm || selectedChip !== 'all' || listingTypeFilter !== 'all' || categoryFilter !== 'all' || mediaTypeFilter !== 'all' || priceRange.min > 0 || priceRange.max < 5000 || ratingFilter > 0 || providerFilter) && (
              <button
                onClick={resetFilters}
                className="px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-[#0D9488] to-[#F59E0B] text-white font-bold shadow-lg shadow-[#0D9488]/30 hover:scale-[1.02] transition flex items-center gap-2 mx-auto text-sm sm:text-base"
              >
                <RefreshCw className="w-4 h-4" />
                Reset Filters
              </button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            {filteredItems.map((item) => {
              const coverType = getCoverMediaType(item);
              const coverUrl = getCoverMedia(item);
              
              return (
                <MediaCard
                  key={item._id}
                  id={item._id}
                  title={item.title}
                  image={coverUrl}
                  location={item.location}
                  price={item.price}
                  duration={item.duration}
                  rating={item.averageRating || 0}
                  coverMediaType={coverType}
                  videoUrl={coverType === 'video' ? coverUrl : null}
                  onSelect={(id) => navigate(`/listing/${id}`, { state: { coverMediaType: coverType } })}
                />
              );
            })}
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {filteredItems.map((item) => {
              const coverType = getCoverMediaType(item);
              const coverUrl = getCoverMedia(item);
              
              return (
                <MediaCard
                  key={item._id}
                  id={item._id}
                  title={item.title}
                  image={coverUrl}
                  location={item.location}
                  price={item.price}
                  duration={item.duration}
                  rating={item.averageRating || 0}
                  coverMediaType={coverType}
                  videoUrl={coverType === 'video' ? coverUrl : null}
                  onSelect={(id) => navigate(`/listing/${id}`, { state: { coverMediaType: coverType } })}
                />
              );
            })}
          </div>
        )}

        {/* Infinite Scroll Sentinel */}
        {!isEmpty && hasMore && (
          <div ref={sentinelRef} className="h-10 flex items-center justify-center mt-4">
            {loadingMore && (
              <div className="flex items-center gap-3 text-gray-500">
                <div className="w-5 h-5 border-2 border-[#0D9488] border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">Loading more...</span>
              </div>
            )}
          </div>
        )}

        {/* Load More Button */}
        {showLoadMore && hasMore && (
          <div className="flex justify-center mt-6">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="px-6 py-3 rounded-xl bg-[#0D9488] text-white font-bold hover:bg-[#0D9488]/80 transition disabled:opacity-50 flex items-center gap-2"
            >
              {loadingMore ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Loading...
                </>
              ) : (
                'Load More Experiences'
              )}
            </button>
          </div>
        )}

        {/* End of results */}
        {!hasMore && filteredItems.length > 0 && (
          <div className="text-center py-6 text-gray-400 text-sm">
            You've reached the end of the list 🎉
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-8">
            <p className="text-red-500 mb-4">{error}</p>
            <button
              onClick={refresh}
              className="px-6 py-2 rounded-xl bg-[#0D9488] text-white font-bold hover:bg-[#0D9488]/80 transition"
            >
              Try Again
            </button>
          </div>
        )}
      </div>

      {/* Back to Top Button */}
      <BackToTop />
    </div>
  );
};

export default Explore;