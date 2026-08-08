import 'dotenv/config';
import mongoose from 'mongoose';
import PaymentSettings from './models/PaymentSettings.js';

const run = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not defined in backend/.env');
    process.exit(1);
  }
  console.log('Connecting to database...');
  await mongoose.connect(uri);

  const existing = await PaymentSettings.findOne();
  const keyId = process.env.RAZORPAY_KEY_ID || '';
  const keySecret = process.env.RAZORPAY_KEY_SECRET || '';

  if (existing) {
    existing.razorpayEnabled = true;
    existing.razorpayKeyId = keyId;
    existing.razorpayKeySecret = keySecret;
    await existing.save();
    console.log('Updated existing PaymentSettings with Razorpay test keys from process.env.');
  } else {
    await PaymentSettings.create({
      upiId: 'test@upi',
      merchantName: 'Test Merchant',
      qrExpiryMinutes: 5,
      razorpayEnabled: true,
      razorpayKeyId: keyId,
      razorpayKeySecret: keySecret,
    });
    console.log('Created new PaymentSettings with Razorpay test keys from process.env.');
  }

  await mongoose.disconnect();
  console.log('Done!');
};

run().catch(console.error);
