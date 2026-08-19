import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import School from '../src/models/School.js';
import User from '../src/models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

async function expireDemoSchoolPlan() {
  try {
    console.log('[Script] Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('[Script] Connected to MongoDB.');

    // Find all schools or Demo Public School
    const schools = await School.find();
    console.log(`[Script] Found ${schools.length} school(s) in DB.`);

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 10); // Expired 10 days ago

    for (const s of schools) {
      s.planExpiresAt = yesterday;
      await s.save();
      console.log(`[Script] Updated School "${s.schoolName}" (${s._id}) planExpiresAt to ${yesterday.toISOString()} (EXPIRED).`);
    }

    console.log('\n[Script] SUCCESS! Demo account plan has been set to EXPIRED.');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('[Script] Error expiring plan:', error);
    process.exit(1);
  }
}

expireDemoSchoolPlan();
