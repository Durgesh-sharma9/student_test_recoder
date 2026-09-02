import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../src/config/db.js';

import School from '../src/models/School.js';
import User from '../src/models/User.js';
import AcademicSession from '../src/models/AcademicSession.js';
import Class from '../src/models/Class.js';
import Student from '../src/models/Student.js';
import ResultSession from '../src/models/ResultSession.js';
import MarkEntry from '../src/models/MarkEntry.js';

const seedClass8Tests = async () => {
  console.log('🚀 Seeding Multi-subject April Daily Tests for Class 8 - A...');
  await connectDB();

  const school = await School.findOne({ email: 'demo@school.com' });
  if (!school) {
    throw new Error('Demo school not found!');
  }

  const academicSession = await AcademicSession.findOne({ school: school._id, status: 'active' });
  if (!academicSession) {
    throw new Error('Active academic session not found!');
  }

  const class8A = await Class.findOne({ school: school._id, className: 'CLASS 8', section: 'A' });
  if (!class8A) {
    throw new Error('Class 8 - A not found!');
  }

  const students = await Student.find({ school: school._id, class: class8A._id, isActive: true }).sort({ rollNo: 1 });
  console.log(`Found ${students.length} students in Class 8 - A`);

  const teachers = await User.find({ school: school._id, role: 'teacher' });
  const defaultTeacher = teachers[0];

  const subjects = ['MATHEMATICS', 'SCIENCE', 'ENGLISH', 'HINDI', 'SOCIAL STUDIES'];

  // 15 days in April 2026
  const aprilDates = [
    '2026-04-03',
    '2026-04-04',
    '2026-04-06',
    '2026-04-07',
    '2026-04-08',
    '2026-04-09',
    '2026-04-10',
    '2026-04-11',
    '2026-04-13',
    '2026-04-14',
    '2026-04-15',
    '2026-04-16',
    '2026-04-17',
    '2026-04-18',
    '2026-04-20',
  ];

  // Clean old April sessions for Class 8 - A
  const existingSessions = await ResultSession.find({
    school: school._id,
    class: class8A._id,
    category: 'daily',
    testDate: { $gte: new Date('2026-04-01'), $lte: new Date('2026-04-30') }
  });
  if (existingSessions.length > 0) {
    const sIds = existingSessions.map(s => s._id);
    await MarkEntry.deleteMany({ session: { $in: sIds } });
    await ResultSession.deleteMany({ _id: { $in: sIds } });
  }

  const sessionsToInsert = [];
  const markEntriesToInsert = [];

  for (let dIdx = 0; dIdx < aprilDates.length; dIdx++) {
    const dateStr = aprilDates[dIdx];
    const testDate = new Date(dateStr);

    // On key dates (like April 3, 7, 10, 15, 20), add all 5 subjects! On other dates, add 2 subjects!
    const subjectsForThisDate = (dIdx % 3 === 0) ? subjects : [subjects[dIdx % subjects.length], subjects[(dIdx + 1) % subjects.length]];

    for (const subject of subjectsForThisDate) {
      const assignedTeacher = teachers.find(t => t.assignments?.some(a => a.subject === subject)) || defaultTeacher;
      const sessionId = new mongoose.Types.ObjectId();
      const maxMarks = 25;

      sessionsToInsert.push({
        _id: sessionId,
        school: school._id,
        academicSession: academicSession._id,
        class: class8A._id,
        subject: subject,
        category: 'daily',
        examType: 'Daily Test',
        testDate: testDate,
        maxMarks: maxMarks,
        teacher: assignedTeacher._id,
        createdAt: testDate,
        updatedAt: testDate,
      });

      const studentMarks = students.map((s, sIdx) => {
        const base = 25 - Math.floor(sIdx * 0.4);
        const randomOffset = Math.floor(Math.random() * 3) - 1;
        const marks = Math.min(25, Math.max(10, base + randomOffset));
        return {
          studentId: s._id,
          marks: marks,
        };
      }).sort((a, b) => b.marks - a.marks);

      studentMarks.forEach((sm, rank) => {
        markEntriesToInsert.push({
          session: sessionId,
          academicSession: academicSession._id,
          student: sm.studentId,
          marksObtained: sm.marks,
          percentage: parseFloat(((sm.marks / maxMarks) * 100).toFixed(1)),
          rankSubject: rank + 1,
          status: 'present',
          updatedBy: assignedTeacher._id,
          createdAt: testDate,
          updatedAt: testDate,
        });
      });
    }
  }

  await ResultSession.insertMany(sessionsToInsert);
  await MarkEntry.insertMany(markEntriesToInsert);

  console.log(`✅ Successfully Created ${sessionsToInsert.length} Daily Test Sessions across ${aprilDates.length} Days for Class 8 - A`);
  console.log(`✅ Created ${markEntriesToInsert.length} Marks Entries for all 31 students`);

  await mongoose.disconnect();
};

seedClass8Tests().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
