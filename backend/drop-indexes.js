// drop-indexes.js
import mongoose from 'mongoose';

const dropIndexes = async () => {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/ai_tour_db');
    console.log('✅ Connected to MongoDB');

    const collections = ['payments', 'exchangeratelocks', 'webhookevents', 'bookings', 'ratelocks'];
    
    for (const name of collections) {
      const collection = mongoose.connection.db.collection(name);
      const result = await collection.dropIndexes();
      console.log(`✅ Dropped all indexes from ${name}`);
    }

    console.log('\n✅ All duplicate indexes dropped!');
    console.log('📌 Restart your server now: npm run dev');
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

dropIndexes();