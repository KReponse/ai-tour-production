// backend/src/models/ProviderRequest.js
// ✅ COMPLETE FIXED - Removed duplicate index on user field
// ✅ Fixed duplicate index warning

import mongoose from "mongoose";

const providerRequestSchema = new mongoose.Schema(
  {
    // =========================
    // USER (Applicant)
    // =========================
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      // ✅ REMOVED: index: true - now defined in schema.index() below
      validate: {
        validator: async function(value) {
          if (!value) return false;
          const User = mongoose.model('User');
          const user = await User.findById(value);
          return !!user;
        },
        message: "User does not exist"
      }
    },

    // =========================
    // PERSONAL INFORMATION
    // =========================
    fullName: {
      type: String,
      trim: true
    },

    email: {
      type: String,
      trim: true,
      lowercase: true
    },

    phone: {
      type: String,
      trim: true
    },

    whatsapp: {
      type: String,
      trim: true
    },

    nationality: {
      type: String,
      trim: true
    },

    businessEmail: {
      type: String,
      trim: true,
      lowercase: true
    },

    alternatePhone: {
      type: String,
      trim: true
    },

    // =========================
    // BUSINESS INFORMATION
    // =========================
    businessName: {
      type: String,
      trim: true,
      required: [true, "Business name is required"]
    },

    businessType: {
      type: String,
      enum: [
        'tour_operator',
        'hotel',
        'lodge',
        'restaurant',
        'transport',
        'guide',
        'events',
        'cafe',
        'shop',
        'other'
      ],
      default: 'other'
    },

    description: {
      type: String,
      trim: true,
      maxlength: 1000
    },

    // =========================
    // LOCATION
    // =========================
    country: {
      type: String,
      trim: true,
      default: 'Rwanda'
    },

    province: {
      type: String,
      trim: true
    },

    district: {
      type: String,
      trim: true
    },

    city: {
      type: String,
      trim: true
    },

    street: {
      type: String,
      trim: true
    },

    googleMaps: {
      type: String,
      trim: true
    },

    businessAddress: {
      type: String,
      trim: true
    },

    businessPhone: {
      type: String,
      trim: true
    },

    // =========================
    // DOCUMENTS & MEDIA
    // =========================
    documents: [{
      type: String,
      trim: true
    }],

    // Individual document fields
    nationalIdFile: {
      type: String,
      trim: true
    },

    passportFile: {
      type: String,
      trim: true
    },

    rdbCertificateFile: {
      type: String,
      trim: true
    },

    tinCertificateFile: {
      type: String,
      trim: true
    },

    tourismLicenseFile: {
      type: String,
      trim: true
    },

    businessRegistrationFile: {
      type: String,
      trim: true
    },

    insuranceFile: {
      type: String,
      trim: true
    },

    profileImage: {
      type: String,
      trim: true
    },

    logo: {
      type: String,
      trim: true
    },

    coverImage: {
      type: String,
      trim: true
    },

    // =========================
    // PRICING
    // =========================
    price: {
      type: Number,
      min: 0
    },

    currency: {
      type: String,
      default: 'USD',
      enum: ['USD', 'RWF', 'EUR', 'GBP']
    },

    availability: {
      type: String,
      enum: [
        'Monday-Friday',
        'Monday-Saturday',
        'Monday-Sunday',
        'Weekends',
        'Weekdays',
        '24/7',
        'By Appointment'
      ],
      default: 'Monday-Friday'
    },

    // =========================
    // SOCIAL LINKS
    // =========================
    socialLinks: {
      instagram: {
        type: String,
        trim: true
      },
      facebook: {
        type: String,
        trim: true
      },
      linkedin: {
        type: String,
        trim: true
      },
      tiktok: {
        type: String,
        trim: true
      },
      twitter: {
        type: String,
        trim: true
      },
      youtube: {
        type: String,
        trim: true
      }
    },

    // Separate social fields for direct access
    facebook: {
      type: String,
      trim: true
    },

    instagram: {
      type: String,
      trim: true
    },

    twitter: {
      type: String,
      trim: true
    },

    linkedin: {
      type: String,
      trim: true
    },

    youtube: {
      type: String,
      trim: true
    },

    tiktok: {
      type: String,
      trim: true
    },

    // =========================
    // BUSINESS DETAILS
    // =========================
    website: {
      type: String,
      trim: true
    },

    nationalId: {
      type: String,
      trim: true
    },

    tinNumber: {
      type: String,
      trim: true
    },

    rdbRegistration: {
      type: String,
      trim: true
    },

    tourismLicense: {
      type: String,
      trim: true
    },

    languages: [{
      type: String
    }],

    specializations: [{
      type: String
    }],

    yearsOfExperience: {
      type: String,
      trim: true
    },

    employees: {
      type: Number,
      min: 0
    },

    businessHours: {
      monday: { open: String, close: String, closed: Boolean },
      tuesday: { open: String, close: String, closed: Boolean },
      wednesday: { open: String, close: String, closed: Boolean },
      thursday: { open: String, close: String, closed: Boolean },
      friday: { open: String, close: String, closed: Boolean },
      saturday: { open: String, close: String, closed: Boolean },
      sunday: { open: String, close: String, closed: Boolean }
    },

    // =========================
    // PAYMENT INFORMATION
    // =========================
    paymentMethod: {
      type: String,
      enum: ['bank_transfer', 'mobile_money', 'both'],
      default: 'mobile_money'
    },

    bankName: {
      type: String,
      trim: true
    },

    accountName: {
      type: String,
      trim: true
    },

    accountNumber: {
      type: String,
      trim: true
    },

    swiftCode: {
      type: String,
      trim: true
    },

    mobileMoney: {
      type: String,
      trim: true
    },

    paymentCurrency: {
      type: String,
      default: 'USD',
      enum: ['USD', 'RWF', 'EUR', 'GBP']
    },

    // =========================
    // AGREEMENTS
    // =========================
    agreeToTerms: {
      type: Boolean,
      default: false
    },

    agreeToPrivacy: {
      type: Boolean,
      default: false
    },

    agreeToConduct: {
      type: Boolean,
      default: false
    },

    agreeToCommission: {
      type: Boolean,
      default: false
    },

    agreeToTourism: {
      type: Boolean,
      default: false
    },

    agreeToAccurate: {
      type: Boolean,
      default: false
    },

    // =========================
    // STATUS
    // =========================
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "needs_information"],
      default: "pending",
      index: true
    },

    adminNotes: {
      type: String,
      default: "",
      trim: true
    },

    reviewedAt: {
      type: Date
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  },
  {
    timestamps: true
  }
);

// =========================
// INDEXES FOR PERFORMANCE
// =========================
// ✅ All indexes defined here to avoid duplicates
providerRequestSchema.index({ user: 1 }); // ✅ Single definition
providerRequestSchema.index({ status: 1, createdAt: -1 });
providerRequestSchema.index({ businessName: 'text', fullName: 'text', email: 'text' });
providerRequestSchema.index({ createdAt: -1 });
providerRequestSchema.index({ updatedAt: -1 });
providerRequestSchema.index({ user: 1, status: 1 });
providerRequestSchema.index({ businessName: 1, status: 1 });

// =========================
// PRE-SAVE MIDDLEWARE
// =========================
providerRequestSchema.pre('save', function(next) {
  // ✅ Ensure user is set and is a valid ObjectId
  if (!this.user) {
    const error = new Error('User is required');
    error.status = 400;
    return next(error);
  }

  // ✅ Trim string fields
  const stringFields = ['fullName', 'email', 'phone', 'whatsapp', 'nationality', 
    'businessEmail', 'alternatePhone', 'businessName', 'description', 'country',
    'province', 'district', 'city', 'street', 'googleMaps', 'businessAddress',
    'businessPhone', 'website', 'nationalId', 'tinNumber', 'rdbRegistration',
    'tourismLicense', 'adminNotes'
  ];

  stringFields.forEach(field => {
    if (this[field] && typeof this[field] === 'string') {
      this[field] = this[field].trim();
    }
  });

  // ✅ Ensure email is lowercase
  if (this.email) this.email = this.email.toLowerCase();
  if (this.businessEmail) this.businessEmail = this.businessEmail.toLowerCase();

  // ✅ Ensure price is a number
  if (this.price !== undefined && this.price !== null) {
    this.price = Number(this.price);
  }

  // ✅ Ensure employees is a number
  if (this.employees !== undefined && this.employees !== null) {
    this.employees = Number(this.employees);
  }

  next();
});

// =========================
// VIRTUAL: Is pending
// =========================
providerRequestSchema.virtual('isPending').get(function() {
  return this.status === 'pending';
});

// =========================
// VIRTUAL: Is approved
// =========================
providerRequestSchema.virtual('isApproved').get(function() {
  return this.status === 'approved';
});

// =========================
// VIRTUAL: Is rejected
// =========================
providerRequestSchema.virtual('isRejected').get(function() {
  return this.status === 'rejected';
});

// =========================
// VIRTUAL: Needs information
// =========================
providerRequestSchema.virtual('needsInformation').get(function() {
  return this.status === 'needs_information';
});

// =========================
// VIRTUAL: Has been reviewed
// =========================
providerRequestSchema.virtual('hasBeenReviewed').get(function() {
  return this.status !== 'pending' && !!this.reviewedAt;
});

// =========================
// VIRTUAL: Review status display
// =========================
providerRequestSchema.virtual('reviewStatus').get(function() {
  const statusMap = {
    'pending': '⏳ Pending Review',
    'approved': '✅ Approved',
    'rejected': '❌ Rejected',
    'needs_information': 'ℹ️ Needs Information'
  };
  return statusMap[this.status] || this.status;
});

// =========================
// METHOD: Update status
// =========================
providerRequestSchema.methods.updateStatus = async function(status, adminNotes, adminId) {
  const validStatuses = ['pending', 'approved', 'rejected', 'needs_information'];
  
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }

  this.status = status;
  if (adminNotes) this.adminNotes = adminNotes;
  this.reviewedAt = new Date();
  this.reviewedBy = adminId;
  await this.save();
  return this;
};

// =========================
// METHOD: Approve
// =========================
providerRequestSchema.methods.approve = async function(adminId, notes = '') {
  return this.updateStatus('approved', notes, adminId);
};

// =========================
// METHOD: Reject
// =========================
providerRequestSchema.methods.reject = async function(adminId, notes = '') {
  return this.updateStatus('rejected', notes, adminId);
};

// =========================
// METHOD: Request more information
// =========================
providerRequestSchema.methods.requestInformation = async function(adminId, notes = '') {
  return this.updateStatus('needs_information', notes, adminId);
};

// =========================
// STATIC: Get pending requests
// =========================
providerRequestSchema.statics.getPending = function() {
  return this.find({ status: 'pending' })
    .populate('user', 'name email profileImage phone')
    .sort({ createdAt: 1 });
};

// =========================
// STATIC: Get by status
// =========================
providerRequestSchema.statics.getByStatus = function(status) {
  return this.find({ status })
    .populate('user', 'name email profileImage phone')
    .sort({ createdAt: -1 });
};

// =========================
// STATIC: Get by user
// =========================
providerRequestSchema.statics.getByUser = function(userId) {
  return this.findOne({ user: userId })
    .sort({ createdAt: -1 });
};

// =========================
// STATIC: Check if user has pending request
// =========================
providerRequestSchema.statics.hasPendingRequest = async function(userId) {
  const request = await this.findOne({ 
    user: userId, 
    status: 'pending' 
  });
  return !!request;
};

// =========================
// STATIC: Get all with populated user
// =========================
providerRequestSchema.statics.getAllWithUser = function(filter = {}) {
  return this.find(filter)
    .populate('user', 'name email profileImage phone role isEmailVerified')
    .populate('reviewedBy', 'name email')
    .sort({ createdAt: -1 });
};

// =========================
// STATIC: Get paginated
// =========================
providerRequestSchema.statics.getPaginated = async function({
  page = 1,
  limit = 20,
  status = null,
  search = null,
  sortBy = 'createdAt',
  sortOrder = -1
}) {
  const filter = {};
  
  if (status && status !== 'all') {
    filter.status = status;
  }
  
  if (search && search.trim()) {
    filter.$or = [
      { businessName: { $regex: search, $options: 'i' } },
      { fullName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { businessEmail: { $regex: search, $options: 'i' } },
      { country: { $regex: search, $options: 'i' } },
      { city: { $regex: search, $options: 'i' } }
    ];
  }

  const skip = (page - 1) * limit;
  const sort = { [sortBy]: sortOrder };

  const [requests, total] = await Promise.all([
    this.find(filter)
      .populate('user', 'name email profileImage phone')
      .populate('reviewedBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    this.countDocuments(filter)
  ]);

  return {
    requests,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasMore: page * limit < total
  };
};

// =========================
// STATIC: Get statistics
// =========================
providerRequestSchema.statics.getStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  const result = {
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    needsInformation: 0
  };

  stats.forEach(stat => {
    result.total += stat.count;
    if (stat._id === 'pending') result.pending = stat.count;
    else if (stat._id === 'approved') result.approved = stat.count;
    else if (stat._id === 'rejected') result.rejected = stat.count;
    else if (stat._id === 'needs_information') result.needsInformation = stat.count;
  });

  // ✅ Today's submissions
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  result.today = await this.countDocuments({
    createdAt: { $gte: today, $lt: tomorrow }
  });

  // ✅ This week
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  result.thisWeek = await this.countDocuments({
    createdAt: { $gte: weekStart }
  });

  return result;
};

// =========================
// STATIC: Search provider requests
// =========================
providerRequestSchema.statics.search = async function(query, options = {}) {
  const { limit = 20, page = 1, status = null } = options;
  
  const filter = {
    $text: {
      $search: query,
      $caseSensitive: false,
      $diacriticSensitive: false
    }
  };

  if (status && status !== 'all') {
    filter.status = status;
  }

  const skip = (page - 1) * limit;

  const [requests, total] = await Promise.all([
    this.find(filter)
      .populate('user', 'name email profileImage phone')
      .populate('reviewedBy', 'name email')
      .sort({ score: { $meta: 'textScore' } })
      .skip(skip)
      .limit(limit)
      .lean(),
    this.countDocuments(filter)
  ]);

  return {
    requests,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  };
};

// =========================
// TO JSON
// =========================
providerRequestSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  }
});

// =========================
// TO OBJECT
// =========================
providerRequestSchema.set('toObject', {
  virtuals: true
});

// =========================
// COMPILE MODEL
// =========================
const ProviderRequest = mongoose.model("ProviderRequest", providerRequestSchema);

export default ProviderRequest;