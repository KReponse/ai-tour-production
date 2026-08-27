// frontend/src/services/aiService.js
// ✅ COMPLETE FIXED - Full session management with conversation memory
// ✅ ADDED: Response normalization for consistent frontend data
// ✅ ADDED: Real listing card data formatting
// ✅ ADDED: Fallback handling when AI fails
// ✅ ADDED: Session persistence across all AI features

import axios from 'axios';
import API from './api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ===============================
// ✅ HELPER: Normalize AI Response
// ===============================
const normalizeAIResponse = (response, sessionId = null) => {
  // If response is already normalized, return it
  if (response._normalized) return response;

  // Handle error responses
  if (!response.success) {
    return {
      success: false,
      reply: response.reply || response.message || 'Sorry, I encountered an error. Please try again.',
      fallback: true,
      sessionId: response.sessionId || sessionId,
      experiences: [],
      quickReplies: response.quickReplies || [
        'Try again',
        'Contact support',
        'Browse experiences'
      ],
      _normalized: true
    };
  }

  // Extract reply from various response formats
  const reply = response.reply || response.message || response.content || response.answer || '';
  
  // Extract experiences from various response formats
  let experiences = [];
  if (response.experiences && Array.isArray(response.experiences)) {
    experiences = response.experiences;
  } else if (response.recommendations && Array.isArray(response.recommendations)) {
    experiences = response.recommendations;
  } else if (response.data && Array.isArray(response.data)) {
    experiences = response.data;
  } else if (response.listings && Array.isArray(response.listings)) {
    experiences = response.listings;
  }

  // Format experiences for frontend cards
  const formattedExperiences = experiences.map(exp => ({
    id: exp._id || exp.id || exp.listingId,
    title: exp.title || 'Untitled Experience',
    location: exp.location || 'Rwanda',
    price: exp.price || 0,
    currency: exp.currency || 'USD',
    duration: exp.duration || 'Flexible',
    rating: exp.rating || exp.averageRating || 0,
    reviewCount: exp.reviewCount || exp.totalReviews || 0,
    description: exp.description || 'Discover this amazing experience in Rwanda.',
    coverImage: exp.coverImage || exp.coverMedia || exp.image || null,
    coverMedia: exp.coverMedia || null,
    coverMediaType: exp.coverMediaType || 'image',
    category: exp.category || exp.businessType || 'Experience',
    provider: exp.provider?.name || exp.provider?.businessName || 'Verified Provider',
    providerId: exp.provider?._id || exp.providerId || null,
    url: `/listing/${exp._id || exp.id}`,
    score: exp.score || exp.relevance || 0,
    isFeatured: exp.isFeatured || false,
    status: exp.status || 'active'
  }));

  // Extract quick replies
  const quickReplies = response.quickReplies || response.suggestions || [];

  // Extract intent
  const intent = response.intent || 'general';

  return {
    success: true,
    reply: reply,
    fallback: response.fallback || false,
    sessionId: response.sessionId || sessionId,
    experiences: formattedExperiences,
    quickReplies: quickReplies,
    intent: intent,
    totalResults: response.totalResults || formattedExperiences.length,
    isFollowUp: response.isFollowUp || false,
    _normalized: true
  };
};

// ===============================
// ✅ HELPER: Handle API Errors
// ===============================
const handleAPIError = (error, fallbackMessage = 'Something went wrong. Please try again.') => {
  console.error('❌ AI Service Error:', error);
  
  if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
    return {
      success: false,
      reply: 'The AI is taking too long to respond. Please try again.',
      fallback: true,
      experiences: [],
      quickReplies: ['Try again', 'Browse experiences'],
      _normalized: true
    };
  }
  
  if (error.response?.status === 429) {
    return {
      success: false,
      reply: 'Too many requests. Please wait a moment and try again.',
      fallback: true,
      experiences: [],
      quickReplies: ['Wait a moment', 'Browse experiences'],
      _normalized: true
    };
  }
  
  if (error.response?.status === 401) {
    return {
      success: false,
      reply: 'Please login to use the AI assistant.',
      fallback: true,
      experiences: [],
      quickReplies: ['Login', 'Browse as guest'],
      _normalized: true
    };
  }

  return {
    success: false,
    reply: error.response?.data?.message || error.message || fallbackMessage,
    fallback: true,
    experiences: [],
    quickReplies: ['Try again', 'Contact support'],
    _normalized: true
  };
};

// ===============================
// ✅ AI CHAT with Session Management
// ===============================
export const getAIChat = async (data) => {
  try {
    const token = localStorage.getItem('token');
    
    const requestData = {
      message: data.message,
      language: data.language || 'English',
      context: data.context || 'general',
      chatHistory: data.history || [],
      sessionId: data.sessionId || null,
      userLocation: data.userLocation || 'Rwanda'
    };

    if (data.userContext) {
      requestData.userContext = data.userContext;
    }

    if (data.images && data.images.length > 0) {
      requestData.images = data.images;
    }

    const response = await axios.post(
      `${API_URL}/ai/chat`,
      requestData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 60000
      }
    );

    // ✅ Normalize response
    return normalizeAIResponse(response.data, data.sessionId);
  } catch (error) {
    return handleAPIError(error);
  }
};

// ===============================
// ✅ AI CHAT WITH SESSION
// ===============================
export const getAIChatWithSession = async (data) => {
  try {
    const token = localStorage.getItem('token');
    
    if (!data.sessionId) {
      throw new Error('Session ID is required for continuing conversation');
    }

    const requestData = {
      message: data.message,
      sessionId: data.sessionId,
      language: data.language || 'English',
      context: data.context || 'general',
      chatHistory: data.history || [],
      userLocation: data.userLocation || 'Rwanda'
    };

    if (data.userContext) {
      requestData.userContext = data.userContext;
    }

    if (data.images && data.images.length > 0) {
      requestData.images = data.images;
    }

    const response = await axios.post(
      `${API_URL}/ai/chat/session`,
      requestData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 60000
      }
    );

    return normalizeAIResponse(response.data, data.sessionId);
  } catch (error) {
    return handleAPIError(error);
  }
};

// ===============================
// ✅ GET CHAT HISTORY
// ===============================
export const getChatHistory = async (sessionId) => {
  try {
    const token = localStorage.getItem('token');
    
    if (!sessionId) {
      throw new Error('Session ID is required');
    }

    const response = await axios.get(
      `${API_URL}/ai/chat/history/${sessionId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeout: 10000
      }
    );

    return {
      success: true,
      messages: response.data.messages || [],
      context: response.data.context || {}
    };
  } catch (error) {
    console.error('❌ Get Chat History error:', error);
    return {
      success: false,
      messages: [],
      context: {},
      error: error.message
    };
  }
};

// ===============================
// ✅ CLEAR CHAT HISTORY
// ===============================
export const clearChatHistory = async (sessionId) => {
  try {
    const token = localStorage.getItem('token');
    
    if (!sessionId) {
      throw new Error('Session ID is required');
    }

    const response = await axios.delete(
      `${API_URL}/ai/chat/history/${sessionId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeout: 10000
      }
    );

    return {
      success: true,
      message: 'Chat history cleared'
    };
  } catch (error) {
    console.error('❌ Clear Chat History error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// ===============================
// ✅ AI PLANNER with Session
// ===============================
export const generateTripPlan = async (data) => {
  try {
    const token = localStorage.getItem('token');
    
    if (!data.destination) {
      throw new Error('Destination is required');
    }
    if (!data.days || data.days < 1) {
      throw new Error('Please select at least 1 day');
    }
    if (!data.budget || data.budget < 10) {
      throw new Error('Please enter a valid budget');
    }

    const response = await axios.post(
      `${API_URL}/ai/planner`,
      {
        destination: data.destination,
        days: parseInt(data.days) || 3,
        budget: parseFloat(data.budget) || 500,
        travelers: parseInt(data.travelers) || 1,
        preferences: data.preferences || [],
        travelStyle: data.travelStyle || 'balanced',
        startDate: data.startDate || null,
        interests: data.interests || [],
        language: data.language || 'English',
        sessionId: data.sessionId || null
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 60000
      }
    );

    return {
      success: true,
      plan: response.data.plan || response.data,
      sessionId: response.data.sessionId || data.sessionId,
      fallback: response.data.fallback || false
    };
  } catch (error) {
    console.error('❌ AI Planner error:', error);
    return {
      success: false,
      plan: null,
      error: error.message,
      fallback: true
    };
  }
};

// ===============================
// ✅ AI RECOMMENDATIONS
// ===============================
export const getAIRecommendations = async (params = {}) => {
  try {
    const token = localStorage.getItem('token');
    
    const response = await axios.get(
      `${API_URL}/ai/recommendations`,
      {
        params: {
          query: params.query || '',
          limit: params.limit || 10,
          minPrice: params.minPrice,
          maxPrice: params.maxPrice,
          location: params.location,
          category: params.category,
          sortBy: params.sortBy || 'relevance',
          sessionId: params.sessionId || null
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeout: 30000
      }
    );

    // ✅ Normalize recommendations
    return normalizeAIResponse({
      ...response.data,
      experiences: response.data.recommendations || response.data.experiences || []
    }, params.sessionId);
  } catch (error) {
    return handleAPIError(error, 'Failed to get recommendations');
  }
};

// ===============================
// ✅ AI SEARCH
// ===============================
export const searchExperiences = async (params = {}) => {
  try {
    const token = localStorage.getItem('token');
    
    const response = await axios.get(
      `${API_URL}/ai/search`,
      {
        params: {
          query: params.query || '',
          limit: params.limit || 20,
          page: params.page || 1,
          sortBy: params.sortBy || 'relevance',
          filters: params.filters ? JSON.stringify(params.filters) : undefined,
          sessionId: params.sessionId || null
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeout: 15000
      }
    );

    return normalizeAIResponse({
      ...response.data,
      experiences: response.data.results || response.data.experiences || []
    }, params.sessionId);
  } catch (error) {
    return handleAPIError(error, 'Failed to search experiences');
  }
};

// ===============================
// ✅ TRENDING EXPERIENCES
// ===============================
export const getTrendingExperiences = async (limit = 10) => {
  try {
    const token = localStorage.getItem('token');
    
    const response = await axios.get(
      `${API_URL}/ai/trending`,
      {
        params: { limit },
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeout: 10000
      }
    );

    return normalizeAIResponse({
      ...response.data,
      experiences: response.data.experiences || response.data.trending || []
    });
  } catch (error) {
    return handleAPIError(error, 'Failed to get trending experiences');
  }
};

// ===============================
// ✅ FEATURED EXPERIENCES
// ===============================
export const getFeaturedExperiences = async (limit = 10) => {
  try {
    const token = localStorage.getItem('token');
    
    const response = await axios.get(
      `${API_URL}/ai/featured`,
      {
        params: { limit },
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeout: 10000
      }
    );

    return normalizeAIResponse({
      ...response.data,
      experiences: response.data.experiences || response.data.featured || []
    });
  } catch (error) {
    return handleAPIError(error, 'Failed to get featured experiences');
  }
};

// ===============================
// ✅ AI SUGGESTIONS
// ===============================
export const getAISuggestions = async (sessionId = null) => {
  try {
    const token = localStorage.getItem('token');
    
    const fallbackSuggestions = [
      "What are the best experiences in Kigali?",
      "Tell me about gorilla trekking",
      "Plan a 3-day trip to Rwanda",
      "What's the best time to visit?",
      "How much does a safari cost?",
      "Suggest cultural experiences"
    ];

    try {
      const response = await axios.get(
        `${API_URL}/ai/suggestions`,
        {
          params: { sessionId },
          headers: {
            Authorization: `Bearer ${token}`,
          },
          timeout: 5000
        }
      );
      
      if (response.data?.success && response.data?.suggestions?.length > 0) {
        return {
          success: true,
          suggestions: response.data.suggestions,
          sessionId: response.data.sessionId || sessionId
        };
      }
    } catch (error) {
      console.warn('⚠️ Failed to fetch suggestions, using fallback');
    }

    return {
      success: true,
      suggestions: fallbackSuggestions,
      fallback: true
    };
  } catch (error) {
    console.error('❌ AI Suggestions error:', error);
    return {
      success: true,
      suggestions: [
        "What are the best experiences in Kigali?",
        "Tell me about gorilla trekking",
        "Plan a 3-day trip to Rwanda",
        "What's the best time to visit?",
        "How much does a safari cost?",
        "Suggest cultural experiences"
      ],
      fallback: true
    };
  }
};

// ===============================
// ✅ AI PROVIDER INFO
// ===============================
export const getAIProviderInfo = async () => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.get(
      `${API_URL}/ai/provider-info`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('❌ AI Provider Info error:', error);
    throw error;
  }
};

// ===============================
// ✅ SWITCH AI PROVIDER (Admin)
// ===============================
export const switchAIProvider = async (provider) => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.post(
      `${API_URL}/ai/switch-provider`,
      { provider },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('❌ Switch AI Provider error:', error);
    throw error;
  }
};

// ===============================
// ✅ GENERATE ITINERARY (Alias)
// ===============================
export const generateItinerary = generateTripPlan;

// ===============================
// ✅ GET TRAVEL INSIGHTS
// ===============================
export const getTravelInsights = async (destination, sessionId = null) => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.post(
      `${API_URL}/ai/insights`,
      { destination, sessionId },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('❌ Travel Insights error:', error);
    throw error;
  }
};

// ===============================
// ✅ SEND CHAT MESSAGE (with session)
// ===============================
export const sendChatMessage = async (message, sessionId = null, language = 'English') => {
  return getAIChat({
    message,
    sessionId,
    language,
    context: 'chat'
  });
};

// ===============================
// ✅ GET RECOMMENDATIONS BY INTERESTS
// ===============================
export const getRecommendationsByInterests = async (interests, limit = 10, sessionId = null) => {
  return getAIRecommendations({
    query: interests.join(' '),
    limit,
    sessionId
  });
};

// ===============================
// ✅ GET ACTIVE SESSIONS (Admin)
// ===============================
export const getActiveSessions = async (params = {}) => {
  try {
    const token = localStorage.getItem('token');
    
    const response = await axios.get(
      `${API_URL}/ai/sessions`,
      {
        params: {
          limit: params.limit || 100,
          page: params.page || 1
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeout: 10000
      }
    );
    return response.data;
  } catch (error) {
    console.error('❌ Get Active Sessions error:', error);
    throw error;
  }
};

// ===============================
// ✅ CONTINUE CONVERSATION (Helper)
// ===============================
export const continueConversation = async (message, sessionId, language = 'English') => {
  if (!sessionId) {
    return getAIChat({
      message,
      language,
      context: 'chat'
    });
  }
  
  return getAIChatWithSession({
    message,
    sessionId,
    language,
    context: 'chat'
  });
};

// ===============================
// ✅ EXPORT ALL
// ===============================
export default {
  getAIChat,
  getAIChatWithSession,
  getChatHistory,
  clearChatHistory,
  generateTripPlan,
  getAIRecommendations,
  searchExperiences,
  getTrendingExperiences,
  getFeaturedExperiences,
  getAISuggestions,
  getAIProviderInfo,
  switchAIProvider,
  generateItinerary,
  getTravelInsights,
  sendChatMessage,
  getRecommendationsByInterests,
  getActiveSessions,
  continueConversation,
  // Helpers
  normalizeAIResponse,
  handleAPIError
};