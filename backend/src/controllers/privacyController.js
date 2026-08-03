// backend/src/controllers/privacyController.js
// ✅ NEW - Privacy Policy Controller

import PrivacyContent from '../models/PrivacyContent.js';

/**
 * Get privacy content (public)
 */
export const getPrivacyContent = async (req, res) => {
  try {
    const content = await PrivacyContent.getActiveContent();

    res.json({
      success: true,
      data: content,
    });
  } catch (error) {
    console.error('❌ Get privacy content error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get privacy content',
    });
  }
};

/**
 * Update privacy content (admin only)
 */
export const updatePrivacyContent = async (req, res) => {
  try {
    const {
      hero,
      sections,
      lastUpdated,
    } = req.body;

    let content = await PrivacyContent.findOne({ isActive: true });

    if (!content) {
      content = await PrivacyContent.createDefaultContent();
    }

    // Update hero
    if (hero) {
      if (hero.title !== undefined) content.hero.title = hero.title;
      if (hero.subtitle !== undefined) content.hero.subtitle = hero.subtitle;
      if (hero.image !== undefined) content.hero.image = hero.image;
    }

    // Update sections
    if (sections !== undefined) content.sections = sections;

    // Update last updated
    if (lastUpdated !== undefined) content.lastUpdated = lastUpdated;

    await content.save();

    res.json({
      success: true,
      message: 'Privacy content updated successfully',
      data: content,
    });
  } catch (error) {
    console.error('❌ Update privacy content error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update privacy content',
    });
  }
};

/**
 * Reset privacy content to defaults (admin only)
 */
export const resetPrivacyContent = async (req, res) => {
  try {
    await PrivacyContent.deleteMany({});
    const content = await PrivacyContent.createDefaultContent();

    res.json({
      success: true,
      message: 'Privacy content reset to defaults',
      data: content,
    });
  } catch (error) {
    console.error('❌ Reset privacy content error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to reset privacy content',
    });
  }
};