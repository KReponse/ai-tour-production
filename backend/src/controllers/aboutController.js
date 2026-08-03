// backend/src/controllers/aboutController.js
// ✅ NEW - About Controller

import AboutContent from '../models/AboutContent.js';

/**
 * Get about content (public)
 */
export const getAboutContent = async (req, res) => {
  try {
    const content = await AboutContent.getActiveContent();

    res.json({
      success: true,
      data: content,
    });
  } catch (error) {
    console.error('❌ Get about content error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get about content',
    });
  }
};

/**
 * Update about content (admin only)
 */
export const updateAboutContent = async (req, res) => {
  try {
    const {
      hero,
      story,
      mission,
      vision,
      statistics,
      values,
      team,
      cta,
    } = req.body;

    let content = await AboutContent.findOne({ isActive: true });

    if (!content) {
      content = await AboutContent.createDefaultContent();
    }

    // Update hero
    if (hero) {
      if (hero.title !== undefined) content.hero.title = hero.title;
      if (hero.subtitle !== undefined) content.hero.subtitle = hero.subtitle;
      if (hero.description !== undefined) content.hero.description = hero.description;
      if (hero.image !== undefined) content.hero.image = hero.image;
    }

    // Update story
    if (story) {
      if (story.title !== undefined) content.story.title = story.title;
      if (story.content !== undefined) content.story.content = story.content;
      if (story.image !== undefined) content.story.image = story.image;
    }

    // Update mission
    if (mission) {
      if (mission.title !== undefined) content.mission.title = mission.title;
      if (mission.content !== undefined) content.mission.content = mission.content;
    }

    // Update vision
    if (vision) {
      if (vision.title !== undefined) content.vision.title = vision.title;
      if (vision.content !== undefined) content.vision.content = vision.content;
    }

    // Update statistics
    if (statistics !== undefined) content.statistics = statistics;

    // Update values
    if (values !== undefined) content.values = values;

    // Update team
    if (team !== undefined) content.team = team;

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
      message: 'About content updated successfully',
      data: content,
    });
  } catch (error) {
    console.error('❌ Update about content error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update about content',
    });
  }
};

/**
 * Reset about content to defaults (admin only)
 */
export const resetAboutContent = async (req, res) => {
  try {
    await AboutContent.deleteMany({});
    const content = await AboutContent.createDefaultContent();

    res.json({
      success: true,
      message: 'About content reset to defaults',
      data: content,
    });
  } catch (error) {
    console.error('❌ Reset about content error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to reset about content',
    });
  }
};