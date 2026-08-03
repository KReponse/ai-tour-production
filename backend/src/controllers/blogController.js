// backend/src/controllers/blogController.js
// ✅ NEW - Blog Controller

import BlogContent from '../models/BlogContent.js';

/**
 * Get blog content (public)
 */
export const getBlogContent = async (req, res) => {
  try {
    const content = await BlogContent.getActiveContent();

    res.json({
      success: true,
      data: content,
    });
  } catch (error) {
    console.error('❌ Get blog content error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get blog content',
    });
  }
};

/**
 * Get published posts (public)
 */
export const getPublishedPosts = async (req, res) => {
  try {
    const posts = await BlogContent.getPublishedPosts();

    res.json({
      success: true,
      data: posts,
    });
  } catch (error) {
    console.error('❌ Get published posts error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get published posts',
    });
  }
};

/**
 * Get post by slug (public)
 */
export const getPostBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const post = await BlogContent.getPostBySlug(slug);

    if (!post || !post.published) {
      return res.status(404).json({
        success: false,
        message: 'Post not found',
      });
    }

    res.json({
      success: true,
      data: post,
    });
  } catch (error) {
    console.error('❌ Get post error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get post',
    });
  }
};

/**
 * Update blog content (admin only)
 */
export const updateBlogContent = async (req, res) => {
  try {
    const {
      hero,
      categories,
      posts,
      featuredPosts,
    } = req.body;

    let content = await BlogContent.findOne({ isActive: true });

    if (!content) {
      content = await BlogContent.createDefaultContent();
    }

    // Update hero
    if (hero) {
      if (hero.title !== undefined) content.hero.title = hero.title;
      if (hero.subtitle !== undefined) content.hero.subtitle = hero.subtitle;
      if (hero.image !== undefined) content.hero.image = hero.image;
    }

    // Update categories
    if (categories !== undefined) content.categories = categories;

    // Update posts
    if (posts !== undefined) content.posts = posts;

    // Update featured posts
    if (featuredPosts !== undefined) content.featuredPosts = featuredPosts;

    await content.save();

    res.json({
      success: true,
      message: 'Blog content updated successfully',
      data: content,
    });
  } catch (error) {
    console.error('❌ Update blog content error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update blog content',
    });
  }
};

/**
 * Reset blog content to defaults (admin only)
 */
export const resetBlogContent = async (req, res) => {
  try {
    await BlogContent.deleteMany({});
    const content = await BlogContent.createDefaultContent();

    res.json({
      success: true,
      message: 'Blog content reset to defaults',
      data: content,
    });
  } catch (error) {
    console.error('❌ Reset blog content error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to reset blog content',
    });
  }
};