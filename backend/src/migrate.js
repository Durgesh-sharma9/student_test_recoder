import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import School from './models/School.js';
import Plan from './models/Plan.js';
import User from './models/User.js';
import Class from './models/Class.js';
import Student from './models/Student.js';
import ResultSession from './models/ResultSession.js';
import Activity from './models/Activity.js';

const migrate = async () => {
  await connectDB();

  let trial = await Plan.findOne({ slug: 'trial' });
  if (!trial) {
    trial = await Plan.create({ name: 'Trial', slug: 'trial', durationDays: 365 });
  }

  let school = await School.findOne({ email: 'admin@school.com' });
  if (!school) {
    school = await School.create({
      schoolName: 'Default School',
      adminName: 'School Admin',
      email: 'admin@school.com',
      plan: trial._id,
      planExpiresAt: new Date(Date.now() + 365 * 86400000),
    });
  }

  await User.updateMany({ role: 'admin' }, { $set: { role: 'school_admin', school: school._id } });
  await User.updateMany({ role: 'teacher', school: { $exists: false } }, { $set: { school: school._id } });
  await User.updateMany({ role: 'school_admin', school: { $exists: false } }, { $set: { school: school._id } });

  await Class.updateMany({ school: { $exists: false } }, { $set: { school: school._id } });
  await Student.updateMany({ school: { $exists: false } }, { $set: { school: school._id } });
  await Activity.updateMany({ school: { $exists: false } }, { $set: { school: school._id } });

  const sessions = await ResultSession.find({ $or: [{ school: { $exists: false } }, { category: { $exists: false } }] });
  for (const s of sessions) {
    const cls = await Class.findById(s.class);
    if (!cls) continue;
    s.school = cls.school || school._id;
    if (!s.category) {
      s.category = s.examType === 'Daily Test' ? 'daily' : 'main';
    }
    if (s.category === 'daily' && !s.testDate && s.month && s.year) {
      s.testDate = new Date(s.year, s.month - 1, 1);
    }
    if (s.category === 'daily') s.examType = 'Daily Test';
    if (s.category === 'main' && !s.examDate) {
      s.examDate = s.testDate || s.createdAt || new Date();
    }
    if (s.category === 'main') s.testDate = undefined;
    try {
      await s.save();
    } catch {
      /* skip duplicate session conflicts */
    }
  }

  console.log('Migration complete. Default school:', school.schoolName);
  await mongoose.disconnect();
};

migrate().catch((e) => {
  console.error(e);
  process.exit(1);
});
