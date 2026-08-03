// backend/src/ai/providers/openai.provider.js
// ✅ PRODUCTION-READY - Configurable model, lazy validation

import OpenAI from 'openai';

export class OpenAIProvider {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    // ✅ Configurable model from .env with sensible default
    this.modelName = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    this.openai = null;
    this.available = false;
    this.initialized = false;
    this.validationResult = null;
    this.maxRetries = 3;
    this.retryDelay = 1000;
    
    console.log('🔍 OpenAI Provider initialized');
    console.log(`📌 API Key exists: ${!!this.apiKey}`);
    console.log(`📌 Model: ${this.modelName}`);
  }

  /**
   * ✅ Initialize WITHOUT model validation
   */
  async initialize() {
    console.log('🚀 Initializing OpenAI (lazy validation mode)...');
    
    if (this.initialized) {
      return this.available;
    }

    if (!this.apiKey || this.apiKey.length < 10) {
      console.warn('⚠️ OPENAI_API_KEY not found or invalid');
      this.available = false;
      this.initialized = true;
      return false;
    }

    try {
      // ✅ Only create client - NO API calls
      this.openai = new OpenAI({
        apiKey: this.apiKey
      });
      
      // ✅ Mark as available without validation
      this.available = true;
      this.initialized = true;
      
      console.log(`✅ OpenAI client created (model: ${this.modelName})`);
      console.log(`📌 Model validation will happen on first request (lazy)`);
      return true;
      
    } catch (error) {
      console.error('❌ OpenAI initialization failed:', error.message);
      this.available = false;
      this.initialized = true;
      return false;
    }
  }

  /**
   * ✅ Lazy validation - only called on first real request
   */
  async validateModelLazy() {
    if (this.validationResult !== null) {
      return this.validationResult;
    }

    console.log('🔍 Lazy OpenAI validation starting...');

    try {
      const response = await this.openai.chat.completions.create({
        model: this.modelName,
        messages: [{ role: 'user', content: 'OK' }],
        max_tokens: 5,
        temperature: 0
      });

      if (response.choices && response.choices.length > 0) {
        this.validationResult = true;
        console.log(`✅ OpenAI model "${this.modelName}" validated successfully (lazy)`);
        return true;
      }
      
      // ✅ Try fallback models
      const fallbackModels = ['gpt-4o-mini', 'gpt-3.5-turbo'];
      
      for (const fallback of fallbackModels) {
        if (fallback === this.modelName) continue;
        
        console.log(`🔍 Trying fallback model: ${fallback}`);
        try {
          const fallbackResponse = await this.openai.chat.completions.create({
            model: fallback,
            messages: [{ role: 'user', content: 'OK' }],
            max_tokens: 5,
            temperature: 0
          });
          
          if (fallbackResponse.choices && fallbackResponse.choices.length > 0) {
            this.modelName = fallback;
            this.validationResult = true;
            console.log(`✅ Using fallback model: ${this.modelName}`);
            return true;
          }
        } catch (fallbackError) {
          console.warn(`⚠️ Fallback model "${fallback}" failed:`, fallbackError.message);
        }
      }

      this.validationResult = false;
      this.available = false;
      console.error('❌ No working OpenAI model found');
      return false;
      
    } catch (error) {
      this.validationResult = false;
      console.error('❌ Lazy OpenAI validation failed:', error.message);
      return false;
    }
  }

  /**
   * ✅ Check if provider is ready
   */
  isReady() {
    return this.available && this.openai !== null;
  }

  /**
   * ✅ Get provider info
   */
  getProviderInfo() {
    return {
      name: 'openai',
      available: this.available,
      initialized: this.initialized,
      validated: this.validationResult !== null,
      modelName: this.modelName,
      apiKeyConfigured: !!this.apiKey,
      lazyValidation: true
    };
  }

  /**
   * ✅ Execute with retry
   */
  async executeWithRetry(fn, context, attempt = 1) {
    try {
      return await fn();
    } catch (error) {
      const errorMessage = error.message || '';
      
      const retryableErrors = ['429', 'rate_limit', 'timeout', 'ETIMEDOUT'];
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
   * ✅ Chat with lazy validation
   */
  async chat(messages, options = {}) {
    console.log('📤 OpenAI chat() called');
    
    try {
      if (!this.isReady()) {
        return this.fallback('chat', { messages, options });
      }

      // ✅ Validate lazily if not done yet
      if (this.validationResult === null) {
        const valid = await this.validateModelLazy();
        if (!valid) {
          console.warn('⚠️ OpenAI validation failed, using fallback');
          return this.fallback('chat', { messages, options });
        }
      }

      const response = await this.executeWithRetry(async () => {
        return await this.openai.chat.completions.create({
          model: this.modelName,
          messages: messages,
          temperature: options.temperature || 0.7,
          max_tokens: options.maxTokens || 500,
          top_p: options.topP || 0.95,
          frequency_penalty: 0.3,
          presence_penalty: 0.3
        });
      }, 'chat');

      const text = response.choices[0]?.message?.content || 'No response';
      
      return {
        success: true,
        content: text,
        usage: response.usage,
        provider: 'openai'
      };
    } catch (error) {
      console.error('❌ OpenAI Chat Error:', error.message);
      return this.fallback('chat', { messages, options });
    }
  }

  /**
   * ✅ Plan with lazy validation
   */
  async plan(params) {
    console.log('📤 OpenAI plan() called');
    
    try {
      if (!this.isReady()) {
        return this.fallback('plan', params);
      }

      if (this.validationResult === null) {
        const valid = await this.validateModelLazy();
        if (!valid) {
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
        return await this.openai.chat.completions.create({
          model: this.modelName,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 1500
        });
      }, 'plan');

      const text = response.choices[0]?.message?.content || '{}';
      const plan = this.parsePlanResponse(text, params);

      return {
        success: true,
        plan,
        raw: text,
        provider: 'openai'
      };
    } catch (error) {
      console.error('❌ OpenAI Plan Error:', error.message);
      return this.fallback('plan', params);
    }
  }

  /**
   * ✅ Recommend with lazy validation
   */
  async recommend(params) {
    console.log('📤 OpenAI recommend() called');
    
    try {
      if (!this.isReady()) {
        return this.fallback('recommend', params);
      }

      if (this.validationResult === null) {
        const valid = await this.validateModelLazy();
        if (!valid) {
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
        return await this.openai.chat.completions.create({
          model: this.modelName,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 1000
        });
      }, 'recommend');

      const text = response.choices[0]?.message?.content || '[]';
      const recommendations = this.parseRecommendations(text);

      return {
        success: true,
        recommendations,
        raw: text,
        provider: 'openai'
      };
    } catch (error) {
      console.error('❌ OpenAI Recommend Error:', error.message);
      return this.fallback('recommend', params);
    }
  }

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

  fallback(method, params) {
    console.warn(`⚠️ OpenAI fallback for: ${method}`);
    
    const fallbacks = {
      chat: () => ({
        success: true,
        content: "Thank you for your question! 🌍 Rwanda offers amazing experiences. Please browse our platform for more information! 🇷🇼",
        fallback: true,
        provider: 'openai'
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
            title: `Day ${i + 1} - Explore Rwanda`,
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
        provider: 'openai'
      }),
      recommend: () => ({
        success: true,
        recommendations: [],
        fallback: true,
        provider: 'openai'
      })
    };

    return fallbacks[method] ? fallbacks[method]() : {
      success: true,
      content: "AI service is currently unavailable.",
      fallback: true,
      provider: 'openai'
    };
  }
}