// backend/src/models/User.js
// ✅ COMPLETE FIXED - Removed duplicate indexes
// ✅ Fixed role index (removed index:true from field)
// ✅ Fixed email index (removed schema.index() - unique:true already creates it)
// ✅ Added provider-specific fields
// ✅ Added helper virtuals for role checking

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
    unique: true, // ✅ Creates index automatically
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
    // ✅ REMOVED: index: true - defined in schema.index() below
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
  }
}, {
  timestamps: true
});

// ─── Indexes ─────────────────────────────────────────────────────
// ✅ SINGLE SOURCE OF TRUTH FOR INDEXES
// WARNING: Do NOT add schema.index() for fields with unique: true
// They already create indexes automatically!

// ✅ Single field indexes
userSchema.index({ role: 1 }); // ✅ Only defined here
userSchema.index({ createdAt: -1 });
userSchema.index({ lockUntil: 1 });
userSchema.index({ verificationStatus: 1 });

// ✅ Compound indexes
userSchema.index({ isActive: 1, isEmailVerified: 1 });
userSchema.index({ isActive: 1, role: 1 });
userSchema.index({ verificationTokenHash: 1, verificationTokenExpiry: 1 });

// ✅ NOTE: email index is created automatically by unique: true
// DO NOT add userSchema.index({ email: 1 }) here!

// ─── Virtuals ────────────────────────────────────────────────────

// ✅ Role checking virtuals
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

// ─── Methods ─────────────────────────────────────────────────────
userSchema.methods = {
  /**
   * Increment login attempts and lock account if threshold exceeded
   * Uses configurable values from environment variables
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
  }
};

export const User = mongoose.model('User', userSchema);
export default User;