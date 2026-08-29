import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import User from './models/User.js';
import School from './models/School.js';
import Plan from './models/Plan.js';
import Class from './models/Class.js';
import Student from './models/Student.js';
import AcademicSession from './models/AcademicSession.js';
import PaymentSettings from './models/PaymentSettings.js';

const seed = async () => {
  await connectDB();
  await Promise.all([
    User.deleteMany({}),
    School.deleteMany({}),
    Plan.deleteMany({}),
    Class.deleteMany({}),
    Student.deleteMany({}),
    AcademicSession.deleteMany({}),
    PaymentSettings.deleteMany({}),
  ]);

  const superAdmin = await User.create({
    name: process.env.SUPER_ADMIN_NAME || 'Super Admin',
    email: process.env.SUPER_ADMIN_EMAIL || 'testmaster@gmail.com',
    password: process.env.SUPER_ADMIN_PASSWORD || 'superadmine3z608af',
    role: 'super_admin',
    isEmailVerified: true,
  });

  await PaymentSettings.create({
    upiId: 'schooladmin@upi',
    merchantName: 'School Daily Test',
    qrExpiryMinutes: 5,
    razorpayEnabled: true,
    razorpayKeyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_TNFrLSunBdtmcv',
    razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || 'rYqvnc8Q8GqIpXT6ZSNKp7Ly',
    updatedBy: superAdmin._id,
  });

  console.log('Seed OK');
  console.log('Super Admin created successfully:', superAdmin.email);
  console.log('Default Payment Settings initialized successfully.');

  await mongoose.disconnect();
};

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
