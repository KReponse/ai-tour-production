// src/utils/createNotification.js
import Notification from '../models/Notification.js';

const createNotification = async (recipient, title, message, type = 'system_alert', data = {}) => {
  try {
    const notification = new Notification({
      recipient,
      title,
      message,
      type,
      data,
      read: false
    });

    await notification.save();

    // Get io instance from app
    const io = global.io;
    if (io) {
      io.to(recipient.toString()).emit('newNotification', {
        title,
        message,
        type,
        data
      });
    }

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};

export default createNotification;