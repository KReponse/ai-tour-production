// src/utils/notificationService.js
import Notification from '../models/Notification.js';

// Get io instance
let io = null;

export const setIo = (ioInstance) => {
  io = ioInstance;
};

// Create notification
export const createNotification = async (data) => {
  try {
    const notification = new Notification({
      recipient: data.recipient,
      sender: data.sender || null,
      type: data.type,
      title: data.title,
      message: data.message,
      data: data.data || {},
      link: data.link || null,
      priority: data.priority || 'medium'
    });

    await notification.save();

    // Populate sender info
    if (data.sender) {
      await notification.populate('sender', 'name profileImage');
    }

    // Send real-time notification via socket
    if (io) {
      io.to(`user-${data.recipient}`).emit('newNotification', {
        notification: notification,
        title: data.title,
        message: data.message,
        type: data.type,
        data: data.data || {}
      });
      
      // Update unread count
      const unreadCount = await Notification.countDocuments({
        recipient: data.recipient,
        read: false
      });
      
      io.to(`user-${data.recipient}`).emit('unread-notifications', {
        count: unreadCount
      });
    }

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

// Notification templates
export const notificationTemplates = {
  bookingCreated: (booking) => ({
    type: 'booking_created',
    title: 'New Booking Request',
    message: `${booking.user?.name || 'A traveler'} has requested to book ${booking.tour?.title || 'a tour'}`,
    data: { bookingId: booking._id, tourId: booking.tour?._id }
  }),
  
  bookingConfirmed: (booking) => ({
    type: 'booking_confirmed',
    title: 'Booking Confirmed ✅',
    message: `Your booking for ${booking.tour?.title || 'tour'} has been confirmed!`,
    data: { bookingId: booking._id, tourId: booking.tour?._id }
  }),
  
  bookingCancelled: (booking) => ({
    type: 'booking_cancelled',
    title: 'Booking Cancelled ❌',
    message: `Your booking for ${booking.tour?.title || 'tour'} has been cancelled.`,
    data: { bookingId: booking._id, tourId: booking.tour?._id }
  }),
  
  bookingRejected: (booking) => ({
    type: 'booking_rejected',
    title: 'Booking Rejected ❌',
    message: `Your booking for ${booking.tour?.title || 'tour'} has been rejected.`,
    data: { bookingId: booking._id, tourId: booking.tour?._id }
  }),
  
  paymentSuccess: (booking) => ({
    type: 'payment_success',
    title: 'Payment Successful 💳',
    message: `Payment of $${booking.totalPrice} for ${booking.tour?.title || 'tour'} was successful!`,
    data: { bookingId: booking._id, tourId: booking.tour?._id }
  }),
  
  paymentFailed: (booking) => ({
    type: 'payment_failed',
    title: 'Payment Failed ❌',
    message: `Payment of $${booking.totalPrice} for ${booking.tour?.title || 'tour'} failed.`,
    data: { bookingId: booking._id, tourId: booking.tour?._id }
  }),
  
  newReview: (review) => ({
    type: 'new_review',
    title: 'New Review ⭐',
    message: `${review.user?.name || 'Someone'} left a ${review.rating}⭐ review on your tour`,
    data: { reviewId: review._id, tourId: review.tour }
  }),
  
  newMessage: (message) => ({
    type: 'new_message',
    title: 'New Message 💬',
    message: `You have a new message from ${message.sender?.name || 'someone'}`,
    data: { messageId: message._id, roomId: message.room }
  }),
  
  tourApproved: (tour) => ({
    type: 'tour_approved',
    title: 'Tour Approved ✅',
    message: `Your tour "${tour.title}" has been approved and is now live!`,
    data: { tourId: tour._id }
  }),
  
  tourRejected: (tour) => ({
    type: 'tour_rejected',
    title: 'Tour Rejected ❌',
    message: `Your tour "${tour.title}" was not approved. Please check your email for details.`,
    data: { tourId: tour._id }
  }),
  
  tourCreated: (tour) => ({
    type: 'tour_created',
    title: 'Tour Created',
    message: `Your tour "${tour.title}" has been created and is pending approval.`,
    data: { tourId: tour._id }
  }),
  
  earningCredited: (earning) => ({
    type: 'earning_credited',
    title: 'Earning Credited 💰',
    message: `$${earning.amount} has been credited to your account.`,
    data: { earningId: earning._id }
  }),
  
  withdrawalRequested: (withdrawal) => ({
    type: 'withdrawal_requested',
    title: 'Withdrawal Requested 💸',
    message: `Withdrawal of $${withdrawal.amount} has been requested.`,
    data: { withdrawalId: withdrawal._id }
  }),
  
  withdrawalCompleted: (withdrawal) => ({
    type: 'withdrawal_completed',
    title: 'Withdrawal Completed ✅',
    message: `Withdrawal of $${withdrawal.amount} has been completed.`,
    data: { withdrawalId: withdrawal._id }
  }),

  systemAlert: (alert) => ({
    type: 'system_alert',
    title: alert.title || 'System Alert',
    message: alert.message || 'System notification',
    data: alert.data || {}
  })
};

// Get unread count for a user
export const getUnreadCount = async (userId) => {
  try {
    const count = await Notification.countDocuments({
      recipient: userId,
      read: false
    });
    return count;
  } catch (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }
};

// Mark all as read for a user
export const markAllAsRead = async (userId) => {
  try {
    await Notification.updateMany(
      {
        recipient: userId,
        read: false
      },
      {
        read: true,
        readAt: new Date()
      }
    );
    
    if (io) {
      io.to(`user-${userId}`).emit('unread-notifications', {
        count: 0
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error marking all as read:', error);
    return false;
  }
};