import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import School from '../src/models/School.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

async function restoreDemoSchoolPlan() {
  try {
    console.log('[Script] Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('[Script] Connected to MongoDB.');

    const schools = await School.find();
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1); // 1 year active

    for (const s of schools) {
      s.planExpiresAt = futureDate;
      await s.save();
      console.log(`[Script] Restored School "${s.schoolName}" (${s._id}) planExpiresAt to ${futureDate.toISOString()} (ACTIVE).`);
    }

    console.log('\n[Script] SUCCESS! Demo account plan has been RESTORED to Active.');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('[Script] Error restoring plan:', error);
    process.exit(1);
  }
}

restoreDemoSchoolPlan();
