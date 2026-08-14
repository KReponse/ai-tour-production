// backend/src/services/media/storage/cloudinaryStorage.js
// ============================================================
// Cloudinary Storage Provider - Production Media Storage
// ============================================================
// FIXES:
// ✅ Correct Cloudinary video thumbnail transformation: so_1
// ✅ Supports video thumbnail generation with /video/upload/
// ✅ Correct Cloudinary URL construction
// ✅ Safer Cloudinary URL -> public_id extraction
// ✅ Correct deletion of videos and thumbnails
// ✅ Supports multer diskStorage, memoryStorage and streams
// ✅ 120s upload timeout
// ✅ 60s API/delete timeout
// ============================================================

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
// UPLOAD FILE TO CLOUDINARY
// ============================================================

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
      ...(options.extraOptions || {}),
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
          result.secure_url
        );

        resolve(result);
      }
    );

    // ----------------------------------------------------------
    // BUFFER
    // ----------------------------------------------------------

    if (Buffer.isBuffer(fileData)) {
      const bufferStream = streamifier.createReadStream(fileData);
      bufferStream.pipe(uploadStream);
      return;
    }

    // ----------------------------------------------------------
    // STREAM
    // ----------------------------------------------------------

    if (
      fileData &&
      typeof fileData.pipe === "function"
    ) {
      fileData.pipe(uploadStream);
      return;
    }

    // ----------------------------------------------------------
    // FILE PATH
    // ----------------------------------------------------------

    if (
      fileData &&
      fileData.path &&
      fs.existsSync(fileData.path)
    ) {
      const fileStream = fs.createReadStream(fileData.path);

      fileStream.on("error", (error) => {
        console.error(
          "❌ File stream error:",
          error.message
        );

        reject(error);
      });

      fileStream.pipe(uploadStream);
      return;
    }

    // ----------------------------------------------------------
    // STRING PATH
    // ----------------------------------------------------------

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

    reject(
      new Error("Unsupported file data format")
    );
  });
};

// ============================================================
// GET CLOUDINARY FOLDER
// ============================================================

const getFolder = (
  type,
  category = ""
) => {
  const baseFolder =
    mediaConfig.cloudinary.folder || "ai-tour";

  const subFolder =
    type === "video"
      ? "videos"
      : "images";

  return category
    ? `${baseFolder}/${subFolder}/${category}`
    : `${baseFolder}/${subFolder}`;
};

// ============================================================
// GET CLOUDINARY RESOURCE TYPE
// ============================================================

const getResourceType = (
  type,
  mimetype = ""
) => {
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
// EXTRACT CLOUDINARY PUBLIC ID FROM URL
// ============================================================
// Example:
// https://res.cloudinary.com/demo/video/upload/so_1/
// ai-tour/videos/hero-videos/example.mp4
//
// Returns:
// ai-tour/videos/hero-videos/example
// ============================================================

const extractPublicIdFromUrl = (
  fileUrl
) => {
  if (!fileUrl) {
    return null;
  }

  try {
    // Not a URL
    if (
      !fileUrl.startsWith("http://") &&
      !fileUrl.startsWith("https://")
    ) {
      return fileUrl;
    }

    const parsedUrl = new URL(fileUrl);

    const pathname = decodeURIComponent(
      parsedUrl.pathname
    );

    const uploadIndex =
      pathname.indexOf("/upload/");

    if (uploadIndex === -1) {
      return null;
    }

    let afterUpload =
      pathname.substring(
        uploadIndex + "/upload/".length
      );

    // Remove leading slash
    afterUpload =
      afterUpload.replace(/^\/+/, "");

    const segments =
      afterUpload.split("/");

    // ----------------------------------------------------------
    // Remove version segment
    // Example: v1234567890
    // ----------------------------------------------------------

    if (
      segments[0] &&
      /^v\d+$/.test(segments[0])
    ) {
      segments.shift();
    }

    // ----------------------------------------------------------
    // Remove transformation segments
    //
    // Examples:
    // w_1280,h_720,c_fill,q_auto,f_jpg
    // so_1
    // q_auto
    // ----------------------------------------------------------

    while (segments.length > 0) {
      const segment = segments[0];

      const looksLikeTransformation =
        segment.includes(",") ||
        /^(w|h|c|q|f|e|g|a|o|br|sa|co|sh|r|bo|so|vc|du)_/.test(
          segment
        );

      if (!looksLikeTransformation) {
        break;
      }

      segments.shift();
    }

    if (segments.length === 0) {
      return null;
    }

    let publicId =
      segments.join("/");

    // Remove file extension
    publicId =
      publicId.replace(
        /\.(mp4|mov|avi|webm|mkv|jpg|jpeg|png|webp|gif)$/i,
        ""
      );

    return publicId;
  } catch (error) {
    console.error(
      "❌ Failed to extract Cloudinary public ID:",
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
  // SAVE FILE
  // ==========================================================

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

    // ----------------------------------------------------------
    // Determine resource type
    // ----------------------------------------------------------

    const isVideo =
      type === "video" ||
      (
        file.mimetype &&
        file.mimetype.startsWith("video/")
      );

    const resourceType =
      getResourceType(
        type,
        file.mimetype
      );

    const folder =
      getFolder(
        isVideo ? "video" : "image",
        category
      );

    // ----------------------------------------------------------
    // Generate public ID
    // ----------------------------------------------------------

    const timestamp = Date.now();

    const random =
      Math.round(
        Math.random() * 1e9
      );

    const ext =
      file.originalname
        ? path.extname(
            file.originalname
          )
        : "";

    const baseName =
      file.originalname
        ? path.basename(
            file.originalname,
            ext
          )
        : "file";

    // Sanitize public ID
    const safeBaseName =
      baseName
        .replace(/[^a-zA-Z0-9_-]/g, "-")
        .replace(/-+/g, "-");

    const finalPublicId =
      publicId ||
      `${safeBaseName}-${timestamp}-${random}`;

    // ----------------------------------------------------------
    // Upload options
    // ----------------------------------------------------------

    const uploadOptions = {
      folder,
      public_id: finalPublicId,
      resource_type: resourceType,
      overwrite: true,
      invalidate: true,
      transformation: Array.isArray(
        transformation
      )
        ? transformation
        : [],
      timeout: 120000,
    };

    // ----------------------------------------------------------
    // Image transformations
    // ----------------------------------------------------------

    if (
      resourceType === "image" &&
      mediaConfig.cloudinary.imageTransformation
    ) {
      uploadOptions.transformation = [
        ...uploadOptions.transformation,
        ...mediaConfig.cloudinary
          .imageTransformation,
      ];
    }

    // ----------------------------------------------------------
    // Video transformations
    // ----------------------------------------------------------

    if (
      resourceType === "video" &&
      mediaConfig.cloudinary.videoTransformation
    ) {
      uploadOptions.transformation = [
        ...uploadOptions.transformation,
        ...mediaConfig.cloudinary
          .videoTransformation,
      ];
    }

    // ----------------------------------------------------------
    // Get file data
    // ----------------------------------------------------------

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

    // ----------------------------------------------------------
    // Upload
    // ----------------------------------------------------------

    const result =
      await uploadToCloudinary(
        fileData,
        uploadOptions
      );

    // ----------------------------------------------------------
    // Return normalized result
    // ----------------------------------------------------------

    return {
      filename: result.public_id,

      url: result.secure_url,

      provider: "cloudinary",

      type: isVideo
        ? "video"
        : "image",

      size:
        result.bytes ||
        file.size ||
        0,

      mimetype:
        file.mimetype ||
        "",

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

        originalUrl:
          result.url,

        assetId:
          result.asset_id,

        etag:
          result.etag,
      },
    };
  },

  // ==========================================================
  // SAVE MULTIPLE FILES
  // ==========================================================

  async saveMultiple(
    files,
    options = {}
  ) {
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
          await this.save(
            file,
            options
          );

        results.push(result);
      } catch (error) {
        console.error(
          "❌ Failed to save file:",
          error.message
        );

        results.push({
          error:
            error.message,

          filename:
            file.originalname ||
            "unknown",
        });
      }
    }

    return results;
  },

  // ==========================================================
  // DELETE FILE
  // ==========================================================

  async delete(
    publicIdOrUrl,
    options = {}
  ) {
    if (!publicIdOrUrl) {
      return false;
    }

    // ----------------------------------------------------------
    // Determine resource type
    // ----------------------------------------------------------

    let resourceType =
      getResourceType(
        options.type || "image"
      );

    // Automatically detect resource type from URL
    if (
      typeof publicIdOrUrl === "string" &&
      publicIdOrUrl.includes(
        "/video/upload/"
      )
    ) {
      resourceType = "video";
    }

    // ----------------------------------------------------------
    // Extract public ID
    // ----------------------------------------------------------

    let publicId =
      publicIdOrUrl;

    if (
      typeof publicIdOrUrl === "string" &&
      (
        publicIdOrUrl.startsWith(
          "http://"
        ) ||
        publicIdOrUrl.startsWith(
          "https://"
        )
      )
    ) {
      publicId =
        extractPublicIdFromUrl(
          publicIdOrUrl
        );
    }

    if (!publicId) {
      console.warn(
        "⚠️ Could not extract Cloudinary public ID:",
        publicIdOrUrl
      );

      return false;
    }

    // ----------------------------------------------------------
    // Delete
    // ----------------------------------------------------------

    try {
      console.log(
        `🗑️ Deleting Cloudinary ${resourceType}:`,
        publicId
      );

      const result =
        await cloudinary.uploader.destroy(
          publicId,
          {
            resource_type:
              resourceType,

            invalidate: true,

            timeout: 60000,
          }
        );

      if (
        result.result === "ok"
      ) {
        console.log(
          `✅ Deleted from Cloudinary: ${publicId}`
        );

        return true;
      }

      if (
        result.result ===
        "not found"
      ) {
        console.warn(
          `⚠️ Cloudinary file not found: ${publicId}`
        );

        // Already deleted
        return true;
      }

      console.error(
        `❌ Cloudinary delete failed:`,
        result
      );

      return false;
    } catch (error) {
      console.error(
        `❌ Cloudinary delete error for ${publicId}:`,
        error.message
      );

      return false;
    }
  },

  // ==========================================================
  // DELETE MULTIPLE FILES
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

    for (const publicId of publicIds) {
      try {
        const success =
          await this.delete(
            publicId,
            options
          );

        results.push({
          publicId,
          success,
        });
      } catch (error) {
        results.push({
          publicId,
          success: false,
          error:
            error.message,
        });
      }
    }

    return results;
  },

  // ==========================================================
  // CHECK IF FILE EXISTS
  // ==========================================================

  async exists(
    publicId,
    options = {}
  ) {
    if (!publicId) {
      return false;
    }

    const resourceType =
      getResourceType(
        options.type || "image"
      );

    try {
      const result =
        await cloudinary.api.resource(
          publicId,
          {
            resource_type:
              resourceType,

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
        "❌ Cloudinary exists error:",
        error.message
      );

      return false;
    }
  },

  // ==========================================================
  // GET FILE INFO
  // ==========================================================

  async getInfo(
    publicId,
    options = {}
  ) {
    if (!publicId) {
      return null;
    }

    const resourceType =
      getResourceType(
        options.type || "image"
      );

    try {
      const result =
        await cloudinary.api.resource(
          publicId,
          {
            resource_type:
              resourceType,

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

  getTransformedUrl(
    publicId,
    transformations = {},
    options = {}
  ) {
    if (!publicId) {
      return "";
    }

    const resourceType =
      getResourceType(
        options.type || "image"
      );

    const transformationsList = [];

    // ----------------------------------------------------------
    // Dimensions
    // ----------------------------------------------------------

    if (
      transformations.width
    ) {
      transformationsList.push(
        `w_${transformations.width}`
      );
    }

    if (
      transformations.height
    ) {
      transformationsList.push(
        `h_${transformations.height}`
      );
    }

    // ----------------------------------------------------------
    // Crop
    // ----------------------------------------------------------

    if (
      transformations.crop
    ) {
      transformationsList.push(
        `c_${transformations.crop}`
      );
    }

    // ----------------------------------------------------------
    // Quality
    // ----------------------------------------------------------

    if (
      transformations.quality
    ) {
      transformationsList.push(
        `q_${transformations.quality}`
      );
    }

    // ----------------------------------------------------------
    // Format
    // ----------------------------------------------------------

    if (
      transformations.format
    ) {
      transformationsList.push(
        `f_${transformations.format}`
      );
    }

    // ----------------------------------------------------------
    // IMPORTANT:
    // Video seek/thumbnail uses SO, NOT E_SO
    //
    // Correct:
    // so_1
    //
    // Wrong:
    // e_so_1
    // ----------------------------------------------------------

    if (
      transformations.startOffset !==
      undefined &&
      transformations.startOffset !== null
    ) {
      transformationsList.push(
        `so_${transformations.startOffset}`
      );
    }

    // Support direct start_offset too
    if (
      transformations.start_offset !==
      undefined &&
      transformations.start_offset !== null
    ) {
      transformationsList.push(
        `so_${transformations.start_offset}`
      );
    }

    // ----------------------------------------------------------
    // Other transformations
    // ----------------------------------------------------------

    if (
      transformations.gravity
    ) {
      transformationsList.push(
        `g_${transformations.gravity}`
      );
    }

    if (
      transformations.angle
    ) {
      transformationsList.push(
        `a_${transformations.angle}`
      );
    }

    if (
      transformations.opacity
    ) {
      transformationsList.push(
        `o_${transformations.opacity}`
      );
    }

    if (
      transformations.brightness
    ) {
      transformationsList.push(
        `br_${transformations.brightness}`
      );
    }

    if (
      transformations.saturation
    ) {
      transformationsList.push(
        `sa_${transformations.saturation}`
      );
    }

    if (
      transformations.contrast
    ) {
      transformationsList.push(
        `co_${transformations.contrast}`
      );
    }

    if (
      transformations.sharpness
    ) {
      transformationsList.push(
        `sh_${transformations.sharpness}`
      );
    }

    if (
      transformations.blur
    ) {
      transformationsList.push(
        `e_blur:${transformations.blur}`
      );
    }

    if (
      transformations.radius
    ) {
      transformationsList.push(
        `r_${transformations.radius}`
      );
    }

    if (
      transformations.border
    ) {
      transformationsList.push(
        `bo_${transformations.border}`
      );
    }

    // ----------------------------------------------------------
    // Cloudinary URL
    // ----------------------------------------------------------

    const cloudName =
      mediaConfig.cloudinary
        .cloudName;

    const baseUrl =
      `https://res.cloudinary.com/${cloudName}`;

    const typePath =
      resourceType === "video"
        ? "video/upload"
        : "image/upload";

    const transformationString =
      transformationsList.length > 0
        ? `${transformationsList.join(",")}/`
        : "";

    return `${baseUrl}/${typePath}/${transformationString}${publicId}`;
  },

  // ==========================================================
  // GENERATE VIDEO THUMBNAIL
  // ==========================================================
  //
  // IMPORTANT:
  //
  // This generates:
  //
  // /video/upload/
  // w_1280,h_720,c_fill,q_auto,f_jpg,so_1/
  // public-id
  //
  // NOT:
  //
  // e_so_1
  //
  // ==========================================================

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

        // IMPORTANT:
        // Cloudinary video seek transformation
        startOffset: time,
      },
      {
        type: "video",
      }
    );
  },

  // ==========================================================
  // GET OPTIMIZED IMAGE URL
  // ==========================================================

  getOptimizedImageUrl(
    publicId,
    options = {}
  ) {
    if (!publicId) {
      return "";
    }

    const width =
      options.width ?? 800;

    const height =
      options.height ?? 600;

    const quality =
      options.quality ?? "auto";

    const format =
      options.format ?? "auto";

    const crop =
      options.crop ?? "limit";

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

// ============================================================
// DEFAULT EXPORT
// ============================================================

export default cloudinaryStorageProvider;

