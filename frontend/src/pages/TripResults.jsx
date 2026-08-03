// src/pages/TripResults.jsx
// ✅ UPDATED - Full cover media (image + video) support

import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Filter, 
  SortAsc, 
  Clock, 
  Wallet, 
  Star, 
  Wifi, 
  Coffee, 
  Car, 
  Hotel, 
  MapPin,
  Sparkles,
  Loader2,
  TrendingUp,
  ChevronDown,
  Grid3x3,
  List,
  X,
  Check,
  Eye,
  Play,
  Video,
} from 'lucide-react';
import Card, { CardImage, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { getTours } from '../services/tourService';

// ===============================
// AI TOUR COLORS
// ===============================
// Teal  : #0D9488
// Gold  : #F59E0B
// Slate : #374151
// White : #FFFFFF
// ===============================

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const TripResults = () => {
  const location = useLocation();
  const [sortBy, setSortBy] = useState('recommended');
  const [view, setView] = useState('grid');
  const [loading, setLoading] = useState(true);
  const [tours, setTours] = useState([]);
  const [filteredTours, setFilteredTours] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    minPrice: 0,
    maxPrice: 5000,
    location: '',
  });

  // Get search query from URL
  const searchParams = new URLSearchParams(location.search);
  const searchQuery = searchParams.get('search') || '';

  useEffect(() => {
    fetchTours();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [tours, sortBy, filters, searchQuery]);

  const fetchTours = async () => {
    try {
      setLoading(true);
      const data = await getTours();
      console.log('✅ Tours from backend:', data);
      
      if (data && data.tours) {
        setTours(data.tours);
      } else if (data && Array.isArray(data)) {
        setTours(data);
      } else {
        setTours([]);
      }
    } catch (error) {
      console.error('❌ Error fetching tours:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let result = [...tours];

    // Search filter
    if (searchQuery) {
      result = result.filter(tour =>
        tour.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tour.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tour.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Price filter
    result = result.filter(tour =>
      tour.price >= filters.minPrice &&
      tour.price <= filters.maxPrice
    );

    // Location filter
    if (filters.location) {
      result = result.filter(tour =>
        tour.location?.toLowerCase().includes(filters.location.toLowerCase())
      );
    }

    // Sort
    switch (sortBy) {
      case 'recommended':
        result.sort((a, b) => {
          const scoreA = (a.views || 0) + (a.averageRating || 0) * 10;
          const scoreB = (b.views || 0) + (b.averageRating || 0) * 10;
          return scoreB - scoreA;
        });
        break;
      case 'price-low':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        result.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));
        break;
      case 'popular':
        result.sort((a, b) => (b.views || 0) - (a.views || 0));
        break;
      case 'newest':
        result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      default:
        break;
    }

    setFilteredTours(result);
  };

  const getImageUrl = (image) => {
    if (!image) return null;
    if (image.startsWith('http')) return image;
    if (image.startsWith('/')) return image;
    return `${API_URL}/uploads/${image}`;
  };

  // ✅ Check if a string is a video file
  const isVideoFile = (url) => {
    if (!url) return false;
    const videoExtensions = ['.mp4', '.mov', '.webm', '.avi', '.mkv', '.m4v', '.3gp', '.mpeg', '.mpg'];
    return videoExtensions.some(ext => url.toLowerCase().endsWith(ext));
  };

  // ✅ Get cover media type (image or video)
  const getCoverMediaType = (tour) => {
    if (!tour) return 'image';
    
    // Check explicit coverMediaType
    if (tour.coverMediaType === 'video') return 'video';
    if (tour.coverMediaType === 'image') return 'image';
    
    // Check if coverMedia is a video file
    if (tour.coverMedia && isVideoFile(tour.coverMedia)) return 'video';
    
    // Check if videos array exists
    if (tour.videos && tour.videos.length > 0) return 'video';
    
    // Check galleryImages for videos
    if (tour.galleryImages && tour.galleryImages.length > 0) {
      for (const img of tour.galleryImages) {
        if (isVideoFile(img)) return 'video';
      }
    }
    
    return 'image';
  };

  // ✅ Get cover video URL
  const getCoverVideo = (tour) => {
    if (!tour) return null;
    
    if (tour.coverMediaType === 'video' && tour.coverMedia) {
      return getImageUrl(tour.coverMedia);
    }
    if (tour.coverMedia && isVideoFile(tour.coverMedia)) {
      return getImageUrl(tour.coverMedia);
    }
    if (tour.videos && tour.videos.length > 0) {
      return getImageUrl(tour.videos[0]);
    }
    if (tour.galleryImages && tour.galleryImages.length > 0) {
      for (const img of tour.galleryImages) {
        if (isVideoFile(img)) {
          return getImageUrl(img);
        }
      }
    }
    return null;
  };

  // ✅ Get tour media (supports both image and video)
  const getTourMedia = (tour) => {
    if (!tour) {
      return {
        url: 'https://images.unsplash.com/photo-1533106418989-88406c7cc8ca?w=500',
        isVideo: false,
        videoUrl: null,
        poster: 'https://images.unsplash.com/photo-1533106418989-88406c7cc8ca?w=500',
        mediaType: 'image'
      };
    }

    const coverType = getCoverMediaType(tour);
    const videoUrl = getCoverVideo(tour);
    
    // Get poster image
    let poster = null;
    if (tour.coverImage) {
      poster = getImageUrl(tour.coverImage);
    } else if (tour.galleryImages && tour.galleryImages.length > 0) {
      poster = getImageUrl(tour.galleryImages[0]);
    } else if (tour.images && tour.images.length > 0) {
      poster = getImageUrl(tour.images[0]);
    } else if (tour.image) {
      poster = getImageUrl(tour.image);
    }
    
    const defaultImage = 'https://images.unsplash.com/photo-1533106418989-88406c7cc8ca?w=500';
    
    // If it's a video, return video data
    if (coverType === 'video' && videoUrl) {
      return {
        url: videoUrl,
        isVideo: true,
        videoUrl: videoUrl,
        poster: poster || defaultImage,
        mediaType: 'video'
      };
    }
    
    // Otherwise return image
    let imageUrl = defaultImage;
    if (tour.coverImage) {
      imageUrl = getImageUrl(tour.coverImage) || defaultImage;
    } else if (tour.galleryImages && tour.galleryImages.length > 0) {
      imageUrl = getImageUrl(tour.galleryImages[0]) || defaultImage;
    } else if (tour.images && tour.images.length > 0) {
      imageUrl = getImageUrl(tour.images[0]) || defaultImage;
    } else if (tour.image) {
      imageUrl = getImageUrl(tour.image) || defaultImage;
    }
    
    return {
      url: imageUrl,
      isVideo: false,
      videoUrl: null,
      poster: imageUrl,
      mediaType: 'image'
    };
  };

  const getTourImage = (tour) => {
    const media = getTourMedia(tour);
    return media.url;
  };

  const getIncludes = (tour) => {
    const items = [];
    if (tour.included) {
      const includedItems = tour.included.split(',').map(s => s.trim()).filter(Boolean);
      items.push(...includedItems);
    }
    if (items.length === 0) {
      items.push('Tour Guide', 'Transport', 'Meals');
    }
    return items.slice(0, 4);
  };

  const getRatingDisplay = (tour) => {
    const rating = tour.averageRating || 0;
    return rating > 0 ? rating.toFixed(1) : 'New';
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-[#0D9488]/20" />
          <div className="absolute inset-0 rounded-full border-4 border-[#0D9488] border-t-transparent animate-spin" />
        </div>
        <p className="mt-4 text-gray-500 dark:text-gray-400">Loading trips...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in px-4 py-6 max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0D9488] to-[#F59E0B] flex items-center justify-center shadow-lg">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-[#374151] dark:text-white">
                Trip Results
              </h1>
              <p className="text-gray-500 dark:text-gray-400">
                {searchQuery ? `Results for "${searchQuery}"` : `Found ${filteredTours.length} trips`}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Sparkles className="w-4 h-4 text-[#0D9488]" />
          <span>{filteredTours.length} tours available</span>
        </div>
      </div>

      {/* FILTERS AND SORT */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="border-[#0D9488] text-[#0D9488] hover:bg-[#0D9488]/10"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
            {showFilters ? <ChevronDown className="w-4 h-4 ml-1 rotate-180" /> : <ChevronDown className="w-4 h-4 ml-1" />}
          </Button>
          
          <div className="flex border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <button
              onClick={() => setView('grid')}
              className={`px-3 py-2 transition-all duration-300 ${
                view === 'grid' 
                  ? 'bg-[#0D9488] text-white' 
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <Grid3x3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView('list')}
              className={`px-3 py-2 transition-all duration-300 ${
                view === 'list' 
                  ? 'bg-[#0D9488] text-white' 
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <SortAsc className="w-4 h-4 text-gray-400" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition"
          >
            <option value="recommended">Recommended</option>
            <option value="newest">Newest</option>
            <option value="popular">Most Popular</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
            <option value="rating">Top Rated</option>
          </select>
        </div>
      </div>

      {/* FILTERS PANEL */}
      {showFilters && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6 border border-gray-100 dark:border-gray-800">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Min Price
              </label>
              <input
                type="number"
                min="0"
                value={filters.minPrice}
                onChange={(e) => setFilters({ ...filters, minPrice: Number(e.target.value) })}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Max Price
              </label>
              <input
                type="number"
                min="0"
                value={filters.maxPrice}
                onChange={(e) => setFilters({ ...filters, maxPrice: Number(e.target.value) })}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Location
              </label>
              <input
                type="text"
                placeholder="Search location..."
                value={filters.location}
                onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button
              onClick={() => setFilters({ minPrice: 0, maxPrice: 5000, location: '' })}
              className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              <X className="w-4 h-4 mr-2" />
              Clear Filters
            </Button>
          </div>
        </div>
      )}

      {/* RESULTS */}
      {filteredTours.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-16 text-center border border-gray-100 dark:border-gray-800 shadow-sm">
          <div className="w-20 h-20 rounded-full bg-[#0D9488]/10 flex items-center justify-center mx-auto mb-4">
            <MapPin className="w-10 h-10 text-[#0D9488]" />
          </div>
          <h2 className="text-2xl font-bold text-[#374151] dark:text-white mb-2">
            No Tours Found
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            {searchQuery ? `No results found for "${searchQuery}"` : 'Try adjusting your filters or search terms'}
          </p>
        </div>
      ) : (
        <div className={`grid ${view === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'} gap-6`}>
          {filteredTours.map((tour) => {
            const includes = getIncludes(tour);
            const media = getTourMedia(tour);
            const ratingDisplay = getRatingDisplay(tour);

            return (
              <Link to={`/tour/${tour._id}`} key={tour._id}>
                <Card hover className="h-full border border-gray-100 dark:border-gray-800 rounded-3xl overflow-hidden">
                  <div className="relative">
                    {/* ✅ Use CardImage with video support */}
                    <CardImage 
                      src={media.isVideo ? media.videoUrl : media.url}
                      alt={tour.title}
                      height="h-56"
                      seed={tour._id}
                      videoPoster={media.poster}
                    />
                    
                    {/* Video indicator */}
                    {media.isVideo && (
                      <div className="absolute bottom-4 left-4 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Play className="w-3 h-3" />
                        Video
                      </div>
                    )}
                    
                    {/* Status Badge */}
                    {tour.status === 'pending' && (
                      <div className="absolute top-4 left-4 bg-[#F59E0B] text-white px-3 py-1 rounded-full text-xs font-bold">
                        Pending
                      </div>
                    )}
                    
                    {/* Rating Badge */}
                    <div className="absolute top-4 right-4 flex items-center gap-1 bg-white/90 dark:bg-gray-900/90 backdrop-blur px-2 py-1 rounded-lg shadow-lg">
                      <Star className="w-4 h-4 text-[#F59E0B] fill-[#F59E0B]" />
                      <span className="text-sm font-bold text-[#374151] dark:text-white">
                        {ratingDisplay}
                      </span>
                    </div>
                    
                    {/* Views Badge */}
                    {tour.views > 0 && (
                      <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur px-2 py-1 rounded-lg text-white text-xs flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {tour.views}
                      </div>
                    )}
                  </div>
                  <CardContent className="p-5">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-bold text-[#374151] dark:text-white line-clamp-1">
                        {tour.title}
                      </h3>
                      {media.isVideo && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-[#0D9488] bg-[#0D9488]/10 px-1.5 py-0.5 rounded">
                          <Play className="w-3 h-3" />
                          Video
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm mb-3">
                      <MapPin className="w-4 h-4 mr-1 text-[#0D9488]" />
                      <span>{tour.location}</span>
                    </div>

                    <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm mb-3">
                      <Clock className="w-4 h-4 mr-1 text-[#0D9488]" />
                      <span>{tour.duration || 'N/A'}</span>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {includes.map((item, idx) => (
                        <span key={idx} className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-600 dark:text-gray-300">
                          {item.includes('Hotel') && <Hotel className="w-3 h-3 inline mr-1 text-[#0D9488]" />}
                          {item.includes('Breakfast') && <Coffee className="w-3 h-3 inline mr-1 text-[#F59E0B]" />}
                          {item.includes('Transport') && <Car className="w-3 h-3 inline mr-1 text-[#0D9488]" />}
                          {item.includes('Tour') && <MapPin className="w-3 h-3 inline mr-1 text-[#0D9488]" />}
                          {item}
                        </span>
                      ))}
                    </div>

                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-2xl font-bold text-[#0D9488]">${tour.price}</div>
                        <div className="text-xs text-gray-400">per person</div>
                      </div>
                      <Button 
                        variant="primary" 
                        size="sm"
                        className="bg-gradient-to-r from-[#0D9488] to-[#F59E0B] text-white shadow-lg shadow-[#0D9488]/30 hover:scale-[1.02] transition"
                      >
                        View Deal
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TripResults;