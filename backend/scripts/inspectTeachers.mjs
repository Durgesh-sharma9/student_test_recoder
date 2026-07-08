import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../src/models/User.js';
import Class from '../src/models/Class.js';
import Student from '../src/models/Student.js';

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/school-daily-test';
await mongoose.connect(uri);

const userSchoolId = '6a25c23d08f1c796df9a57c8';
const studentId = '6a270f1bcdfdfedc2e72d4ca';

// Get student's class
const student = await Student.findById(studentId).populate('class', 'className section').lean();
console.log('Student:', student);
console.log('Student Class ID:', student.class._id);

// Get teachers in school with assignments
const teachers = await User.find({ role: 'teacher', isActive: true, school: userSchoolId })
  .select('_id teacherName name school assignedClasses assignments')
  .populate('assignedClasses', 'className section')
  .populate('assignments.class', 'className section')
  .lean();

console.log('\nTeachers in user school (6a25c23d08f1c796df9a57c8):', teachers.length);

// Filter teachers for student's class
const classTeachers = teachers.filter(teacher => 
  teacher.assignments && teacher.assignments.some(assignment => {
    const assignmentClassId = assignment.class?._id || assignment.class;
    return String(assignmentClassId) === String(student.class._id);
  })
);

console.log('\nTeachers for class 4-A:', classTeachers.length);
console.log(JSON.stringify(classTeachers.map(t => ({
  name: t.teacherName,
  assignments: t.assignments.filter(a => String(a.class?._id) === String(student.class._id))
})), null, 2));

await mongoose.disconnect();
