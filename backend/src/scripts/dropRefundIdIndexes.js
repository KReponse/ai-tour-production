// scripts/dropRefundIdIndexes.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const dropRefundIdIndexes = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ai_tour_db');
    console.log('📡 Connected to MongoDB');
    
    // Drop indexes from Payment collection
    const paymentCollection = mongoose.connection.db.collection('payments');
    const paymentIndexes = await paymentCollection.indexes();
    console.log('📊 Payment indexes:', paymentIndexes.map(i => i.name));
    
    // Find and drop refundId index from Payment
    for (const index of paymentIndexes) {
      if (index.name.includes('refundId')) {
        console.log(`🗑️ Dropping index "${index.name}" from payments...`);
        await paymentCollection.dropIndex(index.name);
        console.log(`✅ Dropped index "${index.name}" from payments`);
      }
    }
    
    // Drop indexes from Booking collection
    const bookingCollection = mongoose.connection.db.collection('bookings');
    const bookingIndexes = await bookingCollection.indexes();
    console.log('📊 Booking indexes:', bookingIndexes.map(i => i.name));
    
    // Find and drop refundId index from Booking
    for (const index of bookingIndexes) {
      if (index.name.includes('refundId')) {
        console.log(`🗑️ Dropping index "${index.name}" from bookings...`);
        await bookingCollection.dropIndex(index.name);
        console.log(`✅ Dropped index "${index.name}" from bookings`);
      }
    }
    
    console.log('\n✅ All refundId indexes dropped successfully!');
    console.log('🔄 Restart your server to rebuild indexes.');
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

dropRefundIdIndexes();