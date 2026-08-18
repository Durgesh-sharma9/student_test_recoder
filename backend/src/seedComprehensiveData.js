import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import School from './models/School.js';
import AcademicSession from './models/AcademicSession.js';
import Class from './models/Class.js';
import Student from './models/Student.js';
import User from './models/User.js';
import Parent from './models/Parent.js';
import ResultSession from './models/ResultSession.js';
import MarkEntry from './models/MarkEntry.js';
import NotebookCheck from './models/NotebookCheck.js';
import Attendance from './models/Attendance.js';

const SUBJECTS = ['MATHEMATICS', 'SCIENCE', 'ENGLISH', 'SOCIAL STUDIES', 'HINDI'];
const FIRST_NAMES = [
  'Aarav', 'Vihaan', 'Aadhya', 'Isha', 'Ravi', 'Meera', 'Arjun', 'Anaya', 'Kabir', 'Diya',
  'Rohan', 'Ananya', 'Dev', 'Sanya', 'Aditya', 'Priya', 'Karan', 'Sneha', 'Rahul', 'Neha',
  'Yash', 'Riya', 'Aman', 'Pooja', 'Varun', 'Kavya', 'Siddharth', 'Tanvi', 'Ishaan', 'Shreya'
];
const LAST_NAMES = [
  'Sharma', 'Verma', 'Gupta', 'Singh', 'Patel', 'Joshi', 'Kumar', 'Mehta', 'Swain', 'Chaudhary',
  'Rao', 'Deshmukh', 'Mishra', 'Pandey', 'Nair', 'Bhat', 'Saxena', 'Agrawal', 'Thakur', 'Reddy'
];

async function seed() {
  console.log('🚀 Starting Ultra-Fast Bulk Seeding (Results, Tests, Performance, Attendance)...');

  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/school-daily-test';
  let retries = 5;
  while (retries > 0) {
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
      break;
    } catch (err) {
      retries--;
      console.warn(`[DB] Retry connection (${err.message})... Attempts left: ${retries}`);
      if (retries === 0) throw err;
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
  console.log('✅ Connected to MongoDB Atlas');

  // 1. Get or Create Demo Public School
  let school = await School.findOne({ schoolName: /Demo Public School/i });
  if (!school) {
    school = await School.create({
      schoolName: 'Demo Public School',
      code: 'DPS100',
      address: '123 Education Hub, Sector 4, New Delhi',
      contactPhone: '9876543210',
      contactEmail: 'admin@demopublicschool.com',
      isActive: true,
    });
    console.log('🏫 Created Demo Public School');
  }

  // 2. Get or Create Active Academic Session
  let session = await AcademicSession.findOne({ school: school._id, status: 'active' });
  if (!session) {
    session = await AcademicSession.findOne({ school: school._id });
  }
  if (!session) {
    session = await AcademicSession.create({
      school: school._id,
      sessionName: '2026-2027',
      startDate: new Date('2026-04-01'),
      endDate: new Date('2027-03-31'),
      status: 'active',
    });
  }
  console.log(`📅 Academic Session: ${session.sessionName}`);

  // 3. Find Teacher
  let adminTeacher = await User.findOne({ school: school._id, role: 'school_admin' });
  if (!adminTeacher) {
    adminTeacher = await User.findOne({ role: 'teacher' });
  }
  const teacherId = adminTeacher ? adminTeacher._id : school._id;

  // 4. Classes 1-A to 10-A
  const classesList = [];
  for (let cNum = 1; cNum <= 10; cNum++) {
    const classNameStr = String(cNum);
    const sectionStr = 'A';
    let cls = await Class.findOne({ school: school._id, className: classNameStr, section: sectionStr });
    if (!cls) {
      cls = await Class.create({
        school: school._id,
        className: classNameStr,
        section: sectionStr,
        subjects: SUBJECTS.map((sub) => ({ subjectName: sub })),
      });
    } else {
      if (!cls.subjects) cls.subjects = [];
      const existingNames = cls.subjects.map((s) => (typeof s === 'string' ? s : s.subjectName || '').toUpperCase());
      const missing = SUBJECTS.filter((s) => !existingNames.includes(s));
      if (missing.length > 0) {
        cls.subjects.push(...missing.map((sub) => ({ subjectName: sub })));
        await cls.save();
      }
    }
    classesList.push(cls);
  }

  // 5. Students & Parents (Bulk)
  console.log('👥 Ensuring 20 Students per class with linked Parents...');
  let allStudents = [];
  const parentBulkOps = [];

  for (const cls of classesList) {
    let existingStudents = await Student.find({ school: school._id, class: cls._id });
    const needed = 20 - existingStudents.length;

    for (let i = 0; i < needed; i++) {
      const rollNo = existingStudents.length + i + 1;
      const fn = FIRST_NAMES[(rollNo + Number(cls.className) * 3) % FIRST_NAMES.length];
      const ln = LAST_NAMES[(rollNo + Number(cls.className) * 5) % LAST_NAMES.length];
      const name = `${fn} ${ln}`;
      const fatherName = `Rajesh ${ln}`;
      const motherName = `Sunita ${ln}`;
      const mobile = `98${Math.floor(10000000 + Math.random() * 90000000)}`;

      const st = await Student.create({
        school: school._id,
        class: cls._id,
        rollNo,
        name,
        fatherName,
        motherName,
        contactPhone: mobile,
        address: `${rollNo * 12}, Green Avenue, Block ${cls.className}`,
      });
      existingStudents.push(st);

      const parentEmail = `parent.${st._id}@school.com`;
      parentBulkOps.push({
        updateOne: {
          filter: { email: parentEmail },
          update: {
            $setOnInsert: {
              school: school._id,
              name: fatherName,
              email: parentEmail,
              phoneNo: mobile,
              password: 'password123',
              students: [st._id],
              relationship: 'father',
            },
          },
          upsert: true,
        },
      });
    }
    allStudents.push(...existingStudents);
  }

  if (parentBulkOps.length > 0) {
    await Parent.bulkWrite(parentBulkOps);
  }
  console.log(`✅ Total Students ready: ${allStudents.length}`);

  // 6. Main Exam Result Sessions & Mark Entries (Bulk)
  console.log('📝 Bulk Seeding Main Exams (PA1, PA2, Half Yearly, Final)...');
  const examConfigs = [
    { examType: 'PA1', examDate: new Date('2026-05-15') },
    { examType: 'PA2', examDate: new Date('2026-07-20') },
    { examType: 'Half Yearly', examDate: new Date('2026-09-25') },
    { examType: 'Final', examDate: new Date('2027-03-10') },
  ];

  const markEntriesBulkOps = [];
  for (const cls of classesList) {
    const clsStudents = allStudents.filter((st) => String(st.class) === String(cls._id));

    for (const { examType, examDate } of examConfigs) {
      for (const subject of SUBJECTS) {
        let rSession = await ResultSession.findOne({
          school: school._id,
          class: cls._id,
          subject,
          examType,
          examDate,
          category: 'main',
        });

        if (!rSession) {
          rSession = await ResultSession.create({
            school: school._id,
            academicSession: session._id,
            class: cls._id,
            subject,
            category: 'main',
            examType,
            examDate,
            maxMarks: 100,
            teacher: teacherId,
          }).catch((err) => {
            if (err.code === 11000) {
              return ResultSession.findOne({ school: school._id, class: cls._id, subject, category: 'main', examType, examDate });
            }
            return null;
          });
        }

        if (!rSession) continue;

        // Generate student marks
        const studentMarks = clsStudents.map((st, idx) => {
          const baseScore = 65 + ((idx * 7 + Number(cls.className)) % 32);
          const marksObtained = Math.min(100, Math.max(35, baseScore));
          const percentage = Math.round((marksObtained / 100) * 100 * 10) / 10;
          return { studentId: st._id, marksObtained, percentage };
        });

        studentMarks.sort((a, b) => b.marksObtained - a.marksObtained);

        studentMarks.forEach((sm, rIdx) => {
          markEntriesBulkOps.push({
            updateOne: {
              filter: { session: rSession._id, student: sm.studentId },
              update: {
                $set: {
                  session: rSession._id,
                  academicSession: session._id,
                  student: sm.studentId,
                  marksObtained: sm.marksObtained,
                  percentage: sm.percentage,
                  rankSubject: rIdx + 1,
                  status: 'present',
                  updatedBy: teacherId,
                },
              },
              upsert: true,
            },
          });
        });
      }
    }
  }

  if (markEntriesBulkOps.length > 0) {
    await MarkEntry.bulkWrite(markEntriesBulkOps);
  }
  console.log('✅ Main Exam Result Sessions & Mark Entries seeded!');

  // 7. Daily Tests (Bulk)
  console.log('⏱️ Bulk Seeding Daily Test Records...');
  const testDates = [];
  const today = new Date();
  for (let d = 5; d <= 60; d += 7) {
    const dt = new Date(today);
    dt.setDate(today.getDate() - d);
    testDates.push(dt);
  }

  const dailyMarkBulkOps = [];
  for (const cls of classesList) {
    const clsStudents = allStudents.filter((st) => String(st.class) === String(cls._id));

    for (let i = 0; i < testDates.length; i++) {
      const testDate = testDates[i];
      const subject = SUBJECTS[i % SUBJECTS.length];
      const maxMarks = 25;

      let rSession = await ResultSession.create({
        school: school._id,
        academicSession: session._id,
        class: cls._id,
        subject,
        category: 'daily',
        testDate,
        maxMarks,
        teacher: teacherId,
      }).catch(() => null);

      if (!rSession) continue;

      const studentMarks = clsStudents.map((st, idx) => {
        const marksObtained = Math.min(25, Math.max(12, 15 + ((idx + i) % 11)));
        const percentage = Math.round((marksObtained / maxMarks) * 100 * 10) / 10;
        return { studentId: st._id, marksObtained, percentage };
      });

      studentMarks.sort((a, b) => b.marksObtained - a.marksObtained);

      studentMarks.forEach((sm, rIdx) => {
        dailyMarkBulkOps.push({
          updateOne: {
            filter: { session: rSession._id, student: sm.studentId },
            update: {
              $set: {
                session: rSession._id,
                academicSession: session._id,
                student: sm.studentId,
                marksObtained: sm.marksObtained,
                percentage: sm.percentage,
                rankSubject: rIdx + 1,
                status: 'present',
                updatedBy: teacherId,
              },
            },
            upsert: true,
          },
        });
      });
    }
  }

  if (dailyMarkBulkOps.length > 0) {
    await MarkEntry.bulkWrite(dailyMarkBulkOps);
  }
  console.log('✅ Daily Test Records seeded!');

  // 8. Notebook Check (Bulk)
  console.log('📚 Bulk Seeding Notebook Check records...');
  const notebookBulkOps = [];
  for (const cls of classesList) {
    const clsStudents = allStudents.filter((st) => String(st.class) === String(cls._id));
    for (const st of clsStudents) {
      for (const sub of SUBJECTS) {
        notebookBulkOps.push({
          updateOne: {
            filter: { school: school._id, academicSession: session._id, student: st._id, subject: sub },
            update: {
              $set: {
                school: school._id,
                academicSession: session._id,
                class: cls._id,
                student: st._id,
                subject: sub,
                chapters: [
                  { chapterNumber: 1, status: 'Checked' },
                  { chapterNumber: 2, status: 'Checked' },
                  { chapterNumber: 3, status: 'Checked' },
                  { chapterNumber: 4, status: 'Checked' },
                  { chapterNumber: 5, status: st.rollNo % 3 === 0 ? 'Pending' : 'Checked' },
                ],
              },
            },
            upsert: true,
          },
        });
      }
    }
  }

  if (notebookBulkOps.length > 0) {
    await NotebookCheck.bulkWrite(notebookBulkOps);
  }
  console.log('✅ Notebook Check records seeded!');

  // 9. 3 Months Attendance Records (Bulk)
  console.log('📅 Bulk Seeding 3 Months Attendance Records...');
  const attendanceWorkingDays = [];
  const curr = new Date();
  for (let i = 1; i <= 90; i++) {
    const d = new Date(curr);
    d.setDate(curr.getDate() - i);
    if (d.getDay() !== 0) {
      attendanceWorkingDays.push(d.toISOString().split('T')[0]);
    }
  }

  const attendanceBulkOps = [];
  for (const cls of classesList) {
    const clsStudents = allStudents.filter((st) => String(st.class) === String(cls._id));
    for (const dateStr of attendanceWorkingDays) {
      const records = clsStudents.map((st) => ({
        student: st._id,
        status: (st.rollNo + dateStr.length) % 11 === 0 ? 'absent' : 'present',
      }));

      attendanceBulkOps.push({
        updateOne: {
          filter: { school: school._id, class: cls._id, date: dateStr },
          update: {
            $set: {
              school: school._id,
              class: cls._id,
              date: dateStr,
              records,
              markedBy: teacherId,
            },
          },
          upsert: true,
        },
      });
    }
  }

  if (attendanceBulkOps.length > 0) {
    await Attendance.bulkWrite(attendanceBulkOps);
  }
  console.log(`✅ Seeded ${attendanceBulkOps.length} Attendance Records!`);

  console.log('🎉 ALL DATA A-TO-Z SEEDED SUCCESSFULLY! (Results, Tests, Performance, Notebooks, Attendance Ready)');
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
