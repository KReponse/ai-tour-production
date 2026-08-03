// src/ai/utils/sessionManager.js
const { v4: uuidv4 } = require('uuid');
const ChatSession = require('../../models/ChatSession');
const logger = require('../../config/logger');

class SessionManager {
  constructor() {
    this.sessionCache = new Map();
    this.CACHE_TTL = 3600000; // 1 hour
  }

  /**
   * Create a new chat session
   */
  async createSession({ userId, userLocation, messages = [], context = {} }) {
    try {
      const sessionId = `session_${Date.now()}_${uuidv4().slice(0, 6)}`;
      
      const sessionData = {
        id: sessionId,
        userId: userId || 'guest',
        userLocation: userLocation || 'Rwanda',
        messages: messages,
        context: {
          location: userLocation || 'Rwanda',
          ...context
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        lastMessage: null,
        lastResponse: null,
        lastIntent: null,
        isActive: true
      };

      // Save to MongoDB
      const session = new ChatSession(sessionData);
      await session.save();

      // Cache in memory
      this.sessionCache.set(sessionId, {
        ...sessionData,
        _id: session._id
      });

      logger.info(`✅ Session created: ${sessionId}`);
      return sessionData;

    } catch (error) {
      logger.error('❌ Error creating session:', error);
      throw error;
    }
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId) {
    try {
      // Check cache first
      if (this.sessionCache.has(sessionId)) {
        const cached = this.sessionCache.get(sessionId);
        // Check if cache is still valid
        if (Date.now() - new Date(cached.updatedAt).getTime() < this.CACHE_TTL) {
          logger.info(`📌 Session retrieved from cache: ${sessionId}`);
          return cached;
        }
        // Remove expired cache
        this.sessionCache.delete(sessionId);
      }

      // Get from MongoDB
      const session = await ChatSession.findOne({ id: sessionId, isActive: true });
      if (!session) {
        return null;
      }

      // Cache in memory
      this.sessionCache.set(sessionId, session.toObject());
      
      logger.info(`📌 Session retrieved from DB: ${sessionId}`);
      return session.toObject();

    } catch (error) {
      logger.error('❌ Error getting session:', error);
      return null;
    }
  }

  /**
   * Update session
   */
  async updateSession(sessionId, updates) {
    try {
      const session = await ChatSession.findOneAndUpdate(
        { id: sessionId },
        { 
          ...updates,
          updatedAt: new Date()
        },
        { new: true }
      );

      if (!session) {
        throw new Error('Session not found');
      }

      // Update cache
      this.sessionCache.set(sessionId, session.toObject());

      logger.info(`✅ Session updated: ${sessionId}`);
      return session.toObject();

    } catch (error) {
      logger.error('❌ Error updating session:', error);
      throw error;
    }
  }

  /**
   * Add message to session history
   */
  async addMessageToSession(sessionId, message) {
    try {
      const session = await ChatSession.findOne({ id: sessionId });
      if (!session) {
        throw new Error('Session not found');
      }

      // Add message to history
      session.messages.push({
        ...message,
        timestamp: message.timestamp || new Date()
      });

      // Keep only last 50 messages to prevent memory issues
      if (session.messages.length > 50) {
        session.messages = session.messages.slice(-50);
      }

      // Update last message fields
      if (message.role === 'user') {
        session.lastMessage = message.content;
      } else if (message.role === 'assistant') {
        session.lastResponse = message.content;
      }

      session.updatedAt = new Date();
      await session.save();

      // Update cache
      this.sessionCache.set(sessionId, session.toObject());

      logger.info(`✅ Message added to session: ${sessionId}`);
      return session.toObject();

    } catch (error) {
      logger.error('❌ Error adding message:', error);
      throw error;
    }
  }

  /**
   * Get conversation history
   */
  async getConversationHistory(sessionId, limit = 10) {
    try {
      const session = await ChatSession.findOne({ id: sessionId });
      if (!session) {
        return [];
      }

      // Get last N messages
      const messages = session.messages.slice(-limit);
      
      logger.info(`📌 Retrieved ${messages.length} messages from history`);
      return messages;

    } catch (error) {
      logger.error('❌ Error getting history:', error);
      return [];
    }
  }

  /**
   * Clear session history
   */
  async clearHistory(sessionId) {
    try {
      const session = await ChatSession.findOneAndUpdate(
        { id: sessionId },
        {
          messages: [],
          lastMessage: null,
          lastResponse: null,
          lastIntent: null,
          updatedAt: new Date()
        },
        { new: true }
      );

      if (!session) {
        throw new Error('Session not found');
      }

      // Update cache
      this.sessionCache.set(sessionId, session.toObject());

      logger.info(`✅ Session history cleared: ${sessionId}`);
      return session.toObject();

    } catch (error) {
      logger.error('❌ Error clearing history:', error);
      throw error;
    }
  }

  /**
   * End session
   */
  async endSession(sessionId) {
    try {
      const session = await ChatSession.findOneAndUpdate(
        { id: sessionId },
        {
          isActive: false,
          endedAt: new Date(),
          updatedAt: new Date()
        },
        { new: true }
      );

      if (!session) {
        throw new Error('Session not found');
      }

      // Remove from cache
      this.sessionCache.delete(sessionId);

      logger.info(`✅ Session ended: ${sessionId}`);
      return session.toObject();

    } catch (error) {
      logger.error('❌ Error ending session:', error);
      throw error;
    }
  }

  /**
   * Clean expired sessions (to be run periodically)
   */
  async cleanExpiredSessions() {
    try {
      const expiryDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours
      
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

      logger.info(`✅ Cleaned ${result.modifiedCount} expired sessions`);
      return result.modifiedCount;

    } catch (error) {
      logger.error('❌ Error cleaning sessions:', error);
      return 0;
    }
  }

  /**
   * Clean cache (remove old entries)
   */
  cleanCache() {
    const now = Date.now();
    let removed = 0;

    for (const [key, value] of this.sessionCache.entries()) {
      if (now - new Date(value.updatedAt).getTime() > this.CACHE_TTL) {
        this.sessionCache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      logger.info(`✅ Removed ${removed} expired cache entries`);
    }
  }
}

// Singleton instance
const sessionManager = new SessionManager();

module.exports = {
  createSession: sessionManager.createSession.bind(sessionManager),
  getSession: sessionManager.getSession.bind(sessionManager),
  updateSession: sessionManager.updateSession.bind(sessionManager),
  addMessageToSession: sessionManager.addMessageToSession.bind(sessionManager),
  getConversationHistory: sessionManager.getConversationHistory.bind(sessionManager),
  clearHistory: sessionManager.clearHistory.bind(sessionManager),
  endSession: sessionManager.endSession.bind(sessionManager),
  cleanExpiredSessions: sessionManager.cleanExpiredSessions.bind(sessionManager),
  cleanCache: sessionManager.cleanCache.bind(sessionManager)
};