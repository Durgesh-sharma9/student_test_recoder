import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import School from '../src/models/School.js';
import Class from '../src/models/Class.js';
import Student from '../src/models/Student.js';
import User from '../src/models/User.js';
import Attendance from '../src/models/Attendance.js';
import AcademicSession from '../src/models/AcademicSession.js';

const seedAugustAttendance = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/school_erp';
    console.log('Connecting to MongoDB:', mongoUri);
    await mongoose.connect(mongoUri);

    const activeSession = (await AcademicSession.findOne({ status: 'active' })) || (await AcademicSession.findOne({}));
    const schools = await School.find({});

    if (!schools.length) {
      console.log('No schools found.');
      process.exit(0);
    }

    console.log(`Seeding August 2026 & July 2026 attendance for ${schools.length} school(s)...`);

    for (const school of schools) {
      const schoolId = school._id;
      const classes = await Class.find({ school: schoolId });
      const staffUser = (await User.findOne({ school: schoolId, role: { $in: ['admin', 'teacher', 'attender'] } })) || (await User.findOne({ role: 'admin' }));

      if (!classes.length) continue;

      // Seed for July 2026 and August 2026 (year 2026)
      const dateList = [];

      // August 2026 (Aug 1 to Aug 31)
      for (let day = 1; day <= 31; day++) {
        const dStr = String(day).padStart(2, '0');
        const dateString = `2026-08-${dStr}`;
        const dateObj = new Date(2026, 7, day); // month 7 is August (0-indexed)
        if (dateObj.getDay() !== 0) { // Exclude Sundays
          dateList.push({ dateObj, dateString });
        }
      }

      // July 2026 (Jul 1 to Jul 31)
      for (let day = 1; day <= 31; day++) {
        const dStr = String(day).padStart(2, '0');
        const dateString = `2026-07-${dStr}`;
        const dateObj = new Date(2026, 6, day); // month 6 is July
        if (dateObj.getDay() !== 0) { // Exclude Sundays
          dateList.push({ dateObj, dateString });
        }
      }

      let totalDocs = 0;

      for (const cls of classes) {
        const students = await Student.find({ school: schoolId, class: cls._id });
        if (!students.length) continue;

        for (const { dateObj, dateString } of dateList) {
          const records = students.map((st, idx) => {
            const hash = dayNum(dateString + st._id.toString());
            const rand = hash % 20;
            let status = 'present';
            let remarks = '';

            if (rand === 0 || rand === 1 || rand === 2) {
              status = 'absent';
              remarks = 'Absent without notice';
            }

            return {
              student: st._id,
              status,
              remarks,
            };
          });

          const totalStudents = records.length;
          const totalPresent = records.filter((r) => r.status === 'present').length;
          const totalAbsent = records.filter((r) => r.status === 'absent').length;
          const totalLeave = records.filter((r) => r.status === 'leave').length;

          await Attendance.findOneAndUpdate(
            { school: schoolId, class: cls._id, dateString },
            {
              school: schoolId,
              class: cls._id,
              academicSession: activeSession?._id,
              date: dateObj,
              dateString,
              recordedBy: staffUser?._id,
              records,
              totalStudents,
              totalPresent,
              totalAbsent,
              totalLeave,
            },
            { upsert: true, new: true }
          );

          totalDocs++;
        }
      }

      console.log(`Seeded ${totalDocs} attendance records for ${school.schoolName}`);
    }

    console.log('August 2026 Attendance Seeding Complete!');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding August attendance:', err);
    process.exit(1);
  }
};

function dayNum(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash += str.charCodeAt(i);
  return hash;
}

seedAugustAttendance();
