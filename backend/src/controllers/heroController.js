// backend/src/controllers/heroController.js
// ✅ COMPLETE FIXED - Uses Media Service for Cloudinary uploads
// ✅ All hero videos now stored as Cloudinary URLs (secure_url)
// ✅ Removed direct upload/signature logic (backend-only)

import HeroVideo from "../models/HeroVideo.js";
import Listing from "../models/Listing.js";
import { getMediaService } from "../services/media/index.js";

// ===============================
// ✅ HELPER: Upload video to Cloudinary
// ===============================
const uploadVideo = async (file, options = {}) => {
  if (!file) return null;
  try {
    const mediaService = getMediaService();
    const result = await mediaService.save(file, { 
      type: 'video', 
      category: 'hero-videos',
      ...options 
    });
    return result;
  } catch (error) {
    console.error('❌ Failed to upload hero video:', error.message);
    return null;
  }
};

// ===============================
// ✅ HELPER: Delete file from Cloudinary
// ===============================
const deleteFile = async (fileUrl) => {
  if (!fileUrl) return;
  try {
    const mediaService = getMediaService();
    // Check if it's a Cloudinary URL or local path
    if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
      await mediaService.delete(fileUrl);
      console.log(`🗑️ Deleted Cloudinary file: ${fileUrl}`);
    } else {
      // Legacy local file - try to delete from disk
      const { deleteLocalFile } = await import('../utils/fileUtils.js');
      await deleteLocalFile(fileUrl);
    }
  } catch (error) {
    console.error(`❌ Failed to delete file ${fileUrl}:`, error.message);
  }
};

// ============================================================
// ✅ GET ACTIVE HERO VIDEOS (Public - Homepage)
// ============================================================
export const getActiveHeroVideos = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const videos = await HeroVideo.getActiveHeroVideos(parseInt(limit));

    const formatted = videos.map((video) => ({
      _id: video._id,
      title: video.title || "",
      description: video.description || "",
      videoUrl: video.videoUrl,
      thumbnail: video.thumbnail || null,
      duration: video.duration || 0,
      priority: video.priority || 0,
      listingId: video.listingId?._id || video.listingId || null,
      listingTitle: video.listingId?.title || null,
      listingSlug: video.listingId?.slug || null,
    }));

    res.json({
      success: true,
      data: formatted,
      count: formatted.length,
    });
  } catch (error) {
    console.error("❌ Get active hero videos error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================
// ✅ GET ALL HERO VIDEOS (Admin)
// ============================================================
export const getAllHeroVideos = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = "" } = req.query;

    const result = await HeroVideo.getAdminList({
      page: parseInt(page),
      limit: parseInt(limit),
      search,
    });

    res.json({
      success: true,
      data: result.items,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    console.error("❌ Get all hero videos error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================
// ✅ GET SINGLE HERO VIDEO
// ============================================================
export const getHeroVideoById = async (req, res) => {
  try {
    const { id } = req.params;

    const video = await HeroVideo.findById(id)
      .populate("listingId", "title slug price location coverImage")
      .populate("createdBy", "name email")
      .lean();

    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Hero video not found",
      });
    }

    res.json({
      success: true,
      data: video,
    });
  } catch (error) {
    console.error("❌ Get hero video by id error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================
// ✅ CREATE HERO VIDEO - FIXED with Cloudinary
// ============================================================
export const createHeroVideo = async (req, res) => {
  try {
    const { title, description, listingId, priority = 0, isActive = true } = req.body;

    // If listingId is provided, validate it exists
    if (listingId) {
      const listing = await Listing.findById(listingId);
      if (!listing) {
        return res.status(404).json({
          success: false,
          message: "Listing not found",
        });
      }
    }

    // Check if video file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Video file is required",
      });
    }

    // ✅ Upload video to Cloudinary using Media Service
    const uploadResult = await uploadVideo(req.file, {
      category: 'hero-videos',
      transformation: [
        { quality: 'auto' },
        { format: 'mp4' },
      ],
    });

    if (!uploadResult) {
      return res.status(500).json({
        success: false,
        message: "Failed to upload video to Cloudinary",
      });
    }

    // ✅ Generate thumbnail from Cloudinary URL
    let thumbnail = null;
    if (uploadResult.cloudinary?.publicId) {
      try {
        const mediaService = getMediaService();
        thumbnail = mediaService.getVideoThumbnail(uploadResult.cloudinary.publicId, {
          time: 1,
          width: 1280,
          height: 720,
        });
      } catch (error) {
        console.warn("⚠️ Thumbnail generation failed:", error.message);
      }
    }

    const heroVideo = new HeroVideo({
      title: title || "",
      description: description || "",
      videoUrl: uploadResult.url, // Cloudinary secure_url
      thumbnail: thumbnail || null,
      duration: Math.round(uploadResult.cloudinary?.duration || 0),
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      priority: parseInt(priority) || 0,
      isActive: isActive !== false,
      listingId: listingId || null,
      createdBy: req.user._id,
    });

    await heroVideo.save();

    res.status(201).json({
      success: true,
      message: "Hero video created successfully",
      data: heroVideo,
    });
  } catch (error) {
    console.error("❌ Create hero video error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================
// ✅ UPDATE HERO VIDEO
// ============================================================
export const updateHeroVideo = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, listingId, priority, isActive } = req.body;

    const heroVideo = await HeroVideo.findById(id);
    if (!heroVideo) {
      return res.status(404).json({
        success: false,
        message: "Hero video not found",
      });
    }

    // Update fields (all optional)
    if (title !== undefined) heroVideo.title = title || "";
    if (description !== undefined) heroVideo.description = description || "";
    if (listingId !== undefined) {
      if (listingId) {
        const listing = await Listing.findById(listingId);
        if (!listing) {
          return res.status(404).json({
            success: false,
            message: "Listing not found",
          });
        }
        heroVideo.listingId = listingId;
      } else {
        heroVideo.listingId = null;
      }
    }
    if (priority !== undefined) heroVideo.priority = parseInt(priority) || 0;
    if (isActive !== undefined) heroVideo.isActive = isActive;

    heroVideo.updatedBy = req.user._id;
    await heroVideo.save();

    res.json({
      success: true,
      message: "Hero video updated successfully",
      data: heroVideo,
    });
  } catch (error) {
    console.error("❌ Update hero video error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================
// ✅ UPLOAD/REPLACE HERO VIDEO - FIXED with Cloudinary
// ============================================================
export const uploadHeroVideo = async (req, res) => {
  try {
    const { id } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: "No video file uploaded",
      });
    }

    const heroVideo = await HeroVideo.findById(id);
    if (!heroVideo) {
      if (req.file && req.file.path) {
        // Clean up local file if it was saved
        const fs = await import('fs');
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      }
      return res.status(404).json({
        success: false,
        message: "Hero video not found",
      });
    }

    // ✅ Upload video to Cloudinary using Media Service
    const uploadResult = await uploadVideo(file, {
      category: 'hero-videos',
      transformation: [
        { quality: 'auto' },
        { format: 'mp4' },
      ],
    });

    if (!uploadResult) {
      return res.status(500).json({
        success: false,
        message: "Failed to upload video to Cloudinary",
      });
    }

    // ✅ Generate thumbnail from Cloudinary URL
    let thumbnail = null;
    if (uploadResult.cloudinary?.publicId) {
      try {
        const mediaService = getMediaService();
        thumbnail = mediaService.getVideoThumbnail(uploadResult.cloudinary.publicId, {
          time: 1,
          width: 1280,
          height: 720,
        });
      } catch (error) {
        console.warn("⚠️ Thumbnail generation failed:", error.message);
      }
    }

    // ✅ Delete old video from Cloudinary
    if (heroVideo.videoUrl) {
      await deleteFile(heroVideo.videoUrl);
    }
    if (heroVideo.thumbnail && heroVideo.thumbnail !== thumbnail) {
      await deleteFile(heroVideo.thumbnail);
    }

    // ✅ Update with new video
    heroVideo.videoUrl = uploadResult.url; // Cloudinary secure_url
    heroVideo.thumbnail = thumbnail || null;
    heroVideo.duration = Math.round(uploadResult.cloudinary?.duration || 0);
    heroVideo.mimeType = file.mimetype;
    heroVideo.fileSize = file.size;
    heroVideo.updatedBy = req.user._id;

    await heroVideo.save();

    res.json({
      success: true,
      message: "Hero video updated successfully",
      data: heroVideo,
    });
  } catch (error) {
    console.error("❌ Upload hero video error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================
// ✅ TOGGLE HERO VIDEO ACTIVE STATUS
// ============================================================
export const toggleHeroVideo = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const heroVideo = await HeroVideo.findById(id);
    if (!heroVideo) {
      return res.status(404).json({
        success: false,
        message: "Hero video not found",
      });
    }

    heroVideo.isActive = isActive !== undefined ? isActive : !heroVideo.isActive;
    heroVideo.updatedBy = req.user._id;
    await heroVideo.save();

    res.json({
      success: true,
      message: `Hero video ${heroVideo.isActive ? "activated" : "deactivated"}`,
      data: heroVideo,
    });
  } catch (error) {
    console.error("❌ Toggle hero video error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================
// ✅ DELETE HERO VIDEO
// ============================================================
export const deleteHeroVideo = async (req, res) => {
  try {
    const { id } = req.params;

    const heroVideo = await HeroVideo.findById(id);
    if (!heroVideo) {
      return res.status(404).json({
        success: false,
        message: "Hero video not found",
      });
    }

    // ✅ Delete video from Cloudinary
    if (heroVideo.videoUrl) {
      await deleteFile(heroVideo.videoUrl);
    }

    // ✅ Delete thumbnail from Cloudinary
    if (heroVideo.thumbnail) {
      await deleteFile(heroVideo.thumbnail);
    }

    await heroVideo.deleteOne();

    res.json({
      success: true,
      message: "Hero video deleted successfully",
    });
  } catch (error) {
    console.error("❌ Delete hero video error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================
// ✅ UPDATE PRIORITY (Bulk reorder)
// ============================================================
export const updatePriority = async (req, res) => {
  try {
    const { id } = req.params;
    const { priority } = req.body;

    if (priority === undefined || priority < 0) {
      return res.status(400).json({
        success: false,
        message: "Valid priority is required",
      });
    }

    const heroVideo = await HeroVideo.findById(id);
    if (!heroVideo) {
      return res.status(404).json({
        success: false,
        message: "Hero video not found",
      });
    }

    heroVideo.priority = parseInt(priority);
    heroVideo.updatedBy = req.user._id;
    await heroVideo.save();

    res.json({
      success: true,
      message: "Priority updated successfully",
      data: heroVideo,
    });
  } catch (error) {
    console.error("❌ Update priority error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};