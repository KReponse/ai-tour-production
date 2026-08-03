// backend/src/controllers/careersController.js
// ✅ NEW - Careers Controller

import CareersContent from '../models/CareersContent.js';

/**
 * Get careers content (public)
 */
export const getCareersContent = async (req, res) => {
  try {
    const content = await CareersContent.getActiveContent();

    res.json({
      success: true,
      data: content,
    });
  } catch (error) {
    console.error('❌ Get careers content error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get careers content',
    });
  }
};

/**
 * Update careers content (admin only)
 */
export const updateCareersContent = async (req, res) => {
  try {
    const {
      hero,
      statistics,
      benefits,
      jobs,
      cta,
    } = req.body;

    let content = await CareersContent.findOne({ isActive: true });

    if (!content) {
      content = await CareersContent.createDefaultContent();
    }

    // Update hero
    if (hero) {
      if (hero.title !== undefined) content.hero.title = hero.title;
      if (hero.subtitle !== undefined) content.hero.subtitle = hero.subtitle;
      if (hero.image !== undefined) content.hero.image = hero.image;
    }

    // Update statistics
    if (statistics !== undefined) content.statistics = statistics;

    // Update benefits
    if (benefits !== undefined) content.benefits = benefits;

    // Update jobs
    if (jobs !== undefined) content.jobs = jobs;

    // Update cta
    if (cta) {
      if (cta.title !== undefined) content.cta.title = cta.title;
      if (cta.subtitle !== undefined) content.cta.subtitle = cta.subtitle;
      if (cta.buttonText !== undefined) content.cta.buttonText = cta.buttonText;
      if (cta.buttonLink !== undefined) content.cta.buttonLink = cta.buttonLink;
      if (cta.active !== undefined) content.cta.active = cta.active;
    }

    await content.save();

    res.json({
      success: true,
      message: 'Careers content updated successfully',
      data: content,
    });
  } catch (error) {
    console.error('❌ Update careers content error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update careers content',
    });
  }
};

/**
 * Reset careers content to defaults (admin only)
 */
export const resetCareersContent = async (req, res) => {
  try {
    await CareersContent.deleteMany({});
    const content = await CareersContent.createDefaultContent();

    res.json({
      success: true,
      message: 'Careers content reset to defaults',
      data: content,
    });
  } catch (error) {
    console.error('❌ Reset careers content error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to reset careers content',
    });
  }
};