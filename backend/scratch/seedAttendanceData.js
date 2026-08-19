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

const seedAttendance = async () => {
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

    console.log(`Seeding attendance for ${schools.length} school(s)...`);

    for (const school of schools) {
      const schoolId = school._id;
      const classes = await Class.find({ school: schoolId });
      const staffUser = (await User.findOne({ school: schoolId, role: { $in: ['admin', 'teacher', 'attender'] } })) || (await User.findOne({ role: 'admin' }));

      if (!classes.length) {
        console.log(`No classes found for school ${school.schoolName}`);
        continue;
      }

      console.log(`Processing ${classes.length} classes for school: ${school.schoolName}`);

      // Generate date strings for past 60 days
      const today = new Date();
      const dateStrings = [];

      for (let i = 0; i < 60; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        // Exclude Sundays
        if (d.getDay() !== 0) {
          const dateString = d.toISOString().split('T')[0];
          dateStrings.push({ dateObj: d, dateString });
        }
      }

      let totalRecordsCreated = 0;

      for (const cls of classes) {
        const students = await Student.find({ school: schoolId, class: cls._id, isActive: true });
        if (!students.length) continue;

        for (const { dateObj, dateString } of dateStrings) {
          const records = students.map((st, idx) => {
            // Random status distribution: 85% present, 10% absent, 5% leave
            const rand = (idx + dayNum(dateString)) % 20;
            let status = 'present';
            let remarks = '';
            if (rand === 0 || rand === 1) {
              status = 'absent';
              remarks = 'Uninformed Absence';
            } else if (rand === 2) {
              status = 'leave';
              remarks = 'Sick Leave Application';
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

          totalRecordsCreated++;
        }
      }

      console.log(`Successfully seeded ${totalRecordsCreated} daily attendance records for ${school.schoolName}!`);
    }

    console.log('Attendance Seeding Completed!');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding attendance:', err);
    process.exit(1);
  }
};

function dayNum(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash += str.charCodeAt(i);
  return hash;
}

seedAttendance();
