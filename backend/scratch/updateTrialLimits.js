import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../src/config/db.js';
import Plan from '../src/models/Plan.js';

const run = async () => {
  await connectDB();
  console.log('Connected to DB');

  const trialPlans = await Plan.find({
    $or: [
      { slug: 'trial' },
      { planType: 'trial' },
      { name: /trial/i },
    ],
  });

  console.log('Found trial plans count:', trialPlans.length);
  for (const p of trialPlans) {
    console.log(`Updating Plan ID ${p._id} (${p.name}, slug: ${p.slug}) from maxTeachers: ${p.maxTeachers}, maxStudents: ${p.maxStudents}`);
    p.maxTeachers = 5;
    p.maxStudents = 20;
    await p.save();
    console.log(`Updated Plan ID ${p._id} to maxTeachers: 5, maxStudents: 20`);
  }

  await mongoose.disconnect();
  console.log('Done!');
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
