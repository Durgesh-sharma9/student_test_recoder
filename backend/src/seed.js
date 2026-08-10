import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import User from './models/User.js';
import School from './models/School.js';
import Plan from './models/Plan.js';
import Class from './models/Class.js';
import Student from './models/Student.js';
import AcademicSession from './models/AcademicSession.js';

const seed = async () => {
  await connectDB();
  await Promise.all([
    User.deleteMany({}),
    School.deleteMany({}),
    Plan.deleteMany({}),
    Class.deleteMany({}),
    Student.deleteMany({}),
    AcademicSession.deleteMany({}),
  ]);

  const [trial, basic, premium] = await Plan.insertMany([
    { name: 'Trial', slug: 'trial', durationDays: 14, maxTeachers: 5, maxStudents: 100 },
    { name: 'Basic', slug: 'basic', durationDays: 365, maxTeachers: 20, maxStudents: 500 },
    { name: 'Premium', slug: 'premium', durationDays: 365, maxTeachers: 100, maxStudents: 5000 },
  ]);

  await User.create({
    name: process.env.SUPER_ADMIN_NAME || 'Super Admin',
    email: process.env.SUPER_ADMIN_EMAIL || 'super@school.com',
    password: process.env.SUPER_ADMIN_PASSWORD || 'super123',
    role: 'super_admin',
    isEmailVerified: true,
  });

  const expires = new Date();
  expires.setDate(expires.getDate() + trial.durationDays);

  const school = await School.create({
    schoolName: 'Demo Public School',
    adminName: 'School Admin',
    email: 'admin@school.com',
    phone: '9999999999',
    plan: trial._id,
    planExpiresAt: expires,
  });

  const academicSession = await AcademicSession.create({
    school: school._id,
    sessionName: '2026-2027',
    startDate: new Date('2026-04-01'),
    endDate: new Date('2027-03-31'),
    status: 'active',
  });

  const schoolAdmin = await User.create({
    school: school._id,
    name: 'School Admin',
    email: 'admin@school.com',
    password: 'admin123',
    role: 'school_admin',
    phoneNo: '9999999999',
    isEmailVerified: true,
  });

  // Create classes 1-10 (section A)
  const classes = await Class.insertMany(
    Array.from({ length: 10 }).map((_, i) => ({
      school: school._id,
      className: String(i + 1),
      section: 'A',
    }))
  );

  // Create 5 teachers
  const teacherSeed = [
    { teacherName: 'Aditi Sharma', phoneNo: '8888888801' },
    { teacherName: 'Rahul Verma', phoneNo: '8888888802' },
    { teacherName: 'Neha Singh', phoneNo: '8888888803' },
    { teacherName: 'Arjun Mehta', phoneNo: '8888888804' },
    { teacherName: 'Priya Gupta', phoneNo: '8888888805' },
  ];

  const teachers = [];
  for (let i = 0; i < teacherSeed.length; i += 1) {
    const t = teacherSeed[i];
    teachers.push(
      await User.create({
        school: school._id,
        teacherName: t.teacherName,
        name: t.teacherName,
        email: `teacher${i + 1}@school.com`,
        password: 'teacher123',
        role: 'teacher',
        phoneNo: t.phoneNo,
      })
    );
  }

  // Assign classes/subjects to teachers (2 classes each, common subjects)
  const SUBJECTS = ['MATHS', 'SCIENCE', 'ENGLISH', 'HINDI', 'SOCIAL'];
  for (let i = 0; i < teachers.length; i += 1) {
    const t = teachers[i];
    const c1 = classes[(i * 2) % classes.length];
    const c2 = classes[(i * 2 + 1) % classes.length];
    t.assignedClasses = [c1._id, c2._id];
    t.assignments = [
      { class: c1._id, subject: SUBJECTS[i % SUBJECTS.length], academicSession: academicSession._id },
      { class: c1._id, subject: SUBJECTS[(i + 1) % SUBJECTS.length], academicSession: academicSession._id },
      { class: c2._id, subject: SUBJECTS[(i + 2) % SUBJECTS.length], academicSession: academicSession._id },
    ];
    await t.save();
  }

  // 20 students per class (unique rollNo per class)
  const firstNames = ['Aarav', 'Vihaan', 'Aadhya', 'Isha', 'Ravi', 'Meera', 'Arjun', 'Anaya', 'Kabir', 'Diya'];
  const lastNames = ['Kumar', 'Sharma', 'Verma', 'Singh', 'Gupta', 'Mehta', 'Patel', 'Joshi'];

  const students = [];
  for (const cls of classes) {
    for (let r = 1; r <= 20; r += 1) {
      const fn = firstNames[(r - 1) % firstNames.length];
      const ln = lastNames[(r - 1 + Number(cls.className)) % lastNames.length];
      students.push({
        school: school._id,
        academicSession: academicSession._id,
        class: cls._id,
        rollNo: String(r),
        name: `${fn} ${ln}`,
        gender: r % 2 === 0 ? 'male' : 'female',
        admissionDate: new Date(),
      });
    }
  }
  await Student.insertMany(students);

  console.log('Seed OK');
  console.log('Super Admin: Created successfully (credentials configured in .env)');
  console.log('School Admin: admin@school.com / admin123');
  console.log('Teachers: teacher1@school.com .. teacher5@school.com / teacher123');
  void schoolAdmin;
  void basic;
  void premium;

  await mongoose.disconnect();
};

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
