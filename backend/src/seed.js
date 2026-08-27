import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import User from './models/User.js';
import School from './models/School.js';
import Plan from './models/Plan.js';
import Class from './models/Class.js';
import Student from './models/Student.js';
import AcademicSession from './models/AcademicSession.js';

const seed = async () => {
  await connectDB();
  await Promise.all([
    User.deleteMany({}),
    School.deleteMany({}),
    Plan.deleteMany({}),
    Class.deleteMany({}),
    Student.deleteMany({}),
    AcademicSession.deleteMany({}),
  ]);

  const superAdmin = await User.create({
    name: process.env.SUPER_ADMIN_NAME || 'Super Admin',
    email: process.env.SUPER_ADMIN_EMAIL || 'super@school.com',
    password: process.env.SUPER_ADMIN_PASSWORD || 'super123',
    role: 'super_admin',
    isEmailVerified: true,
  });

  console.log('Seed OK');
  console.log('Super Admin created successfully:', superAdmin.email);

  await mongoose.disconnect();
};

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
