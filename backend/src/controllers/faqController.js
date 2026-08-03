// backend/src/controllers/faqController.js
// ✅ NEW - FAQ Controller

import FaqContent from '../models/FaqContent.js';

/**
 * Get FAQ content (public)
 */
export const getFaqContent = async (req, res) => {
  try {
    const content = await FaqContent.getActiveContent();

    res.json({
      success: true,
      data: content,
    });
  } catch (error) {
    console.error('❌ Get FAQ content error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get FAQ content',
    });
  }
};

/**
 * Update FAQ content (admin only)
 */
export const updateFaqContent = async (req, res) => {
  try {
    const {
      hero,
      categories,
      faqs,
    } = req.body;

    let content = await FaqContent.findOne({ isActive: true });

    if (!content) {
      content = await FaqContent.createDefaultContent();
    }

    // Update hero
    if (hero) {
      if (hero.title !== undefined) content.hero.title = hero.title;
      if (hero.subtitle !== undefined) content.hero.subtitle = hero.subtitle;
      if (hero.image !== undefined) content.hero.image = hero.image;
    }

    // Update categories
    if (categories !== undefined) content.categories = categories;

    // Update FAQs
    if (faqs !== undefined) content.faqs = faqs;

    await content.save();

    res.json({
      success: true,
      message: 'FAQ content updated successfully',
      data: content,
    });
  } catch (error) {
    console.error('❌ Update FAQ content error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update FAQ content',
    });
  }
};

/**
 * Reset FAQ content to defaults (admin only)
 */
export const resetFaqContent = async (req, res) => {
  try {
    await FaqContent.deleteMany({});
    const content = await FaqContent.createDefaultContent();

    res.json({
      success: true,
      message: 'FAQ content reset to defaults',
      data: content,
    });
  } catch (error) {
    console.error('❌ Reset FAQ content error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to reset FAQ content',
    });
  }
};