import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import Plan from '../src/models/Plan.js';
import School from '../src/models/School.js';
import SubscriptionRequest from '../src/models/SubscriptionRequest.js';
import SubscriptionHistory from '../src/models/SubscriptionHistory.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

async function setupTrialAndClearHistory() {
  try {
    console.log('[Script] Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('[Script] Connected to MongoDB.');

    // 1. Clear all Subscription Requests & History
    const deletedReqs = await SubscriptionRequest.deleteMany({});
    const deletedHist = await SubscriptionHistory.deleteMany({});
    console.log(`[Script] Cleared ${deletedReqs.deletedCount} SubscriptionRequest(s).`);
    console.log(`[Script] Cleared ${deletedHist.deletedCount} SubscriptionHistory(s).`);

    // 2. Find or Create Free Trial Plan (5 Teachers, 50 Students)
    let trialPlan = await Plan.findOne({ slug: 'trial_monthly' });
    if (!trialPlan) {
      trialPlan = await Plan.findOne({ planType: 'trial' });
    }

    if (!trialPlan) {
      console.log('[Script] Creating Free Trial Plan (5 Teachers, 50 Students)...');
      trialPlan = await Plan.create({
        name: 'Free Trial',
        slug: 'trial_monthly',
        planType: 'trial',
        billingCycle: 'monthly',
        durationDays: 14,
        maxTeachers: 5,
        maxStudents: 50,
        teacherCapacityType: 'limited',
        studentCapacityType: 'limited',
        basePrice: 0,
        finalPrice: 0,
        price: 0,
        highlights: [
          'Max 5 Teachers Limit',
          'Max 50 Students Limit',
          '14 Days Trial Period',
          'Access to Core ERP Features'
        ],
        isActive: true,
      });
      console.log('[Script] Trial Plan created:', trialPlan._id);
    } else {
      console.log('[Script] Updating existing Trial Plan limits (5 Teachers, 50 Students)...');
      trialPlan.maxTeachers = 5;
      trialPlan.maxStudents = 50;
      trialPlan.teacherCapacityType = 'limited';
      trialPlan.studentCapacityType = 'limited';
      trialPlan.basePrice = 0;
      trialPlan.finalPrice = 0;
      trialPlan.price = 0;
      trialPlan.durationDays = 14;
      trialPlan.isActive = true;
      await trialPlan.save();
      console.log('[Script] Trial Plan updated:', trialPlan._id);
    }

    // 3. Assign Demo Public School to Trial Plan
    const schools = await School.find();
    const futureExpiry = new Date();
    futureExpiry.setDate(futureExpiry.getDate() + 14); // 14 days trial

    for (const s of schools) {
      s.plan = trialPlan._id;
      s.planExpiresAt = futureExpiry;
      s.trialUsed = true;
      s.scheduledDowngradePlan = null;
      s.scheduledDowngradeDate = null;
      await s.save();
      console.log(`[Script] Assigned School "${s.schoolName}" (${s._id}) to Free Trial Plan (Valid until ${futureExpiry.toISOString()}).`);
    }

    console.log('\n[Script] SUCCESS! All history cleared, Super Admin revenue reset to ₹0, and Demo School assigned to 14-day Free Trial Plan (Limit: 5 Teachers, 50 Students).');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('[Script] Error executing setup script:', error);
    process.exit(1);
  }
}

setupTrialAndClearHistory();
