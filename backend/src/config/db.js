import mongoose from 'mongoose';
import Student from '../models/Student.js';

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/school-daily-test';
  await mongoose.connect(uri);

  // Keep DB indexes aligned with current schemas. This removes stale indexes
  // (like old rollNumber unique index) that can cause false duplicate errors.
  await Student.syncIndexes();

  console.log(`MongoDB connected: ${mongoose.connection.host}`);
};
