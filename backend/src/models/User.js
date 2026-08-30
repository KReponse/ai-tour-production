// backend/src/models/User.js
// ✅ COMPLETE FIXED - Removed duplicate indexes
// ✅ Fixed role index (removed index:true from field)
// ✅ Fixed email index (removed schema.index() - unique:true already creates it)
// ✅ Added provider-specific fields
// ✅ Added helper virtuals for role checking
// ✅ ✅ PHASE 1: Added Traveler Profile preferences
// ✅ ✅ PHASE 1: Added behavioral tracking fields
// ✅ ✅ PHASE 1: Added preference scoring system

import mongoose from 'mongoose';

// ─── Configurable Security Values ──────────────────────────────
const CONFIG = {
  MAX_LOGIN_ATTEMPTS: parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5,
  ACCOUNT_LOCK_TIME_MINUTES: parseInt(process.env.ACCOUNT_LOCK_TIME) || 3,
};

// ─── Helpers ─────────────────────────────────────────────────────
const getLockTimeMs = () => CONFIG.ACCOUNT_LOCK_TIME_MINUTES * 60 * 1000;

const userSchema = new mongoose.Schema({
  // ─── Core Fields ──────────────────────────────────────────────
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: 2,
    maxlength: 50
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 8,
    select: false
  },
  phone: {
    type: String,
    trim: true,
    match: [/^\+?[0-9]{10,15}$/, 'Please enter a valid phone number']
  },
  country: {
    type: String,
    trim: true,
    default: 'Rwanda'
  },
  avatar: {
    type: String,
    default: ''
  },

  // ─── Role & Status ────────────────────────────────────────────
  role: {
    type: String,
    enum: ['traveler', 'provider', 'admin'],
    default: 'traveler',
  },
  verificationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },

  // ─── Provider-Specific Fields ─────────────────────────────────
  businessName: {
    type: String,
    trim: true,
  },
  businessType: {
    type: String,
    enum: [
      'tour_operator',
      'guide',
      'hotel',
      'lodge',
      'restaurant',
      'cafe',
      'transport',
      'events',
      'shop',
      'other'
    ],
  },
  providerApprovedDate: {
    type: Date,
  },
  providerRejectedDate: {
    type: Date,
  },
  providerRejectReason: {
    type: String,
    trim: true,
  },

  // ─── Verification Tokens ──────────────────────────────────────
  verificationTokenHash: {
    type: String,
    select: false
  },
  verificationTokenExpiry: {
    type: Date,
    select: false
  },

  // ─── Security Fields ──────────────────────────────────────────
  passwordChangedAt: {
    type: Date,
    default: Date.now
  },
  tokenVersion: {
    type: Number,
    default: 1
  },

  // ─── Login Security ────────────────────────────────────────────
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date,
    default: null
  },
  lastLogin: Date,
  lastLoginIP: String,
  lastLoginLocation: {
    city: String,
    country: String
  },

  // ─── Profile ──────────────────────────────────────────────────
  bio: {
    type: String,
    trim: true,
    maxlength: 500
  },
  location: String,
  socialLinks: {
    instagram: String,
    facebook: String,
    linkedin: String,
    tiktok: String,
    twitter: String,
    youtube: String
  },

  // ============================================================
  // ✅ PHASE 1: TRAVELER PROFILE PREFERENCES
  // ============================================================

  preferences: {
    // ─── Travel Style ──────────────────────────────────────────
    travelStyle: {
      type: String,
      enum: ['adventure', 'cultural', 'relaxation', 'luxury', 'budget', 'balanced', 'family', 'romantic'],
      default: 'balanced'
    },
    
    // ─── Budget Preferences ────────────────────────────────────
    budget: {
      type: String,
      enum: ['budget', 'mid-range', 'premium', 'luxury'],
      default: 'mid-range'
    },
    minBudgetPerDay: {
      type: Number,
      default: 0
    },
    maxBudgetPerDay: {
      type: Number,
      default: 500
    },

    // ─── Interests ─────────────────────────────────────────────
    interests: [{
      type: String,
      enum: [
        'wildlife', 'nature', 'hiking', 'trekking', 'safari',
        'culture', 'history', 'heritage', 'museums', 'art',
        'food', 'culinary', 'coffee', 'wine',
        'adventure', 'thrill', 'extreme',
        'beach', 'water', 'lake', 'boat',
        'city', 'urban', 'nightlife', 'shopping',
        'photography', 'instagram', 'social_media',
        'wellness', 'spa', 'relaxation', 'yoga',
        'family', 'kids', 'child-friendly',
        'romantic', 'couples', 'honeymoon',
        'business', 'corporate', 'events',
        'educational', 'learning', 'workshops'
      ],
      default: []
    }],

    // ─── Accommodation Preferences ─────────────────────────────
    accommodation: {
      type: String,
      enum: ['budget', 'mid-range', 'luxury', 'eco-lodge', 'camping', 'guesthouse', 'hotel', 'resort'],
      default: 'mid-range'
    },

    // ─── Group Preferences ─────────────────────────────────────
    groupSize: {
      type: Number,
      min: 1,
      max: 50,
      default: 1
    },
    isFamilyTraveler: {
      type: Boolean,
      default: false
    },
    isSoloTraveler: {
      type: Boolean,
      default: false
    },
    isGroupTraveler: {
      type: Boolean,
      default: false
    },

    // ─── Language & Communication ──────────────────────────────
    preferredLanguage: {
      type: String,
      enum: ['en', 'fr', 'rw', 'sw', 'de', 'es', 'it', 'pt'],
      default: 'en'
    },
    communicationChannels: [{
      type: String,
      enum: ['email', 'phone', 'whatsapp', 'sms', 'in-app'],
      default: ['email']
    }],

    // ─── Activity Preferences ──────────────────────────────────
    preferredActivities: [{
      type: String,
      enum: [
        'gorilla_trekking', 'chimpanzee_trekking', 'golden_monkey_trekking',
        'safari', 'game_drive', 'night_safari',
        'boat_cruise', 'kayaking', 'canoeing', 'swimming',
        'hiking', 'trekking', 'nature_walk', 'canopy_walk',
        'bird_watching', 'wildlife_photography',
        'cultural_tour', 'city_tour', 'village_visit',
        'coffee_tour', 'culinary_experience', 'food_tour',
        'museum_visit', 'memorial_visit', 'art_gallery',
        'market_tour', 'shopping', 'craft_workshop',
        'volcano_climbing', 'mountain_climbing', 'biking',
        'fishing', 'camping', 'star_gazing',
        'yoga', 'meditation', 'wellness_retreat',
        'photography_workshop', 'painting_workshop', 'dance_class'
      ],
      default: []
    }],

    // ─── Dietary Preferences ────────────────────────────────────
    dietaryRestrictions: [{
      type: String,
      enum: ['vegetarian', 'vegan', 'gluten_free', 'halal', 'kosher', 'dairy_free', 'nut_free'],
      default: []
    }],

    // ─── Accessibility ──────────────────────────────────────────
    accessibility: {
      type: String,
      enum: ['standard', 'wheelchair_accessible', 'limited_mobility', 'hearing_impaired', 'visually_impaired'],
      default: 'standard'
    },

    // ─── Preferred Destinations ─────────────────────────────────
    preferredDestinations: [{
      type: String,
      trim: true,
      lowercase: true
    }],
    visitedDestinations: [{
      type: String,
      trim: true,
      lowercase: true
    }],

    // ─── Seasonality ────────────────────────────────────────────
    preferredSeasons: [{
      type: String,
      enum: ['spring', 'summer', 'fall', 'winter', 'dry', 'rainy'],
      default: ['dry']
    }],

    // ─── Travel Pace ────────────────────────────────────────────
    travelPace: {
      type: String,
      enum: ['slow', 'moderate', 'fast', 'flexible'],
      default: 'moderate'
    },

    // ─── Risk Tolerance ──────────────────────────────────────────
    riskTolerance: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },

    // ─── Custom Preferences ─────────────────────────────────────
    customPreferences: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: () => new Map()
    }
  },

  // ============================================================
  // ✅ PHASE 1: BEHAVIORAL TRACKING
  // ============================================================

  behavior: {
    // ─── Booking History Summary ──────────────────────────────
    totalBookings: {
      type: Number,
      default: 0
    },
    completedBookings: {
      type: Number,
      default: 0
    },
    cancelledBookings: {
      type: Number,
      default: 0
    },
    averageRatingGiven: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },

    // ─── Category Preferences (Inferred) ──────────────────────
    favoriteCategories: [{
      type: String,
      default: []
    }],
    favoriteLocations: [{
      type: String,
      default: []
    }],
    favoriteActivities: [{
      type: String,
      default: []
    }],

    // ─── Spending Patterns ─────────────────────────────────────
    averageSpentPerBooking: {
      type: Number,
      default: 0
    },
    totalSpent: {
      type: Number,
      default: 0
    },
    maxSpentPerBooking: {
      type: Number,
      default: 0
    },

    // ─── Engagement ─────────────────────────────────────────────
    lastActivityAt: {
      type: Date,
      default: Date.now
    },
    engagementScore: {
      type: Number,
      default: 50,
      min: 0,
      max: 100
    },

    // ─── Review Behavior ───────────────────────────────────────
    reviewsSubmitted: {
      type: Number,
      default: 0
    },
    averageReviewRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },

    // ─── Search History (Last 10 searches) ────────────────────
    searchHistory: [{
      query: { type: String, trim: true },
      timestamp: { type: Date, default: Date.now },
      resultCount: { type: Number, default: 0 },
      intent: { type: String }
    }],

    // ─── Viewed Experiences (Last 20) ─────────────────────────
    viewedExperiences: [{
      listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing' },
      timestamp: { type: Date, default: Date.now },
      duration: { type: Number }, // seconds spent viewing
      source: { type: String } // where they came from
    }],

    // ─── Saved Experiences ─────────────────────────────────────
    savedExperiences: [{
      listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing' },
      savedAt: { type: Date, default: Date.now }
    }],

    // ─── AI Interaction History ────────────────────────────────
    aiInteractions: {
      totalSessions: { type: Number, default: 0 },
      totalMessages: { type: Number, default: 0 },
      lastSessionAt: { type: Date },
      averageSessionLength: { type: Number, default: 0 }
    },

    // ─── Device & Platform ──────────────────────────────────────
    devices: [{
      type: String,
      enum: ['desktop', 'mobile', 'tablet'],
      default: []
    }],
    preferredDevice: {
      type: String,
      enum: ['desktop', 'mobile', 'tablet'],
      default: 'desktop'
    }
  },

  // ============================================================
  // ✅ PHASE 1: PREFERENCE SCORES (Calculated)
  // ============================================================

  // These are computed from behavior data, not stored directly
  // They are calculated on-the-fly using methods
}, {
  timestamps: true
});

// ─── Indexes ─────────────────────────────────────────────────────
// Single field indexes
userSchema.index({ role: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ lockUntil: 1 });
userSchema.index({ verificationStatus: 1 });

// Compound indexes
userSchema.index({ isActive: 1, isEmailVerified: 1 });
userSchema.index({ isActive: 1, role: 1 });
userSchema.index({ verificationTokenHash: 1, verificationTokenExpiry: 1 });

// ✅ Preference indexes for faster queries
userSchema.index({ 'preferences.travelStyle': 1 });
userSchema.index({ 'preferences.budget': 1 });
userSchema.index({ 'preferences.preferredDestinations': 1 });
userSchema.index({ 'preferences.interests': 1 });
userSchema.index({ 'behavior.favoriteCategories': 1 });
userSchema.index({ 'behavior.favoriteLocations': 1 });

// ─── Virtuals ────────────────────────────────────────────────────

// Role checking virtuals
userSchema.virtual('isProvider').get(function() {
  return this.role === 'provider';
});

userSchema.virtual('isTraveler').get(function() {
  return this.role === 'traveler';
});

userSchema.virtual('isAdmin').get(function() {
  return this.role === 'admin';
});

userSchema.virtual('isVerifiedProvider').get(function() {
  return this.role === 'provider' && this.verificationStatus === 'approved';
});

userSchema.virtual('isPendingProvider').get(function() {
  return this.role === 'provider' && this.verificationStatus === 'pending';
});

userSchema.virtual('isRejectedProvider').get(function() {
  return this.role === 'provider' && this.verificationStatus === 'rejected';
});

userSchema.virtual('isEmailVerifiedUser').get(function() {
  return this.isEmailVerified === true;
});

userSchema.virtual('isActiveUser').get(function() {
  return this.isActive === true;
});

// ✅ PHASE 1: Preference virtuals
userSchema.virtual('preferenceScore').get(function() {
  return this.calculatePreferenceScore();
});

userSchema.virtual('engagementLevel').get(function() {
  const score = this.behavior?.engagementScore || 50;
  if (score >= 80) return 'high';
  if (score >= 50) return 'medium';
  return 'low';
});

userSchema.virtual('hasPreferences').get(function() {
  return !!(this.preferences?.interests?.length > 0 || 
            this.preferences?.preferredDestinations?.length > 0);
});

// ─── Methods ─────────────────────────────────────────────────────
userSchema.methods = {
  /**
   * Increment login attempts and lock account if threshold exceeded
   */
  incrementLoginAttempts: async function() {
    const MAX_ATTEMPTS = CONFIG.MAX_LOGIN_ATTEMPTS;
    const LOCK_TIME_MS = getLockTimeMs();

    if (this.lockUntil && this.lockUntil > Date.now()) {
      return this;
    }

    this.loginAttempts += 1;

    if (this.loginAttempts >= MAX_ATTEMPTS) {
      this.loginAttempts = 0;
      this.lockUntil = new Date(Date.now() + LOCK_TIME_MS);
    }

    return this.save({ validateBeforeSave: false });
  },

  /**
   * Reset login attempts and unlock account
   */
  resetLoginAttempts: async function() {
    this.loginAttempts = 0;
    this.lockUntil = null;
    return this.save({ validateBeforeSave: false });
  },

  /**
   * Check if account is currently locked
   */
  isLocked: function() {
    return this.lockUntil && this.lockUntil > Date.now();
  },

  /**
   * Get remaining lock time in milliseconds
   */
  getRemainingLockTime: function() {
    if (!this.lockUntil || this.lockUntil <= Date.now()) {
      return 0;
    }
    return this.lockUntil - Date.now();
  },

  /**
   * Get remaining lock time in minutes (rounded up)
   */
  getRemainingLockMinutes: function() {
    const ms = this.getRemainingLockTime();
    if (ms === 0) return 0;
    return Math.ceil(ms / 60000);
  },

  /**
   * Check if user is locked and update lock status
   */
  checkLockStatus: function() {
    const isLocked = this.isLocked();
    return {
      isLocked,
      remainingMinutes: isLocked ? this.getRemainingLockMinutes() : 0,
      remainingTime: isLocked ? this.getRemainingLockTime() : 0
    };
  },

  /**
   * Sanitize user object for API response
   */
  sanitize: function() {
    const obj = this.toObject();
    delete obj.password;
    delete obj.verificationTokenHash;
    delete obj.verificationTokenExpiry;
    delete obj.__v;
    return obj;
  },

  /**
   * Get user type label
   */
  getUserTypeLabel: function() {
    const labels = {
      traveler: 'Traveler',
      provider: 'Service Provider',
      admin: 'Administrator'
    };
    return labels[this.role] || 'User';
  },

  /**
   * Check if user can become provider
   */
  canBecomeProvider: function() {
    return this.role === 'traveler' && this.isEmailVerified;
  },

  /**
   * Check if user has provider profile
   */
  hasProviderProfile: function() {
    return this.role === 'provider' || this.verificationStatus === 'approved';
  },

  // ============================================================
  // ✅ PHASE 1: PREFERENCE METHODS
  // ============================================================

  /**
   * Update user preferences
   */
  updatePreferences: async function(newPreferences) {
    const allowedFields = [
      'travelStyle', 'budget', 'minBudgetPerDay', 'maxBudgetPerDay',
      'interests', 'accommodation', 'groupSize', 'isFamilyTraveler',
      'isSoloTraveler', 'isGroupTraveler', 'preferredLanguage',
      'communicationChannels', 'preferredActivities', 'dietaryRestrictions',
      'accessibility', 'preferredDestinations', 'visitedDestinations',
      'preferredSeasons', 'travelPace', 'riskTolerance'
    ];

    for (const field of allowedFields) {
      if (newPreferences[field] !== undefined) {
        this.preferences[field] = newPreferences[field];
      }
    }

    await this.save();
    return this;
  },

  /**
   * Add an interest to preferences
   */
  addInterest: async function(interest) {
    if (!this.preferences.interests.includes(interest)) {
      this.preferences.interests.push(interest);
      await this.save();
    }
    return this;
  },

  /**
   * Remove an interest from preferences
   */
  removeInterest: async function(interest) {
    this.preferences.interests = this.preferences.interests.filter(i => i !== interest);
    await this.save();
    return this;
  },

  /**
   * Add a preferred destination
   */
  addPreferredDestination: async function(destination) {
    const normalized = destination.toLowerCase().trim();
    if (!this.preferences.preferredDestinations.includes(normalized)) {
      this.preferences.preferredDestinations.push(normalized);
      await this.save();
    }
    return this;
  },

  /**
   * Remove a preferred destination
   */
  removePreferredDestination: async function(destination) {
    const normalized = destination.toLowerCase().trim();
    this.preferences.preferredDestinations = 
      this.preferences.preferredDestinations.filter(d => d !== normalized);
    await this.save();
    return this;
  },

  /**
   * Mark a destination as visited
   */
  markDestinationVisited: async function(destination) {
    const normalized = destination.toLowerCase().trim();
    if (!this.preferences.visitedDestinations.includes(normalized)) {
      this.preferences.visitedDestinations.push(normalized);
      await this.save();
    }
    return this;
  },

  /**
   * Get user context for AI personalization
   */
  getAIContext: function() {
    return {
      name: this.name,
      role: this.role,
      preferences: {
        travelStyle: this.preferences.travelStyle,
        budget: this.preferences.budget,
        interests: this.preferences.interests,
        preferredDestinations: this.preferences.preferredDestinations,
        visitedDestinations: this.preferences.visitedDestinations,
        accommodation: this.preferences.accommodation,
        groupSize: this.preferences.groupSize,
        travelPace: this.preferences.travelPace
      },
      behavior: {
        totalBookings: this.behavior.totalBookings,
        completedBookings: this.behavior.completedBookings,
        favoriteCategories: this.behavior.favoriteCategories,
        favoriteLocations: this.behavior.favoriteLocations,
        averageRatingGiven: this.behavior.averageRatingGiven,
        engagementScore: this.behavior.engagementScore
      },
      hasPreferences: this.hasPreferences,
      engagementLevel: this.engagementLevel
    };
  },

  /**
   * Calculate preference score (0-100)
   */
  calculatePreferenceScore: function() {
    let score = 0;
    const prefs = this.preferences;

    // Interest variety (max 30)
    if (prefs.interests?.length > 0) {
      score += Math.min(prefs.interests.length * 5, 30);
    }

    // Destination variety (max 20)
    if (prefs.preferredDestinations?.length > 0) {
      score += Math.min(prefs.preferredDestinations.length * 5, 20);
    }

    // Budget clarity (max 15)
    if (prefs.budget && prefs.budget !== 'mid-range') {
      score += 10;
    }
    if (prefs.minBudgetPerDay > 0 || prefs.maxBudgetPerDay > 0) {
      score += 5;
    }

    // Travel style selected (max 10)
    if (prefs.travelStyle && prefs.travelStyle !== 'balanced') {
      score += 10;
    }

    // Group preferences (max 10)
    if (prefs.groupSize > 0) {
      score += 5;
    }
    if (prefs.isFamilyTraveler || prefs.isSoloTraveler || prefs.isGroupTraveler) {
      score += 5;
    }

    // Accommodation preference (max 5)
    if (prefs.accommodation && prefs.accommodation !== 'mid-range') {
      score += 5;
    }

    // Activity preferences (max 10)
    if (prefs.preferredActivities?.length > 0) {
      score += Math.min(prefs.preferredActivities.length * 2, 10);
    }

    return Math.min(score, 100);
  },

  /**
   * Update engagement score
   */
  updateEngagementScore: function() {
    let score = 50; // Base score

    // Booking activity (max 25)
    const totalBookings = this.behavior.totalBookings || 0;
    score += Math.min(totalBookings * 2, 25);

    // Review activity (max 15)
    const reviewsSubmitted = this.behavior.reviewsSubmitted || 0;
    score += Math.min(reviewsSubmitted * 3, 15);

    // Recent activity (max 10)
    const lastActivity = this.behavior.lastActivityAt || new Date(0);
    const daysSinceActivity = (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceActivity < 7) {
      score += 10;
    } else if (daysSinceActivity < 30) {
      score += 5;
    }

    // Preference completeness (max 10)
    score += Math.floor(this.calculatePreferenceScore() / 10);

    this.behavior.engagementScore = Math.min(score, 100);
    return this;
  },

  /**
   * Record a viewed experience
   */
  recordView: async function(listingId, duration = 0, source = 'direct') {
    this.behavior.viewedExperiences.push({
      listingId,
      timestamp: new Date(),
      duration,
      source
    });

    // Keep only last 20
    if (this.behavior.viewedExperiences.length > 20) {
      this.behavior.viewedExperiences = this.behavior.viewedExperiences.slice(-20);
    }

    await this.updateEngagementScore();
    await this.save();
    return this;
  },

  /**
   * Record a search
   */
  recordSearch: async function(query, resultCount = 0, intent = 'general') {
    this.behavior.searchHistory.push({
      query,
      timestamp: new Date(),
      resultCount,
      intent
    });

    // Keep only last 10
    if (this.behavior.searchHistory.length > 10) {
      this.behavior.searchHistory = this.behavior.searchHistory.slice(-10);
    }

    this.behavior.lastActivityAt = new Date();
    await this.updateEngagementScore();
    await this.save();
    return this;
  },

  /**
   * Save an experience to favorites
   */
  saveExperience: async function(listingId) {
    const exists = this.behavior.savedExperiences.some(
      e => e.listingId.toString() === listingId.toString()
    );
    if (!exists) {
      this.behavior.savedExperiences.push({
        listingId,
        savedAt: new Date()
      });
      await this.save();
    }
    return this;
  },

  /**
   * Remove an experience from favorites
   */
  unsaveExperience: async function(listingId) {
    this.behavior.savedExperiences = this.behavior.savedExperiences.filter(
      e => e.listingId.toString() !== listingId.toString()
    );
    await this.save();
    return this;
  },

  /**
   * Check if experience is saved
   */
  isExperienceSaved: function(listingId) {
    return this.behavior.savedExperiences.some(
      e => e.listingId.toString() === listingId.toString()
    );
  },

  /**
   * Get personalized recommendations context
   */
  getPersonalizationContext: function() {
    return {
      preferences: {
        travelStyle: this.preferences.travelStyle,
        budget: this.preferences.budget,
        interests: this.preferences.interests,
        preferredDestinations: this.preferences.preferredDestinations,
        visitedDestinations: this.preferences.visitedDestinations,
        accommodation: this.preferences.accommodation,
        travelPace: this.preferences.travelPace
      },
      behavior: {
        favoriteCategories: this.behavior.favoriteCategories,
        favoriteLocations: this.behavior.favoriteLocations,
        averageSpentPerBooking: this.behavior.averageSpentPerBooking,
        engagementLevel: this.engagementLevel
      },
      savedExperiences: this.behavior.savedExperiences.map(e => e.listingId),
      viewedExperiences: this.behavior.viewedExperiences.slice(-10)
    };
  }
};

// ─── Statics ─────────────────────────────────────────────────────

userSchema.statics = {
  /**
   * Find active users by role
   */
  findActiveByRole: async function(role) {
    return this.find({
      role,
      isActive: true
    }).select('-password -verificationTokenHash -verificationTokenExpiry');
  },

  /**
   * Find providers with pending verification
   */
  findPendingProviders: async function() {
    return this.find({
      role: 'provider',
      verificationStatus: 'pending',
      isActive: true
    }).select('-password -verificationTokenHash -verificationTokenExpiry');
  },

  /**
   * Find verified providers
   */
  findVerifiedProviders: async function() {
    return this.find({
      role: 'provider',
      verificationStatus: 'approved',
      isActive: true
    }).select('-password -verificationTokenHash -verificationTokenExpiry');
  },

  /**
   * Get user statistics
   */
  getStats: async function() {
    const stats = await this.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
          active: {
            $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
          },
          verified: {
            $sum: { $cond: [{ $eq: ['$isEmailVerified', true] }, 1, 0] }
          }
        }
      }
    ]);

    const total = await this.countDocuments();
    const result = {
      total,
      roles: {}
    };

    stats.forEach(stat => {
      result.roles[stat._id] = {
        count: stat.count,
        active: stat.active,
        verified: stat.verified
      };
    });

    return result;
  },

  /**
   * Find or create user by email
   */
  findOrCreate: async function(email, userData = {}) {
    let user = await this.findOne({ email });
    if (!user) {
      user = new this({ email, ...userData });
      await user.save();
    }
    return user;
  },

  /**
   * ✅ PHASE 1: Find users with preferences for personalization
   */
  findWithPreferences: async function(query = {}) {
    return this.find(query)
      .select('name email preferences behavior savedExperiences')
      .lean();
  },

  /**
   * ✅ PHASE 1: Get users with high engagement for recommendations
   */
  findHighEngagementUsers: async function(limit = 100) {
    return this.find({
      'behavior.engagementScore': { $gte: 70 },
      isActive: true
    })
    .select('name email preferences behavior')
    .sort({ 'behavior.engagementScore': -1 })
    .limit(limit)
    .lean();
  },

  /**
   * ✅ PHASE 1: Get user preferences for AI personalization
   */
  getAIContexts: async function(userIds) {
    const users = await this.find({ 
      _id: { $in: userIds },
      isActive: true 
    }).select('name preferences behavior');
    
    return users.map(user => user.getAIContext());
  }
};

export const User = mongoose.model('User', userSchema);
export default User;