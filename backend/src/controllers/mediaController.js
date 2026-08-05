// backend/src/controllers/mediaController.js
// ✅ OPTIMIZED - Simplified upload with detailed logging
// ✅ Removed all unnecessary processing

import { mediaUploadService } from '../services/mediaUploadService.js';

// ============================================================
// ✅ UPLOAD SINGLE IMAGE - OPTIMIZED
// ============================================================
export const uploadImage = async (req, res) => {
  const startTime = Date.now();
  console.log('📸 [STEP 1] Image upload request received');

  try {
    // ✅ [STEP 2] Multer completed
    if (!req.file) {
      console.error('❌ No image file provided');
      return res.status(400).json({
        success: false,
        message: 'No image file provided',
      });
    }

    console.log(`📸 [STEP 2] Multer completed: ${req.file.originalname} (${req.file.size} bytes)`);

    // ✅ [STEP 3] Upload started
    console.log('📸 [STEP 3] Uploading to Cloudinary...');
    const uploadStartTime = Date.now();

    const result = await mediaUploadService.uploadImage(req.file);

    const uploadDuration = Date.now() - uploadStartTime;
    console.log(`📸 [STEP 4] Cloudinary upload completed in ${uploadDuration}ms`);

    // ✅ [STEP 5] Response sent
    const totalDuration = Date.now() - startTime;
    console.log(`📸 [STEP 5] Response sent (total: ${totalDuration}ms)`);

    res.json({
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width || 0,
      height: result.height || 0,
      format: result.format || 'jpg',
      size: result.bytes || req.file.size,
      duration: totalDuration,
    });
  } catch (error) {
    console.error('❌ Upload image error:', error.message);
    console.error('❌ Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload image',
    });
  }
};

// ============================================================
// ✅ UPLOAD SINGLE VIDEO - OPTIMIZED
// ============================================================
export const uploadVideo = async (req, res) => {
  const startTime = Date.now();
  console.log('🎬 [STEP 1] Video upload request received');

  try {
    if (!req.file) {
      console.error('❌ No video file provided');
      return res.status(400).json({
        success: false,
        message: 'No video file provided',
      });
    }

    console.log(`🎬 [STEP 2] Multer completed: ${req.file.originalname} (${req.file.size} bytes)`);

    console.log('🎬 [STEP 3] Uploading to Cloudinary...');
    const uploadStartTime = Date.now();

    const result = await mediaUploadService.uploadVideo(req.file);

    const uploadDuration = Date.now() - uploadStartTime;
    console.log(`🎬 [STEP 4] Cloudinary upload completed in ${uploadDuration}ms`);

    const totalDuration = Date.now() - startTime;
    console.log(`🎬 [STEP 5] Response sent (total: ${totalDuration}ms)`);

    res.json({
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      duration: result.duration || 0,
      format: result.format || 'mp4',
      size: result.bytes || req.file.size,
      thumbnail: result.thumbnail || null,
    });
  } catch (error) {
    console.error('❌ Upload video error:', error.message);
    console.error('❌ Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload video',
    });
  }
};

// ============================================================
// ✅ UPLOAD MULTIPLE IMAGES
// ============================================================
export const uploadMultipleImages = async (req, res) => {
  const startTime = Date.now();
  console.log(`📸 [STEP 1] Multiple images upload (${req.files?.length || 0} files)`);

  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No image files provided',
      });
    }

    console.log(`📸 [STEP 2] Multer completed: ${req.files.length} files`);

    console.log('📸 [STEP 3] Uploading to Cloudinary...');
    const uploadStartTime = Date.now();

    const results = await mediaUploadService.uploadMultipleImages(req.files);

    const uploadDuration = Date.now() - uploadStartTime;
    console.log(`📸 [STEP 4] Cloudinary upload completed in ${uploadDuration}ms`);

    const totalDuration = Date.now() - startTime;
    console.log(`📸 [STEP 5] Response sent (total: ${totalDuration}ms)`);

    res.json({
      success: true,
      images: results.map(r => ({
        url: r.secure_url,
        publicId: r.public_id,
        width: r.width || 0,
        height: r.height || 0,
        format: r.format || 'jpg',
        size: r.bytes || 0,
      })),
      total: results.length,
      duration: totalDuration,
    });
  } catch (error) {
    console.error('❌ Upload multiple images error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload images',
    });
  }
};

// ============================================================
// ✅ UPLOAD MULTIPLE VIDEOS
// ============================================================
export const uploadMultipleVideos = async (req, res) => {
  const startTime = Date.now();
  console.log(`🎬 [STEP 1] Multiple videos upload (${req.files?.length || 0} files)`);

  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No video files provided',
      });
    }

    console.log(`🎬 [STEP 2] Multer completed: ${req.files.length} files`);

    console.log('🎬 [STEP 3] Uploading to Cloudinary...');
    const uploadStartTime = Date.now();

    const results = await mediaUploadService.uploadMultipleVideos(req.files);

    const uploadDuration = Date.now() - uploadStartTime;
    console.log(`🎬 [STEP 4] Cloudinary upload completed in ${uploadDuration}ms`);

    const totalDuration = Date.now() - startTime;
    console.log(`🎬 [STEP 5] Response sent (total: ${totalDuration}ms)`);

    res.json({
      success: true,
      videos: results.map(r => ({
        url: r.secure_url,
        publicId: r.public_id,
        duration: r.duration || 0,
        format: r.format || 'mp4',
        size: r.bytes || 0,
        thumbnail: r.thumbnail || null,
      })),
      total: results.length,
      duration: totalDuration,
    });
  } catch (error) {
    console.error('❌ Upload multiple videos error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload videos',
    });
  }
};

// ============================================================
// ✅ DELETE MEDIA
// ============================================================
export const deleteMedia = async (req, res) => {
  try {
    const { publicId } = req.params;

    if (!publicId) {
      return res.status(400).json({
        success: false,
        message: 'Public ID is required',
      });
    }

    const result = await mediaUploadService.deleteMedia(publicId);

    res.json({
      success: true,
      message: 'Media deleted successfully',
      result,
    });
  } catch (error) {
    console.error('❌ Delete media error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete media',
    });
  }
};