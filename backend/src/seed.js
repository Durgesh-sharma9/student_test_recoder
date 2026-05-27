import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import User from './models/User.js';
import Class from './models/Class.js';
import Student from './models/Student.js';
import TestResult from './models/TestResult.js';

const seed = async () => {
  await connectDB();

  await Promise.all([
    User.deleteMany({}),
    Class.deleteMany({}),
    Student.deleteMany({}),
    TestResult.deleteMany({}),
  ]);

  const admin = await User.create({
    name: 'System Admin',
    email: 'admin@school.com',
    password: 'admin123',
    role: 'admin',
    phone: '9876543210',
  });

  const teacher = await User.create({
    name: 'John Teacher',
    email: 'teacher@school.com',
    password: 'teacher123',
    role: 'teacher',
    phone: '9876543211',
  });

  const parent = await User.create({
    name: 'Mary Parent',
    email: 'parent@school.com',
    password: 'parent123',
    role: 'parent',
    phone: '9876543212',
  });

  const class10A = await Class.create({
    name: 'Class 10',
    section: 'A',
    grade: '10',
    academicYear: '2025-26',
    teacher: teacher._id,
  });

  teacher.assignedClasses = [class10A._id];
  await teacher.save();

  const students = await Student.insertMany([
    {
      name: 'Alice Johnson',
      rollNumber: '101',
      class: class10A._id,
      parent: parent._id,
      gender: 'female',
    },
    {
      name: 'Bob Smith',
      rollNumber: '102',
      class: class10A._id,
      gender: 'male',
    },
    {
      name: 'Charlie Brown',
      rollNumber: '103',
      class: class10A._id,
      gender: 'male',
    },
  ]);

  parent.children = [students[0]._id];
  await parent.save();

  console.log('Seed completed successfully!');
  console.log('--- Login Credentials ---');
  console.log('Admin:   admin@school.com / admin123');
  console.log('Teacher: teacher@school.com / teacher123');
  console.log('Parent:  parent@school.com / parent123');
  console.log(`Class ID: ${class10A._id}`);

  await mongoose.disconnect();
};

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
