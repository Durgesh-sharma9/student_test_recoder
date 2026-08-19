import mongoose from 'mongoose';
import '../src/models/User.js';
import '../src/models/Class.js';
import '../src/models/Student.js';
import '../src/models/Parent.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/student_test_recorder';

async function check() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const classes = await mongoose.model('Class').find({});
  console.log('Classes count:', classes.length);
  classes.forEach(c => console.log(`  - Class: ${c.className} ${c.section} (ID: ${c._id})`));

  const teachers = await mongoose.model('User').find({ role: 'teacher' });
  console.log('Teachers count:', teachers.length);
  teachers.forEach(t => console.log(`  - Teacher: ${t.name} (ID: ${t._id}, email: ${t.email})`));

  const students = await mongoose.model('Student').find({});
  console.log('Students count:', students.length);

  await mongoose.disconnect();
}

check().catch(console.error);
