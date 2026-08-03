// backend/src/services/media/config.js
// ✅ Media Configuration - Centralized settings
// ✅ ADDED: Cloudinary configuration

import dotenv from 'dotenv';
dotenv.config();

export const mediaConfig = {
  // Storage provider: 'local', 'cloudinary', 's3'
  provider: process.env.MEDIA_PROVIDER || 'local',
  
  // Base URLs for media (local fallback)
  baseUrl: process.env.MEDIA_BASE_URL || 'http://localhost:5000/uploads',
  videoBaseUrl: process.env.MEDIA_VIDEO_BASE_URL || 'http://localhost:5000/uploads/videos',
  
  // Upload paths (local storage)
  uploadPath: process.env.MEDIA_UPLOAD_PATH || './uploads',
  videoUploadPath: process.env.MEDIA_VIDEO_UPLOAD_PATH || './uploads/videos',
  
  // File restrictions
  maxFileSize: parseInt(process.env.MEDIA_MAX_SIZE) || 50 * 1024 * 1024, // 50MB
  allowedImageTypes: (process.env.MEDIA_ALLOWED_IMAGE_TYPES || 'image/jpeg,image/png,image/webp,image/gif').split(','),
  allowedVideoTypes: (process.env.MEDIA_ALLOWED_VIDEO_TYPES || 'video/mp4,video/webm,video/quicktime').split(','),
  allowedDocumentTypes: (process.env.MEDIA_ALLOWED_DOCUMENT_TYPES || 'application/pdf').split(','),
  
  // Image settings
  imageMaxSize: parseInt(process.env.MEDIA_IMAGE_MAX_SIZE) || 15 * 1024 * 1024, // 15MB
  videoMaxSize: parseInt(process.env.MEDIA_VIDEO_MAX_SIZE) || 500 * 1024 * 1024, // 500MB
  
  // Thumbnail settings
  thumbnailEnabled: process.env.MEDIA_THUMBNAIL_ENABLED !== 'false',
  thumbnailWidth: parseInt(process.env.MEDIA_THUMBNAIL_WIDTH) || 1280,
  thumbnailHeight: parseInt(process.env.MEDIA_THUMBNAIL_HEIGHT) || 720,
  thumbnailQuality: parseInt(process.env.MEDIA_THUMBNAIL_QUALITY) || 80,
  
  // =========================
  // ✅ CLOUDINARY CONFIGURATION
  // =========================
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || 'dw6po8hag',
    apiKey: process.env.CLOUDINARY_API_KEY || '924138582998116',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
    folder: process.env.CLOUDINARY_FOLDER || 'ai-tour',
    
    // Default transformations
    imageTransformation: [
      { quality: 'auto:good' },
      { fetch_format: 'auto' },
    ],
    videoTransformation: [
      { quality: 'auto' },
      { format: 'mp4' },
    ],
    
    // Thumbnail settings
    thumbnail: {
      width: 1280,
      height: 720,
      crop: 'fill',
      quality: 'auto',
      format: 'jpg',
    },
    
    // Optimized image settings
    optimized: {
      width: 800,
      height: 600,
      crop: 'limit',
      quality: 'auto:good',
      format: 'auto',
    },
  },
  
  // =========================
  // AWS S3 (future)
  // =========================
  s3: {
    region: process.env.AWS_REGION || '',
    bucket: process.env.AWS_S3_BUCKET || '',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
};

export default mediaConfig;