// backend/src/services/media/storage/index.js
// ✅ Storage Provider Factory

import mediaConfig from '../config.js';
import localStorageProvider from './localStorage.js';

// Future providers (stubs)
// import cloudinaryStorageProvider from './cloudinaryStorage.js';
// import s3StorageProvider from './s3Storage.js';

/**
 * Get the configured storage provider
 * @returns {Object} - Storage provider
 */
export const getStorageProvider = () => {
  const provider = mediaConfig.provider || 'local';
  
  switch (provider) {
    case 'local':
      return localStorageProvider;
    // case 'cloudinary':
    //   return cloudinaryStorageProvider;
    // case 's3':
    //   return s3StorageProvider;
    default:
      return localStorageProvider;
  }
};

/**
 * Get storage provider by name
 * @param {string} name - Provider name
 * @returns {Object} - Storage provider
 */
export const getStorageProviderByName = (name) => {
  switch (name) {
    case 'local':
      return localStorageProvider;
    // case 'cloudinary':
    //   return cloudinaryStorageProvider;
    // case 's3':
    //   return s3StorageProvider;
    default:
      return localStorageProvider;
  }
};

export default {
  getStorageProvider,
  getStorageProviderByName,
};