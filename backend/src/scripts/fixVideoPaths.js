// backend/src/scripts/fixVideoPaths.js
// ✅ NEW - Migration script to fix existing video paths

import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Database Connection ────────────────────────────────────────
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/aitour";

console.log("🔍 Connecting to MongoDB...");
await mongoose.connect(MONGODB_URI);
console.log("✅ Connected to MongoDB\n");

// ─── Models ──────────────────────────────────────────────────────
const ListingSchema = new mongoose.Schema({}, { strict: false });
const Listing = mongoose.model("Listing", ListingSchema, "listings");

// ─── Paths ──────────────────────────────────────────────────────
const UPLOADS_DIR = path.join(__dirname, "..", "uploads");
const VIDEOS_DIR = path.join(UPLOADS_DIR, "videos");

console.log("📁 Uploads directory:", UPLOADS_DIR);
console.log("📁 Videos directory:", VIDEOS_DIR);
console.log("");

// ─── Helper: Check if file exists ──────────────────────────────
const fileExists = (filepath) => {
  try {
    return fs.existsSync(filepath);
  } catch {
    return false;
  }
};

// ─── Helper: Find video file ────────────────────────────────────
const findVideoFile = (filename) => {
  if (!filename) return null;
  
  // Clean filename (remove any path parts)
  const cleanName = path.basename(filename);
  
  // Check in videos/ folder
  const videoPath = path.join(VIDEOS_DIR, cleanName);
  if (fileExists(videoPath)) {
    return `videos/${cleanName}`;
  }
  
  // Check in uploads/ folder
  const uploadPath = path.join(UPLOADS_DIR, cleanName);
  if (fileExists(uploadPath)) {
    return cleanName;
  }
  
  return null;
};

// ─── Helper: Is video file ──────────────────────────────────────
const isVideoFile = (filename) => {
  if (!filename) return false;
  return filename.match(/\.(mp4|mov|webm|avi|mkv|m4v|3gp|mpeg|mpg)$/i);
};

// ─── Main Migration ─────────────────────────────────────────────
async function fixVideoPaths() {
  console.log("🔍 Starting video path migration...\n");

  // Ensure videos directory exists
  if (!fs.existsSync(VIDEOS_DIR)) {
    console.log("📁 Creating videos directory...");
    fs.mkdirSync(VIDEOS_DIR, { recursive: true });
  }

  // Get all listings with videos
  const listings = await Listing.find({
    $or: [
      { coverMedia: { $regex: /\.(mp4|mov|webm|avi|mkv|m4v|3gp|mpeg|mpg)$/i } },
      { coverMediaType: "video" },
      { videos: { $exists: true, $ne: [] } },
    ],
  });

  console.log(`📊 Found ${listings.length} listings with videos\n`);

  let fixedCount = 0;
  let errorCount = 0;
  let skipCount = 0;
  let alreadyCorrectCount = 0;

  for (const listing of listings) {
    let updated = false;
    const updates = {};

    // ── Fix coverMedia ──
    if (listing.coverMedia) {
      const isVideo = isVideoFile(listing.coverMedia);
      if (isVideo) {
        // Check if it already has the correct format
        if (listing.coverMedia.startsWith('videos/')) {
          // Already correct, check if file exists
          const fileName = listing.coverMedia.replace('videos/', '');
          const videoPath = path.join(VIDEOS_DIR, fileName);
          if (fileExists(videoPath)) {
            alreadyCorrectCount++;
          } else {
            console.log(`  ⚠️ ${listing._id}: coverMedia "${listing.coverMedia}" references missing file`);
            skipCount++;
          }
        } else {
          // Need to fix the path
          const found = findVideoFile(listing.coverMedia);
          if (found) {
            updates.coverMedia = found;
            // Also update coverImage if it matches
            if (listing.coverImage === listing.coverMedia) {
              updates.coverImage = found;
            }
            updated = true;
            console.log(`  ✅ ${listing._id}: coverMedia → ${found}`);
          } else {
            console.log(`  ⚠️ ${listing._id}: coverMedia "${listing.coverMedia}" not found in uploads/ or videos/`);
            skipCount++;
          }
        }
      }
    }

    // ── Fix videos array ──
    if (listing.videos && listing.videos.length > 0) {
      const newVideos = [];
      let videosUpdated = false;
      
      for (const video of listing.videos) {
        if (!video) continue;
        
        // Check if already correct
        if (video.startsWith('videos/')) {
          const fileName = video.replace('videos/', '');
          const videoPath = path.join(VIDEOS_DIR, fileName);
          if (fileExists(videoPath)) {
            newVideos.push(video);
          } else {
            // Try to find the file
            const found = findVideoFile(video);
            if (found) {
              newVideos.push(found);
              videosUpdated = true;
              console.log(`  ✅ ${listing._id}: video → ${found}`);
            } else {
              console.log(`  ⚠️ ${listing._id}: video "${video}" not found, keeping original`);
              newVideos.push(video);
            }
          }
        } else {
          // Need to fix the path
          const found = findVideoFile(video);
          if (found) {
            newVideos.push(found);
            videosUpdated = true;
            console.log(`  ✅ ${listing._id}: video → ${found}`);
          } else {
            console.log(`  ⚠️ ${listing._id}: video "${video}" not found, keeping original`);
            newVideos.push(video);
          }
        }
      }
      
      if (videosUpdated) {
        updates.videos = newVideos;
        updated = true;
      }
    }

    // ── Fix coverMediaType ──
    if (listing.coverMediaType !== 'video' && isVideoFile(listing.coverMedia)) {
      updates.coverMediaType = 'video';
      updated = true;
      console.log(`  ✅ ${listing._id}: coverMediaType → video`);
    }

    // ── Save updates ──
    if (updated && Object.keys(updates).length > 0) {
      try {
        await Listing.updateOne({ _id: listing._id }, { $set: updates });
        fixedCount++;
      } catch (error) {
        console.error(`  ❌ Failed to update ${listing._id}:`, error.message);
        errorCount++;
      }
    }
  }

  console.log("");
  console.log("📊 Migration Summary:");
  console.log(`  ✅ Fixed: ${fixedCount} listings`);
  console.log(`  ✅ Already correct: ${alreadyCorrectCount} listings`);
  console.log(`  ⚠️ Skipped (file missing): ${skipCount} listings`);
  console.log(`  ❌ Errors: ${errorCount} listings`);
  console.log("");
  console.log("✅ Migration complete!");
  console.log("");
  console.log("💡 If you have skipped listings, you need to re-upload the videos.");
  console.log("   The upload pipeline is now fixed and will save videos correctly.");

  process.exit(0);
}

// ─── Run ─────────────────────────────────────────────────────────
fixVideoPaths().catch((error) => {
  console.error("❌ Migration failed:", error);
  process.exit(1);
});