// backend/src/services/media/urlGenerator.js
// ✅ URL Generator - Consistent media URL generation

import mediaConfig from './config.js';

/**
 * Generate a URL for a media file
 * @param {string} filename - The filename or path
 * @param {string} type - 'image' or 'video'
 * @returns {string} - Full URL
 */
export const generateMediaUrl = (filename, type = 'image') => {
  if (!filename) return null;
  
  // If it's already a full URL, return as-is
  if (filename.startsWith('http://') || filename.startsWith('https://')) {
    return filename;
  }
  
  // If it's a data URL or blob, return as-is
  if (filename.startsWith('data:') || filename.startsWith('blob:')) {
    return filename;
  }
  
  // Remove leading slashes for clean joining
  const cleanFilename = filename.replace(/^\/+/, '');
  
  // Check if it's a video file by extension
  const videoExtensions = ['.mp4', '.mov', '.webm', '.avi', '.mkv', '.m4v', '.3gp', '.mpeg', '.mpg'];
  const isVideo = videoExtensions.some(ext => cleanFilename.toLowerCase().endsWith(ext));
  
  // Determine base URL
  let baseUrl;
  if (type === 'video' || isVideo) {
    baseUrl = mediaConfig.videoBaseUrl;
    // If using default, ensure it ends with /videos
    if (baseUrl === 'http://localhost:5000/uploads') {
      baseUrl = 'http://localhost:5000/uploads/videos';
    }
  } else {
    baseUrl = mediaConfig.baseUrl;
  }
  
  // Join base URL with filename
  return `${baseUrl}/${cleanFilename}`;
};

/**
 * Generate URL for cover media
 * @param {Object} entity - The entity (listing, booking, etc.)
 * @returns {string} - Cover media URL
 */
export const generateCoverUrl = (entity) => {
  if (!entity) return null;
  
  // Check for coverMedia first
  if (entity.coverMedia) {
    const type = entity.coverMediaType === 'video' ? 'video' : 'image';
    return generateMediaUrl(entity.coverMedia, type);
  }
  
  // Fallback to coverImage
  if (entity.coverImage) {
    return generateMediaUrl(entity.coverImage, 'image');
  }
  
  // Fallback to first gallery image
  if (entity.galleryImages && entity.galleryImages.length > 0) {
    return generateMediaUrl(entity.galleryImages[0], 'image');
  }
  
  return null;
};

/**
 * Generate URL for cover video
 * @param {Object} entity - The entity
 * @returns {string|null} - Video URL or null
 */
export const generateVideoUrl = (entity) => {
  if (!entity) return null;
  
  // Check for video cover
  if (entity.coverMediaType === 'video' && entity.coverMedia) {
    return generateMediaUrl(entity.coverMedia, 'video');
  }
  
  // Check if coverMedia is a video file
  if (entity.coverMedia) {
    const videoExtensions = ['.mp4', '.mov', '.webm', '.avi', '.mkv', '.m4v', '.3gp', '.mpeg', '.mpg'];
    const isVideo = videoExtensions.some(ext => entity.coverMedia.toLowerCase().endsWith(ext));
    if (isVideo) {
      return generateMediaUrl(entity.coverMedia, 'video');
    }
  }
  
  // Check videos array
  if (entity.videos && entity.videos.length > 0) {
    return generateMediaUrl(entity.videos[0], 'video');
  }
  
  return null;
};

/**
 * Generate URLs for all media in an entity
 * @param {Object} entity - The entity
 * @returns {Object} - All media URLs
 */
export const generateAllMediaUrls = (entity) => {
  if (!entity) {
    return {
      cover: null,
      coverImage: null,
      coverVideo: null,
      gallery: [],
      videos: [],
      all: [],
    };
  }
  
  const cover = generateCoverUrl(entity);
  const coverVideo = generateVideoUrl(entity);
  
  // Gallery images
  const gallery = (entity.galleryImages || [])
    .map(img => generateMediaUrl(img, 'image'))
    .filter(Boolean);
  
  // Videos
  const videos = (entity.videos || [])
    .map(vid => generateMediaUrl(vid, 'video'))
    .filter(Boolean);
  
  // All media
  const all = [cover, ...gallery, ...videos].filter(Boolean);
  
  return {
    cover,
    coverImage: cover,
    coverVideo,
    gallery,
    videos,
    all,
  };
};

/**
 * Get the media type from filename
 * @param {string} filename - The filename
 * @returns {string} - 'image', 'video', or 'other'
 */
export const getMediaType = (filename) => {
  if (!filename) return 'other';
  
  const videoExtensions = ['.mp4', '.mov', '.webm', '.avi', '.mkv', '.m4v', '.3gp', '.mpeg', '.mpg'];
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.bmp', '.ico', '.heic', '.heif'];
  
  const lower = filename.toLowerCase();
  
  if (videoExtensions.some(ext => lower.endsWith(ext))) return 'video';
  if (imageExtensions.some(ext => lower.endsWith(ext))) return 'image';
  
  return 'other';
};

export default {
  generateMediaUrl,
  generateCoverUrl,
  generateVideoUrl,
  generateAllMediaUrls,
  getMediaType,
};