import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../src/config/db.js';
import Attendance from '../src/models/Attendance.js';

const cleanLeave = async () => {
  await connectDB();
  console.log('🧹 Converting any "leave" records in Attendance to "present"...');

  const attendances = await Attendance.find({ 'records.status': 'leave' });
  console.log(`Found ${attendances.length} attendance docs with leave status`);

  for (const doc of attendances) {
    let modified = false;
    doc.records.forEach(r => {
      if (r.status === 'leave') {
        r.status = 'present';
        r.remarks = '';
        modified = true;
      }
    });
    if (modified) {
      doc.totalPresent = doc.records.filter(r => r.status === 'present').length;
      doc.totalAbsent = doc.records.filter(r => r.status === 'absent').length;
      doc.totalLeave = 0;
      await doc.save();
    }
  }

  console.log('✅ Cleaned all leave records! Only Present (P) and Absent (A) remain.');
  await mongoose.disconnect();
};

cleanLeave().catch(e => {
  console.error(e);
  process.exit(1);
});
