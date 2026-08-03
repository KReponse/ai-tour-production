// backend/src/scripts/createTestUser.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

const createTestUser = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ai_tour_db');
    
    const email = 'test@example.com';
    const password = 'password123';
    
    // Delete existing user
    await User.deleteOne({ email });
    
    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create user
    const user = await User.create({
      name: 'Test User',
      email,
      password: hashedPassword,
      role: 'traveler',
      verificationStatus: 'approved',
      isEmailVerified: true,
      isActive: true
    });
    
    console.log('✅ Test user created:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Password: ${password}`);
    console.log(`   ID: ${user._id}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

createTestUser();