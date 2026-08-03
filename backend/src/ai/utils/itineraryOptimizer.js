// src/ai/utils/itineraryOptimizer.js
export class ItineraryOptimizer {
  constructor() {
    this.name = 'ItineraryOptimizer';
  }

  optimize(plan) {
    // Sort activities by time/location to minimize travel
    const optimized = { ...plan };
    
    if (plan.itinerary) {
      optimized.itinerary = this.optimizeDays(plan.itinerary);
    }
    
    // Add efficient routing
    optimized.transportSuggestions = this.suggestTransport(plan.itinerary);
    
    return optimized;
  }

  optimizeDays(days) {
    // Group activities by location
    const locationGroups = {};
    days.forEach(day => {
      day.activities.forEach(activity => {
        const location = this.getActivityLocation(activity);
        if (!locationGroups[location]) {
          locationGroups[location] = [];
        }
        locationGroups[location].push(activity);
      });
    });

    // Reorder by location efficiency
    return days.map(day => ({
      ...day,
      activities: this.orderByLocation(day.activities)
    }));
  }

  getActivityLocation(activity) {
    // Simulate location mapping
    const locations = {
      'Genocide Memorial': 'Kigali',
      'City Tower': 'Kigali',
      'Market': 'Kigali',
      'Gorilla Trekking': 'Musanze',
      'Safari': 'Akagera',
      'Canopy Walk': 'Nyungwe'
    };
    return locations[activity] || 'Unknown';
  }

  orderByLocation(activities) {
    // Group by location to minimize travel
    const grouped = {};
    activities.forEach(activity => {
      const loc = this.getActivityLocation(activity);
      if (!grouped[loc]) grouped[loc] = [];
      grouped[loc].push(activity);
    });
    return Object.values(grouped).flat();
  }

  suggestTransport(itinerary) {
    return {
      recommended: 'Private car with driver',
      cost: '$50/day',
      provider: 'Local tour operators'
    };
  }
}

export const itineraryOptimizer = new ItineraryOptimizer();
export default itineraryOptimizer;