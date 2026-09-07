import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

import User from '../src/models/User.js';

async function resetPasswords() {
  await mongoose.connect(process.env.MONGODB_URI);

  const defaultPassword = 'password123';
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(defaultPassword, salt);

  // 1. Reset Super Admin password
  const superRes = await User.updateOne(
    { email: 'testmaster@gmail.com' },
    { $set: { password: hash, isEmailVerified: true, isActive: true, status: 'Active' } }
  );
  console.log('Super Admin password reset result:', superRes);

  // 2. Reset School Admin password
  const schoolRes = await User.updateOne(
    { email: 'webncodetechnologies@gmail.com' },
    { $set: { password: hash, isEmailVerified: true, isActive: true, status: 'Active' } }
  );
  console.log('School Admin password reset result:', schoolRes);

  console.log(`\n✅ Success! Both accounts have been set to password: "${defaultPassword}"`);
  console.log('1. Super Admin: testmaster@gmail.com / password123');
  console.log('2. School Admin: webncodetechnologies@gmail.com / password123');

  await mongoose.disconnect();
}

resetPasswords().catch(console.error);
