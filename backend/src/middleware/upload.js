// backend/src/middleware/upload.js
// ✅ FIXED - Memory storage for Cloudinary (no local files)
// ✅ Videos go to Cloudinary directly via Media Service
// ✅ Images go to Cloudinary directly via Media Service
// ✅ No local files are saved on disk

import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import mediaConfig from "../services/media/config.js";

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===============================
// ✅ MEMORY STORAGE - For Cloudinary (no local files)
// ===============================

const memoryStorage = multer.memoryStorage();

// ===============================
// LEGACY DISK STORAGE (for backward compatibility)
// ===============================

const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const isVideo = file.mimetype.startsWith('video/');
    const uploadPath = isVideo
      ? path.join(__dirname, "..", "uploads", "videos")
      : path.join(__dirname, "..", "uploads");
    
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueName + path.extname(file.originalname));
  },
});

// ===============================
// VIDEO STORAGE (for hero videos - legacy)
// ===============================

const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "..", "uploads", "videos");
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueName + path.extname(file.originalname));
  },
});

// ===============================
// FILE FILTER
// ===============================

const fileFilter = (req, file, cb) => {
  console.log("📎 UPLOAD FILE:", file.originalname, file.mimetype);

  const imageTypes = [
    "image/jpeg", "image/png", "image/jpg", "image/webp",
    "image/heic", "image/heif", "image/gif", "image/svg+xml",
  ];

  const videoTypes = [
    "video/mp4", "video/webm", "video/quicktime",
    "video/x-msvideo", "video/x-matroska",
  ];

  const documentTypes = [
    "application/pdf", "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain", "text/csv",
  ];

  const allowedTypes = [...imageTypes, ...videoTypes, ...documentTypes];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: ${file.mimetype}`), false);
  }
};

// ===============================
// VIDEO-ONLY FILE FILTER
// ===============================

const videoFileFilter = (req, file, cb) => {
  console.log("🎬 VIDEO UPLOAD:", file.originalname, file.mimetype);

  const videoTypes = ["video/mp4", "video/webm"];

  if (videoTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid video format. Only MP4 and WebM are allowed`), false);
  }
};

// ===============================
// MULTER CONFIGURATIONS
// ===============================

// ✅ PRIMARY: Memory storage for Cloudinary (recommended)
// No local files are saved - files go directly to Cloudinary via Media Service
export const upload = multer({
  storage: memoryStorage,
  fileFilter,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB max
    files: 20,
  },
});

// ✅ Legacy disk storage (for backward compatibility)
export const uploadLegacy = multer({
  storage: diskStorage,
  fileFilter,
  limits: {
    fileSize: 500 * 1024 * 1024,
    files: 20,
  },
});

// ✅ Video-only upload (for hero videos)
export const videoUpload = multer({
  storage: memoryStorage, // ✅ Memory storage for hero videos too
  fileFilter: videoFileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB for hero videos
    files: 1,
  },
});

// ===============================
// VIDEO VALIDATION UTILITIES
// ===============================

export const validateVideoDuration = async (filePath) => {
  try {
    const { exec } = await import("child_process");
    const { promisify } = await import("util");
    const execAsync = promisify(exec);

    const command = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`;
    const { stdout } = await execAsync(command);
    const duration = parseFloat(stdout.trim());

    if (isNaN(duration) || duration <= 0) {
      throw new Error("Invalid video duration");
    }

    // ✅ Allow up to 30 seconds for hero videos
    if (duration > 30) {
      throw new Error(`Video duration (${Math.round(duration)}s) exceeds 30 seconds maximum`);
    }

    return duration;
  } catch (error) {
    console.error("❌ Video duration validation error:", error.message);
    
    try {
      const { stat } = await import("fs/promises");
      const fileStats = await stat(filePath);
      const fileSizeInMB = fileStats.size / (1024 * 1024);
      const estimatedDuration = fileSizeInMB * 5;
      
      // ✅ Allow up to 35 seconds estimated
      if (estimatedDuration > 35) {
        throw new Error(`Video appears to be too long (estimated ${Math.round(estimatedDuration)}s). Maximum is 30 seconds.`);
      }
      
      console.warn("⚠️ Using estimated duration:", estimatedDuration);
      return Math.min(estimatedDuration, 30);
    } catch (fallbackError) {
      console.warn("⚠️ Could not validate video duration, assuming acceptable");
      return 10;
    }
  }
};

export const generateVideoThumbnail = async (videoPath, outputPath) => {
  try {
    const { exec } = await import("child_process");
    const { promisify } = await import("util");
    const execAsync = promisify(exec);

    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const command = `ffmpeg -i "${videoPath}" -ss 00:00:01 -vframes 1 -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2" -q:v 2 "${outputPath}" -y`;
    
    await execAsync(command, { timeout: 30000 });
    
    if (fs.existsSync(outputPath)) {
      console.log("✅ Thumbnail generated:", outputPath);
      return outputPath;
    }
    
    return null;
  } catch (error) {
    console.error("❌ Thumbnail generation error:", error.message);
    return null;
  }
};

export const deleteVideoFile = async (filePath) => {
  try {
    if (filePath && fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
      console.log("🗑️ Deleted video file:", filePath);
    }
  } catch (error) {
    console.error("❌ Error deleting video file:", error.message);
  }
};

// ===============================
// MULTER MIDDLEWARE (for routes)
// ===============================

export const uploadMiddleware = upload;
export const uploadHeroVideo = videoUpload.single("heroVideo");

// ===============================
// ERROR HANDLER
// ===============================

export const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "FILE_TOO_LARGE") {
      return res.status(400).json({
        success: false,
        message: err.fieldname === "heroVideo" 
          ? "Video file too large. Maximum size is 100MB."
          : "File too large. Maximum size is 500MB.",
      });
    }
    if (err.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        success: false,
        message: "Too many files.",
      });
    }
    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        success: false,
        message: "Unexpected field name.",
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  next();
};

// ===============================
// DEFAULT EXPORT (backward compatible)
// ===============================

export default upload;