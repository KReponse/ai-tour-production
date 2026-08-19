// frontend/src/services/conversationService.js
// ✅ COMPLETE - Unified Conversation Service for Traveler ↔ Provider Messaging

import API from './api';

// ============================================================
// CONVERSATIONS
// ============================================================

/**
 * Get all conversations for the current user
 * GET /api/conversations
 */
export const getConversations = async () => {
  try {
    const response = await API.get('/conversations');
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching conversations:', error);
    throw error;
  }
};

/**
 * Get a single conversation by ID
 * GET /api/conversations/:id
 */
export const getConversation = async (conversationId) => {
  try {
    const response = await API.get(`/conversations/${conversationId}`);
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching conversation:', error);
    throw error;
  }
};

/**
 * Create a new conversation
 * POST /api/conversations
 * 
 * @param {Object} data - Conversation data
 * @param {string} data.participantId - The other user's ID
 * @param {string} data.type - 'traveler_provider', 'traveler_support', or 'provider_support'
 * @param {string} [data.bookingId] - Optional booking ID
 * @param {string} [data.listingId] - Optional listing ID
 * @param {string} [data.message] - Optional initial message
 */
export const createConversation = async (data) => {
  try {
    const response = await API.post('/conversations', data);
    return response.data;
  } catch (error) {
    console.error('❌ Error creating conversation:', error);
    throw error;
  }
};

/**
 * Get messages for a conversation
 * GET /api/conversations/:id/messages
 */
export const getConversationMessages = async (conversationId, page = 1, limit = 30) => {
  try {
    const response = await API.get(`/conversations/${conversationId}/messages`, {
      params: { page, limit },
    });
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching conversation messages:', error);
    throw error;
  }
};

/**
 * Send a message to a conversation
 * POST /api/conversations/:id/messages
 */
export const sendConversationMessage = async (conversationId, content) => {
  try {
    const response = await API.post(`/conversations/${conversationId}/messages`, {
      content: content.trim(),
    });
    return response.data;
  } catch (error) {
    console.error('❌ Error sending message:', error);
    throw error;
  }
};

/**
 * Mark messages in a conversation as read
 * PUT /api/conversations/:id/read
 */
export const markConversationAsRead = async (conversationId) => {
  try {
    const response = await API.put(`/conversations/${conversationId}/read`);
    return response.data;
  } catch (error) {
    console.error('❌ Error marking conversation as read:', error);
    throw error;
  }
};

/**
 * Get total unread count across all conversations
 * GET /api/conversations/unread
 */
export const getTotalUnreadCount = async () => {
  try {
    const response = await API.get('/conversations/unread');
    // Backend returns: { success: true, data: { count: 5 } }
    const count = response.data?.data?.count || 0;
    return {
      success: true,
      unreadCount: count,
      count: count,
      data: response.data
    };
  } catch (error) {
    console.error('❌ Error fetching total unread count:', error);
    return {
      success: false,
      unreadCount: 0,
      count: 0,
      error: error.message
    };
  }
};

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Create a traveler ↔ provider conversation
 * This is a convenience wrapper around createConversation
 */
export const createTravelerProviderConversation = async (providerId, listingId = null, bookingId = null, initialMessage = null) => {
  return createConversation({
    participantId: providerId,
    type: 'traveler_provider',
    listingId,
    bookingId,
    message: initialMessage,
  });
};

/**
 * Create a support conversation (Traveler/Provider → Admin)
 */
export const createSupportConversation = async (message, type = 'traveler_support') => {
  const adminId = import.meta.env.VITE_ADMIN_USER_ID || '';
  
  if (!adminId) {
    console.warn('⚠️ Admin user ID not configured');
  }
  
  return createConversation({
    participantId: adminId,
    type,
    message,
  });
};

/**
 * Get the other participant in a conversation
 */
export const getConversationPartner = (conversation, userId) => {
  if (!conversation || !userId) return null;
  const participants = conversation.participants || [];
  const partner = participants.find(p => p.user?._id !== userId);
  return partner?.user || null;
};

/**
 * Get conversation partner name
 */
export const getConversationPartnerName = (conversation, userId) => {
  const partner = getConversationPartner(conversation, userId);
  return partner?.name || partner?.email || 'Unknown';
};

/**
 * Get conversation partner role
 */
export const getConversationPartnerRole = (conversation, userId) => {
  const partner = getConversationPartner(conversation, userId);
  return partner?.role || 'User';
};

/**
 * Get conversation type label
 */
export const getConversationTypeLabel = (type) => {
  const labels = {
    traveler_provider: 'Booking Chat',
    traveler_support: 'Support Request',
    provider_support: 'Provider Support',
  };
  return labels[type] || type;
};

// ============================================================
// EXPORT DEFAULTS
// ============================================================

export default {
  getConversations,
  getConversation,
  createConversation,
  getConversationMessages,
  sendConversationMessage,
  markConversationAsRead,
  getTotalUnreadCount,
  createTravelerProviderConversation,
  createSupportConversation,
  getConversationPartner,
  getConversationPartnerName,
  getConversationPartnerRole,
  getConversationTypeLabel,
};