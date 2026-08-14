// backend/src/services/media/storage/cloudinaryStorage.js
// ✅ Cloudinary Storage Provider - Production media storage
// ✅ Fixed: Cloudinary video thumbnail startOffset (so_)
// ✅ Fixed: Cloudinary public ID extraction for delete()
// ✅ Fixed: Video/image transformed URLs
// ✅ Added: Cloudinary upload/delete/getInfo timeouts

import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";
import fs from "fs";
import path from "path";
import mediaConfig from "../config.js";

// ============================================================
// CLOUDINARY CONFIGURATION
// ============================================================

cloudinary.config({
  cloud_name: mediaConfig.cloudinary.cloudName,
  api_key: mediaConfig.cloudinary.apiKey,
  api_secret: mediaConfig.cloudinary.apiSecret,
  secure: true,
  timeout: 120000,
});

// ============================================================
// UPLOAD TO CLOUDINARY
// ============================================================

/**
 * Upload a file to Cloudinary from buffer, stream, or file path.
 *
 * @param {Buffer|Stream|string} fileData
 * @param {Object} options
 * @returns {Promise<Object>}
 */
const uploadToCloudinary = (fileData, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder: options.folder || "ai-tour",
      resource_type: options.resource_type || "auto",
      public_id: options.public_id || undefined,
      overwrite: options.overwrite !== false,
      invalidate: options.invalidate !== false,
      transformation: options.transformation || [],
      timeout: 120000,
      ...options.extraOptions,
    };

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          console.error("❌ Cloudinary upload error:", error);
          reject(error);
          return;
        }

        console.log(
          "✅ Cloudinary upload success:",
          result?.secure_url
        );

        resolve(result);
      }
    );

    // --------------------------------------------------------
    // Buffer
    // --------------------------------------------------------

    if (Buffer.isBuffer(fileData)) {
      const readableStream = streamifier.createReadStream(fileData);
      readableStream.pipe(uploadStream);
      return;
    }

    // --------------------------------------------------------
    // Node Stream
    // --------------------------------------------------------

    if (
      fileData &&
      typeof fileData.pipe === "function"
    ) {
      fileData.pipe(uploadStream);
      return;
    }

    // --------------------------------------------------------
    // File Path
    // --------------------------------------------------------

    if (
      typeof fileData === "string" &&
      fs.existsSync(fileData)
    ) {
      const fileStream = fs.createReadStream(fileData);

      fileStream.on("error", (error) => {
        reject(error);
      });

      fileStream.pipe(uploadStream);
      return;
    }

    // --------------------------------------------------------
    // Object with path
    // --------------------------------------------------------

    if (
      fileData &&
      fileData.path &&
      fs.existsSync(fileData.path)
    ) {
      const fileStream = fs.createReadStream(fileData.path);

      fileStream.on("error", (error) => {
        reject(error);
      });

      fileStream.pipe(uploadStream);
      return;
    }

    // --------------------------------------------------------
    // Object with buffer
    // --------------------------------------------------------

    if (fileData && Buffer.isBuffer(fileData.buffer)) {
      const readableStream = streamifier.createReadStream(
        fileData.buffer
      );

      readableStream.pipe(uploadStream);
      return;
    }

    reject(new Error("Unsupported file data format"));
  });
};

// ============================================================
// FOLDER HELPER
// ============================================================

/**
 * Determine Cloudinary folder based on file type.
 *
 * Video:
 * ai-tour/videos/{category}
 *
 * Image:
 * ai-tour/images/{category}
 */
const getFolder = (type, category = "") => {
  const baseFolder =
    mediaConfig.cloudinary.folder || "ai-tour";

  const subFolder =
    type === "video" ? "videos" : "images";

  return category
    ? `${baseFolder}/${subFolder}/${category}`
    : `${baseFolder}/${subFolder}`;
};

// ============================================================
// RESOURCE TYPE HELPER
// ============================================================

const getResourceType = (type, mimetype) => {
  if (type === "video") {
    return "video";
  }

  if (
    mimetype &&
    mimetype.startsWith("video/")
  ) {
    return "video";
  }

  return "image";
};

// ============================================================
// EXTRACT CLOUDINARY PUBLIC ID
// ============================================================

/**
 * Extract the complete public_id from a Cloudinary URL.
 *
 * Example:
 *
 * https://res.cloudinary.com/demo/video/upload/v123/
 * ai-tour/videos/hero-videos/my-video.mp4
 *
 * returns:
 *
 * ai-tour/videos/hero-videos/my-video
 */
const extractCloudinaryPublicId = (fileUrl) => {
  if (!fileUrl) {
    return null;
  }

  if (
    !fileUrl.startsWith("http://") &&
    !fileUrl.startsWith("https://")
  ) {
    return fileUrl;
  }

  try {
    const parsedUrl = new URL(fileUrl);

    const pathname = parsedUrl.pathname;

    const uploadMarker = "/upload/";

    const uploadIndex = pathname.indexOf(uploadMarker);

    if (uploadIndex === -1) {
      return null;
    }

    let publicPath = pathname.substring(
      uploadIndex + uploadMarker.length
    );

    // --------------------------------------------------------
    // Remove transformations
    // --------------------------------------------------------

    const segments = publicPath.split("/");

    while (
      segments.length > 0 &&
      (
        segments[0].startsWith("w_") ||
        segments[0].startsWith("h_") ||
        segments[0].startsWith("c_") ||
        segments[0].startsWith("q_") ||
        segments[0].startsWith("f_") ||
        segments[0].startsWith("so_") ||
        segments[0].startsWith("e_") ||
        segments[0].startsWith("g_") ||
        segments[0].startsWith("a_") ||
        segments[0].startsWith("o_") ||
        segments[0].startsWith("br_") ||
        segments[0].startsWith("sa_") ||
        segments[0].startsWith("co_") ||
        segments[0].startsWith("sh_") ||
        segments[0].startsWith("r_") ||
        segments[0].startsWith("bo_")
      )
    ) {
      segments.shift();
    }

    publicPath = segments.join("/");

    // --------------------------------------------------------
    // Remove version segment
    // --------------------------------------------------------

    publicPath = publicPath.replace(
      /^v\d+\//,
      ""
    );

    // --------------------------------------------------------
    // Remove extension
    // --------------------------------------------------------

    publicPath = publicPath.replace(
      /\.(mp4|webm|mov|avi|mkv|jpg|jpeg|png|webp|gif)$/i,
      ""
    );

    return publicPath || null;
  } catch (error) {
    console.warn(
      "⚠️ Failed to extract Cloudinary public ID:",
      error.message
    );

    return null;
  }
};

// ============================================================
// CLOUDINARY STORAGE PROVIDER
// ============================================================

export const cloudinaryStorageProvider = {
  name: "cloudinary",

  // ==========================================================
  // SAVE
  // ==========================================================

  /**
   * Save a file to Cloudinary.
   *
   * @param {Object} file
   * @param {Object} options
   * @returns {Promise<Object>}
   */
  async save(file, options = {}) {
    if (!file) {
      throw new Error("No file provided");
    }

    const {
      type = "image",
      category = "",
      publicId = null,
      transformation = [],
    } = options;

    const isVideo =
      type === "video" ||
      (
        file.mimetype &&
        file.mimetype.startsWith("video/")
      );

    const resourceType = getResourceType(
      type,
      file.mimetype
    );

    const folder = getFolder(
      isVideo ? "video" : "image",
      category
    );

    // --------------------------------------------------------
    // Generate Public ID
    // --------------------------------------------------------

    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1e9);

    const ext = file.originalname
      ? path.extname(file.originalname)
      : "";

    const baseName = file.originalname
      ? path.basename(file.originalname, ext)
      : "file";

    const safeBaseName = baseName
      .replace(/[^a-zA-Z0-9_-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    const finalPublicId =
      publicId ||
      `${safeBaseName || "file"}-${timestamp}-${random}`;

    // --------------------------------------------------------
    // Upload Options
    // --------------------------------------------------------

    const uploadOptions = {
      folder,
      public_id: finalPublicId,
      resource_type: resourceType,
      overwrite: true,
      invalidate: true,
      transformation: Array.isArray(transformation)
        ? transformation
        : [],
      timeout: 120000,
    };

    // --------------------------------------------------------
    // Image transformations
    // --------------------------------------------------------

    if (
      resourceType === "image" &&
      mediaConfig.cloudinary.imageTransformation
    ) {
      uploadOptions.transformation = [
        ...uploadOptions.transformation,
        ...mediaConfig.cloudinary.imageTransformation,
      ];
    }

    // --------------------------------------------------------
    // Video transformations
    // --------------------------------------------------------

    if (
      resourceType === "video" &&
      mediaConfig.cloudinary.videoTransformation
    ) {
      uploadOptions.transformation = [
        ...uploadOptions.transformation,
        ...mediaConfig.cloudinary.videoTransformation,
      ];
    }

    // --------------------------------------------------------
    // Get File Data
    // --------------------------------------------------------

    let fileData;

    if (
      file.path &&
      fs.existsSync(file.path)
    ) {
      fileData = file.path;
    } else if (file.buffer) {
      fileData = file.buffer;
    } else if (file.stream) {
      fileData = file.stream;
    } else {
      throw new Error(
        "Unsupported file format"
      );
    }

    // --------------------------------------------------------
    // Upload
    // --------------------------------------------------------

    const result = await uploadToCloudinary(
      fileData,
      uploadOptions
    );

    if (!result) {
      throw new Error(
        "Cloudinary upload returned no result"
      );
    }

    // --------------------------------------------------------
    // Return Normalized Result
    // --------------------------------------------------------

    return {
      filename: result.public_id,
      url: result.secure_url,
      provider: "cloudinary",
      type: isVideo ? "video" : "image",
      size:
        result.bytes ||
        file.size ||
        0,

      mimetype:
        file.mimetype ||
        "",

      cloudinary: {
        publicId: result.public_id,
        version: result.version,
        format: result.format,
        width: result.width,
        height: result.height,
        duration: result.duration,
        bytes: result.bytes,
        url: result.secure_url,
        originalUrl: result.url,
        assetId: result.asset_id,
        etag: result.etag,
      },
    };
  },

  // ==========================================================
  // SAVE MULTIPLE
  // ==========================================================

  async saveMultiple(files, options = {}) {
    if (
      !files ||
      files.length === 0
    ) {
      return [];
    }

    const results = [];

    for (const file of files) {
      try {
        const result =
          await this.save(file, options);

        results.push(result);
      } catch (error) {
        console.error(
          "❌ Failed to save file to Cloudinary:",
          error.message
        );

        results.push({
          error: error.message,
          filename:
            file.originalname ||
            "unknown",
        });
      }
    }

    return results;
  },

  // ==========================================================
  // DELETE
  // ==========================================================

  /**
   * Delete a Cloudinary asset.
   *
   * Accepts either:
   *
   * - public_id
   * - full Cloudinary URL
   */
  async delete(publicId, options = {}) {
    if (!publicId) {
      return false;
    }

    const {
      type = "image",
    } = options;

    const resourceType =
      getResourceType(type);

    let id =
      extractCloudinaryPublicId(publicId);

    if (!id) {
      id = publicId;
    }

    try {
      const result =
        await cloudinary.uploader.destroy(
          id,
          {
            resource_type: resourceType,
            invalidate: true,
            timeout: 60000,
          }
        );

      if (result.result === "ok") {
        console.log(
          `🗑️ Deleted from Cloudinary: ${id}`
        );

        return true;
      }

      if (
        result.result === "not found"
      ) {
        console.warn(
          `⚠️ File not found in Cloudinary: ${id}`
        );

        return true;
      }

      console.error(
        `❌ Failed to delete from Cloudinary: ${id}`,
        result
      );

      return false;
    } catch (error) {
      console.error(
        `❌ Cloudinary delete error for ${id}:`,
        error.message
      );

      return false;
    }
  },

  // ==========================================================
  // DELETE MULTIPLE
  // ==========================================================

  async deleteMultiple(
    publicIds,
    options = {}
  ) {
    if (
      !publicIds ||
      publicIds.length === 0
    ) {
      return [];
    }

    const results = [];

    for (const id of publicIds) {
      try {
        const result =
          await this.delete(id, options);

        results.push({
          publicId: id,
          success: result,
        });
      } catch (error) {
        results.push({
          publicId: id,
          success: false,
          error: error.message,
        });
      }
    }

    return results;
  },

  // ==========================================================
  // EXISTS
  // ==========================================================

  async exists(
    publicId,
    options = {}
  ) {
    if (!publicId) {
      return false;
    }

    const {
      type = "image",
    } = options;

    const resourceType =
      getResourceType(type);

    try {
      const result =
        await cloudinary.api.resource(
          publicId,
          {
            resource_type: resourceType,
            timeout: 60000,
          }
        );

      return !!result;
    } catch (error) {
      if (
        error.http_code === 404
      ) {
        return false;
      }

      console.error(
        "❌ Cloudinary exists check error:",
        error.message
      );

      return false;
    }
  },

  // ==========================================================
  // GET INFO
  // ==========================================================

  async getInfo(
    publicId,
    options = {}
  ) {
    if (!publicId) {
      return null;
    }

    const {
      type = "image",
    } = options;

    const resourceType =
      getResourceType(type);

    try {
      const result =
        await cloudinary.api.resource(
          publicId,
          {
            resource_type: resourceType,
            timeout: 60000,
          }
        );

      return {
        filename:
          result.public_id,

        url:
          result.secure_url,

        provider:
          "cloudinary",

        type:
          resourceType,

        size:
          result.bytes,

        created:
          result.created_at,

        cloudinary: {
          publicId:
            result.public_id,

          version:
            result.version,

          format:
            result.format,

          width:
            result.width,

          height:
            result.height,

          duration:
            result.duration,

          bytes:
            result.bytes,

          url:
            result.secure_url,
        },
      };
    } catch (error) {
      if (
        error.http_code === 404
      ) {
        return null;
      }

      console.error(
        "❌ Cloudinary getInfo error:",
        error.message
      );

      return null;
    }
  },

  // ==========================================================
  // GET TRANSFORMED URL
  // ==========================================================

  /**
   * Generate a Cloudinary transformed URL.
   *
   * Supports:
   *
   * width
   * height
   * crop
   * quality
   * format
   * startOffset
   * effect
   * gravity
   * angle
   * opacity
   * brightness
   * saturation
   * contrast
   * sharpness
   * blur
   * radius
   * border
   */
  getTransformedUrl(
    publicId,
    transformations = {},
    options = {}
  ) {
    if (!publicId) {
      return "";
    }

    const {
      type = "image",
    } = options;

    const resourceType =
      getResourceType(type);

    const trans = [];

    // --------------------------------------------------------
    // Dimensions
    // --------------------------------------------------------

    if (
      transformations.width
    ) {
      trans.push(
        `w_${transformations.width}`
      );
    }

    if (
      transformations.height
    ) {
      trans.push(
        `h_${transformations.height}`
      );
    }

    // --------------------------------------------------------
    // Crop
    // --------------------------------------------------------

    if (
      transformations.crop
    ) {
      trans.push(
        `c_${transformations.crop}`
      );
    }

    // --------------------------------------------------------
    // Quality
    // --------------------------------------------------------

    if (
      transformations.quality
    ) {
      trans.push(
        `q_${transformations.quality}`
      );
    }

    // --------------------------------------------------------
    // Format
    // --------------------------------------------------------

    if (
      transformations.format
    ) {
      trans.push(
        `f_${transformations.format}`
      );
    }

    // ========================================================
    // ✅ IMPORTANT VIDEO THUMBNAIL FIX
    // ========================================================

    /**
     * Cloudinary video start offset must be:
     *
     * so_1
     *
     * NOT:
     *
     * e_so_1
     */
    if (
      transformations.startOffset !== undefined &&
      transformations.startOffset !== null
    ) {
      trans.push(
        `so_${transformations.startOffset}`
      );
    }

    // --------------------------------------------------------
    // Effect
    // --------------------------------------------------------

    if (
      transformations.effect
    ) {
      trans.push(
        `e_${transformations.effect}`
      );
    }

    // --------------------------------------------------------
    // Gravity
    // --------------------------------------------------------

    if (
      transformations.gravity
    ) {
      trans.push(
        `g_${transformations.gravity}`
      );
    }

    // --------------------------------------------------------
    // Angle
    // --------------------------------------------------------

    if (
      transformations.angle !== undefined &&
      transformations.angle !== null
    ) {
      trans.push(
        `a_${transformations.angle}`
      );
    }

    // --------------------------------------------------------
    // Opacity
    // --------------------------------------------------------

    if (
      transformations.opacity !== undefined &&
      transformations.opacity !== null
    ) {
      trans.push(
        `o_${transformations.opacity}`
      );
    }

    // --------------------------------------------------------
    // Brightness
    // --------------------------------------------------------

    if (
      transformations.brightness !== undefined &&
      transformations.brightness !== null
    ) {
      trans.push(
        `br_${transformations.brightness}`
      );
    }

    // --------------------------------------------------------
    // Saturation
    // --------------------------------------------------------

    if (
      transformations.saturation !== undefined &&
      transformations.saturation !== null
    ) {
      trans.push(
        `sa_${transformations.saturation}`
      );
    }

    // --------------------------------------------------------
    // Contrast
    // --------------------------------------------------------

    if (
      transformations.contrast !== undefined &&
      transformations.contrast !== null
    ) {
      trans.push(
        `co_${transformations.contrast}`
      );
    }

    // --------------------------------------------------------
    // Sharpness
    // --------------------------------------------------------

    if (
      transformations.sharpness !== undefined &&
      transformations.sharpness !== null
    ) {
      trans.push(
        `sh_${transformations.sharpness}`
      );
    }

    // --------------------------------------------------------
    // Blur
    // --------------------------------------------------------

    if (
      transformations.blur !== undefined &&
      transformations.blur !== null
    ) {
      trans.push(
        `e_blur:${transformations.blur}`
      );
    }

    // --------------------------------------------------------
    // Radius
    // --------------------------------------------------------

    if (
      transformations.radius !== undefined &&
      transformations.radius !== null
    ) {
      trans.push(
        `r_${transformations.radius}`
      );
    }

    // --------------------------------------------------------
    // Border
    // --------------------------------------------------------

    if (
      transformations.border
    ) {
      trans.push(
        `bo_${transformations.border}`
      );
    }

    // --------------------------------------------------------
    // Build URL
    // --------------------------------------------------------

    const baseUrl =
      `https://res.cloudinary.com/${mediaConfig.cloudinary.cloudName}`;

    const typePath =
      resourceType === "video"
        ? "video/upload"
        : "image/upload";

    const transStr =
      trans.length > 0
        ? `${trans.join(",")}/`
        : "";

    return `${baseUrl}/${typePath}/${transStr}${publicId}`;
  },

  // ==========================================================
  // VIDEO THUMBNAIL
  // ==========================================================

  /**
   * Generate a thumbnail URL for a Cloudinary video.
   *
   * IMPORTANT:
   *
   * Uses:
   *
   * so_1
   *
   * instead of:
   *
   * e_so_1
   */
  getVideoThumbnail(
    publicId,
    options = {}
  ) {
    if (!publicId) {
      return "";
    }

    const time =
      options.time ?? 1;

    const width =
      options.width ?? 1280;

    const height =
      options.height ?? 720;

    return this.getTransformedUrl(
      publicId,
      {
        width,
        height,
        crop: "fill",
        quality: "auto",
        format: "jpg",

        // ✅ Cloudinary video start offset
        startOffset: time,
      },
      {
        type: "video",
      }
    );
  },

  // ==========================================================
  // OPTIMIZED IMAGE URL
  // ==========================================================

  /**
   * Generate an optimized image URL.
   */
  getOptimizedImageUrl(
    publicId,
    options = {}
  ) {
    if (!publicId) {
      return "";
    }

    const width =
      options.width || 800;

    const height =
      options.height || 600;

    const quality =
      options.quality || "auto";

    const format =
      options.format || "auto";

    const crop =
      options.crop || "limit";

    return this.getTransformedUrl(
      publicId,
      {
        width,
        height,
        crop,
        quality,
        format,
      },
      {
        type: "image",
      }
    );
  },
};

export default cloudinaryStorageProvider;
