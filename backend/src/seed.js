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

  if (!process.env.SUPER_ADMIN_EMAIL || !process.env.SUPER_ADMIN_PASSWORD) {
    throw new Error('SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD must be configured in .env before running seed');
  }

  const superAdmin = await User.create({
    name: process.env.SUPER_ADMIN_NAME || 'Super Admin',
    email: process.env.SUPER_ADMIN_EMAIL,
    password: process.env.SUPER_ADMIN_PASSWORD,
    role: 'super_admin',
    isEmailVerified: true,
  });

  await PaymentSettings.create({
    upiId: 'schooladmin@upi',
    merchantName: 'School Daily Test',
    qrExpiryMinutes: 5,
    razorpayEnabled: true,
    razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
    razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || '',
    updatedBy: superAdmin._id,
  });

  // Seed default subscription plans
  const { seedPlans } = await import('../scripts/seedPlans.js');
  await seedPlans();

  // Ensure Trial plan exists
  await Plan.findOneAndUpdate(
    { slug: 'trial' },
    {
      $set: {
        name: 'Trial',
        slug: 'trial',
        planType: 'trial',
        billingCycle: 'monthly',
        durationDays: 14,
        maxTeachers: 5,
        maxStudents: 20,
        teacherCapacityType: 'limited',
        studentCapacityType: 'limited',
        basePrice: 0,
        finalPrice: 0,
        price: 0,
        isActive: true,
      }
    },
    { upsert: true }
  );

  console.log('Seed OK');
  console.log('Super Admin created successfully:', superAdmin.email);
  console.log('Default Payment Settings and Plans initialized successfully.');

  await mongoose.disconnect();
};

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
