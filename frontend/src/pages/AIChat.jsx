// frontend/src/pages/AIChat.jsx
// ✅ COMPLETE FIXED - Integrated with AI Travel Intelligence Engine
// ✅ Uses the same recommendation logic as AI Planner
// ✅ Hard budget filtering (prevents $1,186 listings for $200 budget)
// ✅ Full session management with conversation memory
// ✅ Real listing card rendering from AI responses
// ✅ Experience cards with "View Details" links
// ✅ Quick replies and follow-up detection
// ✅ Context tracking across messages

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Send, 
  Bot, 
  User, 
  Trash2, 
  Copy, 
  RefreshCw, 
  ThumbsUp, 
  ThumbsDown,
  Sparkles,
  MessageSquare,
  Clock,
  MapPin,
  Calendar,
  DollarSign,
  Wifi,
  X,
  Check,
  Loader2,
  Mic,
  MicOff,
  Image,
  Upload,
  Globe,
  Languages,
  ChevronDown,
  Volume2,
  VolumeX,
  Download,
  FileImage,
  Trash,
  ZoomIn,
  Eye,
  Star,
  Target,
  CheckCircle,
} from 'lucide-react';

// ✅ Import AI services
import { getAIChat, getAIRecommendations } from '../services/aiService';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

// ===============================
// AI TOUR COLORS
// ===============================
// Teal  : #0D9488
// Gold  : #F59E0B
// Slate : #374151
// White : #FFFFFF
// ===============================

// ✅ Experience Card Component with Match Score
const ExperienceCard = ({ experience, showMatchScore = false }) => {
  if (!experience) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-300 mb-3 max-w-sm">
      {/* Image */}
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
          {/* Rating badge */}
          {experience.rating > 0 && (
            <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-white px-2 py-0.5 rounded-full text-xs flex items-center gap-1">
              <Star className="w-3 h-3 text-[#F59E0B] fill-[#F59E0B]" />
              {experience.rating}
            </div>
          )}
          {/* Match Score badge */}
          {showMatchScore && experience.matchScore > 70 && (
            <div className="absolute bottom-2 left-2 bg-[#0D9488]/90 backdrop-blur-sm text-white px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1">
              <Target className="w-2.5 h-2.5" />
              {experience.matchScore}% Match
            </div>
          )}
          {/* Budget Status badge */}
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

      {/* Content */}
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

        {/* Match Reasons */}
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

// ✅ Experience List Component
const ExperienceList = ({ experiences, showMatchScore = false }) => {
  if (!experiences || experiences.length === 0) return null;

  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs font-semibold text-[#0D9488] flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5" />
        Recommended Experiences
        {experiences.length > 0 && (
          <span className="text-[10px] text-gray-400 font-normal">
            ({experiences.length} matches)
          </span>
        )}
      </p>
      <div className="grid grid-cols-1 gap-3">
        {experiences.map((exp, index) => (
          <ExperienceCard key={exp.id || index} experience={exp} showMatchScore={showMatchScore} />
        ))}
      </div>
    </div>
  );
};

// ✅ Intent Extraction Helper
const extractIntentFromMessage = (message) => {
  const intent = {
    destination: null,
    budget: null,
    interests: [],
    travelers: null,
    travelStyle: null,
    mood: null,
  };

  const lower = message.toLowerCase();

  // Destination detection
  const destinations = ['kigali', 'musanze', 'volcanoes', 'akagera', 'nyungwe', 'lake kivu', 'gisenyi', 'rubavu'];
  for (const dest of destinations) {
    if (lower.includes(dest)) {
      intent.destination = dest;
      break;
    }
  }

  // Budget detection
  const budgetMatch = lower.match(/\$?(\d+)/);
  if (budgetMatch && parseInt(budgetMatch[1]) > 10) {
    intent.budget = parseInt(budgetMatch[1]);
  }

  // Interest detection
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

  // Travel style detection
  if (lower.includes('luxury') || lower.includes('premium') || lower.includes('5-star')) {
    intent.travelStyle = 'luxury';
  } else if (lower.includes('budget') || lower.includes('cheap') || lower.includes('affordable')) {
    intent.travelStyle = 'budget';
  } else if (lower.includes('adventure') || lower.includes('thrill')) {
    intent.travelStyle = 'adventure';
  } else if (lower.includes('cultural') || lower.includes('history')) {
    intent.travelStyle = 'cultural';
  } else if (lower.includes('relax') || lower.includes('peaceful')) {
    intent.travelStyle = 'relaxation';
  }

  // Mood detection
  if (lower.includes('adventure') || lower.includes('excitement')) {
    intent.mood = 'Adventure';
  } else if (lower.includes('relax') || lower.includes('calm') || lower.includes('peaceful')) {
    intent.mood = 'Relaxation';
  } else if (lower.includes('romantic') || lower.includes('couple')) {
    intent.mood = 'Romantic';
  } else if (lower.includes('nature') || lower.includes('wildlife')) {
    intent.mood = 'Nature';
  } else if (lower.includes('cultural') || lower.includes('heritage')) {
    intent.mood = 'Cultural';
  }

  // Travelers detection
  const travelerMatch = lower.match(/(\d+)\s*(?:people|person|pax|travelers|traveler)/);
  if (travelerMatch) {
    intent.travelers = parseInt(travelerMatch[1]);
  }

  return intent;
};

// Language configurations
const languages = [
  { code: 'en', name: 'English', flag: '🇬🇧', nativeName: 'English' },
  { code: 'fr', name: 'French', flag: '🇫🇷', nativeName: 'Français' },
  { code: 'rw', name: 'Kinyarwanda', flag: '🇷🇼', nativeName: 'Ikinyarwanda' },
  { code: 'sw', name: 'Swahili', flag: '🇹🇿', nativeName: 'Kiswahili' },
];

// Suggested questions by language
const suggestedQuestionsByLang = {
  en: [
    { text: "Best experiences in Rwanda", icon: MapPin },
    { text: "How much is gorilla trekking?", icon: DollarSign },
    { text: "Luxury Rwanda safari itinerary", icon: Calendar },
    { text: "Best time to visit Volcanoes National Park", icon: Sparkles },
  ],
  fr: [
    { text: "Meilleures expériences au Rwanda", icon: MapPin },
    { text: "Prix du trekking des gorilles", icon: DollarSign },
    { text: "Itinéraire safari de luxe", icon: Calendar },
    { text: "Meilleure saison pour visiter", icon: Sparkles },
  ],
  rw: [
    { text: "Ibikorwa byiza mu Rwanda", icon: MapPin },
    { text: "Ibiciro byo gusura ingagi", icon: DollarSign },
    { text: "Urugendo rwiza rwa safari", icon: Calendar },
    { text: "Igihe cyiza cyo gusura", icon: Sparkles },
  ],
  sw: [
    { text: "Uzoefu bora nchini Rwanda", icon: MapPin },
    { text: "Gharama za gorilla trekking", icon: DollarSign },
    { text: "Ratiba ya safari ya kifahari", icon: Calendar },
    { text: "Msimu bora wa kutembelea", icon: Sparkles },
  ],
};

const AIChat = () => {
  const { user } = useAuth();
  
  // State
  const [message, setMessage] = useState('');
  const [chat, setChat] = useState([]);
  const [loading, setLoading] = useState(false);
  const [typing, setTyping] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [language, setLanguage] = useState('en');
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [showMatchScore, setShowMatchScore] = useState(true);
  
  // ✅ Track extracted context from conversation
  const [extractedContext, setExtractedContext] = useState({
    destination: null,
    budget: null,
    interests: [],
    travelers: null,
    travelStyle: null,
    mood: null,
  });
  
  // Voice input states
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const [voiceSupported, setVoiceSupported] = useState(true);
  
  // Image upload states
  const [uploadedImages, setUploadedImages] = useState([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  
  // Audio output
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechUtterance, setSpeechUtterance] = useState(null);
  
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  // ✅ Restore sessionId from localStorage
  useEffect(() => {
    const savedSessionId = localStorage.getItem('aiChatSessionId');
    if (savedSessionId) {
      setSessionId(savedSessionId);
    }
  }, []);

  // ✅ Save sessionId to localStorage
  useEffect(() => {
    if (sessionId) {
      localStorage.setItem('aiChatSessionId', sessionId);
    }
  }, [sessionId]);

  // ✅ Restore context from localStorage
  useEffect(() => {
    const savedContext = localStorage.getItem('aiChatContext');
    if (savedContext) {
      try {
        setExtractedContext(JSON.parse(savedContext));
      } catch (e) {
        console.error('Error loading context:', e);
      }
    }
  }, []);

  // ✅ Save context to localStorage
  useEffect(() => {
    if (Object.values(extractedContext).some(v => v !== null && v !== 0 && v.length > 0)) {
      localStorage.setItem('aiChatContext', JSON.stringify(extractedContext));
    }
  }, [extractedContext]);

  // ✅ Fetch recommendations using the recommendation engine
  const fetchRecommendations = useCallback(async (context) => {
    try {
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

      console.log('📤 [AIChat] Fetching recommendations with context:', params);

      const response = await getAIRecommendations(params);
      
      if (response.success && response.experiences) {
        console.log(`✅ [AIChat] Got ${response.experiences.length} recommendations`);
        return response.experiences;
      }
      
      return [];
    } catch (error) {
      console.error('❌ [AIChat] Error fetching recommendations:', error);
      return [];
    }
  }, [sessionId, user?._id]);

  // ✅ Handle recommendation requests
  const handleRecommendationRequest = useCallback(async (message, context) => {
    setLoading(true);
    setTyping(true);

    try {
      // Extract intent from message
      const intent = extractIntentFromMessage(message);
      
      // Merge with existing context
      const mergedContext = {
        ...context,
        destination: intent.destination || context.destination,
        budget: intent.budget || context.budget,
        interests: [...new Set([...context.interests, ...intent.interests])],
        travelers: intent.travelers || context.travelers,
        travelStyle: intent.travelStyle || context.travelStyle,
        mood: intent.mood || context.mood,
      };

      // Update context
      setExtractedContext(mergedContext);

      // Get recommendations
      const experiences = await fetchRecommendations(mergedContext);

      setTyping(false);

      // Build response based on results
      let responseText = '';
      if (experiences.length === 0) {
        responseText = `I couldn't find any experiences matching your criteria. Try adjusting your budget or interests, or ask me about other destinations.`;
      } else {
        const count = experiences.length;
        const destText = mergedContext.destination ? ` in ${mergedContext.destination}` : '';
        const budgetText = mergedContext.budget ? ` within your $${mergedContext.budget} budget` : '';
        responseText = `I found ${count} great experiences${destText}${budgetText}!\n\nHere are the top recommendations:`;
      }

      const aiMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        text: responseText,
        timestamp: new Date().toISOString(),
        experiences: experiences,
        isFollowUp: true,
        intent: 'recommendation',
        totalResults: experiences.length,
      };

      setChat(prev => [...prev, aiMessage]);

      // Add quick replies if results found
      if (experiences.length > 0) {
        const suggestions = [
          'Tell me more about the first one',
          'Which one is cheapest?',
          'Show me more options',
        ];
        
        const suggestionMessage = {
          id: Date.now() + 2,
          role: 'suggestion',
          text: 'You might want to ask:',
          suggestions: suggestions,
          timestamp: new Date().toISOString(),
        };
        setChat(prev => [...prev, suggestionMessage]);
      }

    } catch (error) {
      console.error('❌ [AIChat] Recommendation error:', error);
      setTyping(false);
      
      const errorMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        text: "⚠️ Sorry, I encountered an error finding recommendations. Please try again.",
        timestamp: new Date().toISOString(),
        experiences: [],
      };
      setChat(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  }, [fetchRecommendations]);

  // Get placeholders based on language
  const getPlaceholder = () => {
    const placeholders = {
      en: "Ask about Rwanda safaris, hotels, gorilla trekking, cultural experiences...",
      fr: "Posez des questions sur les safaris, hôtels, gorilles, expériences culturelles...",
      rw: "Baza ibyerekeye safari, hoteli, ingagi, ubukerarugendo...",
      sw: "Uliza kuhusu safari, hoteli, gorilla trekking, uzoefu wa kitamaduni..."
    };
    return placeholders[language] || placeholders.en;
  };

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = false;
      recognitionInstance.lang = getSpeechLang(language);
      
      recognitionInstance.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setMessage(prev => prev + (prev ? ' ' : '') + transcript);
        setIsListening(false);
      };
      
      recognitionInstance.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };
      
      recognitionInstance.onend = () => {
        setIsListening(false);
      };
      
      setRecognition(recognitionInstance);
    } else {
      setVoiceSupported(false);
    }
  }, [language]);

  // Get speech recognition language code
  const getSpeechLang = (langCode) => {
    const speechLangs = {
      en: 'en-US',
      fr: 'fr-FR',
      rw: 'en-US',
      sw: 'sw-TZ',
    };
    return speechLangs[langCode] || 'en-US';
  };

  // Load chat from localStorage
  useEffect(() => {
    const savedChat = localStorage.getItem(`aiTourChat_${language}`);
    if (savedChat) {
      try {
        const parsed = JSON.parse(savedChat);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setChat(parsed);
        } else {
          setWelcomeMessage();
        }
      } catch (e) {
        setWelcomeMessage();
      }
    } else {
      setWelcomeMessage();
    }
    // ✅ Reset sessionId when language changes
    setSessionId(null);
    localStorage.removeItem('aiChatSessionId');
  }, [language]);

  const setWelcomeMessage = () => {
    const welcomeMessages = {
      en: "👋 Welcome to AI Tour! I'm your smart Rwanda travel assistant. I can help you discover unforgettable experiences across Rwanda — from gorilla trekking and safaris to luxury stays, culture, and adventure. Ask me anything ✨",
      fr: "👋 Bienvenue sur AI Tour ! Je suis votre assistant intelligent pour découvrir le Rwanda. Je peux vous aider à trouver des expériences inoubliables ✨",
      rw: "👋 Murakaza neza kuri AI Tour! Ndi umufasha wawe w'ubukerarugendo mu Rwanda. Ndashobora kugufasha kubona ibikorwa byiza ✨",
      sw: "👋 Karibu AI Tour! Mimi ni msaidizi wako wa utalii nchini Rwanda. Ninaweza kukusaidia kupata uzoefu wa kukumbukwa ✨",
    };
    
    setChat([{
      id: Date.now(),
      role: 'assistant',
      text: welcomeMessages[language] || welcomeMessages.en,
      timestamp: new Date().toISOString(),
      experiences: [],
    }]);
  };

  // Save chat to localStorage
  useEffect(() => {
    if (chat.length > 0) {
      localStorage.setItem(`aiTourChat_${language}`, JSON.stringify(chat));
    }
  }, [chat, language]);

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat, loading, typing]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 180) + 'px';
    }
  }, [message]);

  // Voice input handler
  const startVoiceInput = () => {
    if (recognition && !isListening) {
      try {
        recognition.lang = getSpeechLang(language);
        recognition.start();
        setIsListening(true);
      } catch (error) {
        console.error('Voice recognition error:', error);
        setIsListening(false);
      }
    }
  };

  const stopVoiceInput = () => {
    if (recognition && isListening) {
      recognition.stop();
      setIsListening(false);
    }
  };

  // Text-to-speech with error handling
  const speakText = (text) => {
    if (!('speechSynthesis' in window)) {
      console.warn('Speech synthesis not supported');
      return;
    }

    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
      window.speechSynthesis.cancel();
    }

    if (speechUtterance) {
      speechUtterance.onend = null;
      speechUtterance.onerror = null;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    
    const speechLangs = {
      en: 'en-US',
      fr: 'fr-FR',
      rw: 'en-US',
      sw: 'sw-TZ',
    };
    
    utterance.lang = speechLangs[language] || 'en-US';
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;
    
    utterance.onstart = () => {
      setIsSpeaking(true);
    };
    
    utterance.onend = () => {
      setIsSpeaking(false);
      setSpeechUtterance(null);
    };
    
    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      setIsSpeaking(false);
      setSpeechUtterance(null);
    };
    
    setSpeechUtterance(utterance);
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      if (speechUtterance) {
        speechUtterance.onend = null;
        setSpeechUtterance(null);
      }
    }
  };

  // Image upload handler
  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    setUploadingImage(true);
    
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          const imageData = {
            id: Date.now() + Math.random(),
            url: reader.result,
            name: file.name,
            size: file.size,
            type: file.type,
          };
          setUploadedImages(prev => [...prev, imageData]);
        };
        reader.readAsDataURL(file);
      }
    }
    
    setUploadingImage(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (imageId) => {
    setUploadedImages(prev => prev.filter(img => img.id !== imageId));
  };

  // ✅ Send message with context-aware recommendations
  const sendMessage = async () => {
    if ((!message.trim() && uploadedImages.length === 0) || loading) return;

    const userMessage = {
      id: Date.now(),
      role: 'user',
      text: message || '📷 Shared image',
      images: uploadedImages.map((img) => img.url),
      timestamp: new Date().toISOString(),
      experiences: [],
    };

    setChat((prev) => [...prev, userMessage]);

    const currentMessage = message;
    const currentImages = [...uploadedImages];

    setMessage('');
    setUploadedImages([]);
    setLoading(true);
    setTyping(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // ✅ Check if this is a recommendation request
    const isRecommendationRequest = 
      currentMessage.toLowerCase().includes('recommend') ||
      currentMessage.toLowerCase().includes('find') ||
      currentMessage.toLowerCase().includes('show me') ||
      currentMessage.toLowerCase().includes('what') ||
      currentMessage.toLowerCase().includes('where') ||
      currentMessage.toLowerCase().includes('experience') ||
      currentMessage.toLowerCase().includes('suggest') ||
      currentMessage.toLowerCase().includes('looking for');

    // Extract intent from message
    const intent = extractIntentFromMessage(currentMessage);
    
    // Merge with existing context
    const mergedContext = {
      ...extractedContext,
      destination: intent.destination || extractedContext.destination,
      budget: intent.budget || extractedContext.budget,
      interests: [...new Set([...extractedContext.interests, ...intent.interests])],
      travelers: intent.travelers || extractedContext.travelers,
      travelStyle: intent.travelStyle || extractedContext.travelStyle,
      mood: intent.mood || extractedContext.mood,
    };

    // Update context
    setExtractedContext(mergedContext);

    // ✅ If recommendation request, use the recommendation engine
    if (isRecommendationRequest || mergedContext.destination || mergedContext.budget) {
      await handleRecommendationRequest(currentMessage, mergedContext);
      setLoading(false);
      return;
    }

    try {
      // ✅ Otherwise, use the chat service
      const response = await getAIChat({
        message: currentMessage,
        sessionId: sessionId,
        language: language,
        images: currentImages.map((img) => img.url),
        history: chat.map((msg) => ({
          role: msg.role,
          content: msg.text,
        })),
        userId: user?._id || null,
        context: mergedContext,
      });

      // ✅ Store sessionId for future messages
      if (response.sessionId) {
        setSessionId(response.sessionId);
      }

      setTyping(false);

      const aiText = response.reply || response.message || "I couldn't generate a response. Please try again.";
      
      // ✅ Extract experiences from response
      const experiences = response.experiences || [];

      const aiMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        text: aiText,
        timestamp: new Date().toISOString(),
        experiences: experiences,
        isFollowUp: response.isFollowUp || false,
        intent: response.intent || 'general',
        totalResults: response.totalResults || experiences.length,
      };

      setChat((prev) => [...prev, aiMessage]);

      // ✅ Add quick replies if available
      if (response.quickReplies && response.quickReplies.length > 0) {
        const suggestionMessage = {
          id: Date.now() + 2,
          role: 'suggestion',
          text: 'You might want to ask:',
          suggestions: response.quickReplies.slice(0, 4),
          timestamp: new Date().toISOString(),
        };
        setChat((prev) => [...prev, suggestionMessage]);
      }

    } catch (error) {
      console.error('❌ AI Chat Error:', error);
      setTyping(false);
      
      let errorMessage = "⚠️ Sorry, I encountered an error. Please try again.";
      
      if (error.response?.status === 401) {
        errorMessage = "⚠️ Please login to use the AI chat.";
      } else if (error.response?.status === 429) {
        errorMessage = "⚠️ Too many requests. Please wait a moment.";
      } else if (error.response?.data?.message) {
        errorMessage = `⚠️ ${error.response.data.message}`;
      }
      
      setChat((prev) => [
        ...prev,
        {
          id: Date.now(),
          role: 'assistant',
          text: errorMessage,
          timestamp: new Date().toISOString(),
          experiences: [],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Format message text
  const formatMessageText = (text) => {
    if (!text) return '';
    let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/^- (.*?)$/gm, '• $1');
    formatted = formatted.replace(/\n/g, '<br />');
    return formatted;
  };

  // Copy message
  const copyToClipboard = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Clear chat
  const clearChat = () => {
    const clearMessages = {
      en: "✨ Conversation cleared. I'm ready to help you discover amazing experiences in Rwanda!",
      fr: "✨ Conversation supprimée. Je suis prêt à vous aider à découvrir des expériences incroyables !",
      rw: "✨ Ibiganiro bisibwe neza. Ndi tayari kugufasha kubona ibikorwa byiza mu Rwanda!",
      sw: "✨ Mazungumzo yamefutwa. Niko tayari kukusaidia kupata uzoefu mzuri nchini Rwanda!",
    };
    setChat([{
      id: Date.now(),
      role: 'assistant',
      text: clearMessages[language] || clearMessages.en,
      timestamp: new Date().toISOString(),
      experiences: [],
    }]);
    setSessionId(null);
    setExtractedContext({
      destination: null,
      budget: null,
      interests: [],
      travelers: null,
      travelStyle: null,
      mood: null,
    });
    localStorage.removeItem('aiChatSessionId');
    localStorage.removeItem('aiChatContext');
    setShowClearConfirm(false);
  };

  // Handle Enter key
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Get current suggested questions
  const currentSuggestions = suggestedQuestionsByLang[language] || suggestedQuestionsByLang.en;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-[#0D9488]/10 dark:bg-[#0D9488]/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-[#F59E0B]/10 dark:bg-[#F59E0B]/5 rounded-full blur-3xl"></div>
      </div>

      {/* Image Preview Modal */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setSelectedImage(null)}>
          <div className="relative max-w-4xl max-h-[90vh]">
            <img src={selectedImage} alt="Preview" className="max-w-full max-h-[90vh] object-contain rounded-2xl" />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}

      {/* MAIN WRAPPER */}
      <div className="w-full min-h-screen px-2 sm:px-4 md:px-6 py-2 md:py-6">
        
        {/* Chat Card */}
        <div className="w-full h-[100dvh] md:h-auto flex flex-col bg-white dark:bg-gray-800 rounded-none md:rounded-3xl shadow-2xl overflow-hidden border-0 md:border border-gray-100 dark:border-gray-700">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-[#0D9488] via-[#0D9488] to-[#F59E0B] text-white p-4 md:p-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                    <Bot className="w-5 h-5 md:w-6 md:h-6" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
                </div>
                <div>
                  <h1 className="text-xl md:text-2xl font-black">AI Tour Assistant</h1>
                  <div className="flex items-center gap-2 text-xs md:text-sm text-white/80">
                    <span className="inline-flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      Online 24/7
                    </span>
                    {sessionId && (
                      <>
                        <span className="opacity-50">•</span>
                        <span className="text-[10px] opacity-70">Session active</span>
                      </>
                    )}
                    {extractedContext.destination && (
                      <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full">
                        📍 {extractedContext.destination}
                      </span>
                    )}
                    {extractedContext.budget && (
                      <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full">
                        💰 ${extractedContext.budget}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Session Status - Hidden on mobile */}
                {sessionId && (
                  <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg bg-white/10 text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                    Connected
                  </div>
                )}

                {/* Language Selector */}
                <div className="relative">
                  <button
                    onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/20 backdrop-blur hover:bg-white/30 transition-all duration-300"
                  >
                    <Languages className="w-4 h-4" />
                    <span className="text-sm font-medium hidden sm:inline">
                      {languages.find(l => l.code === language)?.nativeName}
                    </span>
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  
                  {showLanguageMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowLanguageMenu(false)}></div>
                      <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden">
                        {languages.map((lang) => (
                          <button
                            key={lang.code}
                            onClick={() => {
                              setLanguage(lang.code);
                              setShowLanguageMenu(false);
                            }}
                            className={`w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition flex items-center gap-2 ${
                              language === lang.code ? 'bg-[#0D9488]/10 text-[#0D9488]' : ''
                            }`}
                          >
                            <span className="text-xl">{lang.flag}</span>
                            <span className="font-medium">{lang.nativeName}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Clear Chat Button */}
                {chat.length > 1 && (
                  <button
                    onClick={() => setShowClearConfirm(true)}
                    className="p-2 rounded-xl hover:bg-white/20 transition-all duration-300"
                    title="Clear chat history"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Clear Chat Modal */}
          {showClearConfirm && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-sm w-full p-6 animate-fade-in">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold dark:text-white">
                    {language === 'en' && 'Clear Chat?'}
                    {language === 'fr' && 'Effacer le chat?'}
                    {language === 'rw' && 'Gusiba ibibazo?'}
                    {language === 'sw' && 'Futa Mazungumzo?'}
                  </h3>
                  <button onClick={() => setShowClearConfirm(false)} className="p-1">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  {language === 'en' && 'This will delete all your conversation history. This action cannot be undone.'}
                  {language === 'fr' && 'Cette action est irréversible.'}
                  {language === 'rw' && 'Ntibishobora gusubirwaho.'}
                  {language === 'sw' && 'Kitendo hiki hakiwezi kutenduliwa.'}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    className="flex-1 py-2 rounded-xl border border-gray-300 dark:border-gray-600 font-medium"
                  >
                    {language === 'en' && 'Cancel'}
                    {language === 'fr' && 'Annuler'}
                    {language === 'rw' && 'Hagarika'}
                    {language === 'sw' && 'Ghairi'}
                  </button>
                  <button
                    onClick={clearChat}
                    className="flex-1 py-2 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition"
                  >
                    {language === 'en' && 'Clear'}
                    {language === 'fr' && 'Effacer'}
                    {language === 'rw' && 'Siba'}
                    {language === 'sw' && 'Futa'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-3 md:p-6 space-y-4 scroll-smooth overscroll-contain">
            {chat.map((msg) => {
              // ✅ Handle suggestion messages
              if (msg.role === 'suggestion') {
                return (
                  <div key={msg.id} className="flex justify-center">
                    <div className="flex flex-wrap gap-2 justify-center p-2 max-w-2xl">
                      <p className="w-full text-center text-xs text-gray-500 dark:text-gray-400 mb-1">
                        {msg.text}
                      </p>
                      {msg.suggestions?.map((suggestion, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setMessage(suggestion);
                            setTimeout(() => sendMessage(), 100);
                          }}
                          className="px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs hover:bg-[#0D9488]/20 hover:text-[#0D9488] transition"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              }

              return (
                <div key={msg.id}>
                  <div
                    className={`flex animate-slide-up ${
                      msg.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div className={`flex gap-3 max-w-[85%] md:max-w-[75%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                      
                      {/* Avatar */}
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        msg.role === 'user'
                          ? 'bg-[#0D9488]/10 dark:bg-[#0D9488]/20'
                          : 'bg-gradient-to-r from-[#0D9488] to-[#F59E0B]'
                      }`}>
                        {msg.role === 'user' ? (
                          <User className="w-4 h-4 text-[#0D9488]" />
                        ) : (
                          <Bot className="w-4 h-4 text-white" />
                        )}
                      </div>

                      {/* Message Bubble */}
                      <div className="group relative">
                        <div className={`rounded-2xl p-4 ${
                          msg.role === 'user'
                            ? 'bg-gradient-to-r from-[#0D9488] to-[#0f766e] text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                        }`}>
                          <div className="text-sm font-medium mb-1 opacity-70 flex items-center gap-2">
                            {msg.role === 'user' ? (
                              language === 'en' ? 'You' : language === 'fr' ? 'Vous' : language === 'rw' ? 'Wewe' : 'Wewe'
                            ) : (
                              'AI Tour'
                            )}
                            {msg.isFollowUp && (
                              <span className="text-[8px] opacity-50 bg-gray-500/20 px-1.5 py-0.5 rounded-full">
                                follow-up
                              </span>
                            )}
                          </div>
                          
                          {/* Display uploaded images */}
                          {msg.images && msg.images.length > 0 && (
                            <div className="flex gap-2 mb-3 flex-wrap">
                              {msg.images.map((img, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => setSelectedImage(img)}
                                  className="relative group/img"
                                >
                                  <img
                                    src={img}
                                    alt={`Uploaded ${idx + 1}`}
                                    className="w-20 h-20 object-cover rounded-lg cursor-pointer hover:opacity-90 transition"
                                  />
                                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/img:opacity-100 rounded-lg flex items-center justify-center transition">
                                    <ZoomIn className="w-5 h-5 text-white" />
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                          
                          <div 
                            className="whitespace-pre-wrap leading-relaxed text-sm md:text-base"
                            dangerouslySetInnerHTML={{ __html: formatMessageText(msg.text) }}
                          />
                          <div className="text-xs opacity-50 mt-2">
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>

                        {/* Message Actions */}
                        <div className="absolute -bottom-8 right-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-1">
                          <button
                            onClick={() => copyToClipboard(msg.text, msg.id)}
                            className="p-1.5 rounded-lg bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 transition"
                            title="Copy message"
                          >
                            {copiedId === msg.id ? (
                              <Check className="w-3 h-3 text-green-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                          {msg.role === 'assistant' && (
                            <button
                              onClick={() => speakText(msg.text)}
                              className="p-1.5 rounded-lg bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 transition"
                              title="Read aloud"
                            >
                              <Volume2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ✅ Render experiences if present */}
                  {msg.experiences && msg.experiences.length > 0 && (
                    <div className="mt-2 ml-12">
                      <ExperienceList experiences={msg.experiences} showMatchScore={showMatchScore} />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Typing Indicator */}
            {typing && (
              <div className="flex justify-start animate-fade-in">
                <div className="flex gap-3 max-w-[85%]">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-[#0D9488] to-[#F59E0B] flex items-center justify-center">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl p-4">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Uploaded Images Preview */}
          {uploadedImages.length > 0 && (
            <div className="px-4 pb-2">
              <div className="flex gap-2 flex-wrap">
                {uploadedImages.map((img) => (
                  <div key={img.id} className="relative group">
                    <img
                      src={img.url}
                      alt="Preview"
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => removeImage(img.id)}
                      className="absolute -top-2 -right-2 p-1 rounded-full bg-red-500 text-white hover:bg-red-600 transition opacity-0 group-hover:opacity-100"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggested Questions - Only show on first message */}
          {chat.length <= 2 && !loading && (
            <div className="px-4 pb-2">
              <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#F59E0B]" />
                {language === 'en' && 'Suggested questions:'}
                {language === 'fr' && 'Questions suggérées:'}
                {language === 'rw' && 'Ibibazo byatanzwe:'}
                {language === 'sw' && 'Maswali yanayopendekezwa:'}
              </p>
              <div className="flex flex-wrap gap-2">
                {currentSuggestions.map((q, idx) => {
                  const Icon = q.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        setMessage(q.text);
                        inputRef.current?.focus();
                      }}
                      className="px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-700 text-xs hover:bg-[#0D9488]/10 dark:hover:bg-[#0D9488]/20 hover:text-[#0D9488] transition-all duration-200 flex items-center gap-1"
                    >
                      <Icon className="w-3 h-3 text-[#0D9488]" />
                      <span className="truncate max-w-[150px] md:max-w-none">
                        {q.text.length > 35 ? q.text.substring(0, 35) + '...' : q.text}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="border-t border-gray-100 dark:border-gray-700 p-4 md:p-6 pb-24 md:pb-6 bg-white dark:bg-gray-800">
            <div className="flex gap-3">
              {/* Image Upload Button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-[#0D9488]/10 dark:hover:bg-[#0D9488]/20 hover:text-[#0D9488] transition-all duration-300 flex items-center justify-center flex-shrink-0"
                title="Upload image"
              >
                <Image className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
              />
              
              {/* Text Input */}
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = Math.min(e.target.scrollHeight, 180) + 'px';
                  }}
                  onKeyPress={handleKeyPress}
                  placeholder={getPlaceholder()}
                  className="
                    w-full
                    min-h-[52px]
                    max-h-[180px]
                    px-3 md:px-4
                    py-3
                    rounded-xl
                    border border-gray-200 dark:border-gray-700
                    bg-gray-50 dark:bg-gray-900
                    text-sm md:text-base
                    text-gray-800 dark:text-white
                    placeholder:text-gray-400
                    dark:placeholder:text-gray-500
                    placeholder:text-xs
                    sm:placeholder:text-sm
                    focus:outline-none
                    focus:ring-2
                    focus:ring-[#0D9488]
                    resize-none
                    overflow-y-auto
                    leading-tight
                  "
                  rows="1"
                />
              </div>
              
              {/* Voice Input Button */}
              {voiceSupported && (
                <button
                  onClick={isListening ? stopVoiceInput : startVoiceInput}
                  className={`w-12 h-12 rounded-xl transition-all duration-300 flex items-center justify-center flex-shrink-0 ${
                    isListening
                      ? 'bg-red-500 text-white animate-pulse'
                      : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300'
                  }`}
                  title={isListening ? "Stop recording" : "Start voice input"}
                >
                  {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
              )}
              
              {/* Send Button */}
              <button
                onClick={sendMessage}
                disabled={(!message.trim() && uploadedImages.length === 0) || loading}
                className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 flex-shrink-0 ${
                  (message.trim() || uploadedImages.length > 0) && !loading
                    ? 'bg-gradient-to-r from-[#0D9488] to-[#F59E0B] text-white hover:scale-105 shadow-lg shadow-[#0D9488]/30'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                }`}
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
            
            {/* Voice Recording Indicator */}
            {isListening && (
              <div className="mt-2 text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 text-xs">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  {language === 'en' && 'Listening... Speak about your trip'}
                  {language === 'fr' && 'Je vous écoute... Parlez de votre voyage'}
                  {language === 'rw' && 'Ndakumva... Vuga iby\'urugendo rwawe'}
                  {language === 'sw' && 'Ninasikiliza... Ongea kuhusu safari yako'}
                </div>
              </div>
            )}
            
            {/* Audio Playing Indicator */}
            {isSpeaking && (
              <div className="mt-2 text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0D9488]/10 dark:bg-[#0D9488]/20 text-[#0D9488] text-xs">
                  <Volume2 className="w-3 h-3 animate-pulse" />
                  {language === 'en' && 'AI Tour is speaking...'}
                  {language === 'fr' && 'AI Tour parle...'}
                  {language === 'rw' && 'AI Tour iri kuvuga...'}
                  {language === 'sw' && 'AI Tour inazungumza...'}
                  <button onClick={stopSpeaking} className="ml-2 hover:text-[#0D9488]">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIChat;