// backend/src/scripts/migrateToAtlas.js
// ✅ Migrate data from local to Atlas

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const migrateData = async () => {
  try {
    // ✅ Connect to local MongoDB
    console.log('📡 Connecting to local MongoDB...');
    await mongoose.connect('mongodb://127.0.0.1:27017/ai_tour_db');
    
    // ✅ Get all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`📊 Found ${collections.length} collections`);

    // ✅ Connect to Atlas
    console.log('📡 Connecting to Atlas...');
    const atlasUri = process.env.MONGODB_URI;
    const atlasConn = await mongoose.createConnection(atlasUri);
    console.log('✅ Atlas connected');

    // ✅ Migrate each collection
    for (const collection of collections) {
      const name = collection.name;
      console.log(`📤 Migrating collection: ${name}`);
      
      const data = await mongoose.connection.db.collection(name).find({}).toArray();
      
      if (data.length > 0) {
        await atlasConn.db.collection(name).insertMany(data);
        console.log(`✅ Migrated ${data.length} documents to ${name}`);
      } else {
        console.log(`ℹ️ Collection ${name} is empty, skipping`);
      }
    }

    console.log('🎉 Migration complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
};

migrateData();