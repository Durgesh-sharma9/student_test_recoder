import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from '../src/models/User.js';
import Parent from '../src/models/Parent.js';
import Student from '../src/models/Student.js';
import School from '../src/models/School.js';
import Class from '../src/models/Class.js';
import AcademicSession from '../src/models/AcademicSession.js';
import ResultSession from '../src/models/ResultSession.js';
import MarkEntry from '../src/models/MarkEntry.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/school_daily_test';

async function seedParentData() {
  try {
    console.log('Connecting to MongoDB:', MONGODB_URI);
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB successfully!');

    // Find school
    let school = await School.findOne({ isActive: true });
    if (!school) {
      school = await School.findOne();
    }
    if (!school) {
      console.error('No school found in database! Please register a school first.');
      process.exit(1);
    }
    console.log(`Using school: ${school.schoolName} (${school._id})`);

    // Find or create academic session
    let academicSession = await AcademicSession.findOne({ school: school._id, status: 'active' });
    if (!academicSession) {
      academicSession = await AcademicSession.create({
        school: school._id,
        sessionName: '2026-27',
        startDate: new Date('2026-04-01'),
        endDate: new Date('2027-03-31'),
        status: 'active',
      });
      console.log(`Created academic session: ${academicSession.sessionName}`);
    }

    // Find or create class
    let cls = await Class.findOne({ school: school._id });
    if (!cls) {
      cls = await Class.create({
        school: school._id,
        className: '10',
        section: 'A',
      });
      console.log(`Created class 10-A: ${cls._id}`);
    }

    const parentPassword = 'Password123!';

    // 1. Create or update Parent in User model (for auth login)
    const parentEmail = 'parent@test.com';
    let parentUser = await User.findOne({ email: parentEmail });

    if (!parentUser) {
      parentUser = await User.create({
        school: school._id,
        name: 'Rajesh Sharma',
        email: parentEmail,
        password: parentPassword,
        role: 'parent',
        phoneNo: '9876543210',
        isActive: true,
        status: 'Active',
      });
      console.log(`Created parent User account: ${parentEmail}`);
    } else {
      parentUser.password = parentPassword;
      parentUser.role = 'parent';
      parentUser.isActive = true;
      parentUser.status = 'Active';
      await parentUser.save();
      console.log(`Updated parent User account: ${parentEmail}`);
    }

    // 2. Create or update Parent document
    let parentDoc = await Parent.findOne({ school: school._id, email: parentEmail });
    if (!parentDoc) {
      parentDoc = await Parent.create({
        school: school._id,
        parentName: 'Rajesh Sharma',
        email: parentEmail,
        phone: '9876543210',
        password: parentPassword, // Pre-save hook will hash it once
        status: 'Active',
      });
      console.log(`Created Parent document: ${parentDoc._id}`);
    } else {
      parentDoc.password = parentPassword;
      parentDoc.status = 'Active';
      await parentDoc.save();
      console.log(`Updated Parent document password: ${parentDoc._id}`);
    }

    // 3. Find or create Students for this parent
    const studentNames = ['Aarav Sharma', 'Ananya Sharma'];
    const linkedStudentIds = [];

    for (let i = 0; i < studentNames.length; i++) {
      const sName = studentNames[i];
      const rollNo = `${i + 101}`;

      let student = await Student.findOne({ school: school._id, rollNo });
      if (!student) {
        student = await Student.create({
          school: school._id,
          academicSession: academicSession._id,
          class: cls._id,
          name: sName,
          rollNo,
          gender: i === 0 ? 'male' : 'female',
          admissionDate: new Date('2026-04-01'),
          fatherName: 'Rajesh Sharma',
          motherName: 'Sunita Sharma',
          phone: '9876543210',
          parent: parentDoc._id,
        });
        console.log(`Created student: ${sName} (Roll: ${rollNo})`);
      } else {
        student.parent = parentDoc._id;
        student.fatherName = 'Rajesh Sharma';
        student.academicSession = academicSession._id;
        await student.save();
        console.log(`Updated student: ${sName} (Roll: ${rollNo})`);
      }

      linkedStudentIds.push(student._id);

      // Create dummy daily test result for this student if missing
      const resultSession = await ResultSession.findOne({ school: school._id, class: cls._id });
      if (resultSession) {
        const markExists = await MarkEntry.findOne({ session: resultSession._id, student: student._id });
        if (!markExists) {
          await MarkEntry.create({
            session: resultSession._id,
            student: student._id,
            academicSession: academicSession._id,
            updatedBy: parentUser._id,
            marksObtained: 45 + i * 3,
            maxMarks: 50,
            percentage: 90 + i * 2,
            rankSubject: i + 1,
            status: 'present',
          });
          console.log(`Seeded test marks for ${sName}`);
        }
      }
    }

    // Link students to parent doc
    parentDoc.linkedStudents = linkedStudentIds;
    await parentDoc.save();

    console.log('\n=============================================');
    console.log('✅ PARENT SEEDING COMPLETE!');
    console.log('=============================================');
    console.log('Parent Login Credentials:');
    console.log('📧 Email:    parent@test.com');
    console.log('🔑 Password: Password123!');
    console.log('🏫 School:   ', school.schoolName);
    console.log('👨‍👩‍👧 Linked Students:', studentNames.join(', '));
    console.log('=============================================\n');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding parent data:', error);
    process.exit(1);
  }
}

seedParentData();
