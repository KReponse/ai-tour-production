// backend/src/scripts/fixUserRoles.js
import mongoose from 'mongoose';
import User from '../models/User.js';
import dotenv from 'dotenv';
dotenv.config();

const fixRoles = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Update 'user' to 'traveler'
    const result = await User.updateMany(
      { role: 'user' },
      { role: 'traveler' }
    );
    
    console.log(`✅ Updated ${result.modifiedCount} users from 'user' to 'traveler'`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

fixRoles();