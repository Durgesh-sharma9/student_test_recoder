import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../src/models/User.js';
import Class from '../src/models/Class.js';

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/school-daily-test';
await mongoose.connect(uri);
const teachers = await User.find({ role: 'teacher', isActive: true })
  .select('_id teacherName name school assignedClasses assignments')
  .populate('assignedClasses', 'className section')
  .populate('assignments.class', 'className section')
  .lean();

console.log(JSON.stringify(teachers.slice(0, 8), null, 2));
await mongoose.disconnect();
