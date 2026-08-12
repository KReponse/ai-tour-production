// frontend/src/lib/socket.js
// ✅ COMPLETE FIXED - Socket.IO Client with full conversation support
// ✅ FIXED: Uses VITE_SOCKET_URL to avoid /api namespace issue

import { io } from "socket.io-client";

// ✅ Use VITE_SOCKET_URL for Socket.IO (no /api suffix)
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 
                   import.meta.env.VITE_API_URL?.replace(/\/api$/, '') || 
                   "http://localhost:5000";

let socketInstance = null;
let isConnecting = false;

/**
 * Initialize socket connection with authentication
 */
export const initSocket = (token) => {
  // If already connected, return it
  if (socketInstance && socketInstance.connected) {
    return socketInstance;
  }

  // If currently connecting, wait
  if (isConnecting) {
    return socketInstance;
  }

  // No token, can't connect
  if (!token) {
    console.warn("⚠️ No token provided for socket connection");
    return null;
  }

  try {
    isConnecting = true;

    socketInstance = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      autoConnect: true,
    });

    // ── Socket Event Listeners ──
    socketInstance.on("connect", () => {
      console.log("✅ Socket connected:", socketInstance.id);
      isConnecting = false;
      
      // Join user room after connection
      const userId = localStorage.getItem("userId");
      if (userId) {
        socketInstance.emit("join-user-room", userId);
      }
    });

    socketInstance.on("disconnect", (reason) => {
      console.log("🔴 Socket disconnected:", reason);
      isConnecting = false;
    });

    socketInstance.on("connect_error", (error) => {
      console.error("❌ Socket connection error:", error.message);
      isConnecting = false;
      
      // Try to reconnect with new token if auth failed
      if (error.message.includes("Authentication") || error.message.includes("token")) {
        const newToken = localStorage.getItem("token");
        if (newToken && newToken !== token) {
          socketInstance.auth = { token: newToken };
          socketInstance.connect();
        }
      }
    });

    socketInstance.on("reconnect", (attemptNumber) => {
      console.log(`🔄 Socket reconnected after ${attemptNumber} attempts`);
      isConnecting = false;
      
      // Rejoin rooms after reconnect
      const userId = localStorage.getItem("userId");
      if (userId) {
        socketInstance.emit("join-user-room", userId);
      }
    });

    socketInstance.on("reconnect_error", (error) => {
      console.error("❌ Socket reconnect error:", error.message);
    });

    socketInstance.on("reconnect_failed", () => {
      console.error("❌ Socket reconnection failed after max attempts");
    });

    return socketInstance;
  } catch (error) {
    console.error("❌ Failed to initialize socket:", error);
    isConnecting = false;
    return null;
  }
};

/**
 * Join a conversation room
 */
export const joinConversation = (conversationId) => {
  if (!socketInstance || !socketInstance.connected) {
    console.warn("⚠️ Socket not connected, cannot join conversation");
    return;
  }
  socketInstance.emit("join-conversation", conversationId);
  console.log(`📢 Joined conversation: ${conversationId}`);
};

/**
 * Leave a conversation room
 */
export const leaveConversation = (conversationId) => {
  if (!socketInstance) return;
  socketInstance.emit("leave-conversation", conversationId);
  console.log(`🚪 Left conversation: ${conversationId}`);
};

/**
 * Send typing indicator
 */
export const sendTyping = (conversationId, isTyping = true) => {
  if (!socketInstance) return;
  const event = isTyping ? "typing-start" : "typing-stop";
  socketInstance.emit(event, { conversationId });
};

/**
 * Get socket instance
 */
export const getSocket = () => {
  if (!socketInstance) {
    console.warn("⚠️ Socket not initialized. Call initSocket first.");
    return null;
  }
  return socketInstance;
};

/**
 * Disconnect socket
 */
export const disconnectSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
  isConnecting = false;
};

/**
 * Hook to use socket in components
 */
export const useSocket = () => {
  return getSocket();
};

/**
 * Socket event listeners for conversations
 */
export const onNewMessage = (callback) => {
  if (!socketInstance) return () => {};
  socketInstance.on("new-message", callback);
  return () => socketInstance.off("new-message", callback);
};

export const onMessagesRead = (callback) => {
  if (!socketInstance) return () => {};
  socketInstance.on("messages-read", callback);
  return () => socketInstance.off("messages-read", callback);
};

export const onUnreadCountUpdate = (callback) => {
  if (!socketInstance) return () => {};
  socketInstance.on("unread-count-update", callback);
  return () => socketInstance.off("unread-count-update", callback);
};

export const onUserTyping = (callback) => {
  if (!socketInstance) return () => {};
  socketInstance.on("user-typing", callback);
  return () => socketInstance.off("user-typing", callback);
};

export const onNewChatMessage = (callback) => {
  if (!socketInstance) return () => {};
  socketInstance.on("new-chat-message", callback);
  return () => socketInstance.off("new-chat-message", callback);
};

export default {
  initSocket,
  getSocket,
  disconnectSocket,
  useSocket,
  joinConversation,
  leaveConversation,
  sendTyping,
  onNewMessage,
  onMessagesRead,
  onUnreadCountUpdate,
  onUserTyping,
  onNewChatMessage,
};