import mongoose from 'mongoose';
import Student from '../models/Student.js';
import ResultSession from '../models/ResultSession.js';
import AcademicSession from '../models/AcademicSession.js';
import User from '../models/User.js';

const syncSuperAdmin = async () => {
  const adminName = process.env.SUPER_ADMIN_NAME || 'Super Admin';
  const adminEmail = process.env.SUPER_ADMIN_EMAIL || 'super@school.com';
  const adminPassword = process.env.SUPER_ADMIN_PASSWORD || 'super123';

  try {
    let user = await User.findOne({ role: 'super_admin' }).select('+password');

    if (user) {
      let isModified = false;

      if (user.email !== adminEmail.toLowerCase()) {
        user.email = adminEmail;
        isModified = true;
      }
      if (user.name !== adminName) {
        user.name = adminName;
        isModified = true;
      }

      // Check if password matches the configured one
      const passwordMatch = await user.comparePassword(adminPassword);
      if (!passwordMatch) {
        user.password = adminPassword;
        isModified = true;
      }

      if (!user.isEmailVerified) {
        user.isEmailVerified = true;
        isModified = true;
      }

      if (!user.isActive) {
        user.isActive = true;
        isModified = true;
      }

      if (isModified) {
        await user.save();
        console.log('[Server] Super Admin credentials synced successfully from .env');
      }
    } else {
      // Create new super admin
      await User.create({
        name: adminName,
        email: adminEmail,
        password: adminPassword,
        role: 'super_admin',
        isEmailVerified: true,
        isActive: true,
      });
      console.log('[Server] Super Admin created successfully from .env');
    }
  } catch (error) {
    console.error('[Server] Failed to sync Super Admin credentials:', error.message);
  }
};

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/school-daily-test';
  await mongoose.connect(uri);

  // Keep DB indexes aligned with current schemas (drops stale unique indexes).
  await Student.syncIndexes();
  await ResultSession.syncIndexes();
  await AcademicSession.syncIndexes();

  // Sync Super Admin credentials from .env
  await syncSuperAdmin();

  console.log(`MongoDB connected: ${mongoose.connection.host}`);
};
