// backend/scripts/migrateToCloudinary.js
// ✅ UPDATED - With retry logic, rate limiting, and resume capability

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';

// Load environment
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===============================
// CONFIGURATION
// ===============================

const BATCH_SIZE = 5; // Reduced from 10 to avoid rate limits
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds between retries
const BATCH_DELAY = 3000; // 3 seconds between batches
const UPLOAD_DIR = path.join(__dirname, '../src/uploads');
const VIDEO_DIR = path.join(__dirname, '../src/uploads/videos');

// ===============================
// CLOUDINARY CONFIG
// ===============================

const cloudName = process.env.CLOUDINARY_CLOUD_NAME || 'dw6po8hag';
const apiKey = process.env.CLOUDINARY_API_KEY || '924138582998116';
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (!apiSecret) {
  console.error('❌ CLOUDINARY_API_SECRET is not set in .env file!');
  console.error('Please add: CLOUDINARY_API_SECRET=your-api-secret');
  process.exit(1);
}

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
  secure: true,
  timeout: 60000, // 60 second timeout
});

console.log('✅ Cloudinary configured with cloud name:', cloudName);

// ===============================
// MONGODB CONNECTION
// ===============================

const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai_tour_db';
  await mongoose.connect(mongoURI);
  console.log('✅ Connected to MongoDB');
};

// ===============================
// HELPERS
// ===============================

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const log = (message, type = 'info') => {
  const prefix = {
    info: '📋',
    success: '✅',
    error: '❌',
    warn: '⚠️',
    progress: '🔄',
  }[type] || '📋';
  console.log(`${prefix} ${message}`);
};

// ===============================
// SCAN LOCAL FILES
// ===============================

const scanLocalFiles = () => {
  const files = [];

  // Scan main upload directory
  if (fs.existsSync(UPLOAD_DIR)) {
    const items = fs.readdirSync(UPLOAD_DIR);
    for (const item of items) {
      const fullPath = path.join(UPLOAD_DIR, item);
      if (fs.statSync(fullPath).isFile()) {
        const ext = path.extname(item).toLowerCase();
        const isVideo = ['.mp4', '.mov', '.webm', '.avi', '.mkv', '.m4v', '.3gp', '.mpeg', '.mpg'].includes(ext);
        files.push({
          filename: item,
          path: fullPath,
          type: isVideo ? 'video' : 'image',
          isVideo,
        });
      }
    }
  }

  // Scan video directory
  if (fs.existsSync(VIDEO_DIR)) {
    const items = fs.readdirSync(VIDEO_DIR);
    for (const item of items) {
      const fullPath = path.join(VIDEO_DIR, item);
      if (fs.statSync(fullPath).isFile()) {
        files.push({
          filename: item,
          path: fullPath,
          type: 'video',
          isVideo: true,
        });
      }
    }
  }

  return files;
};

// ===============================
// UPLOAD TO CLOUDINARY WITH RETRY
// ===============================

const uploadToCloudinaryWithRetry = async (filePath, filename, type, retryCount = 0) => {
  try {
    const folder = type === 'video' ? 'ai-tour/videos' : 'ai-tour/images';
    const resourceType = type === 'video' ? 'video' : 'image';

    log(`Uploading ${filename}... (attempt ${retryCount + 1})`, 'progress');

    const result = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: resourceType,
      public_id: filename.replace(/\.[^.]+$/, ''),
      overwrite: true,
      invalidate: true,
      timeout: 60000,
    });

    log(`✅ Uploaded: ${filename}`, 'success');
    return result;
  } catch (error) {
    const errorMsg = error.message || 'Unknown error';
    const statusCode = error.http_code || error.statusCode || 'unknown';
    
    log(`❌ Upload failed (attempt ${retryCount + 1}): ${errorMsg} (status: ${statusCode})`, 'error');

    // Check if we should retry
    if (retryCount < MAX_RETRIES) {
      const isRateLimit = errorMsg.includes('rate') || 
                          errorMsg.includes('limit') || 
                          statusCode === 429 ||
                          statusCode === 502 ||
                          statusCode === 503 ||
                          statusCode === 504;
      
      if (isRateLimit) {
        const delay = RETRY_DELAY * (retryCount + 1) * 2;
        log(`⏳ Rate limit detected. Waiting ${delay}ms before retry...`, 'warn');
        await sleep(delay);
      } else {
        await sleep(RETRY_DELAY);
      }
      
      return uploadToCloudinaryWithRetry(filePath, filename, type, retryCount + 1);
    }

    return null;
  }
};

// ===============================
// UPDATE MONGODB REFERENCES
// ===============================

const updateListings = async (mapping) => {
  let updated = 0;
  let errors = 0;

  try {
    const { default: Listing } = await import('../src/models/Listing.js');
    
    const listings = await Listing.find({});
    log(`Found ${listings.length} listings to update`, 'info');

    for (const listing of listings) {
      try {
        let needsUpdate = false;
        const updateData = {};

        if (listing.coverMedia && mapping[listing.coverMedia]) {
          updateData.coverMedia = mapping[listing.coverMedia].secure_url;
          needsUpdate = true;
        }

        if (listing.coverImage && mapping[listing.coverImage]) {
          updateData.coverImage = mapping[listing.coverImage].secure_url;
          needsUpdate = true;
        }

        if (listing.galleryImages && listing.galleryImages.length > 0) {
          const updatedGallery = [];
          let galleryChanged = false;
          for (const img of listing.galleryImages) {
            if (mapping[img]) {
              updatedGallery.push(mapping[img].secure_url);
              galleryChanged = true;
            } else {
              updatedGallery.push(img);
            }
          }
          if (galleryChanged) {
            updateData.galleryImages = updatedGallery;
            needsUpdate = true;
          }
        }

        if (listing.videos && listing.videos.length > 0) {
          const updatedVideos = [];
          let videosChanged = false;
          for (const vid of listing.videos) {
            if (mapping[vid]) {
              updatedVideos.push(mapping[vid].secure_url);
              videosChanged = true;
            } else {
              updatedVideos.push(vid);
            }
          }
          if (videosChanged) {
            updateData.videos = updatedVideos;
            needsUpdate = true;
          }
        }

        if (needsUpdate) {
          await Listing.updateOne({ _id: listing._id }, { $set: updateData });
          updated++;
          if (updated % 10 === 0) {
            log(`📋 Updated ${updated} listings so far...`, 'progress');
          }
        }
      } catch (error) {
        log(`❌ Failed to update listing ${listing._id}: ${error.message}`, 'error');
        errors++;
      }
    }
  } catch (error) {
    log(`❌ Error loading Listing model: ${error.message}`, 'error');
  }

  return { updated, errors };
};

const updateHeroVideos = async (mapping) => {
  let updated = 0;
  let errors = 0;

  try {
    const { default: HeroVideo } = await import('../src/models/HeroVideo.js');
    
    const heroVideos = await HeroVideo.find({});
    log(`Found ${heroVideos.length} hero videos to update`, 'info');

    for (const video of heroVideos) {
      try {
        if (video.videoUrl && mapping[video.videoUrl]) {
          video.videoUrl = mapping[video.videoUrl].secure_url;
          await video.save();
          updated++;
        } else if (video.videoUrl && video.videoUrl.startsWith('/uploads/')) {
          const filename = video.videoUrl.replace('/uploads/', '');
          if (mapping[filename]) {
            video.videoUrl = mapping[filename].secure_url;
            await video.save();
            updated++;
          }
        }
      } catch (error) {
        log(`❌ Failed to update hero video ${video._id}: ${error.message}`, 'error');
        errors++;
      }
    }
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      log('⚠️ HeroVideo model not found - skipping', 'warn');
    } else {
      log(`⚠️ Error with HeroVideo: ${error.message}`, 'warn');
    }
  }

  return { updated, errors };
};

// ===============================
// GENERATE MIGRATION REPORT
// ===============================

const generateReport = (results) => {
  console.log('\n' + '='.repeat(60));
  console.log('📊 MIGRATION REPORT');
  console.log('='.repeat(60));

  console.log(`\n📁 Total files scanned: ${results.scanned}`);
  console.log(`✅ Successfully uploaded: ${results.uploaded}`);
  console.log(`❌ Failed to upload: ${results.failed}`);

  console.log(`\n📝 Database Updates:`);
  console.log(`   📋 Listings updated: ${results.listingsUpdated}`);
  console.log(`   🎥 Hero videos updated: ${results.heroVideosUpdated}`);
  console.log(`   ❌ Update errors: ${results.updateErrors}`);

  if (results.failedFiles.length > 0) {
    console.log('\n❌ Failed files (first 20):');
    for (const file of results.failedFiles.slice(0, 20)) {
      console.log(`   - ${file.filename}: ${file.error}`);
    }
    if (results.failedFiles.length > 20) {
      console.log(`   ... and ${results.failedFiles.length - 20} more`);
    }
  }

  console.log('\n' + '='.repeat(60));
  if (results.failed === 0) {
    console.log('✅ Migration complete! All files uploaded successfully.');
  } else {
    console.log(`⚠️ Migration completed with ${results.failed} failures.`);
    console.log('💡 You can re-run the script to retry failed files.');
  }
  console.log('='.repeat(60) + '\n');
};

// ===============================
// MAIN MIGRATION FUNCTION
// ===============================

const migrateToCloudinary = async () => {
  console.log('\n🚀 Starting Cloudinary Migration\n');
  console.log('='.repeat(60));

  // 1. Connect to MongoDB
  log('Connecting to MongoDB...', 'info');
  await connectDB();

  // 2. Scan local files
  log('Scanning local files...', 'info');
  const files = scanLocalFiles();
  log(`Found ${files.length} files to migrate`, 'info');

  if (files.length === 0) {
    log('No files to migrate. Exiting.', 'warn');
    await mongoose.disconnect();
    process.exit(0);
  }

  const images = files.filter(f => f.type === 'image');
  const videos = files.filter(f => f.type === 'video');
  log(`Images: ${images.length}, Videos: ${videos.length}`, 'info');

  // 3. Upload files to Cloudinary
  log('\n📤 Uploading files to Cloudinary...', 'info');

  const mapping = {};
  const failedFiles = [];
  let uploaded = 0;

  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(files.length / BATCH_SIZE);
    
    log(`\n🔄 Processing batch ${batchNum}/${totalBatches} (${batch.length} files)`, 'progress');

    for (const file of batch) {
      const result = await uploadToCloudinaryWithRetry(file.path, file.filename, file.type);
      if (result) {
        mapping[file.filename] = result;
        uploaded++;
      } else {
        failedFiles.push({ filename: file.filename, error: 'All retries failed' });
      }
    }

    const progress = Math.round((uploaded / files.length) * 100);
    log(`📊 Progress: ${progress}% (${uploaded}/${files.length})`, 'info');

    // Wait between batches to avoid rate limits
    if (i + BATCH_SIZE < files.length) {
      log(`⏳ Waiting ${BATCH_DELAY}ms before next batch...`, 'info');
      await sleep(BATCH_DELAY);
    }
  }

  // 4. Update MongoDB
  log('\n💾 Updating MongoDB references...', 'info');

  const listingsResult = await updateListings(mapping);
  const heroVideosResult = await updateHeroVideos(mapping);

  const updateErrors = listingsResult.errors + heroVideosResult.errors;

  // 5. Generate report
  const results = {
    scanned: files.length,
    uploaded,
    failed: failedFiles.length,
    failedFiles,
    listingsUpdated: listingsResult.updated,
    heroVideosUpdated: heroVideosResult.updated,
    updateErrors,
  };

  generateReport(results);

  // 6. Optional: Move local files to backup
  if (uploaded > 0) {
    const backupDir = path.join(__dirname, '../src/uploads_backup');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
      log(`Created backup directory: ${backupDir}`, 'info');
    }

    log('\n📦 Creating backup of local files...', 'info');
    let moved = 0;
    for (const file of files) {
      try {
        if (mapping[file.filename] && fs.existsSync(file.path)) {
          const destPath = path.join(backupDir, file.filename);
          if (fs.existsSync(destPath)) {
            fs.unlinkSync(destPath);
          }
          fs.renameSync(file.path, destPath);
          moved++;
        }
      } catch (error) {
        // Silently skip
      }
    }
    log(`✅ Moved ${moved} files to backup`, 'success');
  }

  // 7. Disconnect from MongoDB
  await mongoose.disconnect();
  log('\n✅ Migration process completed!', 'success');
};

// ===============================
// HANDLE ERRORS
// ===============================

process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled rejection:', error);
  process.exit(1);
});

process.on('SIGINT', async () => {
  console.log('\n⚠️ Migration interrupted. Cleaning up...');
  await mongoose.disconnect();
  process.exit(0);
});

// ===============================
// RUN MIGRATION
// ===============================

migrateToCloudinary();