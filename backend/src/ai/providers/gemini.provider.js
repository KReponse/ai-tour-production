// backend/src/ai/providers/gemini.provider.js
// ✅ PRODUCTION-READY - Lazy validation, no quota waste on startup

import { GoogleGenAI } from '@google/genai';

export class GeminiProvider {
  constructor() {
    // ✅ Only initialize variables - NO async work, NO API calls
    this.apiKey = process.env.GEMINI_API_KEY;
    this.userModel = process.env.GEMINI_MODEL || null;
    this.ai = null;
    this.modelName = null;
    this.available = false;
    this.initialized = false;
    this.validationResult = null; // ✅ Cache validation result
    this.validationAttempts = 0;
    this.maxRetries = 3;
    this.retryDelay = 1000;
    
    console.log('🔍 Gemini Provider instance created (v2 SDK)');
    console.log(`📌 API Key configured: ${!!this.apiKey}`);
    console.log(`📌 User specified model: ${this.userModel || 'none'}`);
  }

  /**
   * ✅ Initialize WITHOUT model validation - just create client
   * This does NOT consume API quota
   */
  async initialize() {
    console.log('🚀 Initializing Gemini (lazy validation mode)...');
    
    if (this.initialized) {
      console.log('ℹ️ Gemini already initialized');
      return this.available;
    }

    if (!this.apiKey || this.apiKey.length < 10) {
      console.warn('⚠️ GEMINI_API_KEY not found or invalid');
      this.available = false;
      this.initialized = true;
      return false;
    }

    try {
      // ✅ Only create client - NO API calls
      this.ai = new GoogleGenAI({ apiKey: this.apiKey });
      
      // ✅ Set model name from env or default
      this.modelName = this.userModel || 'gemini-2.0-flash';
      
      // ✅ Mark as available without validation
      this.available = true;
      this.initialized = true;
      
      console.log(`✅ Gemini client created (model: ${this.modelName})`);
      console.log(`📌 Model validation will happen on first request (lazy)`);
      return true;
      
    } catch (error) {
      console.error('❌ Gemini initialization failed:', error.message);
      this.available = false;
      this.initialized = true;
      return false;
    }
  }

  /**
   * ✅ Lazy validation - only called on first real request
   * This is the ONLY place generateContent() is called
   */
  async validateModelLazy() {
    // ✅ Check if already validated
    if (this.validationResult !== null) {
      return this.validationResult;
    }

    // ✅ Prevent multiple concurrent validations
    if (this.validationAttempts > 0) {
      console.log(`⏳ Validation already in progress (attempt ${this.validationAttempts})...`);
      // Wait for validation to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      return this.validationResult;
    }

    console.log('🔍 Lazy model validation starting...');
    this.validationAttempts = 1;

    try {
      const isValid = await this.validateModelWithRetry(this.modelName);
      
      if (isValid) {
        this.validationResult = true;
        console.log(`✅ Model "${this.modelName}" validated successfully (lazy)`);
        return true;
      }
      
      // ✅ Try fallback models if validation fails
      const fallbackModels = [
        'gemini-2.0-flash',
        'gemini-2.0-flash-lite',
        'gemini-flash-latest',
        'gemini-1.5-flash',
        'gemini-pro-latest'
      ];

      for (const fallbackModel of fallbackModels) {
        if (fallbackModel === this.modelName) continue;
        
        console.log(`🔍 Trying fallback model: ${fallbackModel}`);
        const fallbackValid = await this.validateModelWithRetry(fallbackModel);
        
        if (fallbackValid) {
          this.modelName = fallbackModel;
          this.validationResult = true;
          console.log(`✅ Using fallback model: ${this.modelName}`);
          return true;
        }
      }

      this.validationResult = false;
      this.available = false;
      console.error('❌ No working Gemini model found');
      return false;
      
    } catch (error) {
      this.validationResult = false;
      console.error('❌ Lazy validation failed:', error.message);
      return false;
    }
  }

  /**
   * ✅ Validate model with exponential retry
   */
  async validateModelWithRetry(modelName, attempt = 1) {
    try {
      console.log(`🔍 Validating model: ${modelName} (attempt ${attempt}/${this.maxRetries})`);
      
      // ✅ Use a minimal test prompt
      const response = await this.ai.models.generateContent({
        model: modelName,
        contents: 'OK'
      });
      
      if (response && response.text) {
        return true;
      }
      return false;
    } catch (error) {
      const errorMessage = error.message || '';
      
      // ✅ Handle 429 (Rate Limit) with retry and RetryInfo
      if (errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
        let retryDelay = this.retryDelay * Math.pow(2, attempt - 1);
        
        // ✅ Try to extract RetryInfo from error
        try {
          if (error.details) {
            for (const detail of error.details) {
              if (detail['@type'] === 'type.googleapis.com/google.rpc.RetryInfo') {
                const delaySeconds = detail.retryDelay?.replace('s', '') || '5';
                retryDelay = parseInt(delaySeconds) * 1000;
                console.log(`📌 Server suggests retry in ${delaySeconds}s`);
              }
            }
          }
        } catch (parseError) {
          // Ignore parse errors
        }
        
        if (attempt < this.maxRetries) {
          console.warn(`⚠️ Rate limited, retrying in ${retryDelay}ms... (attempt ${attempt}/${this.maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          return this.validateModelWithRetry(modelName, attempt + 1);
        }
        console.warn(`⚠️ Rate limit exceeded after ${this.maxRetries} attempts`);
        return false;
      }
      
      // ✅ Handle 503 (Service Unavailable)
      if (errorMessage.includes('503') || errorMessage.includes('UNAVAILABLE')) {
        if (attempt < this.maxRetries) {
          const delay = this.retryDelay * Math.pow(2, attempt - 1);
          console.warn(`⚠️ Service unavailable, retrying in ${delay}ms... (attempt ${attempt}/${this.maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.validateModelWithRetry(modelName, attempt + 1);
        }
        console.warn(`⚠️ Service unavailable after ${this.maxRetries} attempts`);
        return false;
      }
      
      // ✅ Handle 404 (Model not found)
      if (errorMessage.includes('404') || errorMessage.includes('NOT_FOUND')) {
        console.warn(`⚠️ Model "${modelName}" not found`);
        return false;
      }
      
      // ✅ Handle network errors
      if (errorMessage.includes('fetch failed') || errorMessage.includes('ECONNREFUSED') || errorMessage.includes('ETIMEDOUT')) {
        if (attempt < this.maxRetries) {
          const delay = this.retryDelay * Math.pow(2, attempt - 1);
          console.warn(`⚠️ Network error, retrying in ${delay}ms... (attempt ${attempt}/${this.maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.validateModelWithRetry(modelName, attempt + 1);
        }
        console.warn(`⚠️ Network error after ${this.maxRetries} attempts`);
        return false;
      }
      
      console.error(`❌ Model "${modelName}" validation failed:`, error.message);
      return false;
    }
  }

  /**
   * ✅ Execute API call with retry and lazy validation
   */
  async executeWithRetry(fn, context, attempt = 1) {
    try {
      // ✅ Ensure validation is done before executing
      if (this.validationResult === null) {
        const valid = await this.validateModelLazy();
        if (!valid) {
          throw new Error('Gemini model validation failed');
        }
      }
      
      return await fn();
    } catch (error) {
      const errorMessage = error.message || '';
      
      // ✅ Retry on these errors
      const retryableErrors = ['429', '503', 'timeout', 'fetch failed', 'ECONNREFUSED', 'ETIMEDOUT', 'UNAVAILABLE', 'RESOURCE_EXHAUSTED'];
      const shouldRetry = retryableErrors.some(e => errorMessage.includes(e));
      
      if (shouldRetry && attempt < this.maxRetries) {
        const delay = this.retryDelay * Math.pow(2, attempt - 1);
        console.warn(`⚠️ ${context} failed, retrying in ${delay}ms... (attempt ${attempt}/${this.maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.executeWithRetry(fn, context, attempt + 1);
      }
      
      throw error;
    }
  }

  /**
   * ✅ Check if provider is ready
   */
  isReady() {
    return this.available && this.ai !== null && this.modelName !== null;
  }

  /**
   * ✅ Get provider info
   */
  getProviderInfo() {
    return {
      name: 'gemini',
      available: this.available,
      initialized: this.initialized,
      validated: this.validationResult !== null,
      modelName: this.modelName,
      apiKeyConfigured: !!this.apiKey,
      sdk: '@google/genai',
      lazyValidation: true
    };
  }

  // =========================
  // ✅ CHAT with lazy validation
  // =========================
  async chat(messages, options = {}) {
    console.log('📤 Gemini chat() called');
    console.log(`📌 Model: ${this.modelName}`);
    
    try {
      if (!this.isReady()) {
        console.warn('⚠️ Gemini not ready');
        return this.fallback('chat', { messages, options });
      }

      // ✅ Validate lazily if not done yet
      if (this.validationResult === null) {
        const valid = await this.validateModelLazy();
        if (!valid) {
          console.warn('⚠️ Gemini validation failed, using fallback');
          return this.fallback('chat', { messages, options });
        }
      }

      const formattedMessages = messages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));

      const result = await this.executeWithRetry(async () => {
        return await this.ai.models.generateContent({
          model: this.modelName,
          contents: formattedMessages,
          config: {
            temperature: options.temperature || 0.7,
            maxOutputTokens: options.maxTokens || 500,
            topP: 0.95,
            topK: 40,
          }
        });
      }, 'chat');

      const text = result.text;
      console.log('📥 Gemini chat response received');
      
      return {
        success: true,
        content: text,
        usage: {
          promptTokens: result.usageMetadata?.promptTokenCount || 0,
          completionTokens: result.usageMetadata?.candidatesTokenCount || 0,
          totalTokens: result.usageMetadata?.totalTokenCount || 0
        },
        provider: 'gemini'
      };
    } catch (error) {
      console.error('❌ Gemini Chat Error:', error.message);
      return this.fallback('chat', { messages, options });
    }
  }

  // =========================
  // ✅ PLAN with lazy validation
  // =========================
  async plan(params) {
    console.log('📤 Gemini plan() called');
    console.log(`📌 Model: ${this.modelName}`);
    
    try {
      if (!this.isReady()) {
        console.warn('⚠️ Gemini not ready');
        return this.fallback('plan', params);
      }

      // ✅ Validate lazily if not done yet
      if (this.validationResult === null) {
        const valid = await this.validateModelLazy();
        if (!valid) {
          console.warn('⚠️ Gemini validation failed, using fallback');
          return this.fallback('plan', params);
        }
      }

      const { destination, days, budget, travelers, preferences } = params;
      
      const prompt = `
Create a detailed ${days}-day travel plan for ${destination}, Rwanda.

Budget: $${budget}
Travelers: ${travelers || 1}
Preferences: ${preferences || 'Balanced'}

Return a valid JSON object:
{
  "itinerary": [
    {
      "day": 1,
      "title": "Day 1 Title",
      "activities": ["Activity 1", "Activity 2"],
      "meals": ["Breakfast", "Lunch", "Dinner"],
      "accommodation": "Hotel name",
      "budget": 0
    }
  ],
  "totalCost": 0,
  "tips": ["Tip 1", "Tip 2"],
  "bestTime": "Best time to visit",
  "weather": "Weather information"
}`;

      const response = await this.executeWithRetry(async () => {
        return await this.ai.models.generateContent({
          model: this.modelName,
          contents: prompt,
          config: {
            temperature: 0.7,
            maxOutputTokens: 1000,
          }
        });
      }, 'plan');

      const text = response.text;
      const plan = this.parsePlanResponse(text, params);

      return {
        success: true,
        plan,
        raw: text,
        provider: 'gemini'
      };
    } catch (error) {
      console.error('❌ Gemini Plan Error:', error.message);
      return this.fallback('plan', params);
    }
  }

  // =========================
  // ✅ RECOMMEND with lazy validation
  // =========================
  async recommend(params) {
    console.log('📤 Gemini recommend() called');
    console.log(`📌 Model: ${this.modelName}`);
    
    try {
      if (!this.isReady()) {
        console.warn('⚠️ Gemini not ready');
        return this.fallback('recommend', params);
      }

      // ✅ Validate lazily if not done yet
      if (this.validationResult === null) {
        const valid = await this.validateModelLazy();
        if (!valid) {
          console.warn('⚠️ Gemini validation failed, using fallback');
          return this.fallback('recommend', params);
        }
      }

      const { query, userContext, limit = 10 } = params;
      
      let prompt = `Recommend ${limit} experiences in Rwanda based on: "${query || 'Popular experiences in Rwanda'}"`;

      if (userContext) {
        prompt += `\nUser Context: Past bookings: ${userContext.pastBookings?.length || 0}`;
      }

      prompt += `
Return valid JSON array:
[
  {
    "title": "Experience name",
    "location": "Location, Rwanda",
    "price": 0,
    "duration": "2 days",
    "description": "Brief description",
    "whyRecommended": "Why this experience is recommended",
    "activities": ["Activity 1", "Activity 2"],
    "bestTime": "Best time to visit",
    "rating": 4.5,
    "category": "Adventure|Cultural|Nature|Luxury|Food"
  }
]`;

      const response = await this.executeWithRetry(async () => {
        return await this.ai.models.generateContent({
          model: this.modelName,
          contents: prompt,
          config: {
            temperature: 0.7,
            maxOutputTokens: 1000,
          }
        });
      }, 'recommend');

      const text = response.text;
      const recommendations = this.parseRecommendations(text);

      return {
        success: true,
        recommendations,
        raw: text,
        provider: 'gemini'
      };
    } catch (error) {
      console.error('❌ Gemini Recommend Error:', error.message);
      return this.fallback('recommend', params);
    }
  }

  // =========================
  // ✅ PARSERS
  // =========================
  parsePlanResponse(text, params) {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const plan = JSON.parse(jsonMatch[0]);
        return {
          destination: params.destination || 'Rwanda',
          days: params.days || 3,
          budget: params.budget || 500,
          travelers: params.travelers || 1,
          itinerary: plan.itinerary || [],
          totalCost: plan.totalCost || params.budget || 500,
          tips: plan.tips || [],
          bestTime: plan.bestTime || 'June-September',
          weather: plan.weather || 'Mild, 20-25°C'
        };
      }
    } catch (error) {
      console.error('Parse plan error:', error);
    }
    return null;
  }

  parseRecommendations(text) {
    try {
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Parse recommendations error:', error);
    }
    return [];
  }

  // =========================
  // ✅ FALLBACK
  // =========================
  fallback(method, params) {
    console.warn(`⚠️ Gemini fallback for: ${method}`);
    
    const fallbacks = {
      chat: () => ({
        success: true,
        content: "Thank you for your question! 🌍 Rwanda offers amazing experiences. Please browse our website for more information! 🇷🇼",
        fallback: true,
        provider: 'gemini'
      }),
      plan: () => ({
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
        provider: 'gemini'
      }),
      recommend: () => ({
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
        provider: 'gemini'
      })
    };

    return fallbacks[method] ? fallbacks[method]() : {
      success: true,
      content: "AI service is currently unavailable.",
      fallback: true,
      provider: 'gemini'
    };
  }
}