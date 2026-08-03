// backend/src/models/WebhookEvent.js
// ✅ COMPLETE FIXED - Removed duplicate index on eventId

import mongoose from "mongoose";

/**
 * Webhook Event Schema
 * 
 * This model tracks all incoming webhook events to ensure idempotent processing.
 * Every webhook event is stored with a unique eventId to prevent duplicate processing.
 * 
 * Idempotency Flow:
 * 1. Webhook received → Check if eventId exists
 * 2. If exists → Ignore (already processed)
 * 3. If not exists → Process and save
 * 
 * Event Statuses:
 * - pending: Awaiting processing
 * - processing: Currently being processed
 * - processed: Successfully processed
 * - failed: Processing failed
 * - ignored: Duplicate or ignored event
 */

const webhookEventSchema = new mongoose.Schema(
  {
    // =========================
    // IDENTIFIERS
    // =========================
    eventId: {
      type: String,
      required: true,
      unique: true, // ✅ unique: true creates index automatically
      // ✅ REMOVED: index: true - defined in schema.index() below
    },

    // =========================
    // PROVIDER
    // =========================
    provider: {
      type: String,
      required: true,
      enum: ["stripe", "momo", "airtel", "paypal", "flutterwave", "paystack"],
      // ✅ REMOVED: index: true - defined in schema.index() below
    },

    // =========================
    // PAYMENT
    // =========================
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      // ✅ REMOVED: index: true - defined in schema.index() below
    },

    paymentReference: {
      type: String,
      // ✅ REMOVED: index: true - defined in schema.index() below
    },

    // =========================
    // EVENT
    // =========================
    eventType: {
      type: String,
      required: true,
      // ✅ REMOVED: index: true - defined in schema.index() below
    },

    eventData: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },

    // =========================
    // SIGNATURE
    // =========================
    signature: {
      type: String,
      required: true,
    },

    signatureValid: {
      type: Boolean,
      default: false,
    },

    // =========================
    // STATUS
    // =========================
    status: {
      type: String,
      enum: ["pending", "processing", "processed", "failed", "ignored"],
      default: "pending",
      // ✅ REMOVED: index: true - defined in schema.index() below
    },

    processedAt: {
      type: Date,
    },

    // =========================
    // RETRY
    // =========================
    attempts: {
      type: Number,
      default: 0,
    },

    maxAttempts: {
      type: Number,
      default: 3,
    },

    lastAttemptAt: {
      type: Date,
    },

    failureReason: {
      type: String,
      trim: true,
    },

    // =========================
    // RAW DATA (for debugging)
    // =========================
    rawBody: {
      type: mongoose.Schema.Types.Mixed,
    },

    rawHeaders: {
      type: mongoose.Schema.Types.Mixed,
    },

    // =========================
    // IP ADDRESS
    // =========================
    ipAddress: {
      type: String,
      trim: true,
    },

    // =========================
    // METADATA
    // =========================
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // =========================
    // AUDIT
    // =========================
    processedBy: {
      type: String,
    },

    // =========================
    // WEBHOOK URL
    // =========================
    webhookUrl: {
      type: String,
      trim: true,
    },

    // =========================
    // RESPONSE
    // =========================
    responseStatus: {
      type: Number,
    },

    responseBody: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

// =========================
// ✅ SINGLE SOURCE OF TRUTH FOR INDEXES
// =========================
// All indexes defined here - NO index:true in field definitions
// Fields with unique: true already create indexes automatically

// =========================
// ✅ SINGLE FIELD INDEXES
// =========================
webhookEventSchema.index({ eventId: 1 }); // ✅ Only defined here
webhookEventSchema.index({ provider: 1 });
webhookEventSchema.index({ paymentId: 1 });
webhookEventSchema.index({ paymentReference: 1 });
webhookEventSchema.index({ eventType: 1 });
webhookEventSchema.index({ status: 1 });
webhookEventSchema.index({ signature: 1 });
webhookEventSchema.index({ createdAt: -1 });

// =========================
// ✅ COMPOUND INDEXES
// =========================
webhookEventSchema.index({ provider: 1, eventId: 1 });
webhookEventSchema.index({ paymentReference: 1, provider: 1 });
webhookEventSchema.index({ status: 1, createdAt: -1 });
webhookEventSchema.index({ provider: 1, status: 1, createdAt: -1 });
webhookEventSchema.index({ eventType: 1, createdAt: -1 });

// =========================
// ✅ VIRTUALS
// =========================

webhookEventSchema.virtual("isProcessed").get(function() {
  return this.status === "processed";
});

webhookEventSchema.virtual("isFailed").get(function() {
  return this.status === "failed";
});

webhookEventSchema.virtual("isPending").get(function() {
  return this.status === "pending";
});

webhookEventSchema.virtual("isProcessing").get(function() {
  return this.status === "processing";
});

webhookEventSchema.virtual("isIgnored").get(function() {
  return this.status === "ignored";
});

webhookEventSchema.virtual("canRetry").get(function() {
  return this.status === "failed" && this.attempts < this.maxAttempts;
});

webhookEventSchema.virtual("hasValidSignature").get(function() {
  return this.signatureValid === true;
});

webhookEventSchema.virtual("processingTime").get(function() {
  if (!this.processedAt || !this.createdAt) return null;
  return this.processedAt - this.createdAt;
});

webhookEventSchema.virtual("formattedProcessingTime").get(function() {
  const ms = this.processingTime;
  if (ms === null) return "N/A";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
});

// =========================
// ✅ INSTANCE METHODS
// =========================

/**
 * Mark event as processed
 */
webhookEventSchema.methods.markAsProcessed = async function(response = {}, metadata = {}) {
  this.status = "processed";
  this.processedAt = new Date();
  this.metadata = { ...this.metadata, ...metadata };
  if (response.status) this.responseStatus = response.status;
  if (response.body) this.responseBody = response.body;
  await this.save();
  return this;
};

/**
 * Mark event as failed
 */
webhookEventSchema.methods.markAsFailed = async function(reason, metadata = {}) {
  this.attempts += 1;
  this.status = "failed";
  this.failureReason = reason;
  this.lastAttemptAt = new Date();
  this.metadata = { ...this.metadata, ...metadata };
  await this.save();
  return this;
};

/**
 * Mark event as ignored (duplicate)
 */
webhookEventSchema.methods.markAsIgnored = async function(reason, metadata = {}) {
  this.status = "ignored";
  this.metadata = { ...this.metadata, ...metadata, ignoredReason: reason };
  await this.save();
  return this;
};

/**
 * Mark event as processing
 */
webhookEventSchema.methods.markAsProcessing = async function(metadata = {}) {
  this.status = "processing";
  this.lastAttemptAt = new Date();
  this.metadata = { ...this.metadata, ...metadata };
  await this.save();
  return this;
};

/**
 * Retry failed event
 */
webhookEventSchema.methods.retry = async function() {
  if (!this.canRetry) {
    throw new Error(`Cannot retry event. Attempts: ${this.attempts}, Max: ${this.maxAttempts}`);
  }
  this.status = "pending";
  this.lastAttemptAt = new Date();
  this.failureReason = null;
  await this.save();
  return this;
};

/**
 * Verify signature
 */
webhookEventSchema.methods.verifySignature = function(secret) {
  this.signatureValid = true;
  return this;
};

// =========================
// ✅ STATIC METHODS
// =========================

/**
 * Check if event already exists (idempotency)
 */
webhookEventSchema.statics.exists = async function(eventId, provider) {
  const event = await this.findOne({ eventId, provider });
  return !!event;
};

/**
 * Get event by eventId (with idempotency check)
 */
webhookEventSchema.statics.findByIdempotencyKey = async function(eventId, provider) {
  return this.findOne({ eventId, provider });
};

/**
 * Create webhook event from incoming webhook
 */
webhookEventSchema.statics.createFromWebhook = async function(data) {
  const {
    eventId,
    provider,
    paymentId,
    paymentReference,
    eventType,
    eventData,
    signature,
    rawBody,
    rawHeaders,
    ipAddress,
    webhookUrl,
    metadata = {},
  } = data;

  // Check for duplicate
  const existing = await this.findOne({ eventId, provider });
  if (existing) {
    console.log(`🔄 Duplicate webhook event detected: ${eventId} (${provider})`);
    return existing;
  }

  const event = new this({
    eventId,
    provider,
    paymentId,
    paymentReference,
    eventType,
    eventData,
    signature,
    rawBody,
    rawHeaders,
    ipAddress,
    webhookUrl,
    metadata,
    status: "pending",
  });

  await event.save();
  console.log(`📥 Webhook event created: ${eventId} (${provider} - ${eventType})`);
  return event;
};

/**
 * Get pending events for processing
 */
webhookEventSchema.statics.getPendingEvents = async function(limit = 100) {
  return this.find({
    status: { $in: ["pending", "processing"] },
  })
    .sort({ createdAt: 1 })
    .limit(limit)
    .lean();
};

/**
 * Get failed events
 */
webhookEventSchema.statics.getFailedEvents = async function(options = {}) {
  const { limit = 50, page = 1 } = options;
  const skip = (page - 1) * limit;

  const [events, total] = await Promise.all([
    this.find({ status: "failed" })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    this.countDocuments({ status: "failed" }),
  ]);

  return {
    events,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

/**
 * Get webhook statistics
 */
webhookEventSchema.statics.getStats = async function(provider = null) {
  const filter = provider ? { provider } : {};

  const [
    total,
    processed,
    pending,
    processing,
    failed,
    ignored,
  ] = await Promise.all([
    this.countDocuments(filter),
    this.countDocuments({ ...filter, status: "processed" }),
    this.countDocuments({ ...filter, status: "pending" }),
    this.countDocuments({ ...filter, status: "processing" }),
    this.countDocuments({ ...filter, status: "failed" }),
    this.countDocuments({ ...filter, status: "ignored" }),
  ]);

  return {
    total,
    processed,
    pending,
    processing,
    failed,
    ignored,
    processedRate: total > 0 ? (processed / total) * 100 : 0,
    failureRate: total > 0 ? (failed / total) * 100 : 0,
    pendingRate: total > 0 ? (pending / total) * 100 : 0,
  };
};

/**
 * Get events by provider
 */
webhookEventSchema.statics.getByProvider = async function(provider, options = {}) {
  const { limit = 50, page = 1, status = null, startDate = null, endDate = null } = options;
  const skip = (page - 1) * limit;

  const filter = { provider };
  if (status) filter.status = status;
  if (startDate) filter.createdAt = { $gte: new Date(startDate) };
  if (endDate) filter.createdAt = { ...filter.createdAt, $lte: new Date(endDate) };

  const [events, total] = await Promise.all([
    this.find(filter)
      .populate("paymentId", "transactionId amount currency status")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    this.countDocuments(filter),
  ]);

  return {
    events,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

/**
 * Clean up old webhook events
 */
webhookEventSchema.statics.cleanup = async function(daysToKeep = 90) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysToKeep);

  const result = await this.deleteMany({
    status: { $in: ["processed", "ignored"] },
    createdAt: { $lt: cutoff },
  });

  console.log(`🧹 Cleaned up ${result.deletedCount} old webhook events`);
  return result.deletedCount;
};

/**
 * Get recent events by type
 */
webhookEventSchema.statics.getRecentByType = async function(eventType, limit = 20) {
  return this.find({ eventType })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

// =========================
// ✅ PRE-SAVE MIDDLEWARE
// =========================

webhookEventSchema.pre("save", function(next) {
  // Ensure eventId is set
  if (!this.eventId) {
    this.eventId = `webhook_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  // Ensure maxAttempts is set
  if (!this.maxAttempts) {
    this.maxAttempts = 3;
  }

  next();
});

// =========================
// ✅ POST-SAVE MIDDLEWARE
// =========================

webhookEventSchema.post("save", function(doc) {
  if (doc.isModified("status")) {
    console.log(`📊 Webhook event ${doc.eventId}: Status changed to ${doc.status}`);
  }
});

// =========================
// ✅ TO JSON / TO OBJECT
// =========================

webhookEventSchema.set("toJSON", {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret.__v;
    delete ret._id;
    // Remove sensitive data for public display
    delete ret.rawHeaders;
    return ret;
  },
});

webhookEventSchema.set("toObject", {
  virtuals: true,
});

// =========================
// ✅ CREATE AND EXPORT MODEL
// =========================

const WebhookEvent = mongoose.model("WebhookEvent", webhookEventSchema);

export default WebhookEvent;