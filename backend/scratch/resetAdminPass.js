import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import User from '../src/models/User.js';

async function reset() {
  const uri = process.env.MONGODB_URI;
  await mongoose.connect(uri);
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash('password123', salt);

  const res = await User.updateMany(
    { role: { $in: ['school_admin', 'super_admin', 'teacher', 'attender'] } },
    { $set: { password: hash, isActive: true, status: 'Active', isEmailVerified: true } }
  );

  console.log('✅ All Admin, Super Admin, Teacher, Attender passwords reset to "password123":', res);
  await mongoose.disconnect();
  process.exit(0);
}

reset().catch(console.error);
