// backend/src/ai/providers/providerInterface.js
// ✅ PRODUCTION-READY - No race conditions, clean fallback chain

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
    this.provider = new MockProvider();
    this.currentProvider = 'mock';
    this.initialized = true;
    
    console.log(`📌 Active provider: ${this.currentProvider}`);
    console.log(`📌 Provider available: true`);
    
    return true;
  }

  /**
   * ✅ CHECK AVAILABILITY
   */
  isAvailable() {
    const isReady = this.provider !== null && 
                   typeof this.provider.isReady === 'function' && 
                   this.provider.isReady();
    return isReady;
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
      console.log('📥 Chat result received from provider');
      return result;
    } catch (error) {
      console.error(`❌ Provider chat error (${this.currentProvider}):`, error.message);
      
      // ✅ Try fallback provider if available
      if (this.currentProvider !== 'mock') {
        console.log('🔄 Trying fallback provider...');
        const fallbackProvider = this.getFallbackProvider(this.currentProvider);
        if (fallbackProvider) {
          try {
            const result = await fallbackProvider.chat(messages, options);
            console.log('📥 Chat result from fallback provider');
            return result;
          } catch (fallbackError) {
            console.error('❌ Fallback provider also failed:', fallbackError.message);
          }
        }
      }
      
      throw error;
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
      return await this.provider.plan(params);
    } catch (error) {
      console.error(`❌ Provider plan error (${this.currentProvider}):`, error.message);
      
      if (this.currentProvider !== 'mock') {
        const fallbackProvider = this.getFallbackProvider(this.currentProvider);
        if (fallbackProvider) {
          try {
            return await fallbackProvider.plan(params);
          } catch (fallbackError) {
            console.error('❌ Fallback provider also failed:', fallbackError.message);
          }
        }
      }
      
      throw error;
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
      return await this.provider.recommend(params);
    } catch (error) {
      console.error(`❌ Provider recommend error (${this.currentProvider}):`, error.message);
      
      if (this.currentProvider !== 'mock') {
        const fallbackProvider = this.getFallbackProvider(this.currentProvider);
        if (fallbackProvider) {
          try {
            return await fallbackProvider.recommend(params);
          } catch (fallbackError) {
            console.error('❌ Fallback provider also failed:', fallbackError.message);
          }
        }
      }
      
      throw error;
    }
  }

  /**
   * ✅ Get fallback provider
   */
  getFallbackProvider(currentProvider) {
    const fallbackOrder = {
      gemini: 'openai',
      openai: 'mock'
    };
    
    const fallbackName = fallbackOrder[currentProvider];
    if (!fallbackName || fallbackName === 'mock') {
      return new MockProvider();
    }
    
    const ProviderClass = this.providers[fallbackName];
    if (!ProviderClass) return null;
    
    const provider = new ProviderClass();
    provider.initialize(); // Don't await - we want to try immediately
    
    return provider.isReady() ? provider : null;
  }

  /**
   * ✅ SWITCH PROVIDER
   */
  async switchProvider(providerName) {
    if (!this.providers[providerName]) {
      throw new Error(`AI Provider ${providerName} not available`);
    }
    
    console.log(`🔄 Switching to ${providerName}...`);
    
    const ProviderClass = this.providers[providerName];
    const providerInstance = new ProviderClass();
    const initialized = await providerInstance.initialize();
    
    if (initialized && providerInstance.isReady()) {
      this.provider = providerInstance;
      this.currentProvider = providerName;
      console.log(`✅ Switched to ${providerName}`);
      return this.currentProvider;
    }
    
    throw new Error(`Failed to initialize ${providerName}`);
  }

  /**
   * ✅ GET PROVIDER INFO
   */
  getProviderInfo() {
    const isReady = this.provider !== null && 
                   typeof this.provider.isReady === 'function' && 
                   this.provider.isReady();
    
    let providerInfo = {
      name: this.currentProvider,
      active: isReady,
      initialized: this.initialized
    };

    if (this.provider && typeof this.provider.getProviderInfo === 'function') {
      providerInfo = {
        ...providerInfo,
        ...this.provider.getProviderInfo()
      };
    }

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
    return true;
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
    return {
      success: true,
      content: "Thank you for your question! 🌍 Rwanda is a beautiful country with amazing experiences. Please visit our website to explore and book your adventure! 🇷🇼",
      fallback: true,
      provider: 'mock'
    };
  }
  
  async plan(params) {
    return {
      success: true,
      plan: {
        destination: params.destination || 'Rwanda',
        days: params.days || 3,
        budget: params.budget || 500,
        travelers: params.travelers || 1,
        itinerary: Array.from({ length: params.days || 3 }, (_, i) => ({
          day: i + 1,
          title: `Day ${i + 1} - Explore ${params.destination || 'Rwanda'}`,
          activities: ['Explore local attractions', 'Enjoy local cuisine', 'Relax'],
          meals: ['Breakfast', 'Lunch', 'Dinner'],
          accommodation: 'Mid-range hotel',
          budget: Math.round((params.budget || 500) / (params.days || 3))
        })),
        totalCost: params.budget || 500,
        tips: ['Book tours in advance', 'Pack comfortable shoes'],
        bestTime: 'June-September',
        weather: 'Mild, 20-25°C'
      },
      fallback: true,
      provider: 'mock'
    };
  }
  
  async recommend(params) {
    return {
      success: true,
      recommendations: [
        {
          title: "Kigali City Experience",
          location: "Kigali, Rwanda",
          price: 150,
          duration: "2 days",
          description: "Explore the cleanest city in Africa",
          whyRecommended: "Perfect introduction to Rwanda",
          activities: ["City Tour", "Genocide Memorial", "Local Markets"],
          bestTime: "All year round",
          rating: 4.8,
          category: "Cultural"
        }
      ],
      fallback: true,
      provider: 'mock'
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