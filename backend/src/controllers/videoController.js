// backend/src/controllers/videoController.js
// ✅ UPDATED - Uses Listing instead of Tour

import Video from "../models/Video.js";
import Listing from "../models/Listing.js"; // ✅ Changed from Tour

/**
 * ===============================
 * Upload Video
 * POST /api/videos
 * Provider only
 * ===============================
 */
export const uploadVideo = async (req, res) => {
  try {
    const { title, description, category, location, listing } = req.body; // ✅ Changed from tour to listing

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Video file is required",
      });
    }

    if (listing) { // ✅ Changed from tour
      const exists = await Listing.findById(listing); // ✅ Changed from Tour
      if (!exists) {
        return res.status(404).json({
          success: false,
          message: "Listing not found",
        });
      }
    }

    const video = await Video.create({
      provider: req.user._id,
      listing: listing || null, // ✅ Changed from tour to listing
      title,
      description,
      category,
      location,
      videoUrl: `/uploads/videos/${req.file.filename}`,
      thumbnail: "",
      duration: 0,
    });

    res.status(201).json({
      success: true,
      message: "Video uploaded successfully",
      video,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * ===============================
 * Get All Public Videos
 * GET /api/videos
 * ===============================
 */
export const getVideos = async (req, res) => {
  try {
    const videos = await Video.find({
      isPublic: true,
      status: "approved",
    })
      .populate("provider", "name avatar")
      .populate("listing", "title location") // ✅ Changed from tour to listing
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      total: videos.length,
      videos,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * ===============================
 * Featured Videos
 * GET /api/videos/featured
 * ===============================
 */
export const getFeaturedVideos = async (req, res) => {
  try {
    const videos = await Video.find({
      featured: true,
      status: "approved",
      isPublic: true,
    })
      .populate("provider", "name avatar")
      .populate("listing", "title") // ✅ Changed from tour to listing
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      success: true,
      videos,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * ===============================
 * Provider Videos
 * GET /api/videos/my
 * ===============================
 */
export const getMyVideos = async (req, res) => {
  try {
    const videos = await Video.find({
      provider: req.user._id,
    })
      .populate("listing", "title location") // ✅ Changed from tour to listing
      .sort({
        createdAt: -1,
      });

    res.json({
      success: true,
      videos,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * ===============================
 * Like Video
 * PATCH /api/videos/:id/like
 * ===============================
 */
export const likeVideo = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video not found",
      });
    }

    video.likes += 1;

    await video.save();

    res.json({
      success: true,
      likes: video.likes,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * ===============================
 * Increase Views
 * PATCH /api/videos/:id/view
 * ===============================
 */
export const addView = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video not found",
      });
    }

    video.views += 1;

    await video.save();

    res.json({
      success: true,
      views: video.views,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * ===============================
 * Delete Video
 * DELETE /api/videos/:id
 * ===============================
 */
export const deleteVideo = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video not found",
      });
    }

    if (video.provider.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    await video.deleteOne();

    res.json({
      success: true,
      message: "Video deleted",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};