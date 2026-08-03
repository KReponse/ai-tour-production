// backend/src/ai/utils/aiAnalytics.js
class AIAnalytics {
  constructor() {
    this.stats = {
      totalChats: 0,
      totalPlans: 0,
      totalRecommendations: 0,
      averageResponseTime: 0,
      providerUsage: {},
      popularQueries: {},
      dailyStats: {},
      errors: 0
    };
    this.startTime = new Date();
  }

  trackChat(message, responseTime, provider, success = true) {
    this.stats.totalChats++;
    this.updateProviderUsage(provider || 'unknown');
    this.updateResponseTime(responseTime);
    if (message && message.length > 3) {
      this.trackQuery(message);
    }
    this.trackDaily('chats');
    if (!success) this.stats.errors++;
  }

  trackPlan(params, responseTime, success = true) {
    this.stats.totalPlans++;
    this.updateProviderUsage('planner');
    this.updateResponseTime(responseTime);
    this.trackDaily('plans');
    if (!success) this.stats.errors++;
  }

  trackRecommendation(query, success = true) {
    this.stats.totalRecommendations++;
    if (query && query.length > 3) {
      this.trackQuery(query);
    }
    this.trackDaily('recommendations');
    if (!success) this.stats.errors++;
  }

  trackError(error) {
    this.stats.errors++;
  }

  updateProviderUsage(provider) {
    if (!this.stats.providerUsage[provider]) {
      this.stats.providerUsage[provider] = 0;
    }
    this.stats.providerUsage[provider]++;
  }

  updateResponseTime(responseTime) {
    const total = this.stats.totalChats + this.stats.totalPlans;
    this.stats.averageResponseTime = 
      (this.stats.averageResponseTime * (total - 1) + responseTime) / total;
  }

  trackQuery(query) {
    const normalized = query.toLowerCase().trim();
    if (normalized.length < 3) return;
    
    if (!this.stats.popularQueries[normalized]) {
      this.stats.popularQueries[normalized] = 0;
    }
    this.stats.popularQueries[normalized]++;
  }

  trackDaily(type) {
    const today = new Date().toISOString().split('T')[0];
    if (!this.stats.dailyStats[today]) {
      this.stats.dailyStats[today] = {
        chats: 0,
        plans: 0,
        recommendations: 0
      };
    }
    this.stats.dailyStats[today][type] = (this.stats.dailyStats[today][type] || 0) + 1;
  }

  getStats() {
    const sortedQueries = Object.entries(this.stats.popularQueries)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});

    const topProviders = Object.entries(this.stats.providerUsage)
      .sort((a, b) => b[1] - a[1])
      .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});

    const today = new Date().toISOString().split('T')[0];
    const todayStats = this.stats.dailyStats[today] || { chats: 0, plans: 0, recommendations: 0 };

    const totalRequests = this.stats.totalChats + this.stats.totalPlans + this.stats.totalRecommendations;
    const successRate = totalRequests > 0
      ? ((totalRequests - this.stats.errors) / totalRequests * 100).toFixed(2) + '%'
      : '100%';

    return {
      ...this.stats,
      popularQueries: sortedQueries,
      topProviders,
      todayStats,
      uptime: Math.floor((new Date() - this.startTime) / 1000),
      stats: {
        totalRequests,
        successRate
      }
    };
  }

  reset() {
    this.stats = {
      totalChats: 0,
      totalPlans: 0,
      totalRecommendations: 0,
      averageResponseTime: 0,
      providerUsage: {},
      popularQueries: {},
      dailyStats: {},
      errors: 0
    };
    this.startTime = new Date();
  }
}

export const aiAnalytics = new AIAnalytics();
export default aiAnalytics;