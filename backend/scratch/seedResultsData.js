import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import School from '../src/models/School.js';
import AcademicSession from '../src/models/AcademicSession.js';
import ClassModel from '../src/models/Class.js';
import User from '../src/models/User.js';
import Student from '../src/models/Student.js';
import Parent from '../src/models/Parent.js';
import ResultSession from '../src/models/ResultSession.js';
import MarkEntry from '../src/models/MarkEntry.js';

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set in environment!');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB Atlas...');

  const school = await School.findOne({});
  if (!school) {
    console.error('No school found in DB!');
    process.exit(1);
  }
  console.log(`Using School: ${school.name} (ID: ${school._id})`);

  let academicSession = await AcademicSession.findOne({ school: school._id, isActive: true });
  if (!academicSession) {
    academicSession = await AcademicSession.findOne({ school: school._id });
  }
  if (!academicSession) {
    academicSession = await AcademicSession.create({
      school: school._id,
      name: '2025-2026',
      startDate: new Date('2025-04-01'),
      endDate: new Date('2026-03-31'),
      isActive: true,
    });
  }
  console.log(`Using Academic Session: ${academicSession.name} (ID: ${academicSession._id})`);

  const teacher = await User.findOne({ school: school._id, role: { $in: ['teacher', 'school_admin'] } }) || await User.findOne({});
  if (!teacher) {
    console.error('No user found to act as teacher!');
    process.exit(1);
  }
  console.log(`Using Teacher: ${teacher.name} (ID: ${teacher._id})`);

  let classes = await ClassModel.find({ school: school._id });
  if (!classes.length) {
    const c1 = await ClassModel.create({ school: school._id, className: '10', section: 'A' });
    const c2 = await ClassModel.create({ school: school._id, className: '9', section: 'A' });
    classes = [c1, c2];
  }
  console.log(`Found ${classes.length} classes.`);

  const sampleStudents = [
    { name: 'Aarav Verma', rollNo: '101', fatherName: 'Manoj Verma' },
    { name: 'Vivaan Singh', rollNo: '102', fatherName: 'Sunil Singh' },
    { name: 'Ananya Gupta', rollNo: '103', fatherName: 'Vijay Gupta' },
    { name: 'Diya Mehta', rollNo: '104', fatherName: 'Prakash Mehta' },
    { name: 'Tanvi Patel', rollNo: '105', fatherName: 'Mahesh Patel' },
    { name: 'Kabir Kumar', rollNo: '106', fatherName: 'Deepak Kumar' },
  ];

  for (const cls of classes) {
    let students = await Student.find({ class: cls._id, school: school._id, isActive: true });
    if (students.length < 3) {
      console.log(`Seeding students for Class ${cls.className} ${cls.section}...`);
      for (const s of sampleStudents) {
        let parent = await Parent.create({
          school: school._id,
          parentName: s.fatherName,
          phone: `98765${Math.floor(10000 + Math.random() * 90000)}`,
        });
        await Student.create({
          school: school._id,
          class: cls._id,
          name: s.name,
          rollNo: `${cls.className}${s.rollNo}`,
          parent: parent._id,
          fatherName: s.fatherName,
          isActive: true,
        });
      }
    }
  }

  // Create test & exam sessions
  const today = new Date();
  const yesterday = new Date(Date.now() - 86400000 * 2);
  const lastWeek = new Date(Date.now() - 86400000 * 7);

  for (const cls of classes) {
    const students = await Student.find({ class: cls._id, school: school._id, isActive: true });
    if (!students.length) continue;

    const testConfigs = [
      { category: 'daily', subject: 'MATHEMATICS', testDate: today, maxMarks: 50 },
      { category: 'daily', subject: 'SCIENCE', testDate: yesterday, maxMarks: 50 },
      { category: 'daily', subject: 'ENGLISH', testDate: lastWeek, maxMarks: 25 },
      { category: 'main', subject: 'MATHEMATICS', examType: 'PA1', examDate: lastWeek, maxMarks: 100 },
      { category: 'main', subject: 'SCIENCE', examType: 'Half Yearly', examDate: today, maxMarks: 100 },
    ];

    for (const cfg of testConfigs) {
      let session;
      if (cfg.category === 'daily') {
        session = await ResultSession.create({
          school: school._id,
          academicSession: academicSession._id,
          class: cls._id,
          subject: cfg.subject,
          category: 'daily',
          testDate: cfg.testDate,
          maxMarks: cfg.maxMarks,
          teacher: teacher._id,
        }).catch(() => null);
      } else {
        session = await ResultSession.create({
          school: school._id,
          academicSession: academicSession._id,
          class: cls._id,
          subject: cfg.subject,
          category: 'main',
          examType: cfg.examType,
          examDate: cfg.examDate,
          maxMarks: cfg.maxMarks,
          teacher: teacher._id,
        }).catch(() => null);
      }

      if (!session) continue;
      console.log(`Created ResultSession: ${cfg.category} - ${cfg.subject} for Class ${cls.className} ${cls.section}`);

      // Seed student marks
      const scores = students.map((s, idx) => {
        const isAbsent = idx === 5;
        const marksObtained = isAbsent ? 0 : Math.floor(cfg.maxMarks * (0.5 + Math.random() * 0.48));
        return {
          studentId: s._id,
          marksObtained,
          percentage: Number(((marksObtained / cfg.maxMarks) * 100).toFixed(1)),
          status: isAbsent ? 'absent' : 'present',
        };
      });

      // Calculate ranks
      const sorted = [...scores].filter(x => x.status === 'present').sort((a, b) => b.marksObtained - a.marksObtained);
      sorted.forEach((item, r) => {
        item.rankSubject = r + 1;
      });

      for (const sc of scores) {
        await MarkEntry.findOneAndUpdate(
          { session: session._id, student: sc.studentId },
          {
            session: session._id,
            academicSession: academicSession._id,
            student: sc.studentId,
            marksObtained: sc.marksObtained,
            percentage: sc.percentage,
            rankSubject: sc.rankSubject || null,
            status: sc.status,
            updatedBy: teacher._id,
          },
          { upsert: true }
        );
      }
    }
  }

  console.log('✅ SEEDING COMPLETE! Test result data created successfully.');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
