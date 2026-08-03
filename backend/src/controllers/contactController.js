// backend/src/controllers/contactController.js
// ✅ NEW - Contact Controller

import ContactContent from '../models/ContactContent.js';

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