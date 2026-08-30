// frontend/src/components/ai/AIWidget.jsx
// ✅ COMPLETE FIXED - Added missing quickActions definition

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Star,
  Eye,
  Target,
  CheckCircle,
  LogIn,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { getAIChat, getAIRecommendations } from '../../services/aiService';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

// ===============================
// AI TOUR COLORS
// ===============================
// Teal  : #0D9488
// Gold  : #F59E0B
// Slate : #374151
// White : #FFFFFF
// ===============================

const BOTTOM_NAV_HEIGHT = 72;

// ✅ Experience Card Component
const ExperienceCard = ({ experience, showMatchScore = false }) => {
  if (!experience) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-300 mb-3">
      {experience.coverImage && (
        <div className="relative h-32 sm:h-40 overflow-hidden">
          <img
            src={experience.coverImage}
            alt={experience.title}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              e.target.src = 'https://via.placeholder.com/400x200?text=No+Image';
            }}
          />
          {experience.rating > 0 && (
            <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-white px-2 py-0.5 rounded-full text-xs flex items-center gap-1">
              <Star className="w-3 h-3 text-[#F59E0B] fill-[#F59E0B]" />
              {experience.rating}
            </div>
          )}
          {showMatchScore && experience.matchScore > 70 && (
            <div className="absolute bottom-2 left-2 bg-[#0D9488]/90 backdrop-blur-sm text-white px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1">
              <Target className="w-2.5 h-2.5" />
              {experience.matchScore}% Match
            </div>
          )}
          {experience.budgetStatus === 'within_budget' && (
            <div className="absolute bottom-2 right-2 bg-green-600/90 backdrop-blur-sm text-white px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1">
              <CheckCircle className="w-2.5 h-2.5" />
              Within Budget
            </div>
          )}
          {experience.budgetStatus === 'near_budget' && (
            <div className="absolute bottom-2 right-2 bg-[#F59E0B]/90 backdrop-blur-sm text-white px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1">
              Near Budget
            </div>
          )}
        </div>
      )}
      <div className="p-3 sm:p-4">
        <h4 className="font-bold text-[#374151] dark:text-white text-sm sm:text-base line-clamp-1">
          {experience.title}
        </h4>
        <div className="flex items-center gap-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#0D9488] flex-shrink-0" />
          <span className="truncate">{experience.location}</span>
        </div>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#0D9488] text-sm sm:text-base">
              ${experience.price} {experience.currency || 'USD'}
            </span>
            {experience.duration && (
              <span className="text-xs text-gray-400">• {experience.duration}</span>
            )}
          </div>
          <Link
            to={`/listing/${experience.id}`}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#0D9488] text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-[#0D9488]/80 transition touch-manipulation min-h-[32px]"
          >
            <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            View Details
          </Link>
        </div>
        {showMatchScore && experience.matchReasons && experience.matchReasons.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
            <div className="flex flex-wrap gap-1">
              {experience.matchReasons.slice(0, 3).map((reason, idx) => (
                <span key={idx} className="text-[9px] sm:text-[10px] text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded-full">
                  ✓ {reason}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const ExperienceList = ({ experiences, showMatchScore = false }) => {
  if (!experiences || experiences.length === 0) return null;
  return (
    <div className="mt-2 space-y-2">
      <p className="text-xs font-semibold text-[#0D9488] flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5" />
        Recommended Experiences ({experiences.length} matches)
      </p>
      {experiences.map((exp, index) => (
        <ExperienceCard key={exp.id || index} experience={exp} showMatchScore={showMatchScore} />
      ))}
    </div>
  );
};

// ✅ Intent Extraction - Simple but effective for UI context
const extractIntentFromMessage = (message) => {
  const intent = { destination: null, budget: null, interests: [], travelers: null, travelStyle: null, mood: null };
  const lower = message.toLowerCase();

  const destinations = ['kigali', 'musanze', 'volcanoes', 'akagera', 'nyungwe', 'lake kivu', 'gisenyi', 'rubavu'];
  for (const dest of destinations) {
    if (lower.includes(dest)) { intent.destination = dest; break; }
  }

  const budgetMatch = lower.match(/\$?(\d+)/);
  if (budgetMatch && parseInt(budgetMatch[1]) > 10) {
    intent.budget = parseInt(budgetMatch[1]);
  }

  const interestKeywords = {
    hiking: ['hiking', 'trekking', 'mountain', 'trail'],
    wildlife: ['wildlife', 'safari', 'animal', 'nature'],
    photography: ['photography', 'photo', 'camera', 'picture'],
    culture: ['culture', 'cultural', 'history', 'museum', 'heritage'],
    food: ['food', 'cuisine', 'dining', 'restaurant'],
    adventure: ['adventure', 'thrill', 'exciting', 'extreme'],
    relaxation: ['relax', 'spa', 'wellness', 'peaceful', 'calm'],
  };
  for (const [key, keywords] of Object.entries(interestKeywords)) {
    if (keywords.some(k => lower.includes(k))) {
      intent.interests.push(key);
    }
  }

  if (lower.includes('luxury') || lower.includes('premium') || lower.includes('5-star')) {
    intent.travelStyle = 'luxury';
  } else if (lower.includes('budget') || lower.includes('cheap') || lower.includes('affordable')) {
    intent.travelStyle = 'budget';
  } else if (lower.includes('adventure') || lower.includes('thrill')) {
    intent.travelStyle = 'adventure';
  }

  const travelerMatch = lower.match(/(\d+)\s*(?:people|person|pax|travelers|traveler)/);
  if (travelerMatch) { intent.travelers = parseInt(travelerMatch[1]); }

  return intent;
};

const AIWidget = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [showMatchScore, setShowMatchScore] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const isAuthenticated = !!user && !!localStorage.getItem('token');
  const isProcessingRef = useRef(false);

  // ✅ Track extracted context
  const [extractedContext, setExtractedContext] = useState({
    destination: null, budget: null, interests: [], travelers: null, travelStyle: null, mood: null
  });

  // ✅ Quick actions - defined here
  const quickActions = [
    { label: 'Plan a Trip', icon: Calendar, action: 'plan', color: 'bg-[#0D9488]/10 text-[#0D9488]' },
    { label: 'Find Experiences', icon: MapPin, action: 'experiences', color: 'bg-[#0D9488]/10 text-[#0D9488]' },
    { label: 'Budget Help', icon: DollarSign, action: 'budget', color: 'bg-[#F59E0B]/10 text-[#F59E0B]' },
    { label: 'Recommendations', icon: Sparkles, action: 'recommend', color: 'bg-[#F59E0B]/10 text-[#F59E0B]' },
  ];

  // Device detection
  useEffect(() => {
    const checkDevice = () => {
      setIsMobile(window.innerWidth < 640);
      setIsTablet(window.innerWidth >= 640 && window.innerWidth < 1024);
    };
    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  // Session management
  useEffect(() => {
    const savedSessionId = localStorage.getItem('aiWidgetSessionId');
    if (savedSessionId) setSessionId(savedSessionId);
  }, []);
  useEffect(() => {
    if (sessionId) localStorage.setItem('aiWidgetSessionId', sessionId);
  }, [sessionId]);

  // Welcome message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: `👋 Hi ${user?.name || 'Traveler'}! I'm your AI Tour assistant. I can help you plan trips, find amazing experiences, and explore Rwanda. What would you like to do?`,
        timestamp: new Date().toISOString(),
        experiences: [],
      }]);
    }
  }, [isOpen, user]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  // Focus input
  useEffect(() => {
    if (isOpen && !loading) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen, loading]);

  // ✅ Fetch recommendations with context
  const fetchRecommendations = useCallback(async (context) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('ℹ️ [AIWidget] Not authenticated, using chat fallback');
        return null;
      }

      const params = {
        query: context.destination ? `Experiences in ${context.destination}` : 'Popular experiences in Rwanda',
        limit: 5,
        location: context.destination || undefined,
        sessionId: sessionId,
        userId: user?._id || null,
        budget: context.budget || undefined,
        interests: context.interests || [],
        travelers: context.travelers || undefined,
        travelStyle: context.travelStyle || 'balanced',
      };

      console.log('📤 [AIWidget] Fetching recommendations with params:', params);
      const response = await getAIRecommendations(params);
      
      if (response.success && response.experiences) {
        return response.experiences;
      }
      return [];
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('ℹ️ [AIWidget] Authentication required');
        return null;
      }
      console.error('❌ [AIWidget] Error fetching recommendations:', error);
      return [];
    }
  }, [sessionId, user?._id]);

  // ✅ Handle recommendation request - SINGLE REQUEST
  const handleRecommendationRequest = useCallback(async (message, context) => {
    if (isProcessingRef.current) return;
    
    isProcessingRef.current = true;
    setLoading(true);
    setTyping(true);

    try {
      const intent = extractIntentFromMessage(message);
      const mergedContext = {
        ...context,
        destination: intent.destination || context.destination,
        budget: intent.budget || context.budget,
        interests: [...new Set([...context.interests, ...intent.interests])],
        travelers: intent.travelers || context.travelers,
        travelStyle: intent.travelStyle || context.travelStyle,
        mood: intent.mood || context.mood,
      };
      setExtractedContext(mergedContext);

      const experiences = await fetchRecommendations(mergedContext);

      setTyping(false);

      if (experiences === null) {
        const chatResponse = await getAIChat({
          message: message,
          sessionId: sessionId,
          history: messages.map(m => ({ role: m.role, content: m.content })),
          userId: user?._id || null,
          context: mergedContext,
        });
        const aiText = chatResponse.reply || chatResponse.message || "I found some great experiences in Rwanda! 🌍\n\n💡 *Tip:* Login to get personalized recommendations!";
        const aiMessage = {
          id: Date.now() + 1,
          role: 'assistant',
          content: aiText,
          timestamp: new Date().toISOString(),
          experiences: [],
          metadata: { isFollowUp: true, intent: 'recommendation', totalResults: 0, requiresAuth: true },
        };
        setMessages(prev => [...prev, aiMessage]);
        setLoading(false);
        isProcessingRef.current = false;
        return;
      }

      let responseText = '';
      if (experiences.length === 0) {
        responseText = `I couldn't find any experiences matching your criteria. Try adjusting your budget or interests, or ask me about other destinations.`;
      } else {
        const destText = mergedContext.destination ? ` in ${mergedContext.destination}` : '';
        const budgetText = mergedContext.budget ? ` within your $${mergedContext.budget} budget` : '';
        responseText = `I found ${experiences.length} great experiences${destText}${budgetText}!\n\nHere are the top recommendations:`;
      }

      const aiMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: responseText,
        timestamp: new Date().toISOString(),
        experiences: experiences,
        metadata: { isFollowUp: true, intent: 'recommendation', totalResults: experiences.length },
      };
      setMessages(prev => [...prev, aiMessage]);

      if (experiences.length > 0) {
        const suggestionMessage = {
          id: Date.now() + 2,
          role: 'suggestion',
          content: 'You might want to ask:',
          suggestions: ['Tell me more about the first one', 'Which one is cheapest?', 'Show me more options'],
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, suggestionMessage]);
      }

    } catch (error) {
      console.error('❌ [AIWidget] Recommendation error:', error);
      setTyping(false);
      setError('Sorry, I encountered an error. Please try again.');
    } finally {
      setLoading(false);
      isProcessingRef.current = false;
    }
  }, [fetchRecommendations, messages, sessionId, user?._id]);

  // ✅ Quick actions handler
  const handleQuickAction = useCallback((action) => {
    const prompts = {
      plan: 'I want to plan a trip to Rwanda. Can you help me?',
      experiences: 'What experiences are available in Rwanda?',
      budget: 'How much should I budget for a 5-day trip to Rwanda?',
      recommend: 'Can you recommend the best places to visit in Rwanda?',
    };
    setInput(prompts[action] || '');
    setTimeout(() => handleSend(prompts[action] || ''), 100);
  }, []);

  // ✅ Send message - SINGLE REQUEST
  const handleSend = async (messageOverride) => {
    const messageToSend = messageOverride || input;
    if (!messageToSend.trim() || loading || isProcessingRef.current) return;

    setError(null);

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: messageToSend.trim(),
      timestamp: new Date().toISOString(),
      experiences: [],
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setTyping(true);

    try {
      const intent = extractIntentFromMessage(messageToSend);
      const mergedContext = {
        ...extractedContext,
        destination: intent.destination || extractedContext.destination,
        budget: intent.budget || extractedContext.budget,
        interests: [...new Set([...extractedContext.interests, ...intent.interests])],
        travelers: intent.travelers || extractedContext.travelers,
        travelStyle: intent.travelStyle || extractedContext.travelStyle,
        mood: intent.mood || extractedContext.mood,
      };
      setExtractedContext(mergedContext);

      const isRecommendationRequest = 
        messageToSend.toLowerCase().includes('recommend') ||
        messageToSend.toLowerCase().includes('find') ||
        messageToSend.toLowerCase().includes('show me') ||
        messageToSend.toLowerCase().includes('what') ||
        messageToSend.toLowerCase().includes('where') ||
        messageToSend.toLowerCase().includes('experience') ||
        messageToSend.toLowerCase().includes('suggest') ||
        messageToSend.toLowerCase().includes('looking for') ||
        mergedContext.destination ||
        mergedContext.budget;

      if (isRecommendationRequest) {
        await handleRecommendationRequest(messageToSend, mergedContext);
        setLoading(false);
        return;
      }

      const response = await getAIChat({
        message: messageToSend.trim(),
        sessionId: sessionId,
        history: messages.map(m => ({ role: m.role, content: m.content })),
        userId: user?._id || null,
        context: mergedContext,
      });

      if (response.sessionId) setSessionId(response.sessionId);
      setTyping(false);

      const aiText = response.reply || response.message || "I couldn't generate a response. Please try again.";
      const experiences = response.experiences || [];

      const aiMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: aiText,
        timestamp: new Date().toISOString(),
        experiences: experiences,
        metadata: { isFollowUp: response.isFollowUp || false, intent: response.intent || 'general', totalResults: experiences.length },
      };
      setMessages(prev => [...prev, aiMessage]);

      if (response.quickReplies && response.quickReplies.length > 0) {
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
      let errorMessage = "⚠️ Sorry, I encountered an error. Please try again.";
      if (error.response?.status === 401) errorMessage = "⚠️ Please login to use the AI chat.";
      else if (error.response?.status === 429) errorMessage = "⚠️ Too many requests. Please wait a moment.";
      else if (error.response?.data?.message) errorMessage = `⚠️ ${error.response.data.message}`;
      setError(errorMessage);
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', content: errorMessage, timestamp: new Date().toISOString(), experiences: [] }]);
    } finally {
      setLoading(false);
      isProcessingRef.current = false;
    }
  };

  // Reset chat
  const resetChat = () => {
    if (messages.length > 1 && window.confirm('Clear all messages?')) {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: `👋 Hi ${user?.name || 'Traveler'}! I'm your AI Tour assistant. How can I help you today?`,
        timestamp: new Date().toISOString(),
        experiences: [],
      }]);
      setSessionId(null);
      setExtractedContext({ destination: null, budget: null, interests: [], travelers: null, travelStyle: null, mood: null });
      localStorage.removeItem('aiWidgetSessionId');
    }
  };

  const formatMessage = (content) => {
    if (!content) return null;
    return content.split('\n').map((line, i) => {
      if (line.startsWith('•') || line.startsWith('-')) {
        return <div key={i} className="flex items-start gap-1.5 sm:gap-2 ml-1 sm:ml-2"><span className="text-[#0D9488]">•</span><span className="text-xs sm:text-sm">{line.substring(1).trim()}</span></div>;
      }
      if (line.startsWith('**') && line.endsWith('**')) {
        return <div key={i} className="font-bold text-xs sm:text-sm">{line.replace(/\*\*/g, '')}</div>;
      }
      if (line.trim() === '') return <div key={i} className="h-0.5 sm:h-1" />;
      return <div key={i} className="mb-0.5 sm:mb-1 text-xs sm:text-sm">{line}</div>;
    });
  };

  const getBottomOffset = () => isMobile ? `calc(${BOTTOM_NAV_HEIGHT + 12}px + env(safe-area-inset-bottom))` : '6rem';
  const getWidgetWidth = () => isMobile ? 'calc(100vw - 24px)' : isTablet ? '380px' : '420px';
  const getWidgetHeight = () => isMobile ? 'calc(100vh - 160px)' : 'auto';

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ scale: 0.8, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0, y: 20 }}
        transition={{ type: 'spring', damping: 20 }}
        className="fixed z-50 bg-white dark:bg-gray-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden"
        style={{ right: isMobile ? '12px' : '24px', bottom: getBottomOffset(), width: getWidgetWidth(), maxWidth: '420px', maxHeight: getWidgetHeight(), height: isMobile ? getWidgetHeight() : 'auto' }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0D9488] to-[#F59E0B] p-3 sm:p-4 text-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-xs sm:text-sm md:text-base truncate">AI Tour Assistant</h3>
                <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs text-white/70 flex-wrap">
                  <span className="inline-flex items-center gap-0.5 sm:gap-1"><span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-green-400 animate-pulse" />Online</span>
                  <span className="hidden xs:inline">•</span><span className="hidden xs:inline">24/7</span>
                  {sessionId && <><span className="hidden sm:inline">•</span><span className="text-[8px] sm:text-[10px] hidden sm:inline">Session active</span></>}
                  {extractedContext.destination && <span className="text-[8px] sm:text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full">📍 {extractedContext.destination}</span>}
                  {extractedContext.budget && <span className="text-[8px] sm:text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full">💰 ${extractedContext.budget}</span>}
                  {!isAuthenticated && <span className="text-[8px] sm:text-[10px] bg-[#F59E0B]/30 px-1.5 py-0.5 rounded-full">Guest</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
              {messages.length > 1 && <button onClick={resetChat} className="p-1 sm:p-1.5 rounded-lg hover:bg-white/20 transition touch-manipulation" title="Reset chat"><RefreshCw className="w-3 h-3 sm:w-3.5 sm:h-3.5" /></button>}
              <button onClick={() => setIsMinimized(!isMinimized)} className="p-1 sm:p-1.5 rounded-lg hover:bg-white/20 transition touch-manipulation">{isMinimized ? <ChevronUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}</button>
              <Link to="/ai-chat" className="p-1 sm:p-1.5 rounded-lg hover:bg-white/20 transition touch-manipulation" title="Open Full Chat"><ExternalLink className="w-3 h-3 sm:w-3.5 sm:h-3.5" /></Link>
              <button onClick={onClose} className="p-1 sm:p-1.5 rounded-lg hover:bg-white/20 transition touch-manipulation"><X className="w-3.5 h-3.5 sm:w-4 sm:h-4" /></button>
            </div>
          </div>
        </div>

        {!isMinimized && (
          <>
            <div className="flex border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
              <button onClick={() => setActiveTab('chat')} className={`flex-1 py-2 sm:py-2.5 text-xs sm:text-sm font-medium transition-all duration-200 flex items-center justify-center gap-1 sm:gap-2 ${activeTab === 'chat' ? 'text-[#0D9488] border-b-2 border-[#0D9488]' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'} touch-manipulation`}>
                <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" /><span>Chat</span>
              </button>
              <button onClick={() => setActiveTab('planner')} className={`flex-1 py-2 sm:py-2.5 text-xs sm:text-sm font-medium transition-all duration-200 flex items-center justify-center gap-1 sm:gap-2 ${activeTab === 'planner' ? 'text-[#0D9488] border-b-2 border-[#0D9488]' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'} touch-manipulation`}>
                <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" /><span>Planner</span>
              </button>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden" style={{ height: isMobile ? 'calc(100vh - 280px)' : '400px', minHeight: isMobile ? '300px' : '350px' }}>
              {activeTab === 'chat' ? (
                <>
                  <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 sm:space-y-3 scroll-smooth">
                    {messages.map((msg) => {
                      if (msg.role === 'suggestion') {
                        return (
                          <div key={msg.id} className="flex flex-wrap gap-1.5 sm:gap-2 justify-center p-1.5 sm:p-2">
                            {msg.suggestions?.map((suggestion, idx) => (
                              <button key={idx} onClick={() => { setInput(suggestion); setTimeout(() => handleSend(suggestion), 100); }} className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-[10px] sm:text-xs hover:bg-[#0D9488]/20 hover:text-[#0D9488] transition touch-manipulation min-h-[32px]">
                                {suggestion}
                              </button>
                            ))}
                          </div>
                        );
                      }
                      return (
                        <div key={msg.id}>
                          <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                            <div className={`max-w-[85%] rounded-xl sm:rounded-2xl p-2 sm:p-3 ${msg.role === 'user' ? 'bg-[#0D9488] text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}>
                              <div className="whitespace-pre-wrap break-words">{formatMessage(msg.content)}</div>
                              <div className={`text-[8px] sm:text-[10px] mt-0.5 sm:mt-1 ${msg.role === 'user' ? 'text-white/60' : 'text-gray-400'}`}>
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                {msg.metadata?.isFollowUp && <span className="ml-1 sm:ml-2 text-[6px] sm:text-[8px] opacity-50">(follow-up)</span>}
                              </div>
                            </div>
                          </div>
                          {msg.experiences && msg.experiences.length > 0 && (
                            <div className="mt-2"><ExperienceList experiences={msg.experiences} showMatchScore={showMatchScore} /></div>
                          )}
                        </div>
                      );
                    })}
                    {typing && (
                      <div className="flex justify-start animate-fade-in">
                        <div className="bg-gray-100 dark:bg-gray-700 rounded-xl sm:rounded-2xl p-2 sm:p-3">
                          <div className="flex gap-0.5 sm:gap-1">
                            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {error && (
                    <div className="px-3 sm:px-4 pb-1.5 sm:pb-2 flex-shrink-0">
                      <div className="p-1.5 sm:p-2 rounded-xl bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-[10px] sm:text-xs flex items-center gap-1.5 sm:gap-2">
                        <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                        <span className="break-words">{error}</span>
                      </div>
                    </div>
                  )}

                  {messages.length <= 2 && (
                    <div className="px-3 sm:px-4 pb-1.5 sm:pb-2 flex-shrink-0">
                      <p className="text-[8px] sm:text-[10px] text-gray-400 mb-1 sm:mb-2 flex items-center gap-0.5 sm:gap-1">
                        <HelpCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3" />Try asking:
                      </p>
                      <div className="flex flex-wrap gap-1 sm:gap-2">
                        {quickActions.map((action) => {
                          const Icon = action.icon;
                          return (
                            <button key={action.label} onClick={() => handleQuickAction(action.action)} className={`flex items-center gap-0.5 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-[9px] sm:text-xs font-medium ${action.color} hover:scale-105 transition touch-manipulation min-h-[32px]`}>
                              <Icon className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                              <span className="hidden xs:inline">{action.label}</span>
                              <span className="inline xs:hidden">{action.label.split(' ')[0]}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="p-2 sm:p-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex-shrink-0">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <input ref={inputRef} type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()} placeholder="Ask AI..." className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs sm:text-sm focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none dark:text-white min-h-[40px] sm:min-h-[44px]" disabled={loading} />
                      <button onClick={() => handleSend()} disabled={!input.trim() || loading} className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-r from-[#0D9488] to-[#F59E0B] text-white flex items-center justify-center disabled:opacity-50 hover:scale-105 transition shadow-lg shadow-[#0D9488]/30 min-w-[40px] min-h-[40px] sm:min-w-[44px] sm:min-h-[44px] touch-manipulation">
                        {loading ? <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" /> : <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                      </button>
                    </div>
                    <p className="text-[8px] sm:text-[10px] text-gray-400 text-center mt-1 sm:mt-1.5">Powered by AI • Responses are AI-generated {sessionId && '• Session active'}{!isAuthenticated && ' • Guest mode'}</p>
                  </div>
                </>
              ) : (
                <div className="flex-1 p-3 sm:p-4 overflow-y-auto">
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center">
                    <Sparkles className="w-10 h-10 sm:w-12 sm:h-12 text-[#0D9488] mx-auto mb-2 sm:mb-3" />
                    <h3 className="font-bold text-sm sm:text-base text-[#374151] dark:text-white">Plan Your Trip</h3>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5 sm:mt-1">Answer a few questions and let AI create your perfect itinerary.</p>
                    <button onClick={() => { setActiveTab('chat'); setInput('I want to plan a trip to Rwanda. Can you help me?'); setTimeout(() => handleSend(), 200); }} className="mt-3 sm:mt-4 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-[#0D9488] to-[#F59E0B] text-white text-xs sm:text-sm font-medium hover:scale-105 transition shadow-lg shadow-[#0D9488]/30 touch-manipulation min-h-[36px] sm:min-h-[44px]">
                      Start Planning
                    </button>
                  </div>
                  <div className="mt-3 sm:mt-4 space-y-2 sm:space-y-3">
                    <div className="p-2.5 sm:p-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                      <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm"><MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#0D9488] flex-shrink-0" /><span className="font-medium">Top Destinations</span></div>
                      <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1">Volcanoes, Kigali, Lake Kivu, Nyungwe</p>
                    </div>
                    <div className="p-2.5 sm:p-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                      <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm"><Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#F59E0B] flex-shrink-0" /><span className="font-medium">Best Time to Visit</span></div>
                      <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1">June - September (Dry Season)</p>
                    </div>
                    <div className="p-2.5 sm:p-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                      <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm"><DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#0D9488] flex-shrink-0" /><span className="font-medium">Budget Tips</span></div>
                      <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1">Gorilla trekking: $1500, Safari: $800+</p>
                    </div>
                  </div>
                  <div className="mt-3 sm:mt-4 p-2.5 sm:p-3 rounded-xl bg-[#0D9488]/5 border border-[#0D9488]/10">
                    <p className="text-[9px] sm:text-xs text-gray-400 text-center">💡 AI will create a personalized plan based on your preferences</p>
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