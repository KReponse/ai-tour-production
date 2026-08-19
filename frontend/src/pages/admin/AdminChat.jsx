// frontend/src/pages/admin/AdminChat.jsx
// ✅ COMPLETE FIXED - Using correct imports from conversationService
// ✅ RESPONSIVE: Mobile-optimized with proper touch targets (44px+)
// ✅ ADDED: Mobile conversation list toggle
// ✅ ADDED: Refresh button
// ✅ FIXED: Import from conversationService instead of chatService

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  MessageCircle,
  Send,
  Loader2,
  Search,
  User,
  Building2,
  Clock,
  Check,
  CheckCheck,
  Phone,
  Mail,
  ArrowLeft,
  Users,
  Menu,
  X,
  RefreshCw,
  Headphones,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../lib/socket';
// ✅ FIXED: Import from conversationService
import {
  getConversations,
  getConversationMessages,
  sendConversationMessage,
  markConversationAsRead,
  getTotalUnreadCount,
  getConversationPartnerName,
  getConversationPartnerRole,
  getConversationTypeLabel,
} from '../../services/conversationService';
import toast from 'react-hot-toast';

// ===============================
// AI TOUR COLORS
// ===============================
// Teal  : #0D9488
// Gold  : #F59E0B
// Slate : #374151
// White : #FFFFFF
// ===============================

const AdminChat = () => {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const socket = useSocket();

  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [typingUsers, setTypingUsers] = useState({});
  const [showMobileList, setShowMobileList] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // ── Helpers ──
  const getOtherParticipant = (conversation) => {
    if (!conversation || !user) return null;
    const participants = conversation.participants || [];
    return participants.find(p => p.user?._id !== user._id)?.user || null;
  };

  const getParticipantRole = (conversation) => {
    const other = getOtherParticipant(conversation);
    return other?.role || 'User';
  };

  const getParticipantName = (conversation) => {
    const other = getOtherParticipant(conversation);
    return other?.name || other?.businessName || other?.email || 'Unknown';
  };

  const getConversationTypeLabel = (type) => {
    const labels = {
      traveler_provider: 'Booking Chat',
      traveler_support: 'Support Request',
      provider_support: 'Provider Support',
      provider_admin: 'Admin Support',
    };
    return labels[type] || type || 'Chat';
  };

  // ── Load conversations ──
  const loadConversations = useCallback(async () => {
    try {
      const response = await getConversations();
      if (response.success) {
        setConversations(response.data || []);
        return response.data || [];
      }
      return [];
    } catch (error) {
      console.error('Error loading conversations:', error);
      return [];
    }
  }, []);

  // ── Load messages ──
  const loadMessages = useCallback(async (id) => {
    if (!id) return;
    try {
      const response = await getConversationMessages(id);
      if (response.success) {
        setMessages(response.data || []);
        // Mark as read
        await markConversationAsRead(id);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Failed to load messages');
    }
  }, []);

  // ── Load unread count ──
  const loadUnreadCount = useCallback(async () => {
    try {
      const response = await getTotalUnreadCount();
      if (response.success) {
        setUnreadCount(response.data?.count || 0);
      }
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  }, []);

  // ── Select conversation ──
  const selectConversation = useCallback(async (conversation) => {
    if (!conversation) return;

    setCurrentConversation(conversation);
    navigate(`/admin/chat/${conversation._id}`, { replace: true });

    await loadMessages(conversation._id);
    await loadUnreadCount();
    
    // Close mobile list
    setShowMobileList(false);

    if (socket) {
      socket.emit('join-conversation', conversation._id);
    }
  }, [navigate, loadMessages, loadUnreadCount, socket]);

  // ── Send message ──
  const handleSendMessage = useCallback(async (e) => {
    e.preventDefault();

    if (!newMessage.trim() || sending || !currentConversation) return;

    const content = newMessage.trim();
    setNewMessage('');
    setSending(true);

    try {
      const response = await sendConversationMessage(currentConversation._id, content);

      if (response.success) {
        setMessages(prev => [...prev, response.data]);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);

        // Update conversation list
        setConversations(prev =>
          prev.map(c =>
            c._id === currentConversation._id
              ? { ...c, lastMessage: response.data, lastMessageAt: new Date() }
              : c
          )
        );
      } else {
        toast.error(response.message || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }, [newMessage, sending, currentConversation]);

  // ── Handle refresh ──
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadConversations();
    if (currentConversation) {
      await loadMessages(currentConversation._id);
    }
    await loadUnreadCount();
    setRefreshing(false);
    toast.success('Refreshed');
  };

  // ── Typing handler ──
  const handleTyping = useCallback((e) => {
    setNewMessage(e.target.value);
    
    if (socket && currentConversation) {
      socket.emit('typing-start', { conversationId: currentConversation._id });
      
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing-stop', { conversationId: currentConversation._id });
      }, 2000);
    }
  }, [socket, currentConversation]);

  // ── Socket events ──
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (data) => {
      const { conversationId: msgConvId, message } = data;

      if (msgConvId === currentConversation?._id) {
        setMessages(prev => {
          const exists = prev.some(m => m._id === message._id);
          if (exists) return prev;
          return [...prev, message];
        });
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }

      setConversations(prev =>
        prev.map(c =>
          c._id === msgConvId
            ? { ...c, lastMessage: message, lastMessageAt: new Date() }
            : c
        )
      );

      loadUnreadCount();
    };

    const handleMessagesRead = (data) => {
      const { conversationId: readConvId } = data;
      if (readConvId === currentConversation?._id) {
        setMessages(prev =>
          prev.map(m => ({ ...m, read: true }))
        );
      }
      loadUnreadCount();
    };

    const handleUnreadCountUpdate = (data) => {
      setUnreadCount(data.count || 0);
    };

    const handleUserTyping = (data) => {
      const { userId, isTyping } = data;
      if (userId !== user?._id) {
        setTypingUsers(prev => ({ ...prev, [userId]: isTyping }));
      }
    };

    socket.on('new-message', handleNewMessage);
    socket.on('messages-read', handleMessagesRead);
    socket.on('unread-count-update', handleUnreadCountUpdate);
    socket.on('user-typing', handleUserTyping);

    return () => {
      socket.off('new-message', handleNewMessage);
      socket.off('messages-read', handleMessagesRead);
      socket.off('unread-count-update', handleUnreadCountUpdate);
      socket.off('user-typing', handleUserTyping);
    };
  }, [socket, currentConversation, loadUnreadCount, user]);

  // ── Initial load ──
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const convos = await loadConversations();

      if (conversationId) {
        const conv = convos.find(c => c._id === conversationId);
        if (conv) {
          await selectConversation(conv);
          setLoading(false);
          return;
        }
      }

      if (convos.length > 0) {
        await selectConversation(convos[0]);
      }

      setLoading(false);
    };

    init();
    loadUnreadCount();
  }, [conversationId, loadConversations, selectConversation, loadUnreadCount]);

  // ── Filter conversations ──
  const filteredConversations = conversations.filter(conv => {
    const name = getParticipantName(conv).toLowerCase();
    const matchesSearch = name.includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' || conv.type === filter;
    return matchesSearch && matchesFilter;
  });

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-4 border-[#0D9488]/20" />
          <div className="absolute inset-0 rounded-full border-4 border-[#0D9488] border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  const other = getOtherParticipant(currentConversation);
  const isTyping = currentConversation && typingUsers[other?._id];

  return (
    <div className="flex h-[calc(100vh-120px)] sm:h-[calc(100vh-100px)] bg-white dark:bg-gray-900 rounded-xl sm:rounded-2xl md:rounded-3xl overflow-hidden border border-gray-200 dark:border-gray-800 shadow-sm">

      {/* ── Conversation List ── */}
      <div className={`
        ${showMobileList ? 'fixed inset-0 z-50 bg-white dark:bg-gray-950' : 'hidden'}
        md:relative md:flex md:inset-auto md:z-auto md:bg-transparent
        w-full md:w-80 lg:w-96
        flex-col border-r border-gray-200 dark:border-gray-800
        ${showMobileList ? 'flex' : ''}
      `}>
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-bold text-[#374151] dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-[#0D9488]" />
            Support Inbox
            {unreadCount > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </h2>
          <button
            onClick={() => setShowMobileList(false)}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="hidden md:block text-lg font-bold text-[#374151] dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-[#0D9488]" />
              Support Inbox
              {unreadCount > 0 && (
                <span className="ml-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </h2>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="min-w-[36px] min-h-[36px] flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition"
            >
              <RefreshCw className={`w-4 h-4 text-gray-400 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="relative mt-2 sm:mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none text-sm dark:text-white min-h-[40px] sm:min-h-[44px]"
            />
          </div>

          <div className="flex gap-1.5 sm:gap-2 mt-2 sm:mt-3 overflow-x-auto pb-1">
            <button
              onClick={() => setFilter('all')}
              className={`px-2.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-medium transition whitespace-nowrap min-h-[32px] ${
                filter === 'all'
                  ? 'bg-[#0D9488] text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('traveler_support')}
              className={`px-2.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-medium transition whitespace-nowrap min-h-[32px] ${
                filter === 'traveler_support'
                  ? 'bg-[#0D9488] text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
              }`}
            >
              Travelers
            </button>
            <button
              onClick={() => setFilter('provider_support')}
              className={`px-2.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-medium transition whitespace-nowrap min-h-[32px] ${
                filter === 'provider_support'
                  ? 'bg-[#0D9488] text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
              }`}
            >
              Providers
            </button>
            <button
              onClick={() => setFilter('provider_admin')}
              className={`px-2.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-medium transition whitespace-nowrap min-h-[32px] ${
                filter === 'provider_admin'
                  ? 'bg-[#0D9488] text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
              }`}
            >
              Admin
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center p-4">
              <MessageCircle className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-gray-500 dark:text-gray-400 font-medium">
                {searchTerm ? 'No conversations found' : 'No support requests'}
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                Support messages from travelers and providers will appear here
              </p>
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isActive = conv._id === currentConversation?._id;
              const unread = conv.unreadCount || 0;
              const name = getParticipantName(conv);
              const role = getParticipantRole(conv);
              const typeLabel = getConversationTypeLabel(conv.type);

              return (
                <button
                  key={conv._id}
                  onClick={() => selectConversation(conv)}
                  className={`w-full p-3 sm:p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition border-b border-gray-100 dark:border-gray-800 min-h-[64px] ${
                    isActive ? 'bg-[#0D9488]/5 dark:bg-[#0D9488]/10' : ''
                  }`}
                >
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 ${
                      role === 'traveler' ? 'bg-blue-500' :
                      role === 'provider' ? 'bg-[#F59E0B]' :
                      'bg-gray-500'
                    }`}>
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-sm sm:text-base text-[#374151] dark:text-white truncate">
                          {name}
                        </p>
                        {conv.lastMessageAt && (
                          <span className="text-[10px] text-gray-400 flex-shrink-0">
                            {new Date(conv.lastMessageAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                          {conv.lastMessage?.content || 'No messages yet'}
                        </p>
                        <div className="flex items-center gap-1">
                          <span className="text-[8px] sm:text-[10px] text-gray-400 capitalize hidden xs:inline">
                            {typeLabel}
                          </span>
                          {unread > 0 && (
                            <span className="min-w-[18px] sm:min-w-[20px] h-[18px] sm:h-[20px] rounded-full bg-[#0D9488] text-white text-[10px] sm:text-xs font-bold flex items-center justify-center flex-shrink-0 px-1">
                              {unread > 9 ? '9+' : unread}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── Chat Window ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {currentConversation ? (
          <>
            {/* Header - Responsive */}
            <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <button
                  onClick={() => setShowMobileList(true)}
                  className="md:hidden min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition"
                >
                  <Menu className="w-5 h-5 text-gray-500" />
                </button>
                <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 ${
                  other?.role === 'traveler' ? 'bg-blue-500' :
                  other?.role === 'provider' ? 'bg-[#F59E0B]' :
                  'bg-gray-500'
                }`}>
                  {getParticipantName(currentConversation).charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm sm:text-base text-[#374151] dark:text-white truncate">
                    {getParticipantName(currentConversation)}
                  </p>
                  <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 capitalize truncate">
                    {other?.role || 'User'} • {getConversationTypeLabel(currentConversation.type)}
                    {isTyping && (
                      <span className="ml-1 sm:ml-2 text-[#0D9488] animate-pulse">typing...</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                {other?.email && (
                  <a
                    href={`mailto:${other.email}`}
                    className="min-w-[36px] sm:min-w-[40px] min-h-[36px] sm:min-h-[40px] flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition"
                    title="Send Email"
                  >
                    <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 hover:text-[#0D9488]" />
                  </a>
                )}
                {other?.phone && (
                  <a
                    href={`tel:${other.phone}`}
                    className="min-w-[36px] sm:min-w-[40px] min-h-[36px] sm:min-h-[40px] flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition"
                    title="Call"
                  >
                    <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 hover:text-[#0D9488]" />
                  </a>
                )}
              </div>
            </div>

            {/* Messages - Responsive */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 bg-gray-50 dark:bg-gray-900/50">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <MessageCircle className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 dark:text-gray-600 mb-3 sm:mb-4" />
                  <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 font-medium">
                    No messages yet
                  </p>
                  <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-500">
                    Start the conversation!
                  </p>
                </div>
              ) : (
                <>
                  {messages.map((msg) => {
                    const isOwn = msg.sender?._id === user?._id;
                    return (
                      <div
                        key={msg._id}
                        className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2 sm:mb-3`}
                      >
                        <div
                          className={`max-w-[85%] sm:max-w-[80%] rounded-xl sm:rounded-2xl px-3 sm:px-4 py-2 sm:py-2.5 ${
                            isOwn
                              ? 'bg-[#0D9488] text-white rounded-br-sm'
                              : 'bg-white dark:bg-gray-800 text-[#374151] dark:text-white rounded-bl-sm border border-gray-200 dark:border-gray-700'
                          }`}
                        >
                          {!isOwn && (
                            <p className="text-[10px] sm:text-xs font-semibold text-[#0D9488] mb-0.5">
                              {msg.sender?.name || 'User'}
                            </p>
                          )}
                          <p className="text-xs sm:text-sm break-words whitespace-pre-wrap">{msg.content}</p>
                          <div className={`flex items-center gap-1 mt-0.5 sm:mt-1 text-[8px] sm:text-[10px] ${isOwn ? 'text-white/70' : 'text-gray-400'}`}>
                            <span>{new Date(msg.createdAt).toLocaleTimeString()}</span>
                            {isOwn && (
                              <span>
                                {msg.read ? <CheckCheck className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> : <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3" />}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input - Responsive */}
            <form onSubmit={handleSendMessage} className="p-2 sm:p-4 border-t border-gray-200 dark:border-gray-800 flex-shrink-0">
              <div className="flex gap-1.5 sm:gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={newMessage}
                  onChange={handleTyping}
                  placeholder="Type a message..."
                  className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition dark:text-white text-sm sm:text-base min-h-[40px] sm:min-h-[44px]"
                  disabled={sending}
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className="min-w-[44px] min-h-[44px] px-4 sm:px-5 rounded-xl bg-gradient-to-r from-[#0D9488] to-[#F59E0B] text-white font-semibold hover:scale-[1.02] transition disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center touch-manipulation"
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                  )}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 sm:p-8">
            <MessageCircle className="w-16 h-16 sm:w-20 sm:h-20 text-gray-300 dark:text-gray-600 mb-3 sm:mb-4" />
            <h3 className="text-lg sm:text-xl font-bold text-[#374151] dark:text-white">
              No Conversation Selected
            </h3>
            <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1 sm:mt-2">
              Select a support conversation from the list
            </p>
            <button
              onClick={() => setShowMobileList(true)}
              className="md:hidden mt-4 min-h-[44px] px-6 rounded-xl bg-[#0D9488] text-white font-medium hover:bg-[#0D9488]/80 transition"
            >
              View Conversations
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminChat;