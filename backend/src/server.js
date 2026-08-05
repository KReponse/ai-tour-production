// backend/src/server.js
// ✅ MIGRATED TO AUTHENTICATION v2
// ✅ ADDED Currency Routes
// ✅ ADDED Ledger Routes
// ✅ ADDED Wallet Routes
// ✅ ADDED Settlement Routes
// ✅ ADDED Rate Lock Routes
// ✅ ADDED Webhook Routes
// ✅ ADDED Hero Routes
// ✅ ADDED Media Routes

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
    "http://localhost:3000"
  ],
  credentials: true
}));

// ✅ JSON with increased limit
app.use(express.json({ limit: '550mb' }));
app.use(express.urlencoded({ extended: true, limit: '550mb' }));

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

/* ================= HOME TEST ================= */

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "AI Tour Backend Running 🚀 (Authentication v2)"
  });
});

/* ================= ERROR HANDLER ================= */

app.use(errorHandler);

/* ================= SOCKET EVENTS ================= */

io.on("connection", (socket) => {
  console.log(`✅ User connected: ${socket.user?.name || socket.id}`);

  if (socket.user) {
    socket.join(`user-${socket.user._id}`);
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

  socket.on("join-room", (roomId) => {
    socket.join(roomId);
    console.log(`🏠 User ${socket.user?._id} joined room ${roomId}`);
  });

  socket.on("leave-room", (roomId) => {
    socket.leave(roomId);
    console.log(`🚪 User ${socket.user?._id} left room ${roomId}`);
  });

  socket.on("send-message", async (data) => {
    try {
      const { roomId, message, receiverId } = data;
      
      const Message = (await import('./models/Message.js')).default;
      const ChatRoom = (await import('./models/ChatRoom.js')).default;
      
      let room = await ChatRoom.findById(roomId);
      
      if (!room && receiverId) {
        room = new ChatRoom({
          participants: [socket.user._id, receiverId],
          unreadCount: new Map([
            [socket.user._id.toString(), 0],
            [receiverId.toString(), 0]
          ])
        });
        await room.save();
      }

      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      if (!room.participants.includes(socket.user._id)) {
        socket.emit('error', { message: 'Not authorized' });
        return;
      }

      const receiver = room.participants.find(
        p => p.toString() !== socket.user._id.toString()
      );

      const newMessage = new Message({
        room: room._id,
        sender: socket.user._id,
        receiver: receiver,
        message: message
      });

      await newMessage.save();

      room.lastMessage = newMessage._id;
      room.lastMessageAt = new Date();
      
      const receiverIdStr = receiver.toString();
      const currentUnread = room.unreadCount.get(receiverIdStr) || 0;
      room.unreadCount.set(receiverIdStr, currentUnread + 1);
      await room.save();

      await newMessage.populate('sender', 'name profileImage role');

      io.to(room._id.toString()).emit('new-message', {
        roomId: room._id,
        message: newMessage
      });

      io.to(`user-${receiver}`).emit('new-chat-message', {
        roomId: room._id,
        message: newMessage,
        sender: socket.user.name
      });

      console.log(`💬 Message sent in room ${room._id} by ${socket.user.name}`);

    } catch (error) {
      console.error('Send message error:', error);
      socket.emit('error', { message: error.message });
    }
  });

  socket.on("typing", ({ roomId, isTyping }) => {
    socket.to(roomId).emit("user-typing", {
      userId: socket.user?._id,
      name: socket.user?.name,
      isTyping
    });
  });

  socket.on("mark-read", async ({ roomId }) => {
    try {
      const Message = (await import('./models/Message.js')).default;
      const ChatRoom = (await import('./models/ChatRoom.js')).default;

      await Message.updateMany(
        {
          room: roomId,
          receiver: socket.user._id,
          read: false
        },
        {
          read: true,
          readAt: new Date()
        }
      );

      const room = await ChatRoom.findById(roomId);
      if (room) {
        room.unreadCount.set(socket.user._id.toString(), 0);
        await room.save();
      }

      io.to(roomId).emit('messages-read', {
        userId: socket.user._id,
        roomId
      });

      const unreadCount = await Message.countDocuments({
        receiver: socket.user._id,
        read: false
      });

      io.to(`user-${socket.user._id}`).emit('unread-count-update', {
        count: unreadCount
      });

    } catch (error) {
      console.error('Mark read error:', error);
    }
  });

  socket.on("get-unread-count", async () => {
    try {
      const Message = (await import('./models/Message.js')).default;
      const count = await Message.countDocuments({
        receiver: socket.user._id,
        read: false
      });

      socket.emit('unread-count-update', { count });
    } catch (error) {
      console.error('Get unread count error:', error);
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