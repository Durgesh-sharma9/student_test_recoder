import mongoose from 'mongoose';
import Student from '../models/Student.js';
import ResultSession from '../models/ResultSession.js';
import AcademicSession from '../models/AcademicSession.js';

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/school-daily-test';
  await mongoose.connect(uri);

  // Keep DB indexes aligned with current schemas (drops stale unique indexes).
  await Student.syncIndexes();
  await ResultSession.syncIndexes();
  await AcademicSession.syncIndexes();

  console.log(`MongoDB connected: ${mongoose.connection.host}`);
};
