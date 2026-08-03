// backend/src/controllers/termsController.js
// ✅ NEW - Terms & Conditions Controller

import TermsContent from '../models/TermsContent.js';

/**
 * Get terms content (public)
 */
export const getTermsContent = async (req, res) => {
  try {
    const content = await TermsContent.getActiveContent();

    res.json({
      success: true,
      data: content,
    });
  } catch (error) {
    console.error('❌ Get terms content error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get terms content',
    });
  }
};

/**
 * Update terms content (admin only)
 */
export const updateTermsContent = async (req, res) => {
  try {
    const {
      hero,
      sections,
      lastUpdated,
    } = req.body;

    let content = await TermsContent.findOne({ isActive: true });

    if (!content) {
      content = await TermsContent.createDefaultContent();
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
      message: 'Terms content updated successfully',
      data: content,
    });
  } catch (error) {
    console.error('❌ Update terms content error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update terms content',
    });
  }
};

/**
 * Reset terms content to defaults (admin only)
 */
export const resetTermsContent = async (req, res) => {
  try {
    await TermsContent.deleteMany({});
    const content = await TermsContent.createDefaultContent();

    res.json({
      success: true,
      message: 'Terms content reset to defaults',
      data: content,
    });
  } catch (error) {
    console.error('❌ Reset terms content error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to reset terms content',
    });
  }
};