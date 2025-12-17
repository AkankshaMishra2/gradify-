import mongoose from 'mongoose';

export const connectDB = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI missing in environment');
    process.exit(1);
  }
  try {
    await mongoose.connect(uri, { dbName: process.env.MONGO_DB || 'gradify' });
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
};
