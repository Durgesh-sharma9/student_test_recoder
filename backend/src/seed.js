import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import User from './models/User.js';
import Class from './models/Class.js';
import Student from './models/Student.js';
import ResultSession from './models/ResultSession.js';
import MarkEntry from './models/MarkEntry.js';

const seed = async () => {
  await connectDB();
  await Promise.all([
    User.deleteMany({}),
    Class.deleteMany({}),
    Student.deleteMany({}),
    ResultSession.deleteMany({}),
    MarkEntry.deleteMany({}),
  ]);

  const admin = await User.create({
    name: 'Admin',
    email: 'admin@school.com',
    password: 'admin123',
    role: 'admin',
    phoneNo: '9999999999',
  });

  const teacher = await User.create({
    teacherName: 'John Teacher',
    name: 'John Teacher',
    email: 'teacher@school.com',
    password: 'teacher123',
    role: 'teacher',
    phoneNo: '8888888888',
  });

  const class10A = await Class.create({ className: '10', section: 'A', academicYear: '2026-27' });
  const class9B = await Class.create({ className: '9', section: 'B', academicYear: '2026-27' });

  teacher.assignedClasses = [class10A._id, class9B._id];
  teacher.assignments = [
    { class: class10A._id, subject: 'MATHS' },
    { class: class10A._id, subject: 'SCIENCE' },
    { class: class9B._id, subject: 'ENGLISH' },
  ];
  await teacher.save();

  await Student.insertMany([
    { rollNo: '1', name: 'Alice', gender: 'female', class: class10A._id },
    { rollNo: '2', name: 'Bob', gender: 'male', class: class10A._id },
    { rollNo: '3', name: 'Cindy', gender: 'female', class: class10A._id },
    { rollNo: '1', name: 'David', gender: 'male', class: class9B._id },
  ]);

  console.log('Seeded successfully');
  console.log('Admin: admin@school.com / admin123');
  console.log('Teacher: teacher@school.com / teacher123');
  console.log(`Admin id: ${admin._id}`);
  await mongoose.disconnect();
};

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
