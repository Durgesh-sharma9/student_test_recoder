import 'dotenv/config';
import mongoose from 'mongoose';
import PaymentSettings from '../src/models/PaymentSettings.js';

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  await PaymentSettings.updateMany({}, { $unset: { razorpayKeyId: "", razorpayKeySecret: "" } });
  console.log('Successfully unset DB keys. Env is now 100% source of truth.');
  await mongoose.disconnect();
}

main().catch(console.error);
