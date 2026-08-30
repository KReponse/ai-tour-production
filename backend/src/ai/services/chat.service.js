// backend/src/ai/services/chat.service.js
// ✅ COMPLETE FIXED - Enhanced with Traveler Profile integration
// ✅ ADDED: User preference loading for personalization
// ✅ ADDED: Behavioral context for better recommendations
// ✅ ADDED: Personalized response generation
// ✅ FIXED: Enhanced fallback responses with real listing data

import aiProvider from '../providers/providerInterface.js';
import systemPrompt from '../prompts/system.prompt.js';
import Listing from '../../models/Listing.js';
import ChatSession from '../../models/ChatSession.js';
import User from '../../models/User.js';
import { transformToExperiences } from '../utils/experienceTransformer.js';
import aiCache from '../utils/aiCache.js';
import { detectIntent, determineFollowUp, extractEntities } from '../utils/intentDetector.js';
import { buildChatPrompt, buildFollowUpPrompt } from '../utils/promptBuilder.js';
import responseFormatter from '../utils/responseFormatter.js';

// ===============================
// AI TOUR COLORS
// ===============================
// Teal  : #0D9488
// Gold  : #F59E0B
// Slate : #374151
// White : #FFFFFF
// ===============================

class ChatService {
  constructor() {
    this.sessionCache = new Map();
    this.sessionTimeout = 30 * 60 * 1000; // 30 minutes
    this.MAX_HISTORY = 2;
    this.cacheEnabled = process.env.AI_CACHE_ENABLED !== 'false';
    this.maxResults = 10;
    
    console.log('🤖 Chat Service initialized with session management');
    console.log(`📦 Cache ${this.cacheEnabled ? 'enabled' : 'disabled'}`);
    console.log(`📋 Max history: ${this.MAX_HISTORY} messages`);
    console.log(`📋 Max results: ${this.maxResults} listings`);
  }

  /**
   * ✅ Get or create a session with MongoDB persistence
   */
  async getOrCreateSession(sessionId, userId, userLocation = 'Rwanda') {
    // Check in-memory cache first
    if (sessionId && this.sessionCache.has(sessionId)) {
      const cached = this.sessionCache.get(sessionId);
      if (Date.now() - cached.lastActivity < this.sessionTimeout) {
        cached.lastActivity = Date.now();
        console.log(`📌 Using cached session: ${sessionId}`);
        return cached;
      } else {
        this.sessionCache.delete(sessionId);
      }
    }

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
          lastResults: [],
          userPreferences: null // ✅ Store user preferences here
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        lastMessage: null,
        lastResponse: null,
        lastIntent: null,
        isActive: true
      };

      try {
        const newSession = new ChatSession(sessionData);
        await newSession.save();
        session = sessionData;
        console.log(`✅ New session created: ${newSessionId}`);
      } catch (error) {
        console.error('❌ Error creating session in DB:', error);
        session = sessionData;
      }
    }

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
      if (this.sessionCache.has(sessionId)) {
        const cached = this.sessionCache.get(sessionId);
        cached.messages.push({
          ...message,
          timestamp: message.timestamp || new Date()
        });
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
    }
  }

  /**
   * ✅ Get conversation history
   */
  async getConversationHistory(sessionId, limit = 2) {
    try {
      if (this.sessionCache.has(sessionId)) {
        const cached = this.sessionCache.get(sessionId);
        const messages = cached.messages || [];
        return messages.slice(-limit);
      }

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
      if (this.sessionCache.has(sessionId)) {
        const cached = this.sessionCache.get(sessionId);
        cached.context = { ...cached.context, ...context };
        cached.lastActivity = Date.now();
        this.sessionCache.set(sessionId, cached);
      }

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
   * ✅ Load user preferences from database
   */
  async loadUserPreferences(userId) {
    if (!userId || userId === 'guest') {
      return null;
    }

    try {
      const user = await User.findById(userId)
        .select('preferences behavior name email')
        .lean();

      if (!user) {
        return null;
      }

      return {
        name: user.name,
        email: user.email,
        preferences: user.preferences || {},
        behavior: user.behavior || {},
        // ✅ Build personalization context
        personalization: {
          travelStyle: user.preferences?.travelStyle || 'balanced',
          budget: user.preferences?.budget || 'mid-range',
          interests: user.preferences?.interests || [],
          preferredDestinations: user.preferences?.preferredDestinations || [],
          visitedDestinations: user.preferences?.visitedDestinations || [],
          accommodation: user.preferences?.accommodation || 'mid-range',
          travelPace: user.preferences?.travelPace || 'moderate',
          favoriteCategories: user.behavior?.favoriteCategories || [],
          favoriteLocations: user.behavior?.favoriteLocations || [],
          engagementScore: user.behavior?.engagementScore || 50,
          totalBookings: user.behavior?.totalBookings || 0,
          averageRatingGiven: user.behavior?.averageRatingGiven || 0
        }
      };
    } catch (error) {
      console.error('❌ Error loading user preferences:', error);
      return null;
    }
  }

  /**
   * ✅ Main sendMessage method with full conversation memory
   */
  async sendMessage(params) {
    const startTime = Date.now();
    let activeSessionId = null;
    
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
      console.log(`📌 Message: ${message ? message.substring(0, 50) : '...'}`);

      // ✅ Get or create session
      const session = await this.getOrCreateSession(sessionId, userId, userLocation);
      activeSessionId = session.id;
      
      console.log(`📌 Session ID: ${session.id}, Messages: ${session.messages?.length || 0}`);

      // ✅ Load user preferences if not already in session
      let userPrefs = session.context?.userPreferences;
      if (!userPrefs && userId && userId !== 'guest') {
        userPrefs = await this.loadUserPreferences(userId);
        if (userPrefs) {
          await this.updateSessionContext(session.id, {
            ...session.context,
            userPreferences: userPrefs
          });
        }
      }

      // ✅ Add user message to history
      await this.addMessageToSession(session.id, {
        role: 'user',
        content: message || '',
        timestamp: new Date()
      });

      const history = await this.getConversationHistory(session.id, this.MAX_HISTORY);
      console.log(`📌 Retrieved ${history.length} messages from history`);

      // ✅ Detect intent with context
      const intentResult = detectIntent(message || '', history);
      const intent = intentResult.intent;
      const isFollowUp = intentResult.isFollowUp || determineFollowUp(message || '', history);
      const entities = intentResult.entities || extractEntities(message || '', intent);

      console.log(`📌 Intent detected: ${intent} (follow-up: ${isFollowUp})`);

      // ✅ Check cache
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
        
        const previousResults = session.context?.lastResults || [];
        const previousIntent = session.context?.lastIntent || intent;

        if (previousResults.length > 0) {
          const indexMatch = message ? message.match(/(\d+)/) : null;
          if (indexMatch) {
            const idx = parseInt(indexMatch[1]) - 1;
            if (idx >= 0 && idx < previousResults.length) {
              const specific = previousResults[idx];
              experiences = [specific];
              searchResults = [specific];
              
              const aiResponse = await this.getAIResponse(
                `The user is asking about "${specific.title}". Provide details about this experience. Include price, location, duration, and key highlights.`,
                history,
                userPrefs // ✅ Pass user preferences
              );
              
              response = {
                reply: aiResponse.content,
                fallback: aiResponse.fallback || false,
                experiences: [specific],
                totalResults: 1,
                intent: previousIntent,
                isFollowUp: true
              };
              
              return this.formatFinalResponse(response, session, startTime);
            }
          }

          const ordinalMap = {
            'first': 0,
            'second': 1,
            'third': 2,
            'fourth': 3,
            'fifth': 4,
            'last': previousResults.length - 1
          };
          const msgLower = message ? message.toLowerCase() : '';
          for (const [key, idx] of Object.entries(ordinalMap)) {
            if (msgLower.includes(key) && idx < previousResults.length) {
              const specific = previousResults[idx];
              experiences = [specific];
              searchResults = [specific];
              
              const aiResponse = await this.getAIResponse(
                `The user is asking about "${specific.title}". Provide a detailed overview of this experience.`,
                history,
                userPrefs
              );
              
              response = {
                reply: aiResponse.content,
                fallback: aiResponse.fallback || false,
                experiences: [specific],
                totalResults: 1,
                intent: previousIntent,
                isFollowUp: true
              };
              
              return this.formatFinalResponse(response, session, startTime);
            }
          }
        }

        const followUpPrompt = buildFollowUpPrompt({
          message: message || '',
          history,
          context: session.context || {},
          lastIntent: previousIntent,
          lastResults: previousResults.slice(0, 5),
          userPreferences: userPrefs // ✅ Pass user preferences
        });

        const aiResponse = await this.getAIResponse(followUpPrompt, history, userPrefs);
        
        response = {
          reply: aiResponse.content,
          fallback: aiResponse.fallback || false,
          experiences: previousResults.slice(0, 5),
          totalResults: previousResults.length,
          intent: previousIntent,
          isFollowUp: true
        };

        experiences = previousResults.slice(0, 5);

      } else {
        console.log('📌 Processing as new topic');

        // ✅ Enhanced search with user preferences
        const enhancedUserContext = {
          ...userContext,
          preferences: userPrefs?.personalization || {},
          favoriteLocations: userPrefs?.personalization?.favoriteLocations || [],
          interests: userPrefs?.personalization?.interests || []
        };

        searchResults = await this.searchListingsByIntent(message || '', intent, enhancedUserContext);
        console.log(`📌 Found ${searchResults.length} relevant listings`);

        experiences = transformToExperiences(searchResults);
        console.log(`📌 Transformed ${experiences.length} listings to experiences`);

        const enrichedContext = await this.enrichUserContext(userId, userContext);

        // ✅ Build enhanced prompt with user preferences
        const userPrompt = buildChatPrompt({
          message: message || '',
          intent,
          entities,
          experiences: experiences.slice(0, 5),
          history: history.slice(-2),
          userLocation: session.context?.location || userLocation,
          isFollowUp: false,
          userPreferences: userPrefs?.personalization || null // ✅ Pass user preferences
        });

        // ✅ Get AI response with user context
        const aiResponse = await this.getAIResponse(userPrompt, history, userPrefs);
        
        // ✅ If AI response is fallback but we have experiences, use enhanced fallback
        if (aiResponse.fallback && experiences.length > 0) {
          const fallbackMessage = this.buildEnhancedFallbackMessage(
            message || '', 
            experiences, 
            intent,
            userPrefs // ✅ Pass user preferences for personalization
          );
          response = {
            reply: fallbackMessage,
            fallback: true,
            experiences: experiences.slice(0, 5),
            totalResults: searchResults.length,
            intent: intent,
            isFollowUp: false
          };
        } else {
          response = {
            reply: aiResponse.content || this.buildEnhancedFallbackMessage(
              message || '', 
              experiences, 
              intent,
              userPrefs
            ),
            fallback: aiResponse.fallback || false,
            experiences: experiences.slice(0, 5),
            totalResults: searchResults.length,
            intent: intent,
            isFollowUp: false
          };
        }
      }

      const formattedResponse = this.formatFinalResponse(response, session, startTime);

      // ✅ Add AI response to history with metadata
      await this.addMessageToSession(session.id, {
        role: 'assistant',
        content: formattedResponse.reply,
        timestamp: new Date(),
        metadata: {
          intent: formattedResponse.intent,
          isFollowUp: isFollowUp,
          experiences: formattedResponse.experiences.slice(0, 3),
          userPreferencesApplied: !!userPrefs
        }
      });

      // ✅ Update session context with user preferences
      const newContext = {
        ...session.context,
        lastIntent: intent,
        lastSearch: message,
        lastResults: searchResults.length > 0 ? searchResults.slice(0, 5) : (session.context?.lastResults || []),
        location: entities.location || session.context?.location || userLocation,
        isFollowUp: isFollowUp,
        userPreferences: userPrefs || session.context?.userPreferences
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
      const finalSessionId = activeSessionId || params?.sessionId || null;
      
      return {
        success: false,
        reply: this.getFallbackResponse(params?.message, params?.language || 'en'),
        fallback: true,
        error: error.message,
        sessionId: finalSessionId,
        responseTime: Date.now() - startTime
      };
    }
  }

  /**
   * ✅ Build ENHANCED fallback message with real listing data and personalization
   */
  buildEnhancedFallbackMessage(message, experiences, intent, userPrefs = null) {
    const count = experiences.length;
    let msg = "";
    
    // ✅ Personalize the introduction
    const userName = userPrefs?.name || 'Traveler';
    const travelStyle = userPrefs?.personalization?.travelStyle || 'balanced';
    
    // ✅ Intent-specific fallback messages with real data
    if (intent === 'price') {
      msg = `Hi ${userName}! Here are the prices for experiences in Rwanda that match your ${travelStyle} travel style:\n\n`;
      experiences.slice(0, 5).forEach((exp, i) => {
        msg += `${i + 1}. **${exp.title}**\n`;
        msg += `   💰 Price: $${exp.price} ${exp.currency || 'USD'}\n`;
        msg += `   📍 ${exp.location}\n`;
        if (exp.duration) {
          msg += `   ⏱️ Duration: ${exp.duration}\n`;
        }
        if (exp.rating > 0) {
          msg += `   ⭐ Rating: ${exp.rating}\n`;
        }
        msg += `   🔗 View: /listing/${exp.id}\n\n`;
      });
      msg += "Would you like me to help you book any of these experiences?";
    } else if (intent === 'plan') {
      msg = `Hi ${userName}! I found these experiences for your trip planning based on your ${travelStyle} preferences:\n\n`;
      experiences.slice(0, 5).forEach((exp, i) => {
        msg += `${i + 1}. **${exp.title}**\n`;
        msg += `   📍 ${exp.location}\n`;
        msg += `   💰 $${exp.price} ${exp.currency || 'USD'}\n`;
        if (exp.duration) {
          msg += `   ⏱️ ${exp.duration}\n`;
        }
        msg += `   🔗 View: /listing/${exp.id}\n\n`;
      });
      msg += "Tell me which experience interests you, and I'll help you plan!";
    } else if (intent === 'location') {
      msg = `Hi ${userName}! Here are experiences in beautiful Rwanda that match your interests:\n\n`;
      experiences.slice(0, 5).forEach((exp, i) => {
        msg += `${i + 1}. **${exp.title}**\n`;
        msg += `   📍 ${exp.location}\n`;
        msg += `   💰 $${exp.price} ${exp.currency || 'USD'}\n`;
        if (exp.duration) {
          msg += `   ⏱️ ${exp.duration}\n`;
        }
        msg += `   🔗 View: /listing/${exp.id}\n\n`;
      });
      msg += "Would you like more details about any of these places?";
    } else if (intent === 'experience' || intent === 'recommend') {
      msg = `Hi ${userName}! Based on your ${travelStyle} travel style, I found these amazing experiences in Rwanda:\n\n`;
      experiences.slice(0, 5).forEach((exp, i) => {
        msg += `${i + 1}. **${exp.title}**\n`;
        msg += `   📍 ${exp.location}\n`;
        msg += `   💰 $${exp.price} ${exp.currency || 'USD'}\n`;
        if (exp.duration) {
          msg += `   ⏱️ ${exp.duration}\n`;
        }
        if (exp.rating > 0) {
          msg += `   ⭐ ${exp.rating}\n`;
        }
        msg += `   🔗 View: /listing/${exp.id}\n\n`;
      });
      msg += "Which experience catches your eye?";
    } else {
      msg = `Hi ${userName}! I found some great experiences in Rwanda that align with your ${travelStyle} preferences:\n\n`;
      experiences.slice(0, 5).forEach((exp, i) => {
        msg += `${i + 1}. **${exp.title}**\n`;
        msg += `   📍 ${exp.location}\n`;
        msg += `   💰 $${exp.price} ${exp.currency || 'USD'}\n`;
        msg += `   🔗 View: /listing/${exp.id}\n\n`;
      });
      msg += "Let me know if you'd like more information about any of these!";
    }
    
    return msg;
  }

  /**
   * ✅ Get AI response with provider and user context
   */
  async getAIResponse(prompt, history, userPrefs = null) {
    try {
      let systemPromptText = systemPrompt.base || systemPrompt;

      // ✅ Inject user preferences into system prompt if available
      if (userPrefs?.personalization) {
        const prefs = userPrefs.personalization;
        const contextBlock = `
User Context:
- Name: ${userPrefs.name || 'Traveler'}
- Travel Style: ${prefs.travelStyle || 'balanced'}
- Budget: ${prefs.budget || 'mid-range'}
- Interests: ${(prefs.interests || []).join(', ') || 'General'}
- Preferred Destinations: ${(prefs.preferredDestinations || []).join(', ') || 'Rwanda'}
- Travel Pace: ${prefs.travelPace || 'moderate'}
- Total Bookings: ${prefs.totalBookings || 0}
- Engagement Score: ${prefs.engagementScore || 50}/100

Use this context to personalize your responses.`;
        
        systemPromptText = `${systemPromptText}\n\n${contextBlock}`;
      }

      const messages = [
        { role: 'system', content: systemPromptText }
      ];

      if (history && history.length > 0) {
        const recentHistory = history.slice(-2);
        for (const msg of recentHistory) {
          messages.push({
            role: msg.role,
            content: msg.content
          });
        }
      }

      messages.push({ role: 'user', content: prompt });

      const response = await aiProvider.chat(messages, {
        temperature: 0.7,
        maxTokens: 500
      });

      return {
        content: response.content || response,
        fallback: false
      };

    } catch (error) {
      console.error('❌ AI Provider error:', error);
      return {
        content: null,
        fallback: true
      };
    }
  }

  /**
   * ✅ Format final response
   */
  formatFinalResponse(response, session, startTime) {
    const quickReplies = this.getQuickReplies(response.intent || 'general', response.isFollowUp || false);
    
    return {
      success: true,
      reply: response.reply,
      experiences: response.experiences || [],
      intent: response.intent || 'general',
      totalResults: response.totalResults || 0,
      fallback: response.fallback || false,
      sessionId: session.id,
      isNewSession: !session.id || session.messages?.length === 0,
      isFollowUp: response.isFollowUp || false,
      quickReplies: quickReplies,
      responseTime: Date.now() - startTime,
      provider: aiProvider.getProviderInfo ? aiProvider.getProviderInfo() : 'gemini'
    };
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
        "What's the best time to visit?",
        'What activities are there?',
        'How do I get there?',
        'Where to stay?'
      ],
      experience: [
        'Tell me more about this',
        'Is it suitable for families?',
        "What's included in the price?",
        'How long does it take?'
      ],
      booking: [
        'How do I book?',
        "What's the cancellation policy?",
        'Are there group discounts?',
        'Can I customize?'
      ],
      price: [
        "What's included in the price?",
        'Are there extra fees?',
        'Do you offer group discounts?',
        'Is there a payment plan?'
      ],
      time: [
        "What's the weather like?",
        'What should I pack?',
        'Are there any festivals?',
        'Is it crowded?'
      ],
      details: [
        'Tell me more',
        "What's included?",
        'How long is it?',
        'What should I bring?'
      ],
      compare: [
        'Which one is cheaper?',
        "What's the difference?",
        'Which is more popular?',
        'Which is shorter?'
      ],
      general: [
        'Show me tours in Rwanda',
        'What is the best time to visit?',
        'Tell me about the culture',
        'What activities are available?',
        'Help me plan a trip'
      ]
    };

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

  /**
   * ✅ Search Listings by intent with enhanced matching
   */
  async searchListingsByIntent(message, intent, userContext) {
    const keywords = this.extractKeywords(message);
    
    // ✅ Incorporate user preferences into search
    const userInterests = userContext?.interests || userContext?.preferences?.interests || [];
    const favoriteLocations = userContext?.favoriteLocations || userContext?.preferences?.favoriteLocations || [];
    
    if (keywords.length === 0) {
      // ✅ If no keywords, use featured listings + user preferences
      let query = { 
        status: 'approved',
        isFeatured: true
      };
      
      // Add user preference filters
      if (favoriteLocations.length > 0) {
        query.location = { $in: favoriteLocations.map(l => new RegExp(l, 'i')) };
      }
      
      const defaultListings = await Listing.find(query)
        .populate('provider', 'name businessName avatar')
        .limit(5)
        .lean();
      
      return defaultListings;
    }
    
    // ✅ Build search query with keywords and user preferences
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

    // ✅ Add user preference filters
    if (favoriteLocations.length > 0) {
      // Boost location match
      searchQuery.$or.push({ location: { $in: favoriteLocations.map(l => new RegExp(l, 'i')) } });
    }

    // ✅ Apply intent-specific filters
    if (intent === 'booking' || intent === 'plan') {
      searchQuery.status = 'approved';
    }

    if (intent === 'experience' || intent === 'recommend') {
      searchQuery.$or.push({ averageRating: { $gte: 3.5 } });
    }

    if (intent === 'location') {
      searchQuery.$or = [
        { location: { $regex: keywords.join('|'), $options: 'i' } },
        { title: { $regex: keywords.join('|'), $options: 'i' } },
        { description: { $regex: keywords.join('|'), $options: 'i' } }
      ];
    }

    let listings = await Listing.find(searchQuery)
      .populate('provider', 'name businessName avatar')
      .lean();

    // ✅ If no results, try broader search
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

    // ✅ If STILL no results, return featured listings with personalization
    if (listings.length === 0) {
      console.log('🔍 No results found, returning personalized featured listings...');
      const fallbackQuery = { 
        status: 'approved',
        isFeatured: true
      };
      
      if (favoriteLocations.length > 0) {
        fallbackQuery.location = { $in: favoriteLocations.map(l => new RegExp(l, 'i')) };
      }
      
      listings = await Listing.find(fallbackQuery)
        .populate('provider', 'name businessName avatar')
        .limit(5)
        .lean();
    }

    // ✅ Score and rank listings with user preferences
    listings = this.scoreAndRankListings(listings, message, userContext);

    return listings.slice(0, this.maxResults);
  }

  /**
   * ✅ Score and rank listings with user preferences
   */
  scoreAndRankListings(listings, message, userContext) {
    const keywords = this.extractKeywords(message);
    const userInterests = userContext?.interests || userContext?.preferences?.interests || [];
    const favoriteLocations = userContext?.favoriteLocations || userContext?.preferences?.favoriteLocations || [];
    const travelStyle = userContext?.preferences?.travelStyle || 'balanced';
    const budget = userContext?.preferences?.budget || 'mid-range';
    
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
      
      // ✅ User favorite location bonus
      if (favoriteLocations.some(loc => listing.location?.toLowerCase().includes(loc.toLowerCase()))) {
        score += 8;
      }
      
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
      
      // ✅ User interest bonus
      if (userInterests.length > 0) {
        const interestMatches = userInterests.filter(interest =>
          listing.tags?.some(tag => tag.toLowerCase().includes(interest.toLowerCase())) ||
          listing.category?.toLowerCase().includes(interest.toLowerCase()) ||
          listing.title?.toLowerCase().includes(interest.toLowerCase())
        );
        score += interestMatches.length * 4;
      }
      
      // ✅ Travel style match
      const styleKeywords = {
        adventure: ['adventure', 'trekking', 'hiking', 'wildlife', 'safari', 'explore'],
        cultural: ['culture', 'history', 'museum', 'heritage', 'local', 'traditional'],
        relaxation: ['relax', 'spa', 'wellness', 'peaceful', 'scenic', 'beach'],
        luxury: ['luxury', 'premium', 'exclusive', '5-star', 'vip', 'private'],
        budget: ['budget', 'affordable', 'cheap', 'value', 'economical'],
        family: ['family', 'kids', 'children', 'family-friendly', 'group'],
        romantic: ['romantic', 'couples', 'honeymoon', 'intimate']
      };
      
      const styleWords = styleKeywords[travelStyle] || [];
      const styleMatches = styleWords.filter(word =>
        listing.title?.toLowerCase().includes(word) ||
        listing.description?.toLowerCase().includes(word) ||
        listing.tags?.some(tag => tag.toLowerCase().includes(word))
      );
      score += styleMatches.length * 3;
      
      // ✅ Budget compatibility
      const price = listing.price || 0;
      const budgetRanges = {
        budget: [0, 100],
        'mid-range': [50, 300],
        premium: [200, 600],
        luxury: [400, 9999]
      };
      const range = budgetRanges[budget] || budgetRanges['mid-range'];
      if (price >= range[0] && price <= range[1]) {
        score += 10;
      } else if (price < range[0]) {
        score += 3; // Too cheap but might be good
      } else if (price > range[1]) {
        score += 1; // Too expensive but might be worth it
      }
      
      // Price relevance
      if (keywords.some(k => ['budget', 'cheap', 'affordable', 'cost', 'price', 'expensive', 'luxury'].includes(k))) {
        const isBudget = ['budget', 'cheap', 'affordable'].some(k => keywords.includes(k));
        const isLuxury = ['luxury', 'expensive', 'premium'].some(k => keywords.includes(k));
        
        if (isBudget && listing.price < 100) score += 5;
        if (isLuxury && listing.price > 300) score += 5;
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

      const user = await User.default.findById(userId).select('name preferences behavior');
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
        preferences: user?.preferences || context.interests || [],
        behavior: user?.behavior || {}
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

    for (const [id, session] of this.sessionCache) {
      if (now - session.lastActivity > this.sessionTimeout) {
        this.sessionCache.delete(id);
        cleaned++;
      }
    }

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
      if (this.sessionCache.has(sessionId)) {
        const cached = this.sessionCache.get(sessionId);
        cached.messages = [];
        cached.lastMessage = null;
        cached.lastResponse = null;
        cached.lastIntent = null;
        cached.lastActivity = Date.now();
        this.sessionCache.set(sessionId, cached);
      }

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

  /**
   * ✅ Extract keywords from message
   */
  extractKeywords(message) {
    const safeMessage = typeof message === 'string' ? message : '';
    const stopWords = ['the', 'a', 'an', 'for', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'of', 'from', 'up', 'down', 'off', 'over', 'under', 'so', 'very', 'too', 'much', 'more', 'most', 'some', 'any', 'such', 'my', 'your', 'our', 'their', 'please', 'want', 'need', 'looking', 'find', 'help', 'can', 'will', 'would', 'could', 'should', 'yes', 'no', 'okay', 'ok', 'sure', 'yeah', 'yep', 'nope', 'nah', 'maybe', 'perhaps'];
    
    const words = safeMessage.toLowerCase()
      .replace(/[^a-zA-Z\s]/g, '')
      .split(' ')
      .filter(w => w.length > 2 && !stopWords.includes(w));
    
    return [...new Set(words)];
  }
}

// Singleton instance
const chatService = new ChatService();

// Run cleanup every hour
setInterval(() => {
  chatService.cleanupSessions();
}, 60 * 60 * 1000);

export default chatService;