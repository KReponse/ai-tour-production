// backend/src/services/media/storage/cloudinaryStorage.js
// ✅ Cloudinary Storage Provider - Production media storage

import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';
import fs from 'fs';
import path from 'path';
import mediaConfig from '../config.js';

// Configure Cloudinary
cloudinary.config({
  cloud_name: mediaConfig.cloudinary.cloudName,
  api_key: mediaConfig.cloudinary.apiKey,
  api_secret: mediaConfig.cloudinary.apiSecret,
  secure: true,
});

/**
 * Upload a file to Cloudinary from buffer or stream
 * @param {Buffer|Stream} fileData - File data
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} - Cloudinary upload result
 */
const uploadToCloudinary = (fileData, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder: options.folder || 'ai-tour',
      resource_type: options.resource_type || 'auto',
      public_id: options.public_id || undefined,
      overwrite: options.overwrite !== false,
      invalidate: options.invalidate !== false,
      transformation: options.transformation || [],
      ...options.extraOptions,
    };

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          console.error('❌ Cloudinary upload error:', error);
          reject(error);
        } else {
          console.log('✅ Cloudinary upload success:', result.secure_url);
          resolve(result);
        }
      }
    );

    // Handle Buffer or Stream
    if (Buffer.isBuffer(fileData)) {
      // Write buffer to stream
      const readableStream = new ReadableStream({
        start(controller) {
          controller.enqueue(fileData);
          controller.close();
        },
      });
      const reader = readableStream.getReader();
      const pump = () => {
        reader.read().then(({ done, value }) => {
          if (done) {
            uploadStream.end();
            return;
          }
          uploadStream.write(value);
          pump();
        });
      };
      pump();
    } else if (fileData.pipe && typeof fileData.pipe === 'function') {
      // It's a stream
      fileData.pipe(uploadStream);
    } else if (fileData.path && fs.existsSync(fileData.path)) {
      // It's a file path
      const fileStream = fs.createReadStream(fileData.path);
      fileStream.pipe(uploadStream);
    } else {
      // Try to use as buffer
      try {
        const buffer = Buffer.from(fileData);
        const bufferStream = new ReadableStream({
          start(controller) {
            controller.enqueue(buffer);
            controller.close();
          },
        });
        const reader = bufferStream.getReader();
        const pump = () => {
          reader.read().then(({ done, value }) => {
            if (done) {
              uploadStream.end();
              return;
            }
            uploadStream.write(value);
            pump();
          });
        };
        pump();
      } catch (error) {
        reject(new Error('Unsupported file data format'));
      }
    }
  });
};

/**
 * Determine folder based on file type
 * @param {string} type - 'image' or 'video'
 * @param {string} category - Optional category
 * @returns {string} - Cloudinary folder path
 */
const getFolder = (type, category = '') => {
  const baseFolder = mediaConfig.cloudinary.folder || 'ai-tour';
  const subFolder = type === 'video' ? 'videos' : 'images';
  return category ? `${baseFolder}/${subFolder}/${category}` : `${baseFolder}/${subFolder}`;
};

/**
 * Determine resource type for Cloudinary
 * @param {string} type - 'image' or 'video'
 * @param {string} mimetype - File mimetype
 * @returns {string} - Cloudinary resource type
 */
const getResourceType = (type, mimetype) => {
  if (type === 'video') return 'video';
  if (mimetype && mimetype.startsWith('video/')) return 'video';
  return 'image';
};

/**
 * Cloudinary Storage Provider
 */
export const cloudinaryStorageProvider = {
  name: 'cloudinary',

  /**
   * Save a file to Cloudinary
   * @param {Object} file - Multer file object or file data
   * @param {Object} options - { type: 'image'|'video', category: string, publicId: string }
   * @returns {Promise<Object>} - Saved file info
   */
  async save(file, options = {}) {
    if (!file) {
      throw new Error('No file provided');
    }

    const { type = 'image', category = '', publicId = null, transformation = [] } = options;

    // Determine if it's a video
    const isVideo = type === 'video' || (file.mimetype && file.mimetype.startsWith('video/'));
    const resourceType = getResourceType(type, file.mimetype);
    const folder = getFolder(isVideo ? 'video' : 'image', category);

    // Generate public ID if not provided
    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1e9);
    const ext = file.originalname ? path.extname(file.originalname) : '';
    const baseName = file.originalname ? path.basename(file.originalname, ext) : 'file';
    const finalPublicId = publicId || `${baseName}-${timestamp}-${random}`;

    // Prepare upload options
    const uploadOptions = {
      folder,
      public_id: finalPublicId,
      resource_type: resourceType,
      overwrite: true,
      invalidate: true,
      transformation,
    };

    // For images, add image transformations
    if (resourceType === 'image' && mediaConfig.cloudinary.imageTransformation) {
      uploadOptions.transformation = [
        ...(Array.isArray(transformation) ? transformation : []),
        ...mediaConfig.cloudinary.imageTransformation,
      ];
    }

    // For videos, add video transformations
    if (resourceType === 'video' && mediaConfig.cloudinary.videoTransformation) {
      uploadOptions.transformation = [
        ...(Array.isArray(transformation) ? transformation : []),
        ...mediaConfig.cloudinary.videoTransformation,
      ];
    }

    // Get file data
    let fileData;
    if (file.path && fs.existsSync(file.path)) {
      // Multer saved file locally
      fileData = file.path;
    } else if (file.buffer) {
      // File is in memory
      fileData = file.buffer;
    } else if (file.stream) {
      // File is a stream
      fileData = file.stream;
    } else {
      throw new Error('Unsupported file format');
    }

    // Upload to Cloudinary
    const result = await uploadToCloudinary(fileData, uploadOptions);

    // Build response
    return {
      filename: result.public_id,
      url: result.secure_url,
      provider: 'cloudinary',
      type: isVideo ? 'video' : 'image',
      size: result.bytes || file.size || 0,
      mimetype: file.mimetype || '',
      cloudinary: {
        publicId: result.public_id,
        version: result.version,
        format: result.format,
        width: result.width,
        height: result.height,
        duration: result.duration,
        bytes: result.bytes,
        url: result.secure_url,
        originalUrl: result.url,
        assetId: result.asset_id,
        etag: result.etag,
      },
    };
  },

  /**
   * Save multiple files to Cloudinary
   * @param {Array} files - Array of Multer file objects
   * @param {Object} options - { type: 'image'|'video', category: string }
   * @returns {Promise<Array>} - Saved file info array
   */
  async saveMultiple(files, options = {}) {
    if (!files || files.length === 0) return [];

    const results = [];
    for (const file of files) {
      try {
        const result = await this.save(file, options);
        results.push(result);
      } catch (error) {
        console.error('❌ Failed to save file to Cloudinary:', error.message);
        results.push({
          error: error.message,
          filename: file.originalname || 'unknown',
        });
      }
    }
    return results;
  },

  /**
   * Delete a file from Cloudinary
   * @param {string} publicId - Cloudinary public ID or filename
   * @param {Object} options - { type: 'image'|'video' }
   * @returns {Promise<boolean>} - True if deleted
   */
  async delete(publicId, options = {}) {
    if (!publicId) return false;

    const { type = 'image' } = options;
    const resourceType = getResourceType(type);

    // If publicId is a full URL, extract the public ID
    let id = publicId;
    if (publicId.startsWith('http://') || publicId.startsWith('https://')) {
      // Extract public ID from Cloudinary URL
      const matches = publicId.match(/\/v\d+\/([^/?]+)/);
      if (matches && matches[1]) {
        id = matches[1];
      }
    }

    // If it contains folder, use as-is, otherwise try to find
    try {
      const result = await cloudinary.uploader.destroy(id, {
        resource_type: resourceType,
        invalidate: true,
      });

      if (result.result === 'ok') {
        console.log(`🗑️ Deleted from Cloudinary: ${id}`);
        return true;
      } else if (result.result === 'not found') {
        console.warn(`⚠️ File not found in Cloudinary: ${id}`);
        return true; // Already deleted
      } else {
        console.error(`❌ Failed to delete from Cloudinary: ${id}`, result);
        return false;
      }
    } catch (error) {
      console.error(`❌ Cloudinary delete error for ${id}:`, error.message);
      return false;
    }
  },

  /**
   * Delete multiple files from Cloudinary
   * @param {Array} publicIds - Array of public IDs
   * @param {Object} options - { type: 'image'|'video' }
   * @returns {Promise<Array>} - Deletion results
   */
  async deleteMultiple(publicIds, options = {}) {
    if (!publicIds || publicIds.length === 0) return [];

    const results = [];
    for (const id of publicIds) {
      try {
        const result = await this.delete(id, options);
        results.push({ publicId: id, success: result });
      } catch (error) {
        results.push({ publicId: id, success: false, error: error.message });
      }
    }
    return results;
  },

  /**
   * Check if a file exists in Cloudinary
   * @param {string} publicId - Cloudinary public ID
   * @param {Object} options - { type: 'image'|'video' }
   * @returns {Promise<boolean>} - True if exists
   */
  async exists(publicId, options = {}) {
    if (!publicId) return false;

    const { type = 'image' } = options;
    const resourceType = getResourceType(type);

    try {
      const result = await cloudinary.api.resource(publicId, {
        resource_type: resourceType,
      });
      return !!result;
    } catch (error) {
      if (error.http_code === 404) {
        return false;
      }
      console.error('❌ Cloudinary exists check error:', error.message);
      return false;
    }
  },

  /**
   * Get file info from Cloudinary
   * @param {string} publicId - Cloudinary public ID
   * @param {Object} options - { type: 'image'|'video' }
   * @returns {Promise<Object|null>} - File info or null
   */
  async getInfo(publicId, options = {}) {
    if (!publicId) return null;

    const { type = 'image' } = options;
    const resourceType = getResourceType(type);

    try {
      const result = await cloudinary.api.resource(publicId, {
        resource_type: resourceType,
      });

      return {
        filename: result.public_id,
        url: result.secure_url,
        provider: 'cloudinary',
        type: resourceType,
        size: result.bytes,
        created: result.created_at,
        cloudinary: {
          publicId: result.public_id,
          version: result.version,
          format: result.format,
          width: result.width,
          height: result.height,
          duration: result.duration,
          bytes: result.bytes,
          url: result.secure_url,
        },
      };
    } catch (error) {
      if (error.http_code === 404) {
        return null;
      }
      console.error('❌ Cloudinary getInfo error:', error.message);
      return null;
    }
  },

  /**
   * Get a transformed URL for a Cloudinary file
   * @param {string} publicId - Cloudinary public ID
   * @param {Object} transformations - Transformation options
   * @param {Object} options - { type: 'image'|'video' }
   * @returns {string} - Transformed URL
   */
  getTransformedUrl(publicId, transformations = {}, options = {}) {
    if (!publicId) return '';

    const { type = 'image' } = options;
    const resourceType = getResourceType(type);

    // Build transformation string
    const trans = [];
    if (transformations.width) trans.push(`w_${transformations.width}`);
    if (transformations.height) trans.push(`h_${transformations.height}`);
    if (transformations.crop) trans.push(`c_${transformations.crop}`);
    if (transformations.quality) trans.push(`q_${transformations.quality}`);
    if (transformations.format) trans.push(`f_${transformations.format}`);
    if (transformations.effect) trans.push(`e_${transformations.effect}`);
    if (transformations.gravity) trans.push(`g_${transformations.gravity}`);
    if (transformations.angle) trans.push(`a_${transformations.angle}`);
    if (transformations.opacity) trans.push(`o_${transformations.opacity}`);
    if (transformations.brightness) trans.push(`br_${transformations.brightness}`);
    if (transformations.saturation) trans.push(`sa_${transformations.saturation}`);
    if (transformations.contrast) trans.push(`co_${transformations.contrast}`);
    if (transformations.sharpness) trans.push(`sh_${transformations.sharpness}`);
    if (transformations.blur) trans.push(`e_blur:${transformations.blur}`);
    if (transformations.radius) trans.push(`r_${transformations.radius}`);
    if (transformations.border) trans.push(`bo_${transformations.border}`);

    // Build URL
    const baseUrl = `https://res.cloudinary.com/${mediaConfig.cloudinary.cloudName}`;
    const typePath = resourceType === 'video' ? 'video/upload' : 'image/upload';
    const transStr = trans.length > 0 ? `${trans.join(',')}/` : '';

    return `${baseUrl}/${typePath}/${transStr}${publicId}`;
  },

  /**
   * Generate a thumbnail URL for a video
   * @param {string} publicId - Cloudinary public ID
   * @param {Object} options - { time: seconds, width: number, height: number }
   * @returns {string} - Thumbnail URL
   */
  getVideoThumbnail(publicId, options = {}) {
    if (!publicId) return '';

    const time = options.time || 1;
    const width = options.width || 1280;
    const height = options.height || 720;

    return this.getTransformedUrl(
      publicId,
      {
        width,
        height,
        crop: 'fill',
        quality: 'auto',
        format: 'jpg',
        effect: `so_${time}`,
      },
      { type: 'video' }
    );
  },

  /**
   * Generate an optimized URL for images
   * @param {string} publicId - Cloudinary public ID
   * @param {Object} options - { width, height, quality, format }
   * @returns {string} - Optimized URL
   */
  getOptimizedImageUrl(publicId, options = {}) {
    if (!publicId) return '';

    const width = options.width || 800;
    const height = options.height || 600;
    const quality = options.quality || 'auto';
    const format = options.format || 'auto';
    const crop = options.crop || 'limit';

    return this.getTransformedUrl(
      publicId,
      { width, height, crop, quality, format },
      { type: 'image' }
    );
  },
};

export default cloudinaryStorageProvider;