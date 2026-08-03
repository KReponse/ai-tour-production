// frontend/src/components/ai/AIWidget.jsx
// ✅ COMPLETE FIXED - Full session management with conversation memory
// ✅ Updated "Tours" → "Experiences" for user-facing text
// ✅ Added sessionId persistence for conversation continuity

import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  X, 
  Send, 
  Sparkles, 
  MapPin, 
  Calendar, 
  DollarSign,
  Loader2,
  ChevronUp,
  ChevronDown,
  User,
  ExternalLink,
  RefreshCw,
  MessageCircle,
  HelpCircle,
  AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { getAIChat } from '../../services/aiService';
import { useAuth } from '../../contexts/AuthContext';

// ===============================
// AI TOUR COLORS (Brand Name - Keep as is)
// ===============================
// Teal  : #0D9488
// Gold  : #F59E0B
// Slate : #374151
// White : #FFFFFF
// ===============================

const AIWidget = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState(null);
  const [sessionId, setSessionId] = useState(null); // ✅ Track session for conversation memory
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Quick actions - Updated: "Find Tours" → "Find Experiences"
  const quickActions = [
    { label: 'Plan a Trip', icon: Calendar, action: 'plan', color: 'bg-[#0D9488]/10 text-[#0D9488]' },
    { label: 'Find Experiences', icon: MapPin, action: 'experiences', color: 'bg-[#0D9488]/10 text-[#0D9488]' },
    { label: 'Budget Help', icon: DollarSign, action: 'budget', color: 'bg-[#F59E0B]/10 text-[#F59E0B]' },
    { label: 'Recommendations', icon: Sparkles, action: 'recommend', color: 'bg-[#F59E0B]/10 text-[#F59E0B]' },
  ];

  // Welcome message - Updated: "find tours" → "find experiences"
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: `👋 Hi ${user?.name || 'Traveler'}! I'm your AI Tour assistant. I can help you plan trips, find amazing experiences, and explore Rwanda. What would you like to do?`,
          timestamp: new Date().toISOString(),
        },
      ]);
      // ✅ Reset sessionId when widget is reopened
      setSessionId(null);
    }
  }, [isOpen, user]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && !loading) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen, loading]);

  // Handle quick action - Updated: "tours" → "experiences"
  const handleQuickAction = (action) => {
    const prompts = {
      plan: 'I want to plan a trip to Rwanda. Can you help me?',
      experiences: 'What experiences are available in Rwanda?',
      budget: 'How much should I budget for a 5-day trip to Rwanda?',
      recommend: 'Can you recommend the best places to visit in Rwanda?',
    };
    setInput(prompts[action] || '');
    setTimeout(() => {
      handleSend(prompts[action] || '');
    }, 100);
  };

  // Send message with session persistence
  const handleSend = async (messageOverride) => {
    const messageToSend = messageOverride || input;
    if (!messageToSend.trim() || loading) return;

    setError(null);

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: messageToSend.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setTyping(true);

    try {
      // ✅ Send sessionId to maintain conversation context
      const response = await getAIChat({
        message: messageToSend.trim(),
        sessionId: sessionId, // ✅ Pass sessionId for conversation continuity
        history: messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
      });

      // ✅ Store sessionId for future messages
      if (response.sessionId) {
        setSessionId(response.sessionId);
      }

      setTyping(false);

      const aiText = response.reply || response.message || response.response || "I couldn't generate a response. Please try again.";

      const aiMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: aiText,
        timestamp: new Date().toISOString(),
        metadata: {
          isFollowUp: response.isFollowUp || false,
          intent: response.intent || 'general',
        },
      };

      setMessages(prev => [...prev, aiMessage]);

      // ✅ Show quick replies if available
      if (response.quickReplies && response.quickReplies.length > 0) {
        // Add quick replies as suggestions
        const suggestionMessage = {
          id: Date.now() + 2,
          role: 'suggestion',
          content: 'You might want to ask:',
          suggestions: response.quickReplies.slice(0, 4),
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, suggestionMessage]);
      }

    } catch (error) {
      console.error('❌ AI Chat Error:', error);
      setTyping(false);
      
      let errorMessage = "⚠️ Sorry, I encountered an error. Please try again later.";
      
      if (error.response?.status === 401) {
        errorMessage = "⚠️ Please login to use the AI chat.";
      } else if (error.response?.status === 429) {
        errorMessage = "⚠️ Too many requests. Please wait a moment.";
      } else if (error.response?.data?.message) {
        errorMessage = `⚠️ ${error.response.data.message}`;
      }
      
      setError(errorMessage);
      
      const errorMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        content: errorMessage,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  // Reset chat
  const resetChat = () => {
    if (messages.length > 1) {
      if (window.confirm('Clear all messages?')) {
        setMessages([
          {
            id: 'welcome',
            role: 'assistant',
            content: `👋 Hi ${user?.name || 'Traveler'}! I'm your AI Tour assistant. How can I help you today?`,
            timestamp: new Date().toISOString(),
          },
        ]);
        setSessionId(null); // ✅ Reset session when chat is cleared
      }
    }
  };

  // Format message content
  const formatMessage = (content) => {
    if (!content) return null;
    return content.split('\n').map((line, i) => {
      if (line.startsWith('•') || line.startsWith('-')) {
        return <div key={i} className="flex items-start gap-2 ml-2"><span className="text-[#0D9488]">•</span><span>{line.substring(1).trim()}</span></div>;
      }
      if (line.startsWith('**') && line.endsWith('**')) {
        return <div key={i} className="font-bold">{line.replace(/\*\*/g, '')}</div>;
      }
      if (line.trim() === '') {
        return <div key={i} className="h-1" />;
      }
      return <div key={i} className="mb-1">{line}</div>;
    });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ scale: 0.8, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0, y: 20 }}
        transition={{ type: 'spring', damping: 20 }}
        className="fixed bottom-24 right-6 z-50 w-[380px] md:w-[420px] bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0D9488] to-[#F59E0B] p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold">AI Tour Assistant</h3>
                <div className="flex items-center gap-2 text-xs text-white/70">
                  <span className="inline-flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    Online
                  </span>
                  <span>•</span>
                  <span>24/7</span>
                  {sessionId && (
                    <>
                      <span>•</span>
                      <span className="text-[10px]">Session active</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-0.5">
              {messages.length > 1 && (
                <button
                  onClick={resetChat}
                  className="p-1.5 rounded-lg hover:bg-white/20 transition"
                  title="Reset chat"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 rounded-lg hover:bg-white/20 transition"
              >
                {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              <Link
                to="/ai-chat"
                className="p-1.5 rounded-lg hover:bg-white/20 transition"
                title="Open Full Chat"
              >
                <ExternalLink className="w-4 h-4" />
              </Link>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-white/20 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-800">
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex-1 py-2.5 text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                  activeTab === 'chat'
                    ? 'text-[#0D9488] border-b-2 border-[#0D9488]'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <MessageCircle className="w-4 h-4" />
                Chat
              </button>
              <button
                onClick={() => setActiveTab('planner')}
                className={`flex-1 py-2.5 text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                  activeTab === 'planner'
                    ? 'text-[#0D9488] border-b-2 border-[#0D9488]'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                Planner
              </button>
            </div>

            {/* Content */}
            <div className="h-[400px] flex flex-col">
              {activeTab === 'chat' ? (
                <>
                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 scroll-smooth">
                    {messages.map((msg) => {
                      // ✅ Handle suggestion messages
                      if (msg.role === 'suggestion') {
                        return (
                          <div key={msg.id} className="flex flex-wrap gap-2 justify-center p-2">
                            {msg.suggestions?.map((suggestion, idx) => (
                              <button
                                key={idx}
                                onClick={() => {
                                  setInput(suggestion);
                                  setTimeout(() => handleSend(suggestion), 100);
                                }}
                                className="px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs hover:bg-[#0D9488]/20 hover:text-[#0D9488] transition"
                              >
                                {suggestion}
                              </button>
                            ))}
                          </div>
                        );
                      }
                      
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
                        >
                          <div
                            className={`max-w-[85%] rounded-2xl p-3 ${
                              msg.role === 'user'
                                ? 'bg-[#0D9488] text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                            }`}
                          >
                            <div className="text-sm whitespace-pre-wrap">
                              {formatMessage(msg.content)}
                            </div>
                            <div className={`text-[10px] mt-1 ${msg.role === 'user' ? 'text-white/60' : 'text-gray-400'}`}>
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              {msg.metadata?.isFollowUp && (
                                <span className="ml-2 text-[8px] opacity-50">(follow-up)</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {typing && (
                      <div className="flex justify-start animate-fade-in">
                        <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl p-3">
                          <div className="flex gap-1">
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Error Message */}
                  {error && (
                    <div className="px-4 pb-2">
                      <div className="p-2 rounded-xl bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        {error}
                      </div>
                    </div>
                  )}

                  {/* Quick Actions - Only show on first message */}
                  {messages.length <= 2 && (
                    <div className="px-4 pb-2">
                      <p className="text-[10px] text-gray-400 mb-2 flex items-center gap-1">
                        <HelpCircle className="w-3 h-3" />
                        Try asking:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {quickActions.map((action) => {
                          const Icon = action.icon;
                          return (
                            <button
                              key={action.label}
                              onClick={() => handleQuickAction(action.action)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${action.color} hover:scale-105 transition`}
                            >
                              <Icon className="w-3 h-3" />
                              {action.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Input */}
                  <div className="p-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                    <div className="flex items-center gap-2">
                      <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                        placeholder="Ask AI Tour..."
                        className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none dark:text-white"
                        disabled={loading}
                      />
                      <button
                        onClick={() => handleSend()}
                        disabled={!input.trim() || loading}
                        className="w-10 h-10 rounded-xl bg-gradient-to-r from-[#0D9488] to-[#F59E0B] text-white flex items-center justify-center disabled:opacity-50 hover:scale-105 transition shadow-lg shadow-[#0D9488]/30"
                      >
                        {loading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <p className="text-[10px] text-gray-400 text-center mt-1.5">
                      Powered by AI • Responses are AI-generated {sessionId && '• Session active'}
                    </p>
                  </div>
                </>
              ) : (
                // Planner Tab
                <div className="flex-1 p-4 overflow-y-auto">
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 text-center">
                    <Sparkles className="w-12 h-12 text-[#0D9488] mx-auto mb-3" />
                    <h3 className="font-bold text-[#374151] dark:text-white">Plan Your Trip</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Answer a few questions and let AI create your perfect itinerary.
                    </p>
                    <button
                      onClick={() => {
                        setActiveTab('chat');
                        setInput('I want to plan a trip to Rwanda. Can you help me?');
                        setTimeout(() => handleSend(), 200);
                      }}
                      className="mt-4 px-4 py-2 rounded-xl bg-gradient-to-r from-[#0D9488] to-[#F59E0B] text-white text-sm font-medium hover:scale-105 transition shadow-lg shadow-[#0D9488]/30"
                    >
                      Start Planning
                    </button>
                  </div>

                  <div className="mt-4 space-y-3">
                    <div className="p-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-[#0D9488]" />
                        <span className="font-medium">Top Destinations</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Volcanoes, Kigali, Lake Kivu, Nyungwe</p>
                    </div>
                    <div className="p-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-[#F59E0B]" />
                        <span className="font-medium">Best Time to Visit</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">June - September (Dry Season)</p>
                    </div>
                    <div className="p-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="w-4 h-4 text-[#0D9488]" />
                        <span className="font-medium">Budget Tips</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Gorilla trekking: $1500, Safari: $800+</p>
                    </div>
                  </div>

                  <div className="mt-4 p-3 rounded-xl bg-[#0D9488]/5 border border-[#0D9488]/10">
                    <p className="text-xs text-gray-400 text-center">
                      💡 AI will create a personalized plan based on your preferences
                    </p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default AIWidget;