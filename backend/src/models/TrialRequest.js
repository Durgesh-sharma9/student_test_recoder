import mongoose from 'mongoose';

const TRIAL_STATUS = ['pending', 'approved', 'rejected'];

const trialRequestSchema = new mongoose.Schema(
  {
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    adminUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    instituteName: { type: String, required: true, trim: true },
    contactNumber: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    expectedStudents: { type: Number, required: true },
    expectedTeachers: { type: Number, required: true },
    reason: { type: String, required: true, trim: true },

    status: { type: String, enum: TRIAL_STATUS, default: 'pending', index: true },
    submittedAt: { type: Date, default: Date.now, index: true },

    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    rejectMessage: { type: String, trim: true },

    // Trial plan assignment (when approved)
    trialPlan: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan' },
    trialStartsAt: { type: Date },
    trialEndsAt: { type: Date },
  },
  { timestamps: true }
);

trialRequestSchema.index({ status: 1, submittedAt: -1 });
trialRequestSchema.index({ school: 1, submittedAt: -1 });

export default mongoose.model('TrialRequest', trialRequestSchema);
