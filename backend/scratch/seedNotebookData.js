import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import Student from '../src/models/Student.js';
import Class from '../src/models/Class.js';
import AcademicSession from '../src/models/AcademicSession.js';
import User from '../src/models/User.js';
import NotebookChapterUnlock from '../src/models/NotebookChapterUnlock.js';
import NotebookCheck from '../src/models/NotebookCheck.js';

const seedNotebookData = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/school_erp';
    console.log('Connecting to MongoDB:', mongoUri);
    await mongoose.connect(mongoUri);

    const activeSession = await AcademicSession.findOne({ status: 'active' }) || await AcademicSession.findOne({});
    if (!activeSession) {
      console.error('No active academic session found!');
      process.exit(1);
    }
    const schoolId = activeSession.school;

    // Find teachers and ensure teacher assignments exist with totalChapters
    const teachers = await User.find({ school: schoolId, role: 'teacher' });
    const classes = await Class.find({ school: schoolId });
    console.log(`Found ${teachers.length} teachers and ${classes.length} classes.`);

    // 1. Ensure at least one teacher has assignments with totalChapters for all classes & subjects
    const subjects = ['MATHS', 'SCIENCE', 'ENGLISH', 'HINDI', 'SOCIAL SCIENCE'];
    
    if (teachers.length > 0) {
      const primaryTeacher = teachers[0];
      const newAssignments = [];

      for (const cls of classes) {
        for (const sub of subjects) {
          newAssignments.push({
            academicSession: activeSession._id,
            class: cls._id,
            subject: sub,
            totalChapters: 6
          });
        }
      }

      primaryTeacher.assignments = newAssignments;
      await primaryTeacher.save();
      console.log(`Updated assignments for teacher: ${primaryTeacher.name}`);
    }

    // 2. Seed NotebookChapterUnlock and NotebookCheck for all students
    const students = await Student.find({ school: schoolId });
    console.log(`Seeding notebook check data for ${students.length} students...`);

    for (const cls of classes) {
      for (const sub of subjects) {
        // Unlock chapters 1, 2, 3, 4, 5 for this class & subject
        await NotebookChapterUnlock.findOneAndUpdate(
          {
            school: schoolId,
            academicSession: activeSession._id,
            class: cls._id,
            subject: sub,
          },
          {
            $set: { unlockedChapters: [1, 2, 3, 4, 5] }
          },
          { upsert: true, new: true }
        );
      }
    }

    // 3. Populate NotebookCheck records with high checked counts (4 checked, 1 pending)
    for (const student of students) {
      for (const sub of subjects) {
        const chaptersStatus = [
          { chapterNumber: 1, status: 'Checked', updatedAt: new Date() },
          { chapterNumber: 2, status: 'Checked', updatedAt: new Date() },
          { chapterNumber: 3, status: 'Checked', updatedAt: new Date() },
          { chapterNumber: 4, status: 'Checked', updatedAt: new Date() },
          { chapterNumber: 5, status: 'Pending', updatedAt: new Date() },
        ];

        await NotebookCheck.findOneAndUpdate(
          {
            school: schoolId,
            academicSession: activeSession._id,
            class: student.class,
            student: student._id,
            subject: sub,
          },
          {
            $set: { chapters: chaptersStatus }
          },
          { upsert: true, new: true }
        );
      }
    }

    console.log('Successfully seeded rich notebook checking and completion data!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding notebook data:', error);
    process.exit(1);
  }
};

seedNotebookData();
