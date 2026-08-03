// backend/src/controllers/helpController.js
// ✅ NEW - Help Center Controller

import HelpContent from '../models/HelpContent.js';

/**
 * Get help content (public)
 */
export const getHelpContent = async (req, res) => {
  try {
    const content = await HelpContent.getActiveContent();

    res.json({
      success: true,
      data: content,
    });
  } catch (error) {
    console.error('❌ Get help content error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get help content',
    });
  }
};

/**
 * Get article by slug (public)
 */
export const getArticleBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const content = await HelpContent.getActiveContent();

    const article = content.articles.find(a => a.slug === slug);

    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found',
      });
    }

    res.json({
      success: true,
      data: article,
    });
  } catch (error) {
    console.error('❌ Get article error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get article',
    });
  }
};

/**
 * Update help content (admin only)
 */
export const updateHelpContent = async (req, res) => {
  try {
    const {
      hero,
      categories,
      articles,
      featuredArticles,
    } = req.body;

    let content = await HelpContent.findOne({ isActive: true });

    if (!content) {
      content = await HelpContent.createDefaultContent();
    }

    // Update hero
    if (hero) {
      if (hero.title !== undefined) content.hero.title = hero.title;
      if (hero.subtitle !== undefined) content.hero.subtitle = hero.subtitle;
      if (hero.image !== undefined) content.hero.image = hero.image;
    }

    // Update categories
    if (categories !== undefined) content.categories = categories;

    // Update articles
    if (articles !== undefined) content.articles = articles;

    // Update featured articles
    if (featuredArticles !== undefined) content.featuredArticles = featuredArticles;

    await content.save();

    res.json({
      success: true,
      message: 'Help content updated successfully',
      data: content,
    });
  } catch (error) {
    console.error('❌ Update help content error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update help content',
    });
  }
};

/**
 * Reset help content to defaults (admin only)
 */
export const resetHelpContent = async (req, res) => {
  try {
    await HelpContent.deleteMany({});
    const content = await HelpContent.createDefaultContent();

    res.json({
      success: true,
      message: 'Help content reset to defaults',
      data: content,
    });
  } catch (error) {
    console.error('❌ Reset help content error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to reset help content',
    });
  }
};