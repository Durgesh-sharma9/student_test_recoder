import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import School from '../src/models/School.js';
import User from '../src/models/User.js';
import { sendTeacherWhatsAppCredentials } from '../src/services/whatsappService.js';
import { sendTeacherCreationEmail } from '../src/services/emailService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

async function testTeacherWhatsApp() {
  try {
    console.log('[Test Script] Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('[Test Script] Connected to DB successfully.');

    const school = await School.findOne();
    if (!school) {
      console.error('[Test Script] No school found in DB.');
      process.exit(1);
    }

    const name = 'aryan';
    const email = 'ds189919@gmail.com';
    const phoneNo = '8619574703';
    const generatedPassword = 'Teach' + Math.floor(1000 + Math.random() * 9000);
    const loginUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/login`;

    console.log('[Test Script] Checking existing user with email:', email);
    let teacher = await User.findOne({ email: email.toLowerCase() });

    if (!teacher) {
      console.log('[Test Script] Creating new teacher in database...');
      teacher = await User.create({
        school: school._id,
        name: name,
        teacherName: name,
        email: email.toLowerCase(),
        password: generatedPassword,
        phoneNo: phoneNo,
        role: 'teacher',
        mustChangePassword: true,
        canTakeAttendance: true,
      });
      console.log('[Test Script] Teacher document created successfully with ID:', teacher._id);
    } else {
      console.log('[Test Script] Existing teacher found. Updating password & phone number...');
      teacher.phoneNo = phoneNo;
      teacher.password = generatedPassword;
      await teacher.save();
    }

    console.log('\n--- SENDING EMAIL & WHATSAPP CREDENTIALS ---');
    console.log(`Teacher Name: ${name}`);
    console.log(`Email: ${email}`);
    console.log(`Phone: ${phoneNo}`);
    console.log(`Password: ${generatedPassword}`);
    console.log(`School: ${school.schoolName}\n`);

    // 1. Send Email
    console.log('[Test Script] Sending Email...');
    const emailRes = await sendTeacherCreationEmail(
      school.schoolName,
      name,
      email,
      generatedPassword,
      loginUrl
    );
    console.log('[Test Script] Email Result:', emailRes);

    // 2. Send WhatsApp Message
    console.log('\n[Test Script] Sending WhatsApp Message via Meta Cloud API...');
    const waRes = await sendTeacherWhatsAppCredentials({
      phoneNo: phoneNo,
      teacherName: name,
      email: email,
      password: generatedPassword,
      schoolName: school.schoolName,
      loginUrl: loginUrl,
    });

    console.log('\n--- FINAL WHATSAPP TEST RESULT ---');
    console.log(JSON.stringify(waRes, null, 2));

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('[Test Script] Error executing test:', error);
    process.exit(1);
  }
}

testTeacherWhatsApp();
