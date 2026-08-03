// backend/src/config/database.js
// ✅ ENHANCED - MongoDB Atlas support with fallback

import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    let uri = process.env.MONGODB_URI;
    
    if (!uri) {
      console.warn('⚠️ MONGODB_URI not set, using localhost fallback');
      uri = 'mongodb://127.0.0.1:27017/ai_tour_db';
    }

    console.log('📡 Connecting to MongoDB...');
    
    // ✅ Hide credentials in logs
    const maskedUri = uri.replace(/\/\/[^:]+:[^@]+@/, '//****:****@');
    console.log(`📌 Using: ${maskedUri}`);

    const options = {
  serverSelectionTimeoutMS: 15000,
  socketTimeoutMS: 45000,
  family: 4,
  retryWrites: true,
  w: 'majority',
  tls: uri.includes('mongodb.net'),
  tlsAllowInvalidCertificates: false,
};

    const conn = await mongoose.connect(uri, options);
    
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📌 Database: ${conn.connection.name}`);
    console.log(`📌 Connection state: ${mongoose.connection.readyState}`);
    
    // ✅ Monitor connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected, attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected');
    });

    return conn;

  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    
    // ✅ Try localhost fallback if Atlas fails
    if (error.message.includes('ECONNREFUSED') || 
        error.message.includes('querySrv') ||
        error.message.includes('ENOTFOUND')) {
      
      console.log('🔄 Atlas connection failed, trying localhost...');
      try {
        const fallbackUri = 'mongodb://127.0.0.1:27017/ai_tour_db';
        console.log(`📌 Using fallback: ${fallbackUri}`);
        const conn = await mongoose.connect(fallbackUri, {
          serverSelectionTimeoutMS: 5000,
          family: 4,
        });
        console.log('✅ Connected to local MongoDB');
        return conn;
      } catch (fallbackError) {
        console.error('❌ Localhost also failed:', fallbackError.message);
        process.exit(1);
      }
    }
    
    console.error('❌ Fatal MongoDB error, exiting...');
    process.exit(1);
  }
};

export default connectDB;