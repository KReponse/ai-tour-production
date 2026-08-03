// backend/src/controllers/footerController.js
// ✅ NEW - Footer Controller

import FooterContent from "../models/FooterContent.js";

/**
 * Get footer content (public)
 */
export const getFooterContent = async (req, res) => {
  try {
    const content = await FooterContent.getActiveContent();
    
    res.json({
      success: true,
      data: content,
    });
  } catch (error) {
    console.error("❌ Get footer content error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get footer content",
    });
  }
};

/**
 * Update footer content (admin only)
 */
export const updateFooterContent = async (req, res) => {
  try {
    const {
      brandName,
      brandTagline,
      description,
      logo,
      contact,
      socialLinks,
      sections,
      newsletter,
      copyrightText,
    } = req.body;

    let content = await FooterContent.findOne({ isActive: true });

    if (!content) {
      content = await FooterContent.createDefaultContent();
    }

    // Update fields
    if (brandName !== undefined) content.brandName = brandName;
    if (brandTagline !== undefined) content.brandTagline = brandTagline;
    if (description !== undefined) content.description = description;
    if (logo !== undefined) content.logo = logo;
    if (contact) {
      if (contact.email !== undefined) content.contact.email = contact.email;
      if (contact.phone !== undefined) content.contact.phone = contact.phone;
      if (contact.address !== undefined) content.contact.address = contact.address;
    }
    if (socialLinks) {
      if (socialLinks.facebook !== undefined) content.socialLinks.facebook = socialLinks.facebook;
      if (socialLinks.instagram !== undefined) content.socialLinks.instagram = socialLinks.instagram;
      if (socialLinks.twitter !== undefined) content.socialLinks.twitter = socialLinks.twitter;
      if (socialLinks.linkedin !== undefined) content.socialLinks.linkedin = socialLinks.linkedin;
      if (socialLinks.youtube !== undefined) content.socialLinks.youtube = socialLinks.youtube;
      if (socialLinks.tiktok !== undefined) content.socialLinks.tiktok = socialLinks.tiktok;
    }
    if (sections) content.sections = sections;
    if (newsletter) {
      if (newsletter.enabled !== undefined) content.newsletter.enabled = newsletter.enabled;
      if (newsletter.title !== undefined) content.newsletter.title = newsletter.title;
      if (newsletter.description !== undefined) content.newsletter.description = newsletter.description;
      if (newsletter.placeholder !== undefined) content.newsletter.placeholder = newsletter.placeholder;
      if (newsletter.buttonText !== undefined) content.newsletter.buttonText = newsletter.buttonText;
    }
    if (copyrightText !== undefined) content.copyrightText = copyrightText;

    await content.save();

    res.json({
      success: true,
      message: "Footer content updated successfully",
      data: content,
    });
  } catch (error) {
    console.error("❌ Update footer content error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update footer content",
    });
  }
};

/**
 * Reset footer content to defaults (admin only)
 */
export const resetFooterContent = async (req, res) => {
  try {
    // Delete existing content
    await FooterContent.deleteMany({});
    
    // Create default content
    const content = await FooterContent.createDefaultContent();

    res.json({
      success: true,
      message: "Footer content reset to defaults",
      data: content,
    });
  } catch (error) {
    console.error("❌ Reset footer content error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to reset footer content",
    });
  }
};