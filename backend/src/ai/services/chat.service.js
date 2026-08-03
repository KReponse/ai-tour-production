// backend/src/ai/services/chat.service.js
// ✅ COMPLETE FIXED - Full conversation memory with session persistence
// ✅ FIXED - ES Module imports

import aiProvider from '../providers/providerInterface.js';
import chatPrompt from '../prompts/chat.prompt.js';
import systemPrompt from '../prompts/system.prompt.js';
import Listing from '../../models/Listing.js';
import ChatSession from '../../models/ChatSession.js'; // ✅ Now works with ES Module
import { transformToExperiences } from '../utils/experienceTransformer.js';
import aiCache from '../utils/aiCache.js';
import { detectIntent, determineFollowUp, extractEntities } from '../utils/intentDetector.js';
import { buildChatPrompt, buildFollowUpPrompt } from '../utils/promptBuilder.js';

class ChatService {
  constructor() {
    // In-memory cache for active sessions (for performance)
    this.sessionCache = new Map();
    this.sessionTimeout = 30 * 60 * 1000; // 30 minutes
    this.MAX_HISTORY = 10; // Keep last 10 messages for context
    this.cacheEnabled = process.env.AI_CACHE_ENABLED !== 'false';
    
    console.log('🤖 Chat Service initialized with session management');
    console.log(`📦 Cache ${this.cacheEnabled ? 'enabled' : 'disabled'}`);
    console.log(`📋 Max history: ${this.MAX_HISTORY} messages`);
  }

  /**
   * ✅ Get or create a session with MongoDB persistence
   */
  async getOrCreateSession(sessionId, userId, userLocation = 'Rwanda') {
    // Check in-memory cache first
    if (sessionId && this.sessionCache.has(sessionId)) {
      const cached = this.sessionCache.get(sessionId);
      // Check if session is still valid
      if (Date.now() - cached.lastActivity < this.sessionTimeout) {
        cached.lastActivity = Date.now();
        console.log(`📌 Using cached session: ${sessionId}`);
        return cached;
      } else {
        // Session expired, remove from cache
        this.sessionCache.delete(sessionId);
      }
    }

    // Try to find existing session in MongoDB
    let session = null;
    if (sessionId) {
      try {
        const found = await ChatSession.findOne({ 
          id: sessionId, 
          isActive: true 
        });
        if (found) {
          session = found.toObject();
          console.log(`📌 Found existing session in DB: ${sessionId}`);
        }
      } catch (error) {
        console.warn('⚠️ Error fetching session from DB:', error.message);
      }
    }

    // If no session found, create new one
    if (!session) {
      const newSessionId = sessionId || `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      const sessionData = {
        id: newSessionId,
        userId: userId || 'guest',
        userLocation: userLocation || 'Rwanda',
        messages: [],
        context: {
          location: userLocation || 'Rwanda',
          lastIntent: null,
          lastSearch: null,
          lastResults: []
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        lastMessage: null,
        lastResponse: null,
        lastIntent: null,
        isActive: true
      };

      try {
        // Save to MongoDB
        const newSession = new ChatSession(sessionData);
        await newSession.save();
        session = sessionData;
        console.log(`✅ New session created: ${newSessionId}`);
      } catch (error) {
        console.error('❌ Error creating session in DB:', error);
        // Fallback to in-memory only
        session = sessionData;
      }
    }

    // Cache in memory
    this.sessionCache.set(session.id, {
      ...session,
      lastActivity: Date.now()
    });

    return session;
  }

  /**
   * ✅ Add message to session history
   */
  async addMessageToSession(sessionId, message) {
    try {
      // Update cache
      if (this.sessionCache.has(sessionId)) {
        const cached = this.sessionCache.get(sessionId);
        cached.messages.push({
          ...message,
          timestamp: message.timestamp || new Date()
        });
        // Keep only last MAX_HISTORY messages
        if (cached.messages.length > this.MAX_HISTORY * 2) {
          cached.messages = cached.messages.slice(-this.MAX_HISTORY * 2);
        }
        cached.lastActivity = Date.now();
        if (message.role === 'user') {
          cached.lastMessage = message.content;
        } else if (message.role === 'assistant') {
          cached.lastResponse = message.content;
        }
        this.sessionCache.set(sessionId, cached);
      }

      // Update MongoDB
      await ChatSession.findOneAndUpdate(
        { id: sessionId },
        {
          $push: { 
            messages: {
              ...message,
              timestamp: message.timestamp || new Date()
            }
          },
          $set: {
            updatedAt: new Date(),
            lastMessage: message.role === 'user' ? message.content : undefined,
            lastResponse: message.role === 'assistant' ? message.content : undefined
          }
        },
        { new: true }
      );

      console.log(`✅ Message added to session: ${sessionId}`);
    } catch (error) {
      console.error('❌ Error adding message to session:', error);
      // Don't throw, just log
    }
  }

  /**
   * ✅ Get conversation history
   */
  async getConversationHistory(sessionId, limit = 10) {
    try {
      // Check cache first
      if (this.sessionCache.has(sessionId)) {
        const cached = this.sessionCache.get(sessionId);
        const messages = cached.messages || [];
        return messages.slice(-limit);
      }

      // Get from MongoDB
      const session = await ChatSession.findOne({ id: sessionId });
      if (!session) {
        return [];
      }

      const messages = session.messages || [];
      return messages.slice(-limit);
    } catch (error) {
      console.error('❌ Error getting history:', error);
      return [];
    }
  }

  /**
   * ✅ Update session context
   */
  async updateSessionContext(sessionId, context) {
    try {
      // Update cache
      if (this.sessionCache.has(sessionId)) {
        const cached = this.sessionCache.get(sessionId);
        cached.context = { ...cached.context, ...context };
        cached.lastActivity = Date.now();
        this.sessionCache.set(sessionId, cached);
      }

      // Update MongoDB
      await ChatSession.findOneAndUpdate(
        { id: sessionId },
        {
          $set: {
            context: context,
            updatedAt: new Date()
          }
        }
      );

      console.log(`✅ Session context updated: ${sessionId}`);
    } catch (error) {
      console.error('❌ Error updating session context:', error);
    }
  }

  /**
   * ✅ Main sendMessage method with full conversation memory
   */
  async sendMessage(params) {
    const startTime = Date.now();
    
    try {
      const {
        message,
        sessionId,
        userId,
        userContext = {},
        language = 'en',
        chatHistory = [],
        userLocation = 'Rwanda'
      } = params;

      console.log('📤 Chat Service: Processing message...');
      console.log(`📌 Session: ${sessionId || 'new'}, User: ${userId || 'guest'}`);
      console.log(`📌 Message: ${message.substring(0, 50)}...`);

      // ✅ Get or create session with persistence
      const session = await this.getOrCreateSession(sessionId, userId, userLocation);
      console.log(`📌 Session ID: ${session.id}, Messages: ${session.messages?.length || 0}`);

      // ✅ Add user message to history
      await this.addMessageToSession(session.id, {
        role: 'user',
        content: message,
        timestamp: new Date()
      });

      // ✅ Get conversation history
      const history = await this.getConversationHistory(session.id, this.MAX_HISTORY);
      console.log(`📌 Retrieved ${history.length} messages from history`);

      // ✅ Detect intent with context
      const intentResult = detectIntent(message, history);
      const intent = intentResult.intent;
      const isFollowUp = intentResult.isFollowUp || determineFollowUp(message, history);
      const entities = intentResult.entities || extractEntities(message, intent);

      console.log(`📌 Intent detected: ${intent} (follow-up: ${isFollowUp})`);

      // ✅ Check cache (only for non-follow-up queries)
      let cachedResponse = null;
      if (this.cacheEnabled && !isFollowUp) {
        try {
          const cacheKey = aiCache.getKey({ 
            message, 
            intent, 
            language, 
            userContext 
          });
          cachedResponse = aiCache.get(cacheKey);
          if (cachedResponse) {
            console.log('📦 Using cached response');
            return {
              ...cachedResponse,
              cached: true,
              sessionId: session.id,
              responseTime: Date.now() - startTime
            };
          }
        } catch (cacheError) {
          console.warn('⚠️ Cache error:', cacheError.message);
        }
      }

      let response;
      let searchResults = [];
      let experiences = [];

      // ✅ Handle based on intent and follow-up status
      if (isFollowUp && history.length > 0) {
        console.log('📌 Processing as follow-up question');
        
        // Use context from previous messages
        const lastAssistantMsg = history.filter(m => m.role === 'assistant').pop();
        const lastUserMsg = history.filter(m => m.role === 'user').pop();

        // Build follow-up prompt
        const followUpPrompt = buildFollowUpPrompt({
          message,
          history,
          context: session.context || {},
          lastIntent: session.context?.lastIntent || intent,
          lastResults: session.context?.lastResults || []
        });

        // Get AI response with context
        const aiResponse = await this.getAIResponse(followUpPrompt, history);
        
        response = {
          reply: aiResponse.content,
          fallback: aiResponse.fallback || false,
          experiences: session.context?.lastResults?.slice(0, 5) || [],
          intent: session.context?.lastIntent || intent,
          totalResults: session.context?.lastResults?.length || 0,
          isFollowUp: true
        };

        // Use previous search results
        experiences = session.context?.lastResults?.slice(0, 5) || [];

      } else {
        console.log('📌 Processing as new topic');

        // ✅ Search Listings
        searchResults = await this.searchListingsByIntent(message, intent, userContext);
        console.log(`📌 Found ${searchResults.length} relevant listings`);

        // ✅ Transform Listings to Experiences
        experiences = transformToExperiences(searchResults);
        console.log(`📌 Transformed ${experiences.length} listings to experiences`);

        // ✅ Get user context from database
        const enrichedContext = await this.enrichUserContext(userId, userContext);

        // ✅ Build enhanced prompt
        const userPrompt = buildChatPrompt({
          message,
          intent,
          entities,
          experiences: experiences.slice(0, 5),
          history: history.slice(-5),
          userLocation: session.context?.location || userLocation,
          isFollowUp: false
        });

        // ✅ Get AI response
        const aiResponse = await this.getAIResponse(userPrompt, history);
        
        response = {
          reply: aiResponse.content,
          fallback: aiResponse.fallback || false,
          experiences: experiences.slice(0, 5),
          intent: intent,
          totalResults: searchResults.length,
          isFollowUp: false
        };
      }

      // ✅ Extract quick replies
      const quickReplies = this.getQuickReplies(intent, isFollowUp);

      // ✅ Format final response
      const formattedResponse = {
        success: true,
        reply: response.reply,
        experiences: response.experiences || experiences.slice(0, 5),
        intent: response.intent || intent,
        totalResults: response.totalResults || searchResults.length,
        fallback: response.fallback || false,
        sessionId: session.id,
        isNewSession: !sessionId,
        isFollowUp: isFollowUp,
        quickReplies: quickReplies,
        responseTime: Date.now() - startTime,
        provider: aiProvider.getProviderInfo ? aiProvider.getProviderInfo() : 'gemini'
      };

      // ✅ Add AI response to history
      await this.addMessageToSession(session.id, {
        role: 'assistant',
        content: formattedResponse.reply,
        timestamp: new Date(),
        metadata: {
          intent: formattedResponse.intent,
          isFollowUp: isFollowUp,
          experiences: formattedResponse.experiences.slice(0, 3)
        }
      });

      // ✅ Update session context
      const newContext = {
        ...session.context,
        lastIntent: intent,
        lastSearch: message,
        lastResults: searchResults.length > 0 ? searchResults.slice(0, 5) : (session.context?.lastResults || []),
        location: entities.location || session.context?.location || userLocation,
        isFollowUp: isFollowUp
      };
      await this.updateSessionContext(session.id, newContext);

      // ✅ Cache response if not fallback
      if (this.cacheEnabled && !response.fallback && !isFollowUp) {
        try {
          const cacheKey = aiCache.getKey({ message, intent, language, userContext });
          aiCache.set(cacheKey, formattedResponse);
        } catch (cacheError) {
          console.warn('⚠️ Cache set error:', cacheError.message);
        }
      }

      console.log(`📥 Chat Service: Response generated in ${formattedResponse.responseTime}ms`);

      return formattedResponse;

    } catch (error) {
      console.error('❌ Chat Service Error:', error);
      return {
        success: false,
        reply: this.getFallbackResponse(params.message, params.language),
        fallback: true,
        error: error.message,
        sessionId: sessionId || null,
        responseTime: Date.now() - startTime
      };
    }
  }

  /**
   * ✅ Get AI response with provider
   */
  async getAIResponse(prompt, history) {
    try {
      // Build system prompt
      const systemPromptText = systemPrompt.build ? systemPrompt.build() : systemPrompt.base;

      // Build messages with history
      const messages = [
        { role: 'system', content: systemPromptText }
      ];

      // Add recent history (last 5 messages)
      if (history && history.length > 0) {
        const recentHistory = history.slice(-5);
        for (const msg of recentHistory) {
          messages.push({
            role: msg.role,
            content: msg.content
          });
        }
      }

      // Add current prompt
      messages.push({ role: 'user', content: prompt });

      // Get AI response
      const response = await aiProvider.chat(messages, {
        temperature: 0.7,
        maxTokens: 800
      });

      return {
        content: response.content || response,
        fallback: false
      };

    } catch (error) {
      console.error('❌ AI Provider error:', error);
      return {
        content: this.getFallbackResponse(prompt, 'en'),
        fallback: true
      };
    }
  }

  /**
   * ✅ Get quick replies based on intent and context
   */
  getQuickReplies(intent, isFollowUp = false) {
    const replies = {
      plan: [
        'Show me popular tours',
        'What activities are available?',
        'When should I visit?',
        'Plan a 3-day itinerary'
      ],
      location: [
        'What\'s the best time to visit?',
        'What activities are there?',
        'How do I get there?',
        'Where to stay?'
      ],
      experience: [
        'Tell me more about this',
        'Is it suitable for families?',
        'What\'s included in the price?',
        'How long does it take?'
      ],
      booking: [
        'How do I book?',
        'What\'s the cancellation policy?',
        'Are there group discounts?',
        'Can I customize?'
      ],
      price: [
        'What\'s included in the price?',
        'Are there extra fees?',
        'Do you offer group discounts?',
        'Is there a payment plan?'
      ],
      time: [
        'What\'s the weather like?',
        'What should I pack?',
        'Are there any festivals?',
        'Is it crowded?'
      ],
      general: [
        'Show me tours in Rwanda',
        'What is the best time to visit?',
        'Tell me about the culture',
        'What activities are available?',
        'Help me plan a trip'
      ]
    };

    // If follow-up, show continuation suggestions
    if (isFollowUp) {
      return [
        'Tell me more',
        'What else?',
        'Can you elaborate?',
        'Is there more?'
      ];
    }

    return replies[intent] || replies.general;
  }

  // ... (rest of the methods remain the same: searchListingsByIntent, extractKeywords, scoreAndRankListings, enrichUserContext, getFallbackResponse, cleanupSessions, getSessionHistory, clearSessionHistory)

  /**
   * ✅ Search Listings by intent with enhanced matching
   */
  async searchListingsByIntent(message, intent, userContext) {
    const keywords = this.extractKeywords(message);
    
    // If no keywords, return featured listings
    if (keywords.length === 0) {
      const defaultListings = await Listing.find({ 
        status: 'approved',
        isFeatured: true
      })
      .populate('provider', 'name businessName avatar')
      .limit(5)
      .lean();
      
      return defaultListings;
    }
    
    // Build search query with broader matching
    let searchQuery = {
      status: 'approved',
      $or: [
        { title: { $regex: keywords.join('|'), $options: 'i' } },
        { location: { $regex: keywords.join('|'), $options: 'i' } },
        { description: { $regex: keywords.join('|'), $options: 'i' } },
        { businessType: { $regex: keywords.join('|'), $options: 'i' } },
        { tags: { $in: keywords.map(k => new RegExp(k, 'i')) } },
        { category: { $regex: keywords.join('|'), $options: 'i' } }
      ]
    };

    // Apply intent-specific filters
    if (intent === 'booking' || intent === 'plan') {
      searchQuery.status = 'approved';
    }

    if (intent === 'experience' || intent === 'recommend') {
      searchQuery.$or.push({ averageRating: { $gte: 3.5 } });
    }

    // If intent is 'location', boost location search
    if (intent === 'location') {
      searchQuery.$or = [
        { location: { $regex: keywords.join('|'), $options: 'i' } },
        { title: { $regex: keywords.join('|'), $options: 'i' } },
        { description: { $regex: keywords.join('|'), $options: 'i' } }
      ];
    }

    // Fetch listings from database
    let listings = await Listing.find(searchQuery)
      .populate('provider', 'name businessName avatar')
      .lean();

    // If no results found, try broader search
    if (listings.length === 0 && keywords.length > 0) {
      console.log('🔍 No exact matches, trying broader search...');
      
      const broadQuery = {
        status: 'approved',
        $or: keywords.map(k => ({
          $or: [
            { title: { $regex: k, $options: 'i' } },
            { location: { $regex: k, $options: 'i' } },
            { description: { $regex: k, $options: 'i' } },
            { businessType: { $regex: k, $options: 'i' } }
          ]
        }))
      };
      
      listings = await Listing.find(broadQuery)
        .populate('provider', 'name businessName avatar')
        .lean();
    }

    // If STILL no results, return featured listings
    if (listings.length === 0) {
      console.log('🔍 No results found, returning featured listings...');
      listings = await Listing.find({ 
        status: 'approved',
        isFeatured: true
      })
      .populate('provider', 'name businessName avatar')
      .limit(5)
      .lean();
    }

    // Score and rank listings
    listings = this.scoreAndRankListings(listings, message, userContext);

    // Apply limit
    return listings.slice(0, 15);
  }

  /**
   * ✅ Extract keywords from message
   */
  extractKeywords(message) {
    const stopWords = ['the', 'a', 'an', 'for', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'of', 'from', 'up', 'down', 'off', 'over', 'under', 'so', 'very', 'too', 'much', 'more', 'most', 'some', 'any', 'such', 'my', 'your', 'our', 'their', 'please', 'want', 'need', 'looking', 'find', 'help', 'can', 'will', 'would', 'could', 'should', 'yes', 'no', 'okay', 'ok', 'sure', 'yeah', 'yep', 'nope', 'nah', 'maybe', 'perhaps'];
    
    const words = message.toLowerCase()
      .replace(/[^a-zA-Z\s]/g, '')
      .split(' ')
      .filter(w => w.length > 2 && !stopWords.includes(w));
    
    return [...new Set(words)];
  }

  /**
   * ✅ Score and rank listings
   */
  scoreAndRankListings(listings, message, userContext) {
    const keywords = this.extractKeywords(message);
    
    return listings.map(listing => {
      let score = 0;
      
      // Title match (highest weight)
      const titleWords = listing.title?.toLowerCase().split(' ') || [];
      const titleMatches = keywords.filter(k => titleWords.some(w => w.includes(k)));
      score += titleMatches.length * 10;
      
      // Location match
      const locationWords = listing.location?.toLowerCase().split(' ') || [];
      const locationMatches = keywords.filter(k => locationWords.some(w => w.includes(k)));
      score += locationMatches.length * 5;
      
      // Business Type match
      const businessType = listing.businessType?.toLowerCase() || '';
      const typeMatches = keywords.filter(k => businessType.includes(k));
      score += typeMatches.length * 3;
      
      // Rating bonus
      if (listing.averageRating) {
        score += (listing.averageRating - 3) * 2;
      }
      
      // Reviews bonus
      if (listing.totalReviews && listing.totalReviews > 10) {
        score += Math.min(listing.totalReviews / 100, 5);
      }
      
      // Price relevance
      if (keywords.some(k => ['budget', 'cheap', 'affordable', 'cost', 'price', 'expensive', 'luxury'].includes(k))) {
        const isBudget = ['budget', 'cheap', 'affordable'].some(k => keywords.includes(k));
        const isLuxury = ['luxury', 'expensive', 'premium'].some(k => keywords.includes(k));
        
        if (isBudget && listing.price < 100) score += 5;
        if (isLuxury && listing.price > 300) score += 5;
      }
      
      // User preference bonus
      if (userContext?.interests) {
        const interestMatches = userContext.interests.filter(interest =>
          listing.tags?.some(tag => tag.toLowerCase().includes(interest.toLowerCase()))
        );
        score += interestMatches.length * 2;
      }
      
      // Location preference bonus
      if (userContext?.favoriteLocations) {
        const locationMatch = userContext.favoriteLocations.some(loc =>
          listing.location?.toLowerCase().includes(loc.toLowerCase())
        );
        if (locationMatch) score += 3;
      }
      
      return { ...listing, score };
    }).sort((a, b) => b.score - a.score);
  }

  /**
   * ✅ Enrich user context from database
   */
  async enrichUserContext(userId, context) {
    if (!userId) return context;

    try {
      const User = await import('../../models/User.js');
      const Booking = await import('../../models/Booking.js');

      const user = await User.default.findById(userId).select('name preferences');
      const bookings = await Booking.default.find({ user: userId, status: 'completed' })
        .populate('listing', 'title location businessType')
        .limit(10)
        .lean();

      const pastBookings = bookings.map(b => ({
        title: b.listing?.title || 'Unknown',
        location: b.listing?.location || 'Unknown',
        type: b.listing?.businessType || 'Unknown',
        date: b.startDate || b.createdAt
      }));

      const favoriteLocations = [...new Set(pastBookings.map(b => b.location).filter(Boolean))];
      const favoriteTypes = [...new Set(pastBookings.map(b => b.type).filter(Boolean))];

      return {
        ...context,
        name: user?.name || context.name,
        pastBookings,
        favoriteLocations,
        favoriteTypes,
        preferences: user?.preferences || context.interests || []
      };
    } catch (error) {
      console.warn('⚠️ Error enriching user context:', error.message);
      return context;
    }
  }

  /**
   * ✅ Get fallback response
   */
  getFallbackResponse(message, language = 'en') {
    const responses = {
      en: [
        "Thank you for your question! 🇷🇼 Please browse our experiences or contact our travel experts for personalized assistance.",
        "I appreciate your interest in Rwanda! 🌍 Explore our amazing experiences or reach out to our team for more information.",
        "Great question! ✨ Please visit our website to see all available experiences and book directly."
      ],
      fr: [
        "Merci pour votre question ! 🇷🇼 Veuillez parcourir nos expériences ou contacter nos experts en voyage.",
        "Je vous remercie de votre intérêt pour le Rwanda ! 🌍 Explorez nos expériences ou contactez notre équipe."
      ],
      rw: [
        "Murakoze kubaza! 🇷🇼 Reba ibyo ushobora gukora cyangwa uvuge nabashoboza kugutera inkunga."
      ],
      sw: [
        "Asante kwa swali lako! 🇷🇼 Tafadhali tembelea tovuti yetu kuona uzoefu wote na uweke nafasi moja kwa moja."
      ]
    };

    const langResponses = responses[language] || responses.en;
    
    // Check for specific keywords
    const lower = message?.toLowerCase() || '';
    if (lower.includes('kigali')) {
      return "Kigali is beautiful! 🌆 Don't miss the Genocide Memorial, local markets, and vibrant nightlife. Check out our Kigali experiences!";
    }
    if (lower.includes('gorilla') || lower.includes('gorillas')) {
      return "Gorilla trekking is unforgettable! 🦍 Contact us for availability and permits! Book your gorilla experience today!";
    }
    if (lower.includes('safari')) {
      return "Akagera offers incredible safari! 🐘 See the Big Five and amazing birdlife. Book your safari experience now!";
    }
    if (lower.includes('lake kivu')) {
      return "Lake Kivu is stunning! 🏖️ Perfect for boat tours, swimming, and relaxing sunsets. Explore Lake Kivu experiences!";
    }
    if (lower.includes('nyungwe')) {
      return "Nyungwe Forest is amazing! 🌿 Don't miss the canopy walk and chimpanzee trekking. Book your Nyungwe experience!";
    }

    return langResponses[Math.floor(Math.random() * langResponses.length)];
  }

  /**
   * ✅ Clean up expired sessions
   */
  async cleanupSessions() {
    const now = Date.now();
    let cleaned = 0;

    // Clean in-memory cache
    for (const [id, session] of this.sessionCache) {
      if (now - session.lastActivity > this.sessionTimeout) {
        this.sessionCache.delete(id);
        cleaned++;
      }
    }

    // Clean MongoDB sessions
    try {
      const expiryDate = new Date(now - this.sessionTimeout);
      const result = await ChatSession.updateMany(
        {
          isActive: true,
          updatedAt: { $lt: expiryDate }
        },
        {
          isActive: false,
          endedAt: new Date()
        }
      );
      cleaned += result.modifiedCount || 0;
    } catch (error) {
      console.error('❌ Error cleaning sessions in DB:', error);
    }

    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} expired sessions`);
    }
    return cleaned;
  }

  /**
   * ✅ Get session history
   */
  async getSessionHistory(sessionId) {
    try {
      const session = await ChatSession.findOne({ id: sessionId });
      if (!session) {
        return { success: false, error: 'Session not found' };
      }
      return {
        success: true,
        messages: session.messages || [],
        context: session.context || {}
      };
    } catch (error) {
      console.error('❌ Error getting session history:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ✅ Clear session history
   */
  async clearSessionHistory(sessionId) {
    try {
      // Clear cache
      if (this.sessionCache.has(sessionId)) {
        const cached = this.sessionCache.get(sessionId);
        cached.messages = [];
        cached.lastMessage = null;
        cached.lastResponse = null;
        cached.lastIntent = null;
        cached.lastActivity = Date.now();
        this.sessionCache.set(sessionId, cached);
      }

      // Clear MongoDB
      await ChatSession.findOneAndUpdate(
        { id: sessionId },
        {
          messages: [],
          lastMessage: null,
          lastResponse: null,
          lastIntent: null,
          updatedAt: new Date()
        }
      );

      console.log(`✅ Session history cleared: ${sessionId}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Error clearing session history:', error);
      return { success: false, error: error.message };
    }
  }
}

// Singleton instance
const chatService = new ChatService();

// Run cleanup every hour
setInterval(() => {
  chatService.cleanupSessions();
}, 60 * 60 * 1000);

export default chatService;