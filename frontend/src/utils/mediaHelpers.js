// frontend/src/utils/mediaHelpers.js
// ✅ COMPLETE FIXED - Handles both formats (with and without videos/ prefix)
// ✅ UPDATED: Uses VITE_MEDIA_BASE_URL from environment
// ✅ UPDATED: Cloudinary URL detection and handling

const PLACEHOLDER_IMAGE = '/placeholder-tour.jpg';

// ===============================
// CLOUDINARY DETECTION
// ===============================

const isCloudinaryUrl = (url) => {
  if (!url) return false;
  return url.includes('cloudinary.com') || 
         url.includes('res.cloudinary.com') ||
         url.startsWith('https://res.cloudinary.com/');
};

const isFullUrl = (url) => {
  if (!url) return false;
  return url.startsWith('http://') || url.startsWith('https://');
};

// ===============================
// URL GENERATION
// ===============================

/**
 * Get the base URL for media from environment
 * Falls back to localhost if not set
 */
const getMediaBaseUrl = () => {
  const envUrl = import.meta.env.VITE_MEDIA_BASE_URL;
  if (envUrl) {
    return envUrl.replace(/\/$/, ''); // Remove trailing slash
  }
  
  // Fallback: construct from API URL
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  return apiUrl.replace(/\/api$/, '') + '/uploads';
};

/**
 * Get the video base URL
 */
const getVideoBaseUrl = () => {
  const envUrl = import.meta.env.VITE_MEDIA_VIDEO_BASE_URL;
  if (envUrl) {
    return envUrl.replace(/\/$/, '');
  }
  return getMediaBaseUrl() + '/videos';
};

/**
 * Get the base URL from environment (legacy - kept for compatibility)
 */
const getBaseUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  return apiUrl.replace(/\/api$/, '');
};

/**
 * Generate a media URL
 * Supports:
 * - Cloudinary URLs (return as-is)
 * - Full HTTP/HTTPS URLs (return as-is)
 * - Local filenames (construct URL)
 * - Data URLs (return as-is)
 * - Blob URLs (return as-is)
 * 
 * @param {string} media - Filename, path, or full URL
 * @returns {string|null} - Full URL or null
 */
export const getImageUrl = (media) => {
  if (!media) return null;
  
  // Already a full URL (Cloudinary, HTTPS, etc.)
  if (isFullUrl(media)) {
    return media;
  }
  
  // Data URL or blob
  if (media.startsWith('data:image') || media.startsWith('blob:')) {
    return media;
  }
  
  // Already has /uploads/ prefix (from API response)
  if (media.startsWith('/uploads/')) {
    const baseUrl = getBaseUrl();
    return `${baseUrl}${media}`;
  }
  
  // Already has videos/ prefix
  if (media.startsWith('videos/')) {
    const baseUrl = getBaseUrl();
    return `${baseUrl}/uploads/${media}`;
  }
  
  // Check if it's a video file (for backward compatibility)
  const isVideo = media.match(/\.(mp4|mov|webm|avi|mkv|m4v|3gp|mpeg|mpg)$/i);
  if (isVideo) {
    // Try videos/ subfolder first
    const videoBaseUrl = getVideoBaseUrl();
    return `${videoBaseUrl}/${media}`;
  }
  
  // Default: /uploads/filename
  const mediaBaseUrl = getMediaBaseUrl();
  return `${mediaBaseUrl}/${media}`;
};

/**
 * Check if URL is a video file
 */
export const isVideoFile = (url) => {
  if (!url) return false;
  const videoExtensions = ['.mp4', '.mov', '.webm', '.avi', '.mkv', '.m4v', '.3gp', '.mpeg', '.mpg'];
  return videoExtensions.some(ext => url.toLowerCase().endsWith(ext));
};

/**
 * Check if URL is an image file
 */
export const isImageFile = (url) => {
  if (!url) return false;
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.bmp', '.ico'];
  return imageExtensions.some(ext => url.toLowerCase().endsWith(ext));
};

/**
 * Check if URL is from Cloudinary
 */
export const isCloudinary = (url) => {
  return isCloudinaryUrl(url);
};

// ===============================
// MEDIA HELPERS
// ===============================

/**
 * Get cover media URL from entity
 * Supports both local filenames and Cloudinary URLs
 */
export const getCoverMedia = (entity) => {
  if (!entity) return null;
  
  if (entity.coverMedia) {
    return getImageUrl(entity.coverMedia);
  }
  if (entity.coverImage) {
    return getImageUrl(entity.coverImage);
  }
  if (entity.galleryImages && entity.galleryImages.length > 0) {
    return getImageUrl(entity.galleryImages[0]);
  }
  if (entity.images && entity.images.length > 0) {
    return getImageUrl(entity.images[0]);
  }
  if (entity.image) {
    return getImageUrl(entity.image);
  }
  return null;
};

/**
 * Get cover media type from entity
 */
export const getCoverMediaType = (entity) => {
  if (!entity) return 'image';
  
  if (entity.coverMediaType === 'video') return 'video';
  if (entity.coverMediaType === 'image') return 'image';
  
  // Check if coverMedia is a video (using filename or URL)
  if (entity.coverMedia && isVideoFile(entity.coverMedia)) return 'video';
  if (entity.videos && entity.videos.length > 0) return 'video';
  
  if (entity.galleryImages && entity.galleryImages.length > 0) {
    for (const img of entity.galleryImages) {
      if (isVideoFile(img)) return 'video';
    }
  }
  
  return 'image';
};

/**
 * Get cover video URL from entity
 */
export const getCoverVideo = (entity) => {
  if (!entity) return null;
  
  if (entity.coverMediaType === 'video' && entity.coverMedia) {
    return getImageUrl(entity.coverMedia);
  }
  if (entity.coverMedia && isVideoFile(entity.coverMedia)) {
    return getImageUrl(entity.coverMedia);
  }
  if (entity.videos && entity.videos.length > 0) {
    return getImageUrl(entity.videos[0]);
  }
  if (entity.galleryImages && entity.galleryImages.length > 0) {
    for (const img of entity.galleryImages) {
      if (isVideoFile(img)) {
        return getImageUrl(img);
      }
    }
  }
  return null;
};

/**
 * Get media with placeholder fallback
 */
export const getMediaWithPlaceholder = (entity) => {
  const url = getCoverMedia(entity);
  return url || PLACEHOLDER_IMAGE;
};

/**
 * Get complete entity media object
 */
export const getEntityMedia = (entity) => {
  if (!entity) {
    return {
      url: PLACEHOLDER_IMAGE,
      type: 'image',
      isVideo: false,
      videoUrl: null,
      poster: PLACEHOLDER_IMAGE,
      thumbnail: PLACEHOLDER_IMAGE,
      isCloudinary: false,
    };
  }
  
  const coverType = getCoverMediaType(entity);
  const coverUrl = getCoverMedia(entity);
  const videoUrl = getCoverVideo(entity);
  const poster = coverUrl || PLACEHOLDER_IMAGE;
  const isCloudinaryMedia = isCloudinaryUrl(coverUrl) || isCloudinaryUrl(videoUrl);
  
  if (coverType === 'video' && videoUrl) {
    return {
      url: videoUrl,
      type: 'video',
      isVideo: true,
      videoUrl: videoUrl,
      poster: poster,
      thumbnail: poster,
      isCloudinary: isCloudinaryMedia,
    };
  }
  
  return {
    url: coverUrl || PLACEHOLDER_IMAGE,
    type: 'image',
    isVideo: false,
    videoUrl: null,
    poster: coverUrl || PLACEHOLDER_IMAGE,
    thumbnail: coverUrl || PLACEHOLDER_IMAGE,
    isCloudinary: isCloudinaryMedia,
  };
};

/**
 * Get video poster image
 */
export const getVideoPoster = (entity) => {
  if (!entity) return PLACEHOLDER_IMAGE;
  
  if (entity.coverMedia) {
    return getImageUrl(entity.coverMedia);
  }
  if (entity.coverImage) {
    return getImageUrl(entity.coverImage);
  }
  if (entity.galleryImages && entity.galleryImages.length > 0) {
    return getImageUrl(entity.galleryImages[0]);
  }
  return PLACEHOLDER_IMAGE;
};

/**
 * Check if entity has video
 */
export const hasVideo = (entity) => {
  if (!entity) return false;
  if (entity.coverMediaType === 'video') return true;
  if (entity.coverMedia && isVideoFile(entity.coverMedia)) return true;
  if (entity.videos && entity.videos.length > 0) return true;
  if (entity.galleryImages && entity.galleryImages.length > 0) {
    for (const img of entity.galleryImages) {
      if (isVideoFile(img)) return true;
    }
  }
  return false;
};

/**
 * Get all video URLs from entity
 */
export const getAllVideos = (entity) => {
  if (!entity) return [];
  
  const videos = [];
  
  if (entity.coverMediaType === 'video' && entity.coverMedia) {
    videos.push(getImageUrl(entity.coverMedia));
  }
  if (entity.coverMedia && isVideoFile(entity.coverMedia)) {
    const url = getImageUrl(entity.coverMedia);
    if (!videos.includes(url)) videos.push(url);
  }
  if (entity.videos && entity.videos.length > 0) {
    entity.videos.forEach(v => {
      const url = getImageUrl(v);
      if (!videos.includes(url)) videos.push(url);
    });
  }
  if (entity.galleryImages && entity.galleryImages.length > 0) {
    entity.galleryImages.forEach(img => {
      if (isVideoFile(img)) {
        const url = getImageUrl(img);
        if (!videos.includes(url)) videos.push(url);
      }
    });
  }
  
  return videos;
};

/**
 * Get all image URLs from entity
 */
export const getAllImages = (entity) => {
  if (!entity) return [];
  
  const images = [];
  
  if (entity.coverMediaType !== 'video' && entity.coverMedia) {
    images.push(getImageUrl(entity.coverMedia));
  }
  if (entity.coverImage && entity.coverMediaType !== 'video') {
    const url = getImageUrl(entity.coverImage);
    if (!images.includes(url)) images.push(url);
  }
  if (entity.galleryImages && entity.galleryImages.length > 0) {
    entity.galleryImages.forEach(img => {
      if (!isVideoFile(img)) {
        const url = getImageUrl(img);
        if (!images.includes(url)) images.push(url);
      }
    });
  }
  
  return images;
};

export default {
  getImageUrl,
  isVideoFile,
  isImageFile,
  isCloudinary,
  getCoverMedia,
  getCoverMediaType,
  getCoverVideo,
  getMediaWithPlaceholder,
  getEntityMedia,
  getVideoPoster,
  hasVideo,
  getAllVideos,
  getAllImages,
};