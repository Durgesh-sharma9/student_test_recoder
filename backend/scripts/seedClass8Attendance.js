import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../src/config/db.js';

import School from '../src/models/School.js';
import User from '../src/models/User.js';
import AcademicSession from '../src/models/AcademicSession.js';
import Class from '../src/models/Class.js';
import Student from '../src/models/Student.js';
import Attendance from '../src/models/Attendance.js';

const seedClass8Attendance = async () => {
  console.log('🚀 Seeding Clean Present/Absent Attendance for Class 8 - A...');
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

  const teacher = await User.findOne({ school: school._id, role: 'teacher' });

  // Generate working dates for April 2026 (Mon-Sat, skipping Sundays)
  const generateDatesForMonth = (year, monthIndex) => {
    const dates = [];
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, monthIndex, day);
      if (d.getDay() !== 0) { // Skip Sundays
        const dateString = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        dates.push({ date: d, dateString });
      }
    }
    return dates;
  };

  const aprilDates = generateDatesForMonth(2026, 3);
  const augustDates = generateDatesForMonth(2026, 7);
  const septemberDates = [
    { date: new Date('2026-09-01'), dateString: '2026-09-01' },
    { date: new Date('2026-09-02'), dateString: '2026-09-02' }
  ];

  const allDates = [...aprilDates, ...augustDates, ...septemberDates];

  // Delete old attendance records for Class 8 - A on these dates
  const dateStrings = allDates.map(d => d.dateString);
  await Attendance.deleteMany({
    school: school._id,
    class: class8A._id,
    dateString: { $in: dateStrings }
  });

  const attendanceDocs = [];

  for (let i = 0; i < allDates.length; i++) {
    const { date, dateString } = allDates[i];

    // Every single student is either present (P) or absent (A) - NO blank or missing entries!
    const records = students.map((s, idx) => {
      const isAbsent = (idx + i * 2) % 18 === 0;

      return {
        student: s._id,
        status: isAbsent ? 'absent' : 'present',
        remarks: isAbsent ? 'Absent' : '',
      };
    });

    const totalPresent = records.filter(r => r.status === 'present').length;
    const totalAbsent = records.filter(r => r.status === 'absent').length;

    attendanceDocs.push({
      school: school._id,
      class: class8A._id,
      academicSession: academicSession._id,
      date: date,
      dateString: dateString,
      recordedBy: teacher._id,
      records: records,
      totalStudents: records.length,
      totalPresent: totalPresent,
      totalAbsent: totalAbsent,
      totalLeave: 0,
      createdAt: date,
      updatedAt: date,
    });
  }

  await Attendance.insertMany(attendanceDocs);
  console.log(`✅ Successfully Created ${attendanceDocs.length} Clean Attendance Records for Class 8 - A`);
  console.log(`✅ Every student across all ${allDates.length} days is cleanly marked Present [P] or Absent [A] without any blanks!`);

  await mongoose.disconnect();
};

seedClass8Attendance().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
