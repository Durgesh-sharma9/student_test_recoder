import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDB } from '../src/config/db.js';

import School from '../src/models/School.js';
import User from '../src/models/User.js';
import Plan from '../src/models/Plan.js';
import AcademicSession from '../src/models/AcademicSession.js';
import Class from '../src/models/Class.js';
import Student from '../src/models/Student.js';
import Parent from '../src/models/Parent.js';
import ResultSession from '../src/models/ResultSession.js';
import MarkEntry from '../src/models/MarkEntry.js';
import Attendance from '../src/models/Attendance.js';
import NotebookCheck from '../src/models/NotebookCheck.js';
import Activity from '../src/models/Activity.js';

const DEMO_SCHOOL_EMAIL = 'demo@school.com';
const ADMIN_PASSWORD = 'Password@123';
const TEACHER_PASSWORD = 'Teacher@123';
const PARENT_PASSWORD = 'Parent@123';

const INDIAN_FIRST_NAMES_MALE = [
  'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan',
  'Krishna', 'Ishaan', 'Shaurya', 'Kabir', 'Rohan', 'Dhruv', 'Atharv', 'Devansh',
  'Kunal', 'Manish', 'Harsh', 'Yash', 'Varun', 'Nikhil', 'Gaurav', 'Abhishek',
  'Pranav', 'Mayank', 'Siddharth', 'Tanmay', 'Ayush', 'Utkarsh', 'Samar', 'Deepak'
];

const INDIAN_FIRST_NAMES_FEMALE = [
  'Ananya', 'Diya', 'Saanvi', 'Aadhya', 'Kiara', 'Myra', 'Pari', 'Anika',
  'Navya', 'Riya', 'Sneha', 'Tanvi', 'Isha', 'Avani', 'Prisha', 'Kavya',
  'Pooja', 'Shreya', 'Megha', 'Divya', 'Payal', 'Simran', 'Kritika', 'Ritika',
  'Palak', 'Akshita', 'Vanshika', 'Nandini', 'Khushi', 'Bhavya', 'Trisha', 'Garima'
];

const INDIAN_LAST_NAMES = [
  'Sharma', 'Verma', 'Gupta', 'Mehta', 'Joshi', 'Singh', 'Choudhary', 'Patel',
  'Mishra', 'Agarwal', 'Bansal', 'Rathore', 'Yadav', 'Saxena', 'Trivedi', 'Bhatia',
  'Jain', 'Khandelwal', 'Soni', 'Pandey', 'Dubey', 'Tiwari', 'Goyal', 'Mittal'
];

const SUBJECTS_LIST = [
  'MATHEMATICS', 'SCIENCE', 'ENGLISH', 'HINDI', 'SOCIAL STUDIES',
  'PHYSICS', 'CHEMISTRY', 'BIOLOGY', 'COMPUTER SCIENCE',
  'ACCOUNTANCY', 'BUSINESS STUDIES', 'ECONOMICS', 'HISTORY',
  'POLITICAL SCIENCE', 'GEOGRAPHY', 'EVS', 'DRAWING', 'GENERAL KNOWLEDGE'
];

const CLASSES_DATA = [
  { name: 'NURSERY', section: 'A' },
  { name: 'LKG', section: 'A' },
  { name: 'UKG', section: 'A' },
  { name: 'CLASS 1', section: 'A' },
  { name: 'CLASS 1', section: 'B' },
  { name: 'CLASS 2', section: 'A' },
  { name: 'CLASS 2', section: 'B' },
  { name: 'CLASS 3', section: 'A' },
  { name: 'CLASS 3', section: 'B' },
  { name: 'CLASS 4', section: 'A' },
  { name: 'CLASS 4', section: 'B' },
  { name: 'CLASS 5', section: 'A' },
  { name: 'CLASS 5', section: 'B' },
  { name: 'CLASS 6', section: 'A' },
  { name: 'CLASS 6', section: 'B' },
  { name: 'CLASS 7', section: 'A' },
  { name: 'CLASS 7', section: 'B' },
  { name: 'CLASS 8', section: 'A' },
  { name: 'CLASS 8', section: 'B' },
  { name: 'CLASS 9', section: 'A' },
  { name: 'CLASS 9', section: 'B' },
  { name: 'CLASS 10', section: 'A' },
  { name: 'CLASS 10', section: 'B' },
  { name: 'CLASS 11', section: 'SCIENCE' },
  { name: 'CLASS 11', section: 'COMMERCE' },
  { name: 'CLASS 11', section: 'ARTS' },
  { name: 'CLASS 12', section: 'SCIENCE' },
  { name: 'CLASS 12', section: 'COMMERCE' },
  { name: 'CLASS 12', section: 'ARTS' },
];

// Student counts per class (SUMS EXACTLY TO 842 STUDENTS)
const CLASS_STUDENT_COUNTS = {
  'NURSERY - A': 22,
  'LKG - A': 24,
  'UKG - A': 25,
  'CLASS 1 - A': 30,
  'CLASS 1 - B': 28,
  'CLASS 2 - A': 29,
  'CLASS 2 - B': 28,
  'CLASS 3 - A': 32,
  'CLASS 3 - B': 29,
  'CLASS 4 - A': 31,
  'CLASS 4 - B': 30,
  'CLASS 5 - A': 33,
  'CLASS 5 - B': 31,
  'CLASS 6 - A': 32,
  'CLASS 6 - B': 30,
  'CLASS 7 - A': 29,
  'CLASS 7 - B': 28,
  'CLASS 8 - A': 31,
  'CLASS 8 - B': 28,
  'CLASS 9 - A': 34,
  'CLASS 9 - B': 32,
  'CLASS 10 - A': 35,
  'CLASS 10 - B': 32,
  'CLASS 11 - SCIENCE': 32,
  'CLASS 11 - COMMERCE': 26,
  'CLASS 11 - ARTS': 22,
  'CLASS 12 - SCIENCE': 30,
  'CLASS 12 - COMMERCE': 25,
  'CLASS 12 - ARTS': 24,
};

// 59 Realistic Teachers
const TEACHER_NAMES = [
  'Mr. Rajesh Verma', 'Mrs. Anita Gupta', 'Ms. Priya Sen', 'Mr. Suresh Kumar', 'Dr. Amit Joshi',
  'Mrs. Sunita Rao', 'Mrs. Meenakshi Jain', 'Mr. Vikram Singh', 'Mr. Rahul Mehra', 'Ms. Pooja Sharma',
  'Mr. Sanjay Agarwal', 'Mrs. Rekha Bansal', 'Mr. Deepak Rathore', 'Ms. Neha Tiwari', 'Mr. Ashok Pandey',
  'Mrs. Sangeeta Dubey', 'Mr. Mukesh Sharma', 'Ms. Ritu Goyal', 'Mr. Alok Saxena', 'Mrs. Kiran Patel',
  'Mr. Hemant Mishra', 'Ms. Shilpa Khandelwal', 'Mr. Pankaj Soni', 'Mrs. Geeta Trivedi', 'Mr. Vinod Bhatia',
  'Ms. Vandana Joshi', 'Mr. Manoj Choudhary', 'Mrs. Preeti Verma', 'Mr. Naveen Yadav', 'Ms. Divya Jain',
  'Mr. Anil Mittal', 'Mrs. Rashmi Singh', 'Mr. Gaurav Gupta', 'Ms. Swati Sharma', 'Mr. Rajendra Meena',
  'Mrs. Shalini Saxena', 'Mr. Pradeep Kumar', 'Ms. Anjali Agarwal', 'Mr. Tarun Sharma', 'Mrs. Sunita Verma',
  'Mr. Rakesh Goyal', 'Ms. Sneha Joshi', 'Mr. Yogesh Bansal', 'Mrs. Manju Mishra', 'Mr. Jitendra Patel',
  'Ms. Barkha Sharma', 'Mr. Kamal Kishore', 'Mrs. Usha Choudhary', 'Mr. Harish Tiwari', 'Ms. Sarita Soni',
  'Mr. Lokesh Pandey', 'Mrs. Dolly Rathore', 'Mr. Sandeep Dubey', 'Ms. Kavita Jain', 'Mr. Mohit Khandelwal',
  'Mrs. Sudha Trivedi', 'Mr. Bhagwan Das', 'Ms. Jyoti Bhatia', 'Dr. K. L. Sharma'
];

const seedDemoSchool = async () => {
  console.log('🚀 Starting Demo School Seed Process for 59 Teachers & 842 Students...');
  await connectDB();

  // Pre-hash passwords for performance
  const hashedAdminPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const hashedTeacherPassword = await bcrypt.hash(TEACHER_PASSWORD, 10);
  const hashedParentPassword = await bcrypt.hash(PARENT_PASSWORD, 10);

  // 1. Find or create Premium/Elite Plan
  let plan = await Plan.findOne({ slug: 'premium_yearly' });
  if (!plan) {
    plan = await Plan.findOne({ isActive: true });
  }
  if (!plan) {
    plan = await Plan.create({
      name: 'Elite School Annual',
      slug: 'premium_yearly',
      planType: 'premium',
      billingCycle: 'yearly',
      durationDays: 365,
      maxTeachers: 100,
      maxStudents: 5000,
      teacherCapacityType: 'unlimited',
      studentCapacityType: 'unlimited',
      highlights: ['All Classes Nursery to 12th', 'Daily Tests & Exam Analytics', 'Parent Portal Access'],
      basePrice: 9999,
      finalPrice: 9999,
      price: 9999,
      features: {
        dailyTests: true,
        mainExams: true,
        parentPortal: true,
        attendance: true,
        notebookChecking: true,
        customBranding: true
      },
      isActive: true
    });
  }

  // 2. Cleanup existing demo school
  let existingSchool = await School.findOne({ email: DEMO_SCHOOL_EMAIL });
  if (existingSchool) {
    console.log('🧹 Cleaning up previous demo school records...');
    const schoolId = existingSchool._id;
    const sessionIds = await ResultSession.find({ school: schoolId }).distinct('_id');
    await Promise.all([
      User.deleteMany({ school: schoolId }),
      Class.deleteMany({ school: schoolId }),
      Student.deleteMany({ school: schoolId }),
      Parent.deleteMany({ school: schoolId }),
      AcademicSession.deleteMany({ school: schoolId }),
      ResultSession.deleteMany({ school: schoolId }),
      MarkEntry.deleteMany({ session: { $in: sessionIds } }),
      Attendance.deleteMany({ school: schoolId }),
      NotebookCheck.deleteMany({ school: schoolId }),
      Activity.deleteMany({ school: schoolId }),
      School.deleteOne({ _id: schoolId }),
    ]);
  }

  // 3. Create School
  const expiresDate = new Date();
  expiresDate.setFullYear(expiresDate.getFullYear() + 2);

  const school = await School.create({
    schoolName: 'Delhi Public Academy',
    adminName: 'Dr. Narendra Sharma',
    email: DEMO_SCHOOL_EMAIL,
    phone: '9829012345',
    schoolCode: 'DPA101',
    address: 'Plot 45, Sector 12, Vidhyadhar Nagar',
    city: 'Jaipur',
    state: 'Rajasthan',
    pincode: '302039',
    plan: plan._id,
    planExpiresAt: expiresDate,
    isActive: true,
    trialUsed: true,
    subjects: SUBJECTS_LIST,
    showParentLeaderboard: true,
  });

  console.log(`✅ School Created: ${school.schoolName} (${school.email})`);

  // 4. Create School Admin User directly with hashed password
  const adminUserResult = await User.collection.insertOne({
    school: school._id,
    name: 'Dr. Narendra Sharma',
    email: DEMO_SCHOOL_EMAIL,
    password: hashedAdminPassword,
    role: 'school_admin',
    phoneNo: '9829012345',
    isActive: true,
    status: 'Active',
    isEmailVerified: true,
    canTakeAttendance: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const adminUserId = adminUserResult.insertedId;
  console.log(`✅ School Admin Created: ${DEMO_SCHOOL_EMAIL} / ${ADMIN_PASSWORD}`);

  // 5. Create Active Academic Session (2026-2027)
  const academicSession = await AcademicSession.create({
    school: school._id,
    sessionName: '2026-2027',
    startDate: new Date('2026-04-01'),
    endDate: new Date('2027-03-31'),
    status: 'active',
  });
  console.log(`✅ Academic Session Created: ${academicSession.sessionName}`);

  // 6. Create Classes (Nursery to 12th)
  const classDocsToInsert = CLASSES_DATA.map(c => ({
    school: school._id,
    className: c.name,
    section: c.section,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));
  const insertedClasses = await Class.insertMany(classDocsToInsert);
  
  const classDocsMap = new Map(); // key: "CLASS 1 - A" -> doc
  insertedClasses.forEach(c => {
    const key = `${c.className} - ${c.section}`;
    classDocsMap.set(key, c);
  });
  console.log(`✅ Created ${insertedClasses.length} Classes (Nursery to 12th)`);

  // 7. Create EXACTLY 59 Teachers & Assignments
  const teacherDocsToInsert = [];
  for (let i = 0; i < 59; i++) {
    const name = TEACHER_NAMES[i] || `Teacher ${i + 1} Sharma`;
    const subject = SUBJECTS_LIST[i % SUBJECTS_LIST.length];
    
    // Assign 2 to 3 classes to each teacher
    const classIdx1 = i % insertedClasses.length;
    const classIdx2 = (i + 5) % insertedClasses.length;
    const assignedClassIds = [insertedClasses[classIdx1]._id, insertedClasses[classIdx2]._id];
    
    const assignments = [
      {
        class: insertedClasses[classIdx1]._id,
        subject: subject,
        totalChapters: 12,
        academicSession: academicSession._id,
      },
      {
        class: insertedClasses[classIdx2]._id,
        subject: subject,
        totalChapters: 12,
        academicSession: academicSession._id,
      }
    ];

    const email = i === 0 ? 'teacher.math@demoschool.com' : `teacher.${i + 1}@demoschool.com`;

    teacherDocsToInsert.push({
      school: school._id,
      name: name,
      teacherName: name,
      email: email,
      password: hashedTeacherPassword,
      role: 'teacher',
      phoneNo: `98291${String(10000 + i).padStart(5, '0')}`,
      isActive: true,
      status: 'Active',
      isEmailVerified: true,
      canTakeAttendance: true,
      assignedClasses: assignedClassIds,
      assignments: assignments,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
  const insertedTeachers = await User.insertMany(teacherDocsToInsert);
  console.log(`✅ Created EXACTLY ${insertedTeachers.length} Teachers with subject & class assignments`);

  // 8. Create Students & Parents (Exact 842 students distributed across all classes)
  const parentsToInsert = [];
  const studentsToInsert = [];
  const allStudentRefs = [];
  let globalStudentIndex = 1;

  for (const [classKey, classDoc] of classDocsMap.entries()) {
    const studentsInThisClass = CLASS_STUDENT_COUNTS[classKey] || 25;

    for (let r = 1; r <= studentsInThisClass; r++) {
      const isMale = (r % 2 === 1);
      const firstName = isMale 
        ? INDIAN_FIRST_NAMES_MALE[(globalStudentIndex + r) % INDIAN_FIRST_NAMES_MALE.length]
        : INDIAN_FIRST_NAMES_FEMALE[(globalStudentIndex + r) % INDIAN_FIRST_NAMES_FEMALE.length];
      const lastName = INDIAN_LAST_NAMES[(globalStudentIndex * 3 + r) % INDIAN_LAST_NAMES.length];
      const studentName = `${firstName} ${lastName}`;
      const parentName = `${isMale ? 'Mr. Rajesh' : 'Mr. Suresh'} ${lastName}`;
      const parentPhone = `98290${String(10000 + globalStudentIndex).padStart(5, '0')}`;
      const parentEmail = `parent.${firstName.toLowerCase()}${globalStudentIndex}@gmail.com`;

      const parentId = new mongoose.Types.ObjectId();
      const studentId = new mongoose.Types.ObjectId();

      parentsToInsert.push({
        _id: parentId,
        school: school._id,
        parentName: parentName,
        phone: parentPhone,
        email: parentEmail,
        password: hashedParentPassword,
        status: 'Active',
        linkedStudents: [studentId],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      studentsToInsert.push({
        _id: studentId,
        school: school._id,
        academicSession: academicSession._id,
        name: studentName,
        rollNo: String(r),
        class: classDoc._id,
        gender: isMale ? 'male' : 'female',
        parent: parentId,
        admissionDate: new Date('2026-04-05'),
        admissionNo: `ADM-26-${String(globalStudentIndex).padStart(4, '0')}`,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      allStudentRefs.push({
        studentId: studentId,
        studentName: studentName,
        classDoc: classDoc,
        classKey: classKey,
      });

      globalStudentIndex++;
    }
  }

  await Parent.insertMany(parentsToInsert);
  await Student.insertMany(studentsToInsert);
  console.log(`✅ Created EXACTLY ${studentsToInsert.length} Students and ${parentsToInsert.length} Parents`);

  // 9. Create Daily Tests and Main Exams with Marks & Ranks
  console.log('📝 Generating Daily Tests, Exam Results, and Ranks in bulk...');
  const examSubjectsByClass = {
    'CLASS 10 - A': ['MATHEMATICS', 'SCIENCE', 'ENGLISH', 'SOCIAL STUDIES', 'HINDI'],
    'CLASS 10 - B': ['MATHEMATICS', 'SCIENCE', 'ENGLISH'],
    'CLASS 12 - SCIENCE': ['PHYSICS', 'CHEMISTRY', 'MATHEMATICS', 'BIOLOGY', 'ENGLISH'],
    'CLASS 12 - COMMERCE': ['ACCOUNTANCY', 'BUSINESS STUDIES', 'ECONOMICS', 'ENGLISH'],
    'CLASS 9 - A': ['MATHEMATICS', 'SCIENCE', 'ENGLISH'],
    'CLASS 8 - A': ['MATHEMATICS', 'SCIENCE', 'SOCIAL STUDIES'],
    'CLASS 5 - A': ['MATHEMATICS', 'ENGLISH', 'EVS', 'HINDI'],
    'NURSERY - A': ['DRAWING', 'ENGLISH', 'EVS'],
  };

  const defaultTeacher = insertedTeachers[0];
  const resultSessionsToInsert = [];
  const markEntriesToInsert = [];

  for (const [classKey, subjects] of Object.entries(examSubjectsByClass)) {
    const classDoc = classDocsMap.get(classKey);
    if (!classDoc) continue;

    const classStudents = allStudentRefs.filter(s => s.classKey === classKey);
    if (classStudents.length === 0) continue;

    for (const subject of subjects) {
      const assignedTeacher = insertedTeachers.find(t => t.assignments?.some(a => a.subject === subject)) || defaultTeacher;

      // 1. Daily Test 1
      const dailySessionId1 = new mongoose.Types.ObjectId();
      resultSessionsToInsert.push({
        _id: dailySessionId1,
        school: school._id,
        academicSession: academicSession._id,
        class: classDoc._id,
        subject: subject,
        category: 'daily',
        examType: 'Daily Test',
        testDate: new Date('2026-08-10'),
        maxMarks: 25,
        teacher: assignedTeacher._id,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const marks1 = classStudents.map((stud, idx) => ({
        studentId: stud.studentId,
        marks: Math.min(25, Math.max(10, 25 - Math.floor(idx * 0.6) + Math.floor(Math.random() * 3))),
      })).sort((a, b) => b.marks - a.marks);

      marks1.forEach((m, rank) => {
        markEntriesToInsert.push({
          session: dailySessionId1,
          academicSession: academicSession._id,
          student: m.studentId,
          marksObtained: m.marks,
          percentage: parseFloat(((m.marks / 25) * 100).toFixed(1)),
          rankSubject: rank + 1,
          status: 'present',
          updatedBy: assignedTeacher._id,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });

      // 2. Daily Test 2
      const dailySessionId2 = new mongoose.Types.ObjectId();
      resultSessionsToInsert.push({
        _id: dailySessionId2,
        school: school._id,
        academicSession: academicSession._id,
        class: classDoc._id,
        subject: subject,
        category: 'daily',
        examType: 'Daily Test',
        testDate: new Date('2026-08-25'),
        maxMarks: 25,
        teacher: assignedTeacher._id,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const marks2 = classStudents.map((stud, idx) => ({
        studentId: stud.studentId,
        marks: Math.min(25, Math.max(11, 25 - Math.floor(idx * 0.5) + Math.floor(Math.random() * 2))),
      })).sort((a, b) => b.marks - a.marks);

      marks2.forEach((m, rank) => {
        markEntriesToInsert.push({
          session: dailySessionId2,
          academicSession: academicSession._id,
          student: m.studentId,
          marksObtained: m.marks,
          percentage: parseFloat(((m.marks / 25) * 100).toFixed(1)),
          rankSubject: rank + 1,
          status: 'present',
          updatedBy: assignedTeacher._id,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });

      // 3. Main Exam (Half Yearly)
      const mainSessionId = new mongoose.Types.ObjectId();
      resultSessionsToInsert.push({
        _id: mainSessionId,
        school: school._id,
        academicSession: academicSession._id,
        class: classDoc._id,
        subject: subject,
        category: 'main',
        examType: 'Half Yearly',
        examDate: new Date('2026-09-15'),
        maxMarks: 100,
        teacher: assignedTeacher._id,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const marksMain = classStudents.map((stud, idx) => ({
        studentId: stud.studentId,
        marks: Math.min(100, Math.max(40, 98 - (idx * 2) + Math.floor(Math.random() * 4))),
      })).sort((a, b) => b.marks - a.marks);

      marksMain.forEach((m, rank) => {
        markEntriesToInsert.push({
          session: mainSessionId,
          academicSession: academicSession._id,
          student: m.studentId,
          marksObtained: m.marks,
          percentage: parseFloat(((m.marks / 100) * 100).toFixed(1)),
          rankSubject: rank + 1,
          status: 'present',
          updatedBy: assignedTeacher._id,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });
    }
  }

  await ResultSession.insertMany(resultSessionsToInsert);
  await MarkEntry.insertMany(markEntriesToInsert);
  console.log(`✅ Inserted ${resultSessionsToInsert.length} Test & Exam Sessions with ${markEntriesToInsert.length} Marks Entries`);

  // 10. Create Attendance Records for Recent Dates
  console.log('📅 Generating Attendance records in bulk...');
  const sampleDates = [
    { date: new Date('2026-09-01'), str: '2026-09-01' },
    { date: new Date('2026-09-02'), str: '2026-09-02' }
  ];

  const attendanceToInsert = [];
  for (const [classKey, classDoc] of classDocsMap.entries()) {
    const classStudents = allStudentRefs.filter(s => s.classKey === classKey);
    if (classStudents.length === 0) continue;

    for (const d of sampleDates) {
      const records = classStudents.map((stud, idx) => ({
        student: stud.studentId,
        status: (idx % 12 === 0) ? 'absent' : 'present',
        remarks: (idx % 12 === 0) ? 'Leave application' : '',
      }));

      const totalPresent = records.filter(r => r.status === 'present').length;
      const totalAbsent = records.filter(r => r.status === 'absent').length;

      attendanceToInsert.push({
        school: school._id,
        class: classDoc._id,
        academicSession: academicSession._id,
        date: d.date,
        dateString: d.str,
        recordedBy: adminUserId || insertedTeachers[0]._id,
        records: records,
        totalStudents: records.length,
        totalPresent: totalPresent,
        totalAbsent: totalAbsent,
        totalLeave: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  await Attendance.insertMany(attendanceToInsert);
  console.log(`✅ Created ${attendanceToInsert.length} Attendance Daily Records`);

  // 11. Create 3 Recent Activities
  console.log('⚡ Generating 3 Recent Activities...');
  const now = new Date();
  const act1Time = new Date(now.getTime() - 1000 * 60 * 45); // 45 mins ago
  const act2Time = new Date(now.getTime() - 1000 * 60 * 180); // 3 hours ago
  const act3Time = new Date(now.getTime() - 1000 * 60 * 360); // 6 hours ago

  await Activity.create([
    {
      school: school._id,
      actor: insertedTeachers[0]._id, // Mr. Rajesh Verma
      action: 'Generated Daily Test result for Class 10 - A (MATHEMATICS)',
      meta: { type: 'result_generated' },
      createdAt: act1Time,
      updatedAt: act1Time,
    },
    {
      school: school._id,
      actor: insertedTeachers[4]._id, // Dr. Amit Joshi
      action: 'Marked daily attendance for Class 12 - SCIENCE (30 Students)',
      meta: { type: 'attendance_marked' },
      createdAt: act2Time,
      updatedAt: act2Time,
    },
    {
      school: school._id,
      actor: adminUserId, // Dr. Narendra Sharma (Principal)
      action: 'Published Half Yearly Examination Schedule for Nursery to Class 12',
      meta: { type: 'exam_published' },
      createdAt: act3Time,
      updatedAt: act3Time,
    }
  ]);
  console.log('✅ Created 3 Recent Activities');

  console.log('\n======================================================');
  console.log('🎉 DEMO SCHOOL SEEDING COMPLETED!');
  console.log('======================================================');
  console.log(`🏫 School Name   : ${school.schoolName} (${school.schoolCode})`);
  console.log(`🔐 Admin Login   : ${DEMO_SCHOOL_EMAIL}`);
  console.log(`🔑 Admin Pass    : ${ADMIN_PASSWORD}`);
  console.log(`👨‍🏫 Total Teachers: ${insertedTeachers.length} (EXACT 59)`);
  console.log(`📚 Classes       : Nursery, LKG, UKG, 1st to 12th (Total ${CLASSES_DATA.length} Classes)`);
  console.log(`👨‍🎓 Total Students: ${studentsToInsert.length} (EXACT 842)`);
  console.log(`📊 Test Sessions : ${resultSessionsToInsert.length} Sessions`);
  console.log(`📝 Marks Entries : ${markEntriesToInsert.length} Records`);
  console.log(`⚡ Recent Activities: 3 Events`);
  console.log('======================================================\n');

  await mongoose.disconnect();
};

seedDemoSchool().catch((err) => {
  console.error('❌ Seeding Error:', err);
  process.exit(1);
});
