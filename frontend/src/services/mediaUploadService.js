// frontend/src/services/mediaUploadService.js
// ✅ OPTIMIZED - Direct Cloudinary uploads with increased timeout

import API from './api';

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

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
      console.log(`⚠️ Upload attempt ${i + 1} failed:`, error.message);
      if (i < retries - 1) {
        const delay = RETRY_DELAY * (i + 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
};

// ============================================================
// ✅ UPLOAD SINGLE IMAGE
// ============================================================
export const uploadImage = async (file, onProgress, category = 'general') => {
  return withRetry(async () => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('category', category);

    const response = await API.post('/media/upload/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 300000, // ✅ 5 minutes
      onUploadProgress: (progress) => {
        if (typeof onProgress === 'function') {
          const percent = Math.round((progress.loaded * 100) / progress.total);
          onProgress(percent);
        }
      },
    });

    return response.data;
  });
};

// ============================================================
// ✅ UPLOAD SINGLE VIDEO
// ============================================================
export const uploadVideo = async (file, onProgress, category = 'general') => {
  return withRetry(async () => {
    const formData = new FormData();
    formData.append('video', file);
    formData.append('category', category);

    const response = await API.post('/media/upload/video', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 600000, // ✅ 10 minutes for videos
      onUploadProgress: (progress) => {
        if (typeof onProgress === 'function') {
          const percent = Math.round((progress.loaded * 100) / progress.total);
          onProgress(percent);
        }
      },
    });

    return response.data;
  });
};

// ============================================================
// ✅ UPLOAD MULTIPLE IMAGES
// ============================================================
export const uploadMultipleImages = async (files, onProgress, category = 'general') => {
  const results = [];
  let completed = 0;

  for (const file of files) {
    try {
      const result = await uploadImage(file, (percent) => {
        if (typeof onProgress === 'function') {
          const overall = Math.round(((completed + percent / 100) / files.length) * 100);
          onProgress(overall, completed, files.length, 'image');
        }
      }, category);
      results.push(result);
    } catch (error) {
      console.error('❌ Failed to upload image:', file.name, error.message);
      results.push({ error: error.message, filename: file.name });
    }
    completed++;
    if (typeof onProgress === 'function') {
      onProgress(Math.round((completed / files.length) * 100), completed, files.length, 'image');
    }
  }

  return results;
};

// ============================================================
// ✅ UPLOAD MULTIPLE VIDEOS
// ============================================================
export const uploadMultipleVideos = async (files, onProgress, category = 'general') => {
  const results = [];
  let completed = 0;

  for (const file of files) {
    try {
      const result = await uploadVideo(file, (percent) => {
        if (typeof onProgress === 'function') {
          const overall = Math.round(((completed + percent / 100) / files.length) * 100);
          onProgress(overall, completed, files.length, 'video');
        }
      }, category);
      results.push(result);
    } catch (error) {
      console.error('❌ Failed to upload video:', file.name, error.message);
      results.push({ error: error.message, filename: file.name });
    }
    completed++;
    if (typeof onProgress === 'function') {
      onProgress(Math.round((completed / files.length) * 100), completed, files.length, 'video');
    }
  }

  return results;
};

// ============================================================
// ✅ DELETE MEDIA
// ============================================================
export const deleteMedia = async (publicId) => {
  try {
    const response = await API.delete(`/media/delete/${publicId}`);
    return response.data;
  } catch (error) {
    console.error('❌ Delete media error:', error);
    throw error;
  }
};

// ============================================================
// ✅ UPLOAD COVER MEDIA
// ============================================================
export const uploadCoverMedia = async (file, onProgress, category = 'listings') => {
  const isVideo = file.type.startsWith('video/');
  const uploadFn = isVideo ? uploadVideo : uploadImage;
  const result = await uploadFn(file, onProgress, category);
  return {
    ...result,
    mediaType: isVideo ? 'video' : 'image',
  };
};

// ============================================================
// ✅ EXPORT
// ============================================================
export default {
  uploadImage,
  uploadVideo,
  uploadMultipleImages,
  uploadMultipleVideos,
  uploadCoverMedia,
  deleteMedia,
};