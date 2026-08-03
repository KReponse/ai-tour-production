// backend/src/services/media/cleanupService.js
// ✅ Cleanup Service - Orphan file management

import { getStorageProvider } from './storage/index.js';
import { generateMediaUrl, getMediaType } from './urlGenerator.js';

/**
 * Clean up orphaned media files
 * @param {Array} currentFiles - List of currently referenced filenames
 * @param {Array} oldFiles - List of previously referenced filenames
 * @param {Object} options - { type: 'image'|'video', exclude: [] }
 * @returns {Promise<Array>} - Deleted files
 */
export const cleanupOrphanedFiles = async (currentFiles, oldFiles, options = {}) => {
  const { type = 'all', exclude = [] } = options;
  const storage = getStorageProvider();
  const deleted = [];
  
  // Ensure arrays
  const currentSet = new Set(currentFiles.filter(Boolean));
  const oldSet = new Set(oldFiles.filter(Boolean));
  
  // Add exclude to current set (don't delete these)
  if (exclude.length > 0) {
    exclude.forEach(f => {
      if (f) currentSet.add(f);
    });
  }
  
  // Find files that are in old but not in current
  const orphaned = [];
  for (const file of oldSet) {
    if (file && !currentSet.has(file)) {
      orphaned.push(file);
    }
  }
  
  console.log(`🧹 Found ${orphaned.length} orphaned files to clean up`);
  
  // Delete each orphaned file
  for (const filename of orphaned) {
    try {
      const mediaType = getMediaType(filename);
      const deletedType = type === 'all' ? mediaType : type;
      
      if (deletedType === 'all' || deletedType === mediaType) {
        const result = await storage.delete(filename, { type: mediaType });
        if (result) {
          deleted.push({ filename, type: mediaType, success: true });
          console.log(`🗑️ Cleaned up orphan: ${filename}`);
        } else {
          deleted.push({ filename, type: mediaType, success: false, error: 'Not found' });
        }
      }
    } catch (error) {
      console.error(`❌ Failed to cleanup ${filename}:`, error.message);
      deleted.push({ filename, type: getMediaType(filename), success: false, error: error.message });
    }
  }
  
  return deleted;
};

/**
 * Clean up all media for a listing
 * @param {Object} listing - Listing document
 * @returns {Promise<Array>} - Deleted files
 */
export const cleanupListingMedia = async (listing) => {
  if (!listing) return [];
  
  // Collect all media filenames
  const allMedia = [
    listing.coverMedia,
    listing.coverImage,
    ...(listing.galleryImages || []),
    ...(listing.videos || []),
  ].filter(Boolean);
  
  // Also check for media in other fields
  const otherMedia = [];
  if (listing.media) {
    if (listing.media.cover?.filename) otherMedia.push(listing.media.cover.filename);
    if (listing.media.gallery) {
      listing.media.gallery.forEach(item => {
        if (item.filename) otherMedia.push(item.filename);
      });
    }
    if (listing.media.videos) {
      listing.media.videos.forEach(item => {
        if (item.filename) otherMedia.push(item.filename);
      });
    }
  }
  
  const allFilenames = [...allMedia, ...otherMedia].filter(Boolean);
  const uniqueFilenames = [...new Set(allFilenames)];
  
  const storage = getStorageProvider();
  const deleted = [];
  
  for (const filename of uniqueFilenames) {
    try {
      const mediaType = getMediaType(filename);
      const result = await storage.delete(filename, { type: mediaType });
      if (result) {
        deleted.push({ filename, type: mediaType, success: true });
      }
    } catch (error) {
      console.error(`❌ Failed to delete ${filename}:`, error.message);
    }
  }
  
  return deleted;
};

/**
 * Find and clean up orphaned files in the upload directory
 * This compares files on disk with files referenced in database
 * @param {Array} referencedFilenames - All filenames referenced in database
 * @param {Object} options - { dryRun: boolean }
 * @returns {Promise<Array>} - Found orphans
 */
export const findOrphanedFiles = async (referencedFilenames, options = {}) => {
  const { dryRun = true } = options;
  const storage = getStorageProvider();
  const referencedSet = new Set(referencedFilenames.filter(Boolean));
  const orphans = [];
  
  // This requires directory scanning which is only available for local storage
  // For cloud providers, this would need to use their APIs
  
  // For now, check if storage has a scan method
  if (typeof storage.scan === 'function') {
    const files = await storage.scan();
    for (const file of files) {
      if (!referencedSet.has(file.filename)) {
        orphans.push(file);
      }
    }
  } else {
    console.warn('⚠️ Storage provider does not support scanning');
  }
  
  if (!dryRun) {
    for (const orphan of orphans) {
      try {
        await storage.delete(orphan.filename, { type: orphan.type });
        console.log(`🗑️ Deleted orphan: ${orphan.filename}`);
      } catch (error) {
        console.error(`❌ Failed to delete ${orphan.filename}:`, error.message);
      }
    }
  }
  
  return orphans;
};

export default {
  cleanupOrphanedFiles,
  cleanupListingMedia,
  findOrphanedFiles,
};