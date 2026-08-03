// backend/src/controllers/heroController.js
// ✅ NEW - Hero Video Controller
// ✅ Simple CRUD for hero videos

import HeroVideo from "../models/HeroVideo.js";
import Listing from "../models/Listing.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { validateVideoDuration, generateVideoThumbnail } from "../middleware/upload.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
// ✅ CREATE HERO VIDEO
// ============================================================
export const createHeroVideo = async (req, res) => {
  try {
    const { title, description, listingId, priority = 0, isActive = true } = req.body;

    // ✅ No required validation for title, description, or listingId

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

    // Validate video duration
    let duration = 0;
    try {
      duration = await validateVideoDuration(req.file.path);
    } catch (error) {
      // Clean up file if validation fails
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    // Generate thumbnail
    const thumbnailPath = req.file.path.replace(/\.[^.]+$/, "-thumb.jpg");
    let thumbnail = null;
    try {
      const generated = await generateVideoThumbnail(req.file.path, thumbnailPath);
      if (generated) {
        thumbnail = `/uploads/videos/${path.basename(thumbnailPath)}`;
      }
    } catch (error) {
      console.warn("⚠️ Thumbnail generation failed:", error.message);
    }

    const videoUrl = `/uploads/videos/${path.basename(req.file.path)}`;

    const heroVideo = new HeroVideo({
      title: title || "",
      description: description || "",
      videoUrl,
      thumbnail,
      duration: Math.round(duration),
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
    // Clean up uploaded file if exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
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
// ✅ UPLOAD/REPLACE HERO VIDEO
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
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      return res.status(404).json({
        success: false,
        message: "Hero video not found",
      });
    }

    // Validate video duration
    let duration = 0;
    try {
      duration = await validateVideoDuration(file.path);
    } catch (error) {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    // Generate thumbnail
    const thumbnailPath = file.path.replace(/\.[^.]+$/, "-thumb.jpg");
    let thumbnail = null;
    try {
      const generated = await generateVideoThumbnail(file.path, thumbnailPath);
      if (generated) {
        thumbnail = `/uploads/videos/${path.basename(thumbnailPath)}`;
      }
    } catch (error) {
      console.warn("⚠️ Thumbnail generation failed:", error.message);
    }

    // Delete old video file
    if (heroVideo.videoUrl) {
      const oldPath = path.join(process.cwd(), heroVideo.videoUrl);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    // Delete old thumbnail
    if (heroVideo.thumbnail) {
      const oldThumbPath = path.join(process.cwd(), heroVideo.thumbnail);
      if (fs.existsSync(oldThumbPath)) {
        fs.unlinkSync(oldThumbPath);
      }
    }

    // Update with new video
    heroVideo.videoUrl = `/uploads/videos/${path.basename(file.path)}`;
    heroVideo.thumbnail = thumbnail;
    heroVideo.duration = Math.round(duration);
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
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
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

    // Delete video file
    if (heroVideo.videoUrl) {
      const videoPath = path.join(process.cwd(), heroVideo.videoUrl);
      if (fs.existsSync(videoPath)) {
        fs.unlinkSync(videoPath);
      }
    }

    // Delete thumbnail
    if (heroVideo.thumbnail) {
      const thumbPath = path.join(process.cwd(), heroVideo.thumbnail);
      if (fs.existsSync(thumbPath)) {
        fs.unlinkSync(thumbPath);
      }
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