// src/ai/utils/budgetCalculator.js
export class BudgetCalculator {
  constructor() {
    this.name = 'BudgetCalculator';
    this.allocations = {
      accommodation: 0.40,
      activities: 0.35,
      food: 0.15,
      transport: 0.07,
      misc: 0.03
    };
  }

  // Calculate budget breakdown
  calculate(totalBudget, days, travelers) {
    const dailyBudget = totalBudget / days;
    const perPerson = totalBudget / (travelers || 1);

    return {
      total: totalBudget,
      daily: dailyBudget,
      perPerson: perPerson,
      breakdown: {
        accommodation: {
          percentage: this.allocations.accommodation * 100,
          amount: totalBudget * this.allocations.accommodation,
          daily: dailyBudget * this.allocations.accommodation
        },
        activities: {
          percentage: this.allocations.activities * 100,
          amount: totalBudget * this.allocations.activities,
          daily: dailyBudget * this.allocations.activities
        },
        food: {
          percentage: this.allocations.food * 100,
          amount: totalBudget * this.allocations.food,
          daily: dailyBudget * this.allocations.food
        },
        transport: {
          percentage: this.allocations.transport * 100,
          amount: totalBudget * this.allocations.transport,
          daily: dailyBudget * this.allocations.transport
        },
        misc: {
          percentage: this.allocations.misc * 100,
          amount: totalBudget * this.allocations.misc,
          daily: dailyBudget * this.allocations.misc
        }
      }
    };
  }

  // Suggest budget optimization
  suggestOptimizations(currentBudget, targetBudget) {
    const savings = currentBudget - targetBudget;
    if (savings <= 0) return { canOptimize: false };

    const suggestions = [];
    
    if (savings > 100) {
      suggestions.push({
        category: 'accommodation',
        suggestion: 'Choose mid-range instead of luxury',
        savings: Math.min(savings * 0.4, 200)
      });
      suggestions.push({
        category: 'activities',
        suggestion: 'Select 1-2 paid activities instead of 3-4',
        savings: Math.min(savings * 0.3, 150)
      });
    }

    if (savings > 50) {
      suggestions.push({
        category: 'food',
        suggestion: 'Eat at local restaurants instead of hotels',
        savings: Math.min(savings * 0.2, 100)
      });
    }

    return {
      canOptimize: true,
      totalSavings: suggestions.reduce((sum, s) => sum + s.savings, 0),
      suggestions
    };
  }
}

export const budgetCalculator = new BudgetCalculator();
export default budgetCalculator;