import mongoose from 'mongoose';

const subscriptionHistorySchema = new mongoose.Schema(
  {
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    plan: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', required: true },
    action: { 
      type: String, 
      enum: [
        'trial_started',
        'plan_activated',
        'plan_upgraded',
        'plan_renewed',
        'downgrade_scheduled',
        'plan_downgrade_scheduled',
        'plan_downgraded',
        'plan_purchased_razorpay'
      ],
      required: true 
    },
    previousPlan: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan' },
    expiryDate: { type: Date, required: true },
    scheduledDowngradeDate: { type: Date },
  },
  { timestamps: true }
);

subscriptionHistorySchema.index({ school: 1, createdAt: -1 });

export default mongoose.model('SubscriptionHistory', subscriptionHistorySchema);
