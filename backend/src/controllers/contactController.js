// backend/src/controllers/contactController.js
// ✅ COMPLETE FIXED - Added submitContact and message management

import ContactContent from '../models/ContactContent.js';
import { ResponseUtils } from '../utils/response.utils.js';

// ✅ In-memory storage for contact messages (replace with database in production)
let contactMessages = [];

/**
 * Submit contact form (public)
 */
export const submitContact = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    // ✅ Validate required fields
    if (!name || !email || !subject || !message) {
      return ResponseUtils.error(res, 'All fields are required', 400);
    }

    // ✅ Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return ResponseUtils.error(res, 'Please enter a valid email address', 400);
    }

    // ✅ Validate message length
    if (message.length < 10) {
      return ResponseUtils.error(res, 'Message must be at least 10 characters', 400);
    }

    // ✅ Save message
    const contactMessage = {
      id: Date.now(),
      name: name.trim(),
      email: email.trim(),
      subject: subject.trim(),
      message: message.trim(),
      createdAt: new Date().toISOString(),
      status: 'pending',
    };

    contactMessages.push(contactMessage);

    console.log('📧 New contact message received:');
    console.log(`   From: ${contactMessage.name} (${contactMessage.email})`);
    console.log(`   Subject: ${contactMessage.subject}`);
    console.log(`   Message: ${contactMessage.message.substring(0, 100)}...`);

    // ✅ TODO: Send email notification (optional)
    // await sendContactEmail(contactMessage);

    return ResponseUtils.success(res, {
      success: true,
      message: 'Message sent successfully! We\'ll get back to you soon.',
      data: contactMessage,
    }, 'Message sent successfully', 201);

  } catch (error) {
    console.error('❌ Contact form error:', error);
    return ResponseUtils.error(res, error.message || 'Failed to send message', 500);
  }
};

/**
 * Get all contact messages (admin only)
 */
export const getContactMessages = async (req, res) => {
  try {
    // Only admins can access this
    if (req.user?.role !== 'admin') {
      return ResponseUtils.error(res, 'Unauthorized', 403);
    }

    return ResponseUtils.success(res, {
      messages: contactMessages,
      total: contactMessages.length,
    });
  } catch (error) {
    console.error('❌ Get contact messages error:', error);
    return ResponseUtils.error(res, error.message || 'Failed to fetch messages', 500);
  }
};

/**
 * Get single contact message (admin only)
 */
export const getContactMessageById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Only admins can access this
    if (req.user?.role !== 'admin') {
      return ResponseUtils.error(res, 'Unauthorized', 403);
    }

    const message = contactMessages.find(m => m.id === parseInt(id));
    
    if (!message) {
      return ResponseUtils.error(res, 'Message not found', 404);
    }

    return ResponseUtils.success(res, {
      message,
    });
  } catch (error) {
    console.error('❌ Get contact message error:', error);
    return ResponseUtils.error(res, error.message || 'Failed to fetch message', 500);
  }
};

/**
 * Get contact content (public)
 */
export const getContactContent = async (req, res) => {
  try {
    const content = await ContactContent.getActiveContent();

    res.json({
      success: true,
      data: content,
    });
  } catch (error) {
    console.error('❌ Get contact content error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get contact content',
    });
  }
};

/**
 * Update contact content (admin only)
 */
export const updateContactContent = async (req, res) => {
  try {
    const {
      hero,
      contactInfo,
      socialLinks,
      map,
      workingHours,
    } = req.body;

    let content = await ContactContent.findOne({ isActive: true });

    if (!content) {
      content = await ContactContent.createDefaultContent();
    }

    // Update hero
    if (hero) {
      if (hero.title !== undefined) content.hero.title = hero.title;
      if (hero.subtitle !== undefined) content.hero.subtitle = hero.subtitle;
      if (hero.image !== undefined) content.hero.image = hero.image;
    }

    // Update contact info
    if (contactInfo !== undefined) content.contactInfo = contactInfo;

    // Update social links
    if (socialLinks) {
      if (socialLinks.facebook !== undefined) content.socialLinks.facebook = socialLinks.facebook;
      if (socialLinks.instagram !== undefined) content.socialLinks.instagram = socialLinks.instagram;
      if (socialLinks.twitter !== undefined) content.socialLinks.twitter = socialLinks.twitter;
      if (socialLinks.linkedin !== undefined) content.socialLinks.linkedin = socialLinks.linkedin;
      if (socialLinks.youtube !== undefined) content.socialLinks.youtube = socialLinks.youtube;
    }

    // Update map
    if (map) {
      if (map.enabled !== undefined) content.map.enabled = map.enabled;
      if (map.embedUrl !== undefined) content.map.embedUrl = map.embedUrl;
      if (map.address !== undefined) content.map.address = map.address;
    }

    // Update working hours
    if (workingHours) {
      if (workingHours.enabled !== undefined) content.workingHours.enabled = workingHours.enabled;
      if (workingHours.weekdays !== undefined) content.workingHours.weekdays = workingHours.weekdays;
      if (workingHours.weekends !== undefined) content.workingHours.weekends = workingHours.weekends;
      if (workingHours.holidays !== undefined) content.workingHours.holidays = workingHours.holidays;
    }

    await content.save();

    res.json({
      success: true,
      message: 'Contact content updated successfully',
      data: content,
    });
  } catch (error) {
    console.error('❌ Update contact content error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update contact content',
    });
  }
};

/**
 * Reset contact content to defaults (admin only)
 */
export const resetContactContent = async (req, res) => {
  try {
    await ContactContent.deleteMany({});
    const content = await ContactContent.createDefaultContent();

    res.json({
      success: true,
      message: 'Contact content reset to defaults',
      data: content,
    });
  } catch (error) {
    console.error('❌ Reset contact content error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to reset contact content',
    });
  }
};