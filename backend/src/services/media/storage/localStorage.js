// backend/src/services/media/storage/localStorage.js
// ✅ Local Storage Provider - Current filesystem storage

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mediaConfig from '../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve absolute paths
const resolvePath = (relativePath) => {
  if (path.isAbsolute(relativePath)) return relativePath;
  return path.join(__dirname, '../../../..', relativePath);
};

const uploadPath = resolvePath(mediaConfig.uploadPath);
const videoUploadPath = resolvePath(mediaConfig.videoUploadPath);

// Ensure directories exist
const ensureDirectory = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`📁 Created directory: ${dirPath}`);
  }
  return dirPath;
};

ensureDirectory(uploadPath);
ensureDirectory(videoUploadPath);

/**
 * Local Storage Provider
 */
export const localStorageProvider = {
  name: 'local',
  
  /**
   * Save a file to local storage
   * @param {Object} file - Multer file object
   * @param {Object} options - { type: 'image'|'video' }
   * @returns {Promise<Object>} - Saved file info
   */
  async save(file, options = {}) {
    const { type = 'image' } = options;
    
    // Determine destination
    const isVideo = type === 'video' || file.mimetype?.startsWith('video/');
    const destDir = isVideo ? videoUploadPath : uploadPath;
    
    // Ensure directory exists
    ensureDirectory(destDir);
    
    // Generate unique filename
    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const filename = `${timestamp}-${random}${ext}`;
    const filePath = path.join(destDir, filename);
    
    // Move file to destination
    // Multer already saved the file, we just need to track it
    // If file has a path property, it was saved by multer
    if (file.path && file.path !== filePath) {
      // Check if source exists
      if (fs.existsSync(file.path)) {
        // Ensure destination directory exists
        ensureDirectory(path.dirname(filePath));
        // Move file
        fs.renameSync(file.path, filePath);
        console.log(`📦 Moved file to: ${filePath}`);
      } else {
        // If source doesn't exist, use the filename from multer
        const multerFilename = file.filename || filename;
        return {
          filename: multerFilename,
          path: path.join(destDir, multerFilename),
          url: isVideo 
            ? `${mediaConfig.videoBaseUrl}/${multerFilename}`
            : `${mediaConfig.baseUrl}/${multerFilename}`,
          provider: 'local',
          type: isVideo ? 'video' : 'image',
          size: file.size,
          mimetype: file.mimetype,
        };
      }
    }
    
    // Check if file exists at destination
    if (!fs.existsSync(filePath)) {
      // If file doesn't exist at destination, use multer's filename
      const multerFilename = file.filename || filename;
      return {
        filename: multerFilename,
        path: path.join(destDir, multerFilename),
        url: isVideo 
          ? `${mediaConfig.videoBaseUrl}/${multerFilename}`
          : `${mediaConfig.baseUrl}/${multerFilename}`,
        provider: 'local',
        type: isVideo ? 'video' : 'image',
        size: file.size,
        mimetype: file.mimetype,
      };
    }
    
    return {
      filename,
      path: filePath,
      url: isVideo 
        ? `${mediaConfig.videoBaseUrl}/${filename}`
        : `${mediaConfig.baseUrl}/${filename}`,
      provider: 'local',
      type: isVideo ? 'video' : 'image',
      size: file.size,
      mimetype: file.mimetype,
    };
  },
  
  /**
   * Delete a file from local storage
   * @param {string} filename - The filename to delete
   * @param {Object} options - { type: 'image'|'video' }
   * @returns {Promise<boolean>} - True if deleted
   */
  async delete(filename, options = {}) {
    if (!filename) return false;
    
    const { type = 'image' } = options;
    
    // Try both paths
    const pathsToTry = [];
    const isVideo = type === 'video' || filename.match(/\.(mp4|mov|webm|avi|mkv|m4v|3gp|mpeg|mpg)$/i);
    
    if (isVideo) {
      pathsToTry.push(path.join(videoUploadPath, filename));
    }
    // Always try the main upload path too (for files without subfolder)
    pathsToTry.push(path.join(uploadPath, filename));
    // Also try the video path if not already included
    if (!isVideo) {
      pathsToTry.push(path.join(videoUploadPath, filename));
    }
    
    for (const filePath of pathsToTry) {
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          console.log(`🗑️ Deleted file: ${filename}`);
          return true;
        } catch (error) {
          console.error(`❌ Failed to delete ${filename}:`, error.message);
        }
      }
    }
    
    console.warn(`⚠️ File not found for deletion: ${filename}`);
    return false;
  },
  
  /**
   * Check if a file exists
   * @param {string} filename - The filename
   * @param {Object} options - { type: 'image'|'video' }
   * @returns {Promise<boolean>} - True if exists
   */
  async exists(filename, options = {}) {
    if (!filename) return false;
    
    const { type = 'image' } = options;
    const isVideo = type === 'video' || filename.match(/\.(mp4|mov|webm|avi|mkv|m4v|3gp|mpeg|mpg)$/i);
    
    const pathsToTry = [];
    if (isVideo) {
      pathsToTry.push(path.join(videoUploadPath, filename));
    }
    pathsToTry.push(path.join(uploadPath, filename));
    if (!isVideo) {
      pathsToTry.push(path.join(videoUploadPath, filename));
    }
    
    for (const filePath of pathsToTry) {
      if (fs.existsSync(filePath)) {
        return true;
      }
    }
    return false;
  },
  
  /**
   * Get file info
   * @param {string} filename - The filename
   * @param {Object} options - { type: 'image'|'video' }
   * @returns {Promise<Object|null>} - File info or null
   */
  async getInfo(filename, options = {}) {
    if (!filename) return null;
    
    const { type = 'image' } = options;
    const isVideo = type === 'video' || filename.match(/\.(mp4|mov|webm|avi|mkv|m4v|3gp|mpeg|mpg)$/i);
    
    const pathsToTry = [];
    if (isVideo) {
      pathsToTry.push(path.join(videoUploadPath, filename));
    }
    pathsToTry.push(path.join(uploadPath, filename));
    if (!isVideo) {
      pathsToTry.push(path.join(videoUploadPath, filename));
    }
    
    for (const filePath of pathsToTry) {
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        return {
          filename,
          path: filePath,
          exists: true,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime,
          provider: 'local',
          type: isVideo ? 'video' : 'image',
          url: isVideo 
            ? `${mediaConfig.videoBaseUrl}/${filename}`
            : `${mediaConfig.baseUrl}/${filename}`,
        };
      }
    }
    return null;
  },
};

export default localStorageProvider;