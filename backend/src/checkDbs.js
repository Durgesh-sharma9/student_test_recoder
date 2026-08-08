import 'dotenv/config';
import mongoose from 'mongoose';
import PaymentSettings from './models/PaymentSettings.js';

const check = async () => {
  const localUri = 'mongodb://127.0.0.1:27017/school-daily-test';
  const remoteUri = process.env.MONGODB_URI;

  console.log('--- Checking Local Database ---');
  try {
    await mongoose.connect(localUri);
    const settings = await PaymentSettings.findOne();
    console.log('Local PaymentSettings:', settings);
    await mongoose.disconnect();
  } catch (err) {
    console.error('Local connection failed:', err.message);
  }

  if (remoteUri) {
    console.log('\n--- Checking Remote Database ---');
    try {
      await mongoose.connect(remoteUri);
      const settings = await PaymentSettings.findOne();
      console.log('Remote PaymentSettings:', settings);
      await mongoose.disconnect();
    } catch (err) {
      console.error('Remote connection failed:', err.message);
    }
  } else {
    console.log('\nRemote MONGODB_URI is not loaded in current context.');
  }
};

check();
