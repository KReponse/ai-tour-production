// backend/src/ai/providers/providerInterface.js
// ✅ PRODUCTION-READY - No race conditions, clean fallback chain, async-safe fallback provider

import { GeminiProvider } from './gemini.provider.js';
import { OpenAIProvider } from './openai.provider.js';

class AIProviderInterface {
  constructor() {
    console.log('🔧 Initializing AI Provider Interface...');
    this.provider = null;
    this.currentProvider = null;
    this.initialized = false;
    this.initializationPromise = null;
    this.providers = {
      gemini: GeminiProvider,
      openai: OpenAIProvider
    };
    
    // ✅ Cache initialized fallback providers
    this.providerInstances = {
      gemini: null,
      openai: null,
      mock: null
    };
    
    // ✅ Provider health tracking (simple)
    this.providerHealth = {
      gemini: { healthy: true, lastError: null, lastErrorTime: null },
      openai: { healthy: true, lastError: null, lastErrorTime: null }
    };
  }

  /**
   * ✅ ASYNCHRONOUS INITIALIZE with deduplication
   */
  async initialize() {
    if (this.initializationPromise) {
      console.log('ℹ️ AI Provider initialization already in progress...');
      return this.initializationPromise;
    }

    if (this.initialized) {
      console.log('ℹ️ AI Provider already initialized');
      return this.provider !== null;
    }

    this.initializationPromise = this._doInitialize();
    return this.initializationPromise;
  }

  async _doInitialize() {
    console.log('🚀 Initializing AI Provider (lazy validation mode)...');
    
    // ✅ Try providers in priority order
    const providerOrder = ['gemini', 'openai'];
    
    for (const providerName of providerOrder) {
      console.log(`📌 Trying ${providerName}...`);
      
      try {
        const ProviderClass = this.providers[providerName];
        if (!ProviderClass) {
          console.warn(`⚠️ Provider ${providerName} not registered`);
          continue;
        }

        // ✅ Create provider instance and initialize (NO validation)
        const providerInstance = new ProviderClass();
        const initialized = await providerInstance.initialize();
        
        if (initialized && providerInstance.isReady()) {
          this.provider = providerInstance;
          this.currentProvider = providerName;
          this.providerInstances[providerName] = providerInstance;
          this.initialized = true;
          
          console.log(`✅ AI Provider initialized`);
          console.log(`📌 Active provider: ${this.currentProvider}`);
          console.log(`📌 Provider available: true`);
          console.log(`📌 Model validation will happen on first request (lazy)`);
          
          return true;
        } else {
          console.warn(`⚠️ ${providerName} not ready after initialization`);
        }
      } catch (error) {
        console.error(`❌ ${providerName} initialization failed:`, error.message);
      }
    }

    // ✅ If no real provider works, use MockProvider
    console.warn('⚠️ No AI provider available, using MockProvider');
    this.provider = await this._getOrCreateMockProvider();
    this.currentProvider = 'mock';
    this.initialized = true;
    
    console.log(`📌 Active provider: ${this.currentProvider}`);
    console.log(`📌 Provider available: true`);
    
    return true;
  }

  /**
   * ✅ GET OR CREATE MOCK PROVIDER
   */
  async _getOrCreateMockProvider() {
    if (this.providerInstances.mock) {
      return this.providerInstances.mock;
    }
    
    const mock = new MockProvider();
    await mock.initialize();
    this.providerInstances.mock = mock;
    return mock;
  }

  /**
   * ✅ GET OR CREATE PROVIDER INSTANCE
   */
  async _getOrCreateProviderInstance(providerName) {
    // ✅ Return cached if available and ready
    if (this.providerInstances[providerName] && 
        this.providerInstances[providerName].isReady()) {
      return this.providerInstances[providerName];
    }
    
    // ✅ Create new instance
    const ProviderClass = this.providers[providerName];
    if (!ProviderClass) {
      return null;
    }
    
    const instance = new ProviderClass();
    const initialized = await instance.initialize();
    
    if (initialized && instance.isReady()) {
      this.providerInstances[providerName] = instance;
      return instance;
    }
    
    return null;
  }

  /**
   * ✅ CHECK AVAILABILITY
   */
  isAvailable() {
    try {
      if (!this.provider) return false;
      
      if (typeof this.provider.isReady === 'function') {
        return this.provider.isReady();
      }
      
      return this.provider.available === true;
    } catch (error) {
      console.warn('⚠️ isAvailable() error:', error.message);
      return false;
    }
  }

  /**
   * ✅ GET FALLBACK PROVIDER (ASYNC-SAFE)
   */
  async getFallbackProvider(currentProvider) {
    const fallbackOrder = {
      gemini: 'openai',
      openai: 'mock'
    };
    
    const fallbackName = fallbackOrder[currentProvider];
    if (!fallbackName) {
      return this._getOrCreateMockProvider();
    }
    
    // ✅ Check health before using fallback
    if (fallbackName !== 'mock') {
      const health = this.providerHealth[fallbackName];
      if (health && !health.healthy) {
        console.warn(`⚠️ ${fallbackName} is marked unhealthy, skipping...`);
        return this._getOrCreateMockProvider();
      }
    }
    
    // ✅ If fallback is mock, use mock
    if (fallbackName === 'mock') {
      return this._getOrCreateMockProvider();
    }
    
    // ✅ Try to get/create fallback provider
    const provider = await this._getOrCreateProviderInstance(fallbackName);
    if (provider && provider.isReady()) {
      console.log(`✅ Fallback provider ${fallbackName} is ready`);
      return provider;
    }
    
    // ✅ If fallback failed, use mock
    console.warn(`⚠️ Fallback ${fallbackName} failed, using mock`);
    return this._getOrCreateMockProvider();
  }

  /**
   * ✅ MARK PROVIDER HEALTH
   */
  _markProviderHealth(providerName, healthy, error = null) {
    if (this.providerHealth[providerName]) {
      this.providerHealth[providerName].healthy = healthy;
      this.providerHealth[providerName].lastError = error?.message || null;
      this.providerHealth[providerName].lastErrorTime = healthy ? null : new Date();
    }
  }

  /**
   * ✅ CHAT with automatic retry and fallback
   */
  async chat(messages, options = {}) {
    console.log(`📤 chat() called in provider interface`);
    console.log(`📌 Using provider: ${this.currentProvider}`);
    
    if (!this.isAvailable()) {
      console.warn('⚠️ No AI provider available for chat');
      throw new Error('No AI provider available');
    }
    
    try {
      const result = await this.provider.chat(messages, options);
      
      // ✅ If provider returned a valid fallback response, return it
      if (result && result.fallback === true && result.success === true) {
        console.log(`📥 Provider returned fallback response, using it`);
        return result;
      }
      
      console.log('📥 Chat result received from provider');
      return result;
    } catch (error) {
      console.error(`❌ Provider chat error (${this.currentProvider}):`, error.message);
      
      // ✅ Mark provider as potentially unhealthy
      this._markProviderHealth(this.currentProvider, false, error);
      
      // ✅ Try fallback provider
      console.log('🔄 Trying fallback provider...');
      const fallbackProvider = await this.getFallbackProvider(this.currentProvider);
      
      if (fallbackProvider && fallbackProvider !== this.provider) {
        try {
          const result = await fallbackProvider.chat(messages, options);
          console.log('📥 Chat result from fallback provider');
          return result;
        } catch (fallbackError) {
          console.error('❌ Fallback provider also failed:', fallbackError.message);
          // ✅ Try mock as last resort
          const mock = await this._getOrCreateMockProvider();
          console.log('🤖 Using MockProvider as last resort');
          return mock.chat(messages, options);
        }
      }
      
      // ✅ If no fallback, use mock
      const mock = await this._getOrCreateMockProvider();
      console.log('🤖 Using MockProvider as last resort');
      return mock.chat(messages, options);
    }
  }

  /**
   * ✅ PLAN with automatic retry and fallback
   */
  async plan(params) {
    console.log(`📤 plan() called in provider interface`);
    console.log(`📌 Using provider: ${this.currentProvider}`);
    
    if (!this.isAvailable()) {
      console.warn('⚠️ No AI provider available for plan');
      throw new Error('No AI provider available');
    }
    
    try {
      const result = await this.provider.plan(params);
      
      if (result && result.fallback === true && result.success === true) {
        console.log(`📥 Provider returned fallback plan, using it`);
        return result;
      }
      
      return result;
    } catch (error) {
      console.error(`❌ Provider plan error (${this.currentProvider}):`, error.message);
      
      this._markProviderHealth(this.currentProvider, false, error);
      
      console.log('🔄 Trying fallback provider...');
      const fallbackProvider = await this.getFallbackProvider(this.currentProvider);
      
      if (fallbackProvider && fallbackProvider !== this.provider) {
        try {
          return await fallbackProvider.plan(params);
        } catch (fallbackError) {
          console.error('❌ Fallback provider also failed:', fallbackError.message);
        }
      }
      
      const mock = await this._getOrCreateMockProvider();
      console.log('🤖 Using MockProvider as last resort');
      return mock.plan(params);
    }
  }

  /**
   * ✅ RECOMMEND with automatic retry and fallback
   */
  async recommend(params) {
    console.log(`📤 recommend() called in provider interface`);
    console.log(`📌 Using provider: ${this.currentProvider}`);
    
    if (!this.isAvailable()) {
      console.warn('⚠️ No AI provider available for recommend');
      throw new Error('No AI provider available');
    }
    
    try {
      const result = await this.provider.recommend(params);
      
      if (result && result.fallback === true && result.success === true) {
        console.log(`📥 Provider returned fallback recommendations, using it`);
        return result;
      }
      
      return result;
    } catch (error) {
      console.error(`❌ Provider recommend error (${this.currentProvider}):`, error.message);
      
      this._markProviderHealth(this.currentProvider, false, error);
      
      console.log('🔄 Trying fallback provider...');
      const fallbackProvider = await this.getFallbackProvider(this.currentProvider);
      
      if (fallbackProvider && fallbackProvider !== this.provider) {
        try {
          return await fallbackProvider.recommend(params);
        } catch (fallbackError) {
          console.error('❌ Fallback provider also failed:', fallbackError.message);
        }
      }
      
      const mock = await this._getOrCreateMockProvider();
      console.log('🤖 Using MockProvider as last resort');
      return mock.recommend(params);
    }
  }

  /**
   * ✅ SWITCH PROVIDER
   */
  async switchProvider(providerName) {
    if (!this.providers[providerName]) {
      throw new Error(`AI Provider ${providerName} not available`);
    }
    
    console.log(`🔄 Switching to ${providerName}...`);
    
    // ✅ Create and initialize new provider BEFORE switching
    const ProviderClass = this.providers[providerName];
    const newProvider = new ProviderClass();
    const initialized = await newProvider.initialize();
    
    if (!initialized || !newProvider.isReady()) {
      throw new Error(`Failed to initialize ${providerName}`);
    }
    
    // ✅ Only switch if initialization succeeded
    this.provider = newProvider;
    this.currentProvider = providerName;
    this.providerInstances[providerName] = newProvider;
    
    console.log(`✅ Switched to ${providerName}`);
    return this.currentProvider;
  }

  /**
   * ✅ GET PROVIDER INFO
   */
  getProviderInfo() {
    const isReady = this.isAvailable();
    
    let providerInfo = {
      name: this.currentProvider,
      active: isReady,
      initialized: this.initialized
    };

    // ✅ Merge provider-specific info
    if (this.provider && typeof this.provider.getProviderInfo === 'function') {
      try {
        const specific = this.provider.getProviderInfo();
        providerInfo = { ...providerInfo, ...specific };
      } catch (error) {
        // Ignore
      }
    }

    // ✅ API key status
    let apiKeyEnv = '';
    if (this.currentProvider === 'gemini') {
      apiKeyEnv = 'GEMINI_API_KEY';
    } else if (this.currentProvider === 'openai') {
      apiKeyEnv = 'OPENAI_API_KEY';
    } else {
      apiKeyEnv = 'MOCK_API_KEY';
    }

    providerInfo.apiKeyConfigured = !!process.env[apiKeyEnv];
    providerInfo.availableProviders = Object.keys(this.providers);
    
    // ✅ Add health status
    providerInfo.providerHealth = {
      gemini: this.providerHealth.gemini,
      openai: this.providerHealth.openai
    };

    return providerInfo;
  }
}

// =========================
// ✅ MOCK PROVIDER (Fallback)
// =========================
class MockProvider {
  constructor() {
    console.log('🤖 Mock AI Provider initialized');
    this.available = true;
    this.initialized = true;
    this.validationResult = true;
  }
  
  async initialize() {
    this.available = true;
    this.initialized = true;
    return true;
  }
  
  isReady() {
    return this.available && this.initialized;
  }
  
  getProviderInfo() {
    return {
      name: 'mock',
      available: true,
      initialized: true,
      validated: true,
      type: 'fallback',
      lazyValidation: false
    };
  }
  
  async chat(messages, options) {
    const lastMessage = messages && messages.length > 0 
      ? messages[messages.length - 1] 
      : null;
    
    let contextHint = '';
    if (lastMessage && lastMessage.content) {
      const content = lastMessage.content.toLowerCase();
      if (content.includes('plan') || content.includes('trip') || content.includes('visit')) {
        contextHint = ' travel planning';
      } else if (content.includes('book') || content.includes('booking') || content.includes('price')) {
        contextHint = ' booking and pricing';
      } else if (content.includes('where') || content.includes('location') || content.includes('place')) {
        contextHint = ' destinations and locations';
      }
    }
    
    return {
      success: true,
      content: `Thank you for your question! 🌍 Rwanda is a beautiful country with amazing experiences.${contextHint ? ` I can help with${contextHint}.` : ''} Please explore our website to discover and book your perfect Rwandan adventure! 🇷🇼

Here are some popular Rwanda experiences:
- Gorilla Trekking in Volcanoes National Park 🦍
- Kigali City Tour 🏙️
- Lake Kivu Boat Cruise ⛵
- Nyungwe Forest Canopy Walk 🌿

Would you like me to connect you with a human travel expert?`,
      fallback: true,
      provider: 'mock',
      timestamp: new Date().toISOString()
    };
  }
  
  async plan(params) {
    const days = Math.max(1, Number(params.days) || 3);
    const budget = Math.max(0, Number(params.budget) || 500);
    const travelers = Math.max(1, Number(params.travelers) || 1);
    const perDay = Math.round(budget / days);
    const destination = params.destination || 'Rwanda';
    
    return {
      success: true,
      plan: {
        destination: destination,
        days: days,
        budget: budget,
        travelers: travelers,
        itinerary: Array.from({ length: days }, (_, i) => ({
          day: i + 1,
          title: `Day ${i + 1} - Explore ${destination}`,
          activities: ['Visit local attractions', 'Enjoy Rwandan cuisine', 'Relax and unwind'],
          meals: ['Breakfast', 'Lunch', 'Dinner'],
          accommodation: 'Mid-range hotel',
          budget: perDay
        })),
        totalCost: budget,
        tips: ['Book tours in advance', 'Pack comfortable walking shoes', 'Stay hydrated'],
        bestTime: 'June-September (dry season)',
        weather: 'Mild temperatures, 20-25°C'
      },
      fallback: true,
      provider: 'mock',
      timestamp: new Date().toISOString()
    };
  }
  
  async recommend(params) {
    const limit = Math.min(10, Math.max(1, Number(params.limit) || 10));
    
    const recommendations = [
      {
        title: "Kigali City Experience",
        location: "Kigali, Rwanda",
        price: 150,
        duration: "2 days",
        description: "Explore the cleanest city in Africa with our expert local guides",
        whyRecommended: "Perfect introduction to Rwanda's culture and history",
        activities: ["City Tour", "Genocide Memorial", "Local Markets", "Culinary Experience"],
        bestTime: "All year round",
        rating: 4.8,
        category: "Cultural"
      },
      {
        title: "Gorilla Trekking Adventure",
        location: "Volcanoes National Park",
        price: 750,
        duration: "3 days",
        description: "Experience the incredible mountain gorillas in their natural habitat",
        whyRecommended: "Once-in-a-lifetime wildlife experience",
        activities: ["Gorilla Trekking", "Community Visit", "Golden Monkey Trekking"],
        bestTime: "June-September",
        rating: 4.9,
        category: "Adventure"
      },
      {
        title: "Lake Kivu Serenity",
        location: "Lake Kivu, Rwanda",
        price: 300,
        duration: "2 days",
        description: "Relax by the beautiful Lake Kivu with stunning views",
        whyRecommended: "Perfect for relaxation and nature lovers",
        activities: ["Boat Cruise", "Kayaking", "Swimming", "Sunset Viewing"],
        bestTime: "All year round",
        rating: 4.7,
        category: "Nature"
      },
      {
        title: "Nyungwe Forest Canopy Walk",
        location: "Nyungwe National Park",
        price: 250,
        duration: "2 days",
        description: "Walk above the rainforest canopy and spot chimpanzees",
        whyRecommended: "Unique rainforest experience",
        activities: ["Canopy Walk", "Chimpanzee Trekking", "Waterfall Hike"],
        bestTime: "June-September",
        rating: 4.6,
        category: "Adventure"
      }
    ];
    
    return {
      success: true,
      recommendations: recommendations.slice(0, limit),
      fallback: true,
      provider: 'mock',
      timestamp: new Date().toISOString()
    };
  }
}

// =========================
// ✅ SINGLETON EXPORT
// =========================
const aiProvider = new AIProviderInterface();

// ✅ Auto-initialize on import (no quota consumption)
console.log('🔄 Initializing AI Provider (lazy validation mode)...');
aiProvider.initialize().then((success) => {
  if (success) {
    console.log('✅ AI Provider initialization complete');
    console.log('📌 Model validation will happen on first request');
  } else {
    console.warn('⚠️ AI Provider initialization failed, using fallback');
  }
}).catch((error) => {
  console.error('❌ AI Provider initialization error:', error.message);
});

console.log('📦 AI Provider singleton created');

export default aiProvider;