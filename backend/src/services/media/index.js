// backend/src/services/media/index.js
// ✅ Media Service - Main entry point
// ✅ Supports: local and cloudinary storage providers

import mediaConfig from './config.js';
import { generateMediaUrl, generateCoverUrl, generateVideoUrl, generateAllMediaUrls, getMediaType } from './urlGenerator.js';
import { getStorageProvider } from './storage/index.js';
import { cleanupOrphanedFiles, cleanupListingMedia, findOrphanedFiles } from './cleanupService.js';

/**
 * Media Service - Unified interface for media operations
 */
class MediaService {
  constructor() {
    this.config = mediaConfig;
    this.storage = getStorageProvider();
    this.provider = this.storage.name || 'local';
    this.isCloudinary = this.provider === 'cloudinary';
  }

  /**
   * Get the current storage provider name
   * @returns {string} - Provider name
   */
  getProvider() {
    return this.provider;
  }

  /**
   * Check if using Cloudinary
   * @returns {boolean} - True if using Cloudinary
   */
  isUsingCloudinary() {
    return this.isCloudinary;
  }

  /**
   * Generate URL for a media file
   * @param {string} filename - The filename or Cloudinary public ID
   * @param {string} type - 'image' or 'video'
   * @returns {string} - Full URL
   */
  getUrl(filename, type = 'image') {
    // If already a full URL (Cloudinary, etc.), return as-is
    if (filename && (filename.startsWith('http://') || filename.startsWith('https://'))) {
      return filename;
    }
    return generateMediaUrl(filename, type);
  }

  /**
   * Generate an optimized URL for images (Cloudinary)
   * @param {string} publicId - Cloudinary public ID
   * @param {Object} options - Transformation options
   * @returns {string} - Optimized URL
   */
  getOptimizedUrl(publicId, options = {}) {
    if (!publicId) return '';
    if (!this.isCloudinary) return this.getUrl(publicId, 'image');

    // If it's already a full URL, return as-is
    if (publicId.startsWith('http://') || publicId.startsWith('https://')) {
      return publicId;
    }

    // Use cloudinary storage provider's optimized URL generation
    if (this.storage.getOptimizedImageUrl) {
      return this.storage.getOptimizedImageUrl(publicId, options);
    }

    return this.getUrl(publicId, 'image');
  }

  /**
   * Generate a video thumbnail URL (Cloudinary)
   * @param {string} publicId - Cloudinary public ID
   * @param {Object} options - { time: seconds, width, height }
   * @returns {string} - Thumbnail URL
   */
  getVideoThumbnail(publicId, options = {}) {
    if (!publicId) return '';
    if (!this.isCloudinary) return this.getUrl(publicId, 'video');

    // If it's already a full URL, return as-is
    if (publicId.startsWith('http://') || publicId.startsWith('https://')) {
      return publicId;
    }

    if (this.storage.getVideoThumbnail) {
      return this.storage.getVideoThumbnail(publicId, options);
    }

    return this.getUrl(publicId, 'video');
  }

  /**
   * Save a file
   * @param {Object} file - Multer file object
   * @param {Object} options - { type: 'image'|'video', category: string }
   * @returns {Promise<Object>} - Saved file info
   */
  async save(file, options = {}) {
    if (!file) {
      throw new Error('No file provided');
    }

    const type = options.type || getMediaType(file.originalname);
    const result = await this.storage.save(file, { type, ...options });
    return result;
  }

  /**
   * Save multiple files
   * @param {Array} files - Array of Multer file objects
   * @param {Object} options - { type: 'image'|'video', category: string }
   * @returns {Promise<Array>} - Saved file info array
   */
  async saveMultiple(files, options = {}) {
    if (!files || files.length === 0) return [];

    // Use storage's saveMultiple if available
    if (this.storage.saveMultiple) {
      return this.storage.saveMultiple(files, options);
    }

    // Fallback: save one by one
    const results = [];
    for (const file of files) {
      try {
        const result = await this.save(file, options);
        results.push(result);
      } catch (error) {
        console.error('❌ Failed to save file:', error.message);
        results.push({ error: error.message, filename: file.originalname });
      }
    }
    return results;
  }

  /**
   * Delete a file
   * @param {string} filename - The filename or public ID
   * @param {Object} options - { type: 'image'|'video' }
   * @returns {Promise<boolean>} - True if deleted
   */
  async delete(filename, options = {}) {
    if (!filename) return false;
    const type = options.type || getMediaType(filename);

    // If it's a Cloudinary URL, extract public ID
    let id = filename;
    if (filename.startsWith('http://') || filename.startsWith('https://')) {
      // If it's a Cloudinary URL, try to extract public ID
      const matches = filename.match(/\/v\d+\/([^/?]+)/);
      if (matches && matches[1]) {
        id = matches[1];
      }
    }

    return this.storage.delete(id, { type });
  }

  /**
   * Delete multiple files
   * @param {Array} filenames - Array of filenames
   * @param {Object} options - { type: 'image'|'video' }
   * @returns {Promise<Array>} - Deletion results
   */
  async deleteMultiple(filenames, options = {}) {
    if (!filenames || filenames.length === 0) return [];

    if (this.storage.deleteMultiple) {
      return this.storage.deleteMultiple(filenames, options);
    }

    const results = [];
    for (const filename of filenames) {
      try {
        const result = await this.delete(filename, options);
        results.push({ filename, success: result });
      } catch (error) {
        results.push({ filename, success: false, error: error.message });
      }
    }
    return results;
  }

  /**
   * Check if a file exists
   * @param {string} filename - The filename or public ID
   * @param {Object} options - { type: 'image'|'video' }
   * @returns {Promise<boolean>} - True if exists
   */
  async exists(filename, options = {}) {
    if (!filename) return false;
    const type = options.type || getMediaType(filename);

    if (this.storage.exists) {
      return this.storage.exists(filename, { type });
    }

    return false;
  }

  /**
   * Get file info
   * @param {string} filename - The filename or public ID
   * @param {Object} options - { type: 'image'|'video' }
   * @returns {Promise<Object|null>} - File info
   */
  async getInfo(filename, options = {}) {
    if (!filename) return null;
    const type = options.type || getMediaType(filename);

    if (this.storage.getInfo) {
      return this.storage.getInfo(filename, { type });
    }

    return null;
  }

  /**
   * Generate all media URLs for an entity
   * @param {Object} entity - The entity
   * @returns {Object} - All media URLs
   */
  getEntityMedia(entity) {
    return generateAllMediaUrls(entity);
  }

  /**
   * Generate cover URL for an entity
   * @param {Object} entity - The entity
   * @returns {string} - Cover URL
   */
  getCoverUrl(entity) {
    return generateCoverUrl(entity);
  }

  /**
   * Generate video URL for an entity
   * @param {Object} entity - The entity
   * @returns {string|null} - Video URL
   */
  getVideoUrl(entity) {
    return generateVideoUrl(entity);
  }

  /**
   * Get media type from filename
   * @param {string} filename - The filename
   * @returns {string} - 'image', 'video', or 'other'
   */
  getType(filename) {
    return getMediaType(filename);
  }

  /**
   * Clean up orphaned files
   * @param {Array} currentFiles - Current referenced files
   * @param {Array} oldFiles - Old referenced files
   * @param {Object} options - Options
   * @returns {Promise<Array>} - Deleted files
   */
  async cleanupOrphans(currentFiles, oldFiles, options = {}) {
    return cleanupOrphanedFiles(currentFiles, oldFiles, options);
  }

  /**
   * Clean up all media for a listing
   * @param {Object} listing - Listing document
   * @returns {Promise<Array>} - Deleted files
   */
  async cleanupListing(listing) {
    return cleanupListingMedia(listing);
  }

  /**
   * Find orphaned files on disk (local only)
   * @param {Array} referencedFilenames - All referenced filenames
   * @param {Object} options - { dryRun: boolean }
   * @returns {Promise<Array>} - Found orphans
   */
  async findOrphans(referencedFilenames, options = {}) {
    return findOrphanedFiles(referencedFilenames, options);
  }
}

// Singleton instance
let instance = null;

/**
 * Get the media service instance
 * @returns {MediaService} - Media service instance
 */
export const getMediaService = () => {
  if (!instance) {
    instance = new MediaService();
  }
  return instance;
};

// Export a default instance
export default getMediaService();