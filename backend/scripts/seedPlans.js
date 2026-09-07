import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import Plan from '../src/models/Plan.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

const basicFeatures = {
  parent_portal: true,
  teacher_portal: true,
  student_portal: true,
  daily_test: true,
  reports: true,
  academic_session: true,
  import_teachers: true,
  import_students: true,
  excel_export: true,
  pdf_export: true,
  email: true,
  dashboard_analytics: true,
  notifications: true,
  main_exam: false,
  teacher_performance: false,
  priority_support: false,
  website_builder: false,
};

const standardFeatures = {
  parent_portal: true,
  teacher_portal: true,
  student_portal: true,
  daily_test: true,
  main_exam: true,
  reports: true,
  academic_session: true,
  import_teachers: true,
  import_students: true,
  excel_export: true,
  pdf_export: true,
  email: true,
  dashboard_analytics: true,
  notifications: true,
  teacher_performance: true,
  priority_support: true,
  website_builder: false,
};

const eliteFeatures = {
  parent_portal: true,
  teacher_portal: true,
  student_portal: true,
  daily_test: true,
  main_exam: true,
  reports: true,
  academic_session: true,
  import_teachers: true,
  import_students: true,
  excel_export: true,
  pdf_export: true,
  email: true,
  dashboard_analytics: true,
  notifications: true,
  teacher_performance: true,
  priority_support: true,
  website_builder: true,
};

export const plansToSeed = [
  // --- Monthly Plans ---
  {
    name: 'Monthly Basic',
    slug: 'basic_monthly',
    planType: 'basic',
    billingCycle: 'monthly',
    durationDays: 30,
    basePrice: 199,
    price: 199,
    finalPrice: 199,
    maxStudents: 200,
    maxTeachers: 20,
    teacherCapacityType: 'limited',
    studentCapacityType: 'limited',
    highlights: [
      'Up to 200 Students',
      'Parent Portal Access',
      'Daily Test Management',
      'Easy Plan Upgrade',
      'Email support',
    ],
    features: basicFeatures,
    isActive: true,
  },
  {
    name: 'Standard',
    slug: 'standard_monthly',
    planType: 'standard',
    billingCycle: 'monthly',
    durationDays: 30,
    basePrice: 299,
    price: 299,
    finalPrice: 299,
    maxStudents: 500,
    maxTeachers: 50,
    teacherCapacityType: 'limited',
    studentCapacityType: 'limited',
    highlights: [
      'Up to 500 Students',
      'Ideal for Growing Schools',
      'Priority Email Support',
      'Flexible Upgrade Options',
      'Parents portal and download result',
    ],
    features: standardFeatures,
    isActive: true,
  },
  {
    name: 'Elite',
    slug: 'premium_monthly',
    planType: 'premium',
    billingCycle: 'monthly',
    durationDays: 30,
    basePrice: 499,
    price: 499,
    finalPrice: 499,
    maxStudents: 1000,
    maxTeachers: 100,
    teacherCapacityType: 'limited',
    studentCapacityType: 'limited',
    highlights: [
      'Up to 1000 Students',
      'Best for Large Institutions',
      'Priority Customer Support',
      'Faster Verification & Activation',
      'Early access of future updates',
    ],
    features: eliteFeatures,
    isActive: true,
  },

  // --- Yearly Plans ---
  {
    name: 'Yearly Basic',
    slug: 'basic_yearly',
    planType: 'basic',
    billingCycle: 'yearly',
    durationDays: 365,
    basePrice: 999,
    price: 999,
    finalPrice: 999,
    maxStudents: 200,
    maxTeachers: 20,
    teacherCapacityType: 'limited',
    studentCapacityType: 'limited',
    highlights: [
      'Up to 200 Students',
      'Parent Portal Access',
      'Daily Test Management',
      'Easy Plan Upgrade',
      'Email support',
    ],
    features: basicFeatures,
    isActive: true,
  },
  {
    name: 'Standard',
    slug: 'standard_yearly',
    planType: 'standard',
    billingCycle: 'yearly',
    durationDays: 365,
    basePrice: 1999,
    price: 1999,
    finalPrice: 1999,
    maxStudents: 500,
    maxTeachers: 50,
    teacherCapacityType: 'limited',
    studentCapacityType: 'limited',
    highlights: [
      'Up to 500 Students',
      'Ideal for Growing Schools',
      'Priority Email Support',
      'Flexible Upgrade Options',
      'Parents portal and download result',
    ],
    features: standardFeatures,
    isActive: true,
  },
  {
    name: 'Elite',
    slug: 'premium_yearly',
    planType: 'premium',
    billingCycle: 'yearly',
    durationDays: 365,
    basePrice: 3999,
    price: 3999,
    finalPrice: 3999,
    maxStudents: 1000,
    maxTeachers: 100,
    teacherCapacityType: 'limited',
    studentCapacityType: 'limited',
    highlights: [
      'Up to 1000 Students',
      'Best for Large Institutions',
      'Priority Customer Support',
      'Faster Verification & Activation',
      'Early access of future updates',
    ],
    features: eliteFeatures,
    isActive: true,
  },
];

export const seedPlans = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not defined in environment');
  }

  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(uri);
  }

  console.log('Connected to MongoDB. Seeding subscription plans...');

  for (const planData of plansToSeed) {
    const res = await Plan.findOneAndUpdate(
      { slug: planData.slug },
      { $set: planData },
      { upsert: true, new: true, runValidators: true }
    );
    console.log(`✓ Seeded Plan [${res.billingCycle.toUpperCase()}]: ${res.name} (Slug: ${res.slug}) - ₹${res.basePrice}`);
  }

  console.log('All 6 subscription plans seeded successfully!');
};

// If run directly from CLI
if (process.argv[1] && (process.argv[1].endsWith('seedPlans.js') || process.argv[1].endsWith('seedPlans.mjs'))) {
  seedPlans()
    .then(async () => {
      await mongoose.disconnect();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('Error seeding plans:', err);
      await mongoose.disconnect().catch(() => {});
      process.exit(1);
    });
}
