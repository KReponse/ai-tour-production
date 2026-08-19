// backend/src/server.js
// ✅ COMPLETE FIXED - Added conversation routes and socket events
// ✅ FIXED: Socket.IO send-message now uses Conversation instead of ChatRoom
// ✅ FIXED: Room naming consistency (user: vs user-)
// ✅ FIXED: Message model uses conversation field instead of room

import "dotenv/config";

import express from "express";
import cors from "cors";
import path from "path";
import http from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";

/* ================= DATABASE ================= */

import connectDB from "./config/database.js";

/* ================= ROUTES ================= */

// ✅ UPDATED: Using Authentication v2
import authRoutes from "./routes/auth.routes.js";
import tourRoutes from "./routes/tourRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import requestRoutes from "./routes/requestRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import providerRoutes from "./routes/providerRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import providerTourRoutes from "./routes/providerTourRoutes.js";
import earningRoutes from "./routes/earningRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import videoRoutes from "./routes/videoRoutes.js";
import providerProfileRoutes from "./routes/providerProfileRoutes.js";
import listingRoutes from "./routes/listingRoutes.js";
import publicReviewRoutes from './routes/publicReviewRoutes.js';
import providerReviewRoutes from './routes/providerReviewRoutes.js';
import adminReviewRoutes from './routes/adminReviewRoutes.js';
import newsletterRoutes from './routes/newsletterRoutes.js';
import providerRequestRoutes from "./routes/providerRequestRoutes.js";
import currencyRoutes from "./routes/currencyRoutes.js";

// ✅ Phase 2 Financial Routes
import ledgerRoutes from "./routes/ledgerRoutes.js";
import walletRoutes from "./routes/walletRoutes.js";
import settlementRoutes from "./routes/settlementRoutes.js";
import rateLockRoutes from "./routes/rateLockRoutes.js";
import webhookRoutes from "./routes/webhookRoutes.js";

// ✅ NEW: Hero Routes
import heroRoutes from "./routes/heroRoutes.js";

// ✅ NEW: Media Routes (direct Cloudinary uploads)
import mediaRoutes from "./routes/mediaRoutes.js";

import errorHandler from "./middleware/errorMiddleware.js";
import footerRoutes from "./routes/footerRoutes.js";
import { setIo } from './utils/notificationService.js';

// ✅ UPDATED: Using v2 JWT utilities
import { verifyToken, TOKEN_TYPES } from "./utils/jwt.utils.js";

import aboutRoutes from './routes/aboutRoutes.js';
import contactRoutes from './routes/contactRoutes.js';
import faqRoutes from './routes/faqRoutes.js';
import helpRoutes from './routes/helpRoutes.js';
import privacyRoutes from './routes/privacyRoutes.js';
import termsRoutes from './routes/termsRoutes.js';
import careersRoutes from './routes/careersRoutes.js';
import blogRoutes from './routes/blogRoutes.js';

// ✅ NEW: Conversation Routes
import conversationRoutes from './routes/conversationRoutes.js';

import exchangeRateRoutes from "./routes/exchangeRateRoutes.js";

/* ================= DATABASE ================= */

connectDB();

/* ================= APP ================= */

const app = express();

/* ================= HTTP SERVER ================= */

const server = http.createServer(app);

/* ================= SOCKET.IO WITH AUTH ================= */

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "*",
    methods: ["GET", "POST"],
    credentials: true
  },
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
    skipMiddlewares: true,
  }
});

// ✅ Socket.io authentication middleware (Using v2)
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      console.warn('⚠️ Socket connection rejected: No token provided');
      return next(new Error('Authentication required'));
    }

    const verification = verifyToken(token, TOKEN_TYPES.ACCESS);

    if (!verification.valid) {
      if (verification.error === 'Token expired') {
        console.warn('⚠️ Socket connection rejected: Token expired');
        return next(new Error('Token expired'));
      }
      
      console.warn(`⚠️ Socket connection rejected: ${verification.error}`);
      return next(new Error('Invalid token'));
    }

    const decoded = verification.decoded;
    
    const User = (await import('./models/User.js')).default;
    const user = await User.findById(decoded.sub)
      .select('-password -refreshTokenHash -refreshTokenId -tokenBlacklist')
      .lean();
    
    if (!user) {
      console.warn('⚠️ Socket connection rejected: User not found');
      return next(new Error('User not found'));
    }

    if (!user.isActive) {
      console.warn('⚠️ Socket connection rejected: User deactivated');
      return next(new Error('User deactivated'));
    }

    if (decoded.version && user.tokenVersion && decoded.version !== user.tokenVersion) {
      console.warn('⚠️ Socket connection rejected: Token version mismatch');
      return next(new Error('Token version mismatch'));
    }

    socket.user = user;
    socket.userId = user._id;
    socket.tokenDecoded = decoded;
    socket.token = token;

    console.log(`✅ Socket authenticated: ${user.email} (${user.role})`);
    next();
  } catch (error) {
    console.error('❌ Socket auth error:', error.message);
    next(new Error('Authentication failed'));
  }
});

app.set("io", io);
setIo(io);

/* ================= MIDDLEWARE ================= */

// Stripe webhook (must be raw)
app.use(
  "/api/payments/webhook",
  express.raw({
    type: "application/json"
  })
);

// ✅ CORS
app.use(cors({
  origin: [
    "https://aitourrwanda.com",
    "https://www.aitourrwanda.com",
    "https://ai-tour-eight.vercel.app",
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173"
  ],
  credentials: true
}));

// ✅ JSON with increased limit
app.use(express.json({ limit: '550mb' }));
app.use(express.urlencoded({ extended: true, limit: '550mb' }));

// ✅ Request logging (optional)
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`📝 ${req.method} ${req.path}`);
  }
  next();
});

/* ================= STATIC FILES ================= */

app.use(
  "/uploads",
  express.static(
    path.join(
      process.cwd(),
      "src/uploads"
    )
  )
);

/* ================= API ROUTES ================= */

// Auth routes - Using v2
app.use("/api/auth", authRoutes);

// Tour routes (legacy - uses Listing internally)
app.use("/api/tours", tourRoutes);

// Listing routes (primary)
app.use("/api/listings", listingRoutes);

// Booking routes
app.use("/api/bookings", bookingRoutes);

// Payment routes
app.use("/api/payments", paymentRoutes);

// Request routes
app.use("/api/requests", requestRoutes);

// Admin routes
app.use("/api/admin", adminRoutes);

// User routes
app.use("/api/users", userRoutes);

// Review routes
app.use("/api/reviews", reviewRoutes);

// Video routes
app.use("/api/videos", videoRoutes);

// ✅ Hero Routes
app.use("/api/hero", heroRoutes);

// ✅ Media Routes (direct Cloudinary uploads)
app.use("/api/media", mediaRoutes);

// Provider routes
app.use("/api/provider", providerRoutes);
app.use("/api/providers", providerRoutes);

// Notification routes
app.use("/api/notifications", notificationRoutes);

// Provider tour routes (legacy)
app.use("/api/provider/tours", providerTourRoutes);

// Earning routes
app.use("/api/earnings", earningRoutes);

// AI routes
app.use("/api/ai", aiRoutes);

// Chat routes
app.use("/api/chat", chatRoutes);

// Analytics routes
app.use("/api/analytics", analyticsRoutes);

// Provider profile routes
app.use("/api/provider-profiles", providerProfileRoutes);

// Review routes
app.use('/api/public', publicReviewRoutes);
app.use('/api/provider/reviews', providerReviewRoutes);
app.use('/api/admin/reviews', adminReviewRoutes);
app.use("/api/provider-request", providerRequestRoutes);

app.use("/api/footer", footerRoutes);
app.use('/api/newsletter', newsletterRoutes);

// CMS Routes
app.use("/api/about", aboutRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/faq", faqRoutes);
app.use("/api/help", helpRoutes);
app.use("/api/privacy", privacyRoutes);
app.use("/api/terms", termsRoutes);
app.use("/api/careers", careersRoutes);
app.use("/api/blog", blogRoutes);

// ✅ CURRENCY ROUTES
app.use("/api/currencies", currencyRoutes);

// ✅ PHASE 2 FINANCIAL ROUTES
app.use("/api/admin/ledger", ledgerRoutes);
app.use("/api/wallets", walletRoutes);
app.use("/api/settlements", settlementRoutes);
app.use("/api/rate-locks", rateLockRoutes);
app.use("/api/webhooks", webhookRoutes);
app.use("/api/admin/exchange-rates", exchangeRateRoutes);

// ✅ Legacy webhook route (for backward compatibility)
app.use("/api/webhook", webhookRoutes);

// ✅ CONVERSATION ROUTES (Real-time messaging)
app.use("/api/conversations", conversationRoutes);

/* ================= HOME TEST ================= */

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "AI Tour Backend Running 🚀 (Authentication v2)",
    version: "2.0.0",
    endpoints: {
      auth: "/api/auth",
      tours: "/api/tours",
      bookings: "/api/bookings",
      payments: "/api/payments",
      reviews: "/api/reviews",
      ai: "/api/ai",
      conversations: "/api/conversations"
    }
  });
});

// ✅ 404 handler for unmatched routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.path}`,
    path: req.path
  });
});

/* ================= ERROR HANDLER ================= */

app.use(errorHandler);

/* ================= SOCKET EVENTS ================= */

io.on("connection", (socket) => {
  console.log(`✅ User connected: ${socket.user?.name || socket.id}`);

  if (socket.user) {
    // ✅ Consistent room naming: user:userId
    socket.join(`user:${socket.user._id}`);
    console.log(`📢 User ${socket.user.name} joined personal room`);
  }

  socket.on("refresh-token", async (data) => {
    try {
      const { refreshToken } = data;
      
      if (!refreshToken) {
        socket.emit('token-refresh-error', { message: 'Refresh token required' });
        return;
      }

      const verification = verifyToken(refreshToken, TOKEN_TYPES.REFRESH);
      
      if (!verification.valid) {
        socket.emit('token-refresh-error', { message: 'Invalid refresh token' });
        return;
      }

      const decoded = verification.decoded;
      
      const User = (await import('./models/User.js')).default;
      const user = await User.findById(decoded.sub)
        .select('-password -refreshTokenHash -refreshTokenId')
        .lean();
      
      if (!user || !user.isActive) {
        socket.emit('token-refresh-error', { message: 'User not found or inactive' });
        return;
      }

      // ✅ Using v2 JWT utilities
      const { generateAccessToken } = await import('./utils/jwt.utils.js');
      const newToken = generateAccessToken(user);
      
      socket.token = newToken;
      
      socket.emit('token-refreshed', {
        accessToken: newToken,
        expiresIn: 15 * 60
      });

      console.log(`🔄 Token refreshed for socket user: ${user.email}`);
    } catch (error) {
      console.error('❌ Socket token refresh error:', error.message);
      socket.emit('token-refresh-error', { message: 'Token refresh failed' });
    }
  });

  // ─── Room Events ──────────────────────────────────────────────
  socket.on("join-room", (roomId) => {
    socket.join(roomId);
    console.log(`🏠 User ${socket.user?._id} joined room ${roomId}`);
  });

  socket.on("leave-room", (roomId) => {
    socket.leave(roomId);
    console.log(`🚪 User ${socket.user?._id} left room ${roomId}`);
  });

  // ─── Conversation Room Events ────────────────────────────────
  socket.on("join-conversation", (conversationId) => {
    socket.join(`conversation:${conversationId}`);
    console.log(`📢 User ${socket.user?.name} joined conversation: ${conversationId}`);
  });

  socket.on("leave-conversation", (conversationId) => {
    socket.leave(`conversation:${conversationId}`);
    console.log(`🚪 User ${socket.user?.name} left conversation: ${conversationId}`);
  });

  socket.on("join-user-room", (userId) => {
    socket.join(`user:${userId}`);
    console.log(`📢 User ${socket.user?.name} joined user room: ${userId}`);
  });

  // ─── Typing Indicators ──────────────────────────────────────
  socket.on("typing-start", ({ conversationId }) => {
    socket.to(`conversation:${conversationId}`).emit("user-typing", {
      userId: socket.user._id,
      name: socket.user.name,
      isTyping: true,
    });
  });

  socket.on("typing-stop", ({ conversationId }) => {
    socket.to(`conversation:${conversationId}`).emit("user-typing", {
      userId: socket.user._id,
      name: socket.user.name,
      isTyping: false,
    });
  });

  // ─── Send Message ─────────────────────────────────────────────
  // ✅ FIXED: Uses Conversation instead of ChatRoom
  socket.on("send-message", async (data) => {
    try {
      const { conversationId, message, receiverId } = data;
      
      const Conversation = (await import('./models/Conversation.js')).default;
      const Message = (await import('./models/Message.js')).default;
      
      let conversation;
      
      // ✅ Find existing conversation or create new one
      if (conversationId) {
        conversation = await Conversation.findById(conversationId);
      } else if (receiverId) {
        // Check if conversation already exists between these users
        conversation = await Conversation.findOne({
          'participants.user': { $all: [socket.user._id, receiverId] },
          type: 'traveler_provider',
          isActive: true,
        });
        
        if (!conversation) {
          // Create new conversation
          conversation = new Conversation({
            participants: [
              { user: socket.user._id, role: socket.user.role },
              { user: receiverId, role: 'provider' },
            ],
            type: 'traveler_provider',
            unreadCounts: new Map([
              [socket.user._id.toString(), 0],
              [receiverId.toString(), 0]
            ])
          });
          await conversation.save();
          console.log(`🆕 New conversation created: ${conversation._id}`);
        }
      }

      if (!conversation) {
        socket.emit('error', { message: 'Conversation not found' });
        return;
      }

      // ✅ Verify user is a participant
      const isParticipant = conversation.participants.some(
        p => p.user.toString() === socket.user._id.toString()
      );
      
      if (!isParticipant) {
        socket.emit('error', { message: 'Not authorized' });
        return;
      }

      // ✅ Get receiver (the other participant)
      const receiver = conversation.participants.find(
        p => p.user.toString() !== socket.user._id.toString()
      );

      if (!receiver) {
        socket.emit('error', { message: 'No receiver found' });
        return;
      }

      // ✅ Create message with conversation field
      const newMessage = new Message({
        conversation: conversation._id,
        sender: socket.user._id,
        content: message,
      });

      await newMessage.save();

      // ✅ Update conversation last message
      conversation.lastMessage = newMessage._id;
      conversation.lastMessageAt = new Date();
      
      // ✅ Increment unread count for receiver
      const receiverIdStr = receiver.user.toString();
      const currentUnread = conversation.unreadCounts?.get(receiverIdStr) || 0;
      conversation.unreadCounts.set(receiverIdStr, currentUnread + 1);
      
      await conversation.save();

      // ✅ Populate sender info
      await newMessage.populate('sender', 'name profileImage role');

      // ✅ Emit to conversation room
      io.to(`conversation:${conversation._id}`).emit('new-message', {
        conversationId: conversation._id,
        message: newMessage
      });

      // ✅ Emit to receiver's personal room
      io.to(`user:${receiver.user}`).emit('new-chat-message', {
        conversationId: conversation._id,
        message: newMessage,
        sender: socket.user.name
      });

      // ✅ Emit unread count update to receiver
      const unreadCount = await Message.countDocuments({
        conversation: conversation._id,
        read: false,
      });

      io.to(`user:${receiver.user}`).emit('unread-count-update', {
        count: unreadCount
      });

      console.log(`💬 Message sent in conversation ${conversation._id} by ${socket.user.name}`);

    } catch (error) {
      console.error('❌ Send message error:', error);
      socket.emit('error', { message: error.message });
    }
  });

  // ─── Legacy: Typing (backward compatible) ──────────────────
  socket.on("typing", ({ roomId, isTyping }) => {
    socket.to(roomId).emit("user-typing", {
      userId: socket.user?._id,
      name: socket.user?.name,
      isTyping
    });
  });

  // ─── Mark as Read ─────────────────────────────────────────────
  socket.on("mark-read", async ({ conversationId }) => {
    try {
      const Conversation = (await import('./models/Conversation.js')).default;
      const Message = (await import('./models/Message.js')).default;

      // ✅ Verify conversation exists and user is participant
      const conversation = await Conversation.findOne({
        _id: conversationId,
        'participants.user': socket.user._id,
        isActive: true,
      });

      if (!conversation) {
        socket.emit('error', { message: 'Conversation not found' });
        return;
      }

      // ✅ Mark messages as read
      await Message.updateMany(
        {
          conversation: conversationId,
          sender: { $ne: socket.user._id },
          read: false
        },
        {
          read: true,
          readAt: new Date()
        }
      );

      // ✅ Reset unread count for current user
      conversation.unreadCounts.set(socket.user._id.toString(), 0);
      
      // ✅ Update participant last read
      const participant = conversation.participants.find(
        p => p.user.toString() === socket.user._id.toString()
      );
      if (participant) {
        participant.lastReadAt = new Date();
      }
      
      await conversation.save();

      // ✅ Emit events
      io.to(`conversation:${conversationId}`).emit('messages-read', {
        conversationId,
        userId: socket.user._id
      });

      const unreadCount = await Message.countDocuments({
        conversation: conversationId,
        read: false,
      });

      io.to(`user:${socket.user._id}`).emit('unread-count-update', {
        count: unreadCount
      });

    } catch (error) {
      console.error('❌ Mark read error:', error);
      socket.emit('error', { message: error.message });
    }
  });

  // ─── Get Unread Count ─────────────────────────────────────────
  socket.on("get-unread-count", async () => {
    try {
      const Message = (await import('./models/Message.js')).default;
      const count = await Message.countDocuments({
        read: false,
      });

      socket.emit('unread-count-update', { count });
    } catch (error) {
      console.error('❌ Get unread count error:', error);
    }
  });

  socket.on("disconnect", () => {
    console.log(`❌ User disconnected: ${socket.user?.name || socket.id}`);
  });
});

/* ================= START SERVER ================= */

const PORT = process.env.PORT || 5000;

server.on("error", (err) => {
  console.log("Server Error:", err.message);
});

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// ✅ Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
});

// ✅ Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
});

export { app, server, io };