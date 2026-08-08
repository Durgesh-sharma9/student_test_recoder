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
  if (existing) {
    existing.razorpayEnabled = true;
    existing.razorpayKeyId = 'rzp_test_TNFrLSunBdtmcv';
    existing.razorpayKeySecret = 'rYqvnc8Q8GqIpXT6ZSNKp7Ly';
    await existing.save();
    console.log('Updated existing PaymentSettings with Razorpay test keys.');
  } else {
    await PaymentSettings.create({
      upiId: 'test@upi',
      merchantName: 'Test Merchant',
      qrExpiryMinutes: 5,
      razorpayEnabled: true,
      razorpayKeyId: 'rzp_test_TNFrLSunBdtmcv',
      razorpayKeySecret: 'rYqvnc8Q8GqIpXT6ZSNKp7Ly',
    });
    console.log('Created new PaymentSettings with Razorpay test keys.');
  }

  await mongoose.disconnect();
  console.log('Done!');
};

run().catch(console.error);
