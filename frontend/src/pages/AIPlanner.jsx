// frontend/src/pages/AIPlanner.jsx
// ✅ COMPLETE FIXED - Full session management with conversation memory
// ✅ Updated "Tour" references to "Experience" where user-facing
// ✅ ADDED: Real listing recommendations in results
// ✅ ADDED: Experience cards with "View Details" links
// ✅ ADDED: Session persistence for conversation continuity
// ✅ ✅ PHASE 1: User ID integration for personalization
// ✅ ✅ PHASE 1: Personalized recommendations display
// ✅ ✅ PHASE 1: User preference display with match reasons
// ✅ ✅ PHASE 2: Dynamic destinations from MongoDB (no hardcoded list)

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bot,
  MapPin,
  Users,
  Sparkles,
  Send,
  Wallet,
  Star,
  Clock3,
  Mountain,
  Camera,
  Music4,
  HeartHandshake,
  Heart,
  Trees,
  ArrowRight,
  CheckCircle2,
  Globe2,
  TrendingUp,
  Sunset,
  Utensils,
  BedDouble,
  ThumbsUp,
  Loader2,
  Calendar,
  DollarSign,
  Plane,
  Clock,
  Award,
  Shield,
  Info,
  Bookmark,
  BookmarkCheck,
  Download,
  Share2,
  MessageCircle,
  Eye,
  User,
  Target,
  BadgeCheck,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import { generateTripPlan, getAIRecommendations, getAIChat, getDestinations } from '../services/aiService';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

// ===============================
// AI TOUR COLORS (Brand Name - Keep as is)
// ===============================
// Teal  : #0D9488
// Gold  : #F59E0B
// Slate : #374151
// White : #FFFFFF
// ===============================

// ✅ Experience Card Component with personalization
const ExperienceCard = ({ experience, showMatchReason = false }) => {
  if (!experience) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-300">
      {/* Image */}
      {experience.coverImage && (
        <div className="relative h-32 sm:h-40 overflow-hidden">
          <img
            src={experience.coverImage}
            alt={experience.title}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              e.target.src = 'https://via.placeholder.com/400x200?text=No+Image';
            }}
          />
          {/* Rating badge */}
          {experience.rating > 0 && (
            <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-white px-2 py-0.5 rounded-full text-xs flex items-center gap-1">
              <Star className="w-3 h-3 text-[#F59E0B] fill-[#F59E0B]" />
              {experience.rating}
            </div>
          )}
          {/* ✅ Personalized match badge */}
          {showMatchReason && experience.personalizationScore > 70 && (
            <div className="absolute bottom-2 left-2 bg-[#0D9488]/90 backdrop-blur-sm text-white px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1">
              <Target className="w-2.5 h-2.5" />
              {experience.personalizationScore}% Match
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="p-3 sm:p-4">
        <h4 className="font-bold text-[#374151] dark:text-white text-sm sm:text-base line-clamp-1">
          {experience.title}
        </h4>
        
        <div className="flex items-center gap-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#0D9488] flex-shrink-0" />
          <span className="truncate">{experience.location}</span>
        </div>

        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#0D9488] text-sm sm:text-base">
              ${experience.price} {experience.currency || 'USD'}
            </span>
            {experience.duration && (
              <span className="text-xs text-gray-400">• {experience.duration}</span>
            )}
          </div>
          
          <Link
            to={`/listing/${experience.id}`}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#0D9488] text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-[#0D9488]/80 transition touch-manipulation min-h-[32px]"
          >
            <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            View Details
          </Link>
        </div>

        {/* ✅ Match reasons */}
        {showMatchReason && experience.matchReasons && experience.matchReasons.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
            <p className="text-[10px] text-gray-400 flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5 text-[#F59E0B]" />
              {experience.matchReasons.slice(0, 2).join(' • ')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// ✅ Experience List Component with personalization
const ExperienceList = ({ experiences, title = "Recommended Experiences", showMatchReason = false }) => {
  if (!experiences || experiences.length === 0) return null;

  return (
    <div className="mt-4 space-y-3">
      <p className="text-sm font-semibold text-[#0D9488] flex items-center gap-1.5">
        <Sparkles className="w-4 h-4" />
        {title}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {experiences.map((exp, index) => (
          <ExperienceCard key={exp.id || index} experience={exp} showMatchReason={showMatchReason} />
        ))}
      </div>
    </div>
  );
};

// ✅ Personalized Profile Banner
const PersonalizedBanner = ({ user, preferences }) => {
  if (!user || !preferences) return null;

  const travelStyleLabels = {
    adventure: 'Adventure Seeker',
    cultural: 'Culture Enthusiast',
    relaxation: 'Relaxation Lover',
    luxury: 'Luxury Traveler',
    budget: 'Budget Explorer',
    balanced: 'Balanced Traveler',
    family: 'Family Traveler',
    romantic: 'Romantic Traveler'
  };

  return (
    <div className="bg-gradient-to-r from-[#0D9488]/10 to-[#F59E0B]/10 rounded-2xl p-4 border border-[#0D9488]/20 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-[#0D9488]/20 flex items-center justify-center">
          <User className="w-5 h-5 text-[#0D9488]" />
        </div>
        <div>
          <p className="font-semibold text-[#374151] dark:text-white text-sm">
            {user.name || 'Traveler'}
          </p>
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
            <span className="flex items-center gap-0.5">
              <BadgeCheck className="w-3 h-3 text-[#0D9488]" />
              {travelStyleLabels[preferences.travelStyle] || 'Traveler'}
            </span>
            {preferences.interests?.length > 0 && (
              <span className="flex items-center gap-0.5">
                <span className="text-gray-300">•</span>
                {preferences.interests.slice(0, 2).join(', ')}
                {preferences.interests.length > 2 && ` +${preferences.interests.length - 2}`}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs">
        <span className="px-2 py-0.5 rounded-full bg-[#0D9488]/10 text-[#0D9488]">
          {preferences.travelStyle || 'Balanced'}
        </span>
        <span className="px-2 py-0.5 rounded-full bg-[#F59E0B]/10 text-[#F59E0B]">
          ${preferences.budget || 'Mid-range'}
        </span>
      </div>
    </div>
  );
};

const AIPlanner = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [tripPlan, setTripPlan] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [savedTrips, setSavedTrips] = useState([]);
  const [isSaved, setIsSaved] = useState(false);
  const [activeDay, setActiveDay] = useState(0);
  const [sessionId, setSessionId] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [isPersonalized, setIsPersonalized] = useState(false);
  const [userPreferences, setUserPreferences] = useState(null);

  // ✅ NEW: Dynamic destinations state
  const [destinations, setDestinations] = useState([]);
  const [destinationsLoading, setDestinationsLoading] = useState(false);
  const [destinationsError, setDestinationsError] = useState(null);

  const aiMessages = [
    'Analyzing your travel style...',
    'Discovering hidden gems in Rwanda...',
    'Optimizing your itinerary...',
    'Creating your personalized experience...',
  ];

  const [formData, setFormData] = useState({
    destination: '',
    destinationId: null,
    startDate: '',
    endDate: '',
    travelers: 2,
    budget: 800,
    interests: [],
    mood: '',
    accommodation: 'mid',
    travelStyle: 'balanced',
    language: 'English',
  });

  const moods = [
    {
      name: 'Adventure',
      icon: Mountain,
      color: 'from-[#0D9488] to-[#0f766e]',
      description: 'Thrilling experiences & wildlife',
    },
    {
      name: 'Relaxation',
      icon: HeartHandshake,
      color: 'from-[#0D9488] to-[#0f766e]',
      description: 'Peaceful nature escapes',
    },
    {
      name: 'Luxury',
      icon: Star,
      color: 'from-[#F59E0B] to-[#d97706]',
      description: 'Premium travel experiences',
    },
    {
      name: 'Romantic',
      icon: Heart,
      color: 'from-[#0D9488] to-[#0f766e]',
      description: 'Couple-friendly experiences',
    },
    {
      name: 'Nature',
      icon: Trees,
      color: 'from-[#0D9488] to-[#0f766e]',
      description: 'Forests, lakes & mountains',
    },
    {
      name: 'Cultural',
      icon: Globe2,
      color: 'from-[#0D9488] to-[#0f766e]',
      description: 'History & local traditions',
    },
  ];

  const interests = [
    { name: 'Wildlife', icon: Trees },
    { name: 'Hiking', icon: Mountain },
    { name: 'Photography', icon: Camera },
    { name: 'Local Food', icon: Utensils },
    { name: 'History', icon: Clock3 },
    { name: 'Beach', icon: Sunset },
    { name: 'Nightlife', icon: Music4 },
    { name: 'Shopping', icon: Wallet },
  ];

  const travelStyles = [
    { value: 'balanced', label: 'Balanced' },
    { value: 'adventure', label: 'Adventure' },
    { value: 'cultural', label: 'Cultural' },
    { value: 'relaxation', label: 'Relaxation' },
    { value: 'luxury', label: 'Luxury' },
    { value: 'budget', label: 'Budget' },
  ];

  // ✅ Load destinations from API
  const loadDestinations = useCallback(async () => {
    try {
      setDestinationsLoading(true);
      setDestinationsError(null);
      
      console.log('📤 [AIPlanner] Loading destinations from API...');
      
      const response = await getDestinations();
      
      console.log('📥 [AIPlanner] Destinations response:', response);
      
      if (response.success && response.destinations.length > 0) {
        setDestinations(response.destinations);
        console.log(`✅ [AIPlanner] Loaded ${response.destinations.length} destinations`);
        
        // ✅ If there's a previously selected destination, try to find it
        if (formData.destination) {
          const found = response.destinations.find(d => d.value === formData.destination);
          if (found) {
            setFormData(prev => ({
              ...prev,
              destination: found.value,
              destinationId: found.id
            }));
          }
        }
      } else {
        console.warn('⚠️ [AIPlanner] No destinations found');
        setDestinationsError('No destinations available. Please check back later.');
      }
    } catch (error) {
      console.error('❌ [AIPlanner] Error loading destinations:', error);
      setDestinationsError('Failed to load destinations. Please refresh the page.');
      toast.error('Failed to load destinations');
    } finally {
      setDestinationsLoading(false);
    }
  }, []);

  // ✅ Restore sessionId from localStorage
  useEffect(() => {
    const savedSessionId = localStorage.getItem('aiPlannerSessionId');
    if (savedSessionId) {
      setSessionId(savedSessionId);
    }
  }, []);

  // ✅ Save sessionId to localStorage
  useEffect(() => {
    if (sessionId) {
      localStorage.setItem('aiPlannerSessionId', sessionId);
    }
  }, [sessionId]);

  // ✅ Load user preferences from localStorage
  useEffect(() => {
    const savedPrefs = localStorage.getItem('userPreferences');
    if (savedPrefs && user) {
      try {
        const prefs = JSON.parse(savedPrefs);
        setUserPreferences(prefs);
        setIsPersonalized(true);
      } catch (e) {
        console.error('Error loading user preferences:', e);
      }
    }
  }, [user]);

  // ✅ Load destinations on mount
  useEffect(() => {
    loadDestinations();
  }, [loadDestinations]);

  const calculateDays = useCallback(() => {
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return Math.max(diffDays + 1, 1);
    }
    return 3;
  }, [formData.startDate, formData.endDate]);

  // ✅ Handle destination change with ID
  const handleDestinationChange = useCallback((e) => {
    const selectedValue = e.target.value;
    const selected = destinations.find(d => d.value === selectedValue);
    
    setFormData(prev => ({
      ...prev,
      destination: selected?.value || '',
      destinationId: selected?.id || null
    }));
  }, [destinations]);

  // ✅ Generate AI Trip with recommendations and personalization
  const generateAITrip = async () => {
    if (!formData.destination) {
      toast.error('Please select a destination');
      return;
    }
    if (!formData.mood) {
      toast.error('Please select your travel mood');
      return;
    }

    setLoading(true);
    setLoadingProgress(0);
    setLoadingMessage(aiMessages[0]);

    const days = calculateDays();
    const requestData = {
      destination: formData.destination,
      destinationId: formData.destinationId, // ✅ Include destinationId
      mood: formData.mood,
      budget: formData.budget,
      travelers: formData.travelers,
      interests: formData.interests,
      travelStyle: formData.travelStyle,
      accommodation: formData.accommodation,
      days: days,
      startDate: formData.startDate,
      language: formData.language,
      sessionId: sessionId,
      userId: user?._id || null, // ✅ Send user ID for personalization
    };

    try {
      // Progress animation
      for (let i = 0; i < aiMessages.length; i++) {
        setLoadingMessage(aiMessages[i]);
        await new Promise((resolve) => setTimeout(resolve, 800));
        setLoadingProgress(((i + 1) / aiMessages.length) * 100);
      }

      const response = await generateTripPlan(requestData);
      console.log('✅ Trip Plan Response:', response);

      if (response.success && response.plan) {
        if (response.sessionId) {
          setSessionId(response.sessionId);
        }

        // ✅ Check if response is personalized
        if (response.personalized) {
          setIsPersonalized(true);
          toast.success('🎯 Personalized plan created just for you!');
        }

        setTripPlan({
          ...response.plan,
          raw: response.plan,
          destination: formData.destination,
          days: days,
          budget: formData.budget,
          travelers: formData.travelers,
        });

        // ✅ Fetch recommendations with user context
        await fetchRecommendations(formData.destination, formData.interests);

        setIsSaved(false);
        setStep(4);
        setActiveDay(0);
        toast.success('✨ Your personalized trip plan is ready!');
      } else {
        toast.error(response.message || 'Failed to generate trip plan');
      }
    } catch (error) {
      console.error('❌ AI Generation Error:', error);
      toast.error(error.response?.data?.message || 'Failed to generate trip plan');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Fetch recommendations with user context
  const fetchRecommendations = async (destination, interests) => {
    try {
      const query = `${destination} ${interests.join(' ')} experiences in Rwanda`;
      const response = await getAIRecommendations({
        query: query,
        limit: 6,
        location: destination,
        sessionId: sessionId,
        userId: user?._id || null, // ✅ Send user ID for personalization
      });

      if (response.success && response.experiences) {
        setRecommendations(response.experiences);
        
        // ✅ Save user preferences if response includes them
        if (response.userPreferences) {
          setUserPreferences(response.userPreferences);
          localStorage.setItem('userPreferences', JSON.stringify(response.userPreferences));
        }
      }
    } catch (error) {
      console.error('❌ Error fetching recommendations:', error);
    }
  };

  // ✅ Save Trip
  const handleSaveTrip = async () => {
    if (!tripPlan) return;

    try {
      const savedTrip = {
        id: Date.now(),
        destination: formData.destination,
        destinationId: formData.destinationId,
        date: new Date().toISOString(),
        plan: tripPlan,
        recommendations: recommendations,
        travelers: formData.travelers,
        budget: formData.budget,
        mood: formData.mood,
        sessionId: sessionId,
        userId: user?._id || null,
        personalized: isPersonalized,
      };

      const updatedTrips = [...savedTrips, savedTrip];
      setSavedTrips(updatedTrips);
      localStorage.setItem('savedTrips', JSON.stringify(updatedTrips));
      setIsSaved(true);
      toast.success('✅ Trip saved successfully!');
    } catch (error) {
      console.error('❌ Save trip error:', error);
      toast.error('Failed to save trip');
    }
  };

  // ✅ Send chat message with context
  const sendChatMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: chatInput.trim(),
      timestamp: new Date().toISOString(),
    };

    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setChatLoading(true);

    try {
      const response = await getAIChat({
        message: chatInput.trim(),
        sessionId: sessionId,
        context: 'planner',
        history: chatMessages.map(m => ({
          role: m.role,
          content: m.content,
        })),
        userId: user?._id || null, // ✅ Send user ID for personalization
      });

      if (response.sessionId) {
        setSessionId(response.sessionId);
      }

      const aiMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: response.reply || response.message || "I couldn't generate a response.",
        timestamp: new Date().toISOString(),
      };

      setChatMessages(prev => [...prev, aiMessage]);

    } catch (error) {
      console.error('❌ Chat error:', error);
      toast.error('Failed to send message');
    } finally {
      setChatLoading(false);
    }
  };

  // ✅ Format date
  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  // ✅ Load saved trips from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('savedTrips');
    if (stored) {
      try {
        setSavedTrips(JSON.parse(stored));
      } catch (e) {
        console.error('Error loading saved trips:', e);
      }
    }
  }, []);

  // ✅ Get destination emoji (fallback for display)
  const getDestinationEmoji = (destination) => {
    const found = destinations.find(d => d.value === destination);
    return found?.emoji || '📍';
  };

  // ✅ Retry loading destinations
  const handleRetryDestinations = () => {
    loadDestinations();
  };

  // ✅ Render day itinerary
  const renderDayItinerary = (day) => {
    if (!tripPlan?.itinerary) return null;
    const dayData = tripPlan.itinerary[day];
    if (!dayData) return null;

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-full bg-[#0D9488]/10 text-[#0D9488] flex items-center justify-center font-bold">
            {day + 1}
          </span>
          <h4 className="text-xl font-bold text-[#374151] dark:text-white">
            {dayData.title || `Day ${day + 1}`}
          </h4>
        </div>

        <div className="space-y-3 pl-14">
          {dayData.activities?.map((activity, idx) => (
            <div key={idx} className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-[#0D9488] mt-2" />
              <div>
                <p className="font-medium text-[#374151] dark:text-white">
                  {activity.time && (
                    <span className="text-sm text-gray-400 mr-2">{activity.time}</span>
                  )}
                  {activity.name || activity}
                </p>
                {activity.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {activity.description}
                  </p>
                )}
                {activity.cost && (
                  <p className="text-xs text-[#0D9488] font-medium">${activity.cost}</p>
                )}
                {/* ✅ Show personalized match score */}
                {activity.matchScore > 70 && (
                  <span className="text-[10px] text-[#0D9488] flex items-center gap-0.5">
                    <Target className="w-2.5 h-2.5" />
                    {activity.matchScore}% match
                  </span>
                )}
              </div>
            </div>
          ))}

          {dayData.meals && (
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                🍽️ {dayData.meals.breakfast} • {dayData.meals.lunch} • {dayData.meals.dinner}
              </p>
            </div>
          )}

          {dayData.accommodation && (
            <div className="mt-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                🏨 {typeof dayData.accommodation === 'string' 
                  ? dayData.accommodation 
                  : dayData.accommodation.name}
                {dayData.accommodation?.cost && ` ($${dayData.accommodation.cost})`}
              </p>
            </div>
          )}

          {dayData.transport && (
            <div className="mt-1">
              <p className="text-sm text-gray-400">🚗 {dayData.transport}</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ✅ Render results step with personalization
  const renderResults = () => {
    if (!tripPlan) return null;

    const daysCount = tripPlan.itinerary?.length || tripPlan.days || calculateDays();

    return (
      <div className="space-y-8">
        {/* Result Header */}
        <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-r from-[#0D9488] to-[#F59E0B] p-8 text-white">
          <div className="absolute inset-0 bg-black/10" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-3xl">{getDestinationEmoji(tripPlan.destination)}</span>
              <h2 className="text-3xl font-black">{tripPlan.destination}</h2>
            </div>
            <p className="text-white/80 text-lg">
              Your personalized {daysCount}-day itinerary
            </p>
            <div className="flex flex-wrap gap-4 mt-4 text-sm">
              <span className="flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full">
                <Calendar className="w-4 h-4" />
                {daysCount} Days
              </span>
              <span className="flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full">
                <Users className="w-4 h-4" />
                {tripPlan.travelers || formData.travelers} Travelers
              </span>
              <span className="flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full">
                <DollarSign className="w-4 h-4" />
                ${tripPlan.budget || formData.budget}
              </span>
              {sessionId && (
                <span className="flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full text-xs">
                  <MessageCircle className="w-3 h-3" />
                  Session active
                </span>
              )}
              {isPersonalized && (
                <span className="flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full text-xs">
                  <Target className="w-3 h-3" />
                  Personalized for you
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ✅ Personalized Banner */}
        {isPersonalized && userPreferences && (
          <PersonalizedBanner user={user} preferences={userPreferences} />
        )}

        {/* Budget Summary */}
        {tripPlan.summary && (
          <Card className="p-6 rounded-[32px] shadow-xl border border-gray-100 dark:border-gray-800">
            <h3 className="text-xl font-bold mb-4 dark:text-white">💰 Budget Breakdown</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                <p className="text-sm text-gray-500">Accommodation</p>
                <p className="text-lg font-bold text-[#0D9488]">
                  ${tripPlan.summary.accommodationTotal || 0}
                </p>
              </div>
              <div className="text-center p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                <p className="text-sm text-gray-500">Activities</p>
                <p className="text-lg font-bold text-[#F59E0B]">
                  ${tripPlan.summary.activitiesTotal || 0}
                </p>
              </div>
              <div className="text-center p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                <p className="text-sm text-gray-500">Food</p>
                <p className="text-lg font-bold text-[#374151] dark:text-white">
                  ${tripPlan.summary.foodTotal || 0}
                </p>
              </div>
              <div className="text-center p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                <p className="text-sm text-gray-500">Transport</p>
                <p className="text-lg font-bold text-[#374151] dark:text-white">
                  ${tripPlan.summary.transportTotal || 0}
                </p>
              </div>
              <div className="text-center p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                <p className="text-sm text-gray-500">Total</p>
                <p className="text-lg font-bold text-[#0D9488]">
                  ${tripPlan.summary.totalCost || tripPlan.budget || formData.budget}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Day Selector */}
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: daysCount }).map((_, idx) => (
            <button
              key={idx}
              onClick={() => setActiveDay(idx)}
              className={`px-5 py-2.5 rounded-xl font-medium transition ${
                activeDay === idx
                  ? 'bg-[#0D9488] text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              Day {idx + 1}
            </button>
          ))}
        </div>

        {/* Day Itinerary */}
        <Card className="p-6 rounded-[32px] shadow-xl border border-gray-100 dark:border-gray-800">
          {renderDayItinerary(activeDay)}
        </Card>

        {/* ✅ Recommendations Section - Personalized */}
        {recommendations.length > 0 && (
          <Card className="p-6 rounded-[32px] shadow-xl border border-gray-100 dark:border-gray-800">
            <h3 className="text-xl font-bold mb-4 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#F59E0B]" />
              {isPersonalized ? 'Personalized Recommendations' : 'Recommended Experiences'}
            </h3>
            <ExperienceList experiences={recommendations} showMatchReason={isPersonalized} />
          </Card>
        )}

        {/* Tips */}
        {tripPlan.tips && tripPlan.tips.length > 0 && (
          <Card className="p-6 rounded-[32px] shadow-xl border border-gray-100 dark:border-gray-800">
            <h3 className="text-xl font-bold mb-4 dark:text-white">💡 Travel Tips</h3>
            <ul className="space-y-2">
              {tripPlan.tips.map((tip, idx) => (
                <li key={idx} className="flex items-start gap-2 text-gray-600 dark:text-gray-300">
                  <Sparkles className="w-4 h-4 text-[#F59E0B] flex-shrink-0 mt-1" />
                  {tip}
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* Packing List */}
        {tripPlan.packingList && tripPlan.packingList.length > 0 && (
          <Card className="p-6 rounded-[32px] shadow-xl border border-gray-100 dark:border-gray-800">
            <h3 className="text-xl font-bold mb-4 dark:text-white">🎒 Packing List</h3>
            <div className="flex flex-wrap gap-2">
              {tripPlan.packingList.map((item, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300"
                >
                  {item}
                </span>
              ))}
            </div>
          </Card>
        )}

        {/* AI Chat Assistant */}
        <Card className="p-6 rounded-[32px] shadow-xl border border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold dark:text-white flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-[#0D9488]" />
              AI Assistant
            </h3>
            <button
              onClick={() => setShowChat(!showChat)}
              className="text-sm text-[#0D9488] hover:underline"
            >
              {showChat ? 'Hide' : 'Ask about this trip'}
            </button>
          </div>

          {showChat && (
            <div className="space-y-4">
              <div className="max-h-48 overflow-y-auto space-y-2 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                {chatMessages.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">
                    Ask me anything about this trip plan
                  </p>
                ) : (
                  chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-xl p-3 text-sm ${
                          msg.role === 'user'
                            ? 'bg-[#0D9488] text-white'
                            : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))
                )}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white dark:bg-gray-700 rounded-xl p-3">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                  placeholder="Ask about this itinerary..."
                  className="flex-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none dark:text-white"
                  disabled={chatLoading}
                />
                <button
                  onClick={sendChatMessage}
                  disabled={!chatInput.trim() || chatLoading}
                  className="px-4 py-2 rounded-xl bg-[#0D9488] text-white hover:bg-[#0D9488]/80 transition disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </Card>

        {/* Actions */}
        <div className="flex flex-wrap gap-4 justify-center">
          <button
            onClick={handleSaveTrip}
            className="px-8 py-4 rounded-2xl border-2 border-[#0D9488] text-[#0D9488] bg-white hover:bg-[#0D9488]/10 transition flex items-center gap-2"
          >
            {isSaved ? (
              <BookmarkCheck className="w-5 h-5" />
            ) : (
              <Bookmark className="w-5 h-5" />
            )}
            {isSaved ? 'Saved!' : 'Save Trip'}
          </button>

          <Link to="/explore">
            <Button className="px-8 py-4 rounded-2xl bg-gradient-to-r from-[#0D9488] to-[#F59E0B] text-white shadow-xl shadow-[#0D9488]/30 hover:scale-[1.02] transition flex items-center gap-2">
              Explore Experiences
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>

          <button
            onClick={() => window.print()}
            className="px-8 py-4 rounded-2xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition flex items-center gap-2"
          >
            <Download className="w-5 h-5" />
            Print Plan
          </button>

          {sessionId && (
            <button
              onClick={() => {
                navigator.clipboard.writeText(
                  `Check out my AI-generated trip to ${tripPlan.destination}! 🎉\n\n` +
                  `Session ID: ${sessionId}\n` +
                  `Destination: ${tripPlan.destination}\n` +
                  `Days: ${daysCount}\n` +
                  `Budget: $${tripPlan.budget || formData.budget}\n\n` +
                  `Plan your own trip at AI Tour Rwanda!`
                );
                toast.success('Trip details copied to clipboard!');
              }}
              className="px-8 py-4 rounded-2xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition flex items-center gap-2"
            >
              <Share2 className="w-5 h-5" />
              Share
            </button>
          )}
        </div>
      </div>
    );
  };

  // ✅ Render loading
  const renderLoading = () => (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-900 p-8 max-w-md w-full mx-4 text-center rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800">
        <div className="relative w-24 h-24 mx-auto mb-6">
          <div className="absolute inset-0 rounded-full border-4 border-[#0D9488]/20" />
          <div className="absolute inset-0 rounded-full border-4 border-[#0D9488] border-t-transparent animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Bot className="w-10 h-10 text-[#0D9488]" />
          </div>
        </div>

        <h3 className="text-2xl font-bold mb-2 dark:text-white">
          AI Planning Your Trip
        </h3>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          {loadingMessage || 'Creating your personalized itinerary...'}
        </p>

        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
          <div
            className="bg-gradient-to-r from-[#0D9488] to-[#F59E0B] h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${loadingProgress}%` }}
          />
        </div>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-4">
          {Math.round(loadingProgress)}% Complete
        </p>
      </div>
    </div>
  );

  // ============================================================
  // MAIN RENDER
  // ============================================================

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto px-4 py-8">

      {/* HERO */}
      <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#0D9488] via-[#0D9488] to-[#F59E0B] text-white p-8 md:p-12 shadow-2xl">
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-md mb-6">
            <Bot className="w-5 h-5" />
            <span className="font-medium">AI Travel Assistant</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black leading-tight mb-5">
            Plan Smarter.
            <br />
            Travel Better.
          </h1>
          <p className="text-lg text-white/85 max-w-2xl">
            AI Tour creates personalized Rwanda travel experiences based on your
            travel style, budget, and interests.
          </p>
          {sessionId && (
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 text-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Session active
            </div>
          )}
          {isPersonalized && (
            <div className="mt-2 inline-flex items-center gap-2 px-4 py-1 rounded-full bg-[#F59E0B]/30 text-xs">
              <Target className="w-3 h-3" />
              Personalized for you
            </div>
          )}
        </div>
      </section>

      {/* STEPS */}
      <div className="flex items-center justify-center gap-3 flex-wrap">
        {['Destination', 'Mood', 'Preferences', 'Results'].map((item, index) => (
          <div
            key={item}
            className={`px-5 py-3 rounded-2xl font-medium ${
              step >= index + 1
                ? 'bg-[#0D9488] text-white'
                : 'bg-gray-100 dark:bg-gray-800 dark:text-gray-300'
            }`}
          >
            {index + 1}. {item}
          </div>
        ))}
      </div>

      {step !== 4 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* FORM */}
          <div className="lg:col-span-2">
            <Card className="p-6 md:p-8 rounded-[32px] shadow-xl border border-gray-100 dark:border-gray-800">
              <h2 className="text-3xl font-black mb-8 dark:text-white">
                AI Trip Planner
              </h2>

              <form onSubmit={(e) => { e.preventDefault(); generateAITrip(); }} className="space-y-8">
                {/* ✅ Destination - Dynamic from API */}
                <div>
                  <label className="block text-sm font-semibold mb-3 dark:text-white">
                    Where do you want to go?
                  </label>
                  <select
                    value={formData.destination}
                    onChange={handleDestinationChange}
                    disabled={destinationsLoading}
                    className="w-full h-14 rounded-2xl border border-gray-200 dark:border-gray-700 px-4 bg-white dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {destinationsLoading 
                        ? 'Loading destinations...' 
                        : destinationsError 
                          ? 'Error loading destinations' 
                          : 'Select a destination'}
                    </option>
                    {destinations.map((dest) => (
                      <option key={dest.id} value={dest.value}>
                        {dest.name} {dest.listingCount ? `(${dest.listingCount} experiences)` : ''}
                      </option>
                    ))}
                  </select>
                  
                  {/* ✅ Loading indicator */}
                  {destinationsLoading && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                      <Loader2 className="w-4 h-4 animate-spin text-[#0D9488]" />
                      Loading destinations...
                    </div>
                  )}
                  
                  {/* ✅ Error state */}
                  {destinationsError && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-red-500">
                      <AlertCircle className="w-4 h-4" />
                      <span>{destinationsError}</span>
                      <button
                        type="button"
                        onClick={handleRetryDestinations}
                        className="ml-2 text-[#0D9488] hover:underline flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Retry
                      </button>
                    </div>
                  )}
                  
                  {/* ✅ Success indicator */}
                  {!destinationsLoading && !destinationsError && destinations.length > 0 && (
                    <p className="mt-1 text-xs text-gray-400">
                      {destinations.length} destinations available
                    </p>
                  )}
                </div>

                {/* Travel Mood */}
                <div>
                  <label className="block text-sm font-semibold mb-4 dark:text-white">
                    What's your travel mood?
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {moods.map((item) => (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => setFormData({ ...formData, mood: item.name })}
                        className={`rounded-2xl p-4 text-left text-white bg-gradient-to-r ${item.color} ${
                          formData.mood === item.name ? 'ring-4 ring-[#F59E0B]' : ''
                        } transition-all hover:scale-[1.02]`}
                      >
                        <item.icon className="w-7 h-7 mb-3" />
                        <h3 className="font-bold">{item.name}</h3>
                        <p className="text-xs text-white/80 mt-1">
                          {item.description}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold mb-3 dark:text-white">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full h-14 rounded-2xl border border-gray-200 dark:border-gray-700 px-4 bg-white dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-3 dark:text-white">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full h-14 rounded-2xl border border-gray-200 dark:border-gray-700 px-4 bg-white dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none"
                    />
                  </div>
                </div>

                {/* Travelers & Budget */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold mb-3 dark:text-white">
                      Number of Travelers
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={formData.travelers}
                      onChange={(e) => setFormData({ ...formData, travelers: parseInt(e.target.value) || 1 })}
                      className="w-full h-14 rounded-2xl border border-gray-200 dark:border-gray-700 px-4 bg-white dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-3 dark:text-white">
                      Budget (USD)
                    </label>
                    <input
                      type="number"
                      min="100"
                      step="50"
                      value={formData.budget}
                      onChange={(e) => setFormData({ ...formData, budget: parseInt(e.target.value) || 100 })}
                      className="w-full h-14 rounded-2xl border border-gray-200 dark:border-gray-700 px-4 bg-white dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none"
                    />
                  </div>
                </div>

                {/* Travel Style */}
                <div>
                  <label className="block text-sm font-semibold mb-3 dark:text-white">
                    Travel Style
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {travelStyles.map((style) => (
                      <button
                        key={style.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, travelStyle: style.value })}
                        className={`px-5 py-3 rounded-2xl text-sm font-semibold transition ${
                          formData.travelStyle === style.value
                            ? 'bg-[#0D9488] text-white'
                            : 'bg-gray-100 dark:bg-gray-800 dark:text-white hover:bg-[#0D9488]/10'
                        }`}
                      >
                        {style.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Interests */}
                <div>
                  <label className="block text-sm font-semibold mb-4 dark:text-white">
                    Interests
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {interests.map((item) => (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => {
                          const updated = formData.interests.includes(item.name)
                            ? formData.interests.filter((i) => i !== item.name)
                            : [...formData.interests, item.name];
                          setFormData({ ...formData, interests: updated });
                        }}
                        className={`px-5 py-3 rounded-2xl text-sm font-semibold transition ${
                          formData.interests.includes(item.name)
                            ? 'bg-[#0D9488] text-white'
                            : 'bg-gray-100 dark:bg-gray-800 dark:text-white hover:bg-[#0D9488]/10'
                        }`}
                      >
                        <item.icon className="w-4 h-4 inline mr-2" />
                        {item.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Language */}
                <div>
                  <label className="block text-sm font-semibold mb-3 dark:text-white">
                    Language
                  </label>
                  <select
                    value={formData.language}
                    onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                    className="w-full h-14 rounded-2xl border border-gray-200 dark:border-gray-700 px-4 bg-white dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none"
                  >
                    <option value="English">English</option>
                    <option value="French">Français</option>
                    <option value="Kinyarwanda">Kinyarwanda</option>
                    <option value="Swahili">Swahili</option>
                  </select>
                </div>

                {/* Submit */}
                <Button
                  type="submit"
                  className="w-full h-16 rounded-3xl text-lg font-bold bg-gradient-to-r from-[#0D9488] to-[#F59E0B] shadow-xl shadow-[#0D9488]/30 hover:scale-[1.02] transition"
                >
                  Generate AI Trip Plan
                  <Send className="w-5 h-5 ml-3" />
                </Button>
              </form>
            </Card>
          </div>

          {/* SIDEBAR */}
          <div className="space-y-6">
            <Card className="p-6 rounded-[32px] shadow-xl border border-gray-100 dark:border-gray-800">
              <h3 className="text-2xl font-black mb-6 dark:text-white">
                Why AI Tour?
              </h3>
              <div className="space-y-4">
                {[
                  { icon: Sparkles, text: 'AI Personalized Trips' },
                  { icon: Globe2, text: 'Local Rwanda Insights' },
                  { icon: Wallet, text: 'Budget Optimization' },
                  { icon: Clock3, text: 'Smart Itineraries' },
                  { icon: Bot, text: '24/7 AI Assistant' },
                ].map((item) => (
                  <div key={item.text} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#0D9488] flex-shrink-0" />
                    <span className="dark:text-white">{item.text}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Saved Trips Count */}
            {savedTrips.length > 0 && (
              <Card className="p-6 rounded-[32px] shadow-xl border border-gray-100 dark:border-gray-800">
                <h4 className="font-bold mb-2 dark:text-white">
                  Saved Trips: {savedTrips.length}
                </h4>
                <Link
                  to="/trips"
                  className="text-sm text-[#0D9488] hover:underline"
                >
                  View all saved trips →
                </Link>
              </Card>
            )}

            {/* Session Status */}
            {sessionId && (
              <Card className="p-6 rounded-[32px] shadow-xl border border-gray-100 dark:border-gray-800 bg-[#0D9488]/5">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <div>
                    <p className="text-sm font-medium dark:text-white">Session Active</p>
                    <p className="text-xs text-gray-400 truncate max-w-[200px]">{sessionId}</p>
                  </div>
                </div>
              </Card>
            )}

            {/* ✅ Personalization Status */}
            {user && (
              <Card className="p-6 rounded-[32px] shadow-xl border border-gray-100 dark:border-gray-800 bg-[#F59E0B]/5">
                <div className="flex items-center gap-3">
                  <Target className="w-5 h-5 text-[#F59E0B]" />
                  <div>
                    <p className="text-sm font-medium dark:text-white">
                      {isPersonalized ? 'Personalized Experience' : 'Sign in for Personalization'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {isPersonalized 
                        ? 'Your preferences are being used' 
                        : 'Login to get personalized recommendations'}
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      ) : (
        renderResults()
      )}

      {/* Loading Modal */}
      {loading && renderLoading()}
    </div>
  );
};

export default AIPlanner;