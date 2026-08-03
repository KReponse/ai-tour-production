// backend/src/controllers/aiController.js
// ✅ COMPLETE FIXED - Full session management with conversation memory
// ✅ Uses ONLY Listing, no Tour references
// ✅ Added session persistence
// ✅ Added conversation history endpoints

import plannerService from '../ai/services/planner.service.js';
import chatService from '../ai/services/chat.service.js';
import recommendationService from '../ai/services/recommendation.service.js';
import searchService from '../ai/services/search.service.js';
import aiProvider from '../ai/providers/providerInterface.js';
import Listing from "../models/Listing.js";
import User from "../models/User.js";
import Booking from "../models/Booking.js";
import Review from "../models/Review.js";
import ChatSession from "../models/ChatSession.js";
import { transformToExperiences } from '../ai/utils/experienceTransformer.js';

console.log('🔍 aiProvider instance type:', typeof aiProvider);
console.log('🔍 aiProvider methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(aiProvider)));

/* ================= AI CHAT ================= */

export const aiChat = async (req, res) => {
  try {
    const { 
      message, 
      sessionId, 
      context, 
      language = 'English',
      userLocation = 'Rwanda'
    } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Message is required"
      });
    }

    // Check if AI provider is available
    const providerInfo = aiProvider.getProviderInfo();
    console.log('🔍 AI Provider Status:', providerInfo);

    if (!aiProvider.isAvailable()) {
      console.warn('⚠️ AI Provider not available, using fallback');
      const fallbackResponse = getFallbackResponse(message);
      return res.status(200).json({
        success: true,
        reply: fallbackResponse,
        sessionId: sessionId || null,
        fallback: true,
        message: "AI service is in fallback mode",
        provider: providerInfo
      });
    }

    console.log('✅ AI Provider is available, sending to chat service...');

    // Get user context if authenticated
    const userContext = req.user ? await getUserContext(req.user._id) : null;

    // ✅ Pass sessionId to chat service for conversation memory
    const response = await chatService.sendMessage({
      message,
      sessionId: sessionId || null,
      userId: req.user?._id || null,
      context: context || 'general',
      userContext,
      language,
      userLocation,
      chatHistory: []
    });

    console.log('✅ Chat response received from service');

    res.status(200).json({
      success: true,
      sessionId: response.sessionId,
      reply: response.reply,
      isNewSession: response.isNewSession || false,
      isFollowUp: response.isFollowUp || false,
      suggestedActions: response.quickReplies || [],
      experiences: response.experiences || [],
      intent: response.intent || 'general',
      provider: aiProvider.getProviderInfo(),
      fallback: response.fallback || false,
      responseTime: response.responseTime
    });
  } catch (error) {
    console.error('❌ AI Chat Error:', error.message);
    console.error(error.stack);
    const fallbackResponse = getFallbackResponse(req.body.message);
    res.status(200).json({
      success: true,
      reply: fallbackResponse,
      sessionId: req.body.sessionId || null,
      fallback: true,
      error: error.message
    });
  }
};

/* ================= AI CHAT WITH SESSION ================= */

export const aiChatWithSession = async (req, res) => {
  try {
    const { 
      message, 
      sessionId, 
      context, 
      language = 'English',
      userLocation = 'Rwanda'
    } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Message is required"
      });
    }

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: "Session ID is required for continuing conversation"
      });
    }

    // Check if AI provider is available
    const providerInfo = aiProvider.getProviderInfo();

    if (!aiProvider.isAvailable()) {
      console.warn('⚠️ AI Provider not available, using fallback');
      const fallbackResponse = getFallbackResponse(message);
      return res.status(200).json({
        success: true,
        reply: fallbackResponse,
        sessionId,
        fallback: true,
        message: "AI service is in fallback mode",
        provider: providerInfo
      });
    }

    console.log('✅ AI Provider is available, sending to chat service with session...');

    // Get user context if authenticated
    const userContext = req.user ? await getUserContext(req.user._id) : null;

    // ✅ Pass sessionId to chat service for conversation memory
    const response = await chatService.sendMessage({
      message,
      sessionId,
      userId: req.user?._id || null,
      context: context || 'general',
      userContext,
      language,
      userLocation,
      chatHistory: []
    });

    console.log('✅ Chat response received from service');

    res.status(200).json({
      success: true,
      sessionId: response.sessionId,
      reply: response.reply,
      isNewSession: response.isNewSession || false,
      isFollowUp: response.isFollowUp || false,
      suggestedActions: response.quickReplies || [],
      experiences: response.experiences || [],
      intent: response.intent || 'general',
      provider: aiProvider.getProviderInfo(),
      fallback: response.fallback || false,
      responseTime: response.responseTime
    });
  } catch (error) {
    console.error('❌ AI Chat Session Error:', error.message);
    console.error(error.stack);
    const fallbackResponse = getFallbackResponse(req.body.message);
    res.status(200).json({
      success: true,
      reply: fallbackResponse,
      sessionId: req.body.sessionId || null,
      fallback: true,
      error: error.message
    });
  }
};

/* ================= GET CHAT HISTORY ================= */

export const getChatHistory = async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: "Session ID is required"
      });
    }

    // Get history from chat service
    const history = await chatService.getSessionHistory(sessionId);

    if (!history.success) {
      return res.status(404).json({
        success: false,
        message: history.error || "Session not found"
      });
    }

    res.status(200).json({
      success: true,
      sessionId,
      messages: history.messages || [],
      context: history.context || {},
      total: history.messages?.length || 0
    });
  } catch (error) {
    console.error('❌ Get Chat History Error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* ================= CLEAR CHAT HISTORY ================= */

export const clearChatHistory = async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: "Session ID is required"
      });
    }

    // Clear history from chat service
    const result = await chatService.clearSessionHistory(sessionId);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.error || "Failed to clear history"
      });
    }

    res.status(200).json({
      success: true,
      message: "Chat history cleared successfully",
      sessionId
    });
  } catch (error) {
    console.error('❌ Clear Chat History Error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* ================= GET ACTIVE SESSIONS (Admin) ================= */

export const getActiveSessions = async (req, res) => {
  try {
    // Admin only
    if (!req.user || req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: "Admin access required"
      });
    }

    const { limit = 100, page = 1 } = req.query;

    const sessions = await ChatSession.find({ isActive: true })
      .sort({ updatedAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .select('id userId lastMessage lastResponse lastIntent messages updatedAt createdAt');

    const total = await ChatSession.countDocuments({ isActive: true });

    res.status(200).json({
      success: true,
      sessions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('❌ Get Active Sessions Error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* ================= AI PLANNER ================= */

export const aiPlanner = async (req, res) => {
  try {
    const { destination, days, budget, travelers, preferences, interests, travelStyle, startDate } = req.body;

    if (!destination || !days || !budget) {
      return res.status(400).json({
        success: false,
        message: "Destination, days, and budget are required"
      });
    }

    // Use planner service (which now uses Listings only)
    const response = await plannerService.createPlan({
      destination,
      days: parseInt(days),
      budget: parseFloat(budget),
      travelers: travelers || 1,
      preferences,
      interests: interests || [],
      travelStyle: travelStyle || 'balanced',
      startDate
    });

    res.json({
      success: response.success,
      plan: response.plan,
      provider: aiProvider.getProviderInfo(),
      fallback: response.fallback || false
    });
  } catch (error) {
    console.error('AI Planner Error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* ================= AI RECOMMENDATIONS ================= */

export const aiRecommendations = async (req, res) => {
  try {
    const { query, userId, limit = 10, minPrice, maxPrice, location } = req.query;

    // Get user context
    let userContext = null;
    if (userId || req.user) {
      userContext = await getUserContext(userId || req.user?._id);
    }

    // Get experiences from search service
    const searchResults = await searchService.searchListings(query || '', {
      limit: parseInt(limit),
      filters: {
        minPrice: minPrice ? parseFloat(minPrice) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
        location
      }
    });

    // Transform to experiences
    const experiences = searchResults.experiences;

    res.json({
      success: true,
      recommendations: experiences,
      total: searchResults.total,
      source: 'listing',
      personalized: !!userContext,
      provider: aiProvider.getProviderInfo(),
      fallback: false
    });
  } catch (error) {
    console.error('AI Recommendations Error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* ================= AI SEARCH ================= */

export const aiSearch = async (req, res) => {
  try {
    const { query, limit = 20, page = 1, sortBy, filters } = req.query;
    
    const results = await searchService.searchListings(query, {
      limit: parseInt(limit),
      page: parseInt(page),
      sortBy,
      filters: filters ? JSON.parse(filters) : {}
    });

    res.json({
      success: true,
      ...results
    });
  } catch (error) {
    console.error('AI Search Error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* ================= TRENDING EXPERIENCES ================= */

export const getTrendingExperiences = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const experiences = await searchService.getTrendingExperiences(parseInt(limit));
    
    res.json({
      success: true,
      experiences,
      total: experiences.length
    });
  } catch (error) {
    console.error('Get Trending Experiences Error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* ================= FEATURED EXPERIENCES ================= */

export const getFeaturedExperiences = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const experiences = await searchService.getFeaturedExperiences(parseInt(limit));
    
    res.json({
      success: true,
      experiences,
      total: experiences.length
    });
  } catch (error) {
    console.error('Get Featured Experiences Error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* ================= SWITCH AI PROVIDER (Admin Only) ================= */

export const switchAIProvider = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const { provider } = req.body;
    const availableProviders = ['gemini', 'openai'];

    if (!availableProviders.includes(provider)) {
      return res.status(400).json({
        success: false,
        message: `Provider must be one of: ${availableProviders.join(', ')}`
      });
    }

    const result = aiProvider.switchProvider(provider);

    res.json({
      success: true,
      message: `AI provider switched to ${provider}`,
      provider: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* ================= GET AI PROVIDER INFO ================= */

export const getAIProviderInfo = async (req, res) => {
  try {
    const info = aiProvider.getProviderInfo();
    
    res.json({
      success: true,
      ...info
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* ================= HELPER FUNCTIONS ================= */

// Get user context
const getUserContext = async (userId) => {
  if (!userId) return null;

  try {
    const user = await User.findById(userId);
    const bookings = await Booking.find({ user: userId, status: 'confirmed' })
      .populate('listingId')
      .limit(5);

    const reviews = await Review.find({ user: userId })
      .populate('listingId');

    // Get favorite locations
    const locations = {};
    bookings.forEach(b => {
      if (b.listingId?.location) {
        locations[b.listingId.location] = (locations[b.listingId.location] || 0) + 1;
      }
    });
    const favoriteLocations = Object.keys(locations).sort((a, b) => locations[b] - locations[a]);

    return {
      name: user?.name,
      preferences: user?.preferences || {},
      pastBookings: bookings.map(b => ({
        title: b.listingId?.title,
        location: b.listingId?.location,
        rating: b.listingId?.averageRating
      })),
      reviews: reviews.map(r => ({
        experience: r.listingId?.title,
        rating: r.rating
      })),
      favoriteLocations,
      interests: user?.interests || []
    };
  } catch (error) {
    console.error("Error getting user context:", error);
    return null;
  }
};

// Get relevant experiences from database (LISTINGS ONLY)
const getRelevantExperiences = async (message) => {
  try {
    if (!message) return [];

    const keywords = message.toLowerCase().split(' ').filter(w => w.length > 3);
    
    const listings = await Listing.find({
      status: 'approved',
      $or: [
        { title: { $regex: keywords.join('|'), $options: 'i' } },
        { location: { $regex: keywords.join('|'), $options: 'i' } },
        { description: { $regex: keywords.join('|'), $options: 'i' } },
        { businessType: { $regex: keywords.join('|'), $options: 'i' } }
      ]
    })
    .limit(5)
    .populate('provider', 'businessName name avatar')
    .lean();

    return transformToExperiences(listings);
  } catch (error) {
    console.error("Error getting relevant experiences:", error);
    return [];
  }
};

// Get fallback response
const getFallbackResponse = (message) => {
  const msg = message?.toLowerCase() || '';
  
  if (msg.includes('kigali') || msg.includes('city')) {
    return "Kigali is beautiful! 🌆 Don't miss the Genocide Memorial, local markets, and vibrant nightlife. Check out our Kigali City experiences for the full experience!";
  }
  
  if (msg.includes('gorilla') || msg.includes('volcano')) {
    return "Gorilla trekking is an unforgettable experience! 🦍 Volcanoes National Park offers once-in-a-lifetime encounters. Contact us for availability and permits!";
  }
  
  if (msg.includes('safari') || msg.includes('wildlife') || msg.includes('animal')) {
    return "Rwanda's Akagera National Park offers incredible safari experiences! 🐘 See the Big Five and amazing birdlife. Book your safari adventure today!";
  }
  
  if (msg.includes('lake kivu') || msg.includes('lake')) {
    return "Lake Kivu is stunning! 🌊 Enjoy boat experiences, swimming, and beautiful sunsets. Perfect for relaxation after gorilla trekking!";
  }
  
  if (msg.includes('nyungwe') || msg.includes('forest')) {
    return "Nyungwe Forest is amazing! 🌿 Experience the canopy walk, chimpanzee trekking, and incredible biodiversity. A must-visit for nature lovers!";
  }
  
  const responses = [
    "Thank you for your question! 🇷🇼 Rwanda has amazing experiences including Kigali City tours, Akagera National Park safaris, Volcanoes National Park trekking, Nyungwe Forest adventures, and Lake Kivu relaxation. Which one interests you?",
    "I appreciate your interest in Rwanda! 🌍 We have incredible experiences including city tours, gorilla trekking, safaris, and cultural experiences. What kind of experience are you looking for?",
    "Great question! ✨ Rwanda offers diverse experiences from urban adventures in Kigali to wildlife encounters in our national parks. Our team can help you plan the perfect trip!"
  ];
  
  return responses[Math.floor(Math.random() * responses.length)];
};