import mongoose from 'mongoose';
import User from '../src/models/User.js';
import dotenv from 'dotenv';

dotenv.config();

const migrateAdminEmailVerification = async () => {
  try {
    console.log('[Migration] Starting admin email verification migration...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/test-master-pro');
    console.log('[Migration] Connected to MongoDB');

    // Find all existing school_admin and super_admin users
    const admins = await User.find({
      role: { $in: ['school_admin', 'super_admin'] }
    });

    console.log(`[Migration] Found ${admins.length} admin users`);

    let updatedCount = 0;
    for (const admin of admins) {
      if (!admin.isEmailVerified) {
        admin.isEmailVerified = true;
        await admin.save();
        updatedCount++;
        console.log(`[Migration] Updated email verification for admin: ${admin.email}`);
      }
    }

    console.log(`[Migration] Migration completed. Updated ${updatedCount} admin users.`);
    console.log('[Migration] All existing admins now have isEmailVerified=true');
    
    process.exit(0);
  } catch (error) {
    console.error('[Migration Error]', error);
    process.exit(1);
  }
};

migrateAdminEmailVerification();
