// src/controllers/notificationController.js
import Notification from '../models/Notification.js';

// Get user notifications
export const getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, read } = req.query;
    
    const filter = { recipient: req.user.id };
    if (read !== undefined) {
      filter.read = read === 'true';
    }

    const notifications = await Notification.find(filter)
      .populate('sender', 'name profileImage')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Notification.countDocuments(filter);
    const unreadCount = await Notification.countDocuments({
      recipient: req.user.id,
      read: false
    });

    res.json({
      success: true,
      notifications,
      total,
      unreadCount,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get unread count
export const getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      recipient: req.user.id,
      read: false
    });

    res.json({
      success: true,
      unreadCount: count
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Mark notification as read
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`📤 Marking notification as read: ${id}`);
    console.log(`👤 User ID: ${req.user.id}`);

    // ✅ Check if user is authenticated
    if (!req.user || !req.user.id) {
      console.error('❌ User not authenticated');
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const notification = await Notification.findOne({
      _id: id,
      recipient: req.user.id
    });

    if (!notification) {
      console.error(`❌ Notification not found: ${id} for user ${req.user.id}`);
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    console.log(`✅ Notification found: ${notification._id}`);

    notification.read = true;
    notification.readAt = new Date();
    await notification.save();

    // Update unread count
    const unreadCount = await Notification.countDocuments({
      recipient: req.user.id,
      read: false
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`user-${req.user.id}`).emit('unread-notifications', {
        count: unreadCount
      });
    }

    res.json({
      success: true,
      notification,
      unreadCount
    });
  } catch (error) {
    console.error('❌ Mark as read error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Mark all as read
export const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      {
        recipient: req.user.id,
        read: false
      },
      {
        read: true,
        readAt: new Date()
      }
    );

    const unreadCount = await Notification.countDocuments({
      recipient: req.user.id,
      read: false
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`user-${req.user.id}`).emit('unread-notifications', {
        count: 0
      });
    }

    res.json({
      success: true,
      message: 'All notifications marked as read',
      unreadCount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Delete notification
export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findOneAndDelete({
      _id: id,
      recipient: req.user.id
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.json({
      success: true,
      message: 'Notification deleted'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Delete all read notifications
export const deleteAllRead = async (req, res) => {
  try {
    await Notification.deleteMany({
      recipient: req.user.id,
      read: true
    });

    res.json({
      success: true,
      message: 'All read notifications deleted'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};