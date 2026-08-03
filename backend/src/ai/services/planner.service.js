// backend/src/ai/services/planner.service.js
// ✅ UPDATED - Uses ONLY Listing model, no Tour references

import aiProvider from '../providers/providerInterface.js';
import plannerPrompt from '../prompts/planner.prompt.js';
import Listing from '../../models/Listing.js';
import { transformToExperiences } from '../utils/experienceTransformer.js';

class PlannerService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  async createPlan(params) {
    try {
      const {
        destination,
        days,
        budget,
        travelers,
        preferences,
        interests = [],
        travelStyle = 'balanced',
        startDate = null,
        language = 'en'
      } = params;

      console.log('📤 Planner Service: Creating trip plan...');
      console.log(`📌 Destination: ${destination}, Days: ${days}, Budget: $${budget}`);

      // ✅ Get real Listings from database (NO TOURS)
      const availableExperiences = await this.getAvailableExperiences(destination, interests);
      console.log(`📌 Found ${availableExperiences.length} available experiences`);

      // ✅ Transform Listings to Experiences
      const experiences = transformToExperiences(availableExperiences);
      console.log(`📌 Transformed ${experiences.length} listings to experiences`);

      // ✅ Get weather data
      const weather = await this.getWeatherData(destination, startDate);

      // ✅ Build enhanced prompt with real Experience data
      const prompt = plannerPrompt.build({
        destination,
        days,
        budget,
        travelers,
        preferences,
        experiences: experiences.slice(0, 15), // Pass top experiences
        weather,
        travelStyle,
        language
      });

      // ✅ Get AI response with higher token limit for detailed plans
      const response = await aiProvider.chat([
        { role: 'system', content: 'You are a Rwanda travel planning expert. Return ONLY valid JSON. Use "Experiences" not "Tours".' },
        { role: 'user', content: prompt }
      ], {
        temperature: 0.7,
        maxTokens: 2500
      });

      // ✅ Parse and enhance the plan
      let plan = this.parseResponse(response.content, params);

      // ✅ Enrich plan with real Experience data
      if (experiences.length > 0) {
        plan = await this.enrichPlanWithRealExperiences(plan, experiences);
      }

      // ✅ Cache the result
      const cacheKey = this.getCacheKey(params);
      this.cache.set(cacheKey, {
        plan,
        timestamp: Date.now()
      });

      return {
        success: true,
        plan: {
          ...plan,
          destination,
          days,
          budget,
          travelers: travelers || 1,
          travelStyle,
          weather: weather || 'Mild, 20-25°C',
          recommendedExperiences: experiences.slice(0, 5),
          generatedAt: new Date().toISOString()
        },
        fallback: response.fallback || false
      };
    } catch (error) {
      console.error('❌ Planner Service Error:', error);
      return {
        success: false,
        plan: this.getFallbackPlan(params),
        fallback: true,
        error: error.message
      };
    }
  }

  // ✅ Get real experiences from database (LISTINGS ONLY)
  async getAvailableExperiences(destination, interests = []) {
    try {
      const query = { 
        status: 'approved'
      };

      if (destination && destination !== 'Rwanda') {
        query.location = { $regex: destination, $options: 'i' };
      }

      if (interests && interests.length > 0) {
        query.$or = interests.map(interest => ({
          $or: [
            { tags: { $regex: interest, $options: 'i' } },
            { interests: { $regex: interest, $options: 'i' } },
            { businessType: { $regex: interest, $options: 'i' } }
          ]
        }));
      }

      // ✅ ONLY use Listing model - NO Tour
      const listings = await Listing.find(query)
        .select('title location price duration description coverImage tags businessType interests')
        .populate('provider', 'businessName name avatar')
        .limit(20)
        .lean();

      // ✅ Format for planner use
      return listings.map(listing => ({
        id: listing._id,
        title: listing.title,
        location: listing.location,
        price: listing.price,
        currency: listing.currency || 'USD',
        duration: listing.duration || '1 day',
        description: listing.description,
        coverImage: listing.coverImage,
        tags: listing.tags || [],
        businessType: listing.businessType,
        interests: listing.interests || [],
        provider: listing.provider || {}
      }));
    } catch (error) {
      console.error('Error fetching experiences:', error);
      return [];
    }
  }

  // ✅ Get real weather data
  async getWeatherData(destination, startDate) {
    try {
      const apiKey = process.env.OPENWEATHER_API_KEY;
      if (apiKey && destination) {
        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(destination)},RW&appid=${apiKey}&units=metric`
        );
        const data = await response.json();
        if (data.main) {
          return {
            condition: data.weather[0]?.description || 'Unknown',
            temperature: data.main.temp,
            feelsLike: data.main.feels_like,
            humidity: data.main.humidity,
            windSpeed: data.wind?.speed,
            icon: data.weather[0]?.icon
          };
        }
      }
    } catch (error) {
      console.warn('⚠️ Weather API error:', error.message);
    }

    // Fallback: Check season based on date
    if (startDate) {
      const month = new Date(startDate).getMonth();
      const drySeason = [5, 6, 7, 8];
      if (drySeason.includes(month)) {
        return { condition: 'Dry and sunny', temperature: 22, season: 'dry' };
      }
      return { condition: 'Mild with occasional showers', temperature: 20, season: 'rainy' };
    }

    return { condition: 'Mild and pleasant', temperature: 22 };
  }

  // ✅ Enrich plan with real Experience data
  async enrichPlanWithRealExperiences(plan, experiences) {
    if (!plan.itinerary) return plan;

    plan.itinerary = plan.itinerary.map(day => {
      // Match activities to real Experiences
      const matchedExperiences = experiences.filter(exp => {
        const dayWords = day.title?.toLowerCase() || '';
        const expWords = exp.title?.toLowerCase() || '';
        return dayWords.includes(expWords.split(' ')[0]) || 
               expWords.includes(dayWords.split(' ')[0]);
      });

      if (matchedExperiences.length > 0) {
        day.recommendedExperiences = matchedExperiences.slice(0, 3);
      }

      return day;
    });

    return plan;
  }

  // ✅ Parse response with better error handling
  parseResponse(text, params) {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const plan = JSON.parse(jsonMatch[0]);
        return {
          destination: params.destination,
          days: params.days,
          budget: params.budget,
          travelers: params.travelers || 1,
          ...plan
        };
      }
    } catch (error) {
      console.error('❌ Parse plan error:', error);
    }
    return this.getFallbackPlan(params);
  }

  // ✅ Generate cache key
  getCacheKey(params) {
    const { destination, days, budget, travelers, interests } = params;
    return `${destination}-${days}-${budget}-${travelers}-${interests?.join(',')}`;
  }

  // ✅ Get cached plan if available
  getCachedPlan(params) {
    const key = this.getCacheKey(params);
    const cached = this.cache.get(key);
    if (cached && (Date.now() - cached.timestamp < this.cacheTimeout)) {
      return cached.plan;
    }
    return null;
  }

  // ✅ Enhanced fallback plan with Experience terminology
  getFallbackPlan(params) {
    const { destination, days, budget, travelers } = params;
    const dailyBudget = Math.round(budget / days);

    const destinationMap = {
      'kigali': {
        description: 'Explore the cleanest city in Africa',
        experiences: ['City Experience', 'Genocide Memorial Visit', 'Local Market Tour'],
        accommodation: 'Mid-range hotel'
      },
      'akagera': {
        description: 'Big Five safari adventure',
        experiences: ['Game Drive Safari', 'Boat Safari', 'Bird Watching Experience'],
        accommodation: 'Safari lodge'
      },
      'volcanoes': {
        description: 'Gorilla trekking experience',
        experiences: ['Gorilla Trekking Experience', 'Mount Bisoke Hike', 'Cultural Village Visit'],
        accommodation: 'Mountain lodge'
      },
      'nyungwe': {
        description: 'Chimpanzee trekking in the forest',
        experiences: ['Chimpanzee Trekking Experience', 'Canopy Walk', 'Waterfall Hike'],
        accommodation: 'Forest lodge'
      },
      'kivu': {
        description: 'Relax on the shores of Lake Kivu',
        experiences: ['Lake Kivu Boat Experience', 'Swimming & Relaxation', 'Sunset Views'],
        accommodation: 'Lakefront hotel'
      }
    };

    const location = destination?.toLowerCase() || 'rwanda';
    const info = destinationMap[location] || destinationMap['kigali'];

    return {
      destination,
      days,
      budget,
      travelers: travelers || 1,
      dailyBudget,
      itinerary: Array.from({ length: days }, (_, i) => ({
        day: i + 1,
        title: `Day ${i + 1} - ${info.description}`,
        location: destination,
        experiences: info.experiences.map(exp => ({
          time: `${9 + i * 2}:00 ${i < 3 ? 'AM' : 'PM'}`,
          name: exp,
          description: `Experience ${exp} in ${destination}`,
          duration: '2-3 hours',
          cost: Math.round(dailyBudget * 0.3)
        })),
        meals: {
          breakfast: 'Breakfast at hotel',
          lunch: 'Local restaurant',
          dinner: 'Accommodation restaurant'
        },
        accommodation: {
          name: info.accommodation,
          type: 'Mid-range',
          cost: Math.round(dailyBudget * 0.4),
          rating: 4.0
        },
        totalCost: dailyBudget,
        transport: 'Private car / Taxi'
      })),
      summary: {
        totalCost: budget,
        dailyBudget,
        accommodationTotal: Math.round(budget * 0.35),
        experiencesTotal: Math.round(budget * 0.30),
        foodTotal: Math.round(budget * 0.20),
        transportTotal: Math.round(budget * 0.10),
        miscTotal: Math.round(budget * 0.05)
      },
      tips: [
        'Book experiences in advance for better prices',
        'Pack comfortable walking shoes',
        'Bring a camera for amazing photos',
        'Stay hydrated and use sunscreen',
        'Respect local customs and culture'
      ],
      bestTime: 'June-September (dry season)',
      weather: 'Mild temperatures, 20-25°C',
      packingList: [
        'Comfortable shoes',
        'Light clothing',
        'Rain jacket',
        'Sunscreen',
        'Insect repellent',
        'Camera',
        'Power bank'
      ],
      transportation: 'Private car recommended for flexibility',
      safetyTips: [
        'Always keep valuables secure',
        'Use registered taxi services',
        'Drink bottled water',
        'Follow guide instructions during experiences'
      ],
      culturalTips: [
        'Learn a few Kinyarwanda phrases',
        'Greet elders first',
        'Ask permission before taking photos',
        'Dress modestly in villages'
      ]
    };
  }
}

// Singleton instance
const plannerService = new PlannerService();
export default plannerService;