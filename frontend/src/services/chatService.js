// frontend/src/services/chatService.js
// ✅ COMPLETE FIXED - Added all missing exports for AdminChat and ProviderChat
// ✅ FIXED: getTotalUnreadCount properly handles backend response

import API from './api';

// =========================
// LEGACY CHAT ROOMS (Backward Compatible)
// =========================

/**
 * Get all chat rooms for the current user
 */
export const getChatRooms = async () => {
  try {
    const response = await API.get('/chat/rooms');
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching chat rooms:', error);
    throw error;
  }
};

/**
 * Get or create a chat room with a participant
 */
export const getOrCreateRoom = async (participantId) => {
  try {
    const response = await API.post('/chat/rooms', { participantId });
    return response.data;
  } catch (error) {
    console.error('❌ Error creating chat room:', error);
    throw error;
  }
};

/**
 * Get messages for a specific room (legacy)
 */
export const getRoomMessages = async (roomId, params = {}) => {
  try {
    const response = await API.get(`/chat/rooms/${roomId}/messages`, { params });
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching messages:', error);
    throw error;
  }
};

/**
 * Send a message to a room (legacy)
 */
export const sendMessage = async (roomId, message) => {
  try {
    const response = await API.post('/chat/messages', { roomId, message });
    return response.data;
  } catch (error) {
    console.error('❌ Error sending message:', error);
    throw error;
  }
};

/**
 * Mark messages as read in a room (legacy)
 */
export const markMessagesAsRead = async (roomId) => {
  try {
    const response = await API.put(`/chat/rooms/${roomId}/read`);
    return response.data;
  } catch (error) {
    console.error('❌ Error marking messages as read:', error);
    throw error;
  }
};

/**
 * Get unread message count (legacy)
 */
export const getUnreadCount = async () => {
  try {
    const response = await API.get('/chat/rooms/unread-count');
    return {
      success: true,
      count: response.data.count || response.data.unreadCount || 0
    };
  } catch (error) {
    console.error('❌ Error fetching unread count:', error);
    return {
      success: false,
      count: 0,
      error: error.message
    };
  }
};

// =========================
// NEW CONVERSATION API (Full Messaging)
// =========================

/**
 * Get all conversations for the current user
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
 * Get a single conversation
 */
export const getConversation = async (id) => {
  try {
    const response = await API.get(`/conversations/${id}`);
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching conversation:', error);
    throw error;
  }
};

/**
 * Get messages for a conversation (NEW - alias for getConversationMessages)
 */
export const getMessages = async (id, page = 1, limit = 30) => {
  try {
    const response = await API.get(`/conversations/${id}/messages`, {
      params: { page, limit },
    });
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching messages:', error);
    throw error;
  }
};

/**
 * Get messages for a conversation (NEW)
 */
export const getConversationMessages = async (id, page = 1, limit = 30) => {
  try {
    const response = await API.get(`/conversations/${id}/messages`, {
      params: { page, limit },
    });
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching conversation messages:', error);
    throw error;
  }
};

/**
 * Create a new conversation
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
 * Send a message to a conversation (NEW)
 */
export const sendConversationMessage = async (conversationId, content) => {
  try {
    const response = await API.post(`/conversations/${conversationId}/messages`, {
      content,
    });
    return response.data;
  } catch (error) {
    console.error('❌ Error sending conversation message:', error);
    throw error;
  }
};

/**
 * Mark conversation messages as read (NEW)
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
 * Get total unread count across all conversations (NEW)
 * ✅ FIXED: Properly handles backend response format
 */
export const getTotalUnreadCount = async () => {
  try {
    const response = await API.get('/conversations/unread');
    
    // Backend returns: { success: true, data: { count: 5 } }
    // Extract count from nested data
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

// =========================
// UTILITY FUNCTIONS
// =========================

/**
 * Create a support conversation (Traveler/Provider → Admin)
 */
export const createSupportConversation = async (message, type = 'traveler_support') => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const adminId = import.meta.env.VITE_ADMIN_USER_ID || '';
    
    if (!adminId) {
      console.warn('⚠️ Admin user ID not configured');
    }
    
    const response = await createConversation({
      participantId: adminId,
      type,
      message,
    });
    
    return response;
  } catch (error) {
    console.error('❌ Error creating support conversation:', error);
    throw error;
  }
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

/**
 * Get conversation participant name
 */
export const getConversationPartner = (conversation, userId) => {
  if (!conversation || !userId) return null;
  const participants = conversation.participants || [];
  return participants.find(p => p.user?._id !== userId)?.user || null;
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

export default {
  // Legacy
  getChatRooms,
  getOrCreateRoom,
  getRoomMessages,
  sendMessage,
  markMessagesAsRead,
  getUnreadCount,
  
  // New
  getConversations,
  getConversation,
  getMessages,
  getConversationMessages,
  createConversation,
  sendConversationMessage,
  markConversationAsRead,
  getTotalUnreadCount,
  
  // Utilities
  createSupportConversation,
  getConversationTypeLabel,
  getConversationPartner,
  getConversationPartnerName,
  getConversationPartnerRole,
};