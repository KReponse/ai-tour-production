// backend/scripts/drop-refund-index.js
// ✅ Run this once to remove the duplicate refundId index

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const dropRefundIndex = async () => {
  try {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ai_tour_db';
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;

    // Drop from payments collection
    try {
      await db.collection('payments').dropIndex('refundId_1');
      console.log('✅ Dropped payments.refundId_1');
    } catch (error) {
      if (error.code === 27) {
        console.log('ℹ️ payments.refundId_1 does not exist');
      } else {
        console.log('❌ Error dropping payments.refundId_1:', error.message);
      }
    }

    // Drop from bookings collection
    try {
      await db.collection('bookings').dropIndex('refundId_1');
      console.log('✅ Dropped bookings.refundId_1');
    } catch (error) {
      if (error.code === 27) {
        console.log('ℹ️ bookings.refundId_1 does not exist');
      } else {
        console.log('❌ Error dropping bookings.refundId_1:', error.message);
      }
    }

    // Show remaining indexes
    console.log('\n📋 Remaining indexes:');
    
    const paymentIndexes = await db.collection('payments').indexes();
    console.log('Payments:', paymentIndexes.map(i => i.name));
    
    const bookingIndexes = await db.collection('bookings').indexes();
    console.log('Bookings:', bookingIndexes.map(i => i.name));

    await mongoose.disconnect();
    console.log('\n✅ Done! Restart your server.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

dropRefundIndex();