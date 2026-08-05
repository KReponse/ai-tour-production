// backend/src/services/mediaUploadService.js
// ✅ OPTIMIZED - Direct Cloudinary upload with minimal processing
// ✅ NO thumbnails, NO ffmpeg, NO unnecessary operations

import { v2 as cloudinary } from 'cloudinary';
import { PassThrough } from 'stream';
import mediaConfig from './media/config.js';

// Configure Cloudinary
cloudinary.config({
  cloud_name: mediaConfig.cloudinary.cloudName,
  api_key: mediaConfig.cloudinary.apiKey,
  api_secret: mediaConfig.cloudinary.apiSecret,
  secure: true,
  timeout: 60000, // 60 seconds
});

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

// ============================================================
// ✅ HELPER: Retry with exponential backoff
// ============================================================
const withRetry = async (fn, retries = MAX_RETRIES) => {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      console.log(`⚠️ Attempt ${i + 1} failed:`, error.message);
      if (i < retries - 1) {
        const delay = RETRY_DELAY * (i + 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
};

// ============================================================
// ✅ HELPER: Upload buffer to Cloudinary
// ============================================================
const uploadBufferToCloudinary = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder: options.folder || 'ai-tour',
      resource_type: options.resource_type || 'image',
      public_id: options.public_id || undefined,
      overwrite: true,
      invalidate: true,
      transformation: options.transformation || [],
      timeout: 60000,
    };

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          console.error('❌ Cloudinary upload error:', error.message);
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    // ✅ Use PassThrough stream for buffer
    const bufferStream = new PassThrough();
    bufferStream.end(buffer);
    bufferStream.pipe(uploadStream);
  });
};

// ============================================================
// ✅ UPLOAD IMAGE - OPTIMIZED (no thumbnails, no transformations)
// ============================================================
export const uploadImage = async (file, options = {}) => {
  const { category = 'general' } = options;
  const folder = `ai-tour/images/${category}`;

  return withRetry(async () => {
    // ✅ Upload buffer directly - NO transformations
    const result = await uploadBufferToCloudinary(file.buffer, {
      folder,
      resource_type: 'image',
    });

    return {
      secure_url: result.secure_url,
      public_id: result.public_id,
      width: result.width || 0,
      height: result.height || 0,
      format: result.format || 'jpg',
      bytes: result.bytes || file.size,
      created_at: result.created_at,
    };
  });
};

// ============================================================
// ✅ UPLOAD VIDEO - OPTIMIZED (no thumbnails, no ffmpeg)
// ============================================================
export const uploadVideo = async (file, options = {}) => {
  const { category = 'general' } = options;
  const folder = `ai-tour/videos/${category}`;

  return withRetry(async () => {
    // ✅ Upload buffer directly - NO transformations, NO thumbnails
    const result = await uploadBufferToCloudinary(file.buffer, {
      folder,
      resource_type: 'video',
    });

    return {
      secure_url: result.secure_url,
      public_id: result.public_id,
      duration: result.duration || 0,
      format: result.format || 'mp4',
      bytes: result.bytes || file.size,
      created_at: result.created_at,
    };
  });
};

// ============================================================
// ✅ UPLOAD MULTIPLE IMAGES
// ============================================================
export const uploadMultipleImages = async (files, options = {}) => {
  const results = [];
  for (const file of files) {
    try {
      const result = await uploadImage(file, options);
      results.push(result);
    } catch (error) {
      console.error('❌ Failed to upload image:', file.originalname, error.message);
      results.push({ error: error.message, filename: file.originalname });
    }
  }
  return results;
};

// ============================================================
// ✅ UPLOAD MULTIPLE VIDEOS
// ============================================================
export const uploadMultipleVideos = async (files, options = {}) => {
  const results = [];
  for (const file of files) {
    try {
      const result = await uploadVideo(file, options);
      results.push(result);
    } catch (error) {
      console.error('❌ Failed to upload video:', file.originalname, error.message);
      results.push({ error: error.message, filename: file.originalname });
    }
  }
  return results;
};

// ============================================================
// ✅ DELETE MEDIA
// ============================================================
export const deleteMedia = async (publicId, options = {}) => {
  const { resource_type = 'image' } = options;

  return withRetry(async () => {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type,
      invalidate: true,
      timeout: 30000,
    });

    if (result.result === 'ok') {
      return { success: true, publicId };
    } else if (result.result === 'not found') {
      return { success: true, publicId, alreadyDeleted: true };
    } else {
      throw new Error(`Delete failed: ${result.result}`);
    }
  });
};

export const mediaUploadService = {
  uploadImage,
  uploadVideo,
  uploadMultipleImages,
  uploadMultipleVideos,
  deleteMedia,
};

export default mediaUploadService;