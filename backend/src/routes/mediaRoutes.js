// backend/src/routes/mediaRoutes.js
// ✅ Media Upload Routes - Direct Cloudinary uploads

import express from 'express';
import { AuthMiddleware } from '../middleware/auth.middleware.js';
import { uploadMiddleware, handleUploadError } from '../middleware/upload.js';
import {
  uploadImage,
  uploadVideo,
  uploadMultipleImages,
  uploadMultipleVideos,
  deleteMedia,
} from '../controllers/mediaController.js';

const router = express.Router();

// ✅ All routes require authentication
router.use(AuthMiddleware.authenticate);

// ✅ Single image upload
router.post(
  '/upload/image',
  uploadMiddleware.single('image'),
  handleUploadError,
  uploadImage
);

// ✅ Single video upload
router.post(
  '/upload/video',
  uploadMiddleware.single('video'),
  handleUploadError,
  uploadVideo
);

// ✅ Multiple images upload
router.post(
  '/upload/images',
  uploadMiddleware.array('images', 20),
  handleUploadError,
  uploadMultipleImages
);

// ✅ Multiple videos upload
router.post(
  '/upload/videos',
  uploadMiddleware.array('videos', 5),
  handleUploadError,
  uploadMultipleVideos
);

// ✅ Delete media
router.delete('/delete/:publicId', deleteMedia);

export default router;